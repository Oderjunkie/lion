import assert from 'assert';
import fc from 'fast-check';
import pyrite from '../pyrite.js';
import {
  ATOM_REGEX,
  atom_arbitrary,
  non_numeral_atom_arbitrary,
  pyrite_ast_arbitrary,
} from './common.js';
import clone from 'just-clone';

describe('the macro expander', () => {
  describe('let', () => {
    it('lets', () => {
      fc.assert(
        fc.property(
          atom_arbitrary,
          atom_arbitrary,
          (a, b) => {
            const code = `(let ${a} ${b} ${a})`;
            const tokens = pyrite.lex(code);
            const ast = pyrite.parse(tokens, code);
            const expanded = pyrite.expand(ast);
            assert.deepStrictEqual(expanded.ast, [{
              kind: pyrite.AST.ATOM,
              has: b,
              i: 6 + a.length,
              j: 6 + a.length + b.length,
              type: {
                kind: pyrite.AST.NULL,
                has: null,
                i: -1,
                j: -1,
                type: null
              }
            }]);
          }
        )
      );
    });
    it('requires an odd number of arguments', () => {
      fc.assert(
        fc.property(
          fc.array(atom_arbitrary).map(x => {
            if (x.length % 2 != 0) return x.slice(1);
            return x;
          }),
          args => {
            const code = `(let ${args.join(' ')})`;
            const tokens = pyrite.lex(code);
            const ast = pyrite.parse(tokens, code);
            assert.throws(
              () => pyrite.expand(ast),
              TypeError
            );
          }
        )
      );
    });
  });
  describe('def', () => {
    it('defines', () => {
      fc.assert(
        fc.property(
          atom_arbitrary,
          atom_arbitrary,
          (a, b) => {
            const code = `((def ${a} ${b}) ${b})`;
            const tokens = pyrite.lex(code);
            const ast = pyrite.parse(tokens, code);
            const expanded = pyrite.expand(ast);
            assert.deepStrictEqual(expanded.ast, [{
              kind: pyrite.AST.LIST,
              has: [{
                kind: pyrite.AST.ATOM,
                has: b,
                i: 9 + a.length + b.length,
                j: 9 + a.length + 2 * b.length,
                type: {
                  kind: pyrite.AST.NULL,
                  has: null,
                  i: -1,
                  j: -1,
                  type: null,
                },
              }],
              i: 0,
              j: 10 + a.length + 2 * b.length,
              type: {
                kind: pyrite.AST.NULL,
                has: null,
                i: -1,
                j: -1,
                type: null,
              },
            }]);
            assert.deepStrictEqual([...expanded.consts.keys()], [a]);
            assert.deepStrictEqual([...expanded.consts.values()], [{
              kind: pyrite.AST.ATOM,
              has: b,
              i: 7 + a.length,
              j: 7 + a.length + b.length,
              type: {
                kind: pyrite.AST.NULL,
                has: null,
                i: -1,
                j: -1,
                type: null,
              },
            }]);
          }
        )
      );
    });
    it('requires an even number of arguments', () => {
      fc.assert(
        fc.property(
          fc.array(atom_arbitrary).map(x => {
            if (x.length % 2 == 0) return x.slice(1);
            return x;
          }),
          args => {
            const code = `(def ${args.join(' ')})`;
            const tokens = pyrite.lex(code);
            const ast = pyrite.parse(tokens, code);
            assert.throws(
              () => pyrite.expand(ast),
              TypeError
            );
          }
        )
      );
    });
  });
  it('expands multiargument lambdas', () => {
    fc.assert(
      fc.property(
        fc.array(atom_arbitrary, { minLength: 1 }),
        (args) => {
          const arg = Math.floor(Math.random(args));
          const code = `(lambda (${args.join(' ')}) ${args[arg]})`;
          const tokens = pyrite.lex(code);
          const ast = pyrite.parse(tokens, code);
          const expanded = pyrite.expand(ast);
          let i = 0;
          for (let ast = expanded.ast[0];
              ast.kind == pyrite.AST.LIST;
              ast = ast.has[2]) {
            assert.strictEqual(ast.kind, pyrite.AST.LIST);
            assert.strictEqual(ast.has.length, 3);
            assert.strictEqual(ast.has[0].kind, pyrite.AST.ATOM);
            assert.strictEqual(ast.has[0].has, 'lambda');
            assert.strictEqual(ast.has[1].kind, pyrite.AST.LIST);
            assert.strictEqual(ast.has[1].has.length, 1);
            assert.strictEqual(ast.has[1].has[0].kind, pyrite.AST.ATOM);
            assert.strictEqual(ast.has[1].has[0].has, args[i]);
            i++;
          }
        }
      )
    );
  });
  it('supports user-defined macros', () => {
    const code = `
((macro (env args)
  '((first args) (first args)))
  1)
`;
    const tokens = pyrite.lex(code);
    const ast = pyrite.parse(tokens, code);
    const expanded = pyrite.expand(ast);
    assert.strictEqual(expanded.ast[0].kind, pyrite.AST.LIST);
    assert.strictEqual(expanded.ast[0].has.length, 2);
    assert.strictEqual(expanded.ast[0].has[0].kind, pyrite.AST.ATOM);
    assert.strictEqual(expanded.ast[0].has[0].has, '1');
    assert.strictEqual(expanded.ast[0].has[1].kind, pyrite.AST.ATOM);
    assert.strictEqual(expanded.ast[0].has[1].has, '1');
  });
  /*
  2022-12-26T18:27:18Z TODO: this crashes. the irony!
  it('never crashes', () => {
    fc.assert(
      fc.property(
        pyrite_ast_arbitrary,
        ast => {
          pyrite.expand([ast]);
        }
      )
    );
  });
  it('is pure', () => {
    fc.assert(
      fc.property(
        pyrite_ast_arbitrary,
        ast => {
          let original_ast = clone(ast);
          let new_ast = clone(ast);
          try {
            let expanded_ast = pyrite.expand([new_ast]);
          } catch (e) {}
          assert.deepStrictEqual(new_ast, original_ast);
        }
      )
    );
  });
  */
});