/* A4/PDF 橫式一頁優先，自動縮放並維持左資訊／右計算 */
'use strict';

(function(){
  const PRINT_CLASSES = [
    'print-fit-one-page',
    'print-density-normal',
    'print-density-compact',
    'print-density-tight',
    'print-force-basic-two-columns',
    'print-basic-extra-tight',
    'print-two-pages',
    'print-pdf-safe'
  ];

  function isVisible(el){
    if(!el) return false;
    if(el.hidden || el.classList.contains('hidden')) return false;
    return getComputedStyle(el).display !== 'none';
  }

  function countVisible(selector){
    return Array.from(document.querySelectorAll(selector)).filter(isVisible).length;
  }

  function getPrintComplexity(){
    const optionalControls = Array.from(
      document.querySelectorAll('#optional-deductions-section input, #optional-deductions-section select')
    ).filter(isVisible).length;

    const customRows = countVisible('.custom-field-row');
    const customBlocks = countVisible('.custom-layout-block');
    const images = Array.from(document.querySelectorAll('.custom-layout-image')).filter(isVisible).length;

    // 自訂欄位與圖片比一般輸入欄位更容易增加列印高度，因此權重較高。
    return {
      optionalControls,
      customRows,
      customBlocks,
      images,
      score: optionalControls + (customRows * 1.5) + (customBlocks * 2) + (images * 3)
    };
  }

  // 縮放比例依實測決定（A4 橫式、Chrome/Edge 實際輸出 PDF 逐級驗證仍為單頁，並保留約 0.1 的安全餘量）：
  //   無額外輸入欄位 → 實測上限 1.40；3 個 → 1.25；6 個 → 1.00；8 個 → 0.95。
  function choosePrintProfile(complexity){
    const s = complexity.score;
    if(s >= 14) return { density: 'tight',   zoom: 0.68 };
    if(s >= 7)  return { density: 'compact', zoom: 0.85 };
    if(s >= 4)  return { density: 'compact', zoom: 0.95 };
    if(s >= 2)  return { density: 'normal',  zoom: 1.15 };
    return { density: 'normal', zoom: 1.25 };
  }

  function cleanupPrintLayout(){
    PRINT_CLASSES.forEach(cls => document.body.classList.remove(cls));
    document.documentElement.style.removeProperty('--print-zoom');
  }

  function preparePrintLayout(){
    cleanupPrintLayout();

    const complexity = getPrintComplexity();
    const profile = choosePrintProfile(complexity);

    // 一頁優先：A4 橫式、基礎資料雙欄、結果表緊湊排版。
    document.body.classList.add('print-fit-one-page', 'print-pdf-safe', `print-density-${profile.density}`);
    document.documentElement.style.setProperty('--print-zoom', String(profile.zoom));

    // 供除錯或未來調整使用，不會顯示在頁面上。
    document.body.dataset.printDensity = profile.density;
    document.body.dataset.printZoom = String(profile.zoom);
  }

  window.adaptiveSmartPrint = function(){
    preparePrintLayout();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.print());
    });
  };

  // 使用 Ctrl+P / 瀏覽器列印時也套用相同的一頁優先策略。
  window.addEventListener('beforeprint', preparePrintLayout);
  window.addEventListener('afterprint', () => {
    cleanupPrintLayout();
    delete document.body.dataset.printDensity;
    delete document.body.dataset.printZoom;
  });
})();
