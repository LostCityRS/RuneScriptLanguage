const vscode = require('vscode');
const { END_OF_LINE, END_OF_BLOCK } = require('../enum/regex');

const getLineText = function(input) {
  const endOfLine = END_OF_LINE.exec(input);
  return !endOfLine ? input : input.substring(0, endOfLine.index);
}

const getLines = function(input) {
  return input.split(END_OF_LINE);
}

const skipFirstLine = function(input) {
  const endOfLine = END_OF_LINE.exec(input);
  return !endOfLine ? input : input.substring(endOfLine.index + 1);
}

const getBlockText = function(input) {
  const endOfBlock = END_OF_BLOCK.exec(input);
  return !endOfBlock ? input : input.substring(0, endOfBlock.index);
}

const nthIndexOf = function(input, pattern, n) {
  let i = -1;
  while (n-- > 0 && i++ < input.length) {
    i = input.indexOf(pattern, i);
    if (i < 0) break;
  }
  return i;
}

const truncateMatchingParenthesis = function(str) {
  let truncateIndex = 0;
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    if (str.charAt(i) === '(') count++;
    if (str.charAt(i) === ')' && --count === 0) truncateIndex = i;
  }
  return (truncateIndex > 0) ? str.substring(truncateIndex + 1) : str;
}

function createSearchableString(linkableText, query, filesToInclude, isRegex=false) {
  const searchOptions = JSON.stringify({ query: query, filesToInclude: filesToInclude, isRegex: isRegex});
  return `[${linkableText}](${vscode.Uri.parse(`command:workbench.action.findInFiles?${encodeURIComponent(searchOptions)}`)})`;
}

function countLines(string) {
  let count = 1;
  let chr;
  let i = 0, end = string.length;
  // determine line break type
  for (; i < end; ++i) {
    if (string[i] == '\n' || string[i] == '\r') {
      count = 2;
      chr = string[i];
      break;
    }
  }
  // count line breaks, return early if you encounter an '=' char
  for (++i; i < end; ++i) {
    if (string[i] == chr) {
      ++count;
    }
    if (string[i] === '=') {
      return {line: count, index: i};
    }
  }
  return {line: count, index: i};
}

module.exports = { 
  getLineText, getLines, skipFirstLine, getBlockText, nthIndexOf, truncateMatchingParenthesis, createSearchableString,
  countLines
};
