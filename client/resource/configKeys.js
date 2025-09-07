// === STATIC CONFIG KEY MATCHES ===
const configKeys = {
  walkanim: { params: [param('seq'), param('seq'), param('seq'), param('seq')] },
  multivar: { params: [param('var')] },
  multiloc: { params: [param('int'), param('loc')] },
  multinpc: { params: [param('int'), param('npc')] },
  basevar: { params: [param('var')] },

  category: { params: [param('category')] },
  huntmode: { params: [param('hunt')] },
  table: { params: [param('dbtable')] },
  column: { params: [param('dbcolumn', true)] },
}

// === REGEX CONFIG KEY MATCHES ===
const regexConfigKeys = groupByFileType([
  { regex: /stock\d+/, params: [param('obj'), param('int'), param('int')], fileTypes: ["inv"] },
  { regex: /count\d+/, params: [param('obj'), param('int')], fileTypes: ["obj"] },
  { regex: /(model|head|womanwear|manwear|womanhead|manhead|activemodel)\d*/, params: [param('ob2')], fileTypes:['npc', 'loc', 'obj', 'spotanim', 'if', 'idk'] },
  { regex: /\w*anim\w*/, params: [param('seq')], fileTypes: ["loc", "npc", "if", "spotanim"] },
  { regex: /replaceheldleft|replaceheldright/, params: [param('obj')], fileTypes: ["seq"] },
]);

// === CONFIG KEYS THAT ARE HANDLED MANUALLY IN CONFIG_MATCHER ===
const specialCaseKeys = ['val', 'param', 'data'];

function param(type, declaration = false) {
  return {typeId: type, declaration: declaration};
}

function groupByFileType(config) {
  const result = new Map();
  for (const { regex, params, fileTypes } of config) {
    for (const fileType of fileTypes) {
      if (!result.has(fileType)) {
        result.set(fileType, []);
      }
      result.get(fileType).push({ regex, params });
    }
  }
  return result;
}

module.exports = { configKeys, regexConfigKeys, specialCaseKeys };
