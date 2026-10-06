// Node-flavoured util.inspect / util.format for the in-browser runner.
// A compact port of the behaviours of Node 20 that matter for teaching output
// (quoting, line-breaking at 72/80 cols, array grouping, Map/Set, classes, circular refs).

const ID = /^[a-zA-Z_][a-zA-Z_0-9]*$/;
const kObject = 0;
const kArrayElem = 1;
const kArrayExtras = 2;
export const custom = Symbol.for('nodejs.util.inspect.custom');

const escMap = { '\n': '\\n', '\r': '\\r', '\t': '\\t', '\b': '\\b', '\f': '\\f', '\v': '\\v', '\\': '\\\\' };
function strEscape(s) {
  let q = "'";
  if (s.includes("'")) {
    if (!s.includes('"')) q = '"';
    else if (!s.includes('`') && !s.includes('${')) q = '`';
  }
  const body = s.replace(/[\u0000-\u001f\u007f\\]/g, (c) => escMap[c] ?? '\\x' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));
  return q + (q === "'" ? body.replaceAll("'", "\\'") : body) + q;
}

function fmtPrimitive(v) {
  switch (typeof v) {
    case 'string': return strEscape(v);
    case 'number': return Object.is(v, -0) ? '-0' : String(v);
    case 'bigint': return `${v}n`;
    case 'symbol': return v.toString();
    default: return String(v);
  }
}

function getCtorName(obj) {
  let o = obj;
  while (o) {
    const d = Object.getOwnPropertyDescriptor(o, 'constructor');
    if (d && typeof d.value === 'function' && d.value.name !== '') return d.value.name;
    o = Object.getPrototypeOf(o);
  }
  return null;
}

function getPrefix(ctor, tag, fallback, size = '') {
  if (ctor === null) {
    if (tag !== '' && fallback !== tag) return `[${fallback}${size}: null prototype] [${tag}] `;
    return `[${fallback}${size}: null prototype] `;
  }
  if (tag !== '' && ctor !== tag) return `${ctor}${size} [${tag}] `;
  return `${ctor}${size} `;
}

function ownKeys(v, nonIndex) {
  let keys = Object.keys(v);
  if (nonIndex) keys = keys.filter((k) => !/^(0|[1-9]\d*)$/.test(k));
  const syms = Object.getOwnPropertySymbols(v).filter((s) => Object.prototype.propertyIsEnumerable.call(v, s));
  return keys.concat(syms);
}

function fnBase(fn, ctor, tag) {
  const src = Function.prototype.toString.call(fn);
  if (src.startsWith('class') && src.endsWith('}')) {
    let base = '[class';
    base += fn.name ? ` ${fn.name}` : ' (anonymous)';
    const sup = Object.getPrototypeOf(fn);
    if (sup && sup.name) base += ` extends ${sup.name}`;
    return base + ']';
  }
  let type = 'Function';
  const cn = fn.constructor && fn.constructor.name;
  if (cn === 'GeneratorFunction') type = 'GeneratorFunction';
  else if (cn === 'AsyncFunction') type = 'AsyncFunction';
  else if (cn === 'AsyncGeneratorFunction') type = 'AsyncGeneratorFunction';
  let base = `[${type}`;
  if (ctor === null) base += ' (null prototype)';
  base += fn.name === '' ? ' (anonymous)' : `: ${fn.name}`;
  base += ']';
  if (tag !== '' && ctor !== tag) base += ` [${tag}]`;
  return base;
}

function formatError(err) {
  const name = err.name != null ? String(err.name) : 'Error';
  const msg = err.message != null && err.message !== '' ? `: ${err.message}` : '';
  return `${name}${msg}\n    at <anonymous>`;
}

function isBelowBreakLength(ctx, output, start, base) {
  let total = output.length + start;
  if (total + output.length > ctx.breakLength) return false;
  for (let i = 0; i < output.length; i++) {
    total += output[i].length;
    if (total > ctx.breakLength) return false;
  }
  return base === '' || !base.includes('\n');
}

