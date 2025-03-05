const vscode = require('vscode');
const matchType = require('../matching/matchType');
const identifierCache = require('../cache/identifierCache');
const activeFileCache = require('../cache/activeFileCache');
const identifierFactory = require('../resource/identifierFactory');
const { matchWordFromDocument } = require('../matching/matchWord');
const { resolve } = require('../resource/hoverConfigResolver');
const { DECLARATION_HOVER_ITEMS, REFERENCE_HOVER_ITEMS } = require('../enum/hoverConfigOptions');
const { markdownBase, appendTitle, appendInfo, appendValue, appendSignature, 
  appendCodeBlock, expectedIdentifierMessage } = require('../utils/markdownUtils');

const hoverProvider = function(context) {
  return {
    async provideHover(document, position) {
      // Find a match for the word user is hovering over, and ignore noop tagged matches
      const { word, match, context: matchContext } = matchWordFromDocument(document, position);
      if (!match || match.noop) {
        return null;
      }

      // Setup the hover text markdown content object
      const markdown = markdownBase(context);

      // Local vars are handled differently than the rest
      if (match.id === matchType.LOCAL_VAR.id) {
        appendLocalVarHoverText(position, word, match, markdown);
        return new vscode.Hover(markdown);
      }

      // If no config found, or no items to display then exit early
      const hoverDisplayItems = (match.declaration) ? resolve(DECLARATION_HOVER_ITEMS, match) : resolve(REFERENCE_HOVER_ITEMS, match);
      if (hoverDisplayItems.length === 0) {
        return null;
      }

      // Get/Build identifier object for the match found
      const identifier = getIdentifier(word, match, document, position);

      // No identifier or hideDisplay property is set, then there is nothing to display
      if (!identifier || identifier.hideDisplay) { 
        return null;
      }

      // Match type is a reference, but it has no declaration => display a warning message "expected identifier"
      if (!match.declaration && !match.referenceOnly && !identifier.declaration) { 
        expectedIdentifierMessage(word, match, markdown);   
        return new vscode.Hover(markdown);
      }

      // Append the registered hoverDisplayItems defined in the matchType for the identifier
      appendTitle(identifier.name, identifier.fileType, identifier.matchId, markdown, identifier.id, matchContext.cert);
      appendInfo(identifier, hoverDisplayItems, markdown);
      appendValue(identifier, hoverDisplayItems, markdown);
      appendSignature(identifier, hoverDisplayItems, markdown);
      appendCodeBlock(identifier, hoverDisplayItems, markdown);
      return new vscode.Hover(markdown);
    }
  };
}

function appendLocalVarHoverText(position, word, match, markdown) {
  const scriptData = activeFileCache.getScriptData(position.line);
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

function getIdentifier(word, match, document, position) {
  return (match.hoverOnly) ?
    identifierFactory.build(word, match, new vscode.Location(document.uri, position)) :
    identifierCache.get(word, match, match.declaration ? document.uri : null);
}

module.exports = hoverProvider;
