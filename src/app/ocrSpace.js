const OCR_SPACE_ENDPOINT = 'https://api.ocr.space/parse/image';
const OCR_SPACE_API_KEY = 'K88123915188957';

function getNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
}

function buildBoundingBox(words = []) {
  if (!Array.isArray(words) || !words.length) {
    return [[0, 0], [0, 0], [0, 0], [0, 0]];
  }

  const left = Math.min(...words.map((word) => Number(word.Left) || 0));
  const top = Math.min(...words.map((word) => Number(word.Top) || 0));
  const right = Math.max(...words.map((word) => (Number(word.Left) || 0) + (Number(word.Width) || 0)));
  const bottom = Math.max(...words.map((word) => (Number(word.Top) || 0) + (Number(word.Height) || 0)));

  return [[left, top], [right, top], [right, bottom], [left, bottom]];
}

function normalizeWord(word = {}) {
  return {
    text: normalizeOcrText(word.WordText || ''),
    left: Number(word.Left) || 0,
    top: Number(word.Top) || 0,
    width: Number(word.Width) || 0,
    height: Number(word.Height) || 0
  };
}

function normalizeLine(line = {}) {
  const sourceWords = Array.isArray(line.Words) ? line.Words : [];

  return {
    text: normalizeOcrText(line.LineText || ''),
    words: sourceWords.map(normalizeWord),
    box: buildBoundingBox(sourceWords)
  };
}

export function normalizeOcrText(text = '') {
  return text
    .replace(/\u3000/g, ' ')
    .replace(/[，]/g, ',')
    .replace(/[：]/g, ':')
    .replace(/[．·•]/g, '.')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function detectRemoteTextFromFile(file, onProgress) {
  if (!file || typeof file !== 'object') {
    throw new Error('未找到要识别的文件。');
  }

  if (!String(file.type || '').startsWith('image/')) {
    throw new Error('当前仅支持图片 OCR，请上传 PNG、JPG、JPEG 或 WebP。');
  }

  onProgress?.({
    status: 'loading',
    progress: 28,
    message: '正在上传截图到 OCR.Space'
  });

  const startedAt = getNow();
  const formData = new FormData();
  formData.append('apikey', OCR_SPACE_API_KEY);
  formData.append('language', 'chs');
  formData.append('isOverlayRequired', 'true');
  formData.append('scale', 'true');
  formData.append('OCREngine', '2');
  formData.append('file', file, file.name || 'fund-switch-upload');

  const response = await fetch(OCR_SPACE_ENDPOINT, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('OCR.Space 请求失败: HTTP ' + response.status);
  }

  const payload = await response.json();
  if (payload?.IsErroredOnProcessing) {
    const message = Array.isArray(payload?.ErrorMessage) ? payload.ErrorMessage.join(' ') : payload?.ErrorMessage;
    throw new Error(message || 'OCR.Space 返回错误，请稍后再试。');
  }

  const parsedResults = Array.isArray(payload?.ParsedResults) ? payload.ParsedResults : [];
  const lines = parsedResults.flatMap((result) => (result.TextOverlay?.Lines || []).map((line) => normalizeLine(line)));

  return {
    durationMs: Number(payload?.ProcessingTimeInMilliseconds) || Math.round(getNow() - startedAt),
    lines,
    parsedText: parsedResults.map((result) => normalizeOcrText(result.ParsedText || '')).filter(Boolean).join('\n'),
    raw: payload
  };
}
