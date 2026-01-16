import type { CancellationToken, ColorInformation, ColorPresentation, DocumentColorProvider, TextDocument} from 'vscode';
import { Color, Range, TextEdit } from 'vscode';
import { RECOLOR_REGEX } from '../enum/regex';

const recolProvider: DocumentColorProvider = {
  provideColorPresentations(color: Color, context: { range: Range }, _token: CancellationToken): ColorPresentation[] {
    const r = Math.round(color.red * 31);
    const g = Math.round(color.green * 31);
    const b = Math.round(color.blue * 31);
    const rgb = (r << 10) | (g << 5) | b;

    const colorPresentations: ColorPresentation[] = [
    {
      label: 'Model Recolor',
      textEdit: new TextEdit(context.range, rgb.toString())
    }
    ];

    return colorPresentations;
  },

  provideDocumentColors(document: TextDocument): ColorInformation[] {
    const text = document.getText();
    let match: RegExpExecArray | undefined;

    const colorInfos: ColorInformation[] = [];
    while ((match = RECOLOR_REGEX.exec(text) ?? undefined)) {
      const rgb = parseInt(match[2]!);

      const r = (rgb >> 10) & 0x1f;
      const g = (rgb >> 5) & 0x1f;
      const b = rgb & 0x1f;

      colorInfos.push({
        color: new Color(r / 31, g / 31, b / 31, 1),
        range: new Range(document.positionAt(match.index + match[1]!.length + 1), document.positionAt(match.index + match[1]!.length + match[2]!.length + 1))
      });
    }

    return colorInfos;
  }
};

export { recolProvider };
