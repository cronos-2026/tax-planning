# Google Apps Script 後端部署

前端部署在 GitHub Pages。Apps Script Web App 負責管理員登入驗證、參數發布及登入紀錄同步；GitHub Token 與管理員密碼只放在 Apps Script Script Properties，不放入前端或版本控制。

## 此專案設定

此網站使用既有 Apps Script 專案 `tax-planning`。其來源程式為 `gas/Code.gs`。Script Properties 需包含：

- `ADMIN_USERNAME`、`ADMIN_PASSWORD`：主要管理員。
- `SECONDARY_ADMIN_USERNAME`、`SECONDARY_ADMIN_PASSWORD`：次要管理員。次要管理員可執行後台操作，但不能新增管理員；管理員帳號由主要管理員在 Script Properties 維護。
- `GITHUB_TOKEN`：Fine-grained PAT，僅授權 `cronos-2026/tax-planning` 儲存庫的 `Contents: Read and write`；必要的 `Metadata: Read-only` 保持預設。

建立或更新部署前，請確認所有密碼皆為個人專用強密碼，已撤銷曾暴露的舊 Token，並將新 Token 存在 `GITHUB_TOKEN`。不得將任何實際密碼或 Token 寫入程式碼、版本控制、前端設定或聊天。僅專案擁有者應有 GAS 專案編輯權限，因編輯者可修改後端並存取 Script Properties。

## 部署 Web App

1. 在 Apps Script 編輯器確認 `Code.gs` 已儲存且沒有語法錯誤。
2. 選「部署 → 新增部署作業 → 網頁應用程式」。
3. 執行身分選「我」，存取權選「所有人」，以便 GitHub Pages 前台呼叫登入 API。端點雖可公開呼叫，但管理操作仍須通過後端帳密驗證及短期工作階段驗證。
4. 部署後複製 `/exec` 網址。若 Google 顯示授權畫面，由專案擁有者檢視並完成授權。
5. 目前部署的 `/exec` 網址已設為後台預設 API 網址；若後台曾記住其他網址，可在「Apps Script API 網址」欄位更正。每次修改 GAS 程式碼後，請編輯部署作業並建立新版本。

## API 與工作階段

前端以表單編碼 POST 傳送請求，再以 JSONP 輪詢短期結果，以符合 Apps Script 跨網域限制。登入工作階段存於 GAS Cache，預設 30 分鐘；GitHub Token 不會傳送至瀏覽器。Apps Script Web App 是公開可呼叫端點，因此每個管理操作均須驗證工作階段；不可將 Script Properties 或例外堆疊放進公開回應。

## 版本控制

`gas/Code.gs` 是 GAS 後端的版本控制來源。可使用 clasp 同步至 GitHub；切勿提交 `.clasprc.json`、Script Properties、實際密碼或 Token。GitHub Pages 前端以 `VERSION.txt` 與 `docs/history/` 追蹤版本。JavaScript 混淆只增加閱讀成本，不是保密或安全控制；所有敏感邏輯與祕密必須留在 GAS。
