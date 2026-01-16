import type { PostProcessor } from '../types';
import { END_OF_LINE_REGEX } from '../enum/regex';
import { matchConfigKeyInfo } from '../info/configKeyInfo';
import { matchTriggerInfo } from '../info/triggerInfo';
import { getLineText } from '../utils/stringUtils';

// Post processors are used for any additional post modification needed for a matchType, after an identifier has been built
// postProcessors must be a function which takes indentifier as an input, and directly modifies that identifier as necessary

export const coordPostProcessor: PostProcessor = function(identifier) {
  const coordinates = identifier.name.split('_');
  const xCoord = (Number(coordinates[1]) << 6) + Number(coordinates[3]);
  const zCoord = (Number(coordinates[2]) << 6) + Number(coordinates[4]);
  identifier.value = `Absolute coordinates: (${xCoord}, ${zCoord})`;
};

export const enumPostProcessor: PostProcessor = function(identifier) {
  const block = identifier.block!;
  const inputtypeLine = getLineText(block.substring(block.indexOf("inputtype=")));
  const outputtypeLine = getLineText(block.substring(block.indexOf("outputtype=")));
  identifier.extraData = { inputType: inputtypeLine.substring(10), outputType: outputtypeLine.substring(11) };
};

export const dataTypePostProcessor: PostProcessor = function(identifier) {
  const index = identifier.block!.indexOf("type=");
  const dataType = (index < 0) ? 'int' : getLineText(identifier.block!.substring(index)).substring(5);
  identifier.extraData = { dataType: dataType };
};

export const configKeyPostProcessor: PostProcessor = function(identifier) {
  const info = matchConfigKeyInfo(identifier.name, identifier.fileType);
  if (info) {
    identifier.info = info.replace(/\$TYPE/g, identifier.fileType);
  } else {
    identifier.hideDisplay = true;
  }
};

export const triggerPostProcessor: PostProcessor = function(identifier) {
  if (identifier.extraData) {
    const info = matchTriggerInfo(identifier.name, identifier.extraData.triggerName);
    if (info) identifier.info = info;
  }
};

export const categoryPostProcessor: PostProcessor = function(identifier) {
  const extraData = identifier.extraData;
  if (extraData && extraData.matchId && extraData.categoryName) {
    identifier.value = `This script applies to all <b>${extraData.matchId}</b> with \`category=${extraData.categoryName}\``;
  }
};

export const componentPostProcessor: PostProcessor = function(identifier) {
  const split = identifier.name.split(':');
  identifier.info = `A component of the <b>${split[0]}</b> interface`;
  identifier.name = split[1];
};

export const rowPostProcessor: PostProcessor = function(identifier) {
  if (identifier.block) {
    const tableName = (identifier.block.split('=') || ['', ''])[1];
    identifier.info = `A row in the <b>${tableName}</b> table`;
    delete identifier.block;
    identifier.extraData = { table: tableName };
  }
};

export const columnPostProcessor: PostProcessor = function(identifier) {
  const split = identifier.name.split(':');
  identifier.info = `A column of the <b>${split[0]}</b> table`;
  identifier.name = split[1];

  if (!identifier.block) return;
  const exec = END_OF_LINE_REGEX.exec(identifier.block);
  if (!exec) return;
  const types = identifier.block.substring(8 + identifier.name.length, exec.index).split(',');
  identifier.extraData = { dataTypes: types };
  identifier.block = `Field types: ${types.join(', ')}`;
};

export const fileNamePostProcessor: PostProcessor = function(identifier) {
  identifier.info = `Refers to the file <b>${identifier.name}.${identifier.fileType}</b>`;
};
