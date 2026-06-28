import type { TextDocument, Uri } from 'vscode';
import type { OperatorToken, ParsedFile, ParsedWord } from '../types';
import { resolveFileKey } from '../utils/cacheUtils';
import { getFileInfo } from '../utils/fileUtils';
import { matchLongestException } from './wordExceptions';

type Range = { start: number; end: number; };

type ParserState = {
  fileKey: string | undefined;
  isConfig: boolean;
  inBlockComment: boolean;
  inString: boolean;
  inInterpolationString: boolean;
  interpDepth: number;
  parenDepth: number;
  braceDepth: number;
  callStack: string[];
  callIndexStack: number[];
  paramIndexStack: number[];
  interpParenDepthStack: number[];
};

type LineParseStateResult = {
  words: ParsedWord[];
  operators: OperatorToken[];
  stringRanges: Range[];
  interpRanges: Range[];
  blockCommentRanges: Range[];
  nextState: ParserState;
};

const stringRangesByLine = new Map<number, Range[]>();
const interpRangesByLine = new Map<number, Range[]>();
const blockCommentRangesByLine = new Map<number, Range[]>();
const wordsByLine = new Map<number, ParsedWord[]>();
const operatorsByLine = new Map<number, OperatorToken[]>();
const endStateByLine = new Map<number, ParserState>();
const state: ParserState = {
  fileKey: undefined,
  isConfig: false,
  inBlockComment: false,
  inString: false,
  inInterpolationString: false,
  interpDepth: 0,
  parenDepth: 0,
  braceDepth: 0,
  callStack: [],
  callIndexStack: [],
  paramIndexStack: [],
  interpParenDepthStack: []
};

function getDefaultState(fileKey?: string, isConfig = false): ParserState {
  return {
    fileKey,
    isConfig,
    inBlockComment: false,
    inString: false,
    inInterpolationString: false,
    interpDepth: 0,
    parenDepth: 0,
    braceDepth: 0,
    callStack: [],
    callIndexStack: [],
    paramIndexStack: [],
    interpParenDepthStack: []
  };
}

export function resetLineParser(uri?: Uri): void {
  const fileKey = uri ? resolveFileKey(uri) : undefined;
  const isConfig = uri ? getFileInfo(uri).type !== 'rs2' : false;
  const resetState = getDefaultState(fileKey, isConfig);
  state.fileKey = resetState.fileKey;
  state.isConfig = resetState.isConfig;
  state.inBlockComment = resetState.inBlockComment;
  state.inString = resetState.inString;
  state.inInterpolationString = resetState.inInterpolationString;
  state.interpDepth = resetState.interpDepth;
  state.parenDepth = resetState.parenDepth;
  state.braceDepth = resetState.braceDepth;
  state.callStack = resetState.callStack;
  state.callIndexStack = resetState.callIndexStack;
  state.paramIndexStack = resetState.paramIndexStack;
  state.interpParenDepthStack = resetState.interpParenDepthStack;
  stringRangesByLine.clear();
  interpRangesByLine.clear();
  blockCommentRangesByLine.clear();
  wordsByLine.clear();
  operatorsByLine.clear();
  endStateByLine.clear();
}

export function getStringRanges(lineNum?: number): Range[] | Map<number, Range[]> {
  if (lineNum === undefined) return stringRangesByLine;
  return stringRangesByLine.get(lineNum) ?? [];
}

export function getAllStringRanges(): Map<number, Range[]> {
  return stringRangesByLine;
}

export function getAllInterpolationRanges(): Map<number, Range[]> {
  return interpRangesByLine;
}

export function getBlockCommentRanges(lineNum?: number): Range[] | Map<number, Range[]> {
  if (lineNum === undefined) return blockCommentRangesByLine;
  return blockCommentRangesByLine.get(lineNum) ?? [];
}

export function getLineWords(lineNum: number): ParsedWord[] {
  return wordsByLine.get(lineNum) ?? [];
}

export function getAllWords(): Map<number, ParsedWord[]> {
  return wordsByLine;
}

export function getParsedFile(): ParsedFile {
  return {
    parsedWords: getAllWords(),
    operatorTokens: getAllOperators(),
    stringRanges: getAllStringRanges(),
    interpolationRanges: getAllInterpolationRanges()
  };
}

export function getLineOperators(lineNum: number): OperatorToken[] {
  return operatorsByLine.get(lineNum) ?? [];
}