function groupArrayElements(ctx, output, value) {
  let totalLength = 0;
  let maxLength = 0;
  let i = 0;
  let outputLength = output.length;
  if (ctx.maxArrayLength < output.length) outputLength--;
  const sep = 2;
  const dataLen = new Array(outputLength);
  for (; i < outputLength; i++) {
    const len = output[i].length;
    dataLen[i] = len;
    totalLength += len + sep;
    if (maxLength < len) maxLength = len;
  }
  const actualMax = maxLength + sep;
  if (actualMax * 3 + ctx.indentationLvl < ctx.breakLength && (totalLength / actualMax > 5 || maxLength <= 6)) {
    const averageBias = Math.sqrt(actualMax - totalLength / output.length);
    const biasedMax = Math.max(actualMax - 3 - averageBias, 1);
    const columns = Math.min(
      Math.round(Math.sqrt(2.5 * biasedMax * outputLength) / biasedMax),
      Math.floor((ctx.breakLength - ctx.indentationLvl) / actualMax),
      ctx.compact * 4,
      15,
    );
    if (columns <= 1) return output;
    const tmp = [];
    const maxLineLength = [];
    for (let c = 0; c < columns; c++) {
      let lineLength = 0;
      for (let j = c; j < output.length; j += columns) if (dataLen[j] > lineLength) lineLength = dataLen[j];
      maxLineLength.push(lineLength + sep);
    }
    let padStart = true;
    if (value !== undefined) {
      for (let k = 0; k < output.length; k++) {
        if (typeof value[k] !== 'number' && typeof value[k] !== 'bigint') { padStart = false; break; }
      }
    }
    for (let r = 0; r < outputLength; r += columns) {
      const max = Math.min(r + columns, outputLength);
      let str = '';
      let j = r;
      for (; j < max - 1; j++) {
        const padding = maxLineLength[j - r];
        str += padStart ? `${output[j]}, `.padStart(padding, ' ') : `${output[j]}, `.padEnd(padding, ' ');
      }
      if (padStart) str += output[j].padStart(maxLineLength[j - r] - sep, ' ');
      else str += output[j];
      tmp.push(str);
    }
    if (ctx.maxArrayLength < output.length) tmp.push(output[outputLength]);
    output = tmp;
  }
  return output;
}

function reduceToSingleString(ctx, output, base, braces, extras, rt, value) {
  const entries = output.length;
  if (extras === kArrayExtras && entries > 6) output = groupArrayElements(ctx, output, value);
  if (ctx.currentDepth - rt < ctx.compact && entries === output.length) {
    const start = output.length + ctx.indentationLvl + braces[0].length + base.length + 10;
    if (isBelowBreakLength(ctx, output, start, base)) {
      const joined = output.join(', ');
      if (!joined.includes('\n')) return `${base ? `${base} ` : ''}${braces[0]} ${joined} ${braces[1]}`;
    }
  }
  const indentation = `\n${' '.repeat(ctx.indentationLvl)}`;
  return `${base ? `${base} ` : ''}${braces[0]}${indentation}  ${output.join(`,${indentation}  `)}${indentation}${braces[1]}`;
}

function formatProperty(ctx, value, rt, key, type) {
  let str;
  const desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key], enumerable: true };
  if (desc.value !== undefined) {
    ctx.indentationLvl += 2;
    str = formatValue(ctx, desc.value, rt);
    ctx.indentationLvl -= 2;
  } else if (desc.get !== undefined) {
    str = desc.set !== undefined ? '[Getter/Setter]' : '[Getter]';
  } else if (desc.set !== undefined) {
    str = '[Setter]';
  } else {
    str = 'undefined';
  }
  if (type === kArrayElem) return str;
  let name;
  if (typeof key === 'symbol') name = `[${key.toString()}]`;
  else if (key === '__proto__') name = "['__proto__']";
  else if (desc.enumerable === false) name = `[${key}]`;
  else if (ID.test(key)) name = key;
  else name = strEscape(key);
  return `${name}: ${str}`;
}

function formatArray(ctx, value, rt) {
  const valLen = value.length;
  const len = Math.min(Math.max(0, ctx.maxArrayLength), valLen);
  const output = [];
  let i = 0;
  for (; i < len; i++) {
    if (!Object.prototype.hasOwnProperty.call(value, i)) {
      let holes = 0;
      while (i < len && !Object.prototype.hasOwnProperty.call(value, i)) { holes++; i++; }
      output.push(`<${holes} empty item${holes > 1 ? 's' : ''}>`);
      i--;
      continue;
    }
    output.push(formatProperty(ctx, value, rt, i, kArrayElem));
  }
  const remaining = valLen - len;
  if (remaining > 0) output.push(`... ${remaining} more item${remaining > 1 ? 's' : ''}`);
  return output;
}

function formatTyped(ctx, value) {
  const len = Math.min(Math.max(0, ctx.maxArrayLength), value.length);
  const output = [];
  for (let i = 0; i < len; i++) output.push(fmtPrimitive(value[i]));
  const remaining = value.length - len;
  if (remaining > 0) output.push(`... ${remaining} more item${remaining > 1 ? 's' : ''}`);
  return output;
}

