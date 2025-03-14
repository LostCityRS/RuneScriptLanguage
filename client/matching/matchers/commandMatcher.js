const identifierCache = require("../../cache/identifierCache");
const matchType = require("../matchType");
const { reference, declaration } = require("../../utils/matchUtils");
const { TRIGGER_LINE } = require("../../enum/regex");

/**
 * Looks for matches of known engine commands
 */ 
function commandMatcher(context) {
  const command = identifierCache.get(context.word.value, matchType.COMMAND);
  if (command) {
    if (context.uri.fsPath.includes("engine.rs2") && TRIGGER_LINE.test(context.line.text) && context.word.index === 1) {
      return declaration(matchType.COMMAND);
    }
    if (command.signature.params.length > 0 && context.nextChar !== '('){
      return null;
    } 
    return reference(matchType.COMMAND);
  }
}

module.exports = commandMatcher;
