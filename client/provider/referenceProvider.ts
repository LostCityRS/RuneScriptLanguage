import type { Location, Position, ReferenceProvider, TextDocument} from 'vscode';
import { Uri } from 'vscode';
import { matchWordFromDocument } from '../matching/matchWord';
import { get as getIdentifier } from '../cache/identifierCache';
import { decodeReferenceToLocation } from '../utils/cacheUtils';
import { LOCAL_VAR } from '../matching/matchType';
import { getScriptData } from '../cache/activeFileCache';

const referenceProvider: ReferenceProvider = {
  async provideReferences(document: TextDocument, position: Position): Promise<Location[]> {
    // Find a match for the current word, and ignore noop or hoverOnly tagged matches
    const matchResult = matchWordFromDocument(document, position);
    if (!matchResult) {
      return [];
    }
    const { matchType, word } = matchResult;
    if (!matchType || matchType.noop || matchType.hoverOnly) {
      return [];
    }

    // Use activeFileCache to get references of variables for active script block
    if (matchType.id === LOCAL_VAR.id) {
      const scriptData = getScriptData(position.line);
      if (scriptData) {
        return (scriptData.variables[`$${word}`] || {references: []}).references;
      }
      return [];
    }

    // Get the identifier from the cache
    const identifier = getIdentifier(word, matchType);
    if (!identifier || !identifier.references) {
      return [];
    }

    // Decode all the references for the identifier into an array of vscode Location objects
    const referenceLocations: Location[] = [];
    Object.keys(identifier.references).forEach(fileKey => {
      const uri = Uri.file(fileKey);
      identifier.references[fileKey].forEach(encodedReference => {
        const location = decodeReferenceToLocation(uri, encodedReference);
        if (location) {
          referenceLocations.push(location);
        }
      });
    });
    // If there is only one reference and its the declaration, return empty list as theres no other references to show
    if (matchType.declaration && referenceLocations.length === 1) {
      return [];
    }
    return referenceLocations;
  }
}

export { referenceProvider };
