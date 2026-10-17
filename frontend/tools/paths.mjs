import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const repositoryRoot = resolve(frontendRoot, '..');
export const frontendPath = (...parts) => resolve(frontendRoot, ...parts);
export const repositoryPath = (...parts) => resolve(repositoryRoot, ...parts);
