import llvm from 'llvm-bindings';
import { AST } from './lion-parser.js';
import { evaluate } from './lion-exec.js';
import { NUMBER_REGEX } from './lion-common.js';

let count = 0;

function compile_cond_expr(expr, vars, builder, module, context, fn) {
  const cond = compile_expr(
    expr.has[1],
    vars,
    builder,
    module,
    context,
    fn
  );
  const cond_block = builder.GetInsertBlock();
  const next_block = llvm.BasicBlock.Create(context, `block${count++}`, fn);
  
  const ifso_block = llvm.BasicBlock.Create(context, `block${count++}`, fn);
  builder.SetInsertPoint(ifso_block);
  const ifso = compile_expr(
    expr.has[2],
    vars,
    builder,
    module,
    context,
    fn
  );
  builder.CreateBr(next_block);
  
  const ifnt_block = llvm.BasicBlock.Create(context, `block${count++}`, fn);
  builder.SetInsertPoint(ifnt_block);
  const ifnt = compile_expr(
    expr.has[3],
    vars,
    builder,
    module,
    context,
    fn
  );
  builder.CreateBr(next_block);

  builder.SetInsertPoint(cond_block);
  builder.CreateCondBr(cond, ifso_block, ifnt_block);
  
  builder.SetInsertPoint(next_block);
  if (!llvm.Type.isSameType(ifso.getType(), ifnt.getType()))
    throw TypeError('error: types passed to ? did not match')
  const phi = builder.CreatePHI(ifso.getType(), 2);
  phi.addIncoming(ifso, ifso_block);
  phi.addIncoming(ifnt, ifnt_block);
  return phi;
}

function compile_expr(expr, vars, builder, module, context, fn) {
  switch (expr.kind) {
    case AST.ATOM:
      if (NUMBER_REGEX.test(expr.has))
        return builder.getInt16(parseInt(expr.has))
      else if (vars.has(expr.has))
        return vars.get(expr.has);
      throw ReferenceError(`${expr.has} is not defined`);
    case AST.LIST: {
      if (expr.has[0].kind == AST.ATOM)
        switch (expr.has[0].has) {
          case '?':
            return compile_cond_expr(
              expr,
              vars,
              builder,
              module,
              context,
              fn
            )
          default:
            break;
        }
      let func;
      try {
        func = compile_expr(
          expr.has[0],
          vars,
          builder,
          module,
          context,
          fn
        );
      } catch (e) {
        if (!(
          expr.has[0].kind == AST.ATOM
          && e instanceof ReferenceError
        ))
          throw e;
        func = compile_type(expr.has[0].type, builder);
        func = module.getOrInsertFunction(mangle_name(expr.has[0].has), func);
      }
      let args = expr.has
        .slice(1)
        .map(arg => compile_expr(
          arg,
          vars,
          builder,
          module,
          context,
          fn
        ));
      return builder.CreateCall(func, args, `f${count++}`);
    }
  }
}

