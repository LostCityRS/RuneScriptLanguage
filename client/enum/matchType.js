const matchType = {
  UNKNOWN: {id: 'UNKNOWN'},
  LOCAL_VAR: {id: 'LOCAL_VAR'},
  GLOBAL_VAR: {id: 'GLOBAL_VAR', definitionFiles: ["varp", "varn", "vars"], definitionFormat: '[NAME]'},
  CONSTANT: {id: 'CONSTANT', definitionFiles: ["constant"], definitionFormat: '^NAME'},
  LABEL: {id: 'LABEL', definitionFiles: ["rs2"], definitionFormat: '[label,NAME]'},
  PROC: {id: 'PROC', definitionFiles: ["rs2"], definitionFormat: '[proc,NAME]'},
  TIMER: {id: 'TIMER', definitionFiles: ["rs2"], definitionFormat: '[timer,NAME]'},
  SOFTTIMER: {id: 'SOFTTIMER', definitionFiles: ["rs2"], definitionFormat: '[softtimer,NAME]'},
  QUEUE: {id: 'QUEUE', definitionFiles: ["rs2"], definitionFormat: '[queue,NAME]'},
  SEQ: {id: 'SEQ', definitionFiles: ["seq"], definitionFormat: '[NAME]'},
  SPOTANIM: {id: 'SPOTANIM', definitionFiles: ["spotanim"], definitionFormat: '[NAME]'},
  HUNT: {id: 'HUNT', definitionFiles: ["hunt"], definitionFormat: '[NAME]'},
  LOC: {id: 'LOC', definitionFiles: ["loc"], definitionFormat: '[NAME]'},
  NPC: {id: 'NPC', definitionFiles: ["npc"], definitionFormat: '[NAME]'},
  OBJ: {id: 'OBJ', definitionFiles: ["obj"], definitionFormat: '[NAME]'},
  INV: {id: 'INV', definitionFiles: ["inv"], definitionFormat: '[NAME]'},
  ENUM: {id: 'ENUM', definitionFiles: ["enum"], definitionFormat: '[NAME]'},
  DBROW: {id: 'DBROW', definitionFiles: ["dbrow"], definitionFormat: '[NAME]'},
  DBTABLE: {id: 'DBTABLE', definitionFiles: ["dbtable"], definitionFormat: '[NAME]'},
  INTERFACE: {id: 'INTERFACE', definitionFiles: ["pack"], definitionFormat: 'NAME'},
  LOCAL_VAR_DECLARATION: {id: 'LOCAL_VAR_DECLARATION'},
  GLOBAL_VAR_DECLARATION: {id: 'GLOBAL_VAR_DECLARATION'},
  CONSTANT_DECLARATION: {id: 'CONSTANT_DECLARATION'},
  LABEL_DECLARATION: {id: 'LABEL_DECLARATION'},
  PROC_DECLARATION: {id: 'PROC_DECLARATION'},
  OBJ_DECLARATION: {id: 'OBJ_DECLARATION'},
  NPC_DECLARATION: {id: 'NPC_DECLARATION'},
  LOC_DECLARATION: {id: 'LOC_DECLARATION'},
  PARAM_DECLARATION: {id: 'PARAM_DECLARATION'},
  SEQ_DECLARATION: {id: 'SEQ_DECLARATION'},
  STRUCT_DECLARATION: {id: 'STRUCT_DECLARATION'},
  DBROW_DECLARATION: {id: 'DBROW_DECLARATION'},
  DBTABLE_DECLARATION: {id: 'DBTABLE_DECLARATION'},
  ENUM_DECLARATION: {id: 'ENUM_DECLARATION'},
  TIMER_DECLARATION: {id: 'TIMER_DECLARATION'},
  SOFTTIMER_DECLARATION: {id: 'SOFTTIMER_DECLARATION'},
  QUEUE_DECLARATION: {id: 'QUEUE_DECLARATION'},
  HUNT_DECLARATION: {id: 'HUNT_DECLARATION'},
  INV_DECLARATION: {id: 'INV_DECLARATION'},
  SPOTANIM_DECLARATION: {id: 'SPOTANIM_DECLARATION'}
};

module.exports = matchType;
