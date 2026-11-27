/* 巣記録 試作版 v0.14.1
 * 地図 + GPS + 巣 / 確認記録 + 修正履歴 + CSV 書き出し・読み込み + 多言語。
 * データはこの端末のブラウザ（IndexedDB、store.js）に保存。正式データは書き出した CSV。
 */
'use strict';

const REMIND_EVERY = 5;                         // 未書き出しの変更がこの件数ごとに催促
const DEFAULT_VIEW = { lat: 43.07, lon: 141.34, zoom: 12 };

const NEST_COLS = ['nest_id', 'name', 'category', 'layer', 'created_at', 'updated_at', 'recorder', 'lat', 'lon', 'loc_source',
  'gps_lat', 'gps_lon', 'gps_accuracy_m', 'species', 'season_result', 'nest_type', 'height_m', 'site', 'material', 'note',
  'mm_icon', 'mm_description', 'photo_urls', 'mm_synced_at'];
const VISIT_COLS = ['visit_id', 'nest_id', 'visit_no', 'datetime', 'recorder', 'status', 'eggs', 'chicks',
  'adult', 'photo_ids', 'note', 'created_at', 'updated_at', 'photo_files'];
const EDIT_COLS = ['edited_at', 'recorder', 'table', 'record_id', 'field', 'old_value', 'new_value'];
const NUM_FIELDS = new Set(['lat', 'lon', 'gps_lat', 'gps_lon', 'gps_accuracy_m', 'height_m', 'eggs', 'chicks', 'visit_no']);

// ================= データ =================
let db = normalizeDb(null);      // 起動時に store.js から読み込む（boot）
let storeInfo = { backend: '', undoAt: null };

function normalizeDb(d) {
  d = d || {};
  // v0.1 → v0.2 移行
  d.nests = (d.nests || []).map((n) => ({ updated_at: n.created_at, recorder: '', nest_type: '', height_m: null,
    site: '', material: '', name: '', category: 'nest', layer: '', season_result: '', mm_icon: '',
    mm_description: '', photo_urls: '', ...n }));
  d.visits = d.visits || [];
  d.photos = d.photos || [];                     // 写真の一覧（本体は IndexedDB、photos.js）
  d.edits = (d.edits || []).map((e) => ({ recorder: '', ...e }));
  d.settings = { lang: guessLang(), recorder: '', ...(d.settings || {}) };
  d.unexported = d.unexported ?? (d.nests.length ? d.edits.length : 0);
  d.version = 2;
  return d;
}
function guessLang() { return 'ja'; }   // 日本語を既定に。設定でいつでも切り替え可
function save() {
  return storeSave(db, (e) => alert(t('save_failed', { m: e.message })));   // 1 世代前は store.js が残す
}
function changed(n = 1) {
  const before = db.unexported;
  db.unexported += n;
  save();
  updateBadge();
  if (Math.floor(db.unexported / REMIND_EVERY) > Math.floor(before / REMIND_EVERY)) remindExport();
}

