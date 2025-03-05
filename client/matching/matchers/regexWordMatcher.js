const { COLOR, COORD, NUMBER } = require("../../enum/regex");
const matchType = require("../matchType");
const { reference } = require("../../utils/matchUtils");

/**
 * Looks for matches with direct word regex checks, such as for coordinates
 */ 
function regexWordMatcher(context) {
  const word = context.word.value;
  if (COORD.test(word)) {
    return reference(matchType.COORDINATES);
  }
  if (COLOR.test(word)) {
    return reference(matchType.COLOR);
  }
  if (NUMBER.test(word)) {
    return reference(matchType.NUMBER);
  }
}

module.exports = regexWordMatcher;
