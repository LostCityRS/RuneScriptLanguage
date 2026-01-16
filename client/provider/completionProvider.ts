import type { CancellationToken, CompletionContext, TextDocument, CompletionItemProvider } from 'vscode';
import { CompletionItem, CompletionItemKind, Position, Range, TextEdit } from 'vscode';
import { getScriptData } from '../cache/activeFileCache';
import { getAllWithPrefix, getTypes } from '../cache/completionCache';
import { COMMAND, CONSTANT, GLOBAL_VAR, LABEL, LOCAL_VAR, PROC, TRIGGER } from '../matching/matchType';
import { matchWord } from '../matching/matchWord';
import { get as getActiveCursorMatchType } from '../cache/activeCursorCache';
import { runescriptTrigger } from '../resource/triggers';

const completionTriggers = ['$', '^', '%', '~', '@', '`', '>'];
const autoTriggeredTypeIds = [
  CONSTANT.id,
  GLOBAL_VAR.id,
  LOCAL_VAR.id,
  PROC.id,
  LABEL.id
];

const completionProvider: CompletionItemProvider<CompletionItem> = {
  provideCompletionItems(document: TextDocument, position: Position, _cancellationToken: CancellationToken, context: CompletionContext): CompletionItem[] {
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

function invoke(document: TextDocument, position: Position, triggerIndex: number, word: string): CompletionItem[] {
  switch (document.lineAt(position.line).text.charAt(triggerIndex)) {
    case '$': return completeLocalVar(position);
    case '`': return completionTypeSelector(position);
    case '>': return completionByType(document, position, triggerIndex, word);
    case '^': return completionByTrigger(word, CONSTANT.id);
    case '%': return completionByTrigger(word, GLOBAL_VAR.id);
    case '~': return completionByTrigger(word, PROC.id);
    case '@': return completionByTrigger(word, LABEL.id);
    default: return searchForMatchType(document, position);
  }
}

function completeLocalVar(position: Position): CompletionItem[] {
  const completionItems: CompletionItem[] = [];
  const completionKind = getCompletionItemKind(LOCAL_VAR.id);
  const scriptData = getScriptData(position.line);
  if (scriptData) {
    Object.keys(scriptData.variables).forEach(varName => {
      const localVar = scriptData.variables[varName];
      const range = localVar.declaration.range;
      if (position.line > range.start.line || (position.line === range.start.line && position.character > range.end.character)) {
        const item = new CompletionItem(varName, completionKind);
        item.range = new Range(position.translate(0, -1), position);
        item.detail = localVar.parameter ? `${localVar.type} (param)` : localVar.type;
        completionItems.push(item);
      }
    });
  }
  return completionItems;
}

function completionByTrigger(prefix: string, matchTypeId: string, additionalTextEdits?: TextEdit[]): CompletionItem[] {
  const completionItems: CompletionItem[] = [];
  let identifierNames: string[] | undefined;
  if (matchTypeId === TRIGGER.id) {
    identifierNames = Object.keys(runescriptTrigger);
  } else {
    identifierNames = getAllWithPrefix(prefix, matchTypeId);
  }
  if (!identifierNames) {
    return completionItems;
  }
  const completionKind = getCompletionItemKind(matchTypeId);
  identifierNames.forEach(identifierName => {
    const item = new CompletionItem(identifierName, completionKind);
    item.detail = matchTypeId.toLowerCase();
    if (additionalTextEdits) item.additionalTextEdits = additionalTextEdits;
    completionItems.push(item);
  });
  return completionItems;
}

function completionTypeSelector(position: Position): CompletionItem[] {
  const completionItems = getTypes().filter(type => !autoTriggeredTypeIds.includes(type)).map(type => {
    const item = new CompletionItem(`${type}>`, CompletionItemKind.Enum);
    item.additionalTextEdits = [TextEdit.delete(new Range(position.translate(0, -1), position))];
    item.command = { command: 'editor.action.triggerSuggest', title: 'Trigger Suggest' };
    return item;
  });
  return completionItems;
}

function completionByType(document: TextDocument, position: Position, triggerIndex: number, word: string): CompletionItem[] {
  const completionItems: CompletionItem[] = [];
  const prevWordRange = document.getWordRangeAtPosition(new Position(position.line, triggerIndex));
  if (!prevWordRange) {
    return completionItems;
  }
  const matchTypeId = document.getText(prevWordRange);
  const additionalTextEdits = [TextEdit.delete(new Range(prevWordRange.start, position))];
  return completionByTrigger(word, matchTypeId, additionalTextEdits);
}

function searchForMatchType(document: TextDocument, position: Position, fromTrigger = false): CompletionItem[] {
  const triggerOffset = fromTrigger ? 2 : 0;
  let matchTypeId = fromTrigger ? false : getActiveCursorMatchType(document, position);
  if (!matchTypeId) {
    let str = document.lineAt(position.line).text;
    str = str.substring(0, position.character - triggerOffset) + 'temp' + str.substring(position.character);
    const matchResult = matchWord(str, position.line, document.uri, position.character);
    matchTypeId = (matchResult) ? matchResult.matchType.id : COMMAND.id;
  }
  const additionalTextEdits = [TextEdit.delete(new Range(position.translate(0, -triggerOffset), position))];
  return completionByTrigger('', matchTypeId, additionalTextEdits);
}

function getCompletionItemKind(matchTypeId: string): CompletionItemKind {
  switch (matchTypeId) {
    case CONSTANT.id: return CompletionItemKind.Constant;
    case LOCAL_VAR.id:
    case GLOBAL_VAR.id: return CompletionItemKind.Variable;
    case COMMAND.id:
    case PROC.id:
    case LABEL.id: return CompletionItemKind.Function;
    default: return CompletionItemKind.Text;
  }
}

export { completionTriggers, completionProvider };
