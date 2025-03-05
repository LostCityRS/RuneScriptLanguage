const vscode = require('vscode');
const { TRIGGER_LINE, TRIGGER_DEFINITION, LOCAL_VAR_WORD_PATTERN } = require('../enum/regex');
const { getWords } = require('../utils/matchUtils');
const dataTypeToMatchId = require('../resource/dataTypeToMatchId');
const { getLines } = require('../utils/stringUtils');

/**
 * A cache which keeps track of script blocks in the active / viewing file
 * Only applies to rs2 files
 * Allows a quick look up of script data by passing in a line number
 * Script data object:
{
  name: string
  start: number (line number that the script starts on)
  trigger: string
  returns: string[] (matchTypeId)
  variables: { $varName1: {type: string, matchTypeId: string, parameter: boolean, declaration: range, references: range[]}, ... }
}
 */
var scriptData;
var lineNumToScript;
var curData;

function getScriptData(lineNum) {
  let data;
  for (const script of scriptData) {
    if (lineNum >= script.start) data = script;
  }
  return data;
}

function rebuild() {
  scriptData = [];
  lineNumToScript = {};
  curData = null;
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor && activeEditor.document.uri.path.endsWith('.rs2')) {
    parseFile(getLines(activeEditor.document.getText()), activeEditor.document.uri);
  }
}

function parseFile(lines, uri) {
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let indexOffset = 0;
    if (TRIGGER_LINE.test(line)) {
      const definitionLength = TRIGGER_DEFINITION.exec(line);
      if (definitionLength) {
        // Split the line into definition part and code part, for scripts with same line code
        indexOffset = definitionLength[0].length;
        parseTriggerLine(line.substring(0, indexOffset), i, uri);
        line = line.substring(indexOffset); // update line to only the code portion of the line (if any)
      }
    }
    parseLine(line, i, uri, indexOffset);
  }
  if (curData) scriptData.push(curData);
}

function parseTriggerLine(line, lineNum, uri) {
  // Save previously parsed script data and init a new one for this block
  if (curData) scriptData.push(curData);
  curData = {start: lineNum, variables: {}, returns: []};

  // Parse for script name and trigger
  const nameAndTrigger = line.substring(1, line.indexOf(']')).split(',');
  curData.trigger = nameAndTrigger[0];
  curData.name = nameAndTrigger[1];

  // Parse script params and save as variables
  let openingIndex = line.indexOf('(');
  let closingIndex = line.indexOf(')');
  if (openingIndex >= 0 && closingIndex >= 0 && ++openingIndex !== closingIndex) {
    line.substring(openingIndex, closingIndex).split(',').forEach(param => {
      const split = param.trim().split(' ');
      const position = new vscode.Position(lineNum, line.indexOf(split[1]));
      const location = new vscode.Location(uri, new vscode.Range(position, position.translate(0, split[1].length)));
      addVariable(split[0], split[1], location, true);
    });
  }

  // Parse return type into an array of matchTypeId (string)
  line = line.substring(closingIndex + 1);
  openingIndex = line.indexOf('(');
  closingIndex = line.indexOf(')');
  if (openingIndex >= 0 && closingIndex >= 0 && ++openingIndex !== closingIndex) {
    curData.returns = line.substring(openingIndex, closingIndex).split(',').map(item => dataTypeToMatchId(item.trim()));
  }
}

function parseLine(line, lineNum, uri, indexOffset=0) {
  const words = getWords(line.split('//')[0], LOCAL_VAR_WORD_PATTERN);
  for (let i = 0; i < words.length; i++) {
    if (words[i].value.charAt(0) === '$') {
      const name = words[i].value;
      const position = new vscode.Position(lineNum, words[i].start + indexOffset);
      const location = new vscode.Location(uri, new vscode.Range(position, position.translate(0, name.length)));
      (i > 0 && words[i-1].value.startsWith('def_')) ? addVariable(words[i-1].value.substring(4), name, location) : addVariableReference(name, location);
    }
  }
}

function addVariable(type, name, location, isParam=false) {
  curData.variables[name] = {
    type: type, 
    matchTypeId: dataTypeToMatchId(type), 
    parameter: isParam, 
    declaration: location, 
    references: []
  };
  addVariableReference(name, location);
}

function addVariableReference(name, location) {
  if (curData.variables[name]) {
    curData.variables[name].references.push(location);
  }
}

module.exports = { rebuild, getScriptData };