function nowIso(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  const off = -d.getTimezoneOffset(), sign = off >= 0 ? '+' : '-', a = Math.abs(off);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` +
    `${sign}${p(Math.floor(a / 60))}:${p(a % 60)}`;
}
const compact = (d = new Date()) => nowIso(d).slice(0, 19).replace(/[-:T]/g, '');
const r6 = (x) => (x == null || x === '' ? null : Math.round(Number(x) * 1e6) / 1e6);
const numOrNull = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));

function rec() { return db.settings.recorder; }
function requireRecorder() {
  if (rec()) return true;
  alert(t('need_recorder')); openSettings(); return false;
}

function newNestId() {
  const prefix = `${rec()}-${compact().slice(0, 8)}-`;
  let n = db.nests.filter((x) => x.nest_id.startsWith(prefix)).length + 1;
  while (db.nests.some((x) => x.nest_id === prefix + String(n).padStart(2, '0'))) n++;
  return prefix + String(n).padStart(2, '0');
}
function newVisitId() {
  let id = `V-${rec()}-${compact()}`, k = 1;
  while (db.visits.some((v) => v.visit_id === id)) id = `V-${rec()}-${compact()}-${++k}`;
  return id;
}

function logEdit(table, id, field, oldV, newV) {
  if (String(oldV ?? '') === String(newV ?? '')) return 0;
  db.edits.push({ edited_at: nowIso(), recorder: rec(), table, record_id: id, field,
    old_value: oldV ?? '', new_value: newV ?? '' });
  return 1;
}

const findNest = (id) => db.nests.find((n) => n.nest_id === id);
const findVisit = (id) => db.visits.find((v) => v.visit_id === id);
function visitsOf(nestId) {
  return db.visits.filter((v) => v.nest_id === nestId).sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime));
}
function lastVisit(nestId) { const vs = visitsOf(nestId); return vs[vs.length - 1]; }
/* 何回目か：手で直した回（visit_no が入っている回）はその値、それ以外は直前の回 + 1 */
function visitNumbers(vs) {
  const m = new Map(); let prev = 0;
  for (const v of vs) { prev = v.visit_no != null && v.visit_no !== '' ? Number(v.visit_no) : prev + 1; m.set(v, prev); }
  return m;
}
/* 状態の選択肢：既定 + 自分で追加したもの + 読み込んだ記録に出てくるもの */
function statusCodes() {
  const base = OPTIONS.status.map(([c]) => c);
  const extra = [...(db.settings.customStatus || []), ...db.visits.map((v) => v.status)]
    .filter((s) => s && !base.includes(s));
  return [...base, ...new Set(extra)];
}
function renderChips(box) {
  const g = box.dataset.options, v = getChip(box);
  const codes = g === 'status' ? statusCodes() : OPTIONS[g].map(([c]) => c);
  box.innerHTML = codes.map((c) => `<button type="button" data-value="${esc(c)}">${esc(optLabel(g, c))}</button>`).join('') +
    (g === 'status' ? `<button type="button" class="chip-add">${esc(t('new_status'))}</button>` : '');
  setChip(box, v);
}

// ================= 多言語 =================
function t(key, vars = {}) {
  const s = (I18N[db.settings.lang] || I18N.ja)[key] ?? I18N.ja[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}
function optLabel(group, code) {
  const o = OPTIONS[group].find(([c]) => c === code);
  return o ? o[1][db.settings.lang] || o[1].ja : code || '';
}
function applyI18n() {
  document.documentElement.lang = db.settings.lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('select[data-options]').forEach((sel) => {
    const v = sel.value;
    sel.innerHTML = '<option value=""></option>' + OPTIONS[sel.dataset.options]
      .map(([c]) => `<option value="${c}">${esc(optLabel(sel.dataset.options, c))}</option>`).join('');
    sel.value = v;
  });
  document.querySelectorAll('.chips[data-options]').forEach(renderChips);
  if (watchId == null) setGpsStatus(t('gps_off'), 'off');
  refreshLayerLabels();
  updateBadge();
  renderProj();
}
function getChip(box) { return box.querySelector('button.on')?.dataset.value || ''; }
function setChip(box, v) { box.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.value === v)); }
document.addEventListener('click', (e) => {
  const b = e.target.closest('.chips button'); if (!b) return;
  if (b.classList.contains('chip-add')) {                  // 「＋ 新しい状態」
    const box = b.parentElement;
    const name = (prompt(t('new_status_prompt')) || '').trim();
    if (!name) return;
    const hit = OPTIONS.status.find(([c, l]) => c === name || Object.values(l).includes(name));
    const code = hit ? hit[0] : name;                       // 既定の選択肢と同じ名前なら既定を使う
    if (!hit && !statusCodes().includes(code)) {
      db.settings.customStatus = [...(db.settings.customStatus || []), code];
      save();
    }
    renderChips(box);
    setChip(box, code);
    return;
  }
  const on = b.classList.contains('on');
  setChip(b.parentElement, on ? '' : b.dataset.value);       // もう一度押すと解除（空欄）
});

// ================= 地図 =================
/* 地図はどこまでも拡大できるように（v0.12〜）。地図そのものがない拡大率では、ある所までの地図を引き伸ばす（ぼやける）。
 * 地図の 1 枚が取れないとき（オフラインで保存していない拡大率など）は、1 つ上の拡大率の地図を引き伸ばして代わりに出す（最大 5 段） */
const MAP_MAX_ZOOM = 22;
const FallbackLayer = L.TileLayer.extend({
  urlAt(x, y, z) { return L.Util.template(this._url, L.extend({ s: 'a', x, y, z }, this.options)); },
  createTile(coords, done) {
    const tile = document.createElement('div');
    tile.style.overflow = 'hidden';
    const img = document.createElement('img');
    img.alt = ''; img.setAttribute('role', 'presentation');
    img.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;max-width:none;max-height:none';
    tile.appendChild(img);
    const z0 = this._getZoomForUrl();
    let k = 0;
    img.onload = () => done(null, tile);
    img.onerror = () => {
      k++;
      if (k > 5 || z0 - k < 0) { done(new Error('tile'), tile); return; }
      const s = 2 ** k, px = Math.floor(coords.x / s), py = Math.floor(coords.y / s);
      img.style.width = img.style.height = s * 100 + '%';
      img.style.left = -(coords.x - px * s) * 100 + '%';
      img.style.top = -(coords.y - py * s) * 100 + '%';
      img.src = this.urlAt(px, py, z0 - k);
    };
    img.src = this.urlAt(coords.x, coords.y, z0);
    return tile;
  },
});
const gsiAttr = '<a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>';
const LAYER_DEFS = {
  '地理院 標準': ['https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', 18, gsiAttr],
  '地理院 写真': ['https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg', 18, gsiAttr],
  'OpenStreetMap': ['https://tile.openstreetmap.org/{z}/{x}/{y}.png', 19, '&copy; OpenStreetMap contributors'],
};
const makeLayer = (name) => {
  const [url, nativeZ, attribution] = LAYER_DEFS[name];
  return new FallbackLayer(url, { maxZoom: MAP_MAX_ZOOM, maxNativeZoom: nativeZ, attribution });
};
const map = L.map('map', { zoomControl: true, maxZoom: MAP_MAX_ZOOM });
const layers = Object.fromEntries(Object.keys(LAYER_DEFS).map((k) => [k, makeLayer(k)]));
layers['地理院 標準'].addTo(map);
let baseName = '地理院 標準';
map.on('baselayerchange', (e) => { baseName = e.name; });
const layerCtl = L.control.layers(layers, null, { position: 'topright' }).addTo(map);
const offLayer = L.layerGroup().addTo(map);          // オフライン用に保存した範囲（点線の枠）
function drawOffAreas() {
  offLayer.clearLayers();
  for (const a of db.offline?.areas || []) {
    const [w, so, e, n] = a.b.split(',').map(Number);
    L.rectangle([[so, w], [n, e]], { color: '#555', weight: 1, dashArray: '4 4', fill: false, interactive: false }).addTo(offLayer);
  }
}
L.control.scale({ imperial: false }).addTo(map);

// 巣データ / 補足データ はレイヤーとして別々に表示・非表示できる
const catLayers = { nest: L.layerGroup().addTo(map), supplement: L.layerGroup().addTo(map) };
function refreshLayerLabels() {
  for (const cat of ['nest', 'supplement']) {
    layerCtl.removeLayer(catLayers[cat]);
    layerCtl.addOverlay(catLayers[cat], optLabel('category', cat));
  }
  layerCtl.removeLayer(offLayer);
  layerCtl.addOverlay(offLayer, t('off_layer'));
}

const markers = new Map();
const RESULT_COLORS = { success: '#1b7a43', failed: '#222', unused: '#7a7a7a' };
function nestIcon(n) {
  const lv = lastVisit(n.nest_id);
  const mm = (typeof MM_ICONS !== 'undefined' && n.mm_icon) ? MM_ICONS[n.mm_icon.split('-')[0]] : null;
  let color = lv ? STATUS_COLORS[lv.status] || STATUS_COLORS.unknown
    : RESULT_COLORS[n.season_result] || (n.mm_icon ? '#' + n.mm_icon.split('-')[1] : '#2f5d50');
  if (n.mm_icon?.startsWith('1502') && n.loc_source === 'mymaps') color = '#e53935';   // My Maps のトビ関連（赤い星）
  const label = mm?.label ? mm.label : n.loc_source === 'mymaps' ? '' : n.nest_id.split('-').pop();
  const small = n.category === 'supplement' ? ' small' : '';
  return L.divIcon({ className: '', iconSize: small ? [18, 18] : [28, 28], iconAnchor: small ? [9, 9] : [14, 14],
    html: `<div class="nest-icon${small} ${n.loc_source === 'manual' ? 'manual' : ''}" style="background:${color}">${esc(label)}</div>` });
}
function addMarker(n) {
  const m = L.marker([n.lat, n.lon], { icon: nestIcon(n), draggable: true })
    .addTo(catLayers[n.category === 'supplement' ? 'supplement' : 'nest']);
  m.on('click', () => openNest(n.nest_id));
  m.on('dragend', () => {
    const p = m.getLatLng(), nest = findNest(n.nest_id);
    if (!nest) return;
    if (!confirm(t('confirm_move', { id: nest.nest_id }))) { m.setLatLng([nest.lat, nest.lon]); return; }
    let c = logEdit('nests', nest.nest_id, 'lat', nest.lat, r6(p.lat));
    c += logEdit('nests', nest.nest_id, 'lon', nest.lon, r6(p.lng));
    c += logEdit('nests', nest.nest_id, 'loc_source', nest.loc_source, 'manual');
    Object.assign(nest, { lat: r6(p.lat), lon: r6(p.lng), loc_source: 'manual', updated_at: nowIso() });
    changed(c ? 1 : 0);
    m.setIcon(nestIcon(nest));
    if (!$('#sheet-nest').hidden && currentNest === nest.nest_id) fillNest(nest);
  });
  markers.set(n.nest_id, m);
}
function refreshMarker(id) {
  const n = findNest(id), m = markers.get(id);
  if (!n) { m?.remove(); markers.delete(id); return; }
  if (m) { m.remove(); markers.delete(id); }
  addMarker(n);                                         // 区分が変わったときもレイヤーを付け替える
}
function fitAll() {
  if (db.nests.length) map.fitBounds(L.latLngBounds(db.nests.map((n) => [n.lat, n.lon])).pad(0.3), { maxZoom: 17 });
  else map.setView([DEFAULT_VIEW.lat, DEFAULT_VIEW.lon], DEFAULT_VIEW.zoom);
}

// ================= GPS =================
let fix = null, watchId = null, followOnce = false;
const me = L.circleMarker([0, 0], { radius: 7, color: '#fff', weight: 2, fillColor: '#1a73e8', fillOpacity: 1 });
const meAcc = L.circle([0, 0], { radius: 1, color: '#1a73e8', weight: 1, fillOpacity: 0.12 });

function setGpsStatus(text, cls) { const el = $('#gps-status'); el.textContent = text; el.className = 'gps ' + cls; }
function startGps() {
  if (!('geolocation' in navigator)) { setGpsStatus(t('gps_unsupported'), 'err'); return; }
  if (watchId != null) return;
  setGpsStatus(t('gps_locating'), 'fair');
  watchId = navigator.geolocation.watchPosition((pos) => {
    fix = { lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy, t: Date.now() };
    me.setLatLng([fix.lat, fix.lon]).addTo(map);
    meAcc.setLatLng([fix.lat, fix.lon]).setRadius(fix.acc).addTo(map);
    const a = Math.round(fix.acc);
    setGpsStatus(`GPS ±${a} m`, a <= 10 ? 'good' : a <= 30 ? 'fair' : 'poor');
    if (followOnce) { map.setView([fix.lat, fix.lon], Math.max(map.getZoom(), 17)); followOnce = false; }
  }, (err) => {
    setGpsStatus(t({ 1: 'gps_denied', 2: 'gps_unavailable', 3: 'gps_timeout' }[err.code] || 'gps_unavailable'), 'err');
    watchId = null;
  }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
}
$('#btn-locate').onclick = () => {
  followOnce = true; startGps();
  if (fix) { map.setView([fix.lat, fix.lon], Math.max(map.getZoom(), 17)); followOnce = false; }
};

// ================= 巣の登録 =================
function createNest(lat, lon, src, f) {
  const now = nowIso();
  const nest = {
    nest_id: newNestId(), name: '', category: 'nest', layer: '', created_at: now, updated_at: now, recorder: rec(),
    lat: r6(lat), lon: r6(lon), loc_source: src,
    gps_lat: f ? r6(f.lat) : null, gps_lon: f ? r6(f.lon) : null, gps_accuracy_m: f ? Math.round(f.acc) : null,
    species: '', season_result: '', nest_type: '', height_m: null, site: '', material: '', note: '',
    mm_icon: '', mm_description: '', photo_urls: '',
  };
  db.nests.push(nest);
  logEdit('nests', nest.nest_id, '(created)', '', `${nest.lat},${nest.lon}`);
  changed();
  addMarker(nest);
  openNest(nest.nest_id);
}
/* 20 m 以内に巣があれば「この巣ですか？」と聞く（同じ巣を 2 つ作らないため） */
/* 巣を見分けるための短い説明：種・タイプ・高さ */
function nestBrief(n) {
  return [n.species, n.nest_type ? optLabel('nest_type', n.nest_type) : '',
    n.height_m != null && n.height_m !== '' ? t('brief_height', { h: n.height_m }) : ''].filter(Boolean).join('・');
}
function createNestChecked(lat, lon, src, f) {
  const near = db.nests.map((n) => [n, distM({ lat, lon }, n)]).filter(([, d]) => d <= DUP_M)
    .sort((a, b) => a[1] - b[1]).slice(0, 5);
  if (!near.length) { createNest(lat, lon, src, f); return; }
  modal(t('near_title'), t('near_body', { m: DUP_M }), [
    ...near.map(([n, d]) => {
      const b = nestBrief(n);
      return [t('near_open', { n: n.name || n.nest_id, d: Math.round(d), x: b ? '・' + b : '' }), 'primary', () => openNest(n.nest_id)];
    }),
    [t('near_new'), '', () => createNest(lat, lon, src, f)],
    [t('cancel'), '', null],
  ]);
}
$('#btn-add-gps').onclick = () => {
  if (!requireRecorder()) return;
  startGps();
  if (!fix || Date.now() - fix.t > 30000) { alert(t('wait_gps')); return; }
  const a = Math.round(fix.acc);
  if (a > 30 && !confirm(t('confirm_poor_gps', { a }))) return;
  createNestChecked(fix.lat, fix.lon, 'gps', fix);
};
let picking = false;
$('#btn-add-pick').onclick = () => {
  if (!requireRecorder()) return;
  picking = true; $('#pick-hint').hidden = false; closeSheets();
};
$('#pick-cancel').onclick = () => { picking = false; $('#pick-hint').hidden = true; };
map.on('click', (e) => {
  if (!picking) return;
  picking = false; $('#pick-hint').hidden = true;
  createNestChecked(e.latlng.lat, e.latlng.lng, 'manual', null);   // 地図で指定した巣は GPS 原値なし
});

// ================= 巣の詳細 =================
let currentNest = null;
function openNest(id) {
  const n = findNest(id); if (!n) return;
  currentNest = id;
  closeSheets();
  fillNest(n);
  $('#n-details').open = !visitsOf(id).length;     // 新しい巣は詳細を開いておく
  $('#sheet-nest').hidden = false;
  map.panTo([n.lat, n.lon], { animate: false });
  map.panBy([0, Math.min($('#sheet-nest').offsetHeight, innerHeight * 0.75) / 2], { animate: false });
}
function fillNest(n) {
  $('#nest-title').textContent = n.name || n.nest_id;
  const src = { gps: t('gps'), manual: t('manual'), mymaps: 'My Maps' }[n.loc_source] || n.loc_source;
  $('#n-loc').textContent = `${n.lat}, ${n.lon}（${src}）`;
  $('#n-name').value = n.name || '';
  $('#n-category').value = n.category || 'nest';
  $('#n-result').value = n.season_result || '';
  fillIconPick(n.mm_icon);
  // My Maps から取り込んだ説明文と写真（原文のまま・読み取り専用）
  $('#n-legacy').hidden = !n.mm_description && !n.photo_urls;
  $('#n-legacy-text').textContent = n.mm_description || '';
  const urls = (n.photo_urls || '').split(/\s+/).filter(Boolean);
  // My Maps の写真は Google の権限が必要なことがある。表示できなければリンクだけ残す
  $('#n-photos').innerHTML = urls.map((u, i) => /^https:\/\//.test(u)
    ? `<a href="${esc(u)}" target="_blank" rel="noopener" class="photo-link">📷 ${i + 1}` +
      `<img src="${esc(u)}" loading="lazy" alt="" onload="this.parentNode.firstChild.textContent=''" onerror="this.remove()"></a>` : '').join('');
  $('#n-gps').textContent = n.gps_lat != null ? `${n.gps_lat}, ${n.gps_lon}（±${n.gps_accuracy_m} m）` : t('none');
  $('#n-species').value = n.species || '';
  updateNamePlaceholder();
  $('#n-type').value = n.nest_type || '';
  $('#n-height').value = n.height_m ?? '';
  $('#n-site').value = n.site || '';
  $('#n-material').value = n.material || '';
  $('#n-note').value = n.note || '';
  const species = [...new Set(db.nests.map((x) => x.species).filter(Boolean))];
  $('#species-list').innerHTML = species.map((s) => `<option value="${esc(s)}">`).join('');
  const vs = visitsOf(n.nest_id), nums = visitNumbers(vs);
  $('#visit-count').textContent = `（${vs.length}）`;
  $('#visit-items').innerHTML = vs.length ? vs.slice().reverse().map((v) => `
    <li data-visit="${esc(v.visit_id)}">
      <b>${t('visit_no', { n: nums.get(v) })}</b> ${fmtTime(v.datetime)}
      <span class="tag" style="background:${STATUS_COLORS[v.status] || '#888'}">${esc(optLabel('status', v.status) || '—')}</span>
      <small>${[v.eggs != null ? `${t('eggs')} ${v.eggs}` : '', v.chicks != null ? `${t('chicks')} ${v.chicks}` : '',
        v.adult ? `${t('adult')}：${optLabel('adult', v.adult)}` : '', v.recorder].filter(Boolean).map(esc).join(' · ')}</small>
    </li>`).join('') : `<li class="hint">${t('no_visits')}</li>`;
  const hist = db.edits.filter((e) => e.record_id === n.nest_id || vs.some((v) => v.visit_id === e.record_id)).slice().reverse();
  $('#n-history ul').innerHTML = hist.map((e) =>
    `<li>${fmtTime(e.edited_at)} ${esc(e.record_id === n.nest_id ? '' : e.record_id + ' ')}${esc(e.field)}：${esc(e.old_value)} → ${esc(e.new_value)}</li>`).join('');
}
/* アイコン（My Maps と同じ印と色）。値は mm_icon「コード-色」、空欄 = 自動 */
const ICON_CODES = ['1899', '1769', '1898', '1608', '1502', '1594'];
const ICON_COLORS = ['0288D1', 'A52714', 'E65100', 'F9A825', '097138', '7B1FA2', '000000', '757575', '795548'];
function fillIconPick(v) {
  const [code, color] = (v || '').split('-');
  // 読み込んだ色はそのままの書き方で残す（大文字・小文字の違いで「変更」にしない）
  const colors = ICON_COLORS.map((c) => (color && c === color.toUpperCase() ? color : c));
  if (color && !colors.includes(color)) colors.push(color);
  $('#n-icon').innerHTML = `<option value="">${esc(t('icon_auto'))}</option>` +
    ICON_CODES.map((c) => `<option value="${c}">${esc(t('icon_' + c))}</option>`).join('');
  $('#n-icon-color').innerHTML = colors.map((c) => `<option value="${c}">${esc(t('col_' + c.toUpperCase()) === 'col_' + c.toUpperCase() ? '#' + c : t('col_' + c.toUpperCase()))}</option>`).join('');
  $('#n-icon').value = ICON_CODES.includes(code) || !code ? code || '' : '';
  if (code && !ICON_CODES.includes(code)) {        // 知らないコード（My Maps の他の印）はそのまま残す
    $('#n-icon').insertAdjacentHTML('beforeend', `<option value="${esc(code)}">${esc(code)}</option>`);
    $('#n-icon').value = code;
  }
  $('#n-icon-color').value = color || ICON_COLORS[0];
  showIconPreview();
}
function iconValue() { const c = $('#n-icon').value; return c ? `${c}-${$('#n-icon-color').value}` : ''; }
function showIconPreview() {
  const c = $('#n-icon').value, el = $('#n-icon-preview');
  $('#n-icon-color').disabled = !c;
  el.hidden = !c;
  el.style.background = '#' + $('#n-icon-color').value;
  el.textContent = (typeof MM_ICONS !== 'undefined' && MM_ICONS[c]?.label) || '';
}
$('#n-icon').onchange = showIconPreview;
$('#n-icon-color').onchange = showIconPreview;

/* 巣の名前の自動付番：「年(2桁)_種名N」。同じ年・同じ種の既存の名前（My Maps から来たものを含む）の最大番号 + 1 */
function autoNestName(species, createdAt, selfId) {
  if (!species) return '';
  const yy = String(new Date(createdAt || Date.now()).getFullYear() % 100).padStart(2, '0');
  const base = `${yy}_${species}`;
  const re = new RegExp('^' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\d+)');
  let max = 0;
  for (const x of db.nests) {
    if (x.nest_id === selfId) continue;
    const m = re.exec(x.name || ''); if (m) max = Math.max(max, Number(m[1]));
  }
  return base + (max + 1);
}
function updateNamePlaceholder() {
  const n = findNest(currentNest);
  const auto = n ? autoNestName($('#n-species').value.trim(), n.created_at, n.nest_id) : '';
  $('#n-name').placeholder = auto ? t('name_auto', { n: auto }) : '';
}
$('#n-species').addEventListener('input', updateNamePlaceholder);
$('#nest-form').onsubmit = (ev) => {
  ev.preventDefault();
  const n = findNest(currentNest); if (!n) return;
  const species = $('#n-species').value.trim();
  const vals = { name: $('#n-name').value.trim() || autoNestName(species, n.created_at, n.nest_id),
    category: $('#n-category').value || 'nest', mm_icon: iconValue(),
    season_result: $('#n-result').value,
    species, nest_type: $('#n-type').value,
    height_m: numOrNull($('#n-height').value), site: $('#n-site').value.trim(),
    material: $('#n-material').value.trim(), note: $('#n-note').value.trim() };
  let c = 0;
  for (const [k, v] of Object.entries(vals)) c += logEdit('nests', n.nest_id, k, n[k], v);
  if (c) { Object.assign(n, vals, { updated_at: nowIso() }); changed(); refreshMarker(n.nest_id); }
  closeSheets();
};
$('#n-delete').onclick = () => {
  const n = findNest(currentNest); if (!n) return;
  if (!confirm(t('confirm_delete_nest', { id: n.nest_id }))) return;
  const vs = visitsOf(n.nest_id);
  vs.forEach((v) => logEdit('visits', v.visit_id, '(deleted)', JSON.stringify(v), ''));
  logEdit('nests', n.nest_id, '(deleted)', JSON.stringify(n), '');
  db.visits = db.visits.filter((v) => v.nest_id !== n.nest_id);
  db.nests = db.nests.filter((x) => x !== n);
  refreshMarker(n.nest_id);
  changed();
  closeSheets();
};

// ================= 確認記録 =================
let currentVisit = null;   // null = 新規
$('#btn-add-visit').onclick = () => { if (requireRecorder()) openVisit(null); };
$('#visit-items').onclick = (e) => { const li = e.target.closest('li[data-visit]'); if (li) openVisit(li.dataset.visit); };

let autoVisitNo = 1;        // 手で直さなかった場合の回数（直前の回 + 1）
function openVisit(id) {
  const v = id ? findVisit(id) : null;
  currentVisit = id;
  closeSheets();
  const vs = visitsOf(currentNest), nums = visitNumbers(vs);
  const i = v ? vs.indexOf(v) : vs.length;
  autoVisitNo = (i > 0 ? nums.get(vs[i - 1]) : 0) + 1;
  const no = v ? nums.get(v) : autoVisitNo;
  $('#v-no').value = no;
  $('#visit-title').textContent = `${currentNest} · ${t('visit_no', { n: no })}`;
  $('#v-datetime').value = (v ? v.datetime : nowIso()).slice(0, 16);
  setChip($('#v-status'), v?.status || '');
  $('#v-eggs').value = v?.eggs ?? '';
  $('#v-chicks').value = v?.chicks ?? '';
  setChip($('#v-adult'), v?.adult || '');
  $('#v-photos').value = v?.photo_ids || '';
  discardNewPhotos();
  visitPhotoNames = (v?.photo_files || '').split(/\s+/).filter(Boolean);
  renderVisitPhotos();
  $('#v-note').value = v?.note || '';
  $('#v-delete').hidden = !v;
  $('#sheet-visit').hidden = false;
}
// 写真：この画面で選んだ名前の一覧。保存せずに閉じたら、新しく取り込んだ分は端末から消す
let visitPhotoNames = [], visitPhotoNew = [];
function discardNewPhotos() { visitPhotoNew.forEach((n) => storeDelPhoto(n).catch(() => {})); visitPhotoNew = []; }
async function renderVisitPhotos() {
  const items = await Promise.all(visitPhotoNames.map(async (n) => [n, await photoThumbUrl(n).catch(() => '')]));
  $('#v-photo-list').innerHTML = items.map(([n, u]) => `<button type="button" class="photo-thumb" data-name="${esc(n)}">` +
    `${u ? `<img src="${esc(u)}" alt="">` : '<span class="cloud">☁</span>'}<small>${esc(n)}${photoMeta(n)?.drive_id ? ' ✓' : ''}</small></button>`).join('');
  $('#v-photo-hint').textContent = t('photo_hint', { q: t('pq_' + photoQuality()) });
}
$('#v-photo-add').onclick = () => $('#file-photo').click();
$('#file-photo').onchange = async (e) => {
  const files = [...e.target.files]; e.target.value = '';
  const nest = findNest(currentNest); if (!nest || !files.length) return;
  const dt = localInputToIso($('#v-datetime').value);
  for (const [i, f] of files.entries()) {
    $('#v-photo-hint').textContent = t('photo_adding', { i: i + 1, n: files.length });
    try {
      const name = await addPhotoFile(f, nest, dt, visitPhotoNames);
      visitPhotoNames.push(name); visitPhotoNew.push(name);
    } catch (err) { console.warn(err); alert(t('photo_failed', { f: f.name, m: err.message })); }
  }
  renderVisitPhotos();
};
$('#v-photo-list').onclick = (e) => {
  const b = e.target.closest('.photo-thumb'); if (!b) return;
  const name = b.dataset.name;
  if (!confirm(t('photo_remove_confirm', { f: name }))) return;
  visitPhotoNames = visitPhotoNames.filter((n) => n !== name);
  if (visitPhotoNew.includes(name)) { visitPhotoNew = visitPhotoNew.filter((n) => n !== name); storeDelPhoto(name).catch(() => {}); }
  renderVisitPhotos();
};
/* 保存したとき：新しい写真を一覧に登録し、外した写真は端末から消す（ドライブに送った分はドライブに残る） */
function commitVisitPhotos(visitId, before) {
  const now = nowIso();
  for (const n of visitPhotoNames) {
    if (visitPhotoNew.includes(n) && !photoMeta(n)) db.photos.push({ name: n, nest_id: currentNest, visit_id: visitId, added_at: now });
  }
  for (const n of before) {
    if (visitPhotoNames.includes(n)) continue;
    db.photos = db.photos.filter((p) => p.name !== n);
    storeDelPhoto(n).catch(() => {});
    photoUrls.delete(n);
  }
  visitPhotoNew = [];
}
$('#v-no').oninput = () => {
  const n = numOrNull($('#v-no').value);
  if (n != null) $('#visit-title').textContent = `${currentNest} · ${t('visit_no', { n })}`;
};
function localInputToIso(val) {
  const d = new Date(val);            // datetime-local は端末のローカル時刻として解釈される
  return Number.isNaN(d.getTime()) ? nowIso() : nowIso(d);
}
$('#visit-form').onsubmit = (ev) => {
  ev.preventDefault();
  const noIn = numOrNull($('#v-no').value), old = currentVisit ? findVisit(currentVisit) : null;
  const visitNo = old && old.visit_no != null && Number(old.visit_no) === noIn ? old.visit_no   // 変えていなければそのまま
    : noIn == null || noIn === autoVisitNo ? null : Math.max(1, Math.round(noIn));
  const vals = { visit_no: visitNo,
    datetime: localInputToIso($('#v-datetime').value), status: getChip($('#v-status')),
    eggs: numOrNull($('#v-eggs').value), chicks: numOrNull($('#v-chicks').value), adult: getChip($('#v-adult')),
    photo_ids: $('#v-photos').value.trim(), photo_files: visitPhotoNames.join(' '), note: $('#v-note').value.trim() };
  const now = nowIso();
  if (currentVisit) {
    const v = findVisit(currentVisit);
    let c = 0;
    const before = (v.photo_files || '').split(/\s+/).filter(Boolean);
    for (const [k, val] of Object.entries(vals)) c += logEdit('visits', v.visit_id, k, v[k] ?? '', val);
    if (c) { Object.assign(v, vals, { updated_at: now }); commitVisitPhotos(v.visit_id, before); changed(); }
    else visitPhotoNew = [];
  } else {
    const v = { visit_id: newVisitId(), nest_id: currentNest, recorder: rec(), ...vals, created_at: now, updated_at: now };
    db.visits.push(v);
    logEdit('visits', v.visit_id, '(created)', '', currentNest);
    commitVisitPhotos(v.visit_id, []);
    changed();
  }
  refreshMarker(currentNest);
  openNest(currentNest);
};
$('#v-delete').onclick = () => {
  const v = findVisit(currentVisit); if (!v) return;
  if (!confirm(t('confirm_delete_visit'))) return;
  logEdit('visits', v.visit_id, '(deleted)', JSON.stringify(v), '');
  db.visits = db.visits.filter((x) => x !== v);
  changed();
  refreshMarker(currentNest);
  openNest(currentNest);
};

// ================= 一覧 =================
$('#btn-list').onclick = () => {
  closeSheets();
  $('#list-count').textContent = `（${db.nests.length}）`;
  const rows = db.nests.slice().sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
  $('#list-items').innerHTML = rows.length ? rows.map((n) => {
    const vs = visitsOf(n.nest_id), lv = vs[vs.length - 1];
    return `<li data-id="${esc(n.nest_id)}"><b>${esc(n.name || n.nest_id)}</b> ${esc(n.species || t('no_species'))}
      ${n.season_result ? `<span class="muted">· ${esc(optLabel('season_result', n.season_result))}</span>` : ''}
      ${n.nest_type ? `<span class="muted">· ${esc(optLabel('nest_type', n.nest_type))}</span>` : ''}
      <small>${t('visits')} ${vs.length}${lv ? ` · ${t('last_visit')} ${fmtTime(lv.datetime)} ${esc(optLabel('status', lv.status))}` : ''}</small></li>`;
  }).join('') : `<li class="hint">${t('no_nests')}</li>`;
  $('#sheet-list').hidden = false;
};
$('#list-items').onclick = (e) => { const li = e.target.closest('li[data-id]'); if (li) openNest(li.dataset.id); };

// ================= 書き出し =================
function toCsv(rows, cols) {
  const cell = (v) => { const s = v == null ? '' : String(v); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n') + '\r\n';
}
function visitsForExport() {
  const out = [];
  for (const n of db.nests) {
    const vs = visitsOf(n.nest_id), nums = visitNumbers(vs);
    vs.forEach((v) => out.push({ ...v, visit_no: nums.get(v) }));
  }
  // 巣が存在しない確認記録（読み込み途中など）も落とさない
  db.visits.filter((v) => !findNest(v.nest_id)).forEach((v) => out.push({ ...v, visit_no: '' }));
  return out;
}
async function shareOrDownload(files) {
  if (navigator.canShare && navigator.canShare({ files })) {
    try { await navigator.share({ files }); return true; }
    catch (e) { if (e.name === 'AbortError') return false; console.warn(e); }
  }
  for (const f of files) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(f); a.download = f.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    await new Promise((r) => setTimeout(r, 400));   // 連続ダウンロードがブロックされないように
  }
  return true;
}
/* 書き出しは 1 つの ZIP にまとめる：CSV 3 件（完全なバックアップ）+ KMZ（My Maps 用） */
async function buildZip(label) {
  const tag = `${label || rec() || 'XX'}_${compact().slice(0, 12)}`;
  const kmz = await buildKmz({ nests: db.nests, visitsOf, optLabel,
    layerNames: { nest: optLabel('category', 'nest'), supplement: optLabel('category', 'supplement') },
    docName: db.settings.kmzName || 'Nest Recorder' });
  const zip = new JSZip();
  zip.file(`nests_${tag}.csv`, toCsv(db.nests, NEST_COLS));
  zip.file(`visits_${tag}.csv`, toCsv(visitsForExport(), VISIT_COLS));
  zip.file(`edits_${tag}.csv`, toCsv(db.edits, EDIT_COLS));
  zip.file(`mymaps_${tag}.kmz`, kmz);
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip', compression: 'DEFLATE' });
  return { blob, name: `${safeName(projName())}_nest-records_${tag}.zip` };   // プロジェクト名を先頭に（v0.14〜）
}
function markExported() { db.lastExport = nowIso(); db.unexported = 0; save(); updateBadge(); showDataInfo(); }
async function exportAll() {
  const { blob, name } = await buildZip();
  const ok = await shareOrDownload([new File([blob], name, { type: 'application/zip' })]);
  if (ok) markExported();
  return ok;
}
$('#exp-all').onclick = exportAll;

// ================= Google ドライブ（任意・drive.js） =================
/* フォルダの役目（プロジェクトごと、⚙ で選ぶ）
 *  ラボ調査：masterFolder = マスター（A の置き場）、driveFolder = 提出、photoFolder = 写真（みんな同じ）、archiveFolder = 過去分（ラボのアカウントだけ）
 *  個人調査：driveFolder = 保存先、photoFolder = 写真（選ばなければ保存先の中に作る） */
function driveMsg(s) { $('#drive-result').textContent = s; }
function driveErrText(e) {
  if (!navigator.onLine) return t('drive_offline');
  // Google のログイン部品がまだ読み込めていない（電波はある）。v0.14 で「オフライン」と出ていたのはこれ
  if (String(e.message).startsWith('not_loaded')) return t('drive_not_ready');
  return t('drive_failed', { m: e.message });
}
function driveErr(e) { console.warn(e); driveMsg(driveErrText(e)); }
function folderKeys() {
  return projType() === 'lab' ? ['masterFolder', 'driveFolder', 'photoFolder', 'archiveFolder'] : ['driveFolder', 'photoFolder'];
}
function folderLabel(k) { return t((projType() === 'lab' ? 'fl_lab_' : 'fl_my_') + k); }
function showDriveInfo() {
  const on = driveEnabled(), lab = projType() === 'lab';
  $('#sec-a').hidden = !on || !lab;
  $('#drive-save').hidden = !on;
  $('#drive-load').hidden = !on;
  $('#drive-save').textContent = t(lab ? 'submit' : 'drive_save');
  if (!on) { $('#drive-folder').textContent = ''; $('#sec-admin').hidden = true; return; }
  const f = db.settings.driveFolder, np = pendingPhotos().length;
  $('#drive-folder').textContent = [
    f ? t(lab ? 'submit_folder' : 'drive_folder', { n: f.name }) : t('drive_no_folder'),
    np ? t('photo_pending', { n: np }) : '',
  ].filter(Boolean).join('\n');
  $('#drive-save').disabled = !f;
  $('#sec-admin').hidden = !(lab && db.settings.labAdmin);
  $('#m-dup').textContent = t('dup_btn', { n: dupCandidates().length });
  showAInfo();
  checkAdmin();
}
async function sendPhotos(say = driveMsg) {
  if (!pendingPhotos().length) return '';
  const r = await uploadPhotos((i, n) => say(t('photo_uploading', { i, n })));
  return t('photo_uploaded', { ok: r.ok, ng: r.ng });
}
/* ラボのアカウントかどうか：マスターのフォルダにファイルを入れられるか。ログイン済みのときだけ確かめる（ログイン画面は出さない） */
async function checkAdmin(force) {
  const f = db.settings.masterFolder;
  if (projType() !== 'lab' || !f || !navigator.onLine) return;
  if (!force && !(driveToken && Date.now() < driveTokenExp - 60000)) return;
  try {
    const v = await driveCanWrite(f.id);
    if (v !== !!db.settings.labAdmin) { db.settings.labAdmin = v; save(); showDriveInfo(); }
  } catch (e) { console.warn(e); }
}

// ---- ラボデータ（A）：マスターのフォルダから最新版を読み込む ----
let aCheckedNow = false, bannerClosed = false;
function showAInfo() {
  const a = db.aVersion, f = db.settings.masterFolder;
  $('#a-info').textContent = (a ? t('a_have', { n: a.name, t: fmtTime(a.modifiedTime) }) : t('a_none')) + '\n' +
    (f ? t('a_folder', { n: f.name }) : t('a_no_folder'));
  $('#a-pull').disabled = !f;
}
/* マスターの中で一番新しい MASTER の ZIP（なければ一番新しい ZIP） */
async function latestMaster() {
  const list = await driveListZips(db.settings.masterFolder.id);
  return { pick: list.find((x) => /MASTER/i.test(x.name)) || list[0], list };
}
async function pullMaster(say) {
  const f = db.settings.masterFolder;
  if (!f) { openSettings(); return; }
  if (!navigator.onLine) { say(t('drive_offline')); return; }
  try {
    await driveAuth();                         // クリック直後にログイン（ポップアップのブロック対策）
    if (!driveCanRead) { say(t('a_need_read')); return; }
    say(t('a_checking'));
    checkAdmin(true);
    const { pick } = await latestMaster();
    if (!pick) { say(t('a_empty', { n: f.name })); return; }
    const cur = db.aVersion;
    aCheckedNow = true;
    if (cur && cur.id === pick.id && cur.modifiedTime === pick.modifiedTime) {
      say(t('a_latest', { n: pick.name })); setTimeout(updateBanner, 4000); showAInfo(); return;
    }
    say(t('a_loading', { n: pick.name }));
    await importFiles([await driveDownload(pick.id, pick.name)]);
    db.aVersion = { id: pick.id, name: pick.name, modifiedTime: pick.modifiedTime, loaded_at: nowIso() };
    save();
    say(t('a_loaded', { n: pick.name }) + '\n' + $('#import-result').textContent);
    setTimeout(updateBanner, 6000); showAInfo();      // 結果を少し見せてから上部のお知らせを閉じる
  } catch (e) { console.warn(e); say(driveErrText(e)); }
}
function canPull() { return driveEnabled() && projType() === 'lab' && !!db.settings.masterFolder && navigator.onLine; }
function updateBanner() {
  const b = $('#a-banner');
  let text = '', go = '';
  if (projType() !== 'lab' || !driveEnabled()) text = '';
  else if (!db.aVersion) { text = t('a_banner_none'); go = canPull() ? t('a_banner_load') : t('a_banner_how'); }
  else if (canPull() && !aCheckedNow) { text = t('a_banner_check', { t: fmtTime(db.aVersion.modifiedTime).split(' ')[0] }); go = t('a_banner_check_btn'); }
  b.hidden = bannerClosed || !text;
  $('#a-banner-text').textContent = text;
  $('#a-banner-go').textContent = go;
  $('#a-banner-go').hidden = !go;
}
$('#a-banner-go').onclick = () => {
  if (!canPull()) { openSettings(); $('#folder-section').scrollIntoView({ block: 'center' }); return; }
  pullMaster((m) => { $('#a-banner-text').textContent = m; $('#a-banner-go').hidden = true; $('#a-banner').hidden = false; });
};
$('#a-banner-x').onclick = () => { bannerClosed = true; updateBanner(); };
$('#a-pull').onclick = () => pullMaster((m) => { $('#a-result').textContent = m; });
addEventListener('online', () => { updateBanner(); if (canPull()) drivePreload(); });
addEventListener('offline', updateBanner);

// ---- 保存（ラボ調査：提出する／個人調査：ドライブに保存）。記録の ZIP と、まだ送っていない写真 ----
$('#drive-save').onclick = async () => {
  if (!navigator.onLine) { driveMsg(t('submit_offline')); return; }
  try {
    await driveAuth();                       // ログイン画面はクリック直後に出す（ポップアップのブロック対策）
    driveMsg(t('drive_saving'));
    const { blob, name } = await buildZip();
    await driveUpload(blob, name);
    markExported();
    const done = t(projType() === 'lab' ? 'submitted' : 'drive_saved', { f: name });
    driveMsg(done);
    let pm = '';
    try { pm = await sendPhotos((m) => driveMsg(done + '\n' + m)); } catch (e) { console.warn(e); pm = driveErrText(e); }
    if (pm) driveMsg(done + '\n' + pm);
    showDriveInfo();
  } catch (e) { driveErr(e); }
};

// ---- 更新マスター（ラボのアカウント）：A と「提出」の ZIP をまとめて新しい A を作る ----
function mSay(s) { $('#m-result').textContent = s; }
$('#m-dup').onclick = openDup;
$('#m-update').onclick = async () => {
  const s = db.settings;
  if (!s.masterFolder || !s.driveFolder || !s.archiveFolder) { mSay(t('m_need_folders')); return; }
  if (!navigator.onLine) { mSay(t('drive_offline')); return; }
  try {
    await driveAuth();
    if (!driveCanRead) { mSay(t('a_need_read')); return; }
    if (!(await driveCanWrite(s.masterFolder.id))) { s.labAdmin = false; save(); showDriveInfo(); mSay(t('m_not_admin')); return; }
    // 1. 最新の A（まだ読み込んでいなければ）
    mSay(t('a_checking'));
    const { pick: oldA, list: masterList } = await latestMaster();
    if (oldA && !(db.aVersion && db.aVersion.id === oldA.id && db.aVersion.modifiedTime === oldA.modifiedTime))
      await importFiles([await driveDownload(oldA.id, oldA.name)]);
    // 2. 「提出」の ZIP（前にまとめたものは飛ばす）
    const done = new Set((db.mergedFiles || []).map((m) => m.id + '|' + m.modifiedTime));
    const subs = (await driveListZips(s.driveFolder.id)).filter((f) => !done.has(f.id + '|' + f.modifiedTime));
    // 新しい提出がなく、この端末でも何も変えていない（未保存の変更 0）なら、新しい版は作らない
    if (!subs.length && (oldA ? !db.unexported : !db.nests.length)) { mSay(t('m_nothing')); return; }
    if (!confirm(t('m_confirm', { n: subs.length, a: oldA ? oldA.name : t('m_no_a') }))) { mSay(''); return; }
    const files = [];
    for (const [i, f] of subs.entries()) { mSay(t('m_loading', { i: i + 1, n: subs.length })); files.push(await driveDownload(f.id, f.name)); }
    if (files.length) await importFiles(files);
    const nd = dupCandidates().length;
    if (nd && confirm(t('m_dup_first', { n: nd }))) { mSay(t('m_dup_later')); openDup(); return; }
    // 3. 新しい A を「マスター」へ
    mSay(t('m_saving'));
    const { blob, name } = await buildZip('MASTER');
    const up = await driveUpload(blob, name, { folderId: s.masterFolder.id });
    // 4. 古い A と、まとめた提出のファイルを「過去分」へ
    const ng = [];
    const moveOut = [...masterList.filter((f) => f.id !== up.id), ...subs];
    for (const f of moveOut) { try { await driveMove(f.id, s.archiveFolder.id); } catch (e) { console.warn(e); ng.push(f.name); } }
    db.mergedFiles = [...(db.mergedFiles || []), ...subs.map((f) => ({ id: f.id, modifiedTime: f.modifiedTime, name: f.name }))].slice(-500);
    const meta = (await (await driveFetch(`https://www.googleapis.com/drive/v3/files/${up.id}?fields=id,name,modifiedTime&supportsAllDrives=true`)).json());
    db.aVersion = { id: meta.id, name: meta.name, modifiedTime: meta.modifiedTime, loaded_at: nowIso() };
    db.lastMerge = nowIso();
    markExported(); aCheckedNow = true; updateBanner();
    mSay([t('m_done', { f: name, n: subs.length }), ng.length ? t('m_move_failed', { f: ng.join(', ') }) : '',
      nd ? t('dup_after_merge', { n: nd }) : ''].filter(Boolean).join('\n'));
    showDriveInfo();
  } catch (e) { console.warn(e); mSay(driveErrText(e)); }
};

