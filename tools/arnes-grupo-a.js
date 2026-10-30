#!/usr/bin/env node
// Arnes de verificacion de los Grupo A aplicados (TRS-A6, CRT-A1/A2/A3/A6/A8/A11, CDF-A2).
// Ejecuta las funciones REALES de cada _REF, en dos revisiones de git (antes/despues),
// con N/search, N/record, N/runtime, N/email, etc. simulados. NO toca la cuenta.
//
// Uso (desde la raiz del repo):  node tools/arnes-grupo-a.js
// Las revisiones estan fijadas abajo; si cambia el codigo, ajustar REV.
// Limite: verifica la logica contra una simulacion de la API, no contra NetSuite.
'use strict';
const { execFileSync } = require('child_process');

const REV = {
  trs: { antes: 'e0d360c~1', despues: 'e0d360c' },
  crt: { antes: '72b8474', despues: '513c71c' },
  cdf: { antes: '72b8474', despues: '2b5c36f' }
};
const FILE = {
  trs: 'LOC UY/L598 -Transacción (Servidor)_REF.js',
  crt: 'LOC UY/L598 - Calcular Retenciones (SS)V2_REF.js',
  cdf: 'LOC UY/L598 - Conexion Directa FE (SS)_REF.js'
};
const isEmpty = (v) => v === '' || v === null || v === undefined || v === 'null' || v === 'undefined';

