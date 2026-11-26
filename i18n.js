/* 界面文字。CSV 里只存英文代码，切换语言不影响数据。 */
'use strict';

const I18N = {
  ja: {
    app_title: '巣記録', trial: '試作版',
    gps_off: 'GPS オフ', gps_locating: '測位中…', gps_unsupported: 'このブラウザは位置情報に非対応',
    gps_denied: '位置情報が許可されていません', gps_unavailable: '位置を取得できません', gps_timeout: '測位タイムアウト',
    btn_add_gps: '＋ 現在地に巣を登録', btn_locate: '📍 現在地', btn_pick: '👆 地図で指定', btn_list: '☰ 一覧', btn_data: '💾 データ',
    pick_hint: '地図をタップして巣の位置を指定', cancel: 'キャンセル', save: '保存', delete: '削除', close: '閉じる',
    unexported: '未書き出し {n} 件',
    // 巣
    nest: '巣', nest_info: '巣の情報（種・タイプ・高さなど）', nest_id: '巣ID', location: '位置', gps_raw: 'GPS 原値', none: 'なし', manual: '手動', gps: 'GPS',
    species: '種', nest_type: '巣のタイプ', height_m: '巣の高さ (m)', site: '営巣場所', material: '巣材', photo_ids: '写真番号', note: '備考',
    ph_species: '例：シジュウカラ', ph_site: '例：ナナカマドの枝、地上 2 m', ph_photo: '例：IMG_0123, 0124',
    drag_hint: '位置の修正：地図上の巣マーカーをドラッグ', history: '修正履歴',
    // 访查
    visits: '巣の確認記録', add_visit: '＋ 確認を記録', visit: '確認', visit_no: '{n} 回目', no_visits: 'まだ確認記録がありません。',
    datetime: '日時', recorder: '記録者', status: '状態', eggs: '卵数', chicks: '雛数', adult: '親鳥', blank_hint: '空欄 = 未記録（0 と区別）',
    // 列表
    nest_list: '巣の一覧', no_nests: 'まだ記録がありません。', no_species: '（種 未入力）', last_visit: '最終確認',
    // 数据
    data_title: 'データの保存と読み込み',
    data_warn: 'データはこのスマホのブラウザ内だけに保存されています。調査のたびに必ず書き出してください。',
    export_all: '⇩ すべて書き出す（CSV 3 件）', export_geojson: 'GeoJSON を書き出す（QGIS 用）',
    import: '⇧ CSV を読み込む', import_hint: '以前に書き出した CSV、または他の人の CSV を選択（複数可）。同じ ID は新しい方を残します。',
    last_export: '最終書き出し：{t}', never_exported: 'まだ書き出していません。',
    storage_persist_ok: '保存領域：永続化済み（ブラウザが自動で消しにくい状態）',
    storage_persist_no: '保存領域：永続化されていません。ホーム画面に追加すると消えにくくなります。',
    import_done: '読み込み完了：巣 {n} 件追加・{u} 件更新、確認記録 {v} 件追加・{w} 件更新',
    import_bad: '読み込めないファイルがありました：{f}',
    // 提醒
    remind_title: '書き出しのお願い',
    remind_body: 'まだ書き出していない変更が {n} 件あります。スマホの不具合やブラウザのデータ消去に備えて、今すぐ書き出してください。',
    remind_export: '今すぐ書き出す', remind_later: 'あとで',
    welcome_title: 'はじめに',
    welcome_body: 'これまでの記録（CSV）があれば、先に読み込んでから記録を始めてください。',
    welcome_import: '以前の CSV を読み込む', welcome_new: '新しく始める',
    // 设置
    settings: '設定', language: '言語', recorder_code: '記録者コード',
    recorder_hint: '英字 2〜4 文字（例：YZH）。ID に含まれ、複数人の記録が重ならないようにします。',
    need_recorder: '先に記録者コードを設定してください。',
    // 确认
    confirm_poor_gps: '現在の GPS 誤差は約 ±{a} m と大きめです。\nこの位置で登録しますか？（あとでマーカーをドラッグして修正できます）',
    wait_gps: 'まだ最新の GPS 位置が取得できていません。数秒待ってから再度お試しください。\n（「地図で指定」も使えます）',
    confirm_move: '{id} を新しい位置に移動しますか？\n（GPS 原値は残ります）',
    confirm_delete_nest: '{id} を削除しますか？\nこの巣の確認記録もすべて削除されます。修正履歴には残ります。',
    confirm_delete_visit: 'この確認記録を削除しますか？修正履歴には残ります。',
    save_failed: '保存に失敗しました：{m}\nすぐに書き出してください。',
    load_failed: 'データを読み込めませんでした：{m}\nページを再読み込みしてください。直らない場合は連絡してください。',
    storage_where: '保存先：{b}（使用中 約 {u} MB）',
  },
  zh: {
    app_title: '巢记录', trial: '试做版',
    gps_off: 'GPS 未开启', gps_locating: '定位中…', gps_unsupported: '此浏览器不支持定位',
    gps_denied: '定位权限被拒绝', gps_unavailable: '无法取得位置', gps_timeout: '定位超时',
    btn_add_gps: '＋ 在当前位置建巢', btn_locate: '📍 定位', btn_pick: '👆 地图点选', btn_list: '☰ 列表', btn_data: '💾 数据',
    pick_hint: '点地图选巢的位置', cancel: '取消', save: '保存', delete: '删除', close: '关闭',
    unexported: '未导出 {n} 条',
    nest: '巢', nest_info: '巢的信息（种、类型、高度等）', nest_id: '巢编号', location: '位置', gps_raw: 'GPS 原值', none: '无', manual: '手动', gps: 'GPS',
    species: '种', nest_type: '巢的类型', height_m: '巢高 (m)', site: '营巢位置', material: '巢材', photo_ids: '照片编号', note: '备注',
    ph_species: '例：シジュウカラ', ph_site: '例：花楸树枝上，离地 2 m', ph_photo: '例：IMG_0123, 0124',
    drag_hint: '要校正位置：直接拖动地图上的巢标记', history: '修改记录',
    visits: '访查记录', add_visit: '＋ 记录访查', visit: '访查', visit_no: '第 {n} 次', no_visits: '还没有访查记录。',
    datetime: '日期时间', recorder: '记录者', status: '状态', eggs: '卵数', chicks: '雏数', adult: '亲鸟', blank_hint: '空白 = 未记录（与 0 区分）',
    nest_list: '巢列表', no_nests: '还没有记录。', no_species: '（未填种）', last_visit: '最近访查',
    data_title: '数据保存与导入',
    data_warn: '数据只存在这台手机的浏览器里。每次调查后请务必导出。',
    export_all: '⇩ 全部导出（3 个 CSV）', export_geojson: '导出 GeoJSON（给 QGIS）',
    import: '⇧ 导入 CSV', import_hint: '选择之前导出的 CSV 或别人的 CSV（可多选）。相同编号保留较新的一条。',
    last_export: '上次导出：{t}', never_exported: '还没有导出过。',
    storage_persist_ok: '存储：已设为持久保存（浏览器不易自动清除）',
    storage_persist_no: '存储：未设为持久保存。添加到主屏幕后更不容易丢失。',
    import_done: '导入完成：巢新增 {n} 条、更新 {u} 条；访查新增 {v} 条、更新 {w} 条',
    import_bad: '有文件无法识别：{f}',
    remind_title: '请导出数据',
    remind_body: '还有 {n} 处修改没有导出。为防止手机故障或浏览器清除数据，请现在导出。',
    remind_export: '现在导出', remind_later: '稍后',
    welcome_title: '开始之前',
    welcome_body: '如果有之前的记录（CSV），请先导入，再开始记录。',
    welcome_import: '导入之前的 CSV', welcome_new: '从头开始',
    settings: '设置', language: '语言', recorder_code: '记录者代码',
    recorder_hint: '2–4 个英文字母（例：YZH）。会写进编号，避免多人记录时编号重复。',
    need_recorder: '请先设置记录者代码。',
    confirm_poor_gps: '当前 GPS 误差约 ±{a} m，比较大。\n仍然在这里建巢？之后可以拖动标记校正。',
    wait_gps: '还没有取得最新的 GPS 位置，请稍等几秒再试。\n（也可以用“地图点选”）',
    confirm_move: '把 {id} 移到新位置？\n（GPS 原值会保留）',
    confirm_delete_nest: '删除 {id}？\n这个巢的访查记录也会一起删除。修改记录里会保留。',
    confirm_delete_visit: '删除这条访查记录？修改记录里会保留。',
    save_failed: '保存失败：{m}\n请立即导出。',
    load_failed: '无法读取数据：{m}\n请重新加载页面。仍不行的话请联系。',
    storage_where: '存储位置：{b}（已用约 {u} MB）',
  },
  en: {
    app_title: 'Nest Recorder', trial: 'prototype',
    gps_off: 'GPS off', gps_locating: 'Locating…', gps_unsupported: 'Location not supported',
    gps_denied: 'Location permission denied', gps_unavailable: 'Position unavailable', gps_timeout: 'Location timeout',
    btn_add_gps: '＋ Add nest here', btn_locate: '📍 Locate', btn_pick: '👆 Pick on map', btn_list: '☰ List', btn_data: '💾 Data',
    pick_hint: 'Tap the map to place the nest', cancel: 'Cancel', save: 'Save', delete: 'Delete', close: 'Close',
    unexported: '{n} not exported',
    nest: 'Nest', nest_info: 'Nest details (species, type, height…)', nest_id: 'Nest ID', location: 'Location', gps_raw: 'GPS raw', none: 'none', manual: 'manual', gps: 'GPS',
    species: 'Species', nest_type: 'Nest type', height_m: 'Height (m)', site: 'Nest site', material: 'Material', photo_ids: 'Photo IDs', note: 'Note',
    ph_species: 'e.g. Japanese Tit', ph_site: 'e.g. rowan branch, 2 m above ground', ph_photo: 'e.g. IMG_0123, 0124',
    drag_hint: 'To correct the position, drag the nest marker on the map', history: 'Edit history',
    visits: 'Visits', add_visit: '＋ Record visit', visit: 'Visit', visit_no: 'Visit {n}', no_visits: 'No visits yet.',
    datetime: 'Date/time', recorder: 'Recorder', status: 'Status', eggs: 'Eggs', chicks: 'Chicks', adult: 'Adults', blank_hint: 'Blank = not recorded (not 0)',
    nest_list: 'Nests', no_nests: 'No records yet.', no_species: '(no species)', last_visit: 'Last visit',
    data_title: 'Save & import data',
    data_warn: 'Data is stored only in this phone\'s browser. Export after every survey.',
    export_all: '⇩ Export all (3 CSV files)', export_geojson: 'Export GeoJSON (for QGIS)',
    import: '⇧ Import CSV', import_hint: 'Select previously exported CSVs or someone else\'s (multiple allowed). For the same ID, the newer record is kept.',
    last_export: 'Last export: {t}', never_exported: 'Never exported.',
    storage_persist_ok: 'Storage: persistent (browser is unlikely to clear it)',
    storage_persist_no: 'Storage: not persistent. Adding to home screen makes it safer.',
    import_done: 'Imported: nests {n} added / {u} updated; visits {v} added / {w} updated',
    import_bad: 'Could not read: {f}',
    remind_title: 'Please export',
    remind_body: '{n} changes have not been exported. Export now in case the phone fails or the browser clears its data.',
    remind_export: 'Export now', remind_later: 'Later',
    welcome_title: 'Before you start',
    welcome_body: 'If you have earlier records (CSV), import them first, then start recording.',
    welcome_import: 'Import earlier CSV', welcome_new: 'Start fresh',
    settings: 'Settings', language: 'Language', recorder_code: 'Recorder code',
    recorder_hint: '2–4 letters (e.g. YZH). Included in IDs so records from several people never collide.',
    need_recorder: 'Please set your recorder code first.',
    confirm_poor_gps: 'GPS accuracy is about ±{a} m.\nAdd the nest here anyway? You can drag the marker later.',
    wait_gps: 'No recent GPS fix yet. Please wait a few seconds.\n(You can also use "Pick on map".)',
    confirm_move: 'Move {id} to the new position?\n(The GPS raw value is kept.)',
    confirm_delete_nest: 'Delete {id}?\nAll its visits will be deleted too. The edit history keeps a copy.',
    confirm_delete_visit: 'Delete this visit? The edit history keeps a copy.',
    save_failed: 'Saving failed: {m}\nPlease export now.',
    load_failed: 'Could not load data: {m}\nPlease reload the page. Contact us if it persists.',
    storage_where: 'Stored in: {b} (about {u} MB used)',
  },
};

