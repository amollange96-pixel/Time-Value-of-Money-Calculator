/**
 * Time Value of Money (TVM) Calculator
 * Pure Vanilla JavaScript implementation
 * Workable, accurate, error-free financial calculations
 */

// Current application state
const AppState = {
  currency: 'INR', // 'INR', 'USD', 'EUR', 'GBP'
  currencySymbols: {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£'
  },
  timeUnits: {
    fv: 'year',
    pv: 'year',
    fva: 'year',
    pva: 'year'
  },
  lastAmortizationData: null,
  amortizationViewMode: 'all', // 'all' | 'annual'
  amortizationFilter: '',
  scenarioMode: 'loan', // 'loan' | 'invest'
  activeScenarioPreset: { loan: 'default', invest: 'default' },
  inspectedSensitivityCell: null,
  lastScenarioData: null,
  lastSensitivityData: null,
  activeTab: 'fv'
};

// ==========================================
// Initialization & Lifecycle
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initCurrency();
  initNavigation();
  initEventListeners();
  loadHistory();
  // Pre-calculate scenario analysis with realistic baseline
  runScenarioAnalysis();
});

/**
 * Initialize theme from localStorage or system preference
 */
function initTheme() {
  const savedTheme = localStorage.getItem('tvm_theme') || 'light';
  applyTheme(savedTheme);

  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('tvm_theme', theme);
  const themeIcon = document.getElementById('theme-icon');
  const themeText = document.getElementById('theme-text');
  if (themeIcon && themeText) {
    if (theme === 'dark') {
      themeIcon.innerHTML = '&#9788;'; // Sun
      themeText.textContent = 'Light Mode';
    } else {
      themeIcon.innerHTML = '&#9790;'; // Moon
      themeText.textContent = 'Dark Mode';
    }
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = current === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
}

/**
 * Initialize currency settings
 */
function initCurrency() {
  const savedCurrency = localStorage.getItem('tvm_currency') || 'INR';
  AppState.currency = savedCurrency;
  const currencySelect = document.getElementById('currency-select');
  if (currencySelect) {
    currencySelect.value = savedCurrency;
    currencySelect.addEventListener('change', (e) => {
      setCurrency(e.target.value);
    });
  }
  updateCurrencyDisplayAddons();
}

function setCurrency(code) {
  if (AppState.currencySymbols[code]) {
    AppState.currency = code;
    localStorage.setItem('tvm_currency', code);
    updateCurrencyDisplayAddons();
    recalculateActiveResults();
    loadHistory(); // Re-render history with new currency symbol if relevant
  }
}

function updateCurrencyDisplayAddons() {
  const symbol = AppState.currencySymbols[AppState.currency] || '₹';
  document.querySelectorAll('.currency-symbol').forEach(el => {
    el.textContent = symbol;
  });
}

/**
 * Format a numeric amount as currency string
 */
function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '0.00';
  const symbol = AppState.currencySymbols[AppState.currency] || '₹';
  
  // Format with standard thousands grouping and 2 fixed decimals
  const formattedNumber = Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return `${symbol}${formattedNumber}`;
}

/**
 * Format plain number with commas
 */
function formatNumber(num, decimals = 2) {
  if (isNaN(num)) return '0';
  return Number(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Navigation tabs
 */
function initNavigation() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetPane = btn.getAttribute('data-tab');
      switchTab(targetPane);
    });
  });
}

function switchTab(tabId) {
  AppState.activeTab = tabId;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.calc-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `pane-${tabId}`);
  });
  if (tabId === 'scenario') {
    runScenarioAnalysis({ isLive: true });
  }
}

/**
 * Hook up all calculator buttons and inputs
 */
function initEventListeners() {
  // A. Future Value
  document.getElementById('btn-calc-fv')?.addEventListener('click', () => calculateFutureValue({ recordHistory: true }));
  document.getElementById('btn-reset-fv')?.addEventListener('click', () => resetCalculator('fv'));
  document.getElementById('btn-sample-fv')?.addEventListener('click', loadSampleFV);
  ['fv-pv', 'fv-rate', 'fv-periods'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => calculateLiveIfValid('fv', calculateFutureValue));
  });

  // B. Present Value
  document.getElementById('btn-calc-pv')?.addEventListener('click', () => calculatePresentValue({ recordHistory: true }));
  document.getElementById('btn-reset-pv')?.addEventListener('click', () => resetCalculator('pv'));
  document.getElementById('btn-sample-pv')?.addEventListener('click', loadSamplePV);
  ['pv-fv', 'pv-rate', 'pv-periods'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => calculateLiveIfValid('pv', calculatePresentValue));
  });

  // C. FV Annuity
  document.getElementById('btn-calc-fva')?.addEventListener('click', () => calculateFutureAnnuity({ recordHistory: true }));
  document.getElementById('btn-reset-fva')?.addEventListener('click', () => resetCalculator('fva'));
  document.getElementById('btn-sample-fva')?.addEventListener('click', loadSampleFVA);
  ['fva-pmt', 'fva-rate', 'fva-periods'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => calculateLiveIfValid('fva', calculateFutureAnnuity));
  });

  // D. PV Annuity
  document.getElementById('btn-calc-pva')?.addEventListener('click', () => calculatePresentAnnuity({ recordHistory: true }));
  document.getElementById('btn-reset-pva')?.addEventListener('click', () => resetCalculator('pva'));
  document.getElementById('btn-sample-pva')?.addEventListener('click', loadSamplePVA);
  ['pva-pmt', 'pva-rate', 'pva-periods'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => calculateLiveIfValid('pva', calculatePresentAnnuity));
  });

  // E. Loan & Amortization - Instant live table generation whenever values are put in!
  document.getElementById('btn-calc-loan')?.addEventListener('click', () => calculateLoanPayment({ recordHistory: true, isLive: false }));
  document.getElementById('btn-reset-loan')?.addEventListener('click', () => resetCalculator('loan'));
  document.getElementById('btn-sample-loan')?.addEventListener('click', loadSampleLoan);
  
  // Real-time calculation and amortization table generation as user types or changes frequency
  ['loan-amount', 'loan-rate', 'loan-term'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      calculateLoanPayment({ recordHistory: false, isLive: true });
    });
  });
  document.getElementById('loan-frequency')?.addEventListener('change', () => {
    calculateLoanPayment({ recordHistory: false, isLive: true });
  });

  // Amortization Schedule Table Controls
  document.getElementById('btn-view-all')?.addEventListener('click', () => {
    AppState.amortizationViewMode = 'all';
    document.getElementById('btn-view-all')?.classList.add('active');
    document.getElementById('btn-view-annual')?.classList.remove('active');
    renderAmortizationTable(AppState.lastAmortizationData);
  });

  document.getElementById('btn-view-annual')?.addEventListener('click', () => {
    AppState.amortizationViewMode = 'annual';
    document.getElementById('btn-view-annual')?.classList.add('active');
    document.getElementById('btn-view-all')?.classList.remove('active');
    renderAmortizationTable(AppState.lastAmortizationData);
  });

  document.getElementById('amort-filter-input')?.addEventListener('input', (e) => {
    AppState.amortizationFilter = (e.target.value || '').trim().toLowerCase();
    renderAmortizationTable(AppState.lastAmortizationData);
  });

  document.getElementById('btn-copy-amort')?.addEventListener('click', copyAmortizationTable);
  document.getElementById('btn-download-amort-csv')?.addEventListener('click', downloadAmortizationCSV);
  document.getElementById('btn-download-amort-csv-toolbar')?.addEventListener('click', downloadAmortizationCSV);
  document.getElementById('btn-download-amort-csv-bottom')?.addEventListener('click', downloadAmortizationCSV);
  document.getElementById('btn-download-amort-csv-card')?.addEventListener('click', downloadAmortizationCSV);

  // F. Compound Interest
  document.getElementById('btn-calc-ci')?.addEventListener('click', () => calculateCompoundInterest({ recordHistory: true }));
  document.getElementById('btn-reset-ci')?.addEventListener('click', () => resetCalculator('ci'));
  document.getElementById('btn-sample-ci')?.addEventListener('click', loadSampleCI);
  ['ci-principal', 'ci-rate', 'ci-time'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => calculateLiveIfValid('ci', calculateCompoundInterest));
  });
  document.getElementById('ci-frequency')?.addEventListener('change', () => calculateLiveIfValid('ci', calculateCompoundInterest));

  // G. Scenario Analysis Event Listeners
  document.getElementById('btn-scenario-mode-loan')?.addEventListener('click', () => setScenarioMode('loan'));
  document.getElementById('btn-scenario-mode-invest')?.addEventListener('click', () => setScenarioMode('invest'));

  document.getElementById('btn-calc-scenario')?.addEventListener('click', () => runScenarioAnalysis());
  document.getElementById('btn-reset-scenario')?.addEventListener('click', resetScenarioForm);
  document.getElementById('btn-import-from-loan')?.addEventListener('click', importFromLoanTab);
  document.getElementById('btn-import-from-ci')?.addEventListener('click', importFromCITab);

  // Jump from other calculators to Scenario Analysis
  document.getElementById('btn-goto-scenario-loan')?.addEventListener('click', gotoScenarioFromLoan);
  document.getElementById('btn-goto-scenario-ci')?.addEventListener('click', gotoScenarioFromCI);

  // Quick Preset Chips
  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const presetKey = chip.getAttribute('data-preset');
      applyScenarioPreset(presetKey);
    });
  });

  // Real-time live inputs for Scenario Analysis (including custom what-if fields)
  const scenarioInputIds = [
    'sc-loan-amount', 'sc-loan-rate', 'sc-loan-term', 'sc-loan-freq', 'sc-loan-prepay',
    'sc-custom-loan-rate', 'sc-custom-loan-term', 'sc-custom-loan-prepay',
    'sc-inv-principal', 'sc-inv-rate', 'sc-inv-term', 'sc-inv-deposit', 'sc-inv-freq',
    'sc-custom-inv-rate', 'sc-custom-inv-term', 'sc-custom-inv-deposit'
  ];
  scenarioInputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const evt = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(evt, () => runScenarioAnalysis({ isLive: true }));
    }
  });

  // Interactive Sensitivity Inspector actions
  document.getElementById('btn-apply-inspect-base')?.addEventListener('click', () => applyInspectedSensitivityCell('base'));
  document.getElementById('btn-apply-inspect-custom')?.addEventListener('click', () => applyInspectedSensitivityCell('custom'));

  // Scenario Table & Matrix Exports
  document.getElementById('btn-copy-scenario-table')?.addEventListener('click', copyScenarioTable);
  document.getElementById('btn-download-scenario-csv')?.addEventListener('click', downloadScenarioCSV);
  document.getElementById('btn-download-sensitivity-csv')?.addEventListener('click', downloadSensitivityCSV);

  // History Actions
  document.getElementById('btn-clear-history')?.addEventListener('click', clearHistory);
  document.getElementById('btn-download-history-csv')?.addEventListener('click', downloadHistoryCSV);
}

/**
 * Checks if all inputs for a given calculator have valid values without showing error popups
 */
function calculateLiveIfValid(prefix, calcFn) {
  const inputMap = {
    fv: ['fv-pv', 'fv-rate', 'fv-periods'],
    pv: ['pv-fv', 'pv-rate', 'pv-periods'],
    fva: ['fva-pmt', 'fva-rate', 'fva-periods'],
    pva: ['pva-pmt', 'pva-rate', 'pva-periods'],
    ci: ['ci-principal', 'ci-rate', 'ci-time']
  };

  const ids = inputMap[prefix] || [];
  let allFilled = true;
  let allValid = true;
  let anyFilled = false;

  for (const id of ids) {
    const el = document.getElementById(id);
    const val = el ? el.value.trim() : '';
    if (val !== '') {
      anyFilled = true;
      const num = Number(val);
      if (isNaN(num) || num < 0) {
        allValid = false;
      }
    } else {
      allFilled = false;
    }
  }

  if (!anyFilled) {
    hideResultCard(prefix);
    clearFieldErrors(prefix);
    return;
  }

  if (allFilled && allValid) {
    clearFieldErrors(prefix);
    calcFn({ recordHistory: false, isLive: true });
  }
}

// ==========================================
// Input Validation Helper
// ==========================================
/**
 * Validates a single input value against financial rules
 * @param {string} inputId - ID of HTML input element
 * @param {string} errorId - ID of error display element
 * @param {string} fieldName - Descriptive name of the field
 * @param {Object} options - { allowZero: boolean, mustBePositive: boolean, max: number }
 * @returns {number|null} parsed numeric value, or null if invalid
 */
function validateInput(inputId, errorId, fieldName, options = {}) {
  const inputEl = document.getElementById(inputId);
  const errorEl = document.getElementById(errorId);
  const wrapper = inputEl?.closest('.input-addon-wrapper');

  if (!inputEl) return null;

  const rawValue = inputEl.value.trim();

  // Reset visual error state
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.classList.remove('visible');
  }
  if (wrapper) {
    wrapper.classList.remove('has-error');
  }

  // 1. Check empty
  if (rawValue === '') {
    showFieldError(errorEl, wrapper, `Please enter a value for ${fieldName}.`);
    return null;
  }

  // 2. Check numeric
  const numValue = Number(rawValue);
  if (isNaN(numValue)) {
    showFieldError(errorEl, wrapper, `Please enter a valid numeric value for ${fieldName}.`);
    return null;
  }

  // 3. Negative check
  if (numValue < 0) {
    showFieldError(errorEl, wrapper, `${fieldName} cannot be negative.`);
    return null;
  }

  // 4. Zero check (e.g. for periods/duration)
  if (options.mustBePositive && numValue <= 0) {
    showFieldError(errorEl, wrapper, `${fieldName} must be greater than zero.`);
    return null;
  }

  // 5. Allow zero check
  if (!options.allowZero && numValue === 0) {
    showFieldError(errorEl, wrapper, `${fieldName} must be greater than zero.`);
    return null;
  }

  // 6. Max threshold check
  if (options.max && numValue > options.max) {
    showFieldError(errorEl, wrapper, `${fieldName} exceeds maximum allowable limit (${options.max}).`);
    return null;
  }

  return numValue;
}

function showFieldError(errorEl, wrapper, message) {
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add('visible');
  }
  if (wrapper) {
    wrapper.classList.add('has-error');
  }
}

function clearFieldErrors(calcPrefix) {
  const pane = document.getElementById(`pane-${calcPrefix}`);
  if (!pane) return;
  pane.querySelectorAll('.error-msg').forEach(el => {
    el.textContent = '';
    el.classList.remove('visible');
  });
  pane.querySelectorAll('.input-addon-wrapper').forEach(el => {
    el.classList.remove('has-error');
  });
  const alertEl = document.getElementById(`alert-${calcPrefix}`);
  if (alertEl) {
    alertEl.textContent = '';
    alertEl.classList.remove('visible');
  }
}

/**
 * Sets the Time Unit (Year or Month) for a calculator tab
 * @param {'fv'|'pv'|'fva'|'pva'} pane
 * @param {'year'|'month'} unit
 */
