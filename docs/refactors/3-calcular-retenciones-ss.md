# Informe de Análisis — Calcular Retenciones (SS)V2

**Script:** `L598 - Calcular Retenciones (SS)V2` · **Archivo:** `LOC UY/L598 - Calcular Retenciones (SS)V2.js` · **LOC:** 2431
**Tipo:** UserEvent 2.1 · **Entry points declarados (`return{}`, líneas 2425-2429):** `beforeLoad` + `beforeSubmit` + `afterSubmit` → **×3**
**Módulo:** Retenciones (Compras) · **Toca impuestos:** sí 💰 · **Tiempo medido:** Factura de Compra **5.4s ×3** · Resguardo **0.8s ×3**
**Estado:** análisis PRE-refactor (ningún cambio aplicado). Sufijo `V2` = versión histórica preexistente, sin relación con `_REF`.

> Salvo indicación en contrario, toda referencia `N` de línea es de `LOC UY/L598 - Calcular Retenciones (SS)V2.js`.

---

## 1. Resumen

Es la **cabecera del cálculo de retenciones** (IRPF/IRNR/IRAE/IVA) sobre Facturas y Créditos de proveedor. En `beforeLoad` (view de `vendorbill`/`vendorcredit`) decide si muestra el botón manual "Calcular Retenciones" (859-916). En `afterSubmit` (create/edit con `custbody_l598_cal_ret_auto`), ejecuta la Saved Search `customsearch_l598_transaction_det_ret`, delega el cálculo por línea vía `https.post` al Suitelet `customscript_l598_calcular_ret_v2`, y con la respuesta **crea la transacción URU-Retención** con sus asientos (débito/crédito) y detalle por tipo de impuesto (1107-1556); luego, según configuración, encadena 3 POST más: crear detalle acumulado, crear Resguardo automático y aplicar la retención como pago de factura (1562-1670). En `beforeSubmit` valida ediciones de URU-Retención/Resguardo, limpia vínculos al borrar, y sobre Resguardos setea monto escrito, serie/sucursal/caja y tipo de comprobante FE (2003-2367). Es el script fiscal más grande del repo y el núcleo del flujo de retenciones de compras.

| Métrica | Valor |
|---|---|
| LOC / funciones | 2431 / 20 (3 entry points + 17 auxiliares) |
| Tamaño `afterSubmit` / `beforeSubmit` | ~1072 líneas (927-1998) / ~365 líneas (2003-2367) |
| Sitios `search.create/load` | 14 (2 con Saved Search cargada por id) |
| `search.lookupFields` | 7 |
| `https.post` a Suitelets (síncronos, en `afterSubmit`) | **4** (1055, 1567, 1642, 1666) |
| `record.create/load/save/submitFields` | 1 / 3 / 3 / 4 (uno dentro de loop, 2197) |
| Bloques duplicados IRPF/IRNR/IRAE/IVA | 4 × ~100 líneas (1138-1546) |
| APIs 1.0 vivas | **0** — todos los restos `nlapi*`/`getLineItemCount` están comentados (ver C4) |

---

## 2. Hallazgos

### Grupo A — Correctitud (NO entran al refactor; recomendación + aprobación Tekiio)

