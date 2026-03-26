function normalizeFundKey(value = '') {
  return String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[()（）.-]/g, '')
    .replace(/QDII/gi, '')
    .replace(/QDI/gi, '')
    .replace(/ETF/gi, '')
    .replace(/基金/g, '');
}

function buildAliases(entry = {}) {
  const aliases = new Set();
  const code = String(entry.code || '').trim();
  const name = String(entry.name || '').trim();
  if (code) {
    aliases.add(code);
    aliases.add(normalizeFundKey(code));
  }
  if (name) {
    aliases.add(name);
    aliases.add(normalizeFundKey(name));
  }
  return [...aliases].filter(Boolean);
}

export function latestNasdaqPriceManifestPath({ inPagesDir = false } = {}) {
  return inPagesDir ? '../data/nasdaq_latest.json' : './data/nasdaq_latest.json';
}

export async function loadLatestNasdaqPrices({ inPagesDir = false } = {}) {
  const response = await fetch(latestNasdaqPriceManifestPath({ inPagesDir }), {
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`现价数据加载失败: HTTP ${response.status}`);
  }

  const payload = await response.json();
  return Array.isArray(payload?.funds) ? payload.funds : [];
}

export function findLatestNasdaqPrice(entries = [], fundKey = '') {
  const normalizedKey = normalizeFundKey(fundKey);
  if (!normalizedKey) {
    return null;
  }

  const exactMatch = entries.find((entry) => buildAliases(entry).some((alias) => alias === fundKey || alias === normalizedKey));
  if (exactMatch) {
    return exactMatch;
  }

  const fuzzyMatches = entries.filter((entry) => buildAliases(entry).some((alias) => {
    const normalizedAlias = normalizeFundKey(alias);
    return normalizedAlias && normalizedKey.length >= 4 && (normalizedAlias.includes(normalizedKey) || normalizedKey.includes(normalizedAlias));
  }));

  return fuzzyMatches.length === 1 ? fuzzyMatches[0] : null;
}

export function formatPriceAsOf(snapshot) {
  const raw = String(snapshot?.datetime || snapshot?.date || '').trim();
  if (!raw) {
    return '';
  }

  return raw.replace(/:\d{2}$/, '');
}
