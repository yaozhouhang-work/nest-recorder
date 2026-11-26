/* 写真（v0.11〜）
 * - 確認記録に写真を付ける。画質を選んで縮小（標準 1600 px / 高画質 2560 px / 原寸）
 * - 名前は「巣の名前_日付_連番」に自動で変える（例：26_ヒヨドリ3_20261126_01.jpg）
 * - 本体はこの端末の IndexedDB（store.js、キー 'photo:名前'）。一覧は db.photos
 * - Google ドライブの保存先フォルダの中の「写真」フォルダへアップロード（ZIP には入れない。CSV は名前だけ）
 */
'use strict';

const PHOTO_MAX = { std: 1600, high: 2560, orig: 0 };   // 長辺の上限（0 = 縮小しない）
const PHOTO_FOLDER = '写真';

function photoQuality() { return db.settings.photoQuality || 'high'; }
function safeName(s) { return String(s || '').trim().replace(/[\\/:*?"<>|#%\s]+/g, '_').replace(/^_+|_+$/g, '') || 'nest'; }
function photoStem(nest, datetime) {
  const d = String(datetime || nowIso()).slice(0, 10).replace(/-/g, '');
  return `${safeName(nest.name || nest.nest_id)}_${d}_`;
}
/* 同じ巣・同じ日の連番。taken = この画面でまだ保存していない分の名前 */
function nextPhotoName(stem, ext, taken = []) {
  const re = new RegExp('^' + stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\d+)');
  let max = 0;
  for (const n of [...db.photos.map((p) => p.name), ...taken]) { const m = re.exec(n); if (m) max = Math.max(max, Number(m[1])); }
  return `${stem}${String(max + 1).padStart(2, '0')}.${ext}`;
}
function loadImage(file) {
  return new Promise((ok, ng) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); ok(img); };
    img.onerror = () => { URL.revokeObjectURL(url); ng(new Error('image')); };
    img.src = url;
  });
}
/* 画質に合わせて縮小。原寸・または元が小さい JPEG はそのまま（再圧縮で劣化させない） */
async function shrinkPhoto(file, quality) {
  const max = PHOTO_MAX[quality] ?? PHOTO_MAX.high;
  const isJpeg = /jpe?g$/i.test(file.type) || /\.jpe?g$/i.test(file.name);
  const origExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
  if (!max) return { blob: file, ext: origExt, type: file.type || 'image/jpeg' };
  const img = await loadImage(file);                       // 向き（EXIF）はブラウザが反映して描画する
  const w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, max / Math.max(w, h));
  if (s === 1 && isJpeg) return { blob: file, ext: 'jpg', type: 'image/jpeg', w, h };
  const c = document.createElement('canvas');
  c.width = Math.round(w * s); c.height = Math.round(h * s);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.9));
  if (!blob) throw new Error('encode');
  return { blob, ext: 'jpg', type: 'image/jpeg', w: c.width, h: c.height };
}
/* 写真を取り込んで端末に保存し、名前を返す（db.photos への登録は確認記録を保存したとき） */
async function addPhotoFile(file, nest, datetime, taken) {
  const r = await shrinkPhoto(file, photoQuality());
  const name = nextPhotoName(photoStem(nest, datetime), r.ext, taken);
  await storePutPhoto(name, { blob: r.blob, type: r.type, original: file.name, size: r.blob.size, added_at: nowIso() });
  return name;
}
const photoUrls = new Map();
async function photoThumbUrl(name) {
  if (photoUrls.has(name)) return photoUrls.get(name);
  const p = await storeGetPhoto(name);
  const url = p ? URL.createObjectURL(p.blob) : '';
  photoUrls.set(name, url);
  return url;
}
function photoMeta(name) { return db.photos.find((p) => p.name === name); }
function pendingPhotos() { return db.photos.filter((p) => !p.drive_id && p.local !== false); }

/* まだドライブにない写真を「写真」フォルダへ。戻り値：{ ok, ng } */
async function uploadPhotos(onProgress) {
  const list = pendingPhotos();
  if (!list.length) return { ok: 0, ng: 0 };
  const folder = await driveEnsureSubfolder(PHOTO_FOLDER);
  let ok = 0, ng = 0;
  for (const p of list) {
    try {
      const rec = await storeGetPhoto(p.name);
      if (!rec) { p.local = false; ng++; continue; }
      const r = await driveUpload(rec.blob, p.name, { folderId: folder, mimeType: rec.type || 'image/jpeg' });
      p.drive_id = r.id; p.uploaded_at = nowIso(); ok++;
      save();
    } catch (e) { console.warn(e); ng++; }
    onProgress && onProgress(ok + ng, list.length);
  }
  return { ok, ng };
}
