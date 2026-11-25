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
    ['eggs', { ja: '卵あり', zh: '有卵', en: 'Eggs' }],
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
  building: '#7a6a3a', empty: '#7a7a7a', eggs: '#2f6fb3', nestlings: '#c07a00',
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