/* 选项：代码 → 各语言显示名。暂定分类，待导师确认。 */
const OPTIONS = {
  nest_type: [
    ['open', { ja: '開放巣（椀型など）', zh: '开放巢（碗状等）', en: 'Open (cup etc.)' }],
    ['cavity', { ja: '樹洞', zh: '树洞', en: 'Tree cavity' }],
    ['box', { ja: '巣箱', zh: '巢箱', en: 'Nest box' }],
    ['artificial', { ja: '人工物', zh: '人工建筑物', en: 'Man-made structure' }],
    ['ground', { ja: '地上', zh: '地面', en: 'Ground' }],
    ['other', { ja: 'その他', zh: '其他', en: 'Other' }],
    ['unknown', { ja: '不明', zh: '不明', en: 'Unknown' }],
  ],
  status: [
    ['building', { ja: '造巣中', zh: '筑巢中', en: 'Building' }],
    ['empty', { ja: '完成・空', zh: '已完成·空', en: 'Complete, empty' }],
    ['first_egg', { ja: '初卵', zh: '初卵', en: 'First egg' }],
    ['laying', { ja: '産卵中', zh: '产卵中', en: 'Laying' }],
    ['clutch_complete', { ja: '全卵', zh: '产卵完成', en: 'Clutch complete' }],
    ['incubating', { ja: '抱卵中', zh: '孵卵中', en: 'Incubating' }],
    ['hatching', { ja: '孵化', zh: '孵化', en: 'Hatching' }],
    ['eggs', { ja: '卵あり（段階不明）', zh: '有卵（阶段不明）', en: 'Eggs (stage unknown)' }],   // v0.7 までの「卵あり」
    ['nestlings', { ja: '雛あり', zh: '有雏', en: 'Nestlings' }],
    ['fledged', { ja: '巣立ち', zh: '离巢', en: 'Fledged' }],
    ['failed', { ja: '失敗・放棄', zh: '失败·弃巢', en: 'Failed / abandoned' }],
    ['unknown', { ja: '不明', zh: '不明', en: 'Unknown' }],
  ],
  adult: [
    ['absent', { ja: '不在', zh: '不在', en: 'Absent' }],
    ['present', { ja: '近くにいる', zh: '在附近', en: 'Nearby' }],
    ['incubating', { ja: '抱卵・抱雛中', zh: '孵卵·暖雏', en: 'Incubating / brooding' }],
    ['feeding', { ja: '給餌', zh: '喂食', en: 'Feeding' }],
    ['alarm', { ja: '警戒・威嚇', zh: '警戒·驱赶', en: 'Alarm / defence' }],
    ['unknown', { ja: '不明', zh: '不明', en: 'Unknown' }],
  ],
};