| ID | Hallazgo | Evidencia | Riesgo |
|---|---|---|:--:|
| CRT-A1 | La validación ERR002 (bloqueo de edición de Resguardos ya usados en retención) compara `runtime.executionContext == "userinterface"` en **minúsculas**; el enum documentado es `'USERINTERFACE'` (el bloque gemelo ERR001 usa el enum correcto en 2019). La condición nunca es verdadera → **validación muerta** (inferencia sobre valor del enum, documentado por NetSuite). | 2031 vs 2019 | 🔴 |
| CRT-A2 | Al borrar una URU-Retención se invoca `objRecord.delete("customrecord_l598_ret_detalle", id)`: **`Record` no tiene método `delete`** (es `record.delete({type,id})` a nivel módulo). Cada iteración lanza TypeError, absorbido por el catch que solo loguea → los URU-Retención Detalle **nunca se borran** por esta vía (efecto runtime = inferencia de alta confianza; confirmable con el log "Ocurrio un error al borrar URU-Retencion Detalle…"). | 2101-2110 | 🔴 |
| CRT-A3 | `calcularGenerarResguardoAutomaticamente` y `aplicarRetencionFacturaAutomaticamente` arman filtro plano `["isinactive","is","F"]` y con subsidiaria hacen `filters.push("campo","is",subsidiaria)` → array plano de 6 elementos, **expresión de filtro inválida**. En OneWorld (subsidiaria no vacía, línea 1080) la búsqueda falla → el catch la absorbe y el Resguardo/pago automático no se genera. Coincide con priorización (`docs/priorizacion-scripts.md:281`). | 2371-2375, 2399-2403 | 🔴 |
| CRT-A4 | Default **abierto** en ambas funciones de configuración: se inicializa `"F"` (string) y la condición final `!isEmpty(x) && x` evalúa `"F"` como *truthy* → si **no existe** registro `customrecord_l598_conf_proc_ret`, devuelven `true` (auto-generar resguardo / auto-aplicar pago) en vez de `false` (inferencia: depende de que la búsqueda no devuelva filas). | 2370+2386-2394, 2398+2414-2422 | 🔴 |
| CRT-A5 | En el armado del JSON del Resguardo automático, los fallbacks asignan el **objeto completo** de `search.lookupFields` en vez del escalar (`.address1`, `.city`, `.country`, `.zipcode`); ídem `origenRetencion` recibe el objeto `{recordtype:…}` entero. El SL `crear_resguardo` recibe un objeto serializado como dirección/ciudad/país/CP fiscal. Coincide con priorización (`docs/priorizacion-scripts.md:280`). | 1605, 1607, 1609, 1611, 1619-1620 | 🔴 |
| CRT-A6 | Manejo de errores roto en el monto escrito: `getNumberLiteral` llama `alert(...)` (API de navegador inexistente server-side, línea 223) y los tres `catch` de `letras`/`getNumberLiteral`/`getNumeroEnLetras` loguean `error.message` — **`error` es el módulo N/error**, no la excepción `err` → todo error se loguea como "Detalles: undefined", perdiendo la causa real. | 223; 195-197, 314-316, 405-407 | 🔴 |
| CRT-A7 | `getRange({start:0,end:1000})` **sin paginación** consumiendo todas las filas esperadas: detalle de retenciones del Resguardo (JSON impreso) y detalle al borrar Resguardo; también la búsqueda de ERR002. Con >1000 líneas se pierden filas en silencio (retenciones que no vuelven a "Pendiente", JSON incompleto). Coincide con priorización (`docs/priorizacion-scripts.md:282`). | 1954-1961, 2165-2168, 2053-2056 | 🔴 |
| CRT-A8 | En `getNumberLiteral`, la condición `if (mdata != "\t")` compara contra un **tab literal** (siempre verdadera; presumible intención `!= ""`): para montos ≥1M con miles=0 (p.ej. 2.000.500) concatena `" MIL "` espurio en el monto escrito del Resguardo (inferencia; requiere caso de prueba). | 287-292 | 🔴 |
| CRT-A9 | En el armado del JSON de detalle del Resguardo, `value.indexOf(...)` se invoca **antes** del guard `(value) ? value : ""`: una columna agrupada nula produce TypeError → catch → `custbody_l598_resguardo_ret_det_json` queda sin setear (inferencia según datos). | 1977-1983 | 🔴 |
| CRT-A10 | Los 4 `https.post` a Suitelets son **síncronos, encadenados y sin validar respuesta** (ni `response.code` ni `body.error`); hasta 5 ejecuciones de script por guardado, con fallas downstream silenciosas. Además en 1571 se parsea `response.body` (respuesta del **primer** SL) donde correspondería `responseSLDetalle` — hoy inocuo porque la variable no se usa. Coincide con priorización (`docs/priorizacion-scripts.md:285`). Cualquier consolidación es decisión arquitectónica del cliente. | 1050-1058, 1562-1571, 1636-1646, 1661-1670 | 🔴 |
| CRT-A11 | Al borrar un Resguardo, la limpieza de la sublista RefCFE hace `removeLine(sublista, 1)` con **índice fijo 1** (posicional, resto de migración 1.0 con base-1; 2.0 es base-0) dentro de un loop de N iteraciones: la última iteración referencia una línea inexistente → excepción → catch → el `save()` de limpieza **no se ejecuta** (inferencia de alta confianza; verificar logs "Ocurrio un error al borrar URU-Informacion Referencia…"). | 2223-2235 | 🔴 |
| CRT-A12 | El seteo de `custbody_l598_fecha_venc_retenc` corre solo para `recType == "vendorbill"`, pero el mensaje del catch dice "creando/editando VendorBill/VendorCredit": cobertura de `vendorcredit` a confirmar como decisión u omisión. | 2075-2087 | 🔴 |
| CRT-A13 | **Criterio #8 (solo sugerencia):** el bloque "SETEO DE CAMPO URU-DETALLE RETENCION JSON" hace `record.load()`+`save()` del mismo Resguardo dentro de `afterSubmit` (CREATE/COPY); conceptualmente es candidato a `beforeSubmit` sobre `newRecord`, eliminando load+save. Cambio de entry point → se registra como sugerencia y se notifica a Tekiio. | 1851-1996 (load 1858-1861, save 1989) | 🔴 |

