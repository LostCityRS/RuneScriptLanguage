import type { MatchContext, MatchType, Matcher } from '../../types';
import { COLOR_REGEX, COORD_REGEX, NUMBER_REGEX } from "../../enum/regex";
import { COLOR, COORDINATES, NUMBER } from "../matchType";
import { reference } from "../../utils/matchUtils";

/**
* Looks for matches with direct word regex checks, such as for coordinates
*/
function regexWordMatcherFn(context: MatchContext): MatchType | undefined {
  const word = context.word.value;
  if (COORD_REGEX.test(word)) {
    return reference(COORDINATES);
  }
  if (COLOR_REGEX.test(word)) {
    return reference(COLOR);
  }
  if (NUMBER_REGEX.test(word)) {
    return reference(NUMBER);
  }
}

export const regexWordMatcher: Matcher = { priority: 2000, fn: regexWordMatcherFn };