const STATUS_COLORS = {
  building: '#7a6a3a', empty: '#7a7a7a', first_egg: '#6fa3d8', laying: '#4a88c7', clutch_complete: '#2f6fb3',
  incubating: '#24508a', hatching: '#d99a2b', eggs: '#2f6fb3', nestlings: '#c07a00',
  fledged: '#1b7a43', failed: '#b3382c', unknown: '#555',
};

/* v0.3：My Maps（KMZ）関連 */
Object.assign(I18N.ja, {
  name_label: '名前', category: '区分', season_result: '今年の結果', legacy_text: 'My Maps の記録（原文）',
  export_kmz: 'KMZ を書き出す（My Maps 用）',
  import: '⇧ CSV / KMZ を読み込む',
  import_hint: 'CSV（以前の書き出し・他の人の記録）または My Maps の KMZ を選択（複数可）。CSV は同じ ID なら新しい方を残し、KMZ は既にある地点を上書きしません。',
  import_kmz_done: '{f}：{a} 件追加、既存 {s} 件はスキップ、多角形 {p} 件は未対応のため取り込まず',
});
Object.assign(I18N.zh, {
  name_label: '名称', category: '分类', season_result: '今年结果', legacy_text: 'My Maps 上的记录（原文）',
  export_kmz: '导出 KMZ（给 My Maps）',
  import: '⇧ 导入 CSV / KMZ',
  import_hint: '选择 CSV（之前导出的或别人的）或 My Maps 的 KMZ（可多选）。CSV 相同编号保留较新的一条；KMZ 不会覆盖已有的点。',
  import_kmz_done: '{f}：新增 {a} 个，已有 {s} 个跳过，多边形 {p} 个暂不支持未导入',
});
Object.assign(I18N.en, {
  name_label: 'Name', category: 'Category', season_result: 'Result this year', legacy_text: 'My Maps notes (original)',
  export_kmz: 'Export KMZ (for My Maps)',
  import: '⇧ Import CSV / KMZ',
  import_hint: 'Select CSVs (earlier exports or other people\'s) or a My Maps KMZ (multiple allowed). CSV: newer record wins for the same ID. KMZ never overwrites existing points.',
  import_kmz_done: '{f}: {a} added, {s} existing skipped, {p} polygons not imported (unsupported)',
});
/* v0.6：回数の手動修正・状態の追加 */
Object.assign(I18N.ja, { visit_no_label: '回数', new_status: '＋ 新しい状態', new_status_prompt: '追加する状態の名前（例：捕食された）' });
Object.assign(I18N.zh, { visit_no_label: '第几次', new_status: '＋ 新状态', new_status_prompt: '新状态的名称（例：被捕食）' });
Object.assign(I18N.en, { visit_no_label: 'Visit no.', new_status: '+ New status', new_status_prompt: 'Name of the new status (e.g. Predated)' });
/* v0.8：巣の名前の自動付番 */
Object.assign(I18N.ja, { name_label: '巣の名前', name_hint: '空欄のまま種名を入れて保存すると「年_種名N」（例：26_ヒヨドリ3 ＝ 2026 年のヒヨドリ 3 つ目）が自動で付きます。手で直すこともできます。', name_auto: '自動：{n}' });
Object.assign(I18N.zh, { name_label: '巢名', name_hint: '留空并填写种名后保存，会自动命名为“年_种名N”（例：26_ヒヨドリ3 = 2026 年ヒヨドリ的第 3 个巢）。也可以手动修改。', name_auto: '自动：{n}' });
Object.assign(I18N.en, { name_label: 'Nest name', name_hint: 'Leave blank and enter a species: on saving it is named “YY_speciesN” automatically (e.g. 26_ヒヨドリ3 = 3rd ヒヨドリ nest of 2026). You can still edit it.', name_auto: 'Auto: {n}' });
/* v0.8：データの全消去・取り消し */
Object.assign(I18N.ja, {
  clear_title: 'この端末のデータを消す', clear_all: 'この端末のデータをすべて消す',
  clear_hint: '巣・確認記録・修正履歴を消します（テストの記録を消したいとき用）。記録者コード・言語・追加した状態・ドライブのフォルダは残ります。直前の 1 回だけ元に戻せます。',
  clear_confirm1: '巣 {n} 件、確認記録 {v} 件をこの端末から消します。',
  clear_unexported: '書き出していない変更が {u} 件あります。消す前に書き出すことをおすすめします。',
  clear_confirm2: '本当に消す場合は「削除」と入力してください。', clear_word: '削除', clear_done: '消しました。設定画面の「元に戻す」で、1 回だけ戻せます。',
  undo_clear: '元に戻す（{t} に消したデータ）', undo_done: '元に戻しました。',
  clear_failed: '消せませんでした。データはそのまま残っています（{m}）',
});
Object.assign(I18N.zh, {
  clear_title: '清除本机数据', clear_all: '清除本机的全部数据',
  clear_hint: '清除巢、访查记录和修改记录（用于删掉测试数据）。记录者代码、语言、自己加的状态、网盘文件夹会保留。可以撤销最近的 1 次。',
  clear_confirm1: '将从本机清除 {n} 个巢、{v} 条访查记录。',
  clear_unexported: '还有 {u} 处修改没有导出，建议先导出再清除。',
  clear_confirm2: '确定要清除，请输入“删除”。', clear_word: '删除', clear_done: '已清除。可以在设置里点“撤销”恢复一次。',
  undo_clear: '撤销（恢复 {t} 清除的数据）', undo_done: '已恢复。',
  clear_failed: '没能清除，数据都还在（{m}）',
});
Object.assign(I18N.en, {
  clear_title: 'Clear data on this device', clear_all: 'Clear all data on this device',
  clear_hint: 'Deletes nests, visits and the edit log (e.g. test records). Recorder code, language, added statuses and the Drive folder are kept. The last clear can be undone once.',
  clear_confirm1: 'This removes {n} nests and {v} visits from this device.',
  clear_unexported: '{u} changes have not been exported. Export first is recommended.',
  clear_confirm2: 'Type "DELETE" to confirm.', clear_word: 'DELETE', clear_done: 'Cleared. Use “Undo” in Settings to restore once.',
  undo_clear: 'Undo (restore data cleared at {t})', undo_done: 'Restored.',
  clear_failed: 'Could not clear — your data is unchanged ({m})',
});
/* v0.8：ファイルをまとめる */
Object.assign(I18N.ja, { import_removed: '削除済みのため外したもの：巣 {n} 件、確認記録 {v} 件（誰かが消した記録）' });
Object.assign(I18N.zh, { import_removed: '因已被删除而排除：巢 {n} 个、访查 {v} 条（有人删过的记录）' });
Object.assign(I18N.en, { import_removed: 'Left out because they were deleted: {n} nests, {v} visits' });
Object.assign(I18N.ja, {
  merge: '⇄ 複数のファイルをまとめる', drive_merge: '⇄ ドライブのファイルをまとめる',
  merge_hint: '何人分かの ZIP を選ぶと、この端末のデータに取り込んだうえで、全部入りの ZIP（nest-records_ALL_…）を 1 つ作ります。次の調査の前は、この 1 つを読み込むだけで済みます。消した記録は復活しません。',
  merge_confirm: '{n} 個のファイルをこの端末のデータに取り込み、まとめた ZIP を作ります。よろしいですか？',
  merge_saved_local: 'まとめた ZIP を書き出しました：{f}', merge_saved_drive: 'ドライブにも保存しました。',
  merge_drive_skip: 'ドライブには保存していません（「⇪ ドライブに保存」で保存できます）。',
  merge_archive_confirm: '元のファイル {n} 個を、保存先フォルダ内の「過去分」フォルダに移しますか？',
  merge_archived: '{n} 個を「過去分」に移しました。', merge_archive_failed: '移せなかったファイル：{f}（権限がない可能性があります。手で移してください）',
});
Object.assign(I18N.zh, {
  merge: '⇄ 合并多个文件', drive_merge: '⇄ 合并网盘里的文件',
  merge_hint: '选几个人的 ZIP，先合并进本机数据，再生成一个包含全部内容的 ZIP（nest-records_ALL_…）。下次调查前只要读入这一个。删掉的记录不会复活。',
  merge_confirm: '把 {n} 个文件合并进本机数据，并生成合并后的 ZIP。确定吗？',
  merge_saved_local: '已导出合并后的 ZIP：{f}', merge_saved_drive: '也已存到网盘。',
  merge_drive_skip: '没有存到网盘（可以点“⇪ 存到网盘”）。',
  merge_archive_confirm: '把原来的 {n} 个文件移到保存文件夹里的“過去分”文件夹吗？',
  merge_archived: '已把 {n} 个文件移到“過去分”。', merge_archive_failed: '没能移动的文件：{f}（可能没有权限，请手动移动）',
});
Object.assign(I18N.en, {
  merge: '⇄ Merge several files', drive_merge: '⇄ Merge files on Drive',
  merge_hint: 'Pick several people\'s ZIPs: they are merged into this device\'s data and one complete ZIP (nest-records_ALL_…) is made. Before the next survey, load just that one. Deleted records do not come back.',
  merge_confirm: 'Merge {n} files into this device\'s data and make a merged ZIP?',
  merge_saved_local: 'Merged ZIP exported: {f}', merge_saved_drive: 'Also saved to Drive.',
  merge_drive_skip: 'Not saved to Drive (use “⇪ Save to Drive”).',
  merge_archive_confirm: 'Move the {n} original files into the “過去分” folder inside the Drive folder?',
  merge_archived: 'Moved {n} files to “過去分”.', merge_archive_failed: 'Could not move: {f} (maybe no permission — please move by hand)',
});
/* v0.9：重複の候補・最後にまとめた日 */
Object.assign(I18N.ja, {
  dup_btn: '重複の候補を確認（{n} 組）', dup_title: '重複の候補',
  dup_hint: '別々の人が同じ巣を登録したかもしれない組（{m} m 以内・同じ区分・種が同じか空欄）を表示します。',
  dup_explain: '同じ巣なら「まとめる」：確認記録を 1 つの巣に集め、空欄の項目はもう一方から補い、もう一方は削除します（修正履歴に残り、他の人のファイルから復活しません）。別の巣なら「別の巣」：今後この組は表示しません。',
  dup_none: '重複の候補はありません。', dup_keep: '残す', dup_merge: '同じ巣：まとめる', dup_not: '別の巣',
  dup_dist: '距離 約 {d} m', dup_visits: '確認 {n} 回', dup_after_merge: '重複の候補が {n} 組あります。「重複の候補を確認」で確かめてください。',
  dup_merged: '{a} を {b} にまとめました。',
  dup_confirm: '「{a}」を「{b}」にまとめます。よろしいですか？',
  last_merge: '最後にまとめた日：{t}', never_merged: 'まだ「まとめる」をしていません。',
});
Object.assign(I18N.zh, {
  dup_btn: '检查重复候选（{n} 组）', dup_title: '重复候选',
  dup_hint: '列出可能是不同的人登记了同一个巢的组合（{m} m 以内、同一分类、种名相同或为空）。',
  dup_explain: '是同一个巢就点“合并”：访查记录集中到一个巢，空着的栏从另一个补上，另一个删除（修改记录里有记载，不会从别人的文件复活）。不是同一个就点“不同的巢”：以后不再显示这一组。',
  dup_none: '没有重复候选。', dup_keep: '保留', dup_merge: '同一个巢：合并', dup_not: '不同的巢',
  dup_dist: '相距约 {d} m', dup_visits: '访查 {n} 次', dup_after_merge: '有 {n} 组重复候选，请点“检查重复候选”确认。',
  dup_merged: '已把 {a} 合并到 {b}。',
  dup_confirm: '把“{a}”合并到“{b}”，确定吗？',
  last_merge: '上次合并：{t}', never_merged: '还没有做过“合并”。',
});
Object.assign(I18N.en, {
  dup_btn: 'Check possible duplicates ({n})', dup_title: 'Possible duplicates',
  dup_hint: 'Pairs that may be the same nest registered by different people (within {m} m, same category, same or blank species).',
  dup_explain: 'Same nest → “Merge”: visits go to one nest, blank fields are filled from the other, and the other is deleted (logged; it will not come back from other files). Different nests → “Different”: this pair will not be shown again.',
  dup_none: 'No possible duplicates.', dup_keep: 'Keep', dup_merge: 'Same nest: merge', dup_not: 'Different',
  dup_dist: '≈ {d} m apart', dup_visits: '{n} visits', dup_after_merge: '{n} possible duplicate pairs — please check them.',
  dup_merged: 'Merged {a} into {b}.',
  dup_confirm: 'Merge “{a}” into “{b}”?',
  last_merge: 'Last merged: {t}', never_merged: 'Not merged yet.',
});
/* v0.7：Google ドライブ連携（任意） */
Object.assign(I18N.ja, {
  drive_title: 'Google ドライブ（ラボの共有フォルダ）', drive_save: '⇪ ドライブに保存', drive_load: '⇩ ドライブから読み込む',
  drive_pick: '保存先フォルダを選ぶ', drive_folder: '保存先：{n}', drive_no_folder: '保存先フォルダがまだ選ばれていません。',
  drive_note: '自分の記録を新しいファイルとして保存します（他の人のファイルは変更しません）。読み込みでは他の人のファイルも選べ、同じ ID は新しい方が残ります。電波のないときは端末に記録し、あとで保存してください。',
  drive_saving: '保存中…', drive_saved: '保存しました：{f}', drive_offline: 'オフラインのため Google ドライブにつながりません。電波のある場所でもう一度押してください。',
  drive_failed: 'Google ドライブでエラー：{m}',
});
Object.assign(I18N.zh, {
  drive_title: 'Google 网盘（lab 共享文件夹）', drive_save: '⇪ 存到网盘', drive_load: '⇩ 从网盘读入',
  drive_pick: '选择保存的文件夹', drive_folder: '保存到：{n}', drive_no_folder: '还没有选择保存的文件夹。',
  drive_note: '把自己的记录存成一个新文件（不会改动别人的文件）。读入时也可以选别人的文件，同一编号保留较新的一条。没信号时先记在手机里，之后再存。',
  drive_saving: '保存中…', drive_saved: '已保存：{f}', drive_offline: '现在离线，连不上 Google 网盘。请到有信号的地方再点一次。',
  drive_failed: 'Google 网盘出错：{m}',
});
Object.assign(I18N.en, {
  drive_title: 'Google Drive (lab shared folder)', drive_save: '⇪ Save to Drive', drive_load: '⇩ Load from Drive',
  drive_pick: 'Choose folder', drive_folder: 'Folder: {n}', drive_no_folder: 'No folder chosen yet.',
  drive_note: 'Your records are saved as a new file (other people\'s files are never changed). When loading you can pick anyone\'s files; for the same ID the newer record wins. Offline, keep recording on the phone and save later.',
  drive_saving: 'Saving…', drive_saved: 'Saved: {f}', drive_offline: 'Offline — cannot reach Google Drive. Try again where you have signal.',
  drive_failed: 'Google Drive error: {m}',
});
OPTIONS.category = [
  ['nest', { ja: '巣データ', zh: '巢数据', en: 'Nest data' }],
  ['supplement', { ja: '補足データ', zh: '补充数据', en: 'Supplementary' }],
];
OPTIONS.season_result = [
  ['success', { ja: '繁殖成功', zh: '繁殖成功', en: 'Success' }],
  ['failed', { ja: '繁殖失敗', zh: '繁殖失败', en: 'Failed' }],
  ['unused', { ja: '今年は未使用', zh: '今年未使用', en: 'Not used this year' }],
];

