/* Google ドライブ連携（任意）
 * lab で共有している Google ドライブのフォルダに ZIP を保存し、そこから読み込む。
 * - サーバーは使わない。ブラウザから Google にログインし、Drive API を直接呼ぶ
 * - 権限は drive.file：このツールが作ったファイルと、ユーザーが Google の選択画面で選んだファイル／フォルダだけ
 * - 各自は自分のファイルだけを保存し、他の人のファイルは書き換えない。読み込み時に ID で統合する
 * DRIVE_CONFIG が空のあいだは、画面にこの機能は出ない。
 */
'use strict';

const DRIVE_CONFIG = {
  // ブラウザ用の公開値（秘密ではない）。安全性は Google Cloud 側の生成元／リファラー制限とテストユーザーで担保
  clientId: '557575965611-u86447dni28q1381mg6h3794do2e5vht.apps.googleusercontent.com',   // OAuth クライアント ID
  apiKey: 'AIzaSyAjreV5Jyjw4GU7c3aRLNcu1cNuBxV1RWQ',   // API キー（Google Picker 用。HTTP リファラーで制限済み）
  appId: '557575965611',                              // Google Cloud のプロジェクト番号
};
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

const driveEnabled = () => !!(DRIVE_CONFIG.clientId && DRIVE_CONFIG.apiKey && DRIVE_CONFIG.appId);
let driveToken = null, driveTokenExp = 0, driveTokenClient = null;

function loadScriptOnce(src) {
  return new Promise((ok, ng) => {
    const old = document.querySelector(`script[src="${src}"]`);
    if (old) { if (old.dataset.loaded) ok(); else old.addEventListener('load', ok); return; }
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = () => { s.dataset.loaded = '1'; ok(); };
    s.onerror = () => ng(new Error('script: ' + src));
    document.head.appendChild(s);
  });
}
/* ポップアップがブロックされないよう、データ画面を開いた時点で読み込んでおく */
async function drivePreload() {
  if (!driveEnabled() || !navigator.onLine) return;
  try {
    await Promise.all([loadScriptOnce('https://accounts.google.com/gsi/client'),
      loadScriptOnce('https://apis.google.com/js/api.js')]);
    await new Promise((r) => gapi.load('picker', r));
  } catch (e) { console.warn(e); }
}
function driveAuth() {
  if (driveToken && Date.now() < driveTokenExp - 60000) return Promise.resolve(driveToken);
  return new Promise((ok, ng) => {
    if (!window.google?.accounts?.oauth2) { ng(new Error('not_loaded')); return; }
    driveTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: DRIVE_CONFIG.clientId, scope: DRIVE_SCOPE,
      callback: (r) => {
        if (r.error) { ng(new Error(r.error)); return; }
        driveToken = r.access_token; driveTokenExp = Date.now() + Number(r.expires_in || 3600) * 1000; ok(driveToken);
      },
      error_callback: (e) => ng(new Error(e?.type || 'auth')),
    });
    driveTokenClient.requestAccessToken({ prompt: '' });
  });
}
function drivePicker(token, views, multi) {
  return new Promise((ok) => {
    const P = google.picker;
    const b = new P.PickerBuilder().setOAuthToken(token).setDeveloperKey(DRIVE_CONFIG.apiKey)
      .setAppId(DRIVE_CONFIG.appId).setLocale(db.settings.lang === 'zh' ? 'zh-CN' : db.settings.lang)
      .enableFeature(P.Feature.SUPPORT_DRIVES)
      .setCallback((d) => {
        if (d.action === P.Action.PICKED) ok(d.docs || []);
        else if (d.action === P.Action.CANCEL) ok([]);
      });
    if (multi) b.enableFeature(P.Feature.MULTISELECT_ENABLED);
    views.forEach((v) => b.addView(v));
    b.build().setVisible(true);
  });
}
function folderViews() {
  const P = google.picker;
  const f = () => new P.DocsView(P.ViewId.DOCS).setIncludeFolders(true).setSelectFolderEnabled(true).setMimeTypes(FOLDER_MIME);
  return [
    f().setParent('root').setLabel('マイドライブ'),             // マイドライブをフォルダ階層で表示
    f().setOwnedByMe(false).setLabel('共有アイテム'),           // 他の人から共有されたフォルダ
    f().setEnableDrives(true).setLabel('共有ドライブ'),         // 共有ドライブ
  ];
}
async function driveFetch(url, opt = {}) {
  const token = await driveAuth();
  const res = await fetch(url, { ...opt, headers: { ...(opt.headers || {}), Authorization: 'Bearer ' + token } });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  return res;
}
/* 保存先フォルダを選ぶ */
async function drivePickFolder() {
  const token = await driveAuth();
  const [f] = await drivePicker(token, folderViews(), false);
  if (!f) return null;
  db.settings.driveFolder = { id: f.id, name: f.name };
  save();
  return db.settings.driveFolder;
}
/* フォルダに新しいファイルとして保存（上書きはしない） */
async function driveUpload(blob, name) {
  const folder = db.settings.driveFolder;
  const meta = { name, parents: [folder.id], mimeType: 'application/zip' };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
  form.append('file', blob, name);
  const res = await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name',
    { method: 'POST', body: form });
  return res.json();
}
/* フォルダ内のファイルを選んで取り出す（複数可） */
async function drivePickFiles() {
  const P = google.picker, token = await driveAuth();
  const view = new P.DocsView(P.ViewId.DOCS).setIncludeFolders(false)
    .setMimeTypes('application/zip,application/x-zip-compressed,text/csv,application/vnd.google-earth.kmz');
  if (db.settings.driveFolder) view.setParent(db.settings.driveFolder.id);
  const docs = await drivePicker(token, [view], true);
  const files = [];
  for (const d of docs) {
    const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(d.id)}?alt=media&supportsAllDrives=true`);
    files.push(new File([await res.blob()], d.name));
  }
  return files;
}
