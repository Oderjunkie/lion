import { AST } from './pyrite-parser.js';
import { dbg } from './pyrite-dbg.js';

/**
 * pyrite type unifier
 * @param {ast} a
 * @param {ast} b
 * @returns {ast}
 */
function unify(a, b) {
  if (!a && !b) return null;
  if (!a) return b;
  if (!b) return a;
  if (a.kind == AST.NULL && b.kind == AST.NULL) return a;
  if (a.kind == AST.NULL) return b;
  if (b.kind == AST.NULL) return a;
  if (a.kind != b.kind)
    throw new TypeError(`${dbg(a)} and ${dbg(b)} are not the same type`);
  if (a.kind == AST.ATOM) {
    if (a.has != b.has)
      throw new TypeError(`${dbg(a)} and ${dbg(b)} are not the same type`);
    let i = a.i == -1 ? b.i : a.i;
    let j = a.j == -1 ? b.j : a.j;
    return {
      kind: AST.ATOM,
      has: a.has,
      i,
      j,
      type: null
    };
  }
  if (a.kind == AST.LIST) {
    if (a.has.length != b.has.length)
      throw new TypeError(`${dbg(a)} and ${dbg(b)} are not the same type`);
    let len = a.has.length;
    let has = [];
    for (let i = 0; i < len; i++)
      has.push(unify(a.has[i], b.has[i]));
    let i = a.i == -1 ? b.i : a.i;
    let j = a.j == -1 ? b.j : a.j;
    return {
      kind: AST.LIST,
      has,
      i,
      j,
      type: null,
    };
  }
}

/**
 * pyrite type inferrer
 *
 * there are 5 ways of inferring types:
 * - application: `(+: (-> i16 i16 i16) 1 2)` =>
 *                `(+: (-> i16 i16 i16) 1: i16 2: i16): i16`
 * - deapplication: `(+ 1: i16 2: i16): i16` =>
 *                  `(+: (-> i16 i16 i16) 1: i16 2: i16): i16`
 * - scoping: `(lambda (x) x: i16)` =>
 *            `(lambda (x: i16) x: i16): (-> i16 i16)`
 * - construction:   `(lambda (x: i16 y: str) x: i16)` =>
 *                   `(lambda (x: i16 y: str) x: i16): (-> i16 str i16)`
 * - deconstruction: `(lambda (x y) x): (-> i16 str i16)` =>
 *                   `(lambda (x: i16 y: str) x: i16): (-> i16 str i16)`
 * @param {ast} ast
 * @returns {ast}
 */
