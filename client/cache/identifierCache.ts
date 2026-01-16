import type { Location, Uri } from 'vscode';
import type { FileKey, Identifier, IdentifierKey, IdentifierText, MatchType } from '../types';
import { build, buildRef } from '../resource/identifierFactory';
import { encodeReference, resolveFileKey, resolveIdentifierKey } from '../utils/cacheUtils';
import { clear as clearCompletionCache, put as putCompletionCache, remove as removeCompletionCache } from './completionCache';

/**
  * The identifierCache stores all matched identifiers in the workspace
  * identifierCache = {key [name+matchTypeId]: identifier}
  * See identifierFactory.js for the object structure
  */
let identifierCache: Record<IdentifierKey, Identifier> = {};

/**
 * The fileToIdentifierMap keeps track of all declarations and references within a file
 * This is used to invalidate any identifiers within a file and reprocess the file when changes have been made
 */
let fileToIdentifierMap: Record<FileKey, FileIdentifiers> = {};

/**
  * Tracks the keys of identifier declarations and references within a file
  */
interface FileIdentifiers {
  declarations: Set<IdentifierKey>;
  references: Set<IdentifierKey>;
}

/**
 * Check if the identifierCache contains an item using the identifier name and match type
 * @param name Name of the identifier
 * @param match MatchType of the identifier
 * @returns boolean: true if found, false otherwise
 */
function contains(name: string, match: MatchType): boolean {
  const key = resolveIdentifierKey(name, match);
  return key !== undefined && identifierCache[key] !== undefined;
}

/**
 * Get the cached identifier using the identifier name and match type
 * @param name Name of the identifier
 * @param match MatchType of the identifier
 * @returns Identifier if found, undefined otherwise
 */
function get(name: string, match: MatchType): Identifier | undefined {
  const key = resolveIdentifierKey(name, match);
  return key !== undefined ? identifierCache[key] : undefined;
}

/**
 * Get the cacched identifier using the identifier key
 * @param key IdentifierKey
 * @returns Identifier if found, undefined otherwise
 */
function getByKey(key: IdentifierKey): Identifier | undefined {
  return identifierCache[key];
}

/**
 * This function will return the parent identifier of a code block that the line number is a part of
 * @param uri URI of the file to check
 * @param lineNum Line number to start the check
 * @param requiredMatchTypeId Pass if a specific identifier matchType is required, otherwise any identifier is returned
 * @returns The identifier if found, undefined otherwise
 */
function getParentDeclaration(uri: Uri, lineNum: number, requiredMatchTypeId?: string): Identifier | undefined {
  // Make sure cache keys resolve correctly
  const fileKey = resolveFileKey(uri);
  if (!fileKey) {
    return undefined;
  }

  // Get the identifiers in the current file, can exit early if there are none or no declarations in the file
  const fileIdentifiers = fileToIdentifierMap[fileKey];
  if (!fileIdentifiers || fileIdentifiers.declarations.size === 0) {
    return undefined;
  }

  // Iterate thru all declarations in the file until we find the closest declaration to the lineNum without passing it
  let lineRef = -1;
  let declaration: Identifier | undefined;
  fileIdentifiers.declarations.forEach((dec) => {
    const iden = identifierCache[dec];
    if (iden && iden.declaration && iden.declaration.range.start.line < lineNum && iden.declaration.range.start.line > lineRef) {
      if (!requiredMatchTypeId || requiredMatchTypeId === iden.matchId) {
        lineRef = iden.declaration.range.start.line;
        declaration = iden;
      }
    }
  });
  return declaration || undefined;
}

/**
 * Put (declaration) identifier into the cache. Creates the identifier from the given data. 
 * @param name Identifier name
 * @param match Identifier match type
 * @param declaration Identifier declaration location
 * @param text Identifier text, full file text as lines and line number it is found on
 * @returns The new identifier or undefined if unable to resolve
 */
function put(name: string, match: MatchType, declaration: Location, text: IdentifierText): Identifier | undefined {
  // Make sure cache keys resolve correctly
  const key = resolveIdentifierKey(name, match);
  const fileKey = resolveFileKey(declaration.uri);
  if (!key || !fileKey) {
    return;
  }

  // Retrieve current identifier from cache (if any)
  let curIdentifier: Identifier | undefined = identifierCache[key];

  // If the current identifier in cache already is the declaration, don't overwrite (happens on 2nd cache populating pass)
  if (curIdentifier && curIdentifier.declaration) {
    return curIdentifier;
  }

  // Build the identifier to insert
  const identifier = build(name, match, declaration, text);

  // Copy existing (refernces only) identifier values (reference & id) into the new declaration identifier
  if (curIdentifier && curIdentifier.id) identifier.id = curIdentifier.id;
  if (curIdentifier && !curIdentifier.declaration) identifier.references = curIdentifier.references;

  // Add the declarartion to the file map 
  addToFileMap(fileKey, key, true);

  // Add the identifier to the cache
  identifierCache[key] = identifier;

  // Add the info to the completion cache
  putCompletionCache(name, match.id);

  // Also insert the declaration as a reference 
  putReference(name, match, declaration.uri, text.start, declaration.range.start.character);

  // Return the created identifier
  return identifier;
}

/**
 * Put (reference) identifier into the cache. Adds a reference if identifier already exists, creates it if not. 
 * @param name Identifier name
 * @param match Identifier match type
 * @param uri file URI the reference is found in
 * @param lineNum line number within the file the reference is found on
 * @param index the index within the line where the reference is found
 * @param packId the pack id, if any (ex: Obj id 1234)
 */