export function getAllOperators(): Map<number, OperatorToken[]> {
  return operatorsByLine;
}

export function getLineEndState(lineNum: number): ParserState | undefined {
  return endStateByLine.get(lineNum);
}

export function applyLineChanges(document: TextDocument, startLine: number, endLine: number, lineDelta: number): number {
  const fileKey = resolveFileKey(document.uri);
  if (!fileKey) return 0;
  if (state.fileKey && state.fileKey !== fileKey) {
    return -1;
  }
  if (lineDelta !== 0) {
    shiftLineMap(wordsByLine, startLine, endLine, lineDelta);
    shiftLineMap(stringRangesByLine, startLine, endLine, lineDelta);
    shiftLineMap(interpRangesByLine, startLine, endLine, lineDelta);
    shiftLineMap(blockCommentRangesByLine, startLine, endLine, lineDelta);
    shiftLineMap(operatorsByLine, startLine, endLine, lineDelta);
    shiftLineMap(endStateByLine, startLine, endLine, lineDelta);
  } else {
    wordsByLine.delete(startLine);
    stringRangesByLine.delete(startLine);
    interpRangesByLine.delete(startLine);
    blockCommentRangesByLine.delete(startLine);
    operatorsByLine.delete(startLine);
    endStateByLine.delete(startLine);
  }

  const originalStart = Math.max(0, startLine);
  let currentStart = originalStart;
  if (currentStart > 0 && !endStateByLine.get(currentStart - 1)) {
    resetLineParser(document.uri);
    currentStart = 0;
  }

  let linesParsed = 0;
  for (let lineNum = currentStart; lineNum < document.lineCount; lineNum++) {
    linesParsed++;
    const prevState = endStateByLine.get(lineNum);
    parseLineFromCache(document.lineAt(lineNum).text, lineNum, document.uri);
    const nextState = endStateByLine.get(lineNum);
    if (lineNum >= originalStart && prevState && nextState && statesEqual(prevState, nextState)) {
      return linesParsed;
    }
  }
  return linesParsed;
}

export function parseLine(lineText: string, lineNum: number, uri: Uri): ParsedWord[] {
  const fileKey = resolveFileKey(uri);
  if (!fileKey) return [];
  if (state.fileKey !== fileKey) {
    resetLineParser(uri);
  }

  const result = parseLineWithState(lineText, lineNum, {
    ...state,
    fileKey
  });

  state.fileKey = fileKey;
  state.inBlockComment = result.nextState.inBlockComment;
  state.inString = result.nextState.inString;
  state.inInterpolationString = result.nextState.inInterpolationString;
  state.interpDepth = result.nextState.interpDepth;
  state.parenDepth = result.nextState.parenDepth;
  state.braceDepth = result.nextState.braceDepth;
  state.callStack = [...result.nextState.callStack];
  state.callIndexStack = [...result.nextState.callIndexStack];
  state.paramIndexStack = [...result.nextState.paramIndexStack];
  state.interpParenDepthStack = [...result.nextState.interpParenDepthStack];
  endStateByLine.set(lineNum, cloneParserState(result.nextState));

  if (result.stringRanges.length > 0) stringRangesByLine.set(lineNum, result.stringRanges);
  else stringRangesByLine.delete(lineNum);
  if (result.interpRanges.length > 0) interpRangesByLine.set(lineNum, result.interpRanges);
  else interpRangesByLine.delete(lineNum);
  if (result.blockCommentRanges.length > 0) blockCommentRangesByLine.set(lineNum, result.blockCommentRanges);
  else blockCommentRangesByLine.delete(lineNum);
  if (result.words.length > 0) wordsByLine.set(lineNum, result.words);
  else wordsByLine.delete(lineNum);
  if (result.operators.length > 0) operatorsByLine.set(lineNum, result.operators);
  else operatorsByLine.delete(lineNum);

  return result.words;
}

