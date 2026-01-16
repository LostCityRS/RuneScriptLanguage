import type { Uri } from 'vscode';
import type { FileKey, IdentifierKey, MatchType } from '../types';
import { Location, Position, Range } from 'vscode';

export function resolveIdentifierKey(name: string, match: MatchType): IdentifierKey | undefined {
  return (!name || !match) ? undefined : name + match.id;
}

export function resolveFileKey(uri: Uri): FileKey | undefined {
  return uri.fsPath;
}

export function encodeReference(line: number, index: number): string {
  return `${line}|${index}`;
}

export function decodeReferenceToLocation(uri: Uri, encodedValue: string): Location | undefined {
  const split = encodedValue.split('|');
  return (split.length !== 2) ? undefined : new Location(uri, new Position(Number(split[0]), Number(split[1])));
}

export function decodeReferenceToRange(wordLength: number, encodedValue: string): Range | undefined {
  const split = encodedValue.split('|');
  if (split.length !== 2) {
    return undefined;
  }
  const startPosition = new Position(Number(split[0]), Number(split[1]));
  return new Range(startPosition, startPosition.translate(0, wordLength));
}
