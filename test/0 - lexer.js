import assert from 'assert';
import fc from 'fast-check';
import pyrite from '../pyrite.js';
import {
  ATOM_REGEX,
  atom_arbitrary,
  non_numeral_atom_arbitrary,
  non_string_arbitrary,
  string_arbitrary
} from './common.js';


describe('lexer', () => {
  it('parses empty strings', () => {
    assert.deepStrictEqual(pyrite.lex(''), []);
  });
  it('never gives invalid indicies', () => {
    function test(str) {
      const tokens = pyrite.lex(str);
      const tokens_len = tokens.length;
      const len = str.length;
      for (let i = 0; i < tokens_len; i++) {
        assert(tokens[i].i < len, `the \`i\` value is OoB for token ${i} in \`${str}\`, being ${tokens[i].i} despite the string being ${len} character${len == 1 ? '' : 's'} long.`);
        assert(tokens[i].j <= len, `the \`j\` value is OoB for token ${i} in \`${str}\`, being ${tokens[i].j} despite the string being ${len} character${len == 1 ? '' : 's'} long.`);
      }
    }
    
    test('"\\');
    test('.');
    fc.assert(fc.property(fc.string(), test));
  });
  it('is concatenative', () => {
    function test(a, b) {
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
      assert.deepStrictEqual(
        tokens_c,
        [...tokens_a, ...tokens_b_altered],
        `earlier tokens in \`${a}\` influenced later tokens in \`${b}\``);
    }
    
    test('.', '#');
    fc.assert(
      fc.property(
        non_string_arbitrary,
        non_string_arbitrary,
        test
      )
    );
  });
  it('recognizes opening parenthesis', () => {
    assert.deepStrictEqual(pyrite.lex('('), [
      {
        i: 0,
        j: 1,
        kind: pyrite.TOKEN.LPAREN
      }
    ]);
  });
  it('recognizes closing parenthesis', () => {
    assert.deepStrictEqual(pyrite.lex(')'), [
      {
        i: 0,
        j: 1,
        kind: pyrite.TOKEN.RPAREN
      }
    ]);
  });
  it('recognizes colons', () => {
    assert.deepStrictEqual(pyrite.lex(':'), [
      {
        i: 0,
        j: 1,
        kind: pyrite.TOKEN.COLON
      }
    ]);
  });
  it('recognizes quotation marks', () => {
    assert.deepStrictEqual(pyrite.lex('\''), [
      {
        i: 0,
        j: 1,
        kind: pyrite.TOKEN.QUOTE
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
            kind: pyrite.TOKEN.ATOM
          }
        ]);
      })
    );
  });
  it(`parses strings`, () => {
    fc.assert(
      fc.property(string_arbitrary, str => {
          assert.deepStrictEqual(pyrite.lex(`"${str}"`), [
            {
              kind: pyrite.TOKEN.STRING,
              i: 0,
              j: str.length + 2
            }
          ]);
        }
      )
    );
  });
  it(`parses keywords`, () => {
    fc.assert(
      fc.property(atom_arbitrary, keyword => {
        assert.deepStrictEqual(pyrite.lex(`.${keyword}`), [
          {
            kind: pyrite.TOKEN.KEYWORD,
            i: 0,
            j: keyword.length + 1
          }
        ]);
      })
    );
  });
});