/* 複数のファイル（端末の ZIP / CSV）をまとめる：取り込み → 全部入りの ZIP を端末に書き出す。ドライブがないときのため */
async function mergeFiles(files) {
  if (!files.length || !confirm(t('merge_confirm', { n: files.length }))) return;
  await importFiles(files);
  const { blob, name } = await buildZip('ALL');
  const msg = [$('#import-result').textContent];
  await shareOrDownload([new File([blob], name, { type: 'application/zip' })]);
  msg.push(t('merge_saved_local', { f: name }));
  markExported();
  db.lastMerge = nowIso(); save();
  const nd = dupCandidates().length;
  if (nd) msg.push(t('dup_after_merge', { n: nd }));
  openData();
  $('#import-result').textContent = msg.filter(Boolean).join('\n');
}

// ================= プロジェクト（v0.14〜） =================
/* 調査ごとにデータを完全に分ける（巣・確認記録・修正履歴・写真・ドライブのフォルダ・書き出し）。
 * 種類：lab = ラボ調査（ラボデータ A・提出・更新マスター）、personal = 個人調査（A なし、自分のフォルダへ保存）。
 * 記録者・言語・写真の画質・My Maps の設定と、オフライン地図はどのプロジェクトでも共通。
 * IndexedDB が使えない端末では、最初のプロジェクトだけ。 */
