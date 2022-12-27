import fc from 'fast-check';
import { NUMBER_REGEX } from '../pyrite-common.js';
import { AST } from '../pyrite-parser.js';

const ATOM_REGEX = /[ \t\f\r\n()'":;.]/g;
const atom_arbitrary = fc.string()
  .map(x => x.replaceAll(ATOM_REGEX, ''))
  .filter(x => x.length > 0 && x != 'def');
const non_numeral_atom_arbitrary = fc.string()
  .map(x => x.replaceAll(ATOM_REGEX, ''))
  .filter(x => x.length > 0 && !NUMBER_REGEX.test(x));
const non_string_arbitrary = fc.string()
  .map(x => x.replaceAll('"', ''));
const string_arbitrary = fc.string()
  .map(str => str
    .replaceAll(`\\`, `\\\\`)
    .replaceAll(`"`, `\\"`));

const depthIdentifier = fc.createDepthIdentifier();

const { node: pyrite_ast_arbitrary } = fc.letrec(tie => ({
  'node': fc.oneof(
    tie('quoted_node'),
    tie('list_node'),
    tie('atom_node'),
    tie('string_node'),
    tie('null_node'),
    tie('raw_node'),
    tie('raw2_node'),
  ),
  'quoted_node': fc.tuple(
    tie('node'),
    fc.nat(),
    fc.nat()
  ).map(([has, i, j]) => ({
    kind: AST.QUOTED,
    has,
    i,
    j,
    type: { kind: AST.NULL, has: null, i: -1, j: -1, type: null }
  })),
  'list_node': fc.tuple(
    fc.array(tie('node'), {maxDepth: 3, depthIdentifier}),
    fc.nat(),
    fc.nat()
  ).map(([has, i, j]) => ({
    kind: AST.LIST,
    has,
    i,
    j,
    type: { kind: AST.NULL, has: null, i: -1, j: -1, type: null }
  })),
  'atom_node': fc.tuple(
    atom_arbitrary,
    fc.nat(),
    fc.nat()
  ).map(([has, i, j]) => ({
    kind: AST.ATOM,
    has,
    i,
    j,
    type: { kind: AST.NULL, has: null, i: -1, j: -1, type: null }
  })),
  'string_node': fc.tuple(
    fc.string()
      .map(x => x.replaceAll('"', ''))
      .map(x => `"${x}"`),
    fc.nat(),
    fc.nat()
  ).map(([has, i, j]) => ({
    kind: AST.STRING,
    has,
    i,
    j,
    type: { kind: AST.NULL, has: null, i: -1, j: -1, type: null }
  })),
  'null_node': fc.tuple(
    fc.nat(),
    fc.nat()
  ).map(([i, j]) => ({
    kind: AST.NULL,
    has: null,
    i,
    j,
    type: { kind: AST.NULL, has: null, i: -1, j: -1, type: null }
  })),
  'raw_node': fc.tuple(
    fc.anything(),
    fc.nat(),
    fc.nat()
  ).map(([has, i, j]) => ({
    kind: AST.RAW,
    has,
    i,
    j,
    type: { kind: AST.NULL, has: null, i: -1, j: -1, type: null }
  })),
  'raw2_node': fc.tuple(
    fc.func(fc.anything()),
    fc.nat(),
    fc.nat()
  ).map(([has, i, j]) => ({
    kind: AST.RAW2,
    has,
    i,
    j,
    type: { kind: AST.NULL, has: null, i: -1, j: -1, type: null }
  }))
}));

export {
  ATOM_REGEX,
  NUMBER_REGEX,
  atom_arbitrary,
  non_numeral_atom_arbitrary,
  non_string_arbitrary,
  string_arbitrary,
  pyrite_ast_arbitrary
};