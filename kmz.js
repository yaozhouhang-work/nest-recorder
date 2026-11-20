/* Google My Maps の KMZ / KML 読み込みと書き出し。
 * 読み込み：点だけを巣として取り込む（多角形は取り込まない）。説明文は原文のまま保存し、
 *           状態や卵数を文章から推測しない。アイコンの意味は聞き取りに基づく（2026-11-20）。
 * 書き出し：My Maps でそのままインポートできる KMZ（フォルダ = レイヤー）。
 */
'use strict';

// My Maps のアイコン番号 → 意味（聞き取り）。色の意味は未確認なので使わない。
const MM_ICONS = {
  '1769': { label: '✓', result: 'success' },   // チェック：今年繁殖成功
  '1898': { label: '✕', result: 'failed' },    // 黒×：今年繁殖失敗
  '1608': { label: 'i', result: 'unused' },    // info：今年は使われていない
  '1502': { label: '★', result: '' },          // 赤い星：トビ関連の記録
  '1594': { label: '?', result: '' },          // ？：意味未確認
  '1899': { label: '', result: '' },           // ピン：汎用
};
const RESULT_TO_ICON = { success: '1769', failed: '1898', unused: '1608' };

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
function htmlToText(html) {
  const withBreaks = String(html || '').replace(/<img[^>]*>/gi, '').replace(/<br\s*\/?>/gi, '\n');
  const doc = new DOMParser().parseFromString(`<body>${withBreaks}</body>`, 'text/html');
  return (doc.body.textContent || '').replace(/[ \t]+\n/g, '\n').trim();
}
function childText(el, tag) {
  const c = [...el.children].find((x) => x.localName === tag);
  return c ? c.textContent : '';
}

async function readKmlText(file) {
  if (/\.kml$/i.test(file.name)) return file.text();
  const zip = await JSZip.loadAsync(file);
  const kml = Object.values(zip.files).find((f) => /\.kml$/i.test(f.name) && !f.dir);
  if (!kml) throw new Error('KML not found in KMZ');
  return kml.async('string');
}

