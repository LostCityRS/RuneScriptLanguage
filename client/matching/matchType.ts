import type { MatchType } from '../types';
import { dataTypePostProcessor, enumPostProcessor, columnPostProcessor, rowPostProcessor, componentPostProcessor,
  fileNamePostProcessor, coordPostProcessor, configKeyPostProcessor, triggerPostProcessor, categoryPostProcessor } from '../resource/postProcessors';
import { CODEBLOCK, INFO, SIGNATURE, TITLE, VALUE } from "../enum/hoverDisplayItems";

const matchTypesById = new Map<string, MatchType>();

function defineMatchType(match: MatchType): MatchType {
  matchTypesById.set(match.id, match);
  return match;
}

export const LOCAL_VAR: MatchType = defineMatchType({
  id: 'LOCAL_VAR', types: [], fileTypes: ['rs2'], cache: false, allowRename: true,
});

export const GLOBAL_VAR: MatchType = defineMatchType({
  id: 'GLOBAL_VAR', types: ['var'], fileTypes: ['varp', 'varbit', 'vars', 'varn'], cache: true, allowRename: true,
  hoverConfig: { declarationItems: [TITLE, INFO], referenceItems: [TITLE, INFO, CODEBLOCK], language: 'varpconfig' },
  postProcessor: dataTypePostProcessor
});

export const CONSTANT: MatchType = defineMatchType({
  id: 'CONSTANT', types: [], fileTypes: ['constant'], cache: true, allowRename: true,
  hoverConfig: { declarationItems: [TITLE, INFO], referenceItems: [TITLE, INFO, CODEBLOCK], language: 'constants', blockSkipLines: 0 },
});

export const LABEL: MatchType = defineMatchType({
  id: 'LABEL', types: ['label'], fileTypes: ['rs2'], cache: true, allowRename: true,
  hoverConfig: { declarationItems: [TITLE, INFO, SIGNATURE], referenceItems: [TITLE, INFO, SIGNATURE] },
});

export const PROC: MatchType = defineMatchType({
  id: 'PROC', types: ['proc'], fileTypes: ['rs2'], cache: true, allowRename: true,
  hoverConfig: { declarationItems: [TITLE, INFO, SIGNATURE], referenceItems: [TITLE, INFO, SIGNATURE] },
});

export const TIMER: MatchType = defineMatchType({
  id: 'TIMER', types: ['timer'], fileTypes: ['rs2'], cache: true, allowRename: true,
  hoverConfig: { declarationItems: [TITLE, INFO, SIGNATURE], referenceItems: [TITLE, INFO, SIGNATURE] },
});

export const SOFTTIMER: MatchType = defineMatchType({
  id: 'SOFTTIMER', types: ['softtimer'], fileTypes: ['rs2'], cache: true, allowRename: true,
  hoverConfig: { declarationItems: [TITLE, INFO, SIGNATURE], referenceItems: [TITLE, INFO, SIGNATURE] },
});

export const QUEUE: MatchType = defineMatchType({
  id: 'QUEUE', types: ['queue'], fileTypes: ['rs2'], cache: true, allowRename: true,
  hoverConfig: { declarationItems: [TITLE, INFO, SIGNATURE], referenceItems: [TITLE, INFO, SIGNATURE] },
});

export const SEQ: MatchType = defineMatchType({
  id: 'SEQ', types: ['seq'], fileTypes: ['seq'], cache: true, allowRename: true,
  hoverConfig: { declarationItems: [TITLE, INFO], referenceItems: [TITLE, INFO], language: 'seqconfig' },
});

export const SPOTANIM: MatchType = defineMatchType({
  id: 'SPOTANIM', types: ['spotanim'], fileTypes: ['spotanim'], cache: true, allowRename: true,
  hoverConfig: { declarationItems: [TITLE, INFO], referenceItems: [TITLE, INFO], language: 'spotanimconfig' },
});

export const HUNT: MatchType = defineMatchType({
  id: 'HUNT', types: ['hunt'], fileTypes: ['hunt'], cache: true, allowRename: true,
  hoverConfig: { declarationItems: [TITLE, INFO], referenceItems: [TITLE, INFO, CODEBLOCK], language: 'huntconfig', configInclusions: ['type'] },
});

export const LOC: MatchType = defineMatchType({
  id: 'LOC', types: ['loc'], fileTypes: ['loc'], cache: true, allowRename: true,
  hoverConfig: { declarationItems: [TITLE, INFO], referenceItems: [TITLE, INFO, CODEBLOCK], language: 'locconfig', configInclusions: ['name', 'desc', 'category'] },
});

