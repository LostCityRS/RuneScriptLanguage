// === STATIC CONFIG KEY MATCHES ===
const configKeys = {
  table: { params: [param('dbtable')] },
  huntmode: { params: [param('hunt')] },
  category: { params: [param('category')] },
  column: { params: [param('dbcolumn', true)] },
  walkanim: { params: [param('seq'), param('seq'), param('seq'), param('seq')] },
}

// === REGEX CONFIG KEY MATCHES ===
const regexConfigKeys = [
  { regex: /stock\d+/, params: [param('obj'), param('int'), param('int')], fileTypes: ["inv"] },
  { regex: /count\d+/, params: [param('obj'), param('int')], fileTypes: ["obj"] },
  { regex: /\w*anim\w*/, params: [param('seq')], fileTypes: ["loc", "npc", "if", "spotanim"] },
]

// === CONFIG KEYS THAT ARE HANDLED MANUALLY IN CONFIG_MATCHER ===
const specialCaseKeys = ['val', 'param', 'data'];

function param(type, declaration = false) {
  return {typeId: type, declaration: declaration};
}

module.exports = { configKeys, regexConfigKeys, specialCaseKeys };
