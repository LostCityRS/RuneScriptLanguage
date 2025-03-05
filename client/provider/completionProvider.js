const vscode = require('vscode');
const activeFileCache = require('../cache/activeFileCache');
const completionCache = require('../cache/completionCache');
const matchType = require('../matching/matchType');
const { matchWord } = require('../matching/matchWord');
const activeCursorCache = require('../cache/activeCursorCache');
const runescriptTrigger = require('../resource/triggers');

const triggers = ['$', '^', '%', '~', '@', '`', '>'];
const autoTriggeredTypeIds = [
  matchType.CONSTANT.id, 
  matchType.GLOBAL_VAR.id, 
  matchType.LOCAL_VAR.id, 
  matchType.PROC.id, 
  matchType.LABEL.id
];

const provider = {
  provideCompletionItems(document, position, cancellationToken, context) {
    if (context.triggerKind === 1) {
      if (context.triggerCharacter === '`' && position.character > 1 && 
          document.lineAt(position.line).text.charAt(position.character - 2) === '`') {
        return searchForMatchType(document, position, true);
      }
      return invoke(document, position, position.character - 1, '');
    }
    const wordRange = document.getWordRangeAtPosition(position);
    const word = (!wordRange) ? '' : document.getText(wordRange);
    const triggerIndex = (!wordRange) ? position.character - 1 : wordRange.start.character - 1;
    return invoke(document, position, triggerIndex, word);
  }
}

function invoke(document, position, triggerIndex, word) {
  switch (document.lineAt(position.line).text.charAt(triggerIndex)) {
    case '$': return completeLocalVar(position);
    case '`': return completionTypeSelector(position);
    case '>': return completionByType(document, position, triggerIndex, word);
    case '^': return completionByTrigger(word, matchType.CONSTANT.id);
    case '%': return completionByTrigger(word, matchType.GLOBAL_VAR.id);
    case '~': return completionByTrigger(word, matchType.PROC.id);
    case '@': return completionByTrigger(word, matchType.LABEL.id);
    default: return searchForMatchType(document, position);
  }
}

function completeLocalVar(position) {
  const completionItems = [];
  const completionKind = getCompletionItemKind(matchType.LOCAL_VAR.id);
  const scriptData = activeFileCache.getScriptData(position.line);
  if (scriptData) {
    Object.keys(scriptData.variables).forEach(varName => {
      const localVar = scriptData.variables[varName];
      const range = localVar.declaration.range;
      if (position.line > range.start.line || (position.line === range.start.line && position.character > range.end.character)) {
        const item = new vscode.CompletionItem(varName, completionKind);
        item.range = new vscode.Range(position.translate(0, -1), position);
        item.detail = localVar.parameter ? `${localVar.type} (param)` : localVar.type;
        completionItems.push(item);
      }
    });
  }
  return completionItems;
}

function completionByTrigger(prefix, matchTypeId, additionalTextEdits) {
  let identifierNames;
  if (matchTypeId === matchType.TRIGGER.id) {
    identifierNames = Object.keys(runescriptTrigger);
  } else {
    identifierNames = completionCache.getAllWithPrefix(prefix, matchTypeId);
  }
  if (!identifierNames) {
    return null;
  }
  const completionKind = getCompletionItemKind(matchTypeId);
  const completionItems = [];
  identifierNames.forEach(identifierName => {
    const item = new vscode.CompletionItem(identifierName, completionKind);
    item.detail = matchTypeId.toLowerCase();
    if (additionalTextEdits) item.additionalTextEdits = additionalTextEdits;
    completionItems.push(item);
  });
  return completionItems;
}

function completionTypeSelector(position) {
  const completionItems = completionCache.getTypes().filter(type => !autoTriggeredTypeIds.includes(type)).map(type => {
    const item = new vscode.CompletionItem(`${type}>`, vscode.CompletionItemKind.Enum);
    item.additionalTextEdits = [vscode.TextEdit.delete(new vscode.Range(position.translate(0, -1), position))];
    item.command = { command: 'editor.action.triggerSuggest' };
    return item;
  });
  return completionItems;
}

function completionByType(document, position, triggerIndex, word) {
  prevWordRange = document.getWordRangeAtPosition(new vscode.Position(position.line, triggerIndex));
  if (!prevWordRange) {
    return null;
  }
  const matchTypeId = document.getText(prevWordRange);
  const additionalTextEdits = [vscode.TextEdit.delete(new vscode.Range(prevWordRange.start, prevWordRange.end.translate(0, 1)))];
  return completionByTrigger(word, matchTypeId, additionalTextEdits);
}

function searchForMatchType(document, position, fromTrigger = false) {
  const triggerOffset = fromTrigger ? 2 : 0;
  let matchTypeId = fromTrigger ? false : activeCursorCache.get(document, position);
  if (!matchTypeId) {
    let str = document.lineAt(position.line).text;
    str = str.substring(0, position.character - triggerOffset) + 'temp' + str.substring(position.character);
    const match = matchWord(str, position.line, document.uri, position.character);
    matchTypeId = (match) ? match.match.id : matchType.COMMAND.id;
  }
  const additionalTextEdits = [vscode.TextEdit.delete(new vscode.Range(position.translate(0, -triggerOffset), position))];
  return completionByTrigger('', matchTypeId, additionalTextEdits);
}

function getCompletionItemKind(matchTypeId) {
  switch (matchTypeId) {
    case matchType.CONSTANT.id: return vscode.CompletionItemKind.Constant;
    case matchType.LOCAL_VAR.id:
    case matchType.GLOBAL_VAR.id: return vscode.CompletionItemKind.Variable;
    case matchType.COMMAND.id: 
    case matchType.PROC.id:
    case matchType.LABEL.id: return vscode.CompletionItemKind.Function;
    default: return vscode.CompletionItemKind.Text;
  }
}

module.exports = {triggers, provider};
