/* 2026-09-22 v3｜年度參數、資料品質與設定載入 */
'use strict';

// ===== GitHub 參數化版本：正式參數由 tax-config.json 載入 =====
const DEFAULT_TAX_CONFIG = {
    pageTitle: "115年度創業稅負決策試算",
    pageSubtitle: "輸入您的所得與營業條件，快速比較商號與公司兩種組織型態的稅負差異。",
    pageNotice: "本頁為試算工具；扶養、長照、學前子女等資格仍應依實際申報條件判斷。若資格不符，試算結果可能與實際申報不同。",
    showHeaderSection: true,
    taxYear: 115,
    siteVersion: "2026.09.22_v3",
    basicLivingExpense: 213000,
    exemption: 101000,
    standardDeductionSingle: 136000,
    standardDeductionMarried: 272000,
    salarySpecialDeduction: 227000,
    disabilitySpecialDeduction: 227000,
    savingsInvestmentDeduction: 270000,
    educationTuitionDeduction: 25000,
    preschoolFirstChildDeduction: 150000,
    preschoolAdditionalChildDeduction: 225000,
    longTermCareDeduction: 180000,
    houseRentDeduction: 180000,
    dividendCreditRate: 0.085,
    dividendCreditCap: 80000,
    dividendSeparateRate: 0.28,
    legalReserveRate: 0.10,
    businessTaxExemptThreshold: 120000,
    businessTaxTransitionThreshold: 200000,
    businessTaxTransitionRate: 0.50,
    businessTaxRate: 0.20,
    brackets: [
        { limit: 610000, rate: 0.05, diff: 0 },
        { limit: 1380000, rate: 0.12, diff: 42700 },
        { limit: 2770000, rate: 0.20, diff: 153100 },
        { limit: 5190000, rate: 0.30, diff: 430100 },
        { limit: null, rate: 0.40, diff: 949100 }
    ],
    customParameters: [],
    dataQuality: {
        coreIncomeTax: {status: "official", taxYear: 115},
        basicLivingExpense: {
            status: "provisional", taxYear: 115, valueSourceYear: 114, value: 213000,
            note: "115年度每人基本生活所需費用尚待財政部公告；目前暫以114年度213,000元作比較顯示。"
        },
        autoMonitor: {enabled: true, candidatePath: "data/annual-candidate.json", policy: "detect-compare-confirm"}
    }
};
let TAX_CONFIG = structuredClone(DEFAULT_TAX_CONFIG);
let TAX_115 = TAX_CONFIG;
let BASIC_LIVING_EXPENSE_COMPARE = TAX_CONFIG.basicLivingExpense;

function normalizeTaxConfig(raw) {
    const cfg = {...DEFAULT_TAX_CONFIG, ...(raw || {})};
    cfg.brackets = (raw?.brackets || DEFAULT_TAX_CONFIG.brackets).map(b => ({
        limit: b.limit === null || b.limit === '' ? Infinity : Number(b.limit),
        rate: Number(b.rate), diff: Number(b.diff || 0)
    }));
    return cfg;
}

function applyDynamicTaxNotes(){
    const topTitleSection=document.getElementById('top-title-section');
    if(topTitleSection) topTitleSection.style.display=(TAX_CONFIG.showHeaderSection===false) ? 'none' : '';
    const noticeText=document.getElementById('page-notice-text');
    if(noticeText) noticeText.textContent=TAX_CONFIG.pageNotice || DEFAULT_TAX_CONFIG.pageNotice;
    const noticeBox=document.getElementById('page-notice');
    if(noticeBox) noticeBox.style.display=(TAX_CONFIG.pageNotice || '').trim() ? '' : 'none';
    const y = Number(TAX_CONFIG.taxYear || 115);
    const adYear = y + 1911;
    const filingYear = y + 1;
    const singleBase = Number(TAX_CONFIG.exemption || 0) + Number(TAX_CONFIG.standardDeductionSingle || 0);
    const main = document.getElementById('tax-note-main');
    const deduction = document.getElementById('tax-note-deduction');
    const reserve = document.getElementById('tax-note-reserve');
    const basis = document.getElementById('tax-note-basis');

    if(main) main.innerHTML =
        `<strong>${y} 年度計稅基準備註：</strong>本工具以 ${y} 年度（${adYear}）綜合所得稅參數試算：` +
        `每人免稅額 ${fmtMoney(TAX_CONFIG.exemption)} 元；標準扣除額單身 ${fmtMoney(TAX_CONFIG.standardDeductionSingle)} 元、夫妻 ${fmtMoney(TAX_CONFIG.standardDeductionMarried)} 元；` +
        `${deductionEnabled('salarySpecialDeduction')?'薪資所得特別扣除額已依後台設定啟用；':'薪資所得特別扣除額目前未啟用；'}綜所稅級距為 ${buildBracketText(TAX_CONFIG.brackets)}。` +
        `股利所得採「合併計稅」與「分開計稅 ${fmtPct(TAX_CONFIG.dividendSeparateRate)}」二方案試算，` +
        `合併計稅之股利可抵減稅額按 ${fmtPct(TAX_CONFIG.dividendCreditRate)}、每戶上限 ${fmtMoney(TAX_CONFIG.dividendCreditCap)} 元，系統自動選擇稅負較低方案。`;

    if(deduction) deduction.innerHTML =
        `<strong>免稅額＋標準扣除額：</strong>單身且無扶養時為 ${fmtMoney(TAX_CONFIG.exemption)}＋${fmtMoney(TAX_CONFIG.standardDeductionSingle)}＝${fmtMoney(singleBase)} 元；` +
        `已婚或有扶養者依人數及婚姻狀態調整。其他已啟用項目會另行加計扣除。`;

    if(reserve) reserve.innerHTML =
        `<strong>法定盈餘公積假設：</strong>本工具暫以本期稅後盈餘 ${fmtPct(TAX_CONFIG.legalReserveRate)} 提列法定盈餘公積。` +
        `若公司既有法定盈餘公積已達實收資本額，或實際盈餘分派條件不同，應依公司法及股東會決議另行調整。`;

    if(basis) basis.textContent =
        `${y} 年度本工具採用基準：每人免稅額 ${fmtMoney(TAX_CONFIG.exemption)} 元、標準扣除額單身 ${fmtMoney(TAX_CONFIG.standardDeductionSingle)} 元／夫妻 ${fmtMoney(TAX_CONFIG.standardDeductionMarried)} 元。` +
        `本版依試算目的不計算薪資所得特別扣除額；${y} 年度資料於 ${filingYear} 年 5 月申報 ${y} 年度所得時適用。`;
}