function setTimeUnit(pane, unit) {
  if (!['year', 'month'].includes(unit)) return;
  if (!AppState.timeUnits) {
    AppState.timeUnits = { fv: 'year', pv: 'year', fva: 'year', pva: 'year' };
  }
  const oldUnit = AppState.timeUnits[pane] || 'year';
  AppState.timeUnits[pane] = unit;

  // Toggle button active states
  const yearBtn = document.getElementById(`btn-${pane}-unit-year`);
  const monthBtn = document.getElementById(`btn-${pane}-unit-month`);
  if (yearBtn && monthBtn) {
    if (unit === 'year') {
      yearBtn.classList.add('active');
      monthBtn.classList.remove('active');
    } else {
      monthBtn.classList.add('active');
      yearBtn.classList.remove('active');
    }
  }

  // Update input addon
  const addon = document.getElementById(`${pane}-periods-addon`);
  if (addon) {
    addon.textContent = unit === 'year' ? 'Years' : 'Months';
  }

  // Update duration label & hint
  const durationLabel = document.getElementById(`${pane}-periods-label`);
  if (durationLabel) {
    durationLabel.textContent = unit === 'year' ? 'Time Duration (in Years):' : 'Time Duration (in Months):';
  }
  const durationHint = document.getElementById(`${pane}-periods-hint`);
  if (durationHint) {
    durationHint.textContent = unit === 'year' ? 'Total duration in years.' : 'Total duration in months.';
  }

  // Auto-convert existing duration value if entered
  const durationInput = document.getElementById(`${pane}-periods`);
  if (durationInput && durationInput.value.trim() !== '') {
    const val = parseFloat(durationInput.value);
    if (!isNaN(val) && val > 0) {
      if (oldUnit === 'year' && unit === 'month') {
        durationInput.value = Math.round(val * 12);
      } else if (oldUnit === 'month' && unit === 'year') {
        const converted = val / 12;
        durationInput.value = Number.isInteger(converted) ? converted : converted.toFixed(2);
      }
    }
  } else if (durationInput) {
    durationInput.placeholder = unit === 'year' ? 'e.g. 5' : 'e.g. 60';
  }

  // Update pane-specific field labels and hints
  if (pane === 'fva') {
    const pmtLabel = document.getElementById('fva-pmt-label');
    const pmtHint = document.getElementById('fva-pmt-hint');
    const rateLabel = document.getElementById('fva-rate-label');
    const rateHint = document.getElementById('fva-rate-hint');
    const sampleBtn = document.getElementById('btn-sample-fva');

    if (pmtLabel) pmtLabel.textContent = unit === 'year' ? 'Payment per Year (PMT):' : 'Payment per Month (PMT):';
    if (pmtHint) pmtHint.textContent = unit === 'year' ? 'Amount deposited or paid at the end of each year.' : 'Amount deposited or paid at the end of each month.';
    if (rateLabel) rateLabel.textContent = unit === 'year' ? 'Annual Interest Rate (r):' : 'Monthly Interest Rate (r):';
    if (rateHint) rateHint.textContent = unit === 'year' ? 'Annual interest rate (e.g. 8 for 8% per year; supports r = 0%).' : 'Monthly interest rate (e.g. 1 for 1% per month; supports r = 0%).';
    if (sampleBtn) sampleBtn.textContent = unit === 'year' ? 'Load (PMT=1k, 8%, 5 Years)' : 'Load (PMT=1k, 1%, 60 Months)';
  } else if (pane === 'pva') {
    const pmtLabel = document.getElementById('pva-pmt-label');
    const pmtHint = document.getElementById('pva-pmt-hint');
    const rateLabel = document.getElementById('pva-rate-label');
    const rateHint = document.getElementById('pva-rate-hint');
    const sampleBtn = document.getElementById('btn-sample-pva');

    if (pmtLabel) pmtLabel.textContent = unit === 'year' ? 'Payment per Year (PMT):' : 'Payment per Month (PMT):';
    if (pmtHint) pmtHint.textContent = unit === 'year' ? 'Expected cash inflow or payout each year.' : 'Expected cash inflow or payout each month.';
    if (rateLabel) rateLabel.textContent = unit === 'year' ? 'Annual Discount Rate (r):' : 'Monthly Discount Rate (r):';
    if (rateHint) rateHint.textContent = unit === 'year' ? 'Discount rate per year (e.g. 8 for 8% per year; supports r = 0%).' : 'Discount rate per month (e.g. 1 for 1% per month; supports r = 0%).';
    if (sampleBtn) sampleBtn.textContent = unit === 'year' ? 'Load (PMT=1k, 8%, 5 Years)' : 'Load (PMT=1k, 1%, 60 Months)';
  } else if (pane === 'fv') {
    const rateLabel = document.getElementById('fv-rate-label');
    const rateHint = document.getElementById('fv-rate-hint');
    const sampleBtn = document.getElementById('btn-sample-fv');

    if (rateLabel) rateLabel.textContent = unit === 'year' ? 'Annual Interest Rate (r):' : 'Monthly Interest Rate (r):';
    if (rateHint) rateHint.textContent = unit === 'year' ? 'Annual interest rate (e.g. 8 for 8% per year).' : 'Monthly interest rate (e.g. 1 for 1% per month).';
    if (sampleBtn) sampleBtn.textContent = unit === 'year' ? 'Load (PV=10k, 8%, 5 Years)' : 'Load (PV=10k, 1%, 60 Months)';
  } else if (pane === 'pv') {
    const rateLabel = document.getElementById('pv-rate-label');
    const rateHint = document.getElementById('pv-rate-hint');
    const sampleBtn = document.getElementById('btn-sample-pv');

    if (rateLabel) rateLabel.textContent = unit === 'year' ? 'Annual Discount Rate (r):' : 'Monthly Discount Rate (r):';
    if (rateHint) rateHint.textContent = unit === 'year' ? 'Discount rate per year (e.g. 8 for 8% per year).' : 'Discount rate per month (e.g. 1 for 1% per month).';
    if (sampleBtn) sampleBtn.textContent = unit === 'year' ? 'Load (FV=14,693.28, 8%, 5 Years)' : 'Load (FV=14,693.28, 1%, 60 Months)';
  }

  // Live recalculate if result is currently open
  const resultCard = document.getElementById(`${pane}-result-content`);
  if (resultCard && resultCard.classList.contains('visible')) {
    if (pane === 'fva') calculateFutureAnnuity({ recordHistory: false, isLive: true });
    else if (pane === 'pva') calculatePresentAnnuity({ recordHistory: false, isLive: true });
    else if (pane === 'fv') calculateFutureValue({ recordHistory: false, isLive: true });
    else if (pane === 'pv') calculatePresentValue({ recordHistory: false, isLive: true });
  }
}

// ==========================================
// A. Future Value (FV)
// Formula: FV = PV * (1 + r)^n
// ==========================================
function calculateFutureValue(options = { recordHistory: true }) {
  clearFieldErrors('fv');

  const unit = (AppState.timeUnits && AppState.timeUnits.fv) || 'year';
  const unitLabel = unit === 'year' ? 'Years' : 'Months';

  const pv = validateInput('fv-pv', 'fv-pv-error', 'Present Value (PV)', { allowZero: true });
  const ratePercent = validateInput('fv-rate', 'fv-rate-error', 'Interest Rate (r)', { allowZero: true, max: 500 });
  const periods = validateInput('fv-periods', 'fv-periods-error', `Time duration in ${unitLabel.toLowerCase()}`, { mustBePositive: true, max: 2400 });

  if (pv === null || ratePercent === null || periods === null) {
    return;
  }

  const r = ratePercent / 100;
  // Full numerical precision calculation
  const fv = pv * Math.pow(1 + r, periods);
  const totalInterest = fv - pv;

  // Display outputs
  showResultCard('fv');
  document.getElementById('fv-result-value').textContent = formatCurrency(fv);
  document.getElementById('fv-total-interest').textContent = formatCurrency(totalInterest);
  document.getElementById('fv-initial-pv').textContent = formatCurrency(pv);
  document.getElementById('fv-rate-display').textContent = `${ratePercent.toFixed(2)}%`;
  const fvPeriodsDisplay = document.getElementById('fv-periods-display');
  if (fvPeriodsDisplay) {
    fvPeriodsDisplay.textContent = `${periods} ${unitLabel}`;
  }

  // Save in history
  const shouldRecord = options ? options.recordHistory !== false : true;
  if (shouldRecord) {
    saveHistory({
      type: 'Future Value (FV)',
      tab: 'fv',
      inputs: `PV: ${formatCurrency(pv)} | Rate: ${ratePercent}% | Duration: ${periods} ${unitLabel}`,
      result: `FV = ${formatCurrency(fv)} (Interest: ${formatCurrency(totalInterest)})`,
      raw: { pv, rate: ratePercent, periods, unit }
    });
  }
}

// ==========================================
// B. Present Value (PV)
// Formula: PV = FV / (1 + r)^n
// ==========================================
function calculatePresentValue(options = { recordHistory: true }) {
  clearFieldErrors('pv');

  const unit = (AppState.timeUnits && AppState.timeUnits.pv) || 'year';
  const unitLabel = unit === 'year' ? 'Years' : 'Months';

  const fv = validateInput('pv-fv', 'pv-fv-error', 'Future Value (FV)', { allowZero: true });
  const ratePercent = validateInput('pv-rate', 'pv-rate-error', 'Discount Rate (r)', { allowZero: true, max: 500 });
  const periods = validateInput('pv-periods', 'pv-periods-error', `Time duration in ${unitLabel.toLowerCase()}`, { mustBePositive: true, max: 2400 });

  if (fv === null || ratePercent === null || periods === null) {
    return;
  }

  const r = ratePercent / 100;
  // Full numerical precision calculation
  const pv = fv / Math.pow(1 + r, periods);
  const totalDiscount = fv - pv;

  // Display outputs
  showResultCard('pv');
  document.getElementById('pv-result-value').textContent = formatCurrency(pv);
  document.getElementById('pv-total-discount').textContent = formatCurrency(totalDiscount);
  document.getElementById('pv-target-fv').textContent = formatCurrency(fv);
  document.getElementById('pv-rate-display').textContent = `${ratePercent.toFixed(2)}%`;
  const pvPeriodsDisplay = document.getElementById('pv-periods-display');
  if (pvPeriodsDisplay) {
    pvPeriodsDisplay.textContent = `${periods} ${unitLabel}`;
  }

  // Save in history
  const shouldRecord = options ? options.recordHistory !== false : true;
  if (shouldRecord) {
    saveHistory({
      type: 'Present Value (PV)',
      tab: 'pv',
      inputs: `FV: ${formatCurrency(fv)} | Rate: ${ratePercent}% | Duration: ${periods} ${unitLabel}`,
      result: `PV = ${formatCurrency(pv)} (Discount: ${formatCurrency(totalDiscount)})`,
      raw: { fv, rate: ratePercent, periods, unit }
    });
  }
}

// ==========================================
// C. Future Value of Ordinary Annuity
// Formula: FV = PMT * [((1 + r)^n - 1) / r]
// If r = 0, FV = PMT * n
// ==========================================
function calculateFutureAnnuity(options = { recordHistory: true }) {
  clearFieldErrors('fva');

  const unit = (AppState.timeUnits && AppState.timeUnits.fva) || 'year';
  const unitLabel = unit === 'year' ? 'Years' : 'Months';
  const freqLabel = unit === 'year' ? 'Yearly' : 'Monthly';

  const pmt = validateInput('fva-pmt', 'fva-pmt-error', `Payment per ${unit === 'year' ? 'Year' : 'Month'} (PMT)`, { allowZero: true });
  const ratePercent = validateInput('fva-rate', 'fva-rate-error', `${unit === 'year' ? 'Annual' : 'Monthly'} Interest Rate`, { allowZero: true, max: 500 });
  const periods = validateInput('fva-periods', 'fva-periods-error', `Time duration in ${unitLabel.toLowerCase()}`, { mustBePositive: true, max: 2400 });

  if (pmt === null || ratePercent === null || periods === null) {
    return;
  }

  const r = ratePercent / 100;
  let fv = 0;

  // Zero-interest rate check: avoid division by zero
  if (r === 0) {
    fv = pmt * periods;
  } else {
    fv = pmt * ((Math.pow(1 + r, periods) - 1) / r);
  }

  const totalDeposited = pmt * periods;
  const totalInterest = fv - totalDeposited;

  // Display outputs
  showResultCard('fva');
  document.getElementById('fva-result-value').textContent = formatCurrency(fv);
  document.getElementById('fva-total-deposited').textContent = formatCurrency(totalDeposited);
  document.getElementById('fva-total-interest').textContent = formatCurrency(totalInterest);
  document.getElementById('fva-pmt-display').textContent = formatCurrency(pmt);
  const fvaDurDisplay = document.getElementById('fva-duration-display');
  if (fvaDurDisplay) {
    fvaDurDisplay.textContent = `${periods} ${unitLabel} (${freqLabel})`;
  }

  // Save in history
  const shouldRecord = options ? options.recordHistory !== false : true;
  if (shouldRecord) {
    saveHistory({
      type: 'FV of Ordinary Annuity',
      tab: 'fva',
      inputs: `PMT: ${formatCurrency(pmt)} (${freqLabel}) | Rate: ${ratePercent}% | Duration: ${periods} ${unitLabel}`,
      result: `FV = ${formatCurrency(fv)} (Interest: ${formatCurrency(totalInterest)})`,
      raw: { pmt, rate: ratePercent, periods, unit }
    });
  }
}

// ==========================================
// D. Present Value of Ordinary Annuity
// Formula: PV = PMT * [1 - (1 + r)^(-n)] / r
// If r = 0, PV = PMT * n
// ==========================================
function calculatePresentAnnuity(options = { recordHistory: true }) {
  clearFieldErrors('pva');

  const unit = (AppState.timeUnits && AppState.timeUnits.pva) || 'year';
  const unitLabel = unit === 'year' ? 'Years' : 'Months';
  const freqLabel = unit === 'year' ? 'Yearly' : 'Monthly';

  const pmt = validateInput('pva-pmt', 'pva-pmt-error', `Payment per ${unit === 'year' ? 'Year' : 'Month'} (PMT)`, { allowZero: true });
  const ratePercent = validateInput('pva-rate', 'pva-rate-error', `${unit === 'year' ? 'Annual' : 'Monthly'} Discount Rate`, { allowZero: true, max: 500 });
  const periods = validateInput('pva-periods', 'pva-periods-error', `Time duration in ${unitLabel.toLowerCase()}`, { mustBePositive: true, max: 2400 });

  if (pmt === null || ratePercent === null || periods === null) {
    return;
  }

  const r = ratePercent / 100;
  let pv = 0;

  // Zero-interest rate check
  if (r === 0) {
    pv = pmt * periods;
  } else {
    pv = pmt * ((1 - Math.pow(1 + r, -periods)) / r);
  }

  const totalPayments = pmt * periods;
  const totalInterestDiscount = totalPayments - pv;

  // Display outputs
  showResultCard('pva');
  document.getElementById('pva-result-value').textContent = formatCurrency(pv);
  document.getElementById('pva-total-payments').textContent = formatCurrency(totalPayments);
  document.getElementById('pva-total-interest').textContent = formatCurrency(totalInterestDiscount);
  document.getElementById('pva-pmt-display').textContent = formatCurrency(pmt);
  const pvaDurDisplay = document.getElementById('pva-duration-display');
  if (pvaDurDisplay) {
    pvaDurDisplay.textContent = `${periods} ${unitLabel} (${freqLabel})`;
  }

  // Save in history
  const shouldRecord = options ? options.recordHistory !== false : true;
  if (shouldRecord) {
    saveHistory({
      type: 'PV of Ordinary Annuity',
      tab: 'pva',
      inputs: `PMT: ${formatCurrency(pmt)} (${freqLabel}) | Rate: ${ratePercent}% | Duration: ${periods} ${unitLabel}`,
      result: `PV = ${formatCurrency(pv)} (Discount: ${formatCurrency(totalInterestDiscount)})`,
      raw: { pmt, rate: ratePercent, periods, unit }
    });
  }
}

