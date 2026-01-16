import type { MatchContext, MatchType, Matcher } from '../../types';
import { TRIGGER_LINE_REGEX } from "../../enum/regex";
import { CATEGORY, TRIGGER } from "../matchType";
import { runescriptTrigger } from "../../resource/triggers";
import { reference, declaration } from "../../utils/matchUtils";

/**
* Looks for matches with known runescript triggers, see triggers.ts
*/
function triggerMatcherFn(context: MatchContext): MatchType | undefined {
  if (context.file.type !== 'rs2') {
    return undefined;
  }
  if (TRIGGER_LINE_REGEX.test(context.line.text) && context.word.index <= 1) {
    const trigger = runescriptTrigger[context.words[0].value.toLowerCase()];
    if (trigger) {
      if (context.word.index === 0) {
        return reference(TRIGGER, { triggerName: context.words[1].value });
      }
      if (context.word.value.charAt(0) === '_') {
        return reference(CATEGORY, { matchId: trigger.match.id, categoryName: context.word.value.substring(1) });
      }
      return trigger.declaration ? declaration(trigger.match) : reference(trigger.match);
    }
  }
}

export const triggerMatcher: Matcher = { priority: 6000, fn: triggerMatcherFn };