function formatValue(ctx, v, rt) {
  if (typeof v !== 'object' && typeof v !== 'function') return fmtPrimitive(v);
  if (v === null) return 'null';
  const cust = v[custom];
  if (typeof cust === 'function' && cust !== inspect) {
    const ret = cust.call(v, ctx.depth - rt, { ...ctx.opts, depth: ctx.depth - rt }, inspect);
    if (ret !== v) {
      if (typeof ret !== 'string') return formatValue(ctx, ret, rt);
      return ret.replaceAll('\n', `\n${' '.repeat(ctx.indentationLvl)}`);
    }
  }
  if (ctx.seen.includes(v)) {
    let idx = ctx.circular.get(v);
    if (idx === undefined) { idx = ctx.circular.size + 1; ctx.circular.set(v, idx); }
    return `[Circular *${idx}]`;
  }
  return formatRaw(ctx, v, rt);
}

function formatRaw(ctx, value, rt) {
  let keys;
  let base = '';
  let formatter = () => [];
  let braces;
  let extras = kObject;
  const ctor = getCtorName(value);
  let tag = value[Symbol.toStringTag];
  if (typeof tag !== 'string' || tag === ctor) tag = '';

  if (Array.isArray(value)) {
    const prefix = ctor !== 'Array' || tag !== '' ? getPrefix(ctor, tag, 'Array', `(${value.length})`) : '';
    keys = ownKeys(value, true);
    braces = [`${prefix}[`, ']'];
    if (value.length === 0 && keys.length === 0) return `${braces[0]}]`;
    extras = kArrayExtras;
    formatter = formatArray;
  } else if (value instanceof Set) {
    const prefix = getPrefix(ctor, tag, 'Set', `(${value.size})`);
    keys = ownKeys(value);
    if (value.size === 0 && keys.length === 0) return `${prefix}{}`;
    braces = [`${prefix}{`, '}'];
    formatter = (c, v, r) => {
      c.indentationLvl += 2;
      const out = [...v].map((x) => formatValue(c, x, r));
      c.indentationLvl -= 2;
      return out;
    };
  } else if (value instanceof Map) {
    const prefix = getPrefix(ctor, tag, 'Map', `(${value.size})`);
    keys = ownKeys(value);
    if (value.size === 0 && keys.length === 0) return `${prefix}{}`;
    braces = [`${prefix}{`, '}'];
    formatter = (c, v, r) => {
      c.indentationLvl += 2;
      const out = [...v].map(([k, x]) => `${formatValue(c, k, r)} => ${formatValue(c, x, r)}`);
      c.indentationLvl -= 2;
      return out;
    };
  } else if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    if (ctor === 'Buffer') {
      const max = 50;
      const hex = Array.from(value.subarray(0, max), (b) => b.toString(16).padStart(2, '0')).join(' ');
      const more = value.length > max ? ` ... ${value.length - max} more byte${value.length - max > 1 ? 's' : ''}` : '';
      return `<Buffer${hex ? ' ' + hex : ''}${more}>`;
    }
    keys = ownKeys(value, true);
    const prefix = getPrefix(ctor, tag, ctor ?? 'TypedArray', `(${value.length})`);
    braces = [`${prefix}[`, ']'];
    if (value.length === 0 && keys.length === 0) return `${braces[0]}]`;
    extras = kArrayExtras;
    formatter = (c, v) => formatTyped(c, v);
  } else {
    keys = ownKeys(value);
    braces = ['{', '}'];
    if (typeof value === 'function') {
      base = fnBase(value, ctor, tag);
      if (keys.length === 0) return base;
    } else if (value instanceof RegExp) {
      base = String(value);
      if (keys.length === 0) return base;
    } else if (value instanceof Date) {
      base = Number.isNaN(value.getTime()) ? 'Invalid Date' : value.toISOString();
      if (keys.length === 0) return base;
    } else if (value instanceof Error) {
      keys = keys.filter((k) => k !== 'stack' && k !== 'message');
      base = formatError(value);
      if (keys.length === 0) return base;
    } else if (value instanceof Promise) {
      braces[0] = `${getPrefix(ctor, tag, 'Promise')}{`;
      formatter = () => ['<pending>'];
    } else if (value instanceof WeakSet || value instanceof WeakMap) {
      return `${getPrefix(ctor, tag, value instanceof WeakSet ? 'WeakSet' : 'WeakMap')}{ <items unknown> }`;
    } else if (value instanceof Number || value instanceof String || value instanceof Boolean || value instanceof BigInt || value instanceof Symbol) {
      const t = value instanceof Number ? 'Number' : value instanceof String ? 'String' : value instanceof Boolean ? 'Boolean' : value instanceof BigInt ? 'BigInt' : 'Symbol';
      base = `[${t}: ${fmtPrimitive(value.valueOf())}]`;
      if (t === 'String') keys = keys.filter((k) => !/^\d+$/.test(String(k)));
      if (keys.length === 0) return base;
    } else {
      braces[0] = ctor === 'Object' && tag === '' ? '{' : `${getPrefix(ctor, tag, 'Object')}{`;
      if (keys.length === 0) return `${braces[0]}}`;
    }
  }

  if (rt > ctx.depth && ctx.depth !== null) {
    const name = getPrefix(ctor, tag, Array.isArray(value) ? 'Array' : 'Object').slice(0, -1);
    return `[${name}]`;
  }
  rt += 1;
  ctx.seen.push(value);
  ctx.currentDepth = rt;
  let output = formatter(ctx, value, rt);
  for (const k of keys) output.push(formatProperty(ctx, value, rt, k, extras === kObject ? kObject : kArrayExtras));
  ctx.seen.pop();

  if (ctx.circular.has(value)) {
    const reference = `<ref *${ctx.circular.get(value)}>`;
    base = base === '' ? reference : `${reference} ${base}`;
  }
  if (ctx.sorted && extras === kObject) output.sort();
  return reduceToSingleString(ctx, output, base, braces, extras, rt, value);
}

