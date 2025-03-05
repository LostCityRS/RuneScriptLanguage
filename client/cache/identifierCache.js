const { buildRef } = require('../resource/identifierFactory');
const cacheUtils = require('../utils/cacheUtils');
const completionCache = require('./completionCache');

/**
 * The identifierCache stores all matched identifiers in the workspace
 * identifierCache = {key [name+matchTypeId]: identifier}
 * See identifierFactory.js for the object structure
 */
var identifierCache = {};

/**
 * The fileToIdentiferMap keeps track of all identifiers and references in a file
 * This is used for updating the cache as necessary when a file is modified
 * fileToIdentiferMap = {filePath: {declarations: Set(): identifierKey, references: Set(): identifierKey}}
 */
var fileToIdentifierMap = {};

function contains(name, match) {
  return identifierCache[cacheUtils.resolveKey(name, match)] !== undefined;
}

function get(name, match) {
  return identifierCache[cacheUtils.resolveKey(name, match)];
}

function getByKey(key) {
  return identifierCache[key];
}

/**
 * Given a file URI, a line number, this will return the closest declaration identifier
 * to the given line number which is above the line number provided.
 */
function getParentDeclaration(uri, lineNum, requiredMatchTypeId=undefined) {
  const fileIdentifiers = fileToIdentifierMap[cacheUtils.resolveFileKey(uri)];
  if (!fileIdentifiers) {
    return null;
  }
  let lineRef = -1;
  let declaration;
  fileIdentifiers.declarations.forEach(dec => {
    const iden = identifierCache[dec];
    if (iden.declaration && iden.declaration.range.start.line < lineNum && iden.declaration.range.start.line > lineRef) {
      if (!requiredMatchTypeId || requiredMatchTypeId === iden.matchId) {
        lineRef = iden.declaration.range.start.line;
        declaration = iden;
      }
    }
  });
  return declaration;
}

function put(name, match, identifier) {
  const key = cacheUtils.resolveKey(name, match);
  const fileKey = cacheUtils.resolveFileKey(identifier.declaration.uri);
  if (!key || !fileKey) {
    return null;
  }
  let curIdentifier = identifierCache[key];
  if (curIdentifier && curIdentifier.declaration) {
    return null; // declaration already exists, don't overwrite, if it needs to be updated it should be deleted first
  }
  if (curIdentifier) {
    if (curIdentifier.id) identifier.id = curIdentifier.id;
    if (!curIdentifier.declaration) identifier.references = curIdentifier.references;
  }
  addToFileMap(fileKey, key);
  identifierCache[key] = identifier;
  completionCache.put(name, match.id);
}

function putReference(name, match, uri, lineNum, index, packId) {
  const key = cacheUtils.resolveKey(name, match)
  const fileKey = cacheUtils.resolveFileKey(uri);
  if (!key || !fileKey) {
    return null;
  }
  if (!identifierCache[key]) {
    identifierCache[key] = buildRef(name, match);
  } 
  const fileReferences = identifierCache[key].references[fileKey] || new Set();
  fileReferences.add(cacheUtils.encodeReference(lineNum, index));
  addToFileMap(fileKey, key, false);
  identifierCache[key].references[fileKey] = fileReferences;
  if (packId) identifierCache[key].id = packId;
  if (match.referenceOnly) completionCache.put(name, match.id);
}

function clear() {
  identifierCache = {};
  fileToIdentifierMap = {};
  completionCache.clear();
}

function clearFile(uri) {
  const fileKey = cacheUtils.resolveFileKey(uri);
  const identifiersInFile = fileToIdentifierMap[fileKey] || { declarations: new Set(), references: new Set() };
  identifiersInFile.references.forEach(key => {
    if (identifierCache[key]) {
      // Delete references to the cleared file from every identifier which referenced the file
      if (identifierCache[key].references[fileKey]) {
        delete identifierCache[key].references[fileKey];
      }
      // Cleanup/Delete identifiers without a declaration who no longer have any references
      if (Object.keys(identifierCache[key].references).length === 0 && !identifierCache[key].declaration) {
        const iden = identifierCache[key];
        completionCache.remove(iden.name, iden.matchId);
        delete identifierCache[key];
      }
    }
  })
  identifiersInFile.declarations.forEach(key => {
    if (identifierCache[key]) {
      // If the identifier has orphaned references, then we only delete the declaration and keep the identifier w/references
      // Otherwise, we delete the entire identifier (no declaration and no references => no longer exists in any capacity)
      const iden = identifierCache[key];
      completionCache.remove(iden.name, iden.matchId);
      const hasOrphanedRefs = Object.keys(identifierCache[key].references).length > 0;
      if (hasOrphanedRefs) {
        delete identifierCache[key].declaration;
      } else {
        delete identifierCache[key];
      }
    }
  });
  delete fileToIdentifierMap[fileKey];
}

function addToFileMap(fileKey, identifierKey, declaration=true) {
  const identifiersInFile = fileToIdentifierMap[fileKey] || { declarations: new Set(), references: new Set() };
  (declaration) ? identifiersInFile.declarations.add(identifierKey) : identifiersInFile.references.add(identifierKey);
  fileToIdentifierMap[fileKey] = identifiersInFile;
}

module.exports = { contains, get, getParentDeclaration, getByKey, put, putReference, clear, clearFile };