const SHARED_SETTINGS = ['lang', 'recorder', 'photoQuality', 'mymaps'];
let projects = { list: [{ id: 'main', name: '', type: 'lab' }], current: 'main' };
const curProj = () => projects.list.find((p) => p.id === projects.current) || projects.list[0];
function projType() { return curProj().type || 'lab'; }
function projName() { return curProj().name || t('proj_default_name'); }
function projLabel(p) {
  const n = p.name || t('proj_default_name'), ty = t('ptype_' + (p.type || 'lab'));
  return n === ty ? n : `${n}（${ty}）`;
}
function renderProj() {
  const multi = projects.list.length > 1, p = curProj();
  const badge = $('#proj-badge');
  badge.hidden = !multi && p.type !== 'personal';
  badge.textContent = projName();
  badge.className = 'proj-badge ' + (p.type === 'personal' ? 'personal' : 'lab');
  $('#data-proj').textContent = t('proj_now', { n: projLabel(p) });
  $('#data-proj').className = 'proj-line ' + (p.type === 'personal' ? 'personal' : 'lab');
}
$('#proj-badge').onclick = () => openSettings();
async function saveProjects() { if (storeInfo.backend === 'IndexedDB') await storeSetProjects(projects); }
/* 切り替え：今のデータを保存 → 読み込み → 共通の設定とオフライン地図を引き継ぐ → 地図を描き直す */
async function switchProject(id, fresh) {
  if (id === projects.current && !fresh) return;
  await save();
  const keep = Object.fromEntries(SHARED_SETTINGS.filter((k) => k in db.settings).map((k) => [k, db.settings[k]]));
  const offline = db.offline;
  const r = await storeLoadProject(id);
  const ids = db.nests.map((n) => n.nest_id);
  ids.forEach((nid) => { const m = markers.get(nid); if (m) { m.remove(); markers.delete(nid); } });
  db = normalizeDb(r.data);
  Object.assign(db.settings, keep);
  db.offline = offline;
  if (fresh) db.welcomed = true;
  storeInfo.undoAt = r.undoAt;
  projects.current = id;
  await saveProjects();
  await save();
  photoUrls.forEach((u) => u && URL.revokeObjectURL(u)); photoUrls.clear();
  aCheckedNow = false; bannerClosed = false;
  db.nests.forEach(addMarker);
  fitAll(); updateBadge(); updateBanner(); renderProj();
}
$('#s-proj').onchange = async () => { await switchProject($('#s-proj').value); openSettings(); };
$('#proj-new').onclick = () => {
  const name = (prompt(t('proj_new_name')) || '').trim();
  if (!name) return;
  const make = async (type) => {
    const id = 'p' + Date.now().toString(36);
    projects.list.push({ id, name, type, created_at: nowIso() });
    await switchProject(id, true);
    openSettings();
    alert(t('proj_created', { n: name }) + (type === 'lab' ? '\n' + t('proj_created_lab') : ''));
  };
  modal(t('proj_type_title'), t('proj_type_body'), [
    [t('ptype_lab'), 'primary', () => make('lab')],
    [t('ptype_personal'), 'primary', () => make('personal')],
    [t('cancel'), '', null],
  ]);
};
$('#proj-rename').onclick = async () => {
  const p = curProj();
  const name = (prompt(t('proj_rename_prompt'), p.name || t('proj_default_name')) || '').trim();
  if (!name) return;
  p.name = name; await saveProjects(); renderProj(); openSettings();
};
$('#proj-del').onclick = async () => {
  const p = curProj();
  if (p.id === 'main') { alert(t('proj_del_main')); return; }
  let msg = t('proj_del_confirm', { n: projName(), a: db.nests.length, v: db.visits.length, p: db.photos.length });
  if (db.unexported) msg += '\n' + t('clear_unexported', { u: db.unexported });
  if (!confirm(msg)) return;
  if ((prompt(t('clear_confirm2')) || '').trim() !== t('clear_word')) return;
  const id = p.id;
  await switchProject('main');
  await storeDeleteProject(id);
  projects.list = projects.list.filter((x) => x.id !== id);
  await saveProjects(); renderProj(); openSettings();
  alert(t('proj_deleted', { n: p.name }));
};
/* ⚙ のプロジェクトとフォルダ */
function showProjSettings() {
  const idbOk = storeInfo.backend === 'IndexedDB';
  $('#proj-section').hidden = !idbOk;
  $('#s-proj').innerHTML = projects.list.map((p) => `<option value="${esc(p.id)}">${esc(projLabel(p))}</option>`).join('');
  $('#s-proj').value = projects.current;
  $('#proj-type').textContent = t('ptype_hint_' + projType());
  $('#proj-del').hidden = curProj().id === 'main';
  const on = driveEnabled();
  $('#folder-section').hidden = !on;
  if (!on) return;
  $('#folders-hint').textContent = t('folders_hint_' + projType());
  $('#folder-list').innerHTML = folderKeys().map((k) => {
    const f = db.settings[k];
    return `<li><div><b>${esc(folderLabel(k))}</b><small>${f ? esc(f.name) : esc(t('folder_none'))}</small></div>
      <button type="button" data-folder="${k}">${esc(t(f ? 'folder_change' : 'folder_pick'))}</button></li>`;
  }).join('');
}
$('#folder-list').onclick = async (e) => {
  const b = e.target.closest('button[data-folder]'); if (!b) return;
  if (!navigator.onLine) { alert(t('drive_offline')); return; }
  try {
    const k = b.dataset.folder;
    const f = await drivePickFolder(k);
    if (f && k === 'masterFolder') { db.settings.labAdmin = false; aCheckedNow = false; checkAdmin(true); updateBanner(); }
    showProjSettings();
  } catch (e) { console.warn(e); alert(driveErrText(e)); }
};

