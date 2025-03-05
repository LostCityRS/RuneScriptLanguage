const regex = {
  COORD: /(\d+_){4}\d+/,
  COLOR: /\d{6}/,
  RECOLOR: /(recol[1-6][sd])=(\d+)/g,
  NUMBER: /^\d+.?\d+$/,
  END_OF_BLOCK: /(\r\n|\r|\n)(\[.+|val=.+|\^.+|\d+=.+)(?:$|(\r\n|\r|\n))/,
  END_OF_BLOCK_LINE: /^(\[|\^|\d+=)/,
  START_OF_LINE: /(?<=[\n])(?!.*[\n]).*/,
  END_OF_LINE: /\r\n|\r|\n/,
  WORD_PATTERN: /(\.\w+)|(\w+:\w+)|([^\`\~\!\@\#\%\^\&\*\(\)\-\$\=\+\[\{\]\}\\\|\;\:\'\\"\,\.\<\>\/\?\s]+)/g,
  LOCAL_VAR_WORD_PATTERN: /(\$\w+)|(\.\w+)|(\w+:\w+)|([^\`\~\!\@\#\%\^\&\*\(\)\-\$\=\+\[\{\]\}\\\|\;\:\'\\"\,\.\<\>\/\?\s]+)/g,
  CONFIG_LINE: /^\w+=.+$/,
  CONFIG_DECLARATION: /\[\w+\]/,
  TRIGGER_LINE: /\[\w+,(\.)?\w+(:\w+)?\]/,
  TRIGGER_DEFINITION: /\[.+,.+\](\([\w, :\.$]*\))?(\([\w, :\.$]*\))?/, 
  INFO_MATCHER: /\/\/[ ]{0,1}(desc|info):(.+)/,
  SWITCH_CASE: /\s*case.+/
}

module.exports = regex;
