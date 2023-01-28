import fs from 'node:fs/promises';
import lion from './lion.js';

const code = await fs.readFile(
  process.argv[2],
  {encoding: 'utf8'}
);
const tokens = lion.lex(code);
const asts = lion.parse(tokens, code);
const expanded = lion.expand(asts);
for (const ast of expanded.ast)
  console.log(lion.dbg(ast, true));
// const inferred = lion.infer(expanded.ast[0]);
// console.log(lion.dbg(inferred, true));