// ---- 重複の候補（同じ巣を別々に登録したかもしれない組） ----
const DUP_M = 20;
function distM(a, b) {
  const R = 6371000, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const pairKey = (a, b) => [a, b].sort().join('|');
/* 木が近い所では 5 m おきに巣があることもあり、GPS の誤差（±10〜20 m）より近いので、距離だけでは見分けられない。
 * そこで（v0.12〜）：
 *  - 名前が同じ（既知の巣の名前を入れた）なら、100 m 以内まで候補にする
 *  - 名前が違わなくても、次のどれかなら「明らかに別の巣」として候補にしない */
const DUP_NAME_M = 100, DUP_HEIGHT_M = 3;
const nameKey = (n) => String(n.name || '').normalize('NFKC').trim().toLowerCase();
function dupClearlyDifferent(a, b) {
  const na = nameKey(a), nb = nameKey(b);
  if (na && nb && na !== nb) return true;                                   // 両方に名前があり、違う
  if (a.recorder && a.recorder === b.recorder) return true;                 // 同じ人が登録した（現場で 2 つ見ている）
  if (a.nest_type && b.nest_type && a.nest_type !== b.nest_type) return true;  // 巣のタイプが違う
  if (a.height_m != null && b.height_m != null && a.height_m !== '' && b.height_m !== ''
    && Math.abs(a.height_m - b.height_m) >= DUP_HEIGHT_M) return true;      // 高さが 3 m 以上違う
  return false;
}
function dupCandidates() {
  const not = new Set(db.notDup || []), out = [], ns = db.nests;
  for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) {
    const a = ns[i], b = ns[j];
    if ((a.category || 'nest') !== (b.category || 'nest')) continue;
    if (Math.abs(a.lat - b.lat) > 0.0012 || Math.abs(a.lon - b.lon) > 0.0016) continue;   // 先に粗く絞り込む（約 130 m）
    if (not.has(pairKey(a.nest_id, b.nest_id))) continue;
    const same = !!nameKey(a) && nameKey(a) === nameKey(b);
    const d = distM(a, b);
    if (same) { if (d <= DUP_NAME_M) out.push({ a, b, d, same }); continue; }
    if (a.species && b.species && a.species !== b.species) continue;
    if (d <= DUP_M && !dupClearlyDifferent(a, b)) out.push({ a, b, d, same });
  }
  return out.sort((x, y) => (y.same - x.same) || x.d - y.d);
}
/* 残す方：My Maps から来た点（My Maps 側にも同じ ID がある）> 確認記録が多い > 先に登録した */
function keeperOf(a, b) {
  const score = (n) => [n.loc_source === 'mymaps' ? 1 : 0, visitsOf(n.nest_id).length, -Date.parse(n.created_at || 0)];
  const sa = score(a), sb = score(b);
  for (let k = 0; k < 3; k++) if (sa[k] !== sb[k]) return sa[k] > sb[k] ? [a, b] : [b, a];
  return [a, b];
}
function updateDupButton() {
  const n = dupCandidates().length;
  $('#btn-dup').textContent = t('dup_btn', { n });
  $('#dup-hint').textContent = t('dup_hint', { m: DUP_M });
  return n;
}
let dupMaps = [];
function openDup() {
  closeSheets();
  dupMaps.forEach((m) => m.remove()); dupMaps = [];
  const list = dupCandidates();
  const card = (n, keep) => {
    const info = [
      n.nest_type ? `${t('nest_type')}: ${optLabel('nest_type', n.nest_type)}` : '',
      n.height_m != null && n.height_m !== '' ? t('brief_height', { h: n.height_m }) : '',
      n.site ? `${t('site')}: ${n.site}` : '',
      n.gps_accuracy_m != null ? `GPS ±${n.gps_accuracy_m} m` : '',
    ].filter(Boolean).join(' · ');
    const photos = db.photos.filter((p) => p.nest_id === n.nest_id).slice(-3);
    return `<div class="dup-card ${keep ? 'keep' : 'other'}"><b>${keep ? '✔ ' : ''}${esc(n.name || n.nest_id)}</b> ${esc(n.species || t('no_species'))}
    <small>${esc(n.nest_id)} · ${esc(n.recorder || '—')} · ${t('dup_created', { d: String(n.created_at || '').slice(0, 10) || '—' })} · ${t('dup_visits', { n: visitsOf(n.nest_id).length })}</small>
    ${info ? `<small>${esc(info)}</small>` : ''}
    ${photos.length ? `<div class="dup-photos">${photos.map((p) => `<img data-photo="${esc(p.name)}" alt="">`).join('')}</div>` : ''}</div>`;
  };
  $('#dup-items').innerHTML = list.length ? list.map(({ a, b, d, same }) => {
    const [k, o] = keeperOf(a, b);
    return `<li data-keep="${esc(k.nest_id)}" data-other="${esc(o.nest_id)}">
      ${same ? `<small class="dup-same">${esc(t('dup_same_name'))}</small>` : ''}
      ${card(k, true)}${card(o, false)}<small>${t('dup_dist', { d: Math.round(d) })}</small>
      <div class="dup-map" hidden></div>
      <div class="actions"><button type="button" data-act="map">${esc(t('dup_map'))}</button>
      <button type="button" data-act="not">${esc(t('dup_not'))}</button>
      <button type="button" class="primary" data-act="merge">${esc(t('dup_merge'))}</button></div></li>`;
  }).join('') : `<li class="hint">${t('dup_none')}</li>`;
  $('#dup-hint-detail').textContent = t('dup_rules', { m: DUP_M, h: DUP_HEIGHT_M, nm: DUP_NAME_M });
  $('#sheet-dup').hidden = false;
  document.querySelectorAll('#dup-items img[data-photo]').forEach(async (img) => {
    const u = await photoThumbUrl(img.dataset.photo).catch(() => '');
    if (u) img.src = u; else img.remove();
  });
}
/* 2 つの巣だけを大きく拡大した小さな地図（緑 = 残す方、橙 = もう一方） */
function showDupMap(li) {
  const box = li.querySelector('.dup-map');
  if (!box.hidden) { box.hidden = true; return; }
  box.hidden = false;
  if (box._map) return;
  const k = findNest(li.dataset.keep), o = findNest(li.dataset.other);
  const m = L.map(box, { zoomControl: true, attributionControl: false, maxZoom: MAP_MAX_ZOOM });
  makeLayer(baseName).addTo(m);
  const pt = (n, color) => L.circleMarker([n.lat, n.lon], { radius: 8, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 })
    .bindTooltip(esc(n.name || n.nest_id), { permanent: true, direction: 'top', offset: [0, -8] }).addTo(m);
  pt(k, '#2e7d32'); pt(o, '#ef6c00');
  const fit = () => { m.invalidateSize(); m.fitBounds(L.latLngBounds([[k.lat, k.lon], [o.lat, o.lon]]).pad(0.6), { maxZoom: 21 }); };
  m.setView([k.lat, k.lon], 18); requestAnimationFrame(fit);
  box._map = m; dupMaps.push(m);
}
function mergeNests(keepId, otherId) {
  const k = findNest(keepId), o = findNest(otherId); if (!k || !o) return;
  const now = nowIso();
  for (const f of ['name', 'species', 'season_result', 'nest_type', 'height_m', 'site', 'material', 'mm_icon', 'mm_description', 'photo_urls']) {
    if ((k[f] == null || k[f] === '') && o[f] != null && o[f] !== '') { logEdit('nests', k.nest_id, f, k[f], o[f]); k[f] = o[f]; }
  }
  if (o.note) { const nn = [k.note, o.note].filter(Boolean).join(' / '); logEdit('nests', k.nest_id, 'note', k.note, nn); k.note = nn; }
  for (const v of db.visits.filter((x) => x.nest_id === o.nest_id)) {
    logEdit('visits', v.visit_id, 'nest_id', v.nest_id, k.nest_id);
    v.nest_id = k.nest_id; v.updated_at = now;
  }
  for (const p of db.photos) if (p.nest_id === o.nest_id) p.nest_id = k.nest_id;   // 写真も残す方の巣へ
  k.updated_at = now;
  db.edits.push({ edited_at: now, recorder: rec(), table: 'nests', record_id: o.nest_id, field: '(deleted)',
    old_value: JSON.stringify(o), new_value: `merged into ${k.nest_id}` });
  db.nests = db.nests.filter((x) => x !== o);
  changed();
  refreshMarker(o.nest_id); refreshMarker(k.nest_id);
}
$('#btn-dup').onclick = openDup;
$('#dup-items').onclick = (e) => {
  const b = e.target.closest('button[data-act]'); if (!b) return;
  const li = b.closest('li'), keep = li.dataset.keep, other = li.dataset.other;
  if (b.dataset.act === 'map') { showDupMap(li); return; }
  if (b.dataset.act === 'merge') {
    const k = findNest(keep), o = findNest(other);
    if (!confirm(t('dup_confirm', { a: o.name || o.nest_id, b: k.name || k.nest_id }))) return;
    mergeNests(keep, other);
  } else {
    db.notDup = [...new Set([...(db.notDup || []), pairKey(keep, other)])]; save();
  }
  openDup();
};
$('#btn-merge').onclick = () => $('#file-merge').click();
$('#file-merge').onchange = async (e) => {
  const files = [...e.target.files]; e.target.value = '';
  if (files.length) await mergeFiles(files);
};
$('#drive-load').onclick = async () => {
  if (!navigator.onLine) { driveMsg(t('drive_offline')); return; }
  try {
    const files = await drivePickFiles();
    if (!files.length) return;
    driveMsg('');
    await importFiles(files);
    openData();
  } catch (e) { driveErr(e); }
};

