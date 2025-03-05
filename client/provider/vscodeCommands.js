const vscode = require('vscode');
const cacheManager = require('../cache/cacheManager');

const commands = {
  rebuildCache: {
    id: 'RuneScriptLanguage.rebuildCache',
    command: () => {
      vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: "Runescript Extension: Building cache / Indexing files...",
          cancellable: false
      }, cacheManager.rebuildAll);
    }
  }
};

module.exports = commands;
