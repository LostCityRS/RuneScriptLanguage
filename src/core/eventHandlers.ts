import type { ConfigurationChangeEvent, ExtensionContext, FileRenameEvent, TextDocument, TextDocumentChangeEvent, TextDocumentContentChangeEvent, TextEditor, TextEdit, Uri } from "vscode";
import { commands, window, workspace } from "vscode";
import { dirname } from "path";
import { clearAllDiagnostics, flushPendingDiagnostics, handleFileCreated as handleFileCreatedDiagnostics, handleFileDeleted as handleFileDeletedDiagnostics, handleFileUpdate as handleFileUpdateDiagnostics, resumeDiagnosticsUpdates, suspendDiagnosticsUpdates } from "./diagnostics";
import { getActiveFile, getFileText, isActiveFile, isValidFile } from "../utils/fileUtils";
import { addUris, removeUris } from "../cache/projectFilesCache";
import { eventAffectsSetting, getSettingValue, Settings } from "./settings";
import { clearDevModeOutput, initDevMode, logEvent, logFileEvent, logSettingsEvent, Events } from "./devMode";
import { getLines } from "../utils/stringUtils";
import { allFileTypes, clearFile, processAllFiles, queueFileRebuild } from "./manager";
import { parseFile, reparseFileWithChanges } from "../parsing/fileParser";
import { applyTextEdits, getFileIdentifiers, renameIdentifier } from "../cache/identifierCache";
import { handleMapFileClosed, handleMapFileEdited, handleMapFileOpened, isMapFile } from "./mapManager";
import { handleNpcFileClosed, handleNpcFileEdited, handleNpcFileOpened, isNpcFile } from "./npcManager";
import { handleObjFileClosed, handleObjFileEdited, handleObjFileOpened, isObjFile } from "./objManager";
import { handleHuntFileClosed, handleHuntFileEdited, handleHuntFileOpened, isHuntFile } from "./huntManager";
import { handleInvFileClosed, handleInvFileEdited, handleInvFileOpened, isInvFile } from "./invManager";
import { handleEnumFileClosed, handleEnumFileEdited, handleEnumFileOpened, isEnumFile } from "./enumManager";
import { consumePendingRename, consumePendingRenameFileEvent, drainPendingRenameEdits, drainPendingRenameOps, endRenameSuppression, registerRenameRebuildHandler } from "./renameTracking";
import { getAllMatchTypes } from "../matching/matchType";


const debounceTimeMs = 150; // debounce time for normal active file text changes

export function registerEventHandlers(context: ExtensionContext): void {
  const patterns = Array.from(allFileTypes, ext => `**/*.${ext}`);
  const fileWatcher = workspace.createFileSystemWatcher(`{${patterns.join(',')}}`);
  const gitBranchWatcher = workspace.createFileSystemWatcher('**/.git/HEAD');
  gitBranchWatcher.onDidCreate(onGitBranchChange);
  fileWatcher.onDidChange(onChangeFile);
  fileWatcher.onDidCreate(onCreateFile);
  fileWatcher.onDidDelete(onDeleteFile);
  const filesRenamed = workspace.onDidRenameFiles(onFilesRenamed);
  const activeFileTextChanged = workspace.onDidChangeTextDocument(onActiveFileTextChange);
  const activeDocumentChanged = window.onDidChangeActiveTextEditor(onActiveDocumentChange);
  const settingsChanged = workspace.onDidChangeConfiguration(onSettingsChange);

  registerRenameRebuildHandler(rebuildRenamedFiles);

  context.subscriptions.push(
    gitBranchWatcher,
    fileWatcher,
    filesRenamed,
    activeFileTextChanged,
    activeDocumentChanged,
    settingsChanged,
  );
}

