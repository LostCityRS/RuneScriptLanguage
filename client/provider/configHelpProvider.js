const vscode = require('vscode');
const { getBaseContext, getWordAtIndex } = require('../utils/matchUtils');
const { getConfigLineMatch } = require('../matching/matchers/configMatcher');
const dataTypeToMatchId = require('../resource/dataTypeToMatchId');
const { contains } = require('../cache/completionCache');
const matchType = require('../matching/matchType');
const activeCursorCache = require('../cache/activeCursorCache');

const metadata = {
  triggerCharacters: ['=', ','], 
  retriggerCharacters: [',']
}

const provider = {
  provideSignatureHelp(document, position) {
    let str = document.lineAt(position.line).text;
    str = str.substring(0, position.character) + 'temp' + str.substring(position.character);
    const matchContext = getBaseContext(str, position.line, document.uri);
    matchContext.lineIndex = position.character + 1;
    matchContext.word = getWordAtIndex(matchContext.words, matchContext.lineIndex);
    const config = getConfigLineMatch(matchContext);
    if (!config) {
      return null;
    }

    // Build the signature info
    const signatureInfo = new vscode.SignatureInformation(`${config.key}=${config.params.join(',')}`);
    let index = config.key.length + 1; // Starting index of params
    config.params.forEach(param => {
      // use range instead of param name due to possible duplicates
      signatureInfo.parameters.push(new vscode.ParameterInformation([index, index + param.length]));
      index += param.length + 1;
    });
    signatureInfo.activeParameter = config.index;
    
    // Build the signature help
    const signatureHelp = new vscode.SignatureHelp();
    signatureHelp.signatures.push(signatureInfo);
    signatureHelp.activeSignature = 0;
    invokeCompletionItems(dataTypeToMatchId(config.params[config.index]), document, position);
    return signatureHelp;
  }
}

function invokeCompletionItems(matchTypeId, document, position) {
  activeCursorCache.set(matchTypeId, document, position);
  if (matchTypeId !== matchType.UNKNOWN.id) {
    const word = document.getText(document.getWordRangeAtPosition(position));
    if (contains(word, matchTypeId)) {
      return;
    }
    vscode.commands.executeCommand('editor.action.triggerSuggest');
  }
}

module.exports = { provider, metadata };
