const { requestDecorations } = require('./devModeHighlights');
const { getClient } = require("./clientState");

const vscode = require('vscode');

function registerEventHandlers(context) {
  const gitBranchWatcher = vscode.workspace.createFileSystemWatcher('**/.git/HEAD');
  gitBranchWatcher.onDidCreate(onGitBranchChange);

  context.subscriptions.push(
    gitBranchWatcher,
    vscode.window.onDidChangeActiveTextEditor(changeActiveTextEditorHandler)
  );
}

function onGitBranchChange(uri) {
	const folder = vscode.workspace.getWorkspaceFolder(uri);
	getClient().sendNotification("runescript/gitBranchChanged", {
    workspaceUri: folder?.uri.toString()
  });
}

async function changeActiveTextEditorHandler(editor) {
  if (!editor) return;
  requestDecorations(editor);
}

module.exports = { registerEventHandlers };
