import type { CancellationToken, TextDocument, DocumentColorProvider, ColorPresentation, ColorInformation } from 'vscode';
import { Color, Range, TextEdit } from 'vscode';
import { COLOR24_REGEX } from '../enum/regex';

const color24Provider: DocumentColorProvider = {
  provideColorPresentations(color: Color, context: { range: Range }, _token: CancellationToken): ColorPresentation[] {
    const r = Math.round(color.red * 255);
    const g = Math.round(color.green * 255);
    const b = Math.round(color.blue * 255);
    const rgb = (r << 16) | (g << 8) | b;

    const colorPresentations: ColorPresentation[] = [
    {
      label: 'Color Picker',
      textEdit: new TextEdit(context.range, '0x' + rgb.toString(16).toUpperCase().padStart(6, '0'))
    }
    ];

    return colorPresentations;
  },

  provideDocumentColors(document: TextDocument): ColorInformation[] {
    const text = document.getText();
    let match: RegExpExecArray | undefined;

    const colorInfos: ColorInformation[] = [];
    while ((match = COLOR24_REGEX.exec(text) ?? undefined)) {
      const rgb = parseInt(match[2]!, 16);

      const r = (rgb >> 16) & 0xFF;
      const g = (rgb >> 8) & 0xFF;
      const b = rgb & 0xFF;

      colorInfos.push({
        color: new Color(r / 255, g / 255, b / 255, 1),
        range: new Range(document.positionAt(match.index + match[1]!.length + 1), document.positionAt(match.index + match[1]!.length + match[2]!.length + 1))
      });
    }

    return colorInfos;
  }
};

export { color24Provider };
