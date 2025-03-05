const vscode = require('vscode');
const path = require('path');
const { INFO, VALUE, SIGNATURE, CODEBLOCK } = require('../enum/hoverDisplayItems');

function markdownBase(extensionContext) {
  const markdown = new vscode.MarkdownString();
  markdown.supportHtml = true;
  markdown.isTrusted = true;
  markdown.supportThemeIcons = true;
  markdown.baseUri = vscode.Uri.file(path.join(extensionContext.extensionPath, 'icons', path.sep)); 
  return markdown;
}

function expectedIdentifierMessage(word, match, markdown) {
  markdown.appendMarkdown(`<img src="warning.png">&ensp;<b>${match.id}</b>&ensp;<i>${word}</i> not found`);
}

function appendTitle(name, type, matchId, markdown, id, isCert) {
  if (isCert && id) {
    name = `${name} (cert) [${Number(id) + 1}]`;
  } else if (id) {
    name = `${name} [${id}]`;
  }
  markdown.appendMarkdown(`<img src="${type}.png">&ensp;<b>${matchId}</b>&ensp;${name}`);
}

function appendInfo(identifier, displayItems, markdown) {
  if (displayItems.includes(INFO) && identifier.info) {
    appendBody(`<i>${identifier.info}</i>`, markdown);
  }
}

function appendValue(identifier, displayItems, markdown) {
  if (displayItems.includes(VALUE) && identifier.value) {
    appendBody(`${identifier.value}`, markdown);
  }
}

function appendSignature(identifier, displayItems, markdown) {
  if (displayItems.includes(SIGNATURE) && identifier.signature) {
    if (identifier.signature.paramsText.length > 0) markdown.appendCodeblock(`params: ${identifier.signature.paramsText}`, identifier.language);
    if (identifier.signature.returnsText.length > 0) markdown.appendCodeblock(`returns: ${identifier.signature.returnsText}`, identifier.language);
  }
}

function appendCodeBlock(identifier, displayItems, markdown) {
  if (displayItems.includes(CODEBLOCK) && identifier.block) {
    markdown.appendCodeblock(identifier.block, identifier.language);
  }
}

function appendBody(text, markdown) {
  if (!markdown.value.includes('---')) {
    markdown.appendMarkdown('\n\n---');
  }
  markdown.appendMarkdown(`\n\n${text}`);
}

module.exports = { markdownBase, expectedIdentifierMessage, appendTitle, appendInfo, appendValue, 
  appendSignature, appendCodeBlock, appendBody };