### Grupo B — Governance / Performance (SÍ entran)

**Mapa de costos por flujo** (todas las operaciones verificadas en código):

| Flujo | Operaciones | Líneas |
|---|---|---|
| **Ver** VB/VC (`beforeLoad`, cada visualización) | 1 `search.load`+run de `customsearch_l598_transaction_det_ret` (≥28 columnas) + lectura de parámetro | 866-875, 913 |
| **Guardar** VB/VC con auto (`afterSubmit`) | `esOneworld` (search) + SS ≥28 col + **POST SL cálculo** + `record.create`+`save` URU-Retención + **POST SL detalle** + `submitFields` link + search config + `record.load` retención + 5 `lookupFields` + **POST SL resguardo** + search config + **POST SL pago** | 971, 978-991, 1055, 1107/1556, 1567, 1576, 2377, 1587, 1605-1619, 1642, 2405, 1666 |
| **Guardar** cualquier tipo (`beforeSubmit`) | `esOneworld()` **incondicional** en cada ejecución, aunque solo lo usan las ramas de Resguardo | 2256-2259 |
| **Crear Resguardo** (`beforeSubmit`) | ~8 búsquedas + 2 lookups secuenciales: monto escrito, `esOneworld` (de nuevo, vía `obtenerSucursal` 596), datos impositivos ×2, sucursales, caja, tipo trans NS, tipo trans local, tipos comprobante | 341-348, 450-459, 545-552, 604-608, 647-656, 735-742, 808-815, 2326-2330 |
| **Crear Resguardo** (`afterSubmit`) | `record.load` + search agrupada de detalle + `record.save` (campo JSON) | 1858-1861, 1954-1961, 1987-1989 |
| **Borrar Resguardo** (`beforeSubmit`) | SS + dedup O(n²) + `submitFields` **por retención en loop** + `record.load` + loop `removeLine` + `save` | 2149-2168, 2182-2184, 2189-2208, 2211-2231 |

| ID | Hallazgo | Evidencia | Riesgo |
|---|---|---|:--:|
| CRT-B1 | **Prioritario (criterio v2-b/c):** `customsearch_l598_transaction_det_ret` con ≥28 columnas y acceso **posicional** (`columns[12..17]` en beforeLoad; `columns[1..26]` vivo y `columns[27]` comentado en afterSubmit) se ejecuta en cada view y cada save de VB/VC → candidata a **SuiteQL** con `SELECT` específico (o, mínimo, columnas nombradas). Reordenar la SS en la cuenta hoy rompe el script sin error de compilación. | 866-895, 978-1027 | 🔴 |
| CRT-B2 | `esOneworld()` se ejecuta hasta 3 veces por flujo sin caché (afterSubmit 971, beforeSubmit 2258 —incondicional—, obtenerSucursal 596) y usa `getRange({end:1000})` para un chequeo de existencia (bastaría `end:1`). | 566-591, 971, 2256-2259, 596 | 🟡 |
| CRT-B3 | En DELETE de Resguardo: dedup **O(n²)** con `filter+indexOf` y `record.submitFields` dentro de loop (1 write por retención; el write es necesario, el O(n²) no). | 2182-2184, 2189-2208 | 🟡 |
| CRT-B4 | Bloque JSON del Resguardo: `record.load` + `save()` completo para setear **un solo campo** (`custbody_l598_resguardo_ret_det_json`) → `submitFields` reduce costo sin cambiar el resultado (el load sigue siendo necesario para leer la sublista). Complementario —no sustituto— de la sugerencia CRT-A13. | 1858-1861, 1987-1989 | 🟡 |
| CRT-B5 | Cascada de búsquedas de configuración por cada Resguardo creado (~8 búsquedas secuenciales, ver mapa): consolidar/cachear lecturas de `customrecord_l598_datos_impositivos_emp` (hoy se consulta 3 veces por flujo: 341, 450, 579) manteniendo resultados idénticos. | 422-627, 2284-2366 | 🟡 |