// ================= 読み込み =================
function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((c) => c !== ''));
  if (!head) return { head: [], items: [] };
  return { head, items: body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? '']))) };
}
function normalize(o) {
  const out = {};
  for (const [k, v] of Object.entries(o)) out[k] = NUM_FIELDS.has(k) ? numOrNull(v) : v;
  return out;                                           // visit_no も残す（手で直した回数を引き継ぐ）
}
function mergeInto(list, key, items) {
  let added = 0, updated = 0;
  for (const raw of items) {
    const it = normalize(raw);
    if (!it[key]) continue;
    const cur = list.find((x) => x[key] === it[key]);
    if (!cur) { list.push(it); added++; }
    else if (Date.parse(it.updated_at) > Date.parse(cur.updated_at)) { Object.assign(cur, it); updated++; }
  }
  return { added, updated };
}
/* このツールの ZIP を展開。CSV があれば CSV だけを使う（KMZ は同じ内容で、確認記録が文字になっているため） */
async function expandZips(files, bad) {
  const out = [];
  for (const f of files) {
    if (!/\.zip$/i.test(f.name)) { out.push(f); continue; }
    try {
      const zip = await JSZip.loadAsync(f);
      const entries = Object.values(zip.files).filter((e) => !e.dir && !/(^|\/)(__MACOSX|\.)/.test(e.name));
      const csvs = entries.filter((e) => /\.csv$/i.test(e.name));
      const use = csvs.length ? csvs : entries.filter((e) => /\.(kmz|kml)$/i.test(e.name));
      if (!use.length) { bad.push(f.name); continue; }
      for (const e of use) out.push(new File([await e.async('blob')], e.name.split('/').pop()));
    } catch (e) { console.warn(e); bad.push(f.name); }
  }
  return out;
}
/* 削除した記録が、他の人の古いファイルから「復活」しないようにする：
 * 修正履歴に (deleted) があり、その削除が記録の最終更新より後なら、その記録を外す */
