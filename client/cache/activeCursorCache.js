let activeCursorMatchTypeId;
let line;
let index;
let path;

function get(document, position) {
  if (document.uri.fsPath === path && position.line === line && getIndex(document, position) === index) {
    return activeCursorMatchTypeId;
  }
  return null;
}

function set(value, document, position) {
  path = document.uri.fsPath;
  index = getIndex(document, position);
  line = position.line;
  activeCursorMatchTypeId = value;
}

function getIndex(document, position) {
  return document.lineAt(position.line).text.substring(0, position.character).split(',').length;
}

module.exports = { get, set };
