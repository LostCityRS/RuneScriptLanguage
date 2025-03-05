const { END_OF_LINE } = require('../enum/regex');
const matchConfigKeyInfo = require('../info/configKeyInfo');
const matchTriggerInfo = require('../info/triggerInfo');
const { getLineText } = require('../utils/stringUtils');

// Post processors are used for any additional post modification needed for a matchType, after an identifier has been built  
// postProcessors must be a function which takes indentifier as an input, and directly modifies that identifier as necessary 

const coordPostProcessor = function(identifier) {
  const coordinates = identifier.name.split('_');
  const xCoord = Number(coordinates[1] << 6) + Number(coordinates[3]);
  const zCoord = Number(coordinates[2] << 6) + Number(coordinates[4]);
  identifier.value = `Absolute coordinates: (${xCoord}, ${zCoord})`;
}

const enumPostProcessor = function(identifier) {
  const inputtypeLine = getLineText(identifier.block.substring(identifier.block.indexOf("inputtype=")));
  const outputtypeLine = getLineText(identifier.block.substring(identifier.block.indexOf("outputtype=")));
  identifier.extraData = {inputType: inputtypeLine.substring(10), outputType: outputtypeLine.substring(11)};
}

const dataTypePostProcessor = function(identifier) {
  const index = identifier.block.indexOf("type=");
  const dataType = (index < 0) ? 'int' : getLineText(identifier.block.substring(index)).substring(5);
  identifier.extraData = {dataType: dataType};
}

const configKeyPostProcessor = function(identifier) {
  const info = matchConfigKeyInfo(identifier.name, identifier.fileType);
  info ? identifier.info = info.replaceAll('$TYPE', identifier.fileType) : identifier.hideDisplay = true;
}

const triggerPostProcessor = function(identifier) {
  const info = matchTriggerInfo(identifier.name, identifier.extraData.triggerName);
  if (info) identifier.info = info;
}

const categoryPostProcessor = function(identifier) {
  const extraData = identifier.extraData;
  if (extraData && extraData.matchId && extraData.categoryName) {
    identifier.value = `This script applies to all <b>${identifier.extraData.matchId}</b> with \`category=${identifier.extraData.categoryName}\``;
  }
}

const componentPostProcessor = function(identifier) {
  const split = identifier.name.split(':');
  identifier.info = `A component of the <b>${split[0]}</b> interface`;
  identifier.name = split[1];
}

const rowPostProcessor = function(identifier) {
  if (identifier.block) {
    const tableName = (identifier.block.split('=') || ['', ''])[1];
    identifier.info = `A row in the <b>${tableName}</b> table`;
    delete identifier.block;
    identifier.extraData = {table: tableName};
  }
}

const columnPostProcessor = function(identifier) {
  const split = identifier.name.split(':');
  identifier.info = `A column of the <b>${split[0]}</b> table`;
  identifier.name = split[1];

  const exec = END_OF_LINE.exec(identifier.block);
  if (!exec) return;
  const types = identifier.block.substring(8 + identifier.name.length, exec.index).split(',');
  identifier.extraData = {dataTypes: types};
  identifier.block = `Field types: ${types.join(', ')}`;
}

const fileNamePostProcessor = function(identifier) {
  identifier.info = `Refers to the file <b>${identifier.name}.${identifier.fileType}</b>`;
}

module.exports = { 
  coordPostProcessor, enumPostProcessor, dataTypePostProcessor, configKeyPostProcessor, 
  triggerPostProcessor, categoryPostProcessor, componentPostProcessor, columnPostProcessor,
  fileNamePostProcessor, rowPostProcessor
};
