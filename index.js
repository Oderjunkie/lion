import fs from 'node:fs/promises';
import pyrite from './pyrite.js';

const code = await fs.readFile(
  process.argv[2],
  {encoding: 'utf8'}
);
const tokens = pyrite.lex(code);
const asts = pyrite.parse(tokens, code);
for (const ast of asts)
  console.log(pyrite.dbg(ast, true));
// const expanded = pyrite.expand(asts);
// const inferred = pyrite.infer(expanded.ast[0]);
// console.log(pyrite.dbg(inferred, true));