### Grupo C — Estándares 2.1 (SÍ entran)

| ID | Hallazgo | Evidencia | Riesgo |
|---|---|---|:--:|
| CRT-C1 | Mezcla `var`/`let`/`const`: los bloques más nuevos (acumulado, resguardo automático, config) usan `var` extensivamente, incluso re-declarando (`var arrayRetencion` en cada rama, `var objRecord` ver D6). | 932, 1093, 1223, 1325, 1427, 1530, 1558-1571, 1586-1670, 2370-2415 | 🟢 |
| CRT-C2 | Firmas posicionales tipo 1.0 en APIs 2.x: `getParameter("custscript…")` sin objeto `{name}`, `getSublistValue(sublista, campo, i)` posicional. Normalizar a options object sin cambiar semántica. (El `removeLine(sublista, 1)` de 2224 se **excluye**: su semántica está bajo CRT-A11.) | 415, 1627, 1873 | 🟢 |
| CRT-C3 | `eval(c)/eval(d)/eval(u)` en `letras()`: los argumentos ya son números (`parseInt` aguas arriba), `eval` de un no-string devuelve el argumento → reemplazo directo equivalente. | 34-36 | 🟡 |
| CRT-C4 | Restos SuiteScript 1.0 **solo en comentarios** (verificado: 0 llamadas 1.0 vivas): bloques muertos con `nlapiDeleteRecord`/`nlapiLogExecution`/`nlapiSubmitRecord` y el patrón `getLineItemCount` comentado que menciona `docs/priorizacion-scripts.md:289` — confirmado en línea 2225. Eliminarlos. | 929, 952-965, 2044, 2145, 2171, 2186, 2196, 2220, 2225, 2227-2232, 2238-2253 | 🟢 |
| CRT-C5 | `Number.prototype.toFixedOK` extiende el prototipo nativo y se usa en redondeo de montos fiscales → mover a función de módulo **con fórmula byte-idéntica** (mismo patrón señalado en `L598 - Descuento por Cuenta Ajena`). | 19-22 (usos: 1147-1148, 1169-1170, 1550-1553, 2266, etc.) | 🟡 |

### Grupo D — Mantenibilidad (SÍ entran)

