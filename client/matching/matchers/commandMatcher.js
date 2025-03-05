const identifierCache = require("../../cache/identifierCache");
const matchType = require("../matchType");
const { reference, declaration } = require("../../utils/matchUtils");

/**
 * Looks for matches of known engine commands
 */ 
function commandMatcher(context) {
  const command = identifierCache.get(context.word.value, matchType.COMMAND);
  if (command && context.prevChar !== '[') {
    if (context.uri.fsPath.includes("engine.rs2")) {
      return declaration(matchType.COMMAND);
    }
    if (command.signature.params.length > 0 && context.nextChar !== '('){
      return null;
    } 
    return reference(matchType.COMMAND);
  }
}

module.exports = commandMatcher;
