const matchType = require("../matchType");
const { reference, declaration } = require("../../utils/matchUtils");

/**
 * Looks for matches of local variables
 */ 
function matchLocalVar(context) {
  if (context.prevChar === '$') {
    let prevWord = context.prevWord;
    if (!prevWord) {
      return reference(matchType.LOCAL_VAR);
    }
    prevWord = prevWord.value;
    if (prevWord.startsWith("def_")) {
      prevWord = prevWord.substr(4);
    }
    const defKeyword = "\\b(int|string|boolean|seq|locshape|component|idk|midi|npc_mode|namedobj|synth|stat|npc_stat|fontmetrics|enum|loc|model|npc|obj|player_uid|spotanim|npc_uid|inv|category|struct|dbrow|interface|dbtable|coord|mesanim|param|queue|weakqueue|timer|softtimer|char|dbcolumn|proc|label)\\b";
    const match = prevWord.match(new RegExp(defKeyword));
    return !match ? reference(matchType.LOCAL_VAR) : declaration(matchType.LOCAL_VAR);
  }
}

module.exports = matchLocalVar;
