// Note: For maximum-speed code, see "Optimizing Code" on the Emscripten wiki, https://github.com/kripken/emscripten/wiki/Optimizing-Code
// Note: Some Emscripten settings may limit the speed of the generated code.
// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = eval('(function() { try { return Module || {} } catch(e) { return {} } })()');
// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}
// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function';
var ENVIRONMENT_IS_WEB = typeof window === 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  Module['print'] = function(x) {
    process['stdout'].write(x + '\n');
  };
  Module['printErr'] = function(x) {
    process['stderr'].write(x + '\n');
  };
  var nodeFS = require('fs');
  var nodePath = require('path');
  Module['read'] = function(filename, binary) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };
  Module['readBinary'] = function(filename) { return Module['read'](filename, true) };
  Module['load'] = function(f) {
    globalEval(read(f));
  };
  Module['arguments'] = process['argv'].slice(2);
  module.exports = Module;
}
if (ENVIRONMENT_IS_SHELL) {
  Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm
  Module['read'] = read;
  Module['readBinary'] = function(f) {
    return read(f, 'binary');
  };
  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }
  this['Module'] = Module;
}
if (ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER) {
  Module['print'] = function(x) {
    console.log(x);
  };
  Module['printErr'] = function(x) {
    console.log(x);
  };
  this['Module'] = Module;
}
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };
  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }
}
if (ENVIRONMENT_IS_WORKER) {
  // We can do very little here...
  var TRY_USE_DUMP = false;
  Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
    dump(x);
  }) : (function(x) {
    // self.postMessage(x); // enable this if you want stdout to be sent as messages
  }));
  Module['load'] = importScripts;
}
if (!ENVIRONMENT_IS_WORKER && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_SHELL) {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}
function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] == 'undefined' && Module['read']) {
  Module['load'] = function(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
// *** Environment setup code ***
// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];
// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];
// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}
// === Auto-generated preamble library stuff ===
//========================================
// Runtime code shared with compiler
//========================================
var Runtime = {
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  forceAlign: function (target, quantum) {
    quantum = quantum || 4;
    if (quantum == 1) return target;
    if (isNumber(target) && isNumber(quantum)) {
      return Math.ceil(target/quantum)*quantum;
    } else if (isNumber(quantum) && isPowerOfTwo(quantum)) {
      var logg = log2(quantum);
      return '((((' +target + ')+' + (quantum-1) + ')>>' + logg + ')<<' + logg + ')';
    }
    return 'Math.ceil((' + target + ')/' + quantum + ')*' + quantum;
  },
  isNumberType: function (type) {
    return type in Runtime.INT_TYPES || type in Runtime.FLOAT_TYPES;
  },
  isPointerType: function isPointerType(type) {
  return type[type.length-1] == '*';
},
  isStructType: function isStructType(type) {
  if (isPointerType(type)) return false;
  if (isArrayType(type)) return true;
  if (/<?{ ?[^}]* ?}>?/.test(type)) return true; // { i32, i8 } etc. - anonymous struct types
  // See comment in isStructPointerType()
  return type[0] == '%';
},
  INT_TYPES: {"i1":0,"i8":0,"i16":0,"i32":0,"i64":0},
  FLOAT_TYPES: {"float":0,"double":0},
  or64: function (x, y) {
    var l = (x | 0) | (y | 0);
    var h = (Math.round(x / 4294967296) | Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  and64: function (x, y) {
    var l = (x | 0) & (y | 0);
    var h = (Math.round(x / 4294967296) & Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  xor64: function (x, y) {
    var l = (x | 0) ^ (y | 0);
    var h = (Math.round(x / 4294967296) ^ Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  getNativeTypeSize: function (type, quantumSize) {
    if (Runtime.QUANTUM_SIZE == 1) return 1;
    var size = {
      '%i1': 1,
      '%i8': 1,
      '%i16': 2,
      '%i32': 4,
      '%i64': 8,
      "%float": 4,
      "%double": 8
    }['%'+type]; // add '%' since float and double confuse Closure compiler as keys, and also spidermonkey as a compiler will remove 's from '_i8' etc
    if (!size) {
      if (type.charAt(type.length-1) == '*') {
        size = Runtime.QUANTUM_SIZE; // A pointer
      } else if (type[0] == 'i') {
        var bits = parseInt(type.substr(1));
        assert(bits % 8 == 0);
        size = bits/8;
      }
    }
    return size;
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  dedup: function dedup(items, ident) {
  var seen = {};
  if (ident) {
    return items.filter(function(item) {
      if (seen[item[ident]]) return false;
      seen[item[ident]] = true;
      return true;
    });
  } else {
    return items.filter(function(item) {
      if (seen[item]) return false;
      seen[item] = true;
      return true;
    });
  }
},
  set: function set() {
  var args = typeof arguments[0] === 'object' ? arguments[0] : arguments;
  var ret = {};
  for (var i = 0; i < args.length; i++) {
    ret[args[i]] = 0;
  }
  return ret;
},
  STACK_ALIGN: 8,
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (type == 'i64' || type == 'double' || vararg) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  calculateStructAlignment: function calculateStructAlignment(type) {
    type.flatSize = 0;
    type.alignSize = 0;
    var diffs = [];
    var prev = -1;
    var index = 0;
    type.flatIndexes = type.fields.map(function(field) {
      index++;
      var size, alignSize;
      if (Runtime.isNumberType(field) || Runtime.isPointerType(field)) {
        size = Runtime.getNativeTypeSize(field); // pack char; char; in structs, also char[X]s.
        alignSize = Runtime.getAlignSize(field, size);
      } else if (Runtime.isStructType(field)) {
        if (field[1] === '0') {
          // this is [0 x something]. When inside another structure like here, it must be at the end,
          // and it adds no size
          // XXX this happens in java-nbody for example... assert(index === type.fields.length, 'zero-length in the middle!');
          size = 0;
          alignSize = type.alignSize || QUANTUM_SIZE;
        } else {
          size = Types.types[field].flatSize;
          alignSize = Runtime.getAlignSize(null, Types.types[field].alignSize);
        }
      } else if (field[0] == 'b') {
        // bN, large number field, like a [N x i8]
        size = field.substr(1)|0;
        alignSize = 1;
      } else {
        throw 'Unclear type in struct: ' + field + ', in ' + type.name_ + ' :: ' + dump(Types.types[type.name_]);
      }
      if (type.packed) alignSize = 1;
      type.alignSize = Math.max(type.alignSize, alignSize);
      var curr = Runtime.alignMemory(type.flatSize, alignSize); // if necessary, place this on aligned memory
      type.flatSize = curr + size;
      if (prev >= 0) {
        diffs.push(curr-prev);
      }
      prev = curr;
      return curr;
    });
    type.flatSize = Runtime.alignMemory(type.flatSize, type.alignSize);
    if (diffs.length == 0) {
      type.flatFactor = type.flatSize;
    } else if (Runtime.dedup(diffs).length == 1) {
      type.flatFactor = diffs[0];
    }
    type.needsFlattening = (type.flatFactor != 1);
    return type.flatIndexes;
  },
  generateStructInfo: function (struct, typeName, offset) {
    var type, alignment;
    if (typeName) {
      offset = offset || 0;
      type = (typeof Types === 'undefined' ? Runtime.typeInfo : Types.types)[typeName];
      if (!type) return null;
      if (type.fields.length != struct.length) {
        printErr('Number of named fields must match the type for ' + typeName + ': possibly duplicate struct names. Cannot return structInfo');
        return null;
      }
      alignment = type.flatIndexes;
    } else {
      var type = { fields: struct.map(function(item) { return item[0] }) };
      alignment = Runtime.calculateStructAlignment(type);
    }
    var ret = {
      __size__: type.flatSize
    };
    if (typeName) {
      struct.forEach(function(item, i) {
        if (typeof item === 'string') {
          ret[item] = alignment[i] + offset;
        } else {
          // embedded struct
          var key;
          for (var k in item) key = k;
          ret[key] = Runtime.generateStructInfo(item[key], type.fields[i], alignment[i]);
        }
      });
    } else {
      struct.forEach(function(item, i) {
        ret[item[1]] = alignment[i];
      });
    }
    return ret;
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2 + 2*i;
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[func]) {
      Runtime.funcWrappers[func] = function() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return Runtime.funcWrappers[func];
  },
  UTF8Processor: function () {
    var buffer = [];
    var needed = 0;
    this.processCChar = function (code) {
      code = code & 0xff;
      if (needed) {
        buffer.push(code);
        needed--;
      }
      if (buffer.length == 0) {
        if (code < 128) return String.fromCharCode(code);
        buffer.push(code);
        if (code > 191 && code < 224) {
          needed = 1;
        } else {
          needed = 2;
        }
        return '';
      }
      if (needed > 0) return '';
      var c1 = buffer[0];
      var c2 = buffer[1];
      var c3 = buffer[2];
      var ret;
      if (c1 > 191 && c1 < 224) {
        ret = String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
      } else {
        ret = String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
      }
      buffer.length = 0;
      return ret;
    }
    this.processJSString = function(string) {
      string = unescape(encodeURIComponent(string));
      var ret = [];
      for (var i = 0; i < string.length; i++) {
        ret.push(string.charCodeAt(i));
      }
      return ret;
    }
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = ((((STACKTOP)+7)>>3)<<3); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + size)|0;STATICTOP = ((((STATICTOP)+7)>>3)<<3); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + size)|0;DYNAMICTOP = ((((DYNAMICTOP)+7)>>3)<<3); if (DYNAMICTOP >= TOTAL_MEMORY) enlargeMemory();; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 8))*(quantum ? quantum : 8); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+(((low)>>>(0))))+((+(((high)>>>(0))))*(+(4294967296)))) : ((+(((low)>>>(0))))+((+(((high)|(0))))*(+(4294967296))))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}
//========================================
// Runtime essentials
//========================================
var __THREW__ = 0; // Used in checking for thrown exceptions.
var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}
var globalScope = this;
// C calling interface. A convenient way to call C functions (in C files, or
// defined with extern "C").
//
// Note: LLVM optimizations can inline and remove functions, after which you will not be
//       able to call them. Closure can also do so. To avoid that, add your function to
//       the exports using something like
//
//         -s EXPORTED_FUNCTIONS='["_main", "_myfunc"]'
//
// @param ident      The name of the C function (note that C++ functions will be name-mangled - use extern "C")
// @param returnType The return type of the function, one of the JS types 'number', 'string' or 'array' (use 'number' for any C pointer, and
//                   'array' for JavaScript arrays and typed arrays; note that arrays are 8-bit).
// @param argTypes   An array of the types of arguments for the function (if there are no arguments, this can be ommitted). Types are as in returnType,
//                   except that 'array' is not possible (there is no way for us to know the length of the array)
// @param args       An array of the arguments to the function, as native JS values (as in returnType)
//                   Note that string arguments will be stored on the stack (the JS string will become a C string on the stack).
// @return           The return value, as a native JS value (as in returnType)
function ccall(ident, returnType, argTypes, args) {
  return ccallFunc(getCFunc(ident), returnType, argTypes, args);
}
Module["ccall"] = ccall;
// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  try {
    var func = Module['_' + ident]; // closure exported function
    if (!func) func = eval('_' + ident); // explicit lookup
  } catch(e) {
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}
// Internal function that does a C call using a function, not an identifier
function ccallFunc(func, returnType, argTypes, args) {
  var stack = 0;
  function toC(value, type) {
    if (type == 'string') {
      if (value === null || value === undefined || value === 0) return 0; // null string
      if (!stack) stack = Runtime.stackSave();
      var ret = Runtime.stackAlloc(value.length+1);
      writeStringToMemory(value, ret);
      return ret;
    } else if (type == 'array') {
      if (!stack) stack = Runtime.stackSave();
      var ret = Runtime.stackAlloc(value.length);
      writeArrayToMemory(value, ret);
      return ret;
    }
    return value;
  }
  function fromC(value, type) {
    if (type == 'string') {
      return Pointer_stringify(value);
    }
    assert(type != 'array');
    return value;
  }
  var i = 0;
  var cArgs = args ? args.map(function(arg) {
    return toC(arg, argTypes[i++]);
  }) : [];
  var ret = fromC(func.apply(null, cArgs), returnType);
  if (stack) Runtime.stackRestore(stack);
  return ret;
}
// Returns a native JS wrapper for a C function. This is similar to ccall, but
// returns a function you can call repeatedly in a normal way. For example:
//
//   var my_function = cwrap('my_c_function', 'number', ['number', 'number']);
//   alert(my_function(5, 22));
//   alert(my_function(99, 12));
//
function cwrap(ident, returnType, argTypes) {
  var func = getCFunc(ident);
  return function() {
    return ccallFunc(func, returnType, argTypes, Array.prototype.slice.call(arguments));
  }
}
Module["cwrap"] = cwrap;
// Sets a value in memory in a dynamic way at run-time. Uses the
// type data. This is the same as makeSetValue, except that
// makeSetValue is done at compile-time and generates the needed
// code then, whereas this function picks the right code at
// run-time.
// Note that setValue and getValue only do *aligned* writes and reads!
// Note that ccall uses JS types as for defining types, while setValue and
// getValue need LLVM types ('i8', 'i32') - this is a lower-level operation
function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[(ptr)]=value; break;
      case 'i8': HEAP8[(ptr)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,((Math.min((+(Math.floor((value)/(+(4294967296))))), (+(4294967295))))|0)>>>0],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module['setValue'] = setValue;
// Parallel to setValue.
function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[(ptr)];
      case 'i8': return HEAP8[(ptr)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module['getValue'] = getValue;
var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module['ALLOC_NORMAL'] = ALLOC_NORMAL;
Module['ALLOC_STACK'] = ALLOC_STACK;
Module['ALLOC_STATIC'] = ALLOC_STATIC;
Module['ALLOC_DYNAMIC'] = ALLOC_DYNAMIC;
Module['ALLOC_NONE'] = ALLOC_NONE;
// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }
  var singleType = typeof types === 'string' ? types : null;
  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }
  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)|0)]=0;
    }
    return ret;
  }
  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }
  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];
    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }
    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }
    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later
    setValue(ret+i, curr, type);
    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }
  return ret;
}
Module['allocate'] = allocate;
function Pointer_stringify(ptr, /* optional */ length) {
  // Find the length, and check for UTF while doing so
  var hasUtf = false;
  var t;
  var i = 0;
  while (1) {
    t = HEAPU8[(((ptr)+(i))|0)];
    if (t >= 128) hasUtf = true;
    else if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;
  var ret = '';
  if (!hasUtf) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }
  var utf8 = new Runtime.UTF8Processor();
  for (i = 0; i < length; i++) {
    t = HEAPU8[(((ptr)+(i))|0)];
    ret += utf8.processCChar(t);
  }
  return ret;
}
Module['Pointer_stringify'] = Pointer_stringify;
// Memory management
var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
  return ((x+4095)>>12)<<12;
}
var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk
function enlargeMemory() {
  abort('Cannot enlarge memory arrays in asm.js. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value, or (2) set Module.TOTAL_MEMORY before the program runs.');
}
var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 33554432;
var FAST_MEMORY = Module['FAST_MEMORY'] || 2097152;
// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(!!Int32Array && !!Float64Array && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'Cannot fallback to non-typed array case: Code is too specialized');
var buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);
// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');
Module['HEAP'] = HEAP;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;
function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}
var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited
var runtimeInitialized = false;
function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}
function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}
function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}
function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
}
function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}
function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module['addOnPreRun'] = Module.addOnPreRun = addOnPreRun;
function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module['addOnInit'] = Module.addOnInit = addOnInit;
function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module['addOnPreMain'] = Module.addOnPreMain = addOnPreMain;
function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module['addOnExit'] = Module.addOnExit = addOnExit;
function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module['addOnPostRun'] = Module.addOnPostRun = addOnPostRun;
// Tools
// This processes a JS string into a C-line array of numbers, 0-terminated.
// For LLVM-originating strings, see parser.js:parseLLVMString function
function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var ret = (new Runtime.UTF8Processor()).processJSString(stringy);
  if (length) {
    ret.length = length;
  }
  if (!dontAddNull) {
    ret.push(0);
  }
  return ret;
}
Module['intArrayFromString'] = intArrayFromString;
function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module['intArrayToString'] = intArrayToString;
// Write a Javascript array to somewhere in the heap
function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))|0)]=chr
    i = i + 1;
  }
}
Module['writeStringToMemory'] = writeStringToMemory;
function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[(((buffer)+(i))|0)]=array[i];
  }
}
Module['writeArrayToMemory'] = writeArrayToMemory;
function unSign(value, bits, ignore, sig) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore, sig) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}
if (!Math['imul']) Math['imul'] = function(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];
// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyTracking = {};
var calledInit = false, calledRun = false;
var runDependencyWatcher = null;
function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
  } else {
    Module.printErr('warning: run dependency added without ID');
  }
}
Module['addRunDependency'] = addRunDependency;
function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    Module.printErr('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    } 
    // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
    if (!calledRun && shouldRunNow) run();
  }
}
Module['removeRunDependency'] = removeRunDependency;
Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data
function loadMemoryInitializer(filename) {
  function applyData(data) {
    HEAPU8.set(data, STATIC_BASE);
  }
  // always do this asynchronously, to keep shell and web as similar as possible
  addOnPreRun(function() {
    if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
      applyData(Module['readBinary'](filename));
    } else {
      Browser.asyncLoad(filename, function(data) {
        applyData(data);
      }, function(data) {
        throw 'could not load memory initializer ' + filename;
      });
    }
  });
}
// === Body ===
STATIC_BASE = 8;
STATICTOP = STATIC_BASE + 20080;
var _stdout;
var _stdin;
var _stderr;
var ___fsmu8;
var ___dso_handle;
var __ZTVN10__cxxabiv120__si_class_type_infoE;
var __ZTVN10__cxxabiv117__class_type_infoE;
/* global initializers */ __ATINIT__.push({ func: function() { runPostSets() } },{ func: function() { __GLOBAL__I_a() } });
var __ZNSt13runtime_errorC1EPKc;
var __ZNSt13runtime_errorD1Ev;
var __ZNSt12length_errorD1Ev;
var __ZNSt3__16localeC1Ev;
var __ZNSt3__16localeC1ERKS0_;
var __ZNSt3__16localeD1Ev;
var __ZNSt8bad_castC1Ev;
var __ZNSt8bad_castD1Ev;
var _stdout = _stdout=allocate([0,0,0,0,0,0,0,0], "i8", ALLOC_STATIC);
var _stdin = _stdin=allocate([0,0,0,0,0,0,0,0], "i8", ALLOC_STATIC);
var _stderr = _stderr=allocate([0,0,0,0,0,0,0,0], "i8", ALLOC_STATIC);
__ZTVN10__cxxabiv120__si_class_type_infoE=allocate([0,0,0,0,160,60,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_STATIC);
__ZTVN10__cxxabiv117__class_type_infoE=allocate([0,0,0,0,176,60,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_STATIC);
/* memory initializer */ allocate([0,0,0,0,0,0,36,64,0,0,0,0,0,0,89,64,0,0,0,0,0,136,195,64,0,0,0,0,132,215,151,65,0,128,224,55,121,195,65,67,23,110,5,181,181,184,147,70,245,249,63,233,3,79,56,77,50,29,48,249,72,119,130,90,60,191,115,127,221,79,21,117,74,117,108,0,0,0,0,0,74,117,110,0,0,0,0,0,65,112,114,0,0,0,0,0,77,97,114,0,0,0,0,0,70,101,98,0,0,0,0,0,74,97,110,0,0,0,0,0,68,101,99,101,109,98,101,114,0,0,0,0,0,0,0,0,117,110,115,117,112,112,111,114,116,101,100,32,108,111,99,97,108,101,32,102,111,114,32,115,116,97,110,100,97,114,100,32,105,110,112,117,116,0,0,0,78,111,118,101,109,98,101,114,0,0,0,0,0,0,0,0,79,99,116,111,98,101,114,0,83,101,112,116,101,109,98,101,114,0,0,0,0,0,0,0,98,0,0,0,0,0,0,0,65,117,103,117,115,116,0,0,74,117,108,121,0,0,0,0,74,117,110,101,0,0,0,0,77,97,121,0,0,0,0,0,65,112,114,105,108,0,0,0,77,97,114,99,104,0,0,0,70,101,98,114,117,97,114,121,0,0,0,0,0,0,0,0,74,97,110,117,97,114,121,0,68,0,0,0,101,0,0,0,99,0,0,0,0,0,0,0,105,32,60,32,115,105,122,101,95,0,0,0,0,0,0,0,78,0,0,0,111,0,0,0,118,0,0,0,0,0,0,0,79,0,0,0,99,0,0,0,116,0,0,0,0,0,0,0,83,0,0,0,101,0,0,0,112,0,0,0,0,0,0,0,98,97,115,105,99,95,115,116,114,105,110,103,0,0,0,0,65,0,0,0,117,0,0,0,103,0,0,0,0,0,0,0,74,0,0,0,117,0,0,0,108,0,0,0,0,0,0,0,74,0,0,0,117,0,0,0,110,0,0,0,0,0,0,0,77,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,65,0,0,0,112,0,0,0,114,0,0,0,0,0,0,0,77,0,0,0,97,0,0,0,114,0,0,0,0,0,0,0,70,0,0,0,101,0,0,0,98,0,0,0,0,0,0,0,47,104,111,109,101,47,103,97,114,114,105,103,117,101,115,47,112,114,111,106,101,99,116,115,47,99,117,105,109,103,47,99,117,105,109,103,47,116,114,97,99,107,105,110,103,50,47,112,97,114,116,105,99,108,101,95,99,111,110,116,97,105,110,101,114,46,104,112,112,0,0,0,74,0,0,0,97,0,0,0,110,0,0,0,0,0,0,0,68,0,0,0,101,0,0,0,99,0,0,0,101,0,0,0,109,0,0,0,98,0,0,0,101,0,0,0,114,0,0,0,0,0,0,0,0,0,0,0,78,0,0,0,111,0,0,0,118,0,0,0,101,0,0,0,109,0,0,0,98,0,0,0,101,0,0,0,114,0,0,0,0,0,0,0,0,0,0,0,79,0,0,0,99,0,0,0,116,0,0,0,111,0,0,0,98,0,0,0,101,0,0,0,114,0,0,0,0,0,0,0,83,0,0,0,101,0,0,0,112,0,0,0,116,0,0,0,101,0,0,0,109,0,0,0,98,0,0,0,101,0,0,0,114,0,0,0,0,0,0,0,65,0,0,0,117,0,0,0,103,0,0,0,117,0,0,0,115,0,0,0,116,0,0,0,0,0,0,0,0,0,0,0,74,0,0,0,117,0,0,0,108,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,74,0,0,0,117,0,0,0,110,0,0,0,101,0,0,0,0,0,0,0,0,0,0,0,65,0,0,0,112,0,0,0,114,0,0,0,105,0,0,0,108,0,0,0,0,0,0,0,104,97,115,40,112,41,0,0,77,0,0,0,97,0,0,0,114,0,0,0,99,0,0,0,104,0,0,0,0,0,0,0,70,0,0,0,101,0,0,0,98,0,0,0,114,0,0,0,117,0,0,0,97,0,0,0,114,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,74,0,0,0,97,0,0,0,110,0,0,0,117,0,0,0,97,0,0,0,114,0,0,0,121,0,0,0,0,0,0,0,80,77,0,0,0,0,0,0,65,77,0,0,0,0,0,0,80,0,0,0,77,0,0,0,0,0,0,0,0,0,0,0,65,0,0,0,77,0,0,0,0,0,0,0,0,0,0,0,47,104,111,109,101,47,103,97,114,114,105,103,117,101,115,47,112,114,111,106,101,99,116,115,47,99,117,105,109,103,47,99,117,105,109,103,47,116,114,97,99,107,105,110,103,50,47,109,101,114,103,101,95,116,114,97,106,101,99,116,111,114,105,101,115,46,104,0,0,0,0,0,112,115,101,116,46,100,111,109,97,105,110,40,41,46,104,97,115,40,112,41,0,0,0,0,108,111,99,97,108,101,32,110,111,116,32,115,117,112,112,111,114,116,101,100,0,0,0,0,37,0,0,0,73,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,32,0,0,0,37,0,0,0,112,0,0,0,0,0,0,0,37,73,58,37,77,58,37,83,32,37,112,0,0,0,0,0,37,0,0,0,97,0,0,0,32,0,0,0,37,0,0,0,98,0,0,0,32,0,0,0,37,0,0,0,100,0,0,0,32,0,0,0,37,0,0,0,72,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,32,0,0,0,37,0,0,0,89,0,0,0,0,0,0,0,0,0,0,0,37,97,32,37,98,32,37,100,32,37,72,58,37,77,58,37,83,32,37,89,0,0,0,0,37,0,0,0,72,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,0,0,0,0,0,0,0,0,37,72,58,37,77,58,37,83,0,0,0,0,0,0,0,0,115,116,100,58,58,98,97,100,95,97,108,108,111,99,0,0,37,0,0,0,109,0,0,0,47,0,0,0,37,0,0,0,100,0,0,0,47,0,0,0,37,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,37,109,47,37,100,47,37,121,0,0,0,0,0,0,0,0,47,104,111,109,101,47,103,97,114,114,105,103,117,101,115,47,112,114,111,106,101,99,116,115,47,99,117,105,109,103,47,99,117,105,109,103,47,99,112,117,47,104,111,115,116,95,105,109,97,103,101,50,100,46,104,112,112,0,0,0,0,0,0,0,102,0,0,0,97,0,0,0,108,0,0,0,115,0,0,0,101,0,0,0,0,0,0,0,102,97,108,115,101,0,0,0,105,110,112,117,116,46,98,111,114,100,101,114,40,41,32,62,61,32,50,0,0,0,0,0,116,0,0,0,114,0,0,0,117,0,0,0,101,0,0,0,0,0,0,0,0,0,0,0,47,104,111,109,101,47,103,97,114,114,105,103,117,101,115,47,112,114,111,106,101,99,116,115,47,99,117,105,109,103,47,99,117,105,109,103,47,116,114,97,99,107,105,110,103,50,47,112,114,101,100,105,99,116,105,111,110,115,46,104,0,0,0,0,116,114,117,101,0,0,0,0,112,46,97,103,101,32,62,32,48,0,0,0,0,0,0,0,58,32,0,0,0,0,0,0,100,111,109,97,105,110,40,41,46,104,97,115,40,100,115,116,41,0,0,0,0,0,0,0,105,111,115,95,98,97,115,101,58,58,99,108,101,97,114,0,100,111,109,97,105,110,40,41,46,104,97,115,40,112,46,112,111,115,41,0,0,0,0,0,37,112,0,0,0,0,0,0,98,101,103,105,110,95,0,0,112,115,101,116,46,100,101,110,115,101,95,112,97,114,116,105,99,108,101,115,40,41,91,105,93,46,97,103,101,32,62,32,48,0,0,0,0,0,0,0,112,115,101,116,46,104,97,115,40,109,97,116,99,104,41,0,67,0,0,0,0,0,0,0,115,116,100,58,58,98,97,100,95,99,97,115,116,0,0,0,100,111,109,97,105,110,46,104,97,115,40,112,97,114,116,46,112,111,115,41,0,0,0,0,118,101,99,116,111,114,0,0,112,115,101,116,46,100,111,109,97,105,110,40,41,46,104,97,115,40,112,97,114,116,46,112,111,115,41,0,0,0,0,0,37,46,48,76,102,0,0,0,47,104,111,109,101,47,103,97,114,114,105,103,117,101,115,47,112,114,111,106,101,99,116,115,47,99,117,105,109,103,47,99,117,105,109,103,47,116,114,97,99,107,105,110,103,50,47,116,114,97,99,107,105,110,103,95,115,116,114,97,116,101,103,105,101,115,46,104,112,112,0,0,109,111,110,101,121,95,103,101,116,32,101,114,114,111,114,0,105,32,62,61,32,48,32,38,38,32,105,32,60,32,112,115,101,116,46,115,105,122,101,40,41,0,0,0,0,0,0,0,105,111,115,116,114,101,97,109,0,0,0,0,0,0,0,0,83,97,116,0,0,0,0,0,70,114,105,0,0,0,0,0,37,76,102,0,0,0,0,0,84,104,117,0,0,0,0,0,87,101,100,0,0,0,0,0,84,117,101,0,0,0,0,0,47,104,111,109,101,47,103,97,114,114,105,103,117,101,115,47,112,114,111,106,101,99,116,115,47,99,117,105,109,103,47,99,117,105,109,103,47,116,114,97,99,107,105,110,103,50,47,98,99,50,115,95,102,101,97,116,117,114,101,46,104,112,112,0,77,111,110,0,0,0,0,0,83,117,110,0,0,0,0,0,83,97,116,117,114,100,97,121,0,0,0,0,0,0,0,0,70,114,105,100,97,121,0,0,84,104,117,114,115,100,97,121,0,0,0,0,0,0,0,0,87,101,100,110,101,115,100,97,121,0,0,0,0,0,0,0,84,117,101,115,100,97,121,0,77,111,110,100,97,121,0,0,83,117,110,100,97,121,0,0,40,111,46,100,111,109,97,105,110,40,41,41,46,104,97,115,40,110,41,0,0,0,0,0,83,0,0,0,97,0,0,0,116,0,0,0,0,0,0,0,70,0,0,0,114,0,0,0,105,0,0,0,0,0,0,0,84,0,0,0,104,0,0,0,117,0,0,0,0,0,0,0,87,0,0,0,101,0,0,0,100,0,0,0,0,0,0,0,84,0,0,0,117,0,0,0,101,0,0,0,0,0,0,0,77,0,0,0,111,0,0,0,110,0,0,0,0,0,0,0,117,110,115,112,101,99,105,102,105,101,100,32,105,111,115,116,114,101,97,109,95,99,97,116,101,103,111,114,121,32,101,114,114,111,114,0,0,0,0,0,83,0,0,0,117,0,0,0,110,0,0,0,0,0,0,0,83,0,0,0,97,0,0,0,116,0,0,0,117,0,0,0,114,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,70,0,0,0,114,0,0,0,105,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,84,0,0,0,104,0,0,0,117,0,0,0,114,0,0,0,115,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,112,97,114,116,105,99,108,101,115,95,118,101,99,95,91,115,112,97,114,115,101,95,98,117,102,102,101,114,95,40,112,116,115,95,105,116,45,62,112,111,115,41,93,46,112,111,115,32,61,61,32,112,116,115,95,105,116,45,62,112,111,115,0,0,87,0,0,0,101,0,0,0,100,0,0,0,110,0,0,0,101,0,0,0,115,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,84,0,0,0,117,0,0,0,101,0,0,0,115,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,77,0,0,0,111,0,0,0,110,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,83,0,0,0,117,0,0,0,110,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,68,101,99,0,0,0,0,0,78,111,118,0,0,0,0,0,79,99,116,0,0,0,0,0,83,101,112,0,0,0,0,0,65,117,103,0,0,0,0,0,47,104,111,109,101,47,103,97,114,114,105,103,117,101,115,47,112,114,111,106,101,99,116,115,47,99,117,105,109,103,47,99,117,105,109,103,47,103,112,117,47,107,101,114,110,101,108,95,105,109,97,103,101,50,100,46,104,112,112,0,0,0,0,0,47,104,111,109,101,47,103,97,114,114,105,103,117,101,115,47,112,114,111,106,101,99,116,115,47,99,117,105,109,103,47,99,117,105,109,103,47,99,111,112,121,46,104,0,0,0,0,0,105,110,46,100,111,109,97,105,110,40,41,32,61,61,32,111,117,116,46,100,111,109,97,105,110,40,41,0,0,0,0,0,99,111,110,115,116,32,112,97,114,116,105,99,108,101,95,116,121,112,101,32,38,99,117,105,109,103,58,58,107,101,114,110,101,108,95,112,97,114,116,105,99,108,101,95,99,111,110,116,97,105,110,101,114,60,99,117,105,109,103,58,58,98,99,50,115,95,102,101,97,116,117,114,101,60,99,117,105,109,103,58,58,99,112,117,62,44,32,99,117,105,109,103,58,58,112,97,114,116,105,99,108,101,44,32,99,117,105,109,103,58,58,99,112,117,62,58,58,111,112,101,114,97,116,111,114,40,41,40,105,95,115,104,111,114,116,50,41,32,99,111,110,115,116,32,91,70,32,61,32,99,117,105,109,103,58,58,98,99,50,115,95,102,101,97,116,117,114,101,60,99,117,105,109,103,58,58,99,112,117,62,44,32,80,32,61,32,99,117,105,109,103,58,58,112,97,114,116,105,99,108,101,44,32,65,32,61,32,99,117,105,109,103,58,58,99,112,117,93,0,0,0,0,0,0,99,111,110,115,116,32,86,32,38,99,117,105,109,103,58,58,104,111,115,116,95,105,109,97,103,101,50,100,60,117,110,115,105,103,110,101,100,32,105,110,116,62,58,58,111,112,101,114,97,116,111,114,40,41,40,99,111,110,115,116,32,112,111,105,110,116,32,38,41,32,99,111,110,115,116,32,91,86,32,61,32,117,110,115,105,103,110,101,100,32,105,110,116,93,0,0,99,111,110,115,116,32,86,32,38,99,117,105,109,103,58,58,104,111,115,116,95,105,109,97,103,101,50,100,60,99,117,105,109,103,58,58,103,108,56,117,62,58,58,111,112,101,114,97,116,111,114,40,41,40,105,110,116,44,32,105,110,116,41,32,99,111,110,115,116,32,91,86,32,61,32,99,117,105,109,103,58,58,103,108,56,117,93,0,99,111,110,115,116,32,86,32,38,99,117,105,109,103,58,58,104,111,115,116,95,105,109,97,103,101,50,100,60,99,117,105,109,103,58,58,103,108,56,117,62,58,58,111,112,101,114,97,116,111,114,40,41,40,99,111,110,115,116,32,112,111,105,110,116,32,38,41,32,99,111,110,115,116,32,91,86,32,61,32,99,117,105,109,103,58,58,103,108,56,117,93,0,0,0,0,99,111,110,115,116,32,86,32,42,99,117,105,109,103,58,58,104,111,115,116,95,105,109,97,103,101,50,100,60,99,117,105,109,103,58,58,103,108,56,117,62,58,58,114,111,119,40,105,110,116,41,32,99,111,110,115,116,32,91,86,32,61,32,99,117,105,109,103,58,58,103,108,56,117,93,0,0,0,0,0,118,111,105,100,32,99,117,105,109,103,58,58,109,121,95,97,115,115,101,114,116,40,98,111,111,108,41,0,0,0,0,0,118,111,105,100,32,99,117,105,109,103,58,58,99,111,112,121,40,99,111,110,115,116,32,104,111,115,116,95,105,109,97,103,101,50,100,60,84,62,32,38,44,32,104,111,115,116,95,105,109,97,103,101,50,100,60,84,62,32,38,41,32,91,84,32,61,32,99,117,105,109,103,58,58,103,108,56,117,93,0,0,118,111,105,100,32,99,117,105,109,103,58,58,107,101,114,110,101,108,95,112,97,114,116,105,99,108,101,95,99,111,110,116,97,105,110,101,114,60,99,117,105,109,103,58,58,98,99,50,115,95,102,101,97,116,117,114,101,60,99,117,105,109,103,58,58,99,112,117,62,44,32,99,117,105,109,103,58,58,112,97,114,116,105,99,108,101,44,32,99,117,105,109,103,58,58,99,112,117,62,58,58,114,101,109,111,118,101,40,105,110,116,41,32,91,70,32,61,32,99,117,105,109,103,58,58,98,99,50,115,95,102,101,97,116,117,114,101,60,99,117,105,109,103,58,58,99,112,117,62,44,32,80,32,61,32,99,117,105,109,103,58,58,112,97,114,116,105,99,108,101,44,32,65,32,61,32,99,117,105,109,103,58,58,99,112,117,93,0,0,0,0,0,118,111,105,100,32,99,117,105,109,103,58,58,107,101,114,110,101,108,95,112,97,114,116,105,99,108,101,95,99,111,110,116,97,105,110,101,114,60,99,117,105,109,103,58,58,98,99,50,115,95,102,101,97,116,117,114,101,60,99,117,105,109,103,58,58,99,112,117,62,44,32,99,117,105,109,103,58,58,112,97,114,116,105,99,108,101,44,32,99,117,105,109,103,58,58,99,112,117,62,58,58,109,111,118,101,40,117,110,115,105,103,110,101,100,32,105,110,116,44,32,112,97,114,116,105,99,108,101,95,99,111,111,114,100,115,44,32,99,111,110,115,116,32,102,101,97,116,117,114,101,95,116,121,112,101,32,38,41,32,91,70,32,61,32,99,117,105,109,103,58,58,98,99,50,115,95,102,101,97,116,117,114,101,60,99,117,105,109,103,58,58,99,112,117,62,44,32,80,32,61,32,99,117,105,109,103,58,58,112,97,114,116,105,99,108,101,44,32,65,32,61,32,99,117,105,109,103,58,58,99,112,117,93,0,0,0,0,0,0,0,105,95,105,110,116,50,32,99,117,105,109,103,58,58,109,111,116,105,111,110,95,98,97,115,101,100,95,112,114,101,100,105,99,116,105,111,110,40,99,111,110,115,116,32,80,32,38,44,32,99,111,110,115,116,32,105,95,115,104,111,114,116,50,32,38,44,32,99,111,110,115,116,32,105,95,115,104,111,114,116,50,32,38,41,32,91,80,32,61,32,99,117,105,109,103,58,58,112,97,114,116,105,99,108,101,93,0,0,0,0,0,0,118,111,105,100,32,99,117,105,109,103,58,58,116,114,97,99,107,105,110,103,95,115,116,114,97,116,101,103,105,101,115,58,58,109,97,116,99,104,95,112,97,114,116,105,99,108,101,115,95,107,101,114,110,101,108,60,99,117,105,109,103,58,58,98,99,50,115,95,102,101,97,116,117,114,101,60,99,117,105,109,103,58,58,99,112,117,62,44,32,99,117,105,109,103,58,58,104,111,115,116,95,105,109,97,103,101,50,100,60,117,110,115,105,103,110,101,100,32,105,110,116,62,44,32,99,117,105,109,103,58,58,104,111,115,116,95,105,109,97,103,101,50,100,60,99,117,105,109,103,58,58,105,109,112,114,111,118,101,100,95,98,117,105,108,116,105,110,60,102,108,111,97,116,44,32,50,62,32,62,44,32,99,117,105,109,103,58,58,104,111,115,116,95,105,109,97,103,101,50,100,60,99,117,105,109,103,58,58,103,108,56,117,62,44,32,99,117,105,109,103,58,58,112,97,114,116,105,99,108,101,95,99,111,110,116,97,105,110,101,114,60,99,117,105,109,103,58,58,98,99,50,115,95,102,101,97,116,117,114,101,60,99,117,105,109,103,58,58,99,112,117,62,44,32,99,117,105,109,103,58,58,112,97,114,116,105,99,108,101,44,32,99,117,105,109,103,58,58,99,112,117,62,32,62,58,58,111,112,101,114,97,116,111,114,40,41,40,105,110,116,41,32,91,70,32,61,32,99,117,105,109,103,58,58,98,99,50,115,95,102,101,97,116,117,114,101,60,99,117,105,109,103,58,58,99,112,117,62,44,32,73,32,61,32,99,117,105,109,103,58,58,104,111,115,116,95,105,109,97,103,101,50,100,60,117,110,115,105,103,110,101,100,32,105,110,116,62,44,32,74,32,61,32,99,117,105,109,103,58,58,104,111,115,116,95,105,109,97,103,101,50,100,60,99,117,105,109,103,58,58,105,109,112,114,111,118,101,100,95,98,117,105,108,116,105,110,60,102,108,111,97,116,44,32,50,62,32,62,44,32,75,32,61,32,99,117,105,109,103,58,58,104,111,115,116,95,105,109,97,103,101,50,100,60,99,117,105,109,103,58,58,103,108,56,117,62,44,32,80,32,61,32,99,117,105,109,103,58,58,112,97,114,116,105,99,108,101,95,99,111,110,116,97,105,110,101,114,60,99,117,105,109,103,58,58,98,99,50,115,95,102,101,97,116,117,114,101,60,99,117,105,109,103,58,58,99,112,117,62,44,32,99,117,105,109,103,58,58,112,97,114,116,105,99,108,101,44,32,99,117,105,109,103,58,58,99,112,117,62,93,0,0,99,117,105,109,103,58,58,116,114,97,99,107,105,110,103,95,115,116,114,97,116,101,103,105,101,115,58,58,99,111,110,116,114,97,115,116,95,107,101,114,110,101,108,60,99,117,105,109,103,58,58,104,111,115,116,95,105,109,97,103,101,50,100,60,99,117,105,109,103,58,58,103,108,56,117,62,44,32,99,117,105,109,103,58,58,104,111,115,116,95,105,109,97,103,101,50,100,60,117,110,115,105,103,110,101,100,32,105,110,116,62,32,62,58,58,99,111,110,116,114,97,115,116,95,107,101,114,110,101,108,40,99,111,110,115,116,32,73,32,38,44,32,74,32,38,41,32,91,73,32,61,32,99,117,105,109,103,58,58,104,111,115,116,95,105,109,97,103,101,50,100,60,99,117,105,109,103,58,58,103,108,56,117,62,44,32,74,32,61,32,99,117,105,109,103,58,58,104,111,115,116,95,105,109,97,103,101,50,100,60,117,110,115,105,103,110,101,100,32,105,110,116,62,93,0,0,0,0,0,0,0,0,118,111,105,100,32,99,117,105,109,103,58,58,112,97,114,116,105,99,108,101,95,99,111,110,116,97,105,110,101,114,60,99,117,105,109,103,58,58,98,99,50,115,95,102,101,97,116,117,114,101,60,99,117,105,109,103,58,58,99,112,117,62,44,32,99,117,105,109,103,58,58,112,97,114,116,105,99,108,101,44,32,99,117,105,109,103,58,58,99,112,117,62,58,58,99,111,109,112,97,99,116,40,99,111,110,115,116,32,99,117,105,109,103,58,58,99,112,117,32,38,41,32,91,70,32,61,32,99,117,105,109,103,58,58,98,99,50,115,95,102,101,97,116,117,114,101,60,99,117,105,109,103,58,58,99,112,117,62,44,32,80,32,61,32,99,117,105,109,103,58,58,112,97,114,116,105,99,108,101,44,32,65,32,61,32,99,117,105,109,103,58,58,99,112,117,93,0,0,0,0,118,111,105,100,32,99,117,105,109,103,58,58,109,101,114,103,101,95,116,114,97,106,101,99,116,111,114,105,101,115,40,80,73,32,38,44,32,99,117,105,109,103,58,58,112,97,114,116,105,99,108,101,32,38,41,32,91,80,73,32,61,32,99,117,105,109,103,58,58,107,101,114,110,101,108,95,112,97,114,116,105,99,108,101,95,99,111,110,116,97,105,110,101,114,60,99,117,105,109,103,58,58,98,99,50,115,95,102,101,97,116,117,114,101,60,99,117,105,109,103,58,58,99,112,117,62,44,32,99,117,105,109,103,58,58,112,97,114,116,105,99,108,101,44,32,99,117,105,109,103,58,58,99,112,117,62,93,0,0,0,99,117,105,109,103,58,58,98,99,50,115,32,99,117,105,109,103,58,58,98,99,50,115,95,105,110,116,101,114,110,97,108,115,58,58,99,111,109,112,117,116,101,95,102,101,97,116,117,114,101,40,99,111,110,115,116,32,79,32,38,44,32,99,111,110,115,116,32,105,95,105,110,116,50,32,38,41,32,91,79,32,61,32,99,117,105,109,103,58,58,98,99,50,115,95,102,101,97,116,117,114,101,60,99,117,105,109,103,58,58,99,112,117,62,93,0,0,0,0,0,86,32,38,99,117,105,109,103,58,58,104,111,115,116,95,105,109,97,103,101,50,100,60,117,110,115,105,103,110,101,100,32,105,110,116,62,58,58,111,112,101,114,97,116,111,114,40,41,40,99,111,110,115,116,32,112,111,105,110,116,32,38,41,32,91,86,32,61,32,117,110,115,105,103,110,101,100,32,105,110,116,93,0,0,0,0,0,0,118,111,105,100,32,99,117,105,109,103,58,58,104,111,115,116,95,105,109,97,103,101,50,100,60,117,110,115,105,103,110,101,100,32,105,110,116,62,58,58,97,108,108,111,99,97,116,101,40,99,111,110,115,116,32,100,111,109,97,105,110,95,116,121,112,101,32,38,44,32,117,110,115,105,103,110,101,100,32,105,110,116,44,32,98,111,111,108,41,32,91,86,32,61,32,117,110,115,105,103,110,101,100,32,105,110,116,93,0,0,0,0,86,32,38,99,117,105,109,103,58,58,104,111,115,116,95,105,109,97,103,101,50,100,60,105,110,116,62,58,58,111,112,101,114,97,116,111,114,40,41,40,99,111,110,115,116,32,112,111,105,110,116,32,38,41,32,91,86,32,61,32,105,110,116,93,0,0,0,0,0,0,0,0,118,111,105,100,32,99,117,105,109,103,58,58,104,111,115,116,95,105,109,97,103,101,50,100,60,105,110,116,62,58,58,97,108,108,111,99,97,116,101,40,99,111,110,115,116,32,100,111,109,97,105,110,95,116,121,112,101,32,38,44,32,117,110,115,105,103,110,101,100,32,105,110,116,44,32,98,111,111,108,41,32,91,86,32,61,32,105,110,116,93,0,0,0,0,0,0,86,32,38,99,117,105,109,103,58,58,104,111,115,116,95,105,109,97,103,101,50,100,60,99,104,97,114,62,58,58,111,112,101,114,97,116,111,114,40,41,40,99,111,110,115,116,32,112,111,105,110,116,32,38,41,32,91,86,32,61,32,99,104,97,114,93,0,0,0,0,0,0,118,111,105,100,32,99,117,105,109,103,58,58,104,111,115,116,95,105,109,97,103,101,50,100,60,99,104,97,114,62,58,58,97,108,108,111,99,97,116,101,40,99,111,110,115,116,32,100,111,109,97,105,110,95,116,121,112,101,32,38,44,32,117,110,115,105,103,110,101,100,32,105,110,116,44,32,98,111,111,108,41,32,91,86,32,61,32,99,104,97,114,93,0,0,0,0,118,111,105,100,32,99,117,105,109,103,58,58,104,111,115,116,95,105,109,97,103,101,50,100,60,115,116,100,58,58,95,95,49,58,58,112,97,105,114,60,105,110,116,44,32,99,117,105,109,103,58,58,105,109,112,114,111,118,101,100,95,98,117,105,108,116,105,110,60,105,110,116,44,32,50,62,32,62,32,62,58,58,97,108,108,111,99,97,116,101,40,99,111,110,115,116,32,100,111,109,97,105,110,95,116,121,112,101,32,38,44,32,117,110,115,105,103,110,101,100,32,105,110,116,44,32,98,111,111,108,41,32,91,86,32,61,32,115,116,100,58,58,95,95,49,58,58,112,97,105,114,60,105,110,116,44,32,99,117,105,109,103,58,58,105,109,112,114,111,118,101,100,95,98,117,105,108,116,105,110,60,105,110,116,44,32,50,62,32,62,93,0,86,32,38,99,117,105,109,103,58,58,104,111,115,116,95,105,109,97,103,101,50,100,60,99,117,105,109,103,58,58,103,108,56,117,62,58,58,111,112,101,114,97,116,111,114,40,41,40,105,110,116,44,32,105,110,116,41,32,91,86,32,61,32,99,117,105,109,103,58,58,103,108,56,117,93,0,0,0,0,0,118,111,105,100,32,99,117,105,109,103,58,58,104,111,115,116,95,105,109,97,103,101,50,100,60,99,117,105,109,103,58,58,103,108,56,117,62,58,58,97,108,108,111,99,97,116,101,40,99,111,110,115,116,32,100,111,109,97,105,110,95,116,121,112,101,32,38,44,32,117,110,115,105,103,110,101,100,32,105,110,116,44,32,98,111,111,108,41,32,91,86,32,61,32,99,117,105,109,103,58,58,103,108,56,117,93,0,0,0,0,0,0,86,32,42,99,117,105,109,103,58,58,104,111,115,116,95,105,109,97,103,101,50,100,60,99,117,105,109,103,58,58,103,108,56,117,62,58,58,114,111,119,40,105,110,116,41,32,91,86,32,61,32,99,117,105,109,103,58,58,103,108,56,117,93,0,86,32,38,99,117,105,109,103,58,58,104,111,115,116,95,105,109,97,103,101,50,100,60,99,117,105,109,103,58,58,105,109,112,114,111,118,101,100,95,98,117,105,108,116,105,110,60,102,108,111,97,116,44,32,50,62,32,62,58,58,111,112,101,114,97,116,111,114,40,41,40,105,110,116,44,32,105,110,116,41,32,91,86,32,61,32,99,117,105,109,103,58,58,105,109,112,114,111,118,101,100,95,98,117,105,108,116,105,110,60,102,108,111,97,116,44,32,50,62,93,0,0,0,0,0,0,0,0,86,32,38,99,117,105,109,103,58,58,104,111,115,116,95,105,109,97,103,101,50,100,60,99,117,105,109,103,58,58,105,109,112,114,111,118,101,100,95,98,117,105,108,116,105,110,60,102,108,111,97,116,44,32,50,62,32,62,58,58,111,112,101,114,97,116,111,114,40,41,40,99,111,110,115,116,32,112,111,105,110,116,32,38,41,32,91,86,32,61,32,99,117,105,109,103,58,58,105,109,112,114,111,118,101,100,95,98,117,105,108,116,105,110,60,102,108,111,97,116,44,32,50,62,93,0,0,0,118,111,105,100,32,99,117,105,109,103,58,58,104,111,115,116,95,105,109,97,103,101,50,100,60,99,117,105,109,103,58,58,105,109,112,114,111,118,101,100,95,98,117,105,108,116,105,110,60,102,108,111,97,116,44,32,50,62,32,62,58,58,97,108,108,111,99,97,116,101,40,99,111,110,115,116,32,100,111,109,97,105,110,95,116,121,112,101,32,38,44,32,117,110,115,105,103,110,101,100,32,105,110,116,44,32,98,111,111,108,41,32,91,86,32,61,32,99,117,105,109,103,58,58,105,109,112,114,111,118,101,100,95,98,117,105,108,116,105,110,60,102,108,111,97,116,44,32,50,62,93,0,48,49,50,51,52,53,54,55,56,57,0,0,0,0,0,0,48,49,50,51,52,53,54,55,56,57,0,0,0,0,0,0,37,0,0,0,89,0,0,0,45,0,0,0,37,0,0,0,109,0,0,0,45,0,0,0,37,0,0,0,100,0,0,0,37,0,0,0,72,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,37,0,0,0,72,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,0,0,0,0,37,0,0,0,73,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,32,0,0,0,37,0,0,0,112,0,0,0,0,0,0,0,37,0,0,0,109,0,0,0,47,0,0,0,37,0,0,0,100,0,0,0,47,0,0,0,37,0,0,0,121,0,0,0,37,0,0,0,72,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,37,72,58,37,77,58,37,83,37,72,58,37,77,0,0,0,37,73,58,37,77,58,37,83,32,37,112,0,0,0,0,0,37,89,45,37,109,45,37,100,37,109,47,37,100,47,37,121,37,72,58,37,77,58,37,83,37,0,0,0,0,0,0,0,37,112,0,0,0,0,0,0,0,0,0,0,64,54,0,0,34,0,0,0,138,0,0,0,106,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,80,54,0,0,242,0,0,0,198,0,0,0,40,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,96,54,0,0,84,0,0,0,60,1,0,0,42,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,112,54,0,0,114,0,0,0,10,0,0,0,118,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,54,0,0,114,0,0,0,24,0,0,0,118,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,152,54,0,0,204,0,0,0,100,0,0,0,58,0,0,0,2,0,0,0,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,184,54,0,0,52,0,0,0,224,0,0,0,58,0,0,0,4,0,0,0,14,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,216,54,0,0,196,0,0,0,228,0,0,0,58,0,0,0,8,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,248,54,0,0,54,1,0,0,170,0,0,0,58,0,0,0,6,0,0,0,10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,152,55,0,0,48,1,0,0,20,0,0,0,58,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,184,55,0,0,194,0,0,0,130,0,0,0,58,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,216,55,0,0,42,0,0,0,132,0,0,0,58,0,0,0,130,0,0,0,4,0,0,0,30,0,0,0,6,0,0,0,20,0,0,0,54,0,0,0,2,0,0,0,248,255,255,255,216,55,0,0,26,0,0,0,10,0,0,0,36,0,0,0,16,0,0,0,2,0,0,0,34,0,0,0,136,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,56,0,0,38,1,0,0,16,1,0,0,58,0,0,0,24,0,0,0,16,0,0,0,58,0,0,0,26,0,0,0,18,0,0,0,2,0,0,0,4,0,0,0,248,255,255,255,0,56,0,0,76,0,0,0,112,0,0,0,126,0,0,0,132,0,0,0,70,0,0,0,48,0,0,0,60,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,40,56,0,0,94,0,0,0,232,0,0,0,58,0,0,0,52,0,0,0,44,0,0,0,8,0,0,0,40,0,0,0,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,56,56,0,0,72,0,0,0,78,0,0,0,58,0,0,0,46,0,0,0,92,0,0,0,14,0,0,0,56,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,72,56,0,0,42,1,0,0,6,0,0,0,58,0,0,0,24,0,0,0,30,0,0,0,66,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,104,56,0,0,54,0,0,0,0,1,0,0,58,0,0,0,36,0,0,0,14,0,0,0,16,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,136,56,0,0,2,1,0,0,134,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,144,56,0,0,32,0,0,0,168,0,0,0,42,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,160,56,0,0,8,0,0,0,210,0,0,0,58,0,0,0,8,0,0,0,6,0,0,0,12,0,0,0,4,0,0,0,10,0,0,0,4,0,0,0,2,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,192,56,0,0,118,0,0,0,22,0,0,0,58,0,0,0,20,0,0,0,24,0,0,0,32,0,0,0,22,0,0,0,22,0,0,0,8,0,0,0,6,0,0,0,18,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,224,56,0,0,44,0,0,0,28,0,0,0,58,0,0,0,46,0,0,0,44,0,0,0,36,0,0,0,38,0,0,0,28,0,0,0,42,0,0,0,34,0,0,0,52,0,0,0,50,0,0,0,48,0,0,0,24,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,57,0,0,66,0,0,0,4,0,0,0,58,0,0,0,76,0,0,0,68,0,0,0,62,0,0,0,64,0,0,0,56,0,0,0,66,0,0,0,60,0,0,0,74,0,0,0,72,0,0,0,70,0,0,0,40,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,32,57,0,0,86,0,0,0,112,0,0,0,58,0,0,0,16,0,0,0,12,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,48,57,0,0,30,0,0,0,212,0,0,0,58,0,0,0,22,0,0,0,14,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,64,57,0,0,20,1,0,0,156,0,0,0,58,0,0,0,14,0,0,0,4,0,0,0,20,0,0,0,20,0,0,0,68,0,0,0,4,0,0,0,82,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,96,57,0,0,218,0,0,0,74,0,0,0,58,0,0,0,2,0,0,0,8,0,0,0,8,0,0,0,114,0,0,0,104,0,0,0,18,0,0,0,102,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,57,0,0,218,0,0,0,158,0,0,0,58,0,0,0,16,0,0,0,6,0,0,0,2,0,0,0,134,0,0,0,50,0,0,0,12,0,0,0,22,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,160,57,0,0,218,0,0,0,182,0,0,0,58,0,0,0,10,0,0,0,12,0,0,0,24,0,0,0,38,0,0,0,80,0,0,0,6,0,0,0,72,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,192,57,0,0,218,0,0,0,38,0,0,0,58,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,208,57,0,0,70,0,0,0,188,0,0,0,58,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,224,57,0,0,218,0,0,0,96,0,0,0,58,0,0,0,20,0,0,0,2,0,0,0,4,0,0,0,10,0,0,0,16,0,0,0,28,0,0,0,32,0,0,0,6,0,0,0,8,0,0,0,8,0,0,0,10,0,0,0,10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,58,0,0,58,1,0,0,40,0,0,0,58,0,0,0,2,0,0,0,4,0,0,0,24,0,0,0,34,0,0,0,10,0,0,0,6,0,0,0,26,0,0,0,14,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,48,58,0,0,80,0,0,0,12,1,0,0,84,0,0,0,2,0,0,0,14,0,0,0,32,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,64,58,0,0,218,0,0,0,102,0,0,0,58,0,0,0,10,0,0,0,12,0,0,0,24,0,0,0,38,0,0,0,80,0,0,0,6,0,0,0,72,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,80,58,0,0,218,0,0,0,200,0,0,0,58,0,0,0,10,0,0,0,12,0,0,0,24,0,0,0,38,0,0,0,80,0,0,0,6,0,0,0,72,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,96,58,0,0,150,0,0,0,28,1,0,0,76,0,0,0,22,0,0,0,16,0,0,0,10,0,0,0,96,0,0,0,108,0,0,0,30,0,0,0,32,0,0,0,30,0,0,0,42,0,0,0,40,0,0,0,30,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,104,58,0,0,12,0,0,0,140,0,0,0,60,0,0,0,38,0,0,0,28,0,0,0,6,0,0,0,56,0,0,0,94,0,0,0,18,0,0,0,8,0,0,0,14,0,0,0,38,0,0,0,16,0,0,0,34,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,112,58,0,0,120,0,0,0,240,0,0,0,2,0,0,0,2,0,0,0,14,0,0,0,32,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,152,58,0,0,48,0,0,0,254,0,0,0,252,255,255,255,252,255,255,255,152,58,0,0,176,0,0,0,148,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,176,58,0,0,4,1,0,0,30,1,0,0,252,255,255,255,252,255,255,255,176,58,0,0,128,0,0,0,246,0,0,0,0,0,0,0,0,0,0,0,8,0,0,0,0,0,0,0,200,58,0,0,104,0,0,0,62,1,0,0,248,255,255,255,248,255,255,255,200,58,0,0,220,0,0,0,24,1,0,0,0,0,0,0,0,0,0,0,8,0,0,0,0,0,0,0,224,58,0,0,126,0,0,0,250,0,0,0,248,255,255,255,248,255,255,255,224,58,0,0,162,0,0,0,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,248,58,0,0,248,0,0,0,222,0,0,0,42,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,32,59,0,0,44,1,0,0,56,0,0,0,4,0,0,0,22,0,0,0,16,0,0,0,10,0,0,0,64,0,0,0,108,0,0,0,30,0,0,0,32,0,0,0,30,0,0,0,42,0,0,0,40,0,0,0,40,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,48,59,0,0,184,0,0,0,214,0,0,0,36,0,0,0,38,0,0,0,28,0,0,0,6,0,0,0,98,0,0,0,94,0,0,0,18,0,0,0,8,0,0,0,14,0,0,0,38,0,0,0,16,0,0,0,14,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,96,59,0,0,14,1,0,0,174,0,0,0,58,0,0,0,12,0,0,0,128,0,0,0,42,0,0,0,80,0,0,0,6,0,0,0,30,0,0,0,58,0,0,0,22,0,0,0,38,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,59,0,0,122,0,0,0,68,0,0,0,58,0,0,0,122,0,0,0,4,0,0,0,68,0,0,0,18,0,0,0,78,0,0,0,24,0,0,0,124,0,0,0,52,0,0,0,10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,160,59,0,0,18,1,0,0,136,0,0,0,58,0,0,0,18,0,0,0,66,0,0,0,48,0,0,0,44,0,0,0,12,0,0,0,54,0,0,0,100,0,0,0,58,0,0,0,34,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,192,59,0,0,90,0,0,0,208,0,0,0,58,0,0,0,110,0,0,0,116,0,0,0,28,0,0,0,74,0,0,0,26,0,0,0,20,0,0,0,86,0,0,0,72,0,0,0,70,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,248,59,0,0,106,0,0,0,82,0,0,0,64,0,0,0,22,0,0,0,16,0,0,0,10,0,0,0,96,0,0,0,108,0,0,0,30,0,0,0,78,0,0,0,88,0,0,0,12,0,0,0,40,0,0,0,30,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,60,0,0,18,0,0,0,8,1,0,0,62,0,0,0,38,0,0,0,28,0,0,0,6,0,0,0,56,0,0,0,94,0,0,0,18,0,0,0,62,0,0,0,28,0,0,0,4,0,0,0,16,0,0,0,34,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,24,60,0,0,230,0,0,0,110,0,0,0,108,0,0,0,92,0,0,0,26,0,0,0,54,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,40,60,0,0,22,1,0,0,190,0,0,0,60,0,0,0,92,0,0,0,22,0,0,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,56,60,0,0,186,0,0,0,2,0,0,0,154,0,0,0,92,0,0,0,6,0,0,0,140,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,72,60,0,0,252,0,0,0,238,0,0,0,6,1,0,0,92,0,0,0,36,0,0,0,90,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,88,60,0,0,164,0,0,0,142,0,0,0,226,0,0,0,92,0,0,0,20,0,0,0,74,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,104,60,0,0,34,1,0,0,52,1,0,0,62,0,0,0,92,0,0,0,18,0,0,0,120,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,120,60,0,0,50,1,0,0,14,0,0,0,166,0,0,0,92,0,0,0,28,0,0,0,138,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,144,60,0,0,46,1,0,0,244,0,0,0,76,0,0,0,180,0,0,0,8,0,0,0,2,0,0,0,6,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,83,116,57,116,121,112,101,95,105,110,102,111,0,0,0,0,83,116,57,101,120,99,101,112,116,105,111,110,0,0,0,0,83,116,57,98,97,100,95,97,108,108,111,99,0,0,0,0].concat([83,116,56,98,97,100,95,99,97,115,116,0,0,0,0,0,83,116,49,51,114,117,110,116,105,109,101,95,101,114,114,111,114,0,0,0,0,0,0,0,83,116,49,50,108,101,110,103,116,104,95,101,114,114,111,114,0,0,0,0,0,0,0,0,83,116,49,49,108,111,103,105,99,95,101,114,114,111,114,0,80,70,118,80,106,69,0,0,80,70,118,80,105,69,0,0,80,70,118,80,99,69,0,0,80,70,118,80,78,83,116,51,95,95,49,52,112,97,105,114,73,105,78,53,99,117,105,109,103,49,54,105,109,112,114,111,118,101,100,95,98,117,105,108,116,105,110,73,105,76,106,50,69,69,69,69,69,69,0,0,80,70,118,80,78,53,99,117,105,109,103,52,103,108,56,117,69,69,0,0,0,0,0,0,80,70,118,80,78,53,99,117,105,109,103,49,54,105,109,112,114,111,118,101,100,95,98,117,105,108,116,105,110,73,104,76,106,52,69,69,69,69,0,0,80,70,118,80,78,53,99,117,105,109,103,49,54,105,109,112,114,111,118,101,100,95,98,117,105,108,116,105,110,73,102,76,106,50,69,69,69,69,0,0,78,83,116,51,95,95,49,57,116,105,109,101,95,98,97,115,101,69,0,0,0,0,0,0,78,83,116,51,95,95,49,57,109,111,110,101,121,95,112,117,116,73,119,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0,0,0,78,83,116,51,95,95,49,57,109,111,110,101,121,95,112,117,116,73,99,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0,0,0,78,83,116,51,95,95,49,57,109,111,110,101,121,95,103,101,116,73,119,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0,0,0,78,83,116,51,95,95,49,57,109,111,110,101,121,95,103,101,116,73,99,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0,0,0,78,83,116,51,95,95,49,57,98,97,115,105,99,95,105,111,115,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,0,0,0,0,0,0,0,78,83,116,51,95,95,49,57,98,97,115,105,99,95,105,111,115,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,0,0,0,0,0,0,0,78,83,116,51,95,95,49,57,95,95,110,117,109,95,112,117,116,73,119,69,69,0,0,0,78,83,116,51,95,95,49,57,95,95,110,117,109,95,112,117,116,73,99,69,69,0,0,0,78,83,116,51,95,95,49,57,95,95,110,117,109,95,103,101,116,73,119,69,69,0,0,0,78,83,116,51,95,95,49,57,95,95,110,117,109,95,103,101,116,73,99,69,69,0,0,0,78,83,116,51,95,95,49,56,116,105,109,101,95,112,117,116,73,119,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0,0,0,0,78,83,116,51,95,95,49,56,116,105,109,101,95,112,117,116,73,99,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0,0,0,0,78,83,116,51,95,95,49,56,116,105,109,101,95,103,101,116,73,119,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0,0,0,0,78,83,116,51,95,95,49,56,116,105,109,101,95,103,101,116,73,99,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0,0,0,0,78,83,116,51,95,95,49,56,110,117,109,112,117,110,99,116,73,119,69,69,0,0,0,0,78,83,116,51,95,95,49,56,110,117,109,112,117,110,99,116,73,99,69,69,0,0,0,0,78,83,116,51,95,95,49,56,109,101,115,115,97,103,101,115,73,119,69,69,0,0,0,0,78,83,116,51,95,95,49,56,109,101,115,115,97,103,101,115,73,99,69,69,0,0,0,0,78,83,116,51,95,95,49,56,105,111,115,95,98,97,115,101,69,0,0,0,0,0,0,0,78,83,116,51,95,95,49,56,105,111,115,95,98,97,115,101,55,102,97,105,108,117,114,101,69,0,0,0,0,0,0,0,78,83,116,51,95,95,49,55,110,117,109,95,112,117,116,73,119,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0,0,0,0,0,78,83,116,51,95,95,49,55,110,117,109,95,112,117,116,73,99,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0,0,0,0,0,78,83,116,51,95,95,49,55,110,117,109,95,103,101,116,73,119,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0,0,0,0,0,78,83,116,51,95,95,49,55,110,117,109,95,103,101,116,73,99,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0,0,0,0,0,78,83,116,51,95,95,49,55,99,111,108,108,97,116,101,73,119,69,69,0,0,0,0,0,78,83,116,51,95,95,49,55,99,111,108,108,97,116,101,73,99,69,69,0,0,0,0,0,78,83,116,51,95,95,49,55,99,111,100,101,99,118,116,73,119,99,49,48,95,109,98,115,116,97,116,101,95,116,69,69,0,0,0,0,0,0,0,0,78,83,116,51,95,95,49,55,99,111,100,101,99,118,116,73,99,99,49,48,95,109,98,115,116,97,116,101,95,116,69,69,0,0,0,0,0,0,0,0,78,83,116,51,95,95,49,55,99,111,100,101,99,118,116,73,68,115,99,49,48,95,109,98,115,116,97,116,101,95,116,69,69,0,0,0,0,0,0,0,78,83,116,51,95,95,49,55,99,111,100,101,99,118,116,73,68,105,99,49,48,95,109,98,115,116,97,116,101,95,116,69,69,0,0,0,0,0,0,0,78,83,116,51,95,95,49,54,108,111,99,97,108,101,53,102,97,99,101,116,69,0,0,0,78,83,116,51,95,95,49,54,108,111,99,97,108,101,53,95,95,105,109,112,69,0,0,0,78,83,116,51,95,95,49,53,99,116,121,112,101,73,119,69,69,0,0,0,0,0,0,0,78,83,116,51,95,95,49,53,99,116,121,112,101,73,99,69,69,0,0,0,0,0,0,0,78,83,116,51,95,95,49,50,48,95,95,116,105,109,101,95,103,101,116,95,99,95,115,116,111,114,97,103,101,73,119,69,69,0,0,0,0,0,0,0,78,83,116,51,95,95,49,50,48,95,95,116,105,109,101,95,103,101,116,95,99,95,115,116,111,114,97,103,101,73,99,69,69,0,0,0,0,0,0,0,78,83,116,51,95,95,49,49,57,95,95,105,111,115,116,114,101,97,109,95,99,97,116,101,103,111,114,121,69,0,0,0,78,83,116,51,95,95,49,49,55,95,95,119,105,100,101,110,95,102,114,111,109,95,117,116,102,56,73,76,106,51,50,69,69,69,0,0,0,0,0,0,78,83,116,51,95,95,49,49,54,95,95,110,97,114,114,111,119,95,116,111,95,117,116,102,56,73,76,106,51,50,69,69,69,0,0,0,0,0,0,0,78,83,116,51,95,95,49,49,53,98,97,115,105,99,95,115,116,114,101,97,109,98,117,102,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,0,0,0,0,0,0,0,0,78,83,116,51,95,95,49,49,53,98,97,115,105,99,95,115,116,114,101,97,109,98,117,102,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,0,0,0,0,0,0,0,0,78,83,116,51,95,95,49,49,52,101,114,114,111,114,95,99,97,116,101,103,111,114,121,69,0,0,0,0,0,0,0,0,78,83,116,51,95,95,49,49,52,95,95,115,104,97,114,101,100,95,99,111,117,110,116,69,0,0,0,0,0,0,0,0,78,83,116,51,95,95,49,49,52,95,95,110,117,109,95,112,117,116,95,98,97,115,101,69,0,0,0,0,0,0,0,0,78,83,116,51,95,95,49,49,52,95,95,110,117,109,95,103,101,116,95,98,97,115,101,69,0,0,0,0,0,0,0,0,78,83,116,51,95,95,49,49,51,109,101,115,115,97,103,101,115,95,98,97,115,101,69,0,78,83,116,51,95,95,49,49,51,98,97,115,105,99,95,111,115,116,114,101,97,109,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,0,0,78,83,116,51,95,95,49,49,51,98,97,115,105,99,95,111,115,116,114,101,97,109,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,0,0,78,83,116,51,95,95,49,49,51,98,97,115,105,99,95,105,115,116,114,101,97,109,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,0,0,78,83,116,51,95,95,49,49,51,98,97,115,105,99,95,105,115,116,114,101,97,109,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,0,0,78,83,116,51,95,95,49,49,50,115,121,115,116,101,109,95,101,114,114,111,114,69,0,0,78,83,116,51,95,95,49,49,50,99,111,100,101,99,118,116,95,98,97,115,101,69,0,0,78,83,116,51,95,95,49,49,50,95,95,100,111,95,109,101,115,115,97,103,101,69,0,0,78,83,116,51,95,95,49,49,49,95,95,115,116,100,111,117,116,98,117,102,73,119,69,69,0,0,0,0,0,0,0,0,78,83,116,51,95,95,49,49,49,95,95,115,116,100,111,117,116,98,117,102,73,99,69,69,0,0,0,0,0,0,0,0,78,83,116,51,95,95,49,49,49,95,95,109,111,110,101,121,95,112,117,116,73,119,69,69,0,0,0,0,0,0,0,0,78,83,116,51,95,95,49,49,49,95,95,109,111,110,101,121,95,112,117,116,73,99,69,69,0,0,0,0,0,0,0,0,78,83,116,51,95,95,49,49,49,95,95,109,111,110,101,121,95,103,101,116,73,119,69,69,0,0,0,0,0,0,0,0,78,83,116,51,95,95,49,49,49,95,95,109,111,110,101,121,95,103,101,116,73,99,69,69,0,0,0,0,0,0,0,0,78,83,116,51,95,95,49,49,48,109,111,110,101,121,112,117,110,99,116,73,119,76,98,49,69,69,69,0,0,0,0,0,78,83,116,51,95,95,49,49,48,109,111,110,101,121,112,117,110,99,116,73,119,76,98,48,69,69,69,0,0,0,0,0,78,83,116,51,95,95,49,49,48,109,111,110,101,121,112,117,110,99,116,73,99,76,98,49,69,69,69,0,0,0,0,0,78,83,116,51,95,95,49,49,48,109,111,110,101,121,112,117,110,99,116,73,99,76,98,48,69,69,69,0,0,0,0,0,78,83,116,51,95,95,49,49,48,109,111,110,101,121,95,98,97,115,101,69,0,0,0,0,78,83,116,51,95,95,49,49,48,99,116,121,112,101,95,98,97,115,101,69,0,0,0,0,78,83,116,51,95,95,49,49,48,95,95,116,105,109,101,95,112,117,116,69,0,0,0,0,78,83,116,51,95,95,49,49,48,95,95,115,116,100,105,110,98,117,102,73,119,69,69,0,78,83,116,51,95,95,49,49,48,95,95,115,116,100,105,110,98,117,102,73,99,69,69,0,78,53,98,111,111,115,116,54,100,101,116,97,105,108,49,56,115,112,95,99,111,117,110,116,101,100,95,105,109,112,108,95,112,100,73,80,106,80,70,118,83,50,95,69,69,69,0,0,78,53,98,111,111,115,116,54,100,101,116,97,105,108,49,56,115,112,95,99,111,117,110,116,101,100,95,105,109,112,108,95,112,100,73,80,105,80,70,118,83,50,95,69,69,69,0,0,78,53,98,111,111,115,116,54,100,101,116,97,105,108,49,56,115,112,95,99,111,117,110,116,101,100,95,105,109,112,108,95,112,100,73,80,99,80,70,118,83,50,95,69,69,69,0,0,78,53,98,111,111,115,116,54,100,101,116,97,105,108,49,56,115,112,95,99,111,117,110,116,101,100,95,105,109,112,108,95,112,100,73,80,78,83,116,51,95,95,49,52,112,97,105,114,73,105,78,53,99,117,105,109,103,49,54,105,109,112,114,111,118,101,100,95,98,117,105,108,116,105,110,73,105,76,106,50,69,69,69,69,69,80,70,118,83,56,95,69,69,69,0,0,78,53,98,111,111,115,116,54,100,101,116,97,105,108,49,56,115,112,95,99,111,117,110,116,101,100,95,105,109,112,108,95,112,100,73,80,78,53,99,117,105,109,103,52,103,108,56,117,69,80,70,118,83,52,95,69,69,69,0,0,0,0,0,0,78,53,98,111,111,115,116,54,100,101,116,97,105,108,49,56,115,112,95,99,111,117,110,116,101,100,95,105,109,112,108,95,112,100,73,80,78,53,99,117,105,109,103,49,54,105,109,112,114,111,118,101,100,95,98,117,105,108,116,105,110,73,104,76,106,52,69,69,69,80,70,118,83,53,95,69,69,69,0,0,78,53,98,111,111,115,116,54,100,101,116,97,105,108,49,56,115,112,95,99,111,117,110,116,101,100,95,105,109,112,108,95,112,100,73,80,78,53,99,117,105,109,103,49,54,105,109,112,114,111,118,101,100,95,98,117,105,108,116,105,110,73,102,76,106,50,69,69,69,80,70,118,83,53,95,69,69,69,0,0,78,53,98,111,111,115,116,54,100,101,116,97,105,108,49,53,115,112,95,99,111,117,110,116,101,100,95,98,97,115,101,69,0,0,0,0,0,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,50,49,95,95,118,109,105,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,50,48,95,95,115,105,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,49,55,95,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0,0,0,0,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,49,54,95,95,115,104,105,109,95,116,121,112,101,95,105,110,102,111,69,0,0,0,0,0,0,0,0,0,0,0,0,216,39,0,0,0,0,0,0,232,39,0,0,0,0,0,0,248,39,0,0,56,54,0,0,0,0,0,0,0,0,0,0,8,40,0,0,56,54,0,0,0,0,0,0,0,0,0,0,24,40,0,0,56,54,0,0,0,0,0,0,0,0,0,0,48,40,0,0,128,54,0,0,0,0,0,0,0,0,0,0,72,40,0,0,56,54,0,0,0,0,0,0,0,0,0,0,16,41,0,0,176,39,0,0,40,41,0,0,0,0,0,0,2,0,0,0,192,57,0,0,2,0,0,0,64,59,0,0,0,0,0,0,176,39,0,0,112,41,0,0,0,0,0,0,2,0,0,0,192,57,0,0,2,0,0,0,72,59,0,0,0,0,0,0,176,39,0,0,184,41,0,0,0,0,0,0,2,0,0,0,192,57,0,0,2,0,0,0,80,59,0,0,0,0,0,0,176,39,0,0,0,42,0,0,0,0,0,0,2,0,0,0,192,57,0,0,2,0,0,0,88,59,0,0,0,0,0,0,0,0,0,0,72,42,0,0,136,56,0,0,0,0,0,0,0,0,0,0,120,42,0,0,136,56,0,0,0,0,0,0,176,39,0,0,168,42,0,0,0,0,0,0,1,0,0,0,128,58,0,0,0,0,0,0,176,39,0,0,192,42,0,0,0,0,0,0,1,0,0,0,128,58,0,0,0,0,0,0,176,39,0,0,216,42,0,0,0,0,0,0,1,0,0,0,136,58,0,0,0,0,0,0,176,39,0,0,240,42,0,0,0,0,0,0,1,0,0,0,136,58,0,0,0,0,0,0,176,39,0,0,8,43,0,0,0,0,0,0,2,0,0,0,192,57,0,0,2,0,0,0,240,59,0,0,0,8,0,0,176,39,0,0,80,43,0,0,0,0,0,0,2,0,0,0,192,57,0,0,2,0,0,0,240,59,0,0,0,8,0,0,176,39,0,0,152,43,0,0,0,0,0,0,3,0,0,0,192,57,0,0,2,0,0,0,144,54,0,0,2,0,0,0,32,58,0,0,0,8,0,0,176,39,0,0,224,43,0,0,0,0,0,0,3,0,0,0,192,57,0,0,2,0,0,0,144,54,0,0,2,0,0,0,40,58,0,0,0,8,0,0,0,0,0,0,40,44,0,0,192,57,0,0,0,0,0,0,0,0,0,0,64,44,0,0,192,57,0,0,0,0,0,0,176,39,0,0,88,44,0,0,0,0,0,0,2,0,0,0,192,57,0,0,2,0,0,0,144,58,0,0,2,0,0,0,176,39,0,0,112,44,0,0,0,0,0,0,2,0,0,0,192,57,0,0,2,0,0,0,144,58,0,0,2,0,0,0,0,0,0,0,136,44,0,0,0,0,0,0,160,44,0,0,248,58,0,0,0,0,0,0,176,39,0,0,192,44,0,0,0,0,0,0,2,0,0,0,192,57,0,0,2,0,0,0,56,55,0,0,0,0,0,0,176,39,0,0,8,45,0,0,0,0,0,0,2,0,0,0,192,57,0,0,2,0,0,0,80,55,0,0,0,0,0,0,176,39,0,0,80,45,0,0,0,0,0,0,2,0,0,0,192,57,0,0,2,0,0,0,104,55,0,0,0,0,0,0,176,39,0,0,152,45,0,0,0,0,0,0,2,0,0,0,192,57,0,0,2,0,0,0,128,55,0,0,0,0,0,0,0,0,0,0,224,45,0,0,192,57,0,0,0,0,0,0,0,0,0,0,248,45,0,0,192,57,0,0,0,0,0,0,176,39,0,0,16,46,0,0,0,0,0,0,2,0,0,0,192,57,0,0,2,0,0,0,8,59,0,0,2,0,0,0,176,39,0,0,56,46,0,0,0,0,0,0,2,0,0,0,192,57,0,0,2,0,0,0,8,59,0,0,2,0,0,0,176,39,0,0,96,46,0,0,0,0,0,0,2,0,0,0,192,57,0,0,2,0,0,0,8,59,0,0,2,0,0,0,176,39,0,0,136,46,0,0,0,0,0,0,2,0,0,0,192,57,0,0,2,0,0,0,8,59,0,0,2,0,0,0,0,0,0,0,176,46,0,0,120,58,0,0,0,0,0,0,0,0,0,0,200,46,0,0,192,57,0,0,0,0,0,0,176,39,0,0,224,46,0,0,0,0,0,0,2,0,0,0,192,57,0,0,2,0,0,0,232,59,0,0,2,0,0,0,176,39,0,0,248,46,0,0,0,0,0,0,2,0,0,0,192,57,0,0,2,0,0,0,232,59,0,0,2,0,0,0,0,0,0,0,16,47,0,0,0,0,0,0,56,47,0,0,0,0,0,0,96,47,0,0,16,59,0,0,0,0,0,0,0,0,0,0,128,47,0,0,160,57,0,0,0,0,0,0,0,0,0,0,168,47,0,0,160,57,0,0,0,0,0,0,0,0,0,0,208,47,0,0,0,0,0,0,8,48,0,0,0,0,0,0,64,48,0,0,0,0,0,0,96,48,0,0,0,0,0,0,128,48,0,0,0,0,0,0,160,48,0,0,0,0,0,0,192,48,0,0,176,39,0,0,216,48,0,0,0,0,0,0,1,0,0,0,24,55,0,0,3,244,255,255,176,39,0,0,8,49,0,0,0,0,0,0,1,0,0,0,40,55,0,0,3,244,255,255,176,39,0,0,56,49,0,0,0,0,0,0,1,0,0,0,24,55,0,0,3,244,255,255,176,39,0,0,104,49,0,0,0,0,0,0,1,0,0,0,40,55,0,0,3,244,255,255,0,0,0,0,152,49,0,0,96,54,0,0,0,0,0,0,0,0,0,0,176,49,0,0,0,0,0,0,200,49,0,0,112,58,0,0,0,0,0,0,0,0,0,0,224,49,0,0,96,58,0,0,0,0,0,0,0,0,0,0,0,50,0,0,104,58,0,0,0,0,0,0,0,0,0,0,32,50,0,0,0,0,0,0,64,50,0,0,0,0,0,0,96,50,0,0,0,0,0,0,128,50,0,0,176,39,0,0,160,50,0,0,0,0,0,0,2,0,0,0,192,57,0,0,2,0,0,0,224,59,0,0,2,0,0,0,176,39,0,0,192,50,0,0,0,0,0,0,2,0,0,0,192,57,0,0,2,0,0,0,224,59,0,0,2,0,0,0,176,39,0,0,224,50,0,0,0,0,0,0,2,0,0,0,192,57,0,0,2,0,0,0,224,59,0,0,2,0,0,0,176,39,0,0,0,51,0,0,0,0,0,0,2,0,0,0,192,57,0,0,2,0,0,0,224,59,0,0,2,0,0,0,0,0,0,0,32,51,0,0,0,0,0,0,56,51,0,0,0,0,0,0,80,51,0,0,0,0,0,0,104,51,0,0,96,58,0,0,0,0,0,0,0,0,0,0,128,51,0,0,104,58,0,0,0,0,0,0,0,0,0,0,152,51,0,0,136,60,0,0,0,0,0,0,0,0,0,0,200,51,0,0,136,60,0,0,0,0,0,0,0,0,0,0,248,51,0,0,136,60,0,0,0,0,0,0,0,0,0,0,40,52,0,0,136,60,0,0,0,0,0,0,0,0,0,0,136,52,0,0,136,60,0,0,0,0,0,0,0,0,0,0,200,52,0,0,136,60,0,0,0,0,0,0,0,0,0,0,24,53,0,0,136,60,0,0,0,0,0,0,0,0,0,0,104,53,0,0,0,0,0,0,144,53,0,0,176,60,0,0,0,0,0,0,0,0,0,0,184,53,0,0,176,60,0,0,0,0,0,0,0,0,0,0,224,53,0,0,192,60,0,0,0,0,0,0,0,0,0,0,8,54,0,0,48,54,0,0,0,0,0,0,255,255,255,255,0,0,0,0,255,255,255,255,0,0,0,0,48,49,50,51,52,53,54,55,56,57,97,98,99,100,101,102,65,66,67,68,69,70,120,88,43,45,112,80,105,73,110,78,0,0,0,0,0,0,0,0,6,0,0,0,3,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,5,0,0,0,2,0,0,0,5,0,0,0,2,0,0,0,7,0,0,0,4,0,0,0,7,0,0,0,4,0,0,0,1,0,0,0,6,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,255,255,255,255,1,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,255,255,255,255,0,0,0,0,1,0,0,0,0,0,0,0,255,255,255,255,255,255,255,255,0,0,0,0,255,255,255,255,1,0,0,0,255,255,255,255,253,255,255,255,0,0,0,0,253,255,255,255,1,0,0,0,254,255,255,255,2,0,0,0,255,255,255,255,3,0,0,0,0,0,0,0,3,0,0,0,1,0,0,0,3,0,0,0,2,0,0,0,2,0,0,0,3,0,0,0,1,0,0,0,3,0,0,0,0,0,0,0,3,0,0,0,255,255,255,255,2,0,0,0,254,255,255,255,1,0,0,0,253,255,255,255,0,0,0,0,253,255,255,255,255,255,255,255,253,255,255,255,254,255,255,255,254,255,255,255,253,255,255,255,255,255,255,255])
, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE)
var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);
assert(tempDoublePtr % 8 == 0);
function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much
  HEAP8[tempDoublePtr] = HEAP8[ptr];
  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];
  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];
  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];
}
function copyTempDouble(ptr) {
  HEAP8[tempDoublePtr] = HEAP8[ptr];
  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];
  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];
  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];
  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];
  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];
  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];
  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];
}
  function ___gxx_personality_v0() {
    }
  Module["_memcpy"] = _memcpy;var _llvm_memcpy_p0i8_p0i8_i32=_memcpy;
  function ___assert_fail(condition, file, line) {
      ABORT = true;
      throw 'Assertion failed: ' + Pointer_stringify(condition) + ' at ' + new Error().stack;
    }
  function __ZSt18uncaught_exceptionv() { // std::uncaught_exception()
      return !!__ZSt18uncaught_exceptionv.uncaught_exception;
    }function ___cxa_begin_catch(ptr) {
      __ZSt18uncaught_exceptionv.uncaught_exception--;
      return ptr;
    }
  function __exit(status) {
      // void _exit(int status);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/exit.html
      Module['exit'](status);
    }function _exit(status) {
      __exit(status);
    }function __ZSt9terminatev() {
      _exit(-1234);
    }
  Module["_memset"] = _memset;var _llvm_memset_p0i8_i32=_memset;
  function _llvm_eh_exception() {
      return HEAP32[((_llvm_eh_exception.buf)>>2)];
    }
  function ___cxa_free_exception(ptr) {
      try {
        return _free(ptr);
      } catch(e) { // XXX FIXME
      }
    }function ___cxa_end_catch() {
      if (___cxa_end_catch.rethrown) {
        ___cxa_end_catch.rethrown = false;
        return;
      }
      // Clear state flag.
      asm['setThrew'](0);
      // Clear type.
      HEAP32[(((_llvm_eh_exception.buf)+(4))>>2)]=0
      // Call destructor if one is registered then clear it.
      var ptr = HEAP32[((_llvm_eh_exception.buf)>>2)];
      var destructor = HEAP32[(((_llvm_eh_exception.buf)+(8))>>2)];
      if (destructor) {
        Runtime.dynCall('vi', destructor, [ptr]);
        HEAP32[(((_llvm_eh_exception.buf)+(8))>>2)]=0
      }
      // Free ptr if it isn't null.
      if (ptr) {
        ___cxa_free_exception(ptr);
        HEAP32[((_llvm_eh_exception.buf)>>2)]=0
      }
    }function ___cxa_rethrow() {
      ___cxa_end_catch.rethrown = true;
      throw HEAP32[((_llvm_eh_exception.buf)>>2)] + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";;
    }
  var _sqrtf=Math.sqrt;
  function _llvm_lifetime_start() {}
  function _llvm_lifetime_end() {}
  var _llvm_memset_p0i8_i64=_memset;
  function _pthread_mutex_lock() {}
  function _pthread_mutex_unlock() {}
  function ___cxa_guard_acquire(variable) {
      if (!HEAP8[(variable)]) { // ignore SAFE_HEAP stuff because llvm mixes i64 and i8 here
        HEAP8[(variable)]=1;
        return 1;
      }
      return 0;
    }
  function ___cxa_guard_release() {}
  function _pthread_cond_broadcast() {
      return 0;
    }
  function _pthread_cond_wait() {
      return 0;
    }
  function _atexit(func, arg) {
      __ATEXIT__.unshift({ func: func, arg: arg });
    }var ___cxa_atexit=_atexit;
  function ___cxa_allocate_exception(size) {
      return _malloc(size);
    }
  function ___cxa_is_number_type(type) {
      var isNumber = false;
      try { if (type == __ZTIi) isNumber = true } catch(e){}
      try { if (type == __ZTIj) isNumber = true } catch(e){}
      try { if (type == __ZTIl) isNumber = true } catch(e){}
      try { if (type == __ZTIm) isNumber = true } catch(e){}
      try { if (type == __ZTIx) isNumber = true } catch(e){}
      try { if (type == __ZTIy) isNumber = true } catch(e){}
      try { if (type == __ZTIf) isNumber = true } catch(e){}
      try { if (type == __ZTId) isNumber = true } catch(e){}
      try { if (type == __ZTIe) isNumber = true } catch(e){}
      try { if (type == __ZTIc) isNumber = true } catch(e){}
      try { if (type == __ZTIa) isNumber = true } catch(e){}
      try { if (type == __ZTIh) isNumber = true } catch(e){}
      try { if (type == __ZTIs) isNumber = true } catch(e){}
      try { if (type == __ZTIt) isNumber = true } catch(e){}
      return isNumber;
    }function ___cxa_does_inherit(definiteType, possibilityType, possibility) {
      if (possibility == 0) return false;
      if (possibilityType == 0 || possibilityType == definiteType)
        return true;
      var possibility_type_info;
      if (___cxa_is_number_type(possibilityType)) {
        possibility_type_info = possibilityType;
      } else {
        var possibility_type_infoAddr = HEAP32[((possibilityType)>>2)] - 8;
        possibility_type_info = HEAP32[((possibility_type_infoAddr)>>2)];
      }
      switch (possibility_type_info) {
      case 0: // possibility is a pointer
        // See if definite type is a pointer
        var definite_type_infoAddr = HEAP32[((definiteType)>>2)] - 8;
        var definite_type_info = HEAP32[((definite_type_infoAddr)>>2)];
        if (definite_type_info == 0) {
          // Also a pointer; compare base types of pointers
          var defPointerBaseAddr = definiteType+8;
          var defPointerBaseType = HEAP32[((defPointerBaseAddr)>>2)];
          var possPointerBaseAddr = possibilityType+8;
          var possPointerBaseType = HEAP32[((possPointerBaseAddr)>>2)];
          return ___cxa_does_inherit(defPointerBaseType, possPointerBaseType, possibility);
        } else
          return false; // one pointer and one non-pointer
      case 1: // class with no base class
        return false;
      case 2: // class with base class
        var parentTypeAddr = possibilityType + 8;
        var parentType = HEAP32[((parentTypeAddr)>>2)];
        return ___cxa_does_inherit(definiteType, parentType, possibility);
      default:
        return false; // some unencountered type
      }
    }
  function ___resumeException(ptr) {
      if (HEAP32[((_llvm_eh_exception.buf)>>2)] == 0) HEAP32[((_llvm_eh_exception.buf)>>2)]=ptr;
      throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";;
    }function ___cxa_find_matching_catch(thrown, throwntype) {
      if (thrown == -1) thrown = HEAP32[((_llvm_eh_exception.buf)>>2)];
      if (throwntype == -1) throwntype = HEAP32[(((_llvm_eh_exception.buf)+(4))>>2)];
      var typeArray = Array.prototype.slice.call(arguments, 2);
      // If throwntype is a pointer, this means a pointer has been
      // thrown. When a pointer is thrown, actually what's thrown
      // is a pointer to the pointer. We'll dereference it.
      if (throwntype != 0 && !___cxa_is_number_type(throwntype)) {
        var throwntypeInfoAddr= HEAP32[((throwntype)>>2)] - 8;
        var throwntypeInfo= HEAP32[((throwntypeInfoAddr)>>2)];
        if (throwntypeInfo == 0)
          thrown = HEAP32[((thrown)>>2)];
      }
      // The different catch blocks are denoted by different types.
      // Due to inheritance, those types may not precisely match the
      // type of the thrown object. Find one which matches, and
      // return the type of the catch block which should be called.
      for (var i = 0; i < typeArray.length; i++) {
        if (___cxa_does_inherit(typeArray[i], throwntype, thrown))
          return ((asm["setTempRet0"](typeArray[i]),thrown)|0);
      }
      // Shouldn't happen unless we have bogus data in typeArray
      // or encounter a type for which emscripten doesn't have suitable
      // typeinfo defined. Best-efforts match just in case.
      return ((asm["setTempRet0"](throwntype),thrown)|0);
    }function ___cxa_throw(ptr, type, destructor) {
      if (!___cxa_throw.initialized) {
        try {
          HEAP32[((__ZTVN10__cxxabiv119__pointer_type_infoE)>>2)]=0; // Workaround for libcxxabi integration bug
        } catch(e){}
        try {
          HEAP32[((__ZTVN10__cxxabiv117__class_type_infoE)>>2)]=1; // Workaround for libcxxabi integration bug
        } catch(e){}
        try {
          HEAP32[((__ZTVN10__cxxabiv120__si_class_type_infoE)>>2)]=2; // Workaround for libcxxabi integration bug
        } catch(e){}
        ___cxa_throw.initialized = true;
      }
      HEAP32[((_llvm_eh_exception.buf)>>2)]=ptr
      HEAP32[(((_llvm_eh_exception.buf)+(4))>>2)]=type
      HEAP32[(((_llvm_eh_exception.buf)+(8))>>2)]=destructor
      if (!("uncaught_exception" in __ZSt18uncaught_exceptionv)) {
        __ZSt18uncaught_exceptionv.uncaught_exception = 1;
      } else {
        __ZSt18uncaught_exceptionv.uncaught_exception++;
      }
      throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";;
    }
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:35,EIDRM:36,ECHRNG:37,EL2NSYNC:38,EL3HLT:39,EL3RST:40,ELNRNG:41,EUNATCH:42,ENOCSI:43,EL2HLT:44,EDEADLK:45,ENOLCK:46,EBADE:50,EBADR:51,EXFULL:52,ENOANO:53,EBADRQC:54,EBADSLT:55,EDEADLOCK:56,EBFONT:57,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:74,ELBIN:75,EDOTDOT:76,EBADMSG:77,EFTYPE:79,ENOTUNIQ:80,EBADFD:81,EREMCHG:82,ELIBACC:83,ELIBBAD:84,ELIBSCN:85,ELIBMAX:86,ELIBEXEC:87,ENOSYS:88,ENMFILE:89,ENOTEMPTY:90,ENAMETOOLONG:91,ELOOP:92,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:106,EPROTOTYPE:107,ENOTSOCK:108,ENOPROTOOPT:109,ESHUTDOWN:110,ECONNREFUSED:111,EADDRINUSE:112,ECONNABORTED:113,ENETUNREACH:114,ENETDOWN:115,ETIMEDOUT:116,EHOSTDOWN:117,EHOSTUNREACH:118,EINPROGRESS:119,EALREADY:120,EDESTADDRREQ:121,EMSGSIZE:122,EPROTONOSUPPORT:123,ESOCKTNOSUPPORT:124,EADDRNOTAVAIL:125,ENETRESET:126,EISCONN:127,ENOTCONN:128,ETOOMANYREFS:129,EPROCLIM:130,EUSERS:131,EDQUOT:132,ESTALE:133,ENOTSUP:134,ENOMEDIUM:135,ENOSHARE:136,ECASECLASH:137,EILSEQ:138,EOVERFLOW:139,ECANCELED:140,ENOTRECOVERABLE:141,EOWNERDEAD:142,ESTRPIPE:143};
  var ___errno_state=0;function ___setErrNo(value) {
      // For convenient setting and returning of errno.
      HEAP32[((___errno_state)>>2)]=value
      return value;
    }
  var _stdin=allocate(1, "i32*", ALLOC_STATIC);
  var _stdout=allocate(1, "i32*", ALLOC_STATIC);
  var _stderr=allocate(1, "i32*", ALLOC_STATIC);
  var __impure_ptr=allocate(1, "i32*", ALLOC_STATIC);var FS={currentPath:"/",nextInode:2,streams:[null],ignorePermissions:true,createFileHandle:function (stream, fd) {
        if (typeof stream === 'undefined') {
          stream = null;
        }
        if (!fd) {
          if (stream && stream.socket) {
            for (var i = 1; i < 64; i++) {
              if (!FS.streams[i]) {
                fd = i;
                break;
              }
            }
            assert(fd, 'ran out of low fds for sockets');
          } else {
            fd = Math.max(FS.streams.length, 64);
            for (var i = FS.streams.length; i < fd; i++) {
              FS.streams[i] = null; // Keep dense
            }
          }
        }
        // Close WebSocket first if we are about to replace the fd (i.e. dup2)
        if (FS.streams[fd] && FS.streams[fd].socket && FS.streams[fd].socket.close) {
          FS.streams[fd].socket.close();
        }
        FS.streams[fd] = stream;
        return fd;
      },removeFileHandle:function (fd) {
        FS.streams[fd] = null;
      },joinPath:function (parts, forceRelative) {
        var ret = parts[0];
        for (var i = 1; i < parts.length; i++) {
          if (ret[ret.length-1] != '/') ret += '/';
          ret += parts[i];
        }
        if (forceRelative && ret[0] == '/') ret = ret.substr(1);
        return ret;
      },absolutePath:function (relative, base) {
        if (typeof relative !== 'string') return null;
        if (base === undefined) base = FS.currentPath;
        if (relative && relative[0] == '/') base = '';
        var full = base + '/' + relative;
        var parts = full.split('/').reverse();
        var absolute = [''];
        while (parts.length) {
          var part = parts.pop();
          if (part == '' || part == '.') {
            // Nothing.
          } else if (part == '..') {
            if (absolute.length > 1) absolute.pop();
          } else {
            absolute.push(part);
          }
        }
        return absolute.length == 1 ? '/' : absolute.join('/');
      },analyzePath:function (path, dontResolveLastLink, linksVisited) {
        var ret = {
          isRoot: false,
          exists: false,
          error: 0,
          name: null,
          path: null,
          object: null,
          parentExists: false,
          parentPath: null,
          parentObject: null
        };
        path = FS.absolutePath(path);
        if (path == '/') {
          ret.isRoot = true;
          ret.exists = ret.parentExists = true;
          ret.name = '/';
          ret.path = ret.parentPath = '/';
          ret.object = ret.parentObject = FS.root;
        } else if (path !== null) {
          linksVisited = linksVisited || 0;
          path = path.slice(1).split('/');
          var current = FS.root;
          var traversed = [''];
          while (path.length) {
            if (path.length == 1 && current.isFolder) {
              ret.parentExists = true;
              ret.parentPath = traversed.length == 1 ? '/' : traversed.join('/');
              ret.parentObject = current;
              ret.name = path[0];
            }
            var target = path.shift();
            if (!current.isFolder) {
              ret.error = ERRNO_CODES.ENOTDIR;
              break;
            } else if (!current.read) {
              ret.error = ERRNO_CODES.EACCES;
              break;
            } else if (!current.contents.hasOwnProperty(target)) {
              ret.error = ERRNO_CODES.ENOENT;
              break;
            }
            current = current.contents[target];
            if (current.link && !(dontResolveLastLink && path.length == 0)) {
              if (linksVisited > 40) { // Usual Linux SYMLOOP_MAX.
                ret.error = ERRNO_CODES.ELOOP;
                break;
              }
              var link = FS.absolutePath(current.link, traversed.join('/'));
              ret = FS.analyzePath([link].concat(path).join('/'),
                                   dontResolveLastLink, linksVisited + 1);
              return ret;
            }
            traversed.push(target);
            if (path.length == 0) {
              ret.exists = true;
              ret.path = traversed.join('/');
              ret.object = current;
            }
          }
        }
        return ret;
      },findObject:function (path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          ___setErrNo(ret.error);
          return null;
        }
      },createObject:function (parent, name, properties, canRead, canWrite) {
        if (!parent) parent = '/';
        if (typeof parent === 'string') parent = FS.findObject(parent);
        if (!parent) {
          ___setErrNo(ERRNO_CODES.EACCES);
          throw new Error('Parent path must exist.');
        }
        if (!parent.isFolder) {
          ___setErrNo(ERRNO_CODES.ENOTDIR);
          throw new Error('Parent must be a folder.');
        }
        if (!parent.write && !FS.ignorePermissions) {
          ___setErrNo(ERRNO_CODES.EACCES);
          throw new Error('Parent folder must be writeable.');
        }
        if (!name || name == '.' || name == '..') {
          ___setErrNo(ERRNO_CODES.ENOENT);
          throw new Error('Name must not be empty.');
        }
        if (parent.contents.hasOwnProperty(name)) {
          ___setErrNo(ERRNO_CODES.EEXIST);
          throw new Error("Can't overwrite object.");
        }
        parent.contents[name] = {
          read: canRead === undefined ? true : canRead,
          write: canWrite === undefined ? false : canWrite,
          timestamp: Date.now(),
          inodeNumber: FS.nextInode++
        };
        for (var key in properties) {
          if (properties.hasOwnProperty(key)) {
            parent.contents[name][key] = properties[key];
          }
        }
        return parent.contents[name];
      },createFolder:function (parent, name, canRead, canWrite) {
        var properties = {isFolder: true, isDevice: false, contents: {}};
        return FS.createObject(parent, name, properties, canRead, canWrite);
      },createPath:function (parent, path, canRead, canWrite) {
        var current = FS.findObject(parent);
        if (current === null) throw new Error('Invalid parent.');
        path = path.split('/').reverse();
        while (path.length) {
          var part = path.pop();
          if (!part) continue;
          if (!current.contents.hasOwnProperty(part)) {
            FS.createFolder(current, part, canRead, canWrite);
          }
          current = current.contents[part];
        }
        return current;
      },createFile:function (parent, name, properties, canRead, canWrite) {
        properties.isFolder = false;
        return FS.createObject(parent, name, properties, canRead, canWrite);
      },createDataFile:function (parent, name, data, canRead, canWrite) {
        if (typeof data === 'string') {
          var dataArray = new Array(data.length);
          for (var i = 0, len = data.length; i < len; ++i) dataArray[i] = data.charCodeAt(i);
          data = dataArray;
        }
        var properties = {
          isDevice: false,
          contents: data.subarray ? data.subarray(0) : data // as an optimization, create a new array wrapper (not buffer) here, to help JS engines understand this object
        };
        return FS.createFile(parent, name, properties, canRead, canWrite);
      },createLazyFile:function (parent, name, url, canRead, canWrite) {
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
          var LazyUint8Array = function() {
            this.lengthKnown = false;
            this.chunks = []; // Loaded chunks. Index is the chunk number
          }
          LazyUint8Array.prototype.get = function(idx) {
            if (idx > this.length-1 || idx < 0) {
              return undefined;
            }
            var chunkOffset = idx % this.chunkSize;
            var chunkNum = Math.floor(idx / this.chunkSize);
            return this.getter(chunkNum)[chunkOffset];
          }
          LazyUint8Array.prototype.setDataGetter = function(getter) {
            this.getter = getter;
          }
          LazyUint8Array.prototype.cacheLength = function() {
              // Find length
              var xhr = new XMLHttpRequest();
              xhr.open('HEAD', url, false);
              xhr.send(null);
              if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
              var datalength = Number(xhr.getResponseHeader("Content-length"));
              var header;
              var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
              var chunkSize = 1024*1024; // Chunk size in bytes
              if (!hasByteServing) chunkSize = datalength;
              // Function to get a range from the remote URL.
              var doXHR = (function(from, to) {
                if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
                if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
                // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, false);
                if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
                // Some hints to the browser that we want binary data.
                if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
                if (xhr.overrideMimeType) {
                  xhr.overrideMimeType('text/plain; charset=x-user-defined');
                }
                xhr.send(null);
                if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
                if (xhr.response !== undefined) {
                  return new Uint8Array(xhr.response || []);
                } else {
                  return intArrayFromString(xhr.responseText || '', true);
                }
              });
              var lazyArray = this;
              lazyArray.setDataGetter(function(chunkNum) {
                var start = chunkNum * chunkSize;
                var end = (chunkNum+1) * chunkSize - 1; // including this byte
                end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
                if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
                  lazyArray.chunks[chunkNum] = doXHR(start, end);
                }
                if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
                return lazyArray.chunks[chunkNum];
              });
              this._length = datalength;
              this._chunkSize = chunkSize;
              this.lengthKnown = true;
          }
          var lazyArray = new LazyUint8Array();
          Object.defineProperty(lazyArray, "length", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._length;
              }
          });
          Object.defineProperty(lazyArray, "chunkSize", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._chunkSize;
              }
          });
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
        return FS.createFile(parent, name, properties, canRead, canWrite);
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile) {
        Browser.init();
        var fullname = FS.joinPath([parent, name], true);
        function processData(byteArray) {
          function finish(byteArray) {
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite);
            }
            if (onload) onload();
            removeRunDependency('cp ' + fullname);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency('cp ' + fullname);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency('cp ' + fullname);
        if (typeof url == 'string') {
          Browser.asyncLoad(url, function(byteArray) {
            processData(byteArray);
          }, onerror);
        } else {
          processData(url);
        }
      },createLink:function (parent, name, target, canRead, canWrite) {
        var properties = {isDevice: false, link: target};
        return FS.createFile(parent, name, properties, canRead, canWrite);
      },createDevice:function (parent, name, input, output) {
        if (!(input || output)) {
          throw new Error('A device must have at least one callback defined.');
        }
        var ops = {isDevice: true, input: input, output: output};
        return FS.createFile(parent, name, ops, Boolean(input), Boolean(output));
      },forceLoadFile:function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (Module['read']) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(Module['read'](obj.url), true);
          } catch (e) {
            success = false;
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
        if (!success) ___setErrNo(ERRNO_CODES.EIO);
        return success;
      },staticInit:function () {
        // The main file system tree. All the contents are inside this.
        FS.root = {
          read: true,
          write: true,
          isFolder: true,
          isDevice: false,
          timestamp: Date.now(),
          inodeNumber: 1,
          contents: {}
        };
        // Create the temporary folder, if not already created
        try {
          FS.createFolder('/', 'tmp', true, true);
        } catch(e) {}
        FS.createFolder('/', 'dev', true, true);
      },init:function (input, output, error) {
        // Make sure we initialize only once.
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        input = input || Module['stdin'];
        output = output || Module['stdout'];
        error = error || Module['stderr'];
        // Default handlers.
        var stdinOverridden = true, stdoutOverridden = true, stderrOverridden = true;
        if (!input) {
          stdinOverridden = false;
          input = function() {
            if (!input.cache || !input.cache.length) {
              var result;
              if (typeof window != 'undefined' &&
                  typeof window.prompt == 'function') {
                // Browser.
                result = window.prompt('Input: ');
                if (result === null) result = String.fromCharCode(0); // cancel ==> EOF
              } else if (typeof readline == 'function') {
                // Command line.
                result = readline();
              }
              if (!result) result = '';
              input.cache = intArrayFromString(result + '\n', true);
            }
            return input.cache.shift();
          };
        }
        var utf8 = new Runtime.UTF8Processor();
        function createSimpleOutput() {
          var fn = function (val) {
            if (val === null || val === 10) {
              fn.printer(fn.buffer.join(''));
              fn.buffer = [];
            } else {
              fn.buffer.push(utf8.processCChar(val));
            }
          };
          return fn;
        }
        if (!output) {
          stdoutOverridden = false;
          output = createSimpleOutput();
        }
        if (!output.printer) output.printer = Module['print'];
        if (!output.buffer) output.buffer = [];
        if (!error) {
          stderrOverridden = false;
          error = createSimpleOutput();
        }
        if (!error.printer) error.printer = Module['printErr'];
        if (!error.buffer) error.buffer = [];
        // Create the I/O devices.
        var stdin = FS.createDevice('/dev', 'stdin', input);
        stdin.isTerminal = !stdinOverridden;
        var stdout = FS.createDevice('/dev', 'stdout', null, output);
        stdout.isTerminal = !stdoutOverridden;
        var stderr = FS.createDevice('/dev', 'stderr', null, error);
        stderr.isTerminal = !stderrOverridden;
        FS.createDevice('/dev', 'tty', input, output);
        FS.createDevice('/dev', 'null', function(){}, function(){});
        // Create default streams.
        FS.streams[1] = {
          path: '/dev/stdin',
          object: stdin,
          position: 0,
          isRead: true,
          isWrite: false,
          isAppend: false,
          error: false,
          eof: false,
          ungotten: []
        };
        FS.streams[2] = {
          path: '/dev/stdout',
          object: stdout,
          position: 0,
          isRead: false,
          isWrite: true,
          isAppend: false,
          error: false,
          eof: false,
          ungotten: []
        };
        FS.streams[3] = {
          path: '/dev/stderr',
          object: stderr,
          position: 0,
          isRead: false,
          isWrite: true,
          isAppend: false,
          error: false,
          eof: false,
          ungotten: []
        };
        // TODO: put these low in memory like we used to assert on: assert(Math.max(_stdin, _stdout, _stderr) < 15000); // make sure these are low, we flatten arrays with these
        HEAP32[((_stdin)>>2)]=1;
        HEAP32[((_stdout)>>2)]=2;
        HEAP32[((_stderr)>>2)]=3;
        // Other system paths
        FS.createPath('/', 'dev/shm/tmp', true, true); // temp files
        // Newlib initialization
        for (var i = FS.streams.length; i < Math.max(_stdin, _stdout, _stderr) + 4; i++) {
          FS.streams[i] = null; // Make sure to keep FS.streams dense
        }
        FS.streams[_stdin] = FS.streams[1];
        FS.streams[_stdout] = FS.streams[2];
        FS.streams[_stderr] = FS.streams[3];
        allocate([ allocate(
          [0, 0, 0, 0, _stdin, 0, 0, 0, _stdout, 0, 0, 0, _stderr, 0, 0, 0],
          'void*', ALLOC_NORMAL) ], 'void*', ALLOC_NONE, __impure_ptr);
      },quit:function () {
        if (!FS.init.initialized) return;
        // Flush any partially-printed lines in stdout and stderr. Careful, they may have been closed
        if (FS.streams[2] && FS.streams[2].object.output.buffer.length > 0) FS.streams[2].object.output(10);
        if (FS.streams[3] && FS.streams[3].object.output.buffer.length > 0) FS.streams[3].object.output(10);
      },standardizePath:function (path) {
        if (path.substr(0, 2) == './') path = path.substr(2);
        return path;
      },deleteFile:function (path) {
        path = FS.analyzePath(path);
        if (!path.parentExists || !path.exists) {
          throw 'Invalid path ' + path;
        }
        delete path.parentObject.contents[path.name];
      }};
  function _send(fd, buf, len, flags) {
      var info = FS.streams[fd];
      if (!info) return -1;
      info.sender(HEAPU8.subarray(buf, buf+len));
      return len;
    }
  function _pwrite(fildes, buf, nbyte, offset) {
      // ssize_t pwrite(int fildes, const void *buf, size_t nbyte, off_t offset);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.streams[fildes];
      if (!stream || stream.object.isDevice) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      } else if (!stream.isWrite) {
        ___setErrNo(ERRNO_CODES.EACCES);
        return -1;
      } else if (stream.object.isFolder) {
        ___setErrNo(ERRNO_CODES.EISDIR);
        return -1;
      } else if (nbyte < 0 || offset < 0) {
        ___setErrNo(ERRNO_CODES.EINVAL);
        return -1;
      } else {
        var contents = stream.object.contents;
        while (contents.length < offset) contents.push(0);
        for (var i = 0; i < nbyte; i++) {
          contents[offset + i] = HEAPU8[(((buf)+(i))|0)];
        }
        stream.object.timestamp = Date.now();
        return i;
      }
    }function _write(fildes, buf, nbyte) {
      // ssize_t write(int fildes, const void *buf, size_t nbyte);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.streams[fildes];
      if (stream && ('socket' in stream)) {
          return _send(fildes, buf, nbyte, 0);
      } else if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      } else if (!stream.isWrite) {
        ___setErrNo(ERRNO_CODES.EACCES);
        return -1;
      } else if (nbyte < 0) {
        ___setErrNo(ERRNO_CODES.EINVAL);
        return -1;
      } else {
        if (stream.object.isDevice) {
          if (stream.object.output) {
            for (var i = 0; i < nbyte; i++) {
              try {
                stream.object.output(HEAP8[(((buf)+(i))|0)]);
              } catch (e) {
                ___setErrNo(ERRNO_CODES.EIO);
                return -1;
              }
            }
            stream.object.timestamp = Date.now();
            return i;
          } else {
            ___setErrNo(ERRNO_CODES.ENXIO);
            return -1;
          }
        } else {
          var bytesWritten = _pwrite(fildes, buf, nbyte, stream.position);
          if (bytesWritten != -1) stream.position += bytesWritten;
          return bytesWritten;
        }
      }
    }function _fwrite(ptr, size, nitems, stream) {
      // size_t fwrite(const void *restrict ptr, size_t size, size_t nitems, FILE *restrict stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fwrite.html
      var bytesToWrite = nitems * size;
      if (bytesToWrite == 0) return 0;
      var bytesWritten = _write(stream, ptr, bytesToWrite);
      if (bytesWritten == -1) {
        if (FS.streams[stream]) FS.streams[stream].error = true;
        return 0;
      } else {
        return Math.floor(bytesWritten / size);
      }
    }
  function _fflush(stream) {
      // int fflush(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fflush.html
      var flush = function(filedes) {
        // Right now we write all data directly, except for output devices.
        if (FS.streams[filedes] && FS.streams[filedes].object.output) {
          if (!FS.streams[filedes].object.isTerminal) { // don't flush terminals, it would cause a \n to also appear
            FS.streams[filedes].object.output(null);
          }
        }
      };
      try {
        if (stream === 0) {
          for (var i = 0; i < FS.streams.length; i++) if (FS.streams[i]) flush(i);
        } else {
          flush(stream);
        }
        return 0;
      } catch (e) {
        ___setErrNo(ERRNO_CODES.EIO);
        return -1;
      }
    }
  function _ungetc(c, stream) {
      // int ungetc(int c, FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/ungetc.html
      stream = FS.streams[stream];
      if (!stream) {
        return -1;
      }
      if (c === -1) {
        // do nothing for EOF character
        return c;
      }
      c = unSign(c & 0xFF);
      stream.ungotten.push(c);
      stream.eof = false;
      return c;
    }
  function _recv(fd, buf, len, flags) {
      var info = FS.streams[fd];
      if (!info) return -1;
      if (!info.hasData()) {
        ___setErrNo(ERRNO_CODES.EAGAIN); // no data, and all sockets are nonblocking, so this is the right behavior
        return -1;
      }
      var buffer = info.inQueue.shift();
      if (len < buffer.length) {
        if (info.stream) {
          // This is tcp (reliable), so if not all was read, keep it
          info.inQueue.unshift(buffer.subarray(len));
        }
        buffer = buffer.subarray(0, len);
      }
      HEAPU8.set(buffer, buf);
      return buffer.length;
    }
  function _pread(fildes, buf, nbyte, offset) {
      // ssize_t pread(int fildes, void *buf, size_t nbyte, off_t offset);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/read.html
      var stream = FS.streams[fildes];
      if (!stream || stream.object.isDevice) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      } else if (!stream.isRead) {
        ___setErrNo(ERRNO_CODES.EACCES);
        return -1;
      } else if (stream.object.isFolder) {
        ___setErrNo(ERRNO_CODES.EISDIR);
        return -1;
      } else if (nbyte < 0 || offset < 0) {
        ___setErrNo(ERRNO_CODES.EINVAL);
        return -1;
      } else if (offset >= stream.object.contents.length) {
        return 0;
      } else {
        var bytesRead = 0;
        var contents = stream.object.contents;
        var size = Math.min(contents.length - offset, nbyte);
        assert(size >= 0);
        if (contents.subarray) { // typed array
          HEAPU8.set(contents.subarray(offset, offset+size), buf);
        } else
        if (contents.slice) { // normal array
          for (var i = 0; i < size; i++) {
            HEAP8[(((buf)+(i))|0)]=contents[offset + i]
          }
        } else {
          for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
            HEAP8[(((buf)+(i))|0)]=contents.get(offset + i)
          }
        }
        bytesRead += size;
        return bytesRead;
      }
    }function _read(fildes, buf, nbyte) {
      // ssize_t read(int fildes, void *buf, size_t nbyte);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/read.html
      var stream = FS.streams[fildes];
      if (stream && ('socket' in stream)) {
        return _recv(fildes, buf, nbyte, 0);
      } else if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      } else if (!stream.isRead) {
        ___setErrNo(ERRNO_CODES.EACCES);
        return -1;
      } else if (nbyte < 0) {
        ___setErrNo(ERRNO_CODES.EINVAL);
        return -1;
      } else {
        var bytesRead;
        if (stream.object.isDevice) {
          if (stream.object.input) {
            bytesRead = 0;
            for (var i = 0; i < nbyte; i++) {
              try {
                var result = stream.object.input();
              } catch (e) {
                ___setErrNo(ERRNO_CODES.EIO);
                return -1;
              }
              if (result === undefined && bytesRead === 0) {
                ___setErrNo(ERRNO_CODES.EAGAIN);
                return -1;
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              HEAP8[(((buf)+(i))|0)]=result
            }
            return bytesRead;
          } else {
            ___setErrNo(ERRNO_CODES.ENXIO);
            return -1;
          }
        } else {
          bytesRead = _pread(fildes, buf, nbyte, stream.position);
          assert(bytesRead >= -1);
          if (bytesRead != -1) {
            stream.position += bytesRead;
          }
          return bytesRead;
        }
      }
    }function _fread(ptr, size, nitems, stream) {
      // size_t fread(void *restrict ptr, size_t size, size_t nitems, FILE *restrict stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fread.html
      var bytesToRead = nitems * size;
      if (bytesToRead == 0) {
        return 0;
      }
      var bytesRead = 0;
      var streamObj = FS.streams[stream];
      while (streamObj.ungotten.length && bytesToRead > 0) {
        HEAP8[((ptr++)|0)]=streamObj.ungotten.pop()
        bytesToRead--;
        bytesRead++;
      }
      var err = _read(stream, ptr, bytesToRead);
      if (err == -1) {
        if (streamObj) streamObj.error = true;
        return 0;
      }
      bytesRead += err;
      if (bytesRead < bytesToRead) streamObj.eof = true;
      return Math.floor(bytesRead / size);
    }function _fgetc(stream) {
      // int fgetc(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fgetc.html
      if (!FS.streams[stream]) return -1;
      var streamObj = FS.streams[stream];
      if (streamObj.eof || streamObj.error) return -1;
      var ret = _fread(_fgetc.ret, 1, 1, stream);
      if (ret == 0) {
        streamObj.eof = true;
        return -1;
      } else if (ret == -1) {
        streamObj.error = true;
        return -1;
      } else {
        return HEAPU8[((_fgetc.ret)|0)];
      }
    }var _getc=_fgetc;
  function ___cxa_pure_virtual() {
      ABORT = true;
      throw 'Pure virtual function called!';
    }
  function ___errno_location() {
      return ___errno_state;
    }var ___errno=___errno_location;
  Module["_strlen"] = _strlen;
  Module["_strcpy"] = _strcpy;
  var ERRNO_MESSAGES={0:"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",34:"Math result not representable",35:"No message of desired type",36:"Identifier removed",37:"Channel number out of range",38:"Level 2 not synchronized",39:"Level 3 halted",40:"Level 3 reset",41:"Link number out of range",42:"Protocol driver not attached",43:"No CSI structure available",44:"Level 2 halted",45:"Deadlock condition",46:"No record locks available",50:"Invalid exchange",51:"Invalid request descriptor",52:"Exchange full",53:"No anode",54:"Invalid request code",55:"Invalid slot",56:"File locking deadlock error",57:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",74:"Multihop attempted",75:"Inode is remote (not really error)",76:"Cross mount point (not really error)",77:"Trying to read unreadable message",79:"Inappropriate file type or format",80:"Given log. name not unique",81:"f.d. invalid for this operation",82:"Remote address changed",83:"Can\t access a needed shared lib",84:"Accessing a corrupted shared lib",85:".lib section in a.out corrupted",86:"Attempting to link in too many libs",87:"Attempting to exec a shared library",88:"Function not implemented",89:"No more files",90:"Directory not empty",91:"File or path name too long",92:"Too many symbolic links",95:"Operation not supported on transport endpoint",96:"Protocol family not supported",104:"Connection reset by peer",105:"No buffer space available",106:"Address family not supported by protocol family",107:"Protocol wrong type for socket",108:"Socket operation on non-socket",109:"Protocol not available",110:"Can't send after socket shutdown",111:"Connection refused",112:"Address already in use",113:"Connection aborted",114:"Network is unreachable",115:"Network interface is not configured",116:"Connection timed out",117:"Host is down",118:"Host is unreachable",119:"Connection already in progress",120:"Socket already connected",121:"Destination address required",122:"Message too long",123:"Unknown protocol",124:"Socket type not supported",125:"Address not available",126:"ENETRESET",127:"Socket is already connected",128:"Socket is not connected",129:"TOOMANYREFS",130:"EPROCLIM",131:"EUSERS",132:"EDQUOT",133:"ESTALE",134:"Not supported",135:"No medium (in tape drive)",136:"No such host or network path",137:"Filename exists with different case",138:"EILSEQ",139:"Value too large for defined data type",140:"Operation canceled",141:"State not recoverable",142:"Previous owner died",143:"Streams pipe error"};function _strerror_r(errnum, strerrbuf, buflen) {
      if (errnum in ERRNO_MESSAGES) {
        if (ERRNO_MESSAGES[errnum].length > buflen - 1) {
          return ___setErrNo(ERRNO_CODES.ERANGE);
        } else {
          var msg = ERRNO_MESSAGES[errnum];
          for (var i = 0; i < msg.length; i++) {
            HEAP8[(((strerrbuf)+(i))|0)]=msg.charCodeAt(i)
          }
          HEAP8[(((strerrbuf)+(i))|0)]=0
          return 0;
        }
      } else {
        return ___setErrNo(ERRNO_CODES.EINVAL);
      }
    }function _strerror(errnum) {
      if (!_strerror.buffer) _strerror.buffer = _malloc(256);
      _strerror_r(errnum, _strerror.buffer, 256);
      return _strerror.buffer;
    }
  function _abort() {
      Module['abort']();
    }
  Module["_memmove"] = _memmove;var _llvm_memmove_p0i8_p0i8_i32=_memmove;
  function __reallyNegative(x) {
      return x < 0 || (x === 0 && (1/x) === -Infinity);
    }function __formatString(format, varargs) {
      var textIndex = format;
      var argIndex = 0;
      function getNextArg(type) {
        // NOTE: Explicitly ignoring type safety. Otherwise this fails:
        //       int x = 4; printf("%c\n", (char)x);
        var ret;
        if (type === 'double') {
          ret = HEAPF64[(((varargs)+(argIndex))>>3)];
        } else if (type == 'i64') {
          ret = [HEAP32[(((varargs)+(argIndex))>>2)],
                 HEAP32[(((varargs)+(argIndex+8))>>2)]];
          argIndex += 8; // each 32-bit chunk is in a 64-bit block
        } else {
          type = 'i32'; // varargs are always i32, i64, or double
          ret = HEAP32[(((varargs)+(argIndex))>>2)];
        }
        argIndex += Math.max(Runtime.getNativeFieldSize(type), Runtime.getAlignSize(type, null, true));
        return ret;
      }
      var ret = [];
      var curr, next, currArg;
      while(1) {
        var startTextIndex = textIndex;
        curr = HEAP8[(textIndex)];
        if (curr === 0) break;
        next = HEAP8[((textIndex+1)|0)];
        if (curr == 37) {
          // Handle flags.
          var flagAlwaysSigned = false;
          var flagLeftAlign = false;
          var flagAlternative = false;
          var flagZeroPad = false;
          flagsLoop: while (1) {
            switch (next) {
              case 43:
                flagAlwaysSigned = true;
                break;
              case 45:
                flagLeftAlign = true;
                break;
              case 35:
                flagAlternative = true;
                break;
              case 48:
                if (flagZeroPad) {
                  break flagsLoop;
                } else {
                  flagZeroPad = true;
                  break;
                }
              default:
                break flagsLoop;
            }
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
          }
          // Handle width.
          var width = 0;
          if (next == 42) {
            width = getNextArg('i32');
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
          } else {
            while (next >= 48 && next <= 57) {
              width = width * 10 + (next - 48);
              textIndex++;
              next = HEAP8[((textIndex+1)|0)];
            }
          }
          // Handle precision.
          var precisionSet = false;
          if (next == 46) {
            var precision = 0;
            precisionSet = true;
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
            if (next == 42) {
              precision = getNextArg('i32');
              textIndex++;
            } else {
              while(1) {
                var precisionChr = HEAP8[((textIndex+1)|0)];
                if (precisionChr < 48 ||
                    precisionChr > 57) break;
                precision = precision * 10 + (precisionChr - 48);
                textIndex++;
              }
            }
            next = HEAP8[((textIndex+1)|0)];
          } else {
            var precision = 6; // Standard default.
          }
          // Handle integer sizes. WARNING: These assume a 32-bit architecture!
          var argSize;
          switch (String.fromCharCode(next)) {
            case 'h':
              var nextNext = HEAP8[((textIndex+2)|0)];
              if (nextNext == 104) {
                textIndex++;
                argSize = 1; // char (actually i32 in varargs)
              } else {
                argSize = 2; // short (actually i32 in varargs)
              }
              break;
            case 'l':
              var nextNext = HEAP8[((textIndex+2)|0)];
              if (nextNext == 108) {
                textIndex++;
                argSize = 8; // long long
              } else {
                argSize = 4; // long
              }
              break;
            case 'L': // long long
            case 'q': // int64_t
            case 'j': // intmax_t
              argSize = 8;
              break;
            case 'z': // size_t
            case 't': // ptrdiff_t
            case 'I': // signed ptrdiff_t or unsigned size_t
              argSize = 4;
              break;
            default:
              argSize = null;
          }
          if (argSize) textIndex++;
          next = HEAP8[((textIndex+1)|0)];
          // Handle type specifier.
          switch (String.fromCharCode(next)) {
            case 'd': case 'i': case 'u': case 'o': case 'x': case 'X': case 'p': {
              // Integer.
              var signed = next == 100 || next == 105;
              argSize = argSize || 4;
              var currArg = getNextArg('i' + (argSize * 8));
              var origArg = currArg;
              var argText;
              // Flatten i64-1 [low, high] into a (slightly rounded) double
              if (argSize == 8) {
                currArg = Runtime.makeBigInt(currArg[0], currArg[1], next == 117);
              }
              // Truncate to requested size.
              if (argSize <= 4) {
                var limit = Math.pow(256, argSize) - 1;
                currArg = (signed ? reSign : unSign)(currArg & limit, argSize * 8);
              }
              // Format the number.
              var currAbsArg = Math.abs(currArg);
              var prefix = '';
              if (next == 100 || next == 105) {
                if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], null); else
                argText = reSign(currArg, 8 * argSize, 1).toString(10);
              } else if (next == 117) {
                if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], true); else
                argText = unSign(currArg, 8 * argSize, 1).toString(10);
                currArg = Math.abs(currArg);
              } else if (next == 111) {
                argText = (flagAlternative ? '0' : '') + currAbsArg.toString(8);
              } else if (next == 120 || next == 88) {
                prefix = (flagAlternative && currArg != 0) ? '0x' : '';
                if (argSize == 8 && i64Math) {
                  if (origArg[1]) {
                    argText = (origArg[1]>>>0).toString(16);
                    var lower = (origArg[0]>>>0).toString(16);
                    while (lower.length < 8) lower = '0' + lower;
                    argText += lower;
                  } else {
                    argText = (origArg[0]>>>0).toString(16);
                  }
                } else
                if (currArg < 0) {
                  // Represent negative numbers in hex as 2's complement.
                  currArg = -currArg;
                  argText = (currAbsArg - 1).toString(16);
                  var buffer = [];
                  for (var i = 0; i < argText.length; i++) {
                    buffer.push((0xF - parseInt(argText[i], 16)).toString(16));
                  }
                  argText = buffer.join('');
                  while (argText.length < argSize * 2) argText = 'f' + argText;
                } else {
                  argText = currAbsArg.toString(16);
                }
                if (next == 88) {
                  prefix = prefix.toUpperCase();
                  argText = argText.toUpperCase();
                }
              } else if (next == 112) {
                if (currAbsArg === 0) {
                  argText = '(nil)';
                } else {
                  prefix = '0x';
                  argText = currAbsArg.toString(16);
                }
              }
              if (precisionSet) {
                while (argText.length < precision) {
                  argText = '0' + argText;
                }
              }
              // Add sign if needed
              if (flagAlwaysSigned) {
                if (currArg < 0) {
                  prefix = '-' + prefix;
                } else {
                  prefix = '+' + prefix;
                }
              }
              // Add padding.
              while (prefix.length + argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad) {
                    argText = '0' + argText;
                  } else {
                    prefix = ' ' + prefix;
                  }
                }
              }
              // Insert the result into the buffer.
              argText = prefix + argText;
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 'f': case 'F': case 'e': case 'E': case 'g': case 'G': {
              // Float.
              var currArg = getNextArg('double');
              var argText;
              if (isNaN(currArg)) {
                argText = 'nan';
                flagZeroPad = false;
              } else if (!isFinite(currArg)) {
                argText = (currArg < 0 ? '-' : '') + 'inf';
                flagZeroPad = false;
              } else {
                var isGeneral = false;
                var effectivePrecision = Math.min(precision, 20);
                // Convert g/G to f/F or e/E, as per:
                // http://pubs.opengroup.org/onlinepubs/9699919799/functions/printf.html
                if (next == 103 || next == 71) {
                  isGeneral = true;
                  precision = precision || 1;
                  var exponent = parseInt(currArg.toExponential(effectivePrecision).split('e')[1], 10);
                  if (precision > exponent && exponent >= -4) {
                    next = ((next == 103) ? 'f' : 'F').charCodeAt(0);
                    precision -= exponent + 1;
                  } else {
                    next = ((next == 103) ? 'e' : 'E').charCodeAt(0);
                    precision--;
                  }
                  effectivePrecision = Math.min(precision, 20);
                }
                if (next == 101 || next == 69) {
                  argText = currArg.toExponential(effectivePrecision);
                  // Make sure the exponent has at least 2 digits.
                  if (/[eE][-+]\d$/.test(argText)) {
                    argText = argText.slice(0, -1) + '0' + argText.slice(-1);
                  }
                } else if (next == 102 || next == 70) {
                  argText = currArg.toFixed(effectivePrecision);
                  if (currArg === 0 && __reallyNegative(currArg)) {
                    argText = '-' + argText;
                  }
                }
                var parts = argText.split('e');
                if (isGeneral && !flagAlternative) {
                  // Discard trailing zeros and periods.
                  while (parts[0].length > 1 && parts[0].indexOf('.') != -1 &&
                         (parts[0].slice(-1) == '0' || parts[0].slice(-1) == '.')) {
                    parts[0] = parts[0].slice(0, -1);
                  }
                } else {
                  // Make sure we have a period in alternative mode.
                  if (flagAlternative && argText.indexOf('.') == -1) parts[0] += '.';
                  // Zero pad until required precision.
                  while (precision > effectivePrecision++) parts[0] += '0';
                }
                argText = parts[0] + (parts.length > 1 ? 'e' + parts[1] : '');
                // Capitalize 'E' if needed.
                if (next == 69) argText = argText.toUpperCase();
                // Add sign.
                if (flagAlwaysSigned && currArg >= 0) {
                  argText = '+' + argText;
                }
              }
              // Add padding.
              while (argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad && (argText[0] == '-' || argText[0] == '+')) {
                    argText = argText[0] + '0' + argText.slice(1);
                  } else {
                    argText = (flagZeroPad ? '0' : ' ') + argText;
                  }
                }
              }
              // Adjust case.
              if (next < 97) argText = argText.toUpperCase();
              // Insert the result into the buffer.
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 's': {
              // String.
              var arg = getNextArg('i8*');
              var argLength = arg ? _strlen(arg) : '(null)'.length;
              if (precisionSet) argLength = Math.min(argLength, precision);
              if (!flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              if (arg) {
                for (var i = 0; i < argLength; i++) {
                  ret.push(HEAPU8[((arg++)|0)]);
                }
              } else {
                ret = ret.concat(intArrayFromString('(null)'.substr(0, argLength), true));
              }
              if (flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              break;
            }
            case 'c': {
              // Character.
              if (flagLeftAlign) ret.push(getNextArg('i8'));
              while (--width > 0) {
                ret.push(32);
              }
              if (!flagLeftAlign) ret.push(getNextArg('i8'));
              break;
            }
            case 'n': {
              // Write the length written so far to the next parameter.
              var ptr = getNextArg('i32*');
              HEAP32[((ptr)>>2)]=ret.length
              break;
            }
            case '%': {
              // Literal percent sign.
              ret.push(curr);
              break;
            }
            default: {
              // Unknown specifiers remain untouched.
              for (var i = startTextIndex; i < textIndex + 2; i++) {
                ret.push(HEAP8[(i)]);
              }
            }
          }
          textIndex += 2;
          // TODO: Support a/A (hex float) and m (last error) specifiers.
          // TODO: Support %1${specifier} for arg selection.
        } else {
          ret.push(curr);
          textIndex += 1;
        }
      }
      return ret;
    }function _snprintf(s, n, format, varargs) {
      // int snprintf(char *restrict s, size_t n, const char *restrict format, ...);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/printf.html
      var result = __formatString(format, varargs);
      var limit = (n === undefined) ? result.length
                                    : Math.min(result.length, Math.max(n - 1, 0));
      if (s < 0) {
        s = -s;
        var buf = _malloc(limit+1);
        HEAP32[((s)>>2)]=buf;
        s = buf;
      }
      for (var i = 0; i < limit; i++) {
        HEAP8[(((s)+(i))|0)]=result[i];
      }
      if (limit < n || (n === undefined)) HEAP8[(((s)+(i))|0)]=0;
      return result.length;
    }
  function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 8: return PAGE_SIZE;
        case 54:
        case 56:
        case 21:
        case 61:
        case 63:
        case 22:
        case 67:
        case 23:
        case 24:
        case 25:
        case 26:
        case 27:
        case 69:
        case 28:
        case 101:
        case 70:
        case 71:
        case 29:
        case 30:
        case 199:
        case 75:
        case 76:
        case 32:
        case 43:
        case 44:
        case 80:
        case 46:
        case 47:
        case 45:
        case 48:
        case 49:
        case 42:
        case 82:
        case 33:
        case 7:
        case 108:
        case 109:
        case 107:
        case 112:
        case 119:
        case 121:
          return 200809;
        case 13:
        case 104:
        case 94:
        case 95:
        case 34:
        case 35:
        case 77:
        case 81:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
        case 91:
        case 94:
        case 95:
        case 110:
        case 111:
        case 113:
        case 114:
        case 115:
        case 116:
        case 117:
        case 118:
        case 120:
        case 40:
        case 16:
        case 79:
        case 19:
          return -1;
        case 92:
        case 93:
        case 5:
        case 72:
        case 6:
        case 74:
        case 92:
        case 93:
        case 96:
        case 97:
        case 98:
        case 99:
        case 102:
        case 103:
        case 105:
          return 1;
        case 38:
        case 66:
        case 50:
        case 51:
        case 4:
          return 1024;
        case 15:
        case 64:
        case 41:
          return 32;
        case 55:
        case 37:
        case 17:
          return 2147483647;
        case 18:
        case 1:
          return 47839;
        case 59:
        case 57:
          return 99;
        case 68:
        case 58:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 14: return 32768;
        case 73: return 32767;
        case 39: return 16384;
        case 60: return 1000;
        case 106: return 700;
        case 52: return 256;
        case 62: return 255;
        case 2: return 100;
        case 65: return 64;
        case 36: return 20;
        case 100: return 16;
        case 20: return 6;
        case 53: return 4;
        case 10: return 1;
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }
  function ___cxa_guard_abort() {}
  function _isxdigit(chr) {
      return (chr >= 48 && chr <= 57) ||
             (chr >= 97 && chr <= 102) ||
             (chr >= 65 && chr <= 70);
    }var _isxdigit_l=_isxdigit;
  function _isdigit(chr) {
      return chr >= 48 && chr <= 57;
    }var _isdigit_l=_isdigit;
  function __isFloat(text) {
      return !!(/^[+-]?[0-9]*\.?[0-9]+([eE][+-]?[0-9]+)?$/.exec(text));
    }function __scanString(format, get, unget, varargs) {
      if (!__scanString.whiteSpace) {
        __scanString.whiteSpace = {};
        __scanString.whiteSpace[32] = 1;
        __scanString.whiteSpace[9] = 1;
        __scanString.whiteSpace[10] = 1;
        __scanString.whiteSpace[11] = 1;
        __scanString.whiteSpace[12] = 1;
        __scanString.whiteSpace[13] = 1;
        __scanString.whiteSpace[' '] = 1;
        __scanString.whiteSpace['\t'] = 1;
        __scanString.whiteSpace['\n'] = 1;
        __scanString.whiteSpace['\v'] = 1;
        __scanString.whiteSpace['\f'] = 1;
        __scanString.whiteSpace['\r'] = 1;
      }
      // Supports %x, %4x, %d.%d, %lld, %s, %f, %lf.
      // TODO: Support all format specifiers.
      format = Pointer_stringify(format);
      var soFar = 0;
      if (format.indexOf('%n') >= 0) {
        // need to track soFar
        var _get = get;
        get = function() {
          soFar++;
          return _get();
        }
        var _unget = unget;
        unget = function() {
          soFar--;
          return _unget();
        }
      }
      var formatIndex = 0;
      var argsi = 0;
      var fields = 0;
      var argIndex = 0;
      var next;
      mainLoop:
      for (var formatIndex = 0; formatIndex < format.length;) {
        if (format[formatIndex] === '%' && format[formatIndex+1] == 'n') {
          var argPtr = HEAP32[(((varargs)+(argIndex))>>2)];
          argIndex += Runtime.getAlignSize('void*', null, true);
          HEAP32[((argPtr)>>2)]=soFar;
          formatIndex += 2;
          continue;
        }
        if (format[formatIndex] === '%') {
          var nextC = format.indexOf('c', formatIndex+1);
          if (nextC > 0) {
            var maxx = 1;
            if (nextC > formatIndex+1) {
              var sub = format.substring(formatIndex+1, nextC)
              maxx = parseInt(sub);
              if (maxx != sub) maxx = 0;
            }
            if (maxx) {
              var argPtr = HEAP32[(((varargs)+(argIndex))>>2)];
              argIndex += Runtime.getAlignSize('void*', null, true);
              fields++;
              for (var i = 0; i < maxx; i++) {
                next = get();
                HEAP8[((argPtr++)|0)]=next;
              }
              formatIndex += nextC - formatIndex + 1;
              continue;
            }
          }
        }
        // remove whitespace
        while (1) {
          next = get();
          if (next == 0) return fields;
          if (!(next in __scanString.whiteSpace)) break;
        }
        unget();
        if (format[formatIndex] === '%') {
          formatIndex++;
          var suppressAssignment = false;
          if (format[formatIndex] == '*') {
            suppressAssignment = true;
            formatIndex++;
          }
          var maxSpecifierStart = formatIndex;
          while (format[formatIndex].charCodeAt(0) >= 48 &&
                 format[formatIndex].charCodeAt(0) <= 57) {
            formatIndex++;
          }
          var max_;
          if (formatIndex != maxSpecifierStart) {
            max_ = parseInt(format.slice(maxSpecifierStart, formatIndex), 10);
          }
          var long_ = false;
          var half = false;
          var longLong = false;
          if (format[formatIndex] == 'l') {
            long_ = true;
            formatIndex++;
            if (format[formatIndex] == 'l') {
              longLong = true;
              formatIndex++;
            }
          } else if (format[formatIndex] == 'h') {
            half = true;
            formatIndex++;
          }
          var type = format[formatIndex];
          formatIndex++;
          var curr = 0;
          var buffer = [];
          // Read characters according to the format. floats are trickier, they may be in an unfloat state in the middle, then be a valid float later
          if (type == 'f' || type == 'e' || type == 'g' ||
              type == 'F' || type == 'E' || type == 'G') {
            var last = 0;
            next = get();
            while (next > 0) {
              buffer.push(String.fromCharCode(next));
              if (__isFloat(buffer.join(''))) {
                last = buffer.length;
              }
              next = get();
            }
            for (var i = 0; i < buffer.length - last + 1; i++) {
              unget();
            }
            buffer.length = last;
          } else {
            next = get();
            var first = true;
            while ((curr < max_ || isNaN(max_)) && next > 0) {
              if (!(next in __scanString.whiteSpace) && // stop on whitespace
                  (type == 's' ||
                   ((type === 'd' || type == 'u' || type == 'i') && ((next >= 48 && next <= 57) ||
                                                                     (first && next == 45))) ||
                   ((type === 'x' || type === 'X') && (next >= 48 && next <= 57 ||
                                     next >= 97 && next <= 102 ||
                                     next >= 65 && next <= 70))) &&
                  (formatIndex >= format.length || next !== format[formatIndex].charCodeAt(0))) { // Stop when we read something that is coming up
                buffer.push(String.fromCharCode(next));
                next = get();
                curr++;
                first = false;
              } else {
                break;
              }
            }
            unget();
          }
          if (buffer.length === 0) return 0;  // Failure.
          if (suppressAssignment) continue;
          var text = buffer.join('');
          var argPtr = HEAP32[(((varargs)+(argIndex))>>2)];
          argIndex += Runtime.getAlignSize('void*', null, true);
          switch (type) {
            case 'd': case 'u': case 'i':
              if (half) {
                HEAP16[((argPtr)>>1)]=parseInt(text, 10);
              } else if (longLong) {
                (tempI64 = [parseInt(text, 10)>>>0,((Math.min((+(Math.floor((parseInt(text, 10))/(+(4294967296))))), (+(4294967295))))|0)>>>0],HEAP32[((argPtr)>>2)]=tempI64[0],HEAP32[(((argPtr)+(4))>>2)]=tempI64[1]);
              } else {
                HEAP32[((argPtr)>>2)]=parseInt(text, 10);
              }
              break;
            case 'X':
            case 'x':
              HEAP32[((argPtr)>>2)]=parseInt(text, 16)
              break;
            case 'F':
            case 'f':
            case 'E':
            case 'e':
            case 'G':
            case 'g':
            case 'E':
              // fallthrough intended
              if (long_) {
                HEAPF64[((argPtr)>>3)]=parseFloat(text)
              } else {
                HEAPF32[((argPtr)>>2)]=parseFloat(text)
              }
              break;
            case 's':
              var array = intArrayFromString(text);
              for (var j = 0; j < array.length; j++) {
                HEAP8[(((argPtr)+(j))|0)]=array[j]
              }
              break;
          }
          fields++;
        } else if (format[formatIndex] in __scanString.whiteSpace) {
          next = get();
          while (next in __scanString.whiteSpace) {
            if (next <= 0) break mainLoop;  // End of input.
            next = get();
          }
          unget(next);
          formatIndex++;
        } else {
          // Not a specifier.
          next = get();
          if (format[formatIndex].charCodeAt(0) !== next) {
            unget(next);
            break mainLoop;
          }
          formatIndex++;
        }
      }
      return fields;
    }function _sscanf(s, format, varargs) {
      // int sscanf(const char *restrict s, const char *restrict format, ... );
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/scanf.html
      var index = 0;
      var get = function() { return HEAP8[(((s)+(index++))|0)]; };
      var unget = function() { index--; };
      return __scanString(format, get, unget, varargs);
    }
  function __Z7catopenPKci() { throw 'catopen not implemented' }
  function __Z7catgetsP8_nl_catdiiPKc() { throw 'catgets not implemented' }
  function __Z8catcloseP8_nl_catd() { throw 'catclose not implemented' }
  function _newlocale(mask, locale, base) {
      return 0;
    }
  function _freelocale(locale) {}
  function ___ctype_b_loc() {
      // http://refspecs.freestandards.org/LSB_3.0.0/LSB-Core-generic/LSB-Core-generic/baselib---ctype-b-loc.html
      var me = ___ctype_b_loc;
      if (!me.ret) {
        var values = [
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,2,2,2,8195,8194,8194,8194,8194,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,24577,49156,49156,49156,
          49156,49156,49156,49156,49156,49156,49156,49156,49156,49156,49156,49156,55304,55304,55304,55304,55304,55304,55304,55304,
          55304,55304,49156,49156,49156,49156,49156,49156,49156,54536,54536,54536,54536,54536,54536,50440,50440,50440,50440,50440,
          50440,50440,50440,50440,50440,50440,50440,50440,50440,50440,50440,50440,50440,50440,50440,49156,49156,49156,49156,49156,
          49156,54792,54792,54792,54792,54792,54792,50696,50696,50696,50696,50696,50696,50696,50696,50696,50696,50696,50696,50696,
          50696,50696,50696,50696,50696,50696,50696,49156,49156,49156,49156,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        ];
        var i16size = 2;
        var arr = _malloc(values.length * i16size);
        for (var i = 0; i < values.length; i++) {
          HEAP16[(((arr)+(i * i16size))>>1)]=values[i]
        }
        me.ret = allocate([arr + 128 * i16size], 'i16*', ALLOC_NORMAL);
      }
      return me.ret;
    }
  function ___ctype_tolower_loc() {
      // http://refspecs.freestandards.org/LSB_3.1.1/LSB-Core-generic/LSB-Core-generic/libutil---ctype-tolower-loc.html
      var me = ___ctype_tolower_loc;
      if (!me.ret) {
        var values = [
          128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,
          158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,
          188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,
          218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,
          248,249,250,251,252,253,254,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,
          33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,97,98,99,100,101,102,103,
          104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,91,92,93,94,95,96,97,98,99,100,101,102,103,
          104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,
          134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,
          164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,
          194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,
          224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,
          254,255
        ];
        var i32size = 4;
        var arr = _malloc(values.length * i32size);
        for (var i = 0; i < values.length; i++) {
          HEAP32[(((arr)+(i * i32size))>>2)]=values[i]
        }
        me.ret = allocate([arr + 128 * i32size], 'i32*', ALLOC_NORMAL);
      }
      return me.ret;
    }
  function ___ctype_toupper_loc() {
      // http://refspecs.freestandards.org/LSB_3.1.1/LSB-Core-generic/LSB-Core-generic/libutil---ctype-toupper-loc.html
      var me = ___ctype_toupper_loc;
      if (!me.ret) {
        var values = [
          128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,
          158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,
          188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,
          218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,
          248,249,250,251,252,253,254,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,
          33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,
          73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,
          81,82,83,84,85,86,87,88,89,90,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,
          145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,
          175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,
          205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,
          235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255
        ];
        var i32size = 4;
        var arr = _malloc(values.length * i32size);
        for (var i = 0; i < values.length; i++) {
          HEAP32[(((arr)+(i * i32size))>>2)]=values[i]
        }
        me.ret = allocate([arr + 128 * i32size], 'i32*', ALLOC_NORMAL);
      }
      return me.ret;
    }
  var ___tm_struct_layout={__size__:44,tm_sec:0,tm_min:4,tm_hour:8,tm_mday:12,tm_mon:16,tm_year:20,tm_wday:24,tm_yday:28,tm_isdst:32,tm_gmtoff:36,tm_zone:40};
  function __isLeapYear(year) {
        return year%4 === 0 && (year%100 !== 0 || year%400 === 0);
    }
  function __arraySum(array, index) {
      var sum = 0;
      for (var i = 0; i <= index; sum += array[i++]);
      return sum;
    }
  var __MONTH_DAYS_LEAP=[31,29,31,30,31,30,31,31,30,31,30,31];
  var __MONTH_DAYS_REGULAR=[31,28,31,30,31,30,31,31,30,31,30,31];function __addDays(date, days) {
      var newDate = new Date(date.getTime());
      while(days > 0) {
        var leap = __isLeapYear(newDate.getFullYear());
        var currentMonth = newDate.getMonth();
        var daysInCurrentMonth = (leap ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR)[currentMonth];
        if (days > daysInCurrentMonth-newDate.getDate()) {
          // we spill over to next month
          days -= (daysInCurrentMonth-newDate.getDate()+1);
          newDate.setDate(1);
          if (currentMonth < 11) {
            newDate.setMonth(currentMonth+1)
          } else {
            newDate.setMonth(0);
            newDate.setFullYear(newDate.getFullYear()+1);
          }
        } else {
          // we stay in current month 
          newDate.setDate(newDate.getDate()+days);
          return newDate;
        }
      }
      return newDate;
    }function _strftime(s, maxsize, format, tm) {
      // size_t strftime(char *restrict s, size_t maxsize, const char *restrict format, const struct tm *restrict timeptr);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/strftime.html
      var date = {
        tm_sec: HEAP32[(((tm)+(___tm_struct_layout.tm_sec))>>2)],
        tm_min: HEAP32[(((tm)+(___tm_struct_layout.tm_min))>>2)],
        tm_hour: HEAP32[(((tm)+(___tm_struct_layout.tm_hour))>>2)],
        tm_mday: HEAP32[(((tm)+(___tm_struct_layout.tm_mday))>>2)],
        tm_mon: HEAP32[(((tm)+(___tm_struct_layout.tm_mon))>>2)],
        tm_year: HEAP32[(((tm)+(___tm_struct_layout.tm_year))>>2)],
        tm_wday: HEAP32[(((tm)+(___tm_struct_layout.tm_wday))>>2)],
        tm_yday: HEAP32[(((tm)+(___tm_struct_layout.tm_yday))>>2)],
        tm_isdst: HEAP32[(((tm)+(___tm_struct_layout.tm_isdst))>>2)]
      };
      var pattern = Pointer_stringify(format);
      // expand format
      var EXPANSION_RULES_1 = {
        '%c': '%a %b %d %H:%M:%S %Y',     // Replaced by the locale's appropriate date and time representation - e.g., Mon Aug  3 14:02:01 2013
        '%D': '%m/%d/%y',                 // Equivalent to %m / %d / %y
        '%F': '%Y-%m-%d',                 // Equivalent to %Y - %m - %d
        '%h': '%b',                       // Equivalent to %b
        '%r': '%I:%M:%S %p',              // Replaced by the time in a.m. and p.m. notation
        '%R': '%H:%M',                    // Replaced by the time in 24-hour notation
        '%T': '%H:%M:%S',                 // Replaced by the time
        '%x': '%m/%d/%y',                 // Replaced by the locale's appropriate date representation
        '%X': '%H:%M:%S',                 // Replaced by the locale's appropriate date representation
      };
      for (var rule in EXPANSION_RULES_1) {
        pattern = pattern.replace(new RegExp(rule, 'g'), EXPANSION_RULES_1[rule]);
      }
      var WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      var leadingSomething = function(value, digits, character) {
        var str = typeof value === 'number' ? value.toString() : (value || '');
        while (str.length < digits) {
          str = character[0]+str;
        }
        return str;
      };
      var leadingNulls = function(value, digits) {
        return leadingSomething(value, digits, '0');
      };
      var compareByDay = function(date1, date2) {
        var sgn = function(value) {
          return value < 0 ? -1 : (value > 0 ? 1 : 0);
        };
        var compare;
        if ((compare = sgn(date1.getFullYear()-date2.getFullYear())) === 0) {
          if ((compare = sgn(date1.getMonth()-date2.getMonth())) === 0) {
            compare = sgn(date1.getDate()-date2.getDate());
          }
        }
        return compare;
      };
      var getFirstWeekStartDate = function(janFourth) {
          switch (janFourth.getDay()) {
            case 0: // Sunday
              return new Date(janFourth.getFullYear()-1, 11, 29);
            case 1: // Monday
              return janFourth;
            case 2: // Tuesday
              return new Date(janFourth.getFullYear(), 0, 3);
            case 3: // Wednesday
              return new Date(janFourth.getFullYear(), 0, 2);
            case 4: // Thursday
              return new Date(janFourth.getFullYear(), 0, 1);
            case 5: // Friday
              return new Date(janFourth.getFullYear()-1, 11, 31);
            case 6: // Saturday
              return new Date(janFourth.getFullYear()-1, 11, 30);
          }
      };
      var getWeekBasedYear = function(date) {
          var thisDate = __addDays(new Date(date.tm_year+1900, 0, 1), date.tm_yday);
          var janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4);
          var janFourthNextYear = new Date(thisDate.getFullYear()+1, 0, 4);
          var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
          var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
          if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
            // this date is after the start of the first week of this year
            if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
              return thisDate.getFullYear()+1;
            } else {
              return thisDate.getFullYear();
            }
          } else { 
            return thisDate.getFullYear()-1;
          }
      };
      var EXPANSION_RULES_2 = {
        '%a': function(date) {
          return WEEKDAYS[date.tm_wday].substring(0,3);
        },
        '%A': function(date) {
          return WEEKDAYS[date.tm_wday];
        },
        '%b': function(date) {
          return MONTHS[date.tm_mon].substring(0,3);
        },
        '%B': function(date) {
          return MONTHS[date.tm_mon];
        },
        '%C': function(date) {
          var year = date.tm_year+1900;
          return leadingNulls(Math.floor(year/100),2);
        },
        '%d': function(date) {
          return leadingNulls(date.tm_mday, 2);
        },
        '%e': function(date) {
          return leadingSomething(date.tm_mday, 2, ' ');
        },
        '%g': function(date) {
          // %g, %G, and %V give values according to the ISO 8601:2000 standard week-based year. 
          // In this system, weeks begin on a Monday and week 1 of the year is the week that includes 
          // January 4th, which is also the week that includes the first Thursday of the year, and 
          // is also the first week that contains at least four days in the year. 
          // If the first Monday of January is the 2nd, 3rd, or 4th, the preceding days are part of 
          // the last week of the preceding year; thus, for Saturday 2nd January 1999, 
          // %G is replaced by 1998 and %V is replaced by 53. If December 29th, 30th, 
          // or 31st is a Monday, it and any following days are part of week 1 of the following year. 
          // Thus, for Tuesday 30th December 1997, %G is replaced by 1998 and %V is replaced by 01.
          return getWeekBasedYear(date).toString().substring(2);
        },
        '%G': function(date) {
          return getWeekBasedYear(date);
        },
        '%H': function(date) {
          return leadingNulls(date.tm_hour, 2);
        },
        '%I': function(date) {
          return leadingNulls(date.tm_hour < 13 ? date.tm_hour : date.tm_hour-12, 2);
        },
        '%j': function(date) {
          // Day of the year (001-366)
          return leadingNulls(date.tm_mday+__arraySum(__isLeapYear(date.tm_year+1900) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, date.tm_mon-1), 3);
        },
        '%m': function(date) {
          return leadingNulls(date.tm_mon+1, 2);
        },
        '%M': function(date) {
          return leadingNulls(date.tm_min, 2);
        },
        '%n': function() {
          return '\n';
        },
        '%p': function(date) {
          if (date.tm_hour > 0 && date.tm_hour < 13) {
            return 'AM';
          } else {
            return 'PM';
          }
        },
        '%S': function(date) {
          return leadingNulls(date.tm_sec, 2);
        },
        '%t': function() {
          return '\t';
        },
        '%u': function(date) {
          var day = new Date(date.tm_year+1900, date.tm_mon+1, date.tm_mday, 0, 0, 0, 0);
          return day.getDay() || 7;
        },
        '%U': function(date) {
          // Replaced by the week number of the year as a decimal number [00,53]. 
          // The first Sunday of January is the first day of week 1; 
          // days in the new year before this are in week 0. [ tm_year, tm_wday, tm_yday]
          var janFirst = new Date(date.tm_year+1900, 0, 1);
          var firstSunday = janFirst.getDay() === 0 ? janFirst : __addDays(janFirst, 7-janFirst.getDay());
          var endDate = new Date(date.tm_year+1900, date.tm_mon, date.tm_mday);
          // is target date after the first Sunday?
          if (compareByDay(firstSunday, endDate) < 0) {
            // calculate difference in days between first Sunday and endDate
            var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth()-1)-31;
            var firstSundayUntilEndJanuary = 31-firstSunday.getDate();
            var days = firstSundayUntilEndJanuary+februaryFirstUntilEndMonth+endDate.getDate();
            return leadingNulls(Math.ceil(days/7), 2);
          }
          return compareByDay(firstSunday, janFirst) === 0 ? '01': '00';
        },
        '%V': function(date) {
          // Replaced by the week number of the year (Monday as the first day of the week) 
          // as a decimal number [01,53]. If the week containing 1 January has four 
          // or more days in the new year, then it is considered week 1. 
          // Otherwise, it is the last week of the previous year, and the next week is week 1. 
          // Both January 4th and the first Thursday of January are always in week 1. [ tm_year, tm_wday, tm_yday]
          var janFourthThisYear = new Date(date.tm_year+1900, 0, 4);
          var janFourthNextYear = new Date(date.tm_year+1901, 0, 4);
          var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
          var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
          var endDate = __addDays(new Date(date.tm_year+1900, 0, 1), date.tm_yday);
          if (compareByDay(endDate, firstWeekStartThisYear) < 0) {
            // if given date is before this years first week, then it belongs to the 53rd week of last year
            return '53';
          } 
          if (compareByDay(firstWeekStartNextYear, endDate) <= 0) {
            // if given date is after next years first week, then it belongs to the 01th week of next year
            return '01';
          }
          // given date is in between CW 01..53 of this calendar year
          var daysDifference;
          if (firstWeekStartThisYear.getFullYear() < date.tm_year+1900) {
            // first CW of this year starts last year
            daysDifference = date.tm_yday+32-firstWeekStartThisYear.getDate()
          } else {
            // first CW of this year starts this year
            daysDifference = date.tm_yday+1-firstWeekStartThisYear.getDate();
          }
          return leadingNulls(Math.ceil(daysDifference/7), 2);
        },
        '%w': function(date) {
          var day = new Date(date.tm_year+1900, date.tm_mon+1, date.tm_mday, 0, 0, 0, 0);
          return day.getDay();
        },
        '%W': function(date) {
          // Replaced by the week number of the year as a decimal number [00,53]. 
          // The first Monday of January is the first day of week 1; 
          // days in the new year before this are in week 0. [ tm_year, tm_wday, tm_yday]
          var janFirst = new Date(date.tm_year, 0, 1);
          var firstMonday = janFirst.getDay() === 1 ? janFirst : __addDays(janFirst, janFirst.getDay() === 0 ? 1 : 7-janFirst.getDay()+1);
          var endDate = new Date(date.tm_year+1900, date.tm_mon, date.tm_mday);
          // is target date after the first Monday?
          if (compareByDay(firstMonday, endDate) < 0) {
            var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth()-1)-31;
            var firstMondayUntilEndJanuary = 31-firstMonday.getDate();
            var days = firstMondayUntilEndJanuary+februaryFirstUntilEndMonth+endDate.getDate();
            return leadingNulls(Math.ceil(days/7), 2);
          }
          return compareByDay(firstMonday, janFirst) === 0 ? '01': '00';
        },
        '%y': function(date) {
          // Replaced by the last two digits of the year as a decimal number [00,99]. [ tm_year]
          return (date.tm_year+1900).toString().substring(2);
        },
        '%Y': function(date) {
          // Replaced by the year as a decimal number (for example, 1997). [ tm_year]
          return date.tm_year+1900;
        },
        '%z': function(date) {
          // Replaced by the offset from UTC in the ISO 8601:2000 standard format ( +hhmm or -hhmm ),
          // or by no characters if no timezone is determinable. 
          // For example, "-0430" means 4 hours 30 minutes behind UTC (west of Greenwich). 
          // If tm_isdst is zero, the standard time offset is used. 
          // If tm_isdst is greater than zero, the daylight savings time offset is used. 
          // If tm_isdst is negative, no characters are returned. 
          // FIXME: we cannot determine time zone (or can we?)
          return '';
        },
        '%Z': function(date) {
          // Replaced by the timezone name or abbreviation, or by no bytes if no timezone information exists. [ tm_isdst]
          // FIXME: we cannot determine time zone (or can we?)
          return '';
        },
        '%%': function() {
          return '%';
        }
      };
      for (var rule in EXPANSION_RULES_2) {
        if (pattern.indexOf(rule) >= 0) {
          pattern = pattern.replace(new RegExp(rule, 'g'), EXPANSION_RULES_2[rule](date));
        }
      }
      var bytes = intArrayFromString(pattern, false);
      if (bytes.length > maxsize) {
        return 0;
      } 
      writeArrayToMemory(bytes, s);
      return bytes.length-1;
    }var _strftime_l=_strftime;
  function _isspace(chr) {
      switch(chr) {
        case 32:
        case 9:
        case 10:
        case 11:
        case 12:
        case 13:
          return true;
        default:
          return false;
      };
    }
  function __parseInt64(str, endptr, base, min, max, unsign) {
      var isNegative = false;
      // Skip space.
      while (_isspace(HEAP8[(str)])) str++;
      // Check for a plus/minus sign.
      if (HEAP8[(str)] == 45) {
        str++;
        isNegative = true;
      } else if (HEAP8[(str)] == 43) {
        str++;
      }
      // Find base.
      var ok = false;
      var finalBase = base;
      if (!finalBase) {
        if (HEAP8[(str)] == 48) {
          if (HEAP8[((str+1)|0)] == 120 ||
              HEAP8[((str+1)|0)] == 88) {
            finalBase = 16;
            str += 2;
          } else {
            finalBase = 8;
            ok = true; // we saw an initial zero, perhaps the entire thing is just "0"
          }
        }
      } else if (finalBase==16) {
        if (HEAP8[(str)] == 48) {
          if (HEAP8[((str+1)|0)] == 120 ||
              HEAP8[((str+1)|0)] == 88) {
            str += 2;
          }
        }
      }
      if (!finalBase) finalBase = 10;
      start = str;
      // Get digits.
      var chr;
      while ((chr = HEAP8[(str)]) != 0) {
        var digit = parseInt(String.fromCharCode(chr), finalBase);
        if (isNaN(digit)) {
          break;
        } else {
          str++;
          ok = true;
        }
      }
      if (!ok) {
        ___setErrNo(ERRNO_CODES.EINVAL);
        return ((asm["setTempRet0"](0),0)|0);
      }
      // Set end pointer.
      if (endptr) {
        HEAP32[((endptr)>>2)]=str
      }
      try {
        var numberString = isNegative ? '-'+Pointer_stringify(start, str - start) : Pointer_stringify(start, str - start);
        i64Math.fromString(numberString, finalBase, min, max, unsign);
      } catch(e) {
        ___setErrNo(ERRNO_CODES.ERANGE); // not quite correct
      }
      return ((asm["setTempRet0"](((HEAP32[(((tempDoublePtr)+(4))>>2)])|0)),((HEAP32[((tempDoublePtr)>>2)])|0))|0);
    }function _strtoull(str, endptr, base) {
      return __parseInt64(str, endptr, base, 0, '18446744073709551615', true);  // ULONG_MAX.
    }var _strtoull_l=_strtoull;
  function _strtoll(str, endptr, base) {
      return __parseInt64(str, endptr, base, '-9223372036854775808', '9223372036854775807');  // LLONG_MIN, LLONG_MAX.
    }var _strtoll_l=_strtoll;
  function _uselocale(locale) {
      return 0;
    }
  function ___locale_mb_cur_max() { throw '__locale_mb_cur_max not implemented' }
  var _llvm_va_start=undefined;
  function _sprintf(s, format, varargs) {
      // int sprintf(char *restrict s, const char *restrict format, ...);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/printf.html
      return _snprintf(s, undefined, format, varargs);
    }function _asprintf(s, format, varargs) {
      return _sprintf(-s, format, varargs);
    }function _vasprintf(s, format, va_arg) {
      return _asprintf(s, format, HEAP32[((va_arg)>>2)]);
    }
  function _llvm_va_end() {}
  function _vsnprintf(s, n, format, va_arg) {
      return _snprintf(s, n, format, HEAP32[((va_arg)>>2)]);
    }
  function _vsprintf(s, format, va_arg) {
      return _sprintf(s, format, HEAP32[((va_arg)>>2)]);
    }
  function _vsscanf(s, format, va_arg) {
      return _sscanf(s, format, HEAP32[((va_arg)>>2)]);
    }
  function _time(ptr) {
      var ret = Math.floor(Date.now()/1000);
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret
      }
      return ret;
    }
  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) self.alloc(bytes);
      return ret;  // Previous break location.
    }
  function ___cxa_call_unexpected(exception) {
      Module.printErr('Unexpected exception thrown, this is not properly supported - aborting');
      ABORT = true;
      throw exception;
    }
  var Browser={mainLoop:{scheduler:null,shouldPause:false,paused:false,queue:[],pause:function () {
          Browser.mainLoop.shouldPause = true;
        },resume:function () {
          if (Browser.mainLoop.paused) {
            Browser.mainLoop.paused = false;
            Browser.mainLoop.scheduler();
          }
          Browser.mainLoop.shouldPause = false;
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        }},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers
        if (Browser.initted || ENVIRONMENT_IS_WORKER) return;
        Browser.initted = true;
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : console.log("warning: cannot create object URLs");
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
        var imagePlugin = {};
        imagePlugin['canHandle'] = function(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
        };
        imagePlugin['handle'] = function(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: Browser.getMimetype(name) });
              if (b.size !== byteArray.length) { // Safari bug #118630
                // Safari's Blob can only take an ArrayBuffer
                b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
              }
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          var img = new Image();
          img.onload = function() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
        var audioPlugin = {};
        audioPlugin['canHandle'] = function(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            Browser.safeSetTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
        // Canvas event setup
        var canvas = Module['canvas'];
        canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                    canvas['mozRequestPointerLock'] ||
                                    canvas['webkitRequestPointerLock'];
        canvas.exitPointerLock = document['exitPointerLock'] ||
                                 document['mozExitPointerLock'] ||
                                 document['webkitExitPointerLock'] ||
                                 function(){}; // no-op if function does not exist
        canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas;
        }
        document.addEventListener('pointerlockchange', pointerLockChange, false);
        document.addEventListener('mozpointerlockchange', pointerLockChange, false);
        document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
        if (Module['elementPointerLock']) {
          canvas.addEventListener("click", function(ev) {
            if (!Browser.pointerLock && canvas.requestPointerLock) {
              canvas.requestPointerLock();
              ev.preventDefault();
            }
          }, false);
        }
      },createContext:function (canvas, useWebGL, setInModule) {
        var ctx;
        try {
          if (useWebGL) {
            ctx = canvas.getContext('experimental-webgl', {
              alpha: false
            });
          } else {
            ctx = canvas.getContext('2d');
          }
          if (!ctx) throw ':(';
        } catch (e) {
          Module.print('Could not create canvas - ' + e);
          return null;
        }
        if (useWebGL) {
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
          // Warn on context loss
          canvas.addEventListener('webglcontextlost', function(event) {
            alert('WebGL context lost. You will need to reload the page.');
          }, false);
        }
        if (setInModule) {
          Module.ctx = ctx;
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function (lockPointer, resizeCanvas) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
        var canvas = Module['canvas'];
        function fullScreenChange() {
          Browser.isFullScreen = false;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement']) === canvas) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'];
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else if (Browser.resizeCanvas){
            Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
        }
        if (!Browser.fullScreenHandlersInstalled) {
          Browser.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
        }
        canvas.requestFullScreen = canvas['requestFullScreen'] ||
                                   canvas['mozRequestFullScreen'] ||
                                   (canvas['webkitRequestFullScreen'] ? function() { canvas['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
        canvas.requestFullScreen();
      },requestAnimationFrame:function (func) {
        if (!window.requestAnimationFrame) {
          window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                         window['mozRequestAnimationFrame'] ||
                                         window['webkitRequestAnimationFrame'] ||
                                         window['msRequestAnimationFrame'] ||
                                         window['oRequestAnimationFrame'] ||
                                         window['setTimeout'];
        }
        window.requestAnimationFrame(func);
      },safeCallback:function (func) {
        return function() {
          if (!ABORT) return func.apply(null, arguments);
        };
      },safeRequestAnimationFrame:function (func) {
        return Browser.requestAnimationFrame(function() {
          if (!ABORT) func();
        });
      },safeSetTimeout:function (func, timeout) {
        return setTimeout(function() {
          if (!ABORT) func();
        }, timeout);
      },safeSetInterval:function (func, timeout) {
        return setInterval(function() {
          if (!ABORT) func();
        }, timeout);
      },getMimetype:function (name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.substr(name.lastIndexOf('.')+1)];
      },getUserMedia:function (func) {
        if(!window.getUserMedia) {
          window.getUserMedia = navigator['getUserMedia'] ||
                                navigator['mozGetUserMedia'];
        }
        window.getUserMedia(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          // Workaround for Firefox bug 764498
          if (event.type != 'mousemove' &&
              ('mozMovementX' in event)) {
            Browser.mouseMovementX = Browser.mouseMovementY = 0;
          } else {
            Browser.mouseMovementX = Browser.getMovementX(event);
            Browser.mouseMovementY = Browser.getMovementY(event);
          }
          // check if SDL is available
          if (typeof SDL != "undefined") {
          	Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
          	Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
          } else {
          	// just add the mouse delta to the current absolut mouse position
          	// FIXME: ideally this should be clamped against the canvas size and zero
          	Browser.mouseX += Browser.mouseMovementX;
          	Browser.mouseY += Browser.mouseMovementY;
          }        
        } else {
          // Otherwise, calculate the movement based on the changes
          // in the coordinates.
          var rect = Module["canvas"].getBoundingClientRect();
          var x = event.pageX - (window.scrollX + rect.left);
          var y = event.pageY - (window.scrollY + rect.top);
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
          x = x * (cw / rect.width);
          y = y * (ch / rect.height);
          Browser.mouseMovementX = x - Browser.mouseX;
          Browser.mouseMovementY = y - Browser.mouseY;
          Browser.mouseX = x;
          Browser.mouseY = y;
        }
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function() {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        canvas.width = width;
        canvas.height = height;
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        var canvas = Module['canvas'];
        this.windowedWidth = canvas.width;
        this.windowedHeight = canvas.height;
        canvas.width = screen.width;
        canvas.height = screen.height;
        // check if SDL is available   
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        var canvas = Module['canvas'];
        canvas.width = this.windowedWidth;
        canvas.height = this.windowedHeight;
        // check if SDL is available       
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      }};
_llvm_eh_exception.buf = allocate(12, "void*", ALLOC_STATIC);
FS.staticInit();__ATINIT__.unshift({ func: function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() } });__ATMAIN__.push({ func: function() { FS.ignorePermissions = false } });__ATEXIT__.push({ func: function() { FS.quit() } });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;
___errno_state = Runtime.staticAlloc(4); HEAP32[((___errno_state)>>2)]=0;
_fgetc.ret = allocate([0], "i8", ALLOC_STATIC);
Module["requestFullScreen"] = function(lockPointer, resizeCanvas) { Browser.requestFullScreen(lockPointer, resizeCanvas) };
  Module["requestAnimationFrame"] = function(func) { Browser.requestAnimationFrame(func) };
  Module["pauseMainLoop"] = function() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function() { Browser.getUserMedia() }
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);
staticSealed = true; // seal the static portion of memory
STACK_MAX = STACK_BASE + 5242880;
DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);
assert(DYNAMIC_BASE < TOTAL_MEMORY); // Stack must fit in TOTAL_MEMORY; allocations from here on may enlarge TOTAL_MEMORY
 var ctlz_i8 = allocate([8,7,6,6,5,5,5,5,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_DYNAMIC);
 var cttz_i8 = allocate([8,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,7,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0], "i8", ALLOC_DYNAMIC);
var Math_min = Math.min;
function invoke_viiiii(index,a1,a2,a3,a4,a5) {
  try {
    Module["dynCall_viiiii"](index,a1,a2,a3,a4,a5);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_viiiiiii(index,a1,a2,a3,a4,a5,a6,a7) {
  try {
    Module["dynCall_viiiiiii"](index,a1,a2,a3,a4,a5,a6,a7);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_vi(index,a1) {
  try {
    Module["dynCall_vi"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_vii(index,a1,a2) {
  try {
    Module["dynCall_vii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_iii(index,a1,a2) {
  try {
    return Module["dynCall_iii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_iiiiii(index,a1,a2,a3,a4,a5) {
  try {
    return Module["dynCall_iiiiii"](index,a1,a2,a3,a4,a5);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_ii(index,a1) {
  try {
    return Module["dynCall_ii"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_iiii(index,a1,a2,a3) {
  try {
    return Module["dynCall_iiii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_viiiiif(index,a1,a2,a3,a4,a5,a6) {
  try {
    Module["dynCall_viiiiif"](index,a1,a2,a3,a4,a5,a6);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_viii(index,a1,a2,a3) {
  try {
    Module["dynCall_viii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_viiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8) {
  try {
    Module["dynCall_viiiiiiii"](index,a1,a2,a3,a4,a5,a6,a7,a8);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_v(index) {
  try {
    Module["dynCall_v"](index);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_iiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8) {
  try {
    return Module["dynCall_iiiiiiiii"](index,a1,a2,a3,a4,a5,a6,a7,a8);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_viiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9) {
  try {
    Module["dynCall_viiiiiiiii"](index,a1,a2,a3,a4,a5,a6,a7,a8,a9);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_viiiiiif(index,a1,a2,a3,a4,a5,a6,a7) {
  try {
    Module["dynCall_viiiiiif"](index,a1,a2,a3,a4,a5,a6,a7);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_viiiiii(index,a1,a2,a3,a4,a5,a6) {
  try {
    Module["dynCall_viiiiii"](index,a1,a2,a3,a4,a5,a6);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_iiiii(index,a1,a2,a3,a4) {
  try {
    return Module["dynCall_iiiii"](index,a1,a2,a3,a4);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_viiii(index,a1,a2,a3,a4) {
  try {
    Module["dynCall_viiii"](index,a1,a2,a3,a4);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function asmPrintInt(x, y) {
  Module.print('int ' + x + ',' + y);// + ' ' + new Error().stack);
}
function asmPrintFloat(x, y) {
  Module.print('float ' + x + ',' + y);// + ' ' + new Error().stack);
}
// EMSCRIPTEN_START_ASM
var asm=(function(global,env,buffer){"use asm";var a=new global.Int8Array(buffer);var b=new global.Int16Array(buffer);var c=new global.Int32Array(buffer);var d=new global.Uint8Array(buffer);var e=new global.Uint16Array(buffer);var f=new global.Uint32Array(buffer);var g=new global.Float32Array(buffer);var h=new global.Float64Array(buffer);var i=env.STACKTOP|0;var j=env.STACK_MAX|0;var k=env.tempDoublePtr|0;var l=env.ABORT|0;var m=env.cttz_i8|0;var n=env.ctlz_i8|0;var o=env._stdin|0;var p=env.__ZTVN10__cxxabiv117__class_type_infoE|0;var q=env.__ZTVN10__cxxabiv120__si_class_type_infoE|0;var r=env._stderr|0;var s=env._stdout|0;var t=env.___fsmu8|0;var u=env.___dso_handle|0;var v=+env.NaN;var w=+env.Infinity;var x=0;var y=0;var z=0;var A=0;var B=0,C=0,D=0,E=0,F=0.0,G=0,H=0,I=0,J=0.0;var K=0;var L=0;var M=0;var N=0;var O=0;var P=0;var Q=0;var R=0;var S=0;var T=0;var U=global.Math.floor;var V=global.Math.abs;var W=global.Math.sqrt;var X=global.Math.pow;var Y=global.Math.cos;var Z=global.Math.sin;var _=global.Math.tan;var $=global.Math.acos;var aa=global.Math.asin;var ab=global.Math.atan;var ac=global.Math.atan2;var ad=global.Math.exp;var ae=global.Math.log;var af=global.Math.ceil;var ag=global.Math.imul;var ah=env.abort;var ai=env.assert;var aj=env.asmPrintInt;var ak=env.asmPrintFloat;var al=env.min;var am=env.invoke_viiiii;var an=env.invoke_viiiiiii;var ao=env.invoke_vi;var ap=env.invoke_vii;var aq=env.invoke_iii;var ar=env.invoke_iiiiii;var as=env.invoke_ii;var at=env.invoke_iiii;var au=env.invoke_viiiiif;var av=env.invoke_viii;var aw=env.invoke_viiiiiiii;var ax=env.invoke_v;var ay=env.invoke_iiiiiiiii;var az=env.invoke_viiiiiiiii;var aA=env.invoke_viiiiiif;var aB=env.invoke_viiiiii;var aC=env.invoke_iiiii;var aD=env.invoke_viiii;var aE=env._llvm_lifetime_end;var aF=env.__scanString;var aG=env._pthread_mutex_lock;var aH=env.___cxa_end_catch;var aI=env._strtoull;var aJ=env.__isFloat;var aK=env._fflush;var aL=env.__isLeapYear;var aM=env._fwrite;var aN=env._send;var aO=env._isspace;var aP=env._read;var aQ=env.___cxa_guard_abort;var aR=env._newlocale;var aS=env.___gxx_personality_v0;var aT=env._pthread_cond_wait;var aU=env.___cxa_rethrow;var aV=env.___resumeException;var aW=env._llvm_va_end;var aX=env._vsscanf;var aY=env._snprintf;var aZ=env._fgetc;var a_=env._atexit;var a$=env.___cxa_free_exception;var a0=env.__Z8catcloseP8_nl_catd;var a1=env.___setErrNo;var a2=env._isxdigit;var a3=env._exit;var a4=env._sprintf;var a5=env.___ctype_b_loc;var a6=env._freelocale;var a7=env.__Z7catopenPKci;var a8=env._asprintf;var a9=env.___cxa_is_number_type;var ba=env.___cxa_does_inherit;var bb=env.___cxa_guard_acquire;var bc=env.___locale_mb_cur_max;var bd=env.___cxa_begin_catch;var be=env._recv;var bf=env.__parseInt64;var bg=env.__ZSt18uncaught_exceptionv;var bh=env.___cxa_call_unexpected;var bi=env.__exit;var bj=env._strftime;var bk=env.___cxa_throw;var bl=env._llvm_eh_exception;var bm=env._pread;var bn=env._sqrtf;var bo=env.__arraySum;var bp=env._sysconf;var bq=env.___cxa_find_matching_catch;var br=env.__formatString;var bs=env._pthread_cond_broadcast;var bt=env.__ZSt9terminatev;var bu=env._pthread_mutex_unlock;var bv=env._sbrk;var bw=env.___errno_location;var bx=env._strerror;var by=env._llvm_lifetime_start;var bz=env.___cxa_guard_release;var bA=env._ungetc;var bB=env._vsprintf;var bC=env._uselocale;var bD=env._vsnprintf;var bE=env._sscanf;var bF=env.___assert_fail;var bG=env._fread;var bH=env._abort;var bI=env._isdigit;var bJ=env._strtoll;var bK=env.__addDays;var bL=env.__reallyNegative;var bM=env.__Z7catgetsP8_nl_catdiiPKc;var bN=env._write;var bO=env.___cxa_allocate_exception;var bP=env.___cxa_pure_virtual;var bQ=env._vasprintf;var bR=env.___ctype_toupper_loc;var bS=env.___ctype_tolower_loc;var bT=env._pwrite;var bU=env._strerror_r;var bV=env._time;
// EMSCRIPTEN_START_FUNCS
function cc(a){a=a|0;var b=0;b=i;i=i+a|0;i=i+7>>3<<3;return b|0}function cd(){return i|0}function ce(a){a=a|0;i=a}function cf(a,b){a=a|0;b=b|0;if((x|0)==0){x=a;y=b}}function cg(b){b=b|0;a[k]=a[b];a[k+1|0]=a[b+1|0];a[k+2|0]=a[b+2|0];a[k+3|0]=a[b+3|0]}function ch(b){b=b|0;a[k]=a[b];a[k+1|0]=a[b+1|0];a[k+2|0]=a[b+2|0];a[k+3|0]=a[b+3|0];a[k+4|0]=a[b+4|0];a[k+5|0]=a[b+5|0];a[k+6|0]=a[b+6|0];a[k+7|0]=a[b+7|0]}function ci(a){a=a|0;K=a}function cj(a){a=a|0;L=a}function ck(a){a=a|0;M=a}function cl(a){a=a|0;N=a}function cm(a){a=a|0;O=a}function cn(a){a=a|0;P=a}function co(a){a=a|0;Q=a}function cp(a){a=a|0;R=a}function cq(a){a=a|0;S=a}function cr(a){a=a|0;T=a}function cs(){c[q+8>>2]=302;c[q+12>>2]=152;c[q+16>>2]=76;c[q+20>>2]=180;c[q+24>>2]=8;c[q+28>>2]=10;c[q+32>>2]=2;c[q+36>>2]=2;c[p+8>>2]=302;c[p+12>>2]=296;c[p+16>>2]=76;c[p+20>>2]=180;c[p+24>>2]=8;c[p+28>>2]=26;c[p+32>>2]=4;c[p+36>>2]=8;c[3468]=p+8;c[3470]=p+8;c[3472]=q+8;c[3476]=q+8;c[3480]=q+8;c[3484]=q+8;c[3488]=q+8;c[3492]=p+8;c[3526]=q+8;c[3530]=q+8;c[3594]=q+8;c[3598]=q+8;c[3618]=p+8;c[3620]=q+8;c[3656]=q+8;c[3660]=q+8;c[3696]=q+8;c[3700]=q+8;c[3720]=p+8;c[3722]=p+8;c[3724]=q+8;c[3728]=q+8;c[3732]=q+8;c[3736]=p+8;c[3738]=p+8;c[3740]=p+8;c[3742]=p+8;c[3744]=p+8;c[3746]=p+8;c[3748]=p+8;c[3774]=q+8;c[3778]=p+8;c[3780]=q+8;c[3784]=q+8;c[3788]=q+8;c[3792]=p+8;c[3794]=p+8;c[3796]=p+8;c[3798]=p+8;c[3832]=p+8;c[3834]=p+8;c[3836]=p+8;c[3838]=q+8;c[3842]=q+8;c[3846]=q+8;c[3850]=q+8;c[3854]=q+8;c[3858]=q+8;c[3862]=q+8;c[3866]=q+8;c[3870]=q+8;c[3874]=p+8;c[3876]=q+8;c[3880]=q+8;c[3884]=q+8;c[3888]=q+8}function ct(a){a=a|0;var b=0,d=0.0,e=0,f=0,h=0,i=0;b=c[3972]|0;if((b|0)==0){return}d=+(a|0);g[b+492>>2]=d;b=c[3972]|0;a=c[b+864>>2]|0;g[((a|0)==0?b:a)+492>>2]=d;a=c[3972]|0;b=2;while(1){e=c[a+864>>2]|0;f=b-1|0;if((e|0)==0){h=a;break}if((f|0)==0){h=e;break}else{a=e;b=f}}g[h+492>>2]=d;h=c[3972]|0;b=3;while(1){a=c[h+864>>2]|0;f=b-1|0;if((a|0)==0){i=h;break}if((f|0)==0){i=a;break}else{h=a;b=f}}g[i+492>>2]=d;return}function cu(a,d){a=a|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0;e=a;a=c[3972]|0;f=c[a+72>>2]|0;g=c[a+76>>2]|0;if((f|0)==(g|0)){h=0;return h|0}else{i=f;j=0}while(1){do{if((j|0)<(d|0)){if((b[i+16>>1]|0)==0){k=j;break}b[e+(j<<2)>>1]=b[i+8>>1]|0;b[e+(j<<2)+2>>1]=b[i+10>>1]|0;k=j+1|0}else{k=j}}while(0);f=i+28|0;if((f|0)==(g|0)){h=k;break}else{i=f;j=k}}return h|0}function cv(a,d){a=a|0;d=d|0;var e=0,f=0,h=0,i=0,j=0,k=0,l=0;e=a;a=c[3972]|0;f=c[a+72>>2]|0;h=c[a+76>>2]|0;if((f|0)==(h|0)){i=0;return i|0}else{j=f;k=0}while(1){do{if((k|0)<(d|0)){if((b[j+16>>1]|0)==0){l=k;break}b[e+(k<<2)>>1]=~~+g[j>>2];b[e+(k<<2)+2>>1]=~~+g[j+4>>2];l=k+1|0}else{l=k}}while(0);f=j+28|0;if((f|0)==(h|0)){i=l;break}else{j=f;k=l}}return i|0}function cw(b,d,e){b=b|0;d=d|0;e=+e;var f=0,h=0,j=0.0,k=0.0,l=0.0,m=0.0,n=0.0,o=0.0,p=0.0,q=0.0,r=0.0,s=0.0,t=0.0,u=0.0,v=0.0;f=i;h=d;d=i;i=i+8|0;c[d>>2]=c[h>>2];c[d+4>>2]=c[h+4>>2];j=+g[d>>2];k=+g[d+4>>2];l=+W(+(j*j+0.0+k*k));d=~~(j*2.0+l);m=+(((d|0)>-1?d:-d|0)|0)/e;d=~~(-0.0-j-k+l);j=+(((d|0)>-1?d:-d|0)|0)/e;d=~~(k*2.0+l);l=+(((d|0)>-1?d:-d|0)|0)/e;e=m<0.0?0.0:m;m=j<0.0?0.0:j;j=l<0.0?0.0:l;if(e>1.0){n=e/e;o=m/e;p=j/e}else{n=e;o=m;p=j}if(m>1.0){q=n/m;r=o/m;s=p/m}else{q=n;r=o;s=p}if(j>1.0){t=q/j;u=r/j;v=s/j}else{t=q;u=r;v=s}a[b|0]=~~(t*255.0);a[b+1|0]=~~(u*255.0);a[b+2|0]=~~(v*255.0);i=f;return}function cx(a,b){a=a|0;b=b|0;var d=0;c[a+680>>2]=b;d=c[a+520>>2]|0;if((d|0)==0){return a|0}else{cx(d,b)|0;return a|0}return 0}function cy(a,b){a=a|0;b=b|0;var d=0;c[a+684>>2]=b;d=c[a+520>>2]|0;if((d|0)==0){return a|0}else{cy(d,b)|0;return a|0}return 0}function cz(d,e){d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;f=i;i=i+16|0;g=f|0;h=f+8|0;j=h;k=d;d=c[3972]|0;l=c[d+72>>2]|0;m=c[d+76>>2]|0;if((l|0)==(m|0)){n=0;i=f;return n|0}d=g|0;o=l;l=0;while(1){do{if((l|0)<(e|0)){if((b[o+16>>1]|0)==0){p=l;break}q=o;r=c[q+4>>2]|0;c[h>>2]=c[q>>2];c[h+4>>2]=r;cw(g,j,10.0);r=k+(l*3|0)|0;a[r]=a[d]|0;a[r+1|0]=a[d+1|0]|0;a[r+2|0]=a[d+2|0]|0;p=l+1|0}else{p=l}}while(0);r=o+28|0;if((r|0)==(m|0)){n=p;break}else{o=r;l=p}}i=f;return n|0}function cA(a){a=a|0;var b=0;b=c[a+864>>2]|0;if((b|0)!=0){cA(b)|0}cC(a+164|0,a|0,a+24|0);return a|0}function cB(f,h,j){f=f|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0;k=i;i=i+56|0;l=k|0;m=k+8|0;n=k+32|0;o=c[3972]|0;do{if((o|0)==0){p=57}else{if((e[o>>1]|0|0)!=(j|0)){p=57;break}if((e[o+2>>1]|0|0)!=(h|0)){p=57;break}q=j&65535;r=h&65535}}while(0);if((p|0)==57){o=lX(868)|0;s=o;t=j&65535;b[l>>1]=t;u=h&65535;b[l+2>>1]=u;dq(s,l,4);c[3972]=s;s=o+164|0;cx(s,3)|0;s=(c[3972]|0)+164|0;cy(s,1)|0;g[(c[3972]|0)+492>>2]=20.0;s=c[3972]|0;o=c[s+864>>2]|0;g[((o|0)==0?s:o)+492>>2]=10.0;o=c[3972]|0;s=2;while(1){l=c[o+864>>2]|0;v=s-1|0;if((l|0)==0){w=o;break}if((v|0)==0){w=l;break}else{o=l;s=v}}g[w+492>>2]=10.0;w=c[3972]|0;s=3;while(1){o=c[w+864>>2]|0;v=s-1|0;if((o|0)==0){x=w;break}if((v|0)==0){x=o;break}else{w=o;s=v}}g[x+492>>2]=10.0;q=t;r=u}dp(m,f,j,h,h<<2);h=n|0;b[h>>1]=q;q=n+2|0;b[q>>1]=r;c[n+8>>2]=0;r=n+12|0;c[r>>2]=0;j=n+16|0;c[j>>2]=0;dn(n,n|0,0,0);f=c[m+4>>2]|0;u=c[m+20>>2]|0;t=b[h>>1]|0;L84:do{if(t<<16>>16!=0){h=b[q>>1]|0;x=c[n+20>>2]|0;s=(x|0)==0;w=(u|0)==0;v=c[n+4>>2]|0;o=u|0;l=h&65535;y=0;z=h;L86:while(1){if(z<<16>>16==0){A=0}else{B=x+(ag(v,y)|0)|0;C=ag(y,f)|0;D=0;while(1){if(s){p=78;break L86}if(w){p=80;break L86}E=o+((D<<2)+C)|0;a[B+D|0]=(d[E]|d[E+1|0]<<8|d[E+2|0]<<16|d[E+3|0]<<24)&255;E=D+1|0;if(E>>>0<l>>>0){D=E}else{A=h;break}}}D=y+1|0;if(D>>>0<(t&65535)>>>0){y=D;z=A}else{break L84}}if((p|0)==78){bF(1744,1432,355,6192)}else if((p|0)==80){bF(224,2776,19,3504)}}}while(0);p=c[3972]|0;A=p|0;cH(n,A);c4(A);n=c[p+864>>2]|0;if((n|0)!=0){t=A;A=n;while(1){n=A|0;dm(t,A);c4(n);f=c[A+864>>2]|0;if((f|0)==0){break}else{t=n;A=f}}}cA(p)|0;c[r>>2]=0;r=c[j>>2]|0;c[j>>2]=0;do{if((r|0)!=0){p=r+4|0;do{if(((I=c[p>>2]|0,c[p>>2]=I+ -1,I)|0)==1){A=r;bY[c[(c[A>>2]|0)+8>>2]&511](r);t=r+8|0;if(((I=c[t>>2]|0,c[t>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[A>>2]|0)+12>>2]&511](r)}}while(0);p=c[j>>2]|0;if((p|0)==0){break}A=p+4|0;if(((I=c[A>>2]|0,c[A>>2]=I+ -1,I)|0)!=1){break}A=p;bY[c[(c[A>>2]|0)+8>>2]&511](p);t=p+8|0;if(((I=c[t>>2]|0,c[t>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[A>>2]|0)+12>>2]&511](p)}}while(0);c[m+12>>2]=0;j=m+16|0;m=c[j>>2]|0;c[j>>2]=0;if((m|0)==0){i=k;return}r=m+4|0;do{if(((I=c[r>>2]|0,c[r>>2]=I+ -1,I)|0)==1){p=m;bY[c[(c[p>>2]|0)+8>>2]&511](m);A=m+8|0;if(((I=c[A>>2]|0,c[A>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[p>>2]|0)+12>>2]&511](m)}}while(0);m=c[j>>2]|0;if((m|0)==0){i=k;return}j=m+4|0;if(((I=c[j>>2]|0,c[j>>2]=I+ -1,I)|0)!=1){i=k;return}j=m;bY[c[(c[j>>2]|0)+8>>2]&511](m);r=m+8|0;if(((I=c[r>>2]|0,c[r>>2]=I+ -1,I)|0)!=1){i=k;return}bY[c[(c[j>>2]|0)+12>>2]&511](m);i=k;return}function cC(d,f,g){d=d|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,D=0,E=0,F=0,G=0,H=0,J=0,K=0;h=i;i=i+168|0;j=h|0;k=h+8|0;l=h+72|0;m=h+88|0;n=h+96|0;o=h+120|0;p=f|0;b[d+24>>1]=b[p>>1]|0;q=f+2|0;b[d+26>>1]=b[q>>1]|0;r=f+4|0;c[d+28>>2]=c[r>>2];s=c[f+12>>2]|0;t=c[f+16>>2]|0;if((t|0)!=0){u=t+4|0;I=c[u>>2]|0,c[u>>2]=I+1,I}c[d+36>>2]=s;s=d+40|0;u=c[s>>2]|0;c[s>>2]=t;do{if((u|0)!=0){t=u+4|0;if(((I=c[t>>2]|0,c[t>>2]=I+ -1,I)|0)!=1){break}t=u;bY[c[(c[t>>2]|0)+8>>2]&511](u);s=u+8|0;if(((I=c[s>>2]|0,c[s>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[t>>2]|0)+12>>2]&511](u)}}while(0);u=f+8|0;c[d+32>>2]=c[u>>2];t=f+20|0;c[d+44>>2]=c[t>>2];b[g+24>>1]=b[d+632>>1]|0;b[g+26>>1]=b[d+634>>1]|0;c[g+28>>2]=c[d+636>>2];s=c[d+644>>2]|0;v=c[d+648>>2]|0;if((v|0)!=0){w=v+4|0;I=c[w>>2]|0,c[w>>2]=I+1,I}c[g+36>>2]=s;s=g+40|0;w=c[s>>2]|0;c[s>>2]=v;do{if((w|0)!=0){v=w+4|0;if(((I=c[v>>2]|0,c[v>>2]=I+ -1,I)|0)!=1){break}v=w;bY[c[(c[v>>2]|0)+8>>2]&511](w);s=w+8|0;if(((I=c[s>>2]|0,c[s>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[v>>2]|0)+12>>2]&511](w)}}while(0);c[g+32>>2]=c[d+640>>2];c[g+44>>2]=c[d+652>>2];b[n>>1]=b[p>>1]|0;b[n+2>>1]=b[q>>1]|0;c[n+4>>2]=c[r>>2];c[n+8>>2]=c[t>>2];t=b[d+532>>1]|0;b[n+12>>1]=t;w=b[d+534>>1]|0;b[n+14>>1]=w;c[n+16>>2]=c[d+536>>2];c[n+20>>2]=c[d+552>>2];if((c[u>>2]|0)<=1){bF(1528,1904,110,4752)}if(t<<16>>16!=0){u=m|0;v=m+4|0;s=t&65535;t=w&65535;x=0;y=w;while(1){if(y<<16>>16==0){z=0}else{A=0;while(1){c[u>>2]=x;c[v>>2]=A;dl(n,m);B=A+1|0;if(B>>>0<t>>>0){A=B}else{z=w;break}}}A=x+1|0;if(A>>>0<s>>>0){x=A;y=z}else{break}}}z=d+48|0;y=z|0;x=b[y>>1]|0;s=d+50|0;w=b[s>>1]|0;t=d+188|0;b[y>>1]=b[t>>1]|0;y=d+190|0;b[s>>1]=b[y>>1]|0;b[t>>1]=x;b[y>>1]=w;w=d+52|0;y=d+192|0;x=c[w>>2]|0;c[w>>2]=c[y>>2];c[y>>2]=x;x=d+56|0;y=d+196|0;w=c[x>>2]|0;c[x>>2]=c[y>>2];c[y>>2]=w;w=d+68|0;y=d+208|0;x=c[w>>2]|0;c[w>>2]=c[y>>2];c[y>>2]=x;x=d+60|0;y=d+200|0;w=c[x>>2]|0;c[x>>2]=c[y>>2];c[y>>2]=w;w=d+204|0;y=c[w>>2]|0;x=d+64|0;c[w>>2]=c[x>>2];c[x>>2]=y;y=d+72|0;x=b[y>>1]|0;w=d+74|0;t=b[w>>1]|0;s=d+212|0;b[y>>1]=b[s>>1]|0;y=d+214|0;b[w>>1]=b[y>>1]|0;b[s>>1]=x;b[y>>1]=t;t=d+76|0;y=d+216|0;x=c[t>>2]|0;c[t>>2]=c[y>>2];c[y>>2]=x;x=d+80|0;y=d+220|0;t=c[x>>2]|0;c[x>>2]=c[y>>2];c[y>>2]=t;t=d+92|0;y=d+232|0;x=c[t>>2]|0;c[t>>2]=c[y>>2];c[y>>2]=x;x=d+84|0;y=d+224|0;t=c[x>>2]|0;c[x>>2]=c[y>>2];c[y>>2]=t;t=d+228|0;y=c[t>>2]|0;x=d+88|0;c[t>>2]=c[x>>2];c[x>>2]=y;cD(z,f,0);cE(d,g);y=d+512|0;x=d+516|0;C=e[y>>1]|e[y+2>>1]<<16;b[x>>1]=C&65535;b[x+2>>1]=C>>16;C=0;b[y>>1]=C&65535;b[y+2>>1]=C>>16;y=d+528|0;x=c[y>>2]|0;if(((x|0)%(c[d+680>>2]|0)|0|0)==0){cF(d,g);t=d+328|0;s=c[r>>2]|0;r=0;do{w=c[15764+(r<<3)>>2]|0;c[k+(r<<2)>>2]=(ag(c[15760+(r<<3)>>2]|0,s)|0)+w;r=r+1|0;}while(r>>>0<16);r=(e[p>>1]|0)-1|0;p=(e[q>>1]|0)-1|0;c[l>>2]=t;c[l+4>>2]=f;c[l+8>>2]=k;c[l+12>>2]=d+556;if((r|0)>=0){k=j|0;q=j+4|0;s=(p|0)<0;w=0;while(1){if(!s){m=0;while(1){c[k>>2]=w;c[q>>2]=m;cV(l,j);if((m|0)<(p|0)){m=m+1|0}else{break}}}if((w|0)<(r|0)){w=w+1|0}else{break}}}cN(t,z,g);cO(g,0);D=c[y>>2]|0}else{D=x}if(((D|0)%(c[d+684>>2]|0)|0|0)!=0){E=g+136|0;F=c[E>>2]|0;G=F+1|0;c[E>>2]=G;H=c[y>>2]|0;J=H+1|0;c[y>>2]=J;K=d|0;cH(f,K);i=h;return}cG(d,g);if((a[d+692|0]&1)==0){E=g+136|0;F=c[E>>2]|0;G=F+1|0;c[E>>2]=G;H=c[y>>2]|0;J=H+1|0;c[y>>2]=J;K=d|0;cH(f,K);i=h;return}b[o>>1]=b[g>>1]|0;b[o+2>>1]=b[g+2>>1]|0;c[o+4>>2]=c[g+4>>2];c[o+8>>2]=c[g+8>>2];D=o+12|0;c[D>>2]=c[g+12>>2];x=o+16|0;z=c[g+16>>2]|0;c[x>>2]=z;if((z|0)!=0){t=z+4|0;I=c[t>>2]|0,c[t>>2]=I+1,I}c[o+20>>2]=c[g+20>>2];t=o+24|0;z=c[g+48>>2]|0;c[t>>2]=z;c[o+28>>2]=c[g+96>>2];c[o+32>>2]=c[g+120>>2];c[o+36>>2]=c[g+136>>2];w=(c[g+52>>2]|0)-z|0;r=(w|0)/28|0;c[o+40>>2]=r;L190:do{if((w|0)>0){p=o|0;j=0;l=z;while(1){cJ(p,l+(j*28|0)|0);q=j+1|0;if((q|0)>=(r|0)){break L190}j=q;l=c[t>>2]|0}}}while(0);c[D>>2]=0;D=c[x>>2]|0;c[x>>2]=0;if((D|0)==0){E=g+136|0;F=c[E>>2]|0;G=F+1|0;c[E>>2]=G;H=c[y>>2]|0;J=H+1|0;c[y>>2]=J;K=d|0;cH(f,K);i=h;return}t=D+4|0;do{if(((I=c[t>>2]|0,c[t>>2]=I+ -1,I)|0)==1){r=D;bY[c[(c[r>>2]|0)+8>>2]&511](D);z=D+8|0;if(((I=c[z>>2]|0,c[z>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[r>>2]|0)+12>>2]&511](D)}}while(0);D=c[x>>2]|0;if((D|0)==0){E=g+136|0;F=c[E>>2]|0;G=F+1|0;c[E>>2]=G;H=c[y>>2]|0;J=H+1|0;c[y>>2]=J;K=d|0;cH(f,K);i=h;return}x=D+4|0;if(((I=c[x>>2]|0,c[x>>2]=I+ -1,I)|0)!=1){E=g+136|0;F=c[E>>2]|0;G=F+1|0;c[E>>2]=G;H=c[y>>2]|0;J=H+1|0;c[y>>2]=J;K=d|0;cH(f,K);i=h;return}x=D;bY[c[(c[x>>2]|0)+8>>2]&511](D);t=D+8|0;if(((I=c[t>>2]|0,c[t>>2]=I+ -1,I)|0)!=1){E=g+136|0;F=c[E>>2]|0;G=F+1|0;c[E>>2]=G;H=c[y>>2]|0;J=H+1|0;c[y>>2]=J;K=d|0;cH(f,K);i=h;return}bY[c[(c[x>>2]|0)+12>>2]&511](D);E=g+136|0;F=c[E>>2]|0;G=F+1|0;c[E>>2]=G;H=c[y>>2]|0;J=H+1|0;c[y>>2]=J;K=d|0;cH(f,K);i=h;return}function cD(a,d,e){a=a|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0;e=i;i=i+144|0;f=e|0;g=e+24|0;h=e+48|0;j=e+72|0;k=e+96|0;l=e+120|0;b[f>>1]=b[d>>1]|0;b[f+2>>1]=b[d+2>>1]|0;c[f+4>>2]=c[d+4>>2];c[f+8>>2]=c[d+8>>2];m=f+12|0;c[m>>2]=c[d+12>>2];n=f+16|0;o=c[d+16>>2]|0;c[n>>2]=o;if((o|0)!=0){p=o+4|0;I=c[p>>2]|0,c[p>>2]=I+1,I}c[f+20>>2]=c[d+20>>2];d=a|0;p=a|0;b[g>>1]=b[p>>1]|0;o=a+2|0;b[g+2>>1]=b[o>>1]|0;q=a+4|0;c[g+4>>2]=c[q>>2];r=a+8|0;c[g+8>>2]=c[r>>2];s=g+12|0;t=a+12|0;c[s>>2]=c[t>>2];u=g+16|0;v=a+16|0;w=c[v>>2]|0;c[u>>2]=w;if((w|0)!=0){x=w+4|0;I=c[x>>2]|0,c[x>>2]=I+1,I}x=a+20|0;c[g+20>>2]=c[x>>2];w=a+48|0;b[h>>1]=b[w>>1]|0;y=a+50|0;b[h+2>>1]=b[y>>1]|0;z=a+52|0;c[h+4>>2]=c[z>>2];A=a+56|0;c[h+8>>2]=c[A>>2];B=h+12|0;C=a+60|0;c[B>>2]=c[C>>2];D=h+16|0;E=a+64|0;F=c[E>>2]|0;c[D>>2]=F;if((F|0)!=0){G=F+4|0;I=c[G>>2]|0,c[G>>2]=I+1,I}G=a+68|0;c[h+20>>2]=c[G>>2];c3(f,g,h);c[B>>2]=0;B=c[D>>2]|0;c[D>>2]=0;do{if((B|0)!=0){h=B+4|0;do{if(((I=c[h>>2]|0,c[h>>2]=I+ -1,I)|0)==1){g=B;bY[c[(c[g>>2]|0)+8>>2]&511](B);f=B+8|0;if(((I=c[f>>2]|0,c[f>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[g>>2]|0)+12>>2]&511](B)}}while(0);h=c[D>>2]|0;if((h|0)==0){break}g=h+4|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}g=h;bY[c[(c[g>>2]|0)+8>>2]&511](h);f=h+8|0;if(((I=c[f>>2]|0,c[f>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[g>>2]|0)+12>>2]&511](h)}}while(0);c[s>>2]=0;s=c[u>>2]|0;c[u>>2]=0;do{if((s|0)!=0){D=s+4|0;do{if(((I=c[D>>2]|0,c[D>>2]=I+ -1,I)|0)==1){B=s;bY[c[(c[B>>2]|0)+8>>2]&511](s);h=s+8|0;if(((I=c[h>>2]|0,c[h>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[B>>2]|0)+12>>2]&511](s)}}while(0);D=c[u>>2]|0;if((D|0)==0){break}B=D+4|0;if(((I=c[B>>2]|0,c[B>>2]=I+ -1,I)|0)!=1){break}B=D;bY[c[(c[B>>2]|0)+8>>2]&511](D);h=D+8|0;if(((I=c[h>>2]|0,c[h>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[B>>2]|0)+12>>2]&511](D)}}while(0);c[m>>2]=0;m=c[n>>2]|0;c[n>>2]=0;do{if((m|0)!=0){u=m+4|0;do{if(((I=c[u>>2]|0,c[u>>2]=I+ -1,I)|0)==1){s=m;bY[c[(c[s>>2]|0)+8>>2]&511](m);D=m+8|0;if(((I=c[D>>2]|0,c[D>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[s>>2]|0)+12>>2]&511](m)}}while(0);u=c[n>>2]|0;if((u|0)==0){break}s=u+4|0;if(((I=c[s>>2]|0,c[s>>2]=I+ -1,I)|0)!=1){break}s=u;bY[c[(c[s>>2]|0)+8>>2]&511](u);D=u+8|0;if(((I=c[D>>2]|0,c[D>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[s>>2]|0)+12>>2]&511](u)}}while(0);b[j>>1]=b[p>>1]|0;b[j+2>>1]=b[o>>1]|0;c[j+4>>2]=c[q>>2];c[j+8>>2]=c[r>>2];r=j+12|0;c[r>>2]=c[t>>2];t=j+16|0;q=c[v>>2]|0;c[t>>2]=q;if((q|0)!=0){v=q+4|0;I=c[v>>2]|0,c[v>>2]=I+1,I}c[j+20>>2]=c[x>>2];x=a+24|0;b[k>>1]=b[x>>1]|0;b[k+2>>1]=b[a+26>>1]|0;c[k+4>>2]=c[a+28>>2];c[k+8>>2]=c[a+32>>2];v=k+12|0;c[v>>2]=c[a+36>>2];q=k+16|0;o=c[a+40>>2]|0;c[q>>2]=o;if((o|0)!=0){p=o+4|0;I=c[p>>2]|0,c[p>>2]=I+1,I}c[k+20>>2]=c[a+44>>2];b[l>>1]=b[w>>1]|0;b[l+2>>1]=b[y>>1]|0;c[l+4>>2]=c[z>>2];c[l+8>>2]=c[A>>2];A=l+12|0;c[A>>2]=c[C>>2];C=l+16|0;z=c[E>>2]|0;c[C>>2]=z;if((z|0)!=0){E=z+4|0;I=c[E>>2]|0,c[E>>2]=I+1,I}c[l+20>>2]=c[G>>2];c3(j,k,l);c[A>>2]=0;A=c[C>>2]|0;c[C>>2]=0;do{if((A|0)!=0){l=A+4|0;do{if(((I=c[l>>2]|0,c[l>>2]=I+ -1,I)|0)==1){k=A;bY[c[(c[k>>2]|0)+8>>2]&511](A);j=A+8|0;if(((I=c[j>>2]|0,c[j>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[k>>2]|0)+12>>2]&511](A)}}while(0);l=c[C>>2]|0;if((l|0)==0){break}k=l+4|0;if(((I=c[k>>2]|0,c[k>>2]=I+ -1,I)|0)!=1){break}k=l;bY[c[(c[k>>2]|0)+8>>2]&511](l);j=l+8|0;if(((I=c[j>>2]|0,c[j>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[k>>2]|0)+12>>2]&511](l)}}while(0);c[v>>2]=0;v=c[q>>2]|0;c[q>>2]=0;do{if((v|0)!=0){C=v+4|0;do{if(((I=c[C>>2]|0,c[C>>2]=I+ -1,I)|0)==1){A=v;bY[c[(c[A>>2]|0)+8>>2]&511](v);l=v+8|0;if(((I=c[l>>2]|0,c[l>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[A>>2]|0)+12>>2]&511](v)}}while(0);C=c[q>>2]|0;if((C|0)==0){break}A=C+4|0;if(((I=c[A>>2]|0,c[A>>2]=I+ -1,I)|0)!=1){break}A=C;bY[c[(c[A>>2]|0)+8>>2]&511](C);l=C+8|0;if(((I=c[l>>2]|0,c[l>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[A>>2]|0)+12>>2]&511](C)}}while(0);c[r>>2]=0;r=c[t>>2]|0;c[t>>2]=0;if((r|0)==0){c4(d);c4(x);i=e;return}q=r+4|0;do{if(((I=c[q>>2]|0,c[q>>2]=I+ -1,I)|0)==1){v=r;bY[c[(c[v>>2]|0)+8>>2]&511](r);C=r+8|0;if(((I=c[C>>2]|0,c[C>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[v>>2]|0)+12>>2]&511](r)}}while(0);r=c[t>>2]|0;if((r|0)==0){c4(d);c4(x);i=e;return}t=r+4|0;if(((I=c[t>>2]|0,c[t>>2]=I+ -1,I)|0)!=1){c4(d);c4(x);i=e;return}t=r;bY[c[(c[t>>2]|0)+8>>2]&511](r);q=r+8|0;if(((I=c[q>>2]|0,c[q>>2]=I+ -1,I)|0)!=1){c4(d);c4(x);i=e;return}bY[c[(c[t>>2]|0)+12>>2]&511](r);c4(d);c4(x);i=e;return}function cE(d,f){d=d|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0;g=i;i=i+312|0;h=g|0;j=g+8|0;k=g+16|0;l=g+24|0;m=g+144|0;n=g+208|0;o=g+272|0;p=f+12|0;q=c[p>>2]|0;r=f+4|0;s=f|0;t=f+8|0;l6(q|0,-1|0,ag((c[t>>2]<<1)+(e[s>>1]|0)|0,c[r>>2]|0)|0);a[f+132|0]=0;q=d+48|0;u=d+520|0;v=c[u>>2]|0;if((v|0)==0){w=0;x=0;y=0;z=0;A=0;B=0;C=0;D=0;E=0}else{F=v+512|0;G=e[F>>1]|e[F+2>>1]<<16;F=v+516|0;H=e[F>>1]|e[F+2>>1]<<16;F=b[v+632>>1]|0;J=b[v+634>>1]|0;K=c[v+636>>2]|0;L=c[v+648>>2]|0;if((L|0)!=0){M=L+4|0;I=c[M>>2]|0,c[M>>2]=I+1,I}w=F;x=J;y=K;z=L;A=c[v+652>>2]|0;B=G<<16>>16;C=G>>16;D=H>>16;E=H<<16>>16}H=c[d+528>>2]|0;G=c[d+680>>2]|0;v=d+604|0;L=c[v>>2]|0;K=c[d+688>>2]|0;b[l>>1]=b[s>>1]|0;J=f+2|0;b[l+2>>1]=b[J>>1]|0;c[l+4>>2]=c[r>>2];c[l+8>>2]=c[t>>2];F=l+12|0;c[F>>2]=c[p>>2];M=l+16|0;N=f+16|0;O=c[N>>2]|0;c[M>>2]=O;if((O|0)!=0){P=O+4|0;I=c[P>>2]|0,c[P>>2]=I+1,I}P=f+20|0;c[l+20>>2]=c[P>>2];O=f+48|0;Q=c[O>>2]|0;c[l+24>>2]=Q;R=f+96|0;c[l+28>>2]=c[R>>2];S=f+120|0;c[l+32>>2]=c[S>>2];T=f+136|0;c[l+36>>2]=c[T>>2];U=f+52|0;f=(c[U>>2]|0)-Q|0;Q=(f|0)/28|0;c[l+40>>2]=Q;c[l+44>>2]=q;c[l+48>>2]=d+188;b[l+52>>1]=b[d+24>>1]|0;b[l+54>>1]=b[d+26>>1]|0;c[l+56>>2]=c[d+28>>2];c[l+60>>2]=c[d+44>>2];b[l+64>>1]=b[d+532>>1]|0;b[l+66>>1]=b[d+534>>1]|0;c[l+68>>2]=c[d+536>>2];c[l+72>>2]=c[d+552>>2];b[l+76>>1]=w;b[l+78>>1]=x;c[l+80>>2]=y;c[l+84>>2]=A;c[l+88>>2]=H;c[l+92>>2]=B;c[l+96>>2]=C;c[l+100>>2]=E;c[l+104>>2]=D;c[l+108>>2]=G;c[l+112>>2]=L;c[l+116>>2]=K;if((f|0)>0){f=0;do{c$(l,f);f=f+1|0;}while((f|0)<(Q|0))}Q=c[d+620>>2]|0;f=d+612|0;l=d+608|0;l6(Q|0,0,ag((c[d+616>>2]<<1)+(e[l>>1]|0)|0,c[f>>2]|0)|0);Q=d+632|0;K=b[Q>>1]|0;L=K&65535;L329:do{if(K<<16>>16!=0){G=d+652|0;D=d+636|0;E=(e[d+634>>1]|0)-1|0;C=0;while(1){B=c[G>>2]|0;if((B|0)==0){break}H=B+(ag(c[D>>2]|0,C)|0)|0;B=H+(E<<3)|0;if(H>>>0<=B>>>0){A=H;do{H=A;c[H>>2]=-1007026176;c[H+4>>2]=-1007026176;A=A+8|0;}while(A>>>0<=B>>>0)}C=C+1|0;if(C>>>0>=L>>>0){break L329}}bF(1744,1432,355,6448)}}while(0);L=c[d+668>>2]|0;K=d+660|0;C=d+656|0;l6(L|0,0,ag((c[d+664>>2]<<1)+(e[C>>1]|0)|0,c[K>>2]|0)|0);L=c[v>>2]|0;b[m>>1]=b[s>>1]|0;b[m+2>>1]=b[J>>1]|0;c[m+4>>2]=c[r>>2];c[m+8>>2]=c[t>>2];t=m+12|0;c[t>>2]=c[p>>2];p=m+16|0;r=c[N>>2]|0;c[p>>2]=r;if((r|0)!=0){N=r+4|0;I=c[N>>2]|0,c[N>>2]=I+1,I}c[m+20>>2]=c[P>>2];P=c[O>>2]|0;c[m+24>>2]=P;c[m+28>>2]=c[R>>2];c[m+32>>2]=c[S>>2];c[m+36>>2]=c[T>>2];c[m+40>>2]=((c[U>>2]|0)-P|0)/28|0;P=b[l>>1]|0;b[m+44>>1]=P;U=d+610|0;T=b[U>>1]|0;b[m+46>>1]=T;c[m+48>>2]=c[f>>2];S=d+628|0;c[m+52>>2]=c[S>>2];c[m+56>>2]=L;if(P<<16>>16!=0){L=k|0;R=k+4|0;O=P&65535;P=T&65535;N=0;r=T;while(1){if(r<<16>>16==0){V=0}else{J=0;while(1){c[L>>2]=N;c[R>>2]=J;cZ(m,k);s=J+1|0;if(s>>>0<P>>>0){J=s}else{V=T;break}}}J=N+1|0;if(J>>>0<O>>>0){N=J;r=V}else{break}}}c[t>>2]=0;t=c[p>>2]|0;c[p>>2]=0;do{if((t|0)!=0){V=t+4|0;do{if(((I=c[V>>2]|0,c[V>>2]=I+ -1,I)|0)==1){r=t;bY[c[(c[r>>2]|0)+8>>2]&511](t);N=t+8|0;if(((I=c[N>>2]|0,c[N>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[r>>2]|0)+12>>2]&511](t)}}while(0);V=c[p>>2]|0;if((V|0)==0){break}r=V+4|0;if(((I=c[r>>2]|0,c[r>>2]=I+ -1,I)|0)!=1){break}r=V;bY[c[(c[r>>2]|0)+8>>2]&511](V);N=V+8|0;if(((I=c[N>>2]|0,c[N>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[r>>2]|0)+12>>2]&511](V)}}while(0);p=c[u>>2]|0;do{if((p|0)==0){b[o>>1]=b[l>>1]|0;b[o+2>>1]=b[U>>1]|0;c[o+4>>2]=c[f>>2];c[o+8>>2]=c[S>>2];u=b[Q>>1]|0;b[o+12>>1]=u;t=b[d+634>>1]|0;b[o+14>>1]=t;c[o+16>>2]=c[d+636>>2];c[o+20>>2]=c[d+652>>2];b[o+24>>1]=b[C>>1]|0;b[o+26>>1]=b[d+658>>1]|0;c[o+28>>2]=c[K>>2];c[o+32>>2]=c[d+676>>2];if(u<<16>>16==0){break}V=h|0;r=h+4|0;N=u&65535;u=t&65535;O=0;T=t;while(1){if(T<<16>>16==0){W=0}else{P=0;while(1){c[V>>2]=O;c[r>>2]=P;cX(o,h);k=P+1|0;if(k>>>0<u>>>0){P=k}else{W=t;break}}}P=O+1|0;if(P>>>0<N>>>0){O=P;T=W}else{break}}}else{T=b[C>>1]|0;O=b[d+658>>1]|0;N=c[K>>2]|0;t=c[d+672>>2]|0;u=(t|0)==0;if(!u){r=t+4|0;I=c[r>>2]|0,c[r>>2]=I+1,I}r=c[d+676>>2]|0;b[n>>1]=b[l>>1]|0;b[n+2>>1]=b[U>>1]|0;c[n+4>>2]=c[f>>2];c[n+8>>2]=c[S>>2];b[n+12>>1]=b[p+608>>1]|0;b[n+14>>1]=b[p+610>>1]|0;c[n+16>>2]=c[p+612>>2];c[n+20>>2]=c[p+628>>2];V=b[Q>>1]|0;b[n+24>>1]=V;P=b[d+634>>1]|0;b[n+26>>1]=P;c[n+28>>2]=c[d+636>>2];c[n+32>>2]=c[d+652>>2];b[n+36>>1]=b[p+632>>1]|0;b[n+38>>1]=b[p+634>>1]|0;c[n+40>>2]=c[p+636>>2];c[n+44>>2]=c[p+652>>2];b[n+48>>1]=T;b[n+50>>1]=O;c[n+52>>2]=N;c[n+56>>2]=r;if(V<<16>>16!=0){r=j|0;N=j+4|0;O=V&65535;V=P&65535;T=0;k=P;while(1){if(k<<16>>16==0){X=0}else{m=0;while(1){c[r>>2]=T;c[N>>2]=m;cY(n,j);R=m+1|0;if(R>>>0<V>>>0){m=R}else{X=P;break}}}m=T+1|0;if(m>>>0<O>>>0){T=m;k=X}else{break}}}if(u){break}k=t+4|0;if(((I=c[k>>2]|0,c[k>>2]=I+ -1,I)|0)!=1){break}k=t;bY[c[(c[k>>2]|0)+8>>2]&511](t);T=t+8|0;if(((I=c[T>>2]|0,c[T>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[k>>2]|0)+12>>2]&511](t)}}while(0);c[F>>2]=0;F=c[M>>2]|0;c[M>>2]=0;do{if((F|0)!=0){X=F+4|0;do{if(((I=c[X>>2]|0,c[X>>2]=I+ -1,I)|0)==1){j=F;bY[c[(c[j>>2]|0)+8>>2]&511](F);n=F+8|0;if(((I=c[n>>2]|0,c[n>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[j>>2]|0)+12>>2]&511](F)}}while(0);X=c[M>>2]|0;if((X|0)==0){break}t=X+4|0;if(((I=c[t>>2]|0,c[t>>2]=I+ -1,I)|0)!=1){break}t=X;bY[c[(c[t>>2]|0)+8>>2]&511](X);u=X+8|0;if(((I=c[u>>2]|0,c[u>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[t>>2]|0)+12>>2]&511](X)}}while(0);if((z|0)==0){i=g;return}M=z+4|0;if(((I=c[M>>2]|0,c[M>>2]=I+ -1,I)|0)!=1){i=g;return}M=z;bY[c[(c[M>>2]|0)+8>>2]&511](z);F=z+8|0;if(((I=c[F>>2]|0,c[F>>2]=I+ -1,I)|0)!=1){i=g;return}bY[c[(c[M>>2]|0)+12>>2]&511](z);i=g;return}function cF(d,f){d=d|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;g=c[d+568>>2]|0;h=d+560|0;l6(g|0,-1|0,ag((c[d+564>>2]<<1)+(e[d+556>>1]|0)|0,c[h>>2]|0)|0);g=c[f+16>>2]|0;i=(g|0)==0;if(!i){j=g+4|0;I=c[j>>2]|0,c[j>>2]=I+1,I}j=c[f+48>>2]|0;k=(c[f+52>>2]|0)-j|0;f=c[h>>2]|0;l=d+576|0;m=c[l>>2]|0;n=(k|0)/28|0;L418:do{if((k|0)>0){o=(m|0)==0;p=0;while(1){q=b[j+(p*28|0)+8>>1]|0;r=b[j+(p*28|0)+10>>1]|0;if(o){break}s=m+(ag(q,f)|0)|0;a[s+r|0]=0;t=r+1|0;u=m+(ag(q-1|0,f)|0)|0;a[u+t|0]=0;a[s+t|0]=0;v=m+(ag(q+1|0,f)|0)|0;a[v+t|0]=0;a[u+r|0]=0;a[v+r|0]=0;t=r-1|0;a[u+t|0]=0;a[s+t|0]=0;a[v+t|0]=0;p=p+1|0;if((p|0)>=(n|0)){break L418}}bF(224,2776,19,3504)}}while(0);do{if(!i){n=g+4|0;if(((I=c[n>>2]|0,c[n>>2]=I+ -1,I)|0)!=1){break}n=g;bY[c[(c[n>>2]|0)+8>>2]&511](g);f=g+8|0;if(((I=c[f>>2]|0,c[f>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[n>>2]|0)+12>>2]&511](g)}}while(0);g=c[d+520>>2]|0;do{if((g|0)==0){w=0}else{i=c[g+672>>2]|0;if((i|0)==0){w=0;break}n=i+4|0;I=c[n>>2]|0,c[n>>2]=I+1,I;w=i}}while(0);g=c[d+536>>2]|0;i=c[d+552>>2]|0;n=c[h>>2]|0;h=c[l>>2]|0;l=b[d+532>>1]|0;f=b[d+534>>1]|0;L435:do{if(l<<16>>16!=0){d=l&65535;m=(i|0)==0;j=i;k=(h|0)==0;p=f&65535;o=0;t=f;L437:while(1){if(t<<16>>16==0){x=0}else{v=ag(o,g)|0;s=h+(ag(o,n)|0)|0;u=0;while(1){if(m){y=464;break L437}if((c[j+((u<<2)+v)>>2]|0)>>>0<5){if(k){y=467;break L437}a[s+u|0]=0}r=u+1|0;if(r>>>0<p>>>0){u=r}else{x=f;break}}}u=o+1|0;if(u>>>0<d>>>0){o=u;t=x}else{break L435}}if((y|0)==464){bF(224,2776,19,3504)}else if((y|0)==467){bF(224,2776,19,3504)}}}while(0);if((w|0)==0){return}y=w+4|0;if(((I=c[y>>2]|0,c[y>>2]=I+ -1,I)|0)!=1){return}y=w;bY[c[(c[y>>2]|0)+8>>2]&511](w);x=w+8|0;if(((I=c[x>>2]|0,c[x>>2]=I+ -1,I)|0)!=1){return}bY[c[(c[y>>2]|0)+12>>2]&511](w);return}function cG(a,d){a=a|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0;e=i;i=i+72|0;f=e|0;if(((c[a+528>>2]|0)%(c[a+684>>2]|0)|0|0)!=0){i=e;return}g=c[a+604>>2]|0;b[f>>1]=b[d>>1]|0;b[f+2>>1]=b[d+2>>1]|0;c[f+4>>2]=c[d+4>>2];c[f+8>>2]=c[d+8>>2];h=f+12|0;c[h>>2]=c[d+12>>2];j=f+16|0;k=c[d+16>>2]|0;c[j>>2]=k;if((k|0)!=0){l=k+4|0;I=c[l>>2]|0,c[l>>2]=I+1,I}c[f+20>>2]=c[d+20>>2];l=c[d+48>>2]|0;c[f+24>>2]=l;c[f+28>>2]=c[d+96>>2];c[f+32>>2]=c[d+120>>2];c[f+36>>2]=c[d+136>>2];k=(c[d+52>>2]|0)-l|0;l=(k|0)/28|0;c[f+40>>2]=l;b[f+44>>1]=b[a+632>>1]|0;b[f+46>>1]=b[a+634>>1]|0;c[f+48>>2]=c[a+636>>2];c[f+52>>2]=c[a+652>>2];b[f+56>>1]=b[a+656>>1]|0;b[f+58>>1]=b[a+658>>1]|0;c[f+60>>2]=c[a+660>>2];c[f+64>>2]=c[a+676>>2];c[f+68>>2]=g;if((k|0)>0){k=0;do{cK(f,k);k=k+1|0;}while((k|0)<(l|0))}c[h>>2]=0;h=c[j>>2]|0;c[j>>2]=0;if((h|0)==0){i=e;return}l=h+4|0;do{if(((I=c[l>>2]|0,c[l>>2]=I+ -1,I)|0)==1){k=h;bY[c[(c[k>>2]|0)+8>>2]&511](h);f=h+8|0;if(((I=c[f>>2]|0,c[f>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[k>>2]|0)+12>>2]&511](h)}}while(0);h=c[j>>2]|0;if((h|0)==0){i=e;return}j=h+4|0;if(((I=c[j>>2]|0,c[j>>2]=I+ -1,I)|0)!=1){i=e;return}j=h;bY[c[(c[j>>2]|0)+8>>2]&511](h);l=h+8|0;if(((I=c[l>>2]|0,c[l>>2]=I+ -1,I)|0)!=1){i=e;return}bY[c[(c[j>>2]|0)+12>>2]&511](h);i=e;return}function cH(a,d){a=a|0;d=d|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0;f=a|0;g=b[f>>1]|0;if(g<<16>>16!=(b[d>>1]|0)){bF(2888,2840,33,3536)}h=a+2|0;if((b[h>>1]|0)!=(b[d+2>>1]|0)){bF(2888,2840,33,3536)}if((c[a+8>>2]|0)==(c[d+8>>2]|0)){i=c[d+12>>2]|0;j=c[a+12>>2]|0;k=ag(g&65535,c[a+4>>2]|0)|0;l5(i|0,j|0,k)|0;return}if(g<<16>>16==0){return}g=d+20|0;k=a+20|0;j=d+4|0;d=a+4|0;a=0;while(1){i=c[g>>2]|0;if((i|0)==0){l=514;break}m=c[k>>2]|0;if((m|0)==0){l=516;break}n=i+(ag(c[j>>2]|0,a)|0)|0;i=m+(ag(c[d>>2]|0,a)|0)|0;m=e[h>>1]|0;l5(n|0,i|0,m)|0;m=a+1|0;if(m>>>0<(e[f>>1]|0)>>>0){a=m}else{l=523;break}}if((l|0)==514){bF(1744,1432,340,6384)}else if((l|0)==516){bF(1744,1432,347,3424)}else if((l|0)==523){return}}function cI(a){a=a|0;bd(a|0)|0;bt()}function cJ(a,d){a=a|0;d=d|0;var f=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0.0,x=0.0;f=b[d+8>>1]|0;h=f<<16>>16;i=b[d+10>>1]|0;j=i<<16>>16;k=b[d+16>>1]|0;if(k<<16>>16==0){return}if(f<<16>>16<=-1){bF(1080,1008,17,5184)}if(!((h|0)<(e[a>>1]|0|0)&i<<16>>16>-1)){bF(1080,1008,17,5184)}if((j|0)>=(e[a+2>>1]|0|0)){bF(1080,1008,17,5184)}i=c[a+20>>2]|0;f=(i|0)==0;l=i;i=a+4|0;m=a+24|0;n=d|0;o=d+4|0;d=0;L530:while(1){p=(c[15696+(d<<3)>>2]|0)+h|0;q=(c[15700+(d<<3)>>2]|0)+j|0;if(f){r=532;break}s=c[i>>2]|0;t=c[l+(ag(s,p)|0)+(q<<2)>>2]|0;do{if((t|0)!=-1){u=c[l+(ag(s,p<<16>>16)|0)+(q<<16>>16<<2)>>2]|0;if((u|0)==-1){r=535;break L530}v=c[m>>2]|0;if((e[v+(u*28|0)+16>>1]|0)>>>0<=((k&65535)+2|0)>>>0){break}w=+g[n>>2]- +g[v+(u*28|0)>>2];x=+g[o>>2]- +g[v+(u*28|0)+4>>2];if(+W(+(w*w+0.0+x*x))<2.0){r=538;break L530}}}while(0);q=d+1|0;if((q|0)<8){d=q}else{r=544;break}}if((r|0)==544){return}else if((r|0)==535){bF(856,512,123,2920)}else if((r|0)==532){bF(1744,1432,333,3144)}else if((r|0)==538){if((c[a+40>>2]|0)>>>0<=t>>>0){bF(320,512,395,3616)}b[v+(t*28|0)+16>>1]=0;return}}function cK(a,d){a=a|0;d=d|0;var f=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0.0,o=0,p=0,q=0,r=0.0,s=0,t=0,u=0,v=0;f=c[a+24>>2]|0;h=f+(d*28|0)+16|0;do{if((e[h>>1]|0)>2){i=c[a+68>>2]|0;j=c[a+52>>2]|0;if((j|0)==0){bF(224,2776,19,3504)}k=b[f+(d*28|0)+10>>1]|0;l=b[f+(d*28|0)+8>>1]|0;m=j;j=(ag(c[a+48>>2]|0,(l<<16>>16|0)/(i|0)|0)|0)+(((k<<16>>16|0)/(i|0)|0)<<3)|0;n=+g[m+j>>2];if(n==-500.0){if(+g[m+(j+4)>>2]==-500.0){o=l;p=i;q=k;break}}r=+g[f+(d*28|0)>>2]-n;n=+g[f+(d*28|0)+4>>2]- +g[m+(j+4)>>2];if(+W(+(r*r+0.0+n*n))<=10.0){o=l;p=i;q=k;break}if((c[a+40>>2]|0)>>>0<=d>>>0){bF(320,512,395,3616)}b[h>>1]=0;return}else{o=b[f+(d*28|0)+8>>1]|0;p=c[a+68>>2]|0;q=b[f+(d*28|0)+10>>1]|0}}while(0);f=(o<<16>>16|0)/(p|0)|0;o=(q<<16>>16|0)/(p|0)|0;p=a+56|0;q=a+58|0;k=a+64|0;i=a+60|0;l=1;j=0;L563:while(1){m=(c[15696+(j<<3)>>2]|0)+f|0;s=(c[15700+(j<<3)>>2]|0)+o|0;do{if((m|0)>-1){if(!((m|0)<(e[p>>1]|0|0)&(s|0)>-1)){t=l;break}if((s|0)>=(e[q>>1]|0|0)){t=l;break}u=c[k>>2]|0;if((u|0)==0){v=564;break L563}t=(c[u+((ag(c[i>>2]|0,m)|0)+(s<<2))>>2]|0)==0&l}else{t=l}}while(0);s=j+1|0;if(s>>>0<8){l=t;j=s}else{break}}if((v|0)==564){bF(224,2776,19,3504)}if(!t){return}t=c[k>>2]|0;if((t|0)==0){bF(224,2776,19,3504)}if((c[t+((ag(c[i>>2]|0,f)|0)+(o<<2))>>2]|0)!=1){return}if((c[a+40>>2]|0)>>>0<=d>>>0){bF(320,512,395,3616)}b[h>>1]=0;return}function cL(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;d=a+8|0;e=c[d>>2]|0;f=a+4|0;g=c[f>>2]|0;h=g;if(e-h>>5>>>0>=b>>>0){i=b;j=g;do{if((j|0)==0){k=0}else{l6(j+16|0,-1|0,16);k=c[f>>2]|0}j=k+32|0;c[f>>2]=j;i=i-1|0;}while((i|0)!=0);return}i=a|0;j=c[i>>2]|0;k=(h-j>>5)+b|0;if(k>>>0>134217727){jz(a);l=c[d>>2]|0;m=c[i>>2]|0}else{l=e;m=j}j=m;m=l-j|0;if(m>>5>>>0>67108862){n=134217727;o=(c[f>>2]|0)-j>>5;p=588}else{l=m>>4;m=l>>>0<k>>>0?k:l;l=(c[f>>2]|0)-j>>5;if((m|0)==0){q=0;r=0;s=l}else{n=m;o=l;p=588}}if((p|0)==588){q=lX(n<<5)|0;r=n;s=o}o=q+(s<<5)|0;n=b;b=o;do{if((b|0)==0){t=0}else{l6(b+16|0,-1|0,16);t=b}b=t+32|0;n=n-1|0;}while((n|0)!=0);n=q+(r<<5)|0;r=c[i>>2]|0;t=c[f>>2]|0;if((t|0)==(r|0)){u=r;v=o}else{p=s-1-((t-32+(-r|0)|0)>>>5)|0;s=t;t=o;while(1){o=s-32|0;l=t-32|0;m=l;j=o;c[m>>2]=c[j>>2];c[m+4>>2]=c[j+4>>2];c[m+8>>2]=c[j+8>>2];c[m+12>>2]=c[j+12>>2];j=t-32+16|0;m=s-32+16|0;c[j>>2]=c[m>>2];c[j+4>>2]=c[m+4>>2];c[j+8>>2]=c[m+8>>2];c[j+12>>2]=c[m+12>>2];if((o|0)==(r|0)){break}else{s=o;t=l}}u=c[i>>2]|0;v=q+(p<<5)|0}c[i>>2]=v;c[f>>2]=b;c[d>>2]=n;if((u|0)==0){return}l_(u);return}function cM(a,d){a=a|0;d=d|0;var e=0,f=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;e=a+8|0;f=c[e>>2]|0;h=a+4|0;i=c[h>>2]|0;j=i;if(((f-j|0)/28|0)>>>0>=d>>>0){k=d;l=i;do{if((l|0)==0){m=0}else{g[l>>2]=0.0;g[l+4>>2]=0.0;b[l+16>>1]=0;b[l+18>>1]=0;m=c[h>>2]|0}l=m+28|0;c[h>>2]=l;k=k-1|0;}while((k|0)!=0);return}k=a|0;l=c[k>>2]|0;m=((j-l|0)/28|0)+d|0;if(m>>>0>153391689){jz(a);n=c[e>>2]|0;o=c[k>>2]|0}else{n=f;o=l}l=o;o=(n-l|0)/28|0;if(o>>>0>76695843){p=153391689;q=((c[h>>2]|0)-l|0)/28|0;r=612}else{n=o<<1;o=n>>>0<m>>>0?m:n;n=((c[h>>2]|0)-l|0)/28|0;if((o|0)==0){s=0;t=0;u=n}else{p=o;q=n;r=612}}if((r|0)==612){s=lX(p*28|0)|0;t=p;u=q}q=d;d=s+(u*28|0)|0;do{if((d|0)==0){v=0}else{g[d>>2]=0.0;g[d+4>>2]=0.0;b[d+16>>1]=0;b[d+18>>1]=0;v=d}d=v+28|0;q=q-1|0;}while((q|0)!=0);q=s+(t*28|0)|0;t=c[k>>2]|0;v=(c[h>>2]|0)-t|0;p=s+((((v|0)/-28|0)+u|0)*28|0)|0;u=p;s=t;l5(u|0,s|0,v)|0;c[k>>2]=p;c[h>>2]=d;c[e>>2]=q;if((t|0)==0){return}l_(s);return}function cN(d,f,g){d=d|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,J=0,K=0;h=i;i=i+120|0;j=h|0;k=h+8|0;l=h+16|0;m=h+48|0;n=h+56|0;o=h+104|0;p=c[d+64>>2]|0;q=d+56|0;l6(p|0,0,ag((c[d+60>>2]<<1)+(e[d+52>>1]|0)|0,c[q>>2]|0)|0);b[n>>1]=b[g>>1]|0;b[n+2>>1]=b[g+2>>1]|0;c[n+4>>2]=c[g+4>>2];c[n+8>>2]=c[g+8>>2];p=n+12|0;c[p>>2]=c[g+12>>2];r=n+16|0;s=c[g+16>>2]|0;c[r>>2]=s;if((s|0)!=0){t=s+4|0;I=c[t>>2]|0,c[t>>2]=I+1,I}c[n+20>>2]=c[g+20>>2];t=c[g+48>>2]|0;c[n+24>>2]=t;c[n+28>>2]=c[g+96>>2];c[n+32>>2]=c[g+120>>2];c[n+36>>2]=c[g+136>>2];c[n+40>>2]=((c[g+52>>2]|0)-t|0)/28|0;t=d+4|0;s=b[t>>1]|0;u=~~(+(s&65535|0)/3.0);v=d+6|0;w=b[v>>1]|0;x=~~(+(w&65535|0)/3.0);y=x&65535;c[o>>2]=d;c[o+4>>2]=f;c[o+8>>2]=n;if((u&65535)<<16>>16==0){z=s;A=w}else{w=m|0;s=m+4|0;n=u&65535;u=x&65535;x=0;B=y;while(1){if(B<<16>>16==0){C=0}else{D=0;while(1){c[w>>2]=x;c[s>>2]=D;cU(o,m);E=D+1|0;if(E>>>0<u>>>0){D=E}else{C=y;break}}}D=x+1|0;if(D>>>0<n>>>0){x=D;B=C}else{break}}z=b[t>>1]|0;A=b[v>>1]|0}v=(z&65535)-1|0;z=(A&65535)-1|0;L663:do{if((v|0)>=0){A=k;t=j|0;C=j+4|0;B=(z|0)<0;x=d+72|0;n=0;L665:while(1){L667:do{if(!B){y=n;u=0;m=n<<16>>16;o=c[x>>2]|0;if((o|0)==0){F=674;break L665}else{G=0;H=u;J=y;K=o}while(1){if((a[K+((ag(c[q>>2]|0,n)|0)+G)|0]|0)!=0){c[k>>2]=J;c[k+4>>2]=H;c[t>>2]=m;c[C>>2]=G<<16>>16;cT(l,f,j);cS(g,A,l)}o=G+1|0;if((G|0)>=(z|0)){break L667}s=c[x>>2]|0;if((s|0)==0){F=673;break L665}G=o;H=o|u;J=y|0;K=s}}}while(0);if((n|0)<(v|0)){n=n+1|0}else{break L663}}if((F|0)==673){bF(1744,1432,326,5832)}else if((F|0)==674){bF(1744,1432,326,5832)}}}while(0);c[p>>2]=0;p=c[r>>2]|0;c[r>>2]=0;if((p|0)==0){i=h;return}F=p+4|0;do{if(((I=c[F>>2]|0,c[F>>2]=I+ -1,I)|0)==1){v=p;bY[c[(c[v>>2]|0)+8>>2]&511](p);K=p+8|0;if(((I=c[K>>2]|0,c[K>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[v>>2]|0)+12>>2]&511](p)}}while(0);p=c[r>>2]|0;if((p|0)==0){i=h;return}r=p+4|0;if(((I=c[r>>2]|0,c[r>>2]=I+ -1,I)|0)!=1){i=h;return}r=p;bY[c[(c[r>>2]|0)+8>>2]&511](p);F=p+8|0;if(((I=c[F>>2]|0,c[F>>2]=I+ -1,I)|0)!=1){i=h;return}bY[c[(c[r>>2]|0)+12>>2]&511](p);i=h;return}function cO(d,e){d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0;a[d+132|0]=1;e=d+120|0;f=d+48|0;g=d+52|0;h=f|0;i=((c[g>>2]|0)-(c[h>>2]|0)|0)/28|0;j=d+124|0;k=c[j>>2]|0;l=e|0;m=c[l>>2]|0;n=k-m>>2;do{if(n>>>0<i>>>0){cP(e,i-n|0);o=c[l>>2]|0;p=c[j>>2]|0}else{if(n>>>0<=i>>>0){o=m;p=k;break}q=m+(i<<2)|0;if((q|0)==(k|0)){o=m;p=k;break}r=k+(~((k-4+(-q|0)|0)>>>2)<<2)|0;c[j>>2]=r;o=m;p=r}}while(0);m=p-o|0;if((m|0)>0){p=m>>2;m=-p|0;l6(o|0,-1|0,(p+((m|0)>-1?m:1073741823)<<2)+4|0)}m=c[h>>2]|0;p=d+96|0;o=p|0;j=c[o>>2]|0;k=c[g>>2]|0;L710:do{if((m|0)==(k|0)){s=m;t=j;u=m;v=m}else{i=d+20|0;n=d+4|0;e=m;r=j;q=m;w=j;x=m;y=k;while(1){if((b[e+16>>1]|0)==0){z=w;A=q;B=x;C=y}else{D=q+28|0;E=q;F=e;c[E>>2]=c[F>>2];c[E+4>>2]=c[F+4>>2];c[E+8>>2]=c[F+8>>2];c[E+12>>2]=c[F+12>>2];c[E+16>>2]=c[F+16>>2];c[E+20>>2]=c[F+20>>2];c[E+24>>2]=c[F+24>>2];F=w;E=r;c[F>>2]=c[E>>2];c[F+4>>2]=c[E+4>>2];c[F+8>>2]=c[E+8>>2];c[F+12>>2]=c[E+12>>2];E=w+16|0;F=r+16|0;c[E>>2]=c[F>>2];c[E+4>>2]=c[F+4>>2];c[E+8>>2]=c[F+8>>2];c[E+12>>2]=c[F+12>>2];F=c[h>>2]|0;E=((D-F|0)/28|0)-1|0;G=e+8|0;H=e+10|0;I=c[i>>2]|0;if((I|0)==0){J=686;break}K=b[H>>1]|0;c[I+(ag(c[n>>2]|0,b[G>>1]|0)|0)+(K<<2)>>2]=E;c[(c[l>>2]|0)+(((e-F|0)/28|0)<<2)>>2]=E;E=b[G>>1]|0;G=b[H>>1]|0;H=c[i>>2]|0;if((H|0)==0){J=688;break}F=c[H+(ag(c[n>>2]|0,E<<16>>16)|0)+(G<<16>>16<<2)>>2]|0;H=c[h>>2]|0;if((b[H+(F*28|0)+8>>1]|0)!=E<<16>>16){J=705;break}if((b[H+(F*28|0)+10>>1]|0)!=G<<16>>16){J=706;break}z=w+32|0;A=D;B=H;C=c[g>>2]|0}H=e+28|0;if((H|0)==(C|0)){s=A;t=z;u=B;v=C;break L710}else{e=H;r=r+32|0;q=A;w=z;x=B;y=C}}if((J|0)==686){bF(1744,1432,326,5464)}else if((J|0)==688){bF(1744,1432,326,5464)}else if((J|0)==705){bF(2536,512,241,4984)}else if((J|0)==706){bF(2536,512,241,4984)}}}while(0);J=u;C=(s-J|0)/28|0;s=(v-J|0)/28|0;do{if(s>>>0<C>>>0){cM(f,C-s|0)}else{if(s>>>0<=C>>>0){break}J=u+(C*28|0)|0;if((J|0)==(v|0)){break}c[g>>2]=v+(~(((v-28+(-J|0)|0)>>>0)/28|0)*28|0)}}while(0);v=c[o>>2]|0;o=v;g=t-o>>5;t=d+100|0;d=c[t>>2]|0;C=d-o>>5;if(C>>>0<g>>>0){cL(p,g-C|0);return}if(C>>>0<=g>>>0){return}C=v+(g<<5)|0;if((C|0)==(d|0)){return}c[t>>2]=d+(~((d-32+(-C|0)|0)>>>5)<<5);return}function cP(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;d=a+8|0;e=c[d>>2]|0;f=a+4|0;g=c[f>>2]|0;h=g;if(e-h>>2>>>0>=b>>>0){i=b;j=g;do{if((j|0)==0){k=0}else{c[j>>2]=0;k=c[f>>2]|0}j=k+4|0;c[f>>2]=j;i=i-1|0;}while((i|0)!=0);return}i=a|0;j=c[i>>2]|0;k=(h-j>>2)+b|0;if(k>>>0>1073741823){jz(a);l=c[d>>2]|0;m=c[i>>2]|0}else{l=e;m=j}j=m;m=l-j|0;if(m>>2>>>0>536870910){n=1073741823;o=(c[f>>2]|0)-j>>2;p=720}else{l=m>>1;m=l>>>0<k>>>0?k:l;l=(c[f>>2]|0)-j>>2;if((m|0)==0){q=0;r=0;s=l}else{n=m;o=l;p=720}}if((p|0)==720){q=lX(n<<2)|0;r=n;s=o}o=b;b=q+(s<<2)|0;do{if((b|0)==0){t=0}else{c[b>>2]=0;t=b}b=t+4|0;o=o-1|0;}while((o|0)!=0);o=q+(r<<2)|0;r=c[i>>2]|0;t=(c[f>>2]|0)-r|0;n=q+(s-(t>>2)<<2)|0;s=n;q=r;l5(s|0,q|0,t)|0;c[i>>2]=n;c[f>>2]=b;c[d>>2]=o;if((r|0)==0){return}l_(q);return}function cQ(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;d=a+4|0;e=a|0;f=c[e>>2]|0;g=((c[d>>2]|0)-f>>5)+1|0;if(g>>>0>134217727){jz(a);h=c[e>>2]|0}else{h=f}f=a+8|0;a=h;i=(c[f>>2]|0)-a|0;if(i>>5>>>0>67108862){j=c[d>>2]|0;k=134217727;l=j;m=j-a>>5;n=736}else{j=i>>4;i=j>>>0<g>>>0?g:j;j=c[d>>2]|0;g=j-a>>5;if((i|0)==0){o=0;p=0;q=j;r=g}else{k=i;l=j;m=g;n=736}}if((n|0)==736){o=lX(k<<5)|0;p=k;q=l;r=m}m=o+(r<<5)|0;l=o+(p<<5)|0;if((m|0)!=0){p=m;k=b;c[p>>2]=c[k>>2];c[p+4>>2]=c[k+4>>2];c[p+8>>2]=c[k+8>>2];c[p+12>>2]=c[k+12>>2];k=o+(r<<5)+16|0;p=b+16|0;c[k>>2]=c[p>>2];c[k+4>>2]=c[p+4>>2];c[k+8>>2]=c[p+8>>2];c[k+12>>2]=c[p+12>>2]}p=o+(r+1<<5)|0;if((q|0)==(h|0)){s=h;t=m}else{k=r-1-((q-32+(-a|0)|0)>>>5)|0;a=q;q=m;while(1){m=a-32|0;r=q-32|0;b=r;n=m;c[b>>2]=c[n>>2];c[b+4>>2]=c[n+4>>2];c[b+8>>2]=c[n+8>>2];c[b+12>>2]=c[n+12>>2];n=q-32+16|0;b=a-32+16|0;c[n>>2]=c[b>>2];c[n+4>>2]=c[b+4>>2];c[n+8>>2]=c[b+8>>2];c[n+12>>2]=c[b+12>>2];if((m|0)==(h|0)){break}else{a=m;q=r}}s=c[e>>2]|0;t=o+(k<<5)|0}c[e>>2]=t;c[d>>2]=p;c[f>>2]=l;if((s|0)==0){return}l_(s);return}function cR(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;d=a+4|0;e=a|0;f=c[e>>2]|0;g=(((c[d>>2]|0)-f|0)/28|0)+1|0;if(g>>>0>153391689){jz(a);h=c[e>>2]|0}else{h=f}f=a+8|0;a=h;i=((c[f>>2]|0)-a|0)/28|0;if(i>>>0>76695843){j=(c[d>>2]|0)-a|0;k=153391689;l=j;m=(j|0)/28|0;n=753}else{j=i<<1;i=j>>>0<g>>>0?g:j;j=(c[d>>2]|0)-a|0;a=(j|0)/28|0;if((i|0)==0){o=0;p=0;q=j;r=a}else{k=i;l=j;m=a;n=753}}if((n|0)==753){o=lX(k*28|0)|0;p=k;q=l;r=m}m=o+(r*28|0)|0;l=o+(p*28|0)|0;if((m|0)!=0){p=m;m=b;c[p>>2]=c[m>>2];c[p+4>>2]=c[m+4>>2];c[p+8>>2]=c[m+8>>2];c[p+12>>2]=c[m+12>>2];c[p+16>>2]=c[m+16>>2];c[p+20>>2]=c[m+20>>2];c[p+24>>2]=c[m+24>>2]}m=o+((r+1|0)*28|0)|0;p=o+((((q|0)/-28|0)+r|0)*28|0)|0;r=p;o=h;l5(r|0,o|0,q)|0;c[e>>2]=p;c[d>>2]=m;c[f>>2]=l;if((h|0)==0){return}l_(o);return}function cS(a,d,e){a=a|0;d=d|0;e=e|0;var f=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;f=i;i=i+32|0;h=d;d=i;i=i+8|0;c[d>>2]=c[h>>2];c[d+4>>2]=c[h+4>>2];h=f|0;j=h|0;g[j>>2]=0.0;k=h+4|0;g[k>>2]=0.0;b[h+18>>1]=0;b[h+16>>1]=1;do{if((c[a+36>>2]|0)==0){l=c[d>>2]&65535;m=c[d+4>>2]&65535;n=768}else{o=c[d+4>>2]|0;p=(o|0)/8|0;q=c[a+44>>2]|0;if((q|0)==0){bF(1744,1432,326,6576)}r=c[d>>2]|0;s=q+(ag(c[a+28>>2]|0,(r|0)/8|0)|0)|0;if(+g[s+(p<<3)>>2]==-500.0){if(+g[s+(p<<3)+4>>2]==-500.0){l=r&65535;m=o&65535;n=768;break}}q=s+(p<<3)|0;p=h;s=c[q+4>>2]|0;c[p>>2]=c[q>>2];c[p+4>>2]=s;t=r&65535;u=o&65535}}while(0);if((n|0)==768){g[j>>2]=0.0;g[k>>2]=0.0;t=l;u=m}b[h+8>>1]=t;b[h+10>>1]=u;u=c[a+136>>2]|0;c[h+20>>2]=u;c[h+24>>2]=u+1;u=a+48|0;t=a+52|0;m=d;d=c[m>>2]|0;l=c[m+4>>2]|0;m=c[a+20>>2]|0;if((m|0)==0){bF(1744,1432,326,5464)}k=((c[t>>2]|0)-(c[u>>2]|0)|0)/28|0;c[m+(ag(c[a+4>>2]|0,d)|0)+(l<<2)>>2]=k;k=c[t>>2]|0;if((k|0)==(c[a+56>>2]|0)){cR(u,h)}else{if((k|0)==0){v=0}else{u=k;k=h;c[u>>2]=c[k>>2];c[u+4>>2]=c[k+4>>2];c[u+8>>2]=c[k+8>>2];c[u+12>>2]=c[k+12>>2];c[u+16>>2]=c[k+16>>2];c[u+20>>2]=c[k+20>>2];c[u+24>>2]=c[k+24>>2];v=c[t>>2]|0}c[t>>2]=v+28}v=a+100|0;t=c[v>>2]|0;if((t|0)==(c[a+104>>2]|0)){cQ(a+96|0,e);i=f;return}if((t|0)==0){w=0}else{a=t;k=e;c[a>>2]=c[k>>2];c[a+4>>2]=c[k+4>>2];c[a+8>>2]=c[k+8>>2];c[a+12>>2]=c[k+12>>2];k=t+16|0;t=e+16|0;c[k>>2]=c[t>>2];c[k+4>>2]=c[t+4>>2];c[k+8>>2]=c[t+8>>2];c[k+12>>2]=c[t+12>>2];w=c[v>>2]|0}c[v>>2]=w+32;i=f;return}function cT(b,d,f){b=b|0;d=d|0;f=f|0;var g=0,h=0,i=0,j=0;l6(b+16|0,-1|0,16);g=f;f=c[g>>2]|0;h=c[g+4>>2]|0;if((f|0)<=-1){bF(2248,2088,155,5344)}if(!((f|0)<(e[d>>1]|0|0)&(h|0)>-1)){bF(2248,2088,155,5344)}if((h|0)>=(e[d+2>>1]|0|0)){bF(2248,2088,155,5344)}g=c[d+20>>2]|0;if((g|0)==0){bF(1744,1432,333,3328)}i=g+(ag(c[d+4>>2]|0,f)|0)+h|0;g=b;a[b]=a[i+(c[d+72>>2]|0)|0]|0;a[g+1|0]=a[i+(c[d+76>>2]|0)|0]|0;a[g+2|0]=a[i+(c[d+80>>2]|0)|0]|0;a[g+3|0]=a[i+(c[d+84>>2]|0)|0]|0;a[b+4|0]=a[i+(c[d+88>>2]|0)|0]|0;a[g+5|0]=a[i+(c[d+92>>2]|0)|0]|0;a[g+6|0]=a[i+(c[d+96>>2]|0)|0]|0;a[g+7|0]=a[i+(c[d+100>>2]|0)|0]|0;i=c[d+44>>2]|0;if((i|0)==0){bF(1744,1432,333,3328)}else{j=i+(ag(c[d+28>>2]|0,f)|0)+h|0;a[b+8|0]=a[j+(c[d+104>>2]|0)|0]|0;a[g+9|0]=a[j+(c[d+108>>2]|0)|0]|0;a[g+10|0]=a[j+(c[d+112>>2]|0)|0]|0;a[g+11|0]=a[j+(c[d+116>>2]|0)|0]|0;a[b+12|0]=a[j+(c[d+120>>2]|0)|0]|0;a[g+13|0]=a[j+(c[d+124>>2]|0)|0]|0;a[g+14|0]=a[j+(c[d+128>>2]|0)|0]|0;a[g+15|0]=a[j+(c[d+132>>2]|0)|0]|0;return}}function cU(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0.0,r=0.0,s=0,t=0,u=0.0,v=0;e=i;f=d;d=i;i=i+8|0;c[d>>2]=c[f>>2];c[d+4>>2]=c[f+4>>2];f=c[b>>2]|0;g=(c[d>>2]|0)*3|0;h=(c[d+4>>2]|0)*3|0;j=g+1|0;k=h+1|0;l=d;d=j|0;m=k|0;c[l>>2]=d;c[l+4>>2]=m;l=c[f+24>>2]|0;if((l|0)==0){bF(1744,1432,326,5664)}n=l;l=c[f+8>>2]|0;o=m;m=d;d=1;p=h+2|0;h=g|0;q=+(c[n+(ag(l,j)|0)+(k<<2)>>2]|0);while(1){r=+(c[n+(ag(l,h)|0)+(p<<2)>>2]|0);g=q<r;s=g?h:m;t=g?p:o;u=g?r:q;g=15696+(d<<3)|0;v=d+1|0;if(v>>>0<9){o=t;m=s;d=v;p=(c[g+4>>2]|0)+k|0;h=(c[g>>2]|0)+j|0;q=u}else{break}}j=c[b+8>>2]|0;b=c[j+20>>2]|0;if((b|0)==0){bF(1744,1432,333,3144)}h=t;t=s;if((c[b+(ag(c[j+4>>2]|0,t)|0)+(h<<2)>>2]|0)!=-1|u==0.0){i=e;return}j=c[f+72>>2]|0;if((j|0)==0){bF(1744,1432,326,5832)}a[j+((ag(c[f+56>>2]|0,t)|0)+h)|0]=1;i=e;return}function cV(d,e){d=d|0;e=e|0;var f=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;f=i;i=i+8|0;h=e;e=i;i=i+8|0;c[e>>2]=c[h>>2];c[e+4>>2]=c[h+4>>2];h=f|0;j=c[d>>2]|0;k=c[d+12>>2]|0;l=e;m=c[l>>2]|0;n=m;o=c[l+4>>2]|0;l=c[k+20>>2]|0;if((l|0)==0){bF(1744,1432,333,3328)}if((a[l+(ag(c[k+4>>2]|0,n)|0)+o|0]|0)==0){k=c[j+24>>2]|0;if((k|0)==0){bF(1744,1432,326,5664)}c[k+(ag(c[j+8>>2]|0,n)|0)+(o<<2)>>2]=0;i=f;return}else{b[h>>1]=m&65535;b[h+2>>1]=c[e+4>>2]&65535;e=cW(h,c[d+4>>2]|0,+g[j>>2],c[d+8>>2]|0)|0;d=c[j+24>>2]|0;if((d|0)==0){bF(1744,1432,326,5664)}c[d+(ag(c[j+8>>2]|0,n)|0)+(o<<2)>>2]=e;i=f;return}}function cW(a,e,f,g){a=a|0;e=e|0;f=+f;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;h=i;j=a;a=i;i=i+4|0;i=i+7>>3<<3;c[a>>2]=c[j>>2];j=c[e+20>>2]|0;if((j|0)==0){bF(1744,1432,333,3328);return 0}k=b[a+2>>1]|0;l=j+(ag(c[e+4>>2]|0,b[a>>1]|0)|0)+k|0;k=l;a=d[k+(c[g+4>>2]|0)|0]|0;e=d[k+(c[g+44>>2]|0)|0]|0;j=d[l]<<1;l=e+(a-j)|0;m=(((l|0)>-1?l:-l|0)|0)/2|0;l=(m|0)<999999?m:999999;if(+(l|0)<f){n=0;i=h;return n|0}m=d[k+(c[g+12>>2]|0)|0]|0;o=m+((d[k+(c[g+36>>2]|0)|0]|0)-j)|0;p=(((o|0)>-1?o:-o|0)|0)/2|0;o=(p|0)<(l|0)?p:l;if(+(o|0)<f){n=0;i=h;return n|0}l=d[k+(c[g+52>>2]|0)|0]|0;p=l+(m-j)|0;m=(((p|0)>-1?p:-p|0)|0)/2|0;p=(m|0)<(o|0)?m:o;if(+(p|0)<f){n=0;i=h;return n|0}o=(d[k+(c[g+20>>2]|0)|0]|0)-j|0;m=o+e|0;e=(((m|0)>-1?m:-m|0)|0)/2|0;m=(e|0)<(p|0)?e:p;if(+(m|0)<f){n=0;i=h;return n|0}p=(d[k+(c[g+60>>2]|0)|0]|0)+o|0;o=(((p|0)>-1?p:-p|0)|0)/2|0;p=(o|0)<(m|0)?o:m;if(+(p|0)<f){n=0;i=h;return n|0}m=(d[k+(c[g+28>>2]|0)|0]|0)-j|0;j=m+l|0;l=(((j|0)>-1?j:-j|0)|0)/2|0;j=(l|0)<(p|0)?l:p;if(+(j|0)<f){n=0;i=h;return n|0}p=m+a|0;a=(((p|0)>-1?p:-p|0)|0)/2|0;p=(a|0)<(j|0)?a:j;n=+(p|0)<f?0:p;i=h;return n|0}function cX(a,b){a=a|0;b=b|0;var d=0,f=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;d=i;f=b;b=i;i=i+8|0;c[b>>2]=c[f>>2];c[b+4>>2]=c[f+4>>2];f=b;b=c[f>>2]|0;h=c[f+4>>2]|0;f=h;if((b|0)<=-1){i=d;return}if(!((b|0)<(e[a+12>>1]|0|0)&(f|0)>-1)){i=d;return}if((f|0)>=(e[a+14>>1]|0|0)){i=d;return}j=a+8|0;k=c[j>>2]|0;if((k|0)==0){bF(224,2776,19,3504)}l=a+4|0;m=f*12|0;f=c[a+32>>2]|0;if((f|0)==0){bF(224,2776,19,3504)}n=c[k+((ag(c[l>>2]|0,b)|0)+m)>>2]|0;k=ag(c[a+28>>2]|0,b)|0;c[f+(k+(h<<2|0>>>30))>>2]=n;n=c[j>>2]|0;if((n|0)==0){bF(224,2776,19,3504)}j=n;n=(ag(c[l>>2]|0,b)|0)+m|0;m=c[j+n>>2]|0;l=c[a+20>>2]|0;k=(l|0)==0;if((m|0)>1){if(k){bF(224,2776,19,3504)}f=l;o=ag(c[a+16>>2]|0,b)|0;p=o+(h<<3|0>>>29)|0;o=(c[j+(n+8)>>2]|0)/(m|0)|0;g[f+p>>2]=+((c[j+(n+4)>>2]|0)/(m|0)|0|0);g[f+(p+4)>>2]=+(o|0);i=d;return}else{if(k){bF(224,2776,19,3504)}k=ag(c[a+16>>2]|0,b)|0;b=l+(k+(h<<3|0>>>29))|0;c[b>>2]=-1007026176;c[b+4>>2]=-1007026176;i=d;return}}function cY(a,b){a=a|0;b=b|0;var d=0,f=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0.0,u=0.0;d=i;f=b;b=i;i=i+8|0;c[b>>2]=c[f>>2];c[b+4>>2]=c[f+4>>2];f=b;b=c[f>>2]|0;h=c[f+4>>2]|0;f=h;if((b|0)<=-1){i=d;return}if(!((b|0)<(e[a>>1]|0|0)&(f|0)>-1)){i=d;return}if((f|0)>=(e[a+2>>1]|0|0)){i=d;return}j=a+8|0;k=c[j>>2]|0;if((k|0)==0){bF(224,2776,19,3504)}l=(f|0)/2|0;m=(b|0)/2|0;n=a+4|0;o=f*12|0;f=c[a+20>>2]|0;if((f|0)==0){bF(224,2776,19,3504)}p=c[a+56>>2]|0;if((p|0)==0){bF(224,2776,19,3504)}q=c[n>>2]|0;r=ag(c[a+16>>2]|0,m)|0;s=k+((ag(q,b)|0)+o)|0;q=(c[s>>2]|0)+(c[f+(r+(l*12|0))>>2]|0)|0;r=ag(c[a+52>>2]|0,b)|0;c[p+(r+(h<<2|0>>>30))>>2]=q;q=c[j>>2]|0;if((q|0)==0){bF(224,2776,19,3504)}j=q;q=(ag(c[n>>2]|0,b)|0)+o|0;o=c[j+q>>2]|0;if((o|0)>1){n=c[a+32>>2]|0;if((n|0)==0){bF(224,2776,19,3504)}r=n;n=ag(c[a+28>>2]|0,b)|0;p=n+(h<<3|0>>>29)|0;n=(c[j+(q+8)>>2]|0)/(o|0)|0;g[r+p>>2]=+((c[j+(q+4)>>2]|0)/(o|0)|0|0);g[r+(p+4)>>2]=+(n|0);i=d;return}n=c[a+44>>2]|0;if((n|0)==0){bF(224,2776,19,3504)}p=n;n=(ag(c[a+40>>2]|0,m)|0)+(l<<3)|0;t=+g[p+n>>2];do{if(t==-500.0){if(+g[p+(n+4)>>2]!=-500.0){break}i=d;return}}while(0);l=c[a+32>>2]|0;if((l|0)==0){bF(224,2776,19,3504)}m=l+((ag(c[a+28>>2]|0,b)|0)+(h<<3|0>>>29))|0;h=m;u=+(+g[p+(n+4)>>2]*2.0);g[h>>2]=t*2.0;g[h+4>>2]=u;i=d;return}function cZ(a,d){a=a|0;d=d|0;var f=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0;f=i;h=d;d=i;i=i+8|0;c[d>>2]=c[h>>2];c[d+4>>2]=c[h+4>>2];h=c[a+56>>2]|0;L985:do{if((h|0)>0){j=c[d>>2]|0;k=c[d+4>>2]|0;l=a|0;m=a+2|0;n=a+20|0;o=a+4|0;p=a+24|0;q=0;r=0;s=0;t=0;L987:while(1){u=q;v=r;w=s;x=0;while(1){y=ag(j,h)|0;z=y+t|0;y=(ag(k,h)|0)+x|0;do{if((z|0)>-1){if(!((z|0)<(e[l>>1]|0)&(y|0)>-1)){A=w;B=v;C=u;break}if((y|0)>=(e[m>>1]|0)){A=w;B=v;C=u;break}D=c[n>>2]|0;if((D|0)==0){E=896;break L987}F=D;D=c[o>>2]|0;if((c[F+(ag(D,z)|0)+(y<<2)>>2]|0)==-1){A=w;B=v;C=u;break}G=c[F+(ag(D,z<<16>>16)|0)+(y<<16>>16<<2)>>2]|0;if((G|0)==-1){E=899;break L987}D=c[p>>2]|0;if((b[D+(G*28|0)+16>>1]|0)==0){A=w;B=v;C=u;break}A=w+1|0;B=~~(+(v|0)+ +g[D+(G*28|0)>>2]);C=~~(+(u|0)+ +g[D+(G*28|0)+4>>2])}else{A=w;B=v;C=u}}while(0);y=x+1|0;if((y|0)<(h|0)){u=C;v=B;w=A;x=y}else{break}}x=t+1|0;if((x|0)<(h|0)){q=C;r=B;s=A;t=x}else{H=C;I=B;J=A;break L985}}if((E|0)==896){bF(1744,1432,333,3144)}else if((E|0)==899){bF(856,512,123,2920)}}else{H=0;I=0;J=0}}while(0);E=d;d=c[E>>2]|0;A=c[E+4>>2]|0;E=a+52|0;B=c[E>>2]|0;if((B|0)==0){bF(224,2776,19,3504)}C=d;d=a+48|0;a=A*12|0;c[B+((ag(c[d>>2]|0,C)|0)+a)>>2]=J;J=c[E>>2]|0;if((J|0)==0){bF(224,2776,19,3504)}else{E=J+(a+4+(ag(c[d>>2]|0,C)|0))|0;c[E>>2]=I;c[E+4>>2]=H;i=f;return}}function c_(a,d,f,h,j){a=a|0;d=d|0;f=f|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0.0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0.0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0.0,N=0,O=0,P=0,Q=0,R=0.0,S=0,T=0,U=0.0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ab=0,ac=0.0;k=i;i=i+8|0;l=d;d=i;i=i+4|0;i=i+7>>3<<3;c[d>>2]=c[l>>2];l=k|0;m=l;n=i;i=i+4|0;i=i+7>>3<<3;o=i;i=i+4|0;i=i+7>>3<<3;p=d;d=e[p>>1]|e[p+2>>1]<<16;c[l>>2]=d;p=d&65535;q=d>>>16&65535;r=+(c2(h,f,m,1)|0);d=h|0;s=(e[d>>1]|0)-1|0;t=h+2|0;u=(e[t>>1]|0)-1|0;v=b[l>>1]|0;w=b[m+2>>1]|0;do{if(v<<16>>16>=0){if((v<<16>>16|0)>(s|0)|w<<16>>16<0|(w<<16>>16|0)>(u|0)){break}m=n|0;x=n+2|0;y=o|0;z=o+2|0;A=q;B=p;C=r;D=0;E=8;F=v;G=w;while(1){H=c[15624+(E<<3)>>2]|0;I=c[15628+(E<<3)>>2]|0;J=(F<<16>>16)+(c[15696+(H<<3)>>2]|0)|0;K=(G<<16>>16)+(c[15700+(H<<3)>>2]|0)|0;do{if((J|0)>-1){if(!((J|0)<(e[d>>1]|0|0)&(K|0)>-1)){L=E;M=C;N=B;O=A;break}if((K|0)>=(e[t>>1]|0|0)){L=E;M=C;N=B;O=A;break}P=J&65535;b[m>>1]=P;Q=K&65535;b[x>>1]=Q;R=+(c2(h,f,n,j)|0);if(R>=C){L=E;M=C;N=B;O=A;break}L=H;M=R;N=P;O=Q}else{L=E;M=C;N=B;O=A}}while(0);K=H+1&7;L1023:do{if((K|0)==(I|0)){S=O;T=N;U=M;V=L}else{J=F<<16>>16;Q=G<<16>>16;P=O;W=N;R=M;X=L;Y=K;while(1){Z=Y;L1027:while(1){_=J+(c[15696+(Z<<3)>>2]|0)|0;$=Q+(c[15700+(Z<<3)>>2]|0)|0;do{if((_|0)>-1){if(!((_|0)<(e[d>>1]|0|0)&($|0)>-1)){break}if(($|0)>=(e[t>>1]|0|0)){break}aa=_&65535;b[y>>1]=aa;ab=$&65535;b[z>>1]=ab;ac=+(c2(h,f,o,j)|0);if(ac<R){break L1027}}}while(0);$=Z+1&7;if(($|0)==(I|0)){S=P;T=W;U=R;V=X;break L1023}else{Z=$}}$=Z+1&7;if(($|0)==(I|0)){S=ab;T=aa;U=ac;V=Z;break}else{P=ab;W=aa;R=ac;X=Z;Y=$}}}}while(0);if(F<<16>>16==T<<16>>16&G<<16>>16==S<<16>>16|T<<16>>16<0){break}if((T<<16>>16|0)>(s|0)|S<<16>>16<0|(S<<16>>16|0)>(u|0)){break}c[l>>2]=(S&65535)<<16|T&65535;I=D+1|0;if((I|0)<10){A=S;B=T;C=U;D=I;E=V;F=T;G=S}else{break}}c[a>>2]=(S&65535)<<16|T&65535;g[a+4>>2]=U;i=k;return}}while(0);c[a>>2]=c[l>>2];g[a+4>>2]=999999.0;i=k;return}function c$(a,f){a=a|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0;g=i;i=i+256|0;h=g|0;j=g+8|0;k=g+16|0;l=g+48|0;m=g+56|0;n=g+88|0;o=g+96|0;p=g+104|0;q=g+112|0;r=g+120|0;s=g+136|0;t=g+152|0;u=g+184|0;v=g+216|0;w=g+248|0;x=w;if((f|0)<=-1){bF(1992,1904,316,4160)}y=a|0;z=a+40|0;if((c[z>>2]|0)<=(f|0)){bF(1992,1904,316,4160)}A=a+24|0;B=c[A>>2]|0;C=b[B+(f*28|0)+8>>1]|0;D=b[B+(f*28|0)+10>>1]|0;E=D<<16>>16;if(C<<16>>16<=-1){bF(1864,1904,318,4160)}F=C<<16>>16;G=e[a>>1]|0;if(!((F|0)<(G|0)&D<<16>>16>-1)){bF(1864,1904,318,4160)}H=e[a+2>>1]|0;if((E|0)>=(H|0)){bF(1864,1904,318,4160)}I=G-1|0;G=H-1|0;if(C<<16>>16<0){bF(1832,1904,320,4160)}if((F|0)>(I|0)|D<<16>>16<0|(E|0)>(G|0)){bF(1832,1904,320,4160)}if((b[B+(f*28|0)+16>>1]|0)==0){i=g;return}c0(p,B+(f*28|0)|0,a+76|0,c[a+112>>2]|0,0,0);B=c[p>>2]|0;E=B&65535;D=c[p+4>>2]|0;p=D&65535;do{if(E<<16>>16>=0){if((E<<16>>16|0)>(I|0)|p<<16>>16<0|(p<<16>>16|0)>(G|0)){break}F=a+28|0;C=c[F>>2]|0;H=C+(f<<5)|0;J=r;c[J>>2]=c[H>>2];c[J+4>>2]=c[H+4>>2];c[J+8>>2]=c[H+8>>2];c[J+12>>2]=c[H+12>>2];H=C+(f<<5)+16|0;C=s;c[C>>2]=c[H>>2];c[C+4>>2]=c[H+4>>2];c[C+8>>2]=c[H+8>>2];c[C+12>>2]=c[H+12>>2];H=a+44|0;K=c[H>>2]|0;L=k;M=m;c[j>>2]=D<<16|B&65535;c[L>>2]=c[J>>2];c[L+4>>2]=c[J+4>>2];c[L+8>>2]=c[J+8>>2];c[L+12>>2]=c[J+12>>2];L=k+16|0;c[L>>2]=c[C>>2];c[L+4>>2]=c[C+4>>2];c[L+8>>2]=c[C+8>>2];c[L+12>>2]=c[C+12>>2];c_(h,j,k,K,2);c[l>>2]=c[h>>2];c[M>>2]=c[J>>2];c[M+4>>2]=c[J+4>>2];c[M+8>>2]=c[J+8>>2];c[M+12>>2]=c[J+12>>2];J=m+16|0;c[J>>2]=c[C>>2];c[J+4>>2]=c[C+4>>2];c[J+8>>2]=c[C+8>>2];c[J+12>>2]=c[C+12>>2];c_(q,l,m,K,1);K=c[q>>2]|0;C=K&65535;J=K>>>16&65535;M=c[F>>2]|0;F=t;L=M+(f<<5)|0;c[F>>2]=c[L>>2];c[F+4>>2]=c[L+4>>2];c[F+8>>2]=c[L+8>>2];c[F+12>>2]=c[L+12>>2];L=t+16|0;F=M+(f<<5)+16|0;c[L>>2]=c[F>>2];c[L+4>>2]=c[F+4>>2];c[L+8>>2]=c[F+8>>2];c[L+12>>2]=c[F+12>>2];F=c[H>>2]|0;L=C<<16>>16;c[n>>2]=L;M=J<<16>>16;c[n+4>>2]=M;cT(u,F,n);F=t+16|0;N=t;O=u;P=a+116|0;Q=0;R=0;S=8;while(1){if((d[F+S|0]|0)>150){T=(d[N+S|0]|0)-(d[O+S|0]|0)|0;U=R+1|0;V=((((T|0)>-1?T:-T|0)|0)>(c[P>>2]|0))+Q|0}else{U=R;V=Q}T=S+1|0;if(T>>>0<16){Q=V;R=U;S=T}else{break}}do{if(C<<16>>16>=0){if((L|0)>(I|0)|J<<16>>16<0|(M|0)>(G|0)){break}if(V>>>0>=U>>>1>>>0){break}S=c[a+72>>2]|0;if((S|0)==0){bF(224,2776,19,3504)}if(+((c[S+((ag(c[a+68>>2]|0,L)|0)+(M<<2))>>2]|0)>>>0>>>0)<3.0){if((c[z>>2]|0)>>>0<=f>>>0){bF(320,512,395,3616)}b[(c[A>>2]|0)+(f*28|0)+16>>1]=0;i=g;return}S=c[H>>2]|0;c[o>>2]=L;c[o+4>>2]=M;cT(v,S,o);c[w>>2]=K;c1(y,f,x,v);S=c[a+20>>2]|0;if((S|0)==0){bF(1744,1432,333,3144)}if((c[S+(ag(c[a+4>>2]|0,L)|0)+(M<<2)>>2]|0)==-1){bF(1792,1904,413,4160)}if((b[(c[A>>2]|0)+(f*28|0)+16>>1]|0)==0){bF(1752,1904,414,4160)}else{i=g;return}}}while(0);if((c[z>>2]|0)>>>0<=f>>>0){bF(320,512,395,3616)}b[(c[A>>2]|0)+(f*28|0)+16>>1]=0;i=g;return}}while(0);if((c[z>>2]|0)>>>0<=f>>>0){bF(320,512,395,3616)}b[(c[A>>2]|0)+(f*28|0)+16>>1]=0;i=g;return}function c0(a,d,e,f,h,i){a=a|0;d=d|0;e=e|0;f=f|0;h=h|0;i=i|0;var j=0,k=0.0,l=0,m=0,n=0,o=0.0;i=c[e+8>>2]|0;if((i|0)==0){h=b[d+16>>1]|0;if(h<<16>>16==0){bF(1648,1576,14,4048)}j=b[d+8>>1]|0;if(h<<16>>16==1){c[a>>2]=j<<16>>16;c[a+4>>2]=b[d+10>>1]|0;return}else{k=+(b[d+10>>1]|0)+ +g[d+4>>2]+0.0;c[a>>2]=~~(+(j<<16>>16|0)+ +g[d>>2]+0.0);c[a+4>>2]=~~k;return}}j=f<<1;f=b[d+8>>1]|0;h=f<<16>>16;l=b[d+10>>1]|0;m=l<<16>>16;n=i;i=(ag(c[e+4>>2]|0,(h|0)/(j|0)|0)|0)+(((m|0)/(j|0)|0)<<3)|0;k=+g[n+i>>2];do{if(k==-500.0){if(+g[n+(i+4)>>2]!=-500.0){break}j=b[d+16>>1]|0;if((j<<16>>16|0)==0){bF(1648,1576,14,4048)}else if((j<<16>>16|0)==1){c[a>>2]=h;c[a+4>>2]=m;return}else{o=+(l<<16>>16|0)+ +g[d+4>>2]+0.0;c[a>>2]=~~(+(f<<16>>16|0)+ +g[d>>2]+0.0);c[a+4>>2]=~~o;return}}}while(0);o=+(l<<16>>16|0)+ +g[n+(i+4)>>2]*2.0;c[a>>2]=~~(+(f<<16>>16|0)+k*2.0);c[a+4>>2]=~~o;return}function c1(a,d,f,h){a=a|0;d=d|0;f=f|0;h=h|0;var j=0,k=0,l=0,m=0.0,n=0.0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0.0,E=0.0,F=0,G=0,H=0.0;j=i;i=i+48|0;k=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[k>>2];if((c[a+40>>2]|0)>>>0<=d>>>0){bF(320,512,428,3808)}k=c[a+24>>2]|0;l=k+(d*28|0)|0;m=+g[l>>2];n=+g[l+4>>2];o=k+(d*28|0)+8|0;p=c[o>>2]|0;q=k+(d*28|0)+16|0;r=b[q>>1]|0;s=k+(d*28|0)+18|0;t=j|0;b[t>>1]=b[s>>1]|0;b[t+2>>1]=b[s+2>>1]|0;b[t+4>>1]=b[s+4>>1]|0;b[t+6>>1]=b[s+6>>1]|0;b[t+8>>1]=b[s+8>>1]|0;u=p<<16;v=u>>16;w=p>>16;if((u|0)<=-65536){bF(1712,512,431,3808)}u=a|0;p=e[u>>1]|0;if(!((v|0)<(p|0)&(w|0)>-1)){bF(1712,512,431,3808)}x=a+2|0;y=e[x>>1]|0;if((w|0)>=(y|0)){bF(1712,512,431,3808)}z=b[f>>1]|0;A=b[f+2>>1]|0;B=A<<16>>16;if(z<<16>>16<=-1){bF(1672,512,432,3808)}C=z<<16>>16;if(!((C|0)<(p|0)&A<<16>>16>-1&(B|0)<(y|0))){bF(1672,512,432,3808)}y=r+1&65535;r=B-w|0;D=+(C-v|0);if((y&65535)>1){E=+(r|0);F=~~(D-m);G=~~(E-n);H=E}else{F=0;G=0;H=+(r|0)}r=f;f=e[r>>1]|e[r+2>>1]<<16;E=+H;g[l>>2]=D;g[l+4>>2]=E;c[o>>2]=f;b[k+(d*28|0)+12>>1]=F;b[k+(d*28|0)+14>>1]=G;b[q>>1]=y;b[s>>1]=b[t>>1]|0;b[s+2>>1]=b[t+2>>1]|0;b[s+4>>1]=b[t+4>>1]|0;b[s+6>>1]=b[t+6>>1]|0;b[s+8>>1]=b[t+8>>1]|0;if(D+H>0.0){t=h;s=j+16|0;c[s>>2]=c[t>>2];c[s+4>>2]=c[t+4>>2];c[s+8>>2]=c[t+8>>2];c[s+12>>2]=c[t+12>>2];t=h+16|0;h=j+32|0;c[h>>2]=c[t>>2];c[h+4>>2]=c[t+4>>2];c[h+8>>2]=c[t+8>>2];c[h+12>>2]=c[t+12>>2];t=c[a+28>>2]|0;y=t+(d<<5)|0;c[y>>2]=c[s>>2];c[y+4>>2]=c[s+4>>2];c[y+8>>2]=c[s+8>>2];c[y+12>>2]=c[s+12>>2];s=t+(d<<5)+16|0;c[s>>2]=c[h>>2];c[s+4>>2]=c[h+4>>2];c[s+8>>2]=c[h+8>>2];c[s+12>>2]=c[h+12>>2]}h=c[a+20>>2]|0;if((h|0)==0){bF(1744,1432,326,5464)}c[h+(ag(c[a+4>>2]|0,f<<16>>16)|0)+(B<<2)>>2]=d;d=f<<16;B=f>>16;if((d|0)<=-65536){bF(1712,512,472,3808)}if(!((d>>16|0)<(e[u>>1]|0|0)&(B|0)>-1)){bF(1712,512,472,3808)}if((B|0)<(e[x>>1]|0|0)){i=j;return}else{bF(1712,512,472,3808)}}function c2(a,e,f,g){a=a|0;e=e|0;f=f|0;g=g|0;var h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0;h=c[a+20>>2]|0;if((h|0)==0){bF(1744,1432,333,3328);return 0}i=b[f+2>>1]|0;j=b[f>>1]|0;f=h+(ag(c[a+4>>2]|0,j)|0)+i|0;if((g|0)==1){g=e;h=e+16|0;k=0;l=0;while(1){m=(d[f+(c[a+72+(k<<2)>>2]|0)|0]|0)-(d[g+k|0]|0)|0;n=(ag((m|0)>-1?m:-m|0,d[h+k|0]|0)|0)+l|0;m=k+1|0;if((m|0)<8){k=m;l=n}else{o=n;break}}}else{o=0}l=c[a+44>>2]|0;if((l|0)==0){bF(1744,1432,333,3328);return 0}k=l+(ag(c[a+28>>2]|0,j)|0)+i|0;i=e;j=e+16|0;e=0;l=0;do{h=l+8|0;g=(d[k+(c[a+104+(l<<2)>>2]|0)|0]|0)-(d[i+h|0]|0)|0;e=(ag((g|0)>-1?g:-g|0,d[j+h|0]|0)|0)+e|0;l=l+1|0;}while((l|0)<8);return(e+o|0)/255|0|0}function c3(a,d,e){a=a|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;f=i;i=i+96|0;g=f|0;h=f+24|0;j=f+48|0;k=f+72|0;b[g>>1]=b[a>>1]|0;b[g+2>>1]=b[a+2>>1]|0;c[g+4>>2]=c[a+4>>2];c[g+8>>2]=c[a+8>>2];l=g+12|0;c[l>>2]=c[a+12>>2];m=g+16|0;n=c[a+16>>2]|0;c[m>>2]=n;if((n|0)!=0){o=n+4|0;I=c[o>>2]|0,c[o>>2]=I+1,I}c[g+20>>2]=c[a+20>>2];a=e|0;b[h>>1]=b[a>>1]|0;o=e+2|0;b[h+2>>1]=b[o>>1]|0;n=e+4|0;c[h+4>>2]=c[n>>2];p=e+8|0;c[h+8>>2]=c[p>>2];q=h+12|0;r=e+12|0;c[q>>2]=c[r>>2];s=h+16|0;t=e+16|0;u=c[t>>2]|0;c[s>>2]=u;if((u|0)!=0){v=u+4|0;I=c[v>>2]|0,c[v>>2]=I+1,I}v=e+20|0;c[h+20>>2]=c[v>>2];c6(g,h);c[q>>2]=0;q=c[s>>2]|0;c[s>>2]=0;do{if((q|0)!=0){h=q+4|0;do{if(((I=c[h>>2]|0,c[h>>2]=I+ -1,I)|0)==1){g=q;bY[c[(c[g>>2]|0)+8>>2]&511](q);e=q+8|0;if(((I=c[e>>2]|0,c[e>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[g>>2]|0)+12>>2]&511](q)}}while(0);h=c[s>>2]|0;if((h|0)==0){break}g=h+4|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}g=h;bY[c[(c[g>>2]|0)+8>>2]&511](h);e=h+8|0;if(((I=c[e>>2]|0,c[e>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[g>>2]|0)+12>>2]&511](h)}}while(0);c[l>>2]=0;l=c[m>>2]|0;c[m>>2]=0;do{if((l|0)!=0){s=l+4|0;do{if(((I=c[s>>2]|0,c[s>>2]=I+ -1,I)|0)==1){q=l;bY[c[(c[q>>2]|0)+8>>2]&511](l);h=l+8|0;if(((I=c[h>>2]|0,c[h>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[q>>2]|0)+12>>2]&511](l)}}while(0);s=c[m>>2]|0;if((s|0)==0){break}q=s+4|0;if(((I=c[q>>2]|0,c[q>>2]=I+ -1,I)|0)!=1){break}q=s;bY[c[(c[q>>2]|0)+8>>2]&511](s);h=s+8|0;if(((I=c[h>>2]|0,c[h>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[q>>2]|0)+12>>2]&511](s)}}while(0);b[j>>1]=b[a>>1]|0;b[j+2>>1]=b[o>>1]|0;c[j+4>>2]=c[n>>2];c[j+8>>2]=c[p>>2];p=j+12|0;c[p>>2]=c[r>>2];r=j+16|0;n=c[t>>2]|0;c[r>>2]=n;if((n|0)!=0){t=n+4|0;I=c[t>>2]|0,c[t>>2]=I+1,I}c[j+20>>2]=c[v>>2];b[k>>1]=b[d>>1]|0;b[k+2>>1]=b[d+2>>1]|0;c[k+4>>2]=c[d+4>>2];c[k+8>>2]=c[d+8>>2];v=k+12|0;c[v>>2]=c[d+12>>2];t=k+16|0;n=c[d+16>>2]|0;c[t>>2]=n;if((n|0)!=0){o=n+4|0;I=c[o>>2]|0,c[o>>2]=I+1,I}c[k+20>>2]=c[d+20>>2];dk(j,k);c[v>>2]=0;v=c[t>>2]|0;c[t>>2]=0;do{if((v|0)!=0){k=v+4|0;do{if(((I=c[k>>2]|0,c[k>>2]=I+ -1,I)|0)==1){j=v;bY[c[(c[j>>2]|0)+8>>2]&511](v);d=v+8|0;if(((I=c[d>>2]|0,c[d>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[j>>2]|0)+12>>2]&511](v)}}while(0);k=c[t>>2]|0;if((k|0)==0){break}j=k+4|0;if(((I=c[j>>2]|0,c[j>>2]=I+ -1,I)|0)!=1){break}j=k;bY[c[(c[j>>2]|0)+8>>2]&511](k);d=k+8|0;if(((I=c[d>>2]|0,c[d>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[j>>2]|0)+12>>2]&511](k)}}while(0);c[p>>2]=0;p=c[r>>2]|0;c[r>>2]=0;if((p|0)==0){i=f;return}t=p+4|0;do{if(((I=c[t>>2]|0,c[t>>2]=I+ -1,I)|0)==1){v=p;bY[c[(c[v>>2]|0)+8>>2]&511](p);k=p+8|0;if(((I=c[k>>2]|0,c[k>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[v>>2]|0)+12>>2]&511](p)}}while(0);p=c[r>>2]|0;if((p|0)==0){i=f;return}r=p+4|0;if(((I=c[r>>2]|0,c[r>>2]=I+ -1,I)|0)!=1){i=f;return}r=p;bY[c[(c[r>>2]|0)+8>>2]&511](p);t=p+8|0;if(((I=c[t>>2]|0,c[t>>2]=I+ -1,I)|0)!=1){i=f;return}bY[c[(c[r>>2]|0)+12>>2]&511](p);i=f;return}function c4(a){a=a|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;d=i;i=i+56|0;e=d+8|0;f=d+40|0;g=c[a+8>>2]|0;h=b[a>>1]|0;j=g-1|0;k=b[a+2>>1]|0;l=-g|0;g=l|0;m=l|0;l=(h&65535)+j|0;n=(k&65535)+j|0;j=c[a+4>>2]|0;o=c[a+16>>2]|0;p=(o|0)==0;if(!p){q=o+4|0;I=c[q>>2]|0,c[q>>2]=I+1,I}q=c[a+20>>2]|0;b[e>>1]=h;b[e+2>>1]=k;c[e+4>>2]=j;c[e+8>>2]=q;q=e+12|0;c[q>>2]=g;c[q+4>>2]=m;q=e+20|0;c[q>>2]=l;c[q+4>>2]=n;q=f;c[q>>2]=g;c[q+4>>2]=m;m=f+8|0;c[m>>2]=l;c[m+4>>2]=n;c5(1,f,e,d|0);if(p){i=d;return}p=o+4|0;if(((I=c[p>>2]|0,c[p>>2]=I+ -1,I)|0)!=1){i=d;return}p=o;bY[c[(c[p>>2]|0)+8>>2]&511](o);e=o+8|0;if(((I=c[e>>2]|0,c[e>>2]=I+ -1,I)|0)!=1){i=d;return}bY[c[(c[p>>2]|0)+12>>2]&511](o);i=d;return}function c5(b,d,f,g){b=b|0;d=d|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0;b=i;h=g;g=i;i=i+1|0;i=i+7>>3<<3;a[g]=a[h]|0;h=c[d>>2]|0;g=d+8|0;j=c[g>>2]|0;if((h|0)>(j|0)){i=b;return}k=d+4|0;l=d+12|0;d=f|0;m=f+2|0;n=f+12|0;o=f+20|0;p=f+16|0;q=f+24|0;r=f+8|0;s=f+4|0;f=h;h=c[l>>2]|0;t=j;L1272:while(1){j=c[k>>2]|0;if((j|0)>(h|0)){u=h;v=t}else{w=(f|0)<0?0:f;if((f|0)>-1){x=j;y=h;while(1){if((f|0)<(e[d>>1]|0|0)&(x|0)>-1){if((x|0)<(e[m>>1]|0|0)){z=y}else{A=1124}}else{A=1124}do{if((A|0)==1124){A=0;if((f|0)<(c[n>>2]|0)){z=y;break}if((f|0)>(c[o>>2]|0)){z=y;break}if((x|0)<(c[p>>2]|0)){z=y;break}if((x|0)>(c[q>>2]|0)){z=y;break}B=c[r>>2]|0;if((B|0)==0){A=1143;break L1272}C=e[d>>1]|0;D=e[m>>1]|0;E=(x|0)<0?0:x;F=c[s>>2]|0;G=B+(ag(F,f)|0)+x|0;a[G]=a[B+(ag((w|0)<(C|0)?w:C-1|0,F)|0)+((E|0)<(D|0)?E:D-1|0)|0]|0;z=c[l>>2]|0}}while(0);if((x|0)<(z|0)){x=x+1|0;y=z}else{H=z;break}}}else{y=j;x=h;while(1){do{if((f|0)<(c[n>>2]|0)){I=x}else{if((f|0)>(c[o>>2]|0)){I=x;break}if((y|0)<(c[p>>2]|0)){I=x;break}if((y|0)>(c[q>>2]|0)){I=x;break}D=c[r>>2]|0;if((D|0)==0){A=1144;break L1272}E=e[d>>1]|0;F=e[m>>1]|0;C=(y|0)<0?0:y;B=c[s>>2]|0;G=D+(ag(B,f)|0)+y|0;a[G]=a[D+(ag((w|0)<(E|0)?w:E-1|0,B)|0)+((C|0)<(F|0)?C:F-1|0)|0]|0;I=c[l>>2]|0}}while(0);if((y|0)<(I|0)){y=y+1|0;x=I}else{H=I;break}}}u=H;v=c[g>>2]|0}if((f|0)>=(v|0)){A=1146;break}f=f+1|0;h=u;t=v}if((A|0)==1146){i=b;return}else if((A|0)==1144){bF(224,2776,19,3504)}else if((A|0)==1143){bF(224,2776,19,3504)}}function c6(f,g){f=f|0;g=g|0;var h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;h=f|0;i=b[h>>1]|0;if(i<<16>>16==0){return}j=f+20|0;k=f+4|0;l=g+20|0;m=g+4|0;g=f+2|0;f=0;n=i;while(1){i=c[j>>2]|0;if((i|0)==0){o=1150;break}p=i+(ag(c[k>>2]|0,f)|0)|0;i=c[l>>2]|0;if((i|0)==0){o=1152;break}q=i+(ag(c[m>>2]|0,f)|0)|0;if(((e[g>>1]|0)-1|0)>1){i=1;while(1){r=i+1|0;a[q+i|0]=((d[p+(i-1)|0]|0)+((d[p+i|0]|0)<<1)+(d[p+r|0]|0)|0)>>>2&255;if((r|0)<((e[g>>1]|0)-1|0)){i=r}else{break}}s=b[h>>1]|0}else{s=n}i=f+1|0;if(i>>>0<(s&65535)>>>0){f=i;n=s}else{o=1159;break}}if((o|0)==1150){bF(1744,1432,363,3240)}else if((o|0)==1152){bF(1744,1432,355,6192)}else if((o|0)==1159){return}}function c7(a){a=a|0;return}function c8(a){a=a|0;return}function c9(a){a=a|0;return}function da(a,b){a=a|0;b=b|0;var d=0;if((c[b+4>>2]|0)!=10408){d=0;return d|0}d=a+16|0;return d|0}function db(a){a=a|0;return a+16|0}function dc(a,b){a=a|0;b=b|0;var d=0;if((c[b+4>>2]|0)!=10432){d=0;return d|0}d=a+16|0;return d|0}function dd(a){a=a|0;return a+16|0}function de(a){a=a|0;if((a|0)==0){return}l$(a|0);return}function df(a){a=a|0;l_(a);return}function dg(a){a=a|0;bY[c[a+16>>2]&511](c[a+12>>2]|0);return}function dh(a){a=a|0;if((a|0)==0){return}bY[c[(c[a>>2]|0)+4>>2]&511](a);return}function di(a){a=a|0;l_(a);return}function dj(a){a=a|0;bY[c[a+16>>2]&511](c[a+12>>2]|0);return}function dk(f,g){f=f|0;g=g|0;var h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;h=f+4|0;i=c[h>>2]|0;j=f|0;k=b[j>>1]|0;if(((k&65535)-1|0)<=1){return}l=f+20|0;m=g+20|0;n=g+4|0;g=f+2|0;f=1;o=k;while(1){k=c[l>>2]|0;if((k|0)==0){p=1192;break}q=k+(ag(c[h>>2]|0,f)|0)|0;k=c[m>>2]|0;if((k|0)==0){p=1194;break}r=k+(ag(c[n>>2]|0,f)|0)|0;if((b[g>>1]|0)==0){s=o}else{k=0;do{a[r+k|0]=((d[q+(k-i)|0]|0)+(d[q+k|0]<<1)+(d[q+(k+i)|0]|0)|0)>>>2&255;k=k+1|0;}while((k|0)<(e[g>>1]|0));s=b[j>>1]|0}k=f+1|0;if((k|0)<((s&65535)-1|0)){f=k;o=s}else{p=1201;break}}if((p|0)==1194){bF(1744,1432,355,6192)}else if((p|0)==1192){bF(1744,1432,363,3240)}else if((p|0)==1201){return}}function dl(a,b){a=a|0;b=b|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;f=i;g=b;b=i;i=i+8|0;c[b>>2]=c[g>>2];c[b+4>>2]=c[g+4>>2];g=b;h=c[g>>2]|0;j=c[g+4>>2]|0;g=h;k=j;do{if((g|0)>-1){if(!((g|0)<(e[a>>1]|0|0)&(k|0)>-1)){l=0;break}if((k|0)>=(e[a+2>>1]|0|0)){l=0;break}m=c[a+8>>2]|0;if((m|0)==0){bF(224,2776,19,3504)}else{n=c[a+4>>2]|0;o=c[b+4>>2]|0;p=o+2|0;q=m+(ag(g,n)|0)|0;r=o-2|0;s=(d[q+p|0]|0)-(d[q+r|0]|0)|0;q=m+(ag(g-2|0,n)|0)|0;t=d[q+o|0]|0;u=m+(ag(g+2|0,n)|0)|0;n=t-(d[u+o|0]|0)|0;o=(d[q+r|0]|0)-(d[u+p|0]|0)|0;t=(d[q+p|0]|0)-(d[u+r|0]|0)|0;l=((n|0)>-1?n:-n|0)+((s|0)>-1?s:-s|0)+((o|0)>-1?o:-o|0)+((t|0)>-1?t:-t|0)|0;break}}else{l=0}}while(0);b=c[a+20>>2]|0;if((b|0)==0){bF(224,2776,19,3504)}else{k=ag(c[a+16>>2]|0,g)|0;c[b+(k+((h>>>30|j<<2)&-4))>>2]=l;i=f;return}}function dm(e,f){e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;g=b[f+2>>1]|0;h=g&65535;i=b[f>>1]|0;j=c[e+4>>2]|0;k=c[e+20>>2]|0;e=c[f+4>>2]|0;l=c[f+20>>2]|0;if(i<<16>>16==0){return}f=i&65535;i=(k|0)==0;m=j<<1;n=(l|0)==0;o=j+1|0;p=0;q=g;L1384:while(1){if(q<<16>>16==0){r=0}else{s=(p|0)<(f|0);t=k+(ag(m,p)|0)|0;u=l+(ag(p,e)|0)|0;v=0;while(1){if(s&(v|0)<(h|0)){w=v<<1;if(i){x=1217;break L1384}y=t+w|0;z=y;if(n){x=1219;break L1384}a[u+v|0]=((d[t+(w|1)|0]|0)+(d[y]|0)+(d[z+j|0]|0)+(d[z+o|0]|0)|0)>>>2&255}z=v+1|0;if(z>>>0<h>>>0){v=z}else{r=g;break}}}v=p+1|0;if(v>>>0<f>>>0){p=v;q=r}else{x=1225;break}}if((x|0)==1219){bF(224,2776,19,3504)}else if((x|0)==1225){return}else if((x|0)==1217){bF(224,2776,19,3504)}}function dn(a,b,d,f){a=a|0;b=b|0;d=d|0;f=f|0;var g=0,h=0,i=0,j=0;f=a+4|0;c[f>>2]=0;g=d<<1;h=(e[b+2>>1]|0)+g|0;i=h&3;if((i|0)==0){j=h}else{j=h+4-i|0}c[f>>2]=j;i=l3((ag((e[b>>1]|0)+g|0,j)|0)+64|0)|0;j=lX(20)|0;c[j+4>>2]=1;c[j+8>>2]=1;c[j>>2]=10040;c[j+12>>2]=i;c[j+16>>2]=288;g=a+12|0;c[g>>2]=i;i=a+16|0;b=c[i>>2]|0;c[i>>2]=j;do{if((b|0)!=0){j=b+4|0;if(((I=c[j>>2]|0,c[j>>2]=I+ -1,I)|0)!=1){break}j=b;bY[c[(c[j>>2]|0)+8>>2]&511](b);i=b+8|0;if(((I=c[i>>2]|0,c[i>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[j>>2]|0)+12>>2]&511](b)}}while(0);b=c[g>>2]|0;g=b+((ag(c[f>>2]|0,d)|0)+d)|0;c[a+20>>2]=g;if((g|0)==0){bF(1744,1432,118,6272)}else{return}}function dp(a,d,e,f,g){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;b[a>>1]=e&65535;b[a+2>>1]=f&65535;c[a+4>>2]=g;c[a+8>>2]=0;g=a+12|0;c[g>>2]=0;f=a+16|0;c[f>>2]=0;e=lX(20)|0;c[e+4>>2]=1;c[e+8>>2]=1;c[e>>2]=10080;c[e+12>>2]=d;c[e+16>>2]=234;c[g>>2]=d;c[f>>2]=e;c[a+20>>2]=c[g>>2];return}function dq(a,d,f){a=a|0;d=d|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;g=i;i=i+32|0;h=g|0;j=g+24|0;k=a+12|0;c[k>>2]=0;l=a+16|0;c[l>>2]=0;m=a+20|0;c[m>>2]=0;d7(a+24|0,d);n=a+164|0;dx(n,d);o=h|0;p=d|0;b[o>>1]=b[p>>1]|0;q=h+2|0;r=d+2|0;b[q>>1]=b[r>>1]|0;s=h+4|0;c[s>>2]=0;t=h+8|0;c[t>>2]=6;u=h+12|0;c[u>>2]=0;v=h+16|0;c[v>>2]=0;w=h+20|0;c[w>>2]=0;dn(h,d,6,0);b[a>>1]=b[o>>1]|0;b[a+2>>1]=b[q>>1]|0;c[a+4>>2]=c[s>>2];s=c[u>>2]|0;q=c[v>>2]|0;if((q|0)!=0){o=q+4|0;I=c[o>>2]|0,c[o>>2]=I+1,I}c[k>>2]=s;s=c[l>>2]|0;c[l>>2]=q;do{if((s|0)!=0){q=s+4|0;if(((I=c[q>>2]|0,c[q>>2]=I+ -1,I)|0)!=1){break}q=s;bY[c[(c[q>>2]|0)+8>>2]&511](s);l=s+8|0;if(((I=c[l>>2]|0,c[l>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[q>>2]|0)+12>>2]&511](s)}}while(0);c[a+8>>2]=c[t>>2];c[m>>2]=c[w>>2];c[u>>2]=0;u=c[v>>2]|0;c[v>>2]=0;do{if((u|0)!=0){w=u+4|0;do{if(((I=c[w>>2]|0,c[w>>2]=I+ -1,I)|0)==1){m=u;bY[c[(c[m>>2]|0)+8>>2]&511](u);t=u+8|0;if(((I=c[t>>2]|0,c[t>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[m>>2]|0)+12>>2]&511](u)}}while(0);w=c[v>>2]|0;if((w|0)==0){break}m=w+4|0;if(((I=c[m>>2]|0,c[m>>2]=I+ -1,I)|0)!=1){break}m=w;bY[c[(c[m>>2]|0)+8>>2]&511](w);t=w+8|0;if(((I=c[t>>2]|0,c[t>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[m>>2]|0)+12>>2]&511](w)}}while(0);c[a+860>>2]=0;v=a+864|0;c[v>>2]=0;if((f|0)<=1){i=g;return}u=lX(868)|0;w=u;m=~~(+(e[r>>1]|0|0)*.5);b[j>>1]=~~(+(e[p>>1]|0|0)*.5)&65535;b[j+2>>1]=m&65535;dw(w,j,a,f-1|0);c[v>>2]=w;c[u+688>>2]=n;c[a+684>>2]=u+164;i=g;return}function dr(a){a=a|0;var b=0,d=0,e=0,f=0,g=0;b=c[a+120>>2]|0;d=b;if((b|0)!=0){e=a+124|0;f=c[e>>2]|0;if((b|0)!=(f|0)){c[e>>2]=f+(~((f-4+(-d|0)|0)>>>2)<<2)}l_(b)}b=c[a+108>>2]|0;d=b;if((b|0)!=0){f=a+112|0;e=c[f>>2]|0;if((b|0)!=(e|0)){c[f>>2]=e+(~((e-32+(-d|0)|0)>>>5)<<5)}l_(b)}b=c[a+96>>2]|0;d=b;if((b|0)!=0){e=a+100|0;f=c[e>>2]|0;if((b|0)!=(f|0)){c[e>>2]=f+(~((f-32+(-d|0)|0)>>>5)<<5)}l_(b)}b=c[a+84>>2]|0;d=b;if((b|0)!=0){f=a+88|0;e=c[f>>2]|0;if((b|0)!=(e|0)){c[f>>2]=e+(~((e-4+(-d|0)|0)>>>2)<<2)}l_(b)}b=c[a+72>>2]|0;d=b;if((b|0)!=0){e=a+76|0;f=c[e>>2]|0;if((b|0)!=(f|0)){c[e>>2]=f+(~((f-4+(-d|0)|0)>>>2)<<2)}l_(b)}b=c[a+60>>2]|0;d=b;if((b|0)!=0){f=a+64|0;e=c[f>>2]|0;if((b|0)!=(e|0)){c[f>>2]=e+(~(((e-28+(-d|0)|0)>>>0)/28|0)*28|0)}l_(b)}b=c[a+48>>2]|0;d=b;if((b|0)!=0){e=a+52|0;f=c[e>>2]|0;if((b|0)!=(f|0)){c[e>>2]=f+(~(((f-28+(-d|0)|0)>>>0)/28|0)*28|0)}l_(b)}c[a+36>>2]=0;b=a+40|0;d=c[b>>2]|0;c[b>>2]=0;do{if((d|0)!=0){f=d+4|0;do{if(((I=c[f>>2]|0,c[f>>2]=I+ -1,I)|0)==1){e=d;bY[c[(c[e>>2]|0)+8>>2]&511](d);g=d+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[e>>2]|0)+12>>2]&511](d)}}while(0);f=c[b>>2]|0;if((f|0)==0){break}e=f+4|0;if(((I=c[e>>2]|0,c[e>>2]=I+ -1,I)|0)!=1){break}e=f;bY[c[(c[e>>2]|0)+8>>2]&511](f);g=f+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[e>>2]|0)+12>>2]&511](f)}}while(0);c[a+12>>2]=0;b=a+16|0;a=c[b>>2]|0;c[b>>2]=0;if((a|0)==0){return}d=a+4|0;do{if(((I=c[d>>2]|0,c[d>>2]=I+ -1,I)|0)==1){f=a;bY[c[(c[f>>2]|0)+8>>2]&511](a);e=a+8|0;if(((I=c[e>>2]|0,c[e>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](a)}}while(0);a=c[b>>2]|0;if((a|0)==0){return}b=a+4|0;if(((I=c[b>>2]|0,c[b>>2]=I+ -1,I)|0)!=1){return}b=a;bY[c[(c[b>>2]|0)+8>>2]&511](a);d=a+8|0;if(((I=c[d>>2]|0,c[d>>2]=I+ -1,I)|0)!=1){return}bY[c[(c[b>>2]|0)+12>>2]&511](a);return}function ds(a){a=a|0;var b=0,d=0,e=0,f=0,g=0;c[a+668>>2]=0;b=a+672|0;d=c[b>>2]|0;c[b>>2]=0;do{if((d|0)!=0){e=d+4|0;do{if(((I=c[e>>2]|0,c[e>>2]=I+ -1,I)|0)==1){f=d;bY[c[(c[f>>2]|0)+8>>2]&511](d);g=d+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](d)}}while(0);e=c[b>>2]|0;if((e|0)==0){break}f=e+4|0;if(((I=c[f>>2]|0,c[f>>2]=I+ -1,I)|0)!=1){break}f=e;bY[c[(c[f>>2]|0)+8>>2]&511](e);g=e+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](e)}}while(0);c[a+644>>2]=0;b=a+648|0;d=c[b>>2]|0;c[b>>2]=0;do{if((d|0)!=0){e=d+4|0;do{if(((I=c[e>>2]|0,c[e>>2]=I+ -1,I)|0)==1){f=d;bY[c[(c[f>>2]|0)+8>>2]&511](d);g=d+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](d)}}while(0);e=c[b>>2]|0;if((e|0)==0){break}f=e+4|0;if(((I=c[f>>2]|0,c[f>>2]=I+ -1,I)|0)!=1){break}f=e;bY[c[(c[f>>2]|0)+8>>2]&511](e);g=e+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](e)}}while(0);c[a+620>>2]=0;b=a+624|0;d=c[b>>2]|0;c[b>>2]=0;do{if((d|0)!=0){e=d+4|0;do{if(((I=c[e>>2]|0,c[e>>2]=I+ -1,I)|0)==1){f=d;bY[c[(c[f>>2]|0)+8>>2]&511](d);g=d+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](d)}}while(0);e=c[b>>2]|0;if((e|0)==0){break}f=e+4|0;if(((I=c[f>>2]|0,c[f>>2]=I+ -1,I)|0)!=1){break}f=e;bY[c[(c[f>>2]|0)+8>>2]&511](e);g=e+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](e)}}while(0);c[a+592>>2]=0;b=a+596|0;d=c[b>>2]|0;c[b>>2]=0;do{if((d|0)!=0){e=d+4|0;do{if(((I=c[e>>2]|0,c[e>>2]=I+ -1,I)|0)==1){f=d;bY[c[(c[f>>2]|0)+8>>2]&511](d);g=d+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](d)}}while(0);e=c[b>>2]|0;if((e|0)==0){break}f=e+4|0;if(((I=c[f>>2]|0,c[f>>2]=I+ -1,I)|0)!=1){break}f=e;bY[c[(c[f>>2]|0)+8>>2]&511](e);g=e+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](e)}}while(0);c[a+568>>2]=0;b=a+572|0;d=c[b>>2]|0;c[b>>2]=0;do{if((d|0)!=0){e=d+4|0;do{if(((I=c[e>>2]|0,c[e>>2]=I+ -1,I)|0)==1){f=d;bY[c[(c[f>>2]|0)+8>>2]&511](d);g=d+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](d)}}while(0);e=c[b>>2]|0;if((e|0)==0){break}f=e+4|0;if(((I=c[f>>2]|0,c[f>>2]=I+ -1,I)|0)!=1){break}f=e;bY[c[(c[f>>2]|0)+8>>2]&511](e);g=e+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](e)}}while(0);c[a+544>>2]=0;b=a+548|0;d=c[b>>2]|0;c[b>>2]=0;do{if((d|0)!=0){e=d+4|0;do{if(((I=c[e>>2]|0,c[e>>2]=I+ -1,I)|0)==1){f=d;bY[c[(c[f>>2]|0)+8>>2]&511](d);g=d+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](d)}}while(0);e=c[b>>2]|0;if((e|0)==0){break}f=e+4|0;if(((I=c[f>>2]|0,c[f>>2]=I+ -1,I)|0)!=1){break}f=e;bY[c[(c[f>>2]|0)+8>>2]&511](e);g=e+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](e)}}while(0);dv(a+452|0);du(a+328|0);dt(a+188|0);dt(a+48|0);c[a+36>>2]=0;b=a+40|0;d=c[b>>2]|0;c[b>>2]=0;do{if((d|0)!=0){e=d+4|0;do{if(((I=c[e>>2]|0,c[e>>2]=I+ -1,I)|0)==1){f=d;bY[c[(c[f>>2]|0)+8>>2]&511](d);g=d+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](d)}}while(0);e=c[b>>2]|0;if((e|0)==0){break}f=e+4|0;if(((I=c[f>>2]|0,c[f>>2]=I+ -1,I)|0)!=1){break}f=e;bY[c[(c[f>>2]|0)+8>>2]&511](e);g=e+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](e)}}while(0);c[a+12>>2]=0;b=a+16|0;a=c[b>>2]|0;c[b>>2]=0;if((a|0)==0){return}d=a+4|0;do{if(((I=c[d>>2]|0,c[d>>2]=I+ -1,I)|0)==1){e=a;bY[c[(c[e>>2]|0)+8>>2]&511](a);f=a+8|0;if(((I=c[f>>2]|0,c[f>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[e>>2]|0)+12>>2]&511](a)}}while(0);a=c[b>>2]|0;if((a|0)==0){return}b=a+4|0;if(((I=c[b>>2]|0,c[b>>2]=I+ -1,I)|0)!=1){return}b=a;bY[c[(c[b>>2]|0)+8>>2]&511](a);d=a+8|0;if(((I=c[d>>2]|0,c[d>>2]=I+ -1,I)|0)!=1){return}bY[c[(c[b>>2]|0)+12>>2]&511](a);return}function dt(a){a=a|0;var b=0,d=0,e=0,f=0,g=0;c[a+60>>2]=0;b=a+64|0;d=c[b>>2]|0;c[b>>2]=0;do{if((d|0)!=0){e=d+4|0;do{if(((I=c[e>>2]|0,c[e>>2]=I+ -1,I)|0)==1){f=d;bY[c[(c[f>>2]|0)+8>>2]&511](d);g=d+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](d)}}while(0);e=c[b>>2]|0;if((e|0)==0){break}f=e+4|0;if(((I=c[f>>2]|0,c[f>>2]=I+ -1,I)|0)!=1){break}f=e;bY[c[(c[f>>2]|0)+8>>2]&511](e);g=e+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](e)}}while(0);c[a+36>>2]=0;b=a+40|0;d=c[b>>2]|0;c[b>>2]=0;do{if((d|0)!=0){e=d+4|0;do{if(((I=c[e>>2]|0,c[e>>2]=I+ -1,I)|0)==1){f=d;bY[c[(c[f>>2]|0)+8>>2]&511](d);g=d+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](d)}}while(0);e=c[b>>2]|0;if((e|0)==0){break}f=e+4|0;if(((I=c[f>>2]|0,c[f>>2]=I+ -1,I)|0)!=1){break}f=e;bY[c[(c[f>>2]|0)+8>>2]&511](e);g=e+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](e)}}while(0);c[a+12>>2]=0;b=a+16|0;a=c[b>>2]|0;c[b>>2]=0;if((a|0)==0){return}d=a+4|0;do{if(((I=c[d>>2]|0,c[d>>2]=I+ -1,I)|0)==1){e=a;bY[c[(c[e>>2]|0)+8>>2]&511](a);f=a+8|0;if(((I=c[f>>2]|0,c[f>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[e>>2]|0)+12>>2]&511](a)}}while(0);a=c[b>>2]|0;if((a|0)==0){return}b=a+4|0;if(((I=c[b>>2]|0,c[b>>2]=I+ -1,I)|0)!=1){return}b=a;bY[c[(c[b>>2]|0)+8>>2]&511](a);d=a+8|0;if(((I=c[d>>2]|0,c[d>>2]=I+ -1,I)|0)!=1){return}bY[c[(c[b>>2]|0)+12>>2]&511](a);return}function du(a){a=a|0;var b=0,d=0,e=0,f=0,g=0;c[a+112>>2]=0;b=a+116|0;d=c[b>>2]|0;c[b>>2]=0;do{if((d|0)!=0){e=d+4|0;do{if(((I=c[e>>2]|0,c[e>>2]=I+ -1,I)|0)==1){f=d;bY[c[(c[f>>2]|0)+8>>2]&511](d);g=d+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](d)}}while(0);e=c[b>>2]|0;if((e|0)==0){break}f=e+4|0;if(((I=c[f>>2]|0,c[f>>2]=I+ -1,I)|0)!=1){break}f=e;bY[c[(c[f>>2]|0)+8>>2]&511](e);g=e+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](e)}}while(0);c[a+88>>2]=0;b=a+92|0;d=c[b>>2]|0;c[b>>2]=0;do{if((d|0)!=0){e=d+4|0;do{if(((I=c[e>>2]|0,c[e>>2]=I+ -1,I)|0)==1){f=d;bY[c[(c[f>>2]|0)+8>>2]&511](d);g=d+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](d)}}while(0);e=c[b>>2]|0;if((e|0)==0){break}f=e+4|0;if(((I=c[f>>2]|0,c[f>>2]=I+ -1,I)|0)!=1){break}f=e;bY[c[(c[f>>2]|0)+8>>2]&511](e);g=e+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](e)}}while(0);c[a+64>>2]=0;b=a+68|0;d=c[b>>2]|0;c[b>>2]=0;do{if((d|0)!=0){e=d+4|0;do{if(((I=c[e>>2]|0,c[e>>2]=I+ -1,I)|0)==1){f=d;bY[c[(c[f>>2]|0)+8>>2]&511](d);g=d+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](d)}}while(0);e=c[b>>2]|0;if((e|0)==0){break}f=e+4|0;if(((I=c[f>>2]|0,c[f>>2]=I+ -1,I)|0)!=1){break}f=e;bY[c[(c[f>>2]|0)+8>>2]&511](e);g=e+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](e)}}while(0);c[a+40>>2]=0;b=a+44|0;d=c[b>>2]|0;c[b>>2]=0;do{if((d|0)!=0){e=d+4|0;do{if(((I=c[e>>2]|0,c[e>>2]=I+ -1,I)|0)==1){f=d;bY[c[(c[f>>2]|0)+8>>2]&511](d);g=d+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](d)}}while(0);e=c[b>>2]|0;if((e|0)==0){break}f=e+4|0;if(((I=c[f>>2]|0,c[f>>2]=I+ -1,I)|0)!=1){break}f=e;bY[c[(c[f>>2]|0)+8>>2]&511](e);g=e+8|0;if(((I=c[g>>2]|0,c[g>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](e)}}while(0);c[a+16>>2]=0;b=a+20|0;a=c[b>>2]|0;c[b>>2]=0;if((a|0)==0){return}d=a+4|0;do{if(((I=c[d>>2]|0,c[d>>2]=I+ -1,I)|0)==1){e=a;bY[c[(c[e>>2]|0)+8>>2]&511](a);f=a+8|0;if(((I=c[f>>2]|0,c[f>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[e>>2]|0)+12>>2]&511](a)}}while(0);a=c[b>>2]|0;if((a|0)==0){return}b=a+4|0;if(((I=c[b>>2]|0,c[b>>2]=I+ -1,I)|0)!=1){return}b=a;bY[c[(c[b>>2]|0)+8>>2]&511](a);d=a+8|0;if(((I=c[d>>2]|0,c[d>>2]=I+ -1,I)|0)!=1){return}bY[c[(c[b>>2]|0)+12>>2]&511](a);return}function dv(a){a=a|0;var b=0,d=0,e=0,f=0;b=c[a+48>>2]|0;d=b;if((b|0)!=0){e=a+52|0;f=c[e>>2]|0;if((b|0)!=(f|0)){c[e>>2]=f+(~((f-4+(-d|0)|0)>>>2)<<2)}l_(b)}b=c[a+36>>2]|0;d=b;if((b|0)!=0){f=a+40|0;e=c[f>>2]|0;if((b|0)!=(e|0)){c[f>>2]=e+(~((e-4+(-d|0)|0)>>>2)<<2)}l_(b)}b=c[a+24>>2]|0;d=b;if((b|0)!=0){e=a+28|0;f=c[e>>2]|0;if((b|0)!=(f|0)){c[e>>2]=f+(~((f-4+(-d|0)|0)>>>2)<<2)}l_(b)}c[a+12>>2]=0;b=a+16|0;a=c[b>>2]|0;c[b>>2]=0;if((a|0)==0){return}d=a+4|0;do{if(((I=c[d>>2]|0,c[d>>2]=I+ -1,I)|0)==1){f=a;bY[c[(c[f>>2]|0)+8>>2]&511](a);e=a+8|0;if(((I=c[e>>2]|0,c[e>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[f>>2]|0)+12>>2]&511](a)}}while(0);a=c[b>>2]|0;if((a|0)==0){return}b=a+4|0;if(((I=c[b>>2]|0,c[b>>2]=I+ -1,I)|0)!=1){return}b=a;bY[c[(c[b>>2]|0)+8>>2]&511](a);d=a+8|0;if(((I=c[d>>2]|0,c[d>>2]=I+ -1,I)|0)!=1){return}bY[c[(c[b>>2]|0)+12>>2]&511](a);return}function dw(a,d,f,g){a=a|0;d=d|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;h=i;i=i+32|0;j=h|0;k=h+24|0;l=a+12|0;c[l>>2]=0;m=a+16|0;c[m>>2]=0;n=a+20|0;c[n>>2]=0;d7(a+24|0,d);o=a+164|0;dx(o,d);p=j|0;q=d|0;b[p>>1]=b[q>>1]|0;r=j+2|0;s=d+2|0;b[r>>1]=b[s>>1]|0;t=j+4|0;c[t>>2]=0;u=j+8|0;c[u>>2]=6;v=j+12|0;c[v>>2]=0;w=j+16|0;c[w>>2]=0;x=j+20|0;c[x>>2]=0;dn(j,d,6,0);b[a>>1]=b[p>>1]|0;b[a+2>>1]=b[r>>1]|0;c[a+4>>2]=c[t>>2];t=c[v>>2]|0;r=c[w>>2]|0;if((r|0)!=0){p=r+4|0;I=c[p>>2]|0,c[p>>2]=I+1,I}c[l>>2]=t;t=c[m>>2]|0;c[m>>2]=r;do{if((t|0)!=0){r=t+4|0;if(((I=c[r>>2]|0,c[r>>2]=I+ -1,I)|0)!=1){break}r=t;bY[c[(c[r>>2]|0)+8>>2]&511](t);m=t+8|0;if(((I=c[m>>2]|0,c[m>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[r>>2]|0)+12>>2]&511](t)}}while(0);c[a+8>>2]=c[u>>2];c[n>>2]=c[x>>2];c[v>>2]=0;v=c[w>>2]|0;c[w>>2]=0;do{if((v|0)!=0){x=v+4|0;do{if(((I=c[x>>2]|0,c[x>>2]=I+ -1,I)|0)==1){n=v;bY[c[(c[n>>2]|0)+8>>2]&511](v);u=v+8|0;if(((I=c[u>>2]|0,c[u>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[n>>2]|0)+12>>2]&511](v)}}while(0);x=c[w>>2]|0;if((x|0)==0){break}n=x+4|0;if(((I=c[n>>2]|0,c[n>>2]=I+ -1,I)|0)!=1){break}n=x;bY[c[(c[n>>2]|0)+8>>2]&511](x);u=x+8|0;if(((I=c[u>>2]|0,c[u>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[n>>2]|0)+12>>2]&511](x)}}while(0);c[a+860>>2]=f;f=a+864|0;c[f>>2]=0;if((g|0)<=1){i=h;return}w=lX(868)|0;v=w;x=~~(+(e[s>>1]|0|0)*.5);b[k>>1]=~~(+(e[q>>1]|0|0)*.5)&65535;b[k+2>>1]=x&65535;dw(v,k,a,g-1|0);c[f>>2]=v;c[w+688>>2]=o;c[a+684>>2]=w+164;i=h;return}function dx(d,f){d=d|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,J=0,K=0,L=0;g=i;i=i+136|0;h=g|0;j=g+8|0;k=g+32|0;l=g+40|0;m=g+64|0;n=g+72|0;o=g+96|0;p=g+104|0;q=g+128|0;r=f|0;b[d>>1]=b[r>>1]|0;s=f+2|0;b[d+2>>1]=b[s>>1]|0;l6(d+4|0,0,20);dn(d|0,f,0,0);c[d+36>>2]=0;c[d+40>>2]=0;c[d+44>>2]=0;d6(d+48|0,f);d6(d+188|0,f);d4(d+328|0,f);t=d+452|0;u=~~(+(e[s>>1]|0|0)*.25);v=~~(+(e[r>>1]|0|0)*.25)&65535;b[h>>1]=v;w=u&65535;b[h+2>>1]=w;b[t>>1]=v;b[d+454>>1]=w;l6(d+456|0,0,20);dZ(t|0,h,0,0);l6(d+476|0,0,36);c[d+528>>2]=0;h=d+532|0;l6(d+512|0,0,12);b[h>>1]=b[r>>1]|0;b[d+534>>1]=b[s>>1]|0;l6(d+536|0,0,20);dY(h,f,0,0);h=d+556|0;b[h>>1]=b[r>>1]|0;b[d+558>>1]=b[s>>1]|0;c[d+560>>2]=0;c[d+564>>2]=4;c[d+568>>2]=0;c[d+572>>2]=0;c[d+576>>2]=0;dn(h,f,4,0);f=d+592|0;c[f>>2]=0;h=d+596|0;c[h>>2]=0;t=d+600|0;c[t>>2]=0;w=d+604|0;c[w>>2]=8;v=d+620|0;c[v>>2]=0;u=d+624|0;c[u>>2]=0;x=d+628|0;c[x>>2]=0;y=d+644|0;c[y>>2]=0;z=d+648|0;c[z>>2]=0;A=d+652|0;c[A>>2]=0;B=d+668|0;c[B>>2]=0;C=d+672|0;c[C>>2]=0;D=d+676|0;c[D>>2]=0;c[d+680>>2]=1;c[d+684>>2]=1;c[d+688>>2]=300;a[d+692|0]=1;E=b[r>>1]|0;F=((E&15)!=0)+((E&65535)>>>4)&65535;E=b[s>>1]|0;G=((E&15)!=0)+((E&65535)>>>4)&65535;b[k>>1]=F;b[k+2>>1]=G;E=j|0;b[E>>1]=F;F=j+2|0;b[F>>1]=G;G=j+4|0;H=j+8|0;J=j+12|0;K=j+16|0;L=j+20|0;l6(G|0,0,20);dn(j,k,0,0);b[d+580>>1]=b[E>>1]|0;b[d+582>>1]=b[F>>1]|0;c[d+584>>2]=c[G>>2];G=c[J>>2]|0;F=c[K>>2]|0;if((F|0)!=0){E=F+4|0;I=c[E>>2]|0,c[E>>2]=I+1,I}c[f>>2]=G;G=c[h>>2]|0;c[h>>2]=F;do{if((G|0)!=0){F=G+4|0;if(((I=c[F>>2]|0,c[F>>2]=I+ -1,I)|0)!=1){break}F=G;bY[c[(c[F>>2]|0)+8>>2]&511](G);h=G+8|0;if(((I=c[h>>2]|0,c[h>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[F>>2]|0)+12>>2]&511](G)}}while(0);c[d+588>>2]=c[H>>2];c[t>>2]=c[L>>2];c[J>>2]=0;J=c[K>>2]|0;c[K>>2]=0;do{if((J|0)!=0){L=J+4|0;do{if(((I=c[L>>2]|0,c[L>>2]=I+ -1,I)|0)==1){t=J;bY[c[(c[t>>2]|0)+8>>2]&511](J);H=J+8|0;if(((I=c[H>>2]|0,c[H>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[t>>2]|0)+12>>2]&511](J)}}while(0);L=c[K>>2]|0;if((L|0)==0){break}t=L+4|0;if(((I=c[t>>2]|0,c[t>>2]=I+ -1,I)|0)!=1){break}t=L;bY[c[(c[t>>2]|0)+8>>2]&511](L);H=L+8|0;if(((I=c[H>>2]|0,c[H>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[t>>2]|0)+12>>2]&511](L)}}while(0);K=e[r>>1]|0;J=~~+(c[w>>2]|0);L=e[s>>1]|0;t=(((K|0)%(J|0)|0|0)!=0)+((K|0)/(J|0)|0)&65535;b[m>>1]=t;K=(((L|0)%(J|0)|0|0)!=0)+((L|0)/(J|0)|0)&65535;b[m+2>>1]=K;J=l|0;b[J>>1]=t;t=l+2|0;b[t>>1]=K;K=l+4|0;L=l+8|0;H=l+12|0;G=l+16|0;F=l+20|0;l6(K|0,0,20);dX(l,m,0,0);b[d+608>>1]=b[J>>1]|0;b[d+610>>1]=b[t>>1]|0;c[d+612>>2]=c[K>>2];K=c[H>>2]|0;t=c[G>>2]|0;if((t|0)!=0){J=t+4|0;I=c[J>>2]|0,c[J>>2]=I+1,I}c[v>>2]=K;K=c[u>>2]|0;c[u>>2]=t;do{if((K|0)!=0){t=K+4|0;if(((I=c[t>>2]|0,c[t>>2]=I+ -1,I)|0)!=1){break}t=K;bY[c[(c[t>>2]|0)+8>>2]&511](K);u=K+8|0;if(((I=c[u>>2]|0,c[u>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[t>>2]|0)+12>>2]&511](K)}}while(0);c[d+616>>2]=c[L>>2];c[x>>2]=c[F>>2];c[H>>2]=0;H=c[G>>2]|0;c[G>>2]=0;do{if((H|0)!=0){F=H+4|0;do{if(((I=c[F>>2]|0,c[F>>2]=I+ -1,I)|0)==1){x=H;bY[c[(c[x>>2]|0)+8>>2]&511](H);L=H+8|0;if(((I=c[L>>2]|0,c[L>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[x>>2]|0)+12>>2]&511](H)}}while(0);F=c[G>>2]|0;if((F|0)==0){break}x=F+4|0;if(((I=c[x>>2]|0,c[x>>2]=I+ -1,I)|0)!=1){break}x=F;bY[c[(c[x>>2]|0)+8>>2]&511](F);L=F+8|0;if(((I=c[L>>2]|0,c[L>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[x>>2]|0)+12>>2]&511](F)}}while(0);G=e[r>>1]|0;H=~~+(c[w>>2]|0);F=e[s>>1]|0;x=(((G|0)%(H|0)|0|0)!=0)+((G|0)/(H|0)|0)&65535;b[o>>1]=x;G=(((F|0)%(H|0)|0|0)!=0)+((F|0)/(H|0)|0)&65535;b[o+2>>1]=G;H=n|0;b[H>>1]=x;x=n+2|0;b[x>>1]=G;G=n+4|0;F=n+8|0;L=n+12|0;K=n+16|0;t=n+20|0;l6(G|0,0,20);dW(n,o,0,0);b[d+632>>1]=b[H>>1]|0;b[d+634>>1]=b[x>>1]|0;c[d+636>>2]=c[G>>2];G=c[L>>2]|0;x=c[K>>2]|0;if((x|0)!=0){H=x+4|0;I=c[H>>2]|0,c[H>>2]=I+1,I}c[y>>2]=G;G=c[z>>2]|0;c[z>>2]=x;do{if((G|0)!=0){x=G+4|0;if(((I=c[x>>2]|0,c[x>>2]=I+ -1,I)|0)!=1){break}x=G;bY[c[(c[x>>2]|0)+8>>2]&511](G);z=G+8|0;if(((I=c[z>>2]|0,c[z>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[x>>2]|0)+12>>2]&511](G)}}while(0);c[d+640>>2]=c[F>>2];c[A>>2]=c[t>>2];c[L>>2]=0;L=c[K>>2]|0;c[K>>2]=0;do{if((L|0)!=0){t=L+4|0;do{if(((I=c[t>>2]|0,c[t>>2]=I+ -1,I)|0)==1){A=L;bY[c[(c[A>>2]|0)+8>>2]&511](L);F=L+8|0;if(((I=c[F>>2]|0,c[F>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[A>>2]|0)+12>>2]&511](L)}}while(0);t=c[K>>2]|0;if((t|0)==0){break}A=t+4|0;if(((I=c[A>>2]|0,c[A>>2]=I+ -1,I)|0)!=1){break}A=t;bY[c[(c[A>>2]|0)+8>>2]&511](t);F=t+8|0;if(((I=c[F>>2]|0,c[F>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[A>>2]|0)+12>>2]&511](t)}}while(0);K=e[r>>1]|0;r=~~+(c[w>>2]|0);w=e[s>>1]|0;s=(((K|0)%(r|0)|0|0)!=0)+((K|0)/(r|0)|0)&65535;b[q>>1]=s;K=(((w|0)%(r|0)|0|0)!=0)+((w|0)/(r|0)|0)&65535;b[q+2>>1]=K;r=p|0;b[r>>1]=s;s=p+2|0;b[s>>1]=K;K=p+4|0;w=p+8|0;L=p+12|0;t=p+16|0;A=p+20|0;l6(K|0,0,20);dY(p,q,0,0);b[d+656>>1]=b[r>>1]|0;b[d+658>>1]=b[s>>1]|0;c[d+660>>2]=c[K>>2];K=c[L>>2]|0;s=c[t>>2]|0;if((s|0)!=0){r=s+4|0;I=c[r>>2]|0,c[r>>2]=I+1,I}c[B>>2]=K;K=c[C>>2]|0;c[C>>2]=s;do{if((K|0)!=0){s=K+4|0;if(((I=c[s>>2]|0,c[s>>2]=I+ -1,I)|0)!=1){break}s=K;bY[c[(c[s>>2]|0)+8>>2]&511](K);C=K+8|0;if(((I=c[C>>2]|0,c[C>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[s>>2]|0)+12>>2]&511](K)}}while(0);c[d+664>>2]=c[w>>2];c[D>>2]=c[A>>2];c[L>>2]=0;L=c[t>>2]|0;c[t>>2]=0;if((L|0)==0){i=g;return}A=L+4|0;do{if(((I=c[A>>2]|0,c[A>>2]=I+ -1,I)|0)==1){D=L;bY[c[(c[D>>2]|0)+8>>2]&511](L);w=L+8|0;if(((I=c[w>>2]|0,c[w>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[D>>2]|0)+12>>2]&511](L)}}while(0);L=c[t>>2]|0;if((L|0)==0){i=g;return}t=L+4|0;if(((I=c[t>>2]|0,c[t>>2]=I+ -1,I)|0)!=1){i=g;return}t=L;bY[c[(c[t>>2]|0)+8>>2]&511](L);A=L+8|0;if(((I=c[A>>2]|0,c[A>>2]=I+ -1,I)|0)!=1){i=g;return}bY[c[(c[t>>2]|0)+12>>2]&511](L);i=g;return}function dy(a){a=a|0;return}function dz(a){a=a|0;return}function dA(a){a=a|0;return}function dB(a){a=a|0;return}function dC(a,b){a=a|0;b=b|0;var d=0;if((c[b+4>>2]|0)!=10472){d=0;return d|0}d=a+16|0;return d|0}function dD(a){a=a|0;return a+16|0}function dE(a,b){a=a|0;b=b|0;var d=0;if((c[b+4>>2]|0)!=10352){d=0;return d|0}d=a+16|0;return d|0}function dF(a){a=a|0;return a+16|0}function dG(a,b){a=a|0;b=b|0;var d=0;if((c[b+4>>2]|0)!=10328){d=0;return d|0}d=a+16|0;return d|0}function dH(a){a=a|0;return a+16|0}function dI(a,b){a=a|0;b=b|0;var d=0;if((c[b+4>>2]|0)!=10336){d=0;return d|0}d=a+16|0;return d|0}function dJ(a){a=a|0;return a+16|0}function dK(a){a=a|0;if((a|0)==0){return}l$(a);return}function dL(a){a=a|0;l_(a);return}function dM(a){a=a|0;bY[c[a+16>>2]&511](c[a+12>>2]|0);return}function dN(a){a=a|0;if((a|0)==0){return}l$(a);return}function dO(a){a=a|0;l_(a);return}function dP(a){a=a|0;bY[c[a+16>>2]&511](c[a+12>>2]|0);return}function dQ(a){a=a|0;if((a|0)==0){return}l$(a);return}function dR(a){a=a|0;l_(a);return}function dS(a){a=a|0;bY[c[a+16>>2]&511](c[a+12>>2]|0);return}function dT(a){a=a|0;if((a|0)==0){return}l$(a);return}function dU(a){a=a|0;l_(a);return}function dV(a){a=a|0;bY[c[a+16>>2]&511](c[a+12>>2]|0);return}function dW(a,b,d,f){a=a|0;b=b|0;d=d|0;f=f|0;var g=0,h=0,i=0;f=a+4|0;c[f>>2]=0;g=d<<1;h=(e[b+2>>1]|0)+g<<3;c[f>>2]=h;i=l3((ag((e[b>>1]|0)+g|0,h)|0)+64|0)|0;h=lX(20)|0;c[h+4>>2]=1;c[h+8>>2]=1;c[h>>2]=10120;c[h+12>>2]=i;c[h+16>>2]=88;g=a+12|0;c[g>>2]=i;i=a+16|0;b=c[i>>2]|0;c[i>>2]=h;do{if((b|0)!=0){h=b+4|0;if(((I=c[h>>2]|0,c[h>>2]=I+ -1,I)|0)!=1){break}h=b;bY[c[(c[h>>2]|0)+8>>2]&511](b);i=b+8|0;if(((I=c[i>>2]|0,c[i>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[h>>2]|0)+12>>2]&511](b)}}while(0);b=c[g>>2]|0;g=b+(((ag(c[f>>2]|0,d)|0)>>>3)+d<<3)|0;c[a+20>>2]=g;if((g|0)==0){bF(1744,1432,118,6704)}else{return}}function dX(a,b,d,f){a=a|0;b=b|0;d=d|0;f=f|0;var g=0,h=0,i=0;f=a+4|0;c[f>>2]=0;g=d<<1;h=((e[b+2>>1]|0)+g|0)*12|0;c[f>>2]=h;i=l3((ag((e[b>>1]|0)+g|0,h)|0)+64|0)|0;h=lX(20)|0;c[h+4>>2]=1;c[h+8>>2]=1;c[h>>2]=1e4;c[h+12>>2]=i;c[h+16>>2]=216;g=a+12|0;c[g>>2]=i;i=a+16|0;b=c[i>>2]|0;c[i>>2]=h;do{if((b|0)!=0){h=b+4|0;if(((I=c[h>>2]|0,c[h>>2]=I+ -1,I)|0)!=1){break}h=b;bY[c[(c[h>>2]|0)+8>>2]&511](b);i=b+8|0;if(((I=c[i>>2]|0,c[i>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[h>>2]|0)+12>>2]&511](b)}}while(0);b=c[g>>2]|0;g=b+(((((ag(c[f>>2]|0,d)|0)>>>0)/12|0)+d|0)*12|0)|0;c[a+20>>2]=g;if((g|0)==0){bF(1744,1432,118,6e3)}else{return}}function dY(a,b,d,f){a=a|0;b=b|0;d=d|0;f=f|0;var g=0,h=0,i=0;f=a+4|0;c[f>>2]=0;g=d<<1;h=(e[b+2>>1]|0)+g<<2;c[f>>2]=h;i=l3((ag((e[b>>1]|0)+g|0,h)|0)+64|0)|0;h=lX(20)|0;c[h+4>>2]=1;c[h+8>>2]=1;c[h>>2]=9880;c[h+12>>2]=i;c[h+16>>2]=282;g=a+12|0;c[g>>2]=i;i=a+16|0;b=c[i>>2]|0;c[i>>2]=h;do{if((b|0)!=0){h=b+4|0;if(((I=c[h>>2]|0,c[h>>2]=I+ -1,I)|0)!=1){break}h=b;bY[c[(c[h>>2]|0)+8>>2]&511](b);i=b+8|0;if(((I=c[i>>2]|0,c[i>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[h>>2]|0)+12>>2]&511](b)}}while(0);b=c[g>>2]|0;g=b+(((ag(c[f>>2]|0,d)|0)>>>2)+d<<2)|0;c[a+20>>2]=g;if((g|0)==0){bF(1744,1432,118,5552)}else{return}}function dZ(a,b,d,f){a=a|0;b=b|0;d=d|0;f=f|0;var g=0,h=0,i=0;f=a+4|0;c[f>>2]=0;g=d<<1;h=(e[b+2>>1]|0)+g<<2;c[f>>2]=h;i=l3((ag((e[b>>1]|0)+g|0,h)|0)+64|0)|0;h=lX(20)|0;c[h+4>>2]=1;c[h+8>>2]=1;c[h>>2]=9920;c[h+12>>2]=i;c[h+16>>2]=50;g=a+12|0;c[g>>2]=i;i=a+16|0;b=c[i>>2]|0;c[i>>2]=h;do{if((b|0)!=0){h=b+4|0;if(((I=c[h>>2]|0,c[h>>2]=I+ -1,I)|0)!=1){break}h=b;bY[c[(c[h>>2]|0)+8>>2]&511](b);i=b+8|0;if(((I=c[i>>2]|0,c[i>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[h>>2]|0)+12>>2]&511](b)}}while(0);b=c[g>>2]|0;g=b+(((ag(c[f>>2]|0,d)|0)>>>2)+d<<2)|0;c[a+20>>2]=g;if((g|0)==0){bF(1744,1432,118,5736)}else{return}}function d_(a){a=a|0;return}function d$(a,b){a=a|0;b=b|0;var d=0;if((c[b+4>>2]|0)!=10344){d=0;return d|0}d=a+16|0;return d|0}function d0(a){a=a|0;return a+16|0}function d1(a){a=a|0;if((a|0)!=0){l$(a)}return}function d2(a){a=a|0;l_(a);return}function d3(a){a=a|0;bY[c[a+16>>2]&511](c[a+12>>2]|0);return}function d4(a,d){a=a|0;d=d|0;var e=0,f=0,g=0;e=a+4|0;f=d|0;b[e>>1]=b[f>>1]|0;g=d+2|0;b[a+6>>1]=b[g>>1]|0;l6(a+8|0,0,20);dZ(e,d,0,0);e=a+28|0;b[e>>1]=b[f>>1]|0;b[a+30>>1]=b[g>>1]|0;l6(a+32|0,0,20);dn(e,d,0,0);e=a+52|0;b[e>>1]=b[f>>1]|0;b[a+54>>1]=b[g>>1]|0;l6(a+56|0,0,20);d5(e,d,0,0);c[a+88>>2]=0;c[a+92>>2]=0;c[a+96>>2]=0;e=a+100|0;b[e>>1]=b[f>>1]|0;b[a+102>>1]=b[g>>1]|0;l6(a+104|0,0,20);dn(e,d,0,0);return}function d5(a,b,d,f){a=a|0;b=b|0;d=d|0;f=f|0;var g=0,h=0,i=0,j=0;f=a+4|0;c[f>>2]=0;g=d<<1;h=(e[b+2>>1]|0)+g|0;i=h&3;if((i|0)==0){j=h}else{j=h+4-i|0}c[f>>2]=j;i=l3((ag((e[b>>1]|0)+g|0,j)|0)+64|0)|0;j=lX(20)|0;c[j+4>>2]=1;c[j+8>>2]=1;c[j>>2]=9960;c[j+12>>2]=i;c[j+16>>2]=124;g=a+12|0;c[g>>2]=i;i=a+16|0;b=c[i>>2]|0;c[i>>2]=j;do{if((b|0)!=0){j=b+4|0;if(((I=c[j>>2]|0,c[j>>2]=I+ -1,I)|0)!=1){break}j=b;bY[c[(c[j>>2]|0)+8>>2]&511](b);i=b+8|0;if(((I=c[i>>2]|0,c[i>>2]=I+ -1,I)|0)!=1){break}bY[c[(c[j>>2]|0)+12>>2]&511](b)}}while(0);b=c[g>>2]|0;g=b+((ag(c[f>>2]|0,d)|0)+d)|0;c[a+20>>2]=g;if((g|0)==0){bF(1744,1432,118,5904)}else{return}}function d6(a,d){a=a|0;d=d|0;var e=0,f=0,g=0,h=0,i=0;e=d|0;b[a>>1]=b[e>>1]|0;f=d+2|0;b[a+2>>1]=b[f>>1]|0;g=a+4|0;c[g>>2]=0;c[a+8>>2]=3;c[a+12>>2]=0;c[a+16>>2]=0;c[a+20>>2]=0;dn(a|0,d,3,0);h=a+24|0;b[h>>1]=b[e>>1]|0;b[a+26>>1]=b[f>>1]|0;i=a+28|0;c[i>>2]=0;c[a+32>>2]=6;c[a+36>>2]=0;c[a+40>>2]=0;c[a+44>>2]=0;dn(h,d,6,0);h=a+48|0;b[h>>1]=b[e>>1]|0;b[a+50>>1]=b[f>>1]|0;l6(a+52|0,0,20);dn(h,d,0,0);d=0;do{h=c[15760+(d<<3)>>2]|0;f=c[15764+(d<<3)>>2]|0;e=d>>>1;c[a+72+(e<<2)>>2]=(ag(c[g>>2]|0,h)|0)+f;c[a+104+(e<<2)>>2]=(ag(c[i>>2]|0,h)|0)+f<<1;d=d+2|0;}while(d>>>0<16);return}function d7(a,d){a=a|0;d=d|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;f=a|0;g=a|0;h=d|0;b[g>>1]=b[h>>1]|0;i=d+2|0;b[a+2>>1]=b[i>>1]|0;j=a+4|0;c[j>>2]=0;k=a+8|0;c[k>>2]=7;l=a+12|0;c[l>>2]=0;c[a+16>>2]=0;c[a+20>>2]=0;dY(f,d,7,0);d=a+48|0;m=a+52|0;n=a+56|0;o=a+96|0;p=a+100|0;q=a+104|0;l6(a+36|0,0,96);r=c[l>>2]|0;l6(r|0,-1|0,ag((c[k>>2]<<1)+(e[g>>1]|0)|0,c[j>>2]|0)|0);ek(f);c[a+136>>2]=0;a=ag(e[i>>1]|0,e[h>>1]|0)|0;f=(a>>>0)/10|0;j=c[d>>2]|0;g=j;do{if((((c[n>>2]|0)-g|0)/28|0)>>>0<f>>>0){k=(c[m>>2]|0)-g|0;r=(k|0)/28|0;if(a>>>0<10){s=0}else{s=lX(f*28|0)|0}l=s+(r*28|0)|0;t=s+(f*28|0)|0;u=s+((((k|0)/-28|0)+r|0)*28|0)|0;r=u;v=j;l5(r|0,v|0,k)|0;c[d>>2]=u;c[m>>2]=l;c[n>>2]=t;if((j|0)==0){break}l_(v)}}while(0);j=ag(e[i>>1]|0,e[h>>1]|0)|0;h=(j>>>0)/10|0;i=c[o>>2]|0;n=i;if((c[q>>2]|0)-n>>5>>>0>=h>>>0){return}m=c[p>>2]|0;d=m-n>>5;if(j>>>0<10){w=0}else{w=lX(h<<5)|0}j=w+(d<<5)|0;s=w+(h<<5)|0;if((m|0)==(i|0)){x=i;y=j}else{h=(m-32+(-n|0)|0)>>>5;n=m;m=j;while(1){f=n-32|0;a=m-32|0;g=a;v=f;c[g>>2]=c[v>>2];c[g+4>>2]=c[v+4>>2];c[g+8>>2]=c[v+8>>2];c[g+12>>2]=c[v+12>>2];v=m-32+16|0;g=n-32+16|0;c[v>>2]=c[g>>2];c[v+4>>2]=c[g+4>>2];c[v+8>>2]=c[g+8>>2];c[v+12>>2]=c[g+12>>2];if((f|0)==(i|0)){break}else{n=f;m=a}}x=c[o>>2]|0;y=w+(d-1-h<<5)|0}c[o>>2]=y;c[p>>2]=j;c[q>>2]=s;if((x|0)==0){return}l_(x);return}function d8(b){b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0;b=i;i=i+32|0;d=b|0;e=b+8|0;f=b+16|0;g=b+24|0;eC(18840,c[o>>2]|0,18896);c[4940]=9260;c[4942]=9280;c[4941]=0;h=c[2312]|0;fB(19760+h|0,18840);c[h+19832>>2]=0;c[h+19836>>2]=-1;h=c[s>>2]|0;fG(18744);c[4686]=9408;c[4694]=h;jV(g,18748);h=j2(g,19096)|0;j=h;jW(g);c[4695]=j;c[4696]=18904;a[18788]=(b0[c[(c[h>>2]|0)+28>>2]&255](j)|0)&1;c[4874]=9164;c[4875]=9184;j=c[2288]|0;fB(19496+j|0,18744);h=j+72|0;c[19496+h>>2]=0;g=j+76|0;c[19496+g>>2]=-1;k=c[r>>2]|0;fG(18792);c[4698]=9408;c[4706]=k;jV(f,18796);k=j2(f,19096)|0;l=k;jW(f);c[4707]=l;c[4708]=18912;a[18836]=(b0[c[(c[k>>2]|0)+28>>2]&255](l)|0)&1;c[4918]=9164;c[4919]=9184;fB(19672+j|0,18792);c[19672+h>>2]=0;c[19672+g>>2]=-1;l=c[(c[(c[4918]|0)-12>>2]|0)+19696>>2]|0;c[4896]=9164;c[4897]=9184;fB(19584+j|0,l);c[19584+h>>2]=0;c[19584+g>>2]=-1;c[(c[(c[4940]|0)-12>>2]|0)+19832>>2]=19496;g=(c[(c[4918]|0)-12>>2]|0)+19676|0;c[g>>2]=c[g>>2]|8192;c[(c[(c[4918]|0)-12>>2]|0)+19744>>2]=19496;ee(18688,c[o>>2]|0,18920);c[4852]=9212;c[4854]=9232;c[4853]=0;g=c[2300]|0;fB(19408+g|0,18688);c[g+19480>>2]=0;c[g+19484>>2]=-1;g=c[s>>2]|0;fN(18592);c[4648]=9336;c[4656]=g;jV(e,18596);g=j2(e,19088)|0;h=g;jW(e);c[4657]=h;c[4658]=18928;a[18636]=(b0[c[(c[g>>2]|0)+28>>2]&255](h)|0)&1;c[4782]=9116;c[4783]=9136;h=c[2276]|0;fB(19128+h|0,18592);g=h+72|0;c[19128+g>>2]=0;e=h+76|0;c[19128+e>>2]=-1;l=c[r>>2]|0;fN(18640);c[4660]=9336;c[4668]=l;jV(d,18644);l=j2(d,19088)|0;j=l;jW(d);c[4669]=j;c[4670]=18936;a[18684]=(b0[c[(c[l>>2]|0)+28>>2]&255](j)|0)&1;c[4826]=9116;c[4827]=9136;fB(19304+h|0,18640);c[19304+g>>2]=0;c[19304+e>>2]=-1;j=c[(c[(c[4826]|0)-12>>2]|0)+19328>>2]|0;c[4804]=9116;c[4805]=9136;fB(19216+h|0,j);c[19216+g>>2]=0;c[19216+e>>2]=-1;c[(c[(c[4852]|0)-12>>2]|0)+19480>>2]=19128;e=(c[(c[4826]|0)-12>>2]|0)+19308|0;c[e>>2]=c[e>>2]|8192;c[(c[(c[4826]|0)-12>>2]|0)+19376>>2]=19128;i=b;return}function d9(a){a=a|0;fM(a|0);return}function ea(a){a=a|0;fM(a|0);l_(a);return}function eb(b,d){b=b|0;d=d|0;var e=0;b0[c[(c[b>>2]|0)+24>>2]&255](b)|0;e=j2(d,19088)|0;d=e;c[b+36>>2]=d;a[b+44|0]=(b0[c[(c[e>>2]|0)+28>>2]&255](d)|0)&1;return}function ec(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0;b=i;i=i+16|0;d=b|0;e=b+8|0;f=a+36|0;g=a+40|0;h=d|0;j=d+8|0;k=d;d=a+32|0;while(1){a=c[f>>2]|0;l=b$[c[(c[a>>2]|0)+20>>2]&31](a,c[g>>2]|0,h,j,e)|0;a=(c[e>>2]|0)-k|0;if((aM(h|0,1,a|0,c[d>>2]|0)|0)!=(a|0)){m=-1;n=2321;break}if((l|0)==2){m=-1;n=2323;break}else if((l|0)!=1){n=2319;break}}if((n|0)==2319){m=((aK(c[d>>2]|0)|0)!=0)<<31>>31;i=b;return m|0}else if((n|0)==2321){i=b;return m|0}else if((n|0)==2323){i=b;return m|0}return 0}function ed(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;e=i;i=i+32|0;f=e|0;g=e+8|0;h=e+16|0;j=e+24|0;k=(d|0)==-1;if(!k){l=g+4|0;m=b+24|0;n=b+20|0;c[n>>2]=g;o=b+28|0;c[o>>2]=l;c[g>>2]=d;c[m>>2]=l;L2102:do{if((a[b+44|0]&1)==0){p=f|0;c[h>>2]=p;q=b+36|0;r=b+40|0;s=f+8|0;t=f;u=b+32|0;v=g;w=l;while(1){x=c[q>>2]|0;y=b6[c[(c[x>>2]|0)+12>>2]&31](x,c[r>>2]|0,v,w,j,p,s,h)|0;z=c[n>>2]|0;if((c[j>>2]|0)==(z|0)){A=-1;B=2342;break}if((y|0)==3){B=2330;break}if(y>>>0>=2){A=-1;B=2340;break}x=(c[h>>2]|0)-t|0;if((aM(p|0,1,x|0,c[u>>2]|0)|0)!=(x|0)){A=-1;B=2341;break}if((y|0)!=1){break L2102}y=c[j>>2]|0;x=c[m>>2]|0;c[n>>2]=y;c[o>>2]=x;C=y+(x-y>>2<<2)|0;c[m>>2]=C;v=y;w=C}if((B|0)==2330){if((aM(z|0,1,1,c[u>>2]|0)|0)==1){break}else{A=-1}i=e;return A|0}else if((B|0)==2340){i=e;return A|0}else if((B|0)==2341){i=e;return A|0}else if((B|0)==2342){i=e;return A|0}}else{if((aM(g|0,4,1,c[b+32>>2]|0)|0)==1){break}else{A=-1}i=e;return A|0}}while(0);c[m>>2]=0;c[n>>2]=0;c[o>>2]=0}A=k?0:d;i=e;return A|0}function ee(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;i=i+8|0;g=f|0;fN(b|0);c[b>>2]=9736;c[b+32>>2]=d;c[b+40>>2]=e;jV(g,b+4|0);e=j2(g,19088)|0;d=e;h=b+36|0;c[h>>2]=d;j=b+44|0;c[j>>2]=b0[c[(c[e>>2]|0)+24>>2]&255](d)|0;d=c[h>>2]|0;a[b+48|0]=(b0[c[(c[d>>2]|0)+28>>2]&255](d)|0)&1;if((c[j>>2]|0)<=8){jW(g);i=f;return}i3(144);jW(g);i=f;return}function ef(a){a=a|0;fM(a|0);return}function eg(a){a=a|0;fM(a|0);l_(a);return}function eh(b,d){b=b|0;d=d|0;var e=0,f=0,g=0;e=j2(d,19088)|0;d=e;f=b+36|0;c[f>>2]=d;g=b+44|0;c[g>>2]=b0[c[(c[e>>2]|0)+24>>2]&255](d)|0;d=c[f>>2]|0;a[b+48|0]=(b0[c[(c[d>>2]|0)+28>>2]&255](d)|0)&1;if((c[g>>2]|0)<=8){return}i3(144);return}function ei(a){a=a|0;return ew(a,0)|0}function ej(a){a=a|0;return ew(a,1)|0}function ek(a){a=a|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;d=i;i=i+56|0;e=d+8|0;f=d+40|0;g=c[a+8>>2]|0;h=b[a>>1]|0;j=g-1|0;k=b[a+2>>1]|0;l=-g|0;g=l|0;m=l|0;l=(h&65535)+j|0;n=(k&65535)+j|0;j=c[a+4>>2]|0;o=c[a+16>>2]|0;p=(o|0)==0;if(!p){q=o+4|0;I=c[q>>2]|0,c[q>>2]=I+1,I}q=c[a+20>>2]|0;b[e>>1]=h;b[e+2>>1]=k;c[e+4>>2]=j;c[e+8>>2]=q;q=e+12|0;c[q>>2]=g;c[q+4>>2]=m;q=e+20|0;c[q>>2]=l;c[q+4>>2]=n;q=f;c[q>>2]=g;c[q+4>>2]=m;m=f+8|0;c[m>>2]=l;c[m+4>>2]=n;el(1,f,e,d|0);if(p){i=d;return}p=o+4|0;if(((I=c[p>>2]|0,c[p>>2]=I+ -1,I)|0)!=1){i=d;return}p=o;bY[c[(c[p>>2]|0)+8>>2]&511](o);e=o+8|0;if(((I=c[e>>2]|0,c[e>>2]=I+ -1,I)|0)!=1){i=d;return}bY[c[(c[p>>2]|0)+12>>2]&511](o);i=d;return}function el(b,d,f,g){b=b|0;d=d|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0;b=i;h=g;g=i;i=i+1|0;i=i+7>>3<<3;a[g]=a[h]|0;h=c[d>>2]|0;g=d+8|0;j=c[g>>2]|0;if((h|0)>(j|0)){i=b;return}k=d+4|0;l=d+12|0;d=f|0;m=f+2|0;n=f+12|0;o=f+20|0;p=f+16|0;q=f+24|0;r=f+8|0;s=f+4|0;f=h;h=c[l>>2]|0;t=j;L2156:while(1){j=c[k>>2]|0;if((j|0)>(h|0)){u=h;v=t}else{w=(f|0)<0?0:f;if((f|0)>-1){x=j;y=h;while(1){z=x<<2;if((f|0)<(e[d>>1]|0|0)&(x|0)>-1){if((x|0)<(e[m>>1]|0|0)){A=y}else{B=2379}}else{B=2379}do{if((B|0)==2379){B=0;if((f|0)<(c[n>>2]|0)){A=y;break}if((f|0)>(c[o>>2]|0)){A=y;break}if((x|0)<(c[p>>2]|0)){A=y;break}if((x|0)>(c[q>>2]|0)){A=y;break}C=e[d>>1]|0;D=e[m>>1]|0;E=c[r>>2]|0;if((E|0)==0){B=2400;break L2156}F=(x|0)<0?0:x;G=E;E=c[s>>2]|0;H=c[G+((ag(E,(w|0)<(C|0)?w:C-1|0)|0)+(((F|0)<(D|0)?F:D+1073741823|0)<<2))>>2]|0;c[G+((ag(E,f)|0)+z)>>2]=H;A=c[l>>2]|0}}while(0);if((x|0)<(A|0)){x=x+1|0;y=A}else{I=A;break}}}else{y=j;x=h;while(1){z=y<<2;do{if((f|0)<(c[n>>2]|0)){J=x}else{if((f|0)>(c[o>>2]|0)){J=x;break}if((y|0)<(c[p>>2]|0)){J=x;break}if((y|0)>(c[q>>2]|0)){J=x;break}H=e[d>>1]|0;E=e[m>>1]|0;G=c[r>>2]|0;if((G|0)==0){B=2401;break L2156}D=(y|0)<0?0:y;F=G;G=c[s>>2]|0;C=c[F+((ag(G,(w|0)<(H|0)?w:H-1|0)|0)+(((D|0)<(E|0)?D:E+1073741823|0)<<2))>>2]|0;c[F+((ag(G,f)|0)+z)>>2]=C;J=c[l>>2]|0}}while(0);if((y|0)<(J|0)){y=y+1|0;x=J}else{I=J;break}}}u=I;v=c[g>>2]|0}if((f|0)>=(v|0)){B=2399;break}f=f+1|0;h=u;t=v}if((B|0)==2399){i=b;return}else if((B|0)==2400){bF(224,2776,19,3504)}else if((B|0)==2401){bF(224,2776,19,3504)}}function em(a){a=a|0;gr(19496)|0;gr(19584)|0;gs(19128)|0;gs(19216)|0;return}function en(a){a=a|0;return}function eo(a){a=a|0;return}function ep(a){a=a|0;var b=0;b=a+4|0;I=c[b>>2]|0,c[b>>2]=I+1,I;return}function eq(a){a=a|0;return c[a+4>>2]|0}function er(a){a=a|0;return c[a+4>>2]|0}function es(a){a=a|0;c[a>>2]=9064;return}function et(a,b,d){a=a|0;b=b|0;d=d|0;c[a>>2]=d;c[a+4>>2]=b;return}function eu(a,b,d){a=a|0;b=b|0;d=d|0;var e=0;if((c[b+4>>2]|0)!=(a|0)){e=0;return e|0}e=(c[b>>2]|0)==(d|0);return e|0}function ev(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0;e=i;i=i+32|0;f=e|0;g=e+8|0;h=e+16|0;if((d|0)==-1){j=-1;i=e;return j|0}c[h>>2]=d;k=c[b+36>>2]|0;l=f|0;m=b6[c[(c[k>>2]|0)+12>>2]&31](k,c[b+40>>2]|0,h,h+4|0,e+24|0,l,f+8|0,g)|0;if((m|0)==2|(m|0)==1){j=-1;i=e;return j|0}else if((m|0)==3){a[l]=d&255;c[g>>2]=f+1}f=b+32|0;while(1){b=c[g>>2]|0;if(b>>>0<=l>>>0){j=d;n=2427;break}m=b-1|0;c[g>>2]=m;if((bA(a[m]|0,c[f>>2]|0)|0)==-1){j=-1;n=2429;break}}if((n|0)==2429){i=e;return j|0}else if((n|0)==2427){i=e;return j|0}return 0}function ew(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;e=i;i=i+32|0;f=e|0;g=e+8|0;h=e+16|0;j=e+24|0;k=c[b+44>>2]|0;l=(k|0)>1?k:1;L2221:do{if((l|0)>0){k=b+32|0;m=0;while(1){n=aZ(c[k>>2]|0)|0;if((n|0)==-1){o=-1;break}a[f+m|0]=n&255;m=m+1|0;if((m|0)>=(l|0)){break L2221}}i=e;return o|0}}while(0);L2228:do{if((a[b+48|0]&1)==0){m=b+40|0;k=b+36|0;n=f|0;p=g+4|0;q=b+32|0;r=l;while(1){s=c[m>>2]|0;t=s;u=c[t>>2]|0;v=c[t+4>>2]|0;t=c[k>>2]|0;w=f+r|0;x=b6[c[(c[t>>2]|0)+16>>2]&31](t,s,n,w,h,g,p,j)|0;if((x|0)==3){y=2441;break}else if((x|0)==2){o=-1;y=2451;break}else if((x|0)!=1){z=r;break L2228}x=c[m>>2]|0;c[x>>2]=u;c[x+4>>2]=v;if((r|0)==8){o=-1;y=2452;break}v=aZ(c[q>>2]|0)|0;if((v|0)==-1){o=-1;y=2449;break}a[w]=v&255;r=r+1|0}if((y|0)==2441){c[g>>2]=a[n]|0;z=r;break}else if((y|0)==2449){i=e;return o|0}else if((y|0)==2451){i=e;return o|0}else if((y|0)==2452){i=e;return o|0}}else{c[g>>2]=a[f|0]|0;z=l}}while(0);L2242:do{if(!d){l=b+32|0;y=z;while(1){if((y|0)<=0){break L2242}j=y-1|0;if((bA(a[f+j|0]|0,c[l>>2]|0)|0)==-1){o=-1;break}else{y=j}}i=e;return o|0}}while(0);o=c[g>>2]|0;i=e;return o|0}function ex(a){a=a|0;fF(a|0);return}function ey(a){a=a|0;fF(a|0);l_(a);return}function ez(b,d){b=b|0;d=d|0;var e=0;b0[c[(c[b>>2]|0)+24>>2]&255](b)|0;e=j2(d,19096)|0;d=e;c[b+36>>2]=d;a[b+44|0]=(b0[c[(c[e>>2]|0)+28>>2]&255](d)|0)&1;return}function eA(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0;b=i;i=i+16|0;d=b|0;e=b+8|0;f=a+36|0;g=a+40|0;h=d|0;j=d+8|0;k=d;d=a+32|0;while(1){a=c[f>>2]|0;l=b$[c[(c[a>>2]|0)+20>>2]&31](a,c[g>>2]|0,h,j,e)|0;a=(c[e>>2]|0)-k|0;if((aM(h|0,1,a|0,c[d>>2]|0)|0)!=(a|0)){m=-1;n=2465;break}if((l|0)==2){m=-1;n=2463;break}else if((l|0)!=1){n=2461;break}}if((n|0)==2461){m=((aK(c[d>>2]|0)|0)!=0)<<31>>31;i=b;return m|0}else if((n|0)==2463){i=b;return m|0}else if((n|0)==2465){i=b;return m|0}return 0}function eB(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;e=i;i=i+32|0;f=e|0;g=e+8|0;h=e+16|0;j=e+24|0;k=(d|0)==-1;if(!k){l=g+1|0;m=b+24|0;n=b+20|0;c[n>>2]=g;o=b+28|0;c[o>>2]=l;a[g]=d&255;c[m>>2]=l;L2265:do{if((a[b+44|0]&1)==0){p=f|0;c[h>>2]=p;q=b+36|0;r=b+40|0;s=f+8|0;t=f;u=b+32|0;v=g;w=l;while(1){x=c[q>>2]|0;y=b6[c[(c[x>>2]|0)+12>>2]&31](x,c[r>>2]|0,v,w,j,p,s,h)|0;z=c[n>>2]|0;if((c[j>>2]|0)==(z|0)){A=-1;B=2485;break}if((y|0)==3){B=2472;break}if(y>>>0>=2){A=-1;B=2482;break}x=(c[h>>2]|0)-t|0;if((aM(p|0,1,x|0,c[u>>2]|0)|0)!=(x|0)){A=-1;B=2483;break}if((y|0)!=1){break L2265}y=c[j>>2]|0;x=c[m>>2]|0;c[n>>2]=y;c[o>>2]=x;C=y+(x-y)|0;c[m>>2]=C;v=y;w=C}if((B|0)==2472){if((aM(z|0,1,1,c[u>>2]|0)|0)==1){break}else{A=-1}i=e;return A|0}else if((B|0)==2483){i=e;return A|0}else if((B|0)==2482){i=e;return A|0}else if((B|0)==2485){i=e;return A|0}}else{if((aM(g|0,1,1,c[b+32>>2]|0)|0)==1){break}else{A=-1}i=e;return A|0}}while(0);c[m>>2]=0;c[n>>2]=0;c[o>>2]=0}A=k?0:d;i=e;return A|0}function eC(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;i=i+8|0;g=f|0;fG(b|0);c[b>>2]=9808;c[b+32>>2]=d;c[b+40>>2]=e;jV(g,b+4|0);e=j2(g,19096)|0;d=e;h=b+36|0;c[h>>2]=d;j=b+44|0;c[j>>2]=b0[c[(c[e>>2]|0)+24>>2]&255](d)|0;d=c[h>>2]|0;a[b+48|0]=(b0[c[(c[d>>2]|0)+28>>2]&255](d)|0)&1;if((c[j>>2]|0)<=8){jW(g);i=f;return}i3(144);jW(g);i=f;return}function eD(a){a=a|0;fF(a|0);return}function eE(a){a=a|0;fF(a|0);l_(a);return}function eF(b,d){b=b|0;d=d|0;var e=0,f=0,g=0;e=j2(d,19096)|0;d=e;f=b+36|0;c[f>>2]=d;g=b+44|0;c[g>>2]=b0[c[(c[e>>2]|0)+24>>2]&255](d)|0;d=c[f>>2]|0;a[b+48|0]=(b0[c[(c[d>>2]|0)+28>>2]&255](d)|0)&1;if((c[g>>2]|0)<=8){return}i3(144);return}function eG(a){a=a|0;return eJ(a,0)|0}function eH(a){a=a|0;return eJ(a,1)|0}function eI(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;e=i;i=i+32|0;f=e|0;g=e+8|0;h=e+16|0;if((d|0)==-1){j=-1;i=e;return j|0}k=d&255;a[h]=k;l=c[b+36>>2]|0;m=f|0;n=b6[c[(c[l>>2]|0)+12>>2]&31](l,c[b+40>>2]|0,h,h+1|0,e+24|0,m,f+8|0,g)|0;if((n|0)==2|(n|0)==1){j=-1;i=e;return j|0}else if((n|0)==3){a[m]=k;c[g>>2]=f+1}f=b+32|0;while(1){b=c[g>>2]|0;if(b>>>0<=m>>>0){j=d;o=2510;break}k=b-1|0;c[g>>2]=k;if((bA(a[k]|0,c[f>>2]|0)|0)==-1){j=-1;o=2511;break}}if((o|0)==2511){i=e;return j|0}else if((o|0)==2510){i=e;return j|0}return 0}function eJ(b,e){b=b|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;f=i;i=i+32|0;g=f|0;h=f+8|0;j=f+16|0;k=f+24|0;l=c[b+44>>2]|0;m=(l|0)>1?l:1;L2315:do{if((m|0)>0){l=b+32|0;n=0;while(1){o=aZ(c[l>>2]|0)|0;if((o|0)==-1){p=-1;break}a[g+n|0]=o&255;n=n+1|0;if((n|0)>=(m|0)){break L2315}}i=f;return p|0}}while(0);L2322:do{if((a[b+48|0]&1)==0){n=b+40|0;l=b+36|0;o=g|0;q=h+1|0;r=b+32|0;s=m;while(1){t=c[n>>2]|0;u=t;v=c[u>>2]|0;w=c[u+4>>2]|0;u=c[l>>2]|0;x=g+s|0;y=b6[c[(c[u>>2]|0)+16>>2]&31](u,t,o,x,j,h,q,k)|0;if((y|0)==3){z=2523;break}else if((y|0)==2){p=-1;z=2535;break}else if((y|0)!=1){A=s;break L2322}y=c[n>>2]|0;c[y>>2]=v;c[y+4>>2]=w;if((s|0)==8){p=-1;z=2533;break}w=aZ(c[r>>2]|0)|0;if((w|0)==-1){p=-1;z=2532;break}a[x]=w&255;s=s+1|0}if((z|0)==2532){i=f;return p|0}else if((z|0)==2523){a[h]=a[o]|0;A=s;break}else if((z|0)==2533){i=f;return p|0}else if((z|0)==2535){i=f;return p|0}}else{a[h]=a[g|0]|0;A=m}}while(0);L2336:do{if(!e){m=b+32|0;z=A;while(1){if((z|0)<=0){break L2336}k=z-1|0;if((bA(d[g+k|0]|0|0,c[m>>2]|0)|0)==-1){p=-1;break}else{z=k}}i=f;return p|0}}while(0);p=d[h]|0;i=f;return p|0}function eK(){d8(0);a_(172,19848|0,u|0)|0;return}function eL(a){a=a|0;var b=0,d=0;b=a+4|0;if(((I=c[b>>2]|0,c[b>>2]=I+ -1,I)|0)!=0){d=0;return d|0}bY[c[(c[a>>2]|0)+8>>2]&511](a);d=1;return d|0}function eM(a,b){a=a|0;b=b|0;var d=0,e=0;c[a>>2]=7296;d=l7(b|0)|0;e=l3(d+13|0)|0;c[e+4>>2]=d;c[e>>2]=d;d=e+12|0;c[a+4>>2]=d;c[e+8>>2]=0;l8(d|0,b|0)|0;return}function eN(a){a=a|0;var b=0,d=0,e=0;c[a>>2]=7296;b=a+4|0;d=(c[b>>2]|0)-4|0;if(((I=c[d>>2]|0,c[d>>2]=I+ -1,I)-1|0)>=0){e=a;l_(e);return}l$((c[b>>2]|0)-12|0);e=a;l_(e);return}function eO(a){a=a|0;var b=0;c[a>>2]=7296;b=a+4|0;a=(c[b>>2]|0)-4|0;if(((I=c[a>>2]|0,c[a>>2]=I+ -1,I)-1|0)>=0){return}l$((c[b>>2]|0)-12|0);return}function eP(b,d){b=b|0;d=d|0;var e=0,f=0;c[b>>2]=7232;if((a[d]&1)==0){e=d+1|0}else{e=c[d+8>>2]|0}d=l7(e|0)|0;f=l3(d+13|0)|0;c[f+4>>2]=d;c[f>>2]=d;d=f+12|0;c[b+4>>2]=d;c[f+8>>2]=0;l8(d|0,e|0)|0;return}function eQ(a,b){a=a|0;b=b|0;var d=0,e=0;c[a>>2]=7232;d=l7(b|0)|0;e=l3(d+13|0)|0;c[e+4>>2]=d;c[e>>2]=d;d=e+12|0;c[a+4>>2]=d;c[e+8>>2]=0;l8(d|0,b|0)|0;return}function eR(a){a=a|0;var b=0,d=0,e=0;c[a>>2]=7232;b=a+4|0;d=(c[b>>2]|0)-4|0;if(((I=c[d>>2]|0,c[d>>2]=I+ -1,I)-1|0)>=0){e=a;l_(e);return}l$((c[b>>2]|0)-12|0);e=a;l_(e);return}function eS(a){a=a|0;var b=0;c[a>>2]=7232;b=a+4|0;a=(c[b>>2]|0)-4|0;if(((I=c[a>>2]|0,c[a>>2]=I+ -1,I)-1|0)>=0){return}l$((c[b>>2]|0)-12|0);return}function eT(a){a=a|0;var b=0,d=0,e=0;c[a>>2]=7296;b=a+4|0;d=(c[b>>2]|0)-4|0;if(((I=c[d>>2]|0,c[d>>2]=I+ -1,I)-1|0)>=0){e=a;l_(e);return}l$((c[b>>2]|0)-12|0);e=a;l_(e);return}function eU(a){a=a|0;l_(a);return}function eV(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0;e=i;i=i+8|0;f=e|0;b3[c[(c[a>>2]|0)+12>>2]&7](f,a,b);if((c[f+4>>2]|0)!=(c[d+4>>2]|0)){g=0;i=e;return g|0}g=(c[f>>2]|0)==(c[d>>2]|0);i=e;return g|0}function eW(a,b,c){a=a|0;b=b|0;c=c|0;b=bx(c|0)|0;e9(a,b,l7(b|0)|0);return}function eX(b,e,f){b=b|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;g=i;h=f;j=i;i=i+12|0;i=i+7>>3<<3;k=e|0;l=c[k>>2]|0;if((l|0)==0){m=b;c[m>>2]=c[h>>2];c[m+4>>2]=c[h+4>>2];c[m+8>>2]=c[h+8>>2];l6(h|0,0,12);i=g;return}n=d[h]|0;if((n&1|0)==0){o=n>>>1}else{o=c[f+4>>2]|0}if((o|0)==0){p=l}else{e1(f,1664)|0;p=c[k>>2]|0}k=c[e+4>>2]|0;b3[c[(c[k>>2]|0)+24>>2]&7](j,k,p);p=a[j]|0;if((p&1)==0){q=j+1|0}else{q=c[j+8>>2]|0}k=p&255;if((k&1|0)==0){r=k>>>1}else{r=c[j+4>>2]|0}e3(f,q,r)|0;e$(j);m=b;c[m>>2]=c[h>>2];c[m+4>>2]=c[h+4>>2];c[m+8>>2]=c[h+8>>2];l6(h|0,0,12);i=g;return}function eY(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0;e=i;i=i+32|0;f=b;b=i;i=i+8|0;c[b>>2]=c[f>>2];c[b+4>>2]=c[f+4>>2];f=e|0;g=e+16|0;e9(g,d,l7(d|0)|0);eX(f,b,g);eP(a|0,f);e$(f);e$(g);c[a>>2]=9304;g=b;b=a+8|0;a=c[g+4>>2]|0;c[b>>2]=c[g>>2];c[b+4>>2]=a;i=e;return}function eZ(a){a=a|0;eS(a|0);l_(a);return}function e_(a){a=a|0;eS(a|0);return}function e$(b){b=b|0;if((a[b]&1)==0){return}l_(c[b+8>>2]|0);return}function e0(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0;e=l7(d|0)|0;f=b;g=b;h=a[g]|0;if((h&1)==0){i=10;j=h}else{h=c[b>>2]|0;i=(h&-2)-1|0;j=h&255}if(i>>>0<e>>>0){h=j&255;if((h&1|0)==0){k=h>>>1}else{k=c[b+4>>2]|0}fc(b,i,e-i|0,k,0,k,e,d);return b|0}if((j&1)==0){l=f+1|0}else{l=c[b+8>>2]|0}l9(l|0,d|0,e|0);a[l+e|0]=0;if((a[g]&1)==0){a[g]=e<<1&255;return b|0}else{c[b+4>>2]=e;return b|0}return 0}function e1(a,b){a=a|0;b=b|0;return e3(a,b,l7(b|0)|0)|0}function e2(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0;e=b;f=a[e]|0;if((f&1)==0){g=10;h=f}else{f=c[b>>2]|0;g=(f&-2)-1|0;h=f&255}f=h&255;if((f&1|0)==0){i=f>>>1}else{i=c[b+4>>2]|0}if((i|0)==(g|0)){fd(b,g,1,g,g,0,0);j=a[e]|0}else{j=h}if((j&1)==0){k=b+1|0}else{k=c[b+8>>2]|0}a[k+i|0]=d;d=i+1|0;a[k+d|0]=0;if((a[e]&1)==0){a[e]=d<<1&255;return}else{c[b+4>>2]=d;return}}function e3(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0;f=b;g=a[f]|0;if((g&1)==0){h=10;i=g}else{g=c[b>>2]|0;h=(g&-2)-1|0;i=g&255}g=i&255;if((g&1|0)==0){j=g>>>1}else{j=c[b+4>>2]|0}if((h-j|0)>>>0<e>>>0){fc(b,h,e-h+j|0,j,j,0,e,d);return b|0}if((e|0)==0){return b|0}if((i&1)==0){k=b+1|0}else{k=c[b+8>>2]|0}i=k+j|0;l5(i|0,d|0,e)|0;d=j+e|0;if((a[f]&1)==0){a[f]=d<<1&255}else{c[b+4>>2]=d}a[k+d|0]=0;return b|0}function e4(b){b=b|0;if((a[b]&1)==0){return}l_(c[b+8>>2]|0);return}function e5(a,b){a=a|0;b=b|0;return fx(a,b,lv(b)|0)|0}function e6(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0;e;if((c[a>>2]|0)==1){do{aT(15576,15568)|0;}while((c[a>>2]|0)==1)}if((c[a>>2]|0)!=0){f;return}c[a>>2]=1;g;bY[d&511](b);h;c[a>>2]=-1;i;bs(15576)|0;return}function e7(a){a=a|0;a=bO(8)|0;eM(a,384);c[a>>2]=7264;bk(a|0,13936,36)}function e8(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=d;if((a[e]&1)==0){f=b;c[f>>2]=c[e>>2];c[f+4>>2]=c[e+4>>2];c[f+8>>2]=c[e+8>>2];return}e=c[d+8>>2]|0;f=c[d+4>>2]|0;if((f|0)==-1){e7(0)}if(f>>>0<11){a[b]=f<<1&255;g=b+1|0}else{d=f+16&-16;h=lX(d)|0;c[b+8>>2]=h;c[b>>2]=d|1;c[b+4>>2]=f;g=h}l5(g|0,e|0,f)|0;a[g+f|0]=0;return}function e9(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0;if((e|0)==-1){e7(0)}if(e>>>0<11){a[b]=e<<1&255;f=b+1|0;l5(f|0,d|0,e)|0;g=f+e|0;a[g]=0;return}else{h=e+16&-16;i=lX(h)|0;c[b+8>>2]=i;c[b>>2]=h|1;c[b+4>>2]=e;f=i;l5(f|0,d|0,e)|0;g=f+e|0;a[g]=0;return}}function fa(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;if((d|0)==-1){e7(0)}if(d>>>0<11){a[b]=d<<1&255;f=b+1|0}else{g=d+16&-16;h=lX(g)|0;c[b+8>>2]=h;c[b>>2]=g|1;c[b+4>>2]=d;f=h}l6(f|0,e|0,d|0);a[f+d|0]=0;return}function fb(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;if((d|0)==-1){e7(0)}e=b;f=b;g=a[f]|0;if((g&1)==0){h=10;i=g}else{g=c[b>>2]|0;h=(g&-2)-1|0;i=g&255}g=i&255;if((g&1|0)==0){j=g>>>1}else{j=c[b+4>>2]|0}g=j>>>0>d>>>0?j:d;if(g>>>0<11){k=11}else{k=g+16&-16}g=k-1|0;if((g|0)==(h|0)){return}if((g|0)==10){l=e+1|0;m=c[b+8>>2]|0;n=1;o=0}else{if(g>>>0>h>>>0){p=lX(k)|0}else{p=lX(k)|0}h=i&1;if(h<<24>>24==0){q=e+1|0}else{q=c[b+8>>2]|0}l=p;m=q;n=h<<24>>24!=0;o=1}h=i&255;if((h&1|0)==0){r=h>>>1}else{r=c[b+4>>2]|0}h=r+1|0;l5(l|0,m|0,h)|0;if(n){l_(m)}if(o){c[b>>2]=k|1;c[b+4>>2]=j;c[b+8>>2]=l;return}else{a[f]=j<<1&255;return}}function fc(b,d,e,f,g,h,i,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;if((-3-d|0)>>>0<e>>>0){e7(0)}if((a[b]&1)==0){k=b+1|0}else{k=c[b+8>>2]|0}do{if(d>>>0<2147483631){l=e+d|0;m=d<<1;n=l>>>0<m>>>0?m:l;if(n>>>0<11){o=11;break}o=n+16&-16}else{o=-2}}while(0);e=lX(o)|0;if((g|0)!=0){l5(e|0,k|0,g)|0}if((i|0)!=0){n=e+g|0;l5(n|0,j|0,i)|0}j=f-h|0;if((j|0)!=(g|0)){f=j-g|0;n=e+(i+g)|0;l=k+(h+g)|0;l5(n|0,l|0,f)|0}if((d|0)==10){p=b+8|0;c[p>>2]=e;q=o|1;r=b|0;c[r>>2]=q;s=j+i|0;t=b+4|0;c[t>>2]=s;u=e+s|0;a[u]=0;return}l_(k);p=b+8|0;c[p>>2]=e;q=o|1;r=b|0;c[r>>2]=q;s=j+i|0;t=b+4|0;c[t>>2]=s;u=e+s|0;a[u]=0;return}function fd(b,d,e,f,g,h,i){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;if((-3-d|0)>>>0<e>>>0){e7(0)}if((a[b]&1)==0){j=b+1|0}else{j=c[b+8>>2]|0}do{if(d>>>0<2147483631){k=e+d|0;l=d<<1;m=k>>>0<l>>>0?l:k;if(m>>>0<11){n=11;break}n=m+16&-16}else{n=-2}}while(0);e=lX(n)|0;if((g|0)!=0){l5(e|0,j|0,g)|0}m=f-h|0;if((m|0)!=(g|0)){f=m-g|0;m=e+(i+g)|0;i=j+(h+g)|0;l5(m|0,i|0,f)|0}if((d|0)==10){o=b+8|0;c[o>>2]=e;p=n|1;q=b|0;c[q>>2]=p;return}l_(j);o=b+8|0;c[o>>2]=e;p=n|1;q=b|0;c[q>>2]=p;return}function fe(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0;if(e>>>0>1073741822){e7(0)}if(e>>>0<2){a[b]=e<<1&255;f=b+4|0;g=lw(f,d,e)|0;h=f+(e<<2)|0;c[h>>2]=0;return}else{i=e+4&-4;j=lX(i<<2)|0;c[b+8>>2]=j;c[b>>2]=i|1;c[b+4>>2]=e;f=j;g=lw(f,d,e)|0;h=f+(e<<2)|0;c[h>>2]=0;return}}function ff(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0;if(d>>>0>1073741822){e7(0)}if(d>>>0<2){a[b]=d<<1&255;f=b+4|0;g=ly(f,e,d)|0;h=f+(d<<2)|0;c[h>>2]=0;return}else{i=d+4&-4;j=lX(i<<2)|0;c[b+8>>2]=j;c[b>>2]=i|1;c[b+4>>2]=d;f=j;g=ly(f,e,d)|0;h=f+(d<<2)|0;c[h>>2]=0;return}}function fg(a,b){a=a|0;b=b|0;return}function fh(a,b,c){a=a|0;b=b|0;c=c|0;return a|0}function fi(a){a=a|0;return 0}function fj(a){a=a|0;return 0}function fk(a){a=a|0;return-1|0}function fl(a,b){a=a|0;b=b|0;return-1|0}function fm(a,b){a=a|0;b=b|0;return-1|0}function fn(a,b){a=a|0;b=b|0;return}function fo(a,b,c){a=a|0;b=b|0;c=c|0;return a|0}function fp(a){a=a|0;return 0}function fq(a){a=a|0;return 0}function fr(a){a=a|0;return-1|0}function fs(a,b){a=a|0;b=b|0;return-1|0}function ft(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;g=a;c[g>>2]=0;c[g+4>>2]=0;g=a+8|0;c[g>>2]=-1;c[g+4>>2]=-1;return}function fu(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;e=i;b=d;d=i;i=i+16|0;c[d>>2]=c[b>>2];c[d+4>>2]=c[b+4>>2];c[d+8>>2]=c[b+8>>2];c[d+12>>2]=c[b+12>>2];b=a;c[b>>2]=0;c[b+4>>2]=0;b=a+8|0;c[b>>2]=-1;c[b+4>>2]=-1;i=e;return}function fv(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;g=a;c[g>>2]=0;c[g+4>>2]=0;g=a+8|0;c[g>>2]=-1;c[g+4>>2]=-1;return}function fw(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;e=i;b=d;d=i;i=i+16|0;c[d>>2]=c[b>>2];c[d+4>>2]=c[b+4>>2];c[d+8>>2]=c[b+8>>2];c[d+12>>2]=c[b+12>>2];b=a;c[b>>2]=0;c[b+4>>2]=0;b=a+8|0;c[b>>2]=-1;c[b+4>>2]=-1;i=e;return}function fx(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0;f=b;g=a[f]|0;if((g&1)==0){h=1;i=g}else{g=c[b>>2]|0;h=(g&-2)-1|0;i=g&255}if(h>>>0<e>>>0){g=i&255;if((g&1|0)==0){j=g>>>1}else{j=c[b+4>>2]|0}fR(b,h,e-h|0,j,0,j,e,d);return b|0}if((i&1)==0){k=b+4|0}else{k=c[b+8>>2]|0}lx(k,d,e)|0;c[k+(e<<2)>>2]=0;if((a[f]&1)==0){a[f]=e<<1&255;return b|0}else{c[b+4>>2]=e;return b|0}return 0}function fy(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0;e=b;f=a[e]|0;if((f&1)==0){g=1;h=f}else{f=c[b>>2]|0;g=(f&-2)-1|0;h=f&255}f=h&255;if((f&1|0)==0){i=f>>>1}else{i=c[b+4>>2]|0}if((i|0)==(g|0)){fS(b,g,1,g,g,0,0);j=a[e]|0}else{j=h}if((j&1)==0){k=b+4|0}else{k=c[b+8>>2]|0}c[k+(i<<2)>>2]=d;d=i+1|0;c[k+(d<<2)>>2]=0;if((a[e]&1)==0){a[e]=d<<1&255;return}else{c[b+4>>2]=d;return}}function fz(a){a=a|0;fU(a|0);return}function fA(a,b){a=a|0;b=b|0;jV(a,b+28|0);return}function fB(a,b){a=a|0;b=b|0;c[a+24>>2]=b;c[a+16>>2]=(b|0)==0;c[a+20>>2]=0;c[a+4>>2]=4098;c[a+12>>2]=0;c[a+8>>2]=6;l6(a+32|0,0,40);j1(a+28|0);return}function fC(a){a=a|0;fU(a|0);return}function fD(a){a=a|0;c[a>>2]=8992;jW(a+4|0);l_(a);return}function fE(a){a=a|0;c[a>>2]=8992;jW(a+4|0);return}function fF(a){a=a|0;c[a>>2]=8992;jW(a+4|0);return}function fG(a){a=a|0;c[a>>2]=8992;j1(a+4|0);l6(a+8|0,0,24);return}function fH(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0;f=b;if((e|0)<=0){g=0;return g|0}h=b+12|0;i=b+16|0;j=d;d=0;while(1){k=c[h>>2]|0;if(k>>>0<(c[i>>2]|0)>>>0){c[h>>2]=k+1;l=a[k]|0}else{k=b0[c[(c[f>>2]|0)+40>>2]&255](b)|0;if((k|0)==-1){g=d;m=266;break}l=k&255}a[j]=l;k=d+1|0;if((k|0)<(e|0)){j=j+1|0;d=k}else{g=k;m=267;break}}if((m|0)==267){return g|0}else if((m|0)==266){return g|0}return 0}function fI(a){a=a|0;var b=0,e=0;if((b0[c[(c[a>>2]|0)+36>>2]&255](a)|0)==-1){b=-1;return b|0}e=a+12|0;a=c[e>>2]|0;c[e>>2]=a+1;b=d[a]|0;return b|0}function fJ(b,e,f){b=b|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0;g=b;if((f|0)<=0){h=0;return h|0}i=b+24|0;j=b+28|0;k=0;l=e;while(1){e=c[i>>2]|0;if(e>>>0<(c[j>>2]|0)>>>0){m=a[l]|0;c[i>>2]=e+1;a[e]=m}else{if((b_[c[(c[g>>2]|0)+52>>2]&63](b,d[l]|0)|0)==-1){h=k;n=282;break}}m=k+1|0;if((m|0)<(f|0)){k=m;l=l+1|0}else{h=m;n=280;break}}if((n|0)==280){return h|0}else if((n|0)==282){return h|0}return 0}function fK(a){a=a|0;c[a>>2]=8920;jW(a+4|0);l_(a);return}function fL(a){a=a|0;c[a>>2]=8920;jW(a+4|0);return}function fM(a){a=a|0;c[a>>2]=8920;jW(a+4|0);return}function fN(a){a=a|0;c[a>>2]=8920;j1(a+4|0);l6(a+8|0,0,24);return}function fO(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0;e=a;if((d|0)<=0){f=0;return f|0}g=a+12|0;h=a+16|0;i=b;b=0;while(1){j=c[g>>2]|0;if(j>>>0<(c[h>>2]|0)>>>0){c[g>>2]=j+4;k=c[j>>2]|0}else{j=b0[c[(c[e>>2]|0)+40>>2]&255](a)|0;if((j|0)==-1){f=b;l=295;break}else{k=j}}c[i>>2]=k;j=b+1|0;if((j|0)<(d|0)){i=i+4|0;b=j}else{f=j;l=296;break}}if((l|0)==296){return f|0}else if((l|0)==295){return f|0}return 0}function fP(a){a=a|0;var b=0,d=0;if((b0[c[(c[a>>2]|0)+36>>2]&255](a)|0)==-1){b=-1;return b|0}d=a+12|0;a=c[d>>2]|0;c[d>>2]=a+4;b=c[a>>2]|0;return b|0}function fQ(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;if(d>>>0>1073741822){e7(0)}e=b;f=a[e]|0;if((f&1)==0){g=1;h=f}else{f=c[b>>2]|0;g=(f&-2)-1|0;h=f&255}f=h&255;if((f&1|0)==0){i=f>>>1}else{i=c[b+4>>2]|0}f=i>>>0>d>>>0?i:d;if(f>>>0<2){j=2}else{j=f+4&-4}f=j-1|0;if((f|0)==(g|0)){return}if((f|0)==1){k=b+4|0;l=c[b+8>>2]|0;m=1;n=0}else{d=j<<2;if(f>>>0>g>>>0){o=lX(d)|0}else{o=lX(d)|0}d=h&1;if(d<<24>>24==0){p=b+4|0}else{p=c[b+8>>2]|0}k=o;l=p;m=d<<24>>24!=0;n=1}d=h&255;if((d&1|0)==0){q=d>>>1}else{q=c[b+4>>2]|0}lw(k,l,q+1|0)|0;if(m){l_(l)}if(n){c[b>>2]=j|1;c[b+4>>2]=i;c[b+8>>2]=k;return}else{a[e]=i<<1&255;return}}function fR(b,d,e,f,g,h,i,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;if((1073741821-d|0)>>>0<e>>>0){e7(0)}if((a[b]&1)==0){k=b+4|0}else{k=c[b+8>>2]|0}do{if(d>>>0<536870895){l=e+d|0;m=d<<1;n=l>>>0<m>>>0?m:l;if(n>>>0<2){o=2;break}o=n+4&-4}else{o=1073741822}}while(0);e=lX(o<<2)|0;if((g|0)!=0){lw(e,k,g)|0}if((i|0)!=0){n=e+(g<<2)|0;lw(n,j,i)|0}j=f-h|0;if((j|0)!=(g|0)){f=j-g|0;n=e+(i+g<<2)|0;l=k+(h+g<<2)|0;lw(n,l,f)|0}if((d|0)==1){p=b+8|0;c[p>>2]=e;q=o|1;r=b|0;c[r>>2]=q;s=j+i|0;t=b+4|0;c[t>>2]=s;u=e+(s<<2)|0;c[u>>2]=0;return}l_(k);p=b+8|0;c[p>>2]=e;q=o|1;r=b|0;c[r>>2]=q;s=j+i|0;t=b+4|0;c[t>>2]=s;u=e+(s<<2)|0;c[u>>2]=0;return}function fS(b,d,e,f,g,h,i){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;if((1073741821-d|0)>>>0<e>>>0){e7(0)}if((a[b]&1)==0){j=b+4|0}else{j=c[b+8>>2]|0}do{if(d>>>0<536870895){k=e+d|0;l=d<<1;m=k>>>0<l>>>0?l:k;if(m>>>0<2){n=2;break}n=m+4&-4}else{n=1073741822}}while(0);e=lX(n<<2)|0;if((g|0)!=0){lw(e,j,g)|0}m=f-h|0;if((m|0)!=(g|0)){f=m-g|0;m=e+(i+g<<2)|0;i=j+(h+g<<2)|0;lw(m,i,f)|0}if((d|0)==1){o=b+8|0;c[o>>2]=e;p=n|1;q=b|0;c[q>>2]=p;return}l_(j);o=b+8|0;c[o>>2]=e;p=n|1;q=b|0;c[q>>2]=p;return}function fT(b,d){b=b|0;d=d|0;var e=0,f=0,g=0;e=i;i=i+8|0;f=e|0;g=(c[b+24>>2]|0)==0;if(g){c[b+16>>2]=d|1}else{c[b+16>>2]=d}if(((g&1|d)&c[b+20>>2]|0)==0){i=e;return}e=bO(16)|0;do{if((a[19968]|0)==0){if((bb(19968)|0)==0){break}es(17936);c[4484]=8760;a_(80,17936,u|0)|0}}while(0);b=mc(17936,0,32)|0;d=K;c[f>>2]=b|1;c[f+4>>2]=d;eY(e,f,1696);c[e>>2]=7944;bk(e|0,14480,32)}function fU(a){a=a|0;var b=0,d=0,e=0,f=0;c[a>>2]=7920;b=c[a+40>>2]|0;d=a+32|0;e=a+36|0;if((b|0)!=0){f=b;do{f=f-1|0;b3[c[(c[d>>2]|0)+(f<<2)>>2]&7](0,a,c[(c[e>>2]|0)+(f<<2)>>2]|0);}while((f|0)!=0)}jW(a+28|0);lS(c[d>>2]|0);lS(c[e>>2]|0);lS(c[a+48>>2]|0);lS(c[a+60>>2]|0);return}function fV(a,b){a=a|0;b=b|0;return-1|0}function fW(a){a=a|0;return 2024|0}function fX(b,c,d,e,f){b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0;L461:do{if((e|0)==(f|0)){g=c}else{b=c;h=e;while(1){if((b|0)==(d|0)){i=-1;j=398;break}k=a[b]|0;l=a[h]|0;if(k<<24>>24<l<<24>>24){i=-1;j=397;break}if(l<<24>>24<k<<24>>24){i=1;j=395;break}k=b+1|0;l=h+1|0;if((l|0)==(f|0)){g=k;break L461}else{b=k;h=l}}if((j|0)==397){return i|0}else if((j|0)==398){return i|0}else if((j|0)==395){return i|0}}}while(0);i=(g|0)!=(d|0)|0;return i|0}function fY(b,c,d){b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0;if((c|0)==(d|0)){e=0;return e|0}else{f=c;g=0}while(1){c=(a[f]|0)+(g<<4)|0;b=c&-268435456;h=(b>>>24|b)^c;c=f+1|0;if((c|0)==(d|0)){e=h;break}else{f=c;g=h}}return e|0}function fZ(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0;L480:do{if((e|0)==(f|0)){g=b}else{a=b;h=e;while(1){if((a|0)==(d|0)){i=-1;j=412;break}k=c[a>>2]|0;l=c[h>>2]|0;if((k|0)<(l|0)){i=-1;j=411;break}if((l|0)<(k|0)){i=1;j=414;break}k=a+4|0;l=h+4|0;if((l|0)==(f|0)){g=k;break L480}else{a=k;h=l}}if((j|0)==414){return i|0}else if((j|0)==411){return i|0}else if((j|0)==412){return i|0}}}while(0);i=(g|0)!=(d|0)|0;return i|0}function f_(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0;e=a;if((d|0)<=0){f=0;return f|0}g=a+24|0;h=a+28|0;i=0;j=b;while(1){b=c[g>>2]|0;if(b>>>0<(c[h>>2]|0)>>>0){k=c[j>>2]|0;c[g>>2]=b+4;c[b>>2]=k}else{if((b_[c[(c[e>>2]|0)+52>>2]&63](a,c[j>>2]|0)|0)==-1){f=i;l=422;break}}k=i+1|0;if((k|0)<(d|0)){i=k;j=j+4|0}else{f=k;l=424;break}}if((l|0)==424){return f|0}else if((l|0)==422){return f|0}return 0}function f$(a){a=a|0;fU(a+8|0);l_(a);return}function f0(a){a=a|0;fU(a+8|0);return}function f1(a){a=a|0;var b=0,d=0;b=a;d=c[(c[a>>2]|0)-12>>2]|0;fU(b+(d+8)|0);l_(b+d|0);return}function f2(a){a=a|0;fU(a+((c[(c[a>>2]|0)-12>>2]|0)+8)|0);return}function f3(a){a=a|0;fU(a+8|0);l_(a);return}function f4(a){a=a|0;fU(a+8|0);return}function f5(a){a=a|0;var b=0,d=0;b=a;d=c[(c[a>>2]|0)-12>>2]|0;fU(b+(d+8)|0);l_(b+d|0);return}function f6(a){a=a|0;fU(a+((c[(c[a>>2]|0)-12>>2]|0)+8)|0);return}function f7(a){a=a|0;fU(a+4|0);l_(a);return}function f8(a){a=a|0;fU(a+4|0);return}function f9(a){a=a|0;var b=0,d=0;b=a;d=c[(c[a>>2]|0)-12>>2]|0;fU(b+(d+4)|0);l_(b+d|0);return}function ga(a){a=a|0;fU(a+((c[(c[a>>2]|0)-12>>2]|0)+4)|0);return}function gb(a){a=a|0;fU(a+4|0);l_(a);return}function gc(a){a=a|0;fU(a+4|0);return}function gd(a){a=a|0;var b=0,d=0;b=a;d=c[(c[a>>2]|0)-12>>2]|0;fU(b+(d+4)|0);l_(b+d|0);return}function ge(a){a=a|0;fU(a+((c[(c[a>>2]|0)-12>>2]|0)+4)|0);return}function gf(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)==1){e9(a,2368,35);return}else{eW(a,b|0,c);return}}function gg(a){a=a|0;eo(a|0);return}function gh(a){a=a|0;e_(a|0);l_(a);return}function gi(a){a=a|0;e_(a|0);return}function gj(a){a=a|0;fU(a);l_(a);return}function gk(a){a=a|0;eo(a|0);l_(a);return}function gl(a){a=a|0;en(a|0);l_(a);return}function gm(a){a=a|0;en(a|0);return}function gn(a){a=a|0;en(a|0);return}function go(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0;d=e;g=f-d|0;do{if((g|0)==-1){e7(b);h=459}else{if(g>>>0>=11){h=459;break}a[b]=g<<1&255;i=b+1|0}}while(0);if((h|0)==459){h=g+16&-16;j=lX(h)|0;c[b+8>>2]=j;c[b>>2]=h|1;c[b+4>>2]=g;i=j}if((e|0)==(f|0)){k=i;a[k]=0;return}j=f+(-d|0)|0;d=i;g=e;while(1){a[d]=a[g]|0;e=g+1|0;if((e|0)==(f|0)){break}else{d=d+1|0;g=e}}k=i+j|0;a[k]=0;return}function gp(a){a=a|0;en(a|0);l_(a);return}function gq(a){a=a|0;en(a|0);return}function gr(b){b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0;d=i;i=i+8|0;e=d|0;f=b;g=c[(c[f>>2]|0)-12>>2]|0;h=b;if((c[h+(g+24)>>2]|0)==0){i=d;return b|0}j=e|0;a[j]=0;c[e+4>>2]=b;do{if((c[h+(g+16)>>2]|0)==0){k=c[h+(g+72)>>2]|0;if((k|0)!=0){gr(k)|0}a[j]=1;k=c[h+((c[(c[f>>2]|0)-12>>2]|0)+24)>>2]|0;if((b0[c[(c[k>>2]|0)+24>>2]&255](k)|0)!=-1){break}k=c[(c[f>>2]|0)-12>>2]|0;fT(h+k|0,c[h+(k+16)>>2]|1)}}while(0);gt(e);i=d;return b|0}function gs(b){b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0;d=i;i=i+8|0;e=d|0;f=b;g=c[(c[f>>2]|0)-12>>2]|0;h=b;if((c[h+(g+24)>>2]|0)==0){i=d;return b|0}j=e|0;a[j]=0;c[e+4>>2]=b;do{if((c[h+(g+16)>>2]|0)==0){k=c[h+(g+72)>>2]|0;if((k|0)!=0){gs(k)|0}a[j]=1;k=c[h+((c[(c[f>>2]|0)-12>>2]|0)+24)>>2]|0;if((b0[c[(c[k>>2]|0)+24>>2]&255](k)|0)!=-1){break}k=c[(c[f>>2]|0)-12>>2]|0;fT(h+k|0,c[h+(k+16)>>2]|1)}}while(0);gu(e);i=d;return b|0}function gt(a){a=a|0;var b=0,d=0,e=0;b=a+4|0;a=c[b>>2]|0;d=c[(c[a>>2]|0)-12>>2]|0;e=a;if((c[e+(d+24)>>2]|0)==0){return}if((c[e+(d+16)>>2]|0)!=0){return}if((c[e+(d+4)>>2]&8192|0)==0){return}if(bg()|0){return}d=c[b>>2]|0;e=c[d+((c[(c[d>>2]|0)-12>>2]|0)+24)>>2]|0;if((b0[c[(c[e>>2]|0)+24>>2]&255](e)|0)!=-1){return}e=c[b>>2]|0;b=c[(c[e>>2]|0)-12>>2]|0;d=e;fT(d+b|0,c[d+(b+16)>>2]|1);return}function gu(a){a=a|0;var b=0,d=0,e=0;b=a+4|0;a=c[b>>2]|0;d=c[(c[a>>2]|0)-12>>2]|0;e=a;if((c[e+(d+24)>>2]|0)==0){return}if((c[e+(d+16)>>2]|0)!=0){return}if((c[e+(d+4)>>2]&8192|0)==0){return}if(bg()|0){return}d=c[b>>2]|0;e=c[d+((c[(c[d>>2]|0)-12>>2]|0)+24)>>2]|0;if((b0[c[(c[e>>2]|0)+24>>2]&255](e)|0)!=-1){return}e=c[b>>2]|0;b=c[(c[e>>2]|0)-12>>2]|0;d=e;fT(d+b|0,c[d+(b+16)>>2]|1);return}function gv(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0;if((b|0)==(d|0)){e=0;return e|0}else{f=b;g=0}while(1){b=(c[f>>2]|0)+(g<<4)|0;a=b&-268435456;h=(a>>>24|a)^b;b=f+4|0;if((b|0)==(d|0)){e=h;break}else{f=b;g=h}}return e|0}function gw(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0;d=e;g=f-d|0;h=g>>2;if(h>>>0>1073741822){e7(b)}if(h>>>0<2){a[b]=g>>>1&255;i=b+4|0}else{g=h+4&-4;j=lX(g<<2)|0;c[b+8>>2]=j;c[b>>2]=g|1;c[b+4>>2]=h;i=j}if((e|0)==(f|0)){k=i;c[k>>2]=0;return}j=(f-4+(-d|0)|0)>>>2;d=i;h=e;while(1){c[d>>2]=c[h>>2];e=h+4|0;if((e|0)==(f|0)){break}else{d=d+4|0;h=e}}k=i+(j+1<<2)|0;c[k>>2]=0;return}function gx(a){a=a|0;en(a|0);l_(a);return}function gy(a){a=a|0;en(a|0);return}function gz(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0;l=i;i=i+104|0;m=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[m>>2];m=(g-f|0)/12|0;n=l|0;do{if(m>>>0>100){o=lR(m)|0;if((o|0)!=0){p=o;q=o;break}l4();p=0;q=0}else{p=n;q=0}}while(0);n=(f|0)==(g|0);if(n){r=m;s=0}else{o=m;m=0;t=p;u=f;while(1){v=d[u]|0;if((v&1|0)==0){w=v>>>1}else{w=c[u+4>>2]|0}if((w|0)==0){a[t]=2;x=m+1|0;y=o-1|0}else{a[t]=1;x=m;y=o}v=u+12|0;if((v|0)==(g|0)){r=y;s=x;break}else{o=y;m=x;t=t+1|0;u=v}}}u=b|0;b=e|0;e=h;t=0;x=s;s=r;while(1){r=c[u>>2]|0;do{if((r|0)==0){z=0}else{if((c[r+12>>2]|0)!=(c[r+16>>2]|0)){z=r;break}if((b0[c[(c[r>>2]|0)+36>>2]&255](r)|0)==-1){c[u>>2]=0;z=0;break}else{z=c[u>>2]|0;break}}}while(0);r=(z|0)==0;m=c[b>>2]|0;if((m|0)==0){A=z;B=0}else{do{if((c[m+12>>2]|0)==(c[m+16>>2]|0)){if((b0[c[(c[m>>2]|0)+36>>2]&255](m)|0)!=-1){C=m;break}c[b>>2]=0;C=0}else{C=m}}while(0);A=c[u>>2]|0;B=C}D=(B|0)==0;if(!((r^D)&(s|0)!=0)){break}m=c[A+12>>2]|0;if((m|0)==(c[A+16>>2]|0)){E=(b0[c[(c[A>>2]|0)+36>>2]&255](A)|0)&255}else{E=a[m]|0}if(k){F=E}else{F=b_[c[(c[e>>2]|0)+12>>2]&63](h,E)|0}do{if(n){G=x;H=s}else{m=t+1|0;L683:do{if(k){y=s;o=x;w=p;v=0;I=f;while(1){do{if((a[w]|0)==1){J=I;if((a[J]&1)==0){K=I+1|0}else{K=c[I+8>>2]|0}if(F<<24>>24!=(a[K+t|0]|0)){a[w]=0;L=v;M=o;N=y-1|0;break}O=d[J]|0;if((O&1|0)==0){P=O>>>1}else{P=c[I+4>>2]|0}if((P|0)!=(m|0)){L=1;M=o;N=y;break}a[w]=2;L=1;M=o+1|0;N=y-1|0}else{L=v;M=o;N=y}}while(0);O=I+12|0;if((O|0)==(g|0)){Q=N;R=M;S=L;break L683}y=N;o=M;w=w+1|0;v=L;I=O}}else{I=s;v=x;w=p;o=0;y=f;while(1){do{if((a[w]|0)==1){O=y;if((a[O]&1)==0){T=y+1|0}else{T=c[y+8>>2]|0}if(F<<24>>24!=(b_[c[(c[e>>2]|0)+12>>2]&63](h,a[T+t|0]|0)|0)<<24>>24){a[w]=0;U=o;V=v;W=I-1|0;break}J=d[O]|0;if((J&1|0)==0){X=J>>>1}else{X=c[y+4>>2]|0}if((X|0)!=(m|0)){U=1;V=v;W=I;break}a[w]=2;U=1;V=v+1|0;W=I-1|0}else{U=o;V=v;W=I}}while(0);J=y+12|0;if((J|0)==(g|0)){Q=W;R=V;S=U;break L683}I=W;v=V;w=w+1|0;o=U;y=J}}}while(0);if(!S){G=R;H=Q;break}m=c[u>>2]|0;y=m+12|0;o=c[y>>2]|0;if((o|0)==(c[m+16>>2]|0)){w=c[(c[m>>2]|0)+40>>2]|0;b0[w&255](m)|0}else{c[y>>2]=o+1}if((R+Q|0)>>>0<2|n){G=R;H=Q;break}o=t+1|0;y=R;m=p;w=f;while(1){do{if((a[m]|0)==2){v=d[w]|0;if((v&1|0)==0){Y=v>>>1}else{Y=c[w+4>>2]|0}if((Y|0)==(o|0)){Z=y;break}a[m]=0;Z=y-1|0}else{Z=y}}while(0);v=w+12|0;if((v|0)==(g|0)){G=Z;H=Q;break}else{y=Z;m=m+1|0;w=v}}}}while(0);t=t+1|0;x=G;s=H}do{if((A|0)==0){_=0}else{if((c[A+12>>2]|0)!=(c[A+16>>2]|0)){_=A;break}if((b0[c[(c[A>>2]|0)+36>>2]&255](A)|0)==-1){c[u>>2]=0;_=0;break}else{_=c[u>>2]|0;break}}}while(0);u=(_|0)==0;do{if(D){$=652}else{if((c[B+12>>2]|0)!=(c[B+16>>2]|0)){if(u){break}else{$=654;break}}if((b0[c[(c[B>>2]|0)+36>>2]&255](B)|0)==-1){c[b>>2]=0;$=652;break}else{if(u^(B|0)==0){break}else{$=654;break}}}}while(0);if(($|0)==652){if(u){$=654}}if(($|0)==654){c[j>>2]=c[j>>2]|2}L762:do{if(n){$=659}else{u=f;B=p;while(1){if((a[B]|0)==2){aa=u;break L762}b=u+12|0;if((b|0)==(g|0)){$=659;break L762}u=b;B=B+1|0}}}while(0);if(($|0)==659){c[j>>2]=c[j>>2]|4;aa=g}if((q|0)==0){i=l;return aa|0}lS(q);i=l;return aa|0}function gA(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;k=i;i=i+112|0;l=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[l>>2];l=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[l>>2];l=k|0;m=k+16|0;n=k+32|0;o=k+40|0;p=k+48|0;q=k+56|0;r=k+64|0;s=k+72|0;t=k+80|0;u=k+104|0;if((c[g+4>>2]&1|0)==0){c[n>>2]=-1;v=c[(c[d>>2]|0)+16>>2]|0;w=e|0;c[p>>2]=c[w>>2];c[q>>2]=c[f>>2];bX[v&127](o,d,p,q,g,h,n);q=c[o>>2]|0;c[w>>2]=q;w=c[n>>2]|0;if((w|0)==1){a[j]=1}else if((w|0)==0){a[j]=0}else{a[j]=1;c[h>>2]=4}c[b>>2]=q;i=k;return}fA(r,g);q=r|0;r=c[q>>2]|0;if((c[4850]|0)!=-1){c[m>>2]=19400;c[m+4>>2]=16;c[m+8>>2]=0;e6(19400,m,116)}m=(c[4851]|0)-1|0;w=c[r+8>>2]|0;do{if((c[r+12>>2]|0)-w>>2>>>0>m>>>0){n=c[w+(m<<2)>>2]|0;if((n|0)==0){break}o=n;n=c[q>>2]|0;eL(n)|0;fA(s,g);n=s|0;p=c[n>>2]|0;if((c[4754]|0)!=-1){c[l>>2]=19016;c[l+4>>2]=16;c[l+8>>2]=0;e6(19016,l,116)}d=(c[4755]|0)-1|0;v=c[p+8>>2]|0;do{if((c[p+12>>2]|0)-v>>2>>>0>d>>>0){x=c[v+(d<<2)>>2]|0;if((x|0)==0){break}y=x;z=c[n>>2]|0;eL(z)|0;z=t|0;A=x;bZ[c[(c[A>>2]|0)+24>>2]&127](z,y);bZ[c[(c[A>>2]|0)+28>>2]&127](t+12|0,y);c[u>>2]=c[f>>2];a[j]=(gz(e,u,z,t+24|0,o,h,1)|0)==(z|0)|0;c[b>>2]=c[e>>2];e$(t+12|0);e$(t|0);i=k;return}}while(0);o=bO(4)|0;lz(o);bk(o|0,13904,160)}}while(0);k=bO(4)|0;lz(k);bk(k|0,13904,160)}function gB(b,e,f,g,h,i,j,k,l,m){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0;n=c[g>>2]|0;o=(n|0)==(f|0);do{if(o){p=(a[m+24|0]|0)==b<<24>>24;if(!p){if((a[m+25|0]|0)!=b<<24>>24){break}}c[g>>2]=f+1;a[f]=p?43:45;c[h>>2]=0;q=0;return q|0}}while(0);p=d[j]|0;if((p&1|0)==0){r=p>>>1}else{r=c[j+4>>2]|0}if((r|0)!=0&b<<24>>24==i<<24>>24){i=c[l>>2]|0;if((i-k|0)>=160){q=0;return q|0}k=c[h>>2]|0;c[l>>2]=i+4;c[i>>2]=k;c[h>>2]=0;q=0;return q|0}k=m+26|0;i=m;while(1){l=i+1|0;if((a[i]|0)==b<<24>>24){s=i;break}if((l|0)==(k|0)){s=k;break}else{i=l}}i=s-m|0;if((i|0)>23){q=-1;return q|0}do{if((e|0)==8|(e|0)==10){if((i|0)<(e|0)){break}else{q=-1}return q|0}else if((e|0)==16){if((i|0)<22){break}if(o){q=-1;return q|0}if((n-f|0)>=3){q=-1;return q|0}if((a[n-1|0]|0)!=48){q=-1;return q|0}c[h>>2]=0;m=a[15584+i|0]|0;s=c[g>>2]|0;c[g>>2]=s+1;a[s]=m;q=0;return q|0}}while(0);if((n-f|0)<39){f=a[15584+i|0]|0;c[g>>2]=n+1;a[n]=f}c[h>>2]=(c[h>>2]|0)+1;q=0;return q|0}function gC(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;g=b;h=b;i=a[h]|0;j=i&255;if((j&1|0)==0){k=j>>>1}else{k=c[b+4>>2]|0}if((k|0)==0){return}do{if((d|0)==(e|0)){l=i}else{k=e-4|0;if(k>>>0>d>>>0){m=d;n=k}else{l=i;break}do{k=c[m>>2]|0;c[m>>2]=c[n>>2];c[n>>2]=k;m=m+4|0;n=n-4|0;}while(m>>>0<n>>>0);l=a[h]|0}}while(0);if((l&1)==0){o=g+1|0}else{o=c[b+8>>2]|0}g=l&255;if((g&1|0)==0){p=g>>>1}else{p=c[b+4>>2]|0}b=e-4|0;e=a[o]|0;g=e<<24>>24;l=e<<24>>24<1|e<<24>>24==127;L872:do{if(b>>>0>d>>>0){e=o+p|0;h=o;n=d;m=g;i=l;while(1){if(!i){if((m|0)!=(c[n>>2]|0)){break}}k=(e-h|0)>1?h+1|0:h;j=n+4|0;q=a[k]|0;r=q<<24>>24;s=q<<24>>24<1|q<<24>>24==127;if(j>>>0<b>>>0){h=k;n=j;m=r;i=s}else{t=r;u=s;break L872}}c[f>>2]=4;return}else{t=g;u=l}}while(0);if(u){return}u=c[b>>2]|0;if(!(t>>>0<u>>>0|(u|0)==0)){return}c[f>>2]=4;return}function gD(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0;e=i;i=i+280|0;l=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[l>>2];l=g;g=i;i=i+4|0;i=i+7>>3<<3;c[g>>2]=c[l>>2];l=e|0;m=e+32|0;n=e+40|0;o=e+56|0;p=e+96|0;q=e+104|0;r=e+264|0;s=e+272|0;t=c[h+4>>2]&74;if((t|0)==0){u=0}else if((t|0)==64){u=8}else if((t|0)==8){u=16}else{u=10}t=l|0;gF(n,h,t,m);h=o|0;l6(h|0,0,40);c[p>>2]=h;o=q|0;c[r>>2]=o;c[s>>2]=0;l=f|0;f=g|0;g=a[m]|0;m=c[l>>2]|0;L895:while(1){do{if((m|0)==0){v=0}else{if((c[m+12>>2]|0)!=(c[m+16>>2]|0)){v=m;break}if((b0[c[(c[m>>2]|0)+36>>2]&255](m)|0)!=-1){v=m;break}c[l>>2]=0;v=0}}while(0);w=(v|0)==0;x=c[f>>2]|0;do{if((x|0)==0){y=777}else{if((c[x+12>>2]|0)!=(c[x+16>>2]|0)){if(w){z=x;A=0;break}else{B=x;C=0;break L895}}if((b0[c[(c[x>>2]|0)+36>>2]&255](x)|0)==-1){c[f>>2]=0;y=777;break}else{D=(x|0)==0;if(w^D){z=x;A=D;break}else{B=x;C=D;break L895}}}}while(0);if((y|0)==777){y=0;if(w){B=0;C=1;break}else{z=0;A=1}}x=v+12|0;D=c[x>>2]|0;E=v+16|0;if((D|0)==(c[E>>2]|0)){F=(b0[c[(c[v>>2]|0)+36>>2]&255](v)|0)&255}else{F=a[D]|0}if((gB(F,u,h,p,s,g,n,o,r,t)|0)!=0){B=z;C=A;break}D=c[x>>2]|0;if((D|0)==(c[E>>2]|0)){E=c[(c[v>>2]|0)+40>>2]|0;b0[E&255](v)|0;m=v;continue}else{c[x>>2]=D+1;m=v;continue}}m=d[n]|0;if((m&1|0)==0){G=m>>>1}else{G=c[n+4>>2]|0}do{if((G|0)!=0){m=c[r>>2]|0;if((m-q|0)>=160){break}A=c[s>>2]|0;c[r>>2]=m+4;c[m>>2]=A}}while(0);c[k>>2]=gE(h,c[p>>2]|0,j,u)|0;gC(n,o,c[r>>2]|0,j);do{if(w){H=0}else{if((c[v+12>>2]|0)!=(c[v+16>>2]|0)){H=v;break}if((b0[c[(c[v>>2]|0)+36>>2]&255](v)|0)!=-1){H=v;break}c[l>>2]=0;H=0}}while(0);l=(H|0)==0;L940:do{if(C){y=807}else{do{if((c[B+12>>2]|0)==(c[B+16>>2]|0)){if((b0[c[(c[B>>2]|0)+36>>2]&255](B)|0)!=-1){break}c[f>>2]=0;y=807;break L940}}while(0);if(!(l^(B|0)==0)){break}I=b|0;c[I>>2]=H;e$(n);i=e;return}}while(0);do{if((y|0)==807){if(l){break}I=b|0;c[I>>2]=H;e$(n);i=e;return}}while(0);c[j>>2]=c[j>>2]|2;I=b|0;c[I>>2]=H;e$(n);i=e;return}function gE(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0;g=i;i=i+8|0;h=g|0;if((b|0)==(d|0)){c[e>>2]=4;j=0;i=g;return j|0}k=c[(bw()|0)>>2]|0;c[(bw()|0)>>2]=0;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);l=bJ(b|0,h|0,f|0,c[4482]|0)|0;f=K;b=c[(bw()|0)>>2]|0;if((b|0)==0){c[(bw()|0)>>2]=k}if((c[h>>2]|0)!=(d|0)){c[e>>2]=4;j=0;i=g;return j|0}d=-1;h=0;if((b|0)==34|((f|0)<(d|0)|(f|0)==(d|0)&l>>>0<-2147483648>>>0)|((f|0)>(h|0)|(f|0)==(h|0)&l>>>0>2147483647>>>0)){c[e>>2]=4;e=0;j=(f|0)>(e|0)|(f|0)==(e|0)&l>>>0>0>>>0?2147483647:-2147483648;i=g;return j|0}else{j=l;i=g;return j|0}return 0}function gF(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;g=i;i=i+40|0;h=g|0;j=g+16|0;k=g+32|0;fA(k,d);d=k|0;k=c[d>>2]|0;if((c[4850]|0)!=-1){c[j>>2]=19400;c[j+4>>2]=16;c[j+8>>2]=0;e6(19400,j,116)}j=(c[4851]|0)-1|0;l=c[k+8>>2]|0;do{if((c[k+12>>2]|0)-l>>2>>>0>j>>>0){m=c[l+(j<<2)>>2]|0;if((m|0)==0){break}n=m;o=c[(c[m>>2]|0)+32>>2]|0;ca[o&15](n,15584,15610,e)|0;n=c[d>>2]|0;if((c[4754]|0)!=-1){c[h>>2]=19016;c[h+4>>2]=16;c[h+8>>2]=0;e6(19016,h,116)}o=(c[4755]|0)-1|0;m=c[n+8>>2]|0;do{if((c[n+12>>2]|0)-m>>2>>>0>o>>>0){p=c[m+(o<<2)>>2]|0;if((p|0)==0){break}q=p;a[f]=b0[c[(c[p>>2]|0)+16>>2]&255](q)|0;bZ[c[(c[p>>2]|0)+20>>2]&127](b,q);q=c[d>>2]|0;eL(q)|0;i=g;return}}while(0);o=bO(4)|0;lz(o);bk(o|0,13904,160)}}while(0);g=bO(4)|0;lz(g);bk(g|0,13904,160)}function gG(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0;e=i;i=i+280|0;l=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[l>>2];l=g;g=i;i=i+4|0;i=i+7>>3<<3;c[g>>2]=c[l>>2];l=e|0;m=e+32|0;n=e+40|0;o=e+56|0;p=e+96|0;q=e+104|0;r=e+264|0;s=e+272|0;t=c[h+4>>2]&74;if((t|0)==64){u=8}else if((t|0)==8){u=16}else if((t|0)==0){u=0}else{u=10}t=l|0;gF(n,h,t,m);h=o|0;l6(h|0,0,40);c[p>>2]=h;o=q|0;c[r>>2]=o;c[s>>2]=0;l=f|0;f=g|0;g=a[m]|0;m=c[l>>2]|0;L1001:while(1){do{if((m|0)==0){v=0}else{if((c[m+12>>2]|0)!=(c[m+16>>2]|0)){v=m;break}if((b0[c[(c[m>>2]|0)+36>>2]&255](m)|0)!=-1){v=m;break}c[l>>2]=0;v=0}}while(0);w=(v|0)==0;x=c[f>>2]|0;do{if((x|0)==0){y=866}else{if((c[x+12>>2]|0)!=(c[x+16>>2]|0)){if(w){z=x;A=0;break}else{B=x;C=0;break L1001}}if((b0[c[(c[x>>2]|0)+36>>2]&255](x)|0)==-1){c[f>>2]=0;y=866;break}else{D=(x|0)==0;if(w^D){z=x;A=D;break}else{B=x;C=D;break L1001}}}}while(0);if((y|0)==866){y=0;if(w){B=0;C=1;break}else{z=0;A=1}}x=v+12|0;D=c[x>>2]|0;E=v+16|0;if((D|0)==(c[E>>2]|0)){F=(b0[c[(c[v>>2]|0)+36>>2]&255](v)|0)&255}else{F=a[D]|0}if((gB(F,u,h,p,s,g,n,o,r,t)|0)!=0){B=z;C=A;break}D=c[x>>2]|0;if((D|0)==(c[E>>2]|0)){E=c[(c[v>>2]|0)+40>>2]|0;b0[E&255](v)|0;m=v;continue}else{c[x>>2]=D+1;m=v;continue}}m=d[n]|0;if((m&1|0)==0){G=m>>>1}else{G=c[n+4>>2]|0}do{if((G|0)!=0){m=c[r>>2]|0;if((m-q|0)>=160){break}A=c[s>>2]|0;c[r>>2]=m+4;c[m>>2]=A}}while(0);s=gH(h,c[p>>2]|0,j,u)|0;c[k>>2]=s;c[k+4>>2]=K;gC(n,o,c[r>>2]|0,j);do{if(w){H=0}else{if((c[v+12>>2]|0)!=(c[v+16>>2]|0)){H=v;break}if((b0[c[(c[v>>2]|0)+36>>2]&255](v)|0)!=-1){H=v;break}c[l>>2]=0;H=0}}while(0);l=(H|0)==0;L1046:do{if(C){y=896}else{do{if((c[B+12>>2]|0)==(c[B+16>>2]|0)){if((b0[c[(c[B>>2]|0)+36>>2]&255](B)|0)!=-1){break}c[f>>2]=0;y=896;break L1046}}while(0);if(!(l^(B|0)==0)){break}I=b|0;c[I>>2]=H;e$(n);i=e;return}}while(0);do{if((y|0)==896){if(l){break}I=b|0;c[I>>2]=H;e$(n);i=e;return}}while(0);c[j>>2]=c[j>>2]|2;I=b|0;c[I>>2]=H;e$(n);i=e;return}function gH(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0;g=i;i=i+8|0;h=g|0;if((b|0)==(d|0)){c[e>>2]=4;j=0;k=0;i=g;return(K=j,k)|0}l=c[(bw()|0)>>2]|0;c[(bw()|0)>>2]=0;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);m=bJ(b|0,h|0,f|0,c[4482]|0)|0;f=K;b=c[(bw()|0)>>2]|0;if((b|0)==0){c[(bw()|0)>>2]=l}if((c[h>>2]|0)!=(d|0)){c[e>>2]=4;j=0;k=0;i=g;return(K=j,k)|0}if((b|0)!=34){j=f;k=m;i=g;return(K=j,k)|0}c[e>>2]=4;e=0;b=(f|0)>(e|0)|(f|0)==(e|0)&m>>>0>0>>>0;j=b?2147483647:-2147483648;k=b?-1:0;i=g;return(K=j,k)|0}function gI(e,f,g,h,j,k,l){e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0;f=i;i=i+280|0;m=g;g=i;i=i+4|0;i=i+7>>3<<3;c[g>>2]=c[m>>2];m=h;h=i;i=i+4|0;i=i+7>>3<<3;c[h>>2]=c[m>>2];m=f|0;n=f+32|0;o=f+40|0;p=f+56|0;q=f+96|0;r=f+104|0;s=f+264|0;t=f+272|0;u=c[j+4>>2]&74;if((u|0)==64){v=8}else if((u|0)==0){v=0}else if((u|0)==8){v=16}else{v=10}u=m|0;gF(o,j,u,n);j=p|0;l6(j|0,0,40);c[q>>2]=j;p=r|0;c[s>>2]=p;c[t>>2]=0;m=g|0;g=h|0;h=a[n]|0;n=c[m>>2]|0;L1086:while(1){do{if((n|0)==0){w=0}else{if((c[n+12>>2]|0)!=(c[n+16>>2]|0)){w=n;break}if((b0[c[(c[n>>2]|0)+36>>2]&255](n)|0)!=-1){w=n;break}c[m>>2]=0;w=0}}while(0);x=(w|0)==0;y=c[g>>2]|0;do{if((y|0)==0){z=937}else{if((c[y+12>>2]|0)!=(c[y+16>>2]|0)){if(x){A=y;B=0;break}else{C=y;D=0;break L1086}}if((b0[c[(c[y>>2]|0)+36>>2]&255](y)|0)==-1){c[g>>2]=0;z=937;break}else{E=(y|0)==0;if(x^E){A=y;B=E;break}else{C=y;D=E;break L1086}}}}while(0);if((z|0)==937){z=0;if(x){C=0;D=1;break}else{A=0;B=1}}y=w+12|0;E=c[y>>2]|0;F=w+16|0;if((E|0)==(c[F>>2]|0)){G=(b0[c[(c[w>>2]|0)+36>>2]&255](w)|0)&255}else{G=a[E]|0}if((gB(G,v,j,q,t,h,o,p,s,u)|0)!=0){C=A;D=B;break}E=c[y>>2]|0;if((E|0)==(c[F>>2]|0)){F=c[(c[w>>2]|0)+40>>2]|0;b0[F&255](w)|0;n=w;continue}else{c[y>>2]=E+1;n=w;continue}}n=d[o]|0;if((n&1|0)==0){H=n>>>1}else{H=c[o+4>>2]|0}do{if((H|0)!=0){n=c[s>>2]|0;if((n-r|0)>=160){break}B=c[t>>2]|0;c[s>>2]=n+4;c[n>>2]=B}}while(0);b[l>>1]=gJ(j,c[q>>2]|0,k,v)|0;gC(o,p,c[s>>2]|0,k);do{if(x){I=0}else{if((c[w+12>>2]|0)!=(c[w+16>>2]|0)){I=w;break}if((b0[c[(c[w>>2]|0)+36>>2]&255](w)|0)!=-1){I=w;break}c[m>>2]=0;I=0}}while(0);m=(I|0)==0;L1131:do{if(D){z=967}else{do{if((c[C+12>>2]|0)==(c[C+16>>2]|0)){if((b0[c[(c[C>>2]|0)+36>>2]&255](C)|0)!=-1){break}c[g>>2]=0;z=967;break L1131}}while(0);if(!(m^(C|0)==0)){break}J=e|0;c[J>>2]=I;e$(o);i=f;return}}while(0);do{if((z|0)==967){if(m){break}J=e|0;c[J>>2]=I;e$(o);i=f;return}}while(0);c[k>>2]=c[k>>2]|2;J=e|0;c[J>>2]=I;e$(o);i=f;return}function gJ(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0;g=i;i=i+8|0;h=g|0;if((b|0)==(d|0)){c[e>>2]=4;j=0;i=g;return j|0}if((a[b]|0)==45){c[e>>2]=4;j=0;i=g;return j|0}k=c[(bw()|0)>>2]|0;c[(bw()|0)>>2]=0;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);l=aI(b|0,h|0,f|0,c[4482]|0)|0;f=K;b=c[(bw()|0)>>2]|0;if((b|0)==0){c[(bw()|0)>>2]=k}if((c[h>>2]|0)!=(d|0)){c[e>>2]=4;j=0;i=g;return j|0}d=0;if((b|0)==34|(f>>>0>d>>>0|f>>>0==d>>>0&l>>>0>65535>>>0)){c[e>>2]=4;j=-1;i=g;return j|0}else{j=l&65535;i=g;return j|0}return 0}function gK(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0;e=i;i=i+280|0;l=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[l>>2];l=g;g=i;i=i+4|0;i=i+7>>3<<3;c[g>>2]=c[l>>2];l=e|0;m=e+32|0;n=e+40|0;o=e+56|0;p=e+96|0;q=e+104|0;r=e+264|0;s=e+272|0;t=c[h+4>>2]&74;if((t|0)==0){u=0}else if((t|0)==64){u=8}else if((t|0)==8){u=16}else{u=10}t=l|0;gF(n,h,t,m);h=o|0;l6(h|0,0,40);c[p>>2]=h;o=q|0;c[r>>2]=o;c[s>>2]=0;l=f|0;f=g|0;g=a[m]|0;m=c[l>>2]|0;L1176:while(1){do{if((m|0)==0){v=0}else{if((c[m+12>>2]|0)!=(c[m+16>>2]|0)){v=m;break}if((b0[c[(c[m>>2]|0)+36>>2]&255](m)|0)!=-1){v=m;break}c[l>>2]=0;v=0}}while(0);w=(v|0)==0;x=c[f>>2]|0;do{if((x|0)==0){y=1012}else{if((c[x+12>>2]|0)!=(c[x+16>>2]|0)){if(w){z=x;A=0;break}else{B=x;C=0;break L1176}}if((b0[c[(c[x>>2]|0)+36>>2]&255](x)|0)==-1){c[f>>2]=0;y=1012;break}else{D=(x|0)==0;if(w^D){z=x;A=D;break}else{B=x;C=D;break L1176}}}}while(0);if((y|0)==1012){y=0;if(w){B=0;C=1;break}else{z=0;A=1}}x=v+12|0;D=c[x>>2]|0;E=v+16|0;if((D|0)==(c[E>>2]|0)){F=(b0[c[(c[v>>2]|0)+36>>2]&255](v)|0)&255}else{F=a[D]|0}if((gB(F,u,h,p,s,g,n,o,r,t)|0)!=0){B=z;C=A;break}D=c[x>>2]|0;if((D|0)==(c[E>>2]|0)){E=c[(c[v>>2]|0)+40>>2]|0;b0[E&255](v)|0;m=v;continue}else{c[x>>2]=D+1;m=v;continue}}m=d[n]|0;if((m&1|0)==0){G=m>>>1}else{G=c[n+4>>2]|0}do{if((G|0)!=0){m=c[r>>2]|0;if((m-q|0)>=160){break}A=c[s>>2]|0;c[r>>2]=m+4;c[m>>2]=A}}while(0);c[k>>2]=gL(h,c[p>>2]|0,j,u)|0;gC(n,o,c[r>>2]|0,j);do{if(w){H=0}else{if((c[v+12>>2]|0)!=(c[v+16>>2]|0)){H=v;break}if((b0[c[(c[v>>2]|0)+36>>2]&255](v)|0)!=-1){H=v;break}c[l>>2]=0;H=0}}while(0);l=(H|0)==0;L1221:do{if(C){y=1042}else{do{if((c[B+12>>2]|0)==(c[B+16>>2]|0)){if((b0[c[(c[B>>2]|0)+36>>2]&255](B)|0)!=-1){break}c[f>>2]=0;y=1042;break L1221}}while(0);if(!(l^(B|0)==0)){break}I=b|0;c[I>>2]=H;e$(n);i=e;return}}while(0);do{if((y|0)==1042){if(l){break}I=b|0;c[I>>2]=H;e$(n);i=e;return}}while(0);c[j>>2]=c[j>>2]|2;I=b|0;c[I>>2]=H;e$(n);i=e;return}function gL(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0;g=i;i=i+8|0;h=g|0;if((b|0)==(d|0)){c[e>>2]=4;j=0;i=g;return j|0}if((a[b]|0)==45){c[e>>2]=4;j=0;i=g;return j|0}k=c[(bw()|0)>>2]|0;c[(bw()|0)>>2]=0;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);l=aI(b|0,h|0,f|0,c[4482]|0)|0;f=K;b=c[(bw()|0)>>2]|0;if((b|0)==0){c[(bw()|0)>>2]=k}if((c[h>>2]|0)!=(d|0)){c[e>>2]=4;j=0;i=g;return j|0}d=0;if((b|0)==34|(f>>>0>d>>>0|f>>>0==d>>>0&l>>>0>-1>>>0)){c[e>>2]=4;j=-1;i=g;return j|0}else{j=l;i=g;return j|0}return 0}function gM(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0;e=i;i=i+280|0;l=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[l>>2];l=g;g=i;i=i+4|0;i=i+7>>3<<3;c[g>>2]=c[l>>2];l=e|0;m=e+32|0;n=e+40|0;o=e+56|0;p=e+96|0;q=e+104|0;r=e+264|0;s=e+272|0;t=c[h+4>>2]&74;if((t|0)==64){u=8}else if((t|0)==0){u=0}else if((t|0)==8){u=16}else{u=10}t=l|0;gF(n,h,t,m);h=o|0;l6(h|0,0,40);c[p>>2]=h;o=q|0;c[r>>2]=o;c[s>>2]=0;l=f|0;f=g|0;g=a[m]|0;m=c[l>>2]|0;L1266:while(1){do{if((m|0)==0){v=0}else{if((c[m+12>>2]|0)!=(c[m+16>>2]|0)){v=m;break}if((b0[c[(c[m>>2]|0)+36>>2]&255](m)|0)!=-1){v=m;break}c[l>>2]=0;v=0}}while(0);w=(v|0)==0;x=c[f>>2]|0;do{if((x|0)==0){y=1087}else{if((c[x+12>>2]|0)!=(c[x+16>>2]|0)){if(w){z=x;A=0;break}else{B=x;C=0;break L1266}}if((b0[c[(c[x>>2]|0)+36>>2]&255](x)|0)==-1){c[f>>2]=0;y=1087;break}else{D=(x|0)==0;if(w^D){z=x;A=D;break}else{B=x;C=D;break L1266}}}}while(0);if((y|0)==1087){y=0;if(w){B=0;C=1;break}else{z=0;A=1}}x=v+12|0;D=c[x>>2]|0;E=v+16|0;if((D|0)==(c[E>>2]|0)){F=(b0[c[(c[v>>2]|0)+36>>2]&255](v)|0)&255}else{F=a[D]|0}if((gB(F,u,h,p,s,g,n,o,r,t)|0)!=0){B=z;C=A;break}D=c[x>>2]|0;if((D|0)==(c[E>>2]|0)){E=c[(c[v>>2]|0)+40>>2]|0;b0[E&255](v)|0;m=v;continue}else{c[x>>2]=D+1;m=v;continue}}m=d[n]|0;if((m&1|0)==0){G=m>>>1}else{G=c[n+4>>2]|0}do{if((G|0)!=0){m=c[r>>2]|0;if((m-q|0)>=160){break}A=c[s>>2]|0;c[r>>2]=m+4;c[m>>2]=A}}while(0);c[k>>2]=gN(h,c[p>>2]|0,j,u)|0;gC(n,o,c[r>>2]|0,j);do{if(w){H=0}else{if((c[v+12>>2]|0)!=(c[v+16>>2]|0)){H=v;break}if((b0[c[(c[v>>2]|0)+36>>2]&255](v)|0)!=-1){H=v;break}c[l>>2]=0;H=0}}while(0);l=(H|0)==0;L1311:do{if(C){y=1117}else{do{if((c[B+12>>2]|0)==(c[B+16>>2]|0)){if((b0[c[(c[B>>2]|0)+36>>2]&255](B)|0)!=-1){break}c[f>>2]=0;y=1117;break L1311}}while(0);if(!(l^(B|0)==0)){break}I=b|0;c[I>>2]=H;e$(n);i=e;return}}while(0);do{if((y|0)==1117){if(l){break}I=b|0;c[I>>2]=H;e$(n);i=e;return}}while(0);c[j>>2]=c[j>>2]|2;I=b|0;c[I>>2]=H;e$(n);i=e;return}function gN(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0;g=i;i=i+8|0;h=g|0;if((b|0)==(d|0)){c[e>>2]=4;j=0;i=g;return j|0}if((a[b]|0)==45){c[e>>2]=4;j=0;i=g;return j|0}k=c[(bw()|0)>>2]|0;c[(bw()|0)>>2]=0;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);l=aI(b|0,h|0,f|0,c[4482]|0)|0;f=K;b=c[(bw()|0)>>2]|0;if((b|0)==0){c[(bw()|0)>>2]=k}if((c[h>>2]|0)!=(d|0)){c[e>>2]=4;j=0;i=g;return j|0}d=0;if((b|0)==34|(f>>>0>d>>>0|f>>>0==d>>>0&l>>>0>-1>>>0)){c[e>>2]=4;j=-1;i=g;return j|0}else{j=l;i=g;return j|0}return 0}function gO(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0;e=i;i=i+280|0;l=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[l>>2];l=g;g=i;i=i+4|0;i=i+7>>3<<3;c[g>>2]=c[l>>2];l=e|0;m=e+32|0;n=e+40|0;o=e+56|0;p=e+96|0;q=e+104|0;r=e+264|0;s=e+272|0;t=c[h+4>>2]&74;if((t|0)==64){u=8}else if((t|0)==8){u=16}else if((t|0)==0){u=0}else{u=10}t=l|0;gF(n,h,t,m);h=o|0;l6(h|0,0,40);c[p>>2]=h;o=q|0;c[r>>2]=o;c[s>>2]=0;l=f|0;f=g|0;g=a[m]|0;m=c[l>>2]|0;L1356:while(1){do{if((m|0)==0){v=0}else{if((c[m+12>>2]|0)!=(c[m+16>>2]|0)){v=m;break}if((b0[c[(c[m>>2]|0)+36>>2]&255](m)|0)!=-1){v=m;break}c[l>>2]=0;v=0}}while(0);w=(v|0)==0;x=c[f>>2]|0;do{if((x|0)==0){y=1162}else{if((c[x+12>>2]|0)!=(c[x+16>>2]|0)){if(w){z=x;A=0;break}else{B=x;C=0;break L1356}}if((b0[c[(c[x>>2]|0)+36>>2]&255](x)|0)==-1){c[f>>2]=0;y=1162;break}else{D=(x|0)==0;if(w^D){z=x;A=D;break}else{B=x;C=D;break L1356}}}}while(0);if((y|0)==1162){y=0;if(w){B=0;C=1;break}else{z=0;A=1}}x=v+12|0;D=c[x>>2]|0;E=v+16|0;if((D|0)==(c[E>>2]|0)){F=(b0[c[(c[v>>2]|0)+36>>2]&255](v)|0)&255}else{F=a[D]|0}if((gB(F,u,h,p,s,g,n,o,r,t)|0)!=0){B=z;C=A;break}D=c[x>>2]|0;if((D|0)==(c[E>>2]|0)){E=c[(c[v>>2]|0)+40>>2]|0;b0[E&255](v)|0;m=v;continue}else{c[x>>2]=D+1;m=v;continue}}m=d[n]|0;if((m&1|0)==0){G=m>>>1}else{G=c[n+4>>2]|0}do{if((G|0)!=0){m=c[r>>2]|0;if((m-q|0)>=160){break}A=c[s>>2]|0;c[r>>2]=m+4;c[m>>2]=A}}while(0);s=gP(h,c[p>>2]|0,j,u)|0;c[k>>2]=s;c[k+4>>2]=K;gC(n,o,c[r>>2]|0,j);do{if(w){H=0}else{if((c[v+12>>2]|0)!=(c[v+16>>2]|0)){H=v;break}if((b0[c[(c[v>>2]|0)+36>>2]&255](v)|0)!=-1){H=v;break}c[l>>2]=0;H=0}}while(0);l=(H|0)==0;L1401:do{if(C){y=1192}else{do{if((c[B+12>>2]|0)==(c[B+16>>2]|0)){if((b0[c[(c[B>>2]|0)+36>>2]&255](B)|0)!=-1){break}c[f>>2]=0;y=1192;break L1401}}while(0);if(!(l^(B|0)==0)){break}I=b|0;c[I>>2]=H;e$(n);i=e;return}}while(0);do{if((y|0)==1192){if(l){break}I=b|0;c[I>>2]=H;e$(n);i=e;return}}while(0);c[j>>2]=c[j>>2]|2;I=b|0;c[I>>2]=H;e$(n);i=e;return}function gP(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;g=i;i=i+8|0;h=g|0;do{if((b|0)==(d|0)){c[e>>2]=4;j=0;k=0}else{if((a[b]|0)==45){c[e>>2]=4;j=0;k=0;break}l=c[(bw()|0)>>2]|0;c[(bw()|0)>>2]=0;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);m=aI(b|0,h|0,f|0,c[4482]|0)|0;n=K;o=c[(bw()|0)>>2]|0;if((o|0)==0){c[(bw()|0)>>2]=l}if((c[h>>2]|0)!=(d|0)){c[e>>2]=4;j=0;k=0;break}if((o|0)!=34){j=n;k=m;break}c[e>>2]=4;j=-1;k=-1}}while(0);i=g;return(K=j,k)|0}function gQ(b,e,f,h,j,k,l){b=b|0;e=e|0;f=f|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0.0,I=0.0,J=0,K=0;e=i;i=i+312|0;m=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[m>>2];m=h;h=i;i=i+4|0;i=i+7>>3<<3;c[h>>2]=c[m>>2];m=e|0;n=e+40|0;o=e+48|0;p=e+56|0;q=e+112|0;r=e+120|0;s=e+280|0;t=e+288|0;u=e+296|0;v=e+304|0;w=e+8|0;gR(p,j,w,n,o);j=e+72|0;l6(j|0,0,40);c[q>>2]=j;x=r|0;c[s>>2]=x;c[t>>2]=0;a[u]=1;a[v]=69;y=f|0;f=h|0;h=a[n]|0;n=a[o]|0;o=c[y>>2]|0;L1435:while(1){do{if((o|0)==0){z=0}else{if((c[o+12>>2]|0)!=(c[o+16>>2]|0)){z=o;break}if((b0[c[(c[o>>2]|0)+36>>2]&255](o)|0)!=-1){z=o;break}c[y>>2]=0;z=0}}while(0);A=(z|0)==0;B=c[f>>2]|0;do{if((B|0)==0){C=1227}else{if((c[B+12>>2]|0)!=(c[B+16>>2]|0)){if(A){break}else{break L1435}}if((b0[c[(c[B>>2]|0)+36>>2]&255](B)|0)==-1){c[f>>2]=0;C=1227;break}else{if(A^(B|0)==0){break}else{break L1435}}}}while(0);if((C|0)==1227){C=0;if(A){break}}B=z+12|0;D=c[B>>2]|0;E=z+16|0;if((D|0)==(c[E>>2]|0)){F=(b0[c[(c[z>>2]|0)+36>>2]&255](z)|0)&255}else{F=a[D]|0}if((gS(F,u,v,j,q,h,n,p,x,s,t,w)|0)!=0){break}D=c[B>>2]|0;if((D|0)==(c[E>>2]|0)){E=c[(c[z>>2]|0)+40>>2]|0;b0[E&255](z)|0;o=z;continue}else{c[B>>2]=D+1;o=z;continue}}z=d[p]|0;if((z&1|0)==0){G=z>>>1}else{G=c[p+4>>2]|0}do{if((G|0)!=0){if((a[u]&1)==0){break}z=c[s>>2]|0;if((z-r|0)>=160){break}o=c[t>>2]|0;c[s>>2]=z+4;c[z>>2]=o}}while(0);t=c[q>>2]|0;do{if((j|0)==(t|0)){c[k>>2]=4;H=0.0}else{do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);I=+l2(j,m,c[4482]|0);if((c[m>>2]|0)==(t|0)){H=I;break}else{c[k>>2]=4;H=0.0;break}}}while(0);g[l>>2]=H;gC(p,x,c[s>>2]|0,k);s=c[y>>2]|0;do{if((s|0)==0){J=0}else{if((c[s+12>>2]|0)!=(c[s+16>>2]|0)){J=s;break}if((b0[c[(c[s>>2]|0)+36>>2]&255](s)|0)!=-1){J=s;break}c[y>>2]=0;J=0}}while(0);y=(J|0)==0;s=c[f>>2]|0;do{if((s|0)==0){C=1269}else{if((c[s+12>>2]|0)!=(c[s+16>>2]|0)){if(!y){break}K=b|0;c[K>>2]=J;e$(p);i=e;return}if((b0[c[(c[s>>2]|0)+36>>2]&255](s)|0)==-1){c[f>>2]=0;C=1269;break}if(!(y^(s|0)==0)){break}K=b|0;c[K>>2]=J;e$(p);i=e;return}}while(0);do{if((C|0)==1269){if(y){break}K=b|0;c[K>>2]=J;e$(p);i=e;return}}while(0);c[k>>2]=c[k>>2]|2;K=b|0;c[K>>2]=J;e$(p);i=e;return}function gR(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;h=i;i=i+40|0;j=h|0;k=h+16|0;l=h+32|0;fA(l,d);d=l|0;l=c[d>>2]|0;if((c[4850]|0)!=-1){c[k>>2]=19400;c[k+4>>2]=16;c[k+8>>2]=0;e6(19400,k,116)}k=(c[4851]|0)-1|0;m=c[l+8>>2]|0;do{if((c[l+12>>2]|0)-m>>2>>>0>k>>>0){n=c[m+(k<<2)>>2]|0;if((n|0)==0){break}o=n;p=c[(c[n>>2]|0)+32>>2]|0;ca[p&15](o,15584,15616,e)|0;o=c[d>>2]|0;if((c[4754]|0)!=-1){c[j>>2]=19016;c[j+4>>2]=16;c[j+8>>2]=0;e6(19016,j,116)}p=(c[4755]|0)-1|0;n=c[o+8>>2]|0;do{if((c[o+12>>2]|0)-n>>2>>>0>p>>>0){q=c[n+(p<<2)>>2]|0;if((q|0)==0){break}r=q;s=q;a[f]=b0[c[(c[s>>2]|0)+12>>2]&255](r)|0;a[g]=b0[c[(c[s>>2]|0)+16>>2]&255](r)|0;bZ[c[(c[q>>2]|0)+20>>2]&127](b,r);r=c[d>>2]|0;eL(r)|0;i=h;return}}while(0);p=bO(4)|0;lz(p);bk(p|0,13904,160)}}while(0);h=bO(4)|0;lz(h);bk(h|0,13904,160)}function gS(b,e,f,g,h,i,j,k,l,m,n,o){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;var p=0,q=0,r=0,s=0,t=0,u=0,v=0;p=c[h>>2]|0;q=g;if((p-q|0)>38){r=-1;return r|0}if(b<<24>>24==i<<24>>24){if((a[e]&1)==0){r=-1;return r|0}a[e]=0;i=c[h>>2]|0;c[h>>2]=i+1;a[i]=46;i=d[k]|0;if((i&1|0)==0){s=i>>>1}else{s=c[k+4>>2]|0}if((s|0)==0){r=0;return r|0}s=c[m>>2]|0;if((s-l|0)>=160){r=0;return r|0}i=c[n>>2]|0;c[m>>2]=s+4;c[s>>2]=i;r=0;return r|0}do{if(b<<24>>24==j<<24>>24){i=d[k]|0;if((i&1|0)==0){t=i>>>1}else{t=c[k+4>>2]|0}if((t|0)==0){break}if((a[e]&1)==0){r=-1;return r|0}i=c[m>>2]|0;if((i-l|0)>=160){r=0;return r|0}s=c[n>>2]|0;c[m>>2]=i+4;c[i>>2]=s;c[n>>2]=0;r=0;return r|0}}while(0);t=o+32|0;j=o;while(1){s=j+1|0;if((a[j]|0)==b<<24>>24){u=j;break}if((s|0)==(t|0)){u=t;break}else{j=s}}j=u-o|0;if((j|0)>31){r=-1;return r|0}o=a[15584+j|0]|0;do{if((j|0)==25|(j|0)==24){do{if((p|0)!=(g|0)){if((a[p-1|0]&95|0)==(a[f]&127|0)){break}else{r=-1}return r|0}}while(0);c[h>>2]=p+1;a[p]=o;r=0;return r|0}else if((j|0)==22|(j|0)==23){a[f]=80}else{u=a[f]|0;if((o&95|0)!=(u<<24>>24|0)){break}a[f]=u|-128;if((a[e]&1)==0){break}a[e]=0;u=d[k]|0;if((u&1|0)==0){v=u>>>1}else{v=c[k+4>>2]|0}if((v|0)==0){break}u=c[m>>2]|0;if((u-l|0)>=160){break}t=c[n>>2]|0;c[m>>2]=u+4;c[u>>2]=t}}while(0);m=c[h>>2]|0;if((m-q|0)<(((a[f]|0)<0?39:29)|0)){c[h>>2]=m+1;a[m]=o}if((j|0)>21){r=0;return r|0}c[n>>2]=(c[n>>2]|0)+1;r=0;return r|0}function gT(b,e,f,g,j,k,l){b=b|0;e=e|0;f=f|0;g=g|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0.0,I=0.0,J=0,K=0;e=i;i=i+312|0;m=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[m>>2];m=g;g=i;i=i+4|0;i=i+7>>3<<3;c[g>>2]=c[m>>2];m=e|0;n=e+40|0;o=e+48|0;p=e+56|0;q=e+112|0;r=e+120|0;s=e+280|0;t=e+288|0;u=e+296|0;v=e+304|0;w=e+8|0;gR(p,j,w,n,o);j=e+72|0;l6(j|0,0,40);c[q>>2]=j;x=r|0;c[s>>2]=x;c[t>>2]=0;a[u]=1;a[v]=69;y=f|0;f=g|0;g=a[n]|0;n=a[o]|0;o=c[y>>2]|0;L1599:while(1){do{if((o|0)==0){z=0}else{if((c[o+12>>2]|0)!=(c[o+16>>2]|0)){z=o;break}if((b0[c[(c[o>>2]|0)+36>>2]&255](o)|0)!=-1){z=o;break}c[y>>2]=0;z=0}}while(0);A=(z|0)==0;B=c[f>>2]|0;do{if((B|0)==0){C=1359}else{if((c[B+12>>2]|0)!=(c[B+16>>2]|0)){if(A){break}else{break L1599}}if((b0[c[(c[B>>2]|0)+36>>2]&255](B)|0)==-1){c[f>>2]=0;C=1359;break}else{if(A^(B|0)==0){break}else{break L1599}}}}while(0);if((C|0)==1359){C=0;if(A){break}}B=z+12|0;D=c[B>>2]|0;E=z+16|0;if((D|0)==(c[E>>2]|0)){F=(b0[c[(c[z>>2]|0)+36>>2]&255](z)|0)&255}else{F=a[D]|0}if((gS(F,u,v,j,q,g,n,p,x,s,t,w)|0)!=0){break}D=c[B>>2]|0;if((D|0)==(c[E>>2]|0)){E=c[(c[z>>2]|0)+40>>2]|0;b0[E&255](z)|0;o=z;continue}else{c[B>>2]=D+1;o=z;continue}}z=d[p]|0;if((z&1|0)==0){G=z>>>1}else{G=c[p+4>>2]|0}do{if((G|0)!=0){if((a[u]&1)==0){break}z=c[s>>2]|0;if((z-r|0)>=160){break}o=c[t>>2]|0;c[s>>2]=z+4;c[z>>2]=o}}while(0);t=c[q>>2]|0;do{if((j|0)==(t|0)){c[k>>2]=4;H=0.0}else{do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);I=+l2(j,m,c[4482]|0);if((c[m>>2]|0)==(t|0)){H=I;break}c[k>>2]=4;H=0.0}}while(0);h[l>>3]=H;gC(p,x,c[s>>2]|0,k);s=c[y>>2]|0;do{if((s|0)==0){J=0}else{if((c[s+12>>2]|0)!=(c[s+16>>2]|0)){J=s;break}if((b0[c[(c[s>>2]|0)+36>>2]&255](s)|0)!=-1){J=s;break}c[y>>2]=0;J=0}}while(0);y=(J|0)==0;s=c[f>>2]|0;do{if((s|0)==0){C=1400}else{if((c[s+12>>2]|0)!=(c[s+16>>2]|0)){if(!y){break}K=b|0;c[K>>2]=J;e$(p);i=e;return}if((b0[c[(c[s>>2]|0)+36>>2]&255](s)|0)==-1){c[f>>2]=0;C=1400;break}if(!(y^(s|0)==0)){break}K=b|0;c[K>>2]=J;e$(p);i=e;return}}while(0);do{if((C|0)==1400){if(y){break}K=b|0;c[K>>2]=J;e$(p);i=e;return}}while(0);c[k>>2]=c[k>>2]|2;K=b|0;c[K>>2]=J;e$(p);i=e;return}function gU(b,e,f,g,j,k,l){b=b|0;e=e|0;f=f|0;g=g|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0.0,I=0.0,J=0,K=0;e=i;i=i+312|0;m=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[m>>2];m=g;g=i;i=i+4|0;i=i+7>>3<<3;c[g>>2]=c[m>>2];m=e|0;n=e+40|0;o=e+48|0;p=e+56|0;q=e+112|0;r=e+120|0;s=e+280|0;t=e+288|0;u=e+296|0;v=e+304|0;w=e+8|0;gR(p,j,w,n,o);j=e+72|0;l6(j|0,0,40);c[q>>2]=j;x=r|0;c[s>>2]=x;c[t>>2]=0;a[u]=1;a[v]=69;y=f|0;f=g|0;g=a[n]|0;n=a[o]|0;o=c[y>>2]|0;L1672:while(1){do{if((o|0)==0){z=0}else{if((c[o+12>>2]|0)!=(c[o+16>>2]|0)){z=o;break}if((b0[c[(c[o>>2]|0)+36>>2]&255](o)|0)!=-1){z=o;break}c[y>>2]=0;z=0}}while(0);A=(z|0)==0;B=c[f>>2]|0;do{if((B|0)==0){C=1420}else{if((c[B+12>>2]|0)!=(c[B+16>>2]|0)){if(A){break}else{break L1672}}if((b0[c[(c[B>>2]|0)+36>>2]&255](B)|0)==-1){c[f>>2]=0;C=1420;break}else{if(A^(B|0)==0){break}else{break L1672}}}}while(0);if((C|0)==1420){C=0;if(A){break}}B=z+12|0;D=c[B>>2]|0;E=z+16|0;if((D|0)==(c[E>>2]|0)){F=(b0[c[(c[z>>2]|0)+36>>2]&255](z)|0)&255}else{F=a[D]|0}if((gS(F,u,v,j,q,g,n,p,x,s,t,w)|0)!=0){break}D=c[B>>2]|0;if((D|0)==(c[E>>2]|0)){E=c[(c[z>>2]|0)+40>>2]|0;b0[E&255](z)|0;o=z;continue}else{c[B>>2]=D+1;o=z;continue}}z=d[p]|0;if((z&1|0)==0){G=z>>>1}else{G=c[p+4>>2]|0}do{if((G|0)!=0){if((a[u]&1)==0){break}z=c[s>>2]|0;if((z-r|0)>=160){break}o=c[t>>2]|0;c[s>>2]=z+4;c[z>>2]=o}}while(0);t=c[q>>2]|0;do{if((j|0)==(t|0)){c[k>>2]=4;H=0.0}else{do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);I=+l2(j,m,c[4482]|0);if((c[m>>2]|0)==(t|0)){H=I;break}c[k>>2]=4;H=0.0}}while(0);h[l>>3]=H;gC(p,x,c[s>>2]|0,k);s=c[y>>2]|0;do{if((s|0)==0){J=0}else{if((c[s+12>>2]|0)!=(c[s+16>>2]|0)){J=s;break}if((b0[c[(c[s>>2]|0)+36>>2]&255](s)|0)!=-1){J=s;break}c[y>>2]=0;J=0}}while(0);y=(J|0)==0;s=c[f>>2]|0;do{if((s|0)==0){C=1461}else{if((c[s+12>>2]|0)!=(c[s+16>>2]|0)){if(!y){break}K=b|0;c[K>>2]=J;e$(p);i=e;return}if((b0[c[(c[s>>2]|0)+36>>2]&255](s)|0)==-1){c[f>>2]=0;C=1461;break}if(!(y^(s|0)==0)){break}K=b|0;c[K>>2]=J;e$(p);i=e;return}}while(0);do{if((C|0)==1461){if(y){break}K=b|0;c[K>>2]=J;e$(p);i=e;return}}while(0);c[k>>2]=c[k>>2]|2;K=b|0;c[K>>2]=J;e$(p);i=e;return}function gV(a){a=a|0;en(a|0);l_(a);return}function gW(a){a=a|0;en(a|0);return}function gX(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0;d=i;i=i+64|0;k=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[k>>2];k=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[k>>2];k=d|0;l=d+16|0;m=d+48|0;n=i;i=i+4|0;i=i+7>>3<<3;o=i;i=i+40|0;p=i;i=i+4|0;i=i+7>>3<<3;q=i;i=i+160|0;r=i;i=i+4|0;i=i+7>>3<<3;s=i;i=i+4|0;i=i+7>>3<<3;l6(m|0,0,12);fA(n,g);g=n|0;n=c[g>>2]|0;if((c[4850]|0)!=-1){c[k>>2]=19400;c[k+4>>2]=16;c[k+8>>2]=0;e6(19400,k,116)}k=(c[4851]|0)-1|0;t=c[n+8>>2]|0;do{if((c[n+12>>2]|0)-t>>2>>>0>k>>>0){u=c[t+(k<<2)>>2]|0;if((u|0)==0){break}v=u;w=l|0;x=c[(c[u>>2]|0)+32>>2]|0;ca[x&15](v,15584,15610,w)|0;v=c[g>>2]|0;eL(v)|0;v=o|0;l6(v|0,0,40);c[p>>2]=v;x=q|0;c[r>>2]=x;c[s>>2]=0;u=e|0;y=f|0;z=c[u>>2]|0;L1755:while(1){do{if((z|0)==0){A=0}else{if((c[z+12>>2]|0)!=(c[z+16>>2]|0)){A=z;break}if((b0[c[(c[z>>2]|0)+36>>2]&255](z)|0)!=-1){A=z;break}c[u>>2]=0;A=0}}while(0);C=(A|0)==0;D=c[y>>2]|0;do{if((D|0)==0){E=1491}else{if((c[D+12>>2]|0)!=(c[D+16>>2]|0)){if(C){break}else{break L1755}}if((b0[c[(c[D>>2]|0)+36>>2]&255](D)|0)==-1){c[y>>2]=0;E=1491;break}else{if(C^(D|0)==0){break}else{break L1755}}}}while(0);if((E|0)==1491){E=0;if(C){break}}D=A+12|0;F=c[D>>2]|0;G=A+16|0;if((F|0)==(c[G>>2]|0)){H=(b0[c[(c[A>>2]|0)+36>>2]&255](A)|0)&255}else{H=a[F]|0}if((gB(H,16,v,p,s,0,m,x,r,w)|0)!=0){break}F=c[D>>2]|0;if((F|0)==(c[G>>2]|0)){G=c[(c[A>>2]|0)+40>>2]|0;b0[G&255](A)|0;z=A;continue}else{c[D>>2]=F+1;z=A;continue}}a[o+39|0]=0;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);if((gY(v,c[4482]|0,1736,(B=i,i=i+8|0,c[B>>2]=j,B)|0)|0)!=1){c[h>>2]=4}z=c[u>>2]|0;do{if((z|0)==0){I=0}else{if((c[z+12>>2]|0)!=(c[z+16>>2]|0)){I=z;break}if((b0[c[(c[z>>2]|0)+36>>2]&255](z)|0)!=-1){I=z;break}c[u>>2]=0;I=0}}while(0);u=(I|0)==0;z=c[y>>2]|0;do{if((z|0)==0){E=1524}else{if((c[z+12>>2]|0)!=(c[z+16>>2]|0)){if(!u){break}J=b|0;c[J>>2]=I;e$(m);i=d;return}if((b0[c[(c[z>>2]|0)+36>>2]&255](z)|0)==-1){c[y>>2]=0;E=1524;break}if(!(u^(z|0)==0)){break}J=b|0;c[J>>2]=I;e$(m);i=d;return}}while(0);do{if((E|0)==1524){if(u){break}J=b|0;c[J>>2]=I;e$(m);i=d;return}}while(0);c[h>>2]=c[h>>2]|2;J=b|0;c[J>>2]=I;e$(m);i=d;return}}while(0);d=bO(4)|0;lz(d);bk(d|0,13904,160)}function gY(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;f=i;i=i+16|0;g=f|0;h=g;c[h>>2]=e;c[h+4>>2]=0;h=bC(b|0)|0;b=aX(a|0,d|0,g|0)|0;if((h|0)==0){i=f;return b|0}bC(h|0)|0;i=f;return b|0}function gZ(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;k=i;i=i+112|0;l=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[l>>2];l=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[l>>2];l=k|0;m=k+16|0;n=k+32|0;o=k+40|0;p=k+48|0;q=k+56|0;r=k+64|0;s=k+72|0;t=k+80|0;u=k+104|0;if((c[g+4>>2]&1|0)==0){c[n>>2]=-1;v=c[(c[d>>2]|0)+16>>2]|0;w=e|0;c[p>>2]=c[w>>2];c[q>>2]=c[f>>2];bX[v&127](o,d,p,q,g,h,n);q=c[o>>2]|0;c[w>>2]=q;w=c[n>>2]|0;if((w|0)==0){a[j]=0}else if((w|0)==1){a[j]=1}else{a[j]=1;c[h>>2]=4}c[b>>2]=q;i=k;return}fA(r,g);q=r|0;r=c[q>>2]|0;if((c[4848]|0)!=-1){c[m>>2]=19392;c[m+4>>2]=16;c[m+8>>2]=0;e6(19392,m,116)}m=(c[4849]|0)-1|0;w=c[r+8>>2]|0;do{if((c[r+12>>2]|0)-w>>2>>>0>m>>>0){n=c[w+(m<<2)>>2]|0;if((n|0)==0){break}o=n;n=c[q>>2]|0;eL(n)|0;fA(s,g);n=s|0;p=c[n>>2]|0;if((c[4752]|0)!=-1){c[l>>2]=19008;c[l+4>>2]=16;c[l+8>>2]=0;e6(19008,l,116)}d=(c[4753]|0)-1|0;v=c[p+8>>2]|0;do{if((c[p+12>>2]|0)-v>>2>>>0>d>>>0){x=c[v+(d<<2)>>2]|0;if((x|0)==0){break}y=x;z=c[n>>2]|0;eL(z)|0;z=t|0;A=x;bZ[c[(c[A>>2]|0)+24>>2]&127](z,y);bZ[c[(c[A>>2]|0)+28>>2]&127](t+12|0,y);c[u>>2]=c[f>>2];a[j]=(g_(e,u,z,t+24|0,o,h,1)|0)==(z|0)|0;c[b>>2]=c[e>>2];e4(t+12|0);e4(t|0);i=k;return}}while(0);o=bO(4)|0;lz(o);bk(o|0,13904,160)}}while(0);k=bO(4)|0;lz(k);bk(k|0,13904,160)}function g_(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ab=0,ac=0,ad=0;l=i;i=i+104|0;m=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[m>>2];m=(g-f|0)/12|0;n=l|0;do{if(m>>>0>100){o=lR(m)|0;if((o|0)!=0){p=o;q=o;break}l4();p=0;q=0}else{p=n;q=0}}while(0);n=(f|0)==(g|0);if(n){r=m;s=0}else{o=m;m=0;t=p;u=f;while(1){v=d[u]|0;if((v&1|0)==0){w=v>>>1}else{w=c[u+4>>2]|0}if((w|0)==0){a[t]=2;x=m+1|0;y=o-1|0}else{a[t]=1;x=m;y=o}v=u+12|0;if((v|0)==(g|0)){r=y;s=x;break}else{o=y;m=x;t=t+1|0;u=v}}}u=b|0;b=e|0;e=h;t=0;x=s;s=r;while(1){r=c[u>>2]|0;do{if((r|0)==0){z=0}else{m=c[r+12>>2]|0;if((m|0)==(c[r+16>>2]|0)){A=b0[c[(c[r>>2]|0)+36>>2]&255](r)|0}else{A=c[m>>2]|0}if((A|0)==-1){c[u>>2]=0;z=0;break}else{z=c[u>>2]|0;break}}}while(0);r=(z|0)==0;m=c[b>>2]|0;if((m|0)==0){B=z;C=0}else{y=c[m+12>>2]|0;if((y|0)==(c[m+16>>2]|0)){D=b0[c[(c[m>>2]|0)+36>>2]&255](m)|0}else{D=c[y>>2]|0}if((D|0)==-1){c[b>>2]=0;E=0}else{E=m}B=c[u>>2]|0;C=E}F=(C|0)==0;if(!((r^F)&(s|0)!=0)){break}r=c[B+12>>2]|0;if((r|0)==(c[B+16>>2]|0)){G=b0[c[(c[B>>2]|0)+36>>2]&255](B)|0}else{G=c[r>>2]|0}if(k){H=G}else{H=b_[c[(c[e>>2]|0)+28>>2]&63](h,G)|0}do{if(n){I=x;J=s}else{r=t+1|0;L1902:do{if(k){m=s;y=x;o=p;w=0;v=f;while(1){do{if((a[o]|0)==1){K=v;if((a[K]&1)==0){L=v+4|0}else{L=c[v+8>>2]|0}if((H|0)!=(c[L+(t<<2)>>2]|0)){a[o]=0;M=w;N=y;O=m-1|0;break}P=d[K]|0;if((P&1|0)==0){Q=P>>>1}else{Q=c[v+4>>2]|0}if((Q|0)!=(r|0)){M=1;N=y;O=m;break}a[o]=2;M=1;N=y+1|0;O=m-1|0}else{M=w;N=y;O=m}}while(0);P=v+12|0;if((P|0)==(g|0)){R=O;S=N;T=M;break L1902}m=O;y=N;o=o+1|0;w=M;v=P}}else{v=s;w=x;o=p;y=0;m=f;while(1){do{if((a[o]|0)==1){P=m;if((a[P]&1)==0){U=m+4|0}else{U=c[m+8>>2]|0}if((H|0)!=(b_[c[(c[e>>2]|0)+28>>2]&63](h,c[U+(t<<2)>>2]|0)|0)){a[o]=0;V=y;W=w;X=v-1|0;break}K=d[P]|0;if((K&1|0)==0){Y=K>>>1}else{Y=c[m+4>>2]|0}if((Y|0)!=(r|0)){V=1;W=w;X=v;break}a[o]=2;V=1;W=w+1|0;X=v-1|0}else{V=y;W=w;X=v}}while(0);K=m+12|0;if((K|0)==(g|0)){R=X;S=W;T=V;break L1902}v=X;w=W;o=o+1|0;y=V;m=K}}}while(0);if(!T){I=S;J=R;break}r=c[u>>2]|0;m=r+12|0;y=c[m>>2]|0;if((y|0)==(c[r+16>>2]|0)){o=c[(c[r>>2]|0)+40>>2]|0;b0[o&255](r)|0}else{c[m>>2]=y+4}if((S+R|0)>>>0<2|n){I=S;J=R;break}y=t+1|0;m=S;r=p;o=f;while(1){do{if((a[r]|0)==2){w=d[o]|0;if((w&1|0)==0){Z=w>>>1}else{Z=c[o+4>>2]|0}if((Z|0)==(y|0)){_=m;break}a[r]=0;_=m-1|0}else{_=m}}while(0);w=o+12|0;if((w|0)==(g|0)){I=_;J=R;break}else{m=_;r=r+1|0;o=w}}}}while(0);t=t+1|0;x=I;s=J}do{if((B|0)==0){$=1}else{J=c[B+12>>2]|0;if((J|0)==(c[B+16>>2]|0)){aa=b0[c[(c[B>>2]|0)+36>>2]&255](B)|0}else{aa=c[J>>2]|0}if((aa|0)==-1){c[u>>2]=0;$=1;break}else{$=(c[u>>2]|0)==0;break}}}while(0);do{if(F){ab=1664}else{u=c[C+12>>2]|0;if((u|0)==(c[C+16>>2]|0)){ac=b0[c[(c[C>>2]|0)+36>>2]&255](C)|0}else{ac=c[u>>2]|0}if((ac|0)==-1){c[b>>2]=0;ab=1664;break}else{if($^(C|0)==0){break}else{ab=1666;break}}}}while(0);if((ab|0)==1664){if($){ab=1666}}if((ab|0)==1666){c[j>>2]=c[j>>2]|2}L1983:do{if(n){ab=1671}else{$=f;C=p;while(1){if((a[C]|0)==2){ad=$;break L1983}b=$+12|0;if((b|0)==(g|0)){ab=1671;break L1983}$=b;C=C+1|0}}}while(0);if((ab|0)==1671){c[j>>2]=c[j>>2]|4;ad=g}if((q|0)==0){i=l;return ad|0}lS(q);i=l;return ad|0}function g$(a,b,e,f,g,h,j){a=a|0;b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0;b=i;i=i+352|0;k=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[k>>2];k=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[k>>2];k=b|0;l=b+104|0;m=b+112|0;n=b+128|0;o=b+168|0;p=b+176|0;q=b+336|0;r=b+344|0;s=c[g+4>>2]&74;if((s|0)==8){t=16}else if((s|0)==0){t=0}else if((s|0)==64){t=8}else{t=10}s=k|0;g3(m,g,s,l);g=n|0;l6(g|0,0,40);c[o>>2]=g;n=p|0;c[q>>2]=n;c[r>>2]=0;k=e|0;e=f|0;f=c[l>>2]|0;l=c[k>>2]|0;L2001:while(1){do{if((l|0)==0){u=0}else{v=c[l+12>>2]|0;if((v|0)==(c[l+16>>2]|0)){w=b0[c[(c[l>>2]|0)+36>>2]&255](l)|0}else{w=c[v>>2]|0}if((w|0)!=-1){u=l;break}c[k>>2]=0;u=0}}while(0);x=(u|0)==0;v=c[e>>2]|0;do{if((v|0)==0){y=1695}else{z=c[v+12>>2]|0;if((z|0)==(c[v+16>>2]|0)){A=b0[c[(c[v>>2]|0)+36>>2]&255](v)|0}else{A=c[z>>2]|0}if((A|0)==-1){c[e>>2]=0;y=1695;break}else{z=(v|0)==0;if(x^z){B=v;C=z;break}else{D=v;E=z;break L2001}}}}while(0);if((y|0)==1695){y=0;if(x){D=0;E=1;break}else{B=0;C=1}}v=u+12|0;z=c[v>>2]|0;F=u+16|0;if((z|0)==(c[F>>2]|0)){G=b0[c[(c[u>>2]|0)+36>>2]&255](u)|0}else{G=c[z>>2]|0}if((g0(G,t,g,o,r,f,m,n,q,s)|0)!=0){D=B;E=C;break}z=c[v>>2]|0;if((z|0)==(c[F>>2]|0)){F=c[(c[u>>2]|0)+40>>2]|0;b0[F&255](u)|0;l=u;continue}else{c[v>>2]=z+4;l=u;continue}}l=d[m]|0;if((l&1|0)==0){H=l>>>1}else{H=c[m+4>>2]|0}do{if((H|0)!=0){l=c[q>>2]|0;if((l-p|0)>=160){break}C=c[r>>2]|0;c[q>>2]=l+4;c[l>>2]=C}}while(0);c[j>>2]=gE(g,c[o>>2]|0,h,t)|0;gC(m,n,c[q>>2]|0,h);do{if(x){I=0}else{q=c[u+12>>2]|0;if((q|0)==(c[u+16>>2]|0)){J=b0[c[(c[u>>2]|0)+36>>2]&255](u)|0}else{J=c[q>>2]|0}if((J|0)!=-1){I=u;break}c[k>>2]=0;I=0}}while(0);k=(I|0)==0;do{if(E){y=1726}else{u=c[D+12>>2]|0;if((u|0)==(c[D+16>>2]|0)){K=b0[c[(c[D>>2]|0)+36>>2]&255](D)|0}else{K=c[u>>2]|0}if((K|0)==-1){c[e>>2]=0;y=1726;break}if(!(k^(D|0)==0)){break}L=a|0;c[L>>2]=I;e$(m);i=b;return}}while(0);do{if((y|0)==1726){if(k){break}L=a|0;c[L>>2]=I;e$(m);i=b;return}}while(0);c[h>>2]=c[h>>2]|2;L=a|0;c[L>>2]=I;e$(m);i=b;return}function g0(b,e,f,g,h,i,j,k,l,m){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0;n=c[g>>2]|0;o=(n|0)==(f|0);do{if(o){p=(c[m+96>>2]|0)==(b|0);if(!p){if((c[m+100>>2]|0)!=(b|0)){break}}c[g>>2]=f+1;a[f]=p?43:45;c[h>>2]=0;q=0;return q|0}}while(0);p=d[j]|0;if((p&1|0)==0){r=p>>>1}else{r=c[j+4>>2]|0}if((r|0)!=0&(b|0)==(i|0)){i=c[l>>2]|0;if((i-k|0)>=160){q=0;return q|0}k=c[h>>2]|0;c[l>>2]=i+4;c[i>>2]=k;c[h>>2]=0;q=0;return q|0}k=m+104|0;i=m;while(1){l=i+4|0;if((c[i>>2]|0)==(b|0)){s=i;break}if((l|0)==(k|0)){s=k;break}else{i=l}}i=s-m|0;m=i>>2;if((i|0)>92){q=-1;return q|0}do{if((e|0)==8|(e|0)==10){if((m|0)<(e|0)){break}else{q=-1}return q|0}else if((e|0)==16){if((i|0)<88){break}if(o){q=-1;return q|0}if((n-f|0)>=3){q=-1;return q|0}if((a[n-1|0]|0)!=48){q=-1;return q|0}c[h>>2]=0;s=a[15584+m|0]|0;k=c[g>>2]|0;c[g>>2]=k+1;a[k]=s;q=0;return q|0}}while(0);if((n-f|0)<39){f=a[15584+m|0]|0;c[g>>2]=n+1;a[n]=f}c[h>>2]=(c[h>>2]|0)+1;q=0;return q|0}function g1(a,b,e,f,g,h,j){a=a|0;b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,L=0,M=0;b=i;i=i+352|0;k=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[k>>2];k=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[k>>2];k=b|0;l=b+104|0;m=b+112|0;n=b+128|0;o=b+168|0;p=b+176|0;q=b+336|0;r=b+344|0;s=c[g+4>>2]&74;if((s|0)==8){t=16}else if((s|0)==0){t=0}else if((s|0)==64){t=8}else{t=10}s=k|0;g3(m,g,s,l);g=n|0;l6(g|0,0,40);c[o>>2]=g;n=p|0;c[q>>2]=n;c[r>>2]=0;k=e|0;e=f|0;f=c[l>>2]|0;l=c[k>>2]|0;L2116:while(1){do{if((l|0)==0){u=0}else{v=c[l+12>>2]|0;if((v|0)==(c[l+16>>2]|0)){w=b0[c[(c[l>>2]|0)+36>>2]&255](l)|0}else{w=c[v>>2]|0}if((w|0)!=-1){u=l;break}c[k>>2]=0;u=0}}while(0);x=(u|0)==0;v=c[e>>2]|0;do{if((v|0)==0){y=1785}else{z=c[v+12>>2]|0;if((z|0)==(c[v+16>>2]|0)){A=b0[c[(c[v>>2]|0)+36>>2]&255](v)|0}else{A=c[z>>2]|0}if((A|0)==-1){c[e>>2]=0;y=1785;break}else{z=(v|0)==0;if(x^z){B=v;C=z;break}else{D=v;E=z;break L2116}}}}while(0);if((y|0)==1785){y=0;if(x){D=0;E=1;break}else{B=0;C=1}}v=u+12|0;z=c[v>>2]|0;F=u+16|0;if((z|0)==(c[F>>2]|0)){G=b0[c[(c[u>>2]|0)+36>>2]&255](u)|0}else{G=c[z>>2]|0}if((g0(G,t,g,o,r,f,m,n,q,s)|0)!=0){D=B;E=C;break}z=c[v>>2]|0;if((z|0)==(c[F>>2]|0)){F=c[(c[u>>2]|0)+40>>2]|0;b0[F&255](u)|0;l=u;continue}else{c[v>>2]=z+4;l=u;continue}}l=d[m]|0;if((l&1|0)==0){H=l>>>1}else{H=c[m+4>>2]|0}do{if((H|0)!=0){l=c[q>>2]|0;if((l-p|0)>=160){break}C=c[r>>2]|0;c[q>>2]=l+4;c[l>>2]=C}}while(0);r=gH(g,c[o>>2]|0,h,t)|0;c[j>>2]=r;c[j+4>>2]=K;gC(m,n,c[q>>2]|0,h);do{if(x){I=0}else{q=c[u+12>>2]|0;if((q|0)==(c[u+16>>2]|0)){J=b0[c[(c[u>>2]|0)+36>>2]&255](u)|0}else{J=c[q>>2]|0}if((J|0)!=-1){I=u;break}c[k>>2]=0;I=0}}while(0);k=(I|0)==0;do{if(E){y=1816}else{u=c[D+12>>2]|0;if((u|0)==(c[D+16>>2]|0)){L=b0[c[(c[D>>2]|0)+36>>2]&255](D)|0}else{L=c[u>>2]|0}if((L|0)==-1){c[e>>2]=0;y=1816;break}if(!(k^(D|0)==0)){break}M=a|0;c[M>>2]=I;e$(m);i=b;return}}while(0);do{if((y|0)==1816){if(k){break}M=a|0;c[M>>2]=I;e$(m);i=b;return}}while(0);c[h>>2]=c[h>>2]|2;M=a|0;c[M>>2]=I;e$(m);i=b;return}function g2(a,e,f,g,h,j,k){a=a|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0;e=i;i=i+352|0;l=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[l>>2];l=g;g=i;i=i+4|0;i=i+7>>3<<3;c[g>>2]=c[l>>2];l=e|0;m=e+104|0;n=e+112|0;o=e+128|0;p=e+168|0;q=e+176|0;r=e+336|0;s=e+344|0;t=c[h+4>>2]&74;if((t|0)==0){u=0}else if((t|0)==64){u=8}else if((t|0)==8){u=16}else{u=10}t=l|0;g3(n,h,t,m);h=o|0;l6(h|0,0,40);c[p>>2]=h;o=q|0;c[r>>2]=o;c[s>>2]=0;l=f|0;f=g|0;g=c[m>>2]|0;m=c[l>>2]|0;L2185:while(1){do{if((m|0)==0){v=0}else{w=c[m+12>>2]|0;if((w|0)==(c[m+16>>2]|0)){x=b0[c[(c[m>>2]|0)+36>>2]&255](m)|0}else{x=c[w>>2]|0}if((x|0)!=-1){v=m;break}c[l>>2]=0;v=0}}while(0);y=(v|0)==0;w=c[f>>2]|0;do{if((w|0)==0){z=1840}else{A=c[w+12>>2]|0;if((A|0)==(c[w+16>>2]|0)){B=b0[c[(c[w>>2]|0)+36>>2]&255](w)|0}else{B=c[A>>2]|0}if((B|0)==-1){c[f>>2]=0;z=1840;break}else{A=(w|0)==0;if(y^A){C=w;D=A;break}else{E=w;F=A;break L2185}}}}while(0);if((z|0)==1840){z=0;if(y){E=0;F=1;break}else{C=0;D=1}}w=v+12|0;A=c[w>>2]|0;G=v+16|0;if((A|0)==(c[G>>2]|0)){H=b0[c[(c[v>>2]|0)+36>>2]&255](v)|0}else{H=c[A>>2]|0}if((g0(H,u,h,p,s,g,n,o,r,t)|0)!=0){E=C;F=D;break}A=c[w>>2]|0;if((A|0)==(c[G>>2]|0)){G=c[(c[v>>2]|0)+40>>2]|0;b0[G&255](v)|0;m=v;continue}else{c[w>>2]=A+4;m=v;continue}}m=d[n]|0;if((m&1|0)==0){I=m>>>1}else{I=c[n+4>>2]|0}do{if((I|0)!=0){m=c[r>>2]|0;if((m-q|0)>=160){break}D=c[s>>2]|0;c[r>>2]=m+4;c[m>>2]=D}}while(0);b[k>>1]=gJ(h,c[p>>2]|0,j,u)|0;gC(n,o,c[r>>2]|0,j);do{if(y){J=0}else{r=c[v+12>>2]|0;if((r|0)==(c[v+16>>2]|0)){K=b0[c[(c[v>>2]|0)+36>>2]&255](v)|0}else{K=c[r>>2]|0}if((K|0)!=-1){J=v;break}c[l>>2]=0;J=0}}while(0);l=(J|0)==0;do{if(F){z=1871}else{v=c[E+12>>2]|0;if((v|0)==(c[E+16>>2]|0)){L=b0[c[(c[E>>2]|0)+36>>2]&255](E)|0}else{L=c[v>>2]|0}if((L|0)==-1){c[f>>2]=0;z=1871;break}if(!(l^(E|0)==0)){break}M=a|0;c[M>>2]=J;e$(n);i=e;return}}while(0);do{if((z|0)==1871){if(l){break}M=a|0;c[M>>2]=J;e$(n);i=e;return}}while(0);c[j>>2]=c[j>>2]|2;M=a|0;c[M>>2]=J;e$(n);i=e;return}function g3(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;f=i;i=i+40|0;g=f|0;h=f+16|0;j=f+32|0;fA(j,b);b=j|0;j=c[b>>2]|0;if((c[4848]|0)!=-1){c[h>>2]=19392;c[h+4>>2]=16;c[h+8>>2]=0;e6(19392,h,116)}h=(c[4849]|0)-1|0;k=c[j+8>>2]|0;do{if((c[j+12>>2]|0)-k>>2>>>0>h>>>0){l=c[k+(h<<2)>>2]|0;if((l|0)==0){break}m=l;n=c[(c[l>>2]|0)+48>>2]|0;ca[n&15](m,15584,15610,d)|0;m=c[b>>2]|0;if((c[4752]|0)!=-1){c[g>>2]=19008;c[g+4>>2]=16;c[g+8>>2]=0;e6(19008,g,116)}n=(c[4753]|0)-1|0;l=c[m+8>>2]|0;do{if((c[m+12>>2]|0)-l>>2>>>0>n>>>0){o=c[l+(n<<2)>>2]|0;if((o|0)==0){break}p=o;c[e>>2]=b0[c[(c[o>>2]|0)+16>>2]&255](p)|0;bZ[c[(c[o>>2]|0)+20>>2]&127](a,p);p=c[b>>2]|0;eL(p)|0;i=f;return}}while(0);n=bO(4)|0;lz(n);bk(n|0,13904,160)}}while(0);f=bO(4)|0;lz(f);bk(f|0,13904,160)}function g4(a,b,e,f,g,h,j){a=a|0;b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0;b=i;i=i+352|0;k=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[k>>2];k=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[k>>2];k=b|0;l=b+104|0;m=b+112|0;n=b+128|0;o=b+168|0;p=b+176|0;q=b+336|0;r=b+344|0;s=c[g+4>>2]&74;if((s|0)==0){t=0}else if((s|0)==64){t=8}else if((s|0)==8){t=16}else{t=10}s=k|0;g3(m,g,s,l);g=n|0;l6(g|0,0,40);c[o>>2]=g;n=p|0;c[q>>2]=n;c[r>>2]=0;k=e|0;e=f|0;f=c[l>>2]|0;l=c[k>>2]|0;L2274:while(1){do{if((l|0)==0){u=0}else{v=c[l+12>>2]|0;if((v|0)==(c[l+16>>2]|0)){w=b0[c[(c[l>>2]|0)+36>>2]&255](l)|0}else{w=c[v>>2]|0}if((w|0)!=-1){u=l;break}c[k>>2]=0;u=0}}while(0);x=(u|0)==0;v=c[e>>2]|0;do{if((v|0)==0){y=1912}else{z=c[v+12>>2]|0;if((z|0)==(c[v+16>>2]|0)){A=b0[c[(c[v>>2]|0)+36>>2]&255](v)|0}else{A=c[z>>2]|0}if((A|0)==-1){c[e>>2]=0;y=1912;break}else{z=(v|0)==0;if(x^z){B=v;C=z;break}else{D=v;E=z;break L2274}}}}while(0);if((y|0)==1912){y=0;if(x){D=0;E=1;break}else{B=0;C=1}}v=u+12|0;z=c[v>>2]|0;F=u+16|0;if((z|0)==(c[F>>2]|0)){G=b0[c[(c[u>>2]|0)+36>>2]&255](u)|0}else{G=c[z>>2]|0}if((g0(G,t,g,o,r,f,m,n,q,s)|0)!=0){D=B;E=C;break}z=c[v>>2]|0;if((z|0)==(c[F>>2]|0)){F=c[(c[u>>2]|0)+40>>2]|0;b0[F&255](u)|0;l=u;continue}else{c[v>>2]=z+4;l=u;continue}}l=d[m]|0;if((l&1|0)==0){H=l>>>1}else{H=c[m+4>>2]|0}do{if((H|0)!=0){l=c[q>>2]|0;if((l-p|0)>=160){break}C=c[r>>2]|0;c[q>>2]=l+4;c[l>>2]=C}}while(0);c[j>>2]=gL(g,c[o>>2]|0,h,t)|0;gC(m,n,c[q>>2]|0,h);do{if(x){I=0}else{q=c[u+12>>2]|0;if((q|0)==(c[u+16>>2]|0)){J=b0[c[(c[u>>2]|0)+36>>2]&255](u)|0}else{J=c[q>>2]|0}if((J|0)!=-1){I=u;break}c[k>>2]=0;I=0}}while(0);k=(I|0)==0;do{if(E){y=1943}else{u=c[D+12>>2]|0;if((u|0)==(c[D+16>>2]|0)){K=b0[c[(c[D>>2]|0)+36>>2]&255](D)|0}else{K=c[u>>2]|0}if((K|0)==-1){c[e>>2]=0;y=1943;break}if(!(k^(D|0)==0)){break}L=a|0;c[L>>2]=I;e$(m);i=b;return}}while(0);do{if((y|0)==1943){if(k){break}L=a|0;c[L>>2]=I;e$(m);i=b;return}}while(0);c[h>>2]=c[h>>2]|2;L=a|0;c[L>>2]=I;e$(m);i=b;return}function g5(a,b,e,f,g,h,j){a=a|0;b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0;b=i;i=i+352|0;k=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[k>>2];k=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[k>>2];k=b|0;l=b+104|0;m=b+112|0;n=b+128|0;o=b+168|0;p=b+176|0;q=b+336|0;r=b+344|0;s=c[g+4>>2]&74;if((s|0)==8){t=16}else if((s|0)==0){t=0}else if((s|0)==64){t=8}else{t=10}s=k|0;g3(m,g,s,l);g=n|0;l6(g|0,0,40);c[o>>2]=g;n=p|0;c[q>>2]=n;c[r>>2]=0;k=e|0;e=f|0;f=c[l>>2]|0;l=c[k>>2]|0;L2343:while(1){do{if((l|0)==0){u=0}else{v=c[l+12>>2]|0;if((v|0)==(c[l+16>>2]|0)){w=b0[c[(c[l>>2]|0)+36>>2]&255](l)|0}else{w=c[v>>2]|0}if((w|0)!=-1){u=l;break}c[k>>2]=0;u=0}}while(0);x=(u|0)==0;v=c[e>>2]|0;do{if((v|0)==0){y=1967}else{z=c[v+12>>2]|0;if((z|0)==(c[v+16>>2]|0)){A=b0[c[(c[v>>2]|0)+36>>2]&255](v)|0}else{A=c[z>>2]|0}if((A|0)==-1){c[e>>2]=0;y=1967;break}else{z=(v|0)==0;if(x^z){B=v;C=z;break}else{D=v;E=z;break L2343}}}}while(0);if((y|0)==1967){y=0;if(x){D=0;E=1;break}else{B=0;C=1}}v=u+12|0;z=c[v>>2]|0;F=u+16|0;if((z|0)==(c[F>>2]|0)){G=b0[c[(c[u>>2]|0)+36>>2]&255](u)|0}else{G=c[z>>2]|0}if((g0(G,t,g,o,r,f,m,n,q,s)|0)!=0){D=B;E=C;break}z=c[v>>2]|0;if((z|0)==(c[F>>2]|0)){F=c[(c[u>>2]|0)+40>>2]|0;b0[F&255](u)|0;l=u;continue}else{c[v>>2]=z+4;l=u;continue}}l=d[m]|0;if((l&1|0)==0){H=l>>>1}else{H=c[m+4>>2]|0}do{if((H|0)!=0){l=c[q>>2]|0;if((l-p|0)>=160){break}C=c[r>>2]|0;c[q>>2]=l+4;c[l>>2]=C}}while(0);c[j>>2]=gN(g,c[o>>2]|0,h,t)|0;gC(m,n,c[q>>2]|0,h);do{if(x){I=0}else{q=c[u+12>>2]|0;if((q|0)==(c[u+16>>2]|0)){J=b0[c[(c[u>>2]|0)+36>>2]&255](u)|0}else{J=c[q>>2]|0}if((J|0)!=-1){I=u;break}c[k>>2]=0;I=0}}while(0);k=(I|0)==0;do{if(E){y=1998}else{u=c[D+12>>2]|0;if((u|0)==(c[D+16>>2]|0)){K=b0[c[(c[D>>2]|0)+36>>2]&255](D)|0}else{K=c[u>>2]|0}if((K|0)==-1){c[e>>2]=0;y=1998;break}if(!(k^(D|0)==0)){break}L=a|0;c[L>>2]=I;e$(m);i=b;return}}while(0);do{if((y|0)==1998){if(k){break}L=a|0;c[L>>2]=I;e$(m);i=b;return}}while(0);c[h>>2]=c[h>>2]|2;L=a|0;c[L>>2]=I;e$(m);i=b;return}function g6(a,b,e,f,g,h,j){a=a|0;b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,L=0,M=0;b=i;i=i+352|0;k=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[k>>2];k=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[k>>2];k=b|0;l=b+104|0;m=b+112|0;n=b+128|0;o=b+168|0;p=b+176|0;q=b+336|0;r=b+344|0;s=c[g+4>>2]&74;if((s|0)==0){t=0}else if((s|0)==64){t=8}else if((s|0)==8){t=16}else{t=10}s=k|0;g3(m,g,s,l);g=n|0;l6(g|0,0,40);c[o>>2]=g;n=p|0;c[q>>2]=n;c[r>>2]=0;k=e|0;e=f|0;f=c[l>>2]|0;l=c[k>>2]|0;L2412:while(1){do{if((l|0)==0){u=0}else{v=c[l+12>>2]|0;if((v|0)==(c[l+16>>2]|0)){w=b0[c[(c[l>>2]|0)+36>>2]&255](l)|0}else{w=c[v>>2]|0}if((w|0)!=-1){u=l;break}c[k>>2]=0;u=0}}while(0);x=(u|0)==0;v=c[e>>2]|0;do{if((v|0)==0){y=2022}else{z=c[v+12>>2]|0;if((z|0)==(c[v+16>>2]|0)){A=b0[c[(c[v>>2]|0)+36>>2]&255](v)|0}else{A=c[z>>2]|0}if((A|0)==-1){c[e>>2]=0;y=2022;break}else{z=(v|0)==0;if(x^z){B=v;C=z;break}else{D=v;E=z;break L2412}}}}while(0);if((y|0)==2022){y=0;if(x){D=0;E=1;break}else{B=0;C=1}}v=u+12|0;z=c[v>>2]|0;F=u+16|0;if((z|0)==(c[F>>2]|0)){G=b0[c[(c[u>>2]|0)+36>>2]&255](u)|0}else{G=c[z>>2]|0}if((g0(G,t,g,o,r,f,m,n,q,s)|0)!=0){D=B;E=C;break}z=c[v>>2]|0;if((z|0)==(c[F>>2]|0)){F=c[(c[u>>2]|0)+40>>2]|0;b0[F&255](u)|0;l=u;continue}else{c[v>>2]=z+4;l=u;continue}}l=d[m]|0;if((l&1|0)==0){H=l>>>1}else{H=c[m+4>>2]|0}do{if((H|0)!=0){l=c[q>>2]|0;if((l-p|0)>=160){break}C=c[r>>2]|0;c[q>>2]=l+4;c[l>>2]=C}}while(0);r=gP(g,c[o>>2]|0,h,t)|0;c[j>>2]=r;c[j+4>>2]=K;gC(m,n,c[q>>2]|0,h);do{if(x){I=0}else{q=c[u+12>>2]|0;if((q|0)==(c[u+16>>2]|0)){J=b0[c[(c[u>>2]|0)+36>>2]&255](u)|0}else{J=c[q>>2]|0}if((J|0)!=-1){I=u;break}c[k>>2]=0;I=0}}while(0);k=(I|0)==0;do{if(E){y=2053}else{u=c[D+12>>2]|0;if((u|0)==(c[D+16>>2]|0)){L=b0[c[(c[D>>2]|0)+36>>2]&255](D)|0}else{L=c[u>>2]|0}if((L|0)==-1){c[e>>2]=0;y=2053;break}if(!(k^(D|0)==0)){break}M=a|0;c[M>>2]=I;e$(m);i=b;return}}while(0);do{if((y|0)==2053){if(k){break}M=a|0;c[M>>2]=I;e$(m);i=b;return}}while(0);c[h>>2]=c[h>>2]|2;M=a|0;c[M>>2]=I;e$(m);i=b;return}function g7(b,e,f,g,h,i,j,k,l,m,n,o){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;var p=0,q=0,r=0,s=0,t=0,u=0,v=0;p=c[h>>2]|0;q=g;if((p-q|0)>38){r=-1;return r|0}if((b|0)==(i|0)){if((a[e]&1)==0){r=-1;return r|0}a[e]=0;i=c[h>>2]|0;c[h>>2]=i+1;a[i]=46;i=d[k]|0;if((i&1|0)==0){s=i>>>1}else{s=c[k+4>>2]|0}if((s|0)==0){r=0;return r|0}s=c[m>>2]|0;if((s-l|0)>=160){r=0;return r|0}i=c[n>>2]|0;c[m>>2]=s+4;c[s>>2]=i;r=0;return r|0}do{if((b|0)==(j|0)){i=d[k]|0;if((i&1|0)==0){t=i>>>1}else{t=c[k+4>>2]|0}if((t|0)==0){break}if((a[e]&1)==0){r=-1;return r|0}i=c[m>>2]|0;if((i-l|0)>=160){r=0;return r|0}s=c[n>>2]|0;c[m>>2]=i+4;c[i>>2]=s;c[n>>2]=0;r=0;return r|0}}while(0);t=o+128|0;j=o;while(1){s=j+4|0;if((c[j>>2]|0)==(b|0)){u=j;break}if((s|0)==(t|0)){u=t;break}else{j=s}}j=u-o|0;o=j>>2;if((j|0)>124){r=-1;return r|0}u=a[15584+o|0]|0;do{if((o|0)==25|(o|0)==24){do{if((p|0)!=(g|0)){if((a[p-1|0]&95|0)==(a[f]&127|0)){break}else{r=-1}return r|0}}while(0);c[h>>2]=p+1;a[p]=u;r=0;return r|0}else if((o|0)==22|(o|0)==23){a[f]=80}else{t=a[f]|0;if((u&95|0)!=(t<<24>>24|0)){break}a[f]=t|-128;if((a[e]&1)==0){break}a[e]=0;t=d[k]|0;if((t&1|0)==0){v=t>>>1}else{v=c[k+4>>2]|0}if((v|0)==0){break}t=c[m>>2]|0;if((t-l|0)>=160){break}b=c[n>>2]|0;c[m>>2]=t+4;c[t>>2]=b}}while(0);m=c[h>>2]|0;if((m-q|0)<(((a[f]|0)<0?39:29)|0)){c[h>>2]=m+1;a[m]=u}if((j|0)>84){r=0;return r|0}c[n>>2]=(c[n>>2]|0)+1;r=0;return r|0}function g8(b,e,f,h,j,k,l){b=b|0;e=e|0;f=f|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0.0,K=0.0,L=0,M=0,N=0,O=0;e=i;i=i+408|0;m=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[m>>2];m=h;h=i;i=i+4|0;i=i+7>>3<<3;c[h>>2]=c[m>>2];m=e|0;n=e+136|0;o=e+144|0;p=e+152|0;q=e+208|0;r=e+216|0;s=e+376|0;t=e+384|0;u=e+392|0;v=e+400|0;w=e+8|0;g9(p,j,w,n,o);j=e+168|0;l6(j|0,0,40);c[q>>2]=j;x=r|0;c[s>>2]=x;c[t>>2]=0;a[u]=1;a[v]=69;y=f|0;f=h|0;h=c[n>>2]|0;n=c[o>>2]|0;o=c[y>>2]|0;L2544:while(1){do{if((o|0)==0){z=0}else{A=c[o+12>>2]|0;if((A|0)==(c[o+16>>2]|0)){B=b0[c[(c[o>>2]|0)+36>>2]&255](o)|0}else{B=c[A>>2]|0}if((B|0)!=-1){z=o;break}c[y>>2]=0;z=0}}while(0);A=(z|0)==0;C=c[f>>2]|0;do{if((C|0)==0){D=2125}else{E=c[C+12>>2]|0;if((E|0)==(c[C+16>>2]|0)){F=b0[c[(c[C>>2]|0)+36>>2]&255](C)|0}else{F=c[E>>2]|0}if((F|0)==-1){c[f>>2]=0;D=2125;break}else{if(A^(C|0)==0){break}else{break L2544}}}}while(0);if((D|0)==2125){D=0;if(A){break}}C=z+12|0;E=c[C>>2]|0;G=z+16|0;if((E|0)==(c[G>>2]|0)){H=b0[c[(c[z>>2]|0)+36>>2]&255](z)|0}else{H=c[E>>2]|0}if((g7(H,u,v,j,q,h,n,p,x,s,t,w)|0)!=0){break}E=c[C>>2]|0;if((E|0)==(c[G>>2]|0)){G=c[(c[z>>2]|0)+40>>2]|0;b0[G&255](z)|0;o=z;continue}else{c[C>>2]=E+4;o=z;continue}}z=d[p]|0;if((z&1|0)==0){I=z>>>1}else{I=c[p+4>>2]|0}do{if((I|0)!=0){if((a[u]&1)==0){break}z=c[s>>2]|0;if((z-r|0)>=160){break}o=c[t>>2]|0;c[s>>2]=z+4;c[z>>2]=o}}while(0);t=c[q>>2]|0;do{if((j|0)==(t|0)){c[k>>2]=4;J=0.0}else{do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);K=+l2(j,m,c[4482]|0);if((c[m>>2]|0)==(t|0)){J=K;break}else{c[k>>2]=4;J=0.0;break}}}while(0);g[l>>2]=J;gC(p,x,c[s>>2]|0,k);s=c[y>>2]|0;do{if((s|0)==0){L=0}else{x=c[s+12>>2]|0;if((x|0)==(c[s+16>>2]|0)){M=b0[c[(c[s>>2]|0)+36>>2]&255](s)|0}else{M=c[x>>2]|0}if((M|0)!=-1){L=s;break}c[y>>2]=0;L=0}}while(0);y=(L|0)==0;s=c[f>>2]|0;do{if((s|0)==0){D=2167}else{M=c[s+12>>2]|0;if((M|0)==(c[s+16>>2]|0)){N=b0[c[(c[s>>2]|0)+36>>2]&255](s)|0}else{N=c[M>>2]|0}if((N|0)==-1){c[f>>2]=0;D=2167;break}if(!(y^(s|0)==0)){break}O=b|0;c[O>>2]=L;e$(p);i=e;return}}while(0);do{if((D|0)==2167){if(y){break}O=b|0;c[O>>2]=L;e$(p);i=e;return}}while(0);c[k>>2]=c[k>>2]|2;O=b|0;c[O>>2]=L;e$(p);i=e;return}function g9(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;g=i;i=i+40|0;h=g|0;j=g+16|0;k=g+32|0;fA(k,b);b=k|0;k=c[b>>2]|0;if((c[4848]|0)!=-1){c[j>>2]=19392;c[j+4>>2]=16;c[j+8>>2]=0;e6(19392,j,116)}j=(c[4849]|0)-1|0;l=c[k+8>>2]|0;do{if((c[k+12>>2]|0)-l>>2>>>0>j>>>0){m=c[l+(j<<2)>>2]|0;if((m|0)==0){break}n=m;o=c[(c[m>>2]|0)+48>>2]|0;ca[o&15](n,15584,15616,d)|0;n=c[b>>2]|0;if((c[4752]|0)!=-1){c[h>>2]=19008;c[h+4>>2]=16;c[h+8>>2]=0;e6(19008,h,116)}o=(c[4753]|0)-1|0;m=c[n+8>>2]|0;do{if((c[n+12>>2]|0)-m>>2>>>0>o>>>0){p=c[m+(o<<2)>>2]|0;if((p|0)==0){break}q=p;r=p;c[e>>2]=b0[c[(c[r>>2]|0)+12>>2]&255](q)|0;c[f>>2]=b0[c[(c[r>>2]|0)+16>>2]&255](q)|0;bZ[c[(c[p>>2]|0)+20>>2]&127](a,q);q=c[b>>2]|0;eL(q)|0;i=g;return}}while(0);o=bO(4)|0;lz(o);bk(o|0,13904,160)}}while(0);g=bO(4)|0;lz(g);bk(g|0,13904,160)}function ha(b,e,f,g,j,k,l){b=b|0;e=e|0;f=f|0;g=g|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0.0,K=0.0,L=0,M=0,N=0,O=0;e=i;i=i+408|0;m=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[m>>2];m=g;g=i;i=i+4|0;i=i+7>>3<<3;c[g>>2]=c[m>>2];m=e|0;n=e+136|0;o=e+144|0;p=e+152|0;q=e+208|0;r=e+216|0;s=e+376|0;t=e+384|0;u=e+392|0;v=e+400|0;w=e+8|0;g9(p,j,w,n,o);j=e+168|0;l6(j|0,0,40);c[q>>2]=j;x=r|0;c[s>>2]=x;c[t>>2]=0;a[u]=1;a[v]=69;y=f|0;f=g|0;g=c[n>>2]|0;n=c[o>>2]|0;o=c[y>>2]|0;L2642:while(1){do{if((o|0)==0){z=0}else{A=c[o+12>>2]|0;if((A|0)==(c[o+16>>2]|0)){B=b0[c[(c[o>>2]|0)+36>>2]&255](o)|0}else{B=c[A>>2]|0}if((B|0)!=-1){z=o;break}c[y>>2]=0;z=0}}while(0);A=(z|0)==0;C=c[f>>2]|0;do{if((C|0)==0){D=2205}else{E=c[C+12>>2]|0;if((E|0)==(c[C+16>>2]|0)){F=b0[c[(c[C>>2]|0)+36>>2]&255](C)|0}else{F=c[E>>2]|0}if((F|0)==-1){c[f>>2]=0;D=2205;break}else{if(A^(C|0)==0){break}else{break L2642}}}}while(0);if((D|0)==2205){D=0;if(A){break}}C=z+12|0;E=c[C>>2]|0;G=z+16|0;if((E|0)==(c[G>>2]|0)){H=b0[c[(c[z>>2]|0)+36>>2]&255](z)|0}else{H=c[E>>2]|0}if((g7(H,u,v,j,q,g,n,p,x,s,t,w)|0)!=0){break}E=c[C>>2]|0;if((E|0)==(c[G>>2]|0)){G=c[(c[z>>2]|0)+40>>2]|0;b0[G&255](z)|0;o=z;continue}else{c[C>>2]=E+4;o=z;continue}}z=d[p]|0;if((z&1|0)==0){I=z>>>1}else{I=c[p+4>>2]|0}do{if((I|0)!=0){if((a[u]&1)==0){break}z=c[s>>2]|0;if((z-r|0)>=160){break}o=c[t>>2]|0;c[s>>2]=z+4;c[z>>2]=o}}while(0);t=c[q>>2]|0;do{if((j|0)==(t|0)){c[k>>2]=4;J=0.0}else{do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);K=+l2(j,m,c[4482]|0);if((c[m>>2]|0)==(t|0)){J=K;break}c[k>>2]=4;J=0.0}}while(0);h[l>>3]=J;gC(p,x,c[s>>2]|0,k);s=c[y>>2]|0;do{if((s|0)==0){L=0}else{x=c[s+12>>2]|0;if((x|0)==(c[s+16>>2]|0)){M=b0[c[(c[s>>2]|0)+36>>2]&255](s)|0}else{M=c[x>>2]|0}if((M|0)!=-1){L=s;break}c[y>>2]=0;L=0}}while(0);y=(L|0)==0;s=c[f>>2]|0;do{if((s|0)==0){D=2246}else{M=c[s+12>>2]|0;if((M|0)==(c[s+16>>2]|0)){N=b0[c[(c[s>>2]|0)+36>>2]&255](s)|0}else{N=c[M>>2]|0}if((N|0)==-1){c[f>>2]=0;D=2246;break}if(!(y^(s|0)==0)){break}O=b|0;c[O>>2]=L;e$(p);i=e;return}}while(0);do{if((D|0)==2246){if(y){break}O=b|0;c[O>>2]=L;e$(p);i=e;return}}while(0);c[k>>2]=c[k>>2]|2;O=b|0;c[O>>2]=L;e$(p);i=e;return}function hb(b,e,f,g,j,k,l){b=b|0;e=e|0;f=f|0;g=g|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0.0,K=0.0,L=0,M=0,N=0,O=0;e=i;i=i+408|0;m=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[m>>2];m=g;g=i;i=i+4|0;i=i+7>>3<<3;c[g>>2]=c[m>>2];m=e|0;n=e+136|0;o=e+144|0;p=e+152|0;q=e+208|0;r=e+216|0;s=e+376|0;t=e+384|0;u=e+392|0;v=e+400|0;w=e+8|0;g9(p,j,w,n,o);j=e+168|0;l6(j|0,0,40);c[q>>2]=j;x=r|0;c[s>>2]=x;c[t>>2]=0;a[u]=1;a[v]=69;y=f|0;f=g|0;g=c[n>>2]|0;n=c[o>>2]|0;o=c[y>>2]|0;L2717:while(1){do{if((o|0)==0){z=0}else{A=c[o+12>>2]|0;if((A|0)==(c[o+16>>2]|0)){B=b0[c[(c[o>>2]|0)+36>>2]&255](o)|0}else{B=c[A>>2]|0}if((B|0)!=-1){z=o;break}c[y>>2]=0;z=0}}while(0);A=(z|0)==0;C=c[f>>2]|0;do{if((C|0)==0){D=2266}else{E=c[C+12>>2]|0;if((E|0)==(c[C+16>>2]|0)){F=b0[c[(c[C>>2]|0)+36>>2]&255](C)|0}else{F=c[E>>2]|0}if((F|0)==-1){c[f>>2]=0;D=2266;break}else{if(A^(C|0)==0){break}else{break L2717}}}}while(0);if((D|0)==2266){D=0;if(A){break}}C=z+12|0;E=c[C>>2]|0;G=z+16|0;if((E|0)==(c[G>>2]|0)){H=b0[c[(c[z>>2]|0)+36>>2]&255](z)|0}else{H=c[E>>2]|0}if((g7(H,u,v,j,q,g,n,p,x,s,t,w)|0)!=0){break}E=c[C>>2]|0;if((E|0)==(c[G>>2]|0)){G=c[(c[z>>2]|0)+40>>2]|0;b0[G&255](z)|0;o=z;continue}else{c[C>>2]=E+4;o=z;continue}}z=d[p]|0;if((z&1|0)==0){I=z>>>1}else{I=c[p+4>>2]|0}do{if((I|0)!=0){if((a[u]&1)==0){break}z=c[s>>2]|0;if((z-r|0)>=160){break}o=c[t>>2]|0;c[s>>2]=z+4;c[z>>2]=o}}while(0);t=c[q>>2]|0;do{if((j|0)==(t|0)){c[k>>2]=4;J=0.0}else{do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);K=+l2(j,m,c[4482]|0);if((c[m>>2]|0)==(t|0)){J=K;break}c[k>>2]=4;J=0.0}}while(0);h[l>>3]=J;gC(p,x,c[s>>2]|0,k);s=c[y>>2]|0;do{if((s|0)==0){L=0}else{x=c[s+12>>2]|0;if((x|0)==(c[s+16>>2]|0)){M=b0[c[(c[s>>2]|0)+36>>2]&255](s)|0}else{M=c[x>>2]|0}if((M|0)!=-1){L=s;break}c[y>>2]=0;L=0}}while(0);y=(L|0)==0;s=c[f>>2]|0;do{if((s|0)==0){D=2307}else{M=c[s+12>>2]|0;if((M|0)==(c[s+16>>2]|0)){N=b0[c[(c[s>>2]|0)+36>>2]&255](s)|0}else{N=c[M>>2]|0}if((N|0)==-1){c[f>>2]=0;D=2307;break}if(!(y^(s|0)==0)){break}O=b|0;c[O>>2]=L;e$(p);i=e;return}}while(0);do{if((D|0)==2307){if(y){break}O=b|0;c[O>>2]=L;e$(p);i=e;return}}while(0);c[k>>2]=c[k>>2]|2;O=b|0;c[O>>2]=L;e$(p);i=e;return}function hc(a){a=a|0;en(a|0);l_(a);return}function hd(a){a=a|0;en(a|0);return}function he(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;d=i;i=i+80|0;j=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[j>>2];j=d|0;k=d+8|0;l=d+24|0;m=d+48|0;n=d+56|0;o=d+64|0;p=d+72|0;q=j|0;a[q]=a[7144]|0;a[q+1|0]=a[7145|0]|0;a[q+2|0]=a[7146|0]|0;a[q+3|0]=a[7147|0]|0;a[q+4|0]=a[7148|0]|0;a[q+5|0]=a[7149|0]|0;r=j+1|0;s=f+4|0;t=c[s>>2]|0;if((t&2048|0)==0){u=r}else{a[r]=43;u=j+2|0}if((t&512|0)==0){v=u}else{a[u]=35;v=u+1|0}a[v]=108;u=v+1|0;v=t&74;do{if((v|0)==8){if((t&16384|0)==0){a[u]=120;break}else{a[u]=88;break}}else if((v|0)==64){a[u]=111}else{a[u]=100}}while(0);u=k|0;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);v=hh(u,c[4482]|0,q,(B=i,i=i+8|0,c[B>>2]=h,B)|0)|0;h=k+v|0;q=c[s>>2]&176;do{if((q|0)==16){s=a[u]|0;if((s<<24>>24|0)==45|(s<<24>>24|0)==43){w=k+1|0;break}if(!((v|0)>1&s<<24>>24==48)){x=2337;break}s=a[k+1|0]|0;if(!((s<<24>>24|0)==120|(s<<24>>24|0)==88)){x=2337;break}w=k+2|0}else if((q|0)==32){w=h}else{x=2337}}while(0);if((x|0)==2337){w=u}x=l|0;fA(o,f);hm(u,w,h,x,m,n,o);eL(c[o>>2]|0)|0;c[p>>2]=c[e>>2];hi(b,p,x,c[m>>2]|0,c[n>>2]|0,f,g);i=d;return}function hf(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0;d=i;i=i+136|0;k=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[k>>2];k=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[k>>2];k=d|0;l=d+16|0;m=d+120|0;n=i;i=i+4|0;i=i+7>>3<<3;o=i;i=i+40|0;p=i;i=i+4|0;i=i+7>>3<<3;q=i;i=i+160|0;r=i;i=i+4|0;i=i+7>>3<<3;s=i;i=i+4|0;i=i+7>>3<<3;l6(m|0,0,12);fA(n,g);g=n|0;n=c[g>>2]|0;if((c[4848]|0)!=-1){c[k>>2]=19392;c[k+4>>2]=16;c[k+8>>2]=0;e6(19392,k,116)}k=(c[4849]|0)-1|0;t=c[n+8>>2]|0;do{if((c[n+12>>2]|0)-t>>2>>>0>k>>>0){u=c[t+(k<<2)>>2]|0;if((u|0)==0){break}v=u;w=l|0;x=c[(c[u>>2]|0)+48>>2]|0;ca[x&15](v,15584,15610,w)|0;v=c[g>>2]|0;eL(v)|0;v=o|0;l6(v|0,0,40);c[p>>2]=v;x=q|0;c[r>>2]=x;c[s>>2]=0;u=e|0;y=f|0;z=c[u>>2]|0;L2833:while(1){do{if((z|0)==0){A=0}else{C=c[z+12>>2]|0;if((C|0)==(c[z+16>>2]|0)){D=b0[c[(c[z>>2]|0)+36>>2]&255](z)|0}else{D=c[C>>2]|0}if((D|0)!=-1){A=z;break}c[u>>2]=0;A=0}}while(0);C=(A|0)==0;E=c[y>>2]|0;do{if((E|0)==0){F=2362}else{G=c[E+12>>2]|0;if((G|0)==(c[E+16>>2]|0)){H=b0[c[(c[E>>2]|0)+36>>2]&255](E)|0}else{H=c[G>>2]|0}if((H|0)==-1){c[y>>2]=0;F=2362;break}else{if(C^(E|0)==0){break}else{break L2833}}}}while(0);if((F|0)==2362){F=0;if(C){break}}E=A+12|0;G=c[E>>2]|0;I=A+16|0;if((G|0)==(c[I>>2]|0)){J=b0[c[(c[A>>2]|0)+36>>2]&255](A)|0}else{J=c[G>>2]|0}if((g0(J,16,v,p,s,0,m,x,r,w)|0)!=0){break}G=c[E>>2]|0;if((G|0)==(c[I>>2]|0)){I=c[(c[A>>2]|0)+40>>2]|0;b0[I&255](A)|0;z=A;continue}else{c[E>>2]=G+4;z=A;continue}}a[o+39|0]=0;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);if((gY(v,c[4482]|0,1736,(B=i,i=i+8|0,c[B>>2]=j,B)|0)|0)!=1){c[h>>2]=4}z=c[u>>2]|0;do{if((z|0)==0){K=0}else{w=c[z+12>>2]|0;if((w|0)==(c[z+16>>2]|0)){L=b0[c[(c[z>>2]|0)+36>>2]&255](z)|0}else{L=c[w>>2]|0}if((L|0)!=-1){K=z;break}c[u>>2]=0;K=0}}while(0);u=(K|0)==0;z=c[y>>2]|0;do{if((z|0)==0){F=2395}else{v=c[z+12>>2]|0;if((v|0)==(c[z+16>>2]|0)){M=b0[c[(c[z>>2]|0)+36>>2]&255](z)|0}else{M=c[v>>2]|0}if((M|0)==-1){c[y>>2]=0;F=2395;break}if(!(u^(z|0)==0)){break}N=b|0;c[N>>2]=K;e$(m);i=d;return}}while(0);do{if((F|0)==2395){if(u){break}N=b|0;c[N>>2]=K;e$(m);i=d;return}}while(0);c[h>>2]=c[h>>2]|2;N=b|0;c[N>>2]=K;e$(m);i=d;return}}while(0);d=bO(4)|0;lz(d);bk(d|0,13904,160)}function hg(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;j=i;i=i+48|0;k=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[k>>2];k=j|0;l=j+16|0;m=j+24|0;n=j+32|0;if((c[f+4>>2]&1|0)==0){o=c[(c[d>>2]|0)+24>>2]|0;c[l>>2]=c[e>>2];b9[o&31](b,d,l,f,g,h&1);i=j;return}fA(m,f);f=m|0;m=c[f>>2]|0;if((c[4754]|0)!=-1){c[k>>2]=19016;c[k+4>>2]=16;c[k+8>>2]=0;e6(19016,k,116)}k=(c[4755]|0)-1|0;g=c[m+8>>2]|0;do{if((c[m+12>>2]|0)-g>>2>>>0>k>>>0){l=c[g+(k<<2)>>2]|0;if((l|0)==0){break}d=l;o=c[f>>2]|0;eL(o)|0;o=c[l>>2]|0;if(h){bZ[c[o+24>>2]&127](n,d)}else{bZ[c[o+28>>2]&127](n,d)}d=n;o=n;l=a[o]|0;if((l&1)==0){p=d+1|0;q=p;r=p;s=n+8|0}else{p=n+8|0;q=c[p>>2]|0;r=d+1|0;s=p}p=e|0;d=n+4|0;t=q;u=l;while(1){if((u&1)==0){v=r}else{v=c[s>>2]|0}l=u&255;if((t|0)==(v+((l&1|0)==0?l>>>1:c[d>>2]|0)|0)){break}l=a[t]|0;w=c[p>>2]|0;do{if((w|0)!=0){x=w+24|0;y=c[x>>2]|0;if((y|0)!=(c[w+28>>2]|0)){c[x>>2]=y+1;a[y]=l;break}if((b_[c[(c[w>>2]|0)+52>>2]&63](w,l&255)|0)!=-1){break}c[p>>2]=0}}while(0);t=t+1|0;u=a[o]|0}c[b>>2]=c[p>>2];e$(n);i=j;return}}while(0);j=bO(4)|0;lz(j);bk(j|0,13904,160)}function hh(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;f=i;i=i+16|0;g=f|0;h=g;c[h>>2]=e;c[h+4>>2]=0;h=bC(b|0)|0;b=bB(a|0,d|0,g|0)|0;if((h|0)==0){i=f;return b|0}bC(h|0)|0;i=f;return b|0}function hi(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;k=i;i=i+16|0;l=d;d=i;i=i+4|0;i=i+7>>3<<3;c[d>>2]=c[l>>2];l=k|0;m=d|0;d=c[m>>2]|0;if((d|0)==0){c[b>>2]=0;i=k;return}n=g;g=e;o=n-g|0;p=h+12|0;h=c[p>>2]|0;q=(h|0)>(o|0)?h-o|0:0;o=f;h=o-g|0;do{if((h|0)>0){if((b1[c[(c[d>>2]|0)+48>>2]&63](d,e,h)|0)==(h|0)){break}c[m>>2]=0;c[b>>2]=0;i=k;return}}while(0);do{if((q|0)>0){fa(l,q,j);if((a[l]&1)==0){r=l+1|0}else{r=c[l+8>>2]|0}if((b1[c[(c[d>>2]|0)+48>>2]&63](d,r,q)|0)==(q|0)){e$(l);break}c[m>>2]=0;c[b>>2]=0;e$(l);i=k;return}}while(0);l=n-o|0;do{if((l|0)>0){if((b1[c[(c[d>>2]|0)+48>>2]&63](d,f,l)|0)==(l|0)){break}c[m>>2]=0;c[b>>2]=0;i=k;return}}while(0);c[p>>2]=0;c[b>>2]=d;i=k;return}function hj(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;d=i;i=i+112|0;k=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[k>>2];k=d|0;l=d+8|0;m=d+32|0;n=d+80|0;o=d+88|0;p=d+96|0;q=d+104|0;c[k>>2]=37;c[k+4>>2]=0;r=k;k=r+1|0;s=f+4|0;t=c[s>>2]|0;if((t&2048|0)==0){u=k}else{a[k]=43;u=r+2|0}if((t&512|0)==0){v=u}else{a[u]=35;v=u+1|0}a[v]=108;a[v+1|0]=108;u=v+2|0;v=t&74;do{if((v|0)==8){if((t&16384|0)==0){a[u]=120;break}else{a[u]=88;break}}else if((v|0)==64){a[u]=111}else{a[u]=100}}while(0);u=l|0;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);v=hh(u,c[4482]|0,r,(B=i,i=i+16|0,c[B>>2]=h,c[B+8>>2]=j,B)|0)|0;j=l+v|0;h=c[s>>2]&176;do{if((h|0)==32){w=j}else if((h|0)==16){s=a[u]|0;if((s<<24>>24|0)==45|(s<<24>>24|0)==43){w=l+1|0;break}if(!((v|0)>1&s<<24>>24==48)){x=2486;break}s=a[l+1|0]|0;if(!((s<<24>>24|0)==120|(s<<24>>24|0)==88)){x=2486;break}w=l+2|0}else{x=2486}}while(0);if((x|0)==2486){w=u}x=m|0;fA(p,f);hm(u,w,j,x,n,o,p);eL(c[p>>2]|0)|0;c[q>>2]=c[e>>2];hi(b,q,x,c[n>>2]|0,c[o>>2]|0,f,g);i=d;return}function hk(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;d=i;i=i+80|0;j=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[j>>2];j=d|0;k=d+8|0;l=d+24|0;m=d+48|0;n=d+56|0;o=d+64|0;p=d+72|0;q=j|0;a[q]=a[7144]|0;a[q+1|0]=a[7145|0]|0;a[q+2|0]=a[7146|0]|0;a[q+3|0]=a[7147|0]|0;a[q+4|0]=a[7148|0]|0;a[q+5|0]=a[7149|0]|0;r=j+1|0;s=f+4|0;t=c[s>>2]|0;if((t&2048|0)==0){u=r}else{a[r]=43;u=j+2|0}if((t&512|0)==0){v=u}else{a[u]=35;v=u+1|0}a[v]=108;u=v+1|0;v=t&74;do{if((v|0)==8){if((t&16384|0)==0){a[u]=120;break}else{a[u]=88;break}}else if((v|0)==64){a[u]=111}else{a[u]=117}}while(0);u=k|0;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);v=hh(u,c[4482]|0,q,(B=i,i=i+8|0,c[B>>2]=h,B)|0)|0;h=k+v|0;q=c[s>>2]&176;do{if((q|0)==32){w=h}else if((q|0)==16){s=a[u]|0;if((s<<24>>24|0)==45|(s<<24>>24|0)==43){w=k+1|0;break}if(!((v|0)>1&s<<24>>24==48)){x=2511;break}s=a[k+1|0]|0;if(!((s<<24>>24|0)==120|(s<<24>>24|0)==88)){x=2511;break}w=k+2|0}else{x=2511}}while(0);if((x|0)==2511){w=u}x=l|0;fA(o,f);hm(u,w,h,x,m,n,o);eL(c[o>>2]|0)|0;c[p>>2]=c[e>>2];hi(b,p,x,c[m>>2]|0,c[n>>2]|0,f,g);i=d;return}function hl(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;d=i;i=i+112|0;k=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[k>>2];k=d|0;l=d+8|0;m=d+32|0;n=d+80|0;o=d+88|0;p=d+96|0;q=d+104|0;c[k>>2]=37;c[k+4>>2]=0;r=k;k=r+1|0;s=f+4|0;t=c[s>>2]|0;if((t&2048|0)==0){u=k}else{a[k]=43;u=r+2|0}if((t&512|0)==0){v=u}else{a[u]=35;v=u+1|0}a[v]=108;a[v+1|0]=108;u=v+2|0;v=t&74;do{if((v|0)==8){if((t&16384|0)==0){a[u]=120;break}else{a[u]=88;break}}else if((v|0)==64){a[u]=111}else{a[u]=117}}while(0);u=l|0;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);v=hh(u,c[4482]|0,r,(B=i,i=i+16|0,c[B>>2]=h,c[B+8>>2]=j,B)|0)|0;j=l+v|0;h=c[s>>2]&176;do{if((h|0)==32){w=j}else if((h|0)==16){s=a[u]|0;if((s<<24>>24|0)==45|(s<<24>>24|0)==43){w=l+1|0;break}if(!((v|0)>1&s<<24>>24==48)){x=2536;break}s=a[l+1|0]|0;if(!((s<<24>>24|0)==120|(s<<24>>24|0)==88)){x=2536;break}w=l+2|0}else{x=2536}}while(0);if((x|0)==2536){w=u}x=m|0;fA(p,f);hm(u,w,j,x,n,o,p);eL(c[p>>2]|0)|0;c[q>>2]=c[e>>2];hi(b,q,x,c[n>>2]|0,c[o>>2]|0,f,g);i=d;return}function hm(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0;l=i;i=i+48|0;m=l|0;n=l+16|0;o=l+32|0;p=k|0;k=c[p>>2]|0;if((c[4850]|0)!=-1){c[n>>2]=19400;c[n+4>>2]=16;c[n+8>>2]=0;e6(19400,n,116)}n=(c[4851]|0)-1|0;q=c[k+8>>2]|0;if((c[k+12>>2]|0)-q>>2>>>0<=n>>>0){r=bO(4)|0;s=r;lz(s);bk(r|0,13904,160)}k=c[q+(n<<2)>>2]|0;if((k|0)==0){r=bO(4)|0;s=r;lz(s);bk(r|0,13904,160)}r=k;s=c[p>>2]|0;if((c[4754]|0)!=-1){c[m>>2]=19016;c[m+4>>2]=16;c[m+8>>2]=0;e6(19016,m,116)}m=(c[4755]|0)-1|0;p=c[s+8>>2]|0;if((c[s+12>>2]|0)-p>>2>>>0<=m>>>0){t=bO(4)|0;u=t;lz(u);bk(t|0,13904,160)}s=c[p+(m<<2)>>2]|0;if((s|0)==0){t=bO(4)|0;u=t;lz(u);bk(t|0,13904,160)}t=s;bZ[c[(c[s>>2]|0)+20>>2]&127](o,t);u=o;m=o;p=d[m]|0;if((p&1|0)==0){v=p>>>1}else{v=c[o+4>>2]|0}do{if((v|0)==0){p=c[(c[k>>2]|0)+32>>2]|0;ca[p&15](r,b,f,g)|0;c[j>>2]=g+(f-b)}else{c[j>>2]=g;p=a[b]|0;if((p<<24>>24|0)==45|(p<<24>>24|0)==43){n=b_[c[(c[k>>2]|0)+28>>2]&63](r,p)|0;p=c[j>>2]|0;c[j>>2]=p+1;a[p]=n;w=b+1|0}else{w=b}do{if((f-w|0)>1){if((a[w]|0)!=48){x=w;break}n=w+1|0;p=a[n]|0;if(!((p<<24>>24|0)==120|(p<<24>>24|0)==88)){x=w;break}p=k;q=b_[c[(c[p>>2]|0)+28>>2]&63](r,48)|0;y=c[j>>2]|0;c[j>>2]=y+1;a[y]=q;q=b_[c[(c[p>>2]|0)+28>>2]&63](r,a[n]|0)|0;n=c[j>>2]|0;c[j>>2]=n+1;a[n]=q;x=w+2|0}else{x=w}}while(0);do{if((x|0)!=(f|0)){q=f-1|0;if(x>>>0<q>>>0){z=x;A=q}else{break}do{q=a[z]|0;a[z]=a[A]|0;a[A]=q;z=z+1|0;A=A-1|0;}while(z>>>0<A>>>0)}}while(0);q=b0[c[(c[s>>2]|0)+16>>2]&255](t)|0;if(x>>>0<f>>>0){n=u+1|0;p=k;y=o+4|0;B=o+8|0;C=0;D=0;E=x;while(1){F=(a[m]&1)==0;do{if((a[(F?n:c[B>>2]|0)+D|0]|0)==0){G=D;H=C}else{if((C|0)!=(a[(F?n:c[B>>2]|0)+D|0]|0)){G=D;H=C;break}I=c[j>>2]|0;c[j>>2]=I+1;a[I]=q;I=d[m]|0;G=(D>>>0<(((I&1|0)==0?I>>>1:c[y>>2]|0)-1|0)>>>0)+D|0;H=0}}while(0);F=b_[c[(c[p>>2]|0)+28>>2]&63](r,a[E]|0)|0;I=c[j>>2]|0;c[j>>2]=I+1;a[I]=F;F=E+1|0;if(F>>>0<f>>>0){C=H+1|0;D=G;E=F}else{break}}}E=g+(x-b)|0;D=c[j>>2]|0;if((E|0)==(D|0)){break}C=D-1|0;if(E>>>0<C>>>0){J=E;K=C}else{break}do{C=a[J]|0;a[J]=a[K]|0;a[K]=C;J=J+1|0;K=K-1|0;}while(J>>>0<K>>>0)}}while(0);if((e|0)==(f|0)){L=c[j>>2]|0;c[h>>2]=L;e$(o);i=l;return}else{L=g+(e-b)|0;c[h>>2]=L;e$(o);i=l;return}}function hn(b,d,e,f,g,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=+j;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0;d=i;i=i+152|0;k=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[k>>2];k=d|0;l=d+8|0;m=d+40|0;n=d+48|0;o=d+112|0;p=d+120|0;q=d+128|0;r=d+136|0;s=d+144|0;c[k>>2]=37;c[k+4>>2]=0;t=k;k=t+1|0;u=f+4|0;v=c[u>>2]|0;if((v&2048|0)==0){w=k}else{a[k]=43;w=t+2|0}if((v&1024|0)==0){x=w}else{a[w]=35;x=w+1|0}w=v&260;k=v>>>14;do{if((w|0)==260){if((k&1|0)==0){a[x]=97;y=0;break}else{a[x]=65;y=0;break}}else{a[x]=46;v=x+2|0;a[x+1|0]=42;if((w|0)==256){if((k&1|0)==0){a[v]=101;y=1;break}else{a[v]=69;y=1;break}}else if((w|0)==4){if((k&1|0)==0){a[v]=102;y=1;break}else{a[v]=70;y=1;break}}else{if((k&1|0)==0){a[v]=103;y=1;break}else{a[v]=71;y=1;break}}}}while(0);k=l|0;c[m>>2]=k;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);l=c[4482]|0;if(y){z=ho(k,30,l,t,(B=i,i=i+16|0,c[B>>2]=c[f+8>>2],h[B+8>>3]=j,B)|0)|0}else{z=ho(k,30,l,t,(B=i,i=i+8|0,h[B>>3]=j,B)|0)|0}do{if((z|0)>29){l=(a[19960]|0)==0;if(y){do{if(l){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);A=hp(m,c[4482]|0,t,(B=i,i=i+16|0,c[B>>2]=c[f+8>>2],h[B+8>>3]=j,B)|0)|0}else{do{if(l){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);A=hp(m,c[4482]|0,t,(B=i,i=i+16|0,c[B>>2]=c[f+8>>2],h[B+8>>3]=j,B)|0)|0}l=c[m>>2]|0;if((l|0)!=0){C=A;D=l;E=l;break}l4();l=c[m>>2]|0;C=A;D=l;E=l}else{C=z;D=0;E=c[m>>2]|0}}while(0);z=E+C|0;A=c[u>>2]&176;do{if((A|0)==16){u=a[E]|0;if((u<<24>>24|0)==45|(u<<24>>24|0)==43){F=E+1|0;break}if(!((C|0)>1&u<<24>>24==48)){G=2644;break}u=a[E+1|0]|0;if(!((u<<24>>24|0)==120|(u<<24>>24|0)==88)){G=2644;break}F=E+2|0}else if((A|0)==32){F=z}else{G=2644}}while(0);if((G|0)==2644){F=E}do{if((E|0)==(k|0)){H=n|0;I=0;J=k}else{G=lR(C<<1)|0;if((G|0)!=0){H=G;I=G;J=E;break}l4();H=0;I=0;J=c[m>>2]|0}}while(0);fA(q,f);hr(J,F,z,H,o,p,q);eL(c[q>>2]|0)|0;q=e|0;c[s>>2]=c[q>>2];hi(r,s,H,c[o>>2]|0,c[p>>2]|0,f,g);g=c[r>>2]|0;c[q>>2]=g;c[b>>2]=g;if((I|0)!=0){lS(I)}if((D|0)==0){i=d;return}lS(D);i=d;return}function ho(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0;g=i;i=i+16|0;h=g|0;j=h;c[j>>2]=f;c[j+4>>2]=0;j=bC(d|0)|0;d=bD(a|0,b|0,e|0,h|0)|0;if((j|0)==0){i=g;return d|0}bC(j|0)|0;i=g;return d|0}function hp(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;f=i;i=i+16|0;g=f|0;h=g;c[h>>2]=e;c[h+4>>2]=0;h=bC(b|0)|0;b=bQ(a|0,d|0,g|0)|0;if((h|0)==0){i=f;return b|0}bC(h|0)|0;i=f;return b|0}function hq(b,d,e,f,g,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=+j;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0;d=i;i=i+152|0;k=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[k>>2];k=d|0;l=d+8|0;m=d+40|0;n=d+48|0;o=d+112|0;p=d+120|0;q=d+128|0;r=d+136|0;s=d+144|0;c[k>>2]=37;c[k+4>>2]=0;t=k;k=t+1|0;u=f+4|0;v=c[u>>2]|0;if((v&2048|0)==0){w=k}else{a[k]=43;w=t+2|0}if((v&1024|0)==0){x=w}else{a[w]=35;x=w+1|0}w=v&260;k=v>>>14;do{if((w|0)==260){a[x]=76;v=x+1|0;if((k&1|0)==0){a[v]=97;y=0;break}else{a[v]=65;y=0;break}}else{a[x]=46;a[x+1|0]=42;a[x+2|0]=76;v=x+3|0;if((w|0)==4){if((k&1|0)==0){a[v]=102;y=1;break}else{a[v]=70;y=1;break}}else if((w|0)==256){if((k&1|0)==0){a[v]=101;y=1;break}else{a[v]=69;y=1;break}}else{if((k&1|0)==0){a[v]=103;y=1;break}else{a[v]=71;y=1;break}}}}while(0);k=l|0;c[m>>2]=k;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);l=c[4482]|0;if(y){z=ho(k,30,l,t,(B=i,i=i+16|0,c[B>>2]=c[f+8>>2],h[B+8>>3]=j,B)|0)|0}else{z=ho(k,30,l,t,(B=i,i=i+8|0,h[B>>3]=j,B)|0)|0}do{if((z|0)>29){l=(a[19960]|0)==0;if(y){do{if(l){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);A=hp(m,c[4482]|0,t,(B=i,i=i+16|0,c[B>>2]=c[f+8>>2],h[B+8>>3]=j,B)|0)|0}else{do{if(l){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);A=hp(m,c[4482]|0,t,(B=i,i=i+8|0,h[B>>3]=j,B)|0)|0}l=c[m>>2]|0;if((l|0)!=0){C=A;D=l;E=l;break}l4();l=c[m>>2]|0;C=A;D=l;E=l}else{C=z;D=0;E=c[m>>2]|0}}while(0);z=E+C|0;A=c[u>>2]&176;do{if((A|0)==16){u=a[E]|0;if((u<<24>>24|0)==45|(u<<24>>24|0)==43){F=E+1|0;break}if(!((C|0)>1&u<<24>>24==48)){G=2735;break}u=a[E+1|0]|0;if(!((u<<24>>24|0)==120|(u<<24>>24|0)==88)){G=2735;break}F=E+2|0}else if((A|0)==32){F=z}else{G=2735}}while(0);if((G|0)==2735){F=E}do{if((E|0)==(k|0)){H=n|0;I=0;J=k}else{G=lR(C<<1)|0;if((G|0)!=0){H=G;I=G;J=E;break}l4();H=0;I=0;J=c[m>>2]|0}}while(0);fA(q,f);hr(J,F,z,H,o,p,q);eL(c[q>>2]|0)|0;q=e|0;c[s>>2]=c[q>>2];hi(r,s,H,c[o>>2]|0,c[p>>2]|0,f,g);g=c[r>>2]|0;c[q>>2]=g;c[b>>2]=g;if((I|0)!=0){lS(I)}if((D|0)==0){i=d;return}lS(D);i=d;return}function hr(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0;l=i;i=i+48|0;m=l|0;n=l+16|0;o=l+32|0;p=k|0;k=c[p>>2]|0;if((c[4850]|0)!=-1){c[n>>2]=19400;c[n+4>>2]=16;c[n+8>>2]=0;e6(19400,n,116)}n=(c[4851]|0)-1|0;q=c[k+8>>2]|0;if((c[k+12>>2]|0)-q>>2>>>0<=n>>>0){r=bO(4)|0;s=r;lz(s);bk(r|0,13904,160)}k=c[q+(n<<2)>>2]|0;if((k|0)==0){r=bO(4)|0;s=r;lz(s);bk(r|0,13904,160)}r=k;s=c[p>>2]|0;if((c[4754]|0)!=-1){c[m>>2]=19016;c[m+4>>2]=16;c[m+8>>2]=0;e6(19016,m,116)}m=(c[4755]|0)-1|0;p=c[s+8>>2]|0;if((c[s+12>>2]|0)-p>>2>>>0<=m>>>0){t=bO(4)|0;u=t;lz(u);bk(t|0,13904,160)}s=c[p+(m<<2)>>2]|0;if((s|0)==0){t=bO(4)|0;u=t;lz(u);bk(t|0,13904,160)}t=s;bZ[c[(c[s>>2]|0)+20>>2]&127](o,t);c[j>>2]=g;u=a[b]|0;if((u<<24>>24|0)==45|(u<<24>>24|0)==43){m=b_[c[(c[k>>2]|0)+28>>2]&63](r,u)|0;u=c[j>>2]|0;c[j>>2]=u+1;a[u]=m;v=b+1|0}else{v=b}m=f;L3320:do{if((m-v|0)>1){if((a[v]|0)!=48){w=2777;break}u=v+1|0;p=a[u]|0;if(!((p<<24>>24|0)==120|(p<<24>>24|0)==88)){w=2777;break}p=k;n=b_[c[(c[p>>2]|0)+28>>2]&63](r,48)|0;q=c[j>>2]|0;c[j>>2]=q+1;a[q]=n;n=v+2|0;q=b_[c[(c[p>>2]|0)+28>>2]&63](r,a[u]|0)|0;u=c[j>>2]|0;c[j>>2]=u+1;a[u]=q;if(n>>>0<f>>>0){x=n}else{y=n;z=n;break}while(1){q=a[x]|0;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);u=x+1|0;if((a2(q<<24>>24|0,c[4482]|0)|0)==0){y=x;z=n;break L3320}if(u>>>0<f>>>0){x=u}else{y=u;z=n;break}}}else{w=2777}}while(0);L3335:do{if((w|0)==2777){if(v>>>0<f>>>0){A=v}else{y=v;z=v;break}while(1){x=a[A]|0;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);q=A+1|0;if((bI(x<<24>>24|0,c[4482]|0)|0)==0){y=A;z=v;break L3335}if(q>>>0<f>>>0){A=q}else{y=q;z=v;break}}}}while(0);v=o;A=o;w=d[A]|0;if((w&1|0)==0){B=w>>>1}else{B=c[o+4>>2]|0}do{if((B|0)==0){w=c[j>>2]|0;q=c[(c[k>>2]|0)+32>>2]|0;ca[q&15](r,z,y,w)|0;c[j>>2]=(c[j>>2]|0)+(y-z)}else{do{if((z|0)!=(y|0)){w=y-1|0;if(z>>>0<w>>>0){C=z;D=w}else{break}do{w=a[C]|0;a[C]=a[D]|0;a[D]=w;C=C+1|0;D=D-1|0;}while(C>>>0<D>>>0)}}while(0);x=b0[c[(c[s>>2]|0)+16>>2]&255](t)|0;if(z>>>0<y>>>0){w=v+1|0;q=o+4|0;n=o+8|0;u=k;p=0;E=0;F=z;while(1){G=(a[A]&1)==0;do{if((a[(G?w:c[n>>2]|0)+E|0]|0)>0){if((p|0)!=(a[(G?w:c[n>>2]|0)+E|0]|0)){H=E;I=p;break}J=c[j>>2]|0;c[j>>2]=J+1;a[J]=x;J=d[A]|0;H=(E>>>0<(((J&1|0)==0?J>>>1:c[q>>2]|0)-1|0)>>>0)+E|0;I=0}else{H=E;I=p}}while(0);G=b_[c[(c[u>>2]|0)+28>>2]&63](r,a[F]|0)|0;J=c[j>>2]|0;c[j>>2]=J+1;a[J]=G;G=F+1|0;if(G>>>0<y>>>0){p=I+1|0;E=H;F=G}else{break}}}F=g+(z-b)|0;E=c[j>>2]|0;if((F|0)==(E|0)){break}p=E-1|0;if(F>>>0<p>>>0){K=F;L=p}else{break}do{p=a[K]|0;a[K]=a[L]|0;a[L]=p;K=K+1|0;L=L-1|0;}while(K>>>0<L>>>0)}}while(0);L3375:do{if(y>>>0<f>>>0){L=k;K=y;while(1){z=a[K]|0;if(z<<24>>24==46){break}H=b_[c[(c[L>>2]|0)+28>>2]&63](r,z)|0;z=c[j>>2]|0;c[j>>2]=z+1;a[z]=H;H=K+1|0;if(H>>>0<f>>>0){K=H}else{M=H;break L3375}}L=b0[c[(c[s>>2]|0)+12>>2]&255](t)|0;H=c[j>>2]|0;c[j>>2]=H+1;a[H]=L;M=K+1|0}else{M=y}}while(0);ca[c[(c[k>>2]|0)+32>>2]&15](r,M,f,c[j>>2]|0)|0;r=(c[j>>2]|0)+(m-M)|0;c[j>>2]=r;if((e|0)==(f|0)){N=r;c[h>>2]=N;e$(o);i=l;return}N=g+(e-b)|0;c[h>>2]=N;e$(o);i=l;return}function hs(a){a=a|0;en(a|0);l_(a);return}function ht(a){a=a|0;en(a|0);return}function hu(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;d=i;i=i+144|0;j=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[j>>2];j=d|0;k=d+8|0;l=d+24|0;m=d+112|0;n=d+120|0;o=d+128|0;p=d+136|0;q=j|0;a[q]=a[7144]|0;a[q+1|0]=a[7145|0]|0;a[q+2|0]=a[7146|0]|0;a[q+3|0]=a[7147|0]|0;a[q+4|0]=a[7148|0]|0;a[q+5|0]=a[7149|0]|0;r=j+1|0;s=f+4|0;t=c[s>>2]|0;if((t&2048|0)==0){u=r}else{a[r]=43;u=j+2|0}if((t&512|0)==0){v=u}else{a[u]=35;v=u+1|0}a[v]=108;u=v+1|0;v=t&74;do{if((v|0)==64){a[u]=111}else if((v|0)==8){if((t&16384|0)==0){a[u]=120;break}else{a[u]=88;break}}else{a[u]=100}}while(0);u=k|0;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);t=hh(u,c[4482]|0,q,(B=i,i=i+8|0,c[B>>2]=h,B)|0)|0;h=k+t|0;q=c[s>>2]&176;do{if((q|0)==16){s=a[u]|0;if((s<<24>>24|0)==45|(s<<24>>24|0)==43){w=k+1|0;break}if(!((t|0)>1&s<<24>>24==48)){x=2859;break}s=a[k+1|0]|0;if(!((s<<24>>24|0)==120|(s<<24>>24|0)==88)){x=2859;break}w=k+2|0}else if((q|0)==32){w=h}else{x=2859}}while(0);if((x|0)==2859){w=u}x=l|0;fA(o,f);hx(u,w,h,x,m,n,o);eL(c[o>>2]|0)|0;c[p>>2]=c[e>>2];hy(b,p,x,c[m>>2]|0,c[n>>2]|0,f,g);i=d;return}function hv(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;d=i;i=i+104|0;j=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[j>>2];j=d|0;k=d+24|0;l=d+48|0;m=d+88|0;n=d+96|0;o=d+16|0;a[o]=a[7152]|0;a[o+1|0]=a[7153|0]|0;a[o+2|0]=a[7154|0]|0;a[o+3|0]=a[7155|0]|0;a[o+4|0]=a[7156|0]|0;a[o+5|0]=a[7157|0]|0;p=k|0;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);q=hh(p,c[4482]|0,o,(B=i,i=i+8|0,c[B>>2]=h,B)|0)|0;h=k+q|0;o=c[f+4>>2]&176;do{if((o|0)==16){r=a[p]|0;if((r<<24>>24|0)==45|(r<<24>>24|0)==43){s=k+1|0;break}if(!((q|0)>1&r<<24>>24==48)){t=2874;break}r=a[k+1|0]|0;if(!((r<<24>>24|0)==120|(r<<24>>24|0)==88)){t=2874;break}s=k+2|0}else if((o|0)==32){s=h}else{t=2874}}while(0);if((t|0)==2874){s=p}fA(m,f);t=m|0;m=c[t>>2]|0;if((c[4850]|0)!=-1){c[j>>2]=19400;c[j+4>>2]=16;c[j+8>>2]=0;e6(19400,j,116)}j=(c[4851]|0)-1|0;o=c[m+8>>2]|0;do{if((c[m+12>>2]|0)-o>>2>>>0>j>>>0){r=c[o+(j<<2)>>2]|0;if((r|0)==0){break}u=r;v=c[t>>2]|0;eL(v)|0;v=l|0;w=c[(c[r>>2]|0)+32>>2]|0;ca[w&15](u,p,h,v)|0;u=l+q|0;if((s|0)==(h|0)){x=u;y=e|0;z=c[y>>2]|0;A=n|0;c[A>>2]=z;hi(b,n,v,x,u,f,g);i=d;return}x=l+(s-k)|0;y=e|0;z=c[y>>2]|0;A=n|0;c[A>>2]=z;hi(b,n,v,x,u,f,g);i=d;return}}while(0);d=bO(4)|0;lz(d);bk(d|0,13904,160)}function hw(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;j=i;i=i+48|0;k=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[k>>2];k=j|0;l=j+16|0;m=j+24|0;n=j+32|0;if((c[f+4>>2]&1|0)==0){o=c[(c[d>>2]|0)+24>>2]|0;c[l>>2]=c[e>>2];b9[o&31](b,d,l,f,g,h&1);i=j;return}fA(m,f);f=m|0;m=c[f>>2]|0;if((c[4752]|0)!=-1){c[k>>2]=19008;c[k+4>>2]=16;c[k+8>>2]=0;e6(19008,k,116)}k=(c[4753]|0)-1|0;g=c[m+8>>2]|0;do{if((c[m+12>>2]|0)-g>>2>>>0>k>>>0){l=c[g+(k<<2)>>2]|0;if((l|0)==0){break}d=l;o=c[f>>2]|0;eL(o)|0;o=c[l>>2]|0;if(h){bZ[c[o+24>>2]&127](n,d)}else{bZ[c[o+28>>2]&127](n,d)}d=n;o=a[d]|0;if((o&1)==0){l=n+4|0;p=l;q=l;r=n+8|0}else{l=n+8|0;p=c[l>>2]|0;q=n+4|0;r=l}l=e|0;s=p;t=o;while(1){if((t&1)==0){u=q}else{u=c[r>>2]|0}o=t&255;if((o&1|0)==0){v=o>>>1}else{v=c[q>>2]|0}if((s|0)==(u+(v<<2)|0)){break}o=c[s>>2]|0;w=c[l>>2]|0;do{if((w|0)!=0){x=w+24|0;y=c[x>>2]|0;if((y|0)==(c[w+28>>2]|0)){z=b_[c[(c[w>>2]|0)+52>>2]&63](w,o)|0}else{c[x>>2]=y+4;c[y>>2]=o;z=o}if((z|0)!=-1){break}c[l>>2]=0}}while(0);s=s+4|0;t=a[d]|0}c[b>>2]=c[l>>2];e4(n);i=j;return}}while(0);j=bO(4)|0;lz(j);bk(j|0,13904,160)}function hx(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0;l=i;i=i+48|0;m=l|0;n=l+16|0;o=l+32|0;p=k|0;k=c[p>>2]|0;if((c[4848]|0)!=-1){c[n>>2]=19392;c[n+4>>2]=16;c[n+8>>2]=0;e6(19392,n,116)}n=(c[4849]|0)-1|0;q=c[k+8>>2]|0;if((c[k+12>>2]|0)-q>>2>>>0<=n>>>0){r=bO(4)|0;s=r;lz(s);bk(r|0,13904,160)}k=c[q+(n<<2)>>2]|0;if((k|0)==0){r=bO(4)|0;s=r;lz(s);bk(r|0,13904,160)}r=k;s=c[p>>2]|0;if((c[4752]|0)!=-1){c[m>>2]=19008;c[m+4>>2]=16;c[m+8>>2]=0;e6(19008,m,116)}m=(c[4753]|0)-1|0;p=c[s+8>>2]|0;if((c[s+12>>2]|0)-p>>2>>>0<=m>>>0){t=bO(4)|0;u=t;lz(u);bk(t|0,13904,160)}s=c[p+(m<<2)>>2]|0;if((s|0)==0){t=bO(4)|0;u=t;lz(u);bk(t|0,13904,160)}t=s;bZ[c[(c[s>>2]|0)+20>>2]&127](o,t);u=o;m=o;p=d[m]|0;if((p&1|0)==0){v=p>>>1}else{v=c[o+4>>2]|0}do{if((v|0)==0){p=c[(c[k>>2]|0)+48>>2]|0;ca[p&15](r,b,f,g)|0;c[j>>2]=g+(f-b<<2)}else{c[j>>2]=g;p=a[b]|0;if((p<<24>>24|0)==45|(p<<24>>24|0)==43){n=b_[c[(c[k>>2]|0)+44>>2]&63](r,p)|0;p=c[j>>2]|0;c[j>>2]=p+4;c[p>>2]=n;w=b+1|0}else{w=b}do{if((f-w|0)>1){if((a[w]|0)!=48){x=w;break}n=w+1|0;p=a[n]|0;if(!((p<<24>>24|0)==120|(p<<24>>24|0)==88)){x=w;break}p=k;q=b_[c[(c[p>>2]|0)+44>>2]&63](r,48)|0;y=c[j>>2]|0;c[j>>2]=y+4;c[y>>2]=q;q=b_[c[(c[p>>2]|0)+44>>2]&63](r,a[n]|0)|0;n=c[j>>2]|0;c[j>>2]=n+4;c[n>>2]=q;x=w+2|0}else{x=w}}while(0);do{if((x|0)!=(f|0)){q=f-1|0;if(x>>>0<q>>>0){z=x;A=q}else{break}do{q=a[z]|0;a[z]=a[A]|0;a[A]=q;z=z+1|0;A=A-1|0;}while(z>>>0<A>>>0)}}while(0);q=b0[c[(c[s>>2]|0)+16>>2]&255](t)|0;if(x>>>0<f>>>0){n=u+1|0;p=k;y=o+4|0;B=o+8|0;C=0;D=0;E=x;while(1){F=(a[m]&1)==0;do{if((a[(F?n:c[B>>2]|0)+D|0]|0)==0){G=D;H=C}else{if((C|0)!=(a[(F?n:c[B>>2]|0)+D|0]|0)){G=D;H=C;break}I=c[j>>2]|0;c[j>>2]=I+4;c[I>>2]=q;I=d[m]|0;G=(D>>>0<(((I&1|0)==0?I>>>1:c[y>>2]|0)-1|0)>>>0)+D|0;H=0}}while(0);F=b_[c[(c[p>>2]|0)+44>>2]&63](r,a[E]|0)|0;I=c[j>>2]|0;c[j>>2]=I+4;c[I>>2]=F;F=E+1|0;if(F>>>0<f>>>0){C=H+1|0;D=G;E=F}else{break}}}E=g+(x-b<<2)|0;D=c[j>>2]|0;if((E|0)==(D|0)){break}C=D-4|0;if(E>>>0<C>>>0){J=E;K=C}else{break}do{C=c[J>>2]|0;c[J>>2]=c[K>>2];c[K>>2]=C;J=J+4|0;K=K-4|0;}while(J>>>0<K>>>0)}}while(0);if((e|0)==(f|0)){L=c[j>>2]|0;c[h>>2]=L;e$(o);i=l;return}else{L=g+(e-b<<2)|0;c[h>>2]=L;e$(o);i=l;return}}function hy(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;k=i;i=i+16|0;l=d;d=i;i=i+4|0;i=i+7>>3<<3;c[d>>2]=c[l>>2];l=k|0;m=d|0;d=c[m>>2]|0;if((d|0)==0){c[b>>2]=0;i=k;return}n=g;g=e;o=n-g>>2;p=h+12|0;h=c[p>>2]|0;q=(h|0)>(o|0)?h-o|0:0;o=f;h=o-g|0;g=h>>2;do{if((h|0)>0){if((b1[c[(c[d>>2]|0)+48>>2]&63](d,e,g)|0)==(g|0)){break}c[m>>2]=0;c[b>>2]=0;i=k;return}}while(0);do{if((q|0)>0){ff(l,q,j);if((a[l]&1)==0){r=l+4|0}else{r=c[l+8>>2]|0}if((b1[c[(c[d>>2]|0)+48>>2]&63](d,r,q)|0)==(q|0)){e4(l);break}c[m>>2]=0;c[b>>2]=0;e4(l);i=k;return}}while(0);l=n-o|0;o=l>>2;do{if((l|0)>0){if((b1[c[(c[d>>2]|0)+48>>2]&63](d,f,o)|0)==(o|0)){break}c[m>>2]=0;c[b>>2]=0;i=k;return}}while(0);c[p>>2]=0;c[b>>2]=d;i=k;return}function hz(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;d=i;i=i+232|0;k=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[k>>2];k=d|0;l=d+8|0;m=d+32|0;n=d+200|0;o=d+208|0;p=d+216|0;q=d+224|0;c[k>>2]=37;c[k+4>>2]=0;r=k;k=r+1|0;s=f+4|0;t=c[s>>2]|0;if((t&2048|0)==0){u=k}else{a[k]=43;u=r+2|0}if((t&512|0)==0){v=u}else{a[u]=35;v=u+1|0}a[v]=108;a[v+1|0]=108;u=v+2|0;v=t&74;do{if((v|0)==64){a[u]=111}else if((v|0)==8){if((t&16384|0)==0){a[u]=120;break}else{a[u]=88;break}}else{a[u]=100}}while(0);u=l|0;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);t=hh(u,c[4482]|0,r,(B=i,i=i+16|0,c[B>>2]=h,c[B+8>>2]=j,B)|0)|0;j=l+t|0;h=c[s>>2]&176;do{if((h|0)==32){w=j}else if((h|0)==16){s=a[u]|0;if((s<<24>>24|0)==45|(s<<24>>24|0)==43){w=l+1|0;break}if(!((t|0)>1&s<<24>>24==48)){x=3019;break}s=a[l+1|0]|0;if(!((s<<24>>24|0)==120|(s<<24>>24|0)==88)){x=3019;break}w=l+2|0}else{x=3019}}while(0);if((x|0)==3019){w=u}x=m|0;fA(p,f);hx(u,w,j,x,n,o,p);eL(c[p>>2]|0)|0;c[q>>2]=c[e>>2];hy(b,q,x,c[n>>2]|0,c[o>>2]|0,f,g);i=d;return}function hA(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;d=i;i=i+144|0;j=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[j>>2];j=d|0;k=d+8|0;l=d+24|0;m=d+112|0;n=d+120|0;o=d+128|0;p=d+136|0;q=j|0;a[q]=a[7144]|0;a[q+1|0]=a[7145|0]|0;a[q+2|0]=a[7146|0]|0;a[q+3|0]=a[7147|0]|0;a[q+4|0]=a[7148|0]|0;a[q+5|0]=a[7149|0]|0;r=j+1|0;s=f+4|0;t=c[s>>2]|0;if((t&2048|0)==0){u=r}else{a[r]=43;u=j+2|0}if((t&512|0)==0){v=u}else{a[u]=35;v=u+1|0}a[v]=108;u=v+1|0;v=t&74;do{if((v|0)==64){a[u]=111}else if((v|0)==8){if((t&16384|0)==0){a[u]=120;break}else{a[u]=88;break}}else{a[u]=117}}while(0);u=k|0;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);t=hh(u,c[4482]|0,q,(B=i,i=i+8|0,c[B>>2]=h,B)|0)|0;h=k+t|0;q=c[s>>2]&176;do{if((q|0)==32){w=h}else if((q|0)==16){s=a[u]|0;if((s<<24>>24|0)==45|(s<<24>>24|0)==43){w=k+1|0;break}if(!((t|0)>1&s<<24>>24==48)){x=3044;break}s=a[k+1|0]|0;if(!((s<<24>>24|0)==120|(s<<24>>24|0)==88)){x=3044;break}w=k+2|0}else{x=3044}}while(0);if((x|0)==3044){w=u}x=l|0;fA(o,f);hx(u,w,h,x,m,n,o);eL(c[o>>2]|0)|0;c[p>>2]=c[e>>2];hy(b,p,x,c[m>>2]|0,c[n>>2]|0,f,g);i=d;return}function hB(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;d=i;i=i+240|0;k=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[k>>2];k=d|0;l=d+8|0;m=d+32|0;n=d+208|0;o=d+216|0;p=d+224|0;q=d+232|0;c[k>>2]=37;c[k+4>>2]=0;r=k;k=r+1|0;s=f+4|0;t=c[s>>2]|0;if((t&2048|0)==0){u=k}else{a[k]=43;u=r+2|0}if((t&512|0)==0){v=u}else{a[u]=35;v=u+1|0}a[v]=108;a[v+1|0]=108;u=v+2|0;v=t&74;do{if((v|0)==8){if((t&16384|0)==0){a[u]=120;break}else{a[u]=88;break}}else if((v|0)==64){a[u]=111}else{a[u]=117}}while(0);u=l|0;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);v=hh(u,c[4482]|0,r,(B=i,i=i+16|0,c[B>>2]=h,c[B+8>>2]=j,B)|0)|0;j=l+v|0;h=c[s>>2]&176;do{if((h|0)==32){w=j}else if((h|0)==16){s=a[u]|0;if((s<<24>>24|0)==45|(s<<24>>24|0)==43){w=l+1|0;break}if(!((v|0)>1&s<<24>>24==48)){x=3069;break}s=a[l+1|0]|0;if(!((s<<24>>24|0)==120|(s<<24>>24|0)==88)){x=3069;break}w=l+2|0}else{x=3069}}while(0);if((x|0)==3069){w=u}x=m|0;fA(p,f);hx(u,w,j,x,n,o,p);eL(c[p>>2]|0)|0;c[q>>2]=c[e>>2];hy(b,q,x,c[n>>2]|0,c[o>>2]|0,f,g);i=d;return}function hC(b,d,e,f,g,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=+j;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0;d=i;i=i+320|0;k=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[k>>2];k=d|0;l=d+8|0;m=d+40|0;n=d+48|0;o=d+280|0;p=d+288|0;q=d+296|0;r=d+304|0;s=d+312|0;c[k>>2]=37;c[k+4>>2]=0;t=k;k=t+1|0;u=f+4|0;v=c[u>>2]|0;if((v&2048|0)==0){w=k}else{a[k]=43;w=t+2|0}if((v&1024|0)==0){x=w}else{a[w]=35;x=w+1|0}w=v&260;k=v>>>14;do{if((w|0)==260){if((k&1|0)==0){a[x]=97;y=0;break}else{a[x]=65;y=0;break}}else{a[x]=46;v=x+2|0;a[x+1|0]=42;if((w|0)==256){if((k&1|0)==0){a[v]=101;y=1;break}else{a[v]=69;y=1;break}}else if((w|0)==4){if((k&1|0)==0){a[v]=102;y=1;break}else{a[v]=70;y=1;break}}else{if((k&1|0)==0){a[v]=103;y=1;break}else{a[v]=71;y=1;break}}}}while(0);k=l|0;c[m>>2]=k;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);l=c[4482]|0;if(y){z=ho(k,30,l,t,(B=i,i=i+16|0,c[B>>2]=c[f+8>>2],h[B+8>>3]=j,B)|0)|0}else{z=ho(k,30,l,t,(B=i,i=i+8|0,h[B>>3]=j,B)|0)|0}do{if((z|0)>29){l=(a[19960]|0)==0;if(y){do{if(l){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);A=hp(m,c[4482]|0,t,(B=i,i=i+16|0,c[B>>2]=c[f+8>>2],h[B+8>>3]=j,B)|0)|0}else{do{if(l){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);A=hp(m,c[4482]|0,t,(B=i,i=i+16|0,c[B>>2]=c[f+8>>2],h[B+8>>3]=j,B)|0)|0}l=c[m>>2]|0;if((l|0)!=0){C=A;D=l;E=l;break}l4();l=c[m>>2]|0;C=A;D=l;E=l}else{C=z;D=0;E=c[m>>2]|0}}while(0);z=E+C|0;A=c[u>>2]&176;do{if((A|0)==16){u=a[E]|0;if((u<<24>>24|0)==45|(u<<24>>24|0)==43){F=E+1|0;break}if(!((C|0)>1&u<<24>>24==48)){G=3125;break}u=a[E+1|0]|0;if(!((u<<24>>24|0)==120|(u<<24>>24|0)==88)){G=3125;break}F=E+2|0}else if((A|0)==32){F=z}else{G=3125}}while(0);if((G|0)==3125){F=E}do{if((E|0)==(k|0)){H=n|0;I=0;J=k}else{G=lR(C<<3)|0;A=G;if((G|0)!=0){H=A;I=A;J=E;break}l4();H=A;I=A;J=c[m>>2]|0}}while(0);fA(q,f);hD(J,F,z,H,o,p,q);eL(c[q>>2]|0)|0;q=e|0;c[s>>2]=c[q>>2];hy(r,s,H,c[o>>2]|0,c[p>>2]|0,f,g);g=c[r>>2]|0;c[q>>2]=g;c[b>>2]=g;if((I|0)!=0){lS(I)}if((D|0)==0){i=d;return}lS(D);i=d;return}function hD(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0;l=i;i=i+48|0;m=l|0;n=l+16|0;o=l+32|0;p=k|0;k=c[p>>2]|0;if((c[4848]|0)!=-1){c[n>>2]=19392;c[n+4>>2]=16;c[n+8>>2]=0;e6(19392,n,116)}n=(c[4849]|0)-1|0;q=c[k+8>>2]|0;if((c[k+12>>2]|0)-q>>2>>>0<=n>>>0){r=bO(4)|0;s=r;lz(s);bk(r|0,13904,160)}k=c[q+(n<<2)>>2]|0;if((k|0)==0){r=bO(4)|0;s=r;lz(s);bk(r|0,13904,160)}r=k;s=c[p>>2]|0;if((c[4752]|0)!=-1){c[m>>2]=19008;c[m+4>>2]=16;c[m+8>>2]=0;e6(19008,m,116)}m=(c[4753]|0)-1|0;p=c[s+8>>2]|0;if((c[s+12>>2]|0)-p>>2>>>0<=m>>>0){t=bO(4)|0;u=t;lz(u);bk(t|0,13904,160)}s=c[p+(m<<2)>>2]|0;if((s|0)==0){t=bO(4)|0;u=t;lz(u);bk(t|0,13904,160)}t=s;bZ[c[(c[s>>2]|0)+20>>2]&127](o,t);c[j>>2]=g;u=a[b]|0;if((u<<24>>24|0)==45|(u<<24>>24|0)==43){m=b_[c[(c[k>>2]|0)+44>>2]&63](r,u)|0;u=c[j>>2]|0;c[j>>2]=u+4;c[u>>2]=m;v=b+1|0}else{v=b}m=f;L3779:do{if((m-v|0)>1){if((a[v]|0)!=48){w=3167;break}u=v+1|0;p=a[u]|0;if(!((p<<24>>24|0)==120|(p<<24>>24|0)==88)){w=3167;break}p=k;n=b_[c[(c[p>>2]|0)+44>>2]&63](r,48)|0;q=c[j>>2]|0;c[j>>2]=q+4;c[q>>2]=n;n=v+2|0;q=b_[c[(c[p>>2]|0)+44>>2]&63](r,a[u]|0)|0;u=c[j>>2]|0;c[j>>2]=u+4;c[u>>2]=q;if(n>>>0<f>>>0){x=n}else{y=n;z=n;break}while(1){q=a[x]|0;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);u=x+1|0;if((a2(q<<24>>24|0,c[4482]|0)|0)==0){y=x;z=n;break L3779}if(u>>>0<f>>>0){x=u}else{y=u;z=n;break}}}else{w=3167}}while(0);L3794:do{if((w|0)==3167){if(v>>>0<f>>>0){A=v}else{y=v;z=v;break}while(1){x=a[A]|0;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);q=A+1|0;if((bI(x<<24>>24|0,c[4482]|0)|0)==0){y=A;z=v;break L3794}if(q>>>0<f>>>0){A=q}else{y=q;z=v;break}}}}while(0);v=o;A=o;w=d[A]|0;if((w&1|0)==0){B=w>>>1}else{B=c[o+4>>2]|0}do{if((B|0)==0){w=c[j>>2]|0;q=c[(c[k>>2]|0)+48>>2]|0;ca[q&15](r,z,y,w)|0;c[j>>2]=(c[j>>2]|0)+(y-z<<2)}else{do{if((z|0)!=(y|0)){w=y-1|0;if(z>>>0<w>>>0){C=z;D=w}else{break}do{w=a[C]|0;a[C]=a[D]|0;a[D]=w;C=C+1|0;D=D-1|0;}while(C>>>0<D>>>0)}}while(0);x=b0[c[(c[s>>2]|0)+16>>2]&255](t)|0;if(z>>>0<y>>>0){w=v+1|0;q=o+4|0;n=o+8|0;u=k;p=0;E=0;F=z;while(1){G=(a[A]&1)==0;do{if((a[(G?w:c[n>>2]|0)+E|0]|0)>0){if((p|0)!=(a[(G?w:c[n>>2]|0)+E|0]|0)){H=E;I=p;break}J=c[j>>2]|0;c[j>>2]=J+4;c[J>>2]=x;J=d[A]|0;H=(E>>>0<(((J&1|0)==0?J>>>1:c[q>>2]|0)-1|0)>>>0)+E|0;I=0}else{H=E;I=p}}while(0);G=b_[c[(c[u>>2]|0)+44>>2]&63](r,a[F]|0)|0;J=c[j>>2]|0;c[j>>2]=J+4;c[J>>2]=G;G=F+1|0;if(G>>>0<y>>>0){p=I+1|0;E=H;F=G}else{break}}}F=g+(z-b<<2)|0;E=c[j>>2]|0;if((F|0)==(E|0)){break}p=E-4|0;if(F>>>0<p>>>0){K=F;L=p}else{break}do{p=c[K>>2]|0;c[K>>2]=c[L>>2];c[L>>2]=p;K=K+4|0;L=L-4|0;}while(K>>>0<L>>>0)}}while(0);L3834:do{if(y>>>0<f>>>0){L=k;K=y;while(1){z=a[K]|0;if(z<<24>>24==46){break}H=b_[c[(c[L>>2]|0)+44>>2]&63](r,z)|0;z=c[j>>2]|0;c[j>>2]=z+4;c[z>>2]=H;H=K+1|0;if(H>>>0<f>>>0){K=H}else{M=H;break L3834}}L=b0[c[(c[s>>2]|0)+12>>2]&255](t)|0;H=c[j>>2]|0;c[j>>2]=H+4;c[H>>2]=L;M=K+1|0}else{M=y}}while(0);ca[c[(c[k>>2]|0)+48>>2]&15](r,M,f,c[j>>2]|0)|0;r=(c[j>>2]|0)+(m-M<<2)|0;c[j>>2]=r;if((e|0)==(f|0)){N=r;c[h>>2]=N;e$(o);i=l;return}N=g+(e-b<<2)|0;c[h>>2]=N;e$(o);i=l;return}function hE(b,d,e,f,g,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=+j;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0;d=i;i=i+320|0;k=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[k>>2];k=d|0;l=d+8|0;m=d+40|0;n=d+48|0;o=d+280|0;p=d+288|0;q=d+296|0;r=d+304|0;s=d+312|0;c[k>>2]=37;c[k+4>>2]=0;t=k;k=t+1|0;u=f+4|0;v=c[u>>2]|0;if((v&2048|0)==0){w=k}else{a[k]=43;w=t+2|0}if((v&1024|0)==0){x=w}else{a[w]=35;x=w+1|0}w=v&260;k=v>>>14;do{if((w|0)==260){a[x]=76;v=x+1|0;if((k&1|0)==0){a[v]=97;y=0;break}else{a[v]=65;y=0;break}}else{a[x]=46;a[x+1|0]=42;a[x+2|0]=76;v=x+3|0;if((w|0)==4){if((k&1|0)==0){a[v]=102;y=1;break}else{a[v]=70;y=1;break}}else if((w|0)==256){if((k&1|0)==0){a[v]=101;y=1;break}else{a[v]=69;y=1;break}}else{if((k&1|0)==0){a[v]=103;y=1;break}else{a[v]=71;y=1;break}}}}while(0);k=l|0;c[m>>2]=k;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);l=c[4482]|0;if(y){z=ho(k,30,l,t,(B=i,i=i+16|0,c[B>>2]=c[f+8>>2],h[B+8>>3]=j,B)|0)|0}else{z=ho(k,30,l,t,(B=i,i=i+8|0,h[B>>3]=j,B)|0)|0}do{if((z|0)>29){l=(a[19960]|0)==0;if(y){do{if(l){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);A=hp(m,c[4482]|0,t,(B=i,i=i+16|0,c[B>>2]=c[f+8>>2],h[B+8>>3]=j,B)|0)|0}else{do{if(l){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);A=hp(m,c[4482]|0,t,(B=i,i=i+8|0,h[B>>3]=j,B)|0)|0}l=c[m>>2]|0;if((l|0)!=0){C=A;D=l;E=l;break}l4();l=c[m>>2]|0;C=A;D=l;E=l}else{C=z;D=0;E=c[m>>2]|0}}while(0);z=E+C|0;A=c[u>>2]&176;do{if((A|0)==16){u=a[E]|0;if((u<<24>>24|0)==45|(u<<24>>24|0)==43){F=E+1|0;break}if(!((C|0)>1&u<<24>>24==48)){G=3278;break}u=a[E+1|0]|0;if(!((u<<24>>24|0)==120|(u<<24>>24|0)==88)){G=3278;break}F=E+2|0}else if((A|0)==32){F=z}else{G=3278}}while(0);if((G|0)==3278){F=E}do{if((E|0)==(k|0)){H=n|0;I=0;J=k}else{G=lR(C<<3)|0;A=G;if((G|0)!=0){H=A;I=A;J=E;break}l4();H=A;I=A;J=c[m>>2]|0}}while(0);fA(q,f);hD(J,F,z,H,o,p,q);eL(c[q>>2]|0)|0;q=e|0;c[s>>2]=c[q>>2];hy(r,s,H,c[o>>2]|0,c[p>>2]|0,f,g);g=c[r>>2]|0;c[q>>2]=g;c[b>>2]=g;if((I|0)!=0){lS(I)}if((D|0)==0){i=d;return}lS(D);i=d;return}function hF(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;d=i;i=i+216|0;j=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[j>>2];j=d|0;k=d+24|0;l=d+48|0;m=d+200|0;n=d+208|0;o=d+16|0;a[o]=a[7152]|0;a[o+1|0]=a[7153|0]|0;a[o+2|0]=a[7154|0]|0;a[o+3|0]=a[7155|0]|0;a[o+4|0]=a[7156|0]|0;a[o+5|0]=a[7157|0]|0;p=k|0;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);q=hh(p,c[4482]|0,o,(B=i,i=i+8|0,c[B>>2]=h,B)|0)|0;h=k+q|0;o=c[f+4>>2]&176;do{if((o|0)==32){r=h}else if((o|0)==16){s=a[p]|0;if((s<<24>>24|0)==45|(s<<24>>24|0)==43){r=k+1|0;break}if(!((q|0)>1&s<<24>>24==48)){t=3311;break}s=a[k+1|0]|0;if(!((s<<24>>24|0)==120|(s<<24>>24|0)==88)){t=3311;break}r=k+2|0}else{t=3311}}while(0);if((t|0)==3311){r=p}fA(m,f);t=m|0;m=c[t>>2]|0;if((c[4848]|0)!=-1){c[j>>2]=19392;c[j+4>>2]=16;c[j+8>>2]=0;e6(19392,j,116)}j=(c[4849]|0)-1|0;o=c[m+8>>2]|0;do{if((c[m+12>>2]|0)-o>>2>>>0>j>>>0){s=c[o+(j<<2)>>2]|0;if((s|0)==0){break}u=s;v=c[t>>2]|0;eL(v)|0;v=l|0;w=c[(c[s>>2]|0)+48>>2]|0;ca[w&15](u,p,h,v)|0;u=l+(q<<2)|0;if((r|0)==(h|0)){x=u;y=e|0;z=c[y>>2]|0;A=n|0;c[A>>2]=z;hy(b,n,v,x,u,f,g);i=d;return}x=l+(r-k<<2)|0;y=e|0;z=c[y>>2]|0;A=n|0;c[A>>2]=z;hy(b,n,v,x,u,f,g);i=d;return}}while(0);d=bO(4)|0;lz(d);bk(d|0,13904,160)}function hG(a){a=a|0;return 2}function hH(a){a=a|0;en(a|0);l_(a);return}function hI(a){a=a|0;en(a|0);return}function hJ(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0;j=i;i=i+16|0;k=d;d=i;i=i+4|0;i=i+7>>3<<3;c[d>>2]=c[k>>2];k=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[k>>2];k=j|0;l=j+8|0;c[k>>2]=c[d>>2];c[l>>2]=c[e>>2];hL(a,b,k,l,f,g,h,7136,7144);i=j;return}function hK(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;k=i;i=i+16|0;l=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[l>>2];l=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[l>>2];l=k|0;m=k+8|0;n=d+8|0;o=b0[c[(c[n>>2]|0)+20>>2]&255](n)|0;c[l>>2]=c[e>>2];c[m>>2]=c[f>>2];f=o;e=a[o]|0;if((e&1)==0){p=f+1|0;q=f+1|0}else{f=c[o+8>>2]|0;p=f;q=f}f=e&255;if((f&1|0)==0){r=f>>>1}else{r=c[o+4>>2]|0}hL(b,d,l,m,g,h,j,q,p+r|0);i=k;return}function hL(d,e,f,g,h,j,k,l,m){d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ab=0,ac=0,ad=0;n=i;i=i+48|0;o=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[o>>2];o=g;g=i;i=i+4|0;i=i+7>>3<<3;c[g>>2]=c[o>>2];o=n|0;p=n+16|0;q=n+24|0;r=n+32|0;s=n+40|0;fA(p,h);t=p|0;p=c[t>>2]|0;if((c[4850]|0)!=-1){c[o>>2]=19400;c[o+4>>2]=16;c[o+8>>2]=0;e6(19400,o,116)}o=(c[4851]|0)-1|0;u=c[p+8>>2]|0;do{if((c[p+12>>2]|0)-u>>2>>>0>o>>>0){v=c[u+(o<<2)>>2]|0;if((v|0)==0){break}w=v;x=c[t>>2]|0;eL(x)|0;c[j>>2]=0;x=f|0;L20:do{if((l|0)==(m|0)){y=78}else{z=g|0;A=v;B=v+8|0;C=v;D=e;E=r|0;F=s|0;G=q|0;H=l;I=0;L22:while(1){J=I;while(1){if((J|0)!=0){y=78;break L20}K=c[x>>2]|0;do{if((K|0)==0){L=0}else{if((c[K+12>>2]|0)!=(c[K+16>>2]|0)){L=K;break}if((b0[c[(c[K>>2]|0)+36>>2]&255](K)|0)!=-1){L=K;break}c[x>>2]=0;L=0}}while(0);K=(L|0)==0;M=c[z>>2]|0;L32:do{if((M|0)==0){y=31}else{do{if((c[M+12>>2]|0)==(c[M+16>>2]|0)){if((b0[c[(c[M>>2]|0)+36>>2]&255](M)|0)!=-1){break}c[z>>2]=0;y=31;break L32}}while(0);if(K){N=M}else{y=32;break L22}}}while(0);if((y|0)==31){y=0;if(K){y=32;break L22}else{N=0}}if((b1[c[(c[A>>2]|0)+36>>2]&63](w,a[H]|0,0)|0)<<24>>24==37){y=35;break}M=a[H]|0;if(M<<24>>24>-1){O=c[B>>2]|0;if((b[O+(M<<24>>24<<1)>>1]&8192)!=0){P=H;y=46;break}}Q=L+12|0;M=c[Q>>2]|0;R=L+16|0;if((M|0)==(c[R>>2]|0)){S=(b0[c[(c[L>>2]|0)+36>>2]&255](L)|0)&255}else{S=a[M]|0}M=b_[c[(c[C>>2]|0)+12>>2]&63](w,S)|0;if(M<<24>>24==(b_[c[(c[C>>2]|0)+12>>2]&63](w,a[H]|0)|0)<<24>>24){y=73;break}c[j>>2]=4;J=4}L50:do{if((y|0)==35){y=0;J=H+1|0;if((J|0)==(m|0)){y=36;break L22}M=b1[c[(c[A>>2]|0)+36>>2]&63](w,a[J]|0,0)|0;if((M<<24>>24|0)==69|(M<<24>>24|0)==48){T=H+2|0;if((T|0)==(m|0)){y=39;break L22}U=M;V=b1[c[(c[A>>2]|0)+36>>2]&63](w,a[T]|0,0)|0;W=T}else{U=0;V=M;W=J}J=c[(c[D>>2]|0)+36>>2]|0;c[E>>2]=L;c[F>>2]=N;b7[J&7](q,e,r,s,h,j,k,V,U);c[x>>2]=c[G>>2];X=W+1|0}else if((y|0)==46){while(1){y=0;J=P+1|0;if((J|0)==(m|0)){Y=m;break}M=a[J]|0;if(M<<24>>24<=-1){Y=J;break}if((b[O+(M<<24>>24<<1)>>1]&8192)==0){Y=J;break}else{P=J;y=46}}K=L;J=N;while(1){do{if((K|0)==0){Z=0}else{if((c[K+12>>2]|0)!=(c[K+16>>2]|0)){Z=K;break}if((b0[c[(c[K>>2]|0)+36>>2]&255](K)|0)!=-1){Z=K;break}c[x>>2]=0;Z=0}}while(0);M=(Z|0)==0;do{if((J|0)==0){y=59}else{if((c[J+12>>2]|0)!=(c[J+16>>2]|0)){if(M){_=J;break}else{X=Y;break L50}}if((b0[c[(c[J>>2]|0)+36>>2]&255](J)|0)==-1){c[z>>2]=0;y=59;break}else{if(M^(J|0)==0){_=J;break}else{X=Y;break L50}}}}while(0);if((y|0)==59){y=0;if(M){X=Y;break L50}else{_=0}}T=Z+12|0;$=c[T>>2]|0;aa=Z+16|0;if(($|0)==(c[aa>>2]|0)){ab=(b0[c[(c[Z>>2]|0)+36>>2]&255](Z)|0)&255}else{ab=a[$]|0}if(ab<<24>>24<=-1){X=Y;break L50}if((b[(c[B>>2]|0)+(ab<<24>>24<<1)>>1]&8192)==0){X=Y;break L50}$=c[T>>2]|0;if(($|0)==(c[aa>>2]|0)){aa=c[(c[Z>>2]|0)+40>>2]|0;b0[aa&255](Z)|0;K=Z;J=_;continue}else{c[T>>2]=$+1;K=Z;J=_;continue}}}else if((y|0)==73){y=0;J=c[Q>>2]|0;if((J|0)==(c[R>>2]|0)){K=c[(c[L>>2]|0)+40>>2]|0;b0[K&255](L)|0}else{c[Q>>2]=J+1}X=H+1|0}}while(0);if((X|0)==(m|0)){y=78;break L20}H=X;I=c[j>>2]|0}if((y|0)==32){c[j>>2]=4;ac=L;break}else if((y|0)==36){c[j>>2]=4;ac=L;break}else if((y|0)==39){c[j>>2]=4;ac=L;break}}}while(0);if((y|0)==78){ac=c[x>>2]|0}w=f|0;do{if((ac|0)!=0){if((c[ac+12>>2]|0)!=(c[ac+16>>2]|0)){break}if((b0[c[(c[ac>>2]|0)+36>>2]&255](ac)|0)!=-1){break}c[w>>2]=0}}while(0);x=c[w>>2]|0;v=(x|0)==0;I=g|0;H=c[I>>2]|0;L108:do{if((H|0)==0){y=88}else{do{if((c[H+12>>2]|0)==(c[H+16>>2]|0)){if((b0[c[(c[H>>2]|0)+36>>2]&255](H)|0)!=-1){break}c[I>>2]=0;y=88;break L108}}while(0);if(!v){break}ad=d|0;c[ad>>2]=x;i=n;return}}while(0);do{if((y|0)==88){if(v){break}ad=d|0;c[ad>>2]=x;i=n;return}}while(0);c[j>>2]=c[j>>2]|2;ad=d|0;c[ad>>2]=x;i=n;return}}while(0);n=bO(4)|0;lz(n);bk(n|0,13904,160)}function hM(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;j=i;i=i+32|0;k=d;d=i;i=i+4|0;i=i+7>>3<<3;c[d>>2]=c[k>>2];k=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[k>>2];k=j|0;l=j+8|0;m=j+24|0;fA(m,f);f=m|0;m=c[f>>2]|0;if((c[4850]|0)!=-1){c[l>>2]=19400;c[l+4>>2]=16;c[l+8>>2]=0;e6(19400,l,116)}l=(c[4851]|0)-1|0;n=c[m+8>>2]|0;do{if((c[m+12>>2]|0)-n>>2>>>0>l>>>0){o=c[n+(l<<2)>>2]|0;if((o|0)==0){break}p=o;o=c[f>>2]|0;eL(o)|0;o=c[e>>2]|0;q=b+8|0;r=b0[c[c[q>>2]>>2]&255](q)|0;c[k>>2]=o;o=(gz(d,k,r,r+168|0,p,g,0)|0)-r|0;if((o|0)>=168){s=4;t=0;u=d|0;v=c[u>>2]|0;w=a|0;c[w>>2]=v;i=j;return}c[h+24>>2]=((o|0)/12|0|0)%7|0;s=4;t=0;u=d|0;v=c[u>>2]|0;w=a|0;c[w>>2]=v;i=j;return}}while(0);j=bO(4)|0;lz(j);bk(j|0,13904,160)}function hN(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;j=i;i=i+32|0;k=d;d=i;i=i+4|0;i=i+7>>3<<3;c[d>>2]=c[k>>2];k=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[k>>2];k=j|0;l=j+8|0;m=j+24|0;fA(m,f);f=m|0;m=c[f>>2]|0;if((c[4850]|0)!=-1){c[l>>2]=19400;c[l+4>>2]=16;c[l+8>>2]=0;e6(19400,l,116)}l=(c[4851]|0)-1|0;n=c[m+8>>2]|0;do{if((c[m+12>>2]|0)-n>>2>>>0>l>>>0){o=c[n+(l<<2)>>2]|0;if((o|0)==0){break}p=o;o=c[f>>2]|0;eL(o)|0;o=c[e>>2]|0;q=b+8|0;r=b0[c[(c[q>>2]|0)+4>>2]&255](q)|0;c[k>>2]=o;o=(gz(d,k,r,r+288|0,p,g,0)|0)-r|0;if((o|0)>=288){s=4;t=0;u=d|0;v=c[u>>2]|0;w=a|0;c[w>>2]=v;i=j;return}c[h+16>>2]=((o|0)/12|0|0)%12|0;s=4;t=0;u=d|0;v=c[u>>2]|0;w=a|0;c[w>>2]=v;i=j;return}}while(0);j=bO(4)|0;lz(j);bk(j|0,13904,160)}function hO(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;b=i;i=i+32|0;j=d;d=i;i=i+4|0;i=i+7>>3<<3;c[d>>2]=c[j>>2];j=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[j>>2];j=b|0;k=b+8|0;l=b+24|0;fA(l,f);f=l|0;l=c[f>>2]|0;if((c[4850]|0)!=-1){c[k>>2]=19400;c[k+4>>2]=16;c[k+8>>2]=0;e6(19400,k,116)}k=(c[4851]|0)-1|0;m=c[l+8>>2]|0;do{if((c[l+12>>2]|0)-m>>2>>>0>k>>>0){n=c[m+(k<<2)>>2]|0;if((n|0)==0){break}o=n;n=c[f>>2]|0;eL(n)|0;c[j>>2]=c[e>>2];n=hT(d,j,g,o,4)|0;if((c[g>>2]&4|0)!=0){p=4;q=0;r=d|0;s=c[r>>2]|0;t=a|0;c[t>>2]=s;i=b;return}if((n|0)<69){u=n+2e3|0}else{u=(n-69|0)>>>0<31?n+1900|0:n}c[h+20>>2]=u-1900;p=4;q=0;r=d|0;s=c[r>>2]|0;t=a|0;c[t>>2]=s;i=b;return}}while(0);b=bO(4)|0;lz(b);bk(b|0,13904,160)}function hP(d,e,f,g,h){d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;d=i;j=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[j>>2];j=e|0;e=f|0;f=h+8|0;L166:while(1){h=c[j>>2]|0;do{if((h|0)==0){k=0}else{if((c[h+12>>2]|0)!=(c[h+16>>2]|0)){k=h;break}if((b0[c[(c[h>>2]|0)+36>>2]&255](h)|0)==-1){c[j>>2]=0;k=0;break}else{k=c[j>>2]|0;break}}}while(0);h=(k|0)==0;l=c[e>>2]|0;L175:do{if((l|0)==0){m=144}else{do{if((c[l+12>>2]|0)==(c[l+16>>2]|0)){if((b0[c[(c[l>>2]|0)+36>>2]&255](l)|0)!=-1){break}c[e>>2]=0;m=144;break L175}}while(0);if(h){n=l;o=0}else{p=l;q=0;break L166}}}while(0);if((m|0)==144){m=0;if(h){p=0;q=1;break}else{n=0;o=1}}l=c[j>>2]|0;r=c[l+12>>2]|0;if((r|0)==(c[l+16>>2]|0)){s=(b0[c[(c[l>>2]|0)+36>>2]&255](l)|0)&255}else{s=a[r]|0}if(s<<24>>24<=-1){p=n;q=o;break}if((b[(c[f>>2]|0)+(s<<24>>24<<1)>>1]&8192)==0){p=n;q=o;break}r=c[j>>2]|0;l=r+12|0;t=c[l>>2]|0;if((t|0)==(c[r+16>>2]|0)){u=c[(c[r>>2]|0)+40>>2]|0;b0[u&255](r)|0;continue}else{c[l>>2]=t+1;continue}}o=c[j>>2]|0;do{if((o|0)==0){v=0}else{if((c[o+12>>2]|0)!=(c[o+16>>2]|0)){v=o;break}if((b0[c[(c[o>>2]|0)+36>>2]&255](o)|0)==-1){c[j>>2]=0;v=0;break}else{v=c[j>>2]|0;break}}}while(0);j=(v|0)==0;do{if(q){m=163}else{if((c[p+12>>2]|0)!=(c[p+16>>2]|0)){if(!(j^(p|0)==0)){break}i=d;return}if((b0[c[(c[p>>2]|0)+36>>2]&255](p)|0)==-1){c[e>>2]=0;m=163;break}if(!j){break}i=d;return}}while(0);do{if((m|0)==163){if(j){break}i=d;return}}while(0);c[g>>2]=c[g>>2]|2;i=d;return}
function hQ(b,d,e,f,g,h,j,k,l){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ab=0,ac=0,ad=0,ae=0,af=0,ag=0,ah=0,ai=0,aj=0,ak=0,al=0,am=0,an=0;l=i;i=i+328|0;m=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[m>>2];m=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[m>>2];m=l|0;n=l+8|0;o=l+16|0;p=l+24|0;q=l+32|0;r=l+40|0;s=l+48|0;t=l+56|0;u=l+64|0;v=l+72|0;w=l+80|0;x=l+88|0;y=l+96|0;z=l+112|0;A=l+120|0;B=l+128|0;C=l+136|0;D=l+144|0;E=l+152|0;F=l+160|0;G=l+168|0;H=l+176|0;I=l+184|0;J=l+192|0;K=l+200|0;L=l+208|0;M=l+216|0;N=l+224|0;O=l+232|0;P=l+240|0;Q=l+248|0;R=l+256|0;S=l+264|0;T=l+272|0;U=l+280|0;V=l+288|0;W=l+296|0;X=l+304|0;Y=l+312|0;Z=l+320|0;c[h>>2]=0;fA(z,g);_=z|0;z=c[_>>2]|0;if((c[4850]|0)!=-1){c[y>>2]=19400;c[y+4>>2]=16;c[y+8>>2]=0;e6(19400,y,116)}y=(c[4851]|0)-1|0;$=c[z+8>>2]|0;do{if((c[z+12>>2]|0)-$>>2>>>0>y>>>0){aa=c[$+(y<<2)>>2]|0;if((aa|0)==0){break}ab=aa;aa=c[_>>2]|0;eL(aa)|0;aa=k<<24>>24;L223:do{if((aa|0)==68){ac=e|0;c[E>>2]=c[ac>>2];c[F>>2]=c[f>>2];hL(D,d,E,F,g,h,j,7128,7136);c[ac>>2]=c[D>>2]}else if((aa|0)==70){ac=e|0;c[H>>2]=c[ac>>2];c[I>>2]=c[f>>2];hL(G,d,H,I,g,h,j,7120,7128);c[ac>>2]=c[G>>2]}else if((aa|0)==72){c[u>>2]=c[f>>2];ac=hT(e,u,h,ab,2)|0;ad=c[h>>2]|0;if((ad&4|0)==0&(ac|0)<24){c[j+8>>2]=ac;break}else{c[h>>2]=ad|4;break}}else if((aa|0)==73){ad=j+8|0;c[t>>2]=c[f>>2];ac=hT(e,t,h,ab,2)|0;ae=c[h>>2]|0;do{if((ae&4|0)==0){if((ac-1|0)>>>0>=12){break}c[ad>>2]=ac;break L223}}while(0);c[h>>2]=ae|4}else if((aa|0)==106){c[s>>2]=c[f>>2];ac=hT(e,s,h,ab,3)|0;ad=c[h>>2]|0;if((ad&4|0)==0&(ac|0)<366){c[j+28>>2]=ac;break}else{c[h>>2]=ad|4;break}}else if((aa|0)==109){c[r>>2]=c[f>>2];ad=hT(e,r,h,ab,2)|0;ac=c[h>>2]|0;if((ac&4|0)==0&(ad|0)<13){c[j+16>>2]=ad-1;break}else{c[h>>2]=ac|4;break}}else if((aa|0)==77){c[q>>2]=c[f>>2];ac=hT(e,q,h,ab,2)|0;ad=c[h>>2]|0;if((ad&4|0)==0&(ac|0)<60){c[j+4>>2]=ac;break}else{c[h>>2]=ad|4;break}}else if((aa|0)==110|(aa|0)==116){c[J>>2]=c[f>>2];hP(0,e,J,h,ab)}else if((aa|0)==112){c[K>>2]=c[f>>2];hR(d,j+8|0,e,K,h,ab)}else if((aa|0)==114){ad=e|0;c[M>>2]=c[ad>>2];c[N>>2]=c[f>>2];hL(L,d,M,N,g,h,j,7104,7115);c[ad>>2]=c[L>>2]}else if((aa|0)==82){ad=e|0;c[P>>2]=c[ad>>2];c[Q>>2]=c[f>>2];hL(O,d,P,Q,g,h,j,7096,7101);c[ad>>2]=c[O>>2]}else if((aa|0)==83){c[p>>2]=c[f>>2];ad=hT(e,p,h,ab,2)|0;ac=c[h>>2]|0;if((ac&4|0)==0&(ad|0)<61){c[j>>2]=ad;break}else{c[h>>2]=ac|4;break}}else if((aa|0)==84){ac=e|0;c[S>>2]=c[ac>>2];c[T>>2]=c[f>>2];hL(R,d,S,T,g,h,j,7088,7096);c[ac>>2]=c[R>>2]}else if((aa|0)==100|(aa|0)==101){ac=j+12|0;c[v>>2]=c[f>>2];ad=hT(e,v,h,ab,2)|0;af=c[h>>2]|0;do{if((af&4|0)==0){if((ad-1|0)>>>0>=31){break}c[ac>>2]=ad;break L223}}while(0);c[h>>2]=af|4}else if((aa|0)==119){c[o>>2]=c[f>>2];ad=hT(e,o,h,ab,1)|0;ac=c[h>>2]|0;if((ac&4|0)==0&(ad|0)<7){c[j+24>>2]=ad;break}else{c[h>>2]=ac|4;break}}else if((aa|0)==120){ac=c[(c[d>>2]|0)+20>>2]|0;c[U>>2]=c[e>>2];c[V>>2]=c[f>>2];bX[ac&127](b,d,U,V,g,h,j);i=l;return}else if((aa|0)==88){ac=d+8|0;ad=b0[c[(c[ac>>2]|0)+24>>2]&255](ac)|0;ac=e|0;c[X>>2]=c[ac>>2];c[Y>>2]=c[f>>2];ae=ad;ag=a[ad]|0;if((ag&1)==0){ah=ae+1|0;ai=ae+1|0}else{ae=c[ad+8>>2]|0;ah=ae;ai=ae}ae=ag&255;if((ae&1|0)==0){aj=ae>>>1}else{aj=c[ad+4>>2]|0}hL(W,d,X,Y,g,h,j,ai,ah+aj|0);c[ac>>2]=c[W>>2]}else if((aa|0)==121){c[n>>2]=c[f>>2];ac=hT(e,n,h,ab,4)|0;if((c[h>>2]&4|0)!=0){break}if((ac|0)<69){ak=ac+2e3|0}else{ak=(ac-69|0)>>>0<31?ac+1900|0:ac}c[j+20>>2]=ak-1900}else if((aa|0)==89){c[m>>2]=c[f>>2];ac=hT(e,m,h,ab,4)|0;if((c[h>>2]&4|0)!=0){break}c[j+20>>2]=ac-1900}else if((aa|0)==37){c[Z>>2]=c[f>>2];hS(0,e,Z,h,ab)}else if((aa|0)==99){ac=d+8|0;ad=b0[c[(c[ac>>2]|0)+12>>2]&255](ac)|0;ac=e|0;c[B>>2]=c[ac>>2];c[C>>2]=c[f>>2];ae=ad;ag=a[ad]|0;if((ag&1)==0){al=ae+1|0;am=ae+1|0}else{ae=c[ad+8>>2]|0;al=ae;am=ae}ae=ag&255;if((ae&1|0)==0){an=ae>>>1}else{an=c[ad+4>>2]|0}hL(A,d,B,C,g,h,j,am,al+an|0);c[ac>>2]=c[A>>2]}else if((aa|0)==97|(aa|0)==65){ac=c[f>>2]|0;ad=d+8|0;ae=b0[c[c[ad>>2]>>2]&255](ad)|0;c[x>>2]=ac;ac=(gz(e,x,ae,ae+168|0,ab,h,0)|0)-ae|0;if((ac|0)>=168){break}c[j+24>>2]=((ac|0)/12|0|0)%7|0}else if((aa|0)==98|(aa|0)==66|(aa|0)==104){ac=c[f>>2]|0;ae=d+8|0;ad=b0[c[(c[ae>>2]|0)+4>>2]&255](ae)|0;c[w>>2]=ac;ac=(gz(e,w,ad,ad+288|0,ab,h,0)|0)-ad|0;if((ac|0)>=288){break}c[j+16>>2]=((ac|0)/12|0|0)%12|0}else{c[h>>2]=c[h>>2]|4}}while(0);c[b>>2]=c[e>>2];i=l;return}}while(0);l=bO(4)|0;lz(l);bk(l|0,13904,160)}function hR(a,b,e,f,g,h){a=a|0;b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0;j=i;i=i+8|0;k=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[k>>2];k=j|0;l=a+8|0;a=b0[c[(c[l>>2]|0)+8>>2]&255](l)|0;l=d[a]|0;if((l&1|0)==0){m=l>>>1}else{m=c[a+4>>2]|0}l=d[a+12|0]|0;if((l&1|0)==0){n=l>>>1}else{n=c[a+16>>2]|0}if((m|0)==(-n|0)){c[g>>2]=c[g>>2]|4;i=j;return}c[k>>2]=c[f>>2];f=gz(e,k,a,a+24|0,h,g,0)|0;g=f-a|0;do{if((f|0)==(a|0)){if((c[b>>2]|0)!=12){break}c[b>>2]=0;i=j;return}}while(0);if((g|0)!=12){i=j;return}g=c[b>>2]|0;if((g|0)>=12){i=j;return}c[b>>2]=g+12;i=j;return}function hS(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0;b=i;h=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[h>>2];h=d|0;d=c[h>>2]|0;do{if((d|0)==0){j=0}else{if((c[d+12>>2]|0)!=(c[d+16>>2]|0)){j=d;break}if((b0[c[(c[d>>2]|0)+36>>2]&255](d)|0)==-1){c[h>>2]=0;j=0;break}else{j=c[h>>2]|0;break}}}while(0);d=(j|0)==0;j=e|0;e=c[j>>2]|0;L336:do{if((e|0)==0){k=274}else{do{if((c[e+12>>2]|0)==(c[e+16>>2]|0)){if((b0[c[(c[e>>2]|0)+36>>2]&255](e)|0)!=-1){break}c[j>>2]=0;k=274;break L336}}while(0);if(d){l=e;m=0}else{k=275}}}while(0);if((k|0)==274){if(d){k=275}else{l=0;m=1}}if((k|0)==275){c[f>>2]=c[f>>2]|6;i=b;return}d=c[h>>2]|0;e=c[d+12>>2]|0;if((e|0)==(c[d+16>>2]|0)){n=(b0[c[(c[d>>2]|0)+36>>2]&255](d)|0)&255}else{n=a[e]|0}if((b1[c[(c[g>>2]|0)+36>>2]&63](g,n,0)|0)<<24>>24!=37){c[f>>2]=c[f>>2]|4;i=b;return}n=c[h>>2]|0;g=n+12|0;e=c[g>>2]|0;if((e|0)==(c[n+16>>2]|0)){d=c[(c[n>>2]|0)+40>>2]|0;b0[d&255](n)|0}else{c[g>>2]=e+1}e=c[h>>2]|0;do{if((e|0)==0){o=0}else{if((c[e+12>>2]|0)!=(c[e+16>>2]|0)){o=e;break}if((b0[c[(c[e>>2]|0)+36>>2]&255](e)|0)==-1){c[h>>2]=0;o=0;break}else{o=c[h>>2]|0;break}}}while(0);h=(o|0)==0;do{if(m){k=294}else{if((c[l+12>>2]|0)!=(c[l+16>>2]|0)){if(!(h^(l|0)==0)){break}i=b;return}if((b0[c[(c[l>>2]|0)+36>>2]&255](l)|0)==-1){c[j>>2]=0;k=294;break}if(!h){break}i=b;return}}while(0);do{if((k|0)==294){if(h){break}i=b;return}}while(0);c[f>>2]=c[f>>2]|2;i=b;return}function hT(d,e,f,g,h){d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0;j=i;k=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[k>>2];k=d|0;d=c[k>>2]|0;do{if((d|0)==0){l=0}else{if((c[d+12>>2]|0)!=(c[d+16>>2]|0)){l=d;break}if((b0[c[(c[d>>2]|0)+36>>2]&255](d)|0)==-1){c[k>>2]=0;l=0;break}else{l=c[k>>2]|0;break}}}while(0);d=(l|0)==0;l=e|0;e=c[l>>2]|0;L390:do{if((e|0)==0){m=314}else{do{if((c[e+12>>2]|0)==(c[e+16>>2]|0)){if((b0[c[(c[e>>2]|0)+36>>2]&255](e)|0)!=-1){break}c[l>>2]=0;m=314;break L390}}while(0);if(d){n=e}else{m=315}}}while(0);if((m|0)==314){if(d){m=315}else{n=0}}if((m|0)==315){c[f>>2]=c[f>>2]|6;o=0;i=j;return o|0}d=c[k>>2]|0;e=c[d+12>>2]|0;if((e|0)==(c[d+16>>2]|0)){p=(b0[c[(c[d>>2]|0)+36>>2]&255](d)|0)&255}else{p=a[e]|0}do{if(p<<24>>24>-1){e=g+8|0;if((b[(c[e>>2]|0)+(p<<24>>24<<1)>>1]&2048)==0){break}d=g;q=(b1[c[(c[d>>2]|0)+36>>2]&63](g,p,0)|0)<<24>>24;r=c[k>>2]|0;s=r+12|0;t=c[s>>2]|0;if((t|0)==(c[r+16>>2]|0)){u=c[(c[r>>2]|0)+40>>2]|0;b0[u&255](r)|0;v=q;w=h;x=n}else{c[s>>2]=t+1;v=q;w=h;x=n}while(1){y=v-48|0;q=w-1|0;t=c[k>>2]|0;do{if((t|0)==0){z=0}else{if((c[t+12>>2]|0)!=(c[t+16>>2]|0)){z=t;break}if((b0[c[(c[t>>2]|0)+36>>2]&255](t)|0)==-1){c[k>>2]=0;z=0;break}else{z=c[k>>2]|0;break}}}while(0);t=(z|0)==0;if((x|0)==0){A=z;B=0}else{do{if((c[x+12>>2]|0)==(c[x+16>>2]|0)){if((b0[c[(c[x>>2]|0)+36>>2]&255](x)|0)!=-1){C=x;break}c[l>>2]=0;C=0}else{C=x}}while(0);A=c[k>>2]|0;B=C}D=(B|0)==0;if(!((t^D)&(q|0)>0)){m=344;break}s=c[A+12>>2]|0;if((s|0)==(c[A+16>>2]|0)){E=(b0[c[(c[A>>2]|0)+36>>2]&255](A)|0)&255}else{E=a[s]|0}if(E<<24>>24<=-1){o=y;m=359;break}if((b[(c[e>>2]|0)+(E<<24>>24<<1)>>1]&2048)==0){o=y;m=360;break}s=((b1[c[(c[d>>2]|0)+36>>2]&63](g,E,0)|0)<<24>>24)+(y*10|0)|0;r=c[k>>2]|0;u=r+12|0;F=c[u>>2]|0;if((F|0)==(c[r+16>>2]|0)){G=c[(c[r>>2]|0)+40>>2]|0;b0[G&255](r)|0;v=s;w=q;x=B;continue}else{c[u>>2]=F+1;v=s;w=q;x=B;continue}}if((m|0)==344){do{if((A|0)==0){H=0}else{if((c[A+12>>2]|0)!=(c[A+16>>2]|0)){H=A;break}if((b0[c[(c[A>>2]|0)+36>>2]&255](A)|0)==-1){c[k>>2]=0;H=0;break}else{H=c[k>>2]|0;break}}}while(0);d=(H|0)==0;L447:do{if(D){m=354}else{do{if((c[B+12>>2]|0)==(c[B+16>>2]|0)){if((b0[c[(c[B>>2]|0)+36>>2]&255](B)|0)!=-1){break}c[l>>2]=0;m=354;break L447}}while(0);if(d){o=y}else{break}i=j;return o|0}}while(0);do{if((m|0)==354){if(d){break}else{o=y}i=j;return o|0}}while(0);c[f>>2]=c[f>>2]|2;o=y;i=j;return o|0}else if((m|0)==359){i=j;return o|0}else if((m|0)==360){i=j;return o|0}}}while(0);c[f>>2]=c[f>>2]|4;o=0;i=j;return o|0}function hU(a){a=a|0;return 2}function hV(a){a=a|0;en(a|0);l_(a);return}function hW(a){a=a|0;en(a|0);return}function hX(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0;j=i;i=i+16|0;k=d;d=i;i=i+4|0;i=i+7>>3<<3;c[d>>2]=c[k>>2];k=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[k>>2];k=j|0;l=j+8|0;c[k>>2]=c[d>>2];c[l>>2]=c[e>>2];hZ(a,b,k,l,f,g,h,7056,7088);i=j;return}function hY(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;k=i;i=i+16|0;l=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[l>>2];l=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[l>>2];l=k|0;m=k+8|0;n=d+8|0;o=b0[c[(c[n>>2]|0)+20>>2]&255](n)|0;c[l>>2]=c[e>>2];c[m>>2]=c[f>>2];f=a[o]|0;if((f&1)==0){p=o+4|0;q=o+4|0}else{e=c[o+8>>2]|0;p=e;q=e}e=f&255;if((e&1|0)==0){r=e>>>1}else{r=c[o+4>>2]|0}hZ(b,d,l,m,g,h,j,q,p+(r<<2)|0);i=k;return}function hZ(a,b,d,e,f,g,h,j,k){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ab=0,ac=0,ad=0,ae=0,af=0,ag=0;l=i;i=i+48|0;m=d;d=i;i=i+4|0;i=i+7>>3<<3;c[d>>2]=c[m>>2];m=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[m>>2];m=l|0;n=l+16|0;o=l+24|0;p=l+32|0;q=l+40|0;fA(n,f);r=n|0;n=c[r>>2]|0;if((c[4848]|0)!=-1){c[m>>2]=19392;c[m+4>>2]=16;c[m+8>>2]=0;e6(19392,m,116)}m=(c[4849]|0)-1|0;s=c[n+8>>2]|0;do{if((c[n+12>>2]|0)-s>>2>>>0>m>>>0){t=c[s+(m<<2)>>2]|0;if((t|0)==0){break}u=t;v=c[r>>2]|0;eL(v)|0;c[g>>2]=0;v=d|0;L483:do{if((j|0)==(k|0)){w=445}else{x=e|0;y=t;z=t;A=t;B=b;C=p|0;D=q|0;E=o|0;F=j;G=0;L485:while(1){H=G;while(1){if((H|0)!=0){w=445;break L483}I=c[v>>2]|0;do{if((I|0)==0){J=0}else{K=c[I+12>>2]|0;if((K|0)==(c[I+16>>2]|0)){L=b0[c[(c[I>>2]|0)+36>>2]&255](I)|0}else{L=c[K>>2]|0}if((L|0)!=-1){J=I;break}c[v>>2]=0;J=0}}while(0);I=(J|0)==0;K=c[x>>2]|0;do{if((K|0)==0){w=397}else{M=c[K+12>>2]|0;if((M|0)==(c[K+16>>2]|0)){N=b0[c[(c[K>>2]|0)+36>>2]&255](K)|0}else{N=c[M>>2]|0}if((N|0)==-1){c[x>>2]=0;w=397;break}else{if(I^(K|0)==0){O=K;break}else{w=399;break L485}}}}while(0);if((w|0)==397){w=0;if(I){w=399;break L485}else{O=0}}if((b1[c[(c[y>>2]|0)+52>>2]&63](u,c[F>>2]|0,0)|0)<<24>>24==37){w=402;break}if(b1[c[(c[z>>2]|0)+12>>2]&63](u,8192,c[F>>2]|0)|0){P=F;w=412;break}Q=J+12|0;K=c[Q>>2]|0;R=J+16|0;if((K|0)==(c[R>>2]|0)){S=b0[c[(c[J>>2]|0)+36>>2]&255](J)|0}else{S=c[K>>2]|0}K=b_[c[(c[A>>2]|0)+28>>2]&63](u,S)|0;if((K|0)==(b_[c[(c[A>>2]|0)+28>>2]&63](u,c[F>>2]|0)|0)){w=440;break}c[g>>2]=4;H=4}L517:do{if((w|0)==440){w=0;H=c[Q>>2]|0;if((H|0)==(c[R>>2]|0)){K=c[(c[J>>2]|0)+40>>2]|0;b0[K&255](J)|0}else{c[Q>>2]=H+4}T=F+4|0}else if((w|0)==412){while(1){w=0;H=P+4|0;if((H|0)==(k|0)){U=k;break}if(b1[c[(c[z>>2]|0)+12>>2]&63](u,8192,c[H>>2]|0)|0){P=H;w=412}else{U=H;break}}I=J;H=O;while(1){do{if((I|0)==0){V=0}else{K=c[I+12>>2]|0;if((K|0)==(c[I+16>>2]|0)){W=b0[c[(c[I>>2]|0)+36>>2]&255](I)|0}else{W=c[K>>2]|0}if((W|0)!=-1){V=I;break}c[v>>2]=0;V=0}}while(0);K=(V|0)==0;do{if((H|0)==0){w=427}else{M=c[H+12>>2]|0;if((M|0)==(c[H+16>>2]|0)){X=b0[c[(c[H>>2]|0)+36>>2]&255](H)|0}else{X=c[M>>2]|0}if((X|0)==-1){c[x>>2]=0;w=427;break}else{if(K^(H|0)==0){Y=H;break}else{T=U;break L517}}}}while(0);if((w|0)==427){w=0;if(K){T=U;break L517}else{Y=0}}M=V+12|0;Z=c[M>>2]|0;_=V+16|0;if((Z|0)==(c[_>>2]|0)){$=b0[c[(c[V>>2]|0)+36>>2]&255](V)|0}else{$=c[Z>>2]|0}if(!(b1[c[(c[z>>2]|0)+12>>2]&63](u,8192,$)|0)){T=U;break L517}Z=c[M>>2]|0;if((Z|0)==(c[_>>2]|0)){_=c[(c[V>>2]|0)+40>>2]|0;b0[_&255](V)|0;I=V;H=Y;continue}else{c[M>>2]=Z+4;I=V;H=Y;continue}}}else if((w|0)==402){w=0;H=F+4|0;if((H|0)==(k|0)){w=403;break L485}I=b1[c[(c[y>>2]|0)+52>>2]&63](u,c[H>>2]|0,0)|0;if((I<<24>>24|0)==69|(I<<24>>24|0)==48){Z=F+8|0;if((Z|0)==(k|0)){w=406;break L485}aa=I;ab=b1[c[(c[y>>2]|0)+52>>2]&63](u,c[Z>>2]|0,0)|0;ac=Z}else{aa=0;ab=I;ac=H}H=c[(c[B>>2]|0)+36>>2]|0;c[C>>2]=J;c[D>>2]=O;b7[H&7](o,b,p,q,f,g,h,ab,aa);c[v>>2]=c[E>>2];T=ac+4|0}}while(0);if((T|0)==(k|0)){w=445;break L483}F=T;G=c[g>>2]|0}if((w|0)==399){c[g>>2]=4;ad=J;break}else if((w|0)==403){c[g>>2]=4;ad=J;break}else if((w|0)==406){c[g>>2]=4;ad=J;break}}}while(0);if((w|0)==445){ad=c[v>>2]|0}u=d|0;do{if((ad|0)!=0){t=c[ad+12>>2]|0;if((t|0)==(c[ad+16>>2]|0)){ae=b0[c[(c[ad>>2]|0)+36>>2]&255](ad)|0}else{ae=c[t>>2]|0}if((ae|0)!=-1){break}c[u>>2]=0}}while(0);v=c[u>>2]|0;t=(v|0)==0;G=e|0;F=c[G>>2]|0;do{if((F|0)==0){w=458}else{E=c[F+12>>2]|0;if((E|0)==(c[F+16>>2]|0)){af=b0[c[(c[F>>2]|0)+36>>2]&255](F)|0}else{af=c[E>>2]|0}if((af|0)==-1){c[G>>2]=0;w=458;break}if(!(t^(F|0)==0)){break}ag=a|0;c[ag>>2]=v;i=l;return}}while(0);do{if((w|0)==458){if(t){break}ag=a|0;c[ag>>2]=v;i=l;return}}while(0);c[g>>2]=c[g>>2]|2;ag=a|0;c[ag>>2]=v;i=l;return}}while(0);l=bO(4)|0;lz(l);bk(l|0,13904,160)}function h_(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;j=i;i=i+32|0;k=d;d=i;i=i+4|0;i=i+7>>3<<3;c[d>>2]=c[k>>2];k=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[k>>2];k=j|0;l=j+8|0;m=j+24|0;fA(m,f);f=m|0;m=c[f>>2]|0;if((c[4848]|0)!=-1){c[l>>2]=19392;c[l+4>>2]=16;c[l+8>>2]=0;e6(19392,l,116)}l=(c[4849]|0)-1|0;n=c[m+8>>2]|0;do{if((c[m+12>>2]|0)-n>>2>>>0>l>>>0){o=c[n+(l<<2)>>2]|0;if((o|0)==0){break}p=o;o=c[f>>2]|0;eL(o)|0;o=c[e>>2]|0;q=b+8|0;r=b0[c[c[q>>2]>>2]&255](q)|0;c[k>>2]=o;o=(g_(d,k,r,r+168|0,p,g,0)|0)-r|0;if((o|0)>=168){s=4;t=0;u=d|0;v=c[u>>2]|0;w=a|0;c[w>>2]=v;i=j;return}c[h+24>>2]=((o|0)/12|0|0)%7|0;s=4;t=0;u=d|0;v=c[u>>2]|0;w=a|0;c[w>>2]=v;i=j;return}}while(0);j=bO(4)|0;lz(j);bk(j|0,13904,160)}function h$(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;j=i;i=i+32|0;k=d;d=i;i=i+4|0;i=i+7>>3<<3;c[d>>2]=c[k>>2];k=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[k>>2];k=j|0;l=j+8|0;m=j+24|0;fA(m,f);f=m|0;m=c[f>>2]|0;if((c[4848]|0)!=-1){c[l>>2]=19392;c[l+4>>2]=16;c[l+8>>2]=0;e6(19392,l,116)}l=(c[4849]|0)-1|0;n=c[m+8>>2]|0;do{if((c[m+12>>2]|0)-n>>2>>>0>l>>>0){o=c[n+(l<<2)>>2]|0;if((o|0)==0){break}p=o;o=c[f>>2]|0;eL(o)|0;o=c[e>>2]|0;q=b+8|0;r=b0[c[(c[q>>2]|0)+4>>2]&255](q)|0;c[k>>2]=o;o=(g_(d,k,r,r+288|0,p,g,0)|0)-r|0;if((o|0)>=288){s=4;t=0;u=d|0;v=c[u>>2]|0;w=a|0;c[w>>2]=v;i=j;return}c[h+16>>2]=((o|0)/12|0|0)%12|0;s=4;t=0;u=d|0;v=c[u>>2]|0;w=a|0;c[w>>2]=v;i=j;return}}while(0);j=bO(4)|0;lz(j);bk(j|0,13904,160)}function h0(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;b=i;i=i+32|0;j=d;d=i;i=i+4|0;i=i+7>>3<<3;c[d>>2]=c[j>>2];j=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[j>>2];j=b|0;k=b+8|0;l=b+24|0;fA(l,f);f=l|0;l=c[f>>2]|0;if((c[4848]|0)!=-1){c[k>>2]=19392;c[k+4>>2]=16;c[k+8>>2]=0;e6(19392,k,116)}k=(c[4849]|0)-1|0;m=c[l+8>>2]|0;do{if((c[l+12>>2]|0)-m>>2>>>0>k>>>0){n=c[m+(k<<2)>>2]|0;if((n|0)==0){break}o=n;n=c[f>>2]|0;eL(n)|0;c[j>>2]=c[e>>2];n=h5(d,j,g,o,4)|0;if((c[g>>2]&4|0)!=0){p=4;q=0;r=d|0;s=c[r>>2]|0;t=a|0;c[t>>2]=s;i=b;return}if((n|0)<69){u=n+2e3|0}else{u=(n-69|0)>>>0<31?n+1900|0:n}c[h+20>>2]=u-1900;p=4;q=0;r=d|0;s=c[r>>2]|0;t=a|0;c[t>>2]=s;i=b;return}}while(0);b=bO(4)|0;lz(b);bk(b|0,13904,160)}function h1(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;a=i;g=d;d=i;i=i+4|0;i=i+7>>3<<3;c[d>>2]=c[g>>2];g=b|0;b=d|0;d=f;L641:while(1){h=c[g>>2]|0;do{if((h|0)==0){j=1}else{k=c[h+12>>2]|0;if((k|0)==(c[h+16>>2]|0)){l=b0[c[(c[h>>2]|0)+36>>2]&255](h)|0}else{l=c[k>>2]|0}if((l|0)==-1){c[g>>2]=0;j=1;break}else{j=(c[g>>2]|0)==0;break}}}while(0);h=c[b>>2]|0;do{if((h|0)==0){m=518}else{k=c[h+12>>2]|0;if((k|0)==(c[h+16>>2]|0)){n=b0[c[(c[h>>2]|0)+36>>2]&255](h)|0}else{n=c[k>>2]|0}if((n|0)==-1){c[b>>2]=0;m=518;break}else{k=(h|0)==0;if(j^k){o=h;p=k;break}else{q=h;r=k;break L641}}}}while(0);if((m|0)==518){m=0;if(j){q=0;r=1;break}else{o=0;p=1}}h=c[g>>2]|0;k=c[h+12>>2]|0;if((k|0)==(c[h+16>>2]|0)){s=b0[c[(c[h>>2]|0)+36>>2]&255](h)|0}else{s=c[k>>2]|0}if(!(b1[c[(c[d>>2]|0)+12>>2]&63](f,8192,s)|0)){q=o;r=p;break}k=c[g>>2]|0;h=k+12|0;t=c[h>>2]|0;if((t|0)==(c[k+16>>2]|0)){u=c[(c[k>>2]|0)+40>>2]|0;b0[u&255](k)|0;continue}else{c[h>>2]=t+4;continue}}p=c[g>>2]|0;do{if((p|0)==0){v=1}else{o=c[p+12>>2]|0;if((o|0)==(c[p+16>>2]|0)){w=b0[c[(c[p>>2]|0)+36>>2]&255](p)|0}else{w=c[o>>2]|0}if((w|0)==-1){c[g>>2]=0;v=1;break}else{v=(c[g>>2]|0)==0;break}}}while(0);do{if(r){m=540}else{g=c[q+12>>2]|0;if((g|0)==(c[q+16>>2]|0)){x=b0[c[(c[q>>2]|0)+36>>2]&255](q)|0}else{x=c[g>>2]|0}if((x|0)==-1){c[b>>2]=0;m=540;break}if(!(v^(q|0)==0)){break}i=a;return}}while(0);do{if((m|0)==540){if(v){break}i=a;return}}while(0);c[e>>2]=c[e>>2]|2;i=a;return}function h2(b,d,e,f,g,h,j,k,l){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ab=0,ac=0,ad=0,ae=0,af=0,ag=0,ah=0,ai=0,aj=0,ak=0,al=0,am=0,an=0;l=i;i=i+328|0;m=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[m>>2];m=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[m>>2];m=l|0;n=l+8|0;o=l+16|0;p=l+24|0;q=l+32|0;r=l+40|0;s=l+48|0;t=l+56|0;u=l+64|0;v=l+72|0;w=l+80|0;x=l+88|0;y=l+96|0;z=l+112|0;A=l+120|0;B=l+128|0;C=l+136|0;D=l+144|0;E=l+152|0;F=l+160|0;G=l+168|0;H=l+176|0;I=l+184|0;J=l+192|0;K=l+200|0;L=l+208|0;M=l+216|0;N=l+224|0;O=l+232|0;P=l+240|0;Q=l+248|0;R=l+256|0;S=l+264|0;T=l+272|0;U=l+280|0;V=l+288|0;W=l+296|0;X=l+304|0;Y=l+312|0;Z=l+320|0;c[h>>2]=0;fA(z,g);_=z|0;z=c[_>>2]|0;if((c[4848]|0)!=-1){c[y>>2]=19392;c[y+4>>2]=16;c[y+8>>2]=0;e6(19392,y,116)}y=(c[4849]|0)-1|0;$=c[z+8>>2]|0;do{if((c[z+12>>2]|0)-$>>2>>>0>y>>>0){aa=c[$+(y<<2)>>2]|0;if((aa|0)==0){break}ab=aa;aa=c[_>>2]|0;eL(aa)|0;aa=k<<24>>24;L706:do{if((aa|0)==97|(aa|0)==65){ac=c[f>>2]|0;ad=d+8|0;ae=b0[c[c[ad>>2]>>2]&255](ad)|0;c[x>>2]=ac;ac=(g_(e,x,ae,ae+168|0,ab,h,0)|0)-ae|0;if((ac|0)>=168){break}c[j+24>>2]=((ac|0)/12|0|0)%7|0}else if((aa|0)==98|(aa|0)==66|(aa|0)==104){ac=c[f>>2]|0;ae=d+8|0;ad=b0[c[(c[ae>>2]|0)+4>>2]&255](ae)|0;c[w>>2]=ac;ac=(g_(e,w,ad,ad+288|0,ab,h,0)|0)-ad|0;if((ac|0)>=288){break}c[j+16>>2]=((ac|0)/12|0|0)%12|0}else if((aa|0)==99){ac=d+8|0;ad=b0[c[(c[ac>>2]|0)+12>>2]&255](ac)|0;ac=e|0;c[B>>2]=c[ac>>2];c[C>>2]=c[f>>2];ae=a[ad]|0;if((ae&1)==0){af=ad+4|0;ag=ad+4|0}else{ah=c[ad+8>>2]|0;af=ah;ag=ah}ah=ae&255;if((ah&1|0)==0){ai=ah>>>1}else{ai=c[ad+4>>2]|0}hZ(A,d,B,C,g,h,j,ag,af+(ai<<2)|0);c[ac>>2]=c[A>>2]}else if((aa|0)==100|(aa|0)==101){ac=j+12|0;c[v>>2]=c[f>>2];ad=h5(e,v,h,ab,2)|0;ah=c[h>>2]|0;do{if((ah&4|0)==0){if((ad-1|0)>>>0>=31){break}c[ac>>2]=ad;break L706}}while(0);c[h>>2]=ah|4}else if((aa|0)==68){ad=e|0;c[E>>2]=c[ad>>2];c[F>>2]=c[f>>2];hZ(D,d,E,F,g,h,j,7024,7056);c[ad>>2]=c[D>>2]}else if((aa|0)==70){ad=e|0;c[H>>2]=c[ad>>2];c[I>>2]=c[f>>2];hZ(G,d,H,I,g,h,j,6888,6920);c[ad>>2]=c[G>>2]}else if((aa|0)==72){c[u>>2]=c[f>>2];ad=h5(e,u,h,ab,2)|0;ac=c[h>>2]|0;if((ac&4|0)==0&(ad|0)<24){c[j+8>>2]=ad;break}else{c[h>>2]=ac|4;break}}else if((aa|0)==73){ac=j+8|0;c[t>>2]=c[f>>2];ad=h5(e,t,h,ab,2)|0;ae=c[h>>2]|0;do{if((ae&4|0)==0){if((ad-1|0)>>>0>=12){break}c[ac>>2]=ad;break L706}}while(0);c[h>>2]=ae|4}else if((aa|0)==106){c[s>>2]=c[f>>2];ad=h5(e,s,h,ab,3)|0;ac=c[h>>2]|0;if((ac&4|0)==0&(ad|0)<366){c[j+28>>2]=ad;break}else{c[h>>2]=ac|4;break}}else if((aa|0)==109){c[r>>2]=c[f>>2];ac=h5(e,r,h,ab,2)|0;ad=c[h>>2]|0;if((ad&4|0)==0&(ac|0)<13){c[j+16>>2]=ac-1;break}else{c[h>>2]=ad|4;break}}else if((aa|0)==77){c[q>>2]=c[f>>2];ad=h5(e,q,h,ab,2)|0;ac=c[h>>2]|0;if((ac&4|0)==0&(ad|0)<60){c[j+4>>2]=ad;break}else{c[h>>2]=ac|4;break}}else if((aa|0)==110|(aa|0)==116){c[J>>2]=c[f>>2];h1(0,e,J,h,ab)}else if((aa|0)==112){c[K>>2]=c[f>>2];h3(d,j+8|0,e,K,h,ab)}else if((aa|0)==114){ac=e|0;c[M>>2]=c[ac>>2];c[N>>2]=c[f>>2];hZ(L,d,M,N,g,h,j,6976,7020);c[ac>>2]=c[L>>2]}else if((aa|0)==82){ac=e|0;c[P>>2]=c[ac>>2];c[Q>>2]=c[f>>2];hZ(O,d,P,Q,g,h,j,6952,6972);c[ac>>2]=c[O>>2]}else if((aa|0)==83){c[p>>2]=c[f>>2];ac=h5(e,p,h,ab,2)|0;ad=c[h>>2]|0;if((ad&4|0)==0&(ac|0)<61){c[j>>2]=ac;break}else{c[h>>2]=ad|4;break}}else if((aa|0)==84){ad=e|0;c[S>>2]=c[ad>>2];c[T>>2]=c[f>>2];hZ(R,d,S,T,g,h,j,6920,6952);c[ad>>2]=c[R>>2]}else if((aa|0)==119){c[o>>2]=c[f>>2];ad=h5(e,o,h,ab,1)|0;ac=c[h>>2]|0;if((ac&4|0)==0&(ad|0)<7){c[j+24>>2]=ad;break}else{c[h>>2]=ac|4;break}}else if((aa|0)==120){ac=c[(c[d>>2]|0)+20>>2]|0;c[U>>2]=c[e>>2];c[V>>2]=c[f>>2];bX[ac&127](b,d,U,V,g,h,j);i=l;return}else if((aa|0)==88){ac=d+8|0;ad=b0[c[(c[ac>>2]|0)+24>>2]&255](ac)|0;ac=e|0;c[X>>2]=c[ac>>2];c[Y>>2]=c[f>>2];ah=a[ad]|0;if((ah&1)==0){aj=ad+4|0;ak=ad+4|0}else{al=c[ad+8>>2]|0;aj=al;ak=al}al=ah&255;if((al&1|0)==0){am=al>>>1}else{am=c[ad+4>>2]|0}hZ(W,d,X,Y,g,h,j,ak,aj+(am<<2)|0);c[ac>>2]=c[W>>2]}else if((aa|0)==121){c[n>>2]=c[f>>2];ac=h5(e,n,h,ab,4)|0;if((c[h>>2]&4|0)!=0){break}if((ac|0)<69){an=ac+2e3|0}else{an=(ac-69|0)>>>0<31?ac+1900|0:ac}c[j+20>>2]=an-1900}else if((aa|0)==89){c[m>>2]=c[f>>2];ac=h5(e,m,h,ab,4)|0;if((c[h>>2]&4|0)!=0){break}c[j+20>>2]=ac-1900}else if((aa|0)==37){c[Z>>2]=c[f>>2];h4(0,e,Z,h,ab)}else{c[h>>2]=c[h>>2]|4}}while(0);c[b>>2]=c[e>>2];i=l;return}}while(0);l=bO(4)|0;lz(l);bk(l|0,13904,160)}function h3(a,b,e,f,g,h){a=a|0;b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0;j=i;i=i+8|0;k=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[k>>2];k=j|0;l=a+8|0;a=b0[c[(c[l>>2]|0)+8>>2]&255](l)|0;l=d[a]|0;if((l&1|0)==0){m=l>>>1}else{m=c[a+4>>2]|0}l=d[a+12|0]|0;if((l&1|0)==0){n=l>>>1}else{n=c[a+16>>2]|0}if((m|0)==(-n|0)){c[g>>2]=c[g>>2]|4;i=j;return}c[k>>2]=c[f>>2];f=g_(e,k,a,a+24|0,h,g,0)|0;g=f-a|0;do{if((f|0)==(a|0)){if((c[b>>2]|0)!=12){break}c[b>>2]=0;i=j;return}}while(0);if((g|0)!=12){i=j;return}g=c[b>>2]|0;if((g|0)>=12){i=j;return}c[b>>2]=g+12;i=j;return}function h4(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;a=i;g=d;d=i;i=i+4|0;i=i+7>>3<<3;c[d>>2]=c[g>>2];g=b|0;b=c[g>>2]|0;do{if((b|0)==0){h=1}else{j=c[b+12>>2]|0;if((j|0)==(c[b+16>>2]|0)){k=b0[c[(c[b>>2]|0)+36>>2]&255](b)|0}else{k=c[j>>2]|0}if((k|0)==-1){c[g>>2]=0;h=1;break}else{h=(c[g>>2]|0)==0;break}}}while(0);k=d|0;d=c[k>>2]|0;do{if((d|0)==0){l=653}else{b=c[d+12>>2]|0;if((b|0)==(c[d+16>>2]|0)){m=b0[c[(c[d>>2]|0)+36>>2]&255](d)|0}else{m=c[b>>2]|0}if((m|0)==-1){c[k>>2]=0;l=653;break}else{b=(d|0)==0;if(h^b){n=d;o=b;break}else{l=655;break}}}}while(0);if((l|0)==653){if(h){l=655}else{n=0;o=1}}if((l|0)==655){c[e>>2]=c[e>>2]|6;i=a;return}h=c[g>>2]|0;d=c[h+12>>2]|0;if((d|0)==(c[h+16>>2]|0)){p=b0[c[(c[h>>2]|0)+36>>2]&255](h)|0}else{p=c[d>>2]|0}if((b1[c[(c[f>>2]|0)+52>>2]&63](f,p,0)|0)<<24>>24!=37){c[e>>2]=c[e>>2]|4;i=a;return}p=c[g>>2]|0;f=p+12|0;d=c[f>>2]|0;if((d|0)==(c[p+16>>2]|0)){h=c[(c[p>>2]|0)+40>>2]|0;b0[h&255](p)|0}else{c[f>>2]=d+4}d=c[g>>2]|0;do{if((d|0)==0){q=1}else{f=c[d+12>>2]|0;if((f|0)==(c[d+16>>2]|0)){r=b0[c[(c[d>>2]|0)+36>>2]&255](d)|0}else{r=c[f>>2]|0}if((r|0)==-1){c[g>>2]=0;q=1;break}else{q=(c[g>>2]|0)==0;break}}}while(0);do{if(o){l=677}else{g=c[n+12>>2]|0;if((g|0)==(c[n+16>>2]|0)){s=b0[c[(c[n>>2]|0)+36>>2]&255](n)|0}else{s=c[g>>2]|0}if((s|0)==-1){c[k>>2]=0;l=677;break}if(!(q^(n|0)==0)){break}i=a;return}}while(0);do{if((l|0)==677){if(q){break}i=a;return}}while(0);c[e>>2]=c[e>>2]|2;i=a;return}function h5(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0;g=i;h=b;b=i;i=i+4|0;i=i+7>>3<<3;c[b>>2]=c[h>>2];h=a|0;a=c[h>>2]|0;do{if((a|0)==0){j=1}else{k=c[a+12>>2]|0;if((k|0)==(c[a+16>>2]|0)){l=b0[c[(c[a>>2]|0)+36>>2]&255](a)|0}else{l=c[k>>2]|0}if((l|0)==-1){c[h>>2]=0;j=1;break}else{j=(c[h>>2]|0)==0;break}}}while(0);l=b|0;b=c[l>>2]|0;do{if((b|0)==0){m=699}else{a=c[b+12>>2]|0;if((a|0)==(c[b+16>>2]|0)){n=b0[c[(c[b>>2]|0)+36>>2]&255](b)|0}else{n=c[a>>2]|0}if((n|0)==-1){c[l>>2]=0;m=699;break}else{if(j^(b|0)==0){o=b;break}else{m=701;break}}}}while(0);if((m|0)==699){if(j){m=701}else{o=0}}if((m|0)==701){c[d>>2]=c[d>>2]|6;p=0;i=g;return p|0}j=c[h>>2]|0;b=c[j+12>>2]|0;if((b|0)==(c[j+16>>2]|0)){q=b0[c[(c[j>>2]|0)+36>>2]&255](j)|0}else{q=c[b>>2]|0}b=e;if(!(b1[c[(c[b>>2]|0)+12>>2]&63](e,2048,q)|0)){c[d>>2]=c[d>>2]|4;p=0;i=g;return p|0}j=e;n=(b1[c[(c[j>>2]|0)+52>>2]&63](e,q,0)|0)<<24>>24;q=c[h>>2]|0;a=q+12|0;k=c[a>>2]|0;if((k|0)==(c[q+16>>2]|0)){r=c[(c[q>>2]|0)+40>>2]|0;b0[r&255](q)|0;s=n;t=f;u=o}else{c[a>>2]=k+4;s=n;t=f;u=o}while(1){v=s-48|0;o=t-1|0;f=c[h>>2]|0;do{if((f|0)==0){w=0}else{n=c[f+12>>2]|0;if((n|0)==(c[f+16>>2]|0)){x=b0[c[(c[f>>2]|0)+36>>2]&255](f)|0}else{x=c[n>>2]|0}if((x|0)==-1){c[h>>2]=0;w=0;break}else{w=c[h>>2]|0;break}}}while(0);f=(w|0)==0;if((u|0)==0){y=w;z=0}else{n=c[u+12>>2]|0;if((n|0)==(c[u+16>>2]|0)){A=b0[c[(c[u>>2]|0)+36>>2]&255](u)|0}else{A=c[n>>2]|0}if((A|0)==-1){c[l>>2]=0;B=0}else{B=u}y=c[h>>2]|0;z=B}C=(z|0)==0;if(!((f^C)&(o|0)>0)){break}f=c[y+12>>2]|0;if((f|0)==(c[y+16>>2]|0)){D=b0[c[(c[y>>2]|0)+36>>2]&255](y)|0}else{D=c[f>>2]|0}if(!(b1[c[(c[b>>2]|0)+12>>2]&63](e,2048,D)|0)){p=v;m=749;break}f=((b1[c[(c[j>>2]|0)+52>>2]&63](e,D,0)|0)<<24>>24)+(v*10|0)|0;n=c[h>>2]|0;k=n+12|0;a=c[k>>2]|0;if((a|0)==(c[n+16>>2]|0)){q=c[(c[n>>2]|0)+40>>2]|0;b0[q&255](n)|0;s=f;t=o;u=z;continue}else{c[k>>2]=a+4;s=f;t=o;u=z;continue}}if((m|0)==749){i=g;return p|0}do{if((y|0)==0){E=1}else{u=c[y+12>>2]|0;if((u|0)==(c[y+16>>2]|0)){F=b0[c[(c[y>>2]|0)+36>>2]&255](y)|0}else{F=c[u>>2]|0}if((F|0)==-1){c[h>>2]=0;E=1;break}else{E=(c[h>>2]|0)==0;break}}}while(0);do{if(C){m=745}else{h=c[z+12>>2]|0;if((h|0)==(c[z+16>>2]|0)){G=b0[c[(c[z>>2]|0)+36>>2]&255](z)|0}else{G=c[h>>2]|0}if((G|0)==-1){c[l>>2]=0;m=745;break}if(E^(z|0)==0){p=v}else{break}i=g;return p|0}}while(0);do{if((m|0)==745){if(E){break}else{p=v}i=g;return p|0}}while(0);c[d>>2]=c[d>>2]|2;p=v;i=g;return p|0}function h6(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;g=i;i=i+112|0;f=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[f>>2];f=g|0;l=g+8|0;m=l|0;n=f|0;a[n]=37;o=f+1|0;a[o]=j;p=f+2|0;a[p]=k;a[f+3|0]=0;if(k<<24>>24!=0){a[o]=k;a[p]=j}j=bj(m|0,100,n|0,h|0,c[d+8>>2]|0)|0;d=l+j|0;l=c[e>>2]|0;if((j|0)==0){q=l;r=b|0;c[r>>2]=q;i=g;return}else{s=l;t=m}while(1){m=a[t]|0;if((s|0)==0){u=0}else{l=s+24|0;j=c[l>>2]|0;if((j|0)==(c[s+28>>2]|0)){v=b_[c[(c[s>>2]|0)+52>>2]&63](s,m&255)|0}else{c[l>>2]=j+1;a[j]=m;v=m&255}u=(v|0)==-1?0:s}m=t+1|0;if((m|0)==(d|0)){q=u;break}else{s=u;t=m}}r=b|0;c[r>>2]=q;i=g;return}function h7(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;f=i;i=i+408|0;e=d;d=i;i=i+4|0;i=i+7>>3<<3;c[d>>2]=c[e>>2];e=f|0;k=f+400|0;l=e|0;c[k>>2]=e+400;iZ(b+8|0,l,k,g,h,j);j=c[k>>2]|0;k=c[d>>2]|0;if((l|0)==(j|0)){m=k;n=a|0;c[n>>2]=m;i=f;return}else{o=k;p=l}while(1){l=c[p>>2]|0;if((o|0)==0){q=0}else{k=o+24|0;d=c[k>>2]|0;if((d|0)==(c[o+28>>2]|0)){r=b_[c[(c[o>>2]|0)+52>>2]&63](o,l)|0}else{c[k>>2]=d+4;c[d>>2]=l;r=l}q=(r|0)==-1?0:o}l=p+4|0;if((l|0)==(j|0)){m=q;break}else{o=q;p=l}}n=a|0;c[n>>2]=m;i=f;return}function h8(a){a=a|0;var b=0;b=c[a+8>>2]|0;if((b|0)!=0){a6(b|0)}en(a|0);l_(a);return}function h9(a){a=a|0;var b=0;b=c[a+8>>2]|0;if((b|0)!=0){a6(b|0)}en(a|0);return}function ia(a){a=a|0;var b=0;b=c[a+8>>2]|0;if((b|0)!=0){a6(b|0)}en(a|0);l_(a);return}function ib(a){a=a|0;var b=0;b=c[a+8>>2]|0;if((b|0)!=0){a6(b|0)}en(a|0);return}function ic(a){a=a|0;return 127}function id(a){a=a|0;return 127}function ie(a){a=a|0;return 0}function ig(a){a=a|0;return 127}function ih(a){a=a|0;return 127}function ii(a){a=a|0;return 0}function ij(a){a=a|0;return 2147483647}function ik(a){a=a|0;return 2147483647}function il(a){a=a|0;return 0}function im(a){a=a|0;return 2147483647}function io(a){a=a|0;return 2147483647}function ip(a){a=a|0;return 0}function iq(a){a=a|0;return}function ir(b,c){b=b|0;c=c|0;c=b;C=67109634;a[c]=C&255;C=C>>8;a[c+1|0]=C&255;C=C>>8;a[c+2|0]=C&255;C=C>>8;a[c+3|0]=C&255;return}function is(b,c){b=b|0;c=c|0;c=b;C=67109634;a[c]=C&255;C=C>>8;a[c+1|0]=C&255;C=C>>8;a[c+2|0]=C&255;C=C>>8;a[c+3|0]=C&255;return}function it(b,c){b=b|0;c=c|0;c=b;C=67109634;a[c]=C&255;C=C>>8;a[c+1|0]=C&255;C=C>>8;a[c+2|0]=C&255;C=C>>8;a[c+3|0]=C&255;return}function iu(b,c){b=b|0;c=c|0;c=b;C=67109634;a[c]=C&255;C=C>>8;a[c+1|0]=C&255;C=C>>8;a[c+2|0]=C&255;C=C>>8;a[c+3|0]=C&255;return}function iv(b,c){b=b|0;c=c|0;c=b;C=67109634;a[c]=C&255;C=C>>8;a[c+1|0]=C&255;C=C>>8;a[c+2|0]=C&255;C=C>>8;a[c+3|0]=C&255;return}function iw(b,c){b=b|0;c=c|0;c=b;C=67109634;a[c]=C&255;C=C>>8;a[c+1|0]=C&255;C=C>>8;a[c+2|0]=C&255;C=C>>8;a[c+3|0]=C&255;return}function ix(b,c){b=b|0;c=c|0;c=b;C=67109634;a[c]=C&255;C=C>>8;a[c+1|0]=C&255;C=C>>8;a[c+2|0]=C&255;C=C>>8;a[c+3|0]=C&255;return}function iy(b,c){b=b|0;c=c|0;c=b;C=67109634;a[c]=C&255;C=C>>8;a[c+1|0]=C&255;C=C>>8;a[c+2|0]=C&255;C=C>>8;a[c+3|0]=C&255;return}function iz(a){a=a|0;en(a|0);l_(a);return}function iA(a){a=a|0;en(a|0);return}function iB(a,b){a=a|0;b=b|0;l6(a|0,0,12);return}function iC(a,b){a=a|0;b=b|0;l6(a|0,0,12);return}function iD(a,b){a=a|0;b=b|0;l6(a|0,0,12);return}function iE(a,b){a=a|0;b=b|0;fa(a,1,45);return}function iF(a){a=a|0;en(a|0);l_(a);return}function iG(a){a=a|0;en(a|0);return}function iH(a,b){a=a|0;b=b|0;l6(a|0,0,12);return}function iI(a,b){a=a|0;b=b|0;l6(a|0,0,12);return}function iJ(a,b){a=a|0;b=b|0;l6(a|0,0,12);return}function iK(a,b){a=a|0;b=b|0;fa(a,1,45);return}function iL(a){a=a|0;en(a|0);l_(a);return}function iM(a){a=a|0;en(a|0);return}function iN(a,b){a=a|0;b=b|0;l6(a|0,0,12);return}function iO(a,b){a=a|0;b=b|0;l6(a|0,0,12);return}function iP(a,b){a=a|0;b=b|0;l6(a|0,0,12);return}function iQ(a,b){a=a|0;b=b|0;ff(a,1,45);return}function iR(a){a=a|0;en(a|0);l_(a);return}function iS(a){a=a|0;en(a|0);return}function iT(a,b){a=a|0;b=b|0;l6(a|0,0,12);return}function iU(a,b){a=a|0;b=b|0;l6(a|0,0,12);return}function iV(a,b){a=a|0;b=b|0;l6(a|0,0,12);return}function iW(a,b){a=a|0;b=b|0;ff(a,1,45);return}function iX(a){a=a|0;en(a|0);l_(a);return}function iY(a){a=a|0;en(a|0);return}function iZ(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;j=i;i=i+120|0;k=j|0;l=j+112|0;m=i;i=i+4|0;i=i+7>>3<<3;n=j+8|0;o=k|0;a[o]=37;p=k+1|0;a[p]=g;q=k+2|0;a[q]=h;a[k+3|0]=0;if(h<<24>>24!=0){a[p]=h;a[q]=g}g=b|0;bj(n|0,100,o|0,f|0,c[g>>2]|0)|0;c[l>>2]=0;c[l+4>>2]=0;c[m>>2]=n;n=(c[e>>2]|0)-d>>2;f=bC(c[g>>2]|0)|0;g=lm(d,m,n,l)|0;if((f|0)!=0){bC(f|0)|0}if((g|0)==-1){i3(1104)}else{c[e>>2]=d+(g<<2);i=j;return}}function i_(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0;d=i;i=i+280|0;l=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[l>>2];l=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[l>>2];l=d|0;m=d+16|0;n=d+120|0;o=d+128|0;p=d+136|0;q=d+144|0;r=d+152|0;s=d+160|0;t=d+176|0;u=n|0;c[u>>2]=m;v=n+4|0;c[v>>2]=202;w=m+100|0;fA(p,h);m=p|0;x=c[m>>2]|0;if((c[4850]|0)!=-1){c[l>>2]=19400;c[l+4>>2]=16;c[l+8>>2]=0;e6(19400,l,116)}l=(c[4851]|0)-1|0;y=c[x+8>>2]|0;do{if((c[x+12>>2]|0)-y>>2>>>0>l>>>0){z=c[y+(l<<2)>>2]|0;if((z|0)==0){break}A=z;a[q]=0;C=f|0;c[r>>2]=c[C>>2];do{if(i$(e,r,g,p,c[h+4>>2]|0,j,q,A,n,o,w)|0){D=s|0;E=c[(c[z>>2]|0)+32>>2]|0;ca[E&15](A,6872,6882,D)|0;E=t|0;F=c[o>>2]|0;G=c[u>>2]|0;H=F-G|0;do{if((H|0)>98){I=lR(H+2|0)|0;if((I|0)!=0){J=I;K=I;break}l4();J=0;K=0}else{J=E;K=0}}while(0);if((a[q]&1)==0){L=J}else{a[J]=45;L=J+1|0}if(G>>>0<F>>>0){H=s+10|0;I=s;M=L;N=G;while(1){O=a[N]|0;P=D;while(1){Q=P+1|0;if((a[P]|0)==O<<24>>24){R=P;break}if((Q|0)==(H|0)){R=H;break}else{P=Q}}a[M]=a[6872+(R-I)|0]|0;P=N+1|0;O=M+1|0;if(P>>>0<(c[o>>2]|0)>>>0){M=O;N=P}else{S=O;break}}}else{S=L}a[S]=0;if((bE(E|0,2056,(B=i,i=i+8|0,c[B>>2]=k,B)|0)|0)==1){if((K|0)==0){break}lS(K);break}N=bO(8)|0;eQ(N,1976);bk(N|0,13920,26)}}while(0);A=e|0;z=c[A>>2]|0;do{if((z|0)==0){T=0}else{if((c[z+12>>2]|0)!=(c[z+16>>2]|0)){T=z;break}if((b0[c[(c[z>>2]|0)+36>>2]&255](z)|0)!=-1){T=z;break}c[A>>2]=0;T=0}}while(0);A=(T|0)==0;z=c[C>>2]|0;do{if((z|0)==0){U=897}else{if((c[z+12>>2]|0)!=(c[z+16>>2]|0)){if(A){break}else{U=899;break}}if((b0[c[(c[z>>2]|0)+36>>2]&255](z)|0)==-1){c[C>>2]=0;U=897;break}else{if(A^(z|0)==0){break}else{U=899;break}}}}while(0);if((U|0)==897){if(A){U=899}}if((U|0)==899){c[j>>2]=c[j>>2]|2}c[b>>2]=T;z=c[m>>2]|0;eL(z)|0;z=c[u>>2]|0;c[u>>2]=0;if((z|0)==0){i=d;return}bY[c[v>>2]&511](z);i=d;return}}while(0);d=bO(4)|0;lz(d);bk(d|0,13904,160)}function i$(e,f,g,h,j,k,l,m,n,o,p){e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;var q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ab=0,ac=0,ad=0,ae=0,af=0,ag=0,ah=0,ai=0,aj=0,ak=0,al=0,am=0,an=0,ao=0,ap=0,aq=0,ar=0,as=0,at=0,au=0,av=0,aw=0,ax=0,ay=0,az=0,aA=0,aB=0,aC=0,aD=0,aE=0,aF=0,aG=0,aH=0,aI=0,aJ=0,aK=0,aL=0,aM=0,aN=0,aO=0,aP=0,aQ=0,aR=0,aS=0,aT=0,aU=0,aV=0,aW=0,aX=0,aY=0,aZ=0,a_=0,a$=0,a0=0,a1=0,a2=0,a3=0,a4=0,a5=0,a6=0,a7=0,a8=0,a9=0,ba=0,bb=0,bc=0,bd=0,be=0,bf=0,bg=0,bh=0,bi=0,bj=0,bk=0,bl=0,bm=0,bn=0,bo=0,bp=0,bq=0,br=0,bs=0,bt=0,bu=0,bv=0,bw=0,bx=0,by=0,bz=0,bA=0,bB=0,bC=0,bD=0,bE=0,bF=0;q=i;i=i+440|0;r=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[r>>2];r=q|0;s=q+400|0;t=q+408|0;u=q+416|0;v=q+424|0;w=v;x=i;i=i+12|0;i=i+7>>3<<3;y=i;i=i+12|0;i=i+7>>3<<3;z=i;i=i+12|0;i=i+7>>3<<3;A=i;i=i+12|0;i=i+7>>3<<3;B=i;i=i+4|0;i=i+7>>3<<3;C=i;i=i+4|0;i=i+7>>3<<3;D=r|0;c[s>>2]=0;l6(w|0,0,12);E=x;F=y;G=z;H=A;l6(E|0,0,12);l6(F|0,0,12);l6(G|0,0,12);l6(H|0,0,12);i5(g,h,s,t,u,v,x,y,z,B);h=n|0;c[o>>2]=c[h>>2];g=e|0;e=f|0;f=s;s=m+8|0;m=z+1|0;I=z+4|0;J=z+8|0;K=y+1|0;L=y+4|0;M=y+8|0;N=(j&512|0)!=0;j=x+1|0;O=x+4|0;P=x+8|0;Q=A+1|0;R=A+4|0;S=A+8|0;T=f+3|0;U=n+4|0;n=v+4|0;V=p;p=202;W=D;X=D;D=r+400|0;r=0;Y=0;L1136:while(1){Z=c[g>>2]|0;do{if((Z|0)==0){_=0}else{if((c[Z+12>>2]|0)!=(c[Z+16>>2]|0)){_=Z;break}if((b0[c[(c[Z>>2]|0)+36>>2]&255](Z)|0)==-1){c[g>>2]=0;_=0;break}else{_=c[g>>2]|0;break}}}while(0);Z=(_|0)==0;$=c[e>>2]|0;do{if(($|0)==0){aa=924}else{if((c[$+12>>2]|0)!=(c[$+16>>2]|0)){if(Z){ab=$;break}else{ac=p;ad=W;ae=X;af=r;aa=1176;break L1136}}if((b0[c[(c[$>>2]|0)+36>>2]&255]($)|0)==-1){c[e>>2]=0;aa=924;break}else{if(Z){ab=$;break}else{ac=p;ad=W;ae=X;af=r;aa=1176;break L1136}}}}while(0);if((aa|0)==924){aa=0;if(Z){ac=p;ad=W;ae=X;af=r;aa=1176;break}else{ab=0}}$=a[f+Y|0]|0;do{if(($|0)==1){if((Y|0)==3){ac=p;ad=W;ae=X;af=r;aa=1176;break L1136}ag=c[g>>2]|0;ah=c[ag+12>>2]|0;if((ah|0)==(c[ag+16>>2]|0)){ai=(b0[c[(c[ag>>2]|0)+36>>2]&255](ag)|0)&255}else{ai=a[ah]|0}if(ai<<24>>24<=-1){aa=949;break L1136}if((b[(c[s>>2]|0)+(ai<<24>>24<<1)>>1]&8192)==0){aa=949;break L1136}ah=c[g>>2]|0;ag=ah+12|0;aj=c[ag>>2]|0;if((aj|0)==(c[ah+16>>2]|0)){ak=(b0[c[(c[ah>>2]|0)+40>>2]&255](ah)|0)&255}else{c[ag>>2]=aj+1;ak=a[aj]|0}e2(A,ak);aa=950}else if(($|0)==0){aa=950}else if(($|0)==2){if(!((r|0)!=0|Y>>>0<2)){if((Y|0)==2){al=(a[T]|0)!=0}else{al=0}if(!(N|al)){am=0;an=D;ao=X;ap=W;aq=p;ar=V;break}}aj=a[E]|0;ag=(aj&1)==0?j:c[P>>2]|0;L1180:do{if((Y|0)==0){as=ag}else{if((d[f+(Y-1)|0]|0)>=2){as=ag;break}ah=aj&255;at=ag+((ah&1|0)==0?ah>>>1:c[O>>2]|0)|0;ah=ag;while(1){if((ah|0)==(at|0)){au=at;break}av=a[ah]|0;if(av<<24>>24<=-1){au=ah;break}if((b[(c[s>>2]|0)+(av<<24>>24<<1)>>1]&8192)==0){au=ah;break}else{ah=ah+1|0}}ah=au-ag|0;at=a[H]|0;av=at&255;aw=(av&1|0)==0?av>>>1:c[R>>2]|0;if(ah>>>0>aw>>>0){as=ag;break}av=(at&1)==0?Q:c[S>>2]|0;at=av+aw|0;if((au|0)==(ag|0)){as=ag;break}ax=ag;ay=av+(aw-ah)|0;while(1){if((a[ay]|0)!=(a[ax]|0)){as=ag;break L1180}ah=ay+1|0;if((ah|0)==(at|0)){as=au;break}else{ax=ax+1|0;ay=ah}}}}while(0);ay=aj&255;L1194:do{if((as|0)==(ag+((ay&1|0)==0?ay>>>1:c[O>>2]|0)|0)){az=as}else{ax=ab;at=as;while(1){ah=c[g>>2]|0;do{if((ah|0)==0){aA=0}else{if((c[ah+12>>2]|0)!=(c[ah+16>>2]|0)){aA=ah;break}if((b0[c[(c[ah>>2]|0)+36>>2]&255](ah)|0)==-1){c[g>>2]=0;aA=0;break}else{aA=c[g>>2]|0;break}}}while(0);ah=(aA|0)==0;do{if((ax|0)==0){aa=1045}else{if((c[ax+12>>2]|0)!=(c[ax+16>>2]|0)){if(ah){aB=ax;break}else{az=at;break L1194}}if((b0[c[(c[ax>>2]|0)+36>>2]&255](ax)|0)==-1){c[e>>2]=0;aa=1045;break}else{if(ah){aB=ax;break}else{az=at;break L1194}}}}while(0);if((aa|0)==1045){aa=0;if(ah){az=at;break L1194}else{aB=0}}aw=c[g>>2]|0;av=c[aw+12>>2]|0;if((av|0)==(c[aw+16>>2]|0)){aC=(b0[c[(c[aw>>2]|0)+36>>2]&255](aw)|0)&255}else{aC=a[av]|0}if(aC<<24>>24!=(a[at]|0)){az=at;break L1194}av=c[g>>2]|0;aw=av+12|0;aD=c[aw>>2]|0;if((aD|0)==(c[av+16>>2]|0)){aE=c[(c[av>>2]|0)+40>>2]|0;b0[aE&255](av)|0}else{c[aw>>2]=aD+1}aD=at+1|0;aw=a[E]|0;av=aw&255;if((aD|0)==(((aw&1)==0?j:c[P>>2]|0)+((av&1|0)==0?av>>>1:c[O>>2]|0)|0)){az=aD;break}else{ax=aB;at=aD}}}}while(0);if(!N){am=r;an=D;ao=X;ap=W;aq=p;ar=V;break}ay=a[E]|0;ag=ay&255;if((az|0)==(((ay&1)==0?j:c[P>>2]|0)+((ag&1|0)==0?ag>>>1:c[O>>2]|0)|0)){am=r;an=D;ao=X;ap=W;aq=p;ar=V}else{aa=1058;break L1136}}else if(($|0)==3){ag=a[F]|0;ay=ag&255;aj=(ay&1|0)==0?ay>>>1:c[L>>2]|0;ay=a[G]|0;at=ay&255;ax=(at&1|0)==0?at>>>1:c[I>>2]|0;if((aj|0)==(-ax|0)){am=r;an=D;ao=X;ap=W;aq=p;ar=V;break}at=(aj|0)==0;aj=c[g>>2]|0;aD=c[aj+12>>2]|0;av=c[aj+16>>2]|0;aw=(aD|0)==(av|0);if(!(at|(ax|0)==0)){if(aw){ax=(b0[c[(c[aj>>2]|0)+36>>2]&255](aj)|0)&255;aE=c[g>>2]|0;aF=ax;aG=a[F]|0;aH=aE;aI=c[aE+12>>2]|0;aJ=c[aE+16>>2]|0}else{aF=a[aD]|0;aG=ag;aH=aj;aI=aD;aJ=av}av=aH+12|0;aE=(aI|0)==(aJ|0);if(aF<<24>>24==(a[(aG&1)==0?K:c[M>>2]|0]|0)){if(aE){ax=c[(c[aH>>2]|0)+40>>2]|0;b0[ax&255](aH)|0}else{c[av>>2]=aI+1}av=d[F]|0;am=((av&1|0)==0?av>>>1:c[L>>2]|0)>>>0>1?y:r;an=D;ao=X;ap=W;aq=p;ar=V;break}if(aE){aK=(b0[c[(c[aH>>2]|0)+36>>2]&255](aH)|0)&255}else{aK=a[aI]|0}if(aK<<24>>24!=(a[(a[G]&1)==0?m:c[J>>2]|0]|0)){aa=1016;break L1136}aE=c[g>>2]|0;av=aE+12|0;ax=c[av>>2]|0;if((ax|0)==(c[aE+16>>2]|0)){aL=c[(c[aE>>2]|0)+40>>2]|0;b0[aL&255](aE)|0}else{c[av>>2]=ax+1}a[l]=1;ax=d[G]|0;am=((ax&1|0)==0?ax>>>1:c[I>>2]|0)>>>0>1?z:r;an=D;ao=X;ap=W;aq=p;ar=V;break}if(at){if(aw){at=(b0[c[(c[aj>>2]|0)+36>>2]&255](aj)|0)&255;aM=at;aN=a[G]|0}else{aM=a[aD]|0;aN=ay}if(aM<<24>>24!=(a[(aN&1)==0?m:c[J>>2]|0]|0)){am=r;an=D;ao=X;ap=W;aq=p;ar=V;break}ay=c[g>>2]|0;at=ay+12|0;ax=c[at>>2]|0;if((ax|0)==(c[ay+16>>2]|0)){av=c[(c[ay>>2]|0)+40>>2]|0;b0[av&255](ay)|0}else{c[at>>2]=ax+1}a[l]=1;ax=d[G]|0;am=((ax&1|0)==0?ax>>>1:c[I>>2]|0)>>>0>1?z:r;an=D;ao=X;ap=W;aq=p;ar=V;break}if(aw){aw=(b0[c[(c[aj>>2]|0)+36>>2]&255](aj)|0)&255;aO=aw;aP=a[F]|0}else{aO=a[aD]|0;aP=ag}if(aO<<24>>24!=(a[(aP&1)==0?K:c[M>>2]|0]|0)){a[l]=1;am=r;an=D;ao=X;ap=W;aq=p;ar=V;break}ag=c[g>>2]|0;aD=ag+12|0;aw=c[aD>>2]|0;if((aw|0)==(c[ag+16>>2]|0)){aj=c[(c[ag>>2]|0)+40>>2]|0;b0[aj&255](ag)|0}else{c[aD>>2]=aw+1}aw=d[F]|0;am=((aw&1|0)==0?aw>>>1:c[L>>2]|0)>>>0>1?y:r;an=D;ao=X;ap=W;aq=p;ar=V}else if(($|0)==4){aw=0;aD=D;ag=X;aj=W;ax=p;at=V;L1281:while(1){ay=c[g>>2]|0;do{if((ay|0)==0){aQ=0}else{if((c[ay+12>>2]|0)!=(c[ay+16>>2]|0)){aQ=ay;break}if((b0[c[(c[ay>>2]|0)+36>>2]&255](ay)|0)==-1){c[g>>2]=0;aQ=0;break}else{aQ=c[g>>2]|0;break}}}while(0);ay=(aQ|0)==0;av=c[e>>2]|0;do{if((av|0)==0){aa=1071}else{if((c[av+12>>2]|0)!=(c[av+16>>2]|0)){if(ay){break}else{break L1281}}if((b0[c[(c[av>>2]|0)+36>>2]&255](av)|0)==-1){c[e>>2]=0;aa=1071;break}else{if(ay){break}else{break L1281}}}}while(0);if((aa|0)==1071){aa=0;if(ay){break}}av=c[g>>2]|0;aE=c[av+12>>2]|0;if((aE|0)==(c[av+16>>2]|0)){aR=(b0[c[(c[av>>2]|0)+36>>2]&255](av)|0)&255}else{aR=a[aE]|0}do{if(aR<<24>>24>-1){if((b[(c[s>>2]|0)+(aR<<24>>24<<1)>>1]&2048)==0){aa=1090;break}aE=c[o>>2]|0;if((aE|0)==(at|0)){av=(c[U>>2]|0)!=202;aL=c[h>>2]|0;aS=at-aL|0;aT=aS>>>0<2147483647?aS<<1:-1;aU=lT(av?aL:0,aT)|0;if((aU|0)==0){l4()}do{if(av){c[h>>2]=aU;aV=aU}else{aL=c[h>>2]|0;c[h>>2]=aU;if((aL|0)==0){aV=aU;break}bY[c[U>>2]&511](aL);aV=c[h>>2]|0}}while(0);c[U>>2]=98;aU=aV+aS|0;c[o>>2]=aU;aW=(c[h>>2]|0)+aT|0;aX=aU}else{aW=at;aX=aE}c[o>>2]=aX+1;a[aX]=aR;aY=aw+1|0;aZ=aD;a_=ag;a$=aj;a0=ax;a1=aW}else{aa=1090}}while(0);if((aa|0)==1090){aa=0;ay=d[w]|0;if((((ay&1|0)==0?ay>>>1:c[n>>2]|0)|0)==0|(aw|0)==0){break}if(aR<<24>>24!=(a[u]|0)){break}if((ag|0)==(aD|0)){ay=ag-aj|0;aU=ay>>>0<2147483647?ay<<1:-1;if((ax|0)==202){a2=0}else{a2=aj}av=lT(a2,aU)|0;ah=av;if((av|0)==0){l4()}a3=ah+(aU>>>2<<2)|0;a4=ah+(ay>>2<<2)|0;a5=ah;a6=98}else{a3=aD;a4=ag;a5=aj;a6=ax}c[a4>>2]=aw;aY=0;aZ=a3;a_=a4+4|0;a$=a5;a0=a6;a1=at}ah=c[g>>2]|0;ay=ah+12|0;aU=c[ay>>2]|0;if((aU|0)==(c[ah+16>>2]|0)){av=c[(c[ah>>2]|0)+40>>2]|0;b0[av&255](ah)|0;aw=aY;aD=aZ;ag=a_;aj=a$;ax=a0;at=a1;continue}else{c[ay>>2]=aU+1;aw=aY;aD=aZ;ag=a_;aj=a$;ax=a0;at=a1;continue}}if((aj|0)==(ag|0)|(aw|0)==0){a7=aD;a8=ag;a9=aj;ba=ax}else{if((ag|0)==(aD|0)){aU=ag-aj|0;ay=aU>>>0<2147483647?aU<<1:-1;if((ax|0)==202){bb=0}else{bb=aj}ah=lT(bb,ay)|0;av=ah;if((ah|0)==0){l4()}bc=av+(ay>>>2<<2)|0;bd=av+(aU>>2<<2)|0;be=av;bf=98}else{bc=aD;bd=ag;be=aj;bf=ax}c[bd>>2]=aw;a7=bc;a8=bd+4|0;a9=be;ba=bf}if((c[B>>2]|0)>0){av=c[g>>2]|0;do{if((av|0)==0){bg=0}else{if((c[av+12>>2]|0)!=(c[av+16>>2]|0)){bg=av;break}if((b0[c[(c[av>>2]|0)+36>>2]&255](av)|0)==-1){c[g>>2]=0;bg=0;break}else{bg=c[g>>2]|0;break}}}while(0);av=(bg|0)==0;aw=c[e>>2]|0;do{if((aw|0)==0){aa=1123}else{if((c[aw+12>>2]|0)!=(c[aw+16>>2]|0)){if(av){bh=aw;break}else{aa=1130;break L1136}}if((b0[c[(c[aw>>2]|0)+36>>2]&255](aw)|0)==-1){c[e>>2]=0;aa=1123;break}else{if(av){bh=aw;break}else{aa=1130;break L1136}}}}while(0);if((aa|0)==1123){aa=0;if(av){aa=1130;break L1136}else{bh=0}}aw=c[g>>2]|0;ax=c[aw+12>>2]|0;if((ax|0)==(c[aw+16>>2]|0)){bi=(b0[c[(c[aw>>2]|0)+36>>2]&255](aw)|0)&255}else{bi=a[ax]|0}if(bi<<24>>24!=(a[t]|0)){aa=1130;break L1136}ax=c[g>>2]|0;aw=ax+12|0;aj=c[aw>>2]|0;if((aj|0)==(c[ax+16>>2]|0)){ag=c[(c[ax>>2]|0)+40>>2]|0;b0[ag&255](ax)|0;bj=at;bk=bh}else{c[aw>>2]=aj+1;bj=at;bk=bh}while(1){aj=c[g>>2]|0;do{if((aj|0)==0){bl=0}else{if((c[aj+12>>2]|0)!=(c[aj+16>>2]|0)){bl=aj;break}if((b0[c[(c[aj>>2]|0)+36>>2]&255](aj)|0)==-1){c[g>>2]=0;bl=0;break}else{bl=c[g>>2]|0;break}}}while(0);aj=(bl|0)==0;do{if((bk|0)==0){aa=1146}else{if((c[bk+12>>2]|0)!=(c[bk+16>>2]|0)){if(aj){bm=bk;break}else{aa=1154;break L1136}}if((b0[c[(c[bk>>2]|0)+36>>2]&255](bk)|0)==-1){c[e>>2]=0;aa=1146;break}else{if(aj){bm=bk;break}else{aa=1154;break L1136}}}}while(0);if((aa|0)==1146){aa=0;if(aj){aa=1154;break L1136}else{bm=0}}aw=c[g>>2]|0;ax=c[aw+12>>2]|0;if((ax|0)==(c[aw+16>>2]|0)){bn=(b0[c[(c[aw>>2]|0)+36>>2]&255](aw)|0)&255}else{bn=a[ax]|0}if(bn<<24>>24<=-1){aa=1154;break L1136}if((b[(c[s>>2]|0)+(bn<<24>>24<<1)>>1]&2048)==0){aa=1154;break L1136}ax=c[o>>2]|0;if((ax|0)==(bj|0)){aw=(c[U>>2]|0)!=202;ag=c[h>>2]|0;aD=bj-ag|0;aU=aD>>>0<2147483647?aD<<1:-1;ay=lT(aw?ag:0,aU)|0;if((ay|0)==0){l4()}do{if(aw){c[h>>2]=ay;bo=ay}else{ag=c[h>>2]|0;c[h>>2]=ay;if((ag|0)==0){bo=ay;break}bY[c[U>>2]&511](ag);bo=c[h>>2]|0}}while(0);c[U>>2]=98;ay=bo+aD|0;c[o>>2]=ay;bp=(c[h>>2]|0)+aU|0;bq=ay}else{bp=bj;bq=ax}ay=c[g>>2]|0;aw=c[ay+12>>2]|0;if((aw|0)==(c[ay+16>>2]|0)){aj=(b0[c[(c[ay>>2]|0)+36>>2]&255](ay)|0)&255;br=aj;bs=c[o>>2]|0}else{br=a[aw]|0;bs=bq}c[o>>2]=bs+1;a[bs]=br;aw=(c[B>>2]|0)-1|0;c[B>>2]=aw;aj=c[g>>2]|0;ay=aj+12|0;ag=c[ay>>2]|0;if((ag|0)==(c[aj+16>>2]|0)){ah=c[(c[aj>>2]|0)+40>>2]|0;b0[ah&255](aj)|0}else{c[ay>>2]=ag+1}if((aw|0)>0){bj=bp;bk=bm}else{bt=bp;break}}}else{bt=at}if((c[o>>2]|0)==(c[h>>2]|0)){aa=1174;break L1136}else{am=r;an=a7;ao=a8;ap=a9;aq=ba;ar=bt}}else{am=r;an=D;ao=X;ap=W;aq=p;ar=V}}while(0);L1435:do{if((aa|0)==950){aa=0;if((Y|0)==3){ac=p;ad=W;ae=X;af=r;aa=1176;break L1136}else{bu=ab}while(1){$=c[g>>2]|0;do{if(($|0)==0){bv=0}else{if((c[$+12>>2]|0)!=(c[$+16>>2]|0)){bv=$;break}if((b0[c[(c[$>>2]|0)+36>>2]&255]($)|0)==-1){c[g>>2]=0;bv=0;break}else{bv=c[g>>2]|0;break}}}while(0);$=(bv|0)==0;do{if((bu|0)==0){aa=963}else{if((c[bu+12>>2]|0)!=(c[bu+16>>2]|0)){if($){bw=bu;break}else{am=r;an=D;ao=X;ap=W;aq=p;ar=V;break L1435}}if((b0[c[(c[bu>>2]|0)+36>>2]&255](bu)|0)==-1){c[e>>2]=0;aa=963;break}else{if($){bw=bu;break}else{am=r;an=D;ao=X;ap=W;aq=p;ar=V;break L1435}}}}while(0);if((aa|0)==963){aa=0;if($){am=r;an=D;ao=X;ap=W;aq=p;ar=V;break L1435}else{bw=0}}ax=c[g>>2]|0;aU=c[ax+12>>2]|0;if((aU|0)==(c[ax+16>>2]|0)){bx=(b0[c[(c[ax>>2]|0)+36>>2]&255](ax)|0)&255}else{bx=a[aU]|0}if(bx<<24>>24<=-1){am=r;an=D;ao=X;ap=W;aq=p;ar=V;break L1435}if((b[(c[s>>2]|0)+(bx<<24>>24<<1)>>1]&8192)==0){am=r;an=D;ao=X;ap=W;aq=p;ar=V;break L1435}aU=c[g>>2]|0;ax=aU+12|0;aD=c[ax>>2]|0;if((aD|0)==(c[aU+16>>2]|0)){by=(b0[c[(c[aU>>2]|0)+40>>2]&255](aU)|0)&255}else{c[ax>>2]=aD+1;by=a[aD]|0}e2(A,by);bu=bw}}}while(0);at=Y+1|0;if(at>>>0<4){V=ar;p=aq;W=ap;X=ao;D=an;r=am;Y=at}else{ac=aq;ad=ap;ae=ao;af=am;aa=1176;break}}L1472:do{if((aa|0)==949){c[k>>2]=c[k>>2]|4;bz=0;bA=W;bB=p}else if((aa|0)==1016){c[k>>2]=c[k>>2]|4;bz=0;bA=W;bB=p}else if((aa|0)==1058){c[k>>2]=c[k>>2]|4;bz=0;bA=W;bB=p}else if((aa|0)==1130){c[k>>2]=c[k>>2]|4;bz=0;bA=a9;bB=ba}else if((aa|0)==1154){c[k>>2]=c[k>>2]|4;bz=0;bA=a9;bB=ba}else if((aa|0)==1174){c[k>>2]=c[k>>2]|4;bz=0;bA=a9;bB=ba}else if((aa|0)==1176){L1480:do{if((af|0)!=0){am=af;ao=af+1|0;ap=af+8|0;aq=af+4|0;Y=1;L1482:while(1){r=d[am]|0;if((r&1|0)==0){bC=r>>>1}else{bC=c[aq>>2]|0}if(Y>>>0>=bC>>>0){break L1480}r=c[g>>2]|0;do{if((r|0)==0){bD=0}else{if((c[r+12>>2]|0)!=(c[r+16>>2]|0)){bD=r;break}if((b0[c[(c[r>>2]|0)+36>>2]&255](r)|0)==-1){c[g>>2]=0;bD=0;break}else{bD=c[g>>2]|0;break}}}while(0);r=(bD|0)==0;$=c[e>>2]|0;do{if(($|0)==0){aa=1194}else{if((c[$+12>>2]|0)!=(c[$+16>>2]|0)){if(r){break}else{break L1482}}if((b0[c[(c[$>>2]|0)+36>>2]&255]($)|0)==-1){c[e>>2]=0;aa=1194;break}else{if(r){break}else{break L1482}}}}while(0);if((aa|0)==1194){aa=0;if(r){break}}$=c[g>>2]|0;an=c[$+12>>2]|0;if((an|0)==(c[$+16>>2]|0)){bE=(b0[c[(c[$>>2]|0)+36>>2]&255]($)|0)&255}else{bE=a[an]|0}if((a[am]&1)==0){bF=ao}else{bF=c[ap>>2]|0}if(bE<<24>>24!=(a[bF+Y|0]|0)){break}an=Y+1|0;$=c[g>>2]|0;D=$+12|0;X=c[D>>2]|0;if((X|0)==(c[$+16>>2]|0)){ar=c[(c[$>>2]|0)+40>>2]|0;b0[ar&255]($)|0;Y=an;continue}else{c[D>>2]=X+1;Y=an;continue}}c[k>>2]=c[k>>2]|4;bz=0;bA=ad;bB=ac;break L1472}}while(0);if((ad|0)==(ae|0)){bz=1;bA=ae;bB=ac;break}c[C>>2]=0;gC(v,ad,ae,C);if((c[C>>2]|0)==0){bz=1;bA=ad;bB=ac;break}c[k>>2]=c[k>>2]|4;bz=0;bA=ad;bB=ac}}while(0);e$(A);e$(z);e$(y);e$(x);e$(v);if((bA|0)==0){i=q;return bz|0}bY[bB&511](bA);i=q;return bz|0}function i0(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0;f=b;g=d;h=a[f]|0;i=h&255;if((i&1|0)==0){j=i>>>1}else{j=c[b+4>>2]|0}if((h&1)==0){k=10;l=h}else{h=c[b>>2]|0;k=(h&-2)-1|0;l=h&255}h=e-g|0;if((e|0)==(d|0)){return b|0}if((k-j|0)>>>0<h>>>0){fd(b,k,j+h-k|0,j,j,0,0);m=a[f]|0}else{m=l}if((m&1)==0){n=b+1|0}else{n=c[b+8>>2]|0}m=e+(j-g)|0;g=d;d=n+j|0;while(1){a[d]=a[g]|0;l=g+1|0;if((l|0)==(e|0)){break}else{g=l;d=d+1|0}}a[n+m|0]=0;m=j+h|0;if((a[f]&1)==0){a[f]=m<<1&255;return b|0}else{c[b+4>>2]=m;return b|0}return 0}function i1(a){a=a|0;en(a|0);l_(a);return}function i2(a){a=a|0;en(a|0);return}function i3(a){a=a|0;var b=0;b=bO(8)|0;eQ(b,a);bk(b|0,13920,26)}function i4(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0;d=i;i=i+160|0;l=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[l>>2];l=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[l>>2];l=d|0;m=d+16|0;n=d+120|0;o=d+128|0;p=d+136|0;q=d+144|0;r=d+152|0;s=n|0;c[s>>2]=m;t=n+4|0;c[t>>2]=202;u=m+100|0;fA(p,h);m=p|0;v=c[m>>2]|0;if((c[4850]|0)!=-1){c[l>>2]=19400;c[l+4>>2]=16;c[l+8>>2]=0;e6(19400,l,116)}l=(c[4851]|0)-1|0;w=c[v+8>>2]|0;do{if((c[v+12>>2]|0)-w>>2>>>0>l>>>0){x=c[w+(l<<2)>>2]|0;if((x|0)==0){break}y=x;a[q]=0;z=f|0;A=c[z>>2]|0;c[r>>2]=A;if(i$(e,r,g,p,c[h+4>>2]|0,j,q,y,n,o,u)|0){B=k;if((a[B]&1)==0){a[k+1|0]=0;a[B]=0}else{a[c[k+8>>2]|0]=0;c[k+4>>2]=0}B=x;if((a[q]&1)!=0){e2(k,b_[c[(c[B>>2]|0)+28>>2]&63](y,45)|0)}x=b_[c[(c[B>>2]|0)+28>>2]&63](y,48)|0;y=c[s>>2]|0;B=c[o>>2]|0;C=B-1|0;L1580:do{if(y>>>0<C>>>0){D=y;while(1){E=D+1|0;if((a[D]|0)!=x<<24>>24){F=D;break L1580}if(E>>>0<C>>>0){D=E}else{F=E;break}}}else{F=y}}while(0);i0(k,F,B)|0}y=e|0;C=c[y>>2]|0;do{if((C|0)==0){G=0}else{if((c[C+12>>2]|0)!=(c[C+16>>2]|0)){G=C;break}if((b0[c[(c[C>>2]|0)+36>>2]&255](C)|0)!=-1){G=C;break}c[y>>2]=0;G=0}}while(0);y=(G|0)==0;do{if((A|0)==0){H=1274}else{if((c[A+12>>2]|0)!=(c[A+16>>2]|0)){if(y){break}else{H=1276;break}}if((b0[c[(c[A>>2]|0)+36>>2]&255](A)|0)==-1){c[z>>2]=0;H=1274;break}else{if(y^(A|0)==0){break}else{H=1276;break}}}}while(0);if((H|0)==1274){if(y){H=1276}}if((H|0)==1276){c[j>>2]=c[j>>2]|2}c[b>>2]=G;A=c[m>>2]|0;eL(A)|0;A=c[s>>2]|0;c[s>>2]=0;if((A|0)==0){i=d;return}bY[c[t>>2]&511](A);i=d;return}}while(0);d=bO(4)|0;lz(d);bk(d|0,13904,160)}function i5(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0;n=i;i=i+56|0;o=n|0;p=n+16|0;q=n+32|0;r=n+40|0;s=r;t=i;i=i+12|0;i=i+7>>3<<3;u=t;v=i;i=i+12|0;i=i+7>>3<<3;w=v;x=i;i=i+12|0;i=i+7>>3<<3;y=x;z=i;i=i+4|0;i=i+7>>3<<3;A=i;i=i+12|0;i=i+7>>3<<3;B=A;D=i;i=i+12|0;i=i+7>>3<<3;E=D;F=i;i=i+12|0;i=i+7>>3<<3;G=F;H=i;i=i+12|0;i=i+7>>3<<3;I=H;if(b){b=c[d>>2]|0;if((c[4968]|0)!=-1){c[p>>2]=19872;c[p+4>>2]=16;c[p+8>>2]=0;e6(19872,p,116)}p=(c[4969]|0)-1|0;J=c[b+8>>2]|0;if((c[b+12>>2]|0)-J>>2>>>0<=p>>>0){K=bO(4)|0;L=K;lz(L);bk(K|0,13904,160)}b=c[J+(p<<2)>>2]|0;if((b|0)==0){K=bO(4)|0;L=K;lz(L);bk(K|0,13904,160)}K=b;bZ[c[(c[b>>2]|0)+44>>2]&127](q,K);L=e;C=c[q>>2]|0;a[L]=C&255;C=C>>8;a[L+1|0]=C&255;C=C>>8;a[L+2|0]=C&255;C=C>>8;a[L+3|0]=C&255;L=b;bZ[c[(c[L>>2]|0)+32>>2]&127](r,K);q=l;if((a[q]&1)==0){a[l+1|0]=0;a[q]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}fb(l,0);c[q>>2]=c[s>>2];c[q+4>>2]=c[s+4>>2];c[q+8>>2]=c[s+8>>2];l6(s|0,0,12);e$(r);bZ[c[(c[L>>2]|0)+28>>2]&127](t,K);r=k;if((a[r]&1)==0){a[k+1|0]=0;a[r]=0}else{a[c[k+8>>2]|0]=0;c[k+4>>2]=0}fb(k,0);c[r>>2]=c[u>>2];c[r+4>>2]=c[u+4>>2];c[r+8>>2]=c[u+8>>2];l6(u|0,0,12);e$(t);t=b;a[f]=b0[c[(c[t>>2]|0)+12>>2]&255](K)|0;a[g]=b0[c[(c[t>>2]|0)+16>>2]&255](K)|0;bZ[c[(c[L>>2]|0)+20>>2]&127](v,K);t=h;if((a[t]&1)==0){a[h+1|0]=0;a[t]=0}else{a[c[h+8>>2]|0]=0;c[h+4>>2]=0}fb(h,0);c[t>>2]=c[w>>2];c[t+4>>2]=c[w+4>>2];c[t+8>>2]=c[w+8>>2];l6(w|0,0,12);e$(v);bZ[c[(c[L>>2]|0)+24>>2]&127](x,K);L=j;if((a[L]&1)==0){a[j+1|0]=0;a[L]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}fb(j,0);c[L>>2]=c[y>>2];c[L+4>>2]=c[y+4>>2];c[L+8>>2]=c[y+8>>2];l6(y|0,0,12);e$(x);M=b0[c[(c[b>>2]|0)+36>>2]&255](K)|0;c[m>>2]=M;i=n;return}else{K=c[d>>2]|0;if((c[4970]|0)!=-1){c[o>>2]=19880;c[o+4>>2]=16;c[o+8>>2]=0;e6(19880,o,116)}o=(c[4971]|0)-1|0;d=c[K+8>>2]|0;if((c[K+12>>2]|0)-d>>2>>>0<=o>>>0){N=bO(4)|0;O=N;lz(O);bk(N|0,13904,160)}K=c[d+(o<<2)>>2]|0;if((K|0)==0){N=bO(4)|0;O=N;lz(O);bk(N|0,13904,160)}N=K;bZ[c[(c[K>>2]|0)+44>>2]&127](z,N);O=e;C=c[z>>2]|0;a[O]=C&255;C=C>>8;a[O+1|0]=C&255;C=C>>8;a[O+2|0]=C&255;C=C>>8;a[O+3|0]=C&255;O=K;bZ[c[(c[O>>2]|0)+32>>2]&127](A,N);z=l;if((a[z]&1)==0){a[l+1|0]=0;a[z]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}fb(l,0);c[z>>2]=c[B>>2];c[z+4>>2]=c[B+4>>2];c[z+8>>2]=c[B+8>>2];l6(B|0,0,12);e$(A);bZ[c[(c[O>>2]|0)+28>>2]&127](D,N);A=k;if((a[A]&1)==0){a[k+1|0]=0;a[A]=0}else{a[c[k+8>>2]|0]=0;c[k+4>>2]=0}fb(k,0);c[A>>2]=c[E>>2];c[A+4>>2]=c[E+4>>2];c[A+8>>2]=c[E+8>>2];l6(E|0,0,12);e$(D);D=K;a[f]=b0[c[(c[D>>2]|0)+12>>2]&255](N)|0;a[g]=b0[c[(c[D>>2]|0)+16>>2]&255](N)|0;bZ[c[(c[O>>2]|0)+20>>2]&127](F,N);D=h;if((a[D]&1)==0){a[h+1|0]=0;a[D]=0}else{a[c[h+8>>2]|0]=0;c[h+4>>2]=0}fb(h,0);c[D>>2]=c[G>>2];c[D+4>>2]=c[G+4>>2];c[D+8>>2]=c[G+8>>2];l6(G|0,0,12);e$(F);bZ[c[(c[O>>2]|0)+24>>2]&127](H,N);O=j;if((a[O]&1)==0){a[j+1|0]=0;a[O]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}fb(j,0);c[O>>2]=c[I>>2];c[O+4>>2]=c[I+4>>2];c[O+8>>2]=c[I+8>>2];l6(I|0,0,12);e$(H);M=b0[c[(c[K>>2]|0)+36>>2]&255](N)|0;c[m>>2]=M;i=n;return}}function i6(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0;d=i;i=i+600|0;l=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[l>>2];l=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[l>>2];l=d|0;m=d+16|0;n=d+416|0;o=d+424|0;p=d+432|0;q=d+440|0;r=d+448|0;s=d+456|0;t=d+496|0;u=n|0;c[u>>2]=m;v=n+4|0;c[v>>2]=202;w=m+400|0;fA(p,h);m=p|0;x=c[m>>2]|0;if((c[4848]|0)!=-1){c[l>>2]=19392;c[l+4>>2]=16;c[l+8>>2]=0;e6(19392,l,116)}l=(c[4849]|0)-1|0;y=c[x+8>>2]|0;do{if((c[x+12>>2]|0)-y>>2>>>0>l>>>0){z=c[y+(l<<2)>>2]|0;if((z|0)==0){break}A=z;a[q]=0;C=f|0;c[r>>2]=c[C>>2];do{if(i7(e,r,g,p,c[h+4>>2]|0,j,q,A,n,o,w)|0){D=s|0;E=c[(c[z>>2]|0)+48>>2]|0;ca[E&15](A,6856,6866,D)|0;E=t|0;F=c[o>>2]|0;G=c[u>>2]|0;H=F-G|0;do{if((H|0)>392){I=lR((H>>2)+2|0)|0;if((I|0)!=0){J=I;K=I;break}l4();J=0;K=0}else{J=E;K=0}}while(0);if((a[q]&1)==0){L=J}else{a[J]=45;L=J+1|0}if(G>>>0<F>>>0){H=s+40|0;I=s;M=L;N=G;while(1){O=c[N>>2]|0;P=D;while(1){Q=P+4|0;if((c[P>>2]|0)==(O|0)){R=P;break}if((Q|0)==(H|0)){R=H;break}else{P=Q}}a[M]=a[6856+(R-I>>2)|0]|0;P=N+4|0;O=M+1|0;if(P>>>0<(c[o>>2]|0)>>>0){M=O;N=P}else{S=O;break}}}else{S=L}a[S]=0;if((bE(E|0,2056,(B=i,i=i+8|0,c[B>>2]=k,B)|0)|0)==1){if((K|0)==0){break}lS(K);break}N=bO(8)|0;eQ(N,1976);bk(N|0,13920,26)}}while(0);A=e|0;z=c[A>>2]|0;do{if((z|0)==0){T=0}else{N=c[z+12>>2]|0;if((N|0)==(c[z+16>>2]|0)){U=b0[c[(c[z>>2]|0)+36>>2]&255](z)|0}else{U=c[N>>2]|0}if((U|0)!=-1){T=z;break}c[A>>2]=0;T=0}}while(0);A=(T|0)==0;z=c[C>>2]|0;do{if((z|0)==0){V=1392}else{N=c[z+12>>2]|0;if((N|0)==(c[z+16>>2]|0)){W=b0[c[(c[z>>2]|0)+36>>2]&255](z)|0}else{W=c[N>>2]|0}if((W|0)==-1){c[C>>2]=0;V=1392;break}else{if(A^(z|0)==0){break}else{V=1394;break}}}}while(0);if((V|0)==1392){if(A){V=1394}}if((V|0)==1394){c[j>>2]=c[j>>2]|2}c[b>>2]=T;z=c[m>>2]|0;eL(z)|0;z=c[u>>2]|0;c[u>>2]=0;if((z|0)==0){i=d;return}bY[c[v>>2]&511](z);i=d;return}}while(0);d=bO(4)|0;lz(d);bk(d|0,13904,160)}function i7(b,e,f,g,h,j,k,l,m,n,o){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;var p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ab=0,ac=0,ad=0,ae=0,af=0,ag=0,ah=0,ai=0,aj=0,ak=0,al=0,am=0,an=0,ao=0,ap=0,aq=0,ar=0,as=0,at=0,au=0,av=0,aw=0,ax=0,ay=0,az=0,aA=0,aB=0,aC=0,aD=0,aE=0,aF=0,aG=0,aH=0,aI=0,aJ=0,aK=0,aL=0,aM=0,aN=0,aO=0,aP=0,aQ=0,aR=0,aS=0,aT=0,aU=0,aV=0,aW=0,aX=0,aY=0,aZ=0,a_=0,a$=0,a0=0,a1=0,a2=0,a3=0,a4=0,a5=0,a6=0,a7=0,a8=0,a9=0,ba=0,bb=0,bc=0,bd=0,be=0,bf=0,bg=0,bh=0,bi=0,bj=0,bk=0,bl=0,bm=0,bn=0,bo=0,bp=0,bq=0,br=0,bs=0,bt=0,bu=0,bv=0,bw=0,bx=0,by=0,bz=0,bA=0,bB=0,bC=0,bD=0,bE=0,bF=0,bG=0,bH=0;p=i;i=i+448|0;q=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[q>>2];q=p|0;r=p+8|0;s=p+408|0;t=p+416|0;u=p+424|0;v=p+432|0;w=v;x=i;i=i+12|0;i=i+7>>3<<3;y=i;i=i+12|0;i=i+7>>3<<3;z=i;i=i+12|0;i=i+7>>3<<3;A=i;i=i+12|0;i=i+7>>3<<3;B=i;i=i+4|0;i=i+7>>3<<3;C=i;i=i+4|0;i=i+7>>3<<3;c[q>>2]=o;o=r|0;c[s>>2]=0;l6(w|0,0,12);D=x;E=y;F=z;G=A;l6(D|0,0,12);l6(E|0,0,12);l6(F|0,0,12);l6(G|0,0,12);ja(f,g,s,t,u,v,x,y,z,B);g=m|0;c[n>>2]=c[g>>2];f=b|0;b=e|0;e=s;s=l;H=z+4|0;I=z+8|0;J=y+4|0;K=y+8|0;L=(h&512|0)!=0;h=x+4|0;M=x+8|0;N=A+4|0;O=A+8|0;P=e+3|0;Q=v+4|0;R=202;S=o;T=o;o=r+400|0;r=0;U=0;L1741:while(1){V=c[f>>2]|0;do{if((V|0)==0){W=1}else{X=c[V+12>>2]|0;if((X|0)==(c[V+16>>2]|0)){Y=b0[c[(c[V>>2]|0)+36>>2]&255](V)|0}else{Y=c[X>>2]|0}if((Y|0)==-1){c[f>>2]=0;W=1;break}else{W=(c[f>>2]|0)==0;break}}}while(0);V=c[b>>2]|0;do{if((V|0)==0){Z=1420}else{X=c[V+12>>2]|0;if((X|0)==(c[V+16>>2]|0)){_=b0[c[(c[V>>2]|0)+36>>2]&255](V)|0}else{_=c[X>>2]|0}if((_|0)==-1){c[b>>2]=0;Z=1420;break}else{if(W^(V|0)==0){$=V;break}else{aa=R;ab=S;ac=T;ad=r;Z=1660;break L1741}}}}while(0);if((Z|0)==1420){Z=0;if(W){aa=R;ab=S;ac=T;ad=r;Z=1660;break}else{$=0}}V=a[e+U|0]|0;L1765:do{if((V|0)==1){if((U|0)==3){aa=R;ab=S;ac=T;ad=r;Z=1660;break L1741}X=c[f>>2]|0;ae=c[X+12>>2]|0;if((ae|0)==(c[X+16>>2]|0)){af=b0[c[(c[X>>2]|0)+36>>2]&255](X)|0}else{af=c[ae>>2]|0}if(!(b1[c[(c[s>>2]|0)+12>>2]&63](l,8192,af)|0)){Z=1444;break L1741}ae=c[f>>2]|0;X=ae+12|0;ag=c[X>>2]|0;if((ag|0)==(c[ae+16>>2]|0)){ah=b0[c[(c[ae>>2]|0)+40>>2]&255](ae)|0}else{c[X>>2]=ag+4;ah=c[ag>>2]|0}fy(A,ah);Z=1445}else if((V|0)==0){Z=1445}else if((V|0)==3){ag=a[E]|0;X=ag&255;ae=(X&1|0)==0;ai=a[F]|0;aj=ai&255;ak=(aj&1|0)==0;if(((ae?X>>>1:c[J>>2]|0)|0)==(-(ak?aj>>>1:c[H>>2]|0)|0)){al=r;am=o;an=T;ao=S;ap=R;break}do{if(((ae?X>>>1:c[J>>2]|0)|0)!=0){if(((ak?aj>>>1:c[H>>2]|0)|0)==0){break}aq=c[f>>2]|0;ar=c[aq+12>>2]|0;if((ar|0)==(c[aq+16>>2]|0)){as=b0[c[(c[aq>>2]|0)+36>>2]&255](aq)|0;at=as;au=a[E]|0}else{at=c[ar>>2]|0;au=ag}ar=c[f>>2]|0;as=ar+12|0;aq=c[as>>2]|0;av=(aq|0)==(c[ar+16>>2]|0);if((at|0)==(c[((au&1)==0?J:c[K>>2]|0)>>2]|0)){if(av){aw=c[(c[ar>>2]|0)+40>>2]|0;b0[aw&255](ar)|0}else{c[as>>2]=aq+4}as=d[E]|0;al=((as&1|0)==0?as>>>1:c[J>>2]|0)>>>0>1?y:r;am=o;an=T;ao=S;ap=R;break L1765}if(av){ax=b0[c[(c[ar>>2]|0)+36>>2]&255](ar)|0}else{ax=c[aq>>2]|0}if((ax|0)!=(c[((a[F]&1)==0?H:c[I>>2]|0)>>2]|0)){Z=1510;break L1741}aq=c[f>>2]|0;ar=aq+12|0;av=c[ar>>2]|0;if((av|0)==(c[aq+16>>2]|0)){as=c[(c[aq>>2]|0)+40>>2]|0;b0[as&255](aq)|0}else{c[ar>>2]=av+4}a[k]=1;av=d[F]|0;al=((av&1|0)==0?av>>>1:c[H>>2]|0)>>>0>1?z:r;am=o;an=T;ao=S;ap=R;break L1765}}while(0);aj=c[f>>2]|0;ak=c[aj+12>>2]|0;av=(ak|0)==(c[aj+16>>2]|0);if(((ae?X>>>1:c[J>>2]|0)|0)==0){if(av){ar=b0[c[(c[aj>>2]|0)+36>>2]&255](aj)|0;ay=ar;az=a[F]|0}else{ay=c[ak>>2]|0;az=ai}if((ay|0)!=(c[((az&1)==0?H:c[I>>2]|0)>>2]|0)){al=r;am=o;an=T;ao=S;ap=R;break}ar=c[f>>2]|0;aq=ar+12|0;as=c[aq>>2]|0;if((as|0)==(c[ar+16>>2]|0)){aw=c[(c[ar>>2]|0)+40>>2]|0;b0[aw&255](ar)|0}else{c[aq>>2]=as+4}a[k]=1;as=d[F]|0;al=((as&1|0)==0?as>>>1:c[H>>2]|0)>>>0>1?z:r;am=o;an=T;ao=S;ap=R;break}if(av){av=b0[c[(c[aj>>2]|0)+36>>2]&255](aj)|0;aA=av;aB=a[E]|0}else{aA=c[ak>>2]|0;aB=ag}if((aA|0)!=(c[((aB&1)==0?J:c[K>>2]|0)>>2]|0)){a[k]=1;al=r;am=o;an=T;ao=S;ap=R;break}ak=c[f>>2]|0;av=ak+12|0;aj=c[av>>2]|0;if((aj|0)==(c[ak+16>>2]|0)){as=c[(c[ak>>2]|0)+40>>2]|0;b0[as&255](ak)|0}else{c[av>>2]=aj+4}aj=d[E]|0;al=((aj&1|0)==0?aj>>>1:c[J>>2]|0)>>>0>1?y:r;am=o;an=T;ao=S;ap=R}else if((V|0)==2){if(!((r|0)!=0|U>>>0<2)){if((U|0)==2){aC=(a[P]|0)!=0}else{aC=0}if(!(L|aC)){al=0;am=o;an=T;ao=S;ap=R;break}}aj=a[D]|0;av=(aj&1)==0?h:c[M>>2]|0;L1837:do{if((U|0)==0){aD=av;aE=aj;aF=$}else{if((d[e+(U-1)|0]|0)<2){aG=av;aH=aj}else{aD=av;aE=aj;aF=$;break}while(1){ak=aH&255;if((aG|0)==(((aH&1)==0?h:c[M>>2]|0)+(((ak&1|0)==0?ak>>>1:c[h>>2]|0)<<2)|0)){aI=aH;break}if(!(b1[c[(c[s>>2]|0)+12>>2]&63](l,8192,c[aG>>2]|0)|0)){Z=1521;break}aG=aG+4|0;aH=a[D]|0}if((Z|0)==1521){Z=0;aI=a[D]|0}ak=(aI&1)==0;as=aG-(ak?h:c[M>>2]|0)>>2;aq=a[G]|0;ar=aq&255;aw=(ar&1|0)==0;L1847:do{if(as>>>0<=(aw?ar>>>1:c[N>>2]|0)>>>0){aJ=(aq&1)==0;aK=(aJ?N:c[O>>2]|0)+((aw?ar>>>1:c[N>>2]|0)-as<<2)|0;aL=(aJ?N:c[O>>2]|0)+((aw?ar>>>1:c[N>>2]|0)<<2)|0;if((aK|0)==(aL|0)){aD=aG;aE=aI;aF=$;break L1837}else{aM=aK;aN=ak?h:c[M>>2]|0}while(1){if((c[aM>>2]|0)!=(c[aN>>2]|0)){break L1847}aK=aM+4|0;if((aK|0)==(aL|0)){aD=aG;aE=aI;aF=$;break L1837}aM=aK;aN=aN+4|0}}}while(0);aD=ak?h:c[M>>2]|0;aE=aI;aF=$}}while(0);L1854:while(1){aj=aE&255;if((aD|0)==(((aE&1)==0?h:c[M>>2]|0)+(((aj&1|0)==0?aj>>>1:c[h>>2]|0)<<2)|0)){break}aj=c[f>>2]|0;do{if((aj|0)==0){aO=1}else{av=c[aj+12>>2]|0;if((av|0)==(c[aj+16>>2]|0)){aP=b0[c[(c[aj>>2]|0)+36>>2]&255](aj)|0}else{aP=c[av>>2]|0}if((aP|0)==-1){c[f>>2]=0;aO=1;break}else{aO=(c[f>>2]|0)==0;break}}}while(0);do{if((aF|0)==0){Z=1542}else{aj=c[aF+12>>2]|0;if((aj|0)==(c[aF+16>>2]|0)){aQ=b0[c[(c[aF>>2]|0)+36>>2]&255](aF)|0}else{aQ=c[aj>>2]|0}if((aQ|0)==-1){c[b>>2]=0;Z=1542;break}else{if(aO^(aF|0)==0){aR=aF;break}else{break L1854}}}}while(0);if((Z|0)==1542){Z=0;if(aO){break}else{aR=0}}aj=c[f>>2]|0;ak=c[aj+12>>2]|0;if((ak|0)==(c[aj+16>>2]|0)){aS=b0[c[(c[aj>>2]|0)+36>>2]&255](aj)|0}else{aS=c[ak>>2]|0}if((aS|0)!=(c[aD>>2]|0)){break}ak=c[f>>2]|0;aj=ak+12|0;av=c[aj>>2]|0;if((av|0)==(c[ak+16>>2]|0)){ag=c[(c[ak>>2]|0)+40>>2]|0;b0[ag&255](ak)|0}else{c[aj>>2]=av+4}aD=aD+4|0;aE=a[D]|0;aF=aR}if(!L){al=r;am=o;an=T;ao=S;ap=R;break}av=a[D]|0;aj=av&255;if((aD|0)==(((av&1)==0?h:c[M>>2]|0)+(((aj&1|0)==0?aj>>>1:c[h>>2]|0)<<2)|0)){al=r;am=o;an=T;ao=S;ap=R}else{Z=1554;break L1741}}else if((V|0)==4){aj=0;av=o;ak=T;ag=S;ai=R;L1890:while(1){X=c[f>>2]|0;do{if((X|0)==0){aT=1}else{ae=c[X+12>>2]|0;if((ae|0)==(c[X+16>>2]|0)){aU=b0[c[(c[X>>2]|0)+36>>2]&255](X)|0}else{aU=c[ae>>2]|0}if((aU|0)==-1){c[f>>2]=0;aT=1;break}else{aT=(c[f>>2]|0)==0;break}}}while(0);X=c[b>>2]|0;do{if((X|0)==0){Z=1568}else{ae=c[X+12>>2]|0;if((ae|0)==(c[X+16>>2]|0)){aV=b0[c[(c[X>>2]|0)+36>>2]&255](X)|0}else{aV=c[ae>>2]|0}if((aV|0)==-1){c[b>>2]=0;Z=1568;break}else{if(aT^(X|0)==0){break}else{break L1890}}}}while(0);if((Z|0)==1568){Z=0;if(aT){break}}X=c[f>>2]|0;ae=c[X+12>>2]|0;if((ae|0)==(c[X+16>>2]|0)){aW=b0[c[(c[X>>2]|0)+36>>2]&255](X)|0}else{aW=c[ae>>2]|0}if(b1[c[(c[s>>2]|0)+12>>2]&63](l,2048,aW)|0){ae=c[n>>2]|0;if((ae|0)==(c[q>>2]|0)){jb(m,n,q);aX=c[n>>2]|0}else{aX=ae}c[n>>2]=aX+4;c[aX>>2]=aW;aY=aj+1|0;aZ=av;a_=ak;a$=ag;a0=ai}else{ae=d[w]|0;if((((ae&1|0)==0?ae>>>1:c[Q>>2]|0)|0)==0|(aj|0)==0){break}if((aW|0)!=(c[u>>2]|0)){break}if((ak|0)==(av|0)){ae=(ai|0)!=202;X=ak-ag|0;ar=X>>>0<2147483647?X<<1:-1;if(ae){a1=ag}else{a1=0}ae=lT(a1,ar)|0;aw=ae;if((ae|0)==0){l4()}a2=aw+(ar>>>2<<2)|0;a3=aw+(X>>2<<2)|0;a4=aw;a5=98}else{a2=av;a3=ak;a4=ag;a5=ai}c[a3>>2]=aj;aY=0;aZ=a2;a_=a3+4|0;a$=a4;a0=a5}aw=c[f>>2]|0;X=aw+12|0;ar=c[X>>2]|0;if((ar|0)==(c[aw+16>>2]|0)){ae=c[(c[aw>>2]|0)+40>>2]|0;b0[ae&255](aw)|0;aj=aY;av=aZ;ak=a_;ag=a$;ai=a0;continue}else{c[X>>2]=ar+4;aj=aY;av=aZ;ak=a_;ag=a$;ai=a0;continue}}if((ag|0)==(ak|0)|(aj|0)==0){a6=av;a7=ak;a8=ag;a9=ai}else{if((ak|0)==(av|0)){ar=(ai|0)!=202;X=ak-ag|0;aw=X>>>0<2147483647?X<<1:-1;if(ar){ba=ag}else{ba=0}ar=lT(ba,aw)|0;ae=ar;if((ar|0)==0){l4()}bb=ae+(aw>>>2<<2)|0;bc=ae+(X>>2<<2)|0;bd=ae;be=98}else{bb=av;bc=ak;bd=ag;be=ai}c[bc>>2]=aj;a6=bb;a7=bc+4|0;a8=bd;a9=be}ae=c[B>>2]|0;if((ae|0)>0){X=c[f>>2]|0;do{if((X|0)==0){bf=1}else{aw=c[X+12>>2]|0;if((aw|0)==(c[X+16>>2]|0)){bg=b0[c[(c[X>>2]|0)+36>>2]&255](X)|0}else{bg=c[aw>>2]|0}if((bg|0)==-1){c[f>>2]=0;bf=1;break}else{bf=(c[f>>2]|0)==0;break}}}while(0);X=c[b>>2]|0;do{if((X|0)==0){Z=1617}else{aj=c[X+12>>2]|0;if((aj|0)==(c[X+16>>2]|0)){bh=b0[c[(c[X>>2]|0)+36>>2]&255](X)|0}else{bh=c[aj>>2]|0}if((bh|0)==-1){c[b>>2]=0;Z=1617;break}else{if(bf^(X|0)==0){bi=X;break}else{Z=1623;break L1741}}}}while(0);if((Z|0)==1617){Z=0;if(bf){Z=1623;break L1741}else{bi=0}}X=c[f>>2]|0;aj=c[X+12>>2]|0;if((aj|0)==(c[X+16>>2]|0)){bj=b0[c[(c[X>>2]|0)+36>>2]&255](X)|0}else{bj=c[aj>>2]|0}if((bj|0)!=(c[t>>2]|0)){Z=1623;break L1741}aj=c[f>>2]|0;X=aj+12|0;ai=c[X>>2]|0;if((ai|0)==(c[aj+16>>2]|0)){ag=c[(c[aj>>2]|0)+40>>2]|0;b0[ag&255](aj)|0;bk=bi;bl=ae}else{c[X>>2]=ai+4;bk=bi;bl=ae}while(1){ai=c[f>>2]|0;do{if((ai|0)==0){bm=1}else{X=c[ai+12>>2]|0;if((X|0)==(c[ai+16>>2]|0)){bn=b0[c[(c[ai>>2]|0)+36>>2]&255](ai)|0}else{bn=c[X>>2]|0}if((bn|0)==-1){c[f>>2]=0;bm=1;break}else{bm=(c[f>>2]|0)==0;break}}}while(0);do{if((bk|0)==0){Z=1640}else{ai=c[bk+12>>2]|0;if((ai|0)==(c[bk+16>>2]|0)){bo=b0[c[(c[bk>>2]|0)+36>>2]&255](bk)|0}else{bo=c[ai>>2]|0}if((bo|0)==-1){c[b>>2]=0;Z=1640;break}else{if(bm^(bk|0)==0){bp=bk;break}else{Z=1647;break L1741}}}}while(0);if((Z|0)==1640){Z=0;if(bm){Z=1647;break L1741}else{bp=0}}ai=c[f>>2]|0;X=c[ai+12>>2]|0;if((X|0)==(c[ai+16>>2]|0)){bq=b0[c[(c[ai>>2]|0)+36>>2]&255](ai)|0}else{bq=c[X>>2]|0}if(!(b1[c[(c[s>>2]|0)+12>>2]&63](l,2048,bq)|0)){Z=1647;break L1741}if((c[n>>2]|0)==(c[q>>2]|0)){jb(m,n,q)}X=c[f>>2]|0;ai=c[X+12>>2]|0;if((ai|0)==(c[X+16>>2]|0)){br=b0[c[(c[X>>2]|0)+36>>2]&255](X)|0}else{br=c[ai>>2]|0}ai=c[n>>2]|0;c[n>>2]=ai+4;c[ai>>2]=br;ai=bl-1|0;c[B>>2]=ai;X=c[f>>2]|0;aj=X+12|0;ag=c[aj>>2]|0;if((ag|0)==(c[X+16>>2]|0)){ak=c[(c[X>>2]|0)+40>>2]|0;b0[ak&255](X)|0}else{c[aj>>2]=ag+4}if((ai|0)>0){bk=bp;bl=ai}else{break}}}if((c[n>>2]|0)==(c[g>>2]|0)){Z=1658;break L1741}else{al=r;am=a6;an=a7;ao=a8;ap=a9}}else{al=r;am=o;an=T;ao=S;ap=R}}while(0);L2034:do{if((Z|0)==1445){Z=0;if((U|0)==3){aa=R;ab=S;ac=T;ad=r;Z=1660;break L1741}else{bs=$}while(1){V=c[f>>2]|0;do{if((V|0)==0){bt=1}else{ae=c[V+12>>2]|0;if((ae|0)==(c[V+16>>2]|0)){bu=b0[c[(c[V>>2]|0)+36>>2]&255](V)|0}else{bu=c[ae>>2]|0}if((bu|0)==-1){c[f>>2]=0;bt=1;break}else{bt=(c[f>>2]|0)==0;break}}}while(0);do{if((bs|0)==0){Z=1459}else{V=c[bs+12>>2]|0;if((V|0)==(c[bs+16>>2]|0)){bv=b0[c[(c[bs>>2]|0)+36>>2]&255](bs)|0}else{bv=c[V>>2]|0}if((bv|0)==-1){c[b>>2]=0;Z=1459;break}else{if(bt^(bs|0)==0){bw=bs;break}else{al=r;am=o;an=T;ao=S;ap=R;break L2034}}}}while(0);if((Z|0)==1459){Z=0;if(bt){al=r;am=o;an=T;ao=S;ap=R;break L2034}else{bw=0}}V=c[f>>2]|0;ae=c[V+12>>2]|0;if((ae|0)==(c[V+16>>2]|0)){bx=b0[c[(c[V>>2]|0)+36>>2]&255](V)|0}else{bx=c[ae>>2]|0}if(!(b1[c[(c[s>>2]|0)+12>>2]&63](l,8192,bx)|0)){al=r;am=o;an=T;ao=S;ap=R;break L2034}ae=c[f>>2]|0;V=ae+12|0;ai=c[V>>2]|0;if((ai|0)==(c[ae+16>>2]|0)){by=b0[c[(c[ae>>2]|0)+40>>2]&255](ae)|0}else{c[V>>2]=ai+4;by=c[ai>>2]|0}fy(A,by);bs=bw}}}while(0);ai=U+1|0;if(ai>>>0<4){R=ap;S=ao;T=an;o=am;r=al;U=ai}else{aa=ap;ab=ao;ac=an;ad=al;Z=1660;break}}L2071:do{if((Z|0)==1647){c[j>>2]=c[j>>2]|4;bz=0;bA=a8;bB=a9}else if((Z|0)==1658){c[j>>2]=c[j>>2]|4;bz=0;bA=a8;bB=a9}else if((Z|0)==1660){L2075:do{if((ad|0)!=0){al=ad;an=ad+4|0;ao=ad+8|0;ap=1;L2077:while(1){U=d[al]|0;if((U&1|0)==0){bC=U>>>1}else{bC=c[an>>2]|0}if(ap>>>0>=bC>>>0){break L2075}U=c[f>>2]|0;do{if((U|0)==0){bD=1}else{r=c[U+12>>2]|0;if((r|0)==(c[U+16>>2]|0)){bE=b0[c[(c[U>>2]|0)+36>>2]&255](U)|0}else{bE=c[r>>2]|0}if((bE|0)==-1){c[f>>2]=0;bD=1;break}else{bD=(c[f>>2]|0)==0;break}}}while(0);U=c[b>>2]|0;do{if((U|0)==0){Z=1679}else{r=c[U+12>>2]|0;if((r|0)==(c[U+16>>2]|0)){bF=b0[c[(c[U>>2]|0)+36>>2]&255](U)|0}else{bF=c[r>>2]|0}if((bF|0)==-1){c[b>>2]=0;Z=1679;break}else{if(bD^(U|0)==0){break}else{break L2077}}}}while(0);if((Z|0)==1679){Z=0;if(bD){break}}U=c[f>>2]|0;r=c[U+12>>2]|0;if((r|0)==(c[U+16>>2]|0)){bG=b0[c[(c[U>>2]|0)+36>>2]&255](U)|0}else{bG=c[r>>2]|0}if((a[al]&1)==0){bH=an}else{bH=c[ao>>2]|0}if((bG|0)!=(c[bH+(ap<<2)>>2]|0)){break}r=ap+1|0;U=c[f>>2]|0;am=U+12|0;o=c[am>>2]|0;if((o|0)==(c[U+16>>2]|0)){T=c[(c[U>>2]|0)+40>>2]|0;b0[T&255](U)|0;ap=r;continue}else{c[am>>2]=o+4;ap=r;continue}}c[j>>2]=c[j>>2]|4;bz=0;bA=ab;bB=aa;break L2071}}while(0);if((ab|0)==(ac|0)){bz=1;bA=ac;bB=aa;break}c[C>>2]=0;gC(v,ab,ac,C);if((c[C>>2]|0)==0){bz=1;bA=ab;bB=aa;break}c[j>>2]=c[j>>2]|4;bz=0;bA=ab;bB=aa}else if((Z|0)==1623){c[j>>2]=c[j>>2]|4;bz=0;bA=a8;bB=a9}else if((Z|0)==1444){c[j>>2]=c[j>>2]|4;bz=0;bA=S;bB=R}else if((Z|0)==1510){c[j>>2]=c[j>>2]|4;bz=0;bA=S;bB=R}else if((Z|0)==1554){c[j>>2]=c[j>>2]|4;bz=0;bA=S;bB=R}}while(0);e4(A);e4(z);e4(y);e4(x);e$(v);if((bA|0)==0){i=p;return bz|0}bY[bB&511](bA);i=p;return bz|0}function i8(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0;f=b;g=d;h=a[f]|0;i=h&255;if((i&1|0)==0){j=i>>>1}else{j=c[b+4>>2]|0}if((h&1)==0){k=1;l=h}else{h=c[b>>2]|0;k=(h&-2)-1|0;l=h&255}h=e-g>>2;if((h|0)==0){return b|0}if((k-j|0)>>>0<h>>>0){fS(b,k,j+h-k|0,j,j,0,0);m=a[f]|0}else{m=l}if((m&1)==0){n=b+4|0}else{n=c[b+8>>2]|0}m=n+(j<<2)|0;if((d|0)==(e|0)){o=m}else{l=j+((e-4+(-g|0)|0)>>>2)+1|0;g=d;d=m;while(1){c[d>>2]=c[g>>2];m=g+4|0;if((m|0)==(e|0)){break}else{g=m;d=d+4|0}}o=n+(l<<2)|0}c[o>>2]=0;o=j+h|0;if((a[f]&1)==0){a[f]=o<<1&255;return b|0}else{c[b+4>>2]=o;return b|0}return 0}function i9(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0;d=i;i=i+456|0;l=e;e=i;i=i+4|0;i=i+7>>3<<3;c[e>>2]=c[l>>2];l=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[l>>2];l=d|0;m=d+16|0;n=d+416|0;o=d+424|0;p=d+432|0;q=d+440|0;r=d+448|0;s=n|0;c[s>>2]=m;t=n+4|0;c[t>>2]=202;u=m+400|0;fA(p,h);m=p|0;v=c[m>>2]|0;if((c[4848]|0)!=-1){c[l>>2]=19392;c[l+4>>2]=16;c[l+8>>2]=0;e6(19392,l,116)}l=(c[4849]|0)-1|0;w=c[v+8>>2]|0;do{if((c[v+12>>2]|0)-w>>2>>>0>l>>>0){x=c[w+(l<<2)>>2]|0;if((x|0)==0){break}y=x;a[q]=0;z=f|0;A=c[z>>2]|0;c[r>>2]=A;if(i7(e,r,g,p,c[h+4>>2]|0,j,q,y,n,o,u)|0){B=k;if((a[B]&1)==0){c[k+4>>2]=0;a[B]=0}else{c[c[k+8>>2]>>2]=0;c[k+4>>2]=0}B=x;if((a[q]&1)!=0){fy(k,b_[c[(c[B>>2]|0)+44>>2]&63](y,45)|0)}x=b_[c[(c[B>>2]|0)+44>>2]&63](y,48)|0;y=c[s>>2]|0;B=c[o>>2]|0;C=B-4|0;L2179:do{if(y>>>0<C>>>0){D=y;while(1){E=D+4|0;if((c[D>>2]|0)!=(x|0)){F=D;break L2179}if(E>>>0<C>>>0){D=E}else{F=E;break}}}else{F=y}}while(0);i8(k,F,B)|0}y=e|0;C=c[y>>2]|0;do{if((C|0)==0){G=0}else{x=c[C+12>>2]|0;if((x|0)==(c[C+16>>2]|0)){H=b0[c[(c[C>>2]|0)+36>>2]&255](C)|0}else{H=c[x>>2]|0}if((H|0)!=-1){G=C;break}c[y>>2]=0;G=0}}while(0);y=(G|0)==0;do{if((A|0)==0){I=1756}else{C=c[A+12>>2]|0;if((C|0)==(c[A+16>>2]|0)){J=b0[c[(c[A>>2]|0)+36>>2]&255](A)|0}else{J=c[C>>2]|0}if((J|0)==-1){c[z>>2]=0;I=1756;break}else{if(y^(A|0)==0){break}else{I=1758;break}}}}while(0);if((I|0)==1756){if(y){I=1758}}if((I|0)==1758){c[j>>2]=c[j>>2]|2}c[b>>2]=G;A=c[m>>2]|0;eL(A)|0;A=c[s>>2]|0;c[s>>2]=0;if((A|0)==0){i=d;return}bY[c[t>>2]&511](A);i=d;return}}while(0);d=bO(4)|0;lz(d);bk(d|0,13904,160)}function ja(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0;n=i;i=i+56|0;o=n|0;p=n+16|0;q=n+32|0;r=n+40|0;s=r;t=i;i=i+12|0;i=i+7>>3<<3;u=t;v=i;i=i+12|0;i=i+7>>3<<3;w=v;x=i;i=i+12|0;i=i+7>>3<<3;y=x;z=i;i=i+4|0;i=i+7>>3<<3;A=i;i=i+12|0;i=i+7>>3<<3;B=A;D=i;i=i+12|0;i=i+7>>3<<3;E=D;F=i;i=i+12|0;i=i+7>>3<<3;G=F;H=i;i=i+12|0;i=i+7>>3<<3;I=H;if(b){b=c[d>>2]|0;if((c[4964]|0)!=-1){c[p>>2]=19856;c[p+4>>2]=16;c[p+8>>2]=0;e6(19856,p,116)}p=(c[4965]|0)-1|0;J=c[b+8>>2]|0;if((c[b+12>>2]|0)-J>>2>>>0<=p>>>0){K=bO(4)|0;L=K;lz(L);bk(K|0,13904,160)}b=c[J+(p<<2)>>2]|0;if((b|0)==0){K=bO(4)|0;L=K;lz(L);bk(K|0,13904,160)}K=b;bZ[c[(c[b>>2]|0)+44>>2]&127](q,K);L=e;C=c[q>>2]|0;a[L]=C&255;C=C>>8;a[L+1|0]=C&255;C=C>>8;a[L+2|0]=C&255;C=C>>8;a[L+3|0]=C&255;L=b;bZ[c[(c[L>>2]|0)+32>>2]&127](r,K);q=l;if((a[q]&1)==0){c[l+4>>2]=0;a[q]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}fQ(l,0);c[q>>2]=c[s>>2];c[q+4>>2]=c[s+4>>2];c[q+8>>2]=c[s+8>>2];l6(s|0,0,12);e4(r);bZ[c[(c[L>>2]|0)+28>>2]&127](t,K);r=k;if((a[r]&1)==0){c[k+4>>2]=0;a[r]=0}else{c[c[k+8>>2]>>2]=0;c[k+4>>2]=0}fQ(k,0);c[r>>2]=c[u>>2];c[r+4>>2]=c[u+4>>2];c[r+8>>2]=c[u+8>>2];l6(u|0,0,12);e4(t);t=b;c[f>>2]=b0[c[(c[t>>2]|0)+12>>2]&255](K)|0;c[g>>2]=b0[c[(c[t>>2]|0)+16>>2]&255](K)|0;bZ[c[(c[b>>2]|0)+20>>2]&127](v,K);b=h;if((a[b]&1)==0){a[h+1|0]=0;a[b]=0}else{a[c[h+8>>2]|0]=0;c[h+4>>2]=0}fb(h,0);c[b>>2]=c[w>>2];c[b+4>>2]=c[w+4>>2];c[b+8>>2]=c[w+8>>2];l6(w|0,0,12);e$(v);bZ[c[(c[L>>2]|0)+24>>2]&127](x,K);L=j;if((a[L]&1)==0){c[j+4>>2]=0;a[L]=0}else{c[c[j+8>>2]>>2]=0;c[j+4>>2]=0}fQ(j,0);c[L>>2]=c[y>>2];c[L+4>>2]=c[y+4>>2];c[L+8>>2]=c[y+8>>2];l6(y|0,0,12);e4(x);M=b0[c[(c[t>>2]|0)+36>>2]&255](K)|0;c[m>>2]=M;i=n;return}else{K=c[d>>2]|0;if((c[4966]|0)!=-1){c[o>>2]=19864;c[o+4>>2]=16;c[o+8>>2]=0;e6(19864,o,116)}o=(c[4967]|0)-1|0;d=c[K+8>>2]|0;if((c[K+12>>2]|0)-d>>2>>>0<=o>>>0){N=bO(4)|0;O=N;lz(O);bk(N|0,13904,160)}K=c[d+(o<<2)>>2]|0;if((K|0)==0){N=bO(4)|0;O=N;lz(O);bk(N|0,13904,160)}N=K;bZ[c[(c[K>>2]|0)+44>>2]&127](z,N);O=e;C=c[z>>2]|0;a[O]=C&255;C=C>>8;a[O+1|0]=C&255;C=C>>8;a[O+2|0]=C&255;C=C>>8;a[O+3|0]=C&255;O=K;bZ[c[(c[O>>2]|0)+32>>2]&127](A,N);z=l;if((a[z]&1)==0){c[l+4>>2]=0;a[z]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}fQ(l,0);c[z>>2]=c[B>>2];c[z+4>>2]=c[B+4>>2];c[z+8>>2]=c[B+8>>2];l6(B|0,0,12);e4(A);bZ[c[(c[O>>2]|0)+28>>2]&127](D,N);A=k;if((a[A]&1)==0){c[k+4>>2]=0;a[A]=0}else{c[c[k+8>>2]>>2]=0;c[k+4>>2]=0}fQ(k,0);c[A>>2]=c[E>>2];c[A+4>>2]=c[E+4>>2];c[A+8>>2]=c[E+8>>2];l6(E|0,0,12);e4(D);D=K;c[f>>2]=b0[c[(c[D>>2]|0)+12>>2]&255](N)|0;c[g>>2]=b0[c[(c[D>>2]|0)+16>>2]&255](N)|0;bZ[c[(c[K>>2]|0)+20>>2]&127](F,N);K=h;if((a[K]&1)==0){a[h+1|0]=0;a[K]=0}else{a[c[h+8>>2]|0]=0;c[h+4>>2]=0}fb(h,0);c[K>>2]=c[G>>2];c[K+4>>2]=c[G+4>>2];c[K+8>>2]=c[G+8>>2];l6(G|0,0,12);e$(F);bZ[c[(c[O>>2]|0)+24>>2]&127](H,N);O=j;if((a[O]&1)==0){c[j+4>>2]=0;a[O]=0}else{c[c[j+8>>2]>>2]=0;c[j+4>>2]=0}fQ(j,0);c[O>>2]=c[I>>2];c[O+4>>2]=c[I+4>>2];c[O+8>>2]=c[I+8>>2];l6(I|0,0,12);e4(H);M=b0[c[(c[D>>2]|0)+36>>2]&255](N)|0;c[m>>2]=M;i=n;return}}function jb(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0;e=a+4|0;f=(c[e>>2]|0)!=202;g=a|0;a=c[g>>2]|0;h=a;i=(c[d>>2]|0)-h|0;j=i>>>0<2147483647?i<<1:-1;i=(c[b>>2]|0)-h>>2;if(f){k=a}else{k=0}a=lT(k,j)|0;k=a;if((a|0)==0){l4()}do{if(f){c[g>>2]=k;l=k}else{a=c[g>>2]|0;c[g>>2]=k;if((a|0)==0){l=k;break}bY[c[e>>2]&511](a);l=c[g>>2]|0}}while(0);c[e>>2]=98;c[b>>2]=l+(i<<2);c[d>>2]=(c[g>>2]|0)+(j>>>2<<2);return}function jc(a){a=a|0;en(a|0);l_(a);return}function jd(a){a=a|0;en(a|0);return}function je(b,e,f,g,j,k,l){b=b|0;e=e|0;f=f|0;g=g|0;j=j|0;k=k|0;l=+l;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0;e=i;i=i+248|0;m=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[m>>2];m=e|0;n=e+120|0;o=e+232|0;p=e+240|0;q=p;r=i;i=i+1|0;i=i+7>>3<<3;s=i;i=i+1|0;i=i+7>>3<<3;t=i;i=i+12|0;i=i+7>>3<<3;u=t;v=i;i=i+12|0;i=i+7>>3<<3;w=v;x=i;i=i+12|0;i=i+7>>3<<3;y=x;z=i;i=i+4|0;i=i+7>>3<<3;A=i;i=i+100|0;i=i+7>>3<<3;C=i;i=i+4|0;i=i+7>>3<<3;D=i;i=i+4|0;i=i+7>>3<<3;E=i;i=i+4|0;i=i+7>>3<<3;F=e+16|0;c[n>>2]=F;G=e+128|0;H=aY(F|0,100,1896,(B=i,i=i+8|0,h[B>>3]=l,B)|0)|0;do{if(H>>>0>99){do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);F=hp(n,c[4482]|0,1896,(B=i,i=i+8|0,h[B>>3]=l,B)|0)|0;I=c[n>>2]|0;if((I|0)==0){l4();J=c[n>>2]|0}else{J=I}I=lR(F)|0;if((I|0)!=0){K=I;L=F;M=J;N=I;break}l4();K=0;L=F;M=J;N=0}else{K=G;L=H;M=0;N=0}}while(0);fA(o,j);H=o|0;G=c[H>>2]|0;if((c[4850]|0)!=-1){c[m>>2]=19400;c[m+4>>2]=16;c[m+8>>2]=0;e6(19400,m,116)}m=(c[4851]|0)-1|0;J=c[G+8>>2]|0;do{if((c[G+12>>2]|0)-J>>2>>>0>m>>>0){F=c[J+(m<<2)>>2]|0;if((F|0)==0){break}I=F;O=c[n>>2]|0;P=O+L|0;Q=c[(c[F>>2]|0)+32>>2]|0;ca[Q&15](I,O,P,K)|0;if((L|0)==0){R=0}else{R=(a[c[n>>2]|0]|0)==45}c[p>>2]=0;l6(u|0,0,12);l6(w|0,0,12);l6(y|0,0,12);jf(g,R,o,q,r,s,t,v,x,z);P=A|0;O=c[z>>2]|0;if((L|0)>(O|0)){Q=d[y]|0;if((Q&1|0)==0){S=Q>>>1}else{S=c[x+4>>2]|0}Q=d[w]|0;if((Q&1|0)==0){T=Q>>>1}else{T=c[v+4>>2]|0}U=(L-O<<1|1)+S+T|0}else{Q=d[y]|0;if((Q&1|0)==0){V=Q>>>1}else{V=c[x+4>>2]|0}Q=d[w]|0;if((Q&1|0)==0){W=Q>>>1}else{W=c[v+4>>2]|0}U=V+2+W|0}Q=U+O|0;do{if(Q>>>0>100){F=lR(Q)|0;if((F|0)!=0){X=F;Y=F;break}l4();X=0;Y=0}else{X=P;Y=0}}while(0);jg(X,C,D,c[j+4>>2]|0,K,K+L|0,I,R,q,a[r]|0,a[s]|0,t,v,x,O);c[E>>2]=c[f>>2];hi(b,E,X,c[C>>2]|0,c[D>>2]|0,j,k);if((Y|0)!=0){lS(Y)}e$(x);e$(v);e$(t);P=c[H>>2]|0;eL(P)|0;if((N|0)!=0){lS(N)}if((M|0)==0){i=e;return}lS(M);i=e;return}}while(0);e=bO(4)|0;lz(e);bk(e|0,13904,160)}function jf(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0;n=i;i=i+40|0;o=n|0;p=n+16|0;q=n+32|0;r=q;s=i;i=i+12|0;i=i+7>>3<<3;t=s;u=i;i=i+4|0;i=i+7>>3<<3;v=u;w=i;i=i+12|0;i=i+7>>3<<3;x=w;y=i;i=i+12|0;i=i+7>>3<<3;z=y;A=i;i=i+12|0;i=i+7>>3<<3;B=A;D=i;i=i+4|0;i=i+7>>3<<3;E=D;F=i;i=i+12|0;i=i+7>>3<<3;G=F;H=i;i=i+4|0;i=i+7>>3<<3;I=H;J=i;i=i+12|0;i=i+7>>3<<3;K=J;L=i;i=i+12|0;i=i+7>>3<<3;M=L;N=i;i=i+12|0;i=i+7>>3<<3;O=N;P=c[e>>2]|0;if(b){if((c[4968]|0)!=-1){c[p>>2]=19872;c[p+4>>2]=16;c[p+8>>2]=0;e6(19872,p,116)}p=(c[4969]|0)-1|0;b=c[P+8>>2]|0;if((c[P+12>>2]|0)-b>>2>>>0<=p>>>0){Q=bO(4)|0;R=Q;lz(R);bk(Q|0,13904,160)}e=c[b+(p<<2)>>2]|0;if((e|0)==0){Q=bO(4)|0;R=Q;lz(R);bk(Q|0,13904,160)}Q=e;R=c[e>>2]|0;if(d){bZ[c[R+44>>2]&127](r,Q);r=f;C=c[q>>2]|0;a[r]=C&255;C=C>>8;a[r+1|0]=C&255;C=C>>8;a[r+2|0]=C&255;C=C>>8;a[r+3|0]=C&255;bZ[c[(c[e>>2]|0)+32>>2]&127](s,Q);r=l;if((a[r]&1)==0){a[l+1|0]=0;a[r]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}fb(l,0);c[r>>2]=c[t>>2];c[r+4>>2]=c[t+4>>2];c[r+8>>2]=c[t+8>>2];l6(t|0,0,12);e$(s)}else{bZ[c[R+40>>2]&127](v,Q);v=f;C=c[u>>2]|0;a[v]=C&255;C=C>>8;a[v+1|0]=C&255;C=C>>8;a[v+2|0]=C&255;C=C>>8;a[v+3|0]=C&255;bZ[c[(c[e>>2]|0)+28>>2]&127](w,Q);v=l;if((a[v]&1)==0){a[l+1|0]=0;a[v]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}fb(l,0);c[v>>2]=c[x>>2];c[v+4>>2]=c[x+4>>2];c[v+8>>2]=c[x+8>>2];l6(x|0,0,12);e$(w)}w=e;a[g]=b0[c[(c[w>>2]|0)+12>>2]&255](Q)|0;a[h]=b0[c[(c[w>>2]|0)+16>>2]&255](Q)|0;w=e;bZ[c[(c[w>>2]|0)+20>>2]&127](y,Q);x=j;if((a[x]&1)==0){a[j+1|0]=0;a[x]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}fb(j,0);c[x>>2]=c[z>>2];c[x+4>>2]=c[z+4>>2];c[x+8>>2]=c[z+8>>2];l6(z|0,0,12);e$(y);bZ[c[(c[w>>2]|0)+24>>2]&127](A,Q);w=k;if((a[w]&1)==0){a[k+1|0]=0;a[w]=0}else{a[c[k+8>>2]|0]=0;c[k+4>>2]=0}fb(k,0);c[w>>2]=c[B>>2];c[w+4>>2]=c[B+4>>2];c[w+8>>2]=c[B+8>>2];l6(B|0,0,12);e$(A);S=b0[c[(c[e>>2]|0)+36>>2]&255](Q)|0;c[m>>2]=S;i=n;return}else{if((c[4970]|0)!=-1){c[o>>2]=19880;c[o+4>>2]=16;c[o+8>>2]=0;e6(19880,o,116)}o=(c[4971]|0)-1|0;Q=c[P+8>>2]|0;if((c[P+12>>2]|0)-Q>>2>>>0<=o>>>0){T=bO(4)|0;U=T;lz(U);bk(T|0,13904,160)}P=c[Q+(o<<2)>>2]|0;if((P|0)==0){T=bO(4)|0;U=T;lz(U);bk(T|0,13904,160)}T=P;U=c[P>>2]|0;if(d){bZ[c[U+44>>2]&127](E,T);E=f;C=c[D>>2]|0;a[E]=C&255;C=C>>8;a[E+1|0]=C&255;C=C>>8;a[E+2|0]=C&255;C=C>>8;a[E+3|0]=C&255;bZ[c[(c[P>>2]|0)+32>>2]&127](F,T);E=l;if((a[E]&1)==0){a[l+1|0]=0;a[E]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}fb(l,0);c[E>>2]=c[G>>2];c[E+4>>2]=c[G+4>>2];c[E+8>>2]=c[G+8>>2];l6(G|0,0,12);e$(F)}else{bZ[c[U+40>>2]&127](I,T);I=f;C=c[H>>2]|0;a[I]=C&255;C=C>>8;a[I+1|0]=C&255;C=C>>8;a[I+2|0]=C&255;C=C>>8;a[I+3|0]=C&255;bZ[c[(c[P>>2]|0)+28>>2]&127](J,T);I=l;if((a[I]&1)==0){a[l+1|0]=0;a[I]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}fb(l,0);c[I>>2]=c[K>>2];c[I+4>>2]=c[K+4>>2];c[I+8>>2]=c[K+8>>2];l6(K|0,0,12);e$(J)}J=P;a[g]=b0[c[(c[J>>2]|0)+12>>2]&255](T)|0;a[h]=b0[c[(c[J>>2]|0)+16>>2]&255](T)|0;J=P;bZ[c[(c[J>>2]|0)+20>>2]&127](L,T);h=j;if((a[h]&1)==0){a[j+1|0]=0;a[h]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}fb(j,0);c[h>>2]=c[M>>2];c[h+4>>2]=c[M+4>>2];c[h+8>>2]=c[M+8>>2];l6(M|0,0,12);e$(L);bZ[c[(c[J>>2]|0)+24>>2]&127](N,T);J=k;if((a[J]&1)==0){a[k+1|0]=0;a[J]=0}else{a[c[k+8>>2]|0]=0;c[k+4>>2]=0}fb(k,0);c[J>>2]=c[O>>2];c[J+4>>2]=c[O+4>>2];c[J+8>>2]=c[O+8>>2];l6(O|0,0,12);e$(N);S=b0[c[(c[P>>2]|0)+36>>2]&255](T)|0;c[m>>2]=S;i=n;return}}function jg(d,e,f,g,h,i,j,k,l,m,n,o,p,q,r){d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;q=q|0;r=r|0;var s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ab=0,ac=0,ad=0,ae=0,af=0,ag=0,ah=0,ai=0,aj=0,ak=0,al=0,am=0,an=0,ao=0,ap=0,aq=0,ar=0,as=0,at=0,au=0,av=0,aw=0,ax=0,ay=0,az=0;c[f>>2]=d;s=j;t=q;u=q+1|0;v=q+8|0;w=q+4|0;q=p;x=(g&512|0)==0;y=p+1|0;z=p+4|0;A=p+8|0;p=(r|0)>0;B=o;C=o+1|0;D=o+8|0;E=o+4|0;o=j+8|0;F=-r|0;G=h;h=0;while(1){H=a[l+h|0]|0;do{if((H|0)==3){I=a[t]|0;J=I&255;if((J&1|0)==0){K=J>>>1}else{K=c[w>>2]|0}if((K|0)==0){L=G;break}if((I&1)==0){M=u}else{M=c[v>>2]|0}I=a[M]|0;J=c[f>>2]|0;c[f>>2]=J+1;a[J]=I;L=G}else if((H|0)==2){I=a[q]|0;J=I&255;N=(J&1|0)==0;if(N){O=J>>>1}else{O=c[z>>2]|0}if((O|0)==0|x){L=G;break}if((I&1)==0){P=y;Q=y}else{I=c[A>>2]|0;P=I;Q=I}if(N){R=J>>>1}else{R=c[z>>2]|0}J=P+R|0;N=c[f>>2]|0;if((Q|0)==(J|0)){S=N}else{I=Q;T=N;while(1){a[T]=a[I]|0;N=I+1|0;U=T+1|0;if((N|0)==(J|0)){S=U;break}else{I=N;T=U}}}c[f>>2]=S;L=G}else if((H|0)==0){c[e>>2]=c[f>>2];L=G}else if((H|0)==1){c[e>>2]=c[f>>2];T=b_[c[(c[s>>2]|0)+28>>2]&63](j,32)|0;I=c[f>>2]|0;c[f>>2]=I+1;a[I]=T;L=G}else if((H|0)==4){T=c[f>>2]|0;I=k?G+1|0:G;L2462:do{if(I>>>0<i>>>0){J=I;while(1){U=a[J]|0;if(U<<24>>24<=-1){V=J;break L2462}N=J+1|0;if((b[(c[o>>2]|0)+(U<<24>>24<<1)>>1]&2048)==0){V=J;break L2462}if(N>>>0<i>>>0){J=N}else{V=N;break}}}else{V=I}}while(0);J=V;if(p){if(V>>>0>I>>>0){N=I+(-J|0)|0;J=N>>>0<F>>>0?F:N;N=J+r|0;U=V;W=r;X=T;while(1){Y=U-1|0;Z=a[Y]|0;c[f>>2]=X+1;a[X]=Z;Z=W-1|0;_=(Z|0)>0;if(!(Y>>>0>I>>>0&_)){break}U=Y;W=Z;X=c[f>>2]|0}X=V+J|0;if(_){$=N;aa=X;ab=2007}else{ac=0;ad=N;ae=X}}else{$=r;aa=V;ab=2007}if((ab|0)==2007){ab=0;ac=b_[c[(c[s>>2]|0)+28>>2]&63](j,48)|0;ad=$;ae=aa}X=c[f>>2]|0;c[f>>2]=X+1;if((ad|0)>0){W=ad;U=X;while(1){a[U]=ac;Z=W-1|0;Y=c[f>>2]|0;c[f>>2]=Y+1;if((Z|0)>0){W=Z;U=Y}else{af=Y;break}}}else{af=X}a[af]=m;ag=ae}else{ag=V}if((ag|0)==(I|0)){U=b_[c[(c[s>>2]|0)+28>>2]&63](j,48)|0;W=c[f>>2]|0;c[f>>2]=W+1;a[W]=U}else{U=a[B]|0;W=U&255;if((W&1|0)==0){ah=W>>>1}else{ah=c[E>>2]|0}if((ah|0)==0){ai=ag;aj=0;ak=0;al=-1}else{if((U&1)==0){am=C}else{am=c[D>>2]|0}ai=ag;aj=0;ak=0;al=a[am]|0}while(1){do{if((aj|0)==(al|0)){U=c[f>>2]|0;c[f>>2]=U+1;a[U]=n;U=ak+1|0;W=a[B]|0;N=W&255;if((N&1|0)==0){an=N>>>1}else{an=c[E>>2]|0}if(U>>>0>=an>>>0){ao=al;ap=U;aq=0;break}N=(W&1)==0;if(N){ar=C}else{ar=c[D>>2]|0}if((a[ar+U|0]|0)==127){ao=-1;ap=U;aq=0;break}if(N){as=C}else{as=c[D>>2]|0}ao=a[as+U|0]|0;ap=U;aq=0}else{ao=al;ap=ak;aq=aj}}while(0);U=ai-1|0;N=a[U]|0;W=c[f>>2]|0;c[f>>2]=W+1;a[W]=N;if((U|0)==(I|0)){break}else{ai=U;aj=aq+1|0;ak=ap;al=ao}}}X=c[f>>2]|0;if((T|0)==(X|0)){L=I;break}U=X-1|0;if(T>>>0<U>>>0){at=T;au=U}else{L=I;break}while(1){U=a[at]|0;a[at]=a[au]|0;a[au]=U;U=at+1|0;X=au-1|0;if(U>>>0<X>>>0){at=U;au=X}else{L=I;break}}}else{L=G}}while(0);H=h+1|0;if(H>>>0<4){G=L;h=H}else{break}}h=a[t]|0;t=h&255;L=(t&1|0)==0;if(L){av=t>>>1}else{av=c[w>>2]|0}if(av>>>0>1){if((h&1)==0){aw=u;ax=u}else{u=c[v>>2]|0;aw=u;ax=u}if(L){ay=t>>>1}else{ay=c[w>>2]|0}w=aw+ay|0;ay=c[f>>2]|0;aw=ax+1|0;if((aw|0)==(w|0)){az=ay}else{ax=ay;ay=aw;while(1){a[ax]=a[ay]|0;aw=ax+1|0;t=ay+1|0;if((t|0)==(w|0)){az=aw;break}else{ax=aw;ay=t}}}c[f>>2]=az}az=g&176;if((az|0)==16){return}else if((az|0)==32){c[e>>2]=c[f>>2];return}else{c[e>>2]=d;return}}function jh(a){a=a|0;en(a|0);l_(a);return}function ji(a){a=a|0;en(a|0);return}function jj(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ab=0,ac=0,ad=0;e=i;i=i+32|0;l=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[l>>2];l=e|0;m=e+16|0;n=e+24|0;o=n;p=i;i=i+1|0;i=i+7>>3<<3;q=i;i=i+1|0;i=i+7>>3<<3;r=i;i=i+12|0;i=i+7>>3<<3;s=r;t=i;i=i+12|0;i=i+7>>3<<3;u=t;v=i;i=i+12|0;i=i+7>>3<<3;w=v;x=i;i=i+4|0;i=i+7>>3<<3;y=i;i=i+100|0;i=i+7>>3<<3;z=i;i=i+4|0;i=i+7>>3<<3;A=i;i=i+4|0;i=i+7>>3<<3;B=i;i=i+4|0;i=i+7>>3<<3;fA(m,h);C=m|0;D=c[C>>2]|0;if((c[4850]|0)!=-1){c[l>>2]=19400;c[l+4>>2]=16;c[l+8>>2]=0;e6(19400,l,116)}l=(c[4851]|0)-1|0;E=c[D+8>>2]|0;do{if((c[D+12>>2]|0)-E>>2>>>0>l>>>0){F=c[E+(l<<2)>>2]|0;if((F|0)==0){break}G=F;H=k;I=k;J=a[I]|0;K=J&255;if((K&1|0)==0){L=K>>>1}else{L=c[k+4>>2]|0}if((L|0)==0){M=0}else{if((J&1)==0){N=H+1|0}else{N=c[k+8>>2]|0}J=a[N]|0;M=J<<24>>24==(b_[c[(c[F>>2]|0)+28>>2]&63](G,45)|0)<<24>>24}c[n>>2]=0;l6(s|0,0,12);l6(u|0,0,12);l6(w|0,0,12);jf(g,M,m,o,p,q,r,t,v,x);F=y|0;J=a[I]|0;K=J&255;O=(K&1|0)==0;if(O){P=K>>>1}else{P=c[k+4>>2]|0}Q=c[x>>2]|0;if((P|0)>(Q|0)){if(O){R=K>>>1}else{R=c[k+4>>2]|0}K=d[w]|0;if((K&1|0)==0){S=K>>>1}else{S=c[v+4>>2]|0}K=d[u]|0;if((K&1|0)==0){T=K>>>1}else{T=c[t+4>>2]|0}U=(R-Q<<1|1)+S+T|0}else{K=d[w]|0;if((K&1|0)==0){V=K>>>1}else{V=c[v+4>>2]|0}K=d[u]|0;if((K&1|0)==0){W=K>>>1}else{W=c[t+4>>2]|0}U=V+2+W|0}K=U+Q|0;do{if(K>>>0>100){O=lR(K)|0;if((O|0)!=0){X=O;Y=O;Z=J;break}l4();X=0;Y=0;Z=a[I]|0}else{X=F;Y=0;Z=J}}while(0);if((Z&1)==0){_=H+1|0;$=H+1|0}else{J=c[k+8>>2]|0;_=J;$=J}J=Z&255;if((J&1|0)==0){aa=J>>>1}else{aa=c[k+4>>2]|0}jg(X,z,A,c[h+4>>2]|0,$,_+aa|0,G,M,o,a[p]|0,a[q]|0,r,t,v,Q);c[B>>2]=c[f>>2];hi(b,B,X,c[z>>2]|0,c[A>>2]|0,h,j);if((Y|0)==0){e$(v);e$(t);e$(r);ab=c[C>>2]|0;ac=ab|0;ad=eL(ac)|0;i=e;return}lS(Y);e$(v);e$(t);e$(r);ab=c[C>>2]|0;ac=ab|0;ad=eL(ac)|0;i=e;return}}while(0);e=bO(4)|0;lz(e);bk(e|0,13904,160)}function jk(b,e,f,g,j,k,l){b=b|0;e=e|0;f=f|0;g=g|0;j=j|0;k=k|0;l=+l;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0;e=i;i=i+544|0;m=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[m>>2];m=e|0;n=e+120|0;o=e+528|0;p=e+536|0;q=p;r=i;i=i+4|0;i=i+7>>3<<3;s=i;i=i+4|0;i=i+7>>3<<3;t=i;i=i+12|0;i=i+7>>3<<3;u=t;v=i;i=i+12|0;i=i+7>>3<<3;w=v;x=i;i=i+12|0;i=i+7>>3<<3;y=x;z=i;i=i+4|0;i=i+7>>3<<3;A=i;i=i+400|0;C=i;i=i+4|0;i=i+7>>3<<3;D=i;i=i+4|0;i=i+7>>3<<3;E=i;i=i+4|0;i=i+7>>3<<3;F=e+16|0;c[n>>2]=F;G=e+128|0;H=aY(F|0,100,1896,(B=i,i=i+8|0,h[B>>3]=l,B)|0)|0;do{if(H>>>0>99){do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);F=hp(n,c[4482]|0,1896,(B=i,i=i+8|0,h[B>>3]=l,B)|0)|0;I=c[n>>2]|0;if((I|0)==0){l4();J=c[n>>2]|0}else{J=I}I=lR(F<<2)|0;K=I;if((I|0)!=0){L=K;M=F;N=J;O=K;break}l4();L=K;M=F;N=J;O=K}else{L=G;M=H;N=0;O=0}}while(0);fA(o,j);H=o|0;G=c[H>>2]|0;if((c[4848]|0)!=-1){c[m>>2]=19392;c[m+4>>2]=16;c[m+8>>2]=0;e6(19392,m,116)}m=(c[4849]|0)-1|0;J=c[G+8>>2]|0;do{if((c[G+12>>2]|0)-J>>2>>>0>m>>>0){K=c[J+(m<<2)>>2]|0;if((K|0)==0){break}F=K;I=c[n>>2]|0;P=I+M|0;Q=c[(c[K>>2]|0)+48>>2]|0;ca[Q&15](F,I,P,L)|0;if((M|0)==0){R=0}else{R=(a[c[n>>2]|0]|0)==45}c[p>>2]=0;l6(u|0,0,12);l6(w|0,0,12);l6(y|0,0,12);jl(g,R,o,q,r,s,t,v,x,z);P=A|0;I=c[z>>2]|0;if((M|0)>(I|0)){Q=d[y]|0;if((Q&1|0)==0){S=Q>>>1}else{S=c[x+4>>2]|0}Q=d[w]|0;if((Q&1|0)==0){T=Q>>>1}else{T=c[v+4>>2]|0}U=(M-I<<1|1)+S+T|0}else{Q=d[y]|0;if((Q&1|0)==0){V=Q>>>1}else{V=c[x+4>>2]|0}Q=d[w]|0;if((Q&1|0)==0){W=Q>>>1}else{W=c[v+4>>2]|0}U=V+2+W|0}Q=U+I|0;do{if(Q>>>0>100){K=lR(Q<<2)|0;X=K;if((K|0)!=0){Y=X;Z=X;break}l4();Y=X;Z=X}else{Y=P;Z=0}}while(0);jm(Y,C,D,c[j+4>>2]|0,L,L+(M<<2)|0,F,R,q,c[r>>2]|0,c[s>>2]|0,t,v,x,I);c[E>>2]=c[f>>2];hy(b,E,Y,c[C>>2]|0,c[D>>2]|0,j,k);if((Z|0)!=0){lS(Z)}e4(x);e4(v);e$(t);P=c[H>>2]|0;eL(P)|0;if((O|0)!=0){lS(O)}if((N|0)==0){i=e;return}lS(N);i=e;return}}while(0);e=bO(4)|0;lz(e);bk(e|0,13904,160)}function jl(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0;n=i;i=i+40|0;o=n|0;p=n+16|0;q=n+32|0;r=q;s=i;i=i+12|0;i=i+7>>3<<3;t=s;u=i;i=i+4|0;i=i+7>>3<<3;v=u;w=i;i=i+12|0;i=i+7>>3<<3;x=w;y=i;i=i+12|0;i=i+7>>3<<3;z=y;A=i;i=i+12|0;i=i+7>>3<<3;B=A;D=i;i=i+4|0;i=i+7>>3<<3;E=D;F=i;i=i+12|0;i=i+7>>3<<3;G=F;H=i;i=i+4|0;i=i+7>>3<<3;I=H;J=i;i=i+12|0;i=i+7>>3<<3;K=J;L=i;i=i+12|0;i=i+7>>3<<3;M=L;N=i;i=i+12|0;i=i+7>>3<<3;O=N;P=c[e>>2]|0;if(b){if((c[4964]|0)!=-1){c[p>>2]=19856;c[p+4>>2]=16;c[p+8>>2]=0;e6(19856,p,116)}p=(c[4965]|0)-1|0;b=c[P+8>>2]|0;if((c[P+12>>2]|0)-b>>2>>>0<=p>>>0){Q=bO(4)|0;R=Q;lz(R);bk(Q|0,13904,160)}e=c[b+(p<<2)>>2]|0;if((e|0)==0){Q=bO(4)|0;R=Q;lz(R);bk(Q|0,13904,160)}Q=e;R=c[e>>2]|0;if(d){bZ[c[R+44>>2]&127](r,Q);r=f;C=c[q>>2]|0;a[r]=C&255;C=C>>8;a[r+1|0]=C&255;C=C>>8;a[r+2|0]=C&255;C=C>>8;a[r+3|0]=C&255;bZ[c[(c[e>>2]|0)+32>>2]&127](s,Q);r=l;if((a[r]&1)==0){c[l+4>>2]=0;a[r]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}fQ(l,0);c[r>>2]=c[t>>2];c[r+4>>2]=c[t+4>>2];c[r+8>>2]=c[t+8>>2];l6(t|0,0,12);e4(s)}else{bZ[c[R+40>>2]&127](v,Q);v=f;C=c[u>>2]|0;a[v]=C&255;C=C>>8;a[v+1|0]=C&255;C=C>>8;a[v+2|0]=C&255;C=C>>8;a[v+3|0]=C&255;bZ[c[(c[e>>2]|0)+28>>2]&127](w,Q);v=l;if((a[v]&1)==0){c[l+4>>2]=0;a[v]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}fQ(l,0);c[v>>2]=c[x>>2];c[v+4>>2]=c[x+4>>2];c[v+8>>2]=c[x+8>>2];l6(x|0,0,12);e4(w)}w=e;c[g>>2]=b0[c[(c[w>>2]|0)+12>>2]&255](Q)|0;c[h>>2]=b0[c[(c[w>>2]|0)+16>>2]&255](Q)|0;bZ[c[(c[e>>2]|0)+20>>2]&127](y,Q);x=j;if((a[x]&1)==0){a[j+1|0]=0;a[x]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}fb(j,0);c[x>>2]=c[z>>2];c[x+4>>2]=c[z+4>>2];c[x+8>>2]=c[z+8>>2];l6(z|0,0,12);e$(y);bZ[c[(c[e>>2]|0)+24>>2]&127](A,Q);e=k;if((a[e]&1)==0){c[k+4>>2]=0;a[e]=0}else{c[c[k+8>>2]>>2]=0;c[k+4>>2]=0}fQ(k,0);c[e>>2]=c[B>>2];c[e+4>>2]=c[B+4>>2];c[e+8>>2]=c[B+8>>2];l6(B|0,0,12);e4(A);S=b0[c[(c[w>>2]|0)+36>>2]&255](Q)|0;c[m>>2]=S;i=n;return}else{if((c[4966]|0)!=-1){c[o>>2]=19864;c[o+4>>2]=16;c[o+8>>2]=0;e6(19864,o,116)}o=(c[4967]|0)-1|0;Q=c[P+8>>2]|0;if((c[P+12>>2]|0)-Q>>2>>>0<=o>>>0){T=bO(4)|0;U=T;lz(U);bk(T|0,13904,160)}P=c[Q+(o<<2)>>2]|0;if((P|0)==0){T=bO(4)|0;U=T;lz(U);bk(T|0,13904,160)}T=P;U=c[P>>2]|0;if(d){bZ[c[U+44>>2]&127](E,T);E=f;C=c[D>>2]|0;a[E]=C&255;C=C>>8;a[E+1|0]=C&255;C=C>>8;a[E+2|0]=C&255;C=C>>8;a[E+3|0]=C&255;bZ[c[(c[P>>2]|0)+32>>2]&127](F,T);E=l;if((a[E]&1)==0){c[l+4>>2]=0;a[E]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}fQ(l,0);c[E>>2]=c[G>>2];c[E+4>>2]=c[G+4>>2];c[E+8>>2]=c[G+8>>2];l6(G|0,0,12);e4(F)}else{bZ[c[U+40>>2]&127](I,T);I=f;C=c[H>>2]|0;a[I]=C&255;C=C>>8;a[I+1|0]=C&255;C=C>>8;a[I+2|0]=C&255;C=C>>8;a[I+3|0]=C&255;bZ[c[(c[P>>2]|0)+28>>2]&127](J,T);I=l;if((a[I]&1)==0){c[l+4>>2]=0;a[I]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}fQ(l,0);c[I>>2]=c[K>>2];c[I+4>>2]=c[K+4>>2];c[I+8>>2]=c[K+8>>2];l6(K|0,0,12);e4(J)}J=P;c[g>>2]=b0[c[(c[J>>2]|0)+12>>2]&255](T)|0;c[h>>2]=b0[c[(c[J>>2]|0)+16>>2]&255](T)|0;bZ[c[(c[P>>2]|0)+20>>2]&127](L,T);h=j;if((a[h]&1)==0){a[j+1|0]=0;a[h]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}fb(j,0);c[h>>2]=c[M>>2];c[h+4>>2]=c[M+4>>2];c[h+8>>2]=c[M+8>>2];l6(M|0,0,12);e$(L);bZ[c[(c[P>>2]|0)+24>>2]&127](N,T);P=k;if((a[P]&1)==0){c[k+4>>2]=0;a[P]=0}else{c[c[k+8>>2]>>2]=0;c[k+4>>2]=0}fQ(k,0);c[P>>2]=c[O>>2];c[P+4>>2]=c[O+4>>2];c[P+8>>2]=c[O+8>>2];l6(O|0,0,12);e4(N);S=b0[c[(c[J>>2]|0)+36>>2]&255](T)|0;c[m>>2]=S;i=n;return}}function jm(b,d,e,f,g,h,i,j,k,l,m,n,o,p,q){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;q=q|0;var r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ab=0,ac=0,ad=0,ae=0,af=0,ag=0,ah=0,ai=0,aj=0,ak=0,al=0,am=0,an=0,ao=0,ap=0,aq=0,ar=0,as=0,at=0,au=0,av=0,aw=0,ax=0;c[e>>2]=b;r=i;s=p;t=p+4|0;u=p+8|0;p=o;v=(f&512|0)==0;w=o+4|0;x=o+8|0;o=(q|0)>0;y=n;z=n+1|0;A=n+8|0;B=n+4|0;n=i;C=g;g=0;while(1){D=a[k+g|0]|0;do{if((D|0)==3){E=a[s]|0;F=E&255;if((F&1|0)==0){G=F>>>1}else{G=c[t>>2]|0}if((G|0)==0){H=C;break}if((E&1)==0){I=t}else{I=c[u>>2]|0}E=c[I>>2]|0;F=c[e>>2]|0;c[e>>2]=F+4;c[F>>2]=E;H=C}else if((D|0)==0){c[d>>2]=c[e>>2];H=C}else if((D|0)==2){E=a[p]|0;F=E&255;J=(F&1|0)==0;if(J){K=F>>>1}else{K=c[w>>2]|0}if((K|0)==0|v){H=C;break}if((E&1)==0){L=w;M=w;N=w}else{E=c[x>>2]|0;L=E;M=E;N=E}if(J){O=F>>>1}else{O=c[w>>2]|0}F=L+(O<<2)|0;J=c[e>>2]|0;if((M|0)==(F|0)){P=J}else{E=(L+(O-1<<2)+(-N|0)|0)>>>2;Q=M;R=J;while(1){c[R>>2]=c[Q>>2];S=Q+4|0;if((S|0)==(F|0)){break}Q=S;R=R+4|0}P=J+(E+1<<2)|0}c[e>>2]=P;H=C}else if((D|0)==1){c[d>>2]=c[e>>2];R=b_[c[(c[r>>2]|0)+44>>2]&63](i,32)|0;Q=c[e>>2]|0;c[e>>2]=Q+4;c[Q>>2]=R;H=C}else if((D|0)==4){R=c[e>>2]|0;Q=j?C+4|0:C;L2788:do{if(Q>>>0<h>>>0){F=Q;while(1){S=F+4|0;if(!(b1[c[(c[n>>2]|0)+12>>2]&63](i,2048,c[F>>2]|0)|0)){T=F;break L2788}if(S>>>0<h>>>0){F=S}else{T=S;break}}}else{T=Q}}while(0);if(o){if(T>>>0>Q>>>0){E=T;J=q;do{E=E-4|0;F=c[E>>2]|0;S=c[e>>2]|0;c[e>>2]=S+4;c[S>>2]=F;J=J-1|0;U=(J|0)>0;}while(E>>>0>Q>>>0&U);if(U){V=J;W=E;X=2283}else{Y=0;Z=J;_=E}}else{V=q;W=T;X=2283}if((X|0)==2283){X=0;Y=b_[c[(c[r>>2]|0)+44>>2]&63](i,48)|0;Z=V;_=W}F=c[e>>2]|0;c[e>>2]=F+4;if((Z|0)>0){S=Z;$=F;while(1){c[$>>2]=Y;aa=S-1|0;ab=c[e>>2]|0;c[e>>2]=ab+4;if((aa|0)>0){S=aa;$=ab}else{ac=ab;break}}}else{ac=F}c[ac>>2]=l;ad=_}else{ad=T}if((ad|0)==(Q|0)){$=b_[c[(c[r>>2]|0)+44>>2]&63](i,48)|0;S=c[e>>2]|0;c[e>>2]=S+4;c[S>>2]=$}else{$=a[y]|0;S=$&255;if((S&1|0)==0){ae=S>>>1}else{ae=c[B>>2]|0}if((ae|0)==0){af=ad;ag=0;ah=0;ai=-1}else{if(($&1)==0){aj=z}else{aj=c[A>>2]|0}af=ad;ag=0;ah=0;ai=a[aj]|0}while(1){do{if((ag|0)==(ai|0)){$=c[e>>2]|0;c[e>>2]=$+4;c[$>>2]=m;$=ah+1|0;S=a[y]|0;E=S&255;if((E&1|0)==0){ak=E>>>1}else{ak=c[B>>2]|0}if($>>>0>=ak>>>0){al=ai;am=$;an=0;break}E=(S&1)==0;if(E){ao=z}else{ao=c[A>>2]|0}if((a[ao+$|0]|0)==127){al=-1;am=$;an=0;break}if(E){ap=z}else{ap=c[A>>2]|0}al=a[ap+$|0]|0;am=$;an=0}else{al=ai;am=ah;an=ag}}while(0);$=af-4|0;E=c[$>>2]|0;S=c[e>>2]|0;c[e>>2]=S+4;c[S>>2]=E;if(($|0)==(Q|0)){break}else{af=$;ag=an+1|0;ah=am;ai=al}}}F=c[e>>2]|0;if((R|0)==(F|0)){H=Q;break}$=F-4|0;if(R>>>0<$>>>0){aq=R;ar=$}else{H=Q;break}while(1){$=c[aq>>2]|0;c[aq>>2]=c[ar>>2];c[ar>>2]=$;$=aq+4|0;F=ar-4|0;if($>>>0<F>>>0){aq=$;ar=F}else{H=Q;break}}}else{H=C}}while(0);D=g+1|0;if(D>>>0<4){C=H;g=D}else{break}}g=a[s]|0;s=g&255;H=(s&1|0)==0;if(H){as=s>>>1}else{as=c[t>>2]|0}if(as>>>0>1){if((g&1)==0){at=t;au=t;av=t}else{g=c[u>>2]|0;at=g;au=g;av=g}if(H){aw=s>>>1}else{aw=c[t>>2]|0}t=at+(aw<<2)|0;s=c[e>>2]|0;H=au+4|0;if((H|0)==(t|0)){ax=s}else{au=((at+(aw-2<<2)+(-av|0)|0)>>>2)+1|0;av=s;aw=H;while(1){c[av>>2]=c[aw>>2];H=aw+4|0;if((H|0)==(t|0)){break}else{av=av+4|0;aw=H}}ax=s+(au<<2)|0}c[e>>2]=ax}ax=f&176;if((ax|0)==32){c[d>>2]=c[e>>2];return}else if((ax|0)==16){return}else{c[d>>2]=b;return}}function jn(a){a=a|0;en(a|0);l_(a);return}function jo(a){a=a|0;en(a|0);return}function jp(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;if((a[d]&1)==0){f=d+1|0}else{f=c[d+8>>2]|0}d=a7(f|0,200)|0;return d>>>(((d|0)!=-1|0)>>>0)|0}function jq(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ab=0,ac=0,ad=0;e=i;i=i+32|0;l=f;f=i;i=i+4|0;i=i+7>>3<<3;c[f>>2]=c[l>>2];l=e|0;m=e+16|0;n=e+24|0;o=n;p=i;i=i+4|0;i=i+7>>3<<3;q=i;i=i+4|0;i=i+7>>3<<3;r=i;i=i+12|0;i=i+7>>3<<3;s=r;t=i;i=i+12|0;i=i+7>>3<<3;u=t;v=i;i=i+12|0;i=i+7>>3<<3;w=v;x=i;i=i+4|0;i=i+7>>3<<3;y=i;i=i+400|0;z=i;i=i+4|0;i=i+7>>3<<3;A=i;i=i+4|0;i=i+7>>3<<3;B=i;i=i+4|0;i=i+7>>3<<3;fA(m,h);C=m|0;D=c[C>>2]|0;if((c[4848]|0)!=-1){c[l>>2]=19392;c[l+4>>2]=16;c[l+8>>2]=0;e6(19392,l,116)}l=(c[4849]|0)-1|0;E=c[D+8>>2]|0;do{if((c[D+12>>2]|0)-E>>2>>>0>l>>>0){F=c[E+(l<<2)>>2]|0;if((F|0)==0){break}G=F;H=k;I=a[H]|0;J=I&255;if((J&1|0)==0){K=J>>>1}else{K=c[k+4>>2]|0}if((K|0)==0){L=0}else{if((I&1)==0){M=k+4|0}else{M=c[k+8>>2]|0}I=c[M>>2]|0;L=(I|0)==(b_[c[(c[F>>2]|0)+44>>2]&63](G,45)|0)}c[n>>2]=0;l6(s|0,0,12);l6(u|0,0,12);l6(w|0,0,12);jl(g,L,m,o,p,q,r,t,v,x);F=y|0;I=a[H]|0;J=I&255;N=(J&1|0)==0;if(N){O=J>>>1}else{O=c[k+4>>2]|0}P=c[x>>2]|0;if((O|0)>(P|0)){if(N){Q=J>>>1}else{Q=c[k+4>>2]|0}J=d[w]|0;if((J&1|0)==0){R=J>>>1}else{R=c[v+4>>2]|0}J=d[u]|0;if((J&1|0)==0){S=J>>>1}else{S=c[t+4>>2]|0}T=(Q-P<<1|1)+R+S|0}else{J=d[w]|0;if((J&1|0)==0){U=J>>>1}else{U=c[v+4>>2]|0}J=d[u]|0;if((J&1|0)==0){V=J>>>1}else{V=c[t+4>>2]|0}T=U+2+V|0}J=T+P|0;do{if(J>>>0>100){N=lR(J<<2)|0;W=N;if((N|0)!=0){X=W;Y=W;Z=I;break}l4();X=W;Y=W;Z=a[H]|0}else{X=F;Y=0;Z=I}}while(0);if((Z&1)==0){_=k+4|0;$=k+4|0}else{I=c[k+8>>2]|0;_=I;$=I}I=Z&255;if((I&1|0)==0){aa=I>>>1}else{aa=c[k+4>>2]|0}jm(X,z,A,c[h+4>>2]|0,$,_+(aa<<2)|0,G,L,o,c[p>>2]|0,c[q>>2]|0,r,t,v,P);c[B>>2]=c[f>>2];hy(b,B,X,c[z>>2]|0,c[A>>2]|0,h,j);if((Y|0)==0){e4(v);e4(t);e$(r);ab=c[C>>2]|0;ac=ab|0;ad=eL(ac)|0;i=e;return}lS(Y);e4(v);e4(t);e$(r);ab=c[C>>2]|0;ac=ab|0;ad=eL(ac)|0;i=e;return}}while(0);e=bO(4)|0;lz(e);bk(e|0,13904,160)}function jr(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;d=i;i=i+16|0;j=d|0;k=j;l6(k|0,0,12);l=b;m=h;n=a[h]|0;if((n&1)==0){o=m+1|0;p=m+1|0}else{m=c[h+8>>2]|0;o=m;p=m}m=n&255;if((m&1|0)==0){q=m>>>1}else{q=c[h+4>>2]|0}h=o+q|0;do{if(p>>>0<h>>>0){q=p;do{e2(j,a[q]|0);q=q+1|0;}while(q>>>0<h>>>0);q=(e|0)==-1?-1:e<<1;if((a[k]&1)==0){r=q;s=2415;break}t=c[j+8>>2]|0;u=q}else{r=(e|0)==-1?-1:e<<1;s=2415}}while(0);if((s|0)==2415){t=j+1|0;u=r}r=bM(u|0,f|0,g|0,t|0)|0;l6(l|0,0,12);l=l7(r|0)|0;t=r+l|0;if((l|0)>0){v=r}else{e$(j);i=d;return}do{e2(b,a[v]|0);v=v+1|0;}while(v>>>0<t>>>0);e$(j);i=d;return}function js(a,b){a=a|0;b=b|0;a0(((b|0)==-1?-1:b<<1)|0)|0;return}function jt(a){a=a|0;en(a|0);l_(a);return}function ju(a){a=a|0;en(a|0);return}function jv(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;if((a[d]&1)==0){f=d+1|0}else{f=c[d+8>>2]|0}d=a7(f|0,200)|0;return d>>>(((d|0)!=-1|0)>>>0)|0}function jw(a,b){a=a|0;b=b|0;a0(((b|0)==-1?-1:b<<1)|0)|0;return}function jx(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0;d=i;i=i+224|0;j=d|0;k=d+8|0;l=d+40|0;m=d+48|0;n=d+56|0;o=d+64|0;p=d+192|0;q=d+200|0;r=d+208|0;s=r;t=i;i=i+8|0;u=i;i=i+8|0;l6(s|0,0,12);v=b;w=j;x=n;y=t|0;c[t+4>>2]=0;c[t>>2]=8864;z=a[h]|0;if((z&1)==0){A=h+4|0;B=h+4|0}else{C=c[h+8>>2]|0;A=C;B=C}C=z&255;if((C&1|0)==0){D=C>>>1}else{D=c[h+4>>2]|0}h=A+(D<<2)|0;c[j>>2]=0;c[j+4>>2]=0;L2989:do{if(B>>>0<h>>>0){j=t;D=k|0;A=k+32|0;C=B;z=8864;while(1){c[m>>2]=C;E=(b6[c[z+12>>2]&31](y,w,C,h,m,D,A,l)|0)==2;F=c[m>>2]|0;if(E|(F|0)==(C|0)){break}if(D>>>0<(c[l>>2]|0)>>>0){E=D;do{e2(r,a[E]|0);E=E+1|0;}while(E>>>0<(c[l>>2]|0)>>>0);G=c[m>>2]|0}else{G=F}if(G>>>0>=h>>>0){break L2989}C=G;z=c[j>>2]|0}j=bO(8)|0;eQ(j,1104);bk(j|0,13920,26)}}while(0);en(t|0);if((a[s]&1)==0){H=r+1|0}else{H=c[r+8>>2]|0}s=bM(((e|0)==-1?-1:e<<1)|0,f|0,g|0,H|0)|0;l6(v|0,0,12);v=u|0;c[u+4>>2]=0;c[u>>2]=8808;H=l7(s|0)|0;g=s+H|0;c[n>>2]=0;c[n+4>>2]=0;if((H|0)<1){I=u|0;en(I);e$(r);i=d;return}H=u;n=g;f=o|0;e=o+128|0;o=s;s=8808;while(1){c[q>>2]=o;t=(b6[c[s+16>>2]&31](v,x,o,(n-o|0)>32?o+32|0:g,q,f,e,p)|0)==2;G=c[q>>2]|0;if(t|(G|0)==(o|0)){break}if(f>>>0<(c[p>>2]|0)>>>0){t=f;do{fy(b,c[t>>2]|0);t=t+4|0;}while(t>>>0<(c[p>>2]|0)>>>0);J=c[q>>2]|0}else{J=G}if(J>>>0>=g>>>0){K=2483;break}o=J;s=c[H>>2]|0}if((K|0)==2483){I=u|0;en(I);e$(r);i=d;return}d=bO(8)|0;eQ(d,1104);bk(d|0,13920,26)}function jy(a){a=a|0;var b=0;c[a>>2]=8328;b=c[a+8>>2]|0;if((b|0)!=0){a6(b|0)}en(a|0);return}function jz(a){a=a|0;a=bO(8)|0;eM(a,1856);c[a>>2]=7264;bk(a|0,13936,36)}function jA(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0;e=i;i=i+448|0;f=e|0;g=e+16|0;h=e+32|0;j=e+48|0;k=e+64|0;l=e+80|0;m=e+96|0;n=e+112|0;o=e+128|0;p=e+144|0;q=e+160|0;r=e+176|0;s=e+192|0;t=e+208|0;u=e+224|0;v=e+240|0;w=e+256|0;x=e+272|0;y=e+288|0;z=e+304|0;A=e+320|0;B=e+336|0;C=e+352|0;D=e+368|0;E=e+384|0;F=e+400|0;G=e+416|0;H=e+432|0;c[b+4>>2]=d-1;c[b>>2]=8584;d=b+8|0;I=b+12|0;a[b+136|0]=1;J=b+24|0;K=J;c[I>>2]=K;c[d>>2]=K;c[b+16>>2]=J+112;J=28;L=K;do{if((L|0)==0){M=0}else{c[L>>2]=0;M=c[I>>2]|0}L=M+4|0;c[I>>2]=L;J=J-1|0;}while((J|0)!=0);e9(b+144|0,1808,1);J=c[d>>2]|0;d=c[I>>2]|0;if((J|0)!=(d|0)){c[I>>2]=d+(~((d-4+(-J|0)|0)>>>2)<<2)}c[4539]=0;c[4538]=8288;if((c[4770]|0)!=-1){c[H>>2]=19080;c[H+4>>2]=16;c[H+8>>2]=0;e6(19080,H,116)}jR(b,18152,(c[4771]|0)-1|0);c[4537]=0;c[4536]=8248;if((c[4768]|0)!=-1){c[G>>2]=19072;c[G+4>>2]=16;c[G+8>>2]=0;e6(19072,G,116)}jR(b,18144,(c[4769]|0)-1|0);c[4593]=0;c[4592]=8696;c[4594]=0;a[18380]=0;c[4594]=c[(a5()|0)>>2];if((c[4850]|0)!=-1){c[F>>2]=19400;c[F+4>>2]=16;c[F+8>>2]=0;e6(19400,F,116)}jR(b,18368,(c[4851]|0)-1|0);c[4591]=0;c[4590]=8616;if((c[4848]|0)!=-1){c[E>>2]=19392;c[E+4>>2]=16;c[E+8>>2]=0;e6(19392,E,116)}jR(b,18360,(c[4849]|0)-1|0);c[4545]=0;c[4544]=8384;if((c[4774]|0)!=-1){c[D>>2]=19096;c[D+4>>2]=16;c[D+8>>2]=0;e6(19096,D,116)}jR(b,18176,(c[4775]|0)-1|0);c[4541]=0;c[4540]=8328;c[4542]=0;if((c[4772]|0)!=-1){c[C>>2]=19088;c[C+4>>2]=16;c[C+8>>2]=0;e6(19088,C,116)}jR(b,18160,(c[4773]|0)-1|0);c[4547]=0;c[4546]=8440;if((c[4776]|0)!=-1){c[B>>2]=19104;c[B+4>>2]=16;c[B+8>>2]=0;e6(19104,B,116)}jR(b,18184,(c[4777]|0)-1|0);c[4549]=0;c[4548]=8496;if((c[4778]|0)!=-1){c[A>>2]=19112;c[A+4>>2]=16;c[A+8>>2]=0;e6(19112,A,116)}jR(b,18192,(c[4779]|0)-1|0);c[4519]=0;c[4518]=7792;a[18080]=46;a[18081]=44;l6(18084,0,12);if((c[4754]|0)!=-1){c[z>>2]=19016;c[z+4>>2]=16;c[z+8>>2]=0;e6(19016,z,116)}jR(b,18072,(c[4755]|0)-1|0);c[4511]=0;c[4510]=7744;c[4512]=46;c[4513]=44;l6(18056,0,12);if((c[4752]|0)!=-1){c[y>>2]=19008;c[y+4>>2]=16;c[y+8>>2]=0;e6(19008,y,116)}jR(b,18040,(c[4753]|0)-1|0);c[4535]=0;c[4534]=8176;if((c[4766]|0)!=-1){c[x>>2]=19064;c[x+4>>2]=16;c[x+8>>2]=0;e6(19064,x,116)}jR(b,18136,(c[4767]|0)-1|0);c[4533]=0;c[4532]=8104;if((c[4764]|0)!=-1){c[w>>2]=19056;c[w+4>>2]=16;c[w+8>>2]=0;e6(19056,w,116)}jR(b,18128,(c[4765]|0)-1|0);c[4531]=0;c[4530]=8040;if((c[4762]|0)!=-1){c[v>>2]=19048;c[v+4>>2]=16;c[v+8>>2]=0;e6(19048,v,116)}jR(b,18120,(c[4763]|0)-1|0);c[4529]=0;c[4528]=7976;if((c[4760]|0)!=-1){c[u>>2]=19040;c[u+4>>2]=16;c[u+8>>2]=0;e6(19040,u,116)}jR(b,18112,(c[4761]|0)-1|0);c[4603]=0;c[4602]=9672;if((c[4970]|0)!=-1){c[t>>2]=19880;c[t+4>>2]=16;c[t+8>>2]=0;e6(19880,t,116)}jR(b,18408,(c[4971]|0)-1|0);c[4601]=0;c[4600]=9608;if((c[4968]|0)!=-1){c[s>>2]=19872;c[s+4>>2]=16;c[s+8>>2]=0;e6(19872,s,116)}jR(b,18400,(c[4969]|0)-1|0);c[4599]=0;c[4598]=9544;if((c[4966]|0)!=-1){c[r>>2]=19864;c[r+4>>2]=16;c[r+8>>2]=0;e6(19864,r,116)}jR(b,18392,(c[4967]|0)-1|0);c[4597]=0;c[4596]=9480;if((c[4964]|0)!=-1){c[q>>2]=19856;c[q+4>>2]=16;c[q+8>>2]=0;e6(19856,q,116)}jR(b,18384,(c[4965]|0)-1|0);c[4493]=0;c[4492]=7448;if((c[4742]|0)!=-1){c[p>>2]=18968;c[p+4>>2]=16;c[p+8>>2]=0;e6(18968,p,116)}jR(b,17968,(c[4743]|0)-1|0);c[4491]=0;c[4490]=7408;if((c[4740]|0)!=-1){c[o>>2]=18960;c[o+4>>2]=16;c[o+8>>2]=0;e6(18960,o,116)}jR(b,17960,(c[4741]|0)-1|0);c[4489]=0;c[4488]=7368;if((c[4738]|0)!=-1){c[n>>2]=18952;c[n+4>>2]=16;c[n+8>>2]=0;e6(18952,n,116)}jR(b,17952,(c[4739]|0)-1|0);c[4487]=0;c[4486]=7328;if((c[4736]|0)!=-1){c[m>>2]=18944;c[m+4>>2]=16;c[m+8>>2]=0;e6(18944,m,116)}jR(b,17944,(c[4737]|0)-1|0);c[4507]=0;c[4506]=7648;c[4508]=7696;if((c[4750]|0)!=-1){c[l>>2]=19e3;c[l+4>>2]=16;c[l+8>>2]=0;e6(19e3,l,116)}jR(b,18024,(c[4751]|0)-1|0);c[4503]=0;c[4502]=7552;c[4504]=7600;if((c[4748]|0)!=-1){c[k>>2]=18992;c[k+4>>2]=16;c[k+8>>2]=0;e6(18992,k,116)}jR(b,18008,(c[4749]|0)-1|0);c[4499]=0;c[4498]=8552;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);c[4500]=c[4482];c[4498]=7520;if((c[4746]|0)!=-1){c[j>>2]=18984;c[j+4>>2]=16;c[j+8>>2]=0;e6(18984,j,116)}jR(b,17992,(c[4747]|0)-1|0);c[4495]=0;c[4494]=8552;do{if((a[19960]|0)==0){if((bb(19960)|0)==0){break}c[4482]=aR(1,1808,0)|0}}while(0);c[4496]=c[4482];c[4494]=7488;if((c[4744]|0)!=-1){c[h>>2]=18976;c[h+4>>2]=16;c[h+8>>2]=0;e6(18976,h,116)}jR(b,17976,(c[4745]|0)-1|0);c[4527]=0;c[4526]=7880;if((c[4758]|0)!=-1){c[g>>2]=19032;c[g+4>>2]=16;c[g+8>>2]=0;e6(19032,g,116)}jR(b,18104,(c[4759]|0)-1|0);c[4525]=0;c[4524]=7840;if((c[4756]|0)!=-1){c[f>>2]=19024;c[f+4>>2]=16;c[f+8>>2]=0;e6(19024,f,116)}jR(b,18096,(c[4757]|0)-1|0);i=e;return}function jB(a,b){a=a|0;b=b|0;return b|0}function jC(a,b,d,e,f,g,h,i){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;c[f>>2]=d;c[i>>2]=g;return 3}function jD(a,b,d,e,f,g,h,i){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;c[f>>2]=d;c[i>>2]=g;return 3}function jE(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;c[f>>2]=d;return 3}function jF(a){a=a|0;return 1}function jG(a){a=a|0;return 1}function jH(a){a=a|0;return 1}function jI(a,b){a=a|0;b=b|0;return b<<24>>24|0}function jJ(a,b,c){a=a|0;b=b|0;c=c|0;return(b>>>0<128?b&255:c)|0}function jK(a,b,c){a=a|0;b=b|0;c=c|0;return(b<<24>>24>-1?b:c)|0}function jL(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;b=d-c|0;return(b>>>0<e>>>0?b:e)|0}function jM(a){a=a|0;c[a+4>>2]=(I=c[4780]|0,c[4780]=I+1,I)+1;return}function jN(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0;if((d|0)==(e|0)){g=d;return g|0}else{h=d;i=f}while(1){c[i>>2]=a[h]|0;f=h+1|0;if((f|0)==(e|0)){g=e;break}else{h=f;i=i+4|0}}return g|0}function jO(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,i=0,j=0;if((d|0)==(e|0)){h=d;return h|0}b=((e-4+(-d|0)|0)>>>2)+1|0;i=d;j=g;while(1){g=c[i>>2]|0;a[j]=g>>>0<128?g&255:f;g=i+4|0;if((g|0)==(e|0)){break}else{i=g;j=j+1|0}}h=d+(b<<2)|0;return h|0}function jP(b,c,d,e){b=b|0;c=c|0;d=d|0;e=e|0;var f=0,g=0,h=0;if((c|0)==(d|0)){f=c;return f|0}else{g=c;h=e}while(1){a[h]=a[g]|0;e=g+1|0;if((e|0)==(d|0)){f=d;break}else{g=e;h=h+1|0}}return f|0}function jQ(b,c,d,e,f){b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0;if((c|0)==(d|0)){g=c;return g|0}else{h=c;i=f}while(1){f=a[h]|0;a[i]=f<<24>>24>-1?f:e;f=h+1|0;if((f|0)==(d|0)){g=d;break}else{h=f;i=i+1|0}}return g|0}function jR(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0;ep(b|0);e=a+8|0;f=a+12|0;a=c[f>>2]|0;g=e|0;h=c[g>>2]|0;i=a-h>>2;do{if(i>>>0>d>>>0){j=h}else{k=d+1|0;if(i>>>0<k>>>0){lg(e,k-i|0);j=c[g>>2]|0;break}if(i>>>0<=k>>>0){j=h;break}l=h+(k<<2)|0;if((l|0)==(a|0)){j=h;break}c[f>>2]=a+(~((a-4+(-l|0)|0)>>>2)<<2);j=h}}while(0);h=c[j+(d<<2)>>2]|0;if((h|0)==0){m=j;n=m+(d<<2)|0;c[n>>2]=b;return}eL(h|0)|0;m=c[g>>2]|0;n=m+(d<<2)|0;c[n>>2]=b;return}function jS(a){a=a|0;jT(a);l_(a);return}function jT(b){b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0;c[b>>2]=8584;d=b+12|0;e=c[d>>2]|0;f=b+8|0;g=c[f>>2]|0;if((e|0)!=(g|0)){h=0;i=g;g=e;while(1){e=c[i+(h<<2)>>2]|0;if((e|0)==0){j=g;k=i}else{l=e|0;eL(l)|0;j=c[d>>2]|0;k=c[f>>2]|0}l=h+1|0;if(l>>>0<j-k>>2>>>0){h=l;i=k;g=j}else{break}}}e$(b+144|0);j=c[f>>2]|0;if((j|0)==0){m=b|0;en(m);return}f=c[d>>2]|0;if((j|0)!=(f|0)){c[d>>2]=f+(~((f-4+(-j|0)|0)>>>2)<<2)}if((j|0)==(b+24|0)){a[b+136|0]=0;m=b|0;en(m);return}else{l_(j);m=b|0;en(m);return}}function jU(){var b=0,d=0;if((a[19944]|0)!=0){b=c[4474]|0;return b|0}if((bb(19944)|0)==0){b=c[4474]|0;return b|0}do{if((a[19952]|0)==0){if((bb(19952)|0)==0){break}jA(18200,1);c[4478]=18200;c[4476]=17912}}while(0);d=c[c[4476]>>2]|0;c[4480]=d;ep(d|0);c[4474]=17920;b=c[4474]|0;return b|0}function jV(a,b){a=a|0;b=b|0;var d=0;d=c[b>>2]|0;c[a>>2]=d;ep(d|0);return}function jW(a){a=a|0;eL(c[a>>2]|0)|0;return}function jX(a){a=a|0;en(a|0);l_(a);return}function jY(a){a=a|0;if((a|0)==0){return}bY[c[(c[a>>2]|0)+4>>2]&511](a);return}function jZ(a){a=a|0;en(a|0);l_(a);return}function j_(b){b=b|0;var d=0;c[b>>2]=8696;d=c[b+8>>2]|0;do{if((d|0)!=0){if((a[b+12|0]&1)==0){break}l$(d)}}while(0);en(b|0);l_(b);return}function j$(b){b=b|0;var d=0;c[b>>2]=8696;d=c[b+8>>2]|0;do{if((d|0)!=0){if((a[b+12|0]&1)==0){break}l$(d)}}while(0);en(b|0);return}function j0(a){a=a|0;en(a|0);l_(a);return}function j1(a){a=a|0;var b=0;b=c[(jU()|0)>>2]|0;c[a>>2]=b;ep(b|0);return}function j2(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0;d=i;i=i+16|0;e=d|0;f=c[a>>2]|0;a=b|0;if((c[a>>2]|0)!=-1){c[e>>2]=b;c[e+4>>2]=16;c[e+8>>2]=0;e6(a,e,116)}e=(c[b+4>>2]|0)-1|0;b=c[f+8>>2]|0;if((c[f+12>>2]|0)-b>>2>>>0<=e>>>0){g=bO(4)|0;h=g;lz(h);bk(g|0,13904,160);return 0}f=c[b+(e<<2)>>2]|0;if((f|0)==0){g=bO(4)|0;h=g;lz(h);bk(g|0,13904,160);return 0}else{i=d;return f|0}return 0}function j3(a,d,e){a=a|0;d=d|0;e=e|0;var f=0;if(e>>>0>=128){f=0;return f|0}f=(b[(c[(a5()|0)>>2]|0)+(e<<1)>>1]&d)<<16>>16!=0;return f|0}function j4(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0;if((d|0)==(e|0)){g=d;return g|0}else{h=d;i=f}while(1){f=c[h>>2]|0;if(f>>>0<128){j=b[(c[(a5()|0)>>2]|0)+(f<<1)>>1]|0}else{j=0}b[i>>1]=j;f=h+4|0;if((f|0)==(e|0)){g=e;break}else{h=f;i=i+2|0}}return g|0}function j5(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0;if((e|0)==(f|0)){g=e;return g|0}else{h=e}while(1){e=c[h>>2]|0;if(e>>>0<128){if((b[(c[(a5()|0)>>2]|0)+(e<<1)>>1]&d)<<16>>16!=0){g=h;i=244;break}}e=h+4|0;if((e|0)==(f|0)){g=f;i=245;break}else{h=e}}if((i|0)==244){return g|0}else if((i|0)==245){return g|0}return 0}function j6(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0;L280:do{if((e|0)==(f|0)){g=e}else{a=e;while(1){h=c[a>>2]|0;if(h>>>0>=128){g=a;break L280}i=a+4|0;if((b[(c[(a5()|0)>>2]|0)+(h<<1)>>1]&d)<<16>>16==0){g=a;break L280}if((i|0)==(f|0)){g=f;break}else{a=i}}}}while(0);return g|0}function j7(a,b){a=a|0;b=b|0;var d=0;if(b>>>0>=128){d=b;return d|0}d=c[(c[(bR()|0)>>2]|0)+(b<<2)>>2]|0;return d|0}function j8(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0;if((b|0)==(d|0)){e=b;return e|0}else{f=b}while(1){b=c[f>>2]|0;if(b>>>0<128){g=c[(c[(bR()|0)>>2]|0)+(b<<2)>>2]|0}else{g=b}c[f>>2]=g;b=f+4|0;if((b|0)==(d|0)){e=d;break}else{f=b}}return e|0}function j9(a,b){a=a|0;b=b|0;var d=0;if(b>>>0>=128){d=b;return d|0}d=c[(c[(bS()|0)>>2]|0)+(b<<2)>>2]|0;return d|0}function ka(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0;if((b|0)==(d|0)){e=b;return e|0}else{f=b}while(1){b=c[f>>2]|0;if(b>>>0<128){g=c[(c[(bS()|0)>>2]|0)+(b<<2)>>2]|0}else{g=b}c[f>>2]=g;b=f+4|0;if((b|0)==(d|0)){e=d;break}else{f=b}}return e|0}function kb(a,b){a=a|0;b=b|0;var d=0;if(b<<24>>24<=-1){d=b;return d|0}d=c[(c[(bR()|0)>>2]|0)+(b<<24>>24<<2)>>2]&255;return d|0}function kc(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;if((d|0)==(e|0)){f=d;return f|0}else{g=d}while(1){d=a[g]|0;if(d<<24>>24>-1){h=c[(c[(bR()|0)>>2]|0)+(d<<24>>24<<2)>>2]&255}else{h=d}a[g]=h;d=g+1|0;if((d|0)==(e|0)){f=e;break}else{g=d}}return f|0}function kd(a,b){a=a|0;b=b|0;var d=0;if(b<<24>>24<=-1){d=b;return d|0}d=c[(c[(bS()|0)>>2]|0)+(b<<24>>24<<2)>>2]&255;return d|0}function ke(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;if((d|0)==(e|0)){f=d;return f|0}else{g=d}while(1){d=a[g]|0;if(d<<24>>24>-1){h=c[(c[(bS()|0)>>2]|0)+(d<<24>>24<<2)>>2]&255}else{h=d}a[g]=h;d=g+1|0;if((d|0)==(e|0)){f=e;break}else{g=d}}return f|0}function kf(a){a=a|0;var b=0;c[a>>2]=8328;b=c[a+8>>2]|0;if((b|0)!=0){a6(b|0)}en(a|0);l_(a);return}function kg(a){a=a|0;return 0}function kh(a){a=a|0;en(a|0);l_(a);return}function ki(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0;b=i;i=i+16|0;a=b|0;k=b+8|0;c[a>>2]=d;c[k>>2]=g;l=kt(d,e,a,g,h,k,1114111,0)|0;c[f>>2]=d+((c[a>>2]|0)-d>>1<<1);c[j>>2]=g+((c[k>>2]|0)-g);i=b;return l|0}function kj(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0;l=i;i=i+8|0;m=l|0;n=m;o=i;i=i+1|0;i=i+7>>3<<3;p=(e|0)==(f|0);L359:do{if(p){c[k>>2]=h;c[g>>2]=e;q=e}else{r=e;while(1){s=r+4|0;if((c[r>>2]|0)==0){t=r;break}if((s|0)==(f|0)){t=f;break}else{r=s}}c[k>>2]=h;c[g>>2]=e;if(p|(h|0)==(j|0)){q=e;break}r=d;s=j;u=b+8|0;v=o|0;w=h;x=e;y=t;while(1){z=c[r+4>>2]|0;c[m>>2]=c[r>>2];c[m+4>>2]=z;z=bC(c[u>>2]|0)|0;A=lp(w,g,y-x>>2,s-w|0,d)|0;if((z|0)!=0){bC(z|0)|0}if((A|0)==(-1|0)){B=339;break}else if((A|0)==0){C=1;B=375;break}z=(c[k>>2]|0)+A|0;c[k>>2]=z;if((z|0)==(j|0)){B=372;break}if((y|0)==(f|0)){D=f;E=z;F=c[g>>2]|0}else{z=bC(c[u>>2]|0)|0;A=lo(v,0,d)|0;if((z|0)!=0){bC(z|0)|0}if((A|0)==-1){C=2;B=377;break}z=c[k>>2]|0;if(A>>>0>(s-z|0)>>>0){C=1;B=378;break}L383:do{if((A|0)!=0){G=A;H=v;I=z;while(1){J=a[H]|0;c[k>>2]=I+1;a[I]=J;J=G-1|0;if((J|0)==0){break L383}G=J;H=H+1|0;I=c[k>>2]|0}}}while(0);z=(c[g>>2]|0)+4|0;c[g>>2]=z;L388:do{if((z|0)==(f|0)){K=f}else{A=z;while(1){I=A+4|0;if((c[A>>2]|0)==0){K=A;break L388}if((I|0)==(f|0)){K=f;break}else{A=I}}}}while(0);D=K;E=c[k>>2]|0;F=z}if((F|0)==(f|0)|(E|0)==(j|0)){q=F;break L359}else{w=E;x=F;y=D}}if((B|0)==339){c[k>>2]=w;L396:do{if((x|0)==(c[g>>2]|0)){L=x}else{y=x;v=w;while(1){s=c[y>>2]|0;r=bC(c[u>>2]|0)|0;A=lo(v,s,n)|0;if((r|0)!=0){bC(r|0)|0}if((A|0)==-1){L=y;break L396}r=(c[k>>2]|0)+A|0;c[k>>2]=r;A=y+4|0;if((A|0)==(c[g>>2]|0)){L=A;break}else{y=A;v=r}}}}while(0);c[g>>2]=L;C=2;i=l;return C|0}else if((B|0)==372){q=c[g>>2]|0;break}else if((B|0)==375){i=l;return C|0}else if((B|0)==377){i=l;return C|0}else if((B|0)==378){i=l;return C|0}}}while(0);C=(q|0)!=(f|0)|0;i=l;return C|0}function kk(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0;l=i;i=i+8|0;m=l|0;n=m;o=(e|0)==(f|0);L413:do{if(o){c[k>>2]=h;c[g>>2]=e;p=e}else{q=e;while(1){r=q+1|0;if((a[q]|0)==0){s=q;break}if((r|0)==(f|0)){s=f;break}else{q=r}}c[k>>2]=h;c[g>>2]=e;if(o|(h|0)==(j|0)){p=e;break}q=d;r=j;t=b+8|0;u=h;v=e;w=s;while(1){x=c[q+4>>2]|0;c[m>>2]=c[q>>2];c[m+4>>2]=x;y=w;x=bC(c[t>>2]|0)|0;z=ll(u,g,y-v|0,r-u>>2,d)|0;if((x|0)!=0){bC(x|0)|0}if((z|0)==0){A=2;B=431;break}else if((z|0)==(-1|0)){B=395;break}x=(c[k>>2]|0)+(z<<2)|0;c[k>>2]=x;if((x|0)==(j|0)){B=427;break}z=c[g>>2]|0;if((w|0)==(f|0)){C=f;D=x;E=z}else{F=bC(c[t>>2]|0)|0;G=lk(x,z,1,d)|0;if((F|0)!=0){bC(F|0)|0}if((G|0)!=0){A=2;B=432;break}c[k>>2]=(c[k>>2]|0)+4;G=(c[g>>2]|0)+1|0;c[g>>2]=G;L435:do{if((G|0)==(f|0)){H=f}else{F=G;while(1){z=F+1|0;if((a[F]|0)==0){H=F;break L435}if((z|0)==(f|0)){H=f;break}else{F=z}}}}while(0);C=H;D=c[k>>2]|0;E=G}if((E|0)==(f|0)|(D|0)==(j|0)){p=E;break L413}else{u=D;v=E;w=C}}if((B|0)==432){i=l;return A|0}else if((B|0)==431){i=l;return A|0}else if((B|0)==395){c[k>>2]=u;L445:do{if((v|0)==(c[g>>2]|0)){I=v}else{w=u;r=v;while(1){q=bC(c[t>>2]|0)|0;F=lk(w,r,y-r|0,n)|0;if((q|0)!=0){bC(q|0)|0}if((F|0)==0){J=r+1|0}else if((F|0)==(-1|0)){B=406;break}else if((F|0)==(-2|0)){B=407;break}else{J=r+F|0}F=(c[k>>2]|0)+4|0;c[k>>2]=F;if((J|0)==(c[g>>2]|0)){I=J;break L445}else{w=F;r=J}}if((B|0)==406){c[g>>2]=r;A=2;i=l;return A|0}else if((B|0)==407){c[g>>2]=r;A=1;i=l;return A|0}}}while(0);c[g>>2]=I;A=(I|0)!=(f|0)|0;i=l;return A|0}else if((B|0)==427){p=c[g>>2]|0;break}}}while(0);A=(p|0)!=(f|0)|0;i=l;return A|0}function kl(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0;h=i;i=i+8|0;c[g>>2]=e;e=h|0;j=bC(c[b+8>>2]|0)|0;b=lo(e,0,d)|0;if((j|0)!=0){bC(j|0)|0}if((b|0)==(-1|0)|(b|0)==0){k=2;i=h;return k|0}j=b-1|0;b=c[g>>2]|0;if(j>>>0>(f-b|0)>>>0){k=1;i=h;return k|0}if((j|0)==0){k=0;i=h;return k|0}else{l=j;m=e;n=b}while(1){b=a[m]|0;c[g>>2]=n+1;a[n]=b;b=l-1|0;if((b|0)==0){k=0;break}l=b;m=m+1|0;n=c[g>>2]|0}i=h;return k|0}function km(a){a=a|0;var b=0,d=0,e=0,f=0,g=0;b=a+8|0;a=bC(c[b>>2]|0)|0;d=ln(0,0,1)|0;if((a|0)!=0){bC(a|0)|0}if((d|0)!=0){e=-1;return e|0}d=c[b>>2]|0;if((d|0)==0){e=1;return e|0}e=bC(d|0)|0;d=bc()|0;if((e|0)==0){f=(d|0)==1;g=f&1;return g|0}bC(e|0)|0;f=(d|0)==1;g=f&1;return g|0}function kn(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0;if((f|0)==0|(d|0)==(e|0)){g=0;return g|0}h=e;i=a+8|0;a=d;d=0;j=0;while(1){k=bC(c[i>>2]|0)|0;l=lj(a,h-a|0,b)|0;if((k|0)!=0){bC(k|0)|0}if((l|0)==(-1|0)|(l|0)==(-2|0)){g=d;m=497;break}else if((l|0)==0){n=1;o=a+1|0}else{n=l;o=a+l|0}l=n+d|0;k=j+1|0;if(k>>>0>=f>>>0|(o|0)==(e|0)){g=l;m=495;break}else{a=o;d=l;j=k}}if((m|0)==497){return g|0}else if((m|0)==495){return g|0}return 0}function ko(a){a=a|0;var b=0,d=0,e=0;b=c[a+8>>2]|0;do{if((b|0)==0){d=1}else{a=bC(b|0)|0;e=bc()|0;if((a|0)==0){d=e;break}bC(a|0)|0;d=e}}while(0);return d|0}function kp(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;c[f>>2]=d;return 3}function kq(a){a=a|0;return 0}function kr(a){a=a|0;return 0}function ks(a){a=a|0;return 4}function kt(d,f,g,h,i,j,k,l){d=d|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0;c[g>>2]=d;c[j>>2]=h;do{if((l&2|0)!=0){if((i-h|0)<3){m=1;return m|0}else{c[j>>2]=h+1;a[h]=-17;d=c[j>>2]|0;c[j>>2]=d+1;a[d]=-69;d=c[j>>2]|0;c[j>>2]=d+1;a[d]=-65;break}}}while(0);h=f;l=c[g>>2]|0;if(l>>>0>=f>>>0){m=0;return m|0}d=i;i=l;L539:while(1){l=b[i>>1]|0;n=l&65535;if(n>>>0>k>>>0){m=2;o=541;break}do{if((l&65535)<128){p=c[j>>2]|0;if((d-p|0)<1){m=1;o=550;break L539}c[j>>2]=p+1;a[p]=l&255}else{if((l&65535)<2048){p=c[j>>2]|0;if((d-p|0)<2){m=1;o=540;break L539}c[j>>2]=p+1;a[p]=(n>>>6|192)&255;p=c[j>>2]|0;c[j>>2]=p+1;a[p]=(n&63|128)&255;break}if((l&65535)<55296){p=c[j>>2]|0;if((d-p|0)<3){m=1;o=546;break L539}c[j>>2]=p+1;a[p]=(n>>>12|224)&255;p=c[j>>2]|0;c[j>>2]=p+1;a[p]=(n>>>6&63|128)&255;p=c[j>>2]|0;c[j>>2]=p+1;a[p]=(n&63|128)&255;break}if((l&65535)>=56320){if((l&65535)<57344){m=2;o=549;break L539}p=c[j>>2]|0;if((d-p|0)<3){m=1;o=545;break L539}c[j>>2]=p+1;a[p]=(n>>>12|224)&255;p=c[j>>2]|0;c[j>>2]=p+1;a[p]=(n>>>6&63|128)&255;p=c[j>>2]|0;c[j>>2]=p+1;a[p]=(n&63|128)&255;break}if((h-i|0)<4){m=1;o=551;break L539}p=i+2|0;q=e[p>>1]|0;if((q&64512|0)!=56320){m=2;o=552;break L539}if((d-(c[j>>2]|0)|0)<4){m=1;o=543;break L539}r=n&960;if(((r<<10)+65536|n<<10&64512|q&1023)>>>0>k>>>0){m=2;o=544;break L539}c[g>>2]=p;p=(r>>>6)+1|0;r=c[j>>2]|0;c[j>>2]=r+1;a[r]=(p>>>2|240)&255;r=c[j>>2]|0;c[j>>2]=r+1;a[r]=(n>>>2&15|p<<4&48|128)&255;p=c[j>>2]|0;c[j>>2]=p+1;a[p]=(n<<4&48|q>>>6&15|128)&255;p=c[j>>2]|0;c[j>>2]=p+1;a[p]=(q&63|128)&255}}while(0);n=(c[g>>2]|0)+2|0;c[g>>2]=n;if(n>>>0<f>>>0){i=n}else{m=0;o=548;break}}if((o|0)==545){return m|0}else if((o|0)==546){return m|0}else if((o|0)==543){return m|0}else if((o|0)==544){return m|0}else if((o|0)==548){return m|0}else if((o|0)==549){return m|0}else if((o|0)==550){return m|0}else if((o|0)==551){return m|0}else if((o|0)==540){return m|0}else if((o|0)==541){return m|0}else if((o|0)==552){return m|0}return 0}function ku(e,f,g,h,i,j,k,l){e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;c[g>>2]=e;c[j>>2]=h;h=c[g>>2]|0;do{if((l&4|0)==0){m=h}else{if((f-h|0)<=2){m=h;break}if((a[h]|0)!=-17){m=h;break}if((a[h+1|0]|0)!=-69){m=h;break}if((a[h+2|0]|0)!=-65){m=h;break}e=h+3|0;c[g>>2]=e;m=e}}while(0);L584:do{if(m>>>0<f>>>0){h=f;l=i;e=c[j>>2]|0;n=m;L586:while(1){if(e>>>0>=i>>>0){o=n;break L584}p=a[n]|0;q=p&255;if(q>>>0>k>>>0){r=2;s=597;break}do{if(p<<24>>24>-1){b[e>>1]=p&255;c[g>>2]=(c[g>>2]|0)+1}else{if((p&255)<194){r=2;s=598;break L586}if((p&255)<224){if((h-n|0)<2){r=1;s=599;break L586}t=d[n+1|0]|0;if((t&192|0)!=128){r=2;s=600;break L586}u=t&63|q<<6&1984;if(u>>>0>k>>>0){r=2;s=601;break L586}b[e>>1]=u&65535;c[g>>2]=(c[g>>2]|0)+2;break}if((p&255)<240){if((h-n|0)<3){r=1;s=608;break L586}u=a[n+1|0]|0;t=a[n+2|0]|0;if((q|0)==224){if((u&-32)<<24>>24!=-96){r=2;s=594;break L586}}else if((q|0)==237){if((u&-32)<<24>>24!=-128){r=2;s=595;break L586}}else{if((u&-64)<<24>>24!=-128){r=2;s=609;break L586}}v=t&255;if((v&192|0)!=128){r=2;s=610;break L586}t=(u&255)<<6&4032|q<<12|v&63;if((t&65535)>>>0>k>>>0){r=2;s=603;break L586}b[e>>1]=t&65535;c[g>>2]=(c[g>>2]|0)+3;break}if((p&255)>=245){r=2;s=614;break L586}if((h-n|0)<4){r=1;s=596;break L586}t=a[n+1|0]|0;v=a[n+2|0]|0;u=a[n+3|0]|0;if((q|0)==244){if((t&-16)<<24>>24!=-128){r=2;s=604;break L586}}else if((q|0)==240){if((t+112&255)>=48){r=2;s=611;break L586}}else{if((t&-64)<<24>>24!=-128){r=2;s=605;break L586}}w=v&255;if((w&192|0)!=128){r=2;s=606;break L586}v=u&255;if((v&192|0)!=128){r=2;s=612;break L586}if((l-e|0)<4){r=1;s=613;break L586}u=q&7;x=t&255;t=w<<6;y=v&63;if((x<<12&258048|u<<18|t&4032|y)>>>0>k>>>0){r=2;s=602;break L586}b[e>>1]=(x<<2&60|w>>>4&3|((x>>>4&3|u<<2)<<6)+16320|55296)&65535;u=(c[j>>2]|0)+2|0;c[j>>2]=u;b[u>>1]=(y|t&960|56320)&65535;c[g>>2]=(c[g>>2]|0)+4}}while(0);q=(c[j>>2]|0)+2|0;c[j>>2]=q;p=c[g>>2]|0;if(p>>>0<f>>>0){e=q;n=p}else{o=p;break L584}}if((s|0)==609){return r|0}else if((s|0)==610){return r|0}else if((s|0)==611){return r|0}else if((s|0)==612){return r|0}else if((s|0)==613){return r|0}else if((s|0)==614){return r|0}else if((s|0)==596){return r|0}else if((s|0)==597){return r|0}else if((s|0)==598){return r|0}else if((s|0)==599){return r|0}else if((s|0)==600){return r|0}else if((s|0)==601){return r|0}else if((s|0)==594){return r|0}else if((s|0)==595){return r|0}else if((s|0)==602){return r|0}else if((s|0)==603){return r|0}else if((s|0)==604){return r|0}else if((s|0)==605){return r|0}else if((s|0)==606){return r|0}else if((s|0)==608){return r|0}}else{o=m}}while(0);r=o>>>0<f>>>0|0;return r|0}function kv(b,c,e,f,g){b=b|0;c=c|0;e=e|0;f=f|0;g=g|0;var h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;do{if((g&4|0)==0){h=b}else{if((c-b|0)<=2){h=b;break}if((a[b]|0)!=-17){h=b;break}if((a[b+1|0]|0)!=-69){h=b;break}h=(a[b+2|0]|0)==-65?b+3|0:b}}while(0);L653:do{if(h>>>0<c>>>0&(e|0)!=0){g=c;i=0;j=h;L655:while(1){k=a[j]|0;l=k&255;if(l>>>0>f>>>0){m=j;break L653}do{if(k<<24>>24>-1){n=j+1|0;o=i}else{if((k&255)<194){m=j;break L653}if((k&255)<224){if((g-j|0)<2){m=j;break L653}p=d[j+1|0]|0;if((p&192|0)!=128){m=j;break L653}if((p&63|l<<6&1984)>>>0>f>>>0){m=j;break L653}n=j+2|0;o=i;break}if((k&255)<240){q=j;if((g-q|0)<3){m=j;break L653}p=a[j+1|0]|0;r=a[j+2|0]|0;if((l|0)==224){if((p&-32)<<24>>24!=-96){s=635;break L655}}else if((l|0)==237){if((p&-32)<<24>>24!=-128){s=637;break L655}}else{if((p&-64)<<24>>24!=-128){s=639;break L655}}t=r&255;if((t&192|0)!=128){m=j;break L653}if(((p&255)<<6&4032|l<<12&61440|t&63)>>>0>f>>>0){m=j;break L653}n=j+3|0;o=i;break}if((k&255)>=245){m=j;break L653}u=j;if((g-u|0)<4){m=j;break L653}if((e-i|0)>>>0<2){m=j;break L653}t=a[j+1|0]|0;p=a[j+2|0]|0;r=a[j+3|0]|0;if((l|0)==240){if((t+112&255)>=48){s=648;break L655}}else if((l|0)==244){if((t&-16)<<24>>24!=-128){s=650;break L655}}else{if((t&-64)<<24>>24!=-128){s=652;break L655}}v=p&255;if((v&192|0)!=128){m=j;break L653}p=r&255;if((p&192|0)!=128){m=j;break L653}if(((t&255)<<12&258048|l<<18&1835008|v<<6&4032|p&63)>>>0>f>>>0){m=j;break L653}n=j+4|0;o=i+1|0}}while(0);l=o+1|0;if(n>>>0<c>>>0&l>>>0<e>>>0){i=l;j=n}else{m=n;break L653}}if((s|0)==635){w=q-b|0;return w|0}else if((s|0)==637){w=q-b|0;return w|0}else if((s|0)==639){w=q-b|0;return w|0}else if((s|0)==648){w=u-b|0;return w|0}else if((s|0)==650){w=u-b|0;return w|0}else if((s|0)==652){w=u-b|0;return w|0}}else{m=h}}while(0);w=m-b|0;return w|0}function kw(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0;b=i;i=i+16|0;a=b|0;k=b+8|0;c[a>>2]=d;c[k>>2]=g;l=ku(d,e,a,g,h,k,1114111,0)|0;c[f>>2]=d+((c[a>>2]|0)-d);c[j>>2]=g+((c[k>>2]|0)-g>>1<<1);i=b;return l|0}function kx(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return kv(c,d,e,1114111,0)|0}function ky(a){a=a|0;en(a|0);l_(a);return}function kz(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0;b=i;i=i+16|0;a=b|0;k=b+8|0;c[a>>2]=d;c[k>>2]=g;l=kE(d,e,a,g,h,k,1114111,0)|0;c[f>>2]=d+((c[a>>2]|0)-d>>2<<2);c[j>>2]=g+((c[k>>2]|0)-g);i=b;return l|0}function kA(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;c[f>>2]=d;return 3}function kB(a){a=a|0;return 0}function kC(a){a=a|0;return 0}function kD(a){a=a|0;return 4}function kE(b,d,e,f,g,h,i,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;var k=0,l=0,m=0,n=0;c[e>>2]=b;c[h>>2]=f;do{if((j&2|0)!=0){if((g-f|0)<3){k=1;return k|0}else{c[h>>2]=f+1;a[f]=-17;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=-69;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=-65;break}}}while(0);f=c[e>>2]|0;if(f>>>0>=d>>>0){k=0;return k|0}j=g;g=f;L724:while(1){f=c[g>>2]|0;if((f&-2048|0)==55296|f>>>0>i>>>0){k=2;l=701;break}do{if(f>>>0<128){b=c[h>>2]|0;if((j-b|0)<1){k=1;l=695;break L724}c[h>>2]=b+1;a[b]=f&255}else{if(f>>>0<2048){b=c[h>>2]|0;if((j-b|0)<2){k=1;l=696;break L724}c[h>>2]=b+1;a[b]=(f>>>6|192)&255;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=(f&63|128)&255;break}b=c[h>>2]|0;m=j-b|0;if(f>>>0<65536){if((m|0)<3){k=1;l=697;break L724}c[h>>2]=b+1;a[b]=(f>>>12|224)&255;n=c[h>>2]|0;c[h>>2]=n+1;a[n]=(f>>>6&63|128)&255;n=c[h>>2]|0;c[h>>2]=n+1;a[n]=(f&63|128)&255;break}else{if((m|0)<4){k=1;l=698;break L724}c[h>>2]=b+1;a[b]=(f>>>18|240)&255;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=(f>>>12&63|128)&255;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=(f>>>6&63|128)&255;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=(f&63|128)&255;break}}}while(0);f=(c[e>>2]|0)+4|0;c[e>>2]=f;if(f>>>0<d>>>0){g=f}else{k=0;l=699;break}}if((l|0)==697){return k|0}else if((l|0)==698){return k|0}else if((l|0)==701){return k|0}else if((l|0)==699){return k|0}else if((l|0)==695){return k|0}else if((l|0)==696){return k|0}return 0}function kF(b,e,f,g,h,i,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;c[f>>2]=b;c[i>>2]=g;g=c[f>>2]|0;do{if((k&4|0)==0){l=g}else{if((e-g|0)<=2){l=g;break}if((a[g]|0)!=-17){l=g;break}if((a[g+1|0]|0)!=-69){l=g;break}if((a[g+2|0]|0)!=-65){l=g;break}b=g+3|0;c[f>>2]=b;l=b}}while(0);L756:do{if(l>>>0<e>>>0){g=e;k=c[i>>2]|0;b=l;L758:while(1){if(k>>>0>=h>>>0){m=b;break L756}n=a[b]|0;o=n&255;do{if(n<<24>>24>-1){if(o>>>0>j>>>0){p=2;q=761;break L758}c[k>>2]=o;c[f>>2]=(c[f>>2]|0)+1}else{if((n&255)<194){p=2;q=748;break L758}if((n&255)<224){if((g-b|0)<2){p=1;q=749;break L758}r=d[b+1|0]|0;if((r&192|0)!=128){p=2;q=752;break L758}s=r&63|o<<6&1984;if(s>>>0>j>>>0){p=2;q=750;break L758}c[k>>2]=s;c[f>>2]=(c[f>>2]|0)+2;break}if((n&255)<240){if((g-b|0)<3){p=1;q=744;break L758}s=a[b+1|0]|0;r=a[b+2|0]|0;if((o|0)==224){if((s&-32)<<24>>24!=-96){p=2;q=742;break L758}}else if((o|0)==237){if((s&-32)<<24>>24!=-128){p=2;q=753;break L758}}else{if((s&-64)<<24>>24!=-128){p=2;q=754;break L758}}t=r&255;if((t&192|0)!=128){p=2;q=743;break L758}r=(s&255)<<6&4032|o<<12&61440|t&63;if(r>>>0>j>>>0){p=2;q=758;break L758}c[k>>2]=r;c[f>>2]=(c[f>>2]|0)+3;break}if((n&255)>=245){p=2;q=756;break L758}if((g-b|0)<4){p=1;q=757;break L758}r=a[b+1|0]|0;t=a[b+2|0]|0;s=a[b+3|0]|0;if((o|0)==240){if((r+112&255)>=48){p=2;q=759;break L758}}else if((o|0)==244){if((r&-16)<<24>>24!=-128){p=2;q=760;break L758}}else{if((r&-64)<<24>>24!=-128){p=2;q=745;break L758}}u=t&255;if((u&192|0)!=128){p=2;q=746;break L758}t=s&255;if((t&192|0)!=128){p=2;q=747;break L758}s=(r&255)<<12&258048|o<<18&1835008|u<<6&4032|t&63;if(s>>>0>j>>>0){p=2;q=751;break L758}c[k>>2]=s;c[f>>2]=(c[f>>2]|0)+4}}while(0);o=(c[i>>2]|0)+4|0;c[i>>2]=o;n=c[f>>2]|0;if(n>>>0<e>>>0){k=o;b=n}else{m=n;break L756}}if((q|0)==758){return p|0}else if((q|0)==759){return p|0}else if((q|0)==760){return p|0}else if((q|0)==761){return p|0}else if((q|0)==744){return p|0}else if((q|0)==745){return p|0}else if((q|0)==746){return p|0}else if((q|0)==747){return p|0}else if((q|0)==748){return p|0}else if((q|0)==749){return p|0}else if((q|0)==750){return p|0}else if((q|0)==742){return p|0}else if((q|0)==743){return p|0}else if((q|0)==751){return p|0}else if((q|0)==752){return p|0}else if((q|0)==753){return p|0}else if((q|0)==754){return p|0}else if((q|0)==756){return p|0}else if((q|0)==757){return p|0}}else{m=l}}while(0);p=m>>>0<e>>>0|0;return p|0}function kG(b,c,e,f,g){b=b|0;c=c|0;e=e|0;f=f|0;g=g|0;var h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;do{if((g&4|0)==0){h=b}else{if((c-b|0)<=2){h=b;break}if((a[b]|0)!=-17){h=b;break}if((a[b+1|0]|0)!=-69){h=b;break}h=(a[b+2|0]|0)==-65?b+3|0:b}}while(0);L823:do{if(h>>>0<c>>>0&(e|0)!=0){g=c;i=1;j=h;L825:while(1){k=a[j]|0;l=k&255;do{if(k<<24>>24>-1){if(l>>>0>f>>>0){m=j;break L823}n=j+1|0}else{if((k&255)<194){m=j;break L823}if((k&255)<224){if((g-j|0)<2){m=j;break L823}o=d[j+1|0]|0;if((o&192|0)!=128){m=j;break L823}if((o&63|l<<6&1984)>>>0>f>>>0){m=j;break L823}n=j+2|0;break}if((k&255)<240){p=j;if((g-p|0)<3){m=j;break L823}o=a[j+1|0]|0;q=a[j+2|0]|0;if((l|0)==224){if((o&-32)<<24>>24!=-96){r=782;break L825}}else if((l|0)==237){if((o&-32)<<24>>24!=-128){r=784;break L825}}else{if((o&-64)<<24>>24!=-128){r=786;break L825}}s=q&255;if((s&192|0)!=128){m=j;break L823}if(((o&255)<<6&4032|l<<12&61440|s&63)>>>0>f>>>0){m=j;break L823}n=j+3|0;break}if((k&255)>=245){m=j;break L823}t=j;if((g-t|0)<4){m=j;break L823}s=a[j+1|0]|0;o=a[j+2|0]|0;q=a[j+3|0]|0;if((l|0)==240){if((s+112&255)>=48){r=794;break L825}}else if((l|0)==244){if((s&-16)<<24>>24!=-128){r=796;break L825}}else{if((s&-64)<<24>>24!=-128){r=798;break L825}}u=o&255;if((u&192|0)!=128){m=j;break L823}o=q&255;if((o&192|0)!=128){m=j;break L823}if(((s&255)<<12&258048|l<<18&1835008|u<<6&4032|o&63)>>>0>f>>>0){m=j;break L823}n=j+4|0}}while(0);if(!(n>>>0<c>>>0&i>>>0<e>>>0)){m=n;break L823}i=i+1|0;j=n}if((r|0)==782){v=p-b|0;return v|0}else if((r|0)==784){v=p-b|0;return v|0}else if((r|0)==786){v=p-b|0;return v|0}else if((r|0)==794){v=t-b|0;return v|0}else if((r|0)==796){v=t-b|0;return v|0}else if((r|0)==798){v=t-b|0;return v|0}}else{m=h}}while(0);v=m-b|0;return v|0}function kH(b){b=b|0;return a[b+8|0]|0}function kI(a){a=a|0;return c[a+8>>2]|0}function kJ(b){b=b|0;return a[b+9|0]|0}function kK(a){a=a|0;return c[a+12>>2]|0}function kL(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0;b=i;i=i+16|0;a=b|0;k=b+8|0;c[a>>2]=d;c[k>>2]=g;l=kF(d,e,a,g,h,k,1114111,0)|0;c[f>>2]=d+((c[a>>2]|0)-d);c[j>>2]=g+((c[k>>2]|0)-g>>2<<2);i=b;return l|0}function kM(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return kG(c,d,e,1114111,0)|0}function kN(a){a=a|0;en(a|0);l_(a);return}function kO(a){a=a|0;en(a|0);l_(a);return}function kP(a){a=a|0;c[a>>2]=7792;e$(a+12|0);en(a|0);l_(a);return}function kQ(a){a=a|0;c[a>>2]=7792;e$(a+12|0);en(a|0);return}function kR(a){a=a|0;c[a>>2]=7744;e$(a+16|0);en(a|0);l_(a);return}function kS(a){a=a|0;c[a>>2]=7744;e$(a+16|0);en(a|0);return}function kT(a,b){a=a|0;b=b|0;e8(a,b+12|0);return}function kU(a,b){a=a|0;b=b|0;e8(a,b+16|0);return}function kV(a,b){a=a|0;b=b|0;e9(a,1640,4);return}function kW(a,b){a=a|0;b=b|0;fe(a,1552,lv(1552)|0);return}function kX(a,b){a=a|0;b=b|0;e9(a,1520,5);return}function kY(a,b){a=a|0;b=b|0;fe(a,1496,lv(1496)|0);return}function kZ(b){b=b|0;var d=0;if((a[20040]|0)!=0){d=c[4628]|0;return d|0}if((bb(20040)|0)==0){d=c[4628]|0;return d|0}do{if((a[19928]|0)==0){if((bb(19928)|0)==0){break}l6(17440,0,168);a_(320,0,u|0)|0}}while(0);e0(17440,2240)|0;e0(17452,2232)|0;e0(17464,2224)|0;e0(17476,2208)|0;e0(17488,2192)|0;e0(17500,2184)|0;e0(17512,2168)|0;e0(17524,2160)|0;e0(17536,2152)|0;e0(17548,2080)|0;e0(17560,2072)|0;e0(17572,2064)|0;e0(17584,2048)|0;e0(17596,2040)|0;c[4628]=17440;d=c[4628]|0;return d|0}function k_(b){b=b|0;var d=0;if((a[19984]|0)!=0){d=c[4606]|0;return d|0}if((bb(19984)|0)==0){d=c[4606]|0;return d|0}do{if((a[19904]|0)==0){if((bb(19904)|0)==0){break}l6(16696,0,168);a_(178,0,u|0)|0}}while(0);e5(16696,2704)|0;e5(16708,2672)|0;e5(16720,2640)|0;e5(16732,2600)|0;e5(16744,2496)|0;e5(16756,2464)|0;e5(16768,2424)|0;e5(16780,2408)|0;e5(16792,2352)|0;e5(16804,2336)|0;e5(16816,2320)|0;e5(16828,2304)|0;e5(16840,2288)|0;e5(16852,2272)|0;c[4606]=16696;d=c[4606]|0;return d|0}function k$(b){b=b|0;var d=0;if((a[20032]|0)!=0){d=c[4626]|0;return d|0}if((bb(20032)|0)==0){d=c[4626]|0;return d|0}do{if((a[19920]|0)==0){if((bb(19920)|0)==0){break}l6(17152,0,288);a_(206,0,u|0)|0}}while(0);e0(17152,296)|0;e0(17164,280)|0;e0(17176,272)|0;e0(17188,264)|0;e0(17200,256)|0;e0(17212,248)|0;e0(17224,240)|0;e0(17236,232)|0;e0(17248,208)|0;e0(17260,200)|0;e0(17272,184)|0;e0(17284,128)|0;e0(17296,120)|0;e0(17308,112)|0;e0(17320,104)|0;e0(17332,96)|0;e0(17344,256)|0;e0(17356,88)|0;e0(17368,80)|0;e0(17380,2768)|0;e0(17392,2760)|0;e0(17404,2752)|0;e0(17416,2744)|0;e0(17428,2736)|0;c[4626]=17152;d=c[4626]|0;return d|0}function k0(b){b=b|0;var d=0;if((a[19976]|0)!=0){d=c[4604]|0;return d|0}if((bb(19976)|0)==0){d=c[4604]|0;return d|0}do{if((a[19896]|0)==0){if((bb(19896)|0)==0){break}l6(16408,0,288);a_(146,0,u|0)|0}}while(0);e5(16408,928)|0;e5(16420,888)|0;e5(16432,864)|0;e5(16444,832)|0;e5(16456,448)|0;e5(16468,808)|0;e5(16480,784)|0;e5(16492,752)|0;e5(16504,712)|0;e5(16516,680)|0;e5(16528,640)|0;e5(16540,600)|0;e5(16552,584)|0;e5(16564,496)|0;e5(16576,480)|0;e5(16588,464)|0;e5(16600,448)|0;e5(16612,432)|0;e5(16624,416)|0;e5(16636,400)|0;e5(16648,368)|0;e5(16660,352)|0;e5(16672,336)|0;e5(16684,304)|0;c[4604]=16408;d=c[4604]|0;return d|0}function k1(b){b=b|0;var d=0;if((a[20048]|0)!=0){d=c[4630]|0;return d|0}if((bb(20048)|0)==0){d=c[4630]|0;return d|0}do{if((a[19936]|0)==0){if((bb(19936)|0)==0){break}l6(17608,0,288);a_(144,0,u|0)|0}}while(0);e0(17608,968)|0;e0(17620,960)|0;c[4630]=17608;d=c[4630]|0;return d|0}function k2(b){b=b|0;var d=0;if((a[19992]|0)!=0){d=c[4608]|0;return d|0}if((bb(19992)|0)==0){d=c[4608]|0;return d|0}do{if((a[19912]|0)==0){if((bb(19912)|0)==0){break}l6(16864,0,288);a_(292,0,u|0)|0}}while(0);e5(16864,992)|0;e5(16876,976)|0;c[4608]=16864;d=c[4608]|0;return d|0}function k3(b){b=b|0;if((a[20056]|0)!=0){return 18528}if((bb(20056)|0)==0){return 18528}e9(18528,1416,8);a_(312,18528,u|0)|0;return 18528}function k4(b){b=b|0;if((a[2e4]|0)!=0){return 18440}if((bb(2e4)|0)==0){return 18440}fe(18440,1376,lv(1376)|0);a_(236,18440,u|0)|0;return 18440}function k5(b){b=b|0;if((a[20080]|0)!=0){return 18576}if((bb(20080)|0)==0){return 18576}e9(18576,1344,8);a_(312,18576,u|0)|0;return 18576}function k6(b){b=b|0;if((a[20024]|0)!=0){return 18488}if((bb(20024)|0)==0){return 18488}fe(18488,1304,lv(1304)|0);a_(236,18488,u|0)|0;return 18488}function k7(b){b=b|0;if((a[20072]|0)!=0){return 18560}if((bb(20072)|0)==0){return 18560}e9(18560,1280,20);a_(312,18560,u|0)|0;return 18560}function k8(b){b=b|0;if((a[20016]|0)!=0){return 18472}if((bb(20016)|0)==0){return 18472}fe(18472,1192,lv(1192)|0);a_(236,18472,u|0)|0;return 18472}function k9(b){b=b|0;if((a[20064]|0)!=0){return 18544}if((bb(20064)|0)==0){return 18544}e9(18544,1176,11);a_(312,18544,u|0)|0;return 18544}function la(b){b=b|0;if((a[20008]|0)!=0){return 18456}if((bb(20008)|0)==0){return 18456}fe(18456,1128,lv(1128)|0);a_(236,18456,u|0)|0;return 18456}function lb(a){a=a|0;var b=0,d=0,e=0,f=0;b=a+4|0;d=(c[a>>2]|0)+(c[b+4>>2]|0)|0;a=d;e=c[b>>2]|0;if((e&1|0)==0){f=e;bY[f&511](a);return}else{f=c[(c[d>>2]|0)+(e-1)>>2]|0;bY[f&511](a);return}}function lc(a){a=a|0;e4(17140);e4(17128);e4(17116);e4(17104);e4(17092);e4(17080);e4(17068);e4(17056);e4(17044);e4(17032);e4(17020);e4(17008);e4(16996);e4(16984);e4(16972);e4(16960);e4(16948);e4(16936);e4(16924);e4(16912);e4(16900);e4(16888);e4(16876);e4(16864);return}function ld(a){a=a|0;e$(17884);e$(17872);e$(17860);e$(17848);e$(17836);e$(17824);e$(17812);e$(17800);e$(17788);e$(17776);e$(17764);e$(17752);e$(17740);e$(17728);e$(17716);e$(17704);e$(17692);e$(17680);e$(17668);e$(17656);e$(17644);e$(17632);e$(17620);e$(17608);return}function le(a){a=a|0;e4(16684);e4(16672);e4(16660);e4(16648);e4(16636);e4(16624);e4(16612);e4(16600);e4(16588);e4(16576);e4(16564);e4(16552);e4(16540);e4(16528);e4(16516);e4(16504);e4(16492);e4(16480);e4(16468);e4(16456);e4(16444);e4(16432);e4(16420);e4(16408);return}function lf(a){a=a|0;e$(17428);e$(17416);e$(17404);e$(17392);e$(17380);e$(17368);e$(17356);e$(17344);e$(17332);e$(17320);e$(17308);e$(17296);e$(17284);e$(17272);e$(17260);e$(17248);e$(17236);e$(17224);e$(17212);e$(17200);e$(17188);e$(17176);e$(17164);e$(17152);return}function lg(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;e=b+8|0;f=b+4|0;g=c[f>>2]|0;h=c[e>>2]|0;i=g;if(h-i>>2>>>0>=d>>>0){j=d;k=g;do{if((k|0)==0){l=0}else{c[k>>2]=0;l=c[f>>2]|0}k=l+4|0;c[f>>2]=k;j=j-1|0;}while((j|0)!=0);return}j=b+16|0;k=b|0;l=c[k>>2]|0;g=i-l>>2;i=g+d|0;if(i>>>0>1073741823){jz(0)}m=h-l|0;do{if(m>>2>>>0>536870910){n=1073741823;o=1074}else{l=m>>1;h=l>>>0<i>>>0?i:l;if((h|0)==0){p=0;q=0;break}l=b+128|0;if(!((a[l]&1)==0&h>>>0<29)){n=h;o=1074;break}a[l]=1;p=j;q=h}}while(0);if((o|0)==1074){p=lX(n<<2)|0;q=n}n=d;d=p+(g<<2)|0;do{if((d|0)==0){r=0}else{c[d>>2]=0;r=d}d=r+4|0;n=n-1|0;}while((n|0)!=0);n=p+(q<<2)|0;q=c[k>>2]|0;r=(c[f>>2]|0)-q|0;o=p+(g-(r>>2)<<2)|0;g=o;p=q;l5(g|0,p|0,r)|0;c[k>>2]=o;c[f>>2]=d;c[e>>2]=n;if((q|0)==0){return}if((q|0)==(j|0)){a[b+128|0]=0;return}else{l_(p);return}}function lh(a){a=a|0;e4(16852);e4(16840);e4(16828);e4(16816);e4(16804);e4(16792);e4(16780);e4(16768);e4(16756);e4(16744);e4(16732);e4(16720);e4(16708);e4(16696);return}function li(a){a=a|0;e$(17596);e$(17584);e$(17572);e$(17560);e$(17548);e$(17536);e$(17524);e$(17512);e$(17500);e$(17488);e$(17476);e$(17464);e$(17452);e$(17440);return}function lj(a,b,c){a=a|0;b=b|0;c=c|0;return lk(0,a,b,(c|0)!=0?c:15928)|0}function lk(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,u=0,v=0,w=0;g=i;i=i+8|0;h=g|0;c[h>>2]=b;j=((f|0)==0?15920:f)|0;f=c[j>>2]|0;L1169:do{if((d|0)==0){if((f|0)==0){k=0}else{break}i=g;return k|0}else{if((b|0)==0){l=h;c[h>>2]=l;m=l}else{m=b}if((e|0)==0){k=-2;i=g;return k|0}do{if((f|0)==0){l=a[d]|0;n=l&255;if(l<<24>>24>-1){c[m>>2]=n;k=l<<24>>24!=0|0;i=g;return k|0}else{l=n-194|0;if(l>>>0>50){break L1169}o=d+1|0;p=c[t+(l<<2)>>2]|0;q=e-1|0;break}}else{o=d;p=f;q=e}}while(0);L1185:do{if((q|0)==0){r=p}else{l=a[o]|0;n=(l&255)>>>3;if((n-16|n+(p>>26))>>>0>7){break L1169}else{s=o;u=p;v=q;w=l}while(1){s=s+1|0;u=(w&255)-128|u<<6;v=v-1|0;if((u|0)>=0){break}if((v|0)==0){r=u;break L1185}w=a[s]|0;if(((w&255)-128|0)>>>0>63){break L1169}}c[j>>2]=0;c[m>>2]=u;k=e-v|0;i=g;return k|0}}while(0);c[j>>2]=r;k=-2;i=g;return k|0}}while(0);c[j>>2]=0;c[(bw()|0)>>2]=138;k=-1;i=g;return k|0}function ll(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0;g=i;i=i+1032|0;h=g+1024|0;j=c[b>>2]|0;c[h>>2]=j;k=(a|0)!=0;l=g|0;m=k?e:256;e=k?a:l;L1200:do{if((j|0)==0|(m|0)==0){n=0;o=d;p=m;q=e;r=j}else{a=m;s=d;t=0;u=e;v=j;while(1){w=s>>>2;x=w>>>0>=a>>>0;if(!(x|s>>>0>131)){n=t;o=s;p=a;q=u;r=v;break L1200}y=x?a:w;z=s-y|0;w=lm(u,h,y,f)|0;if((w|0)==-1){break}if((u|0)==(l|0)){A=l;B=a}else{A=u+(w<<2)|0;B=a-w|0}y=w+t|0;w=c[h>>2]|0;if((w|0)==0|(B|0)==0){n=y;o=z;p=B;q=A;r=w;break L1200}else{a=B;s=z;t=y;u=A;v=w}}n=-1;o=z;p=0;q=u;r=c[h>>2]|0}}while(0);L1210:do{if((r|0)==0){C=n}else{if((p|0)==0|(o|0)==0){C=n;break}else{D=p;E=o;F=n;G=q;H=r}while(1){I=lk(G,H,E,f)|0;if((I+2|0)>>>0<3){break}z=(c[h>>2]|0)+I|0;c[h>>2]=z;A=D-1|0;B=F+1|0;if((A|0)==0|(E|0)==(I|0)){C=B;break L1210}else{D=A;E=E-I|0;F=B;G=G+4|0;H=z}}if((I|0)==0){c[h>>2]=0;C=F;break}else if((I|0)==(-1|0)){C=-1;break}else{c[f>>2]=0;C=F;break}}}while(0);if(!k){i=g;return C|0}c[b>>2]=c[h>>2];i=g;return C|0}function lm(b,e,f,g){b=b|0;e=e|0;f=f|0;g=g|0;var h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ab=0,ac=0,ad=0,ae=0,af=0;h=c[e>>2]|0;do{if((g|0)==0){i=1139}else{j=g|0;k=c[j>>2]|0;if((k|0)==0){i=1139;break}if((b|0)==0){l=k;m=h;n=f;i=1150;break}c[j>>2]=0;o=k;p=h;q=b;r=f;i=1170}}while(0);if((i|0)==1139){if((b|0)==0){s=h;u=f;i=1141}else{v=h;w=b;x=f;i=1140}}L1231:while(1){if((i|0)==1150){i=0;h=(d[m]|0)>>>3;if((h-16|h+(l>>26))>>>0>7){i=1151;break}h=m+1|0;do{if((l&33554432|0)==0){y=h}else{if(((d[h]|0)-128|0)>>>0>63){i=1154;break L1231}g=m+2|0;if((l&524288|0)==0){y=g;break}if(((d[g]|0)-128|0)>>>0>63){i=1157;break L1231}y=m+3|0}}while(0);s=y;u=n-1|0;i=1141;continue}else if((i|0)==1140){i=0;if((x|0)==0){z=f;i=1188;break}else{A=x;B=w;C=v}while(1){h=a[C]|0;do{if(((h&255)-1|0)>>>0<127){if((C&3|0)==0&A>>>0>3){D=A;E=B;F=C}else{G=C;H=B;I=A;J=h;break}while(1){K=c[F>>2]|0;if(((K-16843009|K)&-2139062144|0)!=0){i=1164;break}c[E>>2]=K&255;c[E+4>>2]=d[F+1|0]|0;c[E+8>>2]=d[F+2|0]|0;L=F+4|0;M=E+16|0;c[E+12>>2]=d[F+3|0]|0;N=D-4|0;if(N>>>0>3){D=N;E=M;F=L}else{i=1165;break}}if((i|0)==1165){i=0;G=L;H=M;I=N;J=a[L]|0;break}else if((i|0)==1164){i=0;G=F;H=E;I=D;J=K&255;break}}else{G=C;H=B;I=A;J=h}}while(0);O=J&255;if((O-1|0)>>>0>=127){break}c[H>>2]=O;h=I-1|0;if((h|0)==0){z=f;i=1192;break L1231}else{A=h;B=H+4|0;C=G+1|0}}h=O-194|0;if(h>>>0>50){P=I;Q=H;R=G;i=1181;break}o=c[t+(h<<2)>>2]|0;p=G+1|0;q=H;r=I;i=1170;continue}else if((i|0)==1141){i=0;h=a[s]|0;do{if(((h&255)-1|0)>>>0<127){if((s&3|0)!=0){S=s;T=u;U=h;break}g=c[s>>2]|0;if(((g-16843009|g)&-2139062144|0)==0){V=u;W=s}else{S=s;T=u;U=g&255;break}do{W=W+4|0;V=V-4|0;X=c[W>>2]|0;}while(((X-16843009|X)&-2139062144|0)==0);S=W;T=V;U=X&255}else{S=s;T=u;U=h}}while(0);h=U&255;if((h-1|0)>>>0<127){s=S+1|0;u=T-1|0;i=1141;continue}g=h-194|0;if(g>>>0>50){P=T;Q=b;R=S;i=1181;break}l=c[t+(g<<2)>>2]|0;m=S+1|0;n=T;i=1150;continue}else if((i|0)==1170){i=0;g=d[p]|0;h=g>>>3;if((h-16|h+(o>>26))>>>0>7){i=1171;break}h=p+1|0;Y=g-128|o<<6;do{if((Y|0)<0){g=(d[h]|0)-128|0;if(g>>>0>63){i=1174;break L1231}k=p+2|0;Z=g|Y<<6;if((Z|0)>=0){_=Z;$=k;break}g=(d[k]|0)-128|0;if(g>>>0>63){i=1177;break L1231}_=g|Z<<6;$=p+3|0}else{_=Y;$=h}}while(0);c[q>>2]=_;v=$;w=q+4|0;x=r-1|0;i=1140;continue}}if((i|0)==1177){aa=Z;ab=p-1|0;ac=q;ad=r;i=1180}else if((i|0)==1171){aa=o;ab=p-1|0;ac=q;ad=r;i=1180}else if((i|0)==1154){aa=l;ab=m-1|0;ac=b;ad=n;i=1180}else if((i|0)==1157){aa=l;ab=m-1|0;ac=b;ad=n;i=1180}else if((i|0)==1151){aa=l;ab=m-1|0;ac=b;ad=n;i=1180}else if((i|0)==1174){aa=Y;ab=p-1|0;ac=q;ad=r;i=1180}else if((i|0)==1188){return z|0}else if((i|0)==1192){return z|0}if((i|0)==1180){if((aa|0)==0){P=ad;Q=ac;R=ab;i=1181}else{ae=ac;af=ab}}do{if((i|0)==1181){if((a[R]|0)!=0){ae=Q;af=R;break}if((Q|0)!=0){c[Q>>2]=0;c[e>>2]=0}z=f-P|0;return z|0}}while(0);c[(bw()|0)>>2]=138;if((ae|0)==0){z=-1;return z|0}c[e>>2]=af;z=-1;return z|0}function ln(b,e,f){b=b|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0;g=i;i=i+8|0;h=g|0;c[h>>2]=b;if((e|0)==0){j=0;i=g;return j|0}do{if((f|0)!=0){if((b|0)==0){k=h;c[h>>2]=k;l=k}else{l=b}k=a[e]|0;m=k&255;if(k<<24>>24>-1){c[l>>2]=m;j=k<<24>>24!=0|0;i=g;return j|0}k=m-194|0;if(k>>>0>50){break}m=e+1|0;n=c[t+(k<<2)>>2]|0;if(f>>>0<4){if((n&-2147483648>>>(((f*6|0)-6|0)>>>0)|0)!=0){break}}k=d[m]|0;m=k>>>3;if((m-16|m+(n>>26))>>>0>7){break}m=k-128|n<<6;if((m|0)>=0){c[l>>2]=m;j=2;i=g;return j|0}n=(d[e+2|0]|0)-128|0;if(n>>>0>63){break}k=n|m<<6;if((k|0)>=0){c[l>>2]=k;j=3;i=g;return j|0}m=(d[e+3|0]|0)-128|0;if(m>>>0>63){break}c[l>>2]=m|k<<6;j=4;i=g;return j|0}}while(0);c[(bw()|0)>>2]=138;j=-1;i=g;return j|0}function lo(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;if((b|0)==0){f=1;return f|0}if(d>>>0<128){a[b]=d&255;f=1;return f|0}if(d>>>0<2048){a[b]=(d>>>6|192)&255;a[b+1|0]=(d&63|128)&255;f=2;return f|0}if(d>>>0<55296|(d-57344|0)>>>0<8192){a[b]=(d>>>12|224)&255;a[b+1|0]=(d>>>6&63|128)&255;a[b+2|0]=(d&63|128)&255;f=3;return f|0}if((d-65536|0)>>>0<1048576){a[b]=(d>>>18|240)&255;a[b+1|0]=(d>>>12&63|128)&255;a[b+2|0]=(d>>>6&63|128)&255;a[b+3|0]=(d&63|128)&255;f=4;return f|0}else{c[(bw()|0)>>2]=138;f=-1;return f|0}return 0}function lp(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0;f=i;i=i+264|0;g=f+256|0;h=c[b>>2]|0;c[g>>2]=h;j=(a|0)!=0;k=f|0;l=j?e:256;e=j?a:k;L1352:do{if((h|0)==0|(l|0)==0){m=0;n=d;o=l;p=e;q=h}else{a=l;r=d;s=0;t=e;u=h;while(1){v=r>>>0>=a>>>0;if(!(v|r>>>0>32)){m=s;n=r;o=a;p=t;q=u;break L1352}w=v?a:r;x=r-w|0;v=lB(t,g,w,0)|0;if((v|0)==-1){break}if((t|0)==(k|0)){y=k;z=a}else{y=t+v|0;z=a-v|0}w=v+s|0;v=c[g>>2]|0;if((v|0)==0|(z|0)==0){m=w;n=x;o=z;p=y;q=v;break L1352}else{a=z;r=x;s=w;t=y;u=v}}m=-1;n=x;o=0;p=t;q=c[g>>2]|0}}while(0);L1362:do{if((q|0)==0){A=m}else{if((o|0)==0|(n|0)==0){A=m;break}else{B=o;C=n;D=m;E=p;F=q}while(1){G=lo(E,c[F>>2]|0,0)|0;if((G+1|0)>>>0<2){break}x=(c[g>>2]|0)+4|0;c[g>>2]=x;y=C-1|0;z=D+1|0;if((B|0)==(G|0)|(y|0)==0){A=z;break L1362}else{B=B-G|0;C=y;D=z;E=E+G|0;F=x}}if((G|0)!=0){A=-1;break}c[g>>2]=0;A=D}}while(0);if(!j){i=f;return A|0}c[b>>2]=c[g>>2];i=f;return A|0}function lq(a){a=a|0;return}function lr(a){a=a|0;return}function ls(a){a=a|0;return 1816|0}function lt(a){a=a|0;return}function lu(a){a=a|0;return}function lv(a){a=a|0;var b=0;b=a;while(1){if((c[b>>2]|0)==0){break}else{b=b+4|0}}return b-a>>2|0}function lw(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0;if((d|0)==0){return a|0}else{e=b;f=d;g=a}while(1){d=f-1|0;c[g>>2]=c[e>>2];if((d|0)==0){break}else{e=e+4|0;f=d;g=g+4|0}}return a|0}function lx(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0;e=(d|0)==0;if(a-b>>2>>>0<d>>>0){if(e){return a|0}else{f=d}do{f=f-1|0;c[a+(f<<2)>>2]=c[b+(f<<2)>>2];}while((f|0)!=0);return a|0}else{if(e){return a|0}else{g=b;h=d;i=a}while(1){d=h-1|0;c[i>>2]=c[g>>2];if((d|0)==0){break}else{g=g+4|0;h=d;i=i+4|0}}return a|0}return 0}function ly(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;if((d|0)==0){return a|0}else{e=d;f=a}while(1){d=e-1|0;c[f>>2]=b;if((d|0)==0){break}else{e=d;f=f+4|0}}return a|0}function lz(a){a=a|0;c[a>>2]=7200;return}function lA(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0;if((c[d+8>>2]|0)!=(b|0)){return}b=d+16|0;g=c[b>>2]|0;if((g|0)==0){c[b>>2]=e;c[d+24>>2]=f;c[d+36>>2]=1;return}if((g|0)!=(e|0)){e=d+36|0;c[e>>2]=(c[e>>2]|0)+1;c[d+24>>2]=2;a[d+54|0]=1;return}e=d+24|0;if((c[e>>2]|0)!=2){return}c[e>>2]=f;return}function lB(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;f=i;i=i+8|0;g=f|0;if((b|0)==0){h=c[d>>2]|0;j=g|0;k=c[h>>2]|0;if((k|0)==0){l=0;i=f;return l|0}else{m=0;n=h;o=k}while(1){if(o>>>0>127){k=lo(j,o,0)|0;if((k|0)==-1){l=-1;p=1323;break}else{q=k}}else{q=1}k=q+m|0;h=n+4|0;r=c[h>>2]|0;if((r|0)==0){l=k;p=1326;break}else{m=k;n=h;o=r}}if((p|0)==1323){i=f;return l|0}else if((p|0)==1326){i=f;return l|0}}L1440:do{if(e>>>0>3){o=e;n=b;m=c[d>>2]|0;while(1){q=c[m>>2]|0;if((q|0)==0){s=o;t=n;break L1440}if(q>>>0>127){j=lo(n,q,0)|0;if((j|0)==-1){l=-1;break}u=n+j|0;v=o-j|0;w=m}else{a[n]=q&255;u=n+1|0;v=o-1|0;w=c[d>>2]|0}q=w+4|0;c[d>>2]=q;if(v>>>0>3){o=v;n=u;m=q}else{s=v;t=u;break L1440}}i=f;return l|0}else{s=e;t=b}}while(0);L1452:do{if((s|0)==0){x=0}else{b=g|0;u=s;v=t;w=c[d>>2]|0;while(1){m=c[w>>2]|0;if((m|0)==0){p=1318;break}if(m>>>0>127){n=lo(b,m,0)|0;if((n|0)==-1){l=-1;p=1321;break}if(n>>>0>u>>>0){p=1314;break}o=c[w>>2]|0;lo(v,o,0)|0;y=v+n|0;z=u-n|0;A=w}else{a[v]=m&255;y=v+1|0;z=u-1|0;A=c[d>>2]|0}m=A+4|0;c[d>>2]=m;if((z|0)==0){x=0;break L1452}else{u=z;v=y;w=m}}if((p|0)==1321){i=f;return l|0}else if((p|0)==1318){a[v]=0;x=u;break}else if((p|0)==1314){l=e-u|0;i=f;return l|0}}}while(0);c[d>>2]=0;l=e-x|0;i=f;return l|0}function lC(a){a=a|0;l_(a);return}function lD(a){a=a|0;lq(a|0);return}function lE(a){a=a|0;lq(a|0);l_(a);return}function lF(a){a=a|0;lq(a|0);l_(a);return}function lG(a){a=a|0;lq(a|0);l_(a);return}function lH(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=i;i=i+56|0;f=e|0;if((a|0)==(b|0)){g=1;i=e;return g|0}if((b|0)==0){g=0;i=e;return g|0}h=lK(b,15552,15536,0)|0;b=h;if((h|0)==0){g=0;i=e;return g|0}l6(f|0,0,56);c[f>>2]=b;c[f+8>>2]=a;c[f+12>>2]=-1;c[f+48>>2]=1;cb[c[(c[h>>2]|0)+28>>2]&15](b,f,c[d>>2]|0,1);if((c[f+24>>2]|0)!=1){g=0;i=e;return g|0}c[d>>2]=c[f+16>>2];g=1;i=e;return g|0}function lI(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0;if((b|0)!=(c[d+8>>2]|0)){g=c[b+8>>2]|0;cb[c[(c[g>>2]|0)+28>>2]&15](g,d,e,f);return}g=d+16|0;b=c[g>>2]|0;if((b|0)==0){c[g>>2]=e;c[d+24>>2]=f;c[d+36>>2]=1;return}if((b|0)!=(e|0)){e=d+36|0;c[e>>2]=(c[e>>2]|0)+1;c[d+24>>2]=2;a[d+54|0]=1;return}e=d+24|0;if((c[e>>2]|0)!=2){return}c[e>>2]=f;return}function lJ(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0;if((b|0)==(c[d+8>>2]|0)){g=d+16|0;h=c[g>>2]|0;if((h|0)==0){c[g>>2]=e;c[d+24>>2]=f;c[d+36>>2]=1;return}if((h|0)!=(e|0)){h=d+36|0;c[h>>2]=(c[h>>2]|0)+1;c[d+24>>2]=2;a[d+54|0]=1;return}h=d+24|0;if((c[h>>2]|0)!=2){return}c[h>>2]=f;return}h=c[b+12>>2]|0;g=b+16+(h<<3)|0;i=c[b+20>>2]|0;j=i>>8;if((i&1|0)==0){k=j}else{k=c[(c[e>>2]|0)+j>>2]|0}j=c[b+16>>2]|0;cb[c[(c[j>>2]|0)+28>>2]&15](j,d,e+k|0,(i&2|0)!=0?f:2);if((h|0)<=1){return}h=d+54|0;i=e;k=b+24|0;while(1){b=c[k+4>>2]|0;j=b>>8;if((b&1|0)==0){l=j}else{l=c[(c[i>>2]|0)+j>>2]|0}j=c[k>>2]|0;cb[c[(c[j>>2]|0)+28>>2]&15](j,d,e+l|0,(b&2|0)!=0?f:2);if((a[h]&1)!=0){m=1375;break}b=k+8|0;if(b>>>0<g>>>0){k=b}else{m=1374;break}}if((m|0)==1375){return}else if((m|0)==1374){return}}function lK(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;f=i;i=i+56|0;g=f|0;h=c[a>>2]|0;j=a+(c[h-8>>2]|0)|0;k=c[h-4>>2]|0;h=k;c[g>>2]=d;c[g+4>>2]=a;c[g+8>>2]=b;c[g+12>>2]=e;e=g+16|0;b=g+20|0;a=g+24|0;l=g+28|0;m=g+32|0;n=g+40|0;l6(e|0,0,39);if((k|0)==(d|0)){c[g+48>>2]=1;b9[c[(c[k>>2]|0)+20>>2]&31](h,g,j,j,1,0);i=f;return((c[a>>2]|0)==1?j:0)|0}bW[c[(c[k>>2]|0)+24>>2]&7](h,g,j,1,0);j=c[g+36>>2]|0;if((j|0)==0){if((c[n>>2]|0)!=1){o=0;i=f;return o|0}if((c[l>>2]|0)!=1){o=0;i=f;return o|0}o=(c[m>>2]|0)==1?c[b>>2]|0:0;i=f;return o|0}else if((j|0)==1){do{if((c[a>>2]|0)!=1){if((c[n>>2]|0)!=0){o=0;i=f;return o|0}if((c[l>>2]|0)!=1){o=0;i=f;return o|0}if((c[m>>2]|0)==1){break}else{o=0}i=f;return o|0}}while(0);o=c[e>>2]|0;i=f;return o|0}else{o=0;i=f;return o|0}return 0}function lL(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;if((c[d+8>>2]|0)==(b|0)){if((c[d+4>>2]|0)!=(e|0)){return}g=d+28|0;if((c[g>>2]|0)==1){return}c[g>>2]=f;return}if((c[d>>2]|0)!=(b|0)){return}do{if((c[d+16>>2]|0)!=(e|0)){b=d+20|0;if((c[b>>2]|0)==(e|0)){break}c[d+32>>2]=f;c[b>>2]=e;b=d+40|0;c[b>>2]=(c[b>>2]|0)+1;do{if((c[d+36>>2]|0)==1){if((c[d+24>>2]|0)!=2){break}a[d+54|0]=1}}while(0);c[d+44>>2]=4;return}}while(0);if((f|0)!=1){return}c[d+32>>2]=1;return}function lM(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var i=0;if((c[d+8>>2]|0)!=(b|0)){return}a[d+53|0]=1;if((c[d+4>>2]|0)!=(f|0)){return}a[d+52|0]=1;f=d+16|0;b=c[f>>2]|0;if((b|0)==0){c[f>>2]=e;c[d+24>>2]=g;c[d+36>>2]=1;if(!((c[d+48>>2]|0)==1&(g|0)==1)){return}a[d+54|0]=1;return}if((b|0)!=(e|0)){e=d+36|0;c[e>>2]=(c[e>>2]|0)+1;a[d+54|0]=1;return}e=d+24|0;b=c[e>>2]|0;if((b|0)==2){c[e>>2]=g;i=g}else{i=b}if(!((c[d+48>>2]|0)==1&(i|0)==1)){return}a[d+54|0]=1;return}function lN(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0;h=b|0;if((h|0)==(c[d+8>>2]|0)){if((c[d+4>>2]|0)!=(e|0)){return}i=d+28|0;if((c[i>>2]|0)==1){return}c[i>>2]=f;return}if((h|0)==(c[d>>2]|0)){do{if((c[d+16>>2]|0)!=(e|0)){h=d+20|0;if((c[h>>2]|0)==(e|0)){break}c[d+32>>2]=f;i=d+44|0;if((c[i>>2]|0)==4){return}j=c[b+12>>2]|0;k=b+16+(j<<3)|0;L1634:do{if((j|0)>0){l=d+52|0;m=d+53|0;n=d+54|0;o=b+8|0;p=d+24|0;q=e;r=0;s=b+16|0;t=0;L1636:while(1){a[l]=0;a[m]=0;u=c[s+4>>2]|0;v=u>>8;if((u&1|0)==0){w=v}else{w=c[(c[q>>2]|0)+v>>2]|0}v=c[s>>2]|0;b9[c[(c[v>>2]|0)+20>>2]&31](v,d,e,e+w|0,2-(u>>>1&1)|0,g);if((a[n]&1)!=0){x=t;y=r;break}do{if((a[m]&1)==0){z=t;A=r}else{if((a[l]&1)==0){if((c[o>>2]&1|0)==0){x=1;y=r;break L1636}else{z=1;A=r;break}}if((c[p>>2]|0)==1){B=1467;break L1634}if((c[o>>2]&2|0)==0){B=1467;break L1634}else{z=1;A=1}}}while(0);u=s+8|0;if(u>>>0<k>>>0){r=A;s=u;t=z}else{x=z;y=A;break}}if(y){C=x;B=1466}else{D=x;B=1463}}else{D=0;B=1463}}while(0);do{if((B|0)==1463){c[h>>2]=e;k=d+40|0;c[k>>2]=(c[k>>2]|0)+1;if((c[d+36>>2]|0)!=1){C=D;B=1466;break}if((c[d+24>>2]|0)!=2){C=D;B=1466;break}a[d+54|0]=1;if(D){B=1467}else{B=1468}}}while(0);if((B|0)==1466){if(C){B=1467}else{B=1468}}if((B|0)==1468){c[i>>2]=4;return}else if((B|0)==1467){c[i>>2]=3;return}}}while(0);if((f|0)!=1){return}c[d+32>>2]=1;return}C=c[b+12>>2]|0;D=b+16+(C<<3)|0;x=c[b+20>>2]|0;y=x>>8;if((x&1|0)==0){E=y}else{E=c[(c[e>>2]|0)+y>>2]|0}y=c[b+16>>2]|0;bW[c[(c[y>>2]|0)+24>>2]&7](y,d,e+E|0,(x&2|0)!=0?f:2,g);x=b+24|0;if((C|0)<=1){return}C=c[b+8>>2]|0;do{if((C&2|0)==0){b=d+36|0;if((c[b>>2]|0)==1){break}if((C&1|0)==0){E=d+54|0;y=e;A=x;while(1){if((a[E]&1)!=0){B=1505;break}if((c[b>>2]|0)==1){B=1499;break}z=c[A+4>>2]|0;w=z>>8;if((z&1|0)==0){F=w}else{F=c[(c[y>>2]|0)+w>>2]|0}w=c[A>>2]|0;bW[c[(c[w>>2]|0)+24>>2]&7](w,d,e+F|0,(z&2|0)!=0?f:2,g);z=A+8|0;if(z>>>0<D>>>0){A=z}else{B=1500;break}}if((B|0)==1499){return}else if((B|0)==1500){return}else if((B|0)==1505){return}}A=d+24|0;y=d+54|0;E=e;i=x;while(1){if((a[y]&1)!=0){B=1494;break}if((c[b>>2]|0)==1){if((c[A>>2]|0)==1){B=1495;break}}z=c[i+4>>2]|0;w=z>>8;if((z&1|0)==0){G=w}else{G=c[(c[E>>2]|0)+w>>2]|0}w=c[i>>2]|0;bW[c[(c[w>>2]|0)+24>>2]&7](w,d,e+G|0,(z&2|0)!=0?f:2,g);z=i+8|0;if(z>>>0<D>>>0){i=z}else{B=1504;break}}if((B|0)==1494){return}else if((B|0)==1495){return}else if((B|0)==1504){return}}}while(0);G=d+54|0;F=e;C=x;while(1){if((a[G]&1)!=0){B=1501;break}x=c[C+4>>2]|0;i=x>>8;if((x&1|0)==0){H=i}else{H=c[(c[F>>2]|0)+i>>2]|0}i=c[C>>2]|0;bW[c[(c[i>>2]|0)+24>>2]&7](i,d,e+H|0,(x&2|0)!=0?f:2,g);x=C+8|0;if(x>>>0<D>>>0){C=x}else{B=1507;break}}if((B|0)==1501){return}else if((B|0)==1507){return}}function lO(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,i=0,j=0,k=0,l=0,m=0,n=0;h=b|0;if((h|0)==(c[d+8>>2]|0)){if((c[d+4>>2]|0)!=(e|0)){return}i=d+28|0;if((c[i>>2]|0)==1){return}c[i>>2]=f;return}if((h|0)!=(c[d>>2]|0)){h=c[b+8>>2]|0;bW[c[(c[h>>2]|0)+24>>2]&7](h,d,e,f,g);return}do{if((c[d+16>>2]|0)!=(e|0)){h=d+20|0;if((c[h>>2]|0)==(e|0)){break}c[d+32>>2]=f;i=d+44|0;if((c[i>>2]|0)==4){return}j=d+52|0;a[j]=0;k=d+53|0;a[k]=0;l=c[b+8>>2]|0;b9[c[(c[l>>2]|0)+20>>2]&31](l,d,e,e,1,g);if((a[k]&1)==0){m=0;n=1523}else{if((a[j]&1)==0){m=1;n=1523}}L1736:do{if((n|0)==1523){c[h>>2]=e;j=d+40|0;c[j>>2]=(c[j>>2]|0)+1;do{if((c[d+36>>2]|0)==1){if((c[d+24>>2]|0)!=2){n=1526;break}a[d+54|0]=1;if(m){break L1736}}else{n=1526}}while(0);if((n|0)==1526){if(m){break}}c[i>>2]=4;return}}while(0);c[i>>2]=3;return}}while(0);if((f|0)!=1){return}c[d+32>>2]=1;return}function lP(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;if((b|0)!=(c[d+8>>2]|0)){i=d+52|0;j=a[i]&1;k=d+53|0;l=a[k]&1;m=c[b+12>>2]|0;n=b+16+(m<<3)|0;a[i]=0;a[k]=0;o=c[b+20>>2]|0;p=o>>8;if((o&1|0)==0){q=p}else{q=c[(c[f>>2]|0)+p>>2]|0}p=c[b+16>>2]|0;b9[c[(c[p>>2]|0)+20>>2]&31](p,d,e,f+q|0,(o&2|0)!=0?g:2,h);L1758:do{if((m|0)>1){o=d+24|0;q=b+8|0;p=d+54|0;r=f;s=b+24|0;do{if((a[p]&1)!=0){break L1758}do{if((a[i]&1)==0){if((a[k]&1)==0){break}if((c[q>>2]&1|0)==0){break L1758}}else{if((c[o>>2]|0)==1){break L1758}if((c[q>>2]&2|0)==0){break L1758}}}while(0);a[i]=0;a[k]=0;t=c[s+4>>2]|0;u=t>>8;if((t&1|0)==0){v=u}else{v=c[(c[r>>2]|0)+u>>2]|0}u=c[s>>2]|0;b9[c[(c[u>>2]|0)+20>>2]&31](u,d,e,f+v|0,(t&2|0)!=0?g:2,h);s=s+8|0;}while(s>>>0<n>>>0)}}while(0);a[i]=j;a[k]=l;return}a[d+53|0]=1;if((c[d+4>>2]|0)!=(f|0)){return}a[d+52|0]=1;f=d+16|0;l=c[f>>2]|0;if((l|0)==0){c[f>>2]=e;c[d+24>>2]=g;c[d+36>>2]=1;if(!((c[d+48>>2]|0)==1&(g|0)==1)){return}a[d+54|0]=1;return}if((l|0)!=(e|0)){e=d+36|0;c[e>>2]=(c[e>>2]|0)+1;a[d+54|0]=1;return}e=d+24|0;l=c[e>>2]|0;if((l|0)==2){c[e>>2]=g;w=g}else{w=l}if(!((c[d+48>>2]|0)==1&(w|0)==1)){return}a[d+54|0]=1;return}function lQ(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var i=0,j=0;if((b|0)!=(c[d+8>>2]|0)){i=c[b+8>>2]|0;b9[c[(c[i>>2]|0)+20>>2]&31](i,d,e,f,g,h);return}a[d+53|0]=1;if((c[d+4>>2]|0)!=(f|0)){return}a[d+52|0]=1;f=d+16|0;h=c[f>>2]|0;if((h|0)==0){c[f>>2]=e;c[d+24>>2]=g;c[d+36>>2]=1;if(!((c[d+48>>2]|0)==1&(g|0)==1)){return}a[d+54|0]=1;return}if((h|0)!=(e|0)){e=d+36|0;c[e>>2]=(c[e>>2]|0)+1;a[d+54|0]=1;return}e=d+24|0;h=c[e>>2]|0;if((h|0)==2){c[e>>2]=g;j=g}else{j=h}if(!((c[d+48>>2]|0)==1&(j|0)==1)){return}a[d+54|0]=1;return}function lR(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ab=0,ac=0,ad=0,ae=0,af=0,ag=0,ah=0,ai=0,aj=0,ak=0,al=0,am=0,an=0,ao=0,ap=0,aq=0,ar=0,as=0,at=0,au=0,av=0,aw=0,ax=0,ay=0,az=0,aA=0,aB=0,aC=0,aD=0,aE=0,aF=0,aG=0,aH=0,aI=0,aJ=0;do{if(a>>>0<245){if(a>>>0<11){b=16}else{b=a+11&-8}d=b>>>3;e=c[3984]|0;f=e>>>(d>>>0);if((f&3|0)!=0){g=(f&1^1)+d|0;h=g<<1;i=15976+(h<<2)|0;j=15976+(h+2<<2)|0;h=c[j>>2]|0;k=h+8|0;l=c[k>>2]|0;do{if((i|0)==(l|0)){c[3984]=e&~(1<<g)}else{if(l>>>0<(c[3988]|0)>>>0){bH();return 0}m=l+12|0;if((c[m>>2]|0)==(h|0)){c[m>>2]=i;c[j>>2]=l;break}else{bH();return 0}}}while(0);l=g<<3;c[h+4>>2]=l|3;j=h+(l|4)|0;c[j>>2]=c[j>>2]|1;n=k;return n|0}if(b>>>0<=(c[3986]|0)>>>0){o=b;break}if((f|0)!=0){j=2<<d;l=f<<d&(j|-j);j=(l&-l)-1|0;l=j>>>12&16;i=j>>>(l>>>0);j=i>>>5&8;m=i>>>(j>>>0);i=m>>>2&4;p=m>>>(i>>>0);m=p>>>1&2;q=p>>>(m>>>0);p=q>>>1&1;r=(j|l|i|m|p)+(q>>>(p>>>0))|0;p=r<<1;q=15976+(p<<2)|0;m=15976+(p+2<<2)|0;p=c[m>>2]|0;i=p+8|0;l=c[i>>2]|0;do{if((q|0)==(l|0)){c[3984]=e&~(1<<r)}else{if(l>>>0<(c[3988]|0)>>>0){bH();return 0}j=l+12|0;if((c[j>>2]|0)==(p|0)){c[j>>2]=q;c[m>>2]=l;break}else{bH();return 0}}}while(0);l=r<<3;m=l-b|0;c[p+4>>2]=b|3;q=p;e=q+b|0;c[q+(b|4)>>2]=m|1;c[q+l>>2]=m;l=c[3986]|0;if((l|0)!=0){q=c[3989]|0;d=l>>>3;l=d<<1;f=15976+(l<<2)|0;k=c[3984]|0;h=1<<d;do{if((k&h|0)==0){c[3984]=k|h;s=f;t=15976+(l+2<<2)|0}else{d=15976+(l+2<<2)|0;g=c[d>>2]|0;if(g>>>0>=(c[3988]|0)>>>0){s=g;t=d;break}bH();return 0}}while(0);c[t>>2]=q;c[s+12>>2]=q;c[q+8>>2]=s;c[q+12>>2]=f}c[3986]=m;c[3989]=e;n=i;return n|0}l=c[3985]|0;if((l|0)==0){o=b;break}h=(l&-l)-1|0;l=h>>>12&16;k=h>>>(l>>>0);h=k>>>5&8;p=k>>>(h>>>0);k=p>>>2&4;r=p>>>(k>>>0);p=r>>>1&2;d=r>>>(p>>>0);r=d>>>1&1;g=c[16240+((h|l|k|p|r)+(d>>>(r>>>0))<<2)>>2]|0;r=g;d=g;p=(c[g+4>>2]&-8)-b|0;while(1){g=c[r+16>>2]|0;if((g|0)==0){k=c[r+20>>2]|0;if((k|0)==0){break}else{u=k}}else{u=g}g=(c[u+4>>2]&-8)-b|0;k=g>>>0<p>>>0;r=u;d=k?u:d;p=k?g:p}r=d;i=c[3988]|0;if(r>>>0<i>>>0){bH();return 0}e=r+b|0;m=e;if(r>>>0>=e>>>0){bH();return 0}e=c[d+24>>2]|0;f=c[d+12>>2]|0;do{if((f|0)==(d|0)){q=d+20|0;g=c[q>>2]|0;if((g|0)==0){k=d+16|0;l=c[k>>2]|0;if((l|0)==0){v=0;break}else{w=l;x=k}}else{w=g;x=q}while(1){q=w+20|0;g=c[q>>2]|0;if((g|0)!=0){w=g;x=q;continue}q=w+16|0;g=c[q>>2]|0;if((g|0)==0){break}else{w=g;x=q}}if(x>>>0<i>>>0){bH();return 0}else{c[x>>2]=0;v=w;break}}else{q=c[d+8>>2]|0;if(q>>>0<i>>>0){bH();return 0}g=q+12|0;if((c[g>>2]|0)!=(d|0)){bH();return 0}k=f+8|0;if((c[k>>2]|0)==(d|0)){c[g>>2]=f;c[k>>2]=q;v=f;break}else{bH();return 0}}}while(0);L2024:do{if((e|0)!=0){f=d+28|0;i=16240+(c[f>>2]<<2)|0;do{if((d|0)==(c[i>>2]|0)){c[i>>2]=v;if((v|0)!=0){break}c[3985]=c[3985]&~(1<<c[f>>2]);break L2024}else{if(e>>>0<(c[3988]|0)>>>0){bH();return 0}q=e+16|0;if((c[q>>2]|0)==(d|0)){c[q>>2]=v}else{c[e+20>>2]=v}if((v|0)==0){break L2024}}}while(0);if(v>>>0<(c[3988]|0)>>>0){bH();return 0}c[v+24>>2]=e;f=c[d+16>>2]|0;do{if((f|0)!=0){if(f>>>0<(c[3988]|0)>>>0){bH();return 0}else{c[v+16>>2]=f;c[f+24>>2]=v;break}}}while(0);f=c[d+20>>2]|0;if((f|0)==0){break}if(f>>>0<(c[3988]|0)>>>0){bH();return 0}else{c[v+20>>2]=f;c[f+24>>2]=v;break}}}while(0);if(p>>>0<16){e=p+b|0;c[d+4>>2]=e|3;f=r+(e+4)|0;c[f>>2]=c[f>>2]|1}else{c[d+4>>2]=b|3;c[r+(b|4)>>2]=p|1;c[r+(p+b)>>2]=p;f=c[3986]|0;if((f|0)!=0){e=c[3989]|0;i=f>>>3;f=i<<1;q=15976+(f<<2)|0;k=c[3984]|0;g=1<<i;do{if((k&g|0)==0){c[3984]=k|g;y=q;z=15976+(f+2<<2)|0}else{i=15976+(f+2<<2)|0;l=c[i>>2]|0;if(l>>>0>=(c[3988]|0)>>>0){y=l;z=i;break}bH();return 0}}while(0);c[z>>2]=e;c[y+12>>2]=e;c[e+8>>2]=y;c[e+12>>2]=q}c[3986]=p;c[3989]=m}n=d+8|0;return n|0}else{if(a>>>0>4294967231){o=-1;break}f=a+11|0;g=f&-8;k=c[3985]|0;if((k|0)==0){o=g;break}r=-g|0;i=f>>>8;do{if((i|0)==0){A=0}else{if(g>>>0>16777215){A=31;break}f=(i+1048320|0)>>>16&8;l=i<<f;h=(l+520192|0)>>>16&4;j=l<<h;l=(j+245760|0)>>>16&2;B=14-(h|f|l)+(j<<l>>>15)|0;A=g>>>((B+7|0)>>>0)&1|B<<1}}while(0);i=c[16240+(A<<2)>>2]|0;L1831:do{if((i|0)==0){C=0;D=r;E=0}else{if((A|0)==31){F=0}else{F=25-(A>>>1)|0}d=0;m=r;p=i;q=g<<F;e=0;while(1){B=c[p+4>>2]&-8;l=B-g|0;if(l>>>0<m>>>0){if((B|0)==(g|0)){C=p;D=l;E=p;break L1831}else{G=p;H=l}}else{G=d;H=m}l=c[p+20>>2]|0;B=c[p+16+(q>>>31<<2)>>2]|0;j=(l|0)==0|(l|0)==(B|0)?e:l;if((B|0)==0){C=G;D=H;E=j;break}else{d=G;m=H;p=B;q=q<<1;e=j}}}}while(0);if((E|0)==0&(C|0)==0){i=2<<A;r=k&(i|-i);if((r|0)==0){o=g;break}i=(r&-r)-1|0;r=i>>>12&16;e=i>>>(r>>>0);i=e>>>5&8;q=e>>>(i>>>0);e=q>>>2&4;p=q>>>(e>>>0);q=p>>>1&2;m=p>>>(q>>>0);p=m>>>1&1;I=c[16240+((i|r|e|q|p)+(m>>>(p>>>0))<<2)>>2]|0}else{I=E}if((I|0)==0){J=D;K=C}else{p=I;m=D;q=C;while(1){e=(c[p+4>>2]&-8)-g|0;r=e>>>0<m>>>0;i=r?e:m;e=r?p:q;r=c[p+16>>2]|0;if((r|0)!=0){p=r;m=i;q=e;continue}r=c[p+20>>2]|0;if((r|0)==0){J=i;K=e;break}else{p=r;m=i;q=e}}}if((K|0)==0){o=g;break}if(J>>>0>=((c[3986]|0)-g|0)>>>0){o=g;break}q=K;m=c[3988]|0;if(q>>>0<m>>>0){bH();return 0}p=q+g|0;k=p;if(q>>>0>=p>>>0){bH();return 0}e=c[K+24>>2]|0;i=c[K+12>>2]|0;do{if((i|0)==(K|0)){r=K+20|0;d=c[r>>2]|0;if((d|0)==0){j=K+16|0;B=c[j>>2]|0;if((B|0)==0){L=0;break}else{M=B;N=j}}else{M=d;N=r}while(1){r=M+20|0;d=c[r>>2]|0;if((d|0)!=0){M=d;N=r;continue}r=M+16|0;d=c[r>>2]|0;if((d|0)==0){break}else{M=d;N=r}}if(N>>>0<m>>>0){bH();return 0}else{c[N>>2]=0;L=M;break}}else{r=c[K+8>>2]|0;if(r>>>0<m>>>0){bH();return 0}d=r+12|0;if((c[d>>2]|0)!=(K|0)){bH();return 0}j=i+8|0;if((c[j>>2]|0)==(K|0)){c[d>>2]=i;c[j>>2]=r;L=i;break}else{bH();return 0}}}while(0);L1881:do{if((e|0)!=0){i=K+28|0;m=16240+(c[i>>2]<<2)|0;do{if((K|0)==(c[m>>2]|0)){c[m>>2]=L;if((L|0)!=0){break}c[3985]=c[3985]&~(1<<c[i>>2]);break L1881}else{if(e>>>0<(c[3988]|0)>>>0){bH();return 0}r=e+16|0;if((c[r>>2]|0)==(K|0)){c[r>>2]=L}else{c[e+20>>2]=L}if((L|0)==0){break L1881}}}while(0);if(L>>>0<(c[3988]|0)>>>0){bH();return 0}c[L+24>>2]=e;i=c[K+16>>2]|0;do{if((i|0)!=0){if(i>>>0<(c[3988]|0)>>>0){bH();return 0}else{c[L+16>>2]=i;c[i+24>>2]=L;break}}}while(0);i=c[K+20>>2]|0;if((i|0)==0){break}if(i>>>0<(c[3988]|0)>>>0){bH();return 0}else{c[L+20>>2]=i;c[i+24>>2]=L;break}}}while(0);L1909:do{if(J>>>0<16){e=J+g|0;c[K+4>>2]=e|3;i=q+(e+4)|0;c[i>>2]=c[i>>2]|1}else{c[K+4>>2]=g|3;c[q+(g|4)>>2]=J|1;c[q+(J+g)>>2]=J;i=J>>>3;if(J>>>0<256){e=i<<1;m=15976+(e<<2)|0;r=c[3984]|0;j=1<<i;do{if((r&j|0)==0){c[3984]=r|j;O=m;P=15976+(e+2<<2)|0}else{i=15976+(e+2<<2)|0;d=c[i>>2]|0;if(d>>>0>=(c[3988]|0)>>>0){O=d;P=i;break}bH();return 0}}while(0);c[P>>2]=k;c[O+12>>2]=k;c[q+(g+8)>>2]=O;c[q+(g+12)>>2]=m;break}e=p;j=J>>>8;do{if((j|0)==0){Q=0}else{if(J>>>0>16777215){Q=31;break}r=(j+1048320|0)>>>16&8;i=j<<r;d=(i+520192|0)>>>16&4;B=i<<d;i=(B+245760|0)>>>16&2;l=14-(d|r|i)+(B<<i>>>15)|0;Q=J>>>((l+7|0)>>>0)&1|l<<1}}while(0);j=16240+(Q<<2)|0;c[q+(g+28)>>2]=Q;c[q+(g+20)>>2]=0;c[q+(g+16)>>2]=0;m=c[3985]|0;l=1<<Q;if((m&l|0)==0){c[3985]=m|l;c[j>>2]=e;c[q+(g+24)>>2]=j;c[q+(g+12)>>2]=e;c[q+(g+8)>>2]=e;break}l=c[j>>2]|0;if((Q|0)==31){R=0}else{R=25-(Q>>>1)|0}L1930:do{if((c[l+4>>2]&-8|0)==(J|0)){S=l}else{j=l;m=J<<R;while(1){T=j+16+(m>>>31<<2)|0;i=c[T>>2]|0;if((i|0)==0){break}if((c[i+4>>2]&-8|0)==(J|0)){S=i;break L1930}else{j=i;m=m<<1}}if(T>>>0<(c[3988]|0)>>>0){bH();return 0}else{c[T>>2]=e;c[q+(g+24)>>2]=j;c[q+(g+12)>>2]=e;c[q+(g+8)>>2]=e;break L1909}}}while(0);l=S+8|0;m=c[l>>2]|0;i=c[3988]|0;if(S>>>0<i>>>0){bH();return 0}if(m>>>0<i>>>0){bH();return 0}else{c[m+12>>2]=e;c[l>>2]=e;c[q+(g+8)>>2]=m;c[q+(g+12)>>2]=S;c[q+(g+24)>>2]=0;break}}}while(0);n=K+8|0;return n|0}}while(0);K=c[3986]|0;if(o>>>0<=K>>>0){S=K-o|0;T=c[3989]|0;if(S>>>0>15){J=T;c[3989]=J+o;c[3986]=S;c[J+(o+4)>>2]=S|1;c[J+K>>2]=S;c[T+4>>2]=o|3}else{c[3986]=0;c[3989]=0;c[T+4>>2]=K|3;S=T+(K+4)|0;c[S>>2]=c[S>>2]|1}n=T+8|0;return n|0}T=c[3987]|0;if(o>>>0<T>>>0){S=T-o|0;c[3987]=S;T=c[3990]|0;K=T;c[3990]=K+o;c[K+(o+4)>>2]=S|1;c[T+4>>2]=o|3;n=T+8|0;return n|0}do{if((c[3974]|0)==0){T=bp(8)|0;if((T-1&T|0)==0){c[3976]=T;c[3975]=T;c[3977]=-1;c[3978]=2097152;c[3979]=0;c[4095]=0;c[3974]=(bV(0)|0)&-16^1431655768;break}else{bH();return 0}}}while(0);T=o+48|0;S=c[3976]|0;K=o+47|0;J=S+K|0;R=-S|0;S=J&R;if(S>>>0<=o>>>0){n=0;return n|0}Q=c[4094]|0;do{if((Q|0)!=0){O=c[4092]|0;P=O+S|0;if(P>>>0<=O>>>0|P>>>0>Q>>>0){n=0}else{break}return n|0}}while(0);L2091:do{if((c[4095]&4|0)==0){Q=c[3990]|0;L2093:do{if((Q|0)==0){U=1774}else{P=Q;O=16384;while(1){V=O|0;L=c[V>>2]|0;if(L>>>0<=P>>>0){W=O+4|0;if((L+(c[W>>2]|0)|0)>>>0>P>>>0){break}}L=c[O+8>>2]|0;if((L|0)==0){U=1774;break L2093}else{O=L}}if((O|0)==0){U=1774;break}P=J-(c[3987]|0)&R;if(P>>>0>=2147483647){X=0;break}e=bv(P|0)|0;L=(e|0)==((c[V>>2]|0)+(c[W>>2]|0)|0);Y=L?e:-1;Z=L?P:0;_=e;$=P;U=1783}}while(0);do{if((U|0)==1774){Q=bv(0)|0;if((Q|0)==-1){X=0;break}P=Q;e=c[3975]|0;L=e-1|0;if((L&P|0)==0){aa=S}else{aa=S-P+(L+P&-e)|0}e=c[4092]|0;P=e+aa|0;if(!(aa>>>0>o>>>0&aa>>>0<2147483647)){X=0;break}L=c[4094]|0;if((L|0)!=0){if(P>>>0<=e>>>0|P>>>0>L>>>0){X=0;break}}L=bv(aa|0)|0;P=(L|0)==(Q|0);Y=P?Q:-1;Z=P?aa:0;_=L;$=aa;U=1783}}while(0);L2113:do{if((U|0)==1783){L=-$|0;if((Y|0)!=-1){ab=Z;ac=Y;U=1794;break L2091}do{if((_|0)!=-1&$>>>0<2147483647&$>>>0<T>>>0){P=c[3976]|0;Q=K-$+P&-P;if(Q>>>0>=2147483647){ad=$;break}if((bv(Q|0)|0)==-1){bv(L|0)|0;X=Z;break L2113}else{ad=Q+$|0;break}}else{ad=$}}while(0);if((_|0)==-1){X=Z}else{ab=ad;ac=_;U=1794;break L2091}}}while(0);c[4095]=c[4095]|4;ae=X;U=1791}else{ae=0;U=1791}}while(0);do{if((U|0)==1791){if(S>>>0>=2147483647){break}X=bv(S|0)|0;_=bv(0)|0;if(!((_|0)!=-1&(X|0)!=-1&X>>>0<_>>>0)){break}ad=_-X|0;_=ad>>>0>(o+40|0)>>>0;if(_){ab=_?ad:ae;ac=X;U=1794}}}while(0);do{if((U|0)==1794){ae=(c[4092]|0)+ab|0;c[4092]=ae;if(ae>>>0>(c[4093]|0)>>>0){c[4093]=ae}ae=c[3990]|0;L2133:do{if((ae|0)==0){S=c[3988]|0;if((S|0)==0|ac>>>0<S>>>0){c[3988]=ac}c[4096]=ac;c[4097]=ab;c[4099]=0;c[3993]=c[3974];c[3992]=-1;S=0;do{X=S<<1;ad=15976+(X<<2)|0;c[15976+(X+3<<2)>>2]=ad;c[15976+(X+2<<2)>>2]=ad;S=S+1|0;}while(S>>>0<32);S=ac+8|0;if((S&7|0)==0){af=0}else{af=-S&7}S=ab-40-af|0;c[3990]=ac+af;c[3987]=S;c[ac+(af+4)>>2]=S|1;c[ac+(ab-36)>>2]=40;c[3991]=c[3978]}else{S=16384;while(1){ag=c[S>>2]|0;ah=S+4|0;ai=c[ah>>2]|0;if((ac|0)==(ag+ai|0)){U=1806;break}ad=c[S+8>>2]|0;if((ad|0)==0){break}else{S=ad}}do{if((U|0)==1806){if((c[S+12>>2]&8|0)!=0){break}ad=ae;if(!(ad>>>0>=ag>>>0&ad>>>0<ac>>>0)){break}c[ah>>2]=ai+ab;ad=c[3990]|0;X=(c[3987]|0)+ab|0;_=ad;Z=ad+8|0;if((Z&7|0)==0){aj=0}else{aj=-Z&7}Z=X-aj|0;c[3990]=_+aj;c[3987]=Z;c[_+(aj+4)>>2]=Z|1;c[_+(X+4)>>2]=40;c[3991]=c[3978];break L2133}}while(0);if(ac>>>0<(c[3988]|0)>>>0){c[3988]=ac}S=ac+ab|0;X=16384;while(1){ak=X|0;if((c[ak>>2]|0)==(S|0)){U=1816;break}_=c[X+8>>2]|0;if((_|0)==0){break}else{X=_}}do{if((U|0)==1816){if((c[X+12>>2]&8|0)!=0){break}c[ak>>2]=ac;S=X+4|0;c[S>>2]=(c[S>>2]|0)+ab;S=ac+8|0;if((S&7|0)==0){al=0}else{al=-S&7}S=ac+(ab+8)|0;if((S&7|0)==0){am=0}else{am=-S&7}S=ac+(am+ab)|0;_=S;Z=al+o|0;ad=ac+Z|0;$=ad;K=S-(ac+al)-o|0;c[ac+(al+4)>>2]=o|3;L2170:do{if((_|0)==(c[3990]|0)){T=(c[3987]|0)+K|0;c[3987]=T;c[3990]=$;c[ac+(Z+4)>>2]=T|1}else{if((_|0)==(c[3989]|0)){T=(c[3986]|0)+K|0;c[3986]=T;c[3989]=$;c[ac+(Z+4)>>2]=T|1;c[ac+(T+Z)>>2]=T;break}T=ab+4|0;Y=c[ac+(T+am)>>2]|0;if((Y&3|0)==1){aa=Y&-8;W=Y>>>3;L2178:do{if(Y>>>0<256){V=c[ac+((am|8)+ab)>>2]|0;R=c[ac+(ab+12+am)>>2]|0;J=15976+(W<<1<<2)|0;do{if((V|0)!=(J|0)){if(V>>>0<(c[3988]|0)>>>0){bH();return 0}if((c[V+12>>2]|0)==(_|0)){break}bH();return 0}}while(0);if((R|0)==(V|0)){c[3984]=c[3984]&~(1<<W);break}do{if((R|0)==(J|0)){an=R+8|0}else{if(R>>>0<(c[3988]|0)>>>0){bH();return 0}L=R+8|0;if((c[L>>2]|0)==(_|0)){an=L;break}bH();return 0}}while(0);c[V+12>>2]=R;c[an>>2]=V}else{J=S;L=c[ac+((am|24)+ab)>>2]|0;O=c[ac+(ab+12+am)>>2]|0;do{if((O|0)==(J|0)){Q=am|16;P=ac+(T+Q)|0;e=c[P>>2]|0;if((e|0)==0){M=ac+(Q+ab)|0;Q=c[M>>2]|0;if((Q|0)==0){ao=0;break}else{ap=Q;aq=M}}else{ap=e;aq=P}while(1){P=ap+20|0;e=c[P>>2]|0;if((e|0)!=0){ap=e;aq=P;continue}P=ap+16|0;e=c[P>>2]|0;if((e|0)==0){break}else{ap=e;aq=P}}if(aq>>>0<(c[3988]|0)>>>0){bH();return 0}else{c[aq>>2]=0;ao=ap;break}}else{P=c[ac+((am|8)+ab)>>2]|0;if(P>>>0<(c[3988]|0)>>>0){bH();return 0}e=P+12|0;if((c[e>>2]|0)!=(J|0)){bH();return 0}M=O+8|0;if((c[M>>2]|0)==(J|0)){c[e>>2]=O;c[M>>2]=P;ao=O;break}else{bH();return 0}}}while(0);if((L|0)==0){break}O=ac+(ab+28+am)|0;V=16240+(c[O>>2]<<2)|0;do{if((J|0)==(c[V>>2]|0)){c[V>>2]=ao;if((ao|0)!=0){break}c[3985]=c[3985]&~(1<<c[O>>2]);break L2178}else{if(L>>>0<(c[3988]|0)>>>0){bH();return 0}R=L+16|0;if((c[R>>2]|0)==(J|0)){c[R>>2]=ao}else{c[L+20>>2]=ao}if((ao|0)==0){break L2178}}}while(0);if(ao>>>0<(c[3988]|0)>>>0){bH();return 0}c[ao+24>>2]=L;J=am|16;O=c[ac+(J+ab)>>2]|0;do{if((O|0)!=0){if(O>>>0<(c[3988]|0)>>>0){bH();return 0}else{c[ao+16>>2]=O;c[O+24>>2]=ao;break}}}while(0);O=c[ac+(T+J)>>2]|0;if((O|0)==0){break}if(O>>>0<(c[3988]|0)>>>0){bH();return 0}else{c[ao+20>>2]=O;c[O+24>>2]=ao;break}}}while(0);ar=ac+((aa|am)+ab)|0;as=aa+K|0}else{ar=_;as=K}T=ar+4|0;c[T>>2]=c[T>>2]&-2;c[ac+(Z+4)>>2]=as|1;c[ac+(as+Z)>>2]=as;T=as>>>3;if(as>>>0<256){W=T<<1;Y=15976+(W<<2)|0;O=c[3984]|0;L=1<<T;do{if((O&L|0)==0){c[3984]=O|L;at=Y;au=15976+(W+2<<2)|0}else{T=15976+(W+2<<2)|0;V=c[T>>2]|0;if(V>>>0>=(c[3988]|0)>>>0){at=V;au=T;break}bH();return 0}}while(0);c[au>>2]=$;c[at+12>>2]=$;c[ac+(Z+8)>>2]=at;c[ac+(Z+12)>>2]=Y;break}W=ad;L=as>>>8;do{if((L|0)==0){av=0}else{if(as>>>0>16777215){av=31;break}O=(L+1048320|0)>>>16&8;aa=L<<O;T=(aa+520192|0)>>>16&4;V=aa<<T;aa=(V+245760|0)>>>16&2;R=14-(T|O|aa)+(V<<aa>>>15)|0;av=as>>>((R+7|0)>>>0)&1|R<<1}}while(0);L=16240+(av<<2)|0;c[ac+(Z+28)>>2]=av;c[ac+(Z+20)>>2]=0;c[ac+(Z+16)>>2]=0;Y=c[3985]|0;R=1<<av;if((Y&R|0)==0){c[3985]=Y|R;c[L>>2]=W;c[ac+(Z+24)>>2]=L;c[ac+(Z+12)>>2]=W;c[ac+(Z+8)>>2]=W;break}R=c[L>>2]|0;if((av|0)==31){aw=0}else{aw=25-(av>>>1)|0}L2267:do{if((c[R+4>>2]&-8|0)==(as|0)){ax=R}else{L=R;Y=as<<aw;while(1){ay=L+16+(Y>>>31<<2)|0;aa=c[ay>>2]|0;if((aa|0)==0){break}if((c[aa+4>>2]&-8|0)==(as|0)){ax=aa;break L2267}else{L=aa;Y=Y<<1}}if(ay>>>0<(c[3988]|0)>>>0){bH();return 0}else{c[ay>>2]=W;c[ac+(Z+24)>>2]=L;c[ac+(Z+12)>>2]=W;c[ac+(Z+8)>>2]=W;break L2170}}}while(0);R=ax+8|0;Y=c[R>>2]|0;J=c[3988]|0;if(ax>>>0<J>>>0){bH();return 0}if(Y>>>0<J>>>0){bH();return 0}else{c[Y+12>>2]=W;c[R>>2]=W;c[ac+(Z+8)>>2]=Y;c[ac+(Z+12)>>2]=ax;c[ac+(Z+24)>>2]=0;break}}}while(0);n=ac+(al|8)|0;return n|0}}while(0);X=ae;Z=16384;while(1){az=c[Z>>2]|0;if(az>>>0<=X>>>0){aA=c[Z+4>>2]|0;aB=az+aA|0;if(aB>>>0>X>>>0){break}}Z=c[Z+8>>2]|0}Z=az+(aA-39)|0;if((Z&7|0)==0){aC=0}else{aC=-Z&7}Z=az+(aA-47+aC)|0;ad=Z>>>0<(ae+16|0)>>>0?X:Z;Z=ad+8|0;$=ac+8|0;if(($&7|0)==0){aD=0}else{aD=-$&7}$=ab-40-aD|0;c[3990]=ac+aD;c[3987]=$;c[ac+(aD+4)>>2]=$|1;c[ac+(ab-36)>>2]=40;c[3991]=c[3978];c[ad+4>>2]=27;c[Z>>2]=c[4096];c[Z+4>>2]=c[16388>>2];c[Z+8>>2]=c[16392>>2];c[Z+12>>2]=c[16396>>2];c[4096]=ac;c[4097]=ab;c[4099]=0;c[4098]=Z;Z=ad+28|0;c[Z>>2]=7;if((ad+32|0)>>>0<aB>>>0){$=Z;while(1){Z=$+4|0;c[Z>>2]=7;if(($+8|0)>>>0<aB>>>0){$=Z}else{break}}}if((ad|0)==(X|0)){break}$=ad-ae|0;Z=X+($+4)|0;c[Z>>2]=c[Z>>2]&-2;c[ae+4>>2]=$|1;c[X+$>>2]=$;Z=$>>>3;if($>>>0<256){K=Z<<1;_=15976+(K<<2)|0;S=c[3984]|0;j=1<<Z;do{if((S&j|0)==0){c[3984]=S|j;aE=_;aF=15976+(K+2<<2)|0}else{Z=15976+(K+2<<2)|0;Y=c[Z>>2]|0;if(Y>>>0>=(c[3988]|0)>>>0){aE=Y;aF=Z;break}bH();return 0}}while(0);c[aF>>2]=ae;c[aE+12>>2]=ae;c[ae+8>>2]=aE;c[ae+12>>2]=_;break}K=ae;j=$>>>8;do{if((j|0)==0){aG=0}else{if($>>>0>16777215){aG=31;break}S=(j+1048320|0)>>>16&8;X=j<<S;ad=(X+520192|0)>>>16&4;Z=X<<ad;X=(Z+245760|0)>>>16&2;Y=14-(ad|S|X)+(Z<<X>>>15)|0;aG=$>>>((Y+7|0)>>>0)&1|Y<<1}}while(0);j=16240+(aG<<2)|0;c[ae+28>>2]=aG;c[ae+20>>2]=0;c[ae+16>>2]=0;_=c[3985]|0;Y=1<<aG;if((_&Y|0)==0){c[3985]=_|Y;c[j>>2]=K;c[ae+24>>2]=j;c[ae+12>>2]=ae;c[ae+8>>2]=ae;break}Y=c[j>>2]|0;if((aG|0)==31){aH=0}else{aH=25-(aG>>>1)|0}L2321:do{if((c[Y+4>>2]&-8|0)==($|0)){aI=Y}else{j=Y;_=$<<aH;while(1){aJ=j+16+(_>>>31<<2)|0;X=c[aJ>>2]|0;if((X|0)==0){break}if((c[X+4>>2]&-8|0)==($|0)){aI=X;break L2321}else{j=X;_=_<<1}}if(aJ>>>0<(c[3988]|0)>>>0){bH();return 0}else{c[aJ>>2]=K;c[ae+24>>2]=j;c[ae+12>>2]=ae;c[ae+8>>2]=ae;break L2133}}}while(0);$=aI+8|0;Y=c[$>>2]|0;_=c[3988]|0;if(aI>>>0<_>>>0){bH();return 0}if(Y>>>0<_>>>0){bH();return 0}else{c[Y+12>>2]=K;c[$>>2]=K;c[ae+8>>2]=Y;c[ae+12>>2]=aI;c[ae+24>>2]=0;break}}}while(0);ae=c[3987]|0;if(ae>>>0<=o>>>0){break}Y=ae-o|0;c[3987]=Y;ae=c[3990]|0;$=ae;c[3990]=$+o;c[$+(o+4)>>2]=Y|1;c[ae+4>>2]=o|3;n=ae+8|0;return n|0}}while(0);c[(bw()|0)>>2]=12;n=0;return n|0}function lS(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0;if((a|0)==0){return}b=a-8|0;d=b;e=c[3988]|0;if(b>>>0<e>>>0){bH()}f=c[a-4>>2]|0;g=f&3;if((g|0)==1){bH()}h=f&-8;i=a+(h-8)|0;j=i;L2352:do{if((f&1|0)==0){k=c[b>>2]|0;if((g|0)==0){return}l=-8-k|0;m=a+l|0;n=m;o=k+h|0;if(m>>>0<e>>>0){bH()}if((n|0)==(c[3989]|0)){p=a+(h-4)|0;if((c[p>>2]&3|0)!=3){q=n;r=o;break}c[3986]=o;c[p>>2]=c[p>>2]&-2;c[a+(l+4)>>2]=o|1;c[i>>2]=o;return}p=k>>>3;if(k>>>0<256){k=c[a+(l+8)>>2]|0;s=c[a+(l+12)>>2]|0;t=15976+(p<<1<<2)|0;do{if((k|0)!=(t|0)){if(k>>>0<e>>>0){bH()}if((c[k+12>>2]|0)==(n|0)){break}bH()}}while(0);if((s|0)==(k|0)){c[3984]=c[3984]&~(1<<p);q=n;r=o;break}do{if((s|0)==(t|0)){u=s+8|0}else{if(s>>>0<e>>>0){bH()}v=s+8|0;if((c[v>>2]|0)==(n|0)){u=v;break}bH()}}while(0);c[k+12>>2]=s;c[u>>2]=k;q=n;r=o;break}t=m;p=c[a+(l+24)>>2]|0;v=c[a+(l+12)>>2]|0;do{if((v|0)==(t|0)){w=a+(l+20)|0;x=c[w>>2]|0;if((x|0)==0){y=a+(l+16)|0;z=c[y>>2]|0;if((z|0)==0){A=0;break}else{B=z;C=y}}else{B=x;C=w}while(1){w=B+20|0;x=c[w>>2]|0;if((x|0)!=0){B=x;C=w;continue}w=B+16|0;x=c[w>>2]|0;if((x|0)==0){break}else{B=x;C=w}}if(C>>>0<e>>>0){bH()}else{c[C>>2]=0;A=B;break}}else{w=c[a+(l+8)>>2]|0;if(w>>>0<e>>>0){bH()}x=w+12|0;if((c[x>>2]|0)!=(t|0)){bH()}y=v+8|0;if((c[y>>2]|0)==(t|0)){c[x>>2]=v;c[y>>2]=w;A=v;break}else{bH()}}}while(0);if((p|0)==0){q=n;r=o;break}v=a+(l+28)|0;m=16240+(c[v>>2]<<2)|0;do{if((t|0)==(c[m>>2]|0)){c[m>>2]=A;if((A|0)!=0){break}c[3985]=c[3985]&~(1<<c[v>>2]);q=n;r=o;break L2352}else{if(p>>>0<(c[3988]|0)>>>0){bH()}k=p+16|0;if((c[k>>2]|0)==(t|0)){c[k>>2]=A}else{c[p+20>>2]=A}if((A|0)==0){q=n;r=o;break L2352}}}while(0);if(A>>>0<(c[3988]|0)>>>0){bH()}c[A+24>>2]=p;t=c[a+(l+16)>>2]|0;do{if((t|0)!=0){if(t>>>0<(c[3988]|0)>>>0){bH()}else{c[A+16>>2]=t;c[t+24>>2]=A;break}}}while(0);t=c[a+(l+20)>>2]|0;if((t|0)==0){q=n;r=o;break}if(t>>>0<(c[3988]|0)>>>0){bH()}else{c[A+20>>2]=t;c[t+24>>2]=A;q=n;r=o;break}}else{q=d;r=h}}while(0);d=q;if(d>>>0>=i>>>0){bH()}A=a+(h-4)|0;e=c[A>>2]|0;if((e&1|0)==0){bH()}do{if((e&2|0)==0){if((j|0)==(c[3990]|0)){B=(c[3987]|0)+r|0;c[3987]=B;c[3990]=q;c[q+4>>2]=B|1;if((q|0)==(c[3989]|0)){c[3989]=0;c[3986]=0}if(B>>>0<=(c[3991]|0)>>>0){return}lU(0)|0;return}if((j|0)==(c[3989]|0)){B=(c[3986]|0)+r|0;c[3986]=B;c[3989]=q;c[q+4>>2]=B|1;c[d+B>>2]=B;return}B=(e&-8)+r|0;C=e>>>3;L2458:do{if(e>>>0<256){u=c[a+h>>2]|0;g=c[a+(h|4)>>2]|0;b=15976+(C<<1<<2)|0;do{if((u|0)!=(b|0)){if(u>>>0<(c[3988]|0)>>>0){bH()}if((c[u+12>>2]|0)==(j|0)){break}bH()}}while(0);if((g|0)==(u|0)){c[3984]=c[3984]&~(1<<C);break}do{if((g|0)==(b|0)){D=g+8|0}else{if(g>>>0<(c[3988]|0)>>>0){bH()}f=g+8|0;if((c[f>>2]|0)==(j|0)){D=f;break}bH()}}while(0);c[u+12>>2]=g;c[D>>2]=u}else{b=i;f=c[a+(h+16)>>2]|0;t=c[a+(h|4)>>2]|0;do{if((t|0)==(b|0)){p=a+(h+12)|0;v=c[p>>2]|0;if((v|0)==0){m=a+(h+8)|0;k=c[m>>2]|0;if((k|0)==0){E=0;break}else{F=k;G=m}}else{F=v;G=p}while(1){p=F+20|0;v=c[p>>2]|0;if((v|0)!=0){F=v;G=p;continue}p=F+16|0;v=c[p>>2]|0;if((v|0)==0){break}else{F=v;G=p}}if(G>>>0<(c[3988]|0)>>>0){bH()}else{c[G>>2]=0;E=F;break}}else{p=c[a+h>>2]|0;if(p>>>0<(c[3988]|0)>>>0){bH()}v=p+12|0;if((c[v>>2]|0)!=(b|0)){bH()}m=t+8|0;if((c[m>>2]|0)==(b|0)){c[v>>2]=t;c[m>>2]=p;E=t;break}else{bH()}}}while(0);if((f|0)==0){break}t=a+(h+20)|0;u=16240+(c[t>>2]<<2)|0;do{if((b|0)==(c[u>>2]|0)){c[u>>2]=E;if((E|0)!=0){break}c[3985]=c[3985]&~(1<<c[t>>2]);break L2458}else{if(f>>>0<(c[3988]|0)>>>0){bH()}g=f+16|0;if((c[g>>2]|0)==(b|0)){c[g>>2]=E}else{c[f+20>>2]=E}if((E|0)==0){break L2458}}}while(0);if(E>>>0<(c[3988]|0)>>>0){bH()}c[E+24>>2]=f;b=c[a+(h+8)>>2]|0;do{if((b|0)!=0){if(b>>>0<(c[3988]|0)>>>0){bH()}else{c[E+16>>2]=b;c[b+24>>2]=E;break}}}while(0);b=c[a+(h+12)>>2]|0;if((b|0)==0){break}if(b>>>0<(c[3988]|0)>>>0){bH()}else{c[E+20>>2]=b;c[b+24>>2]=E;break}}}while(0);c[q+4>>2]=B|1;c[d+B>>2]=B;if((q|0)!=(c[3989]|0)){H=B;break}c[3986]=B;return}else{c[A>>2]=e&-2;c[q+4>>2]=r|1;c[d+r>>2]=r;H=r}}while(0);r=H>>>3;if(H>>>0<256){d=r<<1;e=15976+(d<<2)|0;A=c[3984]|0;E=1<<r;do{if((A&E|0)==0){c[3984]=A|E;I=e;J=15976+(d+2<<2)|0}else{r=15976+(d+2<<2)|0;h=c[r>>2]|0;if(h>>>0>=(c[3988]|0)>>>0){I=h;J=r;break}bH()}}while(0);c[J>>2]=q;c[I+12>>2]=q;c[q+8>>2]=I;c[q+12>>2]=e;return}e=q;I=H>>>8;do{if((I|0)==0){K=0}else{if(H>>>0>16777215){K=31;break}J=(I+1048320|0)>>>16&8;d=I<<J;E=(d+520192|0)>>>16&4;A=d<<E;d=(A+245760|0)>>>16&2;r=14-(E|J|d)+(A<<d>>>15)|0;K=H>>>((r+7|0)>>>0)&1|r<<1}}while(0);I=16240+(K<<2)|0;c[q+28>>2]=K;c[q+20>>2]=0;c[q+16>>2]=0;r=c[3985]|0;d=1<<K;L2544:do{if((r&d|0)==0){c[3985]=r|d;c[I>>2]=e;c[q+24>>2]=I;c[q+12>>2]=q;c[q+8>>2]=q}else{A=c[I>>2]|0;if((K|0)==31){L=0}else{L=25-(K>>>1)|0}L2550:do{if((c[A+4>>2]&-8|0)==(H|0)){M=A}else{J=A;E=H<<L;while(1){N=J+16+(E>>>31<<2)|0;h=c[N>>2]|0;if((h|0)==0){break}if((c[h+4>>2]&-8|0)==(H|0)){M=h;break L2550}else{J=h;E=E<<1}}if(N>>>0<(c[3988]|0)>>>0){bH()}else{c[N>>2]=e;c[q+24>>2]=J;c[q+12>>2]=q;c[q+8>>2]=q;break L2544}}}while(0);A=M+8|0;B=c[A>>2]|0;E=c[3988]|0;if(M>>>0<E>>>0){bH()}if(B>>>0<E>>>0){bH()}else{c[B+12>>2]=e;c[A>>2]=e;c[q+8>>2]=B;c[q+12>>2]=M;c[q+24>>2]=0;break}}}while(0);q=(c[3992]|0)-1|0;c[3992]=q;if((q|0)==0){O=16392}else{return}while(1){q=c[O>>2]|0;if((q|0)==0){break}else{O=q+8|0}}c[3992]=-1;return}function lT(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;if((a|0)==0){d=lR(b)|0;return d|0}if(b>>>0>4294967231){c[(bw()|0)>>2]=12;d=0;return d|0}if(b>>>0<11){e=16}else{e=b+11&-8}f=lV(a-8|0,e)|0;if((f|0)!=0){d=f+8|0;return d|0}f=lR(b)|0;if((f|0)==0){d=0;return d|0}e=c[a-4>>2]|0;g=(e&-8)-((e&3|0)==0?8:4)|0;e=g>>>0<b>>>0?g:b;l5(f|0,a|0,e)|0;lS(a);d=f;return d|0}function lU(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;do{if((c[3974]|0)==0){b=bp(8)|0;if((b-1&b|0)==0){c[3976]=b;c[3975]=b;c[3977]=-1;c[3978]=2097152;c[3979]=0;c[4095]=0;c[3974]=(bV(0)|0)&-16^1431655768;break}else{bH();return 0}}}while(0);if(a>>>0>=4294967232){d=0;return d|0}b=c[3990]|0;if((b|0)==0){d=0;return d|0}e=c[3987]|0;do{if(e>>>0>(a+40|0)>>>0){f=c[3976]|0;g=(((-40-a-1+e+f|0)>>>0)/(f>>>0)|0)-1|0;h=b;i=16384;while(1){j=i|0;k=c[j>>2]|0;if(k>>>0<=h>>>0){l=i+4|0;if((k+(c[l>>2]|0)|0)>>>0>h>>>0){break}}i=c[i+8>>2]|0}h=ag(g,f)|0;if((c[i+12>>2]&8|0)!=0){break}k=bv(0)|0;if((k|0)!=((c[j>>2]|0)+(c[l>>2]|0)|0)){break}m=bv(-(h>>>0>2147483646?-2147483648-f|0:h)|0)|0;h=bv(0)|0;if(!((m|0)!=-1&h>>>0<k>>>0)){break}m=k-h|0;if((k|0)==(h|0)){break}c[l>>2]=(c[l>>2]|0)-m;c[4092]=(c[4092]|0)-m;n=c[3990]|0;o=(c[3987]|0)-m|0;m=n;p=n+8|0;if((p&7|0)==0){q=0}else{q=-p&7}p=o-q|0;c[3990]=m+q;c[3987]=p;c[m+(q+4)>>2]=p|1;c[m+(o+4)>>2]=40;c[3991]=c[3978];d=(k|0)!=(h|0)|0;return d|0}}while(0);if((c[3987]|0)>>>0<=(c[3991]|0)>>>0){d=0;return d|0}c[3991]=-1;d=0;return d|0}function lV(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;d=a+4|0;e=c[d>>2]|0;f=e&-8;g=a;h=g+f|0;i=h;j=c[3988]|0;if(g>>>0<j>>>0){bH();return 0}k=e&3;if(!((k|0)!=1&g>>>0<h>>>0)){bH();return 0}l=g+(f|4)|0;m=c[l>>2]|0;if((m&1|0)==0){bH();return 0}if((k|0)==0){if(b>>>0<256){n=0;return n|0}do{if(f>>>0>=(b+4|0)>>>0){if((f-b|0)>>>0>c[3976]<<1>>>0){break}else{n=a}return n|0}}while(0);n=0;return n|0}if(f>>>0>=b>>>0){k=f-b|0;if(k>>>0<=15){n=a;return n|0}c[d>>2]=e&1|b|2;c[g+(b+4)>>2]=k|3;c[l>>2]=c[l>>2]|1;lW(g+b|0,k);n=a;return n|0}if((i|0)==(c[3990]|0)){k=(c[3987]|0)+f|0;if(k>>>0<=b>>>0){n=0;return n|0}l=k-b|0;c[d>>2]=e&1|b|2;c[g+(b+4)>>2]=l|1;c[3990]=g+b;c[3987]=l;n=a;return n|0}if((i|0)==(c[3989]|0)){l=(c[3986]|0)+f|0;if(l>>>0<b>>>0){n=0;return n|0}k=l-b|0;if(k>>>0>15){c[d>>2]=e&1|b|2;c[g+(b+4)>>2]=k|1;c[g+l>>2]=k;o=g+(l+4)|0;c[o>>2]=c[o>>2]&-2;p=g+b|0;q=k}else{c[d>>2]=e&1|l|2;e=g+(l+4)|0;c[e>>2]=c[e>>2]|1;p=0;q=0}c[3986]=q;c[3989]=p;n=a;return n|0}if((m&2|0)!=0){n=0;return n|0}p=(m&-8)+f|0;if(p>>>0<b>>>0){n=0;return n|0}q=p-b|0;e=m>>>3;L2679:do{if(m>>>0<256){l=c[g+(f+8)>>2]|0;k=c[g+(f+12)>>2]|0;o=15976+(e<<1<<2)|0;do{if((l|0)!=(o|0)){if(l>>>0<j>>>0){bH();return 0}if((c[l+12>>2]|0)==(i|0)){break}bH();return 0}}while(0);if((k|0)==(l|0)){c[3984]=c[3984]&~(1<<e);break}do{if((k|0)==(o|0)){r=k+8|0}else{if(k>>>0<j>>>0){bH();return 0}s=k+8|0;if((c[s>>2]|0)==(i|0)){r=s;break}bH();return 0}}while(0);c[l+12>>2]=k;c[r>>2]=l}else{o=h;s=c[g+(f+24)>>2]|0;t=c[g+(f+12)>>2]|0;do{if((t|0)==(o|0)){u=g+(f+20)|0;v=c[u>>2]|0;if((v|0)==0){w=g+(f+16)|0;x=c[w>>2]|0;if((x|0)==0){y=0;break}else{z=x;A=w}}else{z=v;A=u}while(1){u=z+20|0;v=c[u>>2]|0;if((v|0)!=0){z=v;A=u;continue}u=z+16|0;v=c[u>>2]|0;if((v|0)==0){break}else{z=v;A=u}}if(A>>>0<j>>>0){bH();return 0}else{c[A>>2]=0;y=z;break}}else{u=c[g+(f+8)>>2]|0;if(u>>>0<j>>>0){bH();return 0}v=u+12|0;if((c[v>>2]|0)!=(o|0)){bH();return 0}w=t+8|0;if((c[w>>2]|0)==(o|0)){c[v>>2]=t;c[w>>2]=u;y=t;break}else{bH();return 0}}}while(0);if((s|0)==0){break}t=g+(f+28)|0;l=16240+(c[t>>2]<<2)|0;do{if((o|0)==(c[l>>2]|0)){c[l>>2]=y;if((y|0)!=0){break}c[3985]=c[3985]&~(1<<c[t>>2]);break L2679}else{if(s>>>0<(c[3988]|0)>>>0){bH();return 0}k=s+16|0;if((c[k>>2]|0)==(o|0)){c[k>>2]=y}else{c[s+20>>2]=y}if((y|0)==0){break L2679}}}while(0);if(y>>>0<(c[3988]|0)>>>0){bH();return 0}c[y+24>>2]=s;o=c[g+(f+16)>>2]|0;do{if((o|0)!=0){if(o>>>0<(c[3988]|0)>>>0){bH();return 0}else{c[y+16>>2]=o;c[o+24>>2]=y;break}}}while(0);o=c[g+(f+20)>>2]|0;if((o|0)==0){break}if(o>>>0<(c[3988]|0)>>>0){bH();return 0}else{c[y+20>>2]=o;c[o+24>>2]=y;break}}}while(0);if(q>>>0<16){c[d>>2]=p|c[d>>2]&1|2;y=g+(p|4)|0;c[y>>2]=c[y>>2]|1;n=a;return n|0}else{c[d>>2]=c[d>>2]&1|b|2;c[g+(b+4)>>2]=q|3;d=g+(p|4)|0;c[d>>2]=c[d>>2]|1;lW(g+b|0,q);n=a;return n|0}return 0}function lW(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0;d=a;e=d+b|0;f=e;g=c[a+4>>2]|0;L2755:do{if((g&1|0)==0){h=c[a>>2]|0;if((g&3|0)==0){return}i=d+(-h|0)|0;j=i;k=h+b|0;l=c[3988]|0;if(i>>>0<l>>>0){bH()}if((j|0)==(c[3989]|0)){m=d+(b+4)|0;if((c[m>>2]&3|0)!=3){n=j;o=k;break}c[3986]=k;c[m>>2]=c[m>>2]&-2;c[d+(4-h)>>2]=k|1;c[e>>2]=k;return}m=h>>>3;if(h>>>0<256){p=c[d+(8-h)>>2]|0;q=c[d+(12-h)>>2]|0;r=15976+(m<<1<<2)|0;do{if((p|0)!=(r|0)){if(p>>>0<l>>>0){bH()}if((c[p+12>>2]|0)==(j|0)){break}bH()}}while(0);if((q|0)==(p|0)){c[3984]=c[3984]&~(1<<m);n=j;o=k;break}do{if((q|0)==(r|0)){s=q+8|0}else{if(q>>>0<l>>>0){bH()}t=q+8|0;if((c[t>>2]|0)==(j|0)){s=t;break}bH()}}while(0);c[p+12>>2]=q;c[s>>2]=p;n=j;o=k;break}r=i;m=c[d+(24-h)>>2]|0;t=c[d+(12-h)>>2]|0;do{if((t|0)==(r|0)){u=16-h|0;v=d+(u+4)|0;w=c[v>>2]|0;if((w|0)==0){x=d+u|0;u=c[x>>2]|0;if((u|0)==0){y=0;break}else{z=u;A=x}}else{z=w;A=v}while(1){v=z+20|0;w=c[v>>2]|0;if((w|0)!=0){z=w;A=v;continue}v=z+16|0;w=c[v>>2]|0;if((w|0)==0){break}else{z=w;A=v}}if(A>>>0<l>>>0){bH()}else{c[A>>2]=0;y=z;break}}else{v=c[d+(8-h)>>2]|0;if(v>>>0<l>>>0){bH()}w=v+12|0;if((c[w>>2]|0)!=(r|0)){bH()}x=t+8|0;if((c[x>>2]|0)==(r|0)){c[w>>2]=t;c[x>>2]=v;y=t;break}else{bH()}}}while(0);if((m|0)==0){n=j;o=k;break}t=d+(28-h)|0;l=16240+(c[t>>2]<<2)|0;do{if((r|0)==(c[l>>2]|0)){c[l>>2]=y;if((y|0)!=0){break}c[3985]=c[3985]&~(1<<c[t>>2]);n=j;o=k;break L2755}else{if(m>>>0<(c[3988]|0)>>>0){bH()}i=m+16|0;if((c[i>>2]|0)==(r|0)){c[i>>2]=y}else{c[m+20>>2]=y}if((y|0)==0){n=j;o=k;break L2755}}}while(0);if(y>>>0<(c[3988]|0)>>>0){bH()}c[y+24>>2]=m;r=16-h|0;t=c[d+r>>2]|0;do{if((t|0)!=0){if(t>>>0<(c[3988]|0)>>>0){bH()}else{c[y+16>>2]=t;c[t+24>>2]=y;break}}}while(0);t=c[d+(r+4)>>2]|0;if((t|0)==0){n=j;o=k;break}if(t>>>0<(c[3988]|0)>>>0){bH()}else{c[y+20>>2]=t;c[t+24>>2]=y;n=j;o=k;break}}else{n=a;o=b}}while(0);a=c[3988]|0;if(e>>>0<a>>>0){bH()}y=d+(b+4)|0;z=c[y>>2]|0;do{if((z&2|0)==0){if((f|0)==(c[3990]|0)){A=(c[3987]|0)+o|0;c[3987]=A;c[3990]=n;c[n+4>>2]=A|1;if((n|0)!=(c[3989]|0)){return}c[3989]=0;c[3986]=0;return}if((f|0)==(c[3989]|0)){A=(c[3986]|0)+o|0;c[3986]=A;c[3989]=n;c[n+4>>2]=A|1;c[n+A>>2]=A;return}A=(z&-8)+o|0;s=z>>>3;L2854:do{if(z>>>0<256){g=c[d+(b+8)>>2]|0;t=c[d+(b+12)>>2]|0;h=15976+(s<<1<<2)|0;do{if((g|0)!=(h|0)){if(g>>>0<a>>>0){bH()}if((c[g+12>>2]|0)==(f|0)){break}bH()}}while(0);if((t|0)==(g|0)){c[3984]=c[3984]&~(1<<s);break}do{if((t|0)==(h|0)){B=t+8|0}else{if(t>>>0<a>>>0){bH()}m=t+8|0;if((c[m>>2]|0)==(f|0)){B=m;break}bH()}}while(0);c[g+12>>2]=t;c[B>>2]=g}else{h=e;m=c[d+(b+24)>>2]|0;l=c[d+(b+12)>>2]|0;do{if((l|0)==(h|0)){i=d+(b+20)|0;p=c[i>>2]|0;if((p|0)==0){q=d+(b+16)|0;v=c[q>>2]|0;if((v|0)==0){C=0;break}else{D=v;E=q}}else{D=p;E=i}while(1){i=D+20|0;p=c[i>>2]|0;if((p|0)!=0){D=p;E=i;continue}i=D+16|0;p=c[i>>2]|0;if((p|0)==0){break}else{D=p;E=i}}if(E>>>0<a>>>0){bH()}else{c[E>>2]=0;C=D;break}}else{i=c[d+(b+8)>>2]|0;if(i>>>0<a>>>0){bH()}p=i+12|0;if((c[p>>2]|0)!=(h|0)){bH()}q=l+8|0;if((c[q>>2]|0)==(h|0)){c[p>>2]=l;c[q>>2]=i;C=l;break}else{bH()}}}while(0);if((m|0)==0){break}l=d+(b+28)|0;g=16240+(c[l>>2]<<2)|0;do{if((h|0)==(c[g>>2]|0)){c[g>>2]=C;if((C|0)!=0){break}c[3985]=c[3985]&~(1<<c[l>>2]);break L2854}else{if(m>>>0<(c[3988]|0)>>>0){bH()}t=m+16|0;if((c[t>>2]|0)==(h|0)){c[t>>2]=C}else{c[m+20>>2]=C}if((C|0)==0){break L2854}}}while(0);if(C>>>0<(c[3988]|0)>>>0){bH()}c[C+24>>2]=m;h=c[d+(b+16)>>2]|0;do{if((h|0)!=0){if(h>>>0<(c[3988]|0)>>>0){bH()}else{c[C+16>>2]=h;c[h+24>>2]=C;break}}}while(0);h=c[d+(b+20)>>2]|0;if((h|0)==0){break}if(h>>>0<(c[3988]|0)>>>0){bH()}else{c[C+20>>2]=h;c[h+24>>2]=C;break}}}while(0);c[n+4>>2]=A|1;c[n+A>>2]=A;if((n|0)!=(c[3989]|0)){F=A;break}c[3986]=A;return}else{c[y>>2]=z&-2;c[n+4>>2]=o|1;c[n+o>>2]=o;F=o}}while(0);o=F>>>3;if(F>>>0<256){z=o<<1;y=15976+(z<<2)|0;C=c[3984]|0;b=1<<o;do{if((C&b|0)==0){c[3984]=C|b;G=y;H=15976+(z+2<<2)|0}else{o=15976+(z+2<<2)|0;d=c[o>>2]|0;if(d>>>0>=(c[3988]|0)>>>0){G=d;H=o;break}bH()}}while(0);c[H>>2]=n;c[G+12>>2]=n;c[n+8>>2]=G;c[n+12>>2]=y;return}y=n;G=F>>>8;do{if((G|0)==0){I=0}else{if(F>>>0>16777215){I=31;break}H=(G+1048320|0)>>>16&8;z=G<<H;b=(z+520192|0)>>>16&4;C=z<<b;z=(C+245760|0)>>>16&2;o=14-(b|H|z)+(C<<z>>>15)|0;I=F>>>((o+7|0)>>>0)&1|o<<1}}while(0);G=16240+(I<<2)|0;c[n+28>>2]=I;c[n+20>>2]=0;c[n+16>>2]=0;o=c[3985]|0;z=1<<I;if((o&z|0)==0){c[3985]=o|z;c[G>>2]=y;c[n+24>>2]=G;c[n+12>>2]=n;c[n+8>>2]=n;return}z=c[G>>2]|0;if((I|0)==31){J=0}else{J=25-(I>>>1)|0}L2948:do{if((c[z+4>>2]&-8|0)==(F|0)){K=z}else{I=z;G=F<<J;while(1){L=I+16+(G>>>31<<2)|0;o=c[L>>2]|0;if((o|0)==0){break}if((c[o+4>>2]&-8|0)==(F|0)){K=o;break L2948}else{I=o;G=G<<1}}if(L>>>0<(c[3988]|0)>>>0){bH()}c[L>>2]=y;c[n+24>>2]=I;c[n+12>>2]=n;c[n+8>>2]=n;return}}while(0);L=K+8|0;F=c[L>>2]|0;J=c[3988]|0;if(K>>>0<J>>>0){bH()}if(F>>>0<J>>>0){bH()}c[F+12>>2]=y;c[L>>2]=y;c[n+8>>2]=F;c[n+12>>2]=K;c[n+24>>2]=0;return}function lX(a){a=a|0;var b=0,d=0,e=0;b=(a|0)==0?1:a;while(1){d=lR(b)|0;if((d|0)!=0){e=2457;break}a=(I=c[4972]|0,c[4972]=I+0,I);if((a|0)==0){break}b5[a&3]()}if((e|0)==2457){return d|0}d=bO(4)|0;c[d>>2]=7168;bk(d|0,13888,34);return 0}function lY(a){a=a|0;return}function lZ(a){a=a|0;return 1360|0}function l_(a){a=a|0;if((a|0)!=0){lS(a)}return}function l$(a){a=a|0;l_(a);return}function l0(a){a=a|0;l_(a);return}function l1(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0.0,r=0,s=0,t=0,u=0,v=0.0,w=0,x=0,y=0,z=0.0,A=0.0,B=0,C=0,D=0,E=0.0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0.0,O=0,P=0,Q=0.0,R=0.0,S=0.0;e=b;while(1){f=e+1|0;if((aO(a[e]|0)|0)==0){break}else{e=f}}g=a[e]|0;if((g<<24>>24|0)==45){i=f;j=1}else if((g<<24>>24|0)==43){i=f;j=0}else{i=e;j=0}e=-1;f=0;g=i;while(1){k=a[g]|0;if(((k<<24>>24)-48|0)>>>0<10){l=e}else{if(k<<24>>24!=46|(e|0)>-1){break}else{l=f}}e=l;f=f+1|0;g=g+1|0}l=g+(-f|0)|0;i=(e|0)<0;m=((i^1)<<31>>31)+f|0;n=(m|0)>18;o=(n?-18:-m|0)+(i?f:e)|0;e=n?18:m;do{if((e|0)==0){p=b;q=0.0}else{if((e|0)>9){m=l;n=e;f=0;while(1){i=a[m]|0;r=m+1|0;if(i<<24>>24==46){s=a[r]|0;t=m+2|0}else{s=i;t=r}u=(f*10|0)-48+(s<<24>>24)|0;r=n-1|0;if((r|0)>9){m=t;n=r;f=u}else{break}}v=+(u|0)*1.0e9;w=9;x=t;y=2480}else{if((e|0)>0){v=0.0;w=e;x=l;y=2480}else{z=0.0;A=0.0}}if((y|0)==2480){f=x;n=w;m=0;while(1){r=a[f]|0;i=f+1|0;if(r<<24>>24==46){B=a[i]|0;C=f+2|0}else{B=r;C=i}D=(m*10|0)-48+(B<<24>>24)|0;i=n-1|0;if((i|0)>0){f=C;n=i;m=D}else{break}}z=+(D|0);A=v}E=A+z;do{if((k<<24>>24|0)==69|(k<<24>>24|0)==101){m=g+1|0;n=a[m]|0;if((n<<24>>24|0)==43){F=g+2|0;G=0}else if((n<<24>>24|0)==45){F=g+2|0;G=1}else{F=m;G=0}m=a[F]|0;if((m-48|0)>>>0<10){H=F;I=0;J=m}else{K=0;L=F;M=G;break}while(1){m=(I*10|0)-48+J|0;n=H+1|0;f=a[n]|0;if((f-48|0)>>>0<10){H=n;I=m;J=f}else{K=m;L=n;M=G;break}}}else{K=0;L=g;M=0}}while(0);n=o+((M|0)==0?K:-K|0)|0;m=(n|0)<0?-n|0:n;if((m|0)>511){c[(bw()|0)>>2]=34;N=1.0;O=8;P=511;y=2497}else{if((m|0)==0){Q=1.0}else{N=1.0;O=8;P=m;y=2497}}if((y|0)==2497){while(1){y=0;if((P&1|0)==0){R=N}else{R=N*+h[O>>3]}m=P>>1;if((m|0)==0){Q=R;break}else{N=R;O=O+8|0;P=m;y=2497}}}if((n|0)>-1){p=L;q=E*Q;break}else{p=L;q=E/Q;break}}}while(0);if((d|0)!=0){c[d>>2]=p}if((j|0)==0){S=q;return+S}S=-0.0-q;return+S}function l2(a,b,c){a=a|0;b=b|0;c=c|0;return+(+l1(a,b))}function l3(a){a=a|0;return lX(a)|0}function l4(){var a=0;a=bO(4)|0;c[a>>2]=7168;bk(a|0,13888,34)}function l5(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;f=b|0;if((b&3)==(d&3)){while(b&3){if((e|0)==0)return f|0;a[b]=a[d]|0;b=b+1|0;d=d+1|0;e=e-1|0}while((e|0)>=4){c[b>>2]=c[d>>2];b=b+4|0;d=d+4|0;e=e-4|0}}while((e|0)>0){a[b]=a[d]|0;b=b+1|0;d=d+1|0;e=e-1|0}return f|0}function l6(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;f=b+e|0;if((e|0)>=20){d=d&255;e=b&3;g=d|d<<8|d<<16|d<<24;h=f&~3;if(e){e=b+4-e|0;while((b|0)<(e|0)){a[b]=d;b=b+1|0}}while((b|0)<(h|0)){c[b>>2]=g;b=b+4|0}}while((b|0)<(f|0)){a[b]=d;b=b+1|0}}function l7(b){b=b|0;var c=0;c=b;while(a[c]|0){c=c+1|0}return c-b|0}function l8(b,c){b=b|0;c=c|0;var d=0;do{a[b+d|0]=a[c+d|0];d=d+1|0}while(a[c+(d-1)|0]|0);return b|0}function l9(b,c,d){b=b|0;c=c|0;d=d|0;if((c|0)<(b|0)&(b|0)<(c+d|0)){c=c+d|0;b=b+d|0;while((d|0)>0){b=b-1|0;c=c-1|0;d=d-1|0;a[b]=a[c]|0}}else{l5(b,c,d)|0}}function ma(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0;e=a+c>>>0;return(K=b+d+(e>>>0<a>>>0|0)>>>0,e|0)|0}function mb(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0;e=b-d>>>0;e=b-d-(c>>>0>a>>>0|0)>>>0;return(K=e,a-c>>>0|0)|0}function mc(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){K=b<<c|(a&(1<<c)-1<<32-c)>>>32-c;return a<<c}K=a<<c-32;return 0}function md(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){K=b>>>c;return a>>>c|(b&(1<<c)-1)<<32-c}K=0;return b>>>c-32|0}function me(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){K=b>>c;return a>>>c|(b&(1<<c)-1)<<32-c}K=(b|0)<0?-1:0;return b>>c-32|0}function mf(b){b=b|0;var c=0;c=a[n+(b>>>24)|0]|0;if((c|0)<8)return c|0;c=a[n+(b>>16&255)|0]|0;if((c|0)<8)return c+8|0;c=a[n+(b>>8&255)|0]|0;if((c|0)<8)return c+16|0;return(a[n+(b&255)|0]|0)+24|0}function mg(b){b=b|0;var c=0;c=a[m+(b&255)|0]|0;if((c|0)<8)return c|0;c=a[m+(b>>8&255)|0]|0;if((c|0)<8)return c+8|0;c=a[m+(b>>16&255)|0]|0;if((c|0)<8)return c+16|0;return(a[m+(b>>>24)|0]|0)+24|0}function mh(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0;c=a&65535;d=b&65535;e=ag(d,c)|0;f=a>>>16;a=(e>>>16)+(ag(d,f)|0)|0;d=b>>>16;b=ag(d,c)|0;return(K=(a>>>16)+(ag(d,f)|0)+(((a&65535)+b|0)>>>16)|0,a+b<<16|e&65535|0)|0}function mi(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,i=0;e=b>>31|((b|0)<0?-1:0)<<1;f=((b|0)<0?-1:0)>>31|((b|0)<0?-1:0)<<1;g=d>>31|((d|0)<0?-1:0)<<1;h=((d|0)<0?-1:0)>>31|((d|0)<0?-1:0)<<1;i=mb(e^a,f^b,e,f)|0;b=K;a=g^e;e=h^f;f=mb((mn(i,b,mb(g^c,h^d,g,h)|0,K,0)|0)^a,K^e,a,e)|0;return(K=K,f)|0}function mj(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0;f=i;i=i+8|0;g=f|0;h=b>>31|((b|0)<0?-1:0)<<1;j=((b|0)<0?-1:0)>>31|((b|0)<0?-1:0)<<1;k=e>>31|((e|0)<0?-1:0)<<1;l=((e|0)<0?-1:0)>>31|((e|0)<0?-1:0)<<1;m=mb(h^a,j^b,h,j)|0;b=K;a=mb(k^d,l^e,k,l)|0;mn(m,b,a,K,g)|0;a=mb(c[g>>2]^h,c[g+4>>2]^j,h,j)|0;j=K;i=f;return(K=j,a)|0}function mk(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0;e=a;a=c;c=mh(e,a)|0;f=K;return(K=(ag(b,a)|0)+(ag(d,e)|0)+f|f&0,c|0|0)|0}function ml(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0;e=mn(a,b,c,d,0)|0;return(K=K,e)|0}function mm(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0;f=i;i=i+8|0;g=f|0;mn(a,b,d,e,g)|0;i=f;return(K=c[g+4>>2]|0,c[g>>2]|0)|0}function mn(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,L=0,M=0;g=a;h=b;i=h;j=d;k=e;l=k;if((i|0)==0){m=(f|0)!=0;if((l|0)==0){if(m){c[f>>2]=(g>>>0)%(j>>>0);c[f+4>>2]=0}n=0;o=(g>>>0)/(j>>>0)>>>0;return(K=n,o)|0}else{if(!m){n=0;o=0;return(K=n,o)|0}c[f>>2]=a|0;c[f+4>>2]=b&0;n=0;o=0;return(K=n,o)|0}}m=(l|0)==0;do{if((j|0)==0){if(m){if((f|0)!=0){c[f>>2]=(i>>>0)%(j>>>0);c[f+4>>2]=0}n=0;o=(i>>>0)/(j>>>0)>>>0;return(K=n,o)|0}if((g|0)==0){if((f|0)!=0){c[f>>2]=0;c[f+4>>2]=(i>>>0)%(l>>>0)}n=0;o=(i>>>0)/(l>>>0)>>>0;return(K=n,o)|0}p=l-1|0;if((p&l|0)==0){if((f|0)!=0){c[f>>2]=a|0;c[f+4>>2]=p&i|b&0}n=0;o=i>>>((mg(l|0)|0)>>>0);return(K=n,o)|0}p=(mf(l|0)|0)-(mf(i|0)|0)|0;if(p>>>0<=30){q=p+1|0;r=31-p|0;s=q;t=i<<r|g>>>(q>>>0);u=i>>>(q>>>0);v=0;w=g<<r;break}if((f|0)==0){n=0;o=0;return(K=n,o)|0}c[f>>2]=a|0;c[f+4>>2]=h|b&0;n=0;o=0;return(K=n,o)|0}else{if(!m){r=(mf(l|0)|0)-(mf(i|0)|0)|0;if(r>>>0<=31){q=r+1|0;p=31-r|0;x=r-31>>31;s=q;t=g>>>(q>>>0)&x|i<<p;u=i>>>(q>>>0)&x;v=0;w=g<<p;break}if((f|0)==0){n=0;o=0;return(K=n,o)|0}c[f>>2]=a|0;c[f+4>>2]=h|b&0;n=0;o=0;return(K=n,o)|0}p=j-1|0;if((p&j|0)!=0){x=(mf(j|0)|0)+33-(mf(i|0)|0)|0;q=64-x|0;r=32-x|0;y=r>>31;z=x-32|0;A=z>>31;s=x;t=r-1>>31&i>>>(z>>>0)|(i<<r|g>>>(x>>>0))&A;u=A&i>>>(x>>>0);v=g<<q&y;w=(i<<q|g>>>(z>>>0))&y|g<<r&x-33>>31;break}if((f|0)!=0){c[f>>2]=p&g;c[f+4>>2]=0}if((j|0)==1){n=h|b&0;o=a|0|0;return(K=n,o)|0}else{p=mg(j|0)|0;n=i>>>(p>>>0)|0;o=i<<32-p|g>>>(p>>>0)|0;return(K=n,o)|0}}}while(0);if((s|0)==0){B=w;C=v;D=u;E=t;F=0;G=0}else{g=d|0|0;d=k|e&0;e=ma(g,d,-1,-1)|0;k=K;i=w;w=v;v=u;u=t;t=s;s=0;while(1){H=w>>>31|i<<1;I=s|w<<1;j=u<<1|i>>>31|0;a=u>>>31|v<<1|0;mb(e,k,j,a)|0;b=K;h=b>>31|((b|0)<0?-1:0)<<1;J=h&1;L=mb(j,a,h&g,(((b|0)<0?-1:0)>>31|((b|0)<0?-1:0)<<1)&d)|0;M=K;b=t-1|0;if((b|0)==0){break}else{i=H;w=I;v=M;u=L;t=b;s=J}}B=H;C=I;D=M;E=L;F=0;G=J}J=C;C=0;if((f|0)!=0){c[f>>2]=E;c[f+4>>2]=D}n=(J|0)>>>31|(B|C)<<1|(C<<1|J>>>31)&0|F;o=(J<<1|0>>>31)&-2|G;return(K=n,o)|0}function mo(){bP()}function mp(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;bW[a&7](b|0,c|0,d|0,e|0,f|0)}function mq(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;bX[a&127](b|0,c|0,d|0,e|0,f|0,g|0,h|0)}function mr(a,b){a=a|0;b=b|0;bY[a&511](b|0)}function ms(a,b,c){a=a|0;b=b|0;c=c|0;bZ[a&127](b|0,c|0)}function mt(a,b,c){a=a|0;b=b|0;c=c|0;return b_[a&63](b|0,c|0)|0}function mu(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return b$[a&31](b|0,c|0,d|0,e|0,f|0)|0}function mv(a,b){a=a|0;b=b|0;return b0[a&255](b|0)|0}function mw(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return b1[a&63](b|0,c|0,d|0)|0}function mx(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=+g;b2[a&15](b|0,c|0,d|0,e|0,f|0,+g)}function my(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;b3[a&7](b|0,c|0,d|0)}function mz(a,b,c,d,e,f,g,h,i){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;b4[a&15](b|0,c|0,d|0,e|0,f|0,g|0,h|0,i|0)}function mA(a){a=a|0;b5[a&3]()}function mB(a,b,c,d,e,f,g,h,i){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;return b6[a&31](b|0,c|0,d|0,e|0,f|0,g|0,h|0,i|0)|0}function mC(a,b,c,d,e,f,g,h,i,j){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;b7[a&7](b|0,c|0,d|0,e|0,f|0,g|0,h|0,i|0,j|0)}function mD(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=+h;b8[a&7](b|0,c|0,d|0,e|0,f|0,g|0,+h)}function mE(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;b9[a&31](b|0,c|0,d|0,e|0,f|0,g|0)}function mF(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ca[a&15](b|0,c|0,d|0,e|0)|0}function mG(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;cb[a&15](b|0,c|0,d|0,e|0)}function mH(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;ah(0)}function mI(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;ah(1)}function mJ(a){a=a|0;ah(2)}function mK(a,b){a=a|0;b=b|0;ah(3)}function mL(a,b){a=a|0;b=b|0;ah(4);return 0}function mM(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;ah(5);return 0}function mN(a){a=a|0;ah(6);return 0}function mO(a,b,c){a=a|0;b=b|0;c=c|0;ah(7);return 0}function mP(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=+f;ah(8)}function mQ(a,b,c){a=a|0;b=b|0;c=c|0;ah(9)}function mR(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;ah(10)}function mS(){ah(11)}function mT(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;ah(12);return 0}function mU(a,b,c,d,e,f,g,h,i){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;ah(13)}function mV(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=+g;ah(14)}function mW(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;ah(15)}function mX(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;ah(16);return 0}function mY(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;ah(17)}
// EMSCRIPTEN_END_FUNCS
var bW=[mH,mH,lO,mH,lL,mH,lN,mH];var bX=[mI,mI,hO,mI,hX,mI,h_,mI,jq,mI,hB,mI,hz,mI,jj,mI,hJ,mI,hN,mI,h$,mI,hl,mI,hf,mI,hM,mI,g4,mI,hY,mI,hj,mI,g6,mI,g1,mI,g2,mI,gX,mI,g5,mI,g$,mI,gZ,mI,hb,mI,ha,mI,g8,mI,h0,mI,gK,mI,hK,mI,gO,mI,gG,mI,gI,mI,gM,mI,gD,mI,gU,mI,gT,mI,gQ,mI,gA,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI,mI];var bY=[mJ,mJ,d2,mJ,gx,mJ,jt,mJ,ht,mJ,eT,mJ,fE,mJ,dL,mJ,jM,mJ,eD,mJ,ia,mJ,hc,mJ,eN,mJ,eS,mJ,gV,mJ,gm,mJ,gi,mJ,lY,mJ,eO,mJ,jX,mJ,j_,mJ,hW,mJ,gW,mJ,lz,mJ,gc,mJ,dT,mJ,jd,mJ,jo,mJ,ea,mJ,jY,mJ,dV,mJ,dj,mJ,f1,mJ,gy,mJ,iL,mJ,jT,mJ,kQ,mJ,j0,mJ,lt,mJ,kP,mJ,gg,mJ,eg,mJ,eS,mJ,gq,mJ,dK,mJ,iA,mJ,dh,mJ,kS,mJ,jZ,mJ,lS,mJ,jh,mJ,kO,mJ,f4,mJ,ef,mJ,dS,mJ,dR,mJ,gp,mJ,eO,mJ,lb,mJ,hd,mJ,eo,mJ,iM,mJ,d1,mJ,f0,mJ,ga,mJ,h8,mJ,hV,mJ,gj,mJ,iF,mJ,l0,mJ,fD,mJ,df,mJ,ld,mJ,le,mJ,gd,mJ,fL,mJ,lF,mJ,d3,mJ,kf,mJ,kh,mJ,lr,mJ,f2,mJ,c7,mJ,dM,mJ,gh,mJ,iX,mJ,em,mJ,iR,mJ,ge,mJ,lh,mJ,lu,mJ,ky,mJ,ex,mJ,d_,mJ,jS,mJ,dU,mJ,jW,mJ,h9,mJ,i2,mJ,lC,mJ,kN,mJ,iq,mJ,ji,mJ,lf,mJ,iz,mJ,hs,mJ,gl,mJ,ey,mJ,dN,mJ,gn,mJ,f6,mJ,eZ,mJ,jc,mJ,dg,mJ,i1,mJ,dA,mJ,kR,mJ,c8,mJ,e4,mJ,dO,mJ,eU,mJ,lr,mJ,lG,mJ,f9,mJ,e_,mJ,f$,mJ,dz,mJ,gb,mJ,jn,mJ,fU,mJ,f8,mJ,dP,mJ,eE,mJ,j1,mJ,gk,mJ,iS,mJ,hH,mJ,iG,mJ,jy,mJ,dB,mJ,f5,mJ,dQ,mJ,fK,mJ,f7,mJ,de,mJ,c9,mJ,lc,mJ,hI,mJ,lE,mJ,ju,mJ,d9,mJ,lD,mJ,ib,mJ,dy,mJ,di,mJ,iY,mJ,e$,mJ,j$,mJ,eR,mJ,f3,mJ,li,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ,mJ];var bZ=[mK,mK,kX,mK,eb,mK,iV,mK,kU,mK,iw,mK,iJ,mK,kT,mK,js,mK,iO,mK,iE,mK,ix,mK,iQ,mK,iD,mK,iB,mK,iW,mK,jV,mK,iu,mK,ez,mK,iy,mK,kW,mK,iT,mK,iI,mK,eQ,mK,iH,mK,kY,mK,iv,mK,iK,mK,kV,mK,it,mK,fg,mK,eF,mK,eh,mK,jw,mK,iN,mK,is,mK,ir,mK,iC,mK,fn,mK,iP,mK,iU,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK,mK];var b_=[mL,mL,kb,mL,eI,mL,d$,mL,jI,mL,jB,mL,ev,mL,eB,mL,j7,mL,dc,mL,da,mL,dI,mL,kd,mL,dG,mL,dC,mL,fV,mL,j9,mL,fm,mL,dE,mL,fl,mL,ed,mL,fs,mL,mL,mL,mL,mL,mL,mL,mL,mL,mL,mL,mL,mL,mL,mL,mL,mL,mL,mL,mL,mL];var b$=[mM,mM,kp,mM,kn,mM,kM,mM,jE,mM,jO,mM,kx,mM,jQ,mM,fZ,mM,jL,mM,kl,mM,fX,mM,kA,mM,mM,mM,mM,mM,mM,mM];var b0=[mN,mN,la,mN,ik,mN,dJ,mN,fk,mN,k0,mN,im,mN,fI,mN,k8,mN,ig,mN,km,mN,ks,mN,hG,mN,k_,mN,eH,mN,fP,mN,fr,mN,k4,mN,k2,mN,kB,mN,ls,mN,er,mN,kK,mN,kH,mN,k3,mN,kr,mN,kI,mN,dH,mN,fi,mN,ip,mN,k5,mN,eG,mN,ec,mN,ih,mN,kg,mN,k9,mN,kD,mN,db,mN,kZ,mN,ei,mN,kC,mN,ko,mN,fW,mN,ie,mN,ej,mN,dF,mN,kJ,mN,fj,mN,fp,mN,eA,mN,ii,mN,jH,mN,jG,mN,lZ,mN,fq,mN,ic,mN,k$,mN,jF,mN,id,mN,eq,mN,dd,mN,ij,mN,il,mN,k1,mN,io,mN,hU,mN,k7,mN,kq,mN,k6,mN,dD,mN,d0,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN,mN];var b1=[mO,mO,fY,mO,kc,mO,ka,mO,lH,mO,jJ,mO,gv,mO,eV,mO,fJ,mO,fH,mO,j3,mO,fo,mO,jv,mO,jK,mO,j8,mO,fO,mO,eu,mO,ke,mO,jp,mO,fh,mO,f_,mO,mO,mO,mO,mO,mO,mO,mO,mO,mO,mO,mO,mO,mO,mO,mO,mO,mO,mO,mO,mO,mO,mO];var b2=[mP,mP,hE,mP,hC,mP,hq,mP,hn,mP,mP,mP,mP,mP,mP,mP];var b3=[mQ,mQ,et,mQ,gf,mQ,mQ,mQ];var b4=[mR,mR,h7,mR,h6,mR,i_,mR,i6,mR,i4,mR,i9,mR,mR,mR];var b5=[mS,mS,mo,mS];var b6=[mT,mT,jC,mT,kk,mT,kw,mT,jD,mT,kz,mT,kL,mT,kj,mT,ki,mT,mT,mT,mT,mT,mT,mT,mT,mT,mT,mT,mT,mT,mT,mT];var b7=[mU,mU,h2,mU,hQ,mU,mU,mU];var b8=[mV,mV,jk,mV,je,mV,mV,mV];var b9=[mW,mW,lP,mW,hA,mW,hu,mW,hw,mW,lQ,mW,hF,mW,jr,mW,fv,mW,hv,mW,hg,mW,hk,mW,he,mW,lM,mW,ft,mW,jx,mW];var ca=[mX,mX,j4,mX,j5,mX,jP,mX,jN,mX,j6,mX,mX,mX,mX,mX];var cb=[mY,mY,lI,mY,lJ,mY,fu,mY,lA,mY,fw,mY,gw,mY,go,mY];return{_get_vectors:cv,_strlen:l7,__GLOBAL__I_a:eK,_free:lS,_get_frame:cB,_realloc:lT,_memmove:l9,_get_flow_colors:cz,_memset:l6,_malloc:lR,_memcpy:l5,_set_threshold:ct,_strcpy:l8,_get_points:cu,runPostSets:cs,stackAlloc:cc,stackSave:cd,stackRestore:ce,setThrew:cf,setTempRet0:ci,setTempRet1:cj,setTempRet2:ck,setTempRet3:cl,setTempRet4:cm,setTempRet5:cn,setTempRet6:co,setTempRet7:cp,setTempRet8:cq,setTempRet9:cr,dynCall_viiiii:mp,dynCall_viiiiiii:mq,dynCall_vi:mr,dynCall_vii:ms,dynCall_iii:mt,dynCall_iiiiii:mu,dynCall_ii:mv,dynCall_iiii:mw,dynCall_viiiiif:mx,dynCall_viii:my,dynCall_viiiiiiii:mz,dynCall_v:mA,dynCall_iiiiiiiii:mB,dynCall_viiiiiiiii:mC,dynCall_viiiiiif:mD,dynCall_viiiiii:mE,dynCall_iiiii:mF,dynCall_viiii:mG}})
// EMSCRIPTEN_END_ASM
({ "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array }, { "abort": abort, "assert": assert, "asmPrintInt": asmPrintInt, "asmPrintFloat": asmPrintFloat, "min": Math_min, "invoke_viiiii": invoke_viiiii, "invoke_viiiiiii": invoke_viiiiiii, "invoke_vi": invoke_vi, "invoke_vii": invoke_vii, "invoke_iii": invoke_iii, "invoke_iiiiii": invoke_iiiiii, "invoke_ii": invoke_ii, "invoke_iiii": invoke_iiii, "invoke_viiiiif": invoke_viiiiif, "invoke_viii": invoke_viii, "invoke_viiiiiiii": invoke_viiiiiiii, "invoke_v": invoke_v, "invoke_iiiiiiiii": invoke_iiiiiiiii, "invoke_viiiiiiiii": invoke_viiiiiiiii, "invoke_viiiiiif": invoke_viiiiiif, "invoke_viiiiii": invoke_viiiiii, "invoke_iiiii": invoke_iiiii, "invoke_viiii": invoke_viiii, "_llvm_lifetime_end": _llvm_lifetime_end, "__scanString": __scanString, "_pthread_mutex_lock": _pthread_mutex_lock, "___cxa_end_catch": ___cxa_end_catch, "_strtoull": _strtoull, "__isFloat": __isFloat, "_fflush": _fflush, "__isLeapYear": __isLeapYear, "_fwrite": _fwrite, "_send": _send, "_isspace": _isspace, "_read": _read, "___cxa_guard_abort": ___cxa_guard_abort, "_newlocale": _newlocale, "___gxx_personality_v0": ___gxx_personality_v0, "_pthread_cond_wait": _pthread_cond_wait, "___cxa_rethrow": ___cxa_rethrow, "___resumeException": ___resumeException, "_llvm_va_end": _llvm_va_end, "_vsscanf": _vsscanf, "_snprintf": _snprintf, "_fgetc": _fgetc, "_atexit": _atexit, "___cxa_free_exception": ___cxa_free_exception, "__Z8catcloseP8_nl_catd": __Z8catcloseP8_nl_catd, "___setErrNo": ___setErrNo, "_isxdigit": _isxdigit, "_exit": _exit, "_sprintf": _sprintf, "___ctype_b_loc": ___ctype_b_loc, "_freelocale": _freelocale, "__Z7catopenPKci": __Z7catopenPKci, "_asprintf": _asprintf, "___cxa_is_number_type": ___cxa_is_number_type, "___cxa_does_inherit": ___cxa_does_inherit, "___cxa_guard_acquire": ___cxa_guard_acquire, "___locale_mb_cur_max": ___locale_mb_cur_max, "___cxa_begin_catch": ___cxa_begin_catch, "_recv": _recv, "__parseInt64": __parseInt64, "__ZSt18uncaught_exceptionv": __ZSt18uncaught_exceptionv, "___cxa_call_unexpected": ___cxa_call_unexpected, "__exit": __exit, "_strftime": _strftime, "___cxa_throw": ___cxa_throw, "_llvm_eh_exception": _llvm_eh_exception, "_pread": _pread, "_sqrtf": _sqrtf, "__arraySum": __arraySum, "_sysconf": _sysconf, "___cxa_find_matching_catch": ___cxa_find_matching_catch, "__formatString": __formatString, "_pthread_cond_broadcast": _pthread_cond_broadcast, "__ZSt9terminatev": __ZSt9terminatev, "_pthread_mutex_unlock": _pthread_mutex_unlock, "_sbrk": _sbrk, "___errno_location": ___errno_location, "_strerror": _strerror, "_llvm_lifetime_start": _llvm_lifetime_start, "___cxa_guard_release": ___cxa_guard_release, "_ungetc": _ungetc, "_vsprintf": _vsprintf, "_uselocale": _uselocale, "_vsnprintf": _vsnprintf, "_sscanf": _sscanf, "___assert_fail": ___assert_fail, "_fread": _fread, "_abort": _abort, "_isdigit": _isdigit, "_strtoll": _strtoll, "__addDays": __addDays, "__reallyNegative": __reallyNegative, "__Z7catgetsP8_nl_catdiiPKc": __Z7catgetsP8_nl_catdiiPKc, "_write": _write, "___cxa_allocate_exception": ___cxa_allocate_exception, "___cxa_pure_virtual": ___cxa_pure_virtual, "_vasprintf": _vasprintf, "___ctype_toupper_loc": ___ctype_toupper_loc, "___ctype_tolower_loc": ___ctype_tolower_loc, "_pwrite": _pwrite, "_strerror_r": _strerror_r, "_time": _time, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "cttz_i8": cttz_i8, "ctlz_i8": ctlz_i8, "NaN": NaN, "Infinity": Infinity, "_stdin": _stdin, "__ZTVN10__cxxabiv117__class_type_infoE": __ZTVN10__cxxabiv117__class_type_infoE, "__ZTVN10__cxxabiv120__si_class_type_infoE": __ZTVN10__cxxabiv120__si_class_type_infoE, "_stderr": _stderr, "_stdout": _stdout, "___fsmu8": ___fsmu8, "___dso_handle": ___dso_handle }, buffer);
var _get_vectors = Module["_get_vectors"] = asm["_get_vectors"];
var _strlen = Module["_strlen"] = asm["_strlen"];
var __GLOBAL__I_a = Module["__GLOBAL__I_a"] = asm["__GLOBAL__I_a"];
var _free = Module["_free"] = asm["_free"];
var _get_frame = Module["_get_frame"] = asm["_get_frame"];
var _realloc = Module["_realloc"] = asm["_realloc"];
var _memmove = Module["_memmove"] = asm["_memmove"];
var _get_flow_colors = Module["_get_flow_colors"] = asm["_get_flow_colors"];
var _memset = Module["_memset"] = asm["_memset"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _set_threshold = Module["_set_threshold"] = asm["_set_threshold"];
var _strcpy = Module["_strcpy"] = asm["_strcpy"];
var _get_points = Module["_get_points"] = asm["_get_points"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var dynCall_viiiii = Module["dynCall_viiiii"] = asm["dynCall_viiiii"];
var dynCall_viiiiiii = Module["dynCall_viiiiiii"] = asm["dynCall_viiiiiii"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
var dynCall_vii = Module["dynCall_vii"] = asm["dynCall_vii"];
var dynCall_iii = Module["dynCall_iii"] = asm["dynCall_iii"];
var dynCall_iiiiii = Module["dynCall_iiiiii"] = asm["dynCall_iiiiii"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_viiiiif = Module["dynCall_viiiiif"] = asm["dynCall_viiiiif"];
var dynCall_viii = Module["dynCall_viii"] = asm["dynCall_viii"];
var dynCall_viiiiiiii = Module["dynCall_viiiiiiii"] = asm["dynCall_viiiiiiii"];
var dynCall_v = Module["dynCall_v"] = asm["dynCall_v"];
var dynCall_iiiiiiiii = Module["dynCall_iiiiiiiii"] = asm["dynCall_iiiiiiiii"];
var dynCall_viiiiiiiii = Module["dynCall_viiiiiiiii"] = asm["dynCall_viiiiiiiii"];
var dynCall_viiiiiif = Module["dynCall_viiiiiif"] = asm["dynCall_viiiiiif"];
var dynCall_viiiiii = Module["dynCall_viiiiii"] = asm["dynCall_viiiiii"];
var dynCall_iiiii = Module["dynCall_iiiii"] = asm["dynCall_iiiii"];
var dynCall_viiii = Module["dynCall_viiii"] = asm["dynCall_viiii"];
Runtime.stackAlloc = function(size) { return asm['stackAlloc'](size) };
Runtime.stackSave = function() { return asm['stackSave']() };
Runtime.stackRestore = function(top) { asm['stackRestore'](top) };
// TODO: strip out parts of this we do not need
//======= begin closure i64 code =======
// Copyright 2009 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * @fileoverview Defines a Long class for representing a 64-bit two's-complement
 * integer value, which faithfully simulates the behavior of a Java "long". This
 * implementation is derived from LongLib in GWT.
 *
 */
var i64Math = (function() { // Emscripten wrapper
  var goog = { math: {} };
  /**
   * Constructs a 64-bit two's-complement integer, given its low and high 32-bit
   * values as *signed* integers.  See the from* functions below for more
   * convenient ways of constructing Longs.
   *
   * The internal representation of a long is the two given signed, 32-bit values.
   * We use 32-bit pieces because these are the size of integers on which
   * Javascript performs bit-operations.  For operations like addition and
   * multiplication, we split each number into 16-bit pieces, which can easily be
   * multiplied within Javascript's floating-point representation without overflow
   * or change in sign.
   *
   * In the algorithms below, we frequently reduce the negative case to the
   * positive case by negating the input(s) and then post-processing the result.
   * Note that we must ALWAYS check specially whether those values are MIN_VALUE
   * (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
   * a positive number, it overflows back into a negative).  Not handling this
   * case would often result in infinite recursion.
   *
   * @param {number} low  The low (signed) 32 bits of the long.
   * @param {number} high  The high (signed) 32 bits of the long.
   * @constructor
   */
  goog.math.Long = function(low, high) {
    /**
     * @type {number}
     * @private
     */
    this.low_ = low | 0;  // force into 32 signed bits.
    /**
     * @type {number}
     * @private
     */
    this.high_ = high | 0;  // force into 32 signed bits.
  };
  // NOTE: Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the
  // from* methods on which they depend.
  /**
   * A cache of the Long representations of small integer values.
   * @type {!Object}
   * @private
   */
  goog.math.Long.IntCache_ = {};
  /**
   * Returns a Long representing the given (32-bit) integer value.
   * @param {number} value The 32-bit integer in question.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromInt = function(value) {
    if (-128 <= value && value < 128) {
      var cachedObj = goog.math.Long.IntCache_[value];
      if (cachedObj) {
        return cachedObj;
      }
    }
    var obj = new goog.math.Long(value | 0, value < 0 ? -1 : 0);
    if (-128 <= value && value < 128) {
      goog.math.Long.IntCache_[value] = obj;
    }
    return obj;
  };
  /**
   * Returns a Long representing the given value, provided that it is a finite
   * number.  Otherwise, zero is returned.
   * @param {number} value The number in question.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromNumber = function(value) {
    if (isNaN(value) || !isFinite(value)) {
      return goog.math.Long.ZERO;
    } else if (value <= -goog.math.Long.TWO_PWR_63_DBL_) {
      return goog.math.Long.MIN_VALUE;
    } else if (value + 1 >= goog.math.Long.TWO_PWR_63_DBL_) {
      return goog.math.Long.MAX_VALUE;
    } else if (value < 0) {
      return goog.math.Long.fromNumber(-value).negate();
    } else {
      return new goog.math.Long(
          (value % goog.math.Long.TWO_PWR_32_DBL_) | 0,
          (value / goog.math.Long.TWO_PWR_32_DBL_) | 0);
    }
  };
  /**
   * Returns a Long representing the 64-bit integer that comes by concatenating
   * the given high and low bits.  Each is assumed to use 32 bits.
   * @param {number} lowBits The low 32-bits.
   * @param {number} highBits The high 32-bits.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromBits = function(lowBits, highBits) {
    return new goog.math.Long(lowBits, highBits);
  };
  /**
   * Returns a Long representation of the given string, written using the given
   * radix.
   * @param {string} str The textual representation of the Long.
   * @param {number=} opt_radix The radix in which the text is written.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromString = function(str, opt_radix) {
    if (str.length == 0) {
      throw Error('number format error: empty string');
    }
    var radix = opt_radix || 10;
    if (radix < 2 || 36 < radix) {
      throw Error('radix out of range: ' + radix);
    }
    if (str.charAt(0) == '-') {
      return goog.math.Long.fromString(str.substring(1), radix).negate();
    } else if (str.indexOf('-') >= 0) {
      throw Error('number format error: interior "-" character: ' + str);
    }
    // Do several (8) digits each time through the loop, so as to
    // minimize the calls to the very expensive emulated div.
    var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 8));
    var result = goog.math.Long.ZERO;
    for (var i = 0; i < str.length; i += 8) {
      var size = Math.min(8, str.length - i);
      var value = parseInt(str.substring(i, i + size), radix);
      if (size < 8) {
        var power = goog.math.Long.fromNumber(Math.pow(radix, size));
        result = result.multiply(power).add(goog.math.Long.fromNumber(value));
      } else {
        result = result.multiply(radixToPower);
        result = result.add(goog.math.Long.fromNumber(value));
      }
    }
    return result;
  };
  // NOTE: the compiler should inline these constant values below and then remove
  // these variables, so there should be no runtime penalty for these.
  /**
   * Number used repeated below in calculations.  This must appear before the
   * first call to any from* function below.
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_16_DBL_ = 1 << 16;
  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_24_DBL_ = 1 << 24;
  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_32_DBL_ =
      goog.math.Long.TWO_PWR_16_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;
  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_31_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ / 2;
  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_48_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;
  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_64_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_32_DBL_;
  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_63_DBL_ =
      goog.math.Long.TWO_PWR_64_DBL_ / 2;
  /** @type {!goog.math.Long} */
  goog.math.Long.ZERO = goog.math.Long.fromInt(0);
  /** @type {!goog.math.Long} */
  goog.math.Long.ONE = goog.math.Long.fromInt(1);
  /** @type {!goog.math.Long} */
  goog.math.Long.NEG_ONE = goog.math.Long.fromInt(-1);
  /** @type {!goog.math.Long} */
  goog.math.Long.MAX_VALUE =
      goog.math.Long.fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0);
  /** @type {!goog.math.Long} */
  goog.math.Long.MIN_VALUE = goog.math.Long.fromBits(0, 0x80000000 | 0);
  /**
   * @type {!goog.math.Long}
   * @private
   */
  goog.math.Long.TWO_PWR_24_ = goog.math.Long.fromInt(1 << 24);
  /** @return {number} The value, assuming it is a 32-bit integer. */
  goog.math.Long.prototype.toInt = function() {
    return this.low_;
  };
  /** @return {number} The closest floating-point representation to this value. */
  goog.math.Long.prototype.toNumber = function() {
    return this.high_ * goog.math.Long.TWO_PWR_32_DBL_ +
           this.getLowBitsUnsigned();
  };
  /**
   * @param {number=} opt_radix The radix in which the text should be written.
   * @return {string} The textual representation of this value.
   */
  goog.math.Long.prototype.toString = function(opt_radix) {
    var radix = opt_radix || 10;
    if (radix < 2 || 36 < radix) {
      throw Error('radix out of range: ' + radix);
    }
    if (this.isZero()) {
      return '0';
    }
    if (this.isNegative()) {
      if (this.equals(goog.math.Long.MIN_VALUE)) {
        // We need to change the Long value before it can be negated, so we remove
        // the bottom-most digit in this base and then recurse to do the rest.
        var radixLong = goog.math.Long.fromNumber(radix);
        var div = this.div(radixLong);
        var rem = div.multiply(radixLong).subtract(this);
        return div.toString(radix) + rem.toInt().toString(radix);
      } else {
        return '-' + this.negate().toString(radix);
      }
    }
    // Do several (6) digits each time through the loop, so as to
    // minimize the calls to the very expensive emulated div.
    var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 6));
    var rem = this;
    var result = '';
    while (true) {
      var remDiv = rem.div(radixToPower);
      var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt();
      var digits = intval.toString(radix);
      rem = remDiv;
      if (rem.isZero()) {
        return digits + result;
      } else {
        while (digits.length < 6) {
          digits = '0' + digits;
        }
        result = '' + digits + result;
      }
    }
  };
  /** @return {number} The high 32-bits as a signed value. */
  goog.math.Long.prototype.getHighBits = function() {
    return this.high_;
  };
  /** @return {number} The low 32-bits as a signed value. */
  goog.math.Long.prototype.getLowBits = function() {
    return this.low_;
  };
  /** @return {number} The low 32-bits as an unsigned value. */
  goog.math.Long.prototype.getLowBitsUnsigned = function() {
    return (this.low_ >= 0) ?
        this.low_ : goog.math.Long.TWO_PWR_32_DBL_ + this.low_;
  };
  /**
   * @return {number} Returns the number of bits needed to represent the absolute
   *     value of this Long.
   */
  goog.math.Long.prototype.getNumBitsAbs = function() {
    if (this.isNegative()) {
      if (this.equals(goog.math.Long.MIN_VALUE)) {
        return 64;
      } else {
        return this.negate().getNumBitsAbs();
      }
    } else {
      var val = this.high_ != 0 ? this.high_ : this.low_;
      for (var bit = 31; bit > 0; bit--) {
        if ((val & (1 << bit)) != 0) {
          break;
        }
      }
      return this.high_ != 0 ? bit + 33 : bit + 1;
    }
  };
  /** @return {boolean} Whether this value is zero. */
  goog.math.Long.prototype.isZero = function() {
    return this.high_ == 0 && this.low_ == 0;
  };
  /** @return {boolean} Whether this value is negative. */
  goog.math.Long.prototype.isNegative = function() {
    return this.high_ < 0;
  };
  /** @return {boolean} Whether this value is odd. */
  goog.math.Long.prototype.isOdd = function() {
    return (this.low_ & 1) == 1;
  };
  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long equals the other.
   */
  goog.math.Long.prototype.equals = function(other) {
    return (this.high_ == other.high_) && (this.low_ == other.low_);
  };
  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long does not equal the other.
   */
  goog.math.Long.prototype.notEquals = function(other) {
    return (this.high_ != other.high_) || (this.low_ != other.low_);
  };
  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is less than the other.
   */
  goog.math.Long.prototype.lessThan = function(other) {
    return this.compare(other) < 0;
  };
  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is less than or equal to the other.
   */
  goog.math.Long.prototype.lessThanOrEqual = function(other) {
    return this.compare(other) <= 0;
  };
  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is greater than the other.
   */
  goog.math.Long.prototype.greaterThan = function(other) {
    return this.compare(other) > 0;
  };
  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is greater than or equal to the other.
   */
  goog.math.Long.prototype.greaterThanOrEqual = function(other) {
    return this.compare(other) >= 0;
  };
  /**
   * Compares this Long with the given one.
   * @param {goog.math.Long} other Long to compare against.
   * @return {number} 0 if they are the same, 1 if the this is greater, and -1
   *     if the given one is greater.
   */
  goog.math.Long.prototype.compare = function(other) {
    if (this.equals(other)) {
      return 0;
    }
    var thisNeg = this.isNegative();
    var otherNeg = other.isNegative();
    if (thisNeg && !otherNeg) {
      return -1;
    }
    if (!thisNeg && otherNeg) {
      return 1;
    }
    // at this point, the signs are the same, so subtraction will not overflow
    if (this.subtract(other).isNegative()) {
      return -1;
    } else {
      return 1;
    }
  };
  /** @return {!goog.math.Long} The negation of this value. */
  goog.math.Long.prototype.negate = function() {
    if (this.equals(goog.math.Long.MIN_VALUE)) {
      return goog.math.Long.MIN_VALUE;
    } else {
      return this.not().add(goog.math.Long.ONE);
    }
  };
  /**
   * Returns the sum of this and the given Long.
   * @param {goog.math.Long} other Long to add to this one.
   * @return {!goog.math.Long} The sum of this and the given Long.
   */
  goog.math.Long.prototype.add = function(other) {
    // Divide each number into 4 chunks of 16 bits, and then sum the chunks.
    var a48 = this.high_ >>> 16;
    var a32 = this.high_ & 0xFFFF;
    var a16 = this.low_ >>> 16;
    var a00 = this.low_ & 0xFFFF;
    var b48 = other.high_ >>> 16;
    var b32 = other.high_ & 0xFFFF;
    var b16 = other.low_ >>> 16;
    var b00 = other.low_ & 0xFFFF;
    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 + b00;
    c16 += c00 >>> 16;
    c00 &= 0xFFFF;
    c16 += a16 + b16;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c32 += a32 + b32;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c48 += a48 + b48;
    c48 &= 0xFFFF;
    return goog.math.Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
  };
  /**
   * Returns the difference of this and the given Long.
   * @param {goog.math.Long} other Long to subtract from this.
   * @return {!goog.math.Long} The difference of this and the given Long.
   */
  goog.math.Long.prototype.subtract = function(other) {
    return this.add(other.negate());
  };
  /**
   * Returns the product of this and the given long.
   * @param {goog.math.Long} other Long to multiply with this.
   * @return {!goog.math.Long} The product of this and the other.
   */
  goog.math.Long.prototype.multiply = function(other) {
    if (this.isZero()) {
      return goog.math.Long.ZERO;
    } else if (other.isZero()) {
      return goog.math.Long.ZERO;
    }
    if (this.equals(goog.math.Long.MIN_VALUE)) {
      return other.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    } else if (other.equals(goog.math.Long.MIN_VALUE)) {
      return this.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    }
    if (this.isNegative()) {
      if (other.isNegative()) {
        return this.negate().multiply(other.negate());
      } else {
        return this.negate().multiply(other).negate();
      }
    } else if (other.isNegative()) {
      return this.multiply(other.negate()).negate();
    }
    // If both longs are small, use float multiplication
    if (this.lessThan(goog.math.Long.TWO_PWR_24_) &&
        other.lessThan(goog.math.Long.TWO_PWR_24_)) {
      return goog.math.Long.fromNumber(this.toNumber() * other.toNumber());
    }
    // Divide each long into 4 chunks of 16 bits, and then add up 4x4 products.
    // We can skip products that would overflow.
    var a48 = this.high_ >>> 16;
    var a32 = this.high_ & 0xFFFF;
    var a16 = this.low_ >>> 16;
    var a00 = this.low_ & 0xFFFF;
    var b48 = other.high_ >>> 16;
    var b32 = other.high_ & 0xFFFF;
    var b16 = other.low_ >>> 16;
    var b00 = other.low_ & 0xFFFF;
    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 * b00;
    c16 += c00 >>> 16;
    c00 &= 0xFFFF;
    c16 += a16 * b00;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c16 += a00 * b16;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c32 += a32 * b00;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c32 += a16 * b16;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c32 += a00 * b32;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
    c48 &= 0xFFFF;
    return goog.math.Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
  };
  /**
   * Returns this Long divided by the given one.
   * @param {goog.math.Long} other Long by which to divide.
   * @return {!goog.math.Long} This Long divided by the given one.
   */
  goog.math.Long.prototype.div = function(other) {
    if (other.isZero()) {
      throw Error('division by zero');
    } else if (this.isZero()) {
      return goog.math.Long.ZERO;
    }
    if (this.equals(goog.math.Long.MIN_VALUE)) {
      if (other.equals(goog.math.Long.ONE) ||
          other.equals(goog.math.Long.NEG_ONE)) {
        return goog.math.Long.MIN_VALUE;  // recall that -MIN_VALUE == MIN_VALUE
      } else if (other.equals(goog.math.Long.MIN_VALUE)) {
        return goog.math.Long.ONE;
      } else {
        // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
        var halfThis = this.shiftRight(1);
        var approx = halfThis.div(other).shiftLeft(1);
        if (approx.equals(goog.math.Long.ZERO)) {
          return other.isNegative() ? goog.math.Long.ONE : goog.math.Long.NEG_ONE;
        } else {
          var rem = this.subtract(other.multiply(approx));
          var result = approx.add(rem.div(other));
          return result;
        }
      }
    } else if (other.equals(goog.math.Long.MIN_VALUE)) {
      return goog.math.Long.ZERO;
    }
    if (this.isNegative()) {
      if (other.isNegative()) {
        return this.negate().div(other.negate());
      } else {
        return this.negate().div(other).negate();
      }
    } else if (other.isNegative()) {
      return this.div(other.negate()).negate();
    }
    // Repeat the following until the remainder is less than other:  find a
    // floating-point that approximates remainder / other *from below*, add this
    // into the result, and subtract it from the remainder.  It is critical that
    // the approximate value is less than or equal to the real value so that the
    // remainder never becomes negative.
    var res = goog.math.Long.ZERO;
    var rem = this;
    while (rem.greaterThanOrEqual(other)) {
      // Approximate the result of division. This may be a little greater or
      // smaller than the actual value.
      var approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));
      // We will tweak the approximate result by changing it in the 48-th digit or
      // the smallest non-fractional digit, whichever is larger.
      var log2 = Math.ceil(Math.log(approx) / Math.LN2);
      var delta = (log2 <= 48) ? 1 : Math.pow(2, log2 - 48);
      // Decrease the approximation until it is smaller than the remainder.  Note
      // that if it is too large, the product overflows and is negative.
      var approxRes = goog.math.Long.fromNumber(approx);
      var approxRem = approxRes.multiply(other);
      while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
        approx -= delta;
        approxRes = goog.math.Long.fromNumber(approx);
        approxRem = approxRes.multiply(other);
      }
      // We know the answer can't be zero... and actually, zero would cause
      // infinite recursion since we would make no progress.
      if (approxRes.isZero()) {
        approxRes = goog.math.Long.ONE;
      }
      res = res.add(approxRes);
      rem = rem.subtract(approxRem);
    }
    return res;
  };
  /**
   * Returns this Long modulo the given one.
   * @param {goog.math.Long} other Long by which to mod.
   * @return {!goog.math.Long} This Long modulo the given one.
   */
  goog.math.Long.prototype.modulo = function(other) {
    return this.subtract(this.div(other).multiply(other));
  };
  /** @return {!goog.math.Long} The bitwise-NOT of this value. */
  goog.math.Long.prototype.not = function() {
    return goog.math.Long.fromBits(~this.low_, ~this.high_);
  };
  /**
   * Returns the bitwise-AND of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to AND.
   * @return {!goog.math.Long} The bitwise-AND of this and the other.
   */
  goog.math.Long.prototype.and = function(other) {
    return goog.math.Long.fromBits(this.low_ & other.low_,
                                   this.high_ & other.high_);
  };
  /**
   * Returns the bitwise-OR of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to OR.
   * @return {!goog.math.Long} The bitwise-OR of this and the other.
   */
  goog.math.Long.prototype.or = function(other) {
    return goog.math.Long.fromBits(this.low_ | other.low_,
                                   this.high_ | other.high_);
  };
  /**
   * Returns the bitwise-XOR of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to XOR.
   * @return {!goog.math.Long} The bitwise-XOR of this and the other.
   */
  goog.math.Long.prototype.xor = function(other) {
    return goog.math.Long.fromBits(this.low_ ^ other.low_,
                                   this.high_ ^ other.high_);
  };
  /**
   * Returns this Long with bits shifted to the left by the given amount.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the left by the given amount.
   */
  goog.math.Long.prototype.shiftLeft = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var low = this.low_;
      if (numBits < 32) {
        var high = this.high_;
        return goog.math.Long.fromBits(
            low << numBits,
            (high << numBits) | (low >>> (32 - numBits)));
      } else {
        return goog.math.Long.fromBits(0, low << (numBits - 32));
      }
    }
  };
  /**
   * Returns this Long with bits shifted to the right by the given amount.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the right by the given amount.
   */
  goog.math.Long.prototype.shiftRight = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var high = this.high_;
      if (numBits < 32) {
        var low = this.low_;
        return goog.math.Long.fromBits(
            (low >>> numBits) | (high << (32 - numBits)),
            high >> numBits);
      } else {
        return goog.math.Long.fromBits(
            high >> (numBits - 32),
            high >= 0 ? 0 : -1);
      }
    }
  };
  /**
   * Returns this Long with bits shifted to the right by the given amount, with
   * the new top bits matching the current sign bit.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the right by the given amount, with
   *     zeros placed into the new leading bits.
   */
  goog.math.Long.prototype.shiftRightUnsigned = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var high = this.high_;
      if (numBits < 32) {
        var low = this.low_;
        return goog.math.Long.fromBits(
            (low >>> numBits) | (high << (32 - numBits)),
            high >>> numBits);
      } else if (numBits == 32) {
        return goog.math.Long.fromBits(high, 0);
      } else {
        return goog.math.Long.fromBits(high >>> (numBits - 32), 0);
      }
    }
  };
  //======= begin jsbn =======
  var navigator = { appName: 'Modern Browser' }; // polyfill a little
  // Copyright (c) 2005  Tom Wu
  // All Rights Reserved.
  // http://www-cs-students.stanford.edu/~tjw/jsbn/
  /*
   * Copyright (c) 2003-2005  Tom Wu
   * All Rights Reserved.
   *
   * Permission is hereby granted, free of charge, to any person obtaining
   * a copy of this software and associated documentation files (the
   * "Software"), to deal in the Software without restriction, including
   * without limitation the rights to use, copy, modify, merge, publish,
   * distribute, sublicense, and/or sell copies of the Software, and to
   * permit persons to whom the Software is furnished to do so, subject to
   * the following conditions:
   *
   * The above copyright notice and this permission notice shall be
   * included in all copies or substantial portions of the Software.
   *
   * THE SOFTWARE IS PROVIDED "AS-IS" AND WITHOUT WARRANTY OF ANY KIND, 
   * EXPRESS, IMPLIED OR OTHERWISE, INCLUDING WITHOUT LIMITATION, ANY 
   * WARRANTY OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.  
   *
   * IN NO EVENT SHALL TOM WU BE LIABLE FOR ANY SPECIAL, INCIDENTAL,
   * INDIRECT OR CONSEQUENTIAL DAMAGES OF ANY KIND, OR ANY DAMAGES WHATSOEVER
   * RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER OR NOT ADVISED OF
   * THE POSSIBILITY OF DAMAGE, AND ON ANY THEORY OF LIABILITY, ARISING OUT
   * OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
   *
   * In addition, the following condition applies:
   *
   * All redistributions must retain an intact copy of this copyright notice
   * and disclaimer.
   */
  // Basic JavaScript BN library - subset useful for RSA encryption.
  // Bits per digit
  var dbits;
  // JavaScript engine analysis
  var canary = 0xdeadbeefcafe;
  var j_lm = ((canary&0xffffff)==0xefcafe);
  // (public) Constructor
  function BigInteger(a,b,c) {
    if(a != null)
      if("number" == typeof a) this.fromNumber(a,b,c);
      else if(b == null && "string" != typeof a) this.fromString(a,256);
      else this.fromString(a,b);
  }
  // return new, unset BigInteger
  function nbi() { return new BigInteger(null); }
  // am: Compute w_j += (x*this_i), propagate carries,
  // c is initial carry, returns final carry.
  // c < 3*dvalue, x < 2*dvalue, this_i < dvalue
  // We need to select the fastest one that works in this environment.
  // am1: use a single mult and divide to get the high bits,
  // max digit bits should be 26 because
  // max internal value = 2*dvalue^2-2*dvalue (< 2^53)
  function am1(i,x,w,j,c,n) {
    while(--n >= 0) {
      var v = x*this[i++]+w[j]+c;
      c = Math.floor(v/0x4000000);
      w[j++] = v&0x3ffffff;
    }
    return c;
  }
  // am2 avoids a big mult-and-extract completely.
  // Max digit bits should be <= 30 because we do bitwise ops
  // on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)
  function am2(i,x,w,j,c,n) {
    var xl = x&0x7fff, xh = x>>15;
    while(--n >= 0) {
      var l = this[i]&0x7fff;
      var h = this[i++]>>15;
      var m = xh*l+h*xl;
      l = xl*l+((m&0x7fff)<<15)+w[j]+(c&0x3fffffff);
      c = (l>>>30)+(m>>>15)+xh*h+(c>>>30);
      w[j++] = l&0x3fffffff;
    }
    return c;
  }
  // Alternately, set max digit bits to 28 since some
  // browsers slow down when dealing with 32-bit numbers.
  function am3(i,x,w,j,c,n) {
    var xl = x&0x3fff, xh = x>>14;
    while(--n >= 0) {
      var l = this[i]&0x3fff;
      var h = this[i++]>>14;
      var m = xh*l+h*xl;
      l = xl*l+((m&0x3fff)<<14)+w[j]+c;
      c = (l>>28)+(m>>14)+xh*h;
      w[j++] = l&0xfffffff;
    }
    return c;
  }
  if(j_lm && (navigator.appName == "Microsoft Internet Explorer")) {
    BigInteger.prototype.am = am2;
    dbits = 30;
  }
  else if(j_lm && (navigator.appName != "Netscape")) {
    BigInteger.prototype.am = am1;
    dbits = 26;
  }
  else { // Mozilla/Netscape seems to prefer am3
    BigInteger.prototype.am = am3;
    dbits = 28;
  }
  BigInteger.prototype.DB = dbits;
  BigInteger.prototype.DM = ((1<<dbits)-1);
  BigInteger.prototype.DV = (1<<dbits);
  var BI_FP = 52;
  BigInteger.prototype.FV = Math.pow(2,BI_FP);
  BigInteger.prototype.F1 = BI_FP-dbits;
  BigInteger.prototype.F2 = 2*dbits-BI_FP;
  // Digit conversions
  var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
  var BI_RC = new Array();
  var rr,vv;
  rr = "0".charCodeAt(0);
  for(vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
  rr = "a".charCodeAt(0);
  for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
  rr = "A".charCodeAt(0);
  for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
  function int2char(n) { return BI_RM.charAt(n); }
  function intAt(s,i) {
    var c = BI_RC[s.charCodeAt(i)];
    return (c==null)?-1:c;
  }
  // (protected) copy this to r
  function bnpCopyTo(r) {
    for(var i = this.t-1; i >= 0; --i) r[i] = this[i];
    r.t = this.t;
    r.s = this.s;
  }
  // (protected) set from integer value x, -DV <= x < DV
  function bnpFromInt(x) {
    this.t = 1;
    this.s = (x<0)?-1:0;
    if(x > 0) this[0] = x;
    else if(x < -1) this[0] = x+DV;
    else this.t = 0;
  }
  // return bigint initialized to value
  function nbv(i) { var r = nbi(); r.fromInt(i); return r; }
  // (protected) set from string and radix
  function bnpFromString(s,b) {
    var k;
    if(b == 16) k = 4;
    else if(b == 8) k = 3;
    else if(b == 256) k = 8; // byte array
    else if(b == 2) k = 1;
    else if(b == 32) k = 5;
    else if(b == 4) k = 2;
    else { this.fromRadix(s,b); return; }
    this.t = 0;
    this.s = 0;
    var i = s.length, mi = false, sh = 0;
    while(--i >= 0) {
      var x = (k==8)?s[i]&0xff:intAt(s,i);
      if(x < 0) {
        if(s.charAt(i) == "-") mi = true;
        continue;
      }
      mi = false;
      if(sh == 0)
        this[this.t++] = x;
      else if(sh+k > this.DB) {
        this[this.t-1] |= (x&((1<<(this.DB-sh))-1))<<sh;
        this[this.t++] = (x>>(this.DB-sh));
      }
      else
        this[this.t-1] |= x<<sh;
      sh += k;
      if(sh >= this.DB) sh -= this.DB;
    }
    if(k == 8 && (s[0]&0x80) != 0) {
      this.s = -1;
      if(sh > 0) this[this.t-1] |= ((1<<(this.DB-sh))-1)<<sh;
    }
    this.clamp();
    if(mi) BigInteger.ZERO.subTo(this,this);
  }
  // (protected) clamp off excess high words
  function bnpClamp() {
    var c = this.s&this.DM;
    while(this.t > 0 && this[this.t-1] == c) --this.t;
  }
  // (public) return string representation in given radix
  function bnToString(b) {
    if(this.s < 0) return "-"+this.negate().toString(b);
    var k;
    if(b == 16) k = 4;
    else if(b == 8) k = 3;
    else if(b == 2) k = 1;
    else if(b == 32) k = 5;
    else if(b == 4) k = 2;
    else return this.toRadix(b);
    var km = (1<<k)-1, d, m = false, r = "", i = this.t;
    var p = this.DB-(i*this.DB)%k;
    if(i-- > 0) {
      if(p < this.DB && (d = this[i]>>p) > 0) { m = true; r = int2char(d); }
      while(i >= 0) {
        if(p < k) {
          d = (this[i]&((1<<p)-1))<<(k-p);
          d |= this[--i]>>(p+=this.DB-k);
        }
        else {
          d = (this[i]>>(p-=k))&km;
          if(p <= 0) { p += this.DB; --i; }
        }
        if(d > 0) m = true;
        if(m) r += int2char(d);
      }
    }
    return m?r:"0";
  }
  // (public) -this
  function bnNegate() { var r = nbi(); BigInteger.ZERO.subTo(this,r); return r; }
  // (public) |this|
  function bnAbs() { return (this.s<0)?this.negate():this; }
  // (public) return + if this > a, - if this < a, 0 if equal
  function bnCompareTo(a) {
    var r = this.s-a.s;
    if(r != 0) return r;
    var i = this.t;
    r = i-a.t;
    if(r != 0) return (this.s<0)?-r:r;
    while(--i >= 0) if((r=this[i]-a[i]) != 0) return r;
    return 0;
  }
  // returns bit length of the integer x
  function nbits(x) {
    var r = 1, t;
    if((t=x>>>16) != 0) { x = t; r += 16; }
    if((t=x>>8) != 0) { x = t; r += 8; }
    if((t=x>>4) != 0) { x = t; r += 4; }
    if((t=x>>2) != 0) { x = t; r += 2; }
    if((t=x>>1) != 0) { x = t; r += 1; }
    return r;
  }
  // (public) return the number of bits in "this"
  function bnBitLength() {
    if(this.t <= 0) return 0;
    return this.DB*(this.t-1)+nbits(this[this.t-1]^(this.s&this.DM));
  }
  // (protected) r = this << n*DB
  function bnpDLShiftTo(n,r) {
    var i;
    for(i = this.t-1; i >= 0; --i) r[i+n] = this[i];
    for(i = n-1; i >= 0; --i) r[i] = 0;
    r.t = this.t+n;
    r.s = this.s;
  }
  // (protected) r = this >> n*DB
  function bnpDRShiftTo(n,r) {
    for(var i = n; i < this.t; ++i) r[i-n] = this[i];
    r.t = Math.max(this.t-n,0);
    r.s = this.s;
  }
  // (protected) r = this << n
  function bnpLShiftTo(n,r) {
    var bs = n%this.DB;
    var cbs = this.DB-bs;
    var bm = (1<<cbs)-1;
    var ds = Math.floor(n/this.DB), c = (this.s<<bs)&this.DM, i;
    for(i = this.t-1; i >= 0; --i) {
      r[i+ds+1] = (this[i]>>cbs)|c;
      c = (this[i]&bm)<<bs;
    }
    for(i = ds-1; i >= 0; --i) r[i] = 0;
    r[ds] = c;
    r.t = this.t+ds+1;
    r.s = this.s;
    r.clamp();
  }
  // (protected) r = this >> n
  function bnpRShiftTo(n,r) {
    r.s = this.s;
    var ds = Math.floor(n/this.DB);
    if(ds >= this.t) { r.t = 0; return; }
    var bs = n%this.DB;
    var cbs = this.DB-bs;
    var bm = (1<<bs)-1;
    r[0] = this[ds]>>bs;
    for(var i = ds+1; i < this.t; ++i) {
      r[i-ds-1] |= (this[i]&bm)<<cbs;
      r[i-ds] = this[i]>>bs;
    }
    if(bs > 0) r[this.t-ds-1] |= (this.s&bm)<<cbs;
    r.t = this.t-ds;
    r.clamp();
  }
  // (protected) r = this - a
  function bnpSubTo(a,r) {
    var i = 0, c = 0, m = Math.min(a.t,this.t);
    while(i < m) {
      c += this[i]-a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    if(a.t < this.t) {
      c -= a.s;
      while(i < this.t) {
        c += this[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += this.s;
    }
    else {
      c += this.s;
      while(i < a.t) {
        c -= a[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c -= a.s;
    }
    r.s = (c<0)?-1:0;
    if(c < -1) r[i++] = this.DV+c;
    else if(c > 0) r[i++] = c;
    r.t = i;
    r.clamp();
  }
  // (protected) r = this * a, r != this,a (HAC 14.12)
  // "this" should be the larger one if appropriate.
  function bnpMultiplyTo(a,r) {
    var x = this.abs(), y = a.abs();
    var i = x.t;
    r.t = i+y.t;
    while(--i >= 0) r[i] = 0;
    for(i = 0; i < y.t; ++i) r[i+x.t] = x.am(0,y[i],r,i,0,x.t);
    r.s = 0;
    r.clamp();
    if(this.s != a.s) BigInteger.ZERO.subTo(r,r);
  }
  // (protected) r = this^2, r != this (HAC 14.16)
  function bnpSquareTo(r) {
    var x = this.abs();
    var i = r.t = 2*x.t;
    while(--i >= 0) r[i] = 0;
    for(i = 0; i < x.t-1; ++i) {
      var c = x.am(i,x[i],r,2*i,0,1);
      if((r[i+x.t]+=x.am(i+1,2*x[i],r,2*i+1,c,x.t-i-1)) >= x.DV) {
        r[i+x.t] -= x.DV;
        r[i+x.t+1] = 1;
      }
    }
    if(r.t > 0) r[r.t-1] += x.am(i,x[i],r,2*i,0,1);
    r.s = 0;
    r.clamp();
  }
  // (protected) divide this by m, quotient and remainder to q, r (HAC 14.20)
  // r != q, this != m.  q or r may be null.
  function bnpDivRemTo(m,q,r) {
    var pm = m.abs();
    if(pm.t <= 0) return;
    var pt = this.abs();
    if(pt.t < pm.t) {
      if(q != null) q.fromInt(0);
      if(r != null) this.copyTo(r);
      return;
    }
    if(r == null) r = nbi();
    var y = nbi(), ts = this.s, ms = m.s;
    var nsh = this.DB-nbits(pm[pm.t-1]);	// normalize modulus
    if(nsh > 0) { pm.lShiftTo(nsh,y); pt.lShiftTo(nsh,r); }
    else { pm.copyTo(y); pt.copyTo(r); }
    var ys = y.t;
    var y0 = y[ys-1];
    if(y0 == 0) return;
    var yt = y0*(1<<this.F1)+((ys>1)?y[ys-2]>>this.F2:0);
    var d1 = this.FV/yt, d2 = (1<<this.F1)/yt, e = 1<<this.F2;
    var i = r.t, j = i-ys, t = (q==null)?nbi():q;
    y.dlShiftTo(j,t);
    if(r.compareTo(t) >= 0) {
      r[r.t++] = 1;
      r.subTo(t,r);
    }
    BigInteger.ONE.dlShiftTo(ys,t);
    t.subTo(y,y);	// "negative" y so we can replace sub with am later
    while(y.t < ys) y[y.t++] = 0;
    while(--j >= 0) {
      // Estimate quotient digit
      var qd = (r[--i]==y0)?this.DM:Math.floor(r[i]*d1+(r[i-1]+e)*d2);
      if((r[i]+=y.am(0,qd,r,j,0,ys)) < qd) {	// Try it out
        y.dlShiftTo(j,t);
        r.subTo(t,r);
        while(r[i] < --qd) r.subTo(t,r);
      }
    }
    if(q != null) {
      r.drShiftTo(ys,q);
      if(ts != ms) BigInteger.ZERO.subTo(q,q);
    }
    r.t = ys;
    r.clamp();
    if(nsh > 0) r.rShiftTo(nsh,r);	// Denormalize remainder
    if(ts < 0) BigInteger.ZERO.subTo(r,r);
  }
  // (public) this mod a
  function bnMod(a) {
    var r = nbi();
    this.abs().divRemTo(a,null,r);
    if(this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r,r);
    return r;
  }
  // Modular reduction using "classic" algorithm
  function Classic(m) { this.m = m; }
  function cConvert(x) {
    if(x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
    else return x;
  }
  function cRevert(x) { return x; }
  function cReduce(x) { x.divRemTo(this.m,null,x); }
  function cMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }
  function cSqrTo(x,r) { x.squareTo(r); this.reduce(r); }
  Classic.prototype.convert = cConvert;
  Classic.prototype.revert = cRevert;
  Classic.prototype.reduce = cReduce;
  Classic.prototype.mulTo = cMulTo;
  Classic.prototype.sqrTo = cSqrTo;
  // (protected) return "-1/this % 2^DB"; useful for Mont. reduction
  // justification:
  //         xy == 1 (mod m)
  //         xy =  1+km
  //   xy(2-xy) = (1+km)(1-km)
  // x[y(2-xy)] = 1-k^2m^2
  // x[y(2-xy)] == 1 (mod m^2)
  // if y is 1/x mod m, then y(2-xy) is 1/x mod m^2
  // should reduce x and y(2-xy) by m^2 at each step to keep size bounded.
  // JS multiply "overflows" differently from C/C++, so care is needed here.
  function bnpInvDigit() {
    if(this.t < 1) return 0;
    var x = this[0];
    if((x&1) == 0) return 0;
    var y = x&3;		// y == 1/x mod 2^2
    y = (y*(2-(x&0xf)*y))&0xf;	// y == 1/x mod 2^4
    y = (y*(2-(x&0xff)*y))&0xff;	// y == 1/x mod 2^8
    y = (y*(2-(((x&0xffff)*y)&0xffff)))&0xffff;	// y == 1/x mod 2^16
    // last step - calculate inverse mod DV directly;
    // assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints
    y = (y*(2-x*y%this.DV))%this.DV;		// y == 1/x mod 2^dbits
    // we really want the negative inverse, and -DV < y < DV
    return (y>0)?this.DV-y:-y;
  }
  // Montgomery reduction
  function Montgomery(m) {
    this.m = m;
    this.mp = m.invDigit();
    this.mpl = this.mp&0x7fff;
    this.mph = this.mp>>15;
    this.um = (1<<(m.DB-15))-1;
    this.mt2 = 2*m.t;
  }
  // xR mod m
  function montConvert(x) {
    var r = nbi();
    x.abs().dlShiftTo(this.m.t,r);
    r.divRemTo(this.m,null,r);
    if(x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r,r);
    return r;
  }
  // x/R mod m
  function montRevert(x) {
    var r = nbi();
    x.copyTo(r);
    this.reduce(r);
    return r;
  }
  // x = x/R mod m (HAC 14.32)
  function montReduce(x) {
    while(x.t <= this.mt2)	// pad x so am has enough room later
      x[x.t++] = 0;
    for(var i = 0; i < this.m.t; ++i) {
      // faster way of calculating u0 = x[i]*mp mod DV
      var j = x[i]&0x7fff;
      var u0 = (j*this.mpl+(((j*this.mph+(x[i]>>15)*this.mpl)&this.um)<<15))&x.DM;
      // use am to combine the multiply-shift-add into one call
      j = i+this.m.t;
      x[j] += this.m.am(0,u0,x,i,0,this.m.t);
      // propagate carry
      while(x[j] >= x.DV) { x[j] -= x.DV; x[++j]++; }
    }
    x.clamp();
    x.drShiftTo(this.m.t,x);
    if(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
  }
  // r = "x^2/R mod m"; x != r
  function montSqrTo(x,r) { x.squareTo(r); this.reduce(r); }
  // r = "xy/R mod m"; x,y != r
  function montMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }
  Montgomery.prototype.convert = montConvert;
  Montgomery.prototype.revert = montRevert;
  Montgomery.prototype.reduce = montReduce;
  Montgomery.prototype.mulTo = montMulTo;
  Montgomery.prototype.sqrTo = montSqrTo;
  // (protected) true iff this is even
  function bnpIsEven() { return ((this.t>0)?(this[0]&1):this.s) == 0; }
  // (protected) this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)
  function bnpExp(e,z) {
    if(e > 0xffffffff || e < 1) return BigInteger.ONE;
    var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e)-1;
    g.copyTo(r);
    while(--i >= 0) {
      z.sqrTo(r,r2);
      if((e&(1<<i)) > 0) z.mulTo(r2,g,r);
      else { var t = r; r = r2; r2 = t; }
    }
    return z.revert(r);
  }
  // (public) this^e % m, 0 <= e < 2^32
  function bnModPowInt(e,m) {
    var z;
    if(e < 256 || m.isEven()) z = new Classic(m); else z = new Montgomery(m);
    return this.exp(e,z);
  }
  // protected
  BigInteger.prototype.copyTo = bnpCopyTo;
  BigInteger.prototype.fromInt = bnpFromInt;
  BigInteger.prototype.fromString = bnpFromString;
  BigInteger.prototype.clamp = bnpClamp;
  BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
  BigInteger.prototype.drShiftTo = bnpDRShiftTo;
  BigInteger.prototype.lShiftTo = bnpLShiftTo;
  BigInteger.prototype.rShiftTo = bnpRShiftTo;
  BigInteger.prototype.subTo = bnpSubTo;
  BigInteger.prototype.multiplyTo = bnpMultiplyTo;
  BigInteger.prototype.squareTo = bnpSquareTo;
  BigInteger.prototype.divRemTo = bnpDivRemTo;
  BigInteger.prototype.invDigit = bnpInvDigit;
  BigInteger.prototype.isEven = bnpIsEven;
  BigInteger.prototype.exp = bnpExp;
  // public
  BigInteger.prototype.toString = bnToString;
  BigInteger.prototype.negate = bnNegate;
  BigInteger.prototype.abs = bnAbs;
  BigInteger.prototype.compareTo = bnCompareTo;
  BigInteger.prototype.bitLength = bnBitLength;
  BigInteger.prototype.mod = bnMod;
  BigInteger.prototype.modPowInt = bnModPowInt;
  // "constants"
  BigInteger.ZERO = nbv(0);
  BigInteger.ONE = nbv(1);
  // jsbn2 stuff
  // (protected) convert from radix string
  function bnpFromRadix(s,b) {
    this.fromInt(0);
    if(b == null) b = 10;
    var cs = this.chunkSize(b);
    var d = Math.pow(b,cs), mi = false, j = 0, w = 0;
    for(var i = 0; i < s.length; ++i) {
      var x = intAt(s,i);
      if(x < 0) {
        if(s.charAt(i) == "-" && this.signum() == 0) mi = true;
        continue;
      }
      w = b*w+x;
      if(++j >= cs) {
        this.dMultiply(d);
        this.dAddOffset(w,0);
        j = 0;
        w = 0;
      }
    }
    if(j > 0) {
      this.dMultiply(Math.pow(b,j));
      this.dAddOffset(w,0);
    }
    if(mi) BigInteger.ZERO.subTo(this,this);
  }
  // (protected) return x s.t. r^x < DV
  function bnpChunkSize(r) { return Math.floor(Math.LN2*this.DB/Math.log(r)); }
  // (public) 0 if this == 0, 1 if this > 0
  function bnSigNum() {
    if(this.s < 0) return -1;
    else if(this.t <= 0 || (this.t == 1 && this[0] <= 0)) return 0;
    else return 1;
  }
  // (protected) this *= n, this >= 0, 1 < n < DV
  function bnpDMultiply(n) {
    this[this.t] = this.am(0,n-1,this,0,0,this.t);
    ++this.t;
    this.clamp();
  }
  // (protected) this += n << w words, this >= 0
  function bnpDAddOffset(n,w) {
    if(n == 0) return;
    while(this.t <= w) this[this.t++] = 0;
    this[w] += n;
    while(this[w] >= this.DV) {
      this[w] -= this.DV;
      if(++w >= this.t) this[this.t++] = 0;
      ++this[w];
    }
  }
  // (protected) convert to radix string
  function bnpToRadix(b) {
    if(b == null) b = 10;
    if(this.signum() == 0 || b < 2 || b > 36) return "0";
    var cs = this.chunkSize(b);
    var a = Math.pow(b,cs);
    var d = nbv(a), y = nbi(), z = nbi(), r = "";
    this.divRemTo(d,y,z);
    while(y.signum() > 0) {
      r = (a+z.intValue()).toString(b).substr(1) + r;
      y.divRemTo(d,y,z);
    }
    return z.intValue().toString(b) + r;
  }
  // (public) return value as integer
  function bnIntValue() {
    if(this.s < 0) {
      if(this.t == 1) return this[0]-this.DV;
      else if(this.t == 0) return -1;
    }
    else if(this.t == 1) return this[0];
    else if(this.t == 0) return 0;
    // assumes 16 < DB < 32
    return ((this[1]&((1<<(32-this.DB))-1))<<this.DB)|this[0];
  }
  // (protected) r = this + a
  function bnpAddTo(a,r) {
    var i = 0, c = 0, m = Math.min(a.t,this.t);
    while(i < m) {
      c += this[i]+a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    if(a.t < this.t) {
      c += a.s;
      while(i < this.t) {
        c += this[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += this.s;
    }
    else {
      c += this.s;
      while(i < a.t) {
        c += a[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += a.s;
    }
    r.s = (c<0)?-1:0;
    if(c > 0) r[i++] = c;
    else if(c < -1) r[i++] = this.DV+c;
    r.t = i;
    r.clamp();
  }
  BigInteger.prototype.fromRadix = bnpFromRadix;
  BigInteger.prototype.chunkSize = bnpChunkSize;
  BigInteger.prototype.signum = bnSigNum;
  BigInteger.prototype.dMultiply = bnpDMultiply;
  BigInteger.prototype.dAddOffset = bnpDAddOffset;
  BigInteger.prototype.toRadix = bnpToRadix;
  BigInteger.prototype.intValue = bnIntValue;
  BigInteger.prototype.addTo = bnpAddTo;
  //======= end jsbn =======
  // Emscripten wrapper
  var Wrapper = {
    abs: function(l, h) {
      var x = new goog.math.Long(l, h);
      var ret;
      if (x.isNegative()) {
        ret = x.negate();
      } else {
        ret = x;
      }
      HEAP32[tempDoublePtr>>2] = ret.low_;
      HEAP32[tempDoublePtr+4>>2] = ret.high_;
    },
    ensureTemps: function() {
      if (Wrapper.ensuredTemps) return;
      Wrapper.ensuredTemps = true;
      Wrapper.two32 = new BigInteger();
      Wrapper.two32.fromString('4294967296', 10);
      Wrapper.two64 = new BigInteger();
      Wrapper.two64.fromString('18446744073709551616', 10);
      Wrapper.temp1 = new BigInteger();
      Wrapper.temp2 = new BigInteger();
    },
    lh2bignum: function(l, h) {
      var a = new BigInteger();
      a.fromString(h.toString(), 10);
      var b = new BigInteger();
      a.multiplyTo(Wrapper.two32, b);
      var c = new BigInteger();
      c.fromString(l.toString(), 10);
      var d = new BigInteger();
      c.addTo(b, d);
      return d;
    },
    stringify: function(l, h, unsigned) {
      var ret = new goog.math.Long(l, h).toString();
      if (unsigned && ret[0] == '-') {
        // unsign slowly using jsbn bignums
        Wrapper.ensureTemps();
        var bignum = new BigInteger();
        bignum.fromString(ret, 10);
        ret = new BigInteger();
        Wrapper.two64.addTo(bignum, ret);
        ret = ret.toString(10);
      }
      return ret;
    },
    fromString: function(str, base, min, max, unsigned) {
      Wrapper.ensureTemps();
      var bignum = new BigInteger();
      bignum.fromString(str, base);
      var bigmin = new BigInteger();
      bigmin.fromString(min, 10);
      var bigmax = new BigInteger();
      bigmax.fromString(max, 10);
      if (unsigned && bignum.compareTo(BigInteger.ZERO) < 0) {
        var temp = new BigInteger();
        bignum.addTo(Wrapper.two64, temp);
        bignum = temp;
      }
      var error = false;
      if (bignum.compareTo(bigmin) < 0) {
        bignum = bigmin;
        error = true;
      } else if (bignum.compareTo(bigmax) > 0) {
        bignum = bigmax;
        error = true;
      }
      var ret = goog.math.Long.fromString(bignum.toString()); // min-max checks should have clamped this to a range goog.math.Long can handle well
      HEAP32[tempDoublePtr>>2] = ret.low_;
      HEAP32[tempDoublePtr+4>>2] = ret.high_;
      if (error) throw 'range error';
    }
  };
  return Wrapper;
})();
//======= end closure i64 code =======
// === Auto-generated postamble setup entry stuff ===
var initialStackTop;
var inMain;
Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');
  args = args || [];
  ensureInitRuntime();
  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString("/bin/this.program"), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);
  initialStackTop = STACKTOP;
  inMain = true;
  var ret;
  try {
    ret = Module['_main'](argc, argv, 0);
  }
  catch(e) {
    if (e && typeof e == 'object' && e.type == 'ExitStatus') {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      Module.print('Exit Status: ' + e.value);
      return e.value;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
    } else {
      throw e;
    }
  } finally {
    inMain = false;
  }
  // if we're not running an evented main loop, it's time to exit
  if (!Module['noExitRuntime']) {
    exit(ret);
  }
}
function run(args) {
  args = args || Module['arguments'];
  if (runDependencies > 0) {
    Module.printErr('run() called, but dependencies remain, so not running');
    return;
  }
  preRun();
  if (runDependencies > 0) {
    // a preRun added a dependency, run will be called later
    return;
  }
  function doRun() {
    ensureInitRuntime();
    preMain();
    calledRun = true;
    if (Module['_main'] && shouldRunNow) {
      Module['callMain'](args);
    }
    postRun();
  }
  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      if (!ABORT) doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;
function exit(status) {
  ABORT = true;
  STACKTOP = initialStackTop;
  // TODO call externally added 'exit' callbacks with the status code.
  // It'd be nice to provide the same interface for all Module events (e.g.
  // prerun, premain, postmain). Perhaps an EventEmitter so we can do:
  // Module.on('exit', function (status) {});
  // exit the runtime
  exitRuntime();
  if (inMain) {
    // if we're still inside the callMain's try/catch, we need to throw an
    // exception in order to immediately terminate execution.
    throw { type: 'ExitStatus', value: status };
  }
}
Module['exit'] = Module.exit = exit;
function abort(text) {
  if (text) {
    Module.print(text);
  }
  ABORT = true;
  throw 'abort() at ' + (new Error().stack);
}
Module['abort'] = Module.abort = abort;
// {{PRE_RUN_ADDITIONS}}
if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}
// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}
run();
// {{POST_RUN_ADDITIONS}}
// {{MODULE_ADDITIONS}}
