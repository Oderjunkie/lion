import { AST } from './pyrite-parser.js';

//===[ general FP shit ]===//
const raise = err => { throw err; };

const relocate = (from, to) => ({
  ...from,
  i: to.i,
  j: to.j
});

const rekind = (from, to) => ({
  ...from,
  kind: to
});

const map = (expr, fn) => ({
  ...expr,
  has: fn(expr.has)
});

const pipe = (...fns) =>
  arg =>
    fns.reduce((arg, fn) => fn(arg), arg);

const letin = (...args) =>
  args.at(-1)(...args.slice(0, -1));

const log = name => val => {
  console.log(`${name}:`, val);
  return val;
};

const NUMBER_REGEX = /^-?[0-9]+$/;

const tryfall = (...fns) => (...args) => {
  for (let i = 0; i < fns.length; i++) {
    const res = fns[i](...args);
    if (res)
      return res;
  }
  return null;
}

const maybe_to_list = maybe =>
  maybe ?
    [maybe] :

  [];

const get_prop = prop => obj => obj[prop];

const ast_node = (kind, has, i, j, type = null) => (
  {
    kind,
    has,
    i,
    j,
    type: type ?? {
      kind: AST.NULL,
      has: null,
      i: -1,
      j: -1,
      type: null
    }
  }
);

const range = (start, stop) =>
  new Array(stop - start).fill(0).map((_, i) => i + start);

const chunk = (arr, by) =>
  range(0, Math.floor(arr.length / 2))
  .map(i =>
    arr.slice(i, i + by));

const single_item_map = (key, val) => {
  const map = new Map();
  map.set(key, val);
  return map;
};

const merge_maps = (...maps) =>
  maps.reduce((lhs, rhs) => new Map([...lhs, ...rhs]), new Map());

const zip = (...arrs) =>
  arrs.length == 0 ?
    [] :
  
  letin(Math.min(...arrs.map(arr => arr.length)), len =>
    new Array(len).fill(0).map((_, i) => arrs.map(arr => arr[i])));

export {
  raise,
  relocate,
  rekind,
  map,
  pipe,
  letin,
  log,
  NUMBER_REGEX,
  tryfall,
  maybe_to_list,
  get_prop,
  ast_node,
  range,
  chunk,
  single_item_map,
  merge_maps,
  zip
};