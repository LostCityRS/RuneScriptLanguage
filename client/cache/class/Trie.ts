class TrieNode {
  children: Map<string, TrieNode>;
  value: string;
  endOfWord: boolean;

  constructor(value: string = '') {
    this.children = new Map<string, TrieNode>();
    this.value = value;
    this.endOfWord = false;
  }
}

export class Trie {
  private root: TrieNode;

  constructor() {
    this.root = new TrieNode();
  }

  insert(word: string): TrieNode | false {
    if (!word) return false;
    let currNode = this.root;
    for (const letter of word) {
      if (!currNode.children.has(letter)) {
        currNode.children.set(letter, new TrieNode(letter));
      }
      currNode = currNode.children.get(letter)!;
    }
    currNode.endOfWord = true;
    return currNode;
  }

  getLastNode(letters: string, start: TrieNode = this.root): TrieNode | false {
    let currNode = start;
    for (const letter of letters) {
      if (!currNode.children.has(letter)) return false;
      currNode = currNode.children.get(letter)!;
    }
    return currNode;
  }

  hasWord(word: string, start: TrieNode = this.root): boolean {
    let node = this.getLastNode(word, start);
    return node && node !== this.root ? node.endOfWord : false;
  }

  findAllWithPrefix(prefix: string, start: TrieNode = this.root): string[] {
    let words: string[] = [];
    let currNode = this.getLastNode(prefix, start);
    if (currNode) {
      if (currNode.endOfWord) words.push(prefix);
      currNode.children.forEach((child) =>
      this.getWordsFrom(child, prefix, words)
      );
    }
    return words;
  }

  getWordsFrom(node: TrieNode = this.root, stringAcc: string = '', array: string[] = []): string[] | undefined {
    if (!node) return undefined;
    stringAcc += node.value;
    if (node.endOfWord) array.push(stringAcc);
    node.children.forEach((child) => {
      this.getWordsFrom(child, stringAcc, array);
    });
    return array;
  }

  removeWord(word: string): boolean {
    if (!word) return false;
    let currNode = this.root;
    let stack: TrieNode[] = [];
    for (const letter of word) {
      if (!currNode.children.has(letter)) return false;
      currNode = currNode.children.get(letter)!;
      if (word[word.length - 1] !== currNode.value) stack.push(currNode);
    }
    currNode.endOfWord = false;
    while (stack.length > 0 && !currNode.endOfWord) {
      let prevNode = currNode;
      currNode = stack.pop()!;
      if (prevNode.children.size > 0) {
        break;
      }
      currNode.children.delete(prevNode.value);
    }
    return true;
  }

  clear(): void {
    this.root.children.clear();
  }
}