let pendingChanges: TextDocumentContentChangeEvent[] = [];
let pendingDocument: TextDocument | undefined;
let pendingTimer: NodeJS.Timeout | undefined;
let pendingRebuildPromise: Promise<void> | undefined;
let pendingRebuildResolve: (() => void) | undefined;
const lastRebuildVersionByUri = new Map<string, number>();
const rebuildWaiters: Array<{ uri: string; version: number; resolve: () => void }> = [];
function markRebuildComplete(uri: Uri, version: number): void {
  lastRebuildVersionByUri.set(uri.fsPath, version);
  for (let i = rebuildWaiters.length - 1; i >= 0; i--) {
    const waiter = rebuildWaiters[i]!;
    if (waiter.uri === uri.fsPath && waiter.version <= version) {
      rebuildWaiters.splice(i, 1);
      waiter.resolve();
    }
  }
}
function onActiveFileTextChange(textChangeEvent: TextDocumentChangeEvent): void {
  const document = textChangeEvent.document;
  const isActive = isActiveFile(document.uri);
  const fromRename = consumePendingRename(document.uri);
  if (!isActive) {
    if (fromRename) return;
    if (!isValidFile(document.uri)) return;
    return;
  }
  if (isMapFile(textChangeEvent.document.uri)) return handleMapFileEdited(textChangeEvent);
  if (isNpcFile(textChangeEvent.document.uri)) handleNpcFileEdited(textChangeEvent);
  if (isObjFile(textChangeEvent.document.uri)) handleObjFileEdited(textChangeEvent);
  if (isHuntFile(textChangeEvent.document.uri)) handleHuntFileEdited(textChangeEvent);
  if (isInvFile(textChangeEvent.document.uri)) handleInvFileEdited(textChangeEvent);
  if (isEnumFile(textChangeEvent.document.uri)) handleEnumFileEdited(textChangeEvent);
  if (!isValidFile(textChangeEvent.document.uri)) return;

  pendingDocument = textChangeEvent.document;
  pendingChanges.push(...textChangeEvent.contentChanges);

  if (pendingTimer) clearTimeout(pendingTimer);
  if (!pendingRebuildPromise) {
    pendingRebuildPromise = new Promise<void>((resolve) => {
      pendingRebuildResolve = resolve;
    });
  }
  pendingTimer = setTimeout(() => {
    const doc = pendingDocument;
    if (!doc) return;
    logFileEvent(doc.uri, Events.ActiveFileTextChanged, `partial reparse`);
    const changes = pendingChanges;
    pendingChanges = [];
    pendingTimer = undefined;
    const parsedFile = reparseFileWithChanges(doc, changes)!;
    void queueFileRebuild(doc.uri, getLines(doc.getText()), parsedFile).finally(() => {
      markRebuildComplete(doc.uri, doc.version);
      const resolve = pendingRebuildResolve;
      pendingRebuildPromise = undefined;
      pendingRebuildResolve = undefined;
      resolve?.();
    });
  }, debounceTimeMs);
}

export function waitForActiveFileRebuild(document: TextDocument, version = document.version): Promise<void> {
  const uri = document.uri.fsPath;
  const lastVersion = lastRebuildVersionByUri.get(uri) ?? -1;
  if (lastVersion >= version) return Promise.resolve();
  return new Promise<void>((resolve) => {
    rebuildWaiters.push({ uri, version, resolve });
  });
}

async function onActiveDocumentChange(editor: TextEditor | undefined): Promise<void> {
  if (!editor) return;
  if (isMapFile(editor.document.uri)) {
    handleNpcFileClosed();
    handleObjFileClosed();
    handleHuntFileClosed();
    handleInvFileClosed();
    handleEnumFileClosed();
    return handleMapFileOpened(editor.document);
  } else {
    handleMapFileClosed();
  }
  if (isNpcFile(editor.document.uri)) {
    handleNpcFileOpened(editor.document);
  } else {
    handleNpcFileClosed();
  }
  if (isObjFile(editor.document.uri)) {
    handleObjFileOpened(editor.document);
  } else {
    handleObjFileClosed();
  }
  if (isHuntFile(editor.document.uri)) {
    handleHuntFileOpened(editor.document);
  } else {
    handleHuntFileClosed();
  }
  if (isInvFile(editor.document.uri)) {
    handleInvFileOpened(editor.document);
  } else {
    handleInvFileClosed();
  }
  if (isEnumFile(editor.document.uri)) {
    handleEnumFileOpened(editor.document);
  } else {
    handleEnumFileClosed();
  }
  if (!isValidFile(editor.document.uri)) return;
  logFileEvent(editor.document.uri, Events.ActiveFileChanged, 'full reparse');
  updateFileFromDocument(editor.document);
}

function onDeleteFile(uri: Uri) {
  logFileEvent(uri, Events.FileDeleted, 'relevant cache entries invalidated');
  handleFileDeletedDiagnostics(uri);
  removeUris([uri]);
  if (!isValidFile(uri)) return;
  handleFileUpdateDiagnostics(getFileIdentifiers(uri), undefined);
  clearFile(uri);
}

function onCreateFile(uri: Uri) {
  logFileEvent(uri, Events.FileCreated, 'full parse');
  handleFileCreatedDiagnostics(uri);
  addUris([uri]);
  if (!isValidFile(uri)) return;
  if (consumePendingRename(uri)) return;
  void updateFileFromUri(uri);
}

function onChangeFile(uri: Uri) {
  if (isActiveFile(uri)) return; // let the active document text change event handle active file changes
  if (!isValidFile(uri)) return;
  if (consumePendingRename(uri)) return;
  logFileEvent(uri, Events.FileChanged, 'full reparse');
  void updateFileFromUri(uri);
}

