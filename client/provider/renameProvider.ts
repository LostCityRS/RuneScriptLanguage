import type { Location, Position, Range, RenameProvider, TextDocument } from 'vscode';
import type { MatchContext, MatchResult, MatchType, Identifier } from '../types';
import { Uri, WorkspaceEdit, workspace } from 'vscode';
import { get as getIdentifier } from '../cache/identifierCache';
import { matchWordFromDocument } from '../matching/matchWord';
import { decodeReferenceToRange } from '../utils/cacheUtils';
import { LOCAL_VAR, MODEL } from '../matching/matchType';
import { getScriptData } from '../cache/activeFileCache';

const renameProvider: RenameProvider = {
  prepareRename(document: TextDocument, position: Position): Range | { range: Range; placeholder: string } | undefined {
    const matchedWord = matchWordFromDocument(document, position);
    if (!matchedWord) {
      throw new Error("Cannot rename");
    }
    const { matchType, word } = matchedWord as MatchResult;
    if (!matchType.allowRename || matchType.noop) {
      throw new Error(`${matchType.id} renaming not supported`);
    }
    if (matchType.id !== LOCAL_VAR.id) {
      const identifier = getIdentifier(word, matchType);
      if (!identifier) {
        throw new Error('Cannot find any references to rename');
      }
    }
    const wordRange = document.getWordRangeAtPosition(position);
    if (wordRange) {
      return { range: wordRange, placeholder: word };
    }
    return wordRange;
  },

  async provideRenameEdits(document: TextDocument, position: Position, newName: string): Promise<WorkspaceEdit | undefined> {
    const matchResult: MatchResult | undefined = matchWordFromDocument(document, position);
    if (!matchResult) {
      return undefined;
    }
    const { word, matchType: match, context } = matchResult;

    if (match.id === LOCAL_VAR.id) {
      return renameLocalVariableReferences(position, word, newName);
    }

    const adjustedNewName = adjustNewName(context, newName);
    const identifier = getIdentifier(word, match);
    await renameFiles(match, word, adjustedNewName);
    return renameReferences(identifier, word, adjustedNewName);
  }
}

// Use activeFileCache to get references of variables for active script block
function renameLocalVariableReferences(position: Position, word: string, newName: string): WorkspaceEdit {
  const renameWorkspaceEdits = new WorkspaceEdit();
  const scriptData = getScriptData(position.line);
  if (scriptData) {
    (scriptData.variables[`$${word}`] || { references: [] }).references.forEach((location: Location) => {
      renameWorkspaceEdits.replace(location.uri, location.range, `$${newName}`);
    });
  }
  return renameWorkspaceEdits;
}

// Decode all the references for the identifier into an array of vscode ranges,
// then use that to rename all of the references to the newName
function renameReferences(identifier: Identifier | undefined, oldName: string, newName: string): WorkspaceEdit {
  const renameWorkspaceEdits = new WorkspaceEdit();
  if (identifier?.references) {
    const wordLength = oldName.length - oldName.indexOf(':') - 1;
    Object.keys(identifier.references).forEach(fileKey => {
      const uri = Uri.file(fileKey);
      identifier.references[fileKey].forEach((encodedReference: string) => {
        const range = decodeReferenceToRange(wordLength, encodedReference);
        if (range) {
          renameWorkspaceEdits.replace(uri, range, newName);
        }
      });
    });
  }
  return renameWorkspaceEdits;
}

function adjustNewName(context: MatchContext, newName: string): string {
  // Strip the cert_ and the _ prefix on objs or categories
  if (context.originalPrefix && newName.startsWith(context.originalPrefix)) {
    newName = newName.substring(context.originalPrefix.length);
  }
  // Strip the suffixes off
  if (context.originalSuffix && newName.endsWith(context.originalSuffix)) {
    newName = newName.slice(0, -context.originalSuffix.length);
  }
  // Strip the left side of identifier names with colons in them
  if (newName.indexOf(':') > -1) {
    newName = newName.substring(newName.indexOf(':') + 1);
  }
  return newName;
}

async function renameFiles(match: MatchType, oldName: string, newName: string): Promise<void> {
  if (match.renameFile && Array.isArray(match.fileTypes) && match.fileTypes.length > 0) {
    // Find files to rename
    let files: Uri[] = [];
    const ext = match.fileTypes[0];
    if (match.id === MODEL.id) {
      files = await workspace.findFiles(`**/${oldName}*.${ext}`) || [];
      const regex = new RegExp(`^(?:${oldName}\\.${ext}|${oldName}_[^/]\\.${ext})$`);
      files = files.filter(uri => regex.test(uri.path.split('/').pop()!));
    } else {
      files = await workspace.findFiles(`**/${oldName}.${ext}`) || [];
    }

    // Rename the files
    for (const oldUri of files) {
      const oldFileName = oldUri.path.split('/').pop();
      const suffix = oldFileName?.startsWith(`${oldName}_`) ? oldFileName!.slice(oldName.length + 1, oldFileName!.lastIndexOf('.')) : '';
      const newFileName = suffix ? `${newName}_${suffix}.${ext}` : `${newName}.${ext}`;
      const newUri = Uri.joinPath(oldUri.with({ path: oldUri.path.replace(/\/[^/]+$/, '') }), newFileName);
      await workspace.fs.rename(oldUri, newUri);
    }
  }
}

export { renameProvider };
