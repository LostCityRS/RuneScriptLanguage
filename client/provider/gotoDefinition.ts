import type { DefinitionProvider, Position, TextDocument } from 'vscode';
import type { MatchType } from '../types';
import { Location } from 'vscode';
import { get as getIdentifier } from "../cache/identifierCache";
import { LOCAL_VAR } from '../matching/matchType';
import { matchWordFromDocument } from '../matching/matchWord';
import { getScriptData } from '../cache/activeFileCache';

const gotoDefinitionProvider: DefinitionProvider = {
  async provideDefinition(document: TextDocument, position: Position): Promise<Location | undefined> {
    // Get a match for the current word, and ignore noop or hover only tagged matches
    const matchResult = matchWordFromDocument(document, position);
    if (!matchResult) {
      return undefined;
    }
    const { matchType, word } = matchResult;
    if (!matchType || matchType.noop || matchType.hoverOnly) {
      return undefined;
    }

    // If we are already on a declaration, there is nowhere to goto. Returning current location
    // indicates to vscode that we instead want to try doing "find references"
    if (matchType.declaration || matchType.referenceOnly) {
      return new Location(document.uri, position);
    }

    // Search for the identifier and its declaration location, and goto it if found
    if (matchType.id === LOCAL_VAR.id) {
      return gotoLocalVar(position, word);
    }
    return gotoDefinition(word, matchType);
  }
}

const gotoLocalVar = (position: Position, word: string): Location | undefined => {
  const scriptData = getScriptData(position.line);
  return (scriptData) ? (scriptData.variables[`$${word}`] || {declaration: undefined}).declaration : undefined;
}

const gotoDefinition = async (word: string, match: MatchType): Promise<Location | undefined> => {
  const definition = getIdentifier(word, match);
  return (definition) ? definition.declaration : undefined;
}

export { gotoDefinitionProvider };