function applyDeletions() {
  const del = new Map();
  for (const e of db.edits) {
    if (e.field !== '(deleted)' || !['nests', 'visits'].includes(e.table)) continue;
    const k = e.table + '|' + e.record_id, tm = Date.parse(e.edited_at);
    if (!(del.get(k) >= tm)) del.set(k, tm);
  }
  const gone = (table, id, upd) => { const tm = del.get(table + '|' + id); return tm != null && tm >= Date.parse(upd || 0); };
  const removed = db.nests.filter((n) => gone('nests', n.nest_id, n.updated_at)).map((n) => n.nest_id);
  db.nests = db.nests.filter((n) => !removed.includes(n.nest_id));
  const nv = db.visits.length;
  db.visits = db.visits.filter((v) => !gone('visits', v.visit_id, v.updated_at) && !removed.includes(v.nest_id));
  removed.visits = nv - db.visits.length;
  return removed;
}
async function importFiles(files) {
  const bad = []; const r = { n: 0, u: 0, v: 0, w: 0, k: [] };
  files = await expandZips(files, bad);
  for (const f of files) {
    if (/\.(kmz|kml)$/i.test(f.name)) {
      try {
        const res = await parseKmz(f);
        let added = 0, skipped = 0;
        const now = nowIso();
        for (const n of res.nests) {
          if (findNest(n.nest_id)) { skipped++; continue; }          // 既存の巣は上書きしない（端末での編集を守る）
          // My Maps から来た点は既に My Maps にあるので、同期済みとして記録する
          db.nests.push({ ...n, created_at: now, updated_at: now, recorder: '', mm_synced_at: now });
          added++;
        }
        db.edits.push({ edited_at: now, recorder: rec(), table: 'import', record_id: f.name, field: '(kmz)',
          old_value: '', new_value: `added ${added}, skipped ${skipped}, polygons ${res.polygons}` });
        r.k.push(t('import_kmz_done', { f: f.name, a: added, s: skipped, p: res.polygons }));
        if (!db.settings.kmzName) db.settings.kmzName = res.docName;
      } catch (e) { console.warn(e); bad.push(f.name); }
      continue;
    }
    const { head, items } = parseCsv(await f.text());
    if (head.includes('nest_id') && head.includes('lat') && !head.includes('visit_id')) {
      const m = mergeInto(db.nests, 'nest_id', items); r.n += m.added; r.u += m.updated;
    } else if (head.includes('visit_id')) {
      const m = mergeInto(db.visits, 'visit_id', items); r.v += m.added; r.w += m.updated;
    } else if (head.includes('edited_at')) {
      const keyOf = (e) => [e.edited_at, e.record_id, e.field, e.new_value].join('|');
      const seen = new Set(db.edits.map(keyOf));
      items.forEach((e) => { if (!seen.has(keyOf(e))) { db.edits.push(e); seen.add(keyOf(e)); } });
    } else bad.push(f.name);
  }
  db.edits.sort((a, b) => Date.parse(a.edited_at) - Date.parse(b.edited_at));
  const removed = applyDeletions();
  db.welcomed = true;
  save();
  removed.forEach(refreshMarker);
  db.nests.forEach((n) => refreshMarker(n.nest_id));
  fitAll();
  const csvPart = r.n + r.u + r.v + r.w || !r.k.length ? [t('import_done', r)] : [];
  if (removed.length || removed.visits) csvPart.push(t('import_removed', { n: removed.length, v: removed.visits }));
  $('#import-result').textContent = [...r.k, ...csvPart, ...(bad.length ? [t('import_bad', { f: bad.join(', ') })] : [])].join('\n');
}
$('#btn-import').onclick = () => $('#file-import').click();
$('#file-import').onchange = async (e) => {
  const files = [...e.target.files]; e.target.value = '';
  if (files.length) { await importFiles(files); openData(); }
};