// ==========================================
// E. Loan Payment & Live Amortization Schedule
// Formula: PMT = PV * r / [1 - (1 + r)^(-n)]
// Frequencies: Monthly (12), Quarterly (4), Half-Yearly (2), Yearly (1)
// ==========================================
function calculateLoanPayment(options = { recordHistory: true, isLive: false }) {
  const isLive = Boolean(options && options.isLive);
  const shouldRecordHistory = options ? options.recordHistory !== false : true;

  const amountInput = document.getElementById('loan-amount');
  const rateInput = document.getElementById('loan-rate');
  const termInput = document.getElementById('loan-term');
  const frequencySelect = document.getElementById('loan-frequency');
  const frequency = parseInt(frequencySelect?.value || '12', 10);

  const rawAmount = amountInput ? amountInput.value.trim() : '';
  const rawRate = rateInput ? rateInput.value.trim() : '';
  const rawTerm = termInput ? termInput.value.trim() : '';

  // 1. If all fields are completely blank:
  if (!rawAmount && !rawRate && !rawTerm) {
    clearFieldErrors('loan');
    hideResultCard('loan');
    AppState.lastAmortizationData = null;
    renderAmortizationTable(null);
    return;
  }

  // 2. If live input and user has only entered some of the values:
  if (isLive) {
    if (!rawAmount || !rawRate || !rawTerm) {
      const parsedAmt = Number(rawAmount);
      if (rawAmount && !isNaN(parsedAmt) && parsedAmt > 0) {
        showAmortizationPartialPrompt(`Loan principal of ${formatCurrency(parsedAmt)} entered. Please input Annual Interest Rate and Loan Term to generate the schedule table.`);
      } else {
        showAmortizationPartialPrompt("Enter Loan Amount, Annual Interest Rate, and Loan Term to build your amortization schedule table.");
      }
      return;
    }
  }

  // 3. Validation
  let loanAmount = 0;
  let annualRate = 0;
  let loanTermYears = 0;

  if (isLive) {
    loanAmount = Number(rawAmount);
    annualRate = Number(rawRate);
    loanTermYears = Number(rawTerm);

    if (isNaN(loanAmount) || loanAmount <= 0 ||
        isNaN(annualRate) || annualRate < 0 || annualRate > 100 ||
        isNaN(loanTermYears) || loanTermYears <= 0 || loanTermYears > 50) {
      return; // Keep quiet while user is typing mid-digit
    }
    clearFieldErrors('loan');
  } else {
    clearFieldErrors('loan');
    loanAmount = validateInput('loan-amount', 'loan-amount-error', 'Loan Amount', { mustBePositive: true });
    annualRate = validateInput('loan-rate', 'loan-rate-error', 'Annual Interest Rate', { allowZero: true, max: 100 });
    loanTermYears = validateInput('loan-term', 'loan-term-error', 'Loan Term in years', { mustBePositive: true, max: 50 });

    if (loanAmount === null || annualRate === null || loanTermYears === null) {
      return;
    }
  }

  // Periodic conversion
  const periodicRate = (annualRate / 100) / frequency;
  const totalPeriods = Math.round(loanTermYears * frequency);

  let periodicPayment = 0;

  if (periodicRate === 0) {
    periodicPayment = loanAmount / totalPeriods;
  } else {
    // PMT = PV * r / [1 - (1 + r)^(-n)]
    periodicPayment = loanAmount * (periodicRate / (1 - Math.pow(1 + periodicRate, -totalPeriods)));
  }

  // Generate Amortization Schedule Data
  const scheduleData = generateAmortizationSchedule(loanAmount, periodicRate, totalPeriods, periodicPayment, frequency);
  AppState.lastAmortizationData = scheduleData;

  // Display outputs
  showResultCard('loan');
  document.getElementById('loan-result-value').textContent = formatCurrency(periodicPayment);
  document.getElementById('loan-total-payment').textContent = formatCurrency(scheduleData.totalPayments);
  document.getElementById('loan-total-interest').textContent = formatCurrency(scheduleData.totalInterest);
  document.getElementById('loan-principal-display').textContent = formatCurrency(loanAmount);
  document.getElementById('loan-periods-display').textContent = `${totalPeriods} payments`;

  // Render Amortization Table
  renderAmortizationTable(scheduleData);

  // Frequency name mapping
  const freqMap = { 12: 'Monthly', 4: 'Quarterly', 2: 'Half-Yearly', 1: 'Yearly' };
  const freqName = freqMap[frequency] || 'Monthly';

  // Save in history only on manual button click or sample load
  if (shouldRecordHistory) {
    saveHistory({
      type: 'Loan Payment',
      tab: 'loan',
      inputs: `Loan: ${formatCurrency(loanAmount)} | Rate: ${annualRate}% | Term: ${loanTermYears} yrs (${freqName})`,
      result: `Payment: ${formatCurrency(periodicPayment)} | Total Int: ${formatCurrency(scheduleData.totalInterest)}`,
      raw: { loanAmount, annualRate, loanTermYears, frequency }
    });
  }
}

/**
 * Generates exact amortization schedule row by row and aggregates annual summaries
 */
function generateAmortizationSchedule(principal, periodicRate, totalPeriods, fixedPMT, frequency = 12) {
  let remainingBalance = principal;
  const rows = [];
  let totalInterest = 0;
  let totalPrincipal = 0;
  let totalPayments = 0;
  let cumulativeInterest = 0;

  for (let paymentNo = 1; paymentNo <= totalPeriods; paymentNo++) {
    // Interest portion for current period
    const interestPortion = remainingBalance * periodicRate;
    let principalPortion = fixedPMT - interestPortion;
    let paymentAmount = fixedPMT;

    // Handle final period or balance convergence to avoid minor floating penny drift
    if (paymentNo === totalPeriods || principalPortion > remainingBalance) {
      principalPortion = remainingBalance;
      paymentAmount = principalPortion + interestPortion;
      remainingBalance = 0;
    } else {
      remainingBalance -= principalPortion;
    }

    // Floating point cleanup
    if (Math.abs(remainingBalance) < 0.0001) {
      remainingBalance = 0;
    }

    totalInterest += interestPortion;
    totalPrincipal += principalPortion;
    totalPayments += paymentAmount;
    cumulativeInterest += interestPortion;

    rows.push({
      paymentNo,
      payment: paymentAmount,
      principal: principalPortion,
      interest: interestPortion,
      cumulativeInterest: cumulativeInterest,
      remainingBalance: remainingBalance
    });

    if (remainingBalance <= 0) break;
  }

  // Generate Annual Summary rows
  const annualRows = [];
  let currentYear = 1;
  let yearPayment = 0;
  let yearPrincipal = 0;
  let yearInterest = 0;
  let endBalance = 0;
  let yearCumInterest = 0;

  rows.forEach((row, index) => {
    yearPayment += row.payment;
    yearPrincipal += row.principal;
    yearInterest += row.interest;
    endBalance = row.remainingBalance;
    yearCumInterest = row.cumulativeInterest;

    if ((index + 1) % frequency === 0 || index === rows.length - 1) {
      annualRows.push({
        year: currentYear,
        payment: yearPayment,
        principal: yearPrincipal,
        interest: yearInterest,
        cumulativeInterest: yearCumInterest,
        remainingBalance: endBalance
      });
      currentYear++;
      yearPayment = 0;
      yearPrincipal = 0;
      yearInterest = 0;
    }
  });

  return {
    rows,
    annualRows,
    totalPrincipal,
    totalInterest,
    totalPayments,
    totalPeriods,
    frequency
  };
}

/**
 * Display informative guidance inside the schedule table when fields are partially filled
 */
function showAmortizationPartialPrompt(message) {
  const tbody = document.getElementById('amortization-tbody');
  const tfoot = document.getElementById('amortization-tfoot');
  const statsBox = document.getElementById('amort-stats-box');
  if (statsBox) statsBox.style.display = 'none';
  if (tfoot) tfoot.style.display = 'none';
  if (tbody) {
    tbody.innerHTML = `
      <tr id="amort-empty-row">
        <td colspan="6" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted); font-size: 0.95rem;">
          ${escapeHtml(message)}
        </td>
      </tr>
    `;
  }
}

/**
 * Render Amortization schedule into HTML table with live stats, search, and view toggle
 */
