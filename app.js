/* 巢记录 试做版 v0.1
 * 地图（国土地理院 / OSM）+ GPS 取点 + 拖动校正 + CSV 导出。
 * 数据存在本机浏览器 localStorage；正式数据以导出的 CSV 为准。
 */
'use strict';

const STORE_KEY = 'nest-recorder-v0';
const DEFAULT_VIEW = { lat: 43.07, lon: 141.34, zoom: 13 }; // 北大附近，首次打开用

// ---------- 数据 ----------
let db = load();

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn('读取失败', e); }
  return { nests: [], edits: [], lastExport: null };
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); }
  catch (e) { alert('保存失败：' + e.message + '\n请立即导出 CSV。'); }
}
// 本地时间 + 时区，例如 2026-11-20T09:15:03+09:00（CSV 里直接看得懂）
function nowIso() {
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  const off = -d.getTimezoneOffset(), sign = off >= 0 ? '+' : '-', a = Math.abs(off);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` +
    `${sign}${p(Math.floor(a / 60))}:${p(a % 60)}`;
}
const r6 = (x) => (x == null ? null : Math.round(x * 1e6) / 1e6);

function newNestId() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const n = db.nests.filter((x) => x.nest_id.startsWith('N' + ymd)).length + 1;
  return `N${ymd}-${String(n).padStart(2, '0')}`;
}

function logEdit(id, field, oldV, newV) {
  if (String(oldV ?? '') === String(newV ?? '')) return;
  db.edits.push({ edited_at: nowIso(), table: 'nests', record_id: id, field,
    old_value: oldV ?? '', new_value: newV ?? '' });
}

function createNest(lat, lon, src, fix) {
  const nest = {
    nest_id: newNestId(),
    created_at: nowIso(),
    lat: r6(lat), lon: r6(lon),
    loc_source: src,                          // gps / manual
    gps_lat: fix ? r6(fix.lat) : null,
    gps_lon: fix ? r6(fix.lon) : null,
    gps_accuracy_m: fix ? Math.round(fix.acc) : null,
    species: '', note: '',
  };
  db.nests.push(nest);
  db.edits.push({ edited_at: nest.created_at, table: 'nests', record_id: nest.nest_id,
    field: '(created)', old_value: '', new_value: `${nest.lat},${nest.lon}` });
  save();
  addMarker(nest);
  openNest(nest.nest_id);
}

// ---------- 地图 ----------
const map = L.map('map', { zoomControl: true });
const layers = {
  '地理院 标准': L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', {
    maxZoom: 18, attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>' }),
  '地理院 航拍': L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg', {
    maxZoom: 18, attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>' }),
  'OpenStreetMap': L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }),
};
layers['地理院 标准'].addTo(map);
L.control.layers(layers, null, { position: 'topright' }).addTo(map);
L.control.scale({ imperial: false }).addTo(map);

const markers = new Map();
function nestIcon(n) {
  const label = n.nest_id.split('-').pop();
  return L.divIcon({ className: '', iconSize: [28, 28], iconAnchor: [14, 14],
    html: `<div class="nest-icon ${n.loc_source === 'manual' ? 'manual' : ''}" style="width:28px;height:28px">${label}</div>` });
}
function addMarker(n) {
  const m = L.marker([n.lat, n.lon], { icon: nestIcon(n), draggable: true }).addTo(map);
  m.on('click', () => openNest(n.nest_id));
  m.on('dragend', () => {
    const p = m.getLatLng();
    const nest = findNest(n.nest_id);
    if (!nest) return;
    if (!confirm(`把 ${nest.nest_id} 移到新位置？\n（GPS 原值会保留）`)) { m.setLatLng([nest.lat, nest.lon]); return; }
    logEdit(nest.nest_id, 'lat', nest.lat, r6(p.lat));
    logEdit(nest.nest_id, 'lon', nest.lon, r6(p.lng));
    logEdit(nest.nest_id, 'loc_source', nest.loc_source, 'manual');
    nest.lat = r6(p.lat); nest.lon = r6(p.lng); nest.loc_source = 'manual';
    save();
    m.setIcon(nestIcon(nest));
    if (!$('#sheet').hidden && currentId === nest.nest_id) openNest(nest.nest_id);
  });
  markers.set(n.nest_id, m);
}
db.nests.forEach(addMarker);

if (db.nests.length) {
  map.fitBounds(L.latLngBounds(db.nests.map((n) => [n.lat, n.lon])).pad(0.3), { maxZoom: 17 });
} else {
  map.setView([DEFAULT_VIEW.lat, DEFAULT_VIEW.lon], DEFAULT_VIEW.zoom);
}

// ---------- GPS ----------
let fix = null;          // 最新定位 {lat, lon, acc, t}
let watchId = null;
let followOnce = false;
const me = L.circleMarker([0, 0], { radius: 7, color: '#fff', weight: 2, fillColor: '#1a73e8', fillOpacity: 1 });
const meAcc = L.circle([0, 0], { radius: 1, color: '#1a73e8', weight: 1, fillOpacity: 0.12 });

function setGpsStatus(text, cls) {
  const el = $('#gps-status');
  el.textContent = text; el.className = 'gps ' + cls;
}
function startGps() {
  if (!('geolocation' in navigator)) { setGpsStatus('此浏览器不支持定位', 'err'); return; }
  if (watchId != null) return;
  setGpsStatus('定位中…', 'fair');
  watchId = navigator.geolocation.watchPosition((pos) => {
    fix = { lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy, t: Date.now() };
    me.setLatLng([fix.lat, fix.lon]).addTo(map);
    meAcc.setLatLng([fix.lat, fix.lon]).setRadius(fix.acc).addTo(map);
    const a = Math.round(fix.acc);
    setGpsStatus(`GPS ±${a} m`, a <= 10 ? 'good' : a <= 30 ? 'fair' : 'poor');
    if (followOnce) { map.setView([fix.lat, fix.lon], Math.max(map.getZoom(), 17)); followOnce = false; }
  }, (err) => {
    const msg = { 1: '定位权限被拒绝', 2: '无法取得位置', 3: '定位超时' }[err.code] || err.message;
    setGpsStatus(msg, 'err');
    watchId = null;
  }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
}

$('#btn-locate').onclick = () => {
  followOnce = true;
  startGps();
  if (fix) { map.setView([fix.lat, fix.lon], Math.max(map.getZoom(), 17)); followOnce = false; }
};

$('#btn-add-gps').onclick = () => {
  startGps();
  if (!fix || Date.now() - fix.t > 30000) {
    alert('还没有取得最新的 GPS 位置，请稍等几秒再试。\n（也可以用“地图点选”）');
    return;
  }
  const a = Math.round(fix.acc);
  if (a > 30 && !confirm(`当前 GPS 误差约 ±${a} m，比较大。\n仍然在这里建巢？之后可以拖动标记校正。`)) return;
  createNest(fix.lat, fix.lon, 'gps', fix);
};

// ---------- 地图点选 ----------
let picking = false;
$('#btn-add-pick').onclick = () => { picking = true; $('#pick-hint').hidden = false; closeSheets(); };
$('#pick-cancel').onclick = () => { picking = false; $('#pick-hint').hidden = true; };
map.on('click', (e) => {
  if (!picking) return;
  picking = false; $('#pick-hint').hidden = true;
  createNest(e.latlng.lat, e.latlng.lng, 'manual', null); // 点选的巢没有 GPS 原值
});

// ---------- 详情表单 ----------
let currentId = null;
const findNest = (id) => db.nests.find((n) => n.nest_id === id);

function openNest(id) {
  const n = findNest(id); if (!n) return;
  currentId = id;
  closeSheets();
  $('#sheet-title').textContent = n.nest_id;
  $('#f-id').textContent = n.nest_id;
  $('#f-loc').textContent = `${n.lat}, ${n.lon}（${n.loc_source === 'gps' ? 'GPS' : '手动'}）`;
  $('#f-gps').textContent = n.gps_lat != null ? `${n.gps_lat}, ${n.gps_lon}（±${n.gps_accuracy_m} m）` : '无';
  $('#f-species').value = n.species;
  $('#f-note').value = n.note;
  const species = [...new Set(db.nests.map((x) => x.species).filter(Boolean))];
  $('#species-list').innerHTML = species.map((s) => `<option value="${esc(s)}">`).join('');
  const hist = db.edits.filter((e) => e.record_id === id).slice().reverse();
  $('#f-history ul').innerHTML = hist.map((e) =>
    `<li>${fmtTime(e.edited_at)} ${esc(e.field)}：${esc(e.old_value)} → ${esc(e.new_value)}</li>`).join('');
  $('#sheet').hidden = false;
  // 把巢移到面板上方的可见区域
  map.panTo([n.lat, n.lon], { animate: false });
  map.panBy([0, $('#sheet').offsetHeight / 2], { animate: false });
}

$('#nest-form').onsubmit = (ev) => {
  ev.preventDefault();
  const n = findNest(currentId); if (!n) return;
  const sp = $('#f-species').value.trim(), note = $('#f-note').value.trim();
  logEdit(n.nest_id, 'species', n.species, sp);
  logEdit(n.nest_id, 'note', n.note, note);
  n.species = sp; n.note = note;
  save();
  $('#sheet').hidden = true;
};
$('#f-delete').onclick = () => {
  const n = findNest(currentId); if (!n) return;
  if (!confirm(`删除 ${n.nest_id}？\n删除会写进修改记录，但巢本身不能恢复。`)) return;
  db.edits.push({ edited_at: nowIso(), table: 'nests', record_id: n.nest_id, field: '(deleted)',
    old_value: JSON.stringify(n), new_value: '' });
  db.nests = db.nests.filter((x) => x !== n);
  markers.get(n.nest_id)?.remove(); markers.delete(n.nest_id);
  save();
  $('#sheet').hidden = true;
};

// ---------- 列表 ----------
$('#btn-list').onclick = () => {
  closeSheets();
  $('#list-count').textContent = `（${db.nests.length}）`;
  $('#list-items').innerHTML = db.nests.length ? db.nests.slice().reverse().map((n) =>
    `<li data-id="${n.nest_id}"><b>${n.nest_id}</b> ${esc(n.species || '（未填种）')}
     <small>${n.lat}, ${n.lon} · ${n.loc_source === 'gps' ? 'GPS' : '手动'} · ${fmtTime(n.created_at)}</small></li>`).join('')
    : '<li class="hint">还没有记录。</li>';
  $('#list').hidden = false;
};
$('#list-items').onclick = (e) => {
  const li = e.target.closest('li[data-id]'); if (li) openNest(li.dataset.id);
};

// ---------- 导出 ----------
const NEST_COLS = ['nest_id', 'created_at', 'lat', 'lon', 'loc_source', 'gps_lat', 'gps_lon', 'gps_accuracy_m', 'species', 'note'];
const EDIT_COLS = ['edited_at', 'table', 'record_id', 'field', 'old_value', 'new_value'];

function toCsv(rows, cols) {
  const cell = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n') + '\r\n';
}
function stamp() { return new Date().toISOString().slice(0, 16).replace(/[-:T]/g, ''); }

async function download(name, text, mime) {
  const blob = new Blob([text], { type: mime });
  const file = new File([blob], name, { type: mime });
  // 手机上优先用系统“分享”，可直接存到文件 / 发给自己
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); markExported(); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  markExported();
}
function markExported() { db.lastExport = nowIso(); save(); showLastExport(); }
function showLastExport() {
  $('#exp-last').textContent = db.lastExport ? `上次导出：${fmtTime(db.lastExport)}` : '还没有导出过。';
}

$('#btn-export').onclick = () => { closeSheets(); showLastExport(); $('#export').hidden = false; };
$('#exp-nests').onclick = () => download(`nests_${stamp()}.csv`, toCsv(db.nests, NEST_COLS), 'text/csv');
$('#exp-edits').onclick = () => download(`edits_${stamp()}.csv`, toCsv(db.edits, EDIT_COLS), 'text/csv');
$('#exp-geojson').onclick = () => {
  const gj = { type: 'FeatureCollection', features: db.nests.map((n) => ({
    type: 'Feature', geometry: { type: 'Point', coordinates: [n.lon, n.lat] },
    properties: Object.fromEntries(NEST_COLS.map((c) => [c, n[c]])) })) };
  download(`nests_${stamp()}.geojson`, JSON.stringify(gj, null, 2), 'application/geo+json');
};

// ---------- 杂项 ----------
function $(s) { return document.querySelector(s); }
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function fmtTime(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function closeSheets() { document.querySelectorAll('.sheet').forEach((s) => (s.hidden = true)); }
document.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => ($('#' + b.dataset.close).hidden = true)));

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW 注册失败', e));
}
