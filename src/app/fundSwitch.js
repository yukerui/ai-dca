import {
  FUND_SWITCH_STRATEGIES,
  buildFundSwitchPositionMetrics,
  deriveFundSwitchComparison as deriveFundSwitchComparisonFromCore,
  getFundSwitchRowAmount,
  replayFundSwitchRows,
  round,
  sanitizeFundSwitchComparison,
  sanitizeFundSwitchRows
} from './fundSwitchCore.js';

const FUND_SWITCH_KEY = 'aiDcaFundSwitchState';
const LEGACY_SAMPLE_FILE_NAME = 'Screenshot_20231024_09.png';

export { FUND_SWITCH_STRATEGIES };

function createBlankComparison() {
  return {
    strategy: 'direct',
    sourcePositions: [],
    targetPositions: [],
    sourceCode: '',
    sourceSellShares: 0,
    sourceCurrentPrice: 0,
    targetCode: '',
    targetBuyShares: 0,
    targetCurrentPrice: 0,
    switchCost: 0,
    extraCash: 0,
    feeTradeCount: 0,
    priceOverrides: {}
  };
}

function createBlankRow(id = `switch-${Date.now()}`) {
  return sanitizeFundSwitchRows([
    {
      id,
      date: '',
      code: '',
      type: '买入',
      buyPrice: 0,
      sellPrice: 0,
      shares: 0,
      amount: 0
    }
  ])[0];
}

export const defaultFundSwitchState = {
  fileName: '',
  recognizedRecords: 0,
  resultConfirmed: false,
  feePerTrade: 0,
  comparison: createBlankComparison(),
  rows: [createBlankRow('switch-empty-1')]
};

export function createDefaultFundSwitchState() {
  return {
    fileName: '',
    recognizedRecords: 0,
    resultConfirmed: false,
    feePerTrade: 0,
    comparison: createBlankComparison(),
    rows: [createBlankRow('switch-empty-1')]
  };
}

function toPositiveNumber(value) {
  return Math.max(Number(value) || 0, 0);
}

export function createEmptyFundSwitchRow() {
  return createBlankRow();
}

export function deriveFundSwitchComparison(rows, comparison = {}, strategyOverride) {
  return deriveFundSwitchComparisonFromCore(rows, comparison, strategyOverride);
}

export function buildFundSwitchSummary(state, { getCurrentPrice } = {}) {
  const comparison = sanitizeFundSwitchComparison(state?.comparison);
  const feePerTrade = round(toPositiveNumber(state?.feePerTrade), 2);
  const rows = sanitizeFundSwitchRows(
    Array.isArray(state?.rows) && state.rows.length ? state.rows : defaultFundSwitchState.rows
  );
  const validRows = sanitizeFundSwitchRows(rows, { filterInvalid: true });
  const processedAmount = round(validRows.reduce((sum, row) => sum + getFundSwitchRowAmount(row), 0), 2);
  const sellAmount = round(validRows.reduce((sum, row) => sum + (row.type === '卖出' ? getFundSwitchRowAmount(row) : 0), 0), 2);
  const buyAmount = round(validRows.reduce((sum, row) => sum + (row.type === '买入' ? getFundSwitchRowAmount(row) : 0), 0), 2);
  const estimatedYield = round(sellAmount - buyAmount, 2);
  const sourcePositions = buildFundSwitchPositionMetrics(comparison.sourcePositions, 'source', comparison, getCurrentPrice);
  const targetPositions = buildFundSwitchPositionMetrics(comparison.targetPositions, 'target', comparison, getCurrentPrice);
  const stayValue = round(sourcePositions.reduce((sum, position) => sum + position.marketValue, 0), 2);
  const switchedValue = round(targetPositions.reduce((sum, position) => sum + position.marketValue, 0), 2);
  const feeTotal = round(feePerTrade * comparison.feeTradeCount, 2);
  const switchedPositionProfit = round(switchedValue - comparison.switchCost - feeTotal, 2);
  const switchAdvantage = round(switchedValue - stayValue - comparison.extraCash - feeTotal, 2);
  const missingPriceCodes = [...new Set(
    [...sourcePositions, ...targetPositions]
      .filter((position) => position.currentPrice <= 0)
      .map((position) => position.code)
  )];
  const resolvedComparison = sanitizeFundSwitchComparison({
    ...comparison,
    sourceCurrentPrice: sourcePositions.length === 1 ? sourcePositions[0].currentPrice : 0,
    targetCurrentPrice: targetPositions.length === 1 ? targetPositions[0].currentPrice : 0
  });
  const replay = replayFundSwitchRows(validRows);

  return {
    rows,
    validRows,
    comparison: resolvedComparison,
    feePerTrade,
    feeTotal,
    processedAmount,
    sellAmount,
    buyAmount,
    estimatedYield,
    stayValue,
    switchedValue,
    switchedPositionProfit,
    switchAdvantage,
    recordCount: rows.length,
    validRecordCount: validRows.length,
    sourcePositions,
    targetPositions,
    missingPriceCodes,
    strategy: resolvedComparison.strategy,
    switchEvents: replay.switchEvents,
    currentLots: replay.currentLots
  };
}