function renderAmortizationTable(scheduleData) {
  const container = document.getElementById('amortization-container');
  const tbody = document.getElementById('amortization-tbody');
  const tfoot = document.getElementById('amortization-tfoot');
  const statsBox = document.getElementById('amort-stats-box');
  const colHeaderNo = document.getElementById('amort-col-header-no');

  if (!container || !tbody || !tfoot) return;

  if (!scheduleData || !scheduleData.rows || scheduleData.rows.length === 0) {
    if (statsBox) statsBox.style.display = 'none';
    tfoot.style.display = 'none';
    tbody.innerHTML = `
      <tr id="amort-empty-row">
        <td colspan="6" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted); font-size: 0.95rem;">
          Enter Loan Amount, Annual Interest Rate, and Loan Term above to automatically generate your Amortization Schedule table.
        </td>
      </tr>
    `;
    return;
  }

  // Update Summary Stats & Progress Bar
  if (statsBox) {
    statsBox.style.display = 'flex';
    document.getElementById('amort-stat-periods').textContent = `${scheduleData.totalPeriods} payments`;
    document.getElementById('amort-stat-principal').textContent = formatCurrency(scheduleData.totalPrincipal);
    document.getElementById('amort-stat-interest').textContent = formatCurrency(scheduleData.totalInterest);

    const ratio = scheduleData.totalPrincipal > 0
      ? ((scheduleData.totalInterest / scheduleData.totalPrincipal) * 100).toFixed(1)
      : '0.0';
    document.getElementById('amort-stat-ratio').textContent = `${ratio}%`;

    const principalShare = scheduleData.totalPayments > 0
      ? ((scheduleData.totalPrincipal / scheduleData.totalPayments) * 100).toFixed(1)
      : 50;
    const interestShare = (100 - principalShare).toFixed(1);

    const barPrincipal = document.getElementById('amort-bar-principal');
    const barInterest = document.getElementById('amort-bar-interest');
    if (barPrincipal) barPrincipal.style.width = `${principalShare}%`;
    if (barInterest) barInterest.style.width = `${interestShare}%`;
  }

  const isAnnual = AppState.amortizationViewMode === 'annual';
  if (colHeaderNo) {
    colHeaderNo.textContent = isAnnual ? 'Year' : 'Payment No.';
  }

  const rawRows = isAnnual ? scheduleData.annualRows : scheduleData.rows;
  const filter = AppState.amortizationFilter || '';

  const filteredRows = rawRows.filter(r => {
    if (!filter) return true;
    const num = String(isAnnual ? r.year : r.paymentNo);
    const pmt = r.payment.toFixed(2);
    const princ = r.principal.toFixed(2);
    const int = r.interest.toFixed(2);
    const bal = r.remainingBalance.toFixed(2);
    return num.includes(filter) || pmt.includes(filter) || princ.includes(filter) || int.includes(filter) || bal.includes(filter);
  });

  tbody.innerHTML = '';

  if (filteredRows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2rem 1rem; color: var(--text-muted);">
          No schedule rows matching "${escapeHtml(filter)}".
        </td>
      </tr>
    `;
  } else {
    const fragment = document.createDocumentFragment();
    filteredRows.forEach(row => {
      const tr = document.createElement('tr');
      const numLabel = isAnnual ? `Year ${row.year}` : row.paymentNo;
      tr.innerHTML = `
        <td style="font-weight: 600; color: var(--text-primary); text-align: center;">${numLabel}</td>
        <td style="font-family: var(--font-mono); font-weight: 500;">${formatCurrency(row.payment)}</td>
        <td style="font-family: var(--font-mono); color: var(--color-primary); font-weight: 500;">${formatCurrency(row.principal)}</td>
        <td style="font-family: var(--font-mono); color: var(--color-warning); font-weight: 500;">${formatCurrency(row.interest)}</td>
        <td style="font-family: var(--font-mono); color: var(--text-secondary);">${formatCurrency(row.cumulativeInterest)}</td>
        <td style="font-family: var(--font-mono); font-weight: 600;">${formatCurrency(row.remainingBalance)}</td>
      `;
      fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);
  }

  // Summary Footer
  tfoot.style.display = '';
  tfoot.innerHTML = `
    <tr>
      <td style="text-align: center;"><strong>Total</strong></td>
      <td style="font-family: var(--font-mono);"><strong>${formatCurrency(scheduleData.totalPayments)}</strong></td>
      <td style="font-family: var(--font-mono); color: var(--color-primary);"><strong>${formatCurrency(scheduleData.totalPrincipal)}</strong></td>
      <td style="font-family: var(--font-mono); color: var(--color-warning);"><strong>${formatCurrency(scheduleData.totalInterest)}</strong></td>
      <td style="font-family: var(--font-mono); color: var(--text-secondary);"><strong>${formatCurrency(scheduleData.totalInterest)}</strong></td>
      <td style="font-family: var(--font-mono);"><strong>${formatCurrency(0)}</strong></td>
    </tr>
  `;
}

/**
 * Copy amortization schedule table to clipboard in tab-separated format
 */
function copyAmortizationTable() {
  if (!AppState.lastAmortizationData || !AppState.lastAmortizationData.rows.length) {
    alert('Please enter loan details to generate the schedule table first.');
    return;
  }

  const isAnnual = AppState.amortizationViewMode === 'annual';
  const data = AppState.lastAmortizationData;
  const list = isAnnual ? data.annualRows : data.rows;
  const col1 = isAnnual ? 'Year' : 'Payment No';

  let text = `${col1}\tPayment\tPrincipal\tInterest\tCumulative Interest\tRemaining Balance\n`;
  list.forEach(r => {
    const num = isAnnual ? `Year ${r.year}` : r.paymentNo;
    text += `${num}\t${r.payment.toFixed(2)}\t${r.principal.toFixed(2)}\t${r.interest.toFixed(2)}\t${r.cumulativeInterest.toFixed(2)}\t${r.remainingBalance.toFixed(2)}\n`;
  });
  text += `Total\t${data.totalPayments.toFixed(2)}\t${data.totalPrincipal.toFixed(2)}\t${data.totalInterest.toFixed(2)}\t${data.totalInterest.toFixed(2)}\t0.00\n`;

  navigator.clipboard.writeText(text).then(() => {
    const icon = document.getElementById('copy-amort-icon');
    const textEl = document.getElementById('copy-amort-text');
    if (icon && textEl) {
      icon.innerHTML = '&#10003;';
      textEl.textContent = 'Copied!';
      setTimeout(() => {
        icon.innerHTML = '&#128203;';
        textEl.textContent = 'Copy';
      }, 2000);
    }
  }).catch(() => {
    alert('Could not copy table to clipboard.');
  });
}

// ==========================================
// F. Compound Interest
// Formula: A = P * (1 + r/m)^(m * t)
// Frequencies: Annually (1), Semi-annually (2), Quarterly (4), Monthly (12), Daily (365)
// ==========================================
function calculateCompoundInterest() {
  clearFieldErrors('ci');

  const principal = validateInput('ci-principal', 'ci-principal-error', 'Principal amount', { allowZero: true });
  const annualRate = validateInput('ci-rate', 'ci-rate-error', 'Annual Interest Rate', { allowZero: true, max: 200 });
  const timeYears = validateInput('ci-time', 'ci-time-error', 'Time in years', { mustBePositive: true, max: 100 });
  const freqSelect = document.getElementById('ci-frequency');
  const m = parseInt(freqSelect?.value || '1', 10);

  if (principal === null || annualRate === null || timeYears === null) {
    return;
  }

  const r = annualRate / 100;
  let finalAmount = 0;

  if (r === 0) {
    finalAmount = principal;
  } else {
    // A = P * (1 + r/m)^(m * t)
    finalAmount = principal * Math.pow(1 + (r / m), m * timeYears);
  }

  const interestEarned = finalAmount - principal;

  // Effective Annual Rate (EAR) = (1 + r/m)^m - 1
  let effectiveRate = 0;
  if (r > 0) {
    effectiveRate = (Math.pow(1 + (r / m), m) - 1) * 100;
  }

  // Display outputs
  showResultCard('ci');
  document.getElementById('ci-result-value').textContent = formatCurrency(finalAmount);
  document.getElementById('ci-interest-earned').textContent = formatCurrency(interestEarned);
  document.getElementById('ci-initial-principal').textContent = formatCurrency(principal);
  document.getElementById('ci-effective-rate').textContent = `${effectiveRate.toFixed(2)}%`;

  const freqNames = { 1: 'Annual', 2: 'Semi-annual', 4: 'Quarterly', 12: 'Monthly', 365: 'Daily' };
  const freqName = freqNames[m] || 'Annual';

  // Save in history
  saveHistory({
    type: 'Compound Interest',
    tab: 'ci',
    inputs: `Principal: ${formatCurrency(principal)} | Rate: ${annualRate}% | Time: ${timeYears} yrs (${freqName})`,
    result: `Amount: ${formatCurrency(finalAmount)} (Interest: ${formatCurrency(interestEarned)})`,
    raw: { principal, annualRate, timeYears, frequency: m }
  });
}

// ==========================================
// UI Helpers: Show / Reset Results
// ==========================================
function showResultCard(prefix) {
  const placeholder = document.getElementById(`${prefix}-result-placeholder`);
  const content = document.getElementById(`${prefix}-result-content`);
  if (placeholder) placeholder.style.display = 'none';
  if (content) content.classList.add('visible');
}

function hideResultCard(prefix) {
  const placeholder = document.getElementById(`${prefix}-result-placeholder`);
  const content = document.getElementById(`${prefix}-result-content`);
  if (placeholder) placeholder.style.display = 'block';
  if (content) content.classList.remove('visible');
}

/**
 * Resets a calculator inputs, outputs, and errors
 */
function resetCalculator(prefix) {
  clearFieldErrors(prefix);
  hideResultCard(prefix);

  const pane = document.getElementById(`pane-${prefix}`);
  if (!pane) return;

  pane.querySelectorAll('input[type="number"], input[type="text"]').forEach(input => {
    input.value = '';
  });

  if (prefix === 'loan') {
    AppState.lastAmortizationData = null;
    AppState.amortizationFilter = '';
    AppState.amortizationViewMode = 'all';
    const filterInput = document.getElementById('amort-filter-input');
    if (filterInput) filterInput.value = '';
    const viewAllBtn = document.getElementById('btn-view-all');
    const viewAnnualBtn = document.getElementById('btn-view-annual');
    if (viewAllBtn) viewAllBtn.classList.add('active');
    if (viewAnnualBtn) viewAnnualBtn.classList.remove('active');
    const freqSelect = document.getElementById('loan-frequency');
    if (freqSelect) freqSelect.value = '12';
    renderAmortizationTable(null);
  }

  if (prefix === 'ci') {
    const freqSelect = document.getElementById('ci-frequency');
    if (freqSelect) freqSelect.value = '1';
  }
}

/**
 * Recalculates currently displayed result if values exist when currency symbol changes
 */
function recalculateActiveResults() {
  // If result card is visible, re-trigger calculate to update currency labels
  const checkAndRecalc = (prefix, calcFn) => {
    const content = document.getElementById(`${prefix}-result-content`);
    if (content && content.classList.contains('visible')) {
      calcFn({ recordHistory: false, isLive: true });
    }
  };

  checkAndRecalc('fv', calculateFutureValue);
  checkAndRecalc('pv', calculatePresentValue);
  checkAndRecalc('fva', calculateFutureAnnuity);
  checkAndRecalc('pva', calculatePresentAnnuity);
  checkAndRecalc('loan', calculateLoanPayment);
  checkAndRecalc('ci', calculateCompoundInterest);

  if (AppState.lastAmortizationData) {
    renderAmortizationTable(AppState.lastAmortizationData);
  }

  if (AppState.lastScenarioData) {
    runScenarioAnalysis({ isLive: true });
  }
}

// ==========================================
// Sample Test Case Loaders
// ==========================================
// Test Case 1 — Future Value
function loadSampleFV() {
  const unit = (AppState.timeUnits && AppState.timeUnits.fv) || 'year';
  if (unit === 'month') {
    document.getElementById('fv-pv').value = '10000';
    document.getElementById('fv-rate').value = '1';
    document.getElementById('fv-periods').value = '60';
  } else {
    document.getElementById('fv-pv').value = '10000';
    document.getElementById('fv-rate').value = '8';
    document.getElementById('fv-periods').value = '5';
  }
  calculateFutureValue({ recordHistory: true });
}

// Test Case 2 — Present Value
function loadSamplePV() {
  const unit = (AppState.timeUnits && AppState.timeUnits.pv) || 'year';
  if (unit === 'month') {
    document.getElementById('pv-fv').value = '18166.97';
    document.getElementById('pv-rate').value = '1';
    document.getElementById('pv-periods').value = '60';
  } else {
    document.getElementById('pv-fv').value = '14693.28';
    document.getElementById('pv-rate').value = '8';
    document.getElementById('pv-periods').value = '5';
  }
  calculatePresentValue({ recordHistory: true });
}

// Test Case 3 — Future Value Annuity
function loadSampleFVA() {
  const unit = (AppState.timeUnits && AppState.timeUnits.fva) || 'year';
  if (unit === 'month') {
    document.getElementById('fva-pmt').value = '1000';
    document.getElementById('fva-rate').value = '1';
    document.getElementById('fva-periods').value = '60';
  } else {
    document.getElementById('fva-pmt').value = '1000';
    document.getElementById('fva-rate').value = '8';
    document.getElementById('fva-periods').value = '5';
  }
  calculateFutureAnnuity({ recordHistory: true });
}

// Test Case 4 — Loan: Amount=500,000, Rate=8%, Term=5 yrs, Monthly
function loadSampleLoan() {
  document.getElementById('loan-amount').value = '500000';
  document.getElementById('loan-rate').value = '8';
  document.getElementById('loan-term').value = '5';
  document.getElementById('loan-frequency').value = '12';
  calculateLoanPayment({ recordHistory: true, isLive: false });
}

// Test Case 5 — Compound Interest: Principal=10,000, Rate=8%, Time=5 yrs, Annual -> Expected: ₹14,693.28
function loadSampleCI() {
  document.getElementById('ci-principal').value = '10000';
  document.getElementById('ci-rate').value = '8';
  document.getElementById('ci-time').value = '5';
  document.getElementById('ci-frequency').value = '1';
  calculateCompoundInterest({ recordHistory: true });
}

// Sample for PV Annuity (Bonus convenience)
function loadSamplePVA() {
  const unit = (AppState.timeUnits && AppState.timeUnits.pva) || 'year';
  if (unit === 'month') {
    document.getElementById('pva-pmt').value = '1000';
    document.getElementById('pva-rate').value = '1';
    document.getElementById('pva-periods').value = '60';
  } else {
    document.getElementById('pva-pmt').value = '1000';
    document.getElementById('pva-rate').value = '8';
    document.getElementById('pva-periods').value = '5';
  }
  calculatePresentAnnuity({ recordHistory: true });
}

// ==========================================
// Calculation History Management
// ==========================================
const HISTORY_KEY = 'tvm_calc_history';

function saveHistory(item) {
  try {
    const history = getHistory();
    const newEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString(),
      ...item
    };
    // Prepend new entry, limit to 50 items
    history.unshift(newEntry);
    if (history.length > 50) history.pop();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistoryTable(history);
  } catch (err) {
    console.error('Failed to save calculation history:', err);
  }
}

function getHistory() {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    return [];
  }
}

function loadHistory() {
  const history = getHistory();
  renderHistoryTable(history);
}

function clearHistory() {
  if (confirm('Are you sure you want to clear all calculation history?')) {
    localStorage.removeItem(HISTORY_KEY);
    renderHistoryTable([]);
  }
}

function renderHistoryTable(history) {
  const tbody = document.getElementById('history-tbody');
  const emptyState = document.getElementById('history-empty');
  const tableContainer = document.getElementById('history-table-container');

  if (!tbody || !emptyState || !tableContainer) return;

  if (history.length === 0) {
    emptyState.style.display = 'block';
    tableContainer.style.display = 'none';
    tbody.innerHTML = '';
    return;
  }

  emptyState.style.display = 'none';
  tableContainer.style.display = 'block';
  tbody.innerHTML = '';

  history.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align:left; font-size:0.8rem; color:var(--text-muted);">${escapeHtml(item.timestamp)}</td>
      <td style="text-align:left;"><span class="history-item-badge">${escapeHtml(item.type)}</span></td>
      <td style="text-align:left; font-family:var(--font-mono); font-size:0.85rem;">${escapeHtml(item.inputs)}</td>
      <td style="text-align:left; font-family:var(--font-mono); font-weight:600; color:var(--color-primary);">${escapeHtml(item.result)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================
// Toast Notifications
// ==========================================
/**
 * Shows non-blocking in-app toast notification
 */
function showNotification(message, type = 'info') {
  let container = document.getElementById('app-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'app-toast-container';
    container.className = 'app-toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `app-toast toast-${type}`;
  
  const iconMap = {
    success: '✓',
    warning: '⚠',
    info: 'ℹ',
    danger: '✕'
  };
  const icon = iconMap[type] || 'ℹ';

  toast.innerHTML = `<span style="font-weight: 700; font-size: 1rem;">${icon}</span> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-fading');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3200);
}

// ==========================================
// CSV Exports
// ==========================================
/**
 * Generic CSV downloader helper with UTF-8 BOM support for Excel
 */
function exportCSV(filename, csvContent) {
  // Add UTF-8 BOM for Excel compatibility
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Downloads Amortization Schedule CSV with metadata and column totals
 */
function downloadAmortizationCSV() {
  // If no data currently calculated, check if loan inputs already have values entered
  if (!AppState.lastAmortizationData || !AppState.lastAmortizationData.rows.length) {
    const amountVal = document.getElementById('loan-amount')?.value?.trim();
    const rateVal = document.getElementById('loan-rate')?.value?.trim();
    const termVal = document.getElementById('loan-term')?.value?.trim();

    if (amountVal && rateVal && termVal) {
      calculateLoanPayment({ recordHistory: true, isLive: false });
    }
  }

  if (!AppState.lastAmortizationData || !AppState.lastAmortizationData.rows.length) {
    showNotification('Please enter Loan Amount, Annual Interest Rate, and Loan Term above to generate and download the schedule table.', 'warning');
    const firstInput = document.getElementById('loan-amount');
    if (firstInput) {
      firstInput.focus();
      firstInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  const isAnnual = AppState.amortizationViewMode === 'annual';
  const data = AppState.lastAmortizationData;
  const list = isAnnual ? data.annualRows : data.rows;
  const col1 = isAnnual ? 'Year' : 'Payment No';

  // Get current form values for metadata header
  const loanAmt = document.getElementById('loan-amount')?.value || data.totalPrincipal;
  const loanRate = document.getElementById('loan-rate')?.value || 'N/A';
  const loanTerm = document.getElementById('loan-term')?.value || 'N/A';
  const freqSelect = document.getElementById('loan-frequency');
  const freqName = freqSelect ? freqSelect.options[freqSelect.selectedIndex]?.text : 'Monthly';

  const rows = [];
  
  // Metadata comments for Excel/Sheets readers
  rows.push(`# Time Value of Money (TVM) Calculator - Loan Amortization Schedule`);
  rows.push(`# Exported: ${new Date().toLocaleString()}`);
  rows.push(`# Principal Borrowed: ${formatCurrency(Number(loanAmt) || data.totalPrincipal)}`);
  rows.push(`# Annual Interest Rate: ${loanRate}%`);
  rows.push(`# Loan Term: ${loanTerm} years (${freqName})`);
  rows.push(`# Total Payments: ${formatCurrency(data.totalPayments)} | Total Interest: ${formatCurrency(data.totalInterest)}`);
  rows.push(`#`);

  // Column Headers
  const headers = [col1, 'Payment Amount', 'Principal', 'Interest', 'Cumulative Interest', 'Remaining Balance'];
  rows.push(headers.join(','));

  // Data Rows
  list.forEach(r => {
    const num = isAnnual ? `Year ${r.year}` : r.paymentNo;
    rows.push([
      `"${num}"`,
      r.payment.toFixed(2),
      r.principal.toFixed(2),
      r.interest.toFixed(2),
      r.cumulativeInterest.toFixed(2),
      r.remainingBalance.toFixed(2)
    ].join(','));
  });

  // Footer summary row
  rows.push([
    'Total',
    data.totalPayments.toFixed(2),
    data.totalPrincipal.toFixed(2),
    data.totalInterest.toFixed(2),
    data.totalInterest.toFixed(2),
    '0.00'
  ].join(','));

  const csvContent = rows.join('\r\n');
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = isAnnual 
    ? `loan_annual_amortization_schedule_${timestamp}.csv` 
    : `loan_amortization_schedule_${timestamp}.csv`;

  exportCSV(filename, csvContent);

  // Animate button feedback
  const buttonsToAnimate = [
    document.getElementById('btn-download-amort-csv'),
    document.getElementById('btn-download-amort-csv-toolbar'),
    document.getElementById('btn-download-amort-csv-bottom'),
    document.getElementById('btn-download-amort-csv-card')
  ];

  buttonsToAnimate.forEach(btn => {
    if (btn) {
      const origHtml = btn.innerHTML;
      btn.innerHTML = `<span>✓</span> <span>Downloaded!</span>`;
      btn.style.opacity = '0.9';
      setTimeout(() => {
        btn.innerHTML = origHtml;
        btn.style.opacity = '1';
      }, 2000);
    }
  });

  showNotification(`Amortization schedule downloaded as "${filename}"! 📊`, 'success');
}

// ==========================================================================
// SCENARIO & WHAT-IF SENSITIVITY ANALYSIS MODULE
// ==========================================================================

/**
 * Switch scenario analysis between Loan and Investment modes
 */
function setScenarioMode(mode) {
  AppState.scenarioMode = mode;
  AppState.inspectedSensitivityCell = null;

  const btnLoan = document.getElementById('btn-scenario-mode-loan');
  const btnInvest = document.getElementById('btn-scenario-mode-invest');
  const loanInputs = document.getElementById('scenario-loan-inputs');
  const investInputs = document.getElementById('scenario-invest-inputs');
  const loanPresets = document.getElementById('loan-presets-group');
  const investPresets = document.getElementById('invest-presets-group');
  const titleText = document.getElementById('scenario-title-text');
  const descText = document.getElementById('scenario-desc-text');
  const matrixDesc = document.getElementById('matrix-type-desc');
  const thPmt = document.getElementById('th-scenario-pmt');
  const thPrincipal = document.getElementById('th-scenario-principal');
  const thInterest = document.getElementById('th-scenario-interest');
  const thTotal = document.getElementById('th-scenario-total');
  const importLoanBtn = document.getElementById('btn-import-from-loan');
  const importCiBtn = document.getElementById('btn-import-from-ci');
  const inspectBar = document.getElementById('sensitivity-inspect-bar');

  if (inspectBar) inspectBar.style.display = 'none';

  if (mode === 'loan') {
    btnLoan?.classList.add('active');
    btnInvest?.classList.remove('active');
    if (loanInputs) loanInputs.style.display = 'grid';
    if (investInputs) investInputs.style.display = 'none';
    if (loanPresets) loanPresets.style.display = 'flex';
    if (investPresets) investPresets.style.display = 'none';
    if (importLoanBtn) importLoanBtn.style.display = 'inline-flex';
    if (importCiBtn) importCiBtn.style.display = 'none';

    if (titleText) titleText.textContent = 'Loan Scenario & What-If Analysis';
    if (descText) descText.textContent = 'Compare baseline loan repayments against optimistic rate cuts, stressed rate hikes, term extensions, extra prepayments, and custom what-if models.';
    if (matrixDesc) matrixDesc.textContent = 'Monthly Installments and Total Interest';
    if (thPmt) thPmt.textContent = 'Periodic Payment (EMI)';
    if (thPrincipal) thPrincipal.textContent = 'Total Principal';
    if (thInterest) thInterest.textContent = 'Total Interest';
    if (thTotal) thTotal.textContent = 'Total Outflow';
  } else {
    btnInvest?.classList.add('active');
    btnLoan?.classList.remove('active');
    if (loanInputs) loanInputs.style.display = 'none';
    if (investInputs) investInputs.style.display = 'grid';
    if (loanPresets) loanPresets.style.display = 'none';
    if (investPresets) investPresets.style.display = 'flex';
    if (importLoanBtn) importLoanBtn.style.display = 'none';
    if (importCiBtn) importCiBtn.style.display = 'inline-flex';

    if (titleText) titleText.textContent = 'Investment & Wealth Scenario Analysis';
    if (descText) descText.textContent = 'Project potential wealth accumulation across conservative, moderate, and bull market returns, extended horizons, step-up periodic contributions, and custom what-if targets.';
    if (matrixDesc) matrixDesc.textContent = 'Accumulated Future Value and Compound Growth';
    if (thPmt) thPmt.textContent = 'Periodic Deposit';
    if (thPrincipal) thPrincipal.textContent = 'Total Contributions';
    if (thInterest) thInterest.textContent = 'Total Growth (Earned)';
    if (thTotal) thTotal.textContent = 'Accumulated Wealth (FV)';
  }

  runScenarioAnalysis();
}

/**
 * Resets scenario form inputs to default baseline
 */
function resetScenarioForm() {
  const mode = AppState.scenarioMode || 'loan';

  if (mode === 'loan') {
    const elAmt = document.getElementById('sc-loan-amount');
    const elRate = document.getElementById('sc-loan-rate');
    const elTerm = document.getElementById('sc-loan-term');
    const elFreq = document.getElementById('sc-loan-freq');
    const elPrepay = document.getElementById('sc-loan-prepay');
    const elCustRate = document.getElementById('sc-custom-loan-rate');
    const elCustTerm = document.getElementById('sc-custom-loan-term');
    const elCustPrepay = document.getElementById('sc-custom-loan-prepay');

    if (elAmt) elAmt.value = '500000';
    if (elRate) elRate.value = '8.5';
    if (elTerm) elTerm.value = '20';
    if (elFreq) elFreq.value = '12';
    if (elPrepay) elPrepay.value = '0';
    if (elCustRate) elCustRate.value = '';
    if (elCustTerm) elCustTerm.value = '';
    if (elCustPrepay) elCustPrepay.value = '';

    const group = document.getElementById('loan-presets-group');
    group?.querySelectorAll('.preset-chip').forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-preset') === 'default');
    });
    AppState.activeScenarioPreset.loan = 'default';
  } else {
    const elP = document.getElementById('sc-inv-principal');
    const elR = document.getElementById('sc-inv-rate');
    const elT = document.getElementById('sc-inv-term');
    const elDep = document.getElementById('sc-inv-deposit');
    const elFreq = document.getElementById('sc-inv-freq');
    const elCustRate = document.getElementById('sc-custom-inv-rate');
    const elCustTerm = document.getElementById('sc-custom-inv-term');
    const elCustDep = document.getElementById('sc-custom-inv-deposit');

    if (elP) elP.value = '100000';
    if (elR) elR.value = '10';
    if (elT) elT.value = '15';
    if (elDep) elDep.value = '5000';
    if (elFreq) elFreq.value = '12';
    if (elCustRate) elCustRate.value = '';
    if (elCustTerm) elCustTerm.value = '';
    if (elCustDep) elCustDep.value = '';

    const group = document.getElementById('invest-presets-group');
    group?.querySelectorAll('.preset-chip').forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-preset') === 'default');
    });
    AppState.activeScenarioPreset.invest = 'default';
  }

  const inspectBar = document.getElementById('sensitivity-inspect-bar');
  if (inspectBar) inspectBar.style.display = 'none';
  AppState.inspectedSensitivityCell = null;

  runScenarioAnalysis();
  showNotification('Scenario parameters reset to default baseline.', 'info');
}

