const LineReferenceCache = require("./class/LineReferenceCache");

/**
 * A cache which enables a quick lookup of the identifier for the block the line is in
 * Given a line number, it will return the name of the block that line number is a part of (if any)
 * A block referring to the code block of a proc, label, queue, etc...
 * This cache is used to quickly determine the return type for a given line 
 */
const returnBlockLinesCache = new LineReferenceCache();

module.exports = returnBlockLinesCache;