export function parseLineFromCache(lineText: string, lineNum: number, uri: Uri): ParsedWord[] {
  const fileKey = resolveFileKey(uri);
  if (!fileKey) return [];
  if (state.fileKey !== fileKey) {
    resetLineParser(uri);
  }

  const startState = (lineNum === 0) ? getDefaultState(fileKey, state.isConfig) : endStateByLine.get(lineNum - 1);
  if (!startState) {
    return [];
  }

  const result = parseLineWithState(lineText, lineNum, { ...startState, fileKey });
  if (result.stringRanges.length > 0) stringRangesByLine.set(lineNum, result.stringRanges);
  else stringRangesByLine.delete(lineNum);
  if (result.interpRanges.length > 0) interpRangesByLine.set(lineNum, result.interpRanges);
  else interpRangesByLine.delete(lineNum);
  if (result.blockCommentRanges.length > 0) blockCommentRangesByLine.set(lineNum, result.blockCommentRanges);
  else blockCommentRangesByLine.delete(lineNum);
  if (result.words.length > 0) wordsByLine.set(lineNum, result.words);
  else wordsByLine.delete(lineNum);
  if (result.operators.length > 0) operatorsByLine.set(lineNum, result.operators);
  else operatorsByLine.delete(lineNum);
  endStateByLine.set(lineNum, cloneParserState(result.nextState));
  return result.words;
}

/**
 * Parse a line using the cached state of the previous line without mutating cache state.
 * Useful for transient parsing (ex: completion providers).
 */
export function parseLineWithStateSnapshot(lineText: string, lineNum: number, uri: Uri): ParsedWord[] {
  const fileKey = resolveFileKey(uri);
  if (!fileKey) return [];

  const isConfig = getFileInfo(uri).type !== 'rs2';
  const startState = (lineNum === 0) ? getDefaultState(fileKey, isConfig) : endStateByLine.get(lineNum - 1);
  if (!startState) {
    return [];
  }
  if (startState.fileKey && startState.fileKey !== fileKey) {
    return [];
  }
  const result = parseLineWithState(lineText, lineNum, { ...cloneParserState(startState), fileKey });
  return result.words;
}

export type CallStateSnapshot = {
  callName?: string;
  callNameIndex?: number;
  paramIndex?: number;
  parenDepth: number;
};

/**
 * Parse a line up to a cursor position and return the call state at that position.
 * Useful when the cursor is inside a string and no word is produced.
 */
export function getCallStateAtPosition(lineText: string, lineNum: number, uri: Uri, character: number): CallStateSnapshot | undefined {
  const fileKey = resolveFileKey(uri);
  if (!fileKey) return undefined;

  const isConfig = getFileInfo(uri).type !== 'rs2';
  const startState = (lineNum === 0) ? getDefaultState(fileKey, isConfig) : endStateByLine.get(lineNum - 1);
  if (!startState) {
    return undefined;
  }
  if (startState.fileKey && startState.fileKey !== fileKey) {
    return undefined;
  }

  const clampedChar = Math.max(0, Math.min(character, lineText.length));
  const result = parseLineWithState(lineText.slice(0, clampedChar), lineNum, { ...cloneParserState(startState), fileKey });
  const callStack = result.nextState.callStack;
  const callIndexStack = result.nextState.callIndexStack;
  const paramIndexStack = result.nextState.paramIndexStack;
  return {
    callName: callStack[callStack.length - 1],
    callNameIndex: callIndexStack[callIndexStack.length - 1],
    paramIndex: paramIndexStack[paramIndexStack.length - 1],
    parenDepth: result.nextState.parenDepth
  };
}