/**
 * Imports loan data from the Loan tab into scenario inputs
 */
function importFromLoanTab() {
  const loanAmt = document.getElementById('loan-amount')?.value;
  const loanRate = document.getElementById('loan-rate')?.value;
  const loanTerm = document.getElementById('loan-term')?.value;
  const loanFreq = document.getElementById('loan-frequency')?.value;

  if (!loanAmt || !loanRate || !loanTerm) {
    showNotification('Please enter values in the Loan Calculator tab first before importing.', 'warning');
    return;
  }

  const elAmt = document.getElementById('sc-loan-amount');
  const elRate = document.getElementById('sc-loan-rate');
  const elTerm = document.getElementById('sc-loan-term');
  const elFreq = document.getElementById('sc-loan-freq');

  if (elAmt) elAmt.value = loanAmt;
  if (elRate) elRate.value = loanRate;
  if (elTerm) elTerm.value = loanTerm;
  if (elFreq) elFreq.value = loanFreq || '12';

  runScenarioAnalysis();
  showNotification('Loan parameters imported into Scenario Analysis! 📊', 'success');
}

/**
 * Imports investment/compound interest data into scenario inputs
 */
function importFromCITab() {
  const ciP = document.getElementById('ci-principal')?.value;
  const ciR = document.getElementById('ci-rate')?.value;
  const ciT = document.getElementById('ci-time')?.value;
  const ciFreq = document.getElementById('ci-frequency')?.value;
  const fvaPmt = document.getElementById('fva-payment')?.value;

  if (!ciP && !ciR && !ciT && !fvaPmt) {
    showNotification('Please enter values in the Compound Interest or Annuity tab first.', 'warning');
    return;
  }

  const elP = document.getElementById('sc-inv-principal');
  const elR = document.getElementById('sc-inv-rate');
  const elT = document.getElementById('sc-inv-term');
  const elDep = document.getElementById('sc-inv-deposit');
  const elFreq = document.getElementById('sc-inv-freq');

  if (ciP && elP) elP.value = ciP;
  if (ciR && elR) elR.value = ciR;
  if (ciT && elT) elT.value = ciT;
  if (ciFreq && elFreq) elFreq.value = ciFreq;
  if (fvaPmt && elDep) elDep.value = fvaPmt;

  runScenarioAnalysis();
  showNotification('Investment parameters imported into Scenario Analysis! 📈', 'success');
}

/**
 * Navigates to Scenario tab from Loan tab with loan parameters
 */
