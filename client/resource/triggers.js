const matchType = require("../matching/matchType");

const runescriptTrigger = {
  proc: build(matchType.PROC, true),
  label: build(matchType.LABEL, true),
  queue: build(matchType.QUEUE, true),
  softtimer: build(matchType.SOFTTIMER, true),
  timer: build(matchType.TIMER, true),
  ai_timer: build(matchType.NPC, false),
  if_button: build(matchType.COMPONENT, false),
  if_close: build(matchType.COMPONENT, false),
  walktrigger: build(matchType.WALKTRIGGER, true),
  ai_walktrigger: build(matchType.NPC, false),
  debugproc: build(matchType.UNKNOWN, true),
  login: build(matchType.UNKNOWN, true),
  logout: build(matchType.UNKNOWN, true),
  tutorial: build(matchType.UNKNOWN, true),
  advancestat: build(matchType.STAT, false),
  mapzone: build(matchType.UNKNOWN, true),
  mapzoneexit: build(matchType.UNKNOWN, true),
  zone: build(matchType.UNKNOWN, true),
  zoneexit: build(matchType.UNKNOWN, true),
  command: build(matchType.COMMAND, true)
}

const configDuplicates = [
  {startsWith: 'opnpc', upToNum: 5, includeU: true, includeT: true, includeD: false, defaultMatch: matchType.NPC},
  {startsWith: 'apnpc', upToNum: 5, includeU: true, includeT: true, includeD: false, defaultMatch: matchType.NPC},
  {startsWith: 'ai_apnpc', upToNum: 5, includeU: true, includeT: true, includeD: false, defaultMatch: matchType.NPC},
  {startsWith: 'ai_opnpc', upToNum: 5, includeU: true, includeT: true, includeD: false, defaultMatch: matchType.NPC},
  {startsWith: 'opobj', upToNum: 5, includeU: true, includeT: true, includeD: false, defaultMatch: matchType.OBJ},
  {startsWith: 'apobj', upToNum: 5, includeU: true, includeT: true, includeD: false, defaultMatch: matchType.OBJ},
  {startsWith: 'ai_apobj', upToNum: 5, includeU: true, includeT: true, includeD: false, defaultMatch: matchType.OBJ},
  {startsWith: 'ai_opobj', upToNum: 5, includeU: true, includeT: true, includeD: false, defaultMatch: matchType.OBJ},
  {startsWith: 'oploc', upToNum: 5, includeU: true, includeT: true, includeD: false, defaultMatch: matchType.LOC},
  {startsWith: 'aploc', upToNum: 5, includeU: true, includeT: true, includeD: false, defaultMatch: matchType.LOC},
  {startsWith: 'ai_aploc', upToNum: 5, includeU: true, includeT: true, includeD: false, defaultMatch: matchType.LOC},
  {startsWith: 'ai_oploc', upToNum: 5, includeU: true, includeT: true, includeD: false, defaultMatch: matchType.LOC},
  {startsWith: 'opplayer', upToNum: 5, includeU: true, includeT: true, includeD: false, defaultMatch: matchType.UNKNOWN},
  {startsWith: 'applayer', upToNum: 5, includeU: true, includeT: true, includeD: false, defaultMatch: matchType.UNKNOWN},
  {startsWith: 'ai_applayer', upToNum: 5, includeU: true, includeT: true, includeD: false, defaultMatch: matchType.NPC},
  {startsWith: 'ai_opplayer', upToNum: 5, includeU: true, includeT: true, includeD: false, defaultMatch: matchType.NPC},
  {startsWith: 'ai_queue', upToNum: 20, includeU: false, includeT: false, includeD: false, defaultMatch: matchType.NPC},
  {startsWith: 'opheld', upToNum: 5, includeU: true, includeT: true, includeD: false, defaultMatch: matchType.OBJ},
  {startsWith: 'inv_button', upToNum: 5, includeU: false, includeT: false, includeD: true, defaultMatch: matchType.COMPONENT},
];

configDuplicates.forEach(dupeDef => {
  for (let i = 1; i <= dupeDef.upToNum; i++) {
    runescriptTrigger[`${dupeDef.startsWith}${i}`] = build(dupeDef.defaultMatch, false);
  }
  if (dupeDef.includeU) runescriptTrigger[`${dupeDef.startsWith}u`] = build(dupeDef.defaultMatch, false);
  if (dupeDef.includeT) runescriptTrigger[`${dupeDef.startsWith}t`] = build(matchType.COMPONENT, false);
  if (dupeDef.includeD) runescriptTrigger[`${dupeDef.startsWith}d`] = build(dupeDef.defaultMatch, false);
});

function build(match, declaration) {
  return {match: match, declaration: declaration};
}

module.exports = runescriptTrigger;