function onFilesRenamed(event: FileRenameEvent) {
  const supportedExtensions = new Set(['if', 'synth', 'mid', 'ob2']);
  for (const file of event.files) {
    if (consumePendingRenameFileEvent(file.oldUri, file.newUri)) {
      continue;
    }
    if (dirname(file.oldUri.fsPath) !== dirname(file.newUri.fsPath)) {
      continue;
    }
    const oldExt = file.oldUri.fsPath.split('.').pop();
    const newExt = file.newUri.fsPath.split('.').pop();
    if (!oldExt || oldExt !== newExt || !supportedExtensions.has(oldExt)) {
      continue;
    }
    void commands.executeCommand('RuneScriptLanguage.handleInterfaceFileRename', file.oldUri, file.newUri);
  }
}

function onGitBranchChange() {
  logEvent(Events.GitBranchChanged, () => 'full cache rebuild');
  processAllFiles();
}

async function updateFileFromUri(uri: Uri): Promise<void> {
  if (!isValidFile(uri)) return;
  const fileText = await getFileText(uri);
  void queueFileRebuild(uri, fileText, parseFile(uri, fileText));
}

function updateFileFromDocument(document: TextDocument): void {
  if (!isValidFile(document.uri)) return;
  const fileText = getLines(document.getText());
  void queueFileRebuild(document.uri, fileText, parseFile(document.uri, fileText)).finally(() => {
    markRebuildComplete(document.uri, document.version);
  });
}

function onSettingsChange(event: ConfigurationChangeEvent) {
  if (eventAffectsSetting(event, Settings.ShowHover)) logSettingsEvent(Settings.ShowHover);
  if (eventAffectsSetting(event, Settings.ShowDiagnostics)) {
    logSettingsEvent(Settings.ShowDiagnostics);
    getSettingValue(Settings.ShowDiagnostics) ? processAllFiles() : clearAllDiagnostics();
  }
  if (eventAffectsSetting(event, Settings.DevMode)) {
    logSettingsEvent(Settings.DevMode);
    getSettingValue(Settings.DevMode) ? initDevMode() : clearDevModeOutput();
  }
}

async function rebuildRenamedFiles(uris: Uri[]): Promise<void> {
  if (uris.length === 0) return;
  const renameEdits = drainPendingRenameEdits();
  const renameOps = drainPendingRenameOps();
  if (renameEdits.size > 0 && renameOps.length > 0 && canApplyRenameFastPath(renameEdits)) {
    applyRenameFastPath(renameEdits, renameOps);
    endRenameSuppression();
    await flushPendingDiagnostics();
    return;
  }
  const openDocs = new Map(workspace.textDocuments.map(doc => [doc.uri.fsPath, doc]));
  const activeUri = getActiveFile();
  const orderedUris: Uri[] = [];
  const seen = new Set<string>();
  if (activeUri) {
    orderedUris.push(activeUri);
    seen.add(activeUri.fsPath);
  }
  for (const uri of uris) {
    if (seen.has(uri.fsPath)) continue;
    orderedUris.push(uri);
    seen.add(uri.fsPath);
  }
  suspendDiagnosticsUpdates();
  try {
    const rebuilds: Promise<void>[] = [];
    for (const uri of orderedUris) {
      if (!isValidFile(uri)) continue;
      const doc = openDocs.get(uri.fsPath);
      if (doc) {
        const lastVersion = lastRebuildVersionByUri.get(uri.fsPath) ?? -1;
        if (lastVersion >= doc.version) continue;
        const fileText = getLines(doc.getText());
        rebuilds.push(queueFileRebuild(uri, fileText, parseFile(uri, fileText), true).finally(() => {
          markRebuildComplete(uri, doc.version);
        }));
        continue;
      }
      const fileText = await getFileText(uri);
      rebuilds.push(queueFileRebuild(uri, fileText, parseFile(uri, fileText), true));
    }
    await Promise.all(rebuilds);
  } finally {
    await resumeDiagnosticsUpdates();
    endRenameSuppression();
    await flushPendingDiagnostics();
  }
}

function canApplyRenameFastPath(renameEdits: Map<string, TextEdit[]>): boolean {
  for (const edits of renameEdits.values()) {
    for (const edit of edits) {
      if (edit.range.start.line !== edit.range.end.line) return false;
      if (edit.newText.includes('\n')) return false;
    }
  }
  return true;
}

function applyRenameFastPath(
  renameEdits: Map<string, TextEdit[]>,
  renameOps: Array<{ matchTypeId: string; oldName: string; newName: string }>
): void {
  for (const op of renameOps) {
    const matchType = getAllMatchTypes().find(type => type.id === op.matchTypeId);
    if (!matchType) continue;
    renameIdentifier(op.oldName, matchType, op.newName);
  }
  for (const [fileKey, edits] of renameEdits.entries()) {
    applyTextEdits(fileKey, edits);
  }
}