function gotoScenarioFromLoan() {
  importFromLoanTab();
  setScenarioMode('loan');
  switchTab('scenario');
  const target = document.getElementById('pane-scenario');
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Navigates to Scenario tab from Compound Interest tab with investment parameters
 */
function gotoScenarioFromCI() {
  importFromCITab();
  setScenarioMode('invest');
  switchTab('scenario');
  const target = document.getElementById('pane-scenario');
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Quick presets handler for one-click scenario testing
 */
function applyScenarioPreset(presetKey) {
  const mode = AppState.scenarioMode || 'loan';
  if (!AppState.activeScenarioPreset) {
    AppState.activeScenarioPreset = { loan: 'default', invest: 'default' };
  }
  AppState.activeScenarioPreset[mode] = presetKey;

  // Update visual active chip
  const group = document.getElementById(mode === 'loan' ? 'loan-presets-group' : 'invest-presets-group');
  group?.querySelectorAll('.preset-chip').forEach(c => {
    c.classList.toggle('active', c.getAttribute('data-preset') === presetKey);
  });

  if (mode === 'loan') {
    switch (presetKey) {
      case 'default':
        showNotification('Overview preset active: Displaying Base, Rate Cut, Rate Hike, and Accelerated Term.', 'info');
        break;
      case 'rate-shock':
        showNotification('Rate Shock preset active: Comparing Base vs ±1.0% and ±2.0% APR movements.', 'info');
        break;
      case 'term-comparison':
        showNotification('Term Comparison active: Comparing 15 vs 20 vs 25 vs 30 year payoffs.', 'info');
        break;
      case 'extra-prepay': {
        const elAmt = document.getElementById('sc-loan-amount');
        const elRate = document.getElementById('sc-loan-rate');
        const elTerm = document.getElementById('sc-loan-term');
        const elPrepay = document.getElementById('sc-loan-prepay');
        const principal = parseFloat(elAmt?.value) || 500000;
        const currentRate = parseFloat(elRate?.value) || 8.5;
        const currentTerm = parseFloat(elTerm?.value) || 20;
        const rPer = currentRate / 100 / 12;
        const nPer = currentTerm * 12;
        const estPmt = rPer === 0 ? (principal / nPer) : (principal * rPer) / (1 - Math.pow(1 + rPer, -nPer));
        const prepayAmt = Math.round(estPmt * 0.15);
        if (elPrepay && (!parseFloat(elPrepay.value) || parseFloat(elPrepay.value) <= 0)) {
          elPrepay.value = prepayAmt;
        }
        showNotification(`Extra Prepayment preset active: Testing +10%, +20%, and +30% monthly principal prepayments! 💰`, 'success');
        break;
      }
      case 'shorten-term':
        showNotification('Fast Payoff preset active: Comparing payoffs shortened by 3, 5, and 7 years.', 'info');
        break;
    }
  } else {
    switch (presetKey) {
      case 'default':
        showNotification('Overview preset active: Displaying Expected, Conservative, Bull Market, and Extended Horizon.', 'info');
        break;
      case 'market-returns':
        showNotification('Returns Comparison active: Evaluating Conservative (6%), Balanced (9%), Growth (12%), and High Growth (15%).', 'info');
        break;
      case 'time-horizons':
        showNotification('Time Horizons active: Comparing 5, 10, 15, 20, and 25 year compounding milestones.', 'info');
        break;
      case 'step-up-deposit': {
        const elDep = document.getElementById('sc-inv-deposit');
        if (elDep && (!parseFloat(elDep.value) || parseFloat(elDep.value) <= 0)) {
          elDep.value = '5000';
        }
        showNotification('Higher Deposits active: Comparing +25%, +50%, and +100% monthly contribution increases! 📈', 'success');
        break;
      }
    }
  }

  runScenarioAnalysis();
}

/**
 * Accurate financial calculation for a loan scenario
 */
function calculateScenarioLoanMetrics(principal, annualRate, termYears, frequency = 12, extraPayment = 0) {
  const m = Math.max(1, frequency);
  const periodicRate = (annualRate / 100) / m;
  const basePeriods = Math.max(1, Math.round(termYears * m));

  let scheduledPayment = 0;
  if (periodicRate === 0) {
    scheduledPayment = principal / basePeriods;
  } else {
    scheduledPayment = (principal * periodicRate) / (1 - Math.pow(1 + periodicRate, -basePeriods));
  }

  // If no extra payment, use analytical formulas
  if (extraPayment <= 0) {
    const totalPayments = scheduledPayment * basePeriods;
    const totalInterest = Math.max(0, totalPayments - principal);
    return {
      scheduledPayment,
      actualPayment: scheduledPayment,
      extraPayment: 0,
      totalPayments,
      totalPrincipal: principal,
      totalInterest,
      payoffPeriods: basePeriods,
      payoffYears: termYears,
      monthsSaved: 0,
      interestSaved: 0
    };
  }

  // Simulate amortization period-by-period when extra prepayment is present
  let balance = principal;
  let totalInterest = 0;
  let actualPeriods = 0;
  const maxPeriods = basePeriods * 2;
  const totalPeriodicPayment = scheduledPayment + extraPayment;

  while (balance > 0.005 && actualPeriods < maxPeriods) {
    actualPeriods++;
    const interest = balance * periodicRate;
    totalInterest += interest;
    let principalPaid = totalPeriodicPayment - interest;
    if (principalPaid > balance) {
      principalPaid = balance;
    }
    balance -= principalPaid;
  }

  const baseTotalPayments = scheduledPayment * basePeriods;
  const baseTotalInterest = Math.max(0, baseTotalPayments - principal);
  const actualTotalPayments = principal + totalInterest;
  const interestSaved = Math.max(0, baseTotalInterest - totalInterest);
  const periodsSaved = Math.max(0, basePeriods - actualPeriods);
  const monthsSaved = Math.round((periodsSaved / m) * 12);

  return {
    scheduledPayment,
    actualPayment: totalPeriodicPayment,
    extraPayment,
    totalPayments: actualTotalPayments,
    totalPrincipal: principal,
    totalInterest,
    payoffPeriods: actualPeriods,
    payoffYears: +(actualPeriods / m).toFixed(1),
    monthsSaved,
    interestSaved
  };
}

/**
 * Accurate financial calculation for an investment scenario
 */
function calculateScenarioInvestMetrics(initialPrincipal, annualRate, termYears, periodicContribution = 0, frequency = 12) {
  const m = Math.max(1, frequency);
  const r = (annualRate / 100) / m;
  const n = Math.max(1, Math.round(termYears * m));

  // Lump sum FV
  let fvLump = 0;
  if (r === 0) {
    fvLump = initialPrincipal;
  } else {
    fvLump = initialPrincipal * Math.pow(1 + r, n);
  }

  // Periodic contribution FV (ordinary annuity)
  let fvAnnuity = 0;
  if (periodicContribution > 0) {
    if (r === 0) {
      fvAnnuity = periodicContribution * n;
    } else {
      fvAnnuity = periodicContribution * ((Math.pow(1 + r, n) - 1) / r);
    }
  }

  const totalFV = fvLump + fvAnnuity;
  const totalPrincipal = initialPrincipal + (periodicContribution * n);
  const totalGrowth = Math.max(0, totalFV - totalPrincipal);

  return {
    futureValue: totalFV,
    totalPrincipal,
    totalGrowth,
    periodicContribution,
    totalPeriods: n,
    termYears
  };
}

/**
 * Main execution engine for Scenario & Sensitivity Analysis
 */
function runScenarioAnalysis(options = {}) {
  const mode = AppState.scenarioMode || 'loan';

  // Helper to safely parse inputs without falsy-zero bugs
  const parseNum = (id, fallback) => {
    const el = document.getElementById(id);
    if (!el) return fallback;
    const val = el.value.trim();
    if (val === '') return fallback;
    const n = parseFloat(val);
    return isNaN(n) ? fallback : n;
  };

  const preset = (AppState.activeScenarioPreset && AppState.activeScenarioPreset[mode]) || 'default';

  if (mode === 'loan') {
    const principal = Math.max(1, parseNum('sc-loan-amount', 500000));
    const annualRate = Math.max(0, parseNum('sc-loan-rate', 8.5));
    const termYears = Math.max(0.1, parseNum('sc-loan-term', 20));
    const freq = parseInt(document.getElementById('sc-loan-freq')?.value, 10) || 12;
    const extraPrepay = Math.max(0, parseNum('sc-loan-prepay', 0));

    // Custom What-If Inputs
    const customRate = parseNum('sc-custom-loan-rate', null);
    const customTerm = parseNum('sc-custom-loan-term', null);
    const customPrepay = parseNum('sc-custom-loan-prepay', null);

    // Baseline calculation
    const base = calculateScenarioLoanMetrics(principal, annualRate, termYears, freq, 0);

    const scenarios = [];

    // 1. Always include Base Case
    scenarios.push({
      id: 'base',
      name: 'Base Case (Current)',
      badgeClass: 'badge-base',
      cardClass: 'card-base',
      badgeText: 'Baseline',
      rate: annualRate,
      term: termYears,
      extra: 0,
      metrics: base,
      deltaPmt: 0,
      deltaInterest: 0,
      isBase: true
    });

    if (preset === 'rate-shock') {
      // Rate Shock Scenarios: -2%, -1%, +1%, +2%
      const cut2 = Math.max(0.1, +(annualRate - 2.0).toFixed(2));
      const cut1 = Math.max(0.1, +(annualRate - 1.0).toFixed(2));
      const hike1 = +(annualRate + 1.0).toFixed(2);
      const hike2 = +(annualRate + 2.0).toFixed(2);

      const mCut2 = calculateScenarioLoanMetrics(principal, cut2, termYears, freq, extraPrepay);
      scenarios.push({
        id: 'cut-2',
        name: 'Major Rate Cut (-2.0%)',
        badgeClass: 'badge-optimistic',
        cardClass: 'card-optimistic',
        badgeText: '-2.0% APR',
        rate: cut2,
        term: termYears,
        extra: extraPrepay,
        metrics: mCut2,
        deltaPmt: mCut2.actualPayment - base.actualPayment,
        deltaInterest: mCut2.totalInterest - base.totalInterest,
        isBase: false
      });

      const mCut1 = calculateScenarioLoanMetrics(principal, cut1, termYears, freq, extraPrepay);
      scenarios.push({
        id: 'cut-1',
        name: 'Mild Rate Cut (-1.0%)',
        badgeClass: 'badge-optimistic',
        cardClass: 'card-optimistic',
        badgeText: '-1.0% APR',
        rate: cut1,
        term: termYears,
        extra: extraPrepay,
        metrics: mCut1,
        deltaPmt: mCut1.actualPayment - base.actualPayment,
        deltaInterest: mCut1.totalInterest - base.totalInterest,
        isBase: false
      });

      const mHike1 = calculateScenarioLoanMetrics(principal, hike1, termYears, freq, extraPrepay);
      scenarios.push({
        id: 'hike-1',
        name: 'Mild Rate Hike (+1.0%)',
        badgeClass: 'badge-pessimistic',
        cardClass: 'card-pessimistic',
        badgeText: '+1.0% APR',
        rate: hike1,
        term: termYears,
        extra: extraPrepay,
        metrics: mHike1,
        deltaPmt: mHike1.actualPayment - base.actualPayment,
        deltaInterest: mHike1.totalInterest - base.totalInterest,
        isBase: false
      });

      const mHike2 = calculateScenarioLoanMetrics(principal, hike2, termYears, freq, extraPrepay);
      scenarios.push({
        id: 'hike-2',
        name: 'Severe Rate Hike (+2.0%)',
        badgeClass: 'badge-pessimistic',
        cardClass: 'card-pessimistic',
        badgeText: '+2.0% APR',
        rate: hike2,
        term: termYears,
        extra: extraPrepay,
        metrics: mHike2,
        deltaPmt: mHike2.actualPayment - base.actualPayment,
        deltaInterest: mHike2.totalInterest - base.totalInterest,
        isBase: false
      });

    } else if (preset === 'term-comparison') {
      // Term Comparison: 15 vs 20 vs 25 vs 30 Yrs
      const termsList = [15, 20, 25, 30].filter(t => t !== Math.round(termYears));
      termsList.forEach(t => {
        const mTerm = calculateScenarioLoanMetrics(principal, annualRate, t, freq, extraPrepay);
        scenarios.push({
          id: `term-${t}`,
          name: `${t}-Year Term Payoff`,
          badgeClass: t < termYears ? 'badge-optimistic' : 'badge-custom',
          cardClass: t < termYears ? 'card-optimistic' : 'card-custom',
          badgeText: `${t} Years`,
          rate: annualRate,
          term: t,
          extra: extraPrepay,
          metrics: mTerm,
          deltaPmt: mTerm.actualPayment - base.actualPayment,
          deltaInterest: mTerm.totalInterest - base.totalInterest,
          isBase: false
        });
      });

    } else if (preset === 'extra-prepay') {
      // Extra Prepayment Comparison (+10%, +20%, +30% of scheduled payment)
      const pmt = base.scheduledPayment;
      const steps = [
        { label: '+10% Extra Prepayment', amt: Math.round(pmt * 0.1) },
        { label: '+20% Extra Prepayment', amt: Math.round(pmt * 0.2) },
        { label: '+30% Extra Prepayment', amt: Math.round(pmt * 0.3) }
      ];

      steps.forEach((step, idx) => {
        const mPre = calculateScenarioLoanMetrics(principal, annualRate, termYears, freq, step.amt);
        scenarios.push({
          id: `prepay-step-${idx}`,
          name: step.label,
          badgeClass: 'badge-optimistic',
          cardClass: 'card-optimistic',
          badgeText: `+${formatCurrency(step.amt)}/mo`,
          rate: annualRate,
          term: termYears,
          extra: step.amt,
          metrics: mPre,
          deltaPmt: mPre.actualPayment - base.actualPayment,
          deltaInterest: mPre.totalInterest - base.totalInterest,
          isBase: false
        });
      });

    } else if (preset === 'shorten-term') {
      // Fast Payoff: Shorten term by 3, 5, and 7 years
      const deltas = [3, 5, 7];
      deltas.forEach(d => {
        const newT = Math.max(1, +(termYears - d).toFixed(1));
        if (newT < termYears) {
          const mFast = calculateScenarioLoanMetrics(principal, annualRate, newT, freq, extraPrepay);
          scenarios.push({
            id: `fast-${d}`,
            name: `Payoff ${d} Years Sooner`,
            badgeClass: 'badge-optimistic',
            cardClass: 'card-optimistic',
            badgeText: `${newT} Yr Term`,
            rate: annualRate,
            term: newT,
            extra: extraPrepay,
            metrics: mFast,
            deltaPmt: mFast.actualPayment - base.actualPayment,
            deltaInterest: mFast.totalInterest - base.totalInterest,
            isBase: false
          });
        }
      });

    } else {
      // Default All-Round Overview
      // 2. Favorable / Rate Cut (-1.0%)
      const rateCut = Math.max(0.1, +(annualRate - 1.0).toFixed(2));
      const optimisticMetrics = calculateScenarioLoanMetrics(principal, rateCut, termYears, freq, extraPrepay);
      scenarios.push({
        id: 'optimistic',
        name: 'Optimistic (Rate Cut -1.0%)',
        badgeClass: 'badge-optimistic',
        cardClass: 'card-optimistic',
        badgeText: '-1.0% APR Cut',
        rate: rateCut,
        term: termYears,
        extra: extraPrepay,
        metrics: optimisticMetrics,
        deltaPmt: optimisticMetrics.actualPayment - base.actualPayment,
        deltaInterest: optimisticMetrics.totalInterest - base.totalInterest,
        isBase: false
      });

      // 3. Stressed / Rate Hike (+1.5%)
      const rateHike = +(annualRate + 1.5).toFixed(2);
      const pessimisticMetrics = calculateScenarioLoanMetrics(principal, rateHike, termYears, freq, 0);
      scenarios.push({
        id: 'pessimistic',
        name: 'Stressed (Rate Hike +1.5%)',
        badgeClass: 'badge-pessimistic',
        cardClass: 'card-pessimistic',
        badgeText: '+1.5% APR Hike',
        rate: rateHike,
        term: termYears,
        extra: 0,
        metrics: pessimisticMetrics,
        deltaPmt: pessimisticMetrics.actualPayment - base.actualPayment,
        deltaInterest: pessimisticMetrics.totalInterest - base.totalInterest,
        isBase: false
      });

      // 4. Shorter Term Alternative (Fast Payoff)
      const shorterTerm = termYears > 15 ? 15 : Math.max(3, +(termYears * 0.75).toFixed(1));
      const shorterMetrics = calculateScenarioLoanMetrics(principal, annualRate, shorterTerm, freq, 0);
      scenarios.push({
        id: 'short-term',
        name: `Accelerated Term (${shorterTerm} Yrs)`,
        badgeClass: 'badge-custom',
        cardClass: 'card-custom',
        badgeText: `${shorterTerm} Yr Term`,
        rate: annualRate,
        term: shorterTerm,
        extra: 0,
        metrics: shorterMetrics,
        deltaPmt: shorterMetrics.actualPayment - base.actualPayment,
        deltaInterest: shorterMetrics.totalInterest - base.totalInterest,
        isBase: false
      });

      // 5. Prepayment Scenario (if extra prepay is specified)
      if (extraPrepay > 0) {
        const prepayMetrics = calculateScenarioLoanMetrics(principal, annualRate, termYears, freq, extraPrepay);
        scenarios.push({
          id: 'prepay',
          name: `Prepayment (+${formatCurrency(extraPrepay)}/mo)`,
          badgeClass: 'badge-optimistic',
          cardClass: 'card-optimistic',
          badgeText: 'Extra Prepay',
          rate: annualRate,
          term: termYears,
          extra: extraPrepay,
          metrics: prepayMetrics,
          deltaPmt: prepayMetrics.actualPayment - base.actualPayment,
          deltaInterest: prepayMetrics.totalInterest - base.totalInterest,
          isBase: false
        });
      }
    }

    // Check if Custom What-If Model is entered
    if (customRate !== null || customTerm !== null || customPrepay !== null) {
      const cRate = customRate !== null ? Math.max(0, customRate) : annualRate;
      const cTerm = customTerm !== null ? Math.max(0.1, customTerm) : termYears;
      const cPrepay = customPrepay !== null ? Math.max(0, customPrepay) : extraPrepay;
      const cMetrics = calculateScenarioLoanMetrics(principal, cRate, cTerm, freq, cPrepay);

      scenarios.push({
        id: 'custom-user',
        name: '🎯 Custom What-If Model',
        badgeClass: 'badge-custom',
        cardClass: 'card-custom',
        badgeText: 'Custom Target',
        rate: cRate,
        term: cTerm,
        extra: cPrepay,
        metrics: cMetrics,
        deltaPmt: cMetrics.actualPayment - base.actualPayment,
        deltaInterest: cMetrics.totalInterest - base.totalInterest,
        isBase: false,
        isCustom: true
      });
    }

    AppState.lastScenarioData = { mode: 'loan', scenarios, principal, annualRate, termYears, freq, base };

    // Render Cards and Table
    renderScenarioCards(scenarios, 'loan');
    renderScenarioTable(scenarios, 'loan');

    // Generate 2D Sensitivity Matrix
    const sensitivityData = generateLoanSensitivityMatrix(principal, annualRate, termYears, freq);
    AppState.lastSensitivityData = sensitivityData;
    renderSensitivityMatrix(sensitivityData, 'loan');

  } else {
    // ================= INVESTMENT MODE =================
    const principal = Math.max(0, parseNum('sc-inv-principal', 100000));
    const returnRate = Math.max(0, parseNum('sc-inv-rate', 10));
    const horizonYears = Math.max(0.1, parseNum('sc-inv-term', 15));
    const contribution = Math.max(0, parseNum('sc-inv-deposit', 5000));
    const freq = parseInt(document.getElementById('sc-inv-freq')?.value, 10) || 12;

    // Custom What-If Inputs
    const customRate = parseNum('sc-custom-inv-rate', null);
    const customHorizon = parseNum('sc-custom-inv-term', null);
    const customDeposit = parseNum('sc-custom-inv-deposit', null);

    const base = calculateScenarioInvestMetrics(principal, returnRate, horizonYears, contribution, freq);

    const scenarios = [];

    // 1. Base Case
    scenarios.push({
      id: 'base',
      name: 'Base Case (Expected)',
      badgeClass: 'badge-base',
      cardClass: 'card-base',
      badgeText: 'Baseline',
      rate: returnRate,
      term: horizonYears,
      deposit: contribution,
      metrics: base,
      deltaFV: 0,
      isBase: true
    });

    if (preset === 'market-returns') {
      // Returns Comparison: Conservative 6%, Balanced 9%, Growth 12%, High Growth 15%
      const testRates = [6, 9, 12, 15];
      testRates.forEach(r => {
        const mRet = calculateScenarioInvestMetrics(principal, r, horizonYears, contribution, freq);
        scenarios.push({
          id: `rate-${r}`,
          name: `${r}% Annual Return`,
          badgeClass: r >= returnRate ? 'badge-optimistic' : 'badge-pessimistic',
          cardClass: r >= returnRate ? 'card-optimistic' : 'card-pessimistic',
          badgeText: `${r}% p.a.`,
          rate: r,
          term: horizonYears,
          deposit: contribution,
          metrics: mRet,
          deltaFV: mRet.futureValue - base.futureValue,
          isBase: false
        });
      });

    } else if (preset === 'time-horizons') {
      // Time Horizons: 5, 10, 15, 20, 25 Years
      const testHorizons = [5, 10, 15, 20, 25].filter(h => h !== Math.round(horizonYears));
      testHorizons.forEach(h => {
        const mHor = calculateScenarioInvestMetrics(principal, returnRate, h, contribution, freq);
        scenarios.push({
          id: `horizon-${h}`,
          name: `${h}-Year Milestone`,
          badgeClass: h > horizonYears ? 'badge-optimistic' : 'badge-custom',
          cardClass: h > horizonYears ? 'card-optimistic' : 'card-custom',
          badgeText: `${h} Yrs`,
          rate: returnRate,
          term: h,
          deposit: contribution,
          metrics: mHor,
          deltaFV: mHor.futureValue - base.futureValue,
          isBase: false
        });
      });

    } else if (preset === 'step-up-deposit') {
      // Step-up Contributions (+25%, +50%, +100%)
      const baseDep = contribution > 0 ? contribution : 5000;
      const stepRatios = [
        { label: '+25% Step-up Deposit', val: Math.round(baseDep * 1.25) },
        { label: '+50% Step-up Deposit', val: Math.round(baseDep * 1.5) },
        { label: '+100% Double Deposit', val: Math.round(baseDep * 2.0) }
      ];

      stepRatios.forEach((s, idx) => {
        const mStep = calculateScenarioInvestMetrics(principal, returnRate, horizonYears, s.val, freq);
        scenarios.push({
          id: `step-${idx}`,
          name: s.label,
          badgeClass: 'badge-optimistic',
          cardClass: 'card-optimistic',
          badgeText: `+${formatCurrency(s.val - baseDep)}/mo`,
          rate: returnRate,
          term: horizonYears,
          deposit: s.val,
          metrics: mStep,
          deltaFV: mStep.futureValue - base.futureValue,
          isBase: false
        });
      });

    } else {
      // Default Investment Overview
      // 2. Conservative Market (-3.0%)
      const rateCons = Math.max(0, +(returnRate - 3.0).toFixed(2));
      const consMetrics = calculateScenarioInvestMetrics(principal, rateCons, horizonYears, contribution, freq);
      scenarios.push({
        id: 'conservative',
        name: 'Conservative Market (-3.0%)',
        badgeClass: 'badge-pessimistic',
        cardClass: 'card-pessimistic',
        badgeText: `${rateCons}% Return`,
        rate: rateCons,
        term: horizonYears,
        deposit: contribution,
        metrics: consMetrics,
        deltaFV: consMetrics.futureValue - base.futureValue,
        isBase: false
      });

      // 3. High Growth / Bull Market (+3.0%)
      const rateBull = +(returnRate + 3.0).toFixed(2);
      const bullMetrics = calculateScenarioInvestMetrics(principal, rateBull, horizonYears, contribution, freq);
      scenarios.push({
        id: 'bull',
        name: 'High Growth Bull (+3.0%)',
        badgeClass: 'badge-optimistic',
        cardClass: 'card-optimistic',
        badgeText: `${rateBull}% Return`,
        rate: rateBull,
        term: horizonYears,
        deposit: contribution,
        metrics: bullMetrics,
        deltaFV: bullMetrics.futureValue - base.futureValue,
        isBase: false
      });

      // 4. Extended Horizon (+5 Years)
      const extTerm = +(horizonYears + 5).toFixed(1);
      const extMetrics = calculateScenarioInvestMetrics(principal, returnRate, extTerm, contribution, freq);
      scenarios.push({
        id: 'extended',
        name: `Extended Horizon (+5 Yrs)`,
        badgeClass: 'badge-custom',
        cardClass: 'card-custom',
        badgeText: `${extTerm} Yrs`,
        rate: returnRate,
        term: extTerm,
        deposit: contribution,
        metrics: extMetrics,
        deltaFV: extMetrics.futureValue - base.futureValue,
        isBase: false
      });

      // 5. Step-up Contribution (+50%)
      if (contribution > 0) {
        const stepDeposit = Math.round(contribution * 1.5);
        const stepMetrics = calculateScenarioInvestMetrics(principal, returnRate, horizonYears, stepDeposit, freq);
        scenarios.push({
          id: 'step-up',
          name: `Boosted Deposits (+50%)`,
          badgeClass: 'badge-optimistic',
          cardClass: 'card-optimistic',
          badgeText: `+50% PMT`,
          rate: returnRate,
          term: horizonYears,
          deposit: stepDeposit,
          metrics: stepMetrics,
          deltaFV: stepMetrics.futureValue - base.futureValue,
          isBase: false
        });
      }
    }

    // Custom What-If Model for Investment
    if (customRate !== null || customHorizon !== null || customDeposit !== null) {
      const cRate = customRate !== null ? Math.max(0, customRate) : returnRate;
      const cTerm = customHorizon !== null ? Math.max(0.1, customHorizon) : horizonYears;
      const cDep = customDeposit !== null ? Math.max(0, customDeposit) : contribution;
      const cMetrics = calculateScenarioInvestMetrics(principal, cRate, cTerm, cDep, freq);

      scenarios.push({
        id: 'custom-inv-user',
        name: '🎯 Custom What-If Model',
        badgeClass: 'badge-custom',
        cardClass: 'card-custom',
        badgeText: 'Custom Target',
        rate: cRate,
        term: cTerm,
        deposit: cDep,
        metrics: cMetrics,
        deltaFV: cMetrics.futureValue - base.futureValue,
        isBase: false,
        isCustom: true
      });
    }

    AppState.lastScenarioData = { mode: 'invest', scenarios, principal, returnRate, horizonYears, contribution, freq, base };

    renderScenarioCards(scenarios, 'invest');
    renderScenarioTable(scenarios, 'invest');

    const sensitivityData = generateInvestSensitivityMatrix(principal, returnRate, horizonYears, contribution, freq);
    AppState.lastSensitivityData = sensitivityData;
    renderSensitivityMatrix(sensitivityData, 'invest');
  }
}

/**
 * Renders side-by-side scenario comparison cards
 */
function renderScenarioCards(scenarios, mode) {
  const container = document.getElementById('scenario-cards-container');
  if (!container) return;

  container.innerHTML = '';

  scenarios.forEach(sc => {
    const card = document.createElement('div');
    card.className = `scenario-card ${sc.cardClass}`;

    if (mode === 'loan') {
      const m = sc.metrics;
      const isBase = sc.isBase;
      let deltaBoxHtml = '';

      if (isBase) {
        deltaBoxHtml = `
          <div class="scenario-delta-box delta-neutral">
            <span>Reference Baseline</span>
            <span>Standard Payoff</span>
          </div>
        `;
      } else {
        const intDiff = sc.deltaInterest;
        const isSaving = intDiff < 0;
        const absDiff = Math.abs(intDiff);
        const percent = sc.metrics.totalInterest > 0 || sc.deltaInterest !== 0 
          ? Math.abs(Math.round((intDiff / (sc.isBase ? 1 : (sc.deltaInterest + sc.metrics.totalInterest || 1))) * 100)) 
          : 0;

        if (isSaving) {
          deltaBoxHtml = `
            <div class="scenario-delta-box delta-positive">
              <span>Saves ${formatCurrency(absDiff)}</span>
              <span>${m.monthsSaved > 0 ? `${m.payoffYears} yrs payoff` : `-${percent}% interest`}</span>
            </div>
          `;
        } else {
          deltaBoxHtml = `
            <div class="scenario-delta-box delta-negative">
              <span>Cost +${formatCurrency(absDiff)}</span>
              <span>+${percent}% interest</span>
            </div>
          `;
        }
      }

      card.innerHTML = `
        <div class="scenario-card-header">
          <div class="scenario-card-title">${escapeHtml(sc.name)}</div>
          <span class="scenario-badge ${sc.badgeClass}">${escapeHtml(sc.badgeText)}</span>
        </div>

        <div class="scenario-metric-box">
          <div class="scenario-metric-label">Monthly Installment (EMI)</div>
          <div class="scenario-metric-value">${formatCurrency(m.actualPayment)}</div>
        </div>

        ${deltaBoxHtml}

        <div class="scenario-props-list">
          <div class="scenario-prop-row">
            <span class="scenario-prop-label">Interest Rate:</span>
            <span class="scenario-prop-val">${sc.rate}% APR</span>
          </div>
          <div class="scenario-prop-row">
            <span class="scenario-prop-label">Payoff Horizon:</span>
            <span class="scenario-prop-val">${m.payoffYears} years (${m.payoffPeriods} pmts)</span>
          </div>
          <div class="scenario-prop-row">
            <span class="scenario-prop-label">Total Interest:</span>
            <span class="scenario-prop-val" style="color: var(--color-warning); font-weight: 700;">${formatCurrency(m.totalInterest)}</span>
          </div>
          <div class="scenario-prop-row">
            <span class="scenario-prop-label">Total Outflow:</span>
            <span class="scenario-prop-val">${formatCurrency(m.totalPayments)}</span>
          </div>
        </div>
      `;
    } else {
      // Investment Mode Card
      const m = sc.metrics;
      const isBase = sc.isBase;
      let deltaBoxHtml = '';

      if (isBase) {
        deltaBoxHtml = `
          <div class="scenario-delta-box delta-neutral">
            <span>Reference Baseline</span>
            <span>Target Goal</span>
          </div>
        `;
      } else {
        const fvDiff = sc.deltaFV;
        const isGain = fvDiff > 0;
        const absDiff = Math.abs(fvDiff);

        if (isGain) {
          deltaBoxHtml = `
            <div class="scenario-delta-box delta-positive">
              <span>+${formatCurrency(absDiff)} Wealth</span>
              <span>Higher Return / Savings</span>
            </div>
          `;
        } else {
          deltaBoxHtml = `
            <div class="scenario-delta-box delta-negative">
              <span>-${formatCurrency(absDiff)} Wealth</span>
              <span>Conservative</span>
            </div>
          `;
        }
      }

      card.innerHTML = `
        <div class="scenario-card-header">
          <div class="scenario-card-title">${escapeHtml(sc.name)}</div>
          <span class="scenario-badge ${sc.badgeClass}">${escapeHtml(sc.badgeText)}</span>
        </div>

        <div class="scenario-metric-box">
          <div class="scenario-metric-label">Accumulated Wealth (FV)</div>
          <div class="scenario-metric-value" style="color: var(--color-primary);">${formatCurrency(m.futureValue)}</div>
        </div>

        ${deltaBoxHtml}

        <div class="scenario-props-list">
          <div class="scenario-prop-row">
            <span class="scenario-prop-label">Annual Return:</span>
            <span class="scenario-prop-val">${sc.rate}% p.a.</span>
          </div>
          <div class="scenario-prop-row">
            <span class="scenario-prop-label">Time Horizon:</span>
            <span class="scenario-prop-val">${sc.term} years</span>
          </div>
          <div class="scenario-prop-row">
            <span class="scenario-prop-label">Total Contributions:</span>
            <span class="scenario-prop-val">${formatCurrency(m.totalPrincipal)}</span>
          </div>
          <div class="scenario-prop-row">
            <span class="scenario-prop-label">Compound Growth:</span>
            <span class="scenario-prop-val" style="color: var(--color-success); font-weight: 700;">+${formatCurrency(m.totalGrowth)}</span>
          </div>
        </div>
      `;
    }

    container.appendChild(card);
  });
}

/**
 * Renders the detailed scenario comparison table
 */
function renderScenarioTable(scenarios, mode) {
  const tbody = document.getElementById('scenario-comparison-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  scenarios.forEach(sc => {
    const tr = document.createElement('tr');
    if (sc.isBase) {
      tr.style.background = 'var(--color-primary-light)';
      tr.style.fontWeight = '600';
    } else if (sc.isCustom) {
      tr.style.background = 'var(--bg-surface-subtle)';
      tr.style.borderLeft = '4px solid var(--color-primary)';
    }

    if (mode === 'loan') {
      const m = sc.metrics;
      let varianceHtml = '';
      if (sc.isBase) {
        varianceHtml = '<span style="color: var(--text-muted);">Baseline (0.00)</span>';
      } else {
        const intDiff = sc.deltaInterest;
        if (intDiff < 0) {
          varianceHtml = `<span style="color: var(--color-success); font-weight: 700;">-${formatCurrency(Math.abs(intDiff))}</span>`;
        } else {
          varianceHtml = `<span style="color: var(--color-warning); font-weight: 700;">+${formatCurrency(intDiff)}</span>`;
        }
      }

      tr.innerHTML = `
        <td style="text-align: left;">
          <strong>${escapeHtml(sc.name)}</strong>
          ${sc.extra > 0 ? `<br><small style="color:var(--text-muted);">+${formatCurrency(sc.extra)}/mo prepay</small>` : ''}
        </td>
        <td>${sc.rate}%</td>
        <td>${m.payoffYears} yrs</td>
        <td style="font-family: var(--font-mono); font-weight: 700;">${formatCurrency(m.actualPayment)}</td>
        <td style="font-family: var(--font-mono);">${formatCurrency(m.totalPrincipal)}</td>
        <td style="font-family: var(--font-mono); color: var(--color-warning); font-weight: 600;">${formatCurrency(m.totalInterest)}</td>
        <td style="font-family: var(--font-mono);">${formatCurrency(m.totalPayments)}</td>
        <td style="font-family: var(--font-mono);">${varianceHtml}</td>
      `;
    } else {
      const m = sc.metrics;
      let varianceHtml = '';
      if (sc.isBase) {
        varianceHtml = '<span style="color: var(--text-muted);">Baseline (0.00)</span>';
      } else {
        const fvDiff = sc.deltaFV;
        if (fvDiff > 0) {
          varianceHtml = `<span style="color: var(--color-success); font-weight: 700;">+${formatCurrency(fvDiff)}</span>`;
        } else {
          varianceHtml = `<span style="color: var(--color-warning); font-weight: 700;">-${formatCurrency(Math.abs(fvDiff))}</span>`;
        }
      }

      tr.innerHTML = `
        <td style="text-align: left;">
          <strong>${escapeHtml(sc.name)}</strong>
          ${sc.deposit > 0 ? `<br><small style="color:var(--text-muted);">${formatCurrency(sc.deposit)}/mo deposit</small>` : ''}
        </td>
        <td>${sc.rate}%</td>
        <td>${sc.term} yrs</td>
        <td style="font-family: var(--font-mono); font-weight: 700;">${formatCurrency(sc.deposit || 0)}</td>
        <td style="font-family: var(--font-mono);">${formatCurrency(m.totalPrincipal)}</td>
        <td style="font-family: var(--font-mono); color: var(--color-success); font-weight: 700;">+${formatCurrency(m.totalGrowth)}</td>
        <td style="font-family: var(--font-mono); font-weight: 700; color: var(--color-primary);">${formatCurrency(m.futureValue)}</td>
        <td style="font-family: var(--font-mono);">${varianceHtml}</td>
      `;
    }

    tbody.appendChild(tr);
  });
}

/**
 * Generates 2D Sensitivity Matrix for Loans (Rates vs Terms)
 */
function generateLoanSensitivityMatrix(principal, baseRate, baseTerm, freq = 12) {
  const bT = Math.max(1, Math.round(baseTerm));
  let terms = [10, 15, 20, 25, 30];
  if (!terms.includes(bT)) {
    terms.push(bT);
    terms.sort((a, b) => a - b);
    if (terms.length > 6) {
      terms.sort((a, b) => Math.abs(a - bT) - Math.abs(b - bT));
      terms = terms.slice(0, 6).sort((a, b) => a - b);
    }
  }

  // Rate steps (-2%, -1%, Base, +1%, +2%)
  const rates = [
    Math.max(0.5, +(baseRate - 2.0).toFixed(2)),
    Math.max(0.5, +(baseRate - 1.0).toFixed(2)),
    baseRate,
    +(baseRate + 1.0).toFixed(2),
    +(baseRate + 2.0).toFixed(2)
  ].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);

  const matrix = [];
  let minInterest = Infinity;
  let maxInterest = -Infinity;

  rates.forEach(r => {
    const row = { rate: r, cells: [] };
    terms.forEach(t => {
      const metrics = calculateScenarioLoanMetrics(principal, r, t, freq, 0);
      if (metrics.totalInterest < minInterest) minInterest = metrics.totalInterest;
      if (metrics.totalInterest > maxInterest) maxInterest = metrics.totalInterest;
      row.cells.push({
        term: t,
        rate: r,
        payment: metrics.scheduledPayment,
        totalInterest: metrics.totalInterest,
        isBase: (Math.abs(r - baseRate) < 0.05 && Math.abs(t - baseTerm) < 0.5)
      });
    });
    matrix.push(row);
  });

  return { type: 'loan', terms, rates, matrix, minInterest, maxInterest, baseRate, baseTerm };
}