/* v0.4：書き出しを ZIP 1 つに */
Object.assign(I18N.ja, {
  export_all: '⇩ すべて書き出す（ZIP：CSV + KMZ）',
  import: '⇧ 読み込む（ZIP / CSV / KMZ）',
  import_hint: 'このツールで書き出した ZIP、他の人の ZIP・CSV、または My Maps の KMZ を選択（複数可）。同じ ID は新しい方を残し、KMZ は既にある地点を上書きしません。',
  welcome_body: 'これまでの記録（このツールの ZIP や My Maps の KMZ）があれば、先に読み込んでから記録を始めてください。',
  welcome_import: '以前のデータを読み込む',
});
Object.assign(I18N.zh, {
  export_all: '⇩ 全部导出（ZIP：CSV + KMZ）',
  import: '⇧ 导入（ZIP / CSV / KMZ）',
  import_hint: '选择本工具导出的 ZIP、别人的 ZIP 或 CSV、或 My Maps 的 KMZ（可多选）。相同编号保留较新的一条；KMZ 不会覆盖已有的点。',
  welcome_body: '如果有之前的记录（本工具的 ZIP 或 My Maps 的 KMZ），请先导入，再开始记录。',
  welcome_import: '导入之前的数据',
});
Object.assign(I18N.en, {
  export_all: '⇩ Export all (ZIP: CSV + KMZ)',
  import: '⇧ Import (ZIP / CSV / KMZ)',
  import_hint: 'Select a ZIP exported by this tool, someone else\'s ZIP or CSV, or a My Maps KMZ (multiple allowed). Newer record wins for the same ID; KMZ never overwrites existing points.',
  welcome_body: 'If you have earlier records (a ZIP from this tool or a My Maps KMZ), import them first, then start recording.',
  welcome_import: 'Import earlier data',
});

