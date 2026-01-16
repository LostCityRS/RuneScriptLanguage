import type { MatchType } from '../types';
import { COMMAND, COMPONENT, LABEL, LOC, NPC, OBJ, PROC, QUEUE, SOFTTIMER, STAT, TIMER, UNKNOWN, WALKTRIGGER } from "../matching/matchType";

interface TriggerMatchType {
  match: MatchType;
  declaration: boolean;
}

interface incrementingTriggerDefinition {
  triggerName: string; 
  increments: number;
  includeU: boolean; 
  includeT: boolean;
  includeD: boolean;
  defaultMatch: MatchType;
}

function buildMatchForTrigger(match: MatchType, declaration: boolean): TriggerMatchType {
  return { match, declaration };
}

const runescriptTrigger: Record<string, TriggerMatchType> = {
  proc: buildMatchForTrigger(PROC, true),
  label: buildMatchForTrigger(LABEL, true),
  queue: buildMatchForTrigger(QUEUE, true),
  softtimer: buildMatchForTrigger(SOFTTIMER, true),
  timer: buildMatchForTrigger(TIMER, true),
  ai_timer: buildMatchForTrigger(NPC, false),
  if_button: buildMatchForTrigger(COMPONENT, false),
  if_close: buildMatchForTrigger(COMPONENT, false),
  walktrigger: buildMatchForTrigger(WALKTRIGGER, true),
  ai_walktrigger: buildMatchForTrigger(NPC, false),
  ai_spawn: buildMatchForTrigger(NPC, false),
  ai_despawn: buildMatchForTrigger(NPC, false),
  debugproc: buildMatchForTrigger(UNKNOWN, true),
  login: buildMatchForTrigger(UNKNOWN, true),
  logout: buildMatchForTrigger(UNKNOWN, true),
  tutorial: buildMatchForTrigger(UNKNOWN, true),
  advancestat: buildMatchForTrigger(STAT, false),
  changestat: buildMatchForTrigger(STAT, false),
  mapzone: buildMatchForTrigger(UNKNOWN, true),
  mapzoneexit: buildMatchForTrigger(UNKNOWN, true),
  zone: buildMatchForTrigger(UNKNOWN, true),
  zoneexit: buildMatchForTrigger(UNKNOWN, true),
  command: buildMatchForTrigger(COMMAND, true)
};

// Builds a map value for each of the incrementing triggers (i.e. opncp1, opnpc2, ..., opnpc5)
// Also can specify which triggers have a U/T/D value (i.e. opnpcU)
const incrementingTriggers: incrementingTriggerDefinition[] = [
  { triggerName: 'opnpc', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: NPC },
  { triggerName: 'apnpc', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: NPC },
  { triggerName: 'ai_apnpc', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: NPC },
  { triggerName: 'ai_opnpc', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: NPC },
  { triggerName: 'opobj', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: OBJ },
  { triggerName: 'apobj', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: OBJ },
  { triggerName: 'ai_apobj', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: OBJ },
  { triggerName: 'ai_opobj', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: OBJ },
  { triggerName: 'oploc', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: LOC },
  { triggerName: 'aploc', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: LOC },
  { triggerName: 'ai_aploc', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: LOC },
  { triggerName: 'ai_oploc', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: LOC },
  { triggerName: 'opplayer', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: UNKNOWN },
  { triggerName: 'applayer', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: UNKNOWN },
  { triggerName: 'ai_applayer', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: NPC },
  { triggerName: 'ai_opplayer', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: NPC },
  { triggerName: 'ai_queue', increments: 20, includeU: false, includeT: false, includeD: false, defaultMatch: NPC },
  { triggerName: 'opheld', increments: 5, includeU: true, includeT: true, includeD: false, defaultMatch: OBJ },
  { triggerName: 'inv_button', increments: 5, includeU: false, includeT: false, includeD: true, defaultMatch: COMPONENT },
];

// Build the triggers with increments and U/T/D
incrementingTriggers.forEach(incTrigDef => {
  for (let i = 1; i <= incTrigDef.increments; i++) {
    runescriptTrigger[`${incTrigDef.triggerName}${i}`] = buildMatchForTrigger(incTrigDef.defaultMatch, false);
  }
  if (incTrigDef.includeU) runescriptTrigger[`${incTrigDef.triggerName}u`] = buildMatchForTrigger(incTrigDef.defaultMatch, false);
  if (incTrigDef.includeT) runescriptTrigger[`${incTrigDef.triggerName}t`] = buildMatchForTrigger(COMPONENT, false);
  if (incTrigDef.includeD) runescriptTrigger[`${incTrigDef.triggerName}d`] = buildMatchForTrigger(incTrigDef.defaultMatch, false);
});

export { runescriptTrigger };
