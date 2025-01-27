const fs = require('fs').promises;
const vscode = require('vscode');
const matchType = require("../matching/matchType");
const identifierCache = require('./identifierCache');
const stringUtils = require('../utils/stringUtils');
const { matchWords } = require('../matching/matchWord');
const identifierFactory = require('../resource/identifierFactory');
const { INFO_MATCHER, TRIGGER_LINE } = require('../enum/regex');
const cacheUtils = require('../utils/cacheUtils');
const returnBlockLinesCache = require('./returnBlockLinesCache');
const switchStmtLinesCache = require('./switchStmtLinesCache');
const dataTypeToMatchId = require('../resource/dataTypeToMatchId');

/**
 * Builds the set of monitored file types, any file events with other file types will be ignored
 * Monitored file types are determined by checking all file types defined in the matchType object
 */
const monitoredFileTypes = new Set();
function determineFileTypes() {
  Object.keys(matchType).forEach(matchTypeId => {
    const fileTypes = matchType[matchTypeId].fileTypes || [];
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
async function rebuildAll() {
  if (monitoredFileTypes.size === 0) determineFileTypes();
  clearAll();
  const fileUris = await getFiles();
  await Promise.all(fileUris.map(uri => parseFileAndCacheIdentifiers(uri)));
  return Promise.all(fileUris.map(uri => parseFileAndCacheIdentifiers(uri)));
}

/**
 * Rebuilds the identifier cache for identifiers in the provided file uri
 */
async function rebuildFile(uri) {
  if (isValidFile(uri)) {
    clearFile(uri);
    parseFileAndCacheIdentifiers(uri);
  }
}

/**
 * Clears the identifier cache for identifiers in the provided list of file uris
 */
async function clearFiles(uris) {
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
async function renameFiles(uriPairs) {
  for (const uriPair of uriPairs) {
    if (isValidFile(uriPair.oldUri) && isValidFile(uriPair.newUri)) {
      clearFile(uriPair.oldUri);
      parseFileAndCacheIdentifiers(uriPair.newUri);
    }
  }
}

/**
 * Adds to cache for new files
 */
async function createFiles(uris) {
  for (const uri of uris) {
    if (isValidFile(uri)) {
      parseFileAndCacheIdentifiers(uri);
    }
  }
}

/**
 * Get a list of all relevant files in the workspace which might contain identifiers
 */
async function getFiles() {
  const fileTypesToScan = [];
  monitoredFileTypes.forEach(fileType => fileTypesToScan.push(`**/*.${fileType}`));
  return vscode.workspace.findFiles(`{${[...fileTypesToScan].join(',')}}`);
}

/**
 * Parses the input file for identifiers, and caches them when found
 */
async function parseFileAndCacheIdentifiers(uri) {
  cacheIfFile(uri);
  const isRs2 = uri.path.endsWith('.rs2');
  const fileText = await fs.readFile(uri.path, "utf8");
  const lines = stringUtils.getLines(fileText);
  for (let line = 0; line < lines.length; line++) {
    cacheSwitchStatementBlock(line, uri);
    const matches = (matchWords(lines[line], line, uri) || []).filter(match => match && match.match.cache); 
    if (matches.length > 0) {
      const text = {lines: null, start: 0};
      matches.forEach(match => {
        if (match.match.declaration) {
          text.lines = (text.lines) ? text.lines : lines.slice(line);
          const location = new vscode.Location(uri, new vscode.Position(line, match.context.word.start));
          const info = (line > 0) ? getInfo(lines[line - 1]) : null;
          const identifier = identifierFactory.build(match.word, match.match, location, info, text);
          identifierCache.put(match.word, match.match, identifier);
          cacheReturnBlock(identifier, line, match);
        } else {
          identifierCache.putReference(match.word, match.match, uri, line, match.context.word.start);
        }
      });
    }
  }

  function cacheIfFile(uri) {
    if (uri.path.endsWith('.if')) {
      const fileSplit = uri.path.split('\\').pop().split('/').pop().split('.');
      const location = new vscode.Location(uri, new vscode.Position(0, 0));
      const identifier = identifierFactory.build(fileSplit[0], matchType.INTERFACE, location, null, []);
      identifierCache.put(fileSplit[0], matchType.INTERFACE, identifier);
    }
  }

  function cacheReturnBlock(identifier, line, match) {
    if (isRs2 && identifier.signature.returns.length > 0 && TRIGGER_LINE.test(lines[line])) {
      returnBlockLinesCache.put(line + 1, cacheUtils.resolveKey(match.word, match.match), uri);
    }
  }

  function cacheSwitchStatementBlock(line, uri) {
    if (isRs2) {
      const switchSplit = lines[line].split("switch_");
      if (switchSplit.length > 1) {
        const switchMatchType = dataTypeToMatchId(switchSplit[1].split(/[ (]/)[0]);
        if (switchMatchType !== matchType.UNKNOWN.id) {
          switchStmtLinesCache.put(line + 1, switchMatchType, uri);
        }
      }
    }
  }
}

/**
 * Checks the previous line before an identifier for an "info" tag, if so it is added to the identifier
 */
function getInfo(infoLine) {
  if (!infoLine) return null;
  const infoMatch = INFO_MATCHER.exec(infoLine);
  return (infoMatch && infoMatch[2]) ? infoMatch[2].trim() : null;
}

/**
 * Checks if the file extension of the uri is in the list of monitored file types
 */
function isValidFile(uri) {
  return monitoredFileTypes.has(uri.path.split(/[#?]/)[0].split('.').pop().trim());
}

/**
 * Empty the caches entirely
 */
function clearAll() {
  identifierCache.clear();
  returnBlockLinesCache.clear();
  switchStmtLinesCache.clear();
}

/**
 * Empty the caches for a single file
 */
function clearFile(uri) {
  identifierCache.clearFile(uri);
  returnBlockLinesCache.clearFile(uri);
  switchStmtLinesCache.clearFile(uri);
}

module.exports = { rebuildAll, rebuildFile, clearFiles, renameFiles, createFiles, clearAll }
