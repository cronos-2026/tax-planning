# 創業組織稅負比較工具 — 2026.09.22_v3

本版在 v2 模組化架構上新增「年度官方資料自動監控＋管理員確認」機制。

## v3 重點

- 前台仍讀取 `tax-config.json`，不會直接把網路抓到的資料投入正式計算。
- `.github/workflows/check-tax-annual.yml` 每週檢查財政部官方 RSS。
- `scripts/check_tax_updates.py` 只更新 `data/annual-candidate.json` 候選檔。
- 後台可讀取候選檔、查看來源與缺漏，再送入原有「人工比對」表逐項勾選。
- 目前 115 年度免稅額、標準扣除額、薪資/身障特別扣除額及課稅級距有正式公告。
- 115 年度每人基本生活費截至 2026-09-22 尚未正式公告；本版暫以 114 年度 213,000 元作比較並在前台醒目標示。
- 自動監控也會提前尋找 116 年度核心綜所稅參數公告。

## GitHub Actions 啟用

把整個專案上傳 GitHub 後，請確認 Repository 的 **Actions** 功能可執行，且 Workflow 具有 `contents: write` 權限。也可以在 Actions 頁面手動執行 **Check annual tax parameters**。

## 安全原則

自動抓取 ≠ 自動發布。候選資料只有管理員在 `admin.html` 核對並勾選後，才會進入目前後台設定；最後仍需按原本的 GitHub 同步功能才會更新正式 `tax-config.json`。

## 2026.10.01_v4 列印優化
列印改為 A4 橫式一頁優先。系統會依目前顯示的扣除額與自訂欄位量，自動調整列印密度；一般情況優先維持單頁，內容確實過多時才自然分頁。
