/* データの保存先（v0.10〜）：IndexedDB。
 * localStorage（約 5 MB）では足りなくなったため。使えない環境では localStorage に戻る。
 * キー：'db' = 今のデータ、'backup' = 1 世代前、'undo' = 全消去の取り消し用 { data, cleared_at }
 */
'use strict';

const IDB_NAME = 'nest-recorder', IDB_STORE = 'kv';
const LS_KEYS = { db: 'nest-recorder-v0', backup: 'nest-recorder-backup',
  undo: 'nest-recorder-undo-clear', undoAt: 'nest-recorder-undo-clear-at' };   // 旧版（〜v0.9.1）

let idb = null;            // IDBDatabase。null なら localStorage を使う
let saveChain = Promise.resolve();

function idbOpen(version) {
  return new Promise((resolve, reject) => {
    const r = version ? indexedDB.open(IDB_NAME, version) : indexedDB.open(IDB_NAME);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(IDB_STORE)) r.result.createObjectStore(IDB_STORE); };
    r.onsuccess = () => {
      const d = r.result;
      if (d.objectStoreNames.contains(IDB_STORE)) { resolve(d); return; }
      // 入れ物（kv）のない DB ができていた場合：版を上げて作り直す
      const v = d.version + 1; d.close();
      idbOpen(v).then(resolve, reject);
    };
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error('IndexedDB blocked'));
  });
}
// ops: [['get', key] | ['put', key, value] | ['del', key]]。1 つのトランザクションで実行し、get の結果を返す
function idbTx(ops) {
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, ops.some((o) => o[0] !== 'get') ? 'readwrite' : 'readonly');
    const st = tx.objectStore(IDB_STORE), out = {};
    ops.forEach(([op, k, v]) => {
      if (op === 'get') st.get(k).onsuccess = (e) => { out[k] = e.target.result; };
      else if (op === 'put') st.put(v, k);
      else st.delete(k);
    });
    tx.oncomplete = () => resolve(out);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('aborted'));
  });
}
function lsJson(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
function lsUndo() {
  const raw = lsJson(LS_KEYS.undo); if (!raw) return null;
  const at = localStorage.getItem(LS_KEYS.undoAt);
  if (at) return { data: raw, cleared_at: at };
  return raw.data ? { data: raw.data, cleared_at: raw.cleared_at } : null;   // v0.8 の形式
}

// 起動時に 1 回。{ data, undoAt, backend, migrated } を返す
async function storeInit() {
  try { if (window.indexedDB) idb = await idbOpen(); } catch (e) { console.warn('IndexedDB', e); idb = null; }
  if (!idb) return { data: lsJson(LS_KEYS.db) || lsJson(LS_KEYS.backup), undoAt: lsUndo()?.cleared_at || null, backend: 'localStorage' };
  let got = await idbTx([['get', 'db'], ['get', 'backup'], ['get', 'undo']]);
  let migrated = false;
  if (got.db === undefined && localStorage.getItem(LS_KEYS.db) !== null) {
    // 旧版のデータを移す。書けたことを読み直して確かめてから localStorage を消す
    const data = lsJson(LS_KEYS.db) || lsJson(LS_KEYS.backup), backup = lsJson(LS_KEYS.backup), undo = lsUndo();
    const ops = [['put', 'db', data]];
    if (backup) ops.push(['put', 'backup', backup]);
    if (undo) ops.push(['put', 'undo', undo]);
    await idbTx(ops);
    got = await idbTx([['get', 'db'], ['get', 'backup'], ['get', 'undo']]);
    if (JSON.stringify(got.db) === JSON.stringify(data)) {
      Object.values(LS_KEYS).forEach((k) => localStorage.removeItem(k));
      migrated = true;
    }
  }
  return { data: got.db || got.backup || null, undoAt: got.undo?.cleared_at || null, backend: 'IndexedDB', migrated };
}

// 保存。順番に実行し、前のデータを 'backup' に回す。失敗したら onError
function storeSave(data, onError) {
  const snap = JSON.parse(JSON.stringify(data));          // 呼んだ時点の内容を保存する
  saveChain = saveChain.then(async () => {
    if (!idb) {
      const prev = localStorage.getItem(LS_KEYS.db);
      if (prev) localStorage.setItem(LS_KEYS.backup, prev);
      localStorage.setItem(LS_KEYS.db, JSON.stringify(snap));
      return;
    }
    const { db: prev } = await idbTx([['get', 'db']]);
    await idbTx(prev ? [['put', 'backup', prev], ['put', 'db', snap]] : [['put', 'db', snap]]);
  }).catch((e) => onError && onError(e));
  return saveChain;
}

// 全消去：今のデータを取り消し用に移し、空のデータを保存（バックアップは作らない）
async function storeClear(current, empty) {
  await saveChain;
  const at = nowIso();
  const cur = JSON.parse(JSON.stringify(current)), emp = JSON.parse(JSON.stringify(empty));
  if (!idb) {
    localStorage.removeItem(LS_KEYS.undo); localStorage.removeItem(LS_KEYS.undoAt); localStorage.removeItem(LS_KEYS.backup);
    try {
      localStorage.setItem(LS_KEYS.undo, JSON.stringify(cur)); localStorage.setItem(LS_KEYS.undoAt, at);
    } catch (e) { localStorage.removeItem(LS_KEYS.undo); localStorage.removeItem(LS_KEYS.undoAt); throw e; }
    localStorage.setItem(LS_KEYS.db, JSON.stringify(emp));
    return at;
  }
  await idbTx([['put', 'undo', { data: cur, cleared_at: at }], ['del', 'backup'], ['put', 'db', emp]]);
  return at;
}
// 取り消し用の控え（データ）。なければ null
async function storeGetUndo() {
  await saveChain;
  if (!idb) return lsUndo()?.data || null;
  const { undo } = await idbTx([['get', 'undo']]);
  return undo ? undo.data : null;
}
// 取り消しが済んだら控えを消す
async function storeDropUndo() {
  await saveChain;
  if (!idb) { localStorage.removeItem(LS_KEYS.undo); localStorage.removeItem(LS_KEYS.undoAt); return; }
  await idbTx([['del', 'undo']]);
}
async function storeUsage() {
  try { const e = await navigator.storage?.estimate?.(); return e ? { used: e.usage, quota: e.quota } : null; }
  catch (e) { return null; }
}
