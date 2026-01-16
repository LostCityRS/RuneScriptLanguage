import { getAllMatchTypes, UNKNOWN } from "../matching/matchType";

const keywordToId: Record<string, string> = {};

getAllMatchTypes().forEach(match => {
  for (const keyword of (match.types || [])) {
    keywordToId[keyword] = match.id;
  }
});

export function dataTypeToMatchId(keyword: string): string {
  return keywordToId[keyword] || UNKNOWN.id;
}
