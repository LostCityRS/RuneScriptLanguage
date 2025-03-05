const { expandCsvKeyObject } = require("../utils/matchUtils");

/** 
 * Defines any config keys with info that will be displayed when the user hovers over that config key
 * Format: { key: { 'any': 'info for any fileType', 'obj': 'obj specific info', 'loc, npc': 'loc and npc specific info' } }
 * You can define different info for specific file types, or use 'any' to apply to all file types (unless already defined)
 * Tip: you can use the same value for multiple file types using a key as a CSV (i.e. use 'obj, loc, npc' as a key)
 * Tip: config key will apply to all tags which end in numbers (for example stock will apply to stock1, stock2, stock100, etc...)
 * Tip: you can use $TYPE which will be replaced by the file type of the config (loc, obj, etc...)
 */
const configKeyInfo = expandInfo({
  type: { 'varp': 'The data type of this player variable' },
  param: { 'any': 'A param value in the format "paramName,value"' },
  inputtype: { 'enum': 'The input data type for the enum' },
  outputtype: { 'enum': 'The output data type for the enum' },
  val: { 'enum': 'A data value for the enum in the format "inputData,outputData"' },
  scope: { 'varp': 'The lifetime of a player variable\n\nBy default it is temporary and reset on logout/login. You can make it persist by setting scope=perm' },
  protect: { 'varp': 'If the player variable should require protected access\n\nDefault value <b>true</b> (acceptable values: true/yes, false/no)\n\nProtected means a script can not <b>write</b> to it without sole access, but a varp can always be <b>read</b> regardless of the protection.' },
  clientcode: { 'varp, if': 'Ties this to specific client-side code logic\n\nAcceptable value defined in client source, if you actually need this you should already know what to put.' },
  transmit: { 'varp': 'If a player variable should be transmitted to the client\n\nDefault value <b>false</b> (acceptable values: true/yes, false/no)\n\nThe main use for this property is in conjunction with interfaces.' },
  stock: { 'inv': 'Stock of an item in a shop, format "object,stock,restock_ticks"'},
  count: { 'obj': 'Object to use when the based on the stack size of an item' },
  respawnrate: { 'obj, npc': 'Respawn rate of this $TYPE, in game ticks' },
  category: { 'any': 'The category this $TYPE belongs to, multiple categories are possible\n\nCan be used with category engine commands such as <b>inv_totalcat</b>\n\nAlso can be used in triggers by preceeding the category with an underscore (_)\n\nEx: [oplocu,_watersource] is a script which applies to all items with the category \'watersource\'' },
});
function expandInfo(obj) {
  Object.keys(obj).forEach(key => obj[key] = expandCsvKeyObject(obj[key]));
  return obj;
}

// Find info for a given config key. If no fileType, will match config keys for 'any' type. Else, return null.
function matchConfigKeyInfo(key, fileType) {
  const endingNums = key.match(/\d+$/);
  if (endingNums) {
    key = key.substring(0, key.indexOf(endingNums));
  }
  const info = configKeyInfo[key];
  if (info[fileType]) {
    return info[fileType];
  }
  return info.any;
}

module.exports = matchConfigKeyInfo;
