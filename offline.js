/* オフライン地図（v0.11〜）
 * 電波のない場所（研究林など）に行く前に、今の画面の範囲の地図を端末に保存する。
 * 保存先は sw.js と同じキャッシュ（nest-tiles-v1）。オフラインのとき sw.js がここから地図を出す。
 * 国土地理院の地図は大量の一括取得を避けるよう求めているので、1 回の枚数に上限を設け、同時に取る数も絞る。
 */
'use strict';

const OFF_CACHE = 'nest-tiles-v1';
const OFF_MAX_TILES = 4000;      // 1 回に保存する枚数の上限
const OFF_MIN_Z = 12, OFF_MAX_Z = 17;
const OFF_PARALLEL = 4;

function lon2x(lon, z) { return Math.floor((lon + 180) / 360 * 2 ** z); }
function lat2y(lat, z) {
  const r = lat * Math.PI / 180;
  return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 2 ** z);
}
/* 範囲内のタイルの URL。zMax まで。18 は枚数が上限に収まるときだけ足す */
function offTileUrls(bounds, template, zMax = OFF_MAX_Z) {
  const urls = [];
  const add = (z) => {
    const x0 = lon2x(bounds.getWest(), z), x1 = lon2x(bounds.getEast(), z);
    const y0 = lat2y(bounds.getNorth(), z), y1 = lat2y(bounds.getSouth(), z);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++)
      urls.push(template.replace('{z}', z).replace('{x}', x).replace('{y}', y).replace('{s}', 'a'));
  };
  for (let z = OFF_MIN_Z; z <= zMax; z++) add(z);
  return urls;
}
function offPlan(bounds, template) {
  let urls = offTileUrls(bounds, template, OFF_MAX_Z);
  const with18 = offTileUrls(bounds, template, 18);
  if (with18.length <= OFF_MAX_TILES) urls = with18;
  return { urls, zMax: urls === with18 ? 18 : OFF_MAX_Z };
}
let offAbort = false;
/* 保存。onProgress(done, total, bytes)。既に保存済みのタイルは取り直さない */
async function offDownload(urls, onProgress) {
  offAbort = false;
  const cache = await caches.open(OFF_CACHE);
  let done = 0, bytes = 0, failed = 0, fresh = 0, i = 0;
  async function worker() {
    while (i < urls.length && !offAbort) {
      const url = urls[i++];
      try {
        const hit = await cache.match(url);
        if (!hit) {
          const res = await fetch(url, { mode: 'cors' });
          if (!res.ok) throw new Error(res.status);
          const b = await res.clone().blob();
          bytes += b.size;
          await cache.put(url, res);
          fresh++;
        }
      } catch (e) { failed++; }
      done++;
      onProgress && onProgress(done, urls.length, bytes);
    }
  }
  await Promise.all(Array.from({ length: OFF_PARALLEL }, worker));
  return { done, failed, fresh, bytes, aborted: offAbort };
}
async function offClear() { await caches.delete(OFF_CACHE); }
