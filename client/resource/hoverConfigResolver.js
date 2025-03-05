const { DECLARATION_HOVER_ITEMS, REFERENCE_HOVER_ITEMS, LANGUAGE, BLOCK_SKIP_LINES, CONFIG_INCLUSIONS } = require("../enum/hoverConfigOptions");

const resolve = function(opt, match) {
  const config = (!match.hoverConfig) ? {} : match.hoverConfig;
  switch(opt) {
    case DECLARATION_HOVER_ITEMS: return config[opt] || [];
    case REFERENCE_HOVER_ITEMS: return config[opt] || [];
    case LANGUAGE: return config[opt] || 'runescript';
    case BLOCK_SKIP_LINES: return (config[opt] !== undefined) ? match.hoverConfig[opt] : 1;
    case CONFIG_INCLUSIONS: return config[opt] || null;
  }
}

const resolveAllHoverItems = function(match) {
  const config = (!match.hoverConfig) ? {} : match.hoverConfig;
  const displayItems = new Set();
  (config[DECLARATION_HOVER_ITEMS] || []).forEach(item => displayItems.add(item));
  (config[REFERENCE_HOVER_ITEMS] || []).forEach(item => displayItems.add(item));
  return displayItems;
}

module.exports = { resolve, resolveAllHoverItems };
