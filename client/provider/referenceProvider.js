const vscode = require('vscode');
const { matchWordFromDocument } = require('../matching/matchWord');
const identifierCache = require('../cache/identifierCache');
const cacheUtils = require('../utils/cacheUtils');
const matchType = require('../matching/matchType');
const activeFileCache = require('../cache/activeFileCache');

const referenceProvider = {
  async provideReferences(document, position) {
    // Find a match for the current word, and ignore noop or hoverOnly tagged matches
    const { match, word } = matchWordFromDocument(document, position)
    if (!match || match.noop || match.isHoverOnly) {
      return null;
    }

    // Use activeFileCache to get references of variables for active script block
    if (match.id === matchType.LOCAL_VAR.id) {
      const scriptData = activeFileCache.getScriptData(position.line);
      if (scriptData) {
        return (scriptData.variables[`$${word}`] || {references: []}).references;
      }
      return null;
    }

    // Get the identifier from the cache
    const identifier = identifierCache.get(word, match);
    if (!identifier || !identifier.references) {
      return null;
    }

    // Decode all the references for the identifier into an array of vscode Location objects
    const referenceLocations = [];
    Object.keys(identifier.references).forEach(fileKey => {
      const uri = vscode.Uri.file(fileKey);
      identifier.references[fileKey].forEach(encodedReference => 
        referenceLocations.push(cacheUtils.decodeReferenceToLocation(uri, encodedReference)));
    });
    // If there is only one reference and its the declaration, return null as theres no other references to show
    if (match.declaration && referenceLocations.length === 1) {
      return null;
    }
    return referenceLocations;
  }
}

module.exports = referenceProvider;
