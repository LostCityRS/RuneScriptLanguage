const option = {
  DECLARATION_HOVER_ITEMS: 'DECLARATION_HOVER_ITEMS', // display items that show on hover for identifier declarations
  REFERENCE_HOVER_ITEMS: 'REFERENCE_HOVER_ITEMS', // display items that show on hover for identifier references
  LANGUAGE: 'LANGUAGE', // the code language that this matchType should use in hover codeblock text
  BLOCK_SKIP_LINES: 'BLOCK_SKIP_LINES', // the number of lines to skip in code block displays (default value is 1 -> skip first line for most blocks which is the '[identifierName]' line)
  CONFIG_INCLUSIONS: 'CONFIG_INCLUSIONS' // the config tags you want to be shown (ex: obj displays name, desc, and category only), if null (default) then all fields are displayed
}

module.exports = option;
