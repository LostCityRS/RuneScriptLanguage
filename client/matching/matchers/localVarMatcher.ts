import type { MatchContext, MatchType, Matcher } from '../../types';
import { LOCAL_VAR } from "../matchType";
import { reference, declaration } from "../../utils/matchUtils";

/**
* Looks for matches of local variables
*/
function matchLocalVarFn(context: MatchContext): MatchType | undefined {
  if (context.prevChar === '$') {
    let prevWord = context.prevWord;
    if (!prevWord) {
      return reference(LOCAL_VAR);
    }
    let prevWordValue = prevWord.value;
    if (prevWordValue.startsWith("def_")) {
      prevWordValue = prevWordValue.substring(4);
    }
    const defKeyword = "\\b(int|string|boolean|seq|locshape|component|idk|midi|npc_mode|namedobj|synth|stat|npc_stat|fontmetrics|enum|loc|model|npc|obj|player_uid|spotanim|npc_uid|inv|category|struct|dbrow|interface|dbtable|coord|mesanim|param|queue|weakqueue|timer|softtimer|char|dbcolumn|proc|label)\\b";
    const match = prevWordValue.match(new RegExp(defKeyword));
    return !match ? reference(LOCAL_VAR) : declaration(LOCAL_VAR);
  }
}

export const matchLocalVar: Matcher = { priority: 4000, fn: matchLocalVarFn };