function parseLineWithState(lineText: string, _lineNum: number, startState: ParserState): LineParseStateResult {
  if (lineText.startsWith("text=") || lineText.startsWith("activetext=")) {
    return { words: [], operators: [], stringRanges: [], interpRanges: [], blockCommentRanges: [], nextState: cloneParserState(startState) };
  }
  const words: ParsedWord[] = [];
  const operators: OperatorToken[] = [];
  const stringRanges: Range[] = [];
  const interpRanges: Range[] = [];
  const blockCommentRanges: Range[] = [];
  const nextState = cloneParserState(startState);

  let parenDepth = nextState.parenDepth;
  let braceDepth = nextState.braceDepth;
  const callStack = nextState.callStack;
  const callIndexStack = nextState.callIndexStack;
  const paramIndexStack = nextState.paramIndexStack;
  const interpParenDepthStack = nextState.interpParenDepthStack;
  let lastWordValue: string | undefined;
  let lastWordIndex: number | undefined;
  let wordStart = -1;
  let wordHasColon = false;
  let wordParenDepth = 0;
  let wordBraceDepth = 0;
  let wordInInterpolation = false;
  let wordCallName: string | undefined;
  let wordCallNameIndex: number | undefined;
  let wordParamIndex: number | undefined;
  let wordConfigKey: string | undefined;
  let configKeyValue: string | undefined;
  let configKeyIndex: number | undefined;
  let configParamIndex = 0;
  let inConfigValue = false;

  let stringStart: number | undefined = nextState.inString ? 0 : undefined;
  let stringWordStart: number | undefined;
  let stringWordCallName: string | undefined;
  let stringWordCallNameIndex: number | undefined;
  let stringWordParamIndex: number | undefined;
  let stringHadInterpolation = false;
  const interpStartStack: number[] = [];
  let blockStart: number | undefined = nextState.inBlockComment ? 0 : undefined;

  const finalizeWord = (endIndex: number) => {
    if (wordStart < 0 || endIndex < wordStart) {
      wordStart = -1;
      wordHasColon = false;
      wordCallName = undefined;
      wordCallNameIndex = undefined;
      wordParamIndex = undefined;
      return;
    }
    const value = lineText.slice(wordStart, endIndex + 1);
    const index = words.length;
    words.push({
      value,
      start: wordStart,
      end: endIndex,
      index,
      inString: false,
      inInterpolation: wordInInterpolation,
      parenDepth: wordParenDepth,
      braceDepth: wordBraceDepth,
      callName: wordCallName,
      callNameIndex: wordCallNameIndex,
      paramIndex: wordParamIndex,
      configKey: wordConfigKey
    });
    lastWordValue = value;
    lastWordIndex = index;
    wordStart = -1;
    wordHasColon = false;
    wordCallName = undefined;
    wordCallNameIndex = undefined;
    wordParamIndex = undefined;
    wordConfigKey = undefined;
  };

  const isWordChar = (ch: string) => /[A-Za-z0-9_+\-\.]/.test(ch);
  const canStartWord = (ch: string, next: string) =>
    /[A-Za-z0-9_]/.test(ch) || ((ch === '.' || ch === '+') && /[A-Za-z0-9_]/.test(next));
  const addOperator = (op: string, index: number) => {
    operators.push({ token: op, index, parenDepth });
  };

  for (let i = 0; i < lineText.length; i++) {
    const ch = lineText[i]!;
    const next = lineText[i + 1] ?? '';

    if (nextState.inBlockComment) {
      if (ch === '*' && next === '/') {
        const end = i + 1;
        blockCommentRanges.push({ start: blockStart ?? 0, end });
        blockStart = undefined;
        nextState.inBlockComment = false;
        i++;
      }
      continue;
    }

    if (!nextState.inString && ch === '/' && next === '/') {
      finalizeWord(i - 1);
      break;
    }

    if (!nextState.inString && ch === '/' && next === '*') {
      finalizeWord(i - 1);
      nextState.inBlockComment = true;
      blockStart = i;
      i++;
      continue;
    }

    if (nextState.inString && nextState.interpDepth > 0 && ch === '"') {
      nextState.inInterpolationString = !nextState.inInterpolationString;
      if (nextState.inInterpolationString) {
        stringStart = i;
      } else if (stringStart !== undefined) {
        stringRanges.push({ start: stringStart, end: i });
        stringStart = undefined;
      }
      continue;
    }

    if (!nextState.inInterpolationString && ch === '"') {
      finalizeWord(i - 1);
      if (nextState.inString) {
        if (stringStart !== undefined) {
          stringRanges.push({ start: stringStart, end: i });
          stringStart = undefined;
        }
        if (!startState.isConfig && stringWordStart !== undefined && !stringHadInterpolation) {
          const contentStart = stringWordStart;
          const contentEnd = i - 1;
          if (contentEnd >= contentStart) {
            const value = lineText.slice(contentStart, i);
            const index = words.length;
            words.push({
              value,
              start: contentStart,
              end: contentEnd,
              index,
              inString: true,
              inInterpolation: false,
              parenDepth,
              braceDepth,
              callName: stringWordCallName,
              callNameIndex: stringWordCallNameIndex,
              paramIndex: stringWordParamIndex,
              configKey: undefined
            });
          }
        }
        nextState.inString = false;
        stringWordStart = undefined;
        stringWordCallName = undefined;
        stringWordCallNameIndex = undefined;
        stringWordParamIndex = undefined;
        stringHadInterpolation = false;
      } else {
        nextState.inString = true;
        stringStart = i;
        if (!startState.isConfig) {
          stringWordStart = i + 1;
          stringHadInterpolation = false;
          if (parenDepth > 0) {
            stringWordCallName = callStack[callStack.length - 1];
            stringWordCallNameIndex = callIndexStack[callIndexStack.length - 1];
            stringWordParamIndex = paramIndexStack[paramIndexStack.length - 1];
          } else {
            stringWordCallName = undefined;
            stringWordCallNameIndex = undefined;
            stringWordParamIndex = undefined;
          }
        }
      }
      continue;
    }

    if (nextState.inString && !nextState.inInterpolationString && ch === '<') {
      finalizeWord(i - 1);
      if (!startState.isConfig) stringHadInterpolation = true;
      interpStartStack.push(i);
      nextState.interpDepth++;
      interpParenDepthStack.push(parenDepth);
      continue;
    }
    if (nextState.inString && !nextState.inInterpolationString && nextState.interpDepth > 0 && ch === '>') {
      finalizeWord(i - 1);
      const interpStart = interpStartStack.pop();
      if (interpStart !== undefined) interpRanges.push({ start: interpStart, end: i });
      nextState.interpDepth = Math.max(0, nextState.interpDepth - 1);
      interpParenDepthStack.pop();
      continue;
    }

    const inInterpolationCode = nextState.interpDepth > 0 && !nextState.inInterpolationString;
    const inCode = !nextState.inString || inInterpolationCode;
    if (!inCode) {
      continue;
    }

    if (ch === '{') {
      finalizeWord(i - 1);
      braceDepth++;
      continue;
    }
    if (ch === '}') {
      finalizeWord(i - 1);
      braceDepth = Math.max(0, braceDepth - 1);
      continue;
    }

    if (!startState.isConfig && (ch === '<' || ch === '>')) {
      if (next === '=') {
        finalizeWord(i - 1);
        addOperator(ch + next, i);
        i++;
        continue;
      }
      finalizeWord(i - 1);
      addOperator(ch, i);
      continue;
    }
    if (!startState.isConfig && ch === '=') {
      if (next === '=') {
        i++;
        continue;
      }
      finalizeWord(i - 1);
      addOperator(ch, i);
      continue;
    }
    if (!startState.isConfig && ch === '!') {
      if (next === '=') {
        i++;
        continue;
      }
      finalizeWord(i - 1);
      addOperator(ch, i);
      continue;
    }
    if (!startState.isConfig && ch === '&') {
      if (next === '&') {
        i++;
        continue;
      }
      finalizeWord(i - 1);
      addOperator(ch, i);
      continue;
    }
    if (!startState.isConfig && ch === '|') {
      if (next === '|') {
        i++;
        continue;
      }
      finalizeWord(i - 1);
      addOperator(ch, i);
      continue;
    }

    if (wordStart < 0) {
      const exceptionLength = matchLongestException(lineText, i);
      if (exceptionLength > 0) {
        wordStart = i;
        wordParenDepth = parenDepth;
        wordBraceDepth = braceDepth;
        wordInInterpolation = nextState.interpDepth > 0;
        if (startState.isConfig && inConfigValue) {
          wordConfigKey = configKeyValue;
          wordCallNameIndex = configKeyIndex;
          wordParamIndex = configParamIndex;
        } else {
          wordCallName = parenDepth > 0 ? callStack[callStack.length - 1] : undefined;
          wordParamIndex = parenDepth > 0 ? paramIndexStack[paramIndexStack.length - 1] : undefined;
        }
        finalizeWord(i + exceptionLength - 1);
        i += exceptionLength - 1;
        continue;
      }
    }

    if (startState.isConfig && ch === '=' && !nextState.inString && !nextState.inInterpolationString) {
      finalizeWord(i - 1);
      configKeyValue = lastWordValue;
      configKeyIndex = lastWordIndex;
      configParamIndex = 0;
      inConfigValue = true;
      continue;
    }
    if (startState.isConfig && inConfigValue && ch === ',' && !nextState.inString && !nextState.inInterpolationString) {
      finalizeWord(i - 1);
      configParamIndex++;
      continue;
    }

    if (ch === '(') {
      finalizeWord(i - 1);
      if (lastWordValue) {
        callStack.push(lastWordValue);
        if (lastWordIndex !== undefined) {
          callIndexStack.push(lastWordIndex);
        } else {
          callIndexStack.push(-1);
        }
      }
      parenDepth++;
      paramIndexStack.push(0);
      continue;
    }
    if (ch === ')') {
      finalizeWord(i - 1);
      parenDepth = Math.max(0, parenDepth - 1);
      callStack.pop();
      callIndexStack.pop();
      paramIndexStack.pop();
      continue;
    }
    if (ch === ',' && parenDepth > 0) {
      if (nextState.inString && inInterpolationCode) {
        const interpParenDepth = interpParenDepthStack[interpParenDepthStack.length - 1] ?? parenDepth;
        if (parenDepth <= interpParenDepth) {
          finalizeWord(i - 1);
          continue;
        }
      } else if (nextState.inString && !inInterpolationCode) {
        continue;
      }
      finalizeWord(i - 1);
      const current = paramIndexStack[paramIndexStack.length - 1] ?? 0;
      paramIndexStack[paramIndexStack.length - 1] = current + 1;
      continue;
    }

    if (wordStart < 0) {
      if (canStartWord(ch, next)) {
        wordStart = i;
        wordParenDepth = parenDepth;
        wordBraceDepth = braceDepth;
        wordInInterpolation = nextState.interpDepth > 0;
        if (startState.isConfig && inConfigValue) {
          wordConfigKey = configKeyValue;
          wordCallNameIndex = configKeyIndex;
          wordParamIndex = configParamIndex;
        } else {
          wordCallName = parenDepth > 0 ? callStack[callStack.length - 1] : undefined;
          wordCallNameIndex = parenDepth > 0 ? callIndexStack[callIndexStack.length - 1] : undefined;
          wordParamIndex = parenDepth > 0 ? paramIndexStack[paramIndexStack.length - 1] : undefined;
        }
      }
      continue;
    }

    if (isWordChar(ch)) {
      continue;
    }
    if (ch === ':' && !wordHasColon && /[A-Za-z0-9_]/.test(next)) {
      wordHasColon = true;
      continue;
    }

    finalizeWord(i - 1);
  }

  finalizeWord(lineText.length - 1);

  if (nextState.inString && stringStart !== undefined && lineText.length > 0) {
    stringRanges.push({ start: stringStart, end: lineText.length - 1 });
  }
  if (nextState.inBlockComment && blockStart !== undefined && lineText.length > 0) {
    blockCommentRanges.push({ start: blockStart, end: lineText.length - 1 });
  }

  nextState.parenDepth = parenDepth;
  nextState.braceDepth = braceDepth;
  return { words, operators, stringRanges, interpRanges, blockCommentRanges, nextState };
}