/**
 * Generates 2D Sensitivity Matrix for Investments (Rates vs Horizons)
 */
function generateInvestSensitivityMatrix(principal, baseRate, baseTerm, contribution = 0, freq = 12) {
  const bH = Math.max(1, Math.round(baseTerm));
  let horizons = [5, 10, 15, 20, 25];
  if (!horizons.includes(bH)) {
    horizons.push(bH);
    horizons.sort((a, b) => a - b);
    if (horizons.length > 6) {
      horizons.sort((a, b) => Math.abs(a - bH) - Math.abs(b - bH));
      horizons = horizons.slice(0, 6).sort((a, b) => a - b);
    }
  }

  const rates = [
    Math.max(1, +(baseRate - 3.0).toFixed(2)),
    Math.max(1, +(baseRate - 1.5).toFixed(2)),
    baseRate,
    +(baseRate + 1.5).toFixed(2),
    +(baseRate + 3.0).toFixed(2)
  ].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);

  const matrix = [];
  let maxFV = -Infinity;

  rates.forEach(r => {
    const row = { rate: r, cells: [] };
    horizons.forEach(h => {
      const metrics = calculateScenarioInvestMetrics(principal, r, h, contribution, freq);
      if (metrics.futureValue > maxFV) maxFV = metrics.futureValue;
      row.cells.push({
        horizon: h,
        rate: r,
        futureValue: metrics.futureValue,
        growth: metrics.totalGrowth,
        isBase: (Math.abs(r - baseRate) < 0.05 && Math.abs(h - baseTerm) < 0.5)
      });
    });
    matrix.push(row);
  });

  return { type: 'invest', horizons, rates, matrix, maxFV, baseRate, baseTerm };
}

/**
 * Renders the 2D Sensitivity Matrix heatmap table with interactive click inspection
 */
