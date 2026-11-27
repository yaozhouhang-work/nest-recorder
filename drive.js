/* Google ドライブ連携（任意）
 * lab で共有している Google ドライブのフォルダに ZIP を保存し、そこから読み込む。
 * - サーバーは使わない。ブラウザから Google にログインし、Drive API を直接呼ぶ
 * - 権限は drive.file（書き込み：このツールが作ったファイルと、選択画面で選んだファイル／フォルダだけ）
 *   + drive.readonly（v0.13〜。ラボデータのフォルダに他の人が置いた ZIP を探して読むため。drive.file だけでは
 *     フォルダを選んでも中のファイルは見えなかった。読むだけで、データはこの端末の外へは送らない）
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
const DRIVE_READ_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file ' + DRIVE_READ_SCOPE;
/* v0.14.2：「更新マスター」のときだけ、ラボのアカウントに全体の権限を追加で求める。
 * drive.file では、手で置いた ZIP（このツールが作っていないファイル）を「過去分」へ移せなかったため */
const DRIVE_FULL_SCOPE = 'https://www.googleapis.com/auth/drive';
const APP_MARK = "appProperties has { key='nestRecorder' and value='1' }";   // このツールが作ったフォルダの印
const FOLDER_MIME = 'application/vnd.google-apps.folder';

const driveEnabled = () => !!(DRIVE_CONFIG.clientId && DRIVE_CONFIG.apiKey && DRIVE_CONFIG.appId);
let driveToken = null, driveTokenExp = 0, driveTokenClient = null, driveCanRead = false, driveCanFull = false;

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
function driveAuth(full = false) {
  if (driveToken && Date.now() < driveTokenExp - 60000 && (!full || driveCanFull)) return Promise.resolve(driveToken);
  return new Promise((ok, ng) => {
    // まだ読み込めていなければ読み込みを始めておき、もう一度押してもらう（読み込みを待つとポップアップがブロックされる）
    if (!window.google?.accounts?.oauth2) { drivePreload(); ng(new Error('not_loaded')); return; }
    driveTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: DRIVE_CONFIG.clientId, scope: full ? DRIVE_SCOPE + ' ' + DRIVE_FULL_SCOPE : DRIVE_SCOPE,
      include_granted_scopes: true,
      callback: (r) => {
        if (r.error) { ng(new Error(r.error)); return; }
        driveToken = r.access_token; driveTokenExp = Date.now() + Number(r.expires_in || 3600) * 1000;
        // 同意画面で「読み取り」のチェックを外されたら、ラボデータは自動では探せない
        driveCanFull = google.accounts.oauth2.hasGrantedAllScopes(r, DRIVE_FULL_SCOPE);
        driveCanRead = driveCanFull || google.accounts.oauth2.hasGrantedAllScopes(r, DRIVE_READ_SCOPE);
        ok(driveToken);
      },
      error_callback: (e) => ng(new Error(e?.type || 'auth')),
    });
    driveTokenClient.requestAccessToken({ prompt: '' });
  });
}
function needPicker() { if (!window.google?.picker) { drivePreload(); throw new Error('not_loaded'); } }
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
/* フォルダを選ぶ。key = 'driveFolder'（自分の保存先）/ 'masterFolder'（ラボデータ A の置き場） */
async function drivePickFolder(key = 'driveFolder') {
  const token = await driveAuth();
  needPicker();
  const [f] = await drivePicker(token, folderViews(), false);
  if (!f) return null;
  db.settings[key] = { id: f.id, name: f.name };
  save();
  return db.settings[key];
}
/* フォルダに新しいファイルとして保存（上書きはしない）。既定は自分の保存先フォルダに ZIP */
async function driveUpload(blob, name, opt = {}) {
  const meta = { name, parents: [opt.folderId || db.settings.driveFolder.id], mimeType: opt.mimeType || 'application/zip' };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
  form.append('file', blob, name);
  const res = await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name',
    { method: 'POST', body: form });
  return res.json();
}
/* ファイルを選んで取り出す（複数可）。
 * ファイルの種類では絞らない（ドライブの画面から手で入れた ZIP は種類が zip になっていないことがあり、見えなかった）。
 * 読めないファイルは読み込みのときに知らせる */
async function drivePickFiles() {
  const token = await driveAuth();
  needPicker();
  const P = google.picker;
  const inFolder = (f, label) => new P.DocsView(P.ViewId.DOCS).setIncludeFolders(true).setParent(f.id).setLabel(label);
  const views = [];
  if (db.settings.driveFolder) views.push(inFolder(db.settings.driveFolder, '保存先'));
  if (db.settings.masterFolder) views.push(inFolder(db.settings.masterFolder, 'ラボデータ'));
  views.push(new P.DocsView(P.ViewId.DOCS).setIncludeFolders(true).setParent('root').setLabel('マイドライブ'),
    new P.DocsView(P.ViewId.DOCS).setIncludeFolders(true).setOwnedByMe(false).setLabel('共有アイテム'));
  const docs = (await drivePicker(token, views, true)).filter((d) => d.mimeType !== FOLDER_MIME);
  const files = [];
  for (const d of docs) {
    const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(d.id)}?alt=media&supportsAllDrives=true`);
    const file = new File([await res.blob()], d.name);
    file.driveId = d.id;                                  // まとめた後に「過去分」へ移すため
    files.push(file);
  }
  return files;
}
/* 保存先フォルダの中のサブフォルダ（なければ作る）。
 * 読み取り権限で手作りのフォルダも見えるようになったが、そこへは書き込めないので、このツールが作った印のあるものだけを使う */
async function driveEnsureSubfolder(name) {
  const parent = db.settings.driveFolder.id;
  const q = encodeURIComponent(`name='${name.replace(/'/g, "\\'")}' and '${parent}' in parents and mimeType='${FOLDER_MIME}' and trashed=false and ${APP_MARK}`);
  const list = await (await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`)).json();
  if (list.files?.length) return list.files[0].id;
  const res = await driveFetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parent], appProperties: { nestRecorder: '1' } }),
  });
  return (await res.json()).id;
}
/* ファイルを保存先フォルダから別のフォルダへ移す */
async function driveMove(fileId, toFolder) {
  const meta = await (await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=parents&supportsAllDrives=true`)).json();
  const from = (meta.parents || []).join(',');
  await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?addParents=${toFolder}` +
    `${from ? '&removeParents=' + from : ''}&supportsAllDrives=true&fields=id`, { method: 'PATCH' });
}
/* フォルダの中の ZIP を新しい順に（読み取り権限があれば、他の人が置いたものも見える） */
async function driveListZips(folderId) {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false and (mimeType='application/zip' or mimeType='application/x-zip-compressed' or name contains '.zip')`);
  const res = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=modifiedTime desc&pageSize=50` +
    '&fields=files(id,name,modifiedTime,size)&supportsAllDrives=true&includeItemsFromAllDrives=true');
  return (await res.json()).files || [];
}
async function driveDownload(id, name) {
  const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`);
  const file = new File([await res.blob()], name);
  file.driveId = id;
  return file;
}
/* このアカウントがフォルダにファイルを入れられるか（ラボのアカウントかどうかの判定に使う。v0.14〜） */
async function driveCanWrite(folderId) {
  const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?fields=capabilities(canAddChildren)&supportsAllDrives=true`);
  return !!(await res.json()).capabilities?.canAddChildren;
}
