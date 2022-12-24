import pyrite from './pyrite.js';

const code = `(lambda (a b) a): (-> i16 str i16)`;
const tokens = pyrite.lex(code);
const ast = pyrite.parse(tokens, code);
console.log(pyrite.dbg(ast[0], true));
const expanded = pyrite.expand(ast);
const inferred = pyrite.infer(expanded.ast[0]);
console.log(pyrite.dbg(inferred, true));