function statesEqual(a: ParserState, b: ParserState): boolean {
  return a.fileKey === b.fileKey &&
    a.isConfig === b.isConfig &&
    a.inBlockComment === b.inBlockComment &&
    a.inString === b.inString &&
    a.inInterpolationString === b.inInterpolationString &&
    a.interpDepth === b.interpDepth &&
    a.parenDepth === b.parenDepth &&
    a.braceDepth === b.braceDepth &&
    arrayEqual(a.callStack, b.callStack) &&
    arrayEqual(a.callIndexStack, b.callIndexStack) &&
    arrayEqual(a.paramIndexStack, b.paramIndexStack) &&
    arrayEqual(a.interpParenDepthStack, b.interpParenDepthStack);
}

function cloneParserState(state: ParserState): ParserState {
  return {
    fileKey: state.fileKey,
    isConfig: state.isConfig,
    inBlockComment: state.inBlockComment,
    inString: state.inString,
    inInterpolationString: state.inInterpolationString,
    interpDepth: state.interpDepth,
    parenDepth: state.parenDepth,
    braceDepth: state.braceDepth,
    callStack: [...state.callStack],
    callIndexStack: [...state.callIndexStack],
    paramIndexStack: [...state.paramIndexStack],
    interpParenDepthStack: [...state.interpParenDepthStack]
  };
}

function arrayEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function shiftLineMap<T>(map: Map<number, T>, startLine: number, endLine: number, lineDelta: number): void {
  if (lineDelta === 0) return;
  const next = new Map<number, T>();
  for (const [line, value] of map) {
    if (line < startLine) {
      next.set(line, value);
      continue;
    }
    if (line <= endLine) {
      continue;
    }
    const newLine = line + lineDelta;
    if (newLine >= 0) {
      next.set(newLine, value);
    }
  }
  map.clear();
  for (const [line, value] of next) {
    map.set(line, value);
  }
}
