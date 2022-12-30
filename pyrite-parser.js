import { TOKEN } from './pyrite-lexer.js';
import { ast_node, raise, letin, fix } from './pyrite-common.js';

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

  const parsing_errors = (x, name, tokentype) =>
    x >= tokens.length ?
      raise(new SyntaxError(
        `[${tokens[tokens.length].j} --> ...] i expected a ${name} here, but i cant see any more code`
      )) :
    tokens[x].kind != tokentype ?
      raise(new SyntaxError(
        `[${tokens[x].i} --> ${tokens[x].j}]i expected a ${name} here, but i found \
        \`${code.slice(tokens[x].i, tokens[x].j)}\` \
        instead`
      )) :
    
    false;
  
  const parse_value = x => {
    return x >= tokens.length ?
      raise(new SyntaxError(
        `[${tokens[tokens.length].j} --> ...] i expected a value here, but i cant see any more code`
      )) :
    
    tokens[x].kind == TOKEN.LPAREN ?
      parse_list(x) :
    tokens[x].kind == TOKEN.RPAREN ?
      raise(new SyntaxError(
        `[${tokens[x].i} --> ${tokens[x].j}] i expected a value here, but i found a \`)\` instead`
      )) :
    tokens[x].kind == TOKEN.QUOTE ?
      parse_quote(x) :
    tokens[x].kind == TOKEN.COLON ?
      raise(new SyntaxError(
        'the code is certainly typed, but it lacks code in it'
      )) :
    tokens[x].kind == TOKEN.ATOM ?
      parse_atom(x) :
    tokens[x].kind == TOKEN.STRING ?
      parse_string(x) :
    tokens[x].kind == TOKEN.KEYWORD ?
      parse_keyword(x) :

    raise(new Error('ICE01'));
  }
  
  const parse_quote = x =>
    letin(parse_value(x + 1), val => ({
      new_x: val.new_x + 1,
      node: ast_node(
        AST.QUOTED,
        val.node,
        tokens[x].i,
        val.node.j
      )
    }));

  const function_0 = fix(function_0 => x =>
    x >= tokens.length ?
      {new_x: x, has: []} :
    
    tokens[x].kind == TOKEN.RPAREN ?
      {new_x: x, has: []} :

    letin(parse_typed_value(x), val =>
      letin(function_0(val.new_x), res => ({
        new_x: res.new_x,
        has: [val.node, ...res.has]
      }))
    )
  );
  
  const parse_list = x =>
    parsing_errors(x, 'list', TOKEN.LPAREN) ?
      raise(new Error('ICE05')) :
    
    letin(function_0(x + 1), val =>
      val.new_x >= tokens.length ?
        raise(new SyntaxError(
          'i think you forgot a `)` somewhere...'
        )) :
      
      {
      new_x: val.new_x + 1,
      node: ast_node(
        AST.LIST,
        val.has,
        tokens[x].i,
        tokens[val.new_x].j
      )
    });
  
  const parse_atom = x =>
    parsing_errors(x, 'atom', TOKEN.ATOM) ?
      raise(new Error('ICE04')) :
    
    letin(tokens[x].i, tokens[x].j, (i, j) => ({
      new_x: x + 1,
      node: ast_node(
        AST.ATOM,
        code.slice(i, j),
        i,
        j
      )
    }));
  
  const parse_keyword = x =>
    parsing_errors(x, 'keyword', TOKEN.KEYWORD) ?
      raise(new Error('ICE03')) :
    
    letin(tokens[x].i, tokens[x].j, (i, j) =>
      i + 1 == j ?
        raise(new SyntaxError(
          'i expected a keyword here, but i only see a lone period'
        )) :
      
      {
        new_x: x + 1,
        node: ast_node(
          AST.KEYWORD,
          code.slice(i + 1, j),
          i,
          j
        )
      }
    );
  
  const parse_string = x =>
    parsing_errors(x, 'string', TOKEN.STRING) ?
      raise(new Error('ICE02')) :
    
    letin(tokens[x].i, tokens[x].j, (i, j) => ({
      new_x: x + 1,
      node: {
        kind: AST.STRING,
        has: code
          .slice(i + 1, j - 1)
          .replaceAll('\\"', '"')
          .replaceAll('\\\\', '\\'),
        i,
        j,
        type: {
          kind: AST.ATOM,
          has: 'str',
          i: -1,
          j: -1,
          type: null
        }
      }
    }));
  
  const clear_types = ast =>
    ast.kind == AST.NULL ?
      ast :
    ast.kind == AST.LIST ?
      {...ast, has: ast.has.map(clear_types), type: null} :
    ast.kind == AST.QUOTED ?
      {...ast, has: clear_types(ast.has), type: null} :
    
    {...ast, type: null};
  
  const parse_typed_value = x =>
    letin(parse_value(x), value =>
      value.new_x < tokens.length && tokens[value.new_x].kind == TOKEN.COLON ?
        letin(parse_value(value.new_x + 1), type => ({
          new_x: type.new_x,
          node: {...value.node, type: clear_types(type.node)}
        })) :
      
      {
        new_x: value.new_x,
        node: value.node
      }
    );

  let x = 0;
  let ret = [];
  
  while (x < tokens.length) {
    const res = parse_typed_value(x);
    ret.push(res.node);
    x = res.new_x;
  }
  
  return ret;
}

export {
  AST,
  parse,
};