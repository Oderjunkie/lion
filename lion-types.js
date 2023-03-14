import { AST } from './lion-parser.js';
import { dbg } from './lion-dbg.js';
import { zip } from './lion-common.js';

const unify_pos = (a, b) => a == -1 ? b : a;

const unify = (a, b) => {
  if (!a) return b;
  if (!b) return a;
  if (a.kind == AST.NULL) return b;
  if (b.kind == AST.NULL) return a;
  if (a.kind != b.kind)
    throw new TypeError(
      `[${a.i}-->${a.j}] and [${b.i}-->${b.j}] do not match`
    );
  if (a.kind == AST.ATOM)
    if (a.has != b.has)
      throw new TypeError(
        `[${a.i}-->${a.j}] and [${b.i}-->${b.j}] do not match`
      );
    else
      return {
        ...a,
        i: unify_pos(a.i, b.i),
        j: unify_pos(a.j, b.j)
      };
  if (a.kind == AST.LIST)
    return {
      ...a,
      has:
        zip(a.has, b.has)
        .map(([brancha, branchb]) => unify(brancha, branchb)),
      i: unify_pos(a.i, b.i),
      j: unify_pos(a.j, b.j)
    };
  throw new TypeError(`unknown type.`);
};

const infer = ast => {
  if (ast.kind == AST.LIST) {
    if (ast.has.length == 3 &&
        ast.has[0].kind == AST.ATOM &&
        ast.has[0].has == 'lambda') {
      ast = {
        ...ast,
        has: [ast.has[0], ast.has[1], infer(ast.has[2])]
      };
      if (ast.type.kind == AST.NULL) {
        ast = {
          ...ast,
          type: {
            kind: AST.LIST,
            has: [
              {kind: AST.ATOM, has: '->', i: -1, j: -1, type: null},
              {kind: AST.NULL, has: null, i: -1, j: -1, type: null},
              {kind: AST.NULL, has: null, i: -1, j: -1, type: null}
            ],
            i: -1,
            j: -1,
            type: null
          }
        };
      }
      if (ast.type.kind != AST.LIST ||
          ast.type.has.length != 3 ||
          ast.type.has[0].kind != AST.ATOM ||
          ast.type.has[0].has != '->') {
        throw new TypeError(`invalid type for lambda ${dbg(ast.has[0].type)}`);
      }
      const argtype = unify(ast.has[1].has[0].type, ast.type.has[1]);
      const restype = unify(ast.has[2].type, ast.type.has[2]);
      return {
        ...ast,
        has: [
          ast.has[0],
          {
            ...ast.has[1],
            has: [
              {
                ...ast.has[1].has[0],
                type: argtype
              }
            ]
          },
          infer({
            ...ast.has[2],
            type: restype
          })
        ],
        type: {
          ...ast.type,
          has: [
            { kind: AST.ATOM, has: '->', i: -1, j: -1, type: null },
            argtype,
            restype
          ]
        }
      };
    } else {
      ast = { ...ast, has: ast.has.map(infer) };
      if (ast.has.length != 2)
        throw new TypeError(`unreachable?`);
      if (ast.has[0].type.kind == AST.NULL) {
        ast = {
          ...ast,
          has: [{
            ...ast.has[0],
            type: {
              kind: AST.LIST,
              has: [
                {kind: AST.ATOM, has: '->', i: -1, j: -1, type: null},
                {kind: AST.NULL, has: null, i: -1, j: -1, type: null},
                {kind: AST.NULL, has: null, i: -1, j: -1, type: null}
              ],
              i: -1,
              j: -1,
              type: null
            }
          }, ast.has[1]]
        };
      }
      if (ast.has[0].type.kind != AST.LIST ||
          ast.has[0].type.has.length != 3 ||
          ast.has[0].type.has[0].kind != AST.ATOM ||
          ast.has[0].type.has[0].has != '->') {
        throw new TypeError(`uncallable type ${dbg(ast.has[0].type)}`);
      }
      const argtype = unify(ast.has[0].type.has[1], ast.has[1].type);
      const restype = unify(ast.has[0].type.has[2], ast.type);
      return {
        ...ast,
        has: [
          {
            ...ast.has[0],
            type: {
              ...ast.has[0].type,
              has: [
                { kind: AST.ATOM, has: '->', i: -1, j: -1, type: null },
                argtype,
                restype
              ]
            }
          },
          {
            ...ast.has[1],
            type: argtype
          },
        ].map(infer),
        type: restype
      };
    }
  }
  return ast;
};

export {
  unify,
  infer,
};