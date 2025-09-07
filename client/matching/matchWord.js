const matchType = require('./matchType');
const { getWordAtIndex, getBaseContext } = require('../utils/matchUtils');
const { getParentDeclaration } = require('../cache/identifierCache');

// Do not reorder the matchers unless there is a reason to 
// quicker potential matches are processed earlier in order to short circuit faster
const matchers = [
  require('./matchers/packMatcher'),
  require('./matchers/regexWordMatcher'),
  require('./matchers/commandMatcher'),
  require('./matchers/localVarMatcher'),
  require('./matchers/prevCharMatcher'),
  require('./matchers/triggerMatcher'),
  require('./matchers/configMatcher').configMatcher,
  require('./matchers/switchCaseMatcher'),
  require('./matchers/parametersMatcher').parametersMatcher
];

/**
 * Match with one word given a vscode document and a vscode position
 */
function matchWordFromDocument(document, position) {
  return matchWord(document.lineAt(position.line).text, position.line, document.uri, position.character);
}

/**
 * Match with one word given a line of text and an index position
 */
function matchWord(lineText, lineNum, uri, index) {
  if (!lineText || !uri || !index) {
    return undefined;
  }
  const context = getBaseContext(lineText, lineNum, uri);
  const word = getWordAtIndex(context.words, index);
  const wordContext = {
    ...context,
    word: word,
    lineIndex: index,
    prevWord: (word.index === 0) ? undefined : context.words[word.index - 1],
    prevChar: lineText.charAt(word.start - 1),
    nextChar: lineText.charAt(word.end + 1),
  }
  return match(wordContext);
}

/**
 * Match with all words given a line of text
 */
function matchWords(lineText, lineNum, uri) {
  if (!lineText || !uri) {
    return undefined;
  }
  const context = getBaseContext(lineText, lineNum, uri);
  const matches = [];
  for (let i = 0; i < context.words.length; i++) {
    const wordContext = {
      ...context,
      word: context.words[i],
      lineIndex: context.words[i].start,
      prevWord: (i === 0) ? undefined : context.words[i-1],
      prevChar: lineText.charAt(context.words[i].start - 1),
      nextChar: lineText.charAt(context.words[i].end + 1),
    }
    matches.push(match(wordContext));
  }
  return matches;
}

/**
 * Iterates thru all matchers to try to find a match, short circuits early if a match is made  
 */
function match(context) {
  if (!context.word || context.word.value === 'null') { // Also ignore null
    return response(); 
  }

  for (const matcher of matchers) {
    let match = matcher(context);
    if (match) {
      return response(match, context);
    }
  }
  return response();
}

/**
 * Build the response object for a match response
 */ 
function response(match, context) {
  if (!match || !context) {
    return undefined;
  }
  if (match.id === matchType.COMPONENT.id && !context.word.value.includes(':')) {
    context.word.value = `${context.file.name}:${context.word.value}`;
    context.modifiedWord = true;
  }
  if (match.id === matchType.DBCOLUMN.id && !context.word.value.includes(':')) {
    const requiredType = context.file.type === 'dbtable' ? matchType.DBTABLE.id : matchType.DBROW.id;
    const iden = getParentDeclaration(context.uri, context.line.number, requiredType);
    if (!iden) {
      return undefined;
    }
    const tableName = (context.file.type === 'dbrow') ? iden.extraData.table : iden.name;
    context.word.value = `${tableName}:${context.word.value}`;
    context.modifiedWord = true;
  }
  if (match.id === matchType.OBJ.id && context.word.value.startsWith('cert_')) {
    context.word.value = context.word.value.substring(5);
    context.word.start = context.word.start + 5;
    context.originalPrefix = 'cert_';
    context.cert = true;
    context.modifiedWord = true;
  }
  if (match.id === matchType.CATEGORY.id && context.word.value.startsWith('_')) {
    context.word.value = context.word.value.substring(1);
    context.word.start = context.word.start + 1;
    context.originalPrefix = '_';
    context.modifiedWord = true;
  }
  return { match: match, word: context.word.value, context: context };
}

module.exports = { matchWord, matchWords, matchWordFromDocument };
