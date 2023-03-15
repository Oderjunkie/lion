import { TOKEN } from './lion-lexer.js';
import { ast_node, raise, letin, fix } from './lion-common.js';

/**
 * @typedef {import('./lion-lexer.js').TOKEN} TOKEN
 */

/**
 * @typedef {import('./lion-lexer.js').token} token
 */

/**
 * lion ast node types
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
 * lion ast
 * @typedef {{
 *   kind: AST,
 *   has: string|ast|Array.<ast>,
 *   i: number,
 *   j: number,
 *   type: ast?
 * }} ast
 */

/**
 * lion parser
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
    // console.log(code.slice(tokens[x].i));
    
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

  const read_until_rparen_or_eof = fix(read_until_rparen_or_eof => x => {
    // console.log('!', code.slice(tokens[x]?.i ?? code.length));
    return x >= tokens.length ?
      {new_x: x, has: []} :
    
    tokens[x].kind == TOKEN.RPAREN ?
      {new_x: x - 1, has: []} :

    letin(parse_typed_value(x), val =>
      letin(read_until_rparen_or_eof(val.new_x), res => ({
        new_x: res.new_x,
        has: [val.node, ...res.has]
      }))
    )
  });

  const process_sharp_decrease_in_indentation = val => {
    const is = val.has.map(element => element.i);
    const js = val.has.map(element => element.j);
    const split_code = code.split('\n');
    const ilines = is.map(i => split_code.length - code.slice(i).split('\n').length);
    const jlines = js.map(j => split_code.length - code.slice(j).split('\n').length);

    const indentation = jlines.map(line => split_code[line].length - split_code[line].trimLeft().length);
    
    let current_level = indentation[0]
    let i;
    
    for (i = 1; i < indentation.length; i++)
      if (indentation[i] != current_level)
        break;

    current_level = indentation[i];
    
    for (; i < indentation.length; i++)
      if (indentation[i] < current_level) {
        i--;
        break;
      }

    return { ilines, jlines, split_code, i, indentation };
  }

  const detect_sharp_decrease_in_indentation = val => {
    const { indentation, i } = process_sharp_decrease_in_indentation(val);
    
    if (i != indentation.length)
      return true;
  }
  
  let diff_ranges = (lines1, lines2) => {
    let i = 0;
    let j = 0;
    let diffs = [];
    out: for (;;) {
      if (i == lines1.length && j == lines2.length)
        break;
      if (i == lines1.length) {
        diffs.push({start: {i: i, j: j}, end: {i: i, j: lines2.length}});
        break;
      }
      if (i == lines1.length) {
        diffs.push({start: {i: i, j: j}, end: {i: lines1.length, j: j}});
        break;
      }
      if (lines1[i] == lines2[j]) {
        i++;
        j++;
        continue;
      }
      
      function function_0(new_i, new_j) {
        if (lines1[new_i] == lines2[new_j]) {
          diffs.push({start: {i: i, j: j}, end: {i: new_i, j: new_j}});
          i = new_i;
          j = new_j;
          return true;
        }
        return false;
      }
      
      for (let k = 1; k < Math.min(lines1.length - i, lines2.length - j); k++) {
        for (let new_i = i; new_i < i + k; new_i++)
          if (function_0(new_i, j + k - 1))
            continue out;
        for (let new_j = j; new_j < j + k - 1; new_j++)
          if (function_0(i + k - 1, new_j))
            continue out;
      }
      diffs.push({start: {i: i, j: j}, end: {i: lines1.length, j: lines2.length}});
      break;
    }
    return diffs;
  };

  const diff = (lines1, lines2) => {
    const diffs = diff_ranges(lines1, lines2);
    for (const diff of diffs) {
      console.log(`\x1b[90;2m${(diff.start.i - 1).toString().padStart(5)} |\x1b[m ${lines1[diff.start.i - 1]}`);
      if (diff.end.i - diff.start.i == 1 && diff.end.j - diff.start.j == 1) {
        const chardiffs = diff_ranges(lines1[diff.start.i], lines2[diff.start.j]);
        let out = [];
        let diff_i = 0;
        for (let i = 0; i < lines1[diff.start.i].length; i++) {
          if (chardiffs[diff_i].start.i == i) {
            i = chardiffs[diff_i].end.i - 2;
            out.push(`\x1b[31;1;91m${lines1[diff.start.i].slice(chardiffs[diff_i].start.i, chardiffs[diff_i].end.i)}\x1b[m`);
            out.push(`\x1b[32;1;92m${lines2[diff.start.j].slice(chardiffs[diff_i].start.j, chardiffs[diff_i].end.j)}\x1b[m`);
            diff_i++;
          } else {
            out.push(lines1[diff.start.i][i]);
          }
        }
        if (diff_i < chardiffs.length) {
            out.push(`\x1b[32;1;92m${lines2[diff.start.j].slice(chardiffs[diff_i].start.j, chardiffs[diff_i].end.j)}\x1b[m`);
        }
        const line = out.join('');
        console.log(`\x1b[90;2m${(diff.start.i).toString().padStart(5)} |\x1b[m ${line}`);
      } else {
        for (let i = diff.start.i; i < diff.end.i; i++)
          console.log(`\x1b[90;2m      |\x1b[31;1;91m ${lines1[i]}\x1b[m`);
        for (let j = diff.start.j; j < diff.end.j; j++)
          console.log(`\x1b[90;2m      |\x1b[32;1;92m ${lines2[j]}\x1b[m`);
      }
      if (diff.end.i < lines1.length)
        console.log(`\x1b[90;2m${(diff.end.i).toString().padStart(5)} |\x1b[m ${lines1[diff.end.i]}`);
    }
  };

  const detect_nested_indentation_issues = ast => {
    if (ast.kind == AST.LIST &&
        ast.has.length > 2 &&
        ast.has[0].kind == AST.ATOM &&
        code.slice(ast.has[0].i + ast.has[0].has.length, ast.has[1].i).replaceAll(/\s/g, '').length == 0) {
      
    }
    return false;
  }

  const handle_sharp_decrease_in_indentation = val => {
    
    const { ilines, jlines, split_code, i } = process_sharp_decrease_in_indentation(val);

    console.error(`you seem to have forgotten a \`)\`, maybe it's here?`);
    const error_line = jlines[i];
    let cloned_split_code;
    
    if (detect_nested_indentation_issues(val.has)) {
      cloned_split_code = detect_nested_indentation_issues(val, split_code);
    } else {
      cloned_split_code = split_code.map(line => line);
      const code_only_parens = split_code.slice(ilines[0], jlines[jlines.length - 1]).join('\n').replaceAll(/[^()]/g, '');
      const left_parens = code_only_parens.split('(').length;
      const right_parens = code_only_parens.split(')').length;
      const number_of_parens_left = left_parens - right_parens;
      cloned_split_code[error_line] = `${cloned_split_code[error_line]}${')'.repeat(number_of_parens_left)}`;
    }
    
    diff(split_code, cloned_split_code);
    
    
    raise(new SyntaxError('...'));
  }
  
  const error_missing_rparen = val => {

    if (detect_sharp_decrease_in_indentation(val))
      return handle_sharp_decrease_in_indentation(val);
    
    // console.log(val.has, indentation);
    
    raise(new SyntaxError(
      'you seem to have forgotten a `)` somewhere, good luck finding it!'
    ));
  }
  
  const parse_list = x => 
    parsing_errors(x, 'list', TOKEN.LPAREN) ?
      raise(new Error('ICE05')) :
    
    letin(read_until_rparen_or_eof(x + 1), val => {
      // console.log('?', code.slice(tokens[x + 1].i, tokens[val.new_x]?.j ?? code.length));
      return val.new_x >= tokens.length ?
        error_missing_rparen(val) :
      
      {
        new_x: val.new_x + 2,
        node: ast_node(
          AST.LIST,
          val.has,
          tokens[x].i,
          tokens[val.new_x + 1].j
        )
      }
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