| ID | Hallazgo | Evidencia | Riesgo |
|---|---|---|:--:|
| CRT-D1 | 4 bloques casi idénticos IRPF/IRNR/IRAE/IVA (~100 líneas c/u) que postean asientos + detalle → helper parametrizado. Es la función fiscal más crítica: reestructurar el posteo de montos exige caracterización exhaustiva (coincide con `docs/priorizacion-scripts.md:286`). | 1138-1240, 1244-1341, 1345-1444, 1448-1546 | 🔴 |
| CRT-D2 | `isEmpty` e `isEmptyOK` son **funcionalmente idénticas** (mismos 5 chequeos en distinto orden) → unificar. | 8-16 | 🟢 |
| CRT-D3 | Dead code: sentencia suelta `999123456789;` (254), asignaciones nunca usadas `newRetencion` (1571, 1646) y `newVendorPayment` (1670), bloque comentado de borrado de retención (952-965). | 254, 952-965, 1571, 1646, 1670 | 🟢 |
| CRT-D4 | Logs de depuración personales y de volcado: `"braian9"`, `"braian buscando error campos faltantes resguardo"` (incluye `JSON.stringify(objRecord)` completo), `"LINE 765"/"LINE 934"` con números de línea desactualizados, dumps de JSON. | 1133, 2292-2297, 1855, 1885, 1561, 1635-1641 | 🟢 |
| CRT-D5 | ~20 variables sin declarar en `getNumberLiteral` (`rm0, m1…m3, r1…r8, tmp, tmp1, tmp2, tmpn1, tmpn2, pred, mldata, hlp, mdata, cdata`), envueltas en `/* eslint-disable */` → global leaks. La función es recursiva (262-263): declarar locales requiere verificación (análisis preliminar: sin dependencia real entre niveles de recursión). | 226-313 | 🟡 |
| CRT-D6 | `var objRecord` de `afterSubmit` (newRecord, 932) es **re-declarado/reasignado** con la URU-Retención cargada (1587) — shadowing confuso en función de 1000+ líneas; renombrar la segunda. | 932, 1587 | 🟢 |
| CRT-D7 | Funciones fuera de todo lineamiento: `afterSubmit` ~1072 líneas / 8+ niveles de anidamiento; `beforeSubmit` ~365 líneas con 7 responsabilidades distintas; extraer sub-funciones por bloque (validaciones, delete, monto escrito, comprobante FE, JSON resguardo). | 927-1998, 2003-2367 | 🟡 |
| CRT-D8 | `obtenerTipoTransaccionLocal` se declara con 2 parámetros pero se invoca con 3 (`subsidiaria` se ignora en silencio → la búsqueda de tipo local no filtra por subsidiaria). Alinear firma y **documentar**; agregar el filtro sería cambio de comportamiento (Grupo A). | 765 vs 2349 | 🟢 |
| CRT-D9 | `beforeLoad` recorre todos los resultados de la SS sobrescribiendo las mismas variables (decide con la **última** fila), mientras `afterSubmit` usa `results[0]` (la **primera**) — simplificar preservando la semántica actual de cada uno. | 887-895 vs 996 | 🟢 |

---

## 3. Plan de Cambios propuesto (solo B/C/D)

Ordenado por criterio #1→#6. Todo en estado ⏳ Propuesto; los 🔴 no se aplican sin aprobación registrada.

| Criterio | ID | Qué se modifica | Riesgo | Estado |
|---|---|---|:--:|:--:|
| #2 Governance | CRT-B1 | SS `customsearch_l598_transaction_det_ret` (≥28 col, acceso posicional) → SuiteQL con SELECT específico o columnas nombradas | 🔴 | ⏳ Propuesto |
| #2 Governance | CRT-B2 | Cachear `esOneworld()` por ejecución; condicionar la llamada incondicional de 2256-2259; `getRange` de existencia → `end:1` | 🟡 | ⏳ Propuesto |
| #2 Governance | CRT-B3 | Dedup O(n²) → `Set` O(n) en DELETE de Resguardo | 🟡 | ⏳ Propuesto |
| #3 Performance | CRT-B4 | `save()` completo → `submitFields` de 1 campo en el bloque JSON del Resguardo | 🟡 | ⏳ Propuesto |
| #3 Performance | CRT-B5 | Consolidar/cachear cascada de búsquedas de configuración del Resguardo (3 lecturas de `datos_impositivos_emp` por flujo) | 🟡 | ⏳ Propuesto |
| #4 Patrones | CRT-C3 | Eliminar `eval()` en `letras()` (uso directo equivalente) | 🟡 | ⏳ Propuesto |
| #4 Patrones | CRT-C2 | Firmas posicionales → options object (sin tocar `removeLine` de 2224, reservado a CRT-A11) | 🟢 | ⏳ Propuesto |
| #4 Patrones | CRT-C4 | Eliminar restos 1.0 comentados y bloques muertos | 🟢 | ⏳ Propuesto |
| #4 Patrones | CRT-C1 | `var` → `const`/`let` | 🟢 | ⏳ Propuesto |
| #5 Legibilidad | CRT-D1 | Consolidar 4 bloques IRPF/IRNR/IRAE/IVA en helper parametrizado (posteo fiscal: requiere aprobación + caracterización exhaustiva) | 🔴 | ⏳ Propuesto |
| #5 Legibilidad | CRT-D7 | Extraer sub-funciones de `afterSubmit`/`beforeSubmit` | 🟡 | ⏳ Propuesto |
| #5 Legibilidad | CRT-D5 | Declarar variables implícitas de `getNumberLiteral` (verificando recursión) | 🟡 | ⏳ Propuesto |
| #5 Legibilidad | CRT-D2 | Unificar `isEmpty`/`isEmptyOK` | 🟢 | ⏳ Propuesto |
| #5 Legibilidad | CRT-D3 | Eliminar dead code (254, 1571, 1646, 1670, 952-965) | 🟢 | ⏳ Propuesto |
| #5 Legibilidad | CRT-D4 | Limpiar logs personales/dump (conservar `log.error`) | 🟢 | ⏳ Propuesto |
| #5 Legibilidad | CRT-D6 | Renombrar `objRecord` reasignado (1587) | 🟢 | ⏳ Propuesto |
| #5 Legibilidad | CRT-D8/D9 | Alinear firma `obtenerTipoTransaccionLocal`; simplificar loop de `beforeLoad` preservando semántica "última fila" | 🟢 | ⏳ Propuesto |
| #6 Reutilización | CRT-C5 | `toFixedOK` prototype → función de módulo (fórmula byte-idéntica) | 🟡 | ⏳ Propuesto |