function compile_type(type, builder) {
  // console.log(dbg(type));
  let env = new Map();
  env.set('i64', {
    kind: AST.RAW,
    has: builder.getInt64Ty(),
    i: -1,
    j: -1,
    type: {
      kind: AST.NULL,
      has: null,
      i: -1,
      j: -1,
      type: null
    }
  });
  env.set('i32', {
    kind: AST.RAW,
    has: builder.getInt32Ty(),
    i: -1,
    j: -1,
    type: {
      kind: AST.NULL,
      has: null,
      i: -1,
      j: -1,
      type: null
    }
  });
  env.set('i16', {
    kind: AST.RAW,
    has: builder.getInt16Ty(),
    i: -1,
    j: -1,
    type: {
      kind: AST.NULL,
      has: null,
      i: -1,
      j: -1,
      type: null
    }
  });
  env.set('i8', {
    kind: AST.RAW,
    has: builder.getInt8Ty(),
    i: -1,
    j: -1,
    type: {
      kind: AST.NULL,
      has: null,
      i: -1,
      j: -1,
      type: null
    }
  });
  env.set('bool', {
    kind: AST.RAW,
    has: builder.getInt1Ty(),
    i: -1,
    j: -1,
    type: {
      kind: AST.NULL,
      has: null,
      i: -1,
      j: -1,
      type: null
    }
  });
  env.set('->', {
    kind: AST.RAW2,
    has: (...types) => {
      return {
        kind: AST.RAW,
        has: llvm.FunctionType.get(
          types[types.length - 1].has,
          types.slice(0, -1).map(type => type.has),
          false
        ),
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
    },
    i: -1,
    j: -1,
    type: {
      kind: AST.NULL,
      has: null,
      i: -1,
      j: -1,
      type: null
    }
  });
  return evaluate(type, env).has;
}

/**
 * (simplified) GHC name mangling algorithm
 * https://gitlab.haskell.org/ghc/ghc/-/wikis/commentary/compiler/symbol-names
 * @param {string} name
 * @returns {string}
 */
function mangle_name(name) {
  function mangle_char(char) {
    switch (char) {
      case 'a': return 'a';
      case 'b': return 'b';
      case 'c': return 'c';
      case 'd': return 'd';
      case 'e': return 'e';
      case 'f': return 'f';
      case 'g': return 'g';
      case 'h': return 'h';
      case 'i': return 'i';
      case 'j': return 'j';
      case 'k': return 'k';
      case 'l': return 'l';
      case 'm': return 'm';
      case 'n': return 'n';
      case 'o': return 'o';
      case 'p': return 'p';
      case 'q': return 'q';
      case 'r': return 'r';
      case 's': return 's';
      case 't': return 't';
      case 'u': return 'u';
      case 'v': return 'v';
      case 'w': return 'w';
      case 'x': return 'x';
      case 'y': return 'y';
      case 'z': return 'zz';
      case 'A': return 'A';
      case 'B': return 'B';
      case 'C': return 'C';
      case 'D': return 'D';
      case 'E': return 'E';
      case 'F': return 'F';
      case 'G': return 'G';
      case 'H': return 'H';
      case 'I': return 'I';
      case 'J': return 'J';
      case 'K': return 'K';
      case 'L': return 'L';
      case 'M': return 'M';
      case 'N': return 'N';
      case 'O': return 'O';
      case 'P': return 'P';
      case 'Q': return 'Q';
      case 'R': return 'R';
      case 'S': return 'S';
      case 'T': return 'T';
      case 'U': return 'U';
      case 'V': return 'V';
      case 'W': return 'W';
      case 'X': return 'X';
      case 'Y': return 'Y';
      case 'Z': return 'ZZ';
      case '0': return '0';
      case '1': return '1';
      case '2': return '2';
      case '3': return '3';
      case '4': return '4';
      case '5': return '5';
      case '6': return '6';
      case '7': return '7';
      case '8': return '8';
      case '9': return '9';
      case '(': return 'ZL';
      case ')': return 'ZR';
      case '[': return 'ZM';
      case ']': return 'ZN';
      case ':': return 'ZC';
      case '&': return 'za';
      case '|': return 'zb';
      case '^': return 'zc';
      case '$': return 'zd';
      case '=': return 'ze';
      case '>': return 'zg';
      case '#': return 'zh';
      case '.': return 'zi';
      case '<': return 'zl';
      case '-': return 'zm';
      case '!': return 'zn';
      case '+': return 'zp';
      case '\'': return 'zq';
      case '\\': return 'zr';
      case '/': return 'zs';
      case '*': return 'zt';
      case '_': return 'zu';
      case '%': return 'zv';
      default: {
        let code = char.codePointAt(0).toString(16);
        switch (code[0]) {
          case '0':
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
          case '6':
          case '7':
          case '8':
          case '9': return `z${code}U`;
          case 'a':
          case 'b':
          case 'c':
          case 'd':
          case 'e':
          case 'f': return `z0${code}U`;
        }
      }
    }
  }
  return name.split('').map(char => mangle_char(char)).join('');
}

function compile_file(name, defs) {
  const context = new llvm.LLVMContext();
  const module = new llvm.Module(name, context);
  const builder = new llvm.IRBuilder(context);
  let handles = new Map();
  for (const [fnname, value] of defs.entries()) {
    switch (value.kind) {
      case AST.LIST: {
        if (value.has[0].kind == AST.ATOM && value.has[0].has == 'lambda') {
          let types = value.type.has.slice(1);
          const return_type = compile_type(types[types.length - 1], builder);
          const arg_types = types
            .slice(0, -1)
            .map(type => compile_type(type, builder));
          // console.log(return_type, arg_types, false);
          const fn_type = llvm.FunctionType.get(
            return_type,
            arg_types,
            false
          );
          const fn = llvm.Function.Create(
            fn_type,
            llvm.Function.LinkageTypes.ExternalLinkage,
            mangle_name(fnname),
            module
          );
          handles.set(fnname, fn);
          break;
        }
        break;
      }
    }
  }
  for (const [fnname, value] of defs.entries()) {
    switch (value.kind) {
      case AST.LIST: {
        if (value.has[0].kind == AST.ATOM && value.has[0].has == 'lambda') {
          const fn = handles.get(fnname);
          const fn_args = value.has[1].has.map(
            (arg, index) => [arg.has, fn.getArg(index)]
          ).reduce(
            (x, [key, val]) => x.set(key, val),
            new Map()
          );
          const entryBB = llvm.BasicBlock.Create(context, 'entry', fn);
          builder.SetInsertPoint(entryBB);
          const env = new Map();
          handles.forEach((val, key) => env.set(key, val));
          fn_args.forEach((val, key) => env.set(key, val));
          builder.CreateRet(compile_expr(
            value.has[2],
            env,
            builder,
            module,
            context,
            fn
          ));
          break;
        }
        break;
      }
    }
  }
  module.setDataLayout('e');
  module.setTargetTriple('wasm32-unknown-unknown');
  return module;
}

export {
  compile_file,
}