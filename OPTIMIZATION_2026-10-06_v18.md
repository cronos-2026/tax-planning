# 2026.10.06_v18 更新說明

- 列印／轉出 PDF 時隱藏「立即計算比較」按鈕：按鈕加上 no-print 類別，並新增列印專用規則（原因：列印排版規則 `#basic-data-print-grid > *` 以 !important 強制 inline-block，蓋過原本的 button 隱藏）。
- 同步更新網站版本號與「版本說明」文字（index.html、js/config.js、tax-config.json、admin.html、README.md）。
- 修正：瀏覽器若留有後台暫存設定（tax_temp_config_override_v1），原本會連「網站版本」與「版本說明」一起蓋成舊版；現改為版本與版本說明一律以正式 tax-config.json（或內建預設）為準，其餘暫存參數不受影響。
