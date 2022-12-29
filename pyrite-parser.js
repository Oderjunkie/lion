import { TOKEN } from './pyrite-lexer.js';

/**
 * @typedef {import('./pyrite-lexer.js').TOKEN} TOKEN
 */

/**
 * @typedef {import('./pyrite-lexer.js').token} token
 */

/**
 * pyrite ast node types
 * @readonly
 * @enum {number}
 * @typedef {number} AST
 */
const AST = {
  QUOTED: 0,
  LIST: 1,
  ATOM: 2,
  STRING: 3,
  NULL: 4,
  KEYWORD: 5,
  RAW: 6, // evaluator hack!
  RAW2: 7
};

/**
 * pyrite ast
 * @typedef {{
 *   kind: AST,
 *   has: string|ast|Array.<ast>,
 *   i: number,
 *   j: number,
 *   type: ast?
 * }} ast
 */

/**
 * pyrite parser
 * @param {Array.<token>} tokens
 * @param {string} code
 * @returns {Array.<ast>}
 */
function parse(tokens, code) {
  let x = 0;
  const end = tokens.length;
  function parse_value() {
    if (x >= end)
      throw new SyntaxError(
        'i expected a value here, but i cant see any more code'
      );
    if (tokens[x].kind == TOKEN.RPAREN)
      throw new SyntaxError(
        'i expected a value here, but i found a `)` instead'
      );
    if (tokens[x].kind == TOKEN.COLON)
      throw new SyntaxError(
        'the code is certainly typed, but it lacks code in it'
      );
    
    if (tokens[x].kind == TOKEN.LPAREN)
        return parse_list();
    if (tokens[x].kind == TOKEN.ATOM)
      return parse_atom();
    if (tokens[x].kind == TOKEN.STRING)
      return parse_string();
    if (tokens[x].kind == TOKEN.QUOTE)
      return parse_quote();
    if (tokens[x].kind == TOKEN.KEYWORD)
      return parse_keyword();
  }
  
  function parse_quote() {
    const i = tokens[x].i;
    x++;
    const has = parse_value();
    return {
      kind: AST.QUOTED,
      has,
      i,
      j: has.j,
      type: {
        kind: AST.NULL,
        has: null,
        i: -1,
        j: -1,
        type: null
      }
    };
  }
  
  function parse_list() {
    if (x >= end)
      throw new SyntaxError(
        'i expected a list here, but i cant see any more code'
      );
    if (tokens[x].kind != TOKEN.LPAREN)
      throw new SyntaxError(
        `i expected a list here, but i found \
        \`${code.slice(tokens[x].i, tokens[x].j)}\` \
        instead`
      );
    
    const i = tokens[x].i;
    x++;
    let has = [];
    while (x < end && tokens[x].kind != TOKEN.RPAREN) {
      let val = parse_typed_value();
      has.push(val);
    }
    if (x >= end)
      throw new SyntaxError(
        'i think you forgot a `)` somewhere...'
      );
    const j = tokens[x].j;
    x++;
    return {
      kind: AST.LIST,
      has,
      i,
      j,
      type: {
        kind: AST.NULL,
        has: null,
        i: -1,
        j: -1,
        type: null
      }
    };
  }
  
  function parse_atom() {
    if (x >= end)
      throw new SyntaxError(
        'i expected an atom here, but i cant see any more code'
      );
    if (tokens[x].kind != TOKEN.ATOM)
      throw new SyntaxError(
        `i expected an atom here, but i found \
        \`${code.slice(tokens[x].i, tokens[x].j)}\` \
        instead`
      );
    
    const { i, j } = tokens[x];
    const has = code.slice(i, j);
    x++;
    return {
      kind: AST.ATOM,
      has,
      i,
      j,
      type: {
        kind: AST.NULL,
        has: null,
        i: -1,
        j: -1,
        type: null
      }
    };
  }
  
  function parse_keyword() {
    if (x >= end)
      throw new SyntaxError(
        'i expected an keyword here, but i cant see any more code'
      );
    if (tokens[x].kind != TOKEN.KEYWORD)
      throw new SyntaxError(
        `i expected an keyword here, but i found \
        \`${code.slice(tokens[x].i, tokens[x].j)}\` \
        instead`
      );
    
    const { i, j } = tokens[x];
    if (i + 1 == j)
      throw new SyntaxError(
        'i expected a keyword here, but i only see a lone period'
      )
    
    const has = code.slice(i + 1, j);
    x++;
    
    return {
      kind: AST.KEYWORD,
      has,
      i,
      j,
      type: {
        kind: AST.NULL,
        has: null,
        i: -1,
        j: -1,
        type: null
      }
    };
  }
  
  function parse_string() {
    if (x >= end)
      throw new SyntaxError(
        'i expected a string here, but i cant see any more code'
      );
    if (tokens[x].kind != TOKEN.STRING)
      throw new SyntaxError(
        `i expected a string here, but i found \
        \`${code.slice(tokens[x].i, tokens[x].j)}\` \
        instead`
      );
    
    const { i, j } = tokens[x];
    const has = code
      .slice(i + 1, j - 1)
      .replaceAll('\\"', '"')
      .replaceAll('\\\\', '\\');
    
    x++;
    
    return {
      kind: AST.STRING,
      has,
      i,
      j,
      type: {
        kind: AST.ATOM,
        has: 'str',
        i: -1,
        j: -1,
        type: null
      }
    };
  }
  function parse_typed_value() {
    function clear_types(ast) {
      if (ast.kind == AST.NULL)
        return;
      if (ast.kind == AST.LIST) {
          ast.type = null;
          for (let i = 0; i < ast.has.length; i++)
            clear_types(ast.has[i]);
          return;
      }
      if (AST.QUOTED) {
          clear_types(ast.has);
          ast.type = null;
          return;
      }
      
      ast.type = null;
      return;
    }
    
    let value = parse_value();
    if (x < end && tokens[x].kind == TOKEN.COLON) {
      x++;
      value.type = parse_value();
      clear_types(value.type);
    }
    
    return value;
  }
  let ret = [];
  while (x < end)
    ret.push(parse_typed_value());
  return ret;
}

export {
  AST,
  parse,
};