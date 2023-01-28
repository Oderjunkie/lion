import assert from 'assert';
import fc from 'fast-check';
import lion from '../lion.js';
import {
  ATOM_REGEX,
  atom_arbitrary,
  non_numeral_atom_arbitrary,
  string_arbitrary
} from './common.js';

describe('the parser', () => {
  it('can parse atoms', () => {
    fc.assert(
      fc.property(atom_arbitrary, atom => {
        const ast = lion.parse(lion.lex(atom), atom);
        assert.deepStrictEqual(ast, [
          {
            kind: lion.AST.ATOM,
            has: atom,
            i: 0,
            j: atom.length,
            type: {
              kind: lion.AST.NULL,
              has: null,
              i: -1,
              j: -1,
              type: null
            }
          }
        ]);
      })
    );
  });
  it('can parse keywords', () => {
    fc.assert(
      fc.property(atom_arbitrary, keyword => {
        const code = `.${keyword}`;
        const tokens = lion.lex(code);
        const ast = lion.parse(tokens, code);
        assert.deepStrictEqual(ast, [
          {
            kind: lion.AST.KEYWORD,
            has: keyword,
            i: 0,
            j: keyword.length + 1,
            type: {
              kind: lion.AST.NULL,
              has: null,
              i: -1,
              j: -1,
              type: null
            }
          }
        ]);
      })
    );
  });
  it('can parse lists', () => {
    fc.assert(
      fc.property(fc.array(atom_arbitrary), atoms => {
        const code = `(${atoms.join(' ')})`;
        const ast = lion.parse(lion.lex(code), code);
        let has = [];
        let i = 1;
        for (let x = 0; x < atoms.length; x++) {
          has.push({
            kind: lion.AST.ATOM,
            has: atoms[x],
            i,
            j: i + atoms[x].length,
            type: {
              kind: lion.AST.NULL,
              has: null,
              i: -1,
              j: -1,
              type: null
            }
          });
          i += atoms[x].length;
          i++;
        }
        assert.deepStrictEqual(ast, [
          {
            kind: lion.AST.LIST,
            has,
            i: 0,
            j: code.length,
            type: {
              kind: lion.AST.NULL,
              has: null,
              i: -1,
              j: -1,
              type: null
            }
          }
        ]);
      })
    );
  });
  it(`can parse strings`, () => {
    fc.assert(
      fc.property(string_arbitrary, str => {
          const code = `"${str}"`;
          const tokens = lion.lex(code);
          const ast = lion.parse(tokens, code);
          assert.deepStrictEqual(ast, [{
            kind: lion.AST.STRING,
            has: str.replaceAll('\\"', '"').replaceAll('\\\\', '\\'),
            i: 0,
            j: str.length + 2,
            type: {
              kind: lion.AST.ATOM,
              has: 'str',
              i: -1,
              j: -1,
              type: null,
            },
          }]);
        }
      )
    );
  });
  it('can parse quoted atoms', () => {
    fc.assert(
      fc.property(atom_arbitrary, atom => {
        const ast = lion.parse(lion.lex(`'${atom}`), `'${atom}`);
        assert.deepStrictEqual(ast, [
          {
            kind: lion.AST.QUOTED,
            has: {
              kind: lion.AST.ATOM,
              has: atom,
              i: 1,
              j: atom.length + 1,
              type: {
                kind: lion.AST.NULL,
                has: null,
                i: -1,
                j: -1,
                type: null
              }
            },
            i: 0,
            j: atom.length + 1,
            type: {
              kind: lion.AST.NULL,
              has: null,
              i: -1,
              j: -1,
              type: null
            }
          }
        ]);
      })
    );
  });
  it('can parse typed values', () => {
    fc.assert(
      fc.property(
        atom_arbitrary,
        atom_arbitrary,
        (a, b) => {
          const code = `${a}:${b}`;
          const ast = lion.parse(lion.lex(code), code);
          assert.deepStrictEqual(ast, [{
            kind: lion.AST.ATOM,
            has: a,
            i: 0,
            j: a.length,
            type: {
              kind: lion.AST.ATOM,
              has: b,
              i: a.length + 1,
              j: a.length + b.length + 1,
              type: null,
            },
          }]);
        }
      )
    );
  });
  describe('edge cases', () => {
    it(`can parse unterminated lists correctly`, () => {
      const code = `(asd`;
      assert.throws(
        () => lion.parse(lion.lex(code), code),
        SyntaxError
      );
    });
    it(`can parse unbeginned lists correctly`, () => {
      const code = `)`;
      assert.throws(
        () => lion.parse(lion.lex(code), code),
        SyntaxError
      );
    });
    it(`can parse missing types correctly (rparen)`, () => {
      const code = `(lion:)`;
      assert.throws(
        () => lion.parse(lion.lex(code), code),
        SyntaxError
      );
    });
    it(`can parse missing types correctly (colon)`, () => {
      const code = `(lion::)`;
      assert.throws(
        () => lion.parse(lion.lex(code), code),
        SyntaxError
      );
    });
    it(`can parse empty keywords correctly`, () => {
      const code = `.`;
      assert.throws(
        () => lion.parse(lion.lex(code), code),
        SyntaxError
      );
    });
  });
});