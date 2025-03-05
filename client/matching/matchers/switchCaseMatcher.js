const { SWITCH_CASE } = require("../../enum/regex");
const matchType = require("../matchType");
const { reference } = require("../../utils/matchUtils");
const switchStmtLinesCache = require("../../cache/switchStmtLinesCache");

/**
 * Looks for matches in case statements
 */ 
function switchCaseMatcher(context) {
  if (context.file.type === 'rs2' && context.word.index > 0 && context.word.value !== 'default' &&
      SWITCH_CASE.test(context.line.text) && context.lineIndex < context.line.text.indexOf(' :')) {
    const matchTypeId = switchStmtLinesCache.get(context.line.number, context.uri);
    return matchTypeId ? reference(matchType[matchTypeId]) : matchType.UNKNOWN;
  }
}

module.exports = switchCaseMatcher;
