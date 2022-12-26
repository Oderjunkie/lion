import { AST } from './pyrite-parser.js';
import { expand } from './pyrite-macro.js';
import { dbg } from './pyrite-dbg.js';
import {
  raise,
  relocate,
  rekind,
  map,
  pipe,
  letin,
  NUMBER_REGEX,
  single_item_map,
  merge_maps,
  log
} from './pyrite-common.js';

/**
 * @typedef {import('./pyrite-parser.js').AST} AST
 */

/**
 * @typedef {import('./pyrite-parser.js').ast} ast
 */

const exec = () => {};

//===[ evaluate_list ]===//
const is_not_callable = fn =>
  fn.kind == AST.ATOM || // atoms aren't callable
  fn.kind == AST.QUOTED || // quoted objects aren't callable
  fn.kind == AST.STRING || // strings aren't callable
  fn.kind == AST.NULL || // errors aren't callable
  fn.kind == AST.LIST && (
    fn.has.length == 0 || // () is not callable
    fn.has[0].kind != AST.ATOM ||  // first element of list must be `lambda`
    fn.has[0].has == 'lambda' && (
      fn.has[0].has.length != 3 || // `lambda` always takes three arguments
      fn.has[0].has[1].kind != AST.LIST || // the second one is the list of
                                           // arguments the lambda takes
      fn.has[0].has[1].has.length != 1 || // it must take exactly one argument
      fn.has[0].has[1].has[0].kind != AST.ATOM // the argument is an identifier
    )
  );

const call_native_fn = (fn, arg, env) => (
  {
    kind: AST.RAW,
    has: fn.has(evaluate(arg, env)),
    i: -1,
    j: -1,
    type: {
      kind: AST.NULL,
      has: null,
      i: -1,
      j: -1,
      type: null
    }
  }
);

const is_raw_expr = expr =>
  expr.kind == AST.RAW ||
  expr.kind == AST.RAW2;

const call = (fn, arg, env) =>
  is_not_callable(fn) ?
    raise(new TypeError()) :
  is_raw_expr(fn) ?
    call_native_fn(fn, arg, env) :
  fn.has.length > 0 &&
  is_lambda_fn(fn.has[0]) ?
    pipe(
      env => expand(fn.has[2], env).ast,
      expr => evaluate(expr, new Map())
    )(single_item_map(
      fn.has[1].has[0].has,
      arg
    )) :
  
  raise(new TypeError());

const is_lambda_fn = expr =>
  expr.kind == AST.LIST && // ()
  expr.has.length == 3 && // (... ... ...)
  expr.has[0].kind == AST.ATOM && // (ATOM ... ...)
  expr.has[0].has == 'lambda'; // (lambda ... ...)

const is_nonnative_fn_call = expr =>
  is_lambda_fn(expr.has[0]);

const is_referenced_nonnative_fn_call = (expr, env) =>
  expr.kind == AST.LIST &&
  expr.has.length > 0 &&
  expr.has[0].kind == AST.ATOM &&
  env.has(expr.has[0].has) &&
  is_lambda_fn(env.get(expr.has[0].has))

const evaluate_referenced_nonnative_fn_call = (expr, env) => 
  pipe(
    expr => map(expr, arr => [evaluate(arr[0], env), ...arr.slice(1)]),
    expr => evaluate_nonnative_fn_call(expr, env)
  )(expr);

const evaluate_nonnative_fn_call = (expr, env) =>
  expr.has
    .slice(1)
    .reduce((out, arg) =>
        pipe(
          out => out.has[2],
          lambdabody => evaluate(
            lambdabody,
            merge_maps(
              env,
              single_item_map(
                out.has[1].has[0].has,
                evaluate(arg, env)
              )
            )
          )
        )(out),
      expr.has[0]);

const call_all_at_once = (fn, args, env) =>
  fn.kind == AST.RAW2 ?
    fn.has(...args.map(arg => evaluate(arg, env))) :
  
  args.reduce(
    (fn, arg) => call(fn, arg, env),
    fn
  );

const is_conditional = (expr, env) =>
  expr.kind == AST.LIST &&
  expr.has.length > 0 &&
  expr.has[0].kind == AST.ATOM &&
  expr.has[0].has == '?' &&
  !env.has('?') &&
  // expr.has.length % 2 == 0 &&
  expr.has.length == 4;

const isnt_raw = expr =>
  expr.kind != AST.RAW &&
  expr.kind != AST.RAW2;

const evaluate_conditional = (expr, env) => 
  letin(evaluate(expr.has[1], env), cond =>
    isnt_raw(cond) ?
      raise(new TypeError()) :
    
    evaluate(expr.has[cond.has ? 2 : 3], env)
  );

const evaluate_list = (expr, env) =>
  is_conditional(expr, env) ?
    evaluate_conditional(expr, env) :
  is_referenced_nonnative_fn_call(expr, env) ?
    evaluate_referenced_nonnative_fn_call(expr, env) :
  is_lambda_fn(expr, env) ?
    expr :
  is_nonnative_fn_call(expr) ?
    evaluate_nonnative_fn_call(expr, env) :
  
  call_all_at_once(
    evaluate(expr.has[0], env),
    expr.has.slice(1),
    env
  );

//===[ evaluate_atom ]===//
const is_numeric_atom = expr =>
  NUMBER_REGEX.test(expr.has);

const evaluate_numeric_atom = pipe(
  expr => map(expr, parseInt),
  expr => rekind(expr, AST.RAW)
);

const evaluate_nonnumeric_atom = (expr, env) =>
  env.has(expr.has) ?
    pipe(
      expr => expr.has,
      name => env.get(name),
      val => evaluate(val, env),
      val => relocate(val, expr)
    )(expr) :
  
  raise(new ReferenceError(
    `[${expr.i} --> ${expr.j}] ${expr.has} is not defined`
  ));

const evaluate_atom = (expr, env) =>
  is_numeric_atom(expr) ?
    evaluate_numeric_atom(expr) :
  
  evaluate_nonnumeric_atom(expr, env);

//===[ evaluate_raw ]===//
//===[ evaluate_raw2 ]===//
//===[ evaluate_string ]===//
const cant_evaluate = (expr, _env) => expr;
//===[ evaluate_quoted ]===//
const evaluate_quoted = (expr, env) =>
  expr.has.kind == AST.LIST ?
    map(expr.has, has => has.map(has => evaluate(has, env))) :

  expr.has;

//===[ evaluate ]===//
const evaluation_fns = new Map();
evaluation_fns.set(AST.NULL, cant_evaluate);
evaluation_fns.set(AST.RAW, cant_evaluate);
evaluation_fns.set(AST.RAW2, cant_evaluate);
evaluation_fns.set(AST.ATOM, evaluate_atom);
evaluation_fns.set(AST.LIST, evaluate_list);
evaluation_fns.set(AST.QUOTED, evaluate_quoted);
evaluation_fns.set(AST.STRING, cant_evaluate);

const evaluation_fn = expr =>
  evaluation_fns.get(expr.kind) ??
  ((expr, _env) => raise(new TypeError(
    `expresssion ${JSON.stringify(expr)} didn't have valid kind`
  )));

const evaluate = (expr, env) =>
  evaluation_fn(expr)(expr, env ?? new Map());

export {
  exec,
  evaluate
};