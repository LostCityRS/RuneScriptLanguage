interface Param {
  typeId: string;
  declaration: boolean;
}

interface RegexConfigKey {
  regex: RegExp;
  params: Param[];
}

// === STATIC CONFIG KEY MATCHES ===
const configKeys: Record<string, { params: Param[] }> = {
  walkanim: { params: [param('seq'), param('seq'), param('seq'), param('seq')] },
  multivar: { params: [param('var')] },
  multiloc: { params: [param('int'), param('loc')] },
  multinpc: { params: [param('int'), param('npc')] },
  basevar: { params: [param('var')] },

  category: { params: [param('category')] },
  huntmode: { params: [param('hunt')] },
  table: { params: [param('dbtable')] },
  column: { params: [param('dbcolumn', true)] },
};

// === REGEX CONFIG KEY MATCHES ===
const regexConfigKeys: Map<string, RegexConfigKey[]> = groupByFileType([
{ regex: /stock\d+/, params: [param('obj'), param('int'), param('int')], fileTypes: ["inv"] },
{ regex: /count\d+/, params: [param('obj'), param('int')], fileTypes: ["obj"] },
{ regex: /frame\d+/, params: [param('frame')], fileTypes: ["seq"] },
{ regex: /(model|head|womanwear|manwear|womanhead|manhead|activemodel)\d*/, params: [param('ob2')], fileTypes:['npc', 'loc', 'obj', 'spotanim', 'if', 'idk'] },
{ regex: /\w*anim\w*/, params: [param('seq')], fileTypes: ["loc", "npc", "if", "spotanim"] },
{ regex: /replaceheldleft|replaceheldright/, params: [param('obj')], fileTypes: ["seq"] },
]);

// === CONFIG KEYS THAT ARE HANDLED MANUALLY IN CONFIG_MATCHER ===
const specialCaseKeys = ['val', 'param', 'data'];

function param(type: string, declaration = false): Param {
  return { typeId: type, declaration };
}

function groupByFileType(config: Array<{ regex: RegExp; params: Param[]; fileTypes: string[] }>): Map<string, RegexConfigKey[]> {
  const result = new Map<string, RegexConfigKey[]>();
  for (const { regex, params, fileTypes } of config) {
    for (const fileType of fileTypes) {
      if (!result.has(fileType)) {
        result.set(fileType, []);
      }
      result.get(fileType)!.push({ regex, params });
    }
  }
  return result;
}

export { configKeys, regexConfigKeys, specialCaseKeys };
