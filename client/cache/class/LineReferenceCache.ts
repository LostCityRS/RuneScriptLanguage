import { resolveFileKey } from "../../utils/cacheUtils";
import type { Uri } from 'vscode';

interface DecodedLineValue {
  line: number;
  value: string;
}

function encodeLineValue(startLine: number, identifierKey: string): string {
  return `${startLine}|${identifierKey}`;
}

function decodeLineValue(encodedValue: string): DecodedLineValue | undefined {
  const split = encodedValue.split('|');
  return (split.length !== 2) ? undefined : { line: Number(split[0]), value: split[1] };
}

export class LineReferenceCache {
  private cache: Record<string, Set<string>>;

  constructor() {
    this.cache = {};
  }

  put(startLine: number, value: string, uri: Uri): void {
    const fileKey = resolveFileKey(uri);
    if (value && fileKey) {
      const fileLineReferences = this.cache[fileKey] || new Set<string>();
      fileLineReferences.add(encodeLineValue(startLine, value));
      this.cache[fileKey] = fileLineReferences;
    }
  }

  get(lineNum: number, uri: Uri): string | undefined {
    const fileKey = resolveFileKey(uri);
    if (!fileKey) return undefined;
    const fileLineReferences = this.cache[fileKey] || new Set<string>();
    let curKey: string | undefined;
    let curLine = 0;
    fileLineReferences.forEach((ref: string) => {
      const decoded = decodeLineValue(ref);
      if (decoded && lineNum >= decoded.line && curLine < decoded.line) {
        curKey = decoded.value;
        curLine = decoded.line;
      }
    });
    return curKey;
  }

  getAll(): Record<string, Set<string>> {
    return this.cache;
  }

  clearFile(uri: Uri): void {
    const fileKey = resolveFileKey(uri);
    if (fileKey) {
      delete this.cache[fileKey];
    }
  }

  clear(): void {
    this.cache = {};
  }
}