function putReference(name: string, match: MatchType, uri: Uri, lineNum: number, index: number, packId?: string): void {
  // Make sure cache keys resolve correctly
  const key = resolveIdentifierKey(name, match);
  const fileKey = resolveFileKey(uri);
  if (!key || !fileKey) {
    return;
  }

  // If the identifier doesn't yet exist in the cache, build the identifier with minimal necessary data
  if (!identifierCache[key]) {
    const ref = buildRef(name, match);
    if (!ref.matchId) return;
    identifierCache[key] = { ...ref, references: {} };
  }

  // Get the current references for this identifier in the current file (if any) and add this new reference
  const fileReferences = identifierCache[key].references[fileKey] || new Set<string>();
  fileReferences.add(encodeReference(lineNum, index));

  // Add the reference to the file map
  addToFileMap(fileKey, key, false);

  // Update the identifier in the identifier cache with the new references
  identifierCache[key].references[fileKey] = fileReferences;

  // If we have the pack id now, add it to the cached identifier
  if (packId) identifierCache[key].id = packId;

  // If the matchType of this identifier is reference only, add the data to the completion cache (others will get added when the declaration is added)
  if (match.referenceOnly) putCompletionCache(name, match.id);
}

/**
 * Clears the identifier cache and relevant supporting caches
 */
function clear(): void {
  identifierCache = {};
  fileToIdentifierMap = {};
  clearCompletionCache();
}

/**
 * Clears out all references and declarations from the cache of a given file
 * @param uri The file URI to clear out of the cache
 */
function clearFile(uri: Uri): void {
  // Make sure cache keys resolve correctly
  const fileKey = resolveFileKey(uri);
  if (!fileKey) {
    return;
  }

  // Get the identifiers in the file
  const identifiersInFile = fileToIdentifierMap[fileKey] || { declarations: new Set(), references: new Set() };

  // Iterate thru the references in the file
  identifiersInFile.references.forEach((key) => {
    if (identifierCache[key]) {
      // Delete references to the cleared file from every identifier which referenced the file
      if (identifierCache[key].references[fileKey]) {
        delete identifierCache[key].references[fileKey];
      }
      // Cleanup/Delete identifiers without a declaration who no longer have any references
      if (Object.keys(identifierCache[key].references).length === 0 && !identifierCache[key].declaration) {
        const iden = identifierCache[key];
        if (iden.matchId) {
          removeCompletionCache(iden.name, iden.matchId);
        }
        delete identifierCache[key];
      }
    }
  });

  // Iterate thru the declarations in the file
  identifiersInFile.declarations.forEach((key) => {
    if (identifierCache[key]) {
      // If the identifier has orphaned references, then we only delete the declaration and keep the identifier w/references
      // Otherwise, we delete the entire identifier (no declaration and no references => no longer exists in any capacity)
      const iden = identifierCache[key];
      if (iden.matchId) {
        removeCompletionCache(iden.name, iden.matchId);
      }
      const hasOrphanedRefs = Object.keys(identifierCache[key].references).length > 0;
      if (hasOrphanedRefs) {
        delete identifierCache[key].declaration;
      } else {
        delete identifierCache[key];
      }
    }
  });

  // Remove the entry for the file from the fileToIdentifierMap
  delete fileToIdentifierMap[fileKey];
}

/**
 * Update the fileMap with the file of a new identifier declared or referenced within said file
 * @param fileKey fileKey where this identifier declaration or reference is found
 * @param identifierKey identifierKey of this identifier 
 * @param declaration boolean: true if inserting a declaration, false if inserting a reference
 */
function addToFileMap(fileKey: FileKey, identifierKey: IdentifierKey, declaration = true): void {
  // Get the current identifiers in a file, or a new default empty set for both declarations and reference if nothing exists
  const identifiersInFile = fileToIdentifierMap[fileKey] || { declarations: new Set(), references: new Set() };

  // If we are inserting a declaration update declaration identifiers, else update reference identifiers of the file
  (declaration) ? identifiersInFile.declarations.add(identifierKey) : identifiersInFile.references.add(identifierKey);

  // Update the cache with the new data
  fileToIdentifierMap[fileKey] = identifiersInFile;
}

/**
 * Serialize the contents of the identifier cache, used for the export cache debug command
 * @returns cache records
 */
function serializeCache(): Record<string, unknown> {
  const serialized: Record<string, unknown> = {};
  Object.keys(identifierCache).forEach(key => {
    const identifier = identifierCache[key];
    serialized[key] = {
      ...identifier,
      declaration: identifier.declaration
      ? {
        uri: identifier.declaration.uri.fsPath,
        range: {
          start: {
            line: identifier.declaration.range.start.line,
            character: identifier.declaration.range.start.character
          },
          end: {
            line: identifier.declaration.range.end.line,
            character: identifier.declaration.range.end.character
          }
        }
      }
      : undefined,
      references: Object.fromEntries(
      Object.keys(identifier.references || {}).map(fileKey => [fileKey, Array.from(identifier.references[fileKey])])
      )
    };
  });
  return serialized;
}

/**
 * Return all of the cache keys in the identifier cache, used for the export cache keys debug command
 * @returns cache keys
 */
function getCacheKeys(): string[] {
  return Object.keys(identifierCache).sort();
}

export { contains, get, getParentDeclaration, getByKey, put, putReference, clear, clearFile, serializeCache, getCacheKeys };
