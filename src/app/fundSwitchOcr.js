import { round } from './accumulation.js';
import { detectRemoteTextFromFile, normalizeOcrText } from './ocrSpace.js';

const SELL_KEYWORDS = ['卖出', '赎回', '转出'];
const BUY_KEYWORDS = ['买入', '申购', '定投', '转入'];
const HEADER_KEYWORDS = ['日期', '时间', '基金代码', '代码', '单价', '份额', '金额', '交易', '成交日期', '成交量', '成交额'];

function normalizeDate(rawText = '') {
  const text = normalizeOcrText(rawText).replace(/[一]/g, '-');
  const separated = text.match(/(20\d{2})[./-](\d{1,2})[./-](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (separated) {
    const [, year, month, day, hour, minute, second] = separated;
    const date = [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
    if (!hour || !minute) {
      return date;
    }

    const time = [hour.padStart(2, '0'), minute.padStart(2, '0'), (second || '00').padStart(2, '0')].join(':');
    return date + ' ' + time;
  }

  const compactWithSpace = text.match(/(20\d{2})(\d{2})(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (compactWithSpace) {
    const [, year, month, day, hour, minute, second] = compactWithSpace;
    return year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second;
  }

  const compact = text.match(/(20\d{2})(\d{2})(\d{2})(\d{2}):(\d{2}):(\d{2})/);
  if (compact) {
    const [, year, month, day, hour, minute, second] = compact;
    return year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second;
  }

  const compactNoSeparators = text.match(/(20\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (compactNoSeparators) {
    const [, year, month, day, hour, minute, second] = compactNoSeparators;
    return year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second;
  }

  const dateOnly = text.match(/(20\d{2})(\d{2})(\d{2})/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return year + '-' + month + '-' + day;
  }

  return '';
}

function getLineMetrics(line, index) {
  if (!Array.isArray(line.box) || !line.box.length) {
    return {
      top: index * 24,
      left: 0,
      width: 0,
      height: 18,
      centerY: index * 24 + 9
    };
  }

  const xs = line.box.map((point) => Number(point?.[0]) || 0);
  const ys = line.box.map((point) => Number(point?.[1]) || 0);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  const height = Math.max(bottom - top, 12);

  return {
    top,
    left,
    width: Math.max(right - left, 0),
    height,
    centerY: top + height / 2
  };
}

function groupLinesByRow(lines) {
  const tokens = lines
    .map((line, index) => ({
      ...line,
      ...getLineMetrics(line, index),
      text: normalizeOcrText(line.text)
    }))
    .filter((line) => line.text)
    .sort((left, right) => {
      if (Math.abs(left.top - right.top) > 10) {
        return left.top - right.top;
      }

      return left.left - right.left;
    });

  const groups = [];

  for (const token of tokens) {
    const current = groups[groups.length - 1];
    const threshold = current ? Math.max(current.avgHeight * 0.6, token.height * 0.6, 16) : 0;

    if (!current || Math.abs(token.centerY - current.centerY) > threshold) {
      groups.push({
        centerY: token.centerY,
        avgHeight: token.height,
        tokens: [token]
      });
      continue;
    }

    current.tokens.push(token);
    current.centerY = (current.centerY * (current.tokens.length - 1) + token.centerY) / current.tokens.length;
    current.avgHeight = (current.avgHeight * (current.tokens.length - 1) + token.height) / current.tokens.length;
  }

  return groups.map((group) => {
    const sortedTokens = [...group.tokens].sort((left, right) => left.left - right.left);
    return {
      text: sortedTokens.map((token) => token.text).join(' '),
      tokens: sortedTokens,
      centerY: group.centerY
    };
  });
}

function detectTradeType(text) {
  if (SELL_KEYWORDS.some((keyword) => text.includes(keyword))) {
    return '卖出';
  }

  if (/卖(?:\s|\d|$)/.test(text)) {
    return '卖出';
  }

  if (BUY_KEYWORDS.some((keyword) => text.includes(keyword))) {
    return '买入';
  }

  if (/买(?:\s|\d|$)/.test(text)) {
    return '买入';
  }

  return '';
}

function normalizeNumericText(text = '') {
  return normalizeOcrText(text)
    .replace(/[Oo]/g, '0')
    .replace(/[Il|]/g, '1')
    .replace(/[Tt]/g, '1')
    .replace(/,/g, '')
    .replace(/\s+/g, '');
}

function parseDecimalNumber(text) {
  const normalized = normalizeNumericText(text);
  if (!normalized) {
    return null;
  }

  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  const value = Number(match[0]);
  if (!Number.isFinite(value)) {
    return null;
  }

  return value;
}

function parsePriceToken(text) {
  const direct = parseDecimalNumber(text);
  if (direct !== null && direct > 0 && direct < 100) {
    return round(direct, 4);
  }

  const normalized = normalizeNumericText(text);
  if (/^\d{4,5}$/.test(normalized)) {
    const inferred = Number(normalized) / 1000;
    if (Number.isFinite(inferred) && inferred > 0 && inferred < 100) {
      return round(inferred, 4);
    }
  }

  return null;
}

function parseCountToken(text) {
  const value = parseDecimalNumber(text);
  if (value === null || value <= 0) {
    return null;
  }

  return round(value, 2);
}

function parseAmountToken(text) {
  const value = parseDecimalNumber(text);
  if (value === null || value <= 0) {
    return null;
  }

  return round(value, 2);
}

function isHeaderLike(text) {
  const normalized = normalizeOcrText(text);
  return HEADER_KEYWORDS.some((keyword) => normalized === keyword || normalized.startsWith(keyword));
}

function isMostlyNumeric(text) {
  const normalized = normalizeNumericText(text);
  return /^[0-9.:-]+$/.test(normalized);
}

function pickNameToken(tokens) {
  return tokens.find((token) => token.left < 320 && !detectTradeType(token.text) && !isMostlyNumeric(token.text) && !isHeaderLike(token.text));
}

function parseSummaryGroup(group) {
  const tokens = [...group.tokens].sort((left, right) => left.left - right.left);
  const typeToken = tokens.find((token) => detectTradeType(token.text));
  const nameToken = pickNameToken(tokens);
  const priceToken = tokens.find((token) => token.left >= 320 && token.left <= 700 && parsePriceToken(token.text) !== null);
  const sharesToken = tokens.find((token) => token.left >= 700 && token.left <= 940 && parseCountToken(token.text) !== null);
  const type = detectTradeType(typeToken?.text || group.text);

  if (!nameToken || !priceToken || !sharesToken || !type) {
    return null;
  }

  const name = normalizeOcrText(nameToken.text);
  if (!name || isHeaderLike(name)) {
    return null;
  }

  return {
    name,
    type,
    price: parsePriceToken(priceToken.text),
    shares: parseCountToken(sharesToken.text),
    centerY: group.centerY
  };
}

function parseDetailGroup(group) {
  const tokens = [...group.tokens].sort((left, right) => left.left - right.left);
  const rowText = tokens.map((token) => normalizeOcrText(token.text)).join(' ');
  const type = detectTradeType(rowText || group.text);
  const date = normalizeDate(rowText || group.text);
  const amountToken = [...tokens].reverse().find((token) => token.left >= 880 && parseAmountToken(token.text) !== null);

  if (!type || !date) {
    return null;
  }

  return {
    type,
    date,
    amount: amountToken ? parseAmountToken(amountToken.text) : null,
    centerY: group.centerY
  };
}

function parseInlineTradeGroup(group, index) {
  const text = normalizeOcrText(group.text);
  if (!text || isHeaderLike(text)) {
    return null;
  }

  const type = detectTradeType(text);
  if (!type) {
    return null;
  }

  const date = normalizeDate(text);
  const tokens = [...group.tokens].sort((left, right) => left.left - right.left);
  const nameToken = pickNameToken(tokens);
  const priceToken = tokens.find((token) => token.left >= 250 && token.left <= 760 && parsePriceToken(token.text) !== null);
  const sharesToken = tokens.find((token) => token.left >= 620 && token.left <= 960 && parseCountToken(token.text) !== null);
  const amountToken = [...tokens].reverse().find((token) => token.left >= 880 && parseAmountToken(token.text) !== null);

  if (!nameToken || !priceToken || !sharesToken) {
    return null;
  }

  const price = parsePriceToken(priceToken.text);
  const shares = parseCountToken(sharesToken.text);
  if (price === null || shares === null) {
    return null;
  }

  return {
    id: 'switch-inline-' + Date.now() + '-' + index,
    date,
    code: normalizeOcrText(nameToken.text),
    type,
    price,
    shares,
    amount: amountToken ? parseAmountToken(amountToken.text) : round(price * shares, 2)
  };
}

function buildRowsFromPairs(groups) {
  const rows = [];

  for (let index = 0; index < groups.length; index += 1) {
    const summary = parseSummaryGroup(groups[index]);
    if (!summary) {
      continue;
    }

    const detail = parseDetailGroup(groups[index + 1]);
    const isPair = Boolean(detail) && detail.type === summary.type && Math.abs(detail.centerY - summary.centerY) <= 90;

    rows.push({
      id: 'switch-ocr-' + Date.now() + '-' + index,
      date: isPair ? detail.date : '',
      code: summary.name,
      type: summary.type,
      price: round(summary.price, 4),
      shares: round(summary.shares, 2),
      amount: isPair ? detail.amount : round(summary.price * summary.shares, 2)
    });

    if (isPair) {
      index += 1;
    }
  }

  return rows;
}

function getRowAmount(row) {
  return round(row.amount || row.price * row.shares, 2);
}

function getRowTimestamp(row) {
  if (!row?.date) {
    return Number.NaN;
  }

  const timestamp = Date.parse(row.date.replace(' ', 'T'));
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
}

function findSwitchPair(rows) {
  for (let index = 0; index < rows.length - 1; index += 1) {
    const first = rows[index];
    const second = rows[index + 1];
    if (first.type === second.type || first.code === second.code) {
      continue;
    }

    const buy = first.type === '买入' ? first : second;
    const sell = first.type === '卖出' ? first : second;
    if (buy && sell) {
      return { buy, sell };
    }
  }

  let bestPair = null;

  for (let index = 0; index < rows.length; index += 1) {
    for (let inner = index + 1; inner < rows.length; inner += 1) {
      const first = rows[index];
      const second = rows[inner];
      if (first.type === second.type || first.code === second.code) {
        continue;
      }

      const buy = first.type === '买入' ? first : second;
      const sell = first.type === '卖出' ? first : second;
      if (!buy || !sell) {
        continue;
      }

      const buyTime = getRowTimestamp(buy);
      const sellTime = getRowTimestamp(sell);
      const timeGap = Number.isFinite(buyTime) && Number.isFinite(sellTime) ? Math.abs(buyTime - sellTime) : 24 * 60 * 60 * 1000;
      const amountGap = Math.abs(getRowAmount(buy) - getRowAmount(sell));
      const score = (index * 1_000_000_000) + timeGap + (amountGap * 1000);

      if (!bestPair || score < bestPair.score) {
        bestPair = { buy, sell, score };
      }
    }
  }

  if (bestPair) {
    return bestPair;
  }

  const latestSell = rows.find((row) => row.type === '卖出');
  const latestBuy = rows.find((row) => row.type === '买入' && row.code !== latestSell?.code);
  if (!latestSell || !latestBuy) {
    return null;
  }

  return { buy: latestBuy, sell: latestSell };
}

function summarizeByCode(rows, type) {
  const byCode = new Map();

  for (const row of rows) {
    if (row.type !== type || !row.code) {
      continue;
    }

    const existing = byCode.get(row.code) || { code: row.code, shares: 0, amount: 0 };
    existing.shares += row.shares;
    existing.amount += getRowAmount(row);
    byCode.set(row.code, existing);
  }

  return [...byCode.values()].sort((left, right) => right.amount - left.amount || right.shares - left.shares);
}

function inferComparisonFromRows(rows, fallbackComparison) {
  const switchPair = findSwitchPair(rows);
  if (switchPair) {
    const sellAmount = getRowAmount(switchPair.sell);
    const buyAmount = getRowAmount(switchPair.buy);

    return {
      ...fallbackComparison,
      sourceCode: switchPair.sell.code || fallbackComparison.sourceCode,
      sourceSellShares: round(switchPair.sell.shares, 2),
      targetCode: switchPair.buy.code || fallbackComparison.targetCode,
      targetBuyShares: round(switchPair.buy.shares, 2),
      switchCost: buyAmount > 0 ? buyAmount : fallbackComparison.switchCost,
      extraCash: round(Math.max(buyAmount - sellAmount, 0), 2),
      feeTradeCount: 2
    };
  }

  const sellGroups = summarizeByCode(rows, '卖出');
  const buyGroups = summarizeByCode(rows, '买入');
  const totalSellAmount = round(sellGroups.reduce((sum, item) => sum + item.amount, 0), 2);
  const totalBuyAmount = round(buyGroups.reduce((sum, item) => sum + item.amount, 0), 2);
  const source = sellGroups[0];
  const target = buyGroups[0];

  return {
    ...fallbackComparison,
    sourceCode: source?.code || fallbackComparison.sourceCode,
    sourceSellShares: source ? round(source.shares, 2) : fallbackComparison.sourceSellShares,
    targetCode: target?.code || fallbackComparison.targetCode,
    targetBuyShares: target ? round(target.shares, 2) : fallbackComparison.targetBuyShares,
    switchCost: totalBuyAmount > 0 ? totalBuyAmount : fallbackComparison.switchCost,
    extraCash: round(Math.max(totalBuyAmount - totalSellAmount, 0), 2),
    feeTradeCount: rows.length || fallbackComparison.feeTradeCount
  };
}

export async function recognizeFundSwitchFile(file, fallbackComparison, onProgress) {
  onProgress?.({
    status: 'loading',
    progress: 18,
    message: '上传截图到 OCR.Space'
  });

  const detected = await detectRemoteTextFromFile(file, onProgress);

  onProgress?.({
    status: 'loading',
    progress: 72,
    message: 'OCR.Space 已返回，正在解析交易字段'
  });

  const groups = groupLinesByRow(detected.lines);
  const pairedRows = buildRowsFromPairs(groups);
  const rows = (pairedRows.length
    ? pairedRows
    : groups.map((group, index) => parseInlineTradeGroup(group, index)).filter(Boolean))
    .map((row) => ({
      ...row,
      amount: getRowAmount(row)
    }));

  return {
    ...detected,
    comparison: inferComparisonFromRows(rows, fallbackComparison),
    groups,
    previewLines: groups.map((group) => group.text).filter(Boolean).slice(0, 6),
    rows
  };
}
