// In order for a display item to be shown in hover texts, the matchType to which the identifier belongs to
// must define a declaration or reference config which includes the desired hoverDisplay item in its displayItems array
// Note: in order to get identifier.value to display you must define a custom postProcessor for the matchType which
// populates identifier.value, there is no default value parsing like there is with the others

export const TITLE = 'title';
export const INFO = 'info';
export const VALUE = 'value';
export const SIGNATURE = 'signature';
export const CODEBLOCK = 'codeblock';

export const hoverDisplay = {
  TITLE, // hover text title display  : <img>fileType.png</img> <b>matchType.id</b> identifier.name
  INFO,   // hover text info display   : identifier.info (in italics)
  VALUE, // hover text value display  : identifier.value (plain text)
  SIGNATURE, // signature display : identifier.params<br/>identifier.returns (in code syntax)
  CODEBLOCK  // block display     : identifier.block (in code syntax)
} as const;

export type HoverDisplayItem = typeof hoverDisplay[keyof typeof hoverDisplay];
