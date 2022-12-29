import assert from 'assert';
import fc from 'fast-check';
import pyrite from '../pyrite.js';
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
          const tokens = pyrite.lex(code);
          const ast = pyrite.parse(tokens, code);
          const expanded = pyrite.expand(ast);
          const env = new Map();
          env.set(atom, {
            kind: pyrite.AST.RAW,
            has: value,
            i: -1,
            j: -1,
            type: {
              kind: pyrite.AST.NULL,
              has: null,
              i: -1,
              j: -1,
              type: null
            }
          });
          const returned = pyrite.evaluate(expanded.ast[0], env);
          if (NUMBER_REGEX.test(atom)) {
            assert.deepStrictEqual(returned, {
              kind: pyrite.AST.RAW,
              has: parseInt(atom),
              i: 0,
              j: code.length,
              type: {
                kind: pyrite.AST.NULL,
                has: null,
                i: -1,
                j: -1,
                type: null
              }
            });
          } else {
            assert.deepStrictEqual(returned, {
              kind: pyrite.AST.RAW,
              has: value,
              i: 0,
              j: atom.length,
              type: {
                kind: pyrite.AST.NULL,
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
          const tokens = pyrite.lex(code);
          const ast = pyrite.parse(tokens, code);
          const expanded = pyrite.expand(ast);
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
            kind: pyrite.AST.RAW,
            has: new_fn,
            i: -1,
            j: -1,
            type: {
              kind: pyrite.AST.NULL,
              has: null,
              i: -1,
              j: -1
            }
          });
          for (let i = 0; i < args.length; i++)
            env.set(`arg${i}`, {
              kind: pyrite.AST.RAW,
              has: args[i],
              i: -1,
              j: -1,
              type: {
                kind: pyrite.AST.NULL,
                has: null,
                i: -1,
                j: -1
              }
            });
          const returned = pyrite.evaluate(expanded.ast[0], env);
          assert.deepStrictEqual(returned, {
                kind: pyrite.AST.RAW,
                has: fn(...args),
                i: -1,
                j: -1,
                type: {
                  kind: pyrite.AST.NULL,
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
          const tokens = pyrite.lex(code);
          const ast = pyrite.parse(tokens, code);
          const expanded = pyrite.expand(ast);
          const env = new Map();
          const returned = pyrite.evaluate(expanded.ast[0], env);
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
          const tokens = pyrite.lex(code);
          const ast = pyrite.parse(tokens, code);
          const expanded = pyrite.expand(ast);
          const env = new Map();
          env.set(atom, {
            kind: pyrite.AST.RAW,
            has: value,
            i: -1,
            j: -1,
            type: {
              kind: pyrite.AST.NULL,
              has: null,
              i: -1,
              j: -1,
              type: null
            }
          });
          const returned = pyrite.evaluate(expanded.ast[0], env);
          assert.deepStrictEqual(returned, {
            kind: pyrite.AST.ATOM,
            has: atom,
            i: 1,
            j: code.length,
            type: {
              kind: pyrite.AST.NULL,
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
    const tokens = pyrite.lex(code);
    const ast = pyrite.parse(tokens, code);
    const type_inferred = ast.map(branch => pyrite.infer(branch));
    const expanded = pyrite.expand(type_inferred);
    let env = new Map();
    const helper = expr => {
      if (expr.kind == pyrite.AST.ATOM)
        return parseInt(expr.has);
      if (expr.kind == pyrite.AST.RAW)
        return expr.has;
      throw new TypeError();
    };
    expanded.consts.forEach((val, key) => env.set(key, val));
    const wrap = fn => ({
      kind: pyrite.AST.RAW,
      has: fn,
      i: -1,
      j: -1,
      type: {
        kind: pyrite.AST.NULL,
        has: null,
        i: -1,
        j: -1,
        type: null
      }
    })
    env.set('+', wrap(lhs => rhs => helper(lhs) + helper(rhs)));
    env.set('-', wrap(lhs => rhs => helper(lhs) - helper(rhs)));
    env.set('<=', wrap(lhs => rhs => helper(lhs) <= helper(rhs)));
    const out = pyrite.evaluate(expanded.ast[0], env);
    assert.deepStrictEqual(out, {
      kind: pyrite.AST.RAW,
      has: 13,
      i: -1,
      j: -1,
      type: {
        kind: pyrite.AST.NULL,
        has: null,
        i: -1,
        j: -1,
        type: null
      }
    });
  });
});