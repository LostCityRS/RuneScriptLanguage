const { CONFIG_DECLARATION, CONFIG_LINE } = require("../../enum/regex");
const matchType = require("../matchType");
const { declaration, reference } = require("../../utils/matchUtils");
const dataTypeToMatchId = require("../../resource/dataTypeToMatchId");
const { regexConfigKeys, configKeys, specialCaseKeys } = require("../../resource/configKeys");
const identifierCache = require('../../cache/identifierCache');

/**
 * Looks for matches on config files, both config declarations and config line items
 */
function configMatcher(context) {
  // Check for config file declarations (i.e. declarations with [NAME])
  if (CONFIG_DECLARATION.test(context.line.text)) {
    return declarationMatcher(context);
  }

  // Check if the line we are matching is a config line
  const configMatch = getConfigLineMatch(context);
  return configMatch ? configMatch.match : undefined;
}

function declarationMatcher(context) {
  switch (context.file.type) {
    case "varp": case "varn": case "vars": return declaration(matchType.GLOBAL_VAR);
    case "obj": return declaration(matchType.OBJ);
    case "loc": return declaration(matchType.LOC);
    case "npc": return declaration(matchType.NPC);
    case "param": return declaration(matchType.PARAM);
    case "seq": return declaration(matchType.SEQ);
    case "struct": return declaration(matchType.STRUCT);
    case "dbrow": return declaration(matchType.DBROW);
    case "dbtable": return declaration(matchType.DBTABLE);
    case "enum": return declaration(matchType.ENUM);
    case "hunt": return declaration(matchType.HUNT);
    case "inv": return declaration(matchType.INV);
    case "spotanim": return declaration(matchType.SPOTANIM);
    case "idk": return declaration(matchType.IDK);
    case "mesanim": return declaration(matchType.MESANIM);
    case "if": return declaration(matchType.COMPONENT)
  }
}

function getConfigLineMatch(context) {
  if (!CONFIG_LINE.test(context.line.text)) return null;
  const configKey = context.words[0].value;
  let response = {key: configKey};
  // The config key itsself is selected, so check if it is a known config key or not (config key with info)
  if (context.word.index === 0) {
    return {...response, match: reference(matchType.CONFIG_KEY)};
  }
  // Check for special cases that need to be manually handled
  if (specialCaseKeys.includes(configKey)) {
    return handleSpecialCases(response, configKey, context);
  }
  // Otherwise, if the second word is the selected word (word after '=') then handle remaining known keys/regex keys
  if (context.word.index >= 1) {
    const configMatch = configKeys[configKey] || getRegexKey(configKey, context);
    if (configMatch) {
      const paramIndex = getParamIndex(context);
      const param = configMatch.params[paramIndex];
      if (param) {
        const match = (param.declaration) ? declaration(matchType[dataTypeToMatchId(param.typeId)]) : reference(matchType[dataTypeToMatchId(param.typeId)]);
        return {...response, match: match, params: configMatch.params.map(p => p.typeId), index: paramIndex};
      }
    }
  }
  return null;
}

function getRegexKey(configKey, context) {
  for (let regexKey of regexConfigKeys) {
    if (regexKey.fileTypes.includes(context.file.type) && regexKey.regex.test(configKey)) {
      return regexKey;
    }
  }
  return null;
}

function getParamIndex(context) {
  let line = context.line.text;
  let index = 0;
  const split = line.substring(index).split(',');
  for (i = 0; i < split.length; i++) {
    index += split[i].length + 1;
    if (context.lineIndex < index) {
      return i;
    }
  }
  return undefined;
}

function handleSpecialCases(response, key, context) {
  switch (key) {
    case 'param': return paramSpecialCase(response, context);
    case 'val': return valSpecialCase(response, context);
    case 'data': return dataSpecialCase(response, context);
  }
}

function paramSpecialCase(response, context) {
  if (context.word.index === 1) {
    return {...response, match: reference(matchType.PARAM), params: ['param','value'], index: 0};
  }
  if (context.word.index === 2) {
    const paramIdentifier = identifierCache.get(context.words[1].value, matchType.PARAM);
    if (paramIdentifier && paramIdentifier.extraData) {
      const match = reference(matchType[dataTypeToMatchId(paramIdentifier.extraData.dataType)]);
      return {...response, match: match, params: [paramIdentifier.name, paramIdentifier.extraData.dataType], index: 1};
    }
  }
  return {...response, match: matchType.UNKNOWN};
}

function valSpecialCase(response, context) {
  const enumIdentifier = identifierCache.getParentDeclaration(context.uri, context.line.number);
  if (enumIdentifier) {
    response.params = [enumIdentifier.extraData.inputType, enumIdentifier.extraData.outputType];
    response.index = getParamIndex(context);
    response.match = reference(matchType[dataTypeToMatchId(response.params[response.index])]);
    return response;
  }
  return {...response, match: matchType.UNKNOWN};
}

function dataSpecialCase(response, context) {
  if (context.word.index === 1) {
    return {...response, match: reference(matchType.DBCOLUMN), params: ['dbcolumn', 'fields...'], index: 0};
  }
  if (context.word.index > 1) {
    let colName = context.words[1].value;
    if (context.words[1].value.indexOf(':') < 0) {
      const row = identifierCache.getParentDeclaration(context.uri, context.line.number);
      colName = `${row.extraData.table}:${context.words[1].value}`
    }
    const col = identifierCache.get(colName, matchType.DBCOLUMN);
    if (col && col.extraData) {
      response.params = [col.name, ...col.extraData.dataTypes];
      response.index = getParamIndex(context);
      response.match = reference(matchType[dataTypeToMatchId(response.params[response.index])]);
      return response;
    }
  }
  return {...response, match: matchType.UNKNOWN};
}

module.exports = { configMatcher, getConfigLineMatch };