**Matriz de riesgo:** 🔴 2 (CRT-B1, CRT-D1 — requieren aprobación explícita) · 🟡 7 (B2-B5, C3, C5, D5, D7 — revisión conjunta) · 🟢 9.

---

## 4. Recomendaciones Grupo A (fuera del refactor — requieren aprobación Tekiio)

| ID | Impacto de negocio | Por qué requiere aprobación |
|---|---|---|
| CRT-A1 | Hoy se pueden editar Resguardos ya considerados en una URU-Retención sin bloqueo: integridad del encadenamiento fiscal. | Corregir la comparación **activa** una validación que hoy no corre → nuevo comportamiento visible (error ERR002 al usuario). |
| CRT-A2 | Los URU-Retención Detalle quedan huérfanos al borrar una URU-Retención (más ruido de log por línea). | Arreglarlo empieza a **borrar registros** que hoy sobreviven; impacto en reportes/históricos a validar. |
| CRT-A3 + CRT-A4 | En OneWorld el Resguardo/pago automático falla en silencio (A3); sin registro de configuración, el default queda **habilitado** (A4). Juntos definen si el flujo automático corre o no. | Cambian el resultado del flujo automático (crear o no crear Resguardo/pago). Necesita definición funcional de cuál es el comportamiento esperado por subsidiaria. |
| CRT-A5 | Datos fiscales del Resguardo (dirección/ciudad/país/CP, origen) pueden viajar como objeto serializado al SL de creación. | Corregir la extracción cambia el contenido de campos fiscales emitidos. |
| CRT-A6 + CRT-A8 | Monto escrito del Resguardo: errores silenciados con "undefined" y texto "MIL" espurio en montos ≥1M con miles=0 (documento impreso/CFE). | Altera el texto fiscal generado; validar con casos reales antes de tocar. |
| CRT-A7 + CRT-A9 | Pérdida silenciosa de filas >1000 y JSON de detalle no seteado ante columnas nulas. | Paginar/guardar cambia resultados en volúmenes altos (comportamiento observable). |
| CRT-A10 | Arquitectura de hasta 5 ejecuciones encadenadas síncronas sin validación de respuesta: lentitud (5.4s medidos) y fallas downstream invisibles. | Consolidar Suitelets o validar respuestas es un cambio arquitectónico/contractual — decisión del cliente. |
| CRT-A11 | La limpieza de referencias CFE al borrar Resguardos probablemente nunca completa su `save()`. | Corregir índice/semántica de `removeLine` cambia el estado resultante del borrado. |
| CRT-A12 | `vendorcredit` no recibe fecha de vencimiento de retención en `beforeSubmit` (el fallback de 941 la cubre parcialmente). | Confirmar si es decisión u omisión antes de ampliar cobertura. |
| CRT-A13 | Criterio #8: mover el bloque JSON del Resguardo de `afterSubmit` (load+save) a `beforeSubmit` eliminaría una escritura completa — principal ahorro de GU/tiempo del flujo Resguardo. | Cambio de entry point: solo sugerencia, impacto funcional no evidente (disponibilidad de ids de detalle en CREATE a verificar en cuenta). |

---

## 5. Dependencias y alcance

**Imports (línea 5):** solo módulos nativos — `N/log, N/record, N/search, N/runtime, N/error, N/format, N/url, N/https`. Sin módulos locales en el `define`.

