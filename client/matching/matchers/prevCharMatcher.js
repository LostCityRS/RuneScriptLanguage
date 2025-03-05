const matchType = require("../matchType");
const { reference, declaration } = require("../../utils/matchUtils");

/**
 * Looks for matches based on the previous character, such as ~WORD indicates a proc reference
 */ 
function prevCharMatcher(context) {
  switch (context.prevChar) {
    case '^': return (context.file.type === "constant") ? declaration(matchType.CONSTANT) : reference(matchType.CONSTANT);
    case '%': return reference(matchType.GLOBAL_VAR);
    case '@': return (context.nextChar === '@') ? null : reference(matchType.LABEL);
    case '~': return reference(matchType.PROC);
    case ',': return (context.prevWord.value === "p") ? reference(matchType.MESANIM) : null;
  }
}

module.exports = prevCharMatcher;
