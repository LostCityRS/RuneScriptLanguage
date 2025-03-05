const matchType = require('../matchType');
const identifierCache = require('../../cache/identifierCache');
const returnBlockLinesCache = require('../../cache/returnBlockLinesCache');
const { getWordAtIndex, reference } = require('../../utils/matchUtils');

/**
 * Looks for matches of values inside of parenthesis
 * This includes return statement params, engine command parameters, proc parameters, label parameters, and queue parameters
 */ 
function parametersMatcher(context) {
  if (context.file.type !== 'rs2') {
    return null;
  }
  const paramsIdentifier = getParamsMatch(context);
  return (paramsIdentifier) ? paramsIdentifier.match : null;
}

// Checks if the index location of a line of code is within the parenthesis of an identifier
// If it is, it returns which param index the cursor is at, the match type of that param, and the parent identifier itself
function getParamsMatch(context) {
  const { identifierName, paramIndex } = parseForIdentifierNameAndParamIndex(context.line.text, context.lineIndex, context.words);
  if (!identifierName) {
    return null;
  }
  const name = identifierName.value;
  const prev = context.line.text.charAt(identifierName.start - 1);

  if (name === 'return') {
    const blockIdentifierKey = returnBlockLinesCache.get(context.line.number, context.uri);
    if (blockIdentifierKey) {
      const iden = identifierCache.getByKey(blockIdentifierKey);
      if (iden && iden.signature && iden.signature.returns.length > paramIndex) {
        return {identifier: iden, index: paramIndex, match: reference(matchType[iden.signature.returns[paramIndex]]), isReturns: true};
      }
    }
    return null;
  } 
  
  let iden;
  let indexOffset = 0;
  let dynamicCommand;
  if (name === 'queue') {
    indexOffset = 2;
    if (paramIndex < indexOffset) {
      iden = identifierCache.get(name, matchType.COMMAND);
      indexOffset = 0;
    } else {
      const queueName = getWordAtIndex(context.words, identifierName.end + 2);
      iden = (queueName) ? identifierCache.get(queueName.value, matchType.QUEUE) : null;
      dynamicCommand = name;
    }
  } else if (name === 'longqueue') {
    indexOffset = 3;
    if (paramIndex < indexOffset) {
      iden = identifierCache.get(name, matchType.COMMAND);
      indexOffset = 0;
    } else {
      const queueName = getWordAtIndex(context.words, identifierName.end + 2);
      iden = (queueName) ? identifierCache.get(queueName.value, matchType.QUEUE) : null;
      dynamicCommand = name;
    }
  } else if (prev === '@') {
    iden = identifierCache.get(name, matchType.LABEL);
  } else if (prev === '~') {
    iden = identifierCache.get(name, matchType.PROC);
  } else {
    iden = identifierCache.get(name, matchType.COMMAND);
  }
  if (!iden) {
    return null;
  }
  const response = {identifier: iden, index: paramIndex, isReturns: false, dynamicCommand: dynamicCommand};
   if (iden.signature && iden.signature.params.length > (paramIndex - indexOffset)) {
    response.match = reference(matchType[iden.signature.params[(paramIndex - indexOffset)].matchTypeId]);
  }
  return response;
}

// Determines if we are inside of an identifiers parenthesis, and returns which param index it is if we are
// Scans the characters from the cursor index to the begining of the code
function parseForIdentifierNameAndParamIndex(lineText, index, words) {
  const init = initializeString(lineText, index);
  lineText = init.interpolatedText || lineText;
  let isInString = init.isInString;
  let isInInterpolated = 0;
  let isInParams = 0;
  let paramIndex = 0;
  for (let i = index; i >= 0; i--) {
    const char = lineText.charAt(i);

    // Handle interpolated code inside of strings, and nested interpolated code
    if (char === '>') isInInterpolated++;
    if (isInInterpolated > 0) {
      if (char === '<') isInInterpolated--;
      continue;
    }

    // Handle strings and escaped quotes within strings
    if (isInString) {
      if (char === '"' && i > 0 && lineText.charAt(i - 1) !== '\\') isInString = false;
      continue;
    }
    else if (char === '"' && i > 0 && lineText.charAt(i - 1) !== '\\') {
      isInString = true;
      continue;
    }

    // Handle nested parenthesis
    if (char === ')') isInParams++;
    if (isInParams > 0) {
      if (char === '(') isInParams--;
      continue;
    }

    // === Code below is only reached when not inside a string, interpolated code, or nested params ===
    
    // Increase param index when a comma is found
    if (char === ',') {
      paramIndex++;
    } 
    // Reached the end of interpolated code without finding a match, exit early with null response
    if (char === '<') { 
      return {identifierName: null, paramIndex: null};
    }
    // Found an opening parenthesis which marks the end of our search, return the previous word (the identifier name)
    if (char === '(') {
      return {identifierName: getWordAtIndex(words, i - 2), paramIndex: paramIndex};
    }
  }
  return {identifierName: null, paramIndex: null};
}

// Determines if we are currently inside of a string, and if we are inside of interpolated code
// Scans the characters from the cursor index to the end of the line of code
function initializeString(lineText, index) {
  let quoteCount = 0;
  let interpolatedCount = 0;
  for (let i = index; i < lineText.length; i++) {
    if (lineText.charAt(i) === '"' && i > 0 && lineText.charAt(i - 1) !== '\\') {
      quoteCount++;
    }
    if (lineText.charAt(i) === '>') {
      if (interpolatedCount === 0) {
        return { interpolatedText: lineText.substring(0, i - 1), isInString: quoteCount % 2 === 1 };
      }
      interpolatedCount--;
    }
    if (lineText.charAt(i) === '<') {
      interpolatedCount++;
    }
  }
  return { isInString: quoteCount % 2 === 1 };
}

module.exports = { parametersMatcher, getParamsMatch };
