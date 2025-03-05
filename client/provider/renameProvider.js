const vscode = require('vscode');
const identifierCache = require('../cache/identifierCache');
const { matchWordFromDocument } = require('../matching/matchWord');
const cacheUtils = require('../utils/cacheUtils');
const matchType = require('../matching/matchType');
const activeFileCache = require('../cache/activeFileCache');

const renameProvider = {
  prepareRename(document, position) {
    const matchedWord = matchWordFromDocument(document, position);
    if (!matchedWord) {
      throw new Error("Cannot rename");
    }
    const { match, word, context } = matchedWord;
    if (!match.allowRename || match.noop) {
      throw new Error(`${match.id} renaming not supported`);
    }
    if (match.id !== matchType.LOCAL_VAR.id) {
      const identifier = identifierCache.get(word, match);
      if (!identifier) {
        return new Error('Cannot find any references to rename');
      }
    }
	},

	provideRenameEdits(document, position, newName) {
    const { word, match, context } = matchWordFromDocument(document, position);

    // Provide rename edits
    const renameWorkspaceEdits = new vscode.WorkspaceEdit();

    // Use activeFileCache to get references of variables for active script block
    if (match.id === matchType.LOCAL_VAR.id) {
      const scriptData = activeFileCache.getScriptData(position.line);
      if (scriptData) {
        (scriptData.variables[`$${word}`] || {references: []}).references.forEach(location => {
          renameWorkspaceEdits.replace(location.uri, location.range, `$${newName}`);
        });
      }
      return renameWorkspaceEdits;
    }

    // Decode all the references for the identifier into an array of vscode ranges,
    // then use that to rename all of the references to the newName
    const identifier = identifierCache.get(word, match);
    // Strip the cert_ and the _ prefix on objs or categories
    if (context.originalPrefix && newName.startsWith(context.originalPrefix)) {
      newName = newName.substring(context.originalPrefix.length);
    }
    // Strip the left side of identifier names with colons in them
    if (newName.indexOf(':') > -1) {
      newName = newName.substring(newName.indexOf(':') + 1);
    }
    if (identifier.references) {
      const wordLength = word.length - word.indexOf(':') - 1;
      Object.keys(identifier.references).forEach(fileKey => {
        const uri = vscode.Uri.file(fileKey);
        identifier.references[fileKey].forEach(encodedReference => {
          const range = cacheUtils.decodeReferenceToRange(wordLength, encodedReference);
          renameWorkspaceEdits.replace(uri, range, newName);
        });
      });
    }
    return renameWorkspaceEdits;
	}
}

module.exports = renameProvider;
