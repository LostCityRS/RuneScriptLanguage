const vscode = require('vscode');

function resolveKey(name, match) {
  return (!name || !match) ? null : name + match.id;
}

function resolveFileKey(uri) {
  return (uri) ? uri.fsPath : null;
}

function encodeReference(line, index) {
  return `${line}|${index}`;
}

function decodeReferenceToLocation(uri, encodedValue) {
  const split = encodedValue.split('|');
  return (split.length !== 2) ? null : new vscode.Location(uri, new vscode.Position(Number(split[0]), Number(split[1])));
}

function decodeReferenceToRange(wordLength, encodedValue) {
  const split = encodedValue.split('|');
  if (split.length !== 2) {
    return null;
  }
  const startPosition = new vscode.Position(Number(split[0]), Number(split[1]));
  return new vscode.Range(startPosition, startPosition.translate(0, wordLength));
}

module.exports = { resolveKey, resolveFileKey, encodeReference, decodeReferenceToLocation, decodeReferenceToRange };
