import type { MatchType } from '../types';
import type { HoverDisplayItem } from "../enum/hoverDisplayItems";

export function getDeclarationHoverItems(match: MatchType): HoverDisplayItem[] {
  return match.hoverConfig?.declarationItems ?? [];
}

export function getReferenceHoverItems(match: MatchType): HoverDisplayItem[] {
  return match.hoverConfig?.referenceItems ?? [];
}

export function getHoverLanguage(match: MatchType): string {
  return match.hoverConfig?.language ?? 'runescript';
}

export function getBlockSkipLines(match: MatchType): number {
  return match.hoverConfig?.blockSkipLines ?? 1;
}

export function getConfigInclusions(match: MatchType): string[] | undefined {
  return match.hoverConfig?.configInclusions ?? undefined;
}

export function resolveAllHoverItems(match: MatchType): Set<string> {
  const displayItems = new Set<string>();
  getDeclarationHoverItems(match).forEach(item => displayItems.add(String(item)));
  getReferenceHoverItems(match).forEach(item => displayItems.add(String(item)));
  return displayItems;
}