export const NPC: MatchType = defineMatchType({
  id: 'NPC', types: ['npc'], fileTypes: ['npc'], cache: true, allowRename: true,
  hoverConfig: { declarationItems: [TITLE, INFO], referenceItems: [TITLE, INFO, CODEBLOCK], language: 'npcconfig', configInclusions: ['name', 'desc', 'category'] },
});

export const OBJ: MatchType = defineMatchType({
  id: 'OBJ', types: ['namedobj', 'obj'], fileTypes: ['obj'], cache: true, allowRename: true,
  hoverConfig: { declarationItems: [TITLE, INFO], referenceItems: [TITLE, INFO, CODEBLOCK], language: 'objconfig', configInclusions: ['name', 'desc', 'category'] },
});

export const INV: MatchType = defineMatchType({
  id: 'INV', types: ['inv'], fileTypes: ['inv'], cache: true, allowRename: true,
  hoverConfig: { declarationItems: [TITLE, INFO], referenceItems: [TITLE, INFO, CODEBLOCK], language: 'invconfig', configInclusions: ['scope', 'size'] },
});

export const ENUM: MatchType = defineMatchType({
  id: 'ENUM', types: ['enum'], fileTypes: ['enum'], cache: true, allowRename: true,
  hoverConfig: { declarationItems: [TITLE, INFO], referenceItems: [TITLE, INFO, CODEBLOCK], language: 'enumconfig', configInclusions: ['inputtype', 'outputtype'] },
  postProcessor: enumPostProcessor
});

export const DBCOLUMN: MatchType = defineMatchType({
  id: 'DBCOLUMN', types: ['dbcolumn'], fileTypes: ['dbtable'], cache: true, allowRename: true,
  hoverConfig: { declarationItems: [TITLE, INFO, CODEBLOCK], referenceItems: [TITLE, INFO, CODEBLOCK], language: 'runescript', blockSkipLines: 0 },
  postProcessor: columnPostProcessor
});

export const DBROW: MatchType = defineMatchType({
  id: 'DBROW', types: ['dbrow'], fileTypes: ['dbrow'], cache: true, allowRename: true,
  hoverConfig: { declarationItems: [TITLE, INFO], referenceItems: [TITLE, INFO, CODEBLOCK], language: 'dbrowconfig', configInclusions: ['table'] },
  postProcessor: rowPostProcessor
});

export const DBTABLE: MatchType = defineMatchType({
  id: 'DBTABLE', types: ['dbtable'], fileTypes: ['dbtable'], cache: true, allowRename: true,
  hoverConfig: { declarationItems: [TITLE, INFO], referenceItems: [TITLE, INFO, CODEBLOCK], language: 'dbtableconfig' },
});

export const INTERFACE: MatchType = defineMatchType({
  id: 'INTERFACE', types: ['interface'], fileTypes: ['if'], cache: true, allowRename: false, referenceOnly: true,
  hoverConfig: { referenceItems: [TITLE, INFO], language: 'interface' },
  postProcessor: fileNamePostProcessor
});

export const COMPONENT: MatchType = defineMatchType({
  id: 'COMPONENT', types: ['component'], fileTypes: ['if'], cache: true, allowRename: true,
  hoverConfig: { declarationItems: [TITLE, INFO], referenceItems: [TITLE, INFO], language: 'interface' },
  postProcessor: componentPostProcessor
});

export const PARAM: MatchType = defineMatchType({
  id: 'PARAM', types: ['param'], fileTypes: ['param'], cache: true, allowRename: true,
  hoverConfig: { declarationItems: [TITLE, INFO], referenceItems: [TITLE, INFO, CODEBLOCK], language: 'paramconfig' },
  postProcessor: dataTypePostProcessor
});

export const COMMAND: MatchType = defineMatchType({
  id: 'COMMAND', types: [], fileTypes: ['rs2'], cache: true, allowRename: false,
  hoverConfig: { declarationItems: [TITLE, INFO, SIGNATURE], referenceItems: [TITLE, INFO, SIGNATURE] },
});

export const SYNTH: MatchType = defineMatchType({
  id: 'SYNTH', types: ['synth'], fileTypes: ['synth'], cache: true, allowRename: true, referenceOnly: true, renameFile: true,
  hoverConfig: { referenceItems: [TITLE, INFO] },
  postProcessor: fileNamePostProcessor
});

export const FRAME: MatchType = defineMatchType({
  id: 'FRAME', types: ['frame'], fileTypes: ['frame'], cache: true, allowRename: true, referenceOnly: true, renameFile: true,
  hoverConfig: { referenceItems: [TITLE, INFO] },
  postProcessor: fileNamePostProcessor
});

export const MODEL: MatchType = defineMatchType({
  id: 'MODEL', types: ['ob2', 'model'], fileTypes: ['ob2'], cache: true, allowRename: true, referenceOnly: true, renameFile: true,
  hoverConfig: { referenceItems: [TITLE, INFO] },
});

