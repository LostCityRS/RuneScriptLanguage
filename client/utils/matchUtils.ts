import type { Uri } from 'vscode';
import type { MatchType, BaseContext, Word } from '../types';
import { WORD_REGEX } from '../enum/regex';

export function getWords(lineText: string, wordPattern: RegExp = WORD_REGEX): Word[] {
  return [...lineText.matchAll(wordPattern)].map((wordMatch, index) => {
    return { value: wordMatch[0]!, start: wordMatch.index!, end: wordMatch.index! + wordMatch[0]!.length - 1, index };
  });
}

export function getWordAtIndex(words: Word[], index: number): Word | undefined {
  if (words.length < 1) return undefined;
  let prev: Word | undefined;
  for (let i = words.length - 1; i >= 0; i--) {
    if (index <= words[i].end) prev = words[i];
    else break;
  }
  return (prev && prev.start <= index && prev.end >= index) ? prev : undefined;
}

export function expandCsvKeyObject<T>(obj: Record<string, T>): Record<string, T> {
  let keys = Object.keys(obj);
  for (let i = 0; i < keys.length; ++i) {
    let key = keys[i];
    let subkeys = key.split(/,\s?/);
    let target = obj[key];
    delete obj[key];
    subkeys.forEach(k => obj[k] = target);
  }
  return obj;
}

/**
* Context items shared by both matchWord and matchWords
*/
export function getBaseContext(lineText: string, lineNum: number, uri: Uri): BaseContext {
  lineText = lineText.split('//')[0]!; // Ignore anything after a comment
  const words = getWords(lineText);
  const fileSplit = uri.fsPath.split('\\').pop()!.split('/').pop()!.split('.');
  return {
    words: words,
    uri: uri,
    line: { text: lineText, number: lineNum },
    file: { name: fileSplit[0]!, type: fileSplit[1]! },
  };
}

export function reference(type: MatchType, extraData?: Record<string, any>): MatchType & { declaration: false } {
  return (extraData) ? { ...type, extraData: extraData, declaration: false } : { ...type, declaration: false };
}

export function declaration(type: MatchType, extraData?: Record<string, any>): MatchType & { declaration: true } {
  return (extraData) ? { ...type, extraData: extraData, declaration: true } : { ...type, declaration: true };
}
