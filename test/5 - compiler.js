// ????-??-??T??:??:??Z TODO:
// in the words of andrewg1990: "it's too slow!"

// 2022-12-24T16:34:18Z TODO:
// times since the last TODO have jumped from 10s per test to 1000s per test.

/*
import llvm from 'llvm-bindings';
import assert from 'assert';
import fc from 'fast-check';
import pyrite from '../pyrite.js';
import {
  ATOM_REGEX,
  atom_arbitrary,
  non_numeral_atom_arbitrary
} from './common.js';

describe('the compiler', () => {
  it('compiles the (integer) identity function', async function() {
    this.timeout(10000);
    const code = '(def id (lambda (x: i16) x))';
    const tokens = pyrite.lex(code);
    const ast = pyrite.parse(tokens, code);
    const expanded = pyrite.expand(ast);
    const defs = [...expanded.consts.entries()]
      .map(([key, val]) => [key, pyrite.infer(val)])
      .reduce((x, [key, val]) => x.set(key, val), new Map());
    const llvm = pyrite.compile_file('id.pyr', defs);
    const module = await pyrite.llvm_to_js(llvm, ['id']);
    let id = module.cwrap('id', 'number', ['number']);
  	fc.assert(
      fc.property(fc.integer({min: -32768, max: 32767}), num => {
        assert(id(num) == num);
      })
    );
  });
  it('implements function calls', async function() {
    this.timeout(10000);
    const code = '(def id1 (lambda (x: i16) x)) \
                  (def id2 (lambda (x: i16) (id1 x): i16))';
    const tokens = pyrite.lex(code);
    const ast = pyrite.parse(tokens, code);
    const expanded = pyrite.expand(ast);
    const defs = [...expanded.consts.entries()]
      .map(([key, val]) => [key, pyrite.infer(val)])
      .reduce((x, [key, val]) => x.set(key, val), new Map());
    const llvm = pyrite.compile_file('fncall.pyr', defs);
    const module = await pyrite.llvm_to_js(llvm, ['id1', 'id2']);
    let id2 = module.cwrap('id2', 'number', ['number']);
  	fc.assert(
      fc.property(fc.integer({min: -32768, max: 32767}), num => {
        assert(id2(num) == num);
      })
    );
  });
  it('can call foreign functions', async function() {
    this.timeout(10000);
    const code = '(def triple (lambda (x: i16) (+ (+ x x): i16 x): i16))';
    const tokens = pyrite.lex(code);
    const ast = pyrite.parse(tokens, code);
    const expanded = pyrite.expand(ast);
    const defs = [...expanded.consts.entries()]
      .map(([key, val]) => [key, pyrite.infer(val)])
      .reduce((x, [key, val]) => x.set(key, val), new Map());
    const llvm = pyrite.compile_file('fncall.pyr', defs);
    const module = await pyrite.llvm_to_js(
      llvm,
      ['triple'],
      ['/home/runner/pyrite-js/pyrite-stdlib.c']
    );
    let triple = module.cwrap('triple', 'number', ['number']);
  	fc.assert(
      fc.property(fc.integer({min: -10922, max: 10922}), num => {
        assert(triple(num) == num + num + num);
      })
    );
  });
  it('supports conditionals', async function() {
    this.timeout(10000);
    const code = `
(def test (lambda (n: i16)
  (?
    (<= n 0): bool
    69
    420
  ): i16
))`;
    const tokens = pyrite.lex(code);
    const ast = pyrite.parse(tokens, code);
    const expanded = pyrite.expand(ast);
    const defs = [...expanded.consts.entries()]
      .map(([key, val]) => [key, pyrite.infer(val)])
      .reduce((x, [key, val]) => x.set(key, val), new Map());
    const llvm = pyrite.compile_file('fncall.pyr', defs);
    const module = await pyrite.llvm_to_js(
      llvm,
      ['test'],
      ['/home/runner/pyrite-js/pyrite-stdlib.c']
    );
    let test = module.cwrap('test', 'number', ['number']);
  	fc.assert(
      fc.property(fc.integer({min: -32768, max: 32767}), num => {
        if (num <= 0) assert(test(num) ==  69);
        if (num >  0) assert(test(num) == 420);
      })
    );
  });
  it('supports recursion', async function() {
    this.timeout(100000);
    const code = `
; putting types on functions
(def fib (lambda (n: i16)
  (?: (-> bool i16 i16 i16) ; minimum: (-> _ _ _)
    (<=: (-> i16 i16 bool) ; minimum: (-> _ _ bool)
      n
      0)
    1
    (+: (-> i16 i16 i16) ; minimum: (-> _ _ int)
      (fib ; minimum: (-> _ _ _)
        (-: (-> i16 i16 i16) ; minimum: (-> _ _ int)
        n
        1))
      (fib
        (-: (-> i16 i16 i16) ; minimum: (-> _ _ int)
        n
        2))))))`;
    const tokens = pyrite.lex(code);
    const ast = pyrite.parse(tokens, code);
    const expanded = pyrite.expand(ast);
    const defs = [...expanded.consts.entries()]
      .map(([key, val]) => [key, pyrite.infer(val)])
      .reduce((x, [key, val]) => x.set(key, val), new Map());
    const llvm = pyrite.compile_file('fncall.pyr', defs);
    const module = await pyrite.llvm_to_js(
      llvm,
      ['fib'],
      ['/home/runner/pyrite-js/pyrite-stdlib.c']
    );
    let fib_pyr = module.cwrap('fib', 'number', ['number']);
    function fib_js(n) {
      if (n <= 0) return 1;
      return fib_js(n - 1) + fib_js(n - 2);
    }
  	fc.assert(
      fc.property(fc.integer({min: -32768, max: 21}), num => {
        assert(fib_js(num) == fib_pyr(num));
      })
    );
  });
});
*/