function renderSensitivityMatrix(data, mode) {
  const thead = document.getElementById('sensitivity-thead');
  const tbody = document.getElementById('sensitivity-tbody');
  if (!thead || !tbody) return;

  thead.innerHTML = '';
  tbody.innerHTML = '';

  if (mode === 'loan') {
    // Header Row
    const trHead = document.createElement('tr');
    trHead.innerHTML = `<th style="text-align: left;">Rate \\ Term</th>` + 
      data.terms.map(t => `<th>${t} Years</th>`).join('');
    thead.appendChild(trHead);

    // Data Rows
    data.matrix.forEach(row => {
      const tr = document.createElement('tr');
      let rowHtml = `<td style="font-weight: 700; text-align: left;">${row.rate}% APR</td>`;

      row.cells.forEach(cell => {
        let cellClass = 'sensitivity-cell';
        if (cell.isBase) {
          cellClass += ' cell-base';
        } else if (cell.totalInterest === data.minInterest) {
          cellClass += ' cell-best';
        } else if (cell.totalInterest === data.maxInterest) {
          cellClass += ' cell-worst';
        }

        rowHtml += `
          <td>
            <div class="${cellClass}" data-term="${cell.term}" data-rate="${row.rate}" data-payment="${cell.payment}" data-interest="${cell.totalInterest}" title="Click to inspect: Term ${cell.term} yrs | Rate ${row.rate}% | Int ${formatCurrency(cell.totalInterest)}">
              <span class="sensitivity-cell-pmt">${formatCurrency(cell.payment)}/mo</span>
              <span class="sensitivity-cell-sub">Int: ${formatCurrency(cell.totalInterest)}</span>
            </div>
          </td>
        `;
      });

      tr.innerHTML = rowHtml;
      tbody.appendChild(tr);
    });
  } else {
    // Investment Matrix Header
    const trHead = document.createElement('tr');
    trHead.innerHTML = `<th style="text-align: left;">Return \\ Horizon</th>` + 
      data.horizons.map(h => `<th>${h} Years</th>`).join('');
    thead.appendChild(trHead);

    data.matrix.forEach(row => {
      const tr = document.createElement('tr');
      let rowHtml = `<td style="font-weight: 700; text-align: left;">${row.rate}% p.a.</td>`;

      row.cells.forEach(cell => {
        let cellClass = 'sensitivity-cell';
        if (cell.isBase) {
          cellClass += ' cell-base';
        } else if (cell.futureValue === data.maxFV) {
          cellClass += ' cell-best';
        }

        rowHtml += `
          <td>
            <div class="${cellClass}" data-horizon="${cell.horizon}" data-rate="${row.rate}" data-fv="${cell.futureValue}" data-growth="${cell.growth}" title="Click to inspect: Horizon ${cell.horizon} yrs | Return ${row.rate}% | Growth ${formatCurrency(cell.growth)}">
              <span class="sensitivity-cell-pmt" style="color: var(--color-primary);">${formatCurrency(cell.futureValue)}</span>
              <span class="sensitivity-cell-sub" style="color: var(--color-success);">+${formatCurrency(cell.growth)}</span>
            </div>
          </td>
        `;
      });

      tr.innerHTML = rowHtml;
      tbody.appendChild(tr);
    });
  }

  // Attach interactive click inspection listeners
  tbody.querySelectorAll('.sensitivity-cell').forEach(cellEl => {
    cellEl.addEventListener('click', () => {
      tbody.querySelectorAll('.sensitivity-cell').forEach(c => c.classList.remove('cell-selected'));
      cellEl.classList.add('cell-selected');

      const inspectBar = document.getElementById('sensitivity-inspect-bar');
      const inspectText = document.getElementById('sensitivity-inspect-text');
      if (!inspectBar || !inspectText) return;

      if (mode === 'loan') {
        const t = parseFloat(cellEl.getAttribute('data-term'));
        const r = parseFloat(cellEl.getAttribute('data-rate'));
        const pmt = parseFloat(cellEl.getAttribute('data-payment'));
        const interest = parseFloat(cellEl.getAttribute('data-interest'));
        const base = AppState.lastScenarioData?.base;
        const diffInt = base ? interest - base.totalInterest : 0;
        const diffStr = diffInt === 0 ? 'Exact Baseline' : (diffInt < 0 ? `Saves ${formatCurrency(Math.abs(diffInt))}` : `Costs +${formatCurrency(diffInt)} more`);

        AppState.inspectedSensitivityCell = { mode: 'loan', rate: r, term: t };
        inspectText.innerHTML = `Inspected Cell: <strong>${r}% APR</strong> for <strong>${t} Years</strong> &rarr; Monthly EMI: <strong>${formatCurrency(pmt)}</strong> | Total Interest: <strong>${formatCurrency(interest)}</strong> (${diffStr})`;
      } else {
        const h = parseFloat(cellEl.getAttribute('data-horizon'));
        const r = parseFloat(cellEl.getAttribute('data-rate'));
        const fv = parseFloat(cellEl.getAttribute('data-fv'));
        const growth = parseFloat(cellEl.getAttribute('data-growth'));
        const base = AppState.lastScenarioData?.base;
        const diffFv = base ? fv - base.futureValue : 0;
        const diffStr = diffFv === 0 ? 'Exact Baseline' : (diffFv > 0 ? `+${formatCurrency(diffFv)} more wealth` : `-${formatCurrency(Math.abs(diffFv))} less wealth`);

        AppState.inspectedSensitivityCell = { mode: 'invest', rate: r, horizon: h };
        inspectText.innerHTML = `Inspected Cell: <strong>${r}% Return</strong> over <strong>${h} Years</strong> &rarr; Accumulated FV: <strong>${formatCurrency(fv)}</strong> | Growth: <strong>+${formatCurrency(growth)}</strong> (${diffStr})`;
      }

      inspectBar.style.display = 'flex';
    });
  });
}

/**
 * Apply inspected cell parameters to baseline inputs or custom what-if inputs
 */
function applyInspectedSensitivityCell(target) {
  const inspected = AppState.inspectedSensitivityCell;
  if (!inspected) {
    showNotification('Please click any cell in the Sensitivity Matrix first to inspect.', 'info');
    return;
  }

  if (inspected.mode === 'loan') {
    if (target === 'base') {
      const elRate = document.getElementById('sc-loan-rate');
      const elTerm = document.getElementById('sc-loan-term');
      if (elRate) elRate.value = inspected.rate;
      if (elTerm) elTerm.value = inspected.term;
      showNotification(`Applied ${inspected.rate}% APR & ${inspected.term} Yrs as baseline loan! 📊`, 'success');
    } else {
      const elRate = document.getElementById('sc-custom-loan-rate');
      const elTerm = document.getElementById('sc-custom-loan-term');
      if (elRate) elRate.value = inspected.rate;
      if (elTerm) elTerm.value = inspected.term;
      showNotification(`Set ${inspected.rate}% APR & ${inspected.term} Yrs as Custom What-If Scenario! 🎯`, 'success');
    }
  } else {
    if (target === 'base') {
      const elRate = document.getElementById('sc-inv-rate');
      const elTerm = document.getElementById('sc-inv-term');
      if (elRate) elRate.value = inspected.rate;
      if (elTerm) elTerm.value = inspected.horizon;
      showNotification(`Applied ${inspected.rate}% Return & ${inspected.horizon} Yrs as baseline investment! 📈`, 'success');
    } else {
      const elRate = document.getElementById('sc-custom-inv-rate');
      const elTerm = document.getElementById('sc-custom-inv-term');
      if (elRate) elRate.value = inspected.rate;
      if (elTerm) elTerm.value = inspected.horizon;
      showNotification(`Set ${inspected.rate}% Return & ${inspected.horizon} Yrs as Custom What-If Target! 🎯`, 'success');
    }
  }

  runScenarioAnalysis();
}

/**
 * Copies the scenario comparison table to clipboard
 */
function copyScenarioTable() {
  const table = document.getElementById('scenario-comparison-table');
  if (!table) return;

  const rows = Array.from(table.querySelectorAll('tr'));
  const text = rows.map(tr => {
    return Array.from(tr.children).map(td => td.innerText.replace(/\n/g, ' ').trim()).join('\t');
  }).join('\n');

  navigator.clipboard.writeText(text).then(() => {
    showNotification('Scenario comparison table copied to clipboard! 📋', 'success');
  }).catch(() => {
    showNotification('Failed to copy table to clipboard.', 'warning');
  });
}

/**
 * Exports Scenario Comparison Table to CSV
 */
function downloadScenarioCSV() {
  if (!AppState.lastScenarioData || !AppState.lastScenarioData.scenarios) {
    showNotification('Please run Scenario Analysis first.', 'warning');
    return;
  }

  const { mode, scenarios } = AppState.lastScenarioData;
  const isLoan = mode === 'loan';
  const rows = [];

  rows.push(`# Time Value of Money (TVM) Calculator - Scenario & What-If Analysis`);
  rows.push(`# Exported: ${new Date().toLocaleString()}`);
  rows.push(`# Mode: ${isLoan ? 'Loan & Mortgage Scenarios' : 'Investment & Wealth Growth Scenarios'}`);
  rows.push(`#`);

  if (isLoan) {
    rows.push(['Scenario Name', 'Rate (%)', 'Term (Years)', 'Extra Prepay', 'Periodic Payment (EMI)', 'Total Principal', 'Total Interest', 'Total Outflow', 'Variance vs Base'].join(','));
    scenarios.forEach(sc => {
      const m = sc.metrics;
      const varText = sc.isBase ? '0.00' : (sc.deltaInterest < 0 ? `-${Math.abs(sc.deltaInterest).toFixed(2)}` : `+${sc.deltaInterest.toFixed(2)}`);
      rows.push([
        `"${sc.name}"`,
        sc.rate.toFixed(2),
        m.payoffYears.toFixed(1),
        (sc.extra || 0).toFixed(2),
        m.actualPayment.toFixed(2),
        m.totalPrincipal.toFixed(2),
        m.totalInterest.toFixed(2),
        m.totalPayments.toFixed(2),
        `"${varText}"`
      ].join(','));
    });
  } else {
    rows.push(['Scenario Name', 'Return Rate (%)', 'Horizon (Years)', 'Periodic Deposit', 'Total Contributions', 'Total Growth (Earned)', 'Accumulated Wealth (FV)', 'Variance vs Base'].join(','));
    scenarios.forEach(sc => {
      const m = sc.metrics;
      const varText = sc.isBase ? '0.00' : (sc.deltaFV > 0 ? `+${sc.deltaFV.toFixed(2)}` : `-${Math.abs(sc.deltaFV).toFixed(2)}`);
      rows.push([
        `"${sc.name}"`,
        sc.rate.toFixed(2),
        sc.term.toFixed(1),
        (sc.deposit || 0).toFixed(2),
        m.totalPrincipal.toFixed(2),
        m.totalGrowth.toFixed(2),
        m.futureValue.toFixed(2),
        `"${varText}"`
      ].join(','));
    });
  }

  const csvContent = rows.join('\r\n');
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `tvm_scenario_analysis_${mode}_${timestamp}.csv`;
  exportCSV(filename, csvContent);
  showNotification(`Scenario analysis exported as "${filename}"! 📊`, 'success');
}

/**
 * Exports 2D Sensitivity Matrix to CSV
 */
function downloadSensitivityCSV() {
  if (!AppState.lastSensitivityData) {
    showNotification('Please run Scenario Analysis first.', 'warning');
    return;
  }

  const data = AppState.lastSensitivityData;
  const rows = [];

  rows.push(`# Time Value of Money (TVM) Calculator - 2D Sensitivity Matrix Heatmap`);
  rows.push(`# Exported: ${new Date().toLocaleString()}`);
  rows.push(`#`);

  if (data.type === 'loan') {
    rows.push(['Interest Rate (%)', ...data.terms.map(t => `${t} Years (Payment)`), ...data.terms.map(t => `${t} Years (Total Interest)`)].join(','));
    data.matrix.forEach(r => {
      const pmtCells = r.cells.map(c => c.payment.toFixed(2));
      const intCells = r.cells.map(c => c.totalInterest.toFixed(2));
      rows.push([`${r.rate}%`, ...pmtCells, ...intCells].join(','));
    });
  } else {
    rows.push(['Return Rate (%)', ...data.horizons.map(h => `${h} Years (FV)`), ...data.horizons.map(h => `${h} Years (Growth)`)].join(','));
    data.matrix.forEach(r => {
      const fvCells = r.cells.map(c => c.futureValue.toFixed(2));
      const grCells = r.cells.map(c => c.growth.toFixed(2));
      rows.push([`${r.rate}%`, ...fvCells, ...grCells].join(','));
    });
  }

  const csvContent = rows.join('\r\n');
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `tvm_sensitivity_matrix_${data.type}_${timestamp}.csv`;
  exportCSV(filename, csvContent);
  showNotification(`Sensitivity matrix exported as "${filename}"! 📊`, 'success');
}

/**
 * Downloads Calculation History CSV
 */
function downloadHistoryCSV() {
  const history = getHistory();
  if (history.length === 0) {
    showNotification('No calculation history available to export.', 'info');
    return;
  }

  const headers = ['Date/Time', 'Calculation Type', 'Inputs', 'Result'];
  const rows = [headers.join(',')];

  history.forEach(item => {
    // Sanitize CSV cells containing commas or quotes
    const sanitize = (val) => `"${String(val || '').replace(/"/g, '""')}"`;
    rows.push([
      sanitize(item.timestamp),
      sanitize(item.type),
      sanitize(item.inputs),
      sanitize(item.result)
    ].join(','));
  });

  const csvContent = rows.join('\r\n');
  exportCSV('tvm_calculation_history.csv', csvContent);
}

// Expose key functions globally for inline calls or test harnesses if needed
window.setTimeUnit = setTimeUnit;
window.calculateFutureValue = calculateFutureValue;
window.calculatePresentValue = calculatePresentValue;
window.calculateFutureAnnuity = calculateFutureAnnuity;
window.calculatePresentAnnuity = calculatePresentAnnuity;
window.calculateLoanPayment = calculateLoanPayment;
window.calculateCompoundInterest = calculateCompoundInterest;
window.loadSampleFV = loadSampleFV;
window.loadSamplePV = loadSamplePV;
window.loadSampleFVA = loadSampleFVA;
window.loadSamplePVA = loadSamplePVA;
window.loadSampleLoan = loadSampleLoan;
window.loadSampleCI = loadSampleCI;
window.generateAmortizationSchedule = generateAmortizationSchedule;
window.renderAmortizationTable = renderAmortizationTable;
window.copyAmortizationTable = copyAmortizationTable;
window.downloadAmortizationCSV = downloadAmortizationCSV;
window.validateInput = validateInput;
window.resetCalculator = resetCalculator;
window.saveHistory = saveHistory;
window.loadHistory = loadHistory;
window.clearHistory = clearHistory;
window.exportCSV = exportCSV;
window.AppState = AppState;
window.runScenarioAnalysis = runScenarioAnalysis;
window.setScenarioMode = setScenarioMode;
window.resetScenarioForm = resetScenarioForm;
window.importFromLoanTab = importFromLoanTab;
window.importFromCITab = importFromCITab;
window.gotoScenarioFromLoan = gotoScenarioFromLoan;
window.gotoScenarioFromCI = gotoScenarioFromCI;
window.applyScenarioPreset = applyScenarioPreset;
window.applyInspectedSensitivityCell = applyInspectedSensitivityCell;
window.copyScenarioTable = copyScenarioTable;
window.downloadScenarioCSV = downloadScenarioCSV;
window.downloadSensitivityCSV = downloadSensitivityCSV;
window.calculateScenarioLoanMetrics = calculateScenarioLoanMetrics;
window.calculateScenarioInvestMetrics = calculateScenarioInvestMetrics;
window.generateLoanSensitivityMatrix = generateLoanSensitivityMatrix;
window.generateInvestSensitivityMatrix = generateInvestSensitivityMatrix;
