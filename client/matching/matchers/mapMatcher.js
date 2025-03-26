const mapLinesCache = require("../../cache/mapLinesCache");
const regex = require("../../enum/regex");
const dataTypeToMatchId = require("../../resource/dataTypeToMatchId");
const { reference } = require("../../utils/matchUtils");
const matchType = require("../matchType");

const reservedWords = ['OBJ', 'LOC', 'NPC'];

/**
 * Looks for matches in map files
 */ 
function mapMatcher(context) {
  if (context.file.type === 'jm2') {
    if (/^\w?\d+$/.test(context.word.value)) {
      return matchType.UNKNOWN;
    }
    if (reservedWords.includes(context.word.value)) {
      return matchType.UNKNOWN;
    }
    let matchTypeId = mapLinesCache.get(context.line.number, context.uri);
    return (matchTypeId) ? reference(matchType[dataTypeToMatchId(matchTypeId.toLowerCase())]) : matchType.UNKNOWN;
  }
}

module.exports = mapMatcher;
