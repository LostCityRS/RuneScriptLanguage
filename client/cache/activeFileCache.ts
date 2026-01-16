import type { Uri } from 'vscode';
import { Location, Position, Range, window } from 'vscode';
import { TRIGGER_LINE_REGEX, TRIGGER_DEFINITION_REGEX, LOCAL_VAR_WORD_REGEX } from '../enum/regex';
import { getWords } from '../utils/matchUtils';
import { dataTypeToMatchId } from '../resource/dataTypeToMatchId';
import { getLines } from '../utils/stringUtils';

interface VariableData {
  type: string;
  matchTypeId: string;
  parameter: boolean;
  declaration: Location;
  references: Location[];
}

interface ScriptData {
  name: string;
  start: number;
  trigger: string;
  returns: string[];
  variables: Record<string, VariableData>;
}

/**
* A cache which keeps track of script blocks in the active / viewing file
* Only applies to rs2 files
* Allows a quick look up of script data by passing in a line number
*/
let scriptData: ScriptData[] = [];
let curData: ScriptData | undefined;

function getScriptData(lineNum: number): ScriptData | undefined {
  let data: ScriptData | undefined;
  for (const script of scriptData) {
    if (lineNum >= script.start) data = script;
  }
  return data;
}

function rebuild(): void {
  scriptData = [];
  curData = undefined;
  const activeEditor = window.activeTextEditor;
  if (activeEditor && activeEditor.document.uri.path.endsWith('.rs2')) {
    parseFile(getLines(activeEditor.document.getText()), activeEditor.document.uri);
  }
}

function parseFile(lines: string[], uri: Uri): void {
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let indexOffset = 0;
    if (TRIGGER_LINE_REGEX.test(line)) {
      const definitionLength = TRIGGER_DEFINITION_REGEX.exec(line);
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

function parseTriggerLine(line: string, lineNum: number, uri: Uri): void {
  // Save previously parsed script data and init a new one for this block
  if (curData) scriptData.push(curData);
  curData = { start: lineNum, variables: {}, returns: [], name: '', trigger: '' };

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
      const position = new Position(lineNum, line.indexOf(split[1]));
      const location = new Location(uri, new Range(position, position.translate(0, split[1].length)));
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

function parseLine(line: string, lineNum: number, uri: Uri, indexOffset = 0): void {
  const words = getWords(line.split('//')[0], LOCAL_VAR_WORD_REGEX);
  for (let i = 0; i < words.length; i++) {
    if (words[i].value.charAt(0) === '$') {
      const name = words[i].value;
      const position = new Position(lineNum, words[i].start + indexOffset);
      const location = new Location(uri, new Range(position, position.translate(0, name.length)));
      (i > 0 && words[i - 1].value.startsWith('def_'))
      ? addVariable(words[i - 1].value.substring(4), name, location)
      : addVariableReference(name, location);
    }
  }
}

function addVariable(type: string, name: string, location: Location, isParam = false): void {
  if (!curData) return;
  curData.variables[name] = {
    type: type,
    matchTypeId: dataTypeToMatchId(type),
    parameter: isParam,
    declaration: location,
    references: []
  };
  addVariableReference(name, location);
}

function addVariableReference(name: string, location: Location): void {
  if (curData && curData.variables[name]) {
    curData.variables[name].references.push(location);
  }
}

export { rebuild, getScriptData };
