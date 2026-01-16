import type { ExtensionContext } from 'vscode';
import { ExtensionMode, commands, languages as vscodeLanguage, window, workspace } from 'vscode';
import { hoverProvider } from './provider/hoverProvider';
import { recolProvider } from './provider/recolorProvider';
import { gotoDefinitionProvider } from './provider/gotoDefinition';
import { referenceProvider } from './provider/referenceProvider';
import { renameProvider } from './provider/renameProvider';
import { clearAll, clearFiles, createFiles, rebuildActiveFile, rebuildFile, renameFiles } from './cache/cacheManager';
import { extensionCommands } from './provider/vscodeCommands';
import { signatureHelpProvider, signatureMetadata } from './provider/signatureHelpProvider';
import { configHelpProvider, configMetadata } from './provider/configHelpProvider';
import { completionProvider, completionTriggers } from './provider/completionProvider';
import { color24Provider } from './provider/color24Provider';

const languageIds: string[] = [
	'runescript',
	'locconfig',
	'objconfig',
	'npcconfig',
	'dbtableconfig',
	'dbrowconfig',
	'paramconfig',
	'structconfig',
	'enumconfig',
	'varpconfig',
	'varbitconfig',
	'varnconfig',
	'varsconfig',
	'invconfig',
	'seqconfig',
	'spotanimconfig',
	'mesanimconfig',
	'idkconfig',
	'huntconfig',
	'constants',
	'interface',
	'pack',
	'floconfig'
];

function activate(context: ExtensionContext) {
  // Register commands created by this extension
  Object.keys(extensionCommands).forEach(commandName => {
    const command = extensionCommands[commandName];
    if (command.debugOnly && context.extensionMode !== ExtensionMode.Development) {
      return;
    }
    context.subscriptions.push(commands.registerCommand(command.id, command.command));
  });

  // Populate cache on extension activation
  commands.executeCommand(extensionCommands.rebuildCache.id);

  // Cache processing event handlers for git branch changes, updating files, create/rename/delete files
  workspace.createFileSystemWatcher('**/.git/HEAD').onDidCreate(() => commands.executeCommand(extensionCommands.rebuildCache.id));
  workspace.onDidSaveTextDocument(saveDocumentEvent => rebuildFile(saveDocumentEvent.uri));
  workspace.onDidChangeTextDocument(() => rebuildActiveFile());
  window.onDidChangeActiveTextEditor(() => rebuildActiveFile());
  workspace.onDidDeleteFiles(filesDeletedEvent => clearFiles([...filesDeletedEvent.files]));
  workspace.onDidRenameFiles(filesRenamedEvent => renameFiles([...filesRenamedEvent.files]));
  workspace.onDidCreateFiles(filesCreatedEvent => createFiles([...filesCreatedEvent.files]));

  // Register providers (hover, rename, recolor, definition, reference)
  for (const language of languageIds) {
    vscodeLanguage.registerHoverProvider(language, hoverProvider(context));
    vscodeLanguage.registerRenameProvider(language, renameProvider);
    vscodeLanguage.registerCompletionItemProvider(language, completionProvider, ...completionTriggers);
    context.subscriptions.push(vscodeLanguage.registerDefinitionProvider(language, gotoDefinitionProvider));
    context.subscriptions.push(vscodeLanguage.registerReferenceProvider(language, referenceProvider));

    if (language === 'floconfig' || language === 'interface') {
      vscodeLanguage.registerColorProvider(language, color24Provider);
    } else if (language.endsWith('config')) {
      vscodeLanguage.registerColorProvider(language, recolProvider);
    }

    if (language.endsWith('config') || language === 'interface') {
      vscodeLanguage.registerSignatureHelpProvider(language, configHelpProvider, configMetadata);
    }
  }
  vscodeLanguage.registerSignatureHelpProvider('runescript', signatureHelpProvider, signatureMetadata);
}

function deactivate() {
  clearAll();
}

export {
  activate,
  deactivate
};
