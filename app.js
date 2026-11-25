/* 巣記録 試作版 v0.8
 * 地図 + GPS + 巣 / 確認記録 + 修正履歴 + CSV 書き出し・読み込み + 多言語。
 * データはこの端末のブラウザ（localStorage）に保存。正式データは書き出した CSV。
 */
'use strict';

const STORE_KEY = 'nest-recorder-v0';
const BACKUP_KEY = 'nest-recorder-backup';
const REMIND_EVERY = 5;                         // 未書き出しの変更がこの件数ごとに催促
const DEFAULT_VIEW = { lat: 43.07, lon: 141.34, zoom: 12 };

const NEST_COLS = ['nest_id', 'name', 'category', 'layer', 'created_at', 'updated_at', 'recorder', 'lat', 'lon', 'loc_source',
  'gps_lat', 'gps_lon', 'gps_accuracy_m', 'species', 'season_result', 'nest_type', 'height_m', 'site', 'material', 'note',
  'mm_icon', 'mm_description', 'photo_urls', 'mm_synced_at'];
const VISIT_COLS = ['visit_id', 'nest_id', 'visit_no', 'datetime', 'recorder', 'status', 'eggs', 'chicks',
  'adult', 'photo_ids', 'note', 'created_at', 'updated_at'];
const EDIT_COLS = ['edited_at', 'recorder', 'table', 'record_id', 'field', 'old_value', 'new_value'];
const NUM_FIELDS = new Set(['lat', 'lon', 'gps_lat', 'gps_lon', 'gps_accuracy_m', 'height_m', 'eggs', 'chicks', 'visit_no']);

// ================= データ =================
let db = load();

function load() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { console.warn(e); }
  if (!d) {
    try { d = JSON.parse(localStorage.getItem(BACKUP_KEY) || 'null'); } catch (e) { /* ignore */ }
  }
  d = d || {};
  // v0.1 → v0.2 移行
  d.nests = (d.nests || []).map((n) => ({ updated_at: n.created_at, recorder: '', nest_type: '', height_m: null,
    site: '', material: '', name: '', category: 'nest', layer: '', season_result: '', mm_icon: '',
    mm_description: '', photo_urls: '', ...n }));
  d.visits = d.visits || [];
  d.edits = (d.edits || []).map((e) => ({ recorder: '', ...e }));
  d.settings = { lang: guessLang(), recorder: '', ...(d.settings || {}) };
  d.unexported = d.unexported ?? (d.nests.length ? d.edits.length : 0);
  d.version = 2;
  return d;
}
function guessLang() { return 'ja'; }   // 日本語を既定に。設定でいつでも切り替え可
function save() {
  try {
    const prev = localStorage.getItem(STORE_KEY);
    if (prev) localStorage.setItem(BACKUP_KEY, prev);       // 1 世代前を残す
    localStorage.setItem(STORE_KEY, JSON.stringify(db));
  } catch (e) { alert(t('save_failed', { m: e.message })); }
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
const map = L.map('map', { zoomControl: true });
const gsiAttr = '<a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>';
const layers = {
  '地理院 標準': L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', { maxZoom: 18, attribution: gsiAttr }),
  '地理院 写真': L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg', { maxZoom: 18, attribution: gsiAttr }),
  'OpenStreetMap': L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }),
};
layers['地理院 標準'].addTo(map);
const layerCtl = L.control.layers(layers, null, { position: 'topright' }).addTo(map);
L.control.scale({ imperial: false }).addTo(map);

// 巣データ / 補足データ はレイヤーとして別々に表示・非表示できる
const catLayers = { nest: L.layerGroup().addTo(map), supplement: L.layerGroup().addTo(map) };
function refreshLayerLabels() {
  for (const cat of ['nest', 'supplement']) {
    layerCtl.removeLayer(catLayers[cat]);
    layerCtl.addOverlay(catLayers[cat], optLabel('category', cat));
  }
}

