const { getClient } = require("./clientState");

const vscode = require('vscode');

function registerCommands(context) {
  context.subscriptions.push(
		vscode.commands.registerCommand('RuneScriptLanguage.rebuildCache', executeWorkspaceRescan)
	);
}

async function executeWorkspaceRescan() {
	const editor = vscode.window.activeTextEditor;
	const folder = editor ? vscode.workspace.getWorkspaceFolder(editor.document.uri) : undefined;
	const workspaceFolder = folder?.uri.toString();
	await getClient().sendRequest("workspace/executeCommand", {
		command: "runescript.rescanWorkspace",
		arguments: workspaceFolder ? [workspaceFolder] : []
	});
}

module.exports = { registerCommands };
