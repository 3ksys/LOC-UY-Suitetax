# Bitácora de aplicación — Conexion Directa FE (SS)

Registro de lo **ya aplicado** sobre `L598 - Conexion Directa FE (SS)_REF.js`: qué se cambió, qué verificación se corrió y qué quedó afuera con motivo. Se separó del [informe de análisis](5-conexion-directa-fe-ss.md) para que ese documento se lea rápido.

← [Informe de análisis](5-conexion-directa-fe-ss.md) · [Anexo tipo de CFE](5-conexion-directa-fe-ss-anexo-tipo-cfe.md) · [Registro de aprobaciones](../registro-aprobaciones.md)

---

## 3.bis Unidades aplicadas (2026-09-15)

**Archivo:** `LOC UY/L598 - Conexion Directa FE (SS)_REF.js` · 4362 → 4048 líneas de código (−314: funciones muertas y bloques comentados) · `node --check` ✔ · el original no se tocó.

Entraron **10 completos + 2 parciales** de los 16 IDs del plan: B3, B4, B6, C3, C4, C5, D2, D4, D6/D7 completos; **C1** y **D3** parciales por regla explícita. Afuera: B1, B5, D1 (🔴), B7 (`utilities_REF`), y **B2** y **D5** excluidos en esta pasada (ver §Exclusiones).

### Verificación — lo que se midió

| Chequeo | Resultado |
|---|---|
| Sintaxis | `node --check` OK |
| Alcance | El REF es **subconjunto estricto** del original: de 16 variables libres quedan 7. Cerradas 9 (las 8 de D3 aplicadas + `asientoMultipleVoid`, que vivía en código muerto). Quedan a propósito: `formaPagoNetSuite` (CDF-A1), `isEmpty`/`userActual` (CDF-A2), `codigoMonedaTransaccion` (ver D3). `g`/`gi`/`TRANSACTIONDATE` son falsos positivos del heurístico (flags de regex y texto dentro de strings) |
| Invariantes (código sin comentarios, **original menos las funciones muertas** = REF) | `log.error` 81=81 · `log.audit` 2=2 · `.save(` 6=6 · `.setValue(` 34=34 · `https.` 1=1 · `record.load` 3=3 · `record.create` 2=2 · `lookupFields` 5=5 · `email.send` 1=1 · `file.create/delete/load` 2/2/1 · `render.` 2=2 · `getSublistValue` 40=40 · `getLineCount({…})` 8=8 · **`getLineCount(ident)` 2=2 (CDF-A6 intacto)** · `catch` 18=18 · `parseInt(` 17=17 · `parseFloat(` 367=367 · `toFixedOK` 51=51 · `searchSavedPro` 11=11 · `grabarError(` 24=24 · `formaPagoNetSuite` 1=1 · `codigoPercEncontrado == true` 1=1 (D5 excluido) |
| Diferencias esperadas | `parseFloat(…, 10)` 209→0 (C5) · `.toFixedOK(` 50→0 (C3) · `var` 371→104 (C1) · `l598esOneworld` 2→1 (B3) · `log.debug` 112→103: 8 de B6 + 1 de B4 · `JSON.stringify` 33→29: los 4 de B6 · `return` 27→29: los dos memos de B3/B4 · `companyDateTime2` 3→0 · filtro duplicado 2→1 (D4) · `;;`/`new Array()`/`new Object()` → 0 · `referenciaGloabal` 7→0 y `referenciaGlobal` 4→11 (D7, fusión) |
| Funciones muertas (D2) | Las 4 de 4120-4285 aportaban exactamente lo que faltó: 2 `log.error`, 4 `log.audit`, 1 `save`, 1 `submitFields`, 1 `setValue`, 2 `setCurrentSublistValue`, 1 `record.load`, 3 `catch`, 2 `return`, 3 `searchSavedPro` (2 SS fantasma), 10 `log.debug`, 24 `var` |

### Unidad 1 — mecánicos (C4, C5, D2, D4, D6, D7, B6)