export function inspect(value, opts = {}) {
  if (typeof opts !== 'object' || opts === null) opts = {};
  const ctx = {
    opts,
    seen: [],
    circular: new Map(),
    depth: opts.depth === undefined ? 2 : opts.depth === null ? Infinity : opts.depth,
    breakLength: opts.breakLength ?? 80,
    compact: opts.compact === false ? 0 : opts.compact ?? 3,
    maxArrayLength: opts.maxArrayLength ?? 100,
    sorted: !!opts.sorted,
    indentationLvl: 0,
    currentDepth: 0,
  };
  return formatValue(ctx, value, 0);
}
inspect.custom = custom;
inspect.defaultOptions = { depth: 2, breakLength: 80, compact: 3 };

const hasBuiltInToString = (v) => {
  const ts = v.toString;
  return typeof ts !== 'function' || Function.prototype.toString.call(ts).includes('[native code]');
};

export function format(...args) {
  const first = args[0];
  let a = 0;
  let str = '';
  let join = '';
  if (typeof first === 'string') {
    if (args.length === 1) return first;
    let lastPos = 0;
    for (let i = 0; i < first.length - 1; i++) {
      if (first.charCodeAt(i) !== 37) continue;
      const next = first.charCodeAt(++i);
      if (a + 1 !== args.length) {
        let tempStr;
        switch (next) {
          case 115: { // %s
            const arg = args[++a];
            if (typeof arg === 'number') tempStr = fmtPrimitive(arg);
            else if (typeof arg === 'bigint') tempStr = `${arg}n`;
            else if (typeof arg !== 'object' || arg === null || !hasBuiltInToString(arg)) tempStr = String(arg);
            else tempStr = inspect(arg, { depth: 0, compact: 3 });
            break;
          }
          case 106: { // %j
            try { tempStr = JSON.stringify(args[++a]); } catch { tempStr = '[Circular]'; }
            break;
          }
          case 100: { // %d
            const n = args[++a];
            tempStr = typeof n === 'bigint' ? `${n}n` : typeof n === 'symbol' ? 'NaN' : fmtPrimitive(Number(n));
            break;
          }
          case 79: tempStr = inspect(args[++a]); break; // %O
          case 111: tempStr = inspect(args[++a], { depth: 4 }); break; // %o
          case 105: { // %i
            const n = args[++a];
            tempStr = typeof n === 'bigint' ? `${n}n` : typeof n === 'symbol' ? 'NaN' : fmtPrimitive(parseInt(n));
            break;
          }
          case 102: { // %f
            const n = args[++a];
            tempStr = typeof n === 'symbol' ? 'NaN' : fmtPrimitive(parseFloat(n));
            break;
          }
          case 99: a += 1; tempStr = ''; break; // %c
          case 37: str += first.slice(lastPos, i); lastPos = i + 1; continue;
          default: continue;
        }
        if (lastPos !== i - 1) str += first.slice(lastPos, i - 1);
        str += tempStr;
        lastPos = i + 1;
      } else if (next === 37) {
        str += first.slice(lastPos, i);
        lastPos = i + 1;
      }
    }
    if (lastPos !== 0) {
      a++;
      join = ' ';
      if (lastPos < first.length) str += first.slice(lastPos);
    }
  }
  while (a < args.length) {
    const v = args[a];
    str += join;
    str += typeof v !== 'string' ? inspect(v) : v;
    join = ' ';
    a++;
  }
  return str;
}
