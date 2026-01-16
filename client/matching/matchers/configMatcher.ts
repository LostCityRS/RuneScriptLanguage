import type { MatchContext, MatchType, Matcher, Identifier } from '../../types';
import { CONFIG_DECLARATION_REGEX, CONFIG_LINE_REGEX } from "../../enum/regex";
import { COMPONENT, CONFIG_KEY, DBCOLUMN, DBROW, DBTABLE, ENUM, GLOBAL_VAR, HUNT, IDK, INV, LOC, MESANIM, NPC, OBJ, PARAM, SEQ, SPOTANIM, STRUCT, UNKNOWN, getMatchTypeById } from "../matchType";
import { declaration, reference } from "../../utils/matchUtils";
import { dataTypeToMatchId } from "../../resource/dataTypeToMatchId";
import { configKeys, regexConfigKeys, specialCaseKeys } from "../../resource/configKeys";
import { get as getIdentifier, getParentDeclaration } from '../../cache/identifierCache';

interface ConfigLineMatchResponse {
  key: string;
  match: MatchType;
  params?: string[];
  index?: number;
}

/**
* Looks for matches on config files, both config declarations and config line items
*/
function configMatcherFn(context: MatchContext): MatchType | undefined {
  // Check for config file declarations (i.e. declarations with [NAME])
  if (CONFIG_DECLARATION_REGEX.test(context.line.text)) {
    return declarationMatcher(context);
  }

  // Check if the line we are matching is a config line
  const configMatch = getConfigLineMatch(context);
  return configMatch ? configMatch.match : undefined;
}

function declarationMatcher(context: MatchContext): MatchType | undefined {
  switch (context.file.type) {
    case "varp": case "varbit": case "varn": case "vars": return declaration(GLOBAL_VAR);
    case "obj": return declaration(OBJ);
    case "loc": return declaration(LOC);
    case "npc": return declaration(NPC);
    case "param": return declaration(PARAM);
    case "seq": return declaration(SEQ);
    case "struct": return declaration(STRUCT);
    case "dbrow": return declaration(DBROW);
    case "dbtable": return declaration(DBTABLE);
    case "enum": return declaration(ENUM);
    case "hunt": return declaration(HUNT);
    case "inv": return declaration(INV);
    case "spotanim": return declaration(SPOTANIM);
    case "idk": return declaration(IDK);
    case "mesanim": return declaration(MESANIM);
    case "if": return declaration(COMPONENT);
    default: return undefined;
  }
}

function getConfigLineMatch(context: MatchContext): ConfigLineMatchResponse | undefined {
  if (!CONFIG_LINE_REGEX.test(context.line.text)) return undefined;
  const configKey = context.words[0].value;
  let response: ConfigLineMatchResponse = { key: configKey, match: UNKNOWN };
  // The config key itself is selected, so check if it is a known config key or not (config key with info)
  if (context.word.index === 0) {
    return { ...response, match: reference(CONFIG_KEY) };
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
      if (paramIndex !== undefined) {
        const param = configMatch.params[paramIndex];
        if (param) {
          const resolved = getMatchTypeById(dataTypeToMatchId(param.typeId)) ?? UNKNOWN;
          const match = param.declaration ? declaration(resolved) : reference(resolved);
          return { ...response, match, params: configMatch.params.map(p => p.typeId), index: paramIndex };
        }
      }
    }
  }
  return undefined;
}

function getRegexKey(configKey: string, context: MatchContext) {
  const fileTypeRegexMatchers = regexConfigKeys.get(context.file.type) || [];
  for (let regexKey of fileTypeRegexMatchers) {
    if (regexKey.regex.test(configKey)) {
      return regexKey;
    }
  }
  return undefined;
}

function getParamIndex(context: MatchContext): number | undefined {
  let line = context.line.text;
  let index = 0;
  const split = line.substring(index).split(',');
  for (let i = 0; i < split.length; i++) {
    index += split[i].length + 1;
    if (context.lineIndex < index) {
      return i;
    }
  }
  return undefined;
}

function handleSpecialCases(response: ConfigLineMatchResponse, key: string, context: MatchContext): ConfigLineMatchResponse | undefined {
  switch (key) {
    case 'param': return paramSpecialCase(response, context);
    case 'val': return valSpecialCase(response, context);
    case 'data': return dataSpecialCase(response, context);
    default: return undefined;
  }
}

function paramSpecialCase(response: ConfigLineMatchResponse, context: MatchContext): ConfigLineMatchResponse {
  if (context.word.index === 1) {
    return { ...response, match: reference(PARAM), params: ['param', 'value'], index: 0 };
  }
  if (context.word.index === 2) {
    const paramIdentifier = getIdentifier(context.words[1].value, PARAM) as Identifier | undefined;
    if (paramIdentifier && paramIdentifier.extraData) {
      const resolved = getMatchTypeById(dataTypeToMatchId(paramIdentifier.extraData.dataType!)) ?? UNKNOWN;
      const match = reference(resolved);
      return { ...response, match, params: [paramIdentifier.name, paramIdentifier.extraData.dataType], index: 1 };
    }
  }
  return { ...response, match: UNKNOWN };
}

function valSpecialCase(response: ConfigLineMatchResponse, context: MatchContext): ConfigLineMatchResponse | undefined {
  const enumIdentifier = getParentDeclaration(context.uri, context.line.number) as Identifier | undefined;
  if (enumIdentifier && enumIdentifier.extraData) {
    const params = [enumIdentifier.extraData.inputType!, enumIdentifier.extraData.outputType!];
    const index = getParamIndex(context);
    if (index !== undefined) {
      const resolved = getMatchTypeById(dataTypeToMatchId(params[index])) ?? UNKNOWN;
      const match = reference(resolved);
      return { ...response, match, params, index };
    }
  }
  return { ...response, match: UNKNOWN };
}

function dataSpecialCase(response: ConfigLineMatchResponse, context: MatchContext): ConfigLineMatchResponse {
  if (context.word.index === 1) {
    return { ...response, match: reference(DBCOLUMN), params: ['dbcolumn', 'fields...'], index: 0 };
  }
  if (context.word.index > 1) {
    let colName = context.words[1].value;
    if (context.words[1].value.indexOf(':') < 0) {
      const row = getParentDeclaration(context.uri, context.line.number) as Identifier | undefined;
      if (row?.extraData?.table) {
        colName = `${row.extraData.table}:${context.words[1].value}`;
      }
    }
    const col = getIdentifier(colName, DBCOLUMN) as Identifier | undefined;
    if (col && col.extraData) {
      const params = [col.name, ...col.extraData.dataTypes!];
      const index = getParamIndex(context);
      if (index !== undefined) {
        const resolved = getMatchTypeById(dataTypeToMatchId(params[index])) ?? UNKNOWN;
        const match = reference(resolved);
        return { ...response, match, params, index };
      }
    }
  }
  return { ...response, match: UNKNOWN };
}

export { getConfigLineMatch };
export const configMatcher: Matcher = { priority: 7000, fn: configMatcherFn };
