const dataTypeToMatchId = require('./dataTypeToMatchId');
const hoverConfigResolver = require('./hoverConfigResolver');
const { SIGNATURE, CODEBLOCK } = require('../enum/hoverDisplayItems');
const { END_OF_BLOCK_LINE } = require('../enum/regex');
const { LANGUAGE, BLOCK_SKIP_LINES, CONFIG_INCLUSIONS } = require('../enum/hoverConfigOptions');
const matchType = require('../matching/matchType');

/**
 * Builds an identifier object
 * identifier = {
 *  name: String,
 *  matchId: matchTypeId,
 *  declaration: vscode.Location
 *  references: {filePath1: String[], filePath2: String[], ...} (String is encoded location value)
 *  fileType: String,
 *  language: String,
 *  info?: String,
 *  signature?: {params: {type: String, name: String, matchTypeId: String}[], returns: String, paramsText: String},
 *  block?: String
 * }
 */
function build(name, match, location, info = null, text = {lines: [], start: 0}) {
  const identifier = {
    name: name,
    match: match,
    declaration: location,
    references: {},
    fileType: location ? location.uri.fsPath.split(/[#?]/)[0].split('.').pop().trim() : 'rs2',
    language: hoverConfigResolver.resolve(LANGUAGE, match),
    text: text
  }
  if (info) identifier.info = info;
  addExtraData(identifier, match.extraData);
  process(identifier);
  cleanup(identifier);
  return identifier;
}

function buildRef(name, match) {
  const identifier = {
    name: name,
    match: match,
    references: {},
    fileType: (match.fileTypes || [])[0] || 'rs2',
    language: hoverConfigResolver.resolve(LANGUAGE, match),
  }
  if (match.referenceOnly) {
    addExtraData(identifier, match.extraData);
    process(identifier);
  }
  cleanup(identifier);
  return identifier;
}

function process(identifier) {
  // Process specififed display items
  if (identifier.text) {
    const hoverDisplayItems = hoverConfigResolver.resolveAllHoverItems(identifier.match);
    for (const hoverDisplayItem of hoverDisplayItems) {
      switch(hoverDisplayItem) {
        case SIGNATURE: processSignature(identifier); break;
        case CODEBLOCK: processCodeBlock(identifier); break;
      }
    }
  }

  // Execute custom post processing for the identifier's matchType (if defined)
  if (identifier.match.postProcessor) {
    identifier.match.postProcessor(identifier);
  }
}

function cleanup(identifier) {
  identifier.matchId = identifier.match.id;
  delete identifier.match;
  delete identifier.text;
}

function processSignature(identifier) {
  // Get first line of text, which should contain the data for parsing the signature
  let line = identifier.text.lines[identifier.text.start];

  // Parse input params
  const params = [];
  let openingIndex = line.indexOf('(');
  let closingIndex = line.indexOf(')');
  if (openingIndex >= 0 && closingIndex >= 0 && ++openingIndex !== closingIndex) {
    line.substring(openingIndex, closingIndex).split(',').forEach(param => {
      if (param.startsWith(' ')) param = param.substring(1);
      const split = param.split(' ');
      if (split.length === 2) {
        params.push({type: split[0], name: split[1], matchTypeId: dataTypeToMatchId(split[0])});
      }
    });
  }

  // Parse response type
  let returns = [];
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
  identifier.signature = {params: params, returns: returns, paramsText: paramsText, returnsText: returnsText};
}

function processCodeBlock(identifier) {
  const lines = identifier.text.lines;
  const startIndex = identifier.text.start + hoverConfigResolver.resolve(BLOCK_SKIP_LINES, identifier.match);
  const configInclusionTags = hoverConfigResolver.resolve(CONFIG_INCLUSIONS, identifier.match);
  let blockInclusionLines = [];
  if (identifier.match.id === matchType.CONSTANT.id) blockInclusionLines.push(lines[startIndex]);
  for (let i = startIndex; i < lines.length; i++) {
    let currentLine = lines[i];
    if (END_OF_BLOCK_LINE.test(currentLine)) break;
    if (currentLine.startsWith('//')) continue;
    if (configInclusionTags && !configInclusionTags.some(inclusionTag => currentLine.startsWith(inclusionTag))) continue;
    blockInclusionLines.push(currentLine);
  }
  identifier.block = blockInclusionLines.join('\n');
}

function addExtraData(identifier, extraData) {
  if (!extraData) return;
  if (!identifier.extraData) identifier.extraData = {};
  Object.keys(extraData).forEach(key => identifier.extraData[key] = extraData[key]);
}

module.exports = { build, buildRef };
