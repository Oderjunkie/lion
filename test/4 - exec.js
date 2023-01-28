import assert from 'assert';
import fc from 'fast-check';
import lion from '../lion.js';
import {
  ATOM_REGEX,
  NUMBER_REGEX,
  atom_arbitrary,
  non_numeral_atom_arbitrary,
} from './common.js';

describe('the executor', () => {
  it('can evaluate atoms', () => {
    fc.assert(
      fc.property(
        atom_arbitrary,
        fc.anything(),
        (atom, value) => {
          const code = atom;
          const tokens = lion.lex(code);
          const ast = lion.parse(tokens, code);
          const expanded = lion.expand(ast);
          const env = new Map();
          env.set(atom, {
            kind: lion.AST.RAW,
            has: value,
            i: -1,
            j: -1,
            type: {
              kind: lion.AST.NULL,
              has: null,
              i: -1,
              j: -1,
              type: null
            }
          });
          const returned = lion.evaluate(expanded.ast[0], env);
          if (NUMBER_REGEX.test(atom)) {
            assert.deepStrictEqual(returned, {
              kind: lion.AST.RAW,
              has: parseInt(atom),
              i: 0,
              j: code.length,
              type: {
                kind: lion.AST.NULL,
                has: null,
                i: -1,
                j: -1,
                type: null
              }
            });
          } else {
            assert.deepStrictEqual(returned, {
              kind: lion.AST.RAW,
              has: value,
              i: 0,
              j: atom.length,
              type: {
                kind: lion.AST.NULL,
                has: null,
                i: -1,
                j: -1,
                type: null
              }
            });
          }
        }
      )
    );
  });
  it('can evaluate lists', () => {
    fc.assert(
      fc.property(
        non_numeral_atom_arbitrary,
        fc.func(fc.anything()),
        fc.array(fc.anything(), {minLength: 1}),
        (fnname, fn, args) => {
          const text_args = args.map((arg, i) => `arg${i}`).join(' ');
          const code = `(${fnname} ${text_args})`;
          const tokens = lion.lex(code);
          const ast = lion.parse(tokens, code);
          const expanded = lion.expand(ast);
          const env = new Map();
          const argcount = args.length;
          const new_fn = (function _(passed_args) {
            if (passed_args.length == argcount) {
              return fn(...args);
            }
            return arg => {
              return _([...passed_args, arg.has]);
            };
          })([]);
          env.set(fnname, {
            kind: lion.AST.RAW,
            has: new_fn,
            i: -1,
            j: -1,
            type: {
              kind: lion.AST.NULL,
              has: null,
              i: -1,
              j: -1
            }
          });
          for (let i = 0; i < args.length; i++)
            env.set(`arg${i}`, {
              kind: lion.AST.RAW,
              has: args[i],
              i: -1,
              j: -1,
              type: {
                kind: lion.AST.NULL,
                has: null,
                i: -1,
                j: -1
              }
            });
          const returned = lion.evaluate(expanded.ast[0], env);
          assert.deepStrictEqual(returned, {
                kind: lion.AST.RAW,
                has: fn(...args),
                i: -1,
                j: -1,
                type: {
                  kind: lion.AST.NULL,
                  has: null,
                  i: -1,
                  j: -1,
                  type: null
                }
              });
        }
      )
    );
  });
  it('can evaluate strings', () => {
    fc.assert(
      fc.property(
        fc.string()
          .map(str => str
            .replaceAll(`\\`, `\\\\`)
            .replaceAll(`"`, `\\"`)
          ),
        (str) => {
          const code = `"${str}"`;
          const tokens = lion.lex(code);
          const ast = lion.parse(tokens, code);
          const expanded = lion.expand(ast);
          const env = new Map();
          const returned = lion.evaluate(expanded.ast[0], env);
          assert.deepStrictEqual(returned, expanded.ast[0]);
        }
      )
    );
  });
  it('can evaluate quoted atoms', () => {
    fc.assert(
      fc.property(
        non_numeral_atom_arbitrary,
        fc.anything(),
        (atom, value) => {
          const code = `'${atom}`;
          const tokens = lion.lex(code);
          const ast = lion.parse(tokens, code);
          const expanded = lion.expand(ast);
          const env = new Map();
          env.set(atom, {
            kind: lion.AST.RAW,
            has: value,
            i: -1,
            j: -1,
            type: {
              kind: lion.AST.NULL,
              has: null,
              i: -1,
              j: -1,
              type: null
            }
          });
          const returned = lion.evaluate(expanded.ast[0], env);
          assert.deepStrictEqual(returned, {
            kind: lion.AST.ATOM,
            has: atom,
            i: 1,
            j: code.length,
            type: {
              kind: lion.AST.NULL,
              has: null,
              i: -1,
              j: -1,
              type: null
            }
          });
        }
      )
    );
  });
  it('can execute (fib 5)', () => {
    const code = `
(def fib (lambda (n)
  (? (<= n 0)
     1
     (+ (fib (- n 1))
        (fib (- n 2))))))

(fib 5)
`;
    const tokens = lion.lex(code);
    const ast = lion.parse(tokens, code);
    const type_inferred = ast.map(branch => lion.infer(branch));
    const expanded = lion.expand(type_inferred);
    let env = new Map();
    const helper = expr => {
      if (expr.kind == lion.AST.ATOM)
        return parseInt(expr.has);
      if (expr.kind == lion.AST.RAW)
        return expr.has;
      throw new TypeError();
    };
    expanded.consts.forEach((val, key) => env.set(key, val));
    const wrap = fn => ({
      kind: lion.AST.RAW,
      has: fn,
      i: -1,
      j: -1,
      type: {
        kind: lion.AST.NULL,
        has: null,
        i: -1,
        j: -1,
        type: null
      }
    })
    env.set('+', wrap(lhs => rhs => helper(lhs) + helper(rhs)));
    env.set('-', wrap(lhs => rhs => helper(lhs) - helper(rhs)));
    env.set('<=', wrap(lhs => rhs => helper(lhs) <= helper(rhs)));
    const out = lion.evaluate(expanded.ast[0], env);
    assert.deepStrictEqual(out, {
      kind: lion.AST.RAW,
      has: 13,
      i: -1,
      j: -1,
      type: {
        kind: lion.AST.NULL,
        has: null,
        i: -1,
        j: -1,
        type: null
      }
    });
  });
});