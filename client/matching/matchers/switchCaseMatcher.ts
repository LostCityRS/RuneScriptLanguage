import type { MatchContext, MatchType, Matcher } from '../../types';
import { SWITCH_CASE_REGEX } from "../../enum/regex";
import { UNKNOWN, getMatchTypeById } from "../matchType";
import { reference } from "../../utils/matchUtils";
import { switchStmtLinesCache } from "../../cache/switchStmtLinesCache";

/**
* Looks for matches in case statements
*/
function switchCaseMatcherFn(context: MatchContext): MatchType | undefined {
  if (context.file.type === 'rs2' && context.word.index > 0 && context.word.value !== 'default' &&
  SWITCH_CASE_REGEX.test(context.line.text) && context.lineIndex < context.line.text.indexOf(' :')) {
    const matchTypeId = switchStmtLinesCache.get(context.line.number, context.uri);
    const resolved = matchTypeId ? getMatchTypeById(matchTypeId) : undefined;
    return resolved ? reference(resolved) : UNKNOWN;
  }
}

export const switchCaseMatcher: Matcher = { priority: 8000, fn: switchCaseMatcherFn };
