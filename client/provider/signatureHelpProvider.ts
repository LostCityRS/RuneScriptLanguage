import type { Position, SignatureHelpProvider, SignatureHelpProviderMetadata, TextDocument} from 'vscode';
import type { MatchContext, ParamsMatchResponse, Identifier } from '../types';
import { ParameterInformation, SignatureHelp, SignatureInformation, commands } from 'vscode';
import { getBaseContext, getWordAtIndex } from '../utils/matchUtils';
import { COMMAND, TRIGGER, UNKNOWN } from '../matching/matchType';
import { get } from '../cache/identifierCache';
import { set as setActiveCursor } from '../cache/activeCursorCache';
import { dataTypeToMatchId } from '../resource/dataTypeToMatchId';
import { runescriptTrigger } from '../resource/triggers';
import { contains } from '../cache/completionCache';
import { getParamsMatch } from '../matching/matchers/parametersMatcher';

interface ParamIdentifier {
  isReturns: boolean;
  index: number;
  identifier: Identifier;
  dynamicCommand?: string;
}

const signatureMetadata: SignatureHelpProviderMetadata = {
  triggerCharacters: ['(', ',', '['],
  retriggerCharacters: [',']
}

const signatureHelpProvider: SignatureHelpProvider = {
  provideSignatureHelp(document: TextDocument, position: Position) {
    const signatureHelp = getScriptTriggerHelp(document, position);
    if (signatureHelp) {
      return signatureHelp;
    }
    return getParametersHelp(document, position);
  }
}

function getScriptTriggerHelp(document: TextDocument, position: Position): SignatureHelp | undefined {
  let matchTypeId = UNKNOWN.id;
  let signatureInfo: SignatureInformation | undefined;
  const str = document.lineAt(position.line).text;
  if (str.charAt(0) === '[') {
    if (position.character > str.indexOf(']')) {
      return undefined;
    }
    const split = str.split(',');
    if (split.length > 1) {
      const triggerName = split[0].substring(1);
      const trigger = runescriptTrigger[triggerName];
      if (trigger) {
        matchTypeId = trigger.declaration ? UNKNOWN.id : trigger.match.id;
        const matchLabel = matchTypeId === UNKNOWN.id ? `script_name` : matchTypeId.toLowerCase();
        signatureInfo = new SignatureInformation(`script [${triggerName},${matchLabel}]`);
        signatureInfo.parameters.push(new ParameterInformation(triggerName));
        signatureInfo.parameters.push(new ParameterInformation(matchLabel));
        signatureInfo.activeParameter = 1;
      }
    } else {
      matchTypeId = TRIGGER.id;
      signatureInfo = new SignatureInformation('script [trigger,value]');
      signatureInfo.parameters.push(new ParameterInformation('trigger'));
      signatureInfo.parameters.push(new ParameterInformation('value'));
      signatureInfo.activeParameter = 0;
    }
  }
  if (signatureInfo) {
    const signatureHelp = new SignatureHelp();
    signatureHelp.signatures.push(signatureInfo);
    signatureHelp.activeSignature = 0;
    invokeCompletionItems(matchTypeId, document, position);
    return signatureHelp;
  }
  return undefined;
}

function getParametersHelp(document: TextDocument, position: Position): SignatureHelp | undefined {
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
  const paramIden = getParamsMatch(matchContext);
  if (!paramIden) {
    return undefined;
  }
  const signature = paramIden.identifier.signature;
  if (!paramIden.isReturns && (!signature || signature.paramsText.length === 0)) {
    return displayMessage(`${paramIden.identifier.matchId} ${paramIden.identifier.name} has no parameters, remove the parenthesis`);
  }

  // For things like queues, manually handled - todo try to find better way
  const adjustedParamIden = handleDynamicParams(paramIden);

  // Build the signature info
  const adjustedSignature = adjustedParamIden.identifier.signature;
  if (!adjustedSignature) {
    return undefined;
  }
  const params = (adjustedParamIden.isReturns) ? adjustedSignature.returnsText : adjustedSignature.paramsText;
  const label = (adjustedParamIden.isReturns) ? `return (${params})` : `${adjustedParamIden.identifier.name}(${params})${adjustedSignature.returnsText.length > 0 ? `: ${adjustedSignature.returnsText}` : ''}`;
  const signatureInfo = new SignatureInformation(label);
  params.split(',').forEach(param => signatureInfo.parameters.push(new ParameterInformation(param.trim())));
  signatureInfo.activeParameter = adjustedParamIden.index;

  // Build the signature help
  const signatureHelp = new SignatureHelp();
  signatureHelp.signatures.push(signatureInfo);
  signatureHelp.activeSignature = 0;

  // Trigger autocomplete suggestions
  const paramLabel = signatureInfo.parameters[adjustedParamIden.index]?.label;
  if (typeof paramLabel === 'string') {
    invokeCompletionItems(dataTypeToMatchId(paramLabel.split(' ')[0]), document, position);
  }

  return signatureHelp;
}

function handleDynamicParams(paramIdentifier: ParamsMatchResponse): ParamIdentifier {
  if (paramIdentifier.dynamicCommand) {
    const name = paramIdentifier.identifier.name;
    const command = get(paramIdentifier.dynamicCommand, COMMAND);
    if (command && command.signature && command.signature.paramsText.length > 0) {
      const identifierSignature = paramIdentifier.identifier.signature;
      if (identifierSignature) {
        let paramsText = `${command.signature.paramsText}, ${identifierSignature.paramsText}`;
        paramsText = `${name}${paramsText.substring(paramsText.indexOf(','))}`;
        return {
          index: paramIdentifier.index,
          isReturns: paramIdentifier.isReturns ?? false,
          identifier: {
            name: paramIdentifier.dynamicCommand,
            matchId: '',
            references: {},
            fileType: 'rs2',
            language: 'runescript',
            signature: { params: [], returns: [], paramsText: paramsText, returnsText: '' }
          }
        };
      }
    }
  }
  return { ...paramIdentifier, isReturns: paramIdentifier.isReturns ?? false };
}

function displayMessage(message: string): SignatureHelp {
  const signatureInfo = new SignatureInformation(message);
  const signatureHelp = new SignatureHelp();
  signatureHelp.signatures.push(signatureInfo);
  signatureHelp.activeSignature = 0;
  return signatureHelp;
}

function invokeCompletionItems(matchTypeId: string, document: TextDocument, position: Position): void {
  setActiveCursor(matchTypeId, document, position);
  if (matchTypeId !== UNKNOWN.id) {
    const wordRange = document.getWordRangeAtPosition(position);
    const word = wordRange ? document.getText(wordRange) : '';
    if (TRIGGER.id === matchTypeId && runescriptTrigger[word]) {
      return;
    }
    if (contains(word, matchTypeId)) {
      return;
    }
    commands.executeCommand('editor.action.triggerSuggest');
  }
}

export { signatureHelpProvider, signatureMetadata };
