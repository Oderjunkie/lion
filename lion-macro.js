import { AST } from './lion-parser.js';
import { evaluate } from './lion-exec.js';
import {
  letin,
  tryfall,
  pipe,
  maybe_to_list,
  get_prop,
  ast_node,
  chunk,
  single_item_map,
  merge_maps,
  raise,
  log
} from './lion-common.js';
import { dbg } from './lion-dbg.js';

const parse_replacements = replacements => ([name, val]) =>
  name.kind != AST.ATOM ?
    raise(TypeError(`i can't assign to non-atoms`)) :
  
  single_item_map(
    name.has,
    expand_expr(val, replacements).ast
  )

/**
 * @typedef {import('./lion-parser.js').ast} ast
 */

const expand_list_let = (ast, replacements, _consts) =>
  replacements.has('let') ?
    null :
  
  ast.has.length % 2 != 0 || ast.has.length == 1 ?
    raise(TypeError(`let called with ${ast.has.length - 1} arguments`)) :
  
  expand_expr(
    ast.has[ast.has.length - 1],
    merge_maps(
      replacements,
      ...chunk(ast.has.slice(1), 2).map(parse_replacements(replacements))
    )
  );

const expand_list_def = (ast, replacements, consts) =>
  replacements.has('def') ?
    null :
  
  ast.has.length % 2 == 0 ||
  ast.has.length == 1 ?
    raise(new TypeError(`def called with ${ast.has.length - 1} arguments`)) :
  
  {
    ast: null,
    consts: merge_maps(
      consts,
      ...chunk(ast.has.slice(1), 2).map(parse_replacements(replacements))
    )
  };

const expand_list_lambda_1 = ast => (new_ast, arg) =>
  ast_node(
    AST.LIST,
    [
      ast_node(AST.ATOM, 'lambda', ast.has[0].i, ast.has[0].j),
      ast_node(AST.LIST, [ arg ], ast.has[1].i, ast.has[1].j),
      new_ast
    ],
    ast.i,
    ast.j
  );

const expand_list_lambda = (ast, replacements, _consts) => (
  {
    ...
      [...ast.has[1].has]
      .reverse()
      .reduce(
        expand_list_lambda_1(ast),
        expand_expr(ast.has[2], replacements).ast
      ),
    type: ast.type
  }
);

const expand_type = ast =>
  !ast ?
    null :
  ast.kind != AST.LIST ?
    ast :
  
  letin(
    {
      ...ast,
      has: ast.has.map(el => expand_type(el))
    },
    ast =>
      ast.has.length <= 1 ?
        ast :
      ast.has[0].kind != AST.ATOM ?
        ast :
      ast.has[0].has != '->' ?
        ast :
      ast.has.length == 2 ?
        {
          kind: ast.has[1].kind,
          has: ast.has[1].has,
          i: ast.i,
          j: ast.j,
          type: ast.has[1].type
        } :
      
      {
        kind: ast.kind,
        has: [
          ast.has[0],
          ast.has[1],
          expand_type({
            kind: ast.kind,
            has: [
              ast.has[0],
              ...ast.has.slice(2)
            ],
            i: ast.has[2].i,
            j: ast.has[ast.has.length - 1].j,
            type: ast.type,
          })
        ],
        i: ast.i,
        j: ast.j,
        type: ast.type
      }
  );

const expand_atom = (ast, replacements) =>
  replacements.has(ast.has) ?
    { ast: replacements.get(ast.has), consts: new Map() } :
  
  { ast, consts: new Map() };

const wrap_list = ast => (has, consts) => (
  {
    ast: {
      kind: AST.LIST,
      has,
      i: ast.i,
      j: ast.j,
      type: ast.type,
    },
    consts
  }
);

const expand_list_other = (ast, replacements, consts) =>
  letin(ast.has.map(
    branch => expand_expr(branch, replacements)
  ), evaluated =>
    letin(
      (()=>{
        return evaluated.flatMap(
          pipe(
            get_prop('ast'),
            maybe_to_list
          )
        )/*.reduceRight(
          (rhs, lhs) => ast_node(
            AST.LIST,
            [lhs, rhs],
            -1,
            -1
          )
        )*/;
      })(),
      evaluated.map(
        get_prop('consts')
      ).reduce(
        (lhs, rhs) => merge_maps(lhs, rhs),
        consts
      ),
      wrap_list(ast)
    )
  );

