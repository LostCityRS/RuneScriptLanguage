import { basename } from "path";
import type { Uri } from "vscode";
import { workspace } from "vscode";
import { getAllMatchTypes } from "../matching/matchType";
import { fileNamePostProcessor } from "../resource/postProcessors";
import { getFileInfo } from "../utils/fileUtils";
import { addExceptionWord } from "../parsing/wordExceptions";

const filesInDataSrc: Set<string> = new Set();

export async function rebuild(): Promise<void> {
  filesInDataSrc.clear();
  const filesToCheckNames = getFileTypesToCheckNames();
  const extensions = new Set(['pack', 'rs2', 'ob2', ...filesToCheckNames]);
  const patterns = Array.from(extensions, ext => `**/*.${ext}`);
  const uris = await workspace.findFiles(`{${patterns.join(',')}}`, "**/{node_modules,out,dist,build}/**");
  uris.forEach(uri => {
    filesInDataSrc.add(basename(uri.fsPath));
    const fileInfo = getFileInfo(uri);
    if (filesToCheckNames.has(fileInfo.type)) {
      addExceptionWord(fileInfo.name);
    }
  });
}

export function exists(name?: string, uri?: Uri): boolean {
  const fileName = name ?? (uri ? basename(uri.fsPath) : undefined);
  return fileName ? filesInDataSrc.has(fileName) : false;
}

export function removeUris(uris: Uri[]) {
  uris.map(uri => basename(uri.fsPath)).forEach(file => filesInDataSrc.delete(file));
}

export function addUris(uris: Uri[]) {
  uris.map(uri => basename(uri.fsPath)).forEach(file => filesInDataSrc.add(file));
}

export function clear(): void {
  filesInDataSrc.clear();
}

function getFileTypesToCheckNames(): Set<string> {
  return new Set(getAllMatchTypes()
    .filter(type => type.postProcessor === fileNamePostProcessor)
    .map(type => (type.fileTypes ?? [])[0])
    .filter(Boolean));
}
