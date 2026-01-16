import { Trie } from './class/Trie';

/**
* One trie per matchType, stores the names of all identifiers of a matchtype in a trie datastructure
* This is used for quicker code completion lookups
*/
const completionCache: Record<string, Trie> = {};

function put(name: string, matchTypeId: string): void {
  if (!completionCache[matchTypeId]) {
    completionCache[matchTypeId] = new Trie();
  }
  completionCache[matchTypeId].insert(name);
  const colonIndex = name.indexOf(':');
  if (colonIndex >= 0) {
    completionCache[matchTypeId].insert(name.substring(colonIndex + 1));
  }
}

function getAllWithPrefix(prefix: string, matchTypeId: string): string[] | undefined {
  const matchTrie = completionCache[matchTypeId];
  if (matchTrie) {
    return matchTrie.findAllWithPrefix(prefix);
  }
  return undefined;
}

function contains(name: string, matchTypeId: string): boolean {
  const matchTrie = completionCache[matchTypeId];
  if (matchTrie) {
    return matchTrie.hasWord(name);
  }
  return false;
}

function remove(name: string, matchTypeId: string): void {
  const matchTrie = completionCache[matchTypeId];
  if (matchTrie) {
    matchTrie.removeWord(name);
  }
}

function clear(matchTypeId?: string): void {
  if (matchTypeId) {
    delete completionCache[matchTypeId];
  } else {
    for (const key of Object.keys(completionCache)) {
      delete completionCache[key];
    }
  }
}

function getTypes(): string[] {
  return Object.keys(completionCache);
}

export { put, getAllWithPrefix, getTypes, contains, remove, clear };
