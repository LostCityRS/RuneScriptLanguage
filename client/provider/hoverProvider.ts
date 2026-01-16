import type { ExtensionContext, HoverProvider, MarkdownString, Position, TextDocument } from 'vscode';
import type { MatchType, MatchResult, Identifier } from '../types';
import { Hover, Location } from 'vscode';
import { LOCAL_VAR } from '../matching/matchType';
import { get as getIdentifierFromCache } from '../cache/identifierCache';
import { getScriptData } from '../cache/activeFileCache';
import { build as buildIdentifier } from '../resource/identifierFactory';
import { matchWordFromDocument } from '../matching/matchWord';
import { getDeclarationHoverItems, getReferenceHoverItems } from '../resource/hoverConfigResolver';
import { markdownBase, appendTitle, appendInfo, appendValue, appendSignature, appendCodeBlock, expectedIdentifierMessage } from '../utils/markdownUtils';

const hoverProvider = function(context: ExtensionContext): HoverProvider {
  return {
    async provideHover(document: TextDocument, position: Position): Promise<Hover | undefined> {
      // Find a match for the word user is hovering over, and ignore noop tagged matches
      const matchResult = matchWordFromDocument(document, position);
      if (!matchResult) {
        return undefined;
      }
      const { word, matchType, context: matchContext } = matchResult as MatchResult;
      if (!matchType || matchType.noop) {
        return undefined;
      }

      // Setup the hover text markdown content object
      const markdown = markdownBase(context);

      // Local vars are handled differently than the rest
      if (matchType.id === LOCAL_VAR.id) {
        appendLocalVarHoverText(position, word, matchType, markdown);
        return new Hover(markdown);
      }

      // If no config found, or no items to display then exit early
      const hoverDisplayItems = matchType.declaration ? getDeclarationHoverItems(matchType) : getReferenceHoverItems(matchType);
      if (!Array.isArray(hoverDisplayItems) || hoverDisplayItems.length === 0) {
        return undefined;
      }

      // Get/Build identifier object for the match found
      const identifier = getIdentifier(word, matchType, document, position);

      // No identifier or hideDisplay property is set, then there is nothing to display
      if (!identifier || identifier.hideDisplay) {
        return undefined;
      }

      // Match type is a reference, but it has no declaration => display a warning message "expected identifier"
      if (!matchType.declaration && !matchType.referenceOnly && !identifier.declaration) {
        expectedIdentifierMessage(word, matchType, markdown);
        return new Hover(markdown);
      }

      // Append the registered hoverDisplayItems defined in the matchType for the identifier
      appendTitle(identifier.name, identifier.fileType, identifier.matchId, markdown, identifier.id, matchContext.cert);
      appendInfo(identifier, hoverDisplayItems, markdown);
      appendValue(identifier, hoverDisplayItems, markdown);
      appendSignature(identifier, hoverDisplayItems, markdown);
      appendCodeBlock(identifier, hoverDisplayItems, markdown);
      return new Hover(markdown);
    }
  };
}

function appendLocalVarHoverText(position: Position, word: string, match: MatchType, markdown: MarkdownString): void {
  const scriptData = getScriptData(position.line);
  if (scriptData) {
    const variable = scriptData.variables[`$${word}`];
    if (variable) {
      appendTitle(word, 'rs2', match.id, markdown);
      markdown.appendCodeblock(variable.parameter ? `${variable.type} $${word} (script parameter)` : `${variable.type} $${word}`, 'runescript');
    } else {
      expectedIdentifierMessage(word, match, markdown);
    }
  }
}

function getIdentifier(word: string, match: MatchType, document: TextDocument, position: Position): Identifier | undefined {
  return (match.hoverOnly) 
    ? buildIdentifier(word, match, new Location(document.uri, position)) 
    : getIdentifierFromCache(word, match);
}

export { hoverProvider };