const markers = new Map();
const RESULT_COLORS = { success: '#1b7a43', failed: '#222', unused: '#7a7a7a' };
function nestIcon(n) {
  const lv = lastVisit(n.nest_id);
  const mm = (typeof MM_ICONS !== 'undefined' && n.mm_icon) ? MM_ICONS[n.mm_icon.split('-')[0]] : null;
  let color = lv ? STATUS_COLORS[lv.status] || STATUS_COLORS.unknown
    : RESULT_COLORS[n.season_result] || (n.mm_icon ? '#' + n.mm_icon.split('-')[1] : '#2f5d50');
  if (n.mm_icon?.startsWith('1502')) color = '#e53935';                 // トビ関連（赤い星）
  const label = n.loc_source === 'mymaps' ? (mm?.label ?? '') : n.nest_id.split('-').pop();
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
$('#btn-add-gps').onclick = () => {
  if (!requireRecorder()) return;
  startGps();
  if (!fix || Date.now() - fix.t > 30000) { alert(t('wait_gps')); return; }
  const a = Math.round(fix.acc);
  if (a > 30 && !confirm(t('confirm_poor_gps', { a }))) return;
  createNest(fix.lat, fix.lon, 'gps', fix);
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
  createNest(e.latlng.lat, e.latlng.lng, 'manual', null);   // 地図で指定した巣は GPS 原値なし
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
    category: $('#n-category').value || 'nest',
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
  $('#v-note').value = v?.note || '';
  $('#v-delete').hidden = !v;
  $('#sheet-visit').hidden = false;
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
    photo_ids: $('#v-photos').value.trim(), note: $('#v-note').value.trim() };
  const now = nowIso();
  if (currentVisit) {
    const v = findVisit(currentVisit);
    let c = 0;
    for (const [k, val] of Object.entries(vals)) c += logEdit('visits', v.visit_id, k, v[k], val);
    if (c) { Object.assign(v, vals, { updated_at: now }); changed(); }
  } else {
    const v = { visit_id: newVisitId(), nest_id: currentNest, recorder: rec(), ...vals, created_at: now, updated_at: now };
    db.visits.push(v);
    logEdit('visits', v.visit_id, '(created)', '', currentNest);
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
  return { blob, name: `nest-records_${tag}.zip` };
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
function driveMsg(s) { $('#drive-result').textContent = s; }
function driveErr(e) {
  console.warn(e);
  driveMsg(String(e.message).startsWith('not_loaded') || !navigator.onLine ? t('drive_offline') : t('drive_failed', { m: e.message }));
}
function showDriveInfo() {
  $('#drive-section').hidden = !driveEnabled();
  if (!driveEnabled()) return;
  const f = db.settings.driveFolder;
  $('#drive-folder').textContent = f ? t('drive_folder', { n: f.name }) : t('drive_no_folder');
  $('#drive-save').disabled = $('#drive-load').disabled = !f;
}
$('#drive-pick').onclick = async () => {
  try { const f = await drivePickFolder(); if (f) driveMsg(''); showDriveInfo(); } catch (e) { driveErr(e); }
};
$('#drive-save').onclick = async () => {
  if (!navigator.onLine) { driveMsg(t('drive_offline')); return; }
  try {
    await driveAuth();                       // ログイン画面はクリック直後に出す（ポップアップのブロック対策）
    driveMsg(t('drive_saving'));
    const { blob, name } = await buildZip();
    await driveUpload(blob, name);
    markExported();
    driveMsg(t('drive_saved', { f: name }));
  } catch (e) { driveErr(e); }
};
/* 複数のファイルをまとめる：端末のデータに取り込み → 全部入りの ZIP を書き出し（端末 + ドライブ）→ ドライブの元ファイルは「過去分」へ */
const ARCHIVE_FOLDER = '過去分';
async function mergeFiles(files) {
  if (!files.length || !confirm(t('merge_confirm', { n: files.length }))) return;
  await importFiles(files);
  const { blob, name } = await buildZip('ALL');
  const msg = [$('#import-result').textContent];
  const toDrive = driveEnabled() && db.settings.driveFolder && navigator.onLine && driveToken && Date.now() < driveTokenExp - 60000;
  if (toDrive) {
    try { await driveUpload(blob, name); msg.push(t('merge_saved_drive')); } catch (e) { console.warn(e); msg.push(t('drive_failed', { m: e.message })); }
  } else if (driveEnabled()) msg.push(t('merge_drive_skip'));
  await shareOrDownload([new File([blob], name, { type: 'application/zip' })]);
  msg.splice(1, 0, t('merge_saved_local', { f: name }));
  markExported();
  const src = files.filter((f) => f.driveId);
  if (toDrive && src.length && confirm(t('merge_archive_confirm', { n: src.length }))) {
    const ng = [];
    try {
      const arch = await driveEnsureSubfolder(ARCHIVE_FOLDER);
      for (const f of src) { try { await driveMove(f.driveId, arch); } catch (e) { console.warn(e); ng.push(f.name); } }
      msg.push(t('merge_archived', { n: src.length - ng.length }));
    } catch (e) { console.warn(e); src.forEach((f) => ng.push(f.name)); }
    if (ng.length) msg.push(t('merge_archive_failed', { f: ng.join(', ') }));
  }
  openData();
  $('#import-result').textContent = msg.filter(Boolean).join('\n');
}
$('#btn-merge').onclick = () => $('#file-merge').click();
$('#file-merge').onchange = async (e) => {
  const files = [...e.target.files]; e.target.value = '';
  if (files.length) await mergeFiles(files);
};
$('#drive-merge').onclick = async () => {
  if (!navigator.onLine) { driveMsg(t('drive_offline')); return; }
  try { const files = await drivePickFiles(); driveMsg(''); await mergeFiles(files); } catch (e) { driveErr(e); }
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
function openData() { closeSheets(); showDataInfo(); showDriveInfo(); drivePreload(); $('#sheet-data').hidden = false; }
$('#btn-data').onclick = openData;
$('#unexported').onclick = openData;
async function showDataInfo() {
  $('#exp-last').textContent = db.lastExport ? t('last_export', { t: fmtTime(db.lastExport) }) : t('never_exported');
  let persisted = false;
  try { persisted = await navigator.storage?.persisted?.(); } catch (e) { /* ignore */ }
  $('#storage-status').textContent = persisted ? t('storage_persist_ok') : t('storage_persist_no');
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
    [t('remind_export'), 'primary', exportAll],
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
  showUndoClear();
  $('#sheet-settings').hidden = false;
}
// ---- この端末のデータを全部消す（1 回だけ取り消せる） ----
const UNDO_KEY = 'nest-recorder-undo-clear';
function readUndo() { try { return JSON.parse(localStorage.getItem(UNDO_KEY) || 'null'); } catch (e) { return null; } }
function showUndoClear() {
  const u = readUndo(), b = $('#s-undo-clear');
  b.hidden = !u;
  if (u) b.textContent = t('undo_clear', { t: fmtTime(u.cleared_at) });
}
$('#s-clear').onclick = () => {
  let msg = t('clear_confirm1', { n: db.nests.length, v: db.visits.length });
  if (db.unexported) msg += '\n' + t('clear_unexported', { u: db.unexported });
  if (!confirm(msg)) return;
  if ((prompt(t('clear_confirm2')) || '').trim() !== t('clear_word')) return;
  const { settings, ...data } = db;
  try { localStorage.setItem(UNDO_KEY, JSON.stringify({ cleared_at: nowIso(), data })); }
  catch (e) { alert(t('save_failed', { m: e.message })); return; }      // 取り消し用の控えが残せないなら消さない
  const ids = db.nests.map((n) => n.nest_id);
  db.nests = []; db.visits = []; db.edits = []; db.unexported = 0;
  delete db.lastExport; delete db.mmLastExport;
  save(); ids.forEach(refreshMarker); updateBadge(); fitAll();
  showUndoClear(); alert(t('clear_done'));
};
$('#s-undo-clear').onclick = () => {
  const u = readUndo(); if (!u) return;
  Object.assign(db, u.data);
  localStorage.removeItem(UNDO_KEY);
  save(); db.nests.forEach((n) => refreshMarker(n.nest_id)); updateBadge(); fitAll();
  showUndoClear(); alert(t('undo_done'));
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
  if (sheet.id === 'sheet-visit') openNest(currentNest); else sheet.hidden = true;
}));

// ================= 起動 =================
applyI18n();
db.nests.forEach(addMarker);
fitAll();
navigator.storage?.persist?.().catch(() => {});       // 自動削除されにくくする（対応ブラウザのみ）
if (!db.welcomed && !db.nests.length && !db.visits.length) welcome();
else if (!rec()) openSettings();
else if (db.unexported) remindExport();               // 起動時、未書き出しがあれば必ず催促

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW', e));
}
