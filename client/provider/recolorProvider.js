const vscode = require('vscode');
const { RECOLOR } = require('../enum/regex');

const recolProvider = {
  provideColorPresentations(color, context, token) {
    const r = Math.round(color.red * 31);
    const g = Math.round(color.green * 31);
    const b = Math.round(color.blue * 31);
    const rgb = (r << 10) | (g << 5) | b;

    return [
      {
        label: 'Model Recolor',
        textEdit: new vscode.TextEdit(context.range, rgb.toString())
      }
    ];
  },

  provideDocumentColors(document) {
    const text = document.getText();
    let match;

    const matches = [];
    while (match = RECOLOR.exec(text)) {
      const rgb = parseInt(match[2]);

      const r = (rgb >> 10) & 0x1f;
      const g = (rgb >> 5) & 0x1f;
      const b = rgb & 0x1f;

      matches.push({
        color: new vscode.Color(r / 31, g / 31, b / 31, 1),
        range: new vscode.Range(document.positionAt(match.index + match[1].length + 1), document.positionAt(match.index + match[1].length + match[2].length + 1))
      });
    }

    return matches;
  }
};

module.exports = recolProvider;