function isLegacySeededSample(saved) {
  if (!saved || typeof saved !== 'object') {
    return false;
  }

  const rows = Array.isArray(saved.rows) ? saved.rows : [];
  return saved.fileName === LEGACY_SAMPLE_FILE_NAME
    && Math.max(Number(saved.recognizedRecords) || 0, 0) === 4
    && rows.length === 4
    && rows[0]?.code === '000651'
    && rows[1]?.code === '001230'
    && rows[2]?.code === '510300'
    && rows[3]?.code === '161725';
}

function inferSavedResultConfirmed(saved) {
  if (typeof saved?.resultConfirmed === 'boolean') {
    return saved.resultConfirmed;
  }

  const comparison = saved?.comparison || {};
  return Boolean(
    comparison.sourceCode
      || comparison.targetCode
      || (Array.isArray(comparison.sourcePositions) && comparison.sourcePositions.length)
      || (Array.isArray(comparison.targetPositions) && comparison.targetPositions.length)
  );
}

export function readFundSwitchState() {
  if (typeof window === 'undefined') {
    return defaultFundSwitchState;
  }

  try {
    const saved = JSON.parse(window.localStorage.getItem(FUND_SWITCH_KEY) || 'null');
    if (!saved || isLegacySeededSample(saved)) {
      return defaultFundSwitchState;
    }

    const savedRows = sanitizeFundSwitchRows(Array.isArray(saved.rows) && saved.rows.length ? saved.rows : defaultFundSwitchState.rows);
    const validSavedRows = sanitizeFundSwitchRows(savedRows, { filterInvalid: true });
    return {
      fileName: saved.fileName || '',
      recognizedRecords: Math.max(Number(saved.recognizedRecords) || validSavedRows.length || 0, 0),
      resultConfirmed: inferSavedResultConfirmed(saved),
      feePerTrade: round(toPositiveNumber(saved.feePerTrade), 2),
      comparison: sanitizeFundSwitchComparison(saved.comparison || createBlankComparison()),
      rows: savedRows.length ? savedRows : [createEmptyFundSwitchRow()]
    };
  } catch (_error) {
    return defaultFundSwitchState;
  }
}

export function persistFundSwitchState(state, computed = buildFundSwitchSummary(state)) {
  if (typeof window === 'undefined') {
    return;
  }

  const payload = {
    source: 'react-fund-switch',
    fileName: state.fileName || '',
    recognizedRecords: Math.max(Number(state.recognizedRecords) || computed.validRecordCount, 0),
    resultConfirmed: Boolean(state.resultConfirmed),
    feePerTrade: round(computed.feePerTrade, 2),
    processedAmount: round(computed.processedAmount, 2),
    sellAmount: round(computed.sellAmount, 2),
    buyAmount: round(computed.buyAmount, 2),
    estimatedYield: round(computed.estimatedYield, 2),
    feeTotal: round(computed.feeTotal, 2),
    stayValue: round(computed.stayValue, 2),
    switchedValue: round(computed.switchedValue, 2),
    switchedPositionProfit: round(computed.switchedPositionProfit, 2),
    switchAdvantage: round(computed.switchAdvantage, 2),
    comparison: {
      ...computed.comparison,
      sourcePositions: computed.comparison.sourcePositions.map((position) => ({
        code: position.code,
        shares: round(position.shares, 2)
      })),
      targetPositions: computed.comparison.targetPositions.map((position) => ({
        code: position.code,
        shares: round(position.shares, 2)
      })),
      priceOverrides: Object.fromEntries(
        Object.entries(computed.comparison.priceOverrides || {})
          .map(([code, price]) => [code, round(price, 4)])
          .filter(([, price]) => price > 0)
      ),
      sourceSellShares: round(computed.comparison.sourceSellShares, 2),
      sourceCurrentPrice: round(computed.comparison.sourceCurrentPrice, 4),
      targetBuyShares: round(computed.comparison.targetBuyShares, 2),
      targetCurrentPrice: round(computed.comparison.targetCurrentPrice, 4),
      switchCost: round(computed.comparison.switchCost, 2),
      extraCash: round(computed.comparison.extraCash, 2),
      feeTradeCount: Math.max(Number(computed.comparison.feeTradeCount) || 0, 0)
    },
    rows: computed.rows.map((row) => ({
      ...row,
      buyPrice: round(row.buyPrice, 4),
      sellPrice: round(row.sellPrice, 4),
      price: round(row.price, 4),
      shares: round(row.shares, 2),
      amount: round(row.amount, 2)
    })),
    updatedAt: new Date().toISOString()
  };

  window.localStorage.setItem(FUND_SWITCH_KEY, JSON.stringify(payload));
}
