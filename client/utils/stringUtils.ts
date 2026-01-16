import { Uri } from 'vscode';
import { END_OF_LINE_REGEX, END_OF_BLOCK_REGEX } from '../enum/regex';

export function getLineText(input: string): string {
  const endOfLine = END_OF_LINE_REGEX.exec(input);
  return !endOfLine ? input : input.substring(0, endOfLine.index);
}

export function getLines(input: string): string[] {
  return input.split(END_OF_LINE_REGEX);
}

export function skipFirstLine(input: string): string {
  const endOfLine = END_OF_LINE_REGEX.exec(input);
  return !endOfLine ? input : input.substring(endOfLine.index + 1);
}

export function getBlockText(input: string): string {
  const endOfBlock = END_OF_BLOCK_REGEX.exec(input);
  return !endOfBlock ? input : input.substring(0, endOfBlock.index);
}

export function nthIndexOf(input: string, pattern: string, n: number): number {
  let i = -1;
  while (n-- > 0 && i++ < input.length) {
    i = input.indexOf(pattern, i);
    if (i < 0) break;
  }
  return i;
}

export function truncateMatchingParenthesis(str: string): string {
  let truncateIndex = 0;
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    if (str.charAt(i) === '(') count++;
    if (str.charAt(i) === ')' && --count === 0) truncateIndex = i;
  }
  return (truncateIndex > 0) ? str.substring(truncateIndex + 1) : str;
}

export function createSearchableString(linkableText: string, query: string, filesToInclude: string, isRegex = false): string {
  const searchOptions = JSON.stringify({ query: query, filesToInclude: filesToInclude, isRegex: isRegex });
  return `[${linkableText}](${Uri.parse(`command:workbench.action.findInFiles?${encodeURIComponent(searchOptions)}`)})`;
}
