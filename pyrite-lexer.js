/**
 * pyrite tokens
 * @readonly
 * @enum {number}
 * @typedef {number} LEX
 */
const LEX = {
  LPAREN: 0,
  RPAREN: 1,
  QUOTE: 2,
  COLON: 3,
  ATOM: 4,
  STRING: 5,
  KEYWORD: 6
};

/**
 * pyrite token
 * @typedef {{kind: LEX, i: number, j: number}} token
 */

/**
 * pyrite lexer
 * @param {string} code
 * @returns {Array.<token>}
 */
function lex(code) {
  const len = code.length;
  let i = 0;
  let j = 1;
  let tokens = [];
  while (i < len) {
    switch (code[i]) {
      case '(':
        tokens.push({ kind: LEX.LPAREN, i, j });
        break;
      case ')':
        tokens.push({ kind: LEX.RPAREN, i, j });
        break;
      case ':':
        tokens.push({ kind: LEX.COLON, i, j });
        break;
      case '\'':
        tokens.push({ kind: LEX.QUOTE, i, j });
        break;
      case ' ':
      case '\t':
      case '\f':
      case '\r':
      case '\n':
        break;
      case ';':
        outer1: while (j < len) {
          switch (code[j]) {
            case '\r':
            case '\n':
              break outer1;
            default:
              j++;
          }
        }
        break;
      case `"`:
        outer: while (j < len) {
          switch (code[j]) {
            case `\\`:
              j++;
              if (j < len)
                j++;
              continue outer;
            default:
              j++;
              continue outer;
            case `"`:
              j++;
              break outer;
          }
        }
        tokens.push({ kind: LEX.STRING, i, j });
        break;
      case '.':
        outer3: while (j < len) {
          switch (code[j]) {
            case '(':
            case ')':
            case ':':
            case '\'':
            case '"':
            case ' ':
            case '\t':
            case '\f':
            case '\r':
            case '\n':
            case '.':
              break outer3;
            default:
              j++;
          }
        }
        tokens.push({ kind: LEX.KEYWORD, i, j });
        break;
      default:
        outer2: while (j < len) {
          switch (code[j]) {
            case '(':
            case ')':
            case ':':
            case '\'':
            case '"':
            case ' ':
            case '\t':
            case '\f':
            case '\r':
            case '\n':
            case '.':
              break outer2;
            default:
              j++;
          }
        }
        tokens.push({ kind: LEX.ATOM, i, j });
        break;
    }
    i = j;
    j++;
  }
  return tokens;
}

export {
  LEX,
  lex,
};