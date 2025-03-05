const { expandCsvKeyObject } = require("../utils/matchUtils");

/**
 * Defines trigger information which will be displayed on hover if a user hovers over a trigger keyword
 * Tip: You can use CSV keys such as 'oploc1, oploc2, oploc3' to apply the same info message for all of those triggers
 * Tip: The string 'NAME' will be replaced with the actual triggers defined name [trigger,triggerName]
 */ 
const triggerInfo = expandCsvKeyObject({
  logout: 'The script that executes when the user logs out',
  debugproc: 'Proc that only runs for users with cheats enabled, run with ::NAME'
});


function matchTriggerInfo(key, triggerName) {
  return (triggerInfo[key] || '').replace('NAME', triggerName);
}

module.exports = matchTriggerInfo;
