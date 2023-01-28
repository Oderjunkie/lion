import llvm from 'llvm-bindings';
import { execFile } from 'child_process';
import { AST } from './lion-parser.js';

/**
 * @typedef {import('./lion-parser.js').ast} ast
 */

function makeid(length) {
  let result = '';
  let characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

/**
 * converts LLVM module into a javascript module using emscripten
 * @param {any} bitcode
 * @returns {Promise}
 */
function llvm_to_js(bitcode, exported_functions, linked_files=[]) {
  let filename = makeid(20);
  llvm.WriteBitcodeToFile(bitcode, `/tmp/${filename}.bc`);
  return new Promise((resolve, reject) => {
    execFile('emcc', [
      '--no-entry',
      '-o', `/tmp/${filename}.cjs`,
      `-sEXPORTED_FUNCTIONS=[${exported_functions.map(x => `"_${x}"`).join(',')}]`,
      '-sEXPORTED_RUNTIME_METHODS=["ccall","cwrap"]',
      '-sENVIRONMENT=""',
      `/tmp/${filename}.bc`,
      ...linked_files
    ], (err, _stdout, _stderr) => {
      if (err != null) {
        reject(err);
        return;
      }
      import(`/tmp/${filename}.cjs`).then(({default: Module}) => {
        Module.onRuntimeInitialized = () => {
          resolve(Module);
        }
      });
    });
  })
}

/**
 * lion debug printer
 * @param {ast} ast
 * @param {boolean} [show_types=false]
 * @param {boolean} [show_nulls=false]
 * @returns {string}
 */
function dbg(ast, show_types = false, show_nulls = false) {
  if (!ast) return '[err]';
  if (ast.kind == AST.NULL) return '[null]';
  
  let content = '';
  if (ast.kind == AST.RAW || ast.kind == AST.RAW2)
    content = `[raw: ${ast.has}]`;
  if (ast.kind == AST.LIST)
    content = `(\
${ast.has.map(el => dbg(el, show_types, show_nulls)).join(' ')}\
)`;
  if (ast.kind == AST.ATOM)
    content = ast.has;
  if (ast.kind == AST.STRING)
    content = `"${ast.has.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
  if (ast.kind == AST.QUOTED)
    content = `'${dbg(ast.has, show_types, show_nulls)}`;
  
  if (!show_types)
    return content;
  if (!ast.type)
    return content;
  if (ast.type.kind == AST.NULL && !show_nulls)
    return content;
  
  return `${content}: ${dbg(ast.type, show_types, show_nulls)}`;
}

/**
 * lion printer of moderate beauty
 * @param {ast} ast
 * @param {number} nesting
 * @returns {string}
 */
function pdbg(ast, nesting = 0) {
  if (!ast)
    return '';
  if (ast.kind == AST.NULL) {
    let code = "[null]";
    if (ast.type == null) return code;
    if (ast.type.kind != AST.NULL)
      code = `${code}: ${pdbg(ast.type, -1)}`;
    if (nesting != -1)
      code = `${' '.repeat(nesting)}${code}`;
    return code;
  }
  if (ast.kind == AST.RAW || ast.kind == AST.RAW2) {
    let code = `[raw: ${ast.has}]`;
    if (ast.type == null) return code;
    if (ast.type.kind != AST.NULL)
      code = `${code}: ${pdbg(ast.type, -1)}`;
    if (nesting != -1)
      code = `${' '.repeat(nesting)}${code}`;
    return code;
  }
  if (ast.kind == AST.LIST) {
    if (ast.type == null || nesting == -1) {
      let code = ast.has.map(e => pdbg(e, -1)).join(' ');
      code = `(${code})`;
      if (ast.type != null && ast.type.kind != AST.NULL)
        code = `${code}: ${pdbg(ast.type, -1)}`;
      return code;
    }
    if (ast.has[0].kind == AST.ATOM && ast.has[0].has == 'lambda') {
      let args = pdbg(ast.has[1], -1);
      let code = pdbg(ast.has[2], nesting + 2);
      return ' '.repeat(nesting) + `(lambda ${args}\n${code})`;
    }
    let code = ast.has.map(e => pdbg(e, nesting + 2)).join('\n');
    while (code[0] == ' ') code = code.slice(1);
    code = `(${code})`;
    if (ast.type.kind != AST.NULL)
      code = `${code}: ${pdbg(ast.type, -1)}`;
    code = code.replaceAll('\n', '\n' + ' '.repeat(nesting));
    return ' '.repeat(nesting) + code;
  }
  if (ast.kind == AST.ATOM) {
    let code = ast.has;
    if (ast.type == null) return code;
    if (ast.type.kind != AST.NULL) code = `${code}: ${pdbg(ast.type, -1)}`;
    if (nesting != -1) code = `${' '.repeat(nesting)}${code}`;
    return code;
  }
  if (ast.kind == AST.STRING) {
    let code = `"${ast.has.replaceAll('"', '\\"').replaceAll('\\', '\\\\')}"`;
    if (ast.type == null) return code;
    if (ast.type.kind != AST.NULL) code = `${code}: ${pdbg(ast.type, -1)}`;
    if (nesting != -1) code = `${' '.repeat(nesting)}${code}`;
    return code;
  }
  if (ast.kind ==  AST.QUOTED) {
    let code = pdbg(ast, nesting);
    let spaces = 0;
    while (code[0] == ' ') {
      code = code.slice(1);
      spaces++;
    }
    code = ' '.repeat(spaces) + '\'' + code;
    if (ast.type == null) return code;
    if (ast.type.kind != AST.NULL) code = `${code}: ${pdbg(ast.type, -1)}`;
    if (nesting != -1) code = `${' '.repeat(nesting)}${code}`;
    return code;
  }
}

export {
  dbg,
  pdbg,
  llvm_to_js,
};