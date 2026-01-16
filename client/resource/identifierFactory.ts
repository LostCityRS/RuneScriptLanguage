import type { Location } from 'vscode';
import type { Identifier, IdentifierText, MatchType } from '../types';
import { dataTypeToMatchId } from './dataTypeToMatchId';
import { getBlockSkipLines, getConfigInclusions, getHoverLanguage, resolveAllHoverItems } from './hoverConfigResolver';
import { SIGNATURE, CODEBLOCK } from '../enum/hoverDisplayItems';
import { END_OF_BLOCK_LINE_REGEX, INFO_MATCHER_REGEX } from '../enum/regex';

function buildFromDeclaration(name: string, match: MatchType, declarationLocation: Location, text?: IdentifierText): Identifier {
  const identifier: Identifier = {
    name: name,
    matchId: match.id,
    declaration: declarationLocation,
    references: {},
    fileType: declarationLocation.uri.fsPath.split(/[#?]/)[0].split('.').pop()!.trim(),
    language: getHoverLanguage(match)
  };
  process(identifier, match, text);
  return identifier;
}

function buildFromReference(name: string, match: MatchType): Identifier {
  const identifier: Identifier = {
    name: name,
    matchId: match.id,
    references: {},
    fileType: (match.fileTypes || [])[0] || 'rs2',
    language: getHoverLanguage(match),
  };
  if (match.referenceOnly) {
    process(identifier, match);
  }
  return identifier;
}

function process(identifier: Identifier, match: MatchType, text?: IdentifierText): void {
  // Add extra data if any
  const extraData = match.extraData;
  if (extraData) {
    if (!identifier.extraData) identifier.extraData = {};
    Object.keys(extraData).forEach(key => {
      if (identifier.extraData) {
        identifier.extraData[key] = extraData[key];
      }
    });
  }

  // Process hover display texts
  if (text) {
    processInfoText(identifier, text);
    const hoverDisplayItems = resolveAllHoverItems(match);
    for (const hoverDisplayItem of hoverDisplayItems) {
      switch(hoverDisplayItem) {
        case SIGNATURE: processSignature(identifier, text); break;
        case CODEBLOCK: processCodeBlock(identifier, match, text); break;
      }
    }
  }

  // Execute custom post processing for the identifier's matchType (if defined)
  if (match.postProcessor) {
    match.postProcessor(identifier);
  }
}

function processSignature(identifier: Identifier, text: IdentifierText): void {
  // Get first line of text, which should contain the data for parsing the signature
  let line = text.lines[text.start];
  if (!line) return;

  // Parse input params
  const params: Array<{ type: string; name: string; matchTypeId: string }> = [];
  let openingIndex = line.indexOf('(');
  let closingIndex = line.indexOf(')');
  if (openingIndex >= 0 && closingIndex >= 0 && ++openingIndex !== closingIndex) {
    line.substring(openingIndex, closingIndex).split(',').forEach(param => {
      if (param.startsWith(' ')) param = param.substring(1);
      const split = param.split(' ');
      if (split.length === 2) {
        params.push({ type: split[0], name: split[1], matchTypeId: dataTypeToMatchId(split[0]) });
      }
    });
  }

  // Parse response type
  let returns: string[] = [];
  let returnsText = '';
  line = line.substring(closingIndex + 1);
  openingIndex = line.indexOf('(');
  closingIndex = line.indexOf(')');
  if (openingIndex >= 0 && closingIndex >= 0 && ++openingIndex !== closingIndex) {
    returnsText = line.substring(openingIndex, closingIndex);
    returns = line.substring(openingIndex, closingIndex).split(',').map(item => dataTypeToMatchId(item.trim()));
  }

  // Add signature to identifier
  const paramsText = (params.length > 0) ? params.map(param => `${param.type} ${param.name}`).join(', ') : '';
  identifier.signature = { params, returns, paramsText, returnsText };
}

function processCodeBlock(identifier: Identifier, match: MatchType, text: IdentifierText): void {
  const lines = text.lines;
  const startIndex = text.start + Number(getBlockSkipLines(match));
  const configInclusionTags = getConfigInclusions(match);
  let blockInclusionLines: string[] = [];
  const matchType = match;

  if (matchType.id === 'CONSTANT' && lines[startIndex]) blockInclusionLines.push(lines[startIndex]);
  for (let i = startIndex; i < lines.length; i++) {
    let currentLine = lines[i];
    if (END_OF_BLOCK_LINE_REGEX.test(currentLine)) break;
    if (currentLine.startsWith('//')) continue;
    if (configInclusionTags && !configInclusionTags.some((inclusionTag: string) => currentLine.startsWith(inclusionTag))) continue;
    blockInclusionLines.push(currentLine);
  }
  identifier.block = blockInclusionLines.join('\n');
}

function processInfoText(identifier: Identifier, text: IdentifierText): void {
  if (text.start < 1) return;
  const infoLine = text.lines[text.start - 1];
  if (!infoLine) return;
  const infoMatch = INFO_MATCHER_REGEX.exec(infoLine);
  if (infoMatch && infoMatch[2]) {
    identifier.info = infoMatch[2].trim();
  }
}

export { buildFromDeclaration as build, buildFromReference as buildRef };
