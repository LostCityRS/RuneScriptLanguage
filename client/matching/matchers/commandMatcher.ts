import type { MatchContext, MatchType, Matcher } from '../../types';
import { get as getIdentifier } from "../../cache/identifierCache";
import { COMMAND } from "../matchType";
import { reference, declaration } from "../../utils/matchUtils";
import { TRIGGER_LINE_REGEX } from "../../enum/regex";

/**
* Looks for matches of known engine commands
*/
const commandMatcherFn = (context: MatchContext): MatchType | undefined => {
  const command = getIdentifier(context.word.value, COMMAND);
  if (command) {
    if (context.uri.fsPath.includes("engine.rs2") && TRIGGER_LINE_REGEX.test(context.line.text) && context.word.index === 1) {
      return declaration(COMMAND);
    }
    if (command.signature && command.signature.params.length > 0 && context.nextChar !== '('){
      return undefined;
    }
    return reference(COMMAND);
  }
}

export const commandMatcher: Matcher = { priority: 3000, fn: commandMatcherFn };