// Carga el _REF de una revision exportando funciones internas (se inyecta antes del return del modulo).
function cargar(script, rev, nombres, inyectar) {
  let src = execFileSync('git', ['show', `${rev}:${FILE[script]}`], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const idx = [...src.matchAll(/\n\s*return \{\s*\n/g)].pop().index;
  src = src.slice(0, idx) + `\nglobalThis.__t={${nombres.join(',')}};\n` + src.slice(idx);
  const logs = [];
  const log = { debug() {}, audit() {}, error(_t, m) { logs.push(String(m)); } };
  let factory;
  globalThis.__t = null;
  new Function('define', 'log', src)((_d, fn) => { factory = fn; }, log);
  factory(...inyectar(log));
  return { t: globalThis.__t, logs };
}

const fila = (t, a, d) => console.log(t.padEnd(36), '|', String(a).padEnd(48), '|', d);

// ---- TRS-A6 ----
console.log('=== TRS-A6 getNumeroEnLetras ===');
{
  const inj = (log) => [log,
    { Operator: { IS: 'is', ANYOF: 'anyof' }, createFilter: (o) => o, create: () => ({ run: () => ({ getRange: () => [{ getValue: () => true }] }) }) },
    { getCurrentScript() { return { getParameter() { return null; } }; } }, {}, { isEmpty }];
  const a = cargar('trs', REV.trs.antes, ['getNumeroEnLetras'], inj).t.getNumeroEnLetras;
  const d = cargar('trs', REV.trs.despues, ['getNumeroEnLetras'], inj).t.getNumeroEnLetras;
  for (const n of [10.5, 100.5, 12.3, 10.05, 10, 15061.72, 10.567]) fila(String(n), a(n, null), d(n, null));
}

// ---- CRT ----
console.log('\n=== CRT ===');
const NOMBRES_CRT = ['getNumberLiteral', 'validarEdicionUruResguardo', 'limpiarResguardoEliminado',
  'eliminarDetallesDeUruRetencion', 'calcularGenerarResguardoAutomaticamente'];
function crt(rev) {
  const calls = { del: [], create: [] };
  const record = {
    Type: { VENDOR_BILL: 'vendorbill' }, delete: (o) => calls.del.push(o), submitFields() {},
    load: () => {
      const lines = ['a', 'b', 'c'];
      return {
        getLineCount: () => lines.length,
        removeLine: (o) => { if (typeof o === 'string' || o.line >= lines.length || o.line < 0) throw new Error('INVALID_LINE'); lines.splice(o.line, 1); },
        save: () => { calls.saved = lines.length; return 1; }
      };
    }
  };
  const search = {
    Operator: { IS: 'is', ANYOF: 'anyof', ISNOTEMPTY: 'isnotempty' }, createFilter: (o) => o,
    create: (o) => { calls.create.push(o.filters); return { run: () => ({ getRange: () => [{ getValue: () => true }] }) }; },
    load: () => ({ filters: [], run: () => ({ getRange: () => [{ columns: [0, 1], getValue: (c) => (c === 1 ? '77' : 'x') }] }) })
  };
  const runtime = { executionContext: 'USERINTERFACE', ContextType: { USER_INTERFACE: 'USERINTERFACE' }, getCurrentScript() { return { getParameter() { return null; } }; } };
  const error = { create: (o) => Object.assign(new Error(o.message), { name: o.name }) };
  const r = cargar('crt', rev, NOMBRES_CRT, (log) => [log, record, search, runtime, error, {}, {}, {}]);
  return { ...r, calls };
}
const A = crt(REV.crt.antes), D = crt(REV.crt.despues);
for (const n of [2000500, 1000000, 2500000, 3000000]) fila(`A8 getNumberLiteral(${n})`, A.t.getNumberLiteral(n).trim(), D.t.getNumberLiteral(n).trim());
for (const X of [A, D]) { X.logs.length = 0; X.r6 = X.t.getNumberLiteral('abc'); X.l6 = JSON.stringify(X.logs); }
fila('A6 retorno con entrada invalida', A.r6, D.r6);
fila('A6 log', A.l6, D.l6);
for (const X of [A, D]) { try { X.t.validarEdicionUruResguardo(true, 'customtransaction_l598_resguardos', 'edit', 5); X.a1 = 'no lanza (validacion muerta)'; } catch (e) { X.a1 = 'lanza ' + e.name; } }
fila('A1 editar Resguardo usado (UI)', A.a1, D.a1);
for (const X of [A, D]) { X.logs.length = 0; X.calls.del.length = 0; X.t.eliminarDetallesDeUruRetencion({ getValue: () => 9, getLineCount: () => 2, getSublistValue: (o) => 100 + o.line }); X.a2 = JSON.stringify(X.calls.del.map((x) => x.id)); X.l2 = X.logs[0] ? X.logs[0].slice(-45) : '(sin error)'; }
fila('A2 detalles borrados', A.a2, D.a2);
fila('A2 log', A.l2, D.l2);
for (const X of [A, D]) { X.logs.length = 0; X.calls.saved = undefined; X.t.limpiarResguardoEliminado({ id: 50, getLineCount: () => 1, getSublistValue: () => 1 }, 'customtransaction_l598_resguardos'); }
fila('A11 lineas al save (3 iniciales)', A.calls.saved === undefined ? 'save no ejecutado' : A.calls.saved, D.calls.saved === undefined ? 'save no ejecutado' : D.calls.saved);
for (const X of [A, D]) { X.calls.create.length = 0; X.t.calcularGenerarResguardoAutomaticamente('2'); X.a3 = JSON.stringify(X.calls.create[0]); }
fila('A3 filtros con subsidiaria', A.a3, D.a3);

// ---- CDF-A2 ----
console.log('\n=== CDF-A2 envioEmail ===');
function cdf(rev) {
  const sent = [];
  const cfg = { custrecord_l598_conf_fe_log: 'x', custrecord_l598_conf_fe_url_dom: 'd', custrecord_l598_conf_fe_enviar_email: true, custrecord_l598_conf_fe_empleado_notific: 'config@mail' };
  const r = cargar('cdf', rev, ['envioEmail'], () => [{},
    { create: () => ({ run: () => ({ getRange: () => [{ getValue: (k) => cfg[k] }] }) }) },
    new Proxy({ isEmpty }, { get: (t, k) => (k in t ? t[k] : () => null) }),
    { getCurrentUser: () => ({ email: 'user@mail', id: 5 }) }, {}, {}, {}, {},
    { HostType: { APPLICATION: 'a' }, resolveDomain: () => 'h.com', resolveRecord: () => '/r' }, {},
    { send: (o) => sent.push({ to: o.recipients }) }]);
  let thrown = '(ninguna)';
  try { r.t.envioEmail(false, '123', 'Factura', 'A', 'S1', 55, '2', 99, 'msg'); } catch (e) { thrown = `${e.name}: ${e.message}`; }
  return { sent: JSON.stringify(sent), thrown };
}
const ca = cdf(REV.cdf.antes), cd = cdf(REV.cdf.despues);
fila('mails enviados', ca.sent, cd.sent);
fila('excepcion que escapa', ca.thrown, cd.thrown);

// ---- CDF-C2 ----
// Es borrado de codigo SuiteScript 1.0 muerto: no hay funcion que correr, se verifica que no queden
// llamadas nlapi*/nlobj* fuera del comentario de encabezado del archivo.
console.log('\n=== CDF-C2 restos SuiteScript 1.0 ===');
{
  const cuerpo = (rev) => {
    const src = execFileSync('git', ['show', `${rev}:${FILE.cdf}`], { encoding: 'utf8', maxBuffer: 1 << 26 });
    return src.slice(src.indexOf('*/') + 2); // sin el bloque de encabezado
  };
  const cuenta = (rev) => (cuerpo(rev).match(/\b(nlapi\w+|nlobj\w+)/g) || []).length;
  fila('apariciones nlapi*/nlobj* (cuerpo)', cuenta(REV.cdf.antes), cuenta(REV.cdf.despues));
}

// ---- CDF-A8 ----
// Los cambios viven dentro de buscarInformacionFE (miles de lineas): se extrae el texto REAL de cada tramo y se
// ejecuta con variables simuladas. El tramo de los 3 log.error se verifica por conteo (no se puede aislar).
console.log('\n=== CDF-A8 ===');
{
  const REV_A8 = { antes: '72b8474', despues: 'cbe90dc' };
  const fuente = (rev) => execFileSync('git', ['show', `${rev}:${FILE.cdf}`], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const bloqueSubtotal = (src) => {
    const m = src.match(/informacionSubTotal = \{\};[\s\S]*?log\.error\(proceso, mensajeError\);\s*\}/);
    return m ? m[0] : null;
  };
  const correr = (src, descripcionLinea, transImporte) => {
    const bloque = bloqueSubtotal(src);
    if (!bloque) return 'bloque no encontrado';
    const logs = [];
    const utilities = { isEmpty };
    const objetoRespuesta = { detalleSubtotales: [] };
    const fn = new Function('utilities', 'descripcionLinea', 'transImporte', 'objetoRespuesta', 'toFixedOK', 'k', 'idTransaccion', 'proceso', 'log',
      'let informacionSubTotal, errorEncontrado = false, mensajeError = "";\n' + bloque + '\nreturn { errorEncontrado, mensajeError };');
    const r = fn(utilities, descripcionLinea, transImporte, objetoRespuesta, (v) => v, 3, 55, 'p', { error: (_t, m) => logs.push(m) });
    return JSON.stringify({ err: r.errorEncontrado, msg: r.mensajeError.replace(/\s+/g, ' ').trim(), log: logs.length });
  };
  const A = fuente(REV_A8.antes), D = fuente(REV_A8.despues);
  fila('subtotal: desc="X", importe vacio', correr(A, 'X', ''), correr(D, 'X', ''));
  fila('subtotal: desc vacia, importe="5"', correr(A, '', '5'), correr(D, '', '5'));
  fila('subtotal: ambos vacios', correr(A, '', ''), correr(D, '', ''));
  fila('subtotal: ambos con valor', correr(A, 'X', '5'), correr(D, 'X', '5'));
  const cuenta = (src) => (src.match(/log\.error\(proceso, mensaje\);/g) || []).length;
  fila('log.error(proceso, mensaje) restantes', cuenta(A), cuenta(D));
}

// ---- CRT-A10 U1 ----
// invocarSuitelet solo agrega log: devuelve la respuesta cruda y relanza las excepciones de https.post.
// Se ejecuta la funcion REAL con https simulado y se compara contra la revision anterior, que llamaba a https.post directo.
console.log('\n=== CRT-A10 U1 invocarSuitelet ===');
{
  const REV_A10 = { antes: '4728612', despues: '7ac798b' };
  const escenarios = [
    ['200 con body OK', () => ({ code: 200, body: JSON.stringify({ error: false, x: 1 }) })],
    ['200 con {"error":"msg"}', () => ({ code: 200, body: JSON.stringify({ error: 'falla de negocio' }) })],
    ['200 con {error:true,mensaje}', () => ({ code: 200, body: JSON.stringify({ error: true, mensaje: 'sin detalles' }) })],
    ['500 (governance/parse)', () => ({ code: 500, body: 'SSS_USAGE_LIMIT_EXCEEDED' })],
    ['200 con body no JSON', () => ({ code: 200, body: '<html>login</html>' })],
    ['https.post lanza', () => { throw new Error('SSS_REQUEST_TIME_EXCEEDED'); }]
  ];
  const correr = (rev, esc) => {
    const logs = [];
    const record = { Type: { VENDOR_BILL: 'vendorbill' } };
    const https = { post: (o) => esc() };
    const log = { debug() {}, audit() {}, error(t, m) { logs.push(t + ' :: ' + m); } };
    // cargar() inyecta log propio; se pasa https simulado en la posicion 8
    const r = cargar('crt', rev, ['invocarSuitelet', 'getNumberLiteral'], (l) => [l, record, { Operator: {}, createFilter: (o) => o, create: () => ({}) }, { executionContext: 'X', ContextType: {}, getCurrentScript() { return { getParameter() { return null; } }; } }, { create: (o) => new Error(o.message) }, {}, {}, https]);
    if (!r.t.invocarSuitelet) return { existe: false };
    let devuelve, lanza = '(no lanza)';
    try { devuelve = r.t.invocarSuitelet({ nombre: 'Crear Resguardo', url: 'u', body: {}, idTransaccion: 77 }); } catch (e) { lanza = e.message; }
    return { existe: true, devuelve: devuelve ? devuelve.code : devuelve, lanza, log: r.logs.length ? r.logs[0].slice(0, 110) : '(sin log)' };
  };
  for (const [nombre, esc] of escenarios) {
    const d = correr(REV_A10.despues, esc);
    fila(nombre, d.existe ? `devuelve=${d.devuelve} | ${d.lanza}` : 'no existe', d.log);
  }
  // El flujo de las llamadas 3 y 4 depende de JSON.parse(responseSL.body): debe seguir en las mismas dos llamadas.
  const parseos = (rev) => (execFileSync('git', ['show', `${rev}:${FILE.crt}`], { encoding: 'utf8', maxBuffer: 1 << 26 }).match(/JSON\.parse\(responseSL\.body\)/g) || []).length;
  fila('JSON.parse(responseSL.body) (llamadas 3 y 4)', parseos(REV_A10.antes), parseos(REV_A10.despues));
  const posts = (rev) => (execFileSync('git', ['show', `${rev}:${FILE.crt}`], { encoding: 'utf8', maxBuffer: 1 << 26 }).match(/https\.post\(/g) || []).length;
  fila('https.post( directos en el archivo', posts(REV_A10.antes), posts(REV_A10.despues));
}

