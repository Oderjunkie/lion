import fs from 'node:fs/promises';
const path = await import('path');

import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

async function *walkSync(dir) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  for (const file of files) {
    if (file.isFile()) {
      if (!file.name.endsWith('.js'))
        continue;
      yield path.join(dir, file.name);
      continue;
    }
    if (dir == __dirname && file.name == '.config')
      continue;
    if (dir == __dirname && file.name == 'node_modules')
      continue;
    yield* await walkSync(path.join(dir, file.name));
  }
}

let any_files = false;

console.log('--- lines longer than 80col ---');
for await (const filePath of walkSync(__dirname)) {
  const filePathURL = new URL(filePath, import.meta.url);
  const contents = await fs.readFile(
    filePathURL,
    {encoding: 'utf8'}
  );
  const lines = contents.split('\n');
  for (let i = 0; i < lines.length; i++)
    if (lines[i].length > 80) {
      any_files = true;
      console.log(`${filePath}:${i + 1}`)
    }
}

if (!any_files)
  console.log('none.\n');