// ================= データ画面・催促 =================
function openData() { closeSheets(); showDataInfo(); showDriveInfo(); updateDupButton(); showOffInfo(); drivePreload(); $('#sheet-data').hidden = false; }
function showOffInfo(extra) {
  const o = db.offline;
  $('#off-info').textContent = (o?.areas?.length
    ? t('off_have', { a: o.areas.length, n: o.tiles, m: (o.bytes / 1048576).toFixed(0) }) : t('off_none')) + (extra ? '\n' + extra : '');
}
$('#off-dl').onclick = async () => {
  if (!navigator.onLine) { showOffInfo(t('drive_offline')); return; }
  const name = baseName === 'OpenStreetMap' ? '地理院 標準' : baseName;   // OSM は一括保存が禁止されているので地理院に
  const plan = offPlan(map.getBounds(), layers[name]._url);
  if (plan.urls.length > OFF_MAX_TILES) { alert(t('off_too_many', { n: plan.urls.length, max: OFF_MAX_TILES })); return; }
  if (!confirm(t('off_confirm', { n: plan.urls.length, z: plan.zMax, l: name }))) return;
  $('#off-dl').disabled = true; $('#off-stop').hidden = false;
  const r = await offDownload(plan.urls, (d, n, b) => showOffInfo(t('off_progress', { d, n, m: (b / 1048576).toFixed(1) })));
  $('#off-dl').disabled = false; $('#off-stop').hidden = true;
  const b = map.getBounds();
  db.offline = db.offline || { areas: [], tiles: 0, bytes: 0 };
  const bb = b.toBBoxString();
  if (r.done - r.failed > 0 && !db.offline.areas.some((a) => a.b === bb && a.layer === name))
    db.offline.areas.push({ b: bb, layer: name, zMax: plan.zMax, at: nowIso() });
  db.offline.tiles += r.fresh; db.offline.bytes += r.bytes;     // 保存済みだったタイルは数えない
  save(); drawOffAreas();
  showOffInfo(t(r.aborted ? 'off_stopped' : 'off_done', { d: r.done - r.failed, f: r.failed }));
};
$('#off-stop').onclick = () => { offAbort = true; };
$('#off-clear').onclick = async () => {
  if (!confirm(t('off_clear_confirm'))) return;
  await offClear(); db.offline = null; save(); drawOffAreas(); showOffInfo();
};
$('#btn-data').onclick = openData;
$('#unexported').onclick = openData;
async function showDataInfo() {
  $('#exp-last').textContent = db.lastExport ? t('last_export', { t: fmtTime(db.lastExport) }) : t('never_exported');
  let persisted = false;
  try { persisted = await navigator.storage?.persisted?.(); } catch (e) { /* ignore */ }
  const u = await storeUsage();
  $('#storage-status').textContent = (persisted ? t('storage_persist_ok') : t('storage_persist_no')) + '\n' +
    t('storage_where', { b: storeInfo.backend, u: u ? (u.used / 1048576).toFixed(1) : '?' });
  $('#mm-section').hidden = !db.settings.mymaps;
  if (db.settings.mymaps) {
    const n = mmPending().length;
    $('#mm-info').textContent = (n ? t('mm_pending', { n }) : t('mm_none')) +
      (db.mmLastExport ? ' / ' + t('mm_last', { t: fmtTime(db.mmLastExport) }) : '');
  }
}

// ================= My Maps 連携（任意） =================
// My Maps には外部から書き込む手段がないため、前回以降に追加・修正した点だけを KMZ にし、
// ユーザーが My Maps の「インポート」で新しいレイヤーとして読み込む。
const mmAfter = (a, b) => !b || Date.parse(a) > Date.parse(b);
function mmPending() {
  return db.nests.filter((n) => mmAfter(n.updated_at, n.mm_synced_at) ||
    db.visits.some((v) => v.nest_id === n.nest_id && mmAfter(v.updated_at, n.mm_synced_at)));
}
$('#exp-mm').onclick = async () => {
  const items = mmPending();
  if (!items.length) { alert(t('mm_none')); return; }
  const stamp = nowIso();
  const blob = await buildKmz({ nests: items, visitsOf, optLabel,
    layerNames: { nest: optLabel('category', 'nest'), supplement: optLabel('category', 'supplement') },
    docName: `${t('mm_layer')} ${fmtTime(stamp)}` });
  const ok = await shareOrDownload([new File([blob], `mymaps-update_${rec() || 'XX'}_${compact().slice(0, 12)}.kmz`,
    { type: 'application/vnd.google-earth.kmz' })]);
  if (!ok) return;
  items.forEach((n) => { n.mm_synced_at = stamp; });   // updated_at は変えない（内容の変更ではないため）
  db.mmLastExport = stamp;
  save(); showDataInfo();
};
function updateBadge() {
  const b = $('#unexported');
  b.hidden = !db.unexported;
  b.textContent = t('unexported', { n: db.unexported });
}
function modal(title, body, buttons) {
  $('#modal-title').textContent = title;
  $('#modal-body').textContent = body;
  const box = $('#modal-actions'); box.innerHTML = '';
  buttons.forEach(([label, cls, fn]) => {
    const b = document.createElement('button'); b.textContent = label; if (cls) b.className = cls;
    b.onclick = () => { $('#modal').hidden = true; fn && fn(); };
    box.appendChild(b);
  });
  $('#modal').hidden = false;
}
function remindExport() {
  if (!db.unexported) return;
  modal(t('remind_title'), t('remind_body', { n: db.unexported }), [
    [t('remind_export'), 'primary', () => (driveEnabled() && db.settings.driveFolder ? openData() : exportAll())],
    [t('remind_later'), '', null],
  ]);
}
function welcome() {
  modal(t('welcome_title'), t('welcome_body'), [
    [t('welcome_import'), 'primary', () => { openData(); $('#file-import').click(); }],
    [t('welcome_new'), '', () => { db.welcomed = true; save(); if (!rec()) openSettings(); }],
    ['使い方を見る', '', () => { db.welcomed = true; save(); openHelp(); }],
  ]);
}

// ================= 設定 =================
function openSettings() {
  closeSheets();
  $('#s-lang').value = db.settings.lang;
  $('#s-recorder').value = db.settings.recorder;
  $('#s-mymaps').checked = !!db.settings.mymaps;
  $('#s-photo-q').value = photoQuality();
  showProjSettings();
  drivePreload();                                   // フォルダを選ぶときにすぐログイン画面を出せるように
  showUndoClear();
  $('#sheet-settings').hidden = false;
}
// ---- この端末のデータを全部消す（1 回だけ取り消せる） ----
function showUndoClear() {
  const b = $('#s-undo-clear');
  b.hidden = !storeInfo.undoAt;
  if (storeInfo.undoAt) b.textContent = t('undo_clear', { t: fmtTime(storeInfo.undoAt) });
}
$('#s-clear').onclick = async () => {
  let msg = t('clear_confirm1', { n: db.nests.length, v: db.visits.length });
  if (db.unexported) msg += '\n' + t('clear_unexported', { u: db.unexported });
  if (!confirm(msg)) return;
  if ((prompt(t('clear_confirm2')) || '').trim() !== t('clear_word')) return;
  const empty = { ...db, nests: [], visits: [], edits: [], photos: [], unexported: 0 };
  ['lastExport', 'mmLastExport', 'lastMerge', 'notDup', 'aVersion', 'mergedFiles'].forEach((k) => delete empty[k]);
  try { storeInfo.undoAt = await storeClear(db, empty); }
  catch (e) { alert(t('clear_failed', { m: e.message })); return; }   // 控えが残せないなら消さない
  const ids = db.nests.map((n) => n.nest_id);
  db = empty;
  ids.forEach(refreshMarker); updateBadge(); fitAll(); updateBanner();
  showUndoClear(); alert(t('clear_done'));
};
$('#s-undo-clear').onclick = async () => {
  try {
    const data = await storeGetUndo(); if (!data) { storeInfo.undoAt = null; showUndoClear(); return; }
    const keep = db.settings;
    const ids = db.nests.map((n) => n.nest_id);
    db = normalizeDb(data); db.settings = keep;                              // 設定は今のものを使う
    await save();
    await storeDropUndo();
    storeInfo.undoAt = null;
    ids.forEach(refreshMarker);
    db.nests.forEach((n) => refreshMarker(n.nest_id)); updateBadge(); fitAll(); updateBanner();
    showUndoClear(); alert(t('undo_done'));
  } catch (e) { alert(t('clear_failed', { m: e.message })); }
};
$('#btn-settings').onclick = openSettings;
function openHelp() { closeSheets(); $('#sheet-help').hidden = false; $('#sheet-help').scrollTop = 0; }
$('#btn-help').onclick = openHelp;
$('#s-lang').onchange = () => { db.settings.lang = $('#s-lang').value; save(); applyI18n(); };
$('#s-save').onclick = () => {
  const code = $('#s-recorder').value.trim().toUpperCase().replace(/[^A-Z]/g, '');
  if (code.length < 2) { alert(t('recorder_hint')); return; }
  db.settings.recorder = code; db.settings.lang = $('#s-lang').value;
  db.settings.mymaps = $('#s-mymaps').checked;
  db.settings.photoQuality = $('#s-photo-q').value;
  save(); applyI18n(); closeSheets();
};

// ================= 共通 =================
function $(s) { return document.querySelector(s); }
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function fmtTime(iso) {
  const d = new Date(iso); if (Number.isNaN(d.getTime())) return iso || '';
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function closeSheets() { document.querySelectorAll('.sheet').forEach((s) => (s.hidden = true)); }
document.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => {
  const sheet = b.closest('.sheet');
  if (sheet.id === 'sheet-visit') { discardNewPhotos(); openNest(currentNest); } else sheet.hidden = true;
}));

// ================= 起動 =================
async function boot() {
  try {
    const r = await storeInit();
    db = normalizeDb(r.data); storeInfo = r;
    if (r.projects?.list?.length) projects = r.projects;
    if (!projects.list.some((p) => p.id === projects.current)) projects.current = projects.list[0].id;
    if (r.migrated) console.info('localStorage → IndexedDB 移行済み');
  } catch (e) {
    alert(t('load_failed', { m: e.message })); return;  // 読めないまま空で始めると上書きしてしまうので止める
  }
  applyI18n();
  renderProj();
  db.nests.forEach(addMarker);
  drawOffAreas();
  fitAll();
  updateBanner();
  if (canPull()) drivePreload();                     // 「確認」を押したときにすぐログイン画面を出せるように
  navigator.storage?.persist?.().catch(() => {});       // 自動削除されにくくする（対応ブラウザのみ）
  if (!db.welcomed && !db.nests.length && !db.visits.length) welcome();
  else if (!rec()) openSettings();
  else if (db.unexported) remindExport();               // 起動時、未書き出しがあれば必ず催促
}
applyI18n();
boot();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW', e));
}
