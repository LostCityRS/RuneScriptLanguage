const { getClient } = require("./clientState");
const vscode = require('vscode');

const decorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(80, 200, 120, 0.20)'
});
const unknownDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(220, 80, 80, 0.25)'
});

function registerDevModeHighlights() {
  getClient().onNotification("runescript/decorations", recieveDecorations);
}

function recieveDecorations({ uri, ranges }) {
  const editor = vscode.window.visibleTextEditors.find((e) => e.document.uri.toString() === uri);
  if (!editor) return;

  const normalRanges = [];
  const unknownRanges = [];

  for (const item of ranges) {
    const r = item.range;
    const vsRange = new vscode.Range(
      new vscode.Position(r.start.line, r.start.character),
      new vscode.Position(r.end.line, r.end.character)
    );

    if (item.kind === "unknown") unknownRanges.push(vsRange);
    else normalRanges.push(vsRange);
  }

  editor.setDecorations(decorationType, normalRanges);
  editor.setDecorations(unknownDecorationType, unknownRanges);
}

async function requestDecorations(editor) {
  const uri = editor.document.uri.toString();
  const res = await getClient().sendRequest("runescript/getDecorations", { uri });
  const ranges = res?.ranges ?? [];

  const normalRanges = [];
  const unknownRanges = [];

  for (const item of ranges) {
    const r = item.range;
    const vsRange = new vscode.Range(
      new vscode.Position(r.start.line, r.start.character),
      new vscode.Position(r.end.line, r.end.character)
    );

    if (item.kind === "unknown") unknownRanges.push(vsRange);
    else normalRanges.push(vsRange);
  }

  editor.setDecorations(decorationType, normalRanges);
  editor.setDecorations(unknownDecorationType, unknownRanges);
}

module.exports = { requestDecorations, registerDevModeHighlights };
