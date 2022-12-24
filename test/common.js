import fc from 'fast-check';
import { NUMBER_REGEX } from '../pyrite-common.js';

const ATOM_REGEX = /[ \t\f\r\n()'":;]/g;
const atom_arbitrary = fc.string()
  .map(x => x.replaceAll(ATOM_REGEX, ''))
  .filter(x => x.length > 0 && x != 'def');
const non_numeral_atom_arbitrary = fc.string()
  .map(x => x.replaceAll(ATOM_REGEX, ''))
  .filter(x => x.length > 0 && !NUMBER_REGEX.test(x));

export {
  ATOM_REGEX,
  NUMBER_REGEX,
  atom_arbitrary,
  non_numeral_atom_arbitrary
};