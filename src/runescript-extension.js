const path = require('path');
const vscode = require('vscode');
const { LanguageClient, TransportKind } = require('vscode-languageclient/node');
const { registerCommands } = require('./commands');
const { registerDevModeHighlights } = require('./devModeHighlights');
const { registerEventHandlers } = require('./events');
const { setClient } = require('./clientState');

const outputChannelName = 'RuneScript LSP';
const languages = ['runescript','locconfig','objconfig','npcconfig','dbtableconfig','dbrowconfig','paramconfig',
	'structconfig','enumconfig','varpconfig','varbitconfig','varnconfig','varsconfig','invconfig','seqconfig',
	'spotanimconfig','mesanimconfig','idkconfig','huntconfig','constants','interface','pack','floconfig'];

let outputChannel;
let client;

function activate(context) {
	const devMode = context.extensionMode === vscode.ExtensionMode.Development;
	outputChannel = vscode.window.createOutputChannel(outputChannelName);
	context.subscriptions.push(outputChannel);

	const serverModule = devMode 
		? process.env.RUNESCRIPT_LSP_PATH ?? path.resolve(context.extensionPath, '..', 'runescript-lsp', 'dist', 'server.js') 
		: context.asAbsolutePath(path.join('node_modules', 'runescript-lsp', 'dist', 'server.js'));

	const serverOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: { execArgv: ['--nolazy', '--inspect=6009'] }
		}
	};

	const clientOptions = {
		documentSelector: languages.map((language) => ({ scheme: 'file', language })),
		outputChannel: outputChannel,
		synchronize: {
			configurationSection: 'runescript',
			fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{rs2,cs2,obj,loc,npc,dbtable,dbrow,param,struct,enum,varp,varbit,varn,vars,inv,seq,spotanim,mesanim,idk,hunt,constant,if,flo,pack,order,opt,jm2}')
		}
	};

	if (devMode) {
		outputChannel.appendLine(`Server module: ${serverModule}`)
		clientOptions.traceOutputChannel = outputChannel;
	}

	client = new LanguageClient(
		'runescriptLanguageServer',
		'RuneScript Language Server',
		serverOptions,
		clientOptions
	);
	setClient(client);

	client.onDidChangeState((event) => {
		if (devMode) outputChannel.appendLine(`Client state: ${event.newState}`);
	});

	registerCommands(context);
	registerDevModeHighlights();
	registerEventHandlers(context);

	context.subscriptions.push(client.start());
}

function deactivate() {
	if (!client) {
		return undefined;
	}
	return client.stop();
}

module.exports = { activate, deactivate };
