import type { Uri } from 'vscode';
import type { MatchResult, IdentifierText } from '../types';
import { readFile } from 'fs/promises';
import { Location, Position, workspace } from 'vscode';
import { getAllMatchTypes, UNKNOWN } from "../matching/matchType";
import { clear as clearIdentifierCache, clearFile as clearIdentifierFile, put as putIdentifier, putReference as putIdentifierReference } from './identifierCache';
import { rebuild as rebuildActiveFileCache } from './activeFileCache';
import { getLines } from '../utils/stringUtils';
import { matchWords } from '../matching/matchWord';
import { TRIGGER_LINE_REGEX } from '../enum/regex';
import { resolveIdentifierKey } from '../utils/cacheUtils';
import { returnBlockLinesCache } from './returnBlockLinesCache';
import { switchStmtLinesCache } from './switchStmtLinesCache';
import { dataTypeToMatchId } from '../resource/dataTypeToMatchId';

/**
* Builds the set of monitored file types, any file events with other file types will be ignored
* Monitored file types are determined by checking all file types defined in the matchType object
*/
const monitoredFileTypes = new Set<string>();

function determineFileTypes(): void {
  monitoredFileTypes.add('pack');
  getAllMatchTypes().filter(match => !match.referenceOnly).forEach(match => {
    const fileTypes = match.fileTypes || [];
    for (const fileType of fileTypes) {
      monitoredFileTypes.add(fileType);
    }
  });
}

/**
* Rebuilds the entire identifier cache for all relevant workspace files
* Need to do 2 passes on the files to for ensuring things like engine command
* parameters get matched correctly. On the first pass, the commands don't yet exist in the cache
* so the matching service cannot accurately build everything until 2 passes are made
*/
async function rebuildAll(): Promise<void> {
  if (monitoredFileTypes.size === 0) determineFileTypes();
  clearAll();
  const fileUris = await getFiles();
  await Promise.all(fileUris.map(uri => parseFileAndCacheIdentifiers(uri)));
  await Promise.all(fileUris.map(uri => parseFileAndCacheIdentifiers(uri)));
  rebuildActiveFile();
}

/**
* Rebuilds the activeFileCache, parses the active text editor file and stores relevant script data
* such as script variables, script return types, switch statement types, etc...
*/
let debounceTimer: NodeJS.Timeout | undefined;
function rebuildActiveFile(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    rebuildActiveFileCache();
  }, 400);
}

/**
* Rebuilds the identifier cache for identifiers in the provided file uri
*/
async function rebuildFile(uri: Uri): Promise<void> {
  if (isValidFile(uri)) {
    clearFile(uri);
    await parseFileAndCacheIdentifiers(uri);
    rebuildActiveFile();
  }
}

/**
* Clears the identifier cache for identifiers in the provided list of file uris
*/
async function clearFiles(uris: Uri[]): Promise<void> {
  for (const uri of uris) {
    if (isValidFile(uri)) {
      clearFile(uri);
    }
  }
}

/**
* Clears the identifier cache for identifiers in the provided list of old file uris
* and then recaches the files using the new file names
*/
async function renameFiles(uriPairs: { oldUri: Uri; newUri: Uri }[]): Promise<void> {
  for (const uriPair of uriPairs) {
    if (isValidFile(uriPair.oldUri) && isValidFile(uriPair.newUri)) {
      clearFile(uriPair.oldUri);
      await parseFileAndCacheIdentifiers(uriPair.newUri);
    }
  }
}

/**
* Adds to cache for new files
*/
async function createFiles(uris: Uri[]): Promise<void> {
  for (const uri of uris) {
    if (isValidFile(uri)) {
      await parseFileAndCacheIdentifiers(uri);
    }
  }
}

/**
* Get a list of all relevant files in the workspace which might contain identifiers
*/
async function getFiles(): Promise<Uri[]> {
  const fileTypesToScan: string[] = [];
  monitoredFileTypes.forEach(fileType => fileTypesToScan.push(`**/*.${fileType}`));
  return workspace.findFiles(`{${[...fileTypesToScan].join(',')}}`);
}

/**
* Parses the input file for identifiers, and caches them when found
*/
async function parseFileAndCacheIdentifiers(uri: Uri): Promise<void> {
  const isRs2 = uri.fsPath.endsWith('.rs2');
  const fileText = await readFile(uri.fsPath, "utf8");
  const lines = getLines(fileText);

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    cacheSwitchStatementBlock(lineNum, uri);
    const matchResults = (matchWords(lines[lineNum], lineNum, uri) || []).filter((match): match is MatchResult => !!match && match.matchType.cache);
    if (matchResults.length > 0) {
      const text: IdentifierText = { lines: [], start: 0 };
      matchResults.forEach(result => {
        if (result.matchType.declaration) {
          if (text.lines.length === 0) {
            const startIndex = Math.max(lineNum - 1, 0);
            text.lines = lines.slice(startIndex);
            text.start = lineNum - startIndex;
          }
          const location = new Location(uri, new Position(lineNum, result.context.word.start));
          const identifier = putIdentifier(result.word, result.matchType, location, text);
          cacheReturnBlock(identifier, lineNum, result);
        } else {
          let index = result.context.word.start;
          if (!result.context.modifiedWord && result.word.indexOf(':') > 0) {
            index += result.word.indexOf(':') + 1;
          }
          putIdentifierReference(result.word, result.matchType, uri, lineNum, index, result.context.packId);
        }
      });
    }
  }

  function cacheReturnBlock(identifier: any, line: number, match: MatchResult): void {
    const key = resolveIdentifierKey(match.word, match.matchType);
    if (isRs2 && identifier.signature?.returns?.length > 0 && TRIGGER_LINE_REGEX.test(lines[line]) && key) {
      returnBlockLinesCache.put(line + 1, key, uri);
    }
  }

  function cacheSwitchStatementBlock(line: number, uri: Uri): void {
    if (isRs2) {
      const switchSplit = lines[line].split("switch_");
      if (switchSplit.length > 1) {
        const switchMatchType = dataTypeToMatchId(switchSplit[1].split(/[ (]/)[0]);
        if (switchMatchType !== UNKNOWN.id) {
          switchStmtLinesCache.put(line + 1, switchMatchType, uri);
        }
      }
    }
  }
}

/**
* Checks if the file extension of the uri is in the list of monitored file types
*/
function isValidFile(uri: Uri): boolean {
  const ext = uri.fsPath.split(/[#?]/)[0].split('.').pop()?.trim();
  return ext !== undefined && monitoredFileTypes.has(ext);
}

/**
* Empty the caches entirely
*/
function clearAll(): void {
  clearIdentifierCache();
  returnBlockLinesCache.clear();
  switchStmtLinesCache.clear();
}

/**
* Empty the caches for a single file
*/
function clearFile(uri: Uri): void {
  clearIdentifierFile(uri);
  returnBlockLinesCache.clearFile(uri);
  switchStmtLinesCache.clearFile(uri);
}

export { rebuildAll, rebuildFile, rebuildActiveFile, clearFiles, renameFiles, createFiles, clearAll };
