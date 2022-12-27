import assert from 'assert';
import fc from 'fast-check';
import pyrite from '../pyrite.js';
import {
  ATOM_REGEX,
  atom_arbitrary,
  non_numeral_atom_arbitrary
} from './common.js';


describe('lexer', () => {
  it('parses empty strings', () => {
    assert.deepStrictEqual(pyrite.lex(''), []);
  });
  it('never gives invalid indicies', () => {
    fc.assert(
      fc.property(fc.string(), str => {
        const tokens = pyrite.lex(str);
        const tokens_len = tokens.length;
        const len = str.length;
        for (let i = 0; i < tokens_len; i++) {
          assert(tokens[i].i < len);
          assert(tokens[i].j <= len);
        }
      })
    );
    {
      const str = '"\\'
      const tokens = pyrite.lex(str);
      const tokens_len = tokens.length;
      const len = str.length;
      for (let i = 0; i < tokens_len; i++) {
        assert(tokens[i].i < len);
        assert(tokens[i].j <= len);
      }
    }
  });
  it('is concatenative', () => {
    fc.assert(
      fc.property(
        fc.string()
          .map(x => x.replaceAll('"', '')),
        fc.string()
          .map(x => x.replaceAll('"', '')),
        (a, b) => {
          const tokens_a = pyrite.lex(a);
          const tokens_b = pyrite.lex(b);
          const tokens_c = pyrite.lex(`${a}\n${b}`);
          const a_len = a.length + 1;
          const tokens_b_len = tokens_b.length;
          let tokens_b_altered = [];
          for (let x = 0; x < tokens_b_len; x++) {
            const token = tokens_b[x];
            let token_altered = {};
            Object.assign(token_altered, token);
            token_altered.i = token.i + a_len;
            token_altered.j = token.j + a_len;
            tokens_b_altered.push(token_altered);
          }
          assert.deepStrictEqual(tokens_c, [...tokens_a, ...tokens_b_altered]);
        }
      )
    );
  });
  it('recognizes opening parenthesis', () => {
    assert.deepStrictEqual(pyrite.lex('('), [
      {
        i: 0,
        j: 1,
        kind: pyrite.LEX.LPAREN
      }
    ]);
  });
  it('recognizes closing parenthesis', () => {
    assert.deepStrictEqual(pyrite.lex(')'), [
      {
        i: 0,
        j: 1,
        kind: pyrite.LEX.RPAREN
      }
    ]);
  });
  it('recognizes colons', () => {
    assert.deepStrictEqual(pyrite.lex(':'), [
      {
        i: 0,
        j: 1,
        kind: pyrite.LEX.COLON
      }
    ]);
  });
  it('recognizes quotation marks', () => {
    assert.deepStrictEqual(pyrite.lex('\''), [
      {
        i: 0,
        j: 1,
        kind: pyrite.LEX.QUOTE
      }
    ]);
  });
  it('ignores whitespace', () => {
    fc.assert(
      fc.property(
        fc.stringOf(
          fc.constantFrom(' ', '\t', '\f', '\r', '\n')
        ), str => {
          assert.deepStrictEqual(pyrite.lex(str), []);
        }
      )
    );
  });
  it('ignores comments', () => {
    fc.assert(
      fc.property(atom_arbitrary, str => {
        assert.deepStrictEqual(pyrite.lex(`;${str}`), []);
      })
    );
  });
  it('parses atoms', () => {
    fc.assert(
      fc.property(atom_arbitrary, atom => {
        assert.deepStrictEqual(pyrite.lex(atom), [
          {
            i: 0,
            j: atom.length,
            kind: pyrite.LEX.ATOM
          }
        ]);
      })
    );
  });
  it(`parses strings`, () => {
    fc.assert(
      fc.property(
        fc.string()
        .map(str => str
          .replaceAll(`\\`, `\\\\`)
          .replaceAll(`"`, `\\"`)
        ), str => {
          assert.deepStrictEqual(pyrite.lex(`"${str}"`), [
            {
              kind: pyrite.LEX.STRING,
              i: 0,
              j: str.length + 2
            }
          ]);
        }
      )
    );
  });
});