const expand_list_fns = new Map();
expand_list_fns.set(
  'let',
  tryfall(expand_list_let, expand_list_other)
);
expand_list_fns.set(
  'def',
  tryfall(expand_list_def, expand_list_other)
);
expand_list_fns.set(
  'lambda',
  (ast, replacements, consts) => pipe(
      ast => expand_list_lambda(ast, replacements, consts),
      ast => expand_list_other(ast, replacements, consts)
  )(ast)
);

const is_special = (ast, replacements) =>
  ast.has[0]?.kind == AST.ATOM &&
  expand_list_fns.has(ast.has[0].has) &&
  !replacements.has(ast.has[0].has);

const is_nonnative_macro = (ast, replacements) =>
  ast.kind == AST.LIST && // ()
  ast.has.length >= 2 && // (... ...)
  ast.has[0].kind == AST.LIST && // (() ...)
  ast.has[0].has.length == 3 && // ((... ... ...) ...)
  ast.has[0].has[0].kind == AST.ATOM && // ((ATOM ... ...) ...)
  ast.has[0].has[0].has == 'macro' && // ((macro ... ...) ...)
  !replacements.has('macro') &&
  ast.has[0].has[1].kind == AST.LIST; // ((macro () ...) ...)

const env = new Map();
env.set('first', ast_node(
  AST.RAW2,
  list => list.has[0]
));

const quote = ast =>
  ast_node(AST.QUOTED, ast);

const expand_nonnative_macro = (ast, replacements, consts) => (
  {
    ast: evaluate(ast.has[0].has[2], merge_maps(
      env,
      single_item_map(
        ast.has[0].has[1].has[0].has,
        ast_node(AST.NULL, null)
      ),
      single_item_map(
        ast.has[0].has[1].has[1].has,
        ast_node(AST.QUOTED, ast_node(AST.LIST, ast.has.slice(1).map(quote)))
      )
    )),
    consts
  }
);

const expand_list = (ast, replacements) => (
  is_special(ast, replacements) ?
    expand_list_fns.get(ast.has[0].has) :

  is_nonnative_macro(ast, replacements) ?
    expand_nonnative_macro :
  
  expand_list_other
)(
  ast,
  replacements,
  new Map()
);

const expand_quoted = (ast, replacements) =>
  letin(expand_expr(ast.has, replacements), out => (
    {
      ast: {
        kind: AST.QUOTED,
        has: out.ast,
        i: ast.i,
        j: ast.j,
        type: ast.type,
      }, consts: out.consts
    }
  ));

/**
 * @param {ast} ast
 * @param {Map<string, ast>} [replacements=new Map()]
 * @returns {{ast: ast?, consts: Map<string, ast>}
 */
function expand_expr(ast, replacements = null) {
  replacements = replacements ?? new Map();
  
  ast.type = expand_type(ast.type);
  if (ast.kind == AST.ATOM)
    return expand_atom(ast, replacements);
  if (ast.kind == AST.LIST)
    return expand_list(ast, replacements);
  if (ast.kind == AST.QUOTED)
    return expand_quoted(ast, replacements);
  
  return { ast, consts: new Map() };
}

const merge_expanded = (from, to) => (
  {
    ast: from.ast ? [...to.ast, from.ast] : to.ast,
    consts: merge_maps(to.consts, from.consts),
  }
);

/**
 * lion macro expander
 * @param {Array.<ast>} asts
 * @param {Map<string, ast>} [replacements=new Map()]
 * @returns {{ast: ast?, consts: Map<string, ast>}
 */
const expand = (asts, replacements = null) =>
  asts.reduce(
    (acc, ast) =>
      merge_expanded(expand_expr(ast, acc.consts), acc),
    {
      ast: [],
      consts: replacements ?? new Map()
    }
  );

export {
  expand,
};