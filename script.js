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
  lastAmortizationData: null,
  amortizationViewMode: 'all', // 'all' | 'annual'
  amortizationFilter: '',
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

// ==========================================
// A. Future Value (FV)
// Formula: FV = PV * (1 + r)^n
// ==========================================
function calculateFutureValue() {
  clearFieldErrors('fv');

  const pv = validateInput('fv-pv', 'fv-pv-error', 'Present Value (PV)', { allowZero: true });
  const ratePercent = validateInput('fv-rate', 'fv-rate-error', 'Interest Rate per period', { allowZero: true, max: 500 });
  const periods = validateInput('fv-periods', 'fv-periods-error', 'Number of periods (n)', { mustBePositive: true, max: 1200 });

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
  document.getElementById('fv-periods-display').textContent = periods;

  // Save in history
  saveHistory({
    type: 'Future Value (FV)',
    tab: 'fv',
    inputs: `PV: ${formatCurrency(pv)} | Rate: ${ratePercent}% | n: ${periods}`,
    result: `FV = ${formatCurrency(fv)} (Interest: ${formatCurrency(totalInterest)})`,
    raw: { pv, rate: ratePercent, periods }
  });
}

// ==========================================
// B. Present Value (PV)
// Formula: PV = FV / (1 + r)^n
// ==========================================
function calculatePresentValue() {
  clearFieldErrors('pv');

  const fv = validateInput('pv-fv', 'pv-fv-error', 'Future Value (FV)', { allowZero: true });
  const ratePercent = validateInput('pv-rate', 'pv-rate-error', 'Interest Rate per period', { allowZero: true, max: 500 });
  const periods = validateInput('pv-periods', 'pv-periods-error', 'Number of periods (n)', { mustBePositive: true, max: 1200 });

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
  document.getElementById('pv-periods-display').textContent = periods;

  // Save in history
  saveHistory({
    type: 'Present Value (PV)',
    tab: 'pv',
    inputs: `FV: ${formatCurrency(fv)} | Rate: ${ratePercent}% | n: ${periods}`,
    result: `PV = ${formatCurrency(pv)} (Discount: ${formatCurrency(totalDiscount)})`,
    raw: { fv, rate: ratePercent, periods }
  });
}

// ==========================================
// C. Future Value of Ordinary Annuity
// Formula: FV = PMT * [((1 + r)^n - 1) / r]
// If r = 0, FV = PMT * n
// ==========================================
function calculateFutureAnnuity() {
  clearFieldErrors('fva');

  const pmt = validateInput('fva-pmt', 'fva-pmt-error', 'Periodic Payment (PMT)', { allowZero: true });
  const ratePercent = validateInput('fva-rate', 'fva-rate-error', 'Periodic Interest Rate', { allowZero: true, max: 500 });
  const periods = validateInput('fva-periods', 'fva-periods-error', 'Number of periods (n)', { mustBePositive: true, max: 1200 });

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

  // Save in history
  saveHistory({
    type: 'FV of Ordinary Annuity',
    tab: 'fva',
    inputs: `PMT: ${formatCurrency(pmt)} | Rate: ${ratePercent}% | n: ${periods}`,
    result: `FV = ${formatCurrency(fv)} (Interest: ${formatCurrency(totalInterest)})`,
    raw: { pmt, rate: ratePercent, periods }
  });
}

// ==========================================
// D. Present Value of Ordinary Annuity
// Formula: PV = PMT * [1 - (1 + r)^(-n)] / r
// If r = 0, PV = PMT * n
// ==========================================
function calculatePresentAnnuity() {
  clearFieldErrors('pva');

  const pmt = validateInput('pva-pmt', 'pva-pmt-error', 'Periodic Payment (PMT)', { allowZero: true });
  const ratePercent = validateInput('pva-rate', 'pva-rate-error', 'Periodic Interest Rate', { allowZero: true, max: 500 });
  const periods = validateInput('pva-periods', 'pva-periods-error', 'Number of periods (n)', { mustBePositive: true, max: 1200 });

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

  // Save in history
  saveHistory({
    type: 'PV of Ordinary Annuity',
    tab: 'pva',
    inputs: `PMT: ${formatCurrency(pmt)} | Rate: ${ratePercent}% | n: ${periods}`,
    result: `PV = ${formatCurrency(pv)} (Discount: ${formatCurrency(totalInterestDiscount)})`,
    raw: { pmt, rate: ratePercent, periods }
  });
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
}

// ==========================================
// Sample Test Case Loaders
// ==========================================
// Test Case 1 — Future Value: PV=10,000, Rate=8%, Periods=5 -> Expected: ₹14,693.28
function loadSampleFV() {
  document.getElementById('fv-pv').value = '10000';
  document.getElementById('fv-rate').value = '8';
  document.getElementById('fv-periods').value = '5';
  calculateFutureValue({ recordHistory: true });
}

// Test Case 2 — Present Value: FV=14,693.28, Rate=8%, Periods=5 -> Expected: ₹10,000.00
function loadSamplePV() {
  document.getElementById('pv-fv').value = '14693.28';
  document.getElementById('pv-rate').value = '8';
  document.getElementById('pv-periods').value = '5';
  calculatePresentValue({ recordHistory: true });
}

// Test Case 3 — Future Value Annuity: PMT=1,000, Rate=8%, Periods=5 -> Expected: ₹5,866.60
function loadSampleFVA() {
  document.getElementById('fva-pmt').value = '1000';
  document.getElementById('fva-rate').value = '8';
  document.getElementById('fva-periods').value = '5';
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
  document.getElementById('pva-pmt').value = '1000';
  document.getElementById('pva-rate').value = '8';
  document.getElementById('pva-periods').value = '5';
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

/**
 * Downloads Calculation History CSV
 */
function downloadHistoryCSV() {
  const history = getHistory();
  if (history.length === 0) {
    alert('No calculation history available to export.');
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
window.calculateFutureValue = calculateFutureValue;
window.calculatePresentValue = calculatePresentValue;
window.calculateFutureAnnuity = calculateFutureAnnuity;
window.calculatePresentAnnuity = calculatePresentAnnuity;
window.calculateLoanPayment = calculateLoanPayment;
window.calculateCompoundInterest = calculateCompoundInterest;
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
