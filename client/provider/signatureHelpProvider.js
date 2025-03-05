const vscode = require('vscode');
const { getBaseContext } = require('../utils/matchUtils');
const matchType = require('../matching/matchType');
const { get } = require('../cache/identifierCache');
const activeCursorCache = require('../cache/activeCursorCache');
const dataTypeToMatchId = require('../resource/dataTypeToMatchId');
const runescriptTrigger = require('../resource/triggers');
const { contains } = require('../cache/completionCache');
const { getParamsMatch } = require('../matching/matchers/parametersMatcher');

const metadata = {
  triggerCharacters: ['(', ',', '['], 
  retriggerCharacters: [',']
}

const provider = {
  provideSignatureHelp(document, position) {
    const signatureHelp = getScriptTriggerHelp(document, position);
    if (signatureHelp) {
      return signatureHelp;
    }
    return getParametersHelp(document, position);
  }
}

function getScriptTriggerHelp(document, position) {
  let matchTypeId = matchType.UNKNOWN.id;
  let signatureInfo;
  const str = document.lineAt(position.line).text;
  if (str.charAt(0) === '[') {
    if (position.character > str.indexOf(']')) {
      return null;
    }
    const split = str.split(',');
    if (split.length > 1) {
      const triggerName = split[0].substring(1);
      const trigger = runescriptTrigger[triggerName];
      if (trigger) {
        matchTypeId = trigger.declaration ? matchType.UNKNOWN.id : trigger.match.id;
        const matchLabel = matchTypeId === matchType.UNKNOWN.id ? `script_name` : matchTypeId.toLowerCase();
        signatureInfo = new vscode.SignatureInformation(`script [${triggerName},${matchLabel}]`);
        signatureInfo.parameters.push(new vscode.ParameterInformation(triggerName));
        signatureInfo.parameters.push(new vscode.ParameterInformation(matchLabel));
        signatureInfo.activeParameter = 1;
      }
    } else {
      matchTypeId = matchType.TRIGGER.id;
      signatureInfo = new vscode.SignatureInformation('script [trigger,value]');
      signatureInfo.parameters.push(new vscode.ParameterInformation('trigger'));
      signatureInfo.parameters.push(new vscode.ParameterInformation('value'));
      signatureInfo.activeParameter = 0;
    }
  }
  if (signatureInfo) {
    const signatureHelp = new vscode.SignatureHelp();
    signatureHelp.signatures.push(signatureInfo);
    signatureHelp.activeSignature = 0;
    invokeCompletionItems(matchTypeId, document, position);
    return signatureHelp;
  }
  return null;
}

function getParametersHelp(document, position) {
  let str = document.lineAt(position.line).text;
  str = str.substring(0, position.character) + 'temp' + str.substring(position.character);
  const matchContext = getBaseContext(str, position.line, document.uri);
  matchContext.lineIndex = position.character + 1;
  var paramIden = getParamsMatch(matchContext);
  if (!paramIden) {
    return null;
  }
  if (!paramIden.isReturns && paramIden.identifier.signature.paramsText.length === 0) {
    return displayMessage(`${paramIden.identifier.matchId} ${paramIden.identifier.name} has no parameters, remove the parenthesis`);
  }

  // For things like queues, manually handled - todo try to find better way
  paramIden = handleDynamicParams(paramIden);

  // Build the signature info
  const signature = paramIden.identifier.signature;
  const params = (paramIden.isReturns) ? signature.returnsText : signature.paramsText;
  const label = (paramIden.isReturns) ? `return (${params})` : `${paramIden.identifier.name}(${params})${signature.returnsText.length > 0 ? `: ${signature.returnsText}` : ''}`;
  const signatureInfo = new vscode.SignatureInformation(label);
  params.split(',').forEach(param => signatureInfo.parameters.push(new vscode.ParameterInformation(param.trim())));
  signatureInfo.activeParameter = paramIden.index;

  // Build the signature help
  const signatureHelp = new vscode.SignatureHelp();
  signatureHelp.signatures.push(signatureInfo);
  signatureHelp.activeSignature = 0;

  // Trigger autocomplete suggestions 
  invokeCompletionItems(dataTypeToMatchId(signatureInfo.parameters[paramIden.index].label.split(' ')[0]), document, position);

  return signatureHelp;
}

function handleDynamicParams(paramIdentifier) {
  if (paramIdentifier.dynamicCommand && paramIdentifier.identifier.signature.paramsText.length > 0) {
    const name = paramIdentifier.identifier.name;
    const command = get(paramIdentifier.dynamicCommand, matchType.COMMAND);
    if (command && command.signature.paramsText.length > 0) {
      let paramsText = `${command.signature.paramsText}, ${paramIdentifier.identifier.signature.paramsText}`;
      paramsText = `${name}${paramsText.substring(paramsText.indexOf(','))}`;
      return {index: paramIdentifier.index, identifier: {name: paramIdentifier.dynamicCommand, signature: {paramsText: paramsText, returnsText: ''}}};
    }
  }
  return paramIdentifier;
}

function displayMessage(message) {
  const signatureInfo = new vscode.SignatureInformation(message);
  const signatureHelp = new vscode.SignatureHelp();
  signatureHelp.signatures.push(signatureInfo);
  signatureHelp.activeSignature = 0;
  return signatureHelp;
}

function invokeCompletionItems(matchTypeId, document, position) {
  activeCursorCache.set(matchTypeId, document, position);
  if (matchTypeId !== matchType.UNKNOWN.id) {
    const word = document.getText(document.getWordRangeAtPosition(position));
    if (matchType.TRIGGER.id === matchTypeId && runescriptTrigger[word]) {
      return;
    }
    if (contains(word, matchTypeId)) {
      return;
    }
    vscode.commands.executeCommand('editor.action.triggerSuggest');
  }
}

module.exports = { provider, metadata };
