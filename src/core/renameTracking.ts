import type { TextEdit, Uri, WorkspaceEdit } from 'vscode';
import { Uri as VsUri } from 'vscode';
import type { MatchResult, MatchType } from '../types';

const pendingRenameFiles = new Set<string>();
let pendingRenameTimer: NodeJS.Timeout | undefined;
let renameRebuildHandler: ((uris: Uri[]) => void) | undefined;
const pendingRenameEdits = new Map<string, TextEdit[]>();
const pendingRenameOps: Array<{ matchTypeId: string; oldName: string; newName: string }> = [];
const pendingRenameFileEvents = new Set<string>();
const suppressedMatchTypeIds = new Set<string>();
let suppressionTimer: NodeJS.Timeout | undefined;
let renameSuppressionDepth = 0;
const diagnosticsSuppressionMs = 15000;

export function registerRenameWorkspaceEdit(edit: WorkspaceEdit): void {
  for (const [uri] of edit.entries()) {
    pendingRenameFiles.add(uri.fsPath);
    const edits = edit.get(uri);
    if (edits && edits.length > 0) {
      const existing = pendingRenameEdits.get(uri.fsPath) ?? [];
      pendingRenameEdits.set(uri.fsPath, [...existing, ...edits]);
    }
  }
  scheduleRenameRebuild();
}

export function registerRenameUris(uris: Iterable<Uri>): void {
  for (const uri of uris) {
    pendingRenameFiles.add(uri.fsPath);
  }
  scheduleRenameRebuild();
}

export function registerRenameFileEvent(oldUri: Uri, newUri: Uri): void {
  const key = getRenameFileEventKey(oldUri, newUri);
  pendingRenameFileEvents.add(key);
  setTimeout(() => pendingRenameFileEvents.delete(key), diagnosticsSuppressionMs);
}

export function consumePendingRenameFileEvent(oldUri: Uri, newUri: Uri): boolean {
  return pendingRenameFileEvents.delete(getRenameFileEventKey(oldUri, newUri));
}

export function registerIdentifierRename(matchType: MatchType, oldName: string, newName: string): void {
  if (!oldName || !newName || oldName === newName) return;
  pendingRenameOps.push({ matchTypeId: matchType.id, oldName, newName });
  beginRenameSuppression(matchType.id);
}

export function consumePendingRename(uri: Uri): boolean {
  return pendingRenameFiles.delete(uri.fsPath);
}

export function hasPendingRename(uri: Uri): boolean {
  return pendingRenameFiles.has(uri.fsPath);
}

export function registerRenameRebuildHandler(handler: (uris: Uri[]) => void): void {
  renameRebuildHandler = handler;
  if (pendingRenameFiles.size > 0) {
    scheduleRenameRebuild();
  }
}

export function drainPendingRenames(): Uri[] {
  if (pendingRenameFiles.size === 0) return [];
  const uris = Array.from(pendingRenameFiles, filePath => VsUri.file(filePath));
  pendingRenameFiles.clear();
  return uris;
}

export function drainPendingRenameEdits(): Map<string, TextEdit[]> {
  if (pendingRenameEdits.size === 0) return new Map();
  const edits = new Map(pendingRenameEdits);
  pendingRenameEdits.clear();
  return edits;
}

export function drainPendingRenameOps(): Array<{ matchTypeId: string; oldName: string; newName: string }> {
  if (pendingRenameOps.length === 0) return [];
  return pendingRenameOps.splice(0, pendingRenameOps.length);
}

export function shouldSuppressDiagnostics(matchResults: MatchResult[]): boolean {
  if (suppressedMatchTypeIds.size === 0) return false;
  return matchResults.some(result => suppressedMatchTypeIds.has(result.context.matchType.id));
}

export function shouldSuppressDiagnosticsForKey(identifierKey: string): boolean {
  if (suppressedMatchTypeIds.size === 0) return false;
  for (const matchTypeId of suppressedMatchTypeIds) {
    if (identifierKey.endsWith(matchTypeId)) return true;
  }
  return false;
}

export function endRenameSuppression(): void {
  if (renameSuppressionDepth > 0) {
    renameSuppressionDepth--;
  }
  if (renameSuppressionDepth > 0) return;
  if (suppressionTimer) {
    clearTimeout(suppressionTimer);
    suppressionTimer = undefined;
  }
  suppressedMatchTypeIds.clear();
}

function getRenameFileEventKey(oldUri: Uri, newUri: Uri): string {
  return `${oldUri.fsPath}\n${newUri.fsPath}`;
}

function beginRenameSuppression(matchTypeId: string): void {
  suppressedMatchTypeIds.add(matchTypeId);
  renameSuppressionDepth++;
  if (suppressionTimer) clearTimeout(suppressionTimer);
  suppressionTimer = setTimeout(() => {
    suppressionTimer = undefined;
    renameSuppressionDepth = 0;
    suppressedMatchTypeIds.clear();
  }, diagnosticsSuppressionMs);
}

function scheduleRenameRebuild(): void {
  if (!renameRebuildHandler) return;
  if (pendingRenameTimer) return;
  pendingRenameTimer = setTimeout(() => {
    pendingRenameTimer = undefined;
    if (!renameRebuildHandler) return;
    const uris = drainPendingRenames();
    if (uris.length === 0) return;
    renameRebuildHandler(uris);
  }, 1000);
}