/* v0.5：My Maps 連携（任意） */
Object.assign(I18N.ja, {
  mm_option: 'My Maps 連携を使う', mm_option_hint: 'オンにすると「データ」画面に、My Maps へ追加するための書き出しが表示されます。',
  mm_title: 'My Maps 連携', mm_export: '⇩ My Maps 用 KMZ（前回以降の追加・修正分）',
  mm_pending: '対象 {n} 件', mm_none: '前回以降の追加・修正はありません', mm_last: '前回：{t}', mm_layer: '巣記録 追加分',
  mm_step1: '上のボタンで KMZ を作り、共有メニューから Google ドライブに保存',
  mm_step2: 'My Maps で地図を開き「レイヤを追加」→「インポート」→ ドライブの KMZ を選択',
  mm_step3: '新しいレイヤとして追加されます',
  mm_note: '注意：My Maps は既存の地点を更新できません。前に送った巣を修正した場合、新しいレイヤにも同じ巣が入るので、古い方は My Maps 上で手動で削除してください。',
});
Object.assign(I18N.zh, {
  mm_option: '使用 My Maps 联动', mm_option_hint: '打开后，“数据”页面会出现给 My Maps 追加数据用的导出按钮。',
  mm_title: 'My Maps 联动', mm_export: '⇩ My Maps 用 KMZ（上次之后新增·修改的部分）',
  mm_pending: '共 {n} 个', mm_none: '上次之后没有新增或修改', mm_last: '上次：{t}', mm_layer: '巢记录 新增部分',
  mm_step1: '用上面的按钮生成 KMZ，在分享菜单里存到 Google Drive',
  mm_step2: '在 My Maps 打开地图，“添加图层”→“导入”→ 选 Drive 里的 KMZ',
  mm_step3: '会作为一个新图层加进去',
  mm_note: '注意：My Maps 无法更新已有的点。之前送过的巢如果改过，新图层里也会有它，旧的请在 My Maps 上手动删除。',
});
Object.assign(I18N.en, {
  mm_option: 'Use My Maps sync', mm_option_hint: 'When on, the Data screen shows an export for adding data to My Maps.',
  mm_title: 'My Maps sync', mm_export: '⇩ KMZ for My Maps (new / changed since last time)',
  mm_pending: '{n} items', mm_none: 'Nothing new or changed since last time', mm_last: 'Last: {t}', mm_layer: 'Nest Recorder update',
  mm_step1: 'Create the KMZ with the button above and save it to Google Drive from the share menu',
  mm_step2: 'Open the map in My Maps → "Add layer" → "Import" → choose the KMZ from Drive',
  mm_step3: 'It is added as a new layer',
  mm_note: 'Note: My Maps cannot update existing points. If you changed a nest that was sent before, it appears again in the new layer; delete the old one in My Maps by hand.',
});
