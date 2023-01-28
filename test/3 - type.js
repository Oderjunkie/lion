import assert from 'assert';
import fc from 'fast-check';
import lion from '../lion.js';
import {
  ATOM_REGEX,
  atom_arbitrary,
  non_numeral_atom_arbitrary,
  lion_ast_arbitrary,
} from './common.js';
import clone from 'just-clone';

describe('the type inferrer/type checker', () => {
  it('can apply functions', () => {
    const code = '(+: (-> i16 i16 i16) x y)';
    const tokens = lion.lex(code);
    const ast = lion.parse(tokens, code);
    const type_inferred = lion.infer(ast[0]);
    assert.deepStrictEqual(type_inferred.type, {
      kind: lion.AST.ATOM,
      has: 'i16',
      i: 16,
      j: 19,
      type: null,
    });
  });
  it('can unapply functions', () => {
    const code = '(+ x: i16 y: i16): i16';
    const tokens = lion.lex(code);
    const ast = lion.parse(tokens, code);
    const type_inferred = lion.infer(ast[0]);
    assert.deepStrictEqual(type_inferred.has[0].type, {
      kind: lion.AST.LIST,
      has: [
        { kind: lion.AST.ATOM, has: '->', i: -1, j: -1, type: null },
        { kind: lion.AST.ATOM, has: 'i16', i: 6, j: 9, type: null },
        { kind: lion.AST.ATOM, has: 'i16', i: 13, j: 16, type: null },
        { kind: lion.AST.ATOM, has: 'i16', i: 19, j: 22, type: null },
      ],
      i: -1,
      j: -1,
      type: null,
    });
  });
  it('can construct functions', () => {
    const code = '(lambda (x: i16 y: str) x: i16)';
    const tokens = lion.lex(code);
    const ast = lion.parse(tokens, code);
    const type_inferred = lion.infer(ast[0]);
    assert.deepStrictEqual(type_inferred.type, {
      kind: lion.AST.LIST,
      has: [
        { kind: lion.AST.ATOM, has: '->', i: -1, j: -1, type: null },
        { kind: lion.AST.ATOM, has: 'i16', i: 12, j: 15, type: null },
        { kind: lion.AST.ATOM, has: 'str', i: 19, j: 22, type: null },
        { kind: lion.AST.ATOM, has: 'i16', i: 12, j: 15, type: null },
      ],
      i: -1,
      j: -1,
      type: null,
    });
  });
  it('can deconstruct functions', () => {
    const code = '(lambda (x y) x): (-> i16 str i16)';
    const tokens = lion.lex(code);
    const ast = lion.parse(tokens, code);
    const type_inferred = lion.infer(ast[0]);
    assert.deepStrictEqual(type_inferred.has[1].has[0].type, {
      kind: lion.AST.ATOM,
      has: 'i16',
      i: 22,
      j: 25,
      type: null
    });
    assert.deepStrictEqual(type_inferred.has[1].has[1].type, {
      kind: lion.AST.ATOM,
      has: 'str',
      i: 26,
      j: 29,
      type: null
    });
    assert.deepStrictEqual(type_inferred.has[2].type, {
      kind: lion.AST.ATOM,
      has: 'i16',
      i: 22,
      j: 25,
      type: null
    });
  });
  it('detects conflicting types', () => {
    const code = '(+: (-> i16 i16 i16) x: i16 y: i16): str';
    const tokens = lion.lex(code);
    const ast = lion.parse(tokens, code);
    assert.throws(
      () => lion.infer(ast[0]),
      TypeError
    );
  });
  /*
  2022-12-26T18:27:18Z TODO: this crashes.
  it('is pure', () => {
    fc.assert(
      fc.property(
        lion_ast_arbitrary,
        ast => {
          let original_ast = clone(ast);
          let new_ast = clone(ast);
          try {
            let expanded_ast = lion.infer(new_ast);
          } catch (e) {}
          assert.deepStrictEqual(new_ast, original_ast);
        }
      )
    );
  });
  */
});