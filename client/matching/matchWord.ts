import type { Position, TextDocument, Uri } from 'vscode';
import type { MatchContext, Matcher, MatchResult, MatchType } from '../types';
import { getParentDeclaration } from '../cache/identifierCache';
import { CATEGORY, COMPONENT, DBCOLUMN, DBROW, DBTABLE, MODEL, OBJ } from './matchType';
import { getWordAtIndex, getBaseContext } from '../utils/matchUtils';
import { LOC_MODEL_REGEX } from '../enum/regex';
import { packMatcher } from './matchers/packMatcher';
import { regexWordMatcher } from './matchers/regexWordMatcher';
import { commandMatcher } from './matchers/commandMatcher';
import { matchLocalVar } from './matchers/localVarMatcher';
import { prevCharMatcher } from './matchers/prevCharMatcher';
import { triggerMatcher } from './matchers/triggerMatcher';
import { configMatcher } from './matchers/configMatcher';
import { switchCaseMatcher } from './matchers/switchCaseMatcher';
import { parametersMatcher } from './matchers/parametersMatcher';

const matchers: Matcher[] = [
  packMatcher,
  regexWordMatcher,
  commandMatcher,
  matchLocalVar,
  prevCharMatcher,
  triggerMatcher,
  configMatcher,
  switchCaseMatcher,
  parametersMatcher
].slice().sort((a, b) => a.priority - b.priority);

/**
* Match with one word given a vscode document and a vscode position
*/
function matchWordFromDocument(document: TextDocument, position: Position): MatchResult | undefined {
  return matchWord(document.lineAt(position.line).text, position.line, document.uri, position.character);
}

/**
* Match with one word given a line of text and an index position
*/
function matchWord(lineText: string, lineNum: number, uri: Uri, index: number): MatchResult | undefined {
  if (!lineText || !uri || index === undefined) {
    return undefined;
  }
  const context = getBaseContext(lineText, lineNum, uri);
  const word = getWordAtIndex(context.words, index);
  if (!word) {
    return undefined;
  }
  const wordContext: MatchContext = {
    ...context,
    word: word,
    lineIndex: index,
    prevWord: (word.index === 0) ? undefined : context.words[word.index - 1],
    prevChar: lineText.charAt(word.start - 1),
    nextChar: lineText.charAt(word.end + 1),
  };
  return match(wordContext);
}

/**
* Match with all words given a line of text
*/
function matchWords(lineText: string, lineNum: number, uri: Uri): (MatchResult | undefined)[] {
  if (!lineText || !uri) {
    return [];
  }
  const context = getBaseContext(lineText, lineNum, uri);
  const matches: (MatchResult | undefined)[] = [];
  for (let i = 0; i < context.words.length; i++) {
    const wordContext: MatchContext = {
      ...context,
      word: context.words[i],
      lineIndex: context.words[i].start,
      prevWord: (i === 0) ? undefined : context.words[i-1],
      prevChar: lineText.charAt(context.words[i].start - 1),
      nextChar: lineText.charAt(context.words[i].end + 1),
    };
    matches.push(match(wordContext));
  }
  return matches;
}

/**
* Iterates thru all matchers to try to find a match, short circuits early if a match is made
*/
function match(context: MatchContext): MatchResult | undefined {
  if (!context.word || context.word.value === 'null') {
    return response();
  }

  for (const matcher of matchers) {
    let match = matcher.fn(context);
    if (match) {
      return response(match, context);
    }
  }
  return response();
}

/**
* Build the response object for a match response
*/
function response(match?: MatchType, context?: MatchContext): MatchResult | undefined {
  if (!match || !context) {
    return undefined;
  }
  if (match.id === COMPONENT.id && !context.word.value.includes(':')) {
    context.word.value = `${context.file.name}:${context.word.value}`;
    context.modifiedWord = true;
  }
  if (match.id === DBCOLUMN.id && !context.word.value.includes(':')) {
    const requiredType = context.file.type === 'dbtable' ? DBTABLE.id : DBROW.id;
    const iden = getParentDeclaration(context.uri, context.line.number, requiredType);
    if (!iden) {
      return undefined;
    }
    const tableName = (context.file.type === 'dbrow') ? iden.extraData?.table : iden.name;
    context.word.value = `${tableName}:${context.word.value}`;
    context.modifiedWord = true;
  }
  if (match.id === OBJ.id && context.word.value.startsWith('cert_')) {
    context.word.value = context.word.value.substring(5);
    context.word.start = context.word.start + 5;
    context.originalPrefix = 'cert_';
    context.cert = true;
    context.modifiedWord = true;
  }
  if (match.id === CATEGORY.id && context.word.value.startsWith('_')) {
    context.word.value = context.word.value.substring(1);
    context.word.start = context.word.start + 1;
    context.originalPrefix = '_';
    context.modifiedWord = true;
  }
  // If model match type, determine if it is a loc model and if so remove the suffix part (_0 or _q, etc...)
  if (match.id === MODEL.id && LOC_MODEL_REGEX.test(context.word.value)) {
    const lastUnderscore = context.word.value.lastIndexOf("_");
    context.originalSuffix = context.word.value.slice(lastUnderscore);
    context.word.value = context.word.value.slice(0, lastUnderscore);
    context.modifiedWord = true;
  }
  return { matchType: match, word: context.word.value, context: context };
}

export { matchWord, matchWords, matchWordFromDocument };
