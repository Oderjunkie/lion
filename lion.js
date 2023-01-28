import { TOKEN, lex } from './lion-lexer.js';
/**
 * @typedef {import('./lion-lexer.js').TOKEN} TOKEN
 */

/**
 * @typedef {import('./lion-lexer.js').token} token
 */

import { AST, parse } from './lion-parser.js';
/**
 * @typedef {import('./lion-parser.js').AST} AST
 */

/**
 * @typedef {import('./lion-parser.js').ast} ast
 */

import { expand } from './lion-macro.js';
import { dbg, pdbg, llvm_to_js } from './lion-dbg.js';
import { infer } from './lion-types.js';
import { exec, evaluate } from './lion-exec.js';
import { compile_file } from './lion-llvm.js';

export default {
  TOKEN,
  AST,
  lex,
  parse,
  infer,
  expand,
  exec,
  evaluate,
  dbg,
  pdbg,
  llvm_to_js,
  compile_file,
};