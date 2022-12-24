import { LEX, lex } from './pyrite-lexer.js';
/**
 * @typedef {import('./pyrite-lexer.js').LEX} LEX
 */

/**
 * @typedef {import('./pyrite-lexer.js').token} token
 */

import { AST, parse } from './pyrite-parser.js';
/**
 * @typedef {import('./pyrite-parser.js').AST} AST
 */

/**
 * @typedef {import('./pyrite-parser.js').ast} ast
 */

import { expand } from './pyrite-macro.js';
import { dbg, pdbg, llvm_to_js } from './pyrite-dbg.js';
import { infer } from './pyrite-types.js';
import { exec, evaluate } from './pyrite-exec.js';
import { compile_file } from './pyrite-llvm.js';

export default {
  LEX,
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