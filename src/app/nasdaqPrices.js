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

const nasdaqSnapshotModules = import.meta.glob('../../data/*/*.json');

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

function normalizeSnapshotPath(value = '') {
  return String(value || '')
    .trim()
    .replace(/^\.\.\/\.\.\//, '')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
}

export function nasdaqDataPath(outputPath, { inPagesDir = false } = {}) {
  const normalized = normalizeSnapshotPath(outputPath);

  if (!normalized) {
    return '';
  }

  return inPagesDir ? `../${normalized}` : `./${normalized}`;
}

export async function loadLatestNasdaqPrices({ inPagesDir = false } = {}) {
  const response = await fetch(latestNasdaqPriceManifestPath({ inPagesDir }), {
    headers: {
      Accept: 'application/json'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`现价数据加载失败: HTTP ${response.status}`);
  }

  const payload = await response.json();
  return Array.isArray(payload?.funds) ? payload.funds : [];
}

export function listNasdaqSnapshotPaths(fundCode = '') {
  const normalizedCode = String(fundCode || '').trim();
  if (!normalizedCode) {
    return [];
  }

  return Object.keys(nasdaqSnapshotModules)
    .map((path) => normalizeSnapshotPath(path))
    .filter((path) => path.startsWith(`data/${normalizedCode}/`))
    .sort((left, right) => left.localeCompare(right));
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

export async function loadNasdaqMinuteSnapshot(snapshotOrPath, { inPagesDir = false } = {}) {
  const outputPath = typeof snapshotOrPath === 'string' ? snapshotOrPath : snapshotOrPath?.output_path;
  const resolvedPath = nasdaqDataPath(outputPath, { inPagesDir });

  if (!resolvedPath) {
    throw new Error('分钟线数据路径缺失');
  }

  const response = await fetch(resolvedPath, {
    headers: {
      Accept: 'application/json'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`分钟线数据加载失败: HTTP ${response.status}`);
  }

  return response.json();
}

export async function loadNasdaqDailySnapshots(fundCode = '', { inPagesDir = false } = {}) {
  const snapshotPaths = listNasdaqSnapshotPaths(fundCode);
  if (!snapshotPaths.length) {
    return [];
  }

  const payloads = await Promise.all(snapshotPaths.map(async (path) => {
    const response = await fetch(nasdaqDataPath(path, { inPagesDir }), {
      headers: {
        Accept: 'application/json'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`历史快照加载失败: HTTP ${response.status}`);
    }

    return response.json();
  }));

  return payloads.sort((left, right) => String(left?.date || '').localeCompare(String(right?.date || '')));
}

export function formatPriceAsOf(snapshot) {
  const raw = String(snapshot?.datetime || snapshot?.date || '').trim();
  if (!raw) {
    return '';
  }

  return raw.replace(/:\d{2}$/, '');
}
