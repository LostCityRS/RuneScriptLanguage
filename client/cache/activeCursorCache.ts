import type { Position, TextDocument } from 'vscode';

let activeCursorMatchTypeId: string | undefined;
let line: number | undefined;
let index: number | undefined;
let path: string | undefined;

function get(document: TextDocument, position: Position): string | undefined  {
  if (document.uri.fsPath === path && position.line === line && getIndex(document, position) === index) {
    return activeCursorMatchTypeId;
  }
  return undefined;
}

function set(value: string, document: TextDocument, position: Position): void {
  path = document.uri.fsPath;
  index = getIndex(document, position);
  line = position.line;
  activeCursorMatchTypeId = value;
}

function getIndex(document: TextDocument, position: Position): number {
  return document.lineAt(position.line).text.substring(0, position.character).split(',').length;
}

export { get, set };
