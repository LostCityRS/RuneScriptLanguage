import type { ExtensionContext } from 'vscode';
import type { MatchType, Identifier } from '../types';
import { MarkdownString, Uri } from 'vscode';
import { join, sep } from 'path';
import { INFO, VALUE, SIGNATURE, CODEBLOCK } from '../enum/hoverDisplayItems';
import { GLOBAL_VAR } from '../matching/matchType';

export function markdownBase(extensionContext: ExtensionContext): MarkdownString {
  const markdown = new MarkdownString();
  markdown.supportHtml = true;
  markdown.isTrusted = true;
  markdown.supportThemeIcons = true;
  markdown.baseUri = Uri.file(join(extensionContext.extensionPath, 'icons', sep));
  return markdown;
}

export function expectedIdentifierMessage(word: string, match: MatchType, markdown: MarkdownString): void {
  markdown.appendMarkdown(`<img src="warning.png">&ensp;<b>${match.id}</b>&ensp;<i>${word}</i> not found`);
}

export function appendTitle(name: string, type: string, matchId: string | undefined, markdown: MarkdownString, id?: string, isCert?: boolean): void {
  if (isCert) name = `${name} (cert)`;
  if (id) name = `${name} [${id}]`;
  markdown.appendMarkdown(`<b>${matchId === GLOBAL_VAR.id ? type.toUpperCase() : matchId}</b>&ensp;${name}`);
}

export function appendInfo(identifier: Identifier, displayItems: string[], markdown: MarkdownString): void {
  if (displayItems.includes(INFO) && identifier.info) {
    appendBody(`<i>${identifier.info}</i>`, markdown);
  }
}

export function appendValue(identifier: Identifier, displayItems: string[], markdown: MarkdownString): void {
  if (displayItems.includes(VALUE) && identifier.value) {
    appendBody(`${identifier.value}`, markdown);
  }
}

export function appendSignature(identifier: Identifier, displayItems: string[], markdown: MarkdownString): void {
  if (displayItems.includes(SIGNATURE) && identifier.signature) {
    if (identifier.signature.paramsText.length > 0) markdown.appendCodeblock(`params: ${identifier.signature.paramsText}`, identifier.language ?? 'runescript');
    if (identifier.signature.returnsText.length > 0) markdown.appendCodeblock(`returns: ${identifier.signature.returnsText}`, identifier.language ?? 'runescript');
  }
}

export function appendCodeBlock(identifier: Identifier, displayItems: string[], markdown: MarkdownString): void {
  if (displayItems.includes(CODEBLOCK) && identifier.block) {
    markdown.appendCodeblock(identifier.block, identifier.language ?? 'runescript');
  }
}

export function appendBody(text: string, markdown: MarkdownString): void {
  if (!markdown.value.includes('---')) {
    markdown.appendMarkdown('\n\n---');
  }
  markdown.appendMarkdown(`\n\n${text}`);
}