**Scripts que invoca / referencia (misión 1 — evidencia para Tekiio):**

| Referencia en el código | Líneas | Archivo en repo | Vínculo verificado |
|---|---|---|---|
| `form.clientScriptModulePath = "./L598 - Calcular Retenciones (LIBS)V2.js"` (botón manual) | 909 | **NO EXISTE en el repo** | Debe existir en el File Cabinet de la cuenta (el botón lo requiere) → **archivo faltante en el repo** |
| Suitelet `customscript_l598_calcular_ret_v2` / `customdeploy1` (POST `informacionPago`) | 1050-1058 | `LOC UY/L598 - Calcular Retenciones (SL)V2.js` | El SL consume `request.parameters.informacionPago` (SL:1257) — inferencia fuerte por payload |
| Suitelet `customscript_l598_crear_ret_detalle_slv2` / `customdeploy_l598_crear_ret_detalle_slv2` (POST `newRetencion`) | 1562-1570 | `LOC UY/L598 - Crear Retencion Detalle (SL)V2.js` | El SL consume `request.parameters.newRetencion` (SL:12) |
| Suitelet `customscript_l598_crear_resguardo_sl_v2` / `customdeploy_l598_crear_resguardo_sl_v2` (POST `newResguardo`) | 1636-1645 | `LOC UY/L598 - Crear Resguardo (SL)V2.js` | El SL consume `request.parameters.newResguardo` (SL:11) |
| Suitelet `customscript_l598_crear_pago_factura_slv` / `customdeploy_l598_crear_pago_factura_slv` (POST `pagoFactura`) | 1661-1669 | `LOC UY/L598 - Crear Pago Factura (SL)V2.js` | El SL consume `request.parameters.pagoFactura` (SL:10) |

Sobre **"L598 - Calcular Ret. Lineas (SS)"** (demo Tekiio, [demo-tekiio-flujos-y-scripts.md](../analisis/demo-tekiio-flujos-y-scripts.md)): este script **no referencia** ningún id con ese nombre. Toda la cadena queda cubierta por los 4 Suitelets anteriores (todos en repo) + el módulo LIBS **faltante**. Hipótesis a confirmar con Tekiio (inferencia): (a) "Calcular Ret. Lineas" es el nombre del Script record en cuenta del SL de cálculo (que efectivamente calcula por línea) o del SL de detalle; o (b) es el módulo `(LIBS)V2` faltante, con nombre parecido. En cualquier caso, **pedir a Tekiio el archivo `L598 - Calcular Retenciones (LIBS)V2.js` y el mapeo nombre-de-cuenta ↔ archivo**.

**Configuración que habilita automático vs manual (misión 2):**
- `custbody_l598_cal_ret_auto` (checkbox de la transacción): leído en 936, default false en 947-948, **gate del flujo automático** en 951; se resetea cuando no hay datos de retención (1818-1824) y al borrar la retención (2113-2120). Quién lo setea no está en este script (duda abierta).
- **Manual:** botón "Calcular Retenciones" agregado en `beforeLoad` view de VB/VC solo si hay códigos de retención y no hay retención generada (906-915), invocando `calcularRetencionesl598(cuentaContable, permitirPendiente)` del módulo LIBS (909-913).
- `customrecord_l598_conf_proc_ret` (config por subsidiaria): `custrecord_l598_conf_proc_ret_cal_res_au` → auto-generar Resguardo (2369-2395, llamada 1583); `custrecord_l598_conf_proc_ret_ap_ret_fac` → auto-aplicar retención como pago (2397-2423, llamada 1649, solo `vendorbill` 1651).
- Parámetros de script: `custscript_l598_calc_ret_ss_pfp2` = procesar facturas pendientes de aprobación (413-417; gates 1041 y 1096; argumento del botón 913) · `custscript_l598_calc_ret_val_resgret` = activar validaciones ERR001/ERR002 (2009-2026, 2031).

