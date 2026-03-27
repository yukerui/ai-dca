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

export { FUND_SWITCH_STRATEGIES };

export const defaultFundSwitchState = {
  fileName: 'Screenshot_20231024_09.png',
  recognizedRecords: 4,
  feePerTrade: 0,
  comparison: {
    strategy: 'direct',
    sourcePositions: [{ code: '159660', shares: 2600 }],
    targetPositions: [{ code: '513100', shares: 2900 }],
    sourceCode: '159660',
    sourceSellShares: 2600,
    sourceCurrentPrice: 1.863,
    targetCode: '513100',
    targetBuyShares: 2900,
    targetCurrentPrice: 1.729,
    switchCost: 4869.1,
    extraCash: 142.3,
    feeTradeCount: 2,
    priceOverrides: {}
  },
  rows: [
    { id: 'switch-1', date: '2023-10-24', code: '000651', type: '卖出', buyPrice: 0, sellPrice: 1.245, shares: 12500 },
    { id: 'switch-2', date: '2023-10-25', code: '001230', type: '买入', buyPrice: 3.8821, sellPrice: 0, shares: 4010.5 },
    { id: 'switch-3', date: '2023-11-02', code: '510300', type: '买入', buyPrice: 0.9982, sellPrice: 0, shares: 25000 },
    { id: 'switch-4', date: '2023-11-15', code: '161725', type: '卖出', buyPrice: 0, sellPrice: 1.0234, shares: 8900 }
  ]
};

function toPositiveNumber(value) {
  return Math.max(Number(value) || 0, 0);
}

export function createEmptyFundSwitchRow() {
  return sanitizeFundSwitchRows([
    {
      id: `switch-${Date.now()}`,
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

export function readFundSwitchState() {
  if (typeof window === 'undefined') {
    return defaultFundSwitchState;
  }

  try {
    const saved = JSON.parse(window.localStorage.getItem(FUND_SWITCH_KEY) || 'null');
    if (!saved) {
      return defaultFundSwitchState;
    }

    const savedRows = sanitizeFundSwitchRows(Array.isArray(saved.rows) && saved.rows.length ? saved.rows : defaultFundSwitchState.rows);
    return {
      fileName: saved.fileName || defaultFundSwitchState.fileName,
      recognizedRecords: Math.max(Number(saved.recognizedRecords) || savedRows.length || defaultFundSwitchState.recognizedRecords, 0),
      feePerTrade: round(toPositiveNumber(saved.feePerTrade), 2),
      comparison: sanitizeFundSwitchComparison(saved.comparison),
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
    fileName: state.fileName || defaultFundSwitchState.fileName,
    recognizedRecords: Math.max(Number(state.recognizedRecords) || computed.recordCount, 0),
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