| ID | Qué se hizo | Argumento de equivalencia |
|---|---|---|
| D2 | 4 funciones jamás invocadas eliminadas (`voidJournalPagosMultiples`, `UnapplyInvoices`, `setTimeout` con busy-wait, `getChequesByCustpayment`); `padding_left` duplicada (3621, cuerpo byte-idéntico al de 1346 — hoy ganaba la segunda por hoisting); bloques comentados listados. **Parcial en 2703-2744:** ese rango del informe contenía código vivo (`search.createFilter` en 2710-2714); se borraron solo los sub-rangos comentados | grep: cero llamadas a las 4 funciones |
| C4 | `N/error` y `N/transaction` fuera del `define`. `N/email` se queda (CDF-A2) | Los 12 `error.message` son el parámetro del `catch`, no el módulo (verificado uno a uno); `transaction.` solo aparecía en la función muerta |
| C5 | `parseFloat(x, 10)` → `parseFloat(x)`: **356** sitios (209 del regex simple + 147 con paréntesis anidados). **`parseInt(x, 10)` intacto** (ahí el radix es correcto) | `parseFloat` tiene un solo parámetro |
| D4 | Segundo `push` idéntico del filtro `custrecord_l598_prov_fe_comp_dgi_tip_com` eliminado | El mismo filtro dos veces con AND es idempotente |
| B6 | 5 `log.debug` por línea dentro del loop de artículos + `JSON.stringify` de `loadSearch` (2729), `resultadoIndividual` (3372), `objetoRespuesta` (3601) | Logs; ninguno alimenta datos. **83 `log.error` y 6 `log.audit` textuales** (81/2 tras quitar los del código muerto) |
| D6 | 25 `log.debug` sin el marcador `LINE NNN` (12 vivos + 13 comentados). Quedan 26 marcadores, **todos dentro de `log.error`**, que no se tocan | Solo texto de debug |
| D7 | 3 `;;`, 6 `new Array()`, 13 `new Object()`, 7 `referenciaGloabal` → `referenciaGlobal` | ⚠️ **El rename es una fusión:** ya existía `var referenciaGlobal` (2674, leída en 2923). `referenciaGloabal` (3376, leída en 3390/3392) se inicializaba con **la misma expresión** `nvl(resultadoIndividual.getValue({name: columns[47]}), '')` sobre el mismo `resultadoIndividual`, sin otra escritura entre medio. Las lecturas posteriores reciben el mismo valor. Verificado sobre las 11 apariciones |

### Unidad 2 — B3, B4, C3

| ID | Qué se hizo | Argumento de equivalencia |
|---|---|---|
| B3 | `esOneworld()` local con memo de módulo, reseteado como **primera sentencia** de `beforeLoad` y `afterSubmit`; reemplaza las 2 llamadas a `utilities.l598esOneworld()` | Búsqueda sin efectos sobre una constante de cuenta. Ahorra **1 búsqueda por `afterSubmit`** |
| B4 | `obtenerTimezoneEmpresa()` con memo por ejecución; `companyDateTime2` y su log eliminados | `config.load(COMPANY_INFORMATION).getText('timezone')` no cambia dentro de una ejecución. Se llamaba en **cada** `grabarError` (24 sitios) |
| C3 | `Number.prototype.toFixedOK` → `toFixedOK(valor, decimales)`, fórmula byte-idéntica; 50 usos | **Ningún caso de precedencia**: los 50 receptores son `parseFloat(…)` o un grupo `(…)` parentizado. A diferencia de CRT, acá no había `a * b.toFixedOK()` |

### Unidad 3 — D3: 11 de 12 fugas al scope global cerradas

Regla: `let` **al inicio de la función** (no del bloque: un `let` dentro de un loop se recrea por iteración y un global no), solo si todas las apariciones están en una función y ninguna lectura puede preceder a la primera escritura.

| Variable | Decisión | Por qué |
|---|---|---|
| `importeNoFacturable`, `cantidadLineas` (afterSubmit 734-735) | `let` en `afterSubmit` | Escritura sin lectura; `buscarInformacionFE` tiene `var` propios (1810, 1962) que sombrean al global |
| `currentDateTime` (parseDate) | `let` | Escritura 1335 → lecturas 1338 |
| `columnaAcumIndFacturacionDescRec`, `porcentajeParaAplicar`, `infoPercepcion`, `informacionLinea`, `informacionSubTotal`, `infoRetencion` | `let` al inicio de `buscarInformacionFE` | Cada escritura precede a sus lecturas en el mismo camino |
| `costoEnvio`, `CostoManipulacion` | `let` al inicio; **la asignación `= ""` queda textual** | CDF-A5 intacto |
| **`codigoMonedaTransaccion`** | **No se tocó** | Se escribe en 1768/1770 **dentro** del `if` de 1766 y se lee en 1777/1779 **fuera**. Hoy, con `monedaTransaccion` vacía, la 1777 lanza `ReferenceError` que cae en el catch general ("Excepción al buscar información de la transacción"). Con `let` daría `undefined` → `isEmpty` → rama "Falta Configurar Moneda…". **Cambia el mensaje grabado en el log FE.** Es un bug real (hallazgo nuevo, candidato a Grupo A) |

