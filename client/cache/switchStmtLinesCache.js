const LineReferenceCache = require("./class/LineReferenceCache");

/**
 * A cache which enables a quick lookup of the matchType of a switch statement
 * Given a line number, this cache will return the type (if any) for the switch statement 
 * that line number is a part of
 */
const switchStmtLinesCache = new LineReferenceCache();

module.exports = switchStmtLinesCache;
