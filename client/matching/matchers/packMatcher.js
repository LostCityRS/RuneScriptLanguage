const { reference } = require("../../utils/matchUtils");
const dataTypeToMatchId = require("../../resource/dataTypeToMatchId");
const matchType = require("../matchType");

/**
 * Looks for matches in pack files
 */ 
function packMatcher(context) {
  if (context.file.type === 'pack' && context.word.index === 1) {
    let match;
    if (matchType.GLOBAL_VAR.fileTypes.includes(context.file.name)) {
      match = matchType.GLOBAL_VAR;
    } else if(context.file.name === 'interface' && context.word.value.includes(':')) {
      match = matchType.COMPONENT;
    } else {
      match = matchType[dataTypeToMatchId(context.file.name)];
    }
    if (match.id !== matchType.UNKNOWN.id) {
      context.packId = context.words[0].value;
    }
    return reference(match);
  }
}

module.exports = packMatcher;