export const WALKTRIGGER: MatchType = defineMatchType({
  id: 'WALKTRIGGER', types: ['walktrigger'], fileTypes: ['rs2'], cache: true, allowRename: true,
  hoverConfig: { declarationItems: [TITLE, INFO, SIGNATURE], referenceItems: [TITLE, INFO, SIGNATURE] },
});

export const IDK: MatchType = defineMatchType({
  id: 'IDK', types: ['idk', 'idkit'], fileTypes: ['idk'], cache: true, allowRename: true,
  hoverConfig: { declarationItems: [TITLE, INFO], referenceItems: [TITLE, INFO, CODEBLOCK], language: 'idkconfig' },
});

export const MESANIM: MatchType = defineMatchType({
  id: 'MESANIM', types: ['mesanim'], fileTypes: ['mesanim'], cache: true, allowRename: true,
  hoverConfig: { declarationItems: [TITLE, INFO], referenceItems: [TITLE, INFO], language: 'mesanimconfig' },
});

export const STRUCT: MatchType = defineMatchType({
  id: 'STRUCT', types: ['struct'], fileTypes: ['struct'], cache: true, allowRename: true,
  hoverConfig: { declarationItems: [TITLE, INFO], referenceItems: [TITLE, INFO], language: 'structconfig' },
});

// Hover only match types that are only used for displaying hover displays (no finding references/declarations)
// Useful for terminating word searches early when detected. Postprocessing can be done on these.
// Specify referenceConfig to select which displayItems should be shown on hover.
export const COORDINATES: MatchType = defineMatchType({
  id: 'COORDINATES', types: [], hoverOnly: true, cache: false, allowRename: false,
  hoverConfig: { referenceItems: [TITLE, VALUE] },
  postProcessor: coordPostProcessor
});

export const CONFIG_KEY: MatchType = defineMatchType({
  id: 'CONFIG_KEY', types: [], hoverOnly: true, cache: false, allowRename: false,
  hoverConfig: { referenceItems: [TITLE, INFO] },
  postProcessor: configKeyPostProcessor
});

export const TRIGGER: MatchType = defineMatchType({
  id: 'TRIGGER', types: [], hoverOnly: true, cache: false, allowRename: false,
  hoverConfig: { referenceItems: [TITLE, INFO] },
  postProcessor: triggerPostProcessor
});

export const STAT: MatchType = defineMatchType({
  id: 'STAT', types: ['stat'], hoverOnly: true, cache: false, allowRename: false,
  hoverConfig: { referenceItems: [TITLE] },
});

export const NPC_STAT: MatchType = defineMatchType({
  id: 'NPC_STAT', types: ['npc_stat'], hoverOnly: true, cache: false, allowRename: false,
  hoverConfig: { referenceItems: [TITLE] },
});

export const NPC_MODE: MatchType = defineMatchType({
  id: 'NPC_MODE', types: ['npc_mode'], hoverOnly: true, cache: false, allowRename: false,
  hoverConfig: { referenceItems: [TITLE] },
});

export const LOCSHAPE: MatchType = defineMatchType({
  id: 'LOCSHAPE', types: ['locshape'], hoverOnly: true, cache: false, allowRename: false,
  hoverConfig: { referenceItems: [TITLE] },
});

export const FONTMETRICS: MatchType = defineMatchType({
  id: 'FONTMETRICS', types: ['fontmetrics'], hoverOnly: true, cache: false, allowRename: false,
  hoverConfig: { referenceItems: [TITLE] },
});

export const CATEGORY: MatchType = defineMatchType({
  id: 'CATEGORY', types: ['category'], hoverOnly: true, cache: true, allowRename: true, referenceOnly: true,
  hoverConfig: { referenceItems: [TITLE, VALUE] },
  postProcessor: categoryPostProcessor
});

// NOOP Match types that might get detected, but nothing is done with them (no hover display, no finding references/declarations)
// Useful for terminating word searching early when detected, and possibly doing something with them at a later date
export const UNKNOWN: MatchType = defineMatchType({ id: 'UNKNOWN', types: [], fileTypes: [], cache: false, allowRename: false, noop: true });
export const COLOR: MatchType = defineMatchType({ id: 'COLOR', types: [], fileTypes: [], cache: false, allowRename: false, noop: true });
export const NUMBER: MatchType = defineMatchType({ id: 'NUMBER', types: [], fileTypes: [], cache: false, allowRename: false, noop: true });

function getMatchTypeById(id: string): MatchType | undefined {
  return matchTypesById.get(id);
}

function getAllMatchTypes(): MatchType[] {
  return [...matchTypesById.values()];
}

export { getMatchTypeById, getAllMatchTypes, matchTypesById };
