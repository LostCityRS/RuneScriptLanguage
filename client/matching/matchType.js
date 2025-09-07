const { dataTypePostProcessor, enumPostProcessor, columnPostProcessor, rowPostProcessor, componentPostProcessor, 
  fileNamePostProcessor, coordPostProcessor, configKeyPostProcessor, triggerPostProcessor, categoryPostProcessor } = require('../resource/postProcessors');
const { VALUE, SIGNATURE, CODEBLOCK, TITLE, INFO } = require("../enum/hoverDisplayItems");
const { DECLARATION_HOVER_ITEMS, REFERENCE_HOVER_ITEMS, LANGUAGE, BLOCK_SKIP_LINES, CONFIG_INCLUSIONS } = require('../enum/hoverConfigOptions');

/* 
Match types define the possible types of identifiers that can be found. The config for a match type tells the extension 
all the necessary data it needs for finding declarations, building hover texts, and finding references.
{
  id: String - the unique id for the matchType,
  types: String[] - the type keywords which map to this matchType, for example: [namedobj, obj] for OBJ
  fileTypes: String[] - the possible file types this matchType can be declared in
  cache: boolean - whether or not identifiers with this matchType should be cached
  hoverConfig: Object - Config options to modify the hover display for this matchType, options in hoverConfig.js
  postProcessor: Function(identifier) - An optional post processing function to apply for this matchType, see postjs
  allowRename: Whether or not to allow rename symbol (F2) on this type
  referenceOnly: If true, then declaration is not saved/doesn't exist and only references exist. Default ctrl+click will be goto references rather than goto definition.
  hoverOnly: boolean - if true, this match type is only used for hover displays
  noop: boolean - if true, nothing is done with this match type (but still useful for terminating word searching early)
}
*/
const matchType = {
  LOCAL_VAR: {
    id: 'LOCAL_VAR', types: [], fileTypes: ['rs2'], cache: false, allowRename: true, 
  },
  GLOBAL_VAR: {
    id: 'GLOBAL_VAR', types: ['var'], fileTypes: ['varp', 'varbit', 'vars', 'varn'], cache: true, allowRename: true, 
    hoverConfig: {[DECLARATION_HOVER_ITEMS]: [TITLE, INFO], [REFERENCE_HOVER_ITEMS]: [TITLE, INFO, CODEBLOCK], [LANGUAGE]: 'varpconfig'},
    postProcessor: dataTypePostProcessor
  },
  CONSTANT: {
    id: 'CONSTANT', types: [], fileTypes: ['constant'], cache: true, allowRename: true, 
    hoverConfig: {[DECLARATION_HOVER_ITEMS]: [TITLE, INFO], [REFERENCE_HOVER_ITEMS]: [TITLE, INFO, CODEBLOCK], [LANGUAGE]: 'constants', [BLOCK_SKIP_LINES]: 0},
  },
  LABEL: {
    id: 'LABEL', types: ['label'], fileTypes: ['rs2'], cache: true, allowRename: true, 
    hoverConfig: {[DECLARATION_HOVER_ITEMS]: [TITLE, INFO, SIGNATURE], [REFERENCE_HOVER_ITEMS]: [TITLE, INFO, SIGNATURE]},
  },
  PROC: {
    id: 'PROC', types: ['proc'], fileTypes: ['rs2'], cache: true, allowRename: true, 
    hoverConfig: {[DECLARATION_HOVER_ITEMS]: [TITLE, INFO, SIGNATURE], [REFERENCE_HOVER_ITEMS]: [TITLE, INFO, SIGNATURE]},
  },
  TIMER: {
    id: 'TIMER', types: ['timer'], fileTypes: ['rs2'], cache: true, allowRename: true, 
    hoverConfig: {[DECLARATION_HOVER_ITEMS]: [TITLE, INFO, SIGNATURE], [REFERENCE_HOVER_ITEMS]: [TITLE, INFO, SIGNATURE]},
  },
  SOFTTIMER: {
    id: 'SOFTTIMER', types: ['softtimer'], fileTypes: ['rs2'], cache: true, allowRename: true, 
    hoverConfig: {[DECLARATION_HOVER_ITEMS]: [TITLE, INFO, SIGNATURE], [REFERENCE_HOVER_ITEMS]: [TITLE, INFO, SIGNATURE]},
  },
  QUEUE: {
    id: 'QUEUE', types: ['queue'], fileTypes: ['rs2'], cache: true, allowRename: true, 
    hoverConfig: {[DECLARATION_HOVER_ITEMS]: [TITLE, INFO, SIGNATURE], [REFERENCE_HOVER_ITEMS]: [TITLE, INFO, SIGNATURE]},
  },
  SEQ: {
    id: 'SEQ', types: ['seq'], fileTypes: ['seq'], cache: true, allowRename: true, 
    hoverConfig: {[DECLARATION_HOVER_ITEMS]: [TITLE, INFO], [REFERENCE_HOVER_ITEMS]: [TITLE, INFO], [LANGUAGE]: 'seqconfig'},
  },
  SPOTANIM: {
    id: 'SPOTANIM', types: ['spotanim'], fileTypes: ['spotanim'], cache: true, allowRename: true, 
    hoverConfig: {[DECLARATION_HOVER_ITEMS]: [TITLE, INFO], [REFERENCE_HOVER_ITEMS]: [TITLE, INFO], [LANGUAGE]: 'spotanimconfig'},
  },
  HUNT: {
    id: 'HUNT', types: ['hunt'], fileTypes: ['hunt'], cache: true, allowRename: true, 
    hoverConfig: {[DECLARATION_HOVER_ITEMS]: [TITLE, INFO], [REFERENCE_HOVER_ITEMS]: [TITLE, INFO, CODEBLOCK], [LANGUAGE]: 'huntconfig', [CONFIG_INCLUSIONS]: ['type']},
  },
  LOC: {
    id: 'LOC', types: ['loc'], fileTypes: ['loc'], cache: true, allowRename: true, 
    hoverConfig: {[DECLARATION_HOVER_ITEMS]: [TITLE, INFO], [REFERENCE_HOVER_ITEMS]: [TITLE, INFO, CODEBLOCK], [LANGUAGE]: 'locconfig', [CONFIG_INCLUSIONS]: ['name', 'desc', 'category']},
  },
  NPC: {
    id: 'NPC', types: ['npc'], fileTypes: ['npc'], cache: true, allowRename: true, 
    hoverConfig: {[DECLARATION_HOVER_ITEMS]: [TITLE, INFO], [REFERENCE_HOVER_ITEMS]: [TITLE, INFO, CODEBLOCK], [LANGUAGE]: 'npcconfig', [CONFIG_INCLUSIONS]: ['name', 'desc', 'category']},
  },
  OBJ: {
    id: 'OBJ', types: ['namedobj', 'obj'], fileTypes: ['obj'], cache: true, allowRename: true, 
    hoverConfig: {[DECLARATION_HOVER_ITEMS]: [TITLE, INFO], [REFERENCE_HOVER_ITEMS]: [TITLE, INFO, CODEBLOCK], [LANGUAGE]: 'objconfig', [CONFIG_INCLUSIONS]: ['name', 'desc', 'category']},
  },
  INV: {
    id: 'INV', types: ['inv'], fileTypes: ['inv'], cache: true, allowRename: true, 
    hoverConfig: {[DECLARATION_HOVER_ITEMS]: [TITLE, INFO], [REFERENCE_HOVER_ITEMS]: [TITLE, INFO, CODEBLOCK], [LANGUAGE]: 'invconfig', [CONFIG_INCLUSIONS]: ['scope', 'size']},
  },
  ENUM: {
    id: 'ENUM', types: ['enum'], fileTypes: ['enum'], cache: true, allowRename: true, 
    hoverConfig: {[DECLARATION_HOVER_ITEMS]: [TITLE, INFO], [REFERENCE_HOVER_ITEMS]: [TITLE, INFO, CODEBLOCK], [LANGUAGE]: 'enumconfig', [CONFIG_INCLUSIONS]: ['inputtype', 'outputtype']},
    postProcessor: enumPostProcessor
  },
  DBCOLUMN: {
    id: 'DBCOLUMN', types: ['dbcolumn'], fileTypes: ['dbtable'], cache: true, allowRename: true, 
    hoverConfig: {[DECLARATION_HOVER_ITEMS]: [TITLE, INFO, CODEBLOCK], [REFERENCE_HOVER_ITEMS]: [TITLE, INFO, CODEBLOCK], [LANGUAGE]: 'runescript', [BLOCK_SKIP_LINES]: 0},
    postProcessor: columnPostProcessor
  },
  DBROW: {
    id: 'DBROW', types: ['dbrow'], fileTypes: ['dbrow'], cache: true, allowRename: true, 
    hoverConfig: {[DECLARATION_HOVER_ITEMS]: [TITLE, INFO], [REFERENCE_HOVER_ITEMS]: [TITLE, INFO, CODEBLOCK], [LANGUAGE]: 'dbrowconfig', [CONFIG_INCLUSIONS]: ['table']},
    postProcessor: rowPostProcessor
  },
  DBTABLE: {
    id: 'DBTABLE', types: ['dbtable'], fileTypes: ['dbtable'], cache: true, allowRename: true, 
    hoverConfig: {[DECLARATION_HOVER_ITEMS]: [TITLE, INFO], [REFERENCE_HOVER_ITEMS]: [TITLE, INFO, CODEBLOCK], [LANGUAGE]: 'dbtableconfig'},
  },
  INTERFACE: {
    id: 'INTERFACE', types: ['interface'], fileTypes: ['if'], cache: true, allowRename: false, referenceOnly: true, 
    hoverConfig: {[REFERENCE_HOVER_ITEMS]: [TITLE, INFO], [LANGUAGE]: 'interface'},
    postProcessor: fileNamePostProcessor
  },
  COMPONENT: {
    id: 'COMPONENT', types: ['component'], fileTypes: ['if'], cache: true, allowRename: true, 
    hoverConfig: {[DECLARATION_HOVER_ITEMS]: [TITLE, INFO], [REFERENCE_HOVER_ITEMS]: [TITLE, INFO], [LANGUAGE]: 'interface'},
    postProcessor: componentPostProcessor
  },
  PARAM: {
    id: 'PARAM', types: ['param'], fileTypes: ['param'], cache: true, allowRename: true, 
    hoverConfig: {[DECLARATION_HOVER_ITEMS]: [TITLE, INFO], [REFERENCE_HOVER_ITEMS]: [TITLE, INFO, CODEBLOCK], [LANGUAGE]: 'paramconfig'},
    postProcessor: dataTypePostProcessor
  },
  COMMAND: {
    id: 'COMMAND', types: [], fileTypes: ['rs2'], cache: true, allowRename: false, 
    hoverConfig: {[DECLARATION_HOVER_ITEMS]: [TITLE, INFO, SIGNATURE], [REFERENCE_HOVER_ITEMS]: [TITLE, INFO, SIGNATURE]},
  },
  SYNTH: {
    id: 'SYNTH', types: ['synth'], fileTypes: ['synth'], cache: true, allowRename: true, referenceOnly: true, renameFile: true, 
    hoverConfig: {[REFERENCE_HOVER_ITEMS]: [TITLE, INFO]},
    postProcessor: fileNamePostProcessor
  },
  MODEL: {
    id: 'MODEL', types: ['ob2', 'model'], fileTypes: ['ob2'], cache: true, allowRename: true, referenceOnly: true, renameFile: true, 
    hoverConfig: {[REFERENCE_HOVER_ITEMS]: [TITLE, INFO]},
  },
  WALKTRIGGER: {
    id: 'WALKTRIGGER', types: ['walktrigger'], fileTypes: ['rs2'], cache: true, allowRename: true, 
    hoverConfig: {[DECLARATION_HOVER_ITEMS]: [TITLE, INFO, SIGNATURE], [REFERENCE_HOVER_ITEMS]: [TITLE, INFO, SIGNATURE]},
  },
  IDK: {
    id: 'IDK', types: ['idk', 'idkit'], fileTypes: ['idk'], cache: true, allowRename: true, 
    hoverConfig: {[DECLARATION_HOVER_ITEMS]: [TITLE, INFO], [REFERENCE_HOVER_ITEMS]: [TITLE, INFO, CODEBLOCK], [LANGUAGE]: 'idkconfig'},
  },
  MESANIM: {
    id: 'MESANIM', types: ['mesanim'], fileTypes: ['mesanim'], cache: true, allowRename: true, 
    hoverConfig: {[DECLARATION_HOVER_ITEMS]: [TITLE, INFO], [REFERENCE_HOVER_ITEMS]: [TITLE, INFO], [LANGUAGE]: 'mesanimconfig'},
  },
  STRUCT: {
    id: 'STRUCT', types: ['struct'], fileTypes: ['struct'], cache: true, allowRename: true, 
    hoverConfig: {[DECLARATION_HOVER_ITEMS]: [TITLE, INFO], [REFERENCE_HOVER_ITEMS]: [TITLE, INFO], [LANGUAGE]: 'structconfig'},
  },
  // Hover only match types that are only used for displaying hover displays (no finding references/declarations)
  // Useful for terminating word searches early when detected. Postprocessing can be done on these.
  // Specify referenceConfig to select which displayItems should be shown on hover.
  COORDINATES: {
    id: 'COORDINATES', types: [], hoverOnly: true, cache: false, allowRename: false, 
    hoverConfig: {[REFERENCE_HOVER_ITEMS]: [TITLE, VALUE]},
    postProcessor: coordPostProcessor
  },
  CONFIG_KEY: {
    id: 'CONFIG_KEY', types: [], hoverOnly: true, cache: false, allowRename: false, 
    hoverConfig: {[REFERENCE_HOVER_ITEMS]: [TITLE, INFO]},
    postProcessor: configKeyPostProcessor
  },
  TRIGGER: {
    id: 'TRIGGER', types: [], hoverOnly: true, cache: false, allowRename: false, 
    hoverConfig: {[REFERENCE_HOVER_ITEMS]: [TITLE, INFO]},
    postProcessor: triggerPostProcessor
  },
  STAT: { 
    id: 'STAT', types: ['stat'], hoverOnly: true, cache: false, allowRename: false, 
    hoverConfig: {[REFERENCE_HOVER_ITEMS]: [TITLE]},
  },
  NPC_STAT: { 
    id: 'NPC_STAT', types: ['npc_stat'], hoverOnly: true, cache: false, allowRename: false, 
    hoverConfig: {[REFERENCE_HOVER_ITEMS]: [TITLE]},
  },
  NPC_MODE: { 
    id: 'NPC_MODE', types: ['npc_mode'], hoverOnly: true, cache: false, allowRename: false, 
    hoverConfig: {[REFERENCE_HOVER_ITEMS]: [TITLE]},
  },
  LOCSHAPE: { 
    id: 'LOCSHAPE', types: ['locshape'], hoverOnly: true, cache: false, allowRename: false, 
    hoverConfig: {[REFERENCE_HOVER_ITEMS]: [TITLE]},
  },
  FONTMETRICS: { 
    id: 'FONTMETRICS', types: ['fontmetrics'], hoverOnly: true, cache: false, allowRename: false, 
    hoverConfig: {[REFERENCE_HOVER_ITEMS]: [TITLE]},
  },
  CATEGORY: { 
    id: 'CATEGORY', types: ['category'], hoverOnly: true, cache: true, allowRename: true, referenceOnly: true, 
    hoverConfig: {[REFERENCE_HOVER_ITEMS]: [TITLE, VALUE]},
    postProcessor: categoryPostProcessor
  },
  // NOOP Match types that might get detected, but nothing is done with them (no hover display, no finding references/declarations)
  // Useful for terminating word searching early when detected, and possibly doing something with them at a later date
  UNKNOWN: { id: 'UNKNOWN', noop: true, cache: false }, // default to map to when a value is matched but no specific matchType for it
  COLOR: { id: 'COLOR', noop: true, cache: false },
  NUMBER: { id: 'NUMBER', noop: true, cache: false }
};

module.exports = matchType;
