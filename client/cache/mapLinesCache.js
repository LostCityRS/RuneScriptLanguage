const LineReferenceCache = require("./class/LineReferenceCache");

/**
 * A cache which enables a quick lookup of the identifier a map file line number should be
 * Given a line number, it will return the match type for an identifier on that line (loc, npc, obj)
 */
const mapLinesCache = new LineReferenceCache();

module.exports = mapLinesCache;
