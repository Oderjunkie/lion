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

describe('the macro expander', () => {
  describe('let', () => {
    it('lets', () => {
      fc.assert(
        fc.property(
          atom_arbitrary,
          atom_arbitrary,
          (a, b) => {
            const code = `(let ${a} ${b} ${a})`;
            const tokens = lion.lex(code);
            const ast = lion.parse(tokens, code);
            const expanded = lion.expand(ast);
            assert.deepStrictEqual(expanded.ast, [{
              kind: lion.AST.ATOM,
              has: b,
              i: 6 + a.length,
              j: 6 + a.length + b.length,
              type: {
                kind: lion.AST.NULL,
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
            const tokens = lion.lex(code);
            const ast = lion.parse(tokens, code);
            assert.throws(
              () => lion.expand(ast),
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
            const tokens = lion.lex(code);
            const ast = lion.parse(tokens, code);
            const expanded = lion.expand(ast);
            assert.deepStrictEqual(expanded.ast, [{
              kind: lion.AST.LIST,
              has: [{
                kind: lion.AST.ATOM,
                has: b,
                i: 9 + a.length + b.length,
                j: 9 + a.length + 2 * b.length,
                type: {
                  kind: lion.AST.NULL,
                  has: null,
                  i: -1,
                  j: -1,
                  type: null,
                },
              }],
              i: 0,
              j: 10 + a.length + 2 * b.length,
              type: {
                kind: lion.AST.NULL,
                has: null,
                i: -1,
                j: -1,
                type: null,
              },
            }]);
            assert.deepStrictEqual([...expanded.consts.keys()], [a]);
            assert.deepStrictEqual([...expanded.consts.values()], [{
              kind: lion.AST.ATOM,
              has: b,
              i: 7 + a.length,
              j: 7 + a.length + b.length,
              type: {
                kind: lion.AST.NULL,
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
            const tokens = lion.lex(code);
            const ast = lion.parse(tokens, code);
            assert.throws(
              () => lion.expand(ast),
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
          const tokens = lion.lex(code);
          const ast = lion.parse(tokens, code);
          const expanded = lion.expand(ast);
          let i = 0;
          for (let ast = expanded.ast[0];
              ast.kind == lion.AST.LIST;
              ast = ast.has[2]) {
            assert.strictEqual(ast.kind, lion.AST.LIST);
            assert.strictEqual(ast.has.length, 3);
            assert.strictEqual(ast.has[0].kind, lion.AST.ATOM);
            assert.strictEqual(ast.has[0].has, 'lambda');
            assert.strictEqual(ast.has[1].kind, lion.AST.LIST);
            assert.strictEqual(ast.has[1].has.length, 1);
            assert.strictEqual(ast.has[1].has[0].kind, lion.AST.ATOM);
            assert.strictEqual(ast.has[1].has[0].has, args[i]);
            i++;
          }
        }
      )
    );
  });
  it('expands multiargument calls', () => {
    fc.assert(
      fc.property(
        atom_arbitrary,
        fc.array(atom_arbitrary, { minLength: 1 }),
        (fn, args) => {
          const arg = Math.floor(Math.random(args));
          const code = `(${fn} ${args.join(' ')})`;
          const tokens = lion.lex(code);
          const ast = lion.parse(tokens, code);
          const expanded = lion.expand(ast);
          let i = args.length - 1;
          for (let ast = expanded.ast[0];
              ast.kind == lion.AST.LIST;
              ast = ast.has[0]) {
            assert.strictEqual(ast.has.length, 2);
            assert.strictEqual(ast.has[1].kind, lion.AST.ATOM);
            assert.strictEqual(ast.has[1].has, args[i]);
            i--;
            if (ast.has[0].kind == lion.AST.ATOM)
              assert.strictEqual(ast.has[0].has, fn);
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
    const tokens = lion.lex(code);
    const ast = lion.parse(tokens, code);
    const expanded = lion.expand(ast);
    assert.strictEqual(expanded.ast[0].kind, lion.AST.LIST);
    assert.strictEqual(expanded.ast[0].has.length, 2);
    assert.strictEqual(expanded.ast[0].has[0].kind, lion.AST.ATOM);
    assert.strictEqual(expanded.ast[0].has[0].has, '1');
    assert.strictEqual(expanded.ast[0].has[1].kind, lion.AST.ATOM);
    assert.strictEqual(expanded.ast[0].has[1].has, '1');
  });
  /*
  2022-12-26T18:27:18Z TODO: this crashes. the irony!
  it('never crashes', () => {
    fc.assert(
      fc.property(
        lion_ast_arbitrary,
        ast => {
          lion.expand([ast]);
        }
      )
    );
  });
  it('is pure', () => {
    fc.assert(
      fc.property(
        lion_ast_arbitrary,
        ast => {
          let original_ast = clone(ast);
          let new_ast = clone(ast);
          try {
            let expanded_ast = lion.expand([new_ast]);
          } catch (e) {}
          assert.deepStrictEqual(new_ast, original_ast);
        }
      )
    );
  });
  */
});