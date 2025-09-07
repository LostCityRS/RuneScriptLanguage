const vscode = require('vscode');
const identifierCache = require('../cache/identifierCache');
const { matchWordFromDocument } = require('../matching/matchWord');
const cacheUtils = require('../utils/cacheUtils');
const matchType = require('../matching/matchType');
const activeFileCache = require('../cache/activeFileCache');
const { LOC_MODEL } = require('../enum/regex');

const renameProvider = {
  prepareRename(document, position) {
    const matchedWord = matchWordFromDocument(document, position);
    if (!matchedWord) {
      throw new Error("Cannot rename");
    }
    const { match, word } = matchedWord;
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

    if (match.id === matchType.LOCAL_VAR.id) {
      return renameLocalVariableReferences(position, word, newName);
    }

    const validationError = validate(match, newName);
    if (validationError) {
      vscode.window.showErrorMessage('Rename failed: ' + validationError);
      return new vscode.WorkspaceEdit();
    }

    const adjustedNewName = adjustNewName(context, newName);
    const identifier = identifierCache.get(word, match);
    renameFiles(match, word, adjustedNewName);
    return renameReferences(identifier, word, adjustedNewName);
	}
}

// Use activeFileCache to get references of variables for active script block
function renameLocalVariableReferences(position, word, newName) {
  const renameWorkspaceEdits = new vscode.WorkspaceEdit();
  const scriptData = activeFileCache.getScriptData(position.line);
  if (scriptData) {
    (scriptData.variables[`$${word}`] || { references: [] }).references.forEach(location => {
      renameWorkspaceEdits.replace(location.uri, location.range, `$${newName}`);
    });
  }
  return renameWorkspaceEdits;
}

function validate(match, newName) {
  if (match.id === matchType.MODEL.id && LOC_MODEL.test(newName)) {
    return `Do not include final _X suffix in model renames`;
  }
}

// Decode all the references for the identifier into an array of vscode ranges,
// then use that to rename all of the references to the newName
function renameReferences(identifier, oldName, newName) {
  const renameWorkspaceEdits = new vscode.WorkspaceEdit();
  if (identifier.references) {
    const wordLength = oldName.length - oldName.indexOf(':') - 1;
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

function adjustNewName(context, newName) {
  // Strip the cert_ and the _ prefix on objs or categories
  if (context.originalPrefix && newName.startsWith(context.originalPrefix)) {
    newName = newName.substring(context.originalPrefix.length);
  }
  // Strip the _0 (or others) on loc models
  if (context.originalSuffix && newName.endsWith(context.originalSuffix)) {
    newName = newName.slice(0, -2);
  }
  // Strip the left side of identifier names with colons in them
  if (newName.indexOf(':') > -1) {
    newName = newName.substring(newName.indexOf(':') + 1);
  }
  return newName;
}

async function renameFiles(match, oldName, newName) {
  if (match.renameFile && Array.isArray(match.fileTypes) && match.fileTypes.length > 0) {
    const fileSearch = match.id === matchType.MODEL.id ? `**/${oldName}_*.${match.fileTypes[0]}` : `**/${oldName}.${match.fileTypes[0]}`;
    const files = await vscode.workspace.findFiles(fileSearch) || [];
    for (const oldUri of files) {
      const suffix = match.id === matchType.MODEL.id ? oldUri.path.slice(-6, -4) : '';
      const newFileName = suffix ? `${newName}${suffix}.${match.fileTypes[0]}` : `${newName}.${match.fileTypes[0]}`;
      const newUri = vscode.Uri.joinPath(oldUri.with({ path: oldUri.path.replace(/\/[^/]+$/, '') }), newFileName);
      vscode.workspace.fs.rename(oldUri, newUri);
    }
  }
}

module.exports = renameProvider;