**Saved Searches de cuenta:** `customsearch_l598_transaction_det_ret` (867, 979) · `customsearch_l598_ret_detalle_w_resg` (2047, 2157).
**Tipos de registro procesados (por ramas de código; deployments reales a inventariar en cuenta):** `vendorbill`, `vendorcredit`, `customtransaction_l598_retencion`, `customtransaction_l598_anul_retencion`, `customtransaction_l598_resguardos`. Custom records: `datos_impositivos_emp`, `sucursales`, `tipo_trans_ns`, `tipo_trans_loc`, `tipos_comprobantes`, `ret_detalle`, `conf_proc_ret`; lookups sobre `vendor`, `location`, `transaction`.

---

## 6. Casos de caracterización sugeridos

| # | Caso | Flujo UAT | Qué comparar (original vs `_REF`) |
|---|---|---|---|
| 1 | Factura de compra con retención automática (`cal_ret_auto` activo, estado Aprobada) | **UAT Compras 04 (OK)** | URU-Retención campo a campo: asientos (account/debit/credit/memo/location/department/class), sublista detalle completa, totales por tipo (1550-1553), link en la factura (1576-1582); tiempo/GU vs baseline 5.4s ×3 |
| 2 | NC de compra (`vendorcredit`) con retención | **UAT Compras 07 (OK)** | Rama de signos invertidos: débito/crédito, `indFacturacion=9`, importes negativos (1165-1171 y homólogos) |
| 3 | Factura pendiente de aprobación con `custscript_l598_calc_ret_ss_pfp2` ON y OFF | Compras 04 variante | Gate 1041/1096: con OFF no se genera nada; con ON sí — comportamiento idéntico entre versiones |
| 4 | View de VB/VC con y sin retención ya vinculada | Compras 04 post-guardado | Aparición/no aparición del botón manual (906-915) y sus argumentos |
| 5 | Creación de Resguardo | **UAT 05 — ⚠ Observado por CAE: NO re-guardar el resguardo observado**; caracterizar con un Resguardo de prueba nuevo | `custbody_l598_monto_escrito` (byte a byte), serie/sucursal/caja default, `custbody_l598_tipo_comprobante`, `custbody_l598_resguardo_ret_det_json` (0.8s ×3 baseline) |
| 6 | Monto escrito con bordes | Derivado de UAT 05 | Montos con miles=0 (p.ej. 2.000.500) y con/sin decimales (`usar_d_mont`) — documenta baseline de CRT-A8 **sin** corregirlo |
| 7 | Borrado de URU-Retención y de Resguardo | Flujo de reversa (post Compras 04) | `transtatus='A'` de retenciones, reset de `cal_ret_auto`, y **los mismos errores logueados hoy** (CRT-A2/A11): el `_REF` debe reproducir el comportamiento actual, errores incluidos |

Regla de la metodología §7: elegir casos donde los bugs del Grupo A **no se disparen** (evitar OneWorld+config por subsidiaria para no pisar CRT-A3, y montos que gatillen CRT-A8) para no confundir bug preexistente con efecto del refactor.

---

## 7. Dudas abiertas

1. **¿Qué script de la cuenta es "L598 - Calcular Ret. Lineas (SS)"?** Ninguna referencia con ese nombre en este script; entregar a Tekiio la tabla de §5 y pedir el mapeo Script record ↔ archivo.
2. **Falta `L598 - Calcular Retenciones (LIBS)V2.js` en el repo** (referenciado en 909): pedir el archivo — sin él no se puede analizar ni refactorizar el flujo manual del botón.
3. ¿Quién setea `custbody_l598_cal_ret_auto`? (¿formulario, workflow, otro script?) — define cuándo se dispara el flujo automático.
4. ¿La validación ERR002 funcionó alguna vez? (CRT-A1) ¿Hay expectativa funcional de que bloquee la edición de Resguardos?
5. Confirmar en logs de la cuenta los errores esperados por CRT-A2 ("Ocurrio un error al borrar URU-Retencion Detalle…") y CRT-A11, para convertir las inferencias de runtime en hechos.
6. La SS `customsearch_l598_transaction_det_ret`, ¿devuelve siempre 1 fila por transacción? `beforeLoad` decide con la última fila y `afterSubmit` con la primera (CRT-D9) — con >1 fila podrían decidir distinto.
7. Inventariar los deployments reales del script en la cuenta (tipos de registro y contextos) antes de crear los del `_REF`.
8. Para UAT 05 (Resguardo observado por CAE): confirmar con Tekiio el caso alternativo para caracterizar creación de Resguardo sin re-guardar el observado.
