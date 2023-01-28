import { letin, until_nonnull } from './lion-common.js';

/**
 * lion tokens
 * @readonly
 * @enum {number}
 * @typedef {number} TOKEN
 */
const TOKEN = {
  LPAREN: 0,
  RPAREN: 1,
  QUOTE: 2,
  COLON: 3,
  ATOM: 4,
  STRING: 5,
  KEYWORD: 6
};

const REGEXES = {
  LPAREN: /^\(/d,
  RPAREN: /^\)/d,
  QUOTE: /^\'/d,
  COLON: /^\:/d,
  ATOM: /^[^():'" \t\f\r\n.]+/d,
  STRING: /^"([^"\\]|\\\\|\\")*"?/d,
  KEYWORD: /^\.[^():'" \t\f\r\n.]*/d,
  IGNORE: /^[ \t\f\r\n]+|^;.*/d,
};

/**
 * lion token
 * @typedef {{kind: TOKEN, i: number, j: number}} token
 */

const output_token = tokenkind => (start, end) =>
  [{
    kind: tokenkind,
    i: start,
    j: end
  }];

const skip_token = (start, end) =>
  [];

class LexerBuilder {
  constructor(rules = []) {
    this.rules = rules;
    return this;
  }
  
  add_rule(regex, handler) {
    return new LexerBuilder([
      ...this.rules,
      [
        regex,
        typeof handler == 'number' ?
          output_token(handler) :
          handler
      ]
    ]);
  }
  
  build() {
    const rules = this.rules;

    const iter = (code, i) =>
      code.length == 0 ?
        [] :
      
      until_nonnull(rules, ([regex, handler]) =>
        !regex.test(code) ?
          null :
        
        letin(
          regex.exec(code).indices[0],
          ([start, end]) =>
            handler(i + start, i + end)
              .concat(iter(code.slice(end), i + end))
        )
      ) ??
      
      raise(`"${code}" matches with nothing`);
    
    return code => iter(code, 0);
  }
}

/**
 * lion lexer
 * @param {string} code
 * @returns {Array.<token>}
 */

const lex = new LexerBuilder()
  .add_rule(REGEXES.IGNORE,  skip_token)
  .add_rule(REGEXES.LPAREN,  TOKEN.LPAREN)
  .add_rule(REGEXES.RPAREN,  TOKEN.RPAREN)
  .add_rule(REGEXES.QUOTE,   TOKEN.QUOTE)
  .add_rule(REGEXES.COLON,   TOKEN.COLON)
  .add_rule(REGEXES.ATOM,    TOKEN.ATOM)
  .add_rule(REGEXES.STRING,  TOKEN.STRING)
  .add_rule(REGEXES.KEYWORD, TOKEN.KEYWORD)
  .build();

export {
  TOKEN,
  lex,
};