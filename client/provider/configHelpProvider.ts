import type { Position, TextDocument} from 'vscode';
import type { MatchContext } from '../types';
import { ParameterInformation, SignatureHelp, SignatureInformation, commands } from 'vscode';
import { getBaseContext, getWordAtIndex } from '../utils/matchUtils';
import { getConfigLineMatch } from '../matching/matchers/configMatcher';
import { dataTypeToMatchId } from '../resource/dataTypeToMatchId';
import { contains } from '../cache/completionCache';
import { UNKNOWN } from '../matching/matchType';
import { set as setActiveCursor } from '../cache/activeCursorCache';

const configMetadata = {
  triggerCharacters: ['=', ','],
  retriggerCharacters: [',']
}

interface Config {
  key: string;
  params: string[];
  index: number;
}

const configHelpProvider = {
  provideSignatureHelp(document: TextDocument, position: Position) {
    let str = document.lineAt(position.line).text;
    str = str.substring(0, position.character) + 'temp' + str.substring(position.character);
    const baseContext = getBaseContext(str, position.line, document.uri);
    const lineIndex = position.character + 1;
    const word = getWordAtIndex(baseContext.words, lineIndex);
    if (!word) {
      return undefined;
    }
    const matchContext: MatchContext = {
      ...baseContext,
      word,
      lineIndex,
      prevWord: word.index === 0 ? undefined : baseContext.words[word.index - 1],
      prevChar: baseContext.line.text.charAt(word.start - 1),
      nextChar: baseContext.line.text.charAt(word.end + 1),
    };
    const config = getConfigLineMatch(matchContext) as Config | undefined;
    if (!config) {
      return undefined;
    }

    // Build the signature info
    const signatureInfo = new SignatureInformation(`${config.key}=${config.params.join(',')}`);
    let index = config.key.length + 1; // Starting index of params
    config.params.forEach(param => {
      // use range instead of param name due to possible duplicates
      signatureInfo.parameters.push(new ParameterInformation([index, index + param.length]));
      index += param.length + 1;
    });
    signatureInfo.activeParameter = config.index;

    // Build the signature help
    const signatureHelp = new SignatureHelp();
    signatureHelp.signatures.push(signatureInfo);
    signatureHelp.activeSignature = 0;
    invokeCompletionItems(dataTypeToMatchId(config.params[config.index]), document, position);
    return signatureHelp;
  }
}

function invokeCompletionItems(matchTypeId: string, document: TextDocument, position: Position) {
  setActiveCursor(matchTypeId, document, position);
  if (matchTypeId !== UNKNOWN.id) {
    const wordRange = document.getWordRangeAtPosition(position);
    const word = wordRange ? document.getText(wordRange) : '';
    if (contains(word, matchTypeId)) {
      return;
    }
    commands.executeCommand('editor.action.triggerSuggest');
  }
}

export { configHelpProvider, configMetadata };