/* 戻り値：{ nests:[...], polygons:n, docName } */
async function parseKmz(file) {
  const xml = new DOMParser().parseFromString(await readKmlText(file), 'application/xml');
  if (xml.querySelector('parsererror')) throw new Error('KML parse error');
  const out = []; let polygons = 0;
  const docName = childText(xml.getElementsByTagName('Document')[0] || xml.documentElement, 'name');
  for (const pm of xml.getElementsByTagName('Placemark')) {
    const pt = pm.getElementsByTagName('Point')[0];
    if (!pt) { polygons++; continue; }
    const [lon, lat] = (pt.getElementsByTagName('coordinates')[0]?.textContent || '').trim().split(',').map(Number);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const folder = pm.parentElement && pm.parentElement.localName === 'Folder' ? childText(pm.parentElement, 'name') : '';
    const name = childText(pm, 'name').trim();
    const descHtml = childText(pm, 'description');
    const style = childText(pm, 'styleUrl').replace(/^#/, '');               // 例 icon-1769-0288D1-labelson
    const m = style.match(/^icon-(\d+)-([0-9A-Fa-f]{6})/);
    const iconCode = m ? m[1] : '', color = m ? m[2].toUpperCase() : '';
    const photos = new Set();
    let ownId = '';                                    // このツールで書き出した KMZ なら元の ID が入っている
    for (const d of pm.getElementsByTagName('Data')) {
      if (d.getAttribute('name') === 'nest_id') ownId = (d.getElementsByTagName('value')[0]?.textContent || '').trim();
      if (d.getAttribute('name') === 'gx_media_links') {
        (d.getElementsByTagName('value')[0]?.textContent || '').split(/\s+/).filter(Boolean).forEach((u) => photos.add(u));
      }
    }
    (descHtml.match(/<img[^>]+src="([^"]+)"/gi) || []).forEach((tag) => photos.add(tag.replace(/.*src="([^"]+)".*/i, '$1')));
    const category = /補足|补足|supple/i.test(folder) ? 'supplement' : 'nest';
    // 種名は「26_オオタカ2」のような名前からだけ取り出す（それ以外は空欄のまま）
    const sp = category === 'nest' ? name.match(/^\d{2}_([^0-9０-９（(’'？?]+)/) : null;
    out.push({
      nest_id: ownId || `MM-${fnv1a([folder, name, lat.toFixed(6), lon.toFixed(6)].join('|'))}`,
      name, category, layer: folder,
      lat: Math.round(lat * 1e6) / 1e6, lon: Math.round(lon * 1e6) / 1e6, loc_source: 'mymaps',
      gps_lat: null, gps_lon: null, gps_accuracy_m: null,
      species: sp ? sp[1].trim() : '', nest_type: '', height_m: null, site: '', material: '', note: '',
      season_result: (MM_ICONS[iconCode] || {}).result || '',
      mm_icon: iconCode ? `${iconCode}-${color}` : '',
      mm_description: htmlToText(descHtml),
      photo_urls: [...photos].join(' '),
    });
  }
  return { nests: out, polygons, docName };
}

/* ---------- 書き出し ---------- */
function xmlEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}
function mmDate(iso) { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : `${d.getMonth() + 1}/${d.getDate()}`; }

/* lists：{ nests, visitsOf(id), optLabel(group, code), layerNames:{nest, supplement} } */
async function buildKmz({ nests, visitsOf, optLabel, layerNames, docName }) {
  const styles = new Map();
  const styleFor = (n) => {
    const lv = visitsOf(n.nest_id).slice(-1)[0];
    let code = n.mm_icon ? n.mm_icon.split('-')[0] : RESULT_TO_ICON[n.season_result] || '';
    if (!code && lv) code = lv.status === 'fledged' ? '1769' : lv.status === 'failed' ? '1898' : '';
    code = code || '1899';
    const color = n.mm_icon ? n.mm_icon.split('-')[1] : code === '1898' ? '000000' : '0288D1';
    const id = `icon-${code}-${color}`;
    if (!styles.has(id)) {
      // 色付きの汎用ピン。My Maps 側での見え方は未検証（データ列 result で「スタイル」設定も可）
      styles.set(id, `<Style id="${id}"><IconStyle><color>ff${color.slice(4, 6)}${color.slice(2, 4)}${color.slice(0, 2)}</color>` +
        `<scale>1</scale><Icon><href>https://www.gstatic.com/mapspro/images/stock/503-wht-blank_maps.png</href></Icon></IconStyle></Style>`);
    }
    return id;
  };
  const placemark = (n) => {
    const vs = visitsOf(n.nest_id);
    const lines = vs.map((v) => [mmDate(v.datetime), optLabel('status', v.status),
      v.eggs != null ? `卵${v.eggs}` : '', v.chicks != null ? `雛${v.chicks}` : '',
      v.adult ? `親:${optLabel('adult', v.adult)}` : '', v.note, v.photo_ids ? `写真:${v.photo_ids}` : ''].filter(Boolean).join(' '));
    const desc = [n.mm_description, ...lines].filter(Boolean).join('\n');
    const data = {
      nest_id: n.nest_id, species: n.species, result: n.season_result,
      nest_type: n.nest_type ? optLabel('nest_type', n.nest_type) : '', height_m: n.height_m,
      visits: vs.length, last_status: vs.length ? optLabel('status', vs[vs.length - 1].status) : '',
      last_visit: vs.length ? vs[vs.length - 1].datetime : '', recorder: n.recorder, note: n.note,
    };
    const ext = Object.entries(data).filter(([, v]) => v !== '' && v != null)
      .map(([k, v]) => `<Data name="${k}"><value>${xmlEsc(v)}</value></Data>`).join('');
    const media = n.photo_urls ? `<Data name="gx_media_links"><value>${xmlEsc(n.photo_urls)}</value></Data>` : '';
    return `<Placemark><name>${xmlEsc(n.name || n.nest_id)}</name>` +
      `<description>${xmlEsc(desc)}</description><styleUrl>#${styleFor(n)}</styleUrl>` +
      `<ExtendedData>${ext}${media}</ExtendedData>` +
      `<Point><coordinates>${n.lon},${n.lat},0</coordinates></Point></Placemark>`;
  };
  const folders = ['nest', 'supplement'].map((cat) => {
    const items = nests.filter((n) => (n.category || 'nest') === cat);
    if (!items.length) return '';
    const fname = items.find((n) => n.layer)?.layer || layerNames[cat];
    return `<Folder><name>${xmlEsc(fname)}</name>${items.map(placemark).join('\n')}</Folder>`;
  }).join('\n');
  const kml = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document>` +
    `<name>${xmlEsc(docName)}</name>${[...styles.values()].join('')}\n${folders}</Document></kml>`;
  const zip = new JSZip();
  zip.file('doc.kml', kml);
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.google-earth.kmz', compression: 'DEFLATE' });
}
