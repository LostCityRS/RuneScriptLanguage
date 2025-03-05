const { TRIGGER_LINE } = require("../../enum/regex");
const matchType = require("../matchType");
const triggers = require("../../resource/triggers");
const { reference, declaration } = require("../../utils/matchUtils");

/**
 * Looks for matches with known runescript triggers, see triggers.js
 */ 
function triggerMatcher(context) {
  if (context.file.type !== 'rs2') {
    return null;
  }
  if (TRIGGER_LINE.test(context.line.text) && context.word.index <= 1) {
    const trigger = triggers[context.words[0].value.toLowerCase()];
    if (trigger) {
      if (context.word.index === 0) {
        return reference(matchType.TRIGGER, {triggerName: context.words[1].value});
      }
      if (context.word.value.charAt(0) === '_') {
        return reference(matchType.CATEGORY, {matchId: trigger.match.id, categoryName: context.word.value.substring(1)});
      }
      return trigger.declaration ? declaration(trigger.match) : reference(trigger.match);
    }
  }
}

module.exports = triggerMatcher;