function infer(ast, name=null) {
  function splice1(branch) {
    switch (branch.kind) {
      case AST.LIST: {
        let out = [];
        let len = branch.has.length;
        for (let i = 0; i < len; i++)
          out.push(splice1(branch.has[i]));
        return {
          kind: AST.LIST,
          has: out,
          i: branch.i,
          j: branch.j,
          type: branch.type,
        };
      }
      case AST.ATOM: {
        if (branch.has == name) {
          let type = unify(branch.type, ast.type);
          Object.assign(branch.type, type);
          Object.assign(ast.type, type);
        }
        return {
          kind: AST.ATOM,
          has: splice1(branch.has),
          i: branch.i,
          j: branch.j,
          type: branch.type,
        };
      }
      case AST.QUOTED: {
        return {
          kind: AST.QUOTED,
          has: splice1(branch.has),
          i: branch.i,
          j: branch.j,
          type: branch.type,
        };
      }
    }
  }
  function splice2(branch, argnames) {
    switch (branch.kind) {
      case AST.LIST: {
        let out = [];
        let len = branch.has.length;
        for (let i = 0; i < len; i++)
          out.push(splice2(branch.has[i], argnames));
        return {
          kind: AST.LIST,
          has: out,
          i: branch.i,
          j: branch.j,
          type: branch.type,
        };
      }
      case AST.ATOM: {
        if (argnames.includes(branch.has)) {
          let len = ast.has[1].has.length;
          for (let i = 0; i < len; i++) {
            if (ast.has[1].has[i].has == branch.has) {
              let arg = ast.has[1].has[i];
              let type = unify(arg.type, branch.type);
              Object.assign(arg.type, type);
              Object.assign(branch.type, type);
              return {
                kind: AST.ATOM,
                has: splice2(branch.has, argnames),
                i: branch.i,
                j: branch.j,
                type: type,
              };
            }
          }
          throw Error(`whoops. look like you found some ICE00.`);
        }
        return {
          kind: AST.ATOM,
          has: splice2(branch.has),
          i: branch.i,
          j: branch.j,
          type: branch.type,
        };
      }
      case AST.QUOTED: {
        return {
          kind: AST.QUOTED,
          has: splice2(branch.has),
          i: branch.i,
          j: branch.j,
          type: branch.type,
        };
      }
    }
  }
  if (name != null) {
    ast = splice1(ast);
    return infer(ast);
  }
  if (ast.kind == AST.LIST) {
    if (ast.has.length == 3
    && ast.has[0].kind == AST.ATOM
    && ast.has[0].has == 'lambda') {
      let argnames = ast.has[1].has.map(arg => arg.has);
      infer(ast.has[2]);
      splice2(ast.has[2]);
      let argtypes = ast.has[1].has.map(arg => arg.type);
      let fn = ast.type;
      if (fn.kind == AST.NULL) {
        fn = {
          kind: AST.LIST,
          has: [{
            kind: AST.ATOM,
            has: '->',
            i: -1,
            j: -1,
            type: null,
          }, ...argtypes, ast.has[2].type],
          i: -1,
          j: -1,
          type: null,
        };
      } else {
        if (fn.kind != AST.LIST ||
          fn.has.length <= 1 ||
          fn.has[0].kind != AST.ATOM ||
          fn.has[0].has != '->')
          throw TypeError('function is not a function');
      }
      for (let i = 0; i < argtypes.length; i++) {
        let type = unify(fn.has[i + 1], argtypes[i]);
        Object.assign(fn.has[i + 1], type);
        Object.assign(argtypes[i], type);
      }
      let type = unify(fn.has[fn.has.length - 1], ast.has[2].type);
      Object.assign(fn.has[fn.has.length - 1], type);
      Object.assign(ast.has[2].type, type);
      infer(ast.has[2]);
      splice2(ast.has[2]);
      Object.assign(ast.type, fn);
      return ast;
    }
    let els = ast.has.length;
    if (els == 0)
      return ast;
    let types = [];
    for (let i = 0; i < els; i++) {
      infer(ast.has[i]);
      types.push(ast.has[i].type);
    }
    let [fn, ...args] = types;
    if (fn.kind == AST.NULL) {
      fn = {
        kind: AST.LIST,
        has: [{
          kind: AST.ATOM,
          has: '->',
          i: -1,
          j: -1,
          type: null,
        }, ...args, ast.type],
        i: -1,
        j: -1,
        type: null,
      }
    } else {
      if (fn.kind != AST.LIST ||
        fn.has.length <= 1 ||
        fn.has[0].kind != AST.ATOM ||
        fn.has[0].has != '->')
        throw TypeError(`function is not a function`);
    }
    if (fn.has.length != args.length + 2)
      throw TypeError('function called with incorrect number of arguments');
    ast.has[0].type = fn;
    for (let i = 0; i < args.length; i++) {
      let type = unify(fn.has[i + 1], args[i]);
      Object.assign(fn.has[i + 1], type);
      Object.assign(args[i], type);
      Object.assign(ast.has[i + 1].type, type);
    }
    let ret = unify(ast.type, fn.has[fn.has.length - 1]);
    Object.assign(ast.type, ret);
    Object.assign(fn.has[fn.has.length - 1], ret);
    if (ast.has[0]?.kind == AST.ATOM) {
      switch (ast.has[0].has) {
        case 'return': {
          let type = ast.has[0].type;
          if (type.kind == AST.NULL) {
            let T = {kind: AST.NULL, has: null, i: -1, j: -1, type: null};
            Object.assign(type, {
              kind: AST.LIST,
              has: [
                {kind: AST.ATOM, has: '->', i: -1, j: -1, type: null},
                T,
                {kind: AST.LIST, has: [
                  {kind: AST.ATOM, has: 'effect', i: -1, j: -1, type: null},
                  T
                ], i: -1, j: -1, type: null},
              ],
              i: -1,
              j: -1,
              type: null,
            });
          }
          let arg = type.has[1];
          let ret = type.has[2];
          if (ret.kind == AST.NULL)
            Object.assign(ret, {
              kind: AST.LIST,
              has: [
                {kind: AST.ATOM, has: 'effect', i: -1, j: -1, type: null},
                arg
              ],
              i: -1,
              j: -1,
              type: null,
            })
          if (ret.kind == AST.LIST &&
              ret.has.length == 2 &&
              ret.has[0].kind == AST.ATOM &&
              ret.has[0].has == 'effect') {
            let unified = unify(arg, ret.has[1]);
            Object.assign(arg, unified);
            Object.assign(ret.has[1], unified);
            return ast;
          }
          throw new TypeError();
        }
        case '>>=': {
          let type = ast.has[0].type;
          if (type.kind == AST.NULL) {
            let T = {kind: AST.NULL, has: null, i: -1, j: -1, type: null};
            let U = {kind: AST.NULL, has: null, i: -1, j: -1, type: null};
            Object.assign(type, {
              kind: AST.LIST,
              has: [
                {kind: AST.ATOM, has: '->', i: -1, j: -1, type: null},
                {kind: AST.LIST, has: [
                  {kind: AST.ATOM, has: 'effect', i: -1, j: -1, type: null},
                  T
                ], i: -1, j: -1, type: null},
                {kind: AST.LIST, has: [
                  {kind: AST.ATOM, has: '->', i: -1, j: -1, type: null},
                  T,
                  {kind: AST.LIST, has: [
                    {kind: AST.ATOM, has: 'effect', i: -1, j: -1, type: null},
                    U
                  ], i: -1, j: -1, type: null},
                ], i: -1, j: -1, type: null},
                {kind: AST.LIST, has: [
                  {kind: AST.ATOM, has: 'effect', i: -1, j: -1, type: null},
                  U
                ], i: -1, j: -1, type: null},
              ],
              i: -1,
              j: -1,
              type: null,
            });
          }
          let arg = type.has[1];
          let map = type.has[2];
          let ret = type.has[3];
          if (arg.kind == AST.NULL)
            Object.assign(arg, {
              kind: AST.LIST,
              has: [
                {kind: AST.ATOM, has: 'effect', i: -1, j: -1, type: null},
                {kind: AST.NULL, has: null, i: -1, j: -1, type: null},
              ],
              i: -1,
              j: -1,
              type: null
            });
          if (ret.kind == AST.NULL)
            Object.assign(arg, {
              kind: AST.LIST,
              has: [
                {kind: AST.ATOM, has: 'effect', i: -1, j: -1, type: null},
                {kind: AST.NULL, has: null, i: -1, j: -1, type: null},
              ],
              i: -1,
              j: -1,
              type: null
            });
          let T = unify(arg.has[1], map.has[1]);
          let effect_U = unify(ret, map.has[2]);
          Object.assign(arg.has[1], T);
          Object.assign(map.has[1], T);
          Object.assign(map.has[2], effect_U);
          Object.assign(ret, effect_U);
          return ast;
        }
      }
    }
    return ast;
  }
  if (ast.kind == AST.ATOM) {
    if (!Number.isNaN(parseInt(ast.has))) {
      Object.assign(ast.type, {
        kind: AST.ATOM,
        has: 'i16',
        i: -1,
        j: -1,
        type: null,
      });
      return ast;
    }
    if (ast.has == 'print') {
      Object.assign(ast.type, unify(ast.type, {
        kind: AST.LIST,
        has: [
          {kind: AST.ATOM, has: '->', i: -1, j: -1, type: null},
          {kind: AST.ATOM, has: 'str', i: -1, j: -1, type: null},
          {kind: AST.LIST, has: [
            {kind: AST.ATOM, has: 'effect', i: -1, j: -1, type: null},
            {kind: AST.ATOM, has: 'i16', i: -1, j: -1, type: null},
          ], i: -1, j: -1, type: null},
        ],
        i: -1,
        j: -1,
        type: null,
      }));
    }
  }
  return ast;
}

export {
  unify,
  infer,
};