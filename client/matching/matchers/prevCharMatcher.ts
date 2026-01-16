import type { MatchContext, MatchType, Matcher } from '../../types';
import { CONSTANT, GLOBAL_VAR, LABEL, MESANIM, PROC } from "../matchType";
import { reference, declaration } from "../../utils/matchUtils";

/**
* Looks for matches based on the previous character, such as ~WORD indicates a proc reference
*/
function prevCharMatcherFn(context: MatchContext): MatchType | undefined {
  switch (context.prevChar) {
    case '^': return (context.file.type === "constant") ? declaration(CONSTANT) : reference(CONSTANT);
    case '%': return reference(GLOBAL_VAR);
    case '@': return (context.nextChar === '@') ? undefined : reference(LABEL);
    case '~': return reference(PROC);
    case ',': return (context.prevWord && context.prevWord.value === "p") ? reference(MESANIM) : undefined;
    default: return undefined;
  }
}

export const prevCharMatcher: Matcher = { priority: 5000, fn: prevCharMatcherFn };
