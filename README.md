# 巢记录（試作版 v0.1）

手机浏览器上用的野外巢记录工具：地图联动、GPS 取点、拖动校正、CSV 导出。
iPhone / Android 都能用，可“添加到主屏幕”当 App 用。

**打开：** https://yaozhouhang-work.github.io/nest-recorder/

## 现在能做什么

- 地图：国土地理院 标准 / 航拍、OpenStreetMap，可切换
- 📍 定位：显示当前位置和 GPS 误差圈
- ＋ 在当前位置建巢：用 GPS 坐标建巢，记下 GPS 原值和精度
- 👆 地图点选：没有 GPS 或误差太大时，直接在地图上点
- 拖动巢标记校正位置：GPS 原值保留，位置来源改为“手动”，并写入修改记录
- 填种、备注；所有修改都留记录
- 导出：`nests.csv`、`edits.csv`（UTF-8 BOM，Excel 直接打开）、`nests.geojson`

## 还没有

- 访查记录（每次去看巢的状态、卵数等）——等导师确认字段
- 选项配置、三语界面、导入 CSV

## 数据在哪

只存在这台手机的浏览器里（localStorage）。**正式数据以导出的 CSV 为准，每次调查后请导出。**
iPhone 上长时间不打开的网页存储可能被系统清除。

## 本地试运行

```bash
python -m http.server 8765
```

然后打开 http://localhost:8765 。手机上用 GPS 需要 HTTPS（之后用 GitHub Pages）。

## 数据安全

本仓库只放程序。**不要把任何巢位数据、导出的 CSV 提交进来。**
