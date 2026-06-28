import { exists as projectFileExists } from "../cache/projectFilesCache";

const MODEL_SUFFIXES = 'abcdefghijklmnopqrstuvwxyz0123456789';
const MODEL_SUFFIX_REGEX = /^[a-z0-9]$/;

export function splitLocModelReference(name: string): { base: string; suffix: string } | undefined {
  const lastUnderscore = name.lastIndexOf('_');
  if (lastUnderscore <= 0) return undefined;
  const suffix = name.slice(lastUnderscore + 1);
  const base = name.slice(0, lastUnderscore);
  if (!MODEL_SUFFIX_REGEX.test(suffix) || !hasShapeFile(base)) return undefined;
  return { base, suffix: `_${suffix}` };
}

export function normalizeModelName(name: string): string {
  return splitLocModelReference(name)?.base ?? name;
}

function hasShapeFile(baseName: string): boolean {
  for (const suffix of MODEL_SUFFIXES) {
    if (projectFileExists(`${baseName}_${suffix}.ob2`)) return true;
  }
  return false;
}