function applyDataQualityStatus(){
    const box=document.getElementById('data-quality-banner');
    const text=document.getElementById('data-quality-text');
    const source=document.getElementById('data-quality-source');
    if(!box || !text) return;
    const q=TAX_CONFIG.dataQuality || {};
    const living=q.basicLivingExpense || {};
    const y=Number(TAX_CONFIG.taxYear || 115);
    const provisional=String(living.status||'').toLowerCase()!=='official';
    if(!provisional){
        box.hidden=true;
        return;
    }
    const srcYear=Number(living.valueSourceYear || (y-1));
    const value=Number(TAX_CONFIG.basicLivingExpense||living.value||0).toLocaleString('zh-TW');
    text.textContent=`${y}年度「每人基本生活費」尚未標示為正式年度值；目前暫以${srcYear}年度 ${value} 元作比較。系統會監控財政部公告，但不會未經管理員確認就改動正式計算參數。`;
    if(source){
        const u=String(living.sourceUrl||'').trim();
        source.hidden=!u;
        source.href=u||'#';
        source.textContent=u?'查看目前暫用值的官方來源':'';
    }
    box.hidden=false;
}

function applyTaxConfig(raw) {
    TAX_CONFIG = normalizeTaxConfig(raw);
    TAX_115 = TAX_CONFIG;
    BASIC_LIVING_EXPENSE_COMPARE = Number(TAX_CONFIG.basicLivingExpense || 0);
    const badge = document.querySelector('header .rounded-md.bg-emerald-100');
    if (badge) badge.textContent = TAX_CONFIG.siteVersion || '2026.09.22_v3';
    const y = Number(TAX_CONFIG.taxYear || 115);
    const adYear = y + 1911;
    document.title = `${TAX_CONFIG.pageTitle || '115年度創業稅負決策試算'}｜${y}年所得最佳化`;
    const incomeTitle=document.getElementById('personal-income-year-title');
    if(incomeTitle) incomeTitle.textContent=`${y} 年度個人所得資料`;
    const livingNote=document.getElementById('basic-living-year-note');
    if(livingNote){ const st=TAX_CONFIG.dataQuality?.basicLivingExpense?.status==='official'?'正式值':'暫用值／待公告確認'; livingNote.textContent=`${y} 年度每人基本生活費比較基準：${Number(TAX_CONFIG.basicLivingExpense||0).toLocaleString('en-US')} 元（${st}）。`; }
    const note = document.querySelector('p.text-sm.text-slate-500.text-center');
    if (note) note.textContent = `以 ${TAX_CONFIG.taxYear || 115} 年度稅率、免稅額及扣除額基礎計算`;
    document.querySelectorAll('[id^=res-basic-living-]').forEach(el => { if (el) el.textContent = Number(TAX_CONFIG.basicLivingExpense||0).toLocaleString('en-US') + ' 元'; });
    renderOptionalDeductionFields();
    updatePersonalTaxStandardNote();
    applyDynamicTaxNotes();
    applyDataQualityStatus();
}

async function loadTaxConfig() {
    try {
        const res = await fetch('./tax-config.json?ts=' + Date.now(), {cache:'no-store'});
        if (!res.ok) throw new Error('HTTP ' + res.status);
        applyTaxConfig(await res.json());
    } catch (err) {
        console.warn('tax-config.json 載入失敗，使用內建預設參數：', err);
        applyTaxConfig(DEFAULT_TAX_CONFIG);
    }
}