### Unidad 4 — C1: 267 de 397 `var` convertidos, a propósito

`const` ×175 · `let` ×92. Regla: convertir **in situ** solo si todas las apariciones están en el mismo bloque que la declaración, ninguna antes de la línea de declaración, y no hay otra `var` del mismo nombre en la función. Auditado: 0 reasignaciones sobre `const`, 0 `let` sin inicializador dentro de un cuerpo de loop.

Quedan **104 `var`**, cada uno con motivo: 33 nombres redeclarados en la misma función (incluye los casos de hoisting del informe: `montoItem`, `mensaje`), 5 con uso fuera del bloque de declaración, 1 que colisiona con un parámetro (`fecha` en `formatDateDGI`), 2 prohibidos por Grupo A (`tipoSublistaConsultar`, `sublistaRefCFE`), 14 en `envioEmail` (CDF-A2, función excluida entera). Cuadre: 397 − 24 (muertas) − 2 (`padding_left`) − 267 = 104.

### Exclusiones que no estaban en el plan

- **B2 — `record.load` → `lookupFields` en `beforeLoad`.** `beforeLoad` lee 3 campos con `getText()` y 4 con `getValue()`. `lookupFields` devuelve `[{value, text}]` para los select y `[]` para vacíos — y `utilities.isEmpty([])` es **false**. Sin las definiciones de los 7 campos en la cuenta no se puede probar equivalencia. **Nueva duda abierta:** tipos de `custbody_l598_cae`, `_trans_interna`, `_documento_xml_fe`, `_sucursal`, `_tipo_comprobante`, `_serie_comprobante` y `shipstatus`.
- **D5 — `codigoPercEncontrado == true` → `=`.** Su "byte-idéntico" depende de que los códigos del acumulador sean únicos: un supuesto de datos, no una propiedad del código. Es una corrección de bug → va al [registro](../registro-aprobaciones.md) como CDF-D5, igual que ARI-B3.

### Hallazgos nuevos durante el refactor (no corregidos)

- `codigoMonedaTransaccion` (ver D3): lectura fuera del `if` que la escribe → `ReferenceError` con moneda vacía. Bug real que hoy se manifiesta como un mensaje de error engañoso.
- `log.error(proceso, mensaje)` en el loop de resguardos (2894, 2902, 2919) loguea `mensaje` en vez de `mensajeError` — confirma **CDF-A8**.
- Marcadores desincronizados también en **títulos** de `log.debug` (`"Line 3187"`, `"line 2048 flag"`, `'Log 2519 flag'`, `"Linea 2559"`); D6 solo hablaba del texto.
- `log.debug` de 2745 hace `JSON.stringify(searchResult)` del resultado paginado (hasta 1000 filas); mismo tipo de costo que B6, no listado.
- El módulo `log` se usa como global sin importarlo en el `define` (funciona en 2.x; inconsistente con el resto del repo).
- Bloque comentado 2758-2761 quedó huérfano tras borrar 2736-2744.

### Pendiente

- [ ] Deploy aislado (Status `Testing`, Audience rol de pruebas) — necesita inventario de deployments (duda #7 del informe) y los logs de context filtering (CDF-A7).
- [ ] Caracterización: **Remito** (21.6s, el pico) y Factura de Venta nuevas — nunca re-guardar las bloqueadas por CAE 100000. Comparar **JSON y XML persistidos byte a byte** (el output se genera al guardar, sin CAE).
- [ ] Medición GU: esperado ahorro **real pero acotado** — 1 búsqueda por `afterSubmit` (B3) y 1 `config.load` por cada log FE (B4, hasta 24 por guardado). El salto es B1 (🔴).
