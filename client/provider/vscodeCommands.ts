import { ProgressLocation, window, workspace } from 'vscode';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { rebuildAll } from '../cache/cacheManager';
import { getCacheKeys, serializeCache } from '../cache/identifierCache';

interface Command {
  id: string;
  command: () => Promise<void>;
  debugOnly: boolean;
}

// Define a new vscode command. If its only for development make sure to set debugOnly to true.
// Additionally, make sure to add the new command in package.json under the "commands: [ ... ]" section.
const commands: Record<string, Command> = {
  rebuildCache: {
    id: 'RuneScriptLanguage.rebuildCache',
    debugOnly: false,
    command: async () => {
      window.withProgress({
        location: ProgressLocation.Notification,
        title: "Runescript Extension: Building cache / Indexing files...",
        cancellable: false
      }, rebuildAll);
    }
  },
  dumpCache: {
    id: 'RuneScriptLanguage.dumpCache',
    debugOnly: true,
    command: async () => {
      const workspaceFolder = workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        window.showErrorMessage('No workspace folder found to write the cache dump.');
        return;
      }
      const defaultName = 'identifier-cache.json';
      const fileName = await window.showInputBox({
        prompt: 'Enter file name for identifier cache dump',
        value: defaultName
      });
      if (!fileName) {
        return;
      }
      const dumpPath = join(workspaceFolder.uri.fsPath, fileName);
      const data = JSON.stringify(serializeCache(), undefined, 2);
      await writeFile(dumpPath, data, 'utf8');
      window.showInformationMessage(`Identifier cache written to ${dumpPath}`);
    }
  },
  dumpCacheKeys: {
    id: 'RuneScriptLanguage.dumpCacheKeys',
    debugOnly: true,
    command: async () => {
      const workspaceFolder = workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        window.showErrorMessage('No workspace folder found to write the cache keys.');
        return;
      }
      const defaultName = 'identifier-cache-keys.json';
      const fileName = await window.showInputBox({
        prompt: 'Enter file name for identifier cache keys dump',
        value: defaultName
      });
      if (!fileName) {
        return;
      }
      const dumpPath = join(workspaceFolder.uri.fsPath, fileName);
      const data = JSON.stringify(getCacheKeys(), undefined, 2);
      await writeFile(dumpPath, data, 'utf8');
      window.showInformationMessage(`Identifier cache keys written to ${dumpPath}`);
    }
  }
};

export { commands as extensionCommands };
