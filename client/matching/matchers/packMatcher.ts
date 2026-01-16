import type { MatchContext, MatchType, Matcher } from '../../types';
import { reference } from "../../utils/matchUtils";
import { dataTypeToMatchId } from "../../resource/dataTypeToMatchId";
import { COMPONENT, GLOBAL_VAR, UNKNOWN, getMatchTypeById } from "../matchType";

/**
* Looks for matches in pack files
*/
function packMatcherFn(context: MatchContext): MatchType | undefined {
  if (context.file.type === 'pack' && context.word.index === 1) {
    let match: MatchType;
    if (GLOBAL_VAR.fileTypes?.includes(context.file.name)) {
      match = GLOBAL_VAR;
    } else if (context.file.name === 'interface' && context.word.value.includes(':')) {
      match = COMPONENT;
    } else {
      match = getMatchTypeById(dataTypeToMatchId(context.file.name)) ?? UNKNOWN;
    }
    if (match.id !== UNKNOWN.id) {
      context.packId = context.words[0].value;
    }
    return reference(match);
  }
}

export const packMatcher: Matcher = { priority: 1000, fn: packMatcherFn };
