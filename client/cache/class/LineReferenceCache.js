const { resolveFileKey } = require("../../utils/cacheUtils");

function encodeLineValue(startLine, identifierKey) {
  return `${startLine}|${identifierKey}`;
}

function decodeLineValue(encodedValue) {
  const split = encodedValue.split('|');
  return (split.length !== 2) ? null : { line: Number(split[0]), value: split[1] };
}

class LineReferenceCache {
  constructor() {
    this.cache = {};
  }

  put(startLine, value, uri) {
    const fileKey = resolveFileKey(uri);
    if (value && fileKey) {
      const fileLineReferences = this.cache[fileKey] || new Set();
      fileLineReferences.add(encodeLineValue(startLine, value));
      this.cache[fileKey] = fileLineReferences;
    }
  }

  get(lineNum, uri) {
    const fileKey = resolveFileKey(uri);
    const fileLineReferences = this.cache[fileKey] || new Set();
    let curKey;
    let curLine = 0;
    fileLineReferences.forEach(ref => {
      const { line, value } = decodeLineValue(ref);
      if (lineNum >= line && curLine < line) {
        curKey = value;
        curLine = line;
      }
    });
    return curKey;
  }

  getAll() {
    return this.cache;
  }

  clearFile(uri) {
    const fileKey = resolveFileKey(uri);
    if (fileKey) {
      delete this.cache[fileKey];
    }
  }

  clear() {
    this.cache = {};
  }
}

module.exports = LineReferenceCache;
