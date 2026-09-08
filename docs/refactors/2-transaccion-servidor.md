# Informe de Análisis — Transacción (Servidor)

**Script:** `L598 -Transacción (Servidor)` · **Archivo:** `LOC UY/L598 -Transacción (Servidor).js` · **LOC:** 2128
**Tipo:** UserEvent con **3 entry points declarados** (`beforeLoad`, `beforeSubmit`, `afterSubmit` — return{} en L2123-2127; el ×3 del informe de performance corresponde a estos 3 entry points, no a re-triggers) · **Módulo:** FE-CAE · **Toca impuestos:** sí 💰
**Tiempo medido (baseline real, ×3):** Remito 9.6s · NC Venta 6.6s · Factura Compra 4.8s · Factura Venta 4.1s · Orden Venta 1.5s. Presente en casi todas las transacciones.
> ⚠️ **Corrección de lectura (2026-08-05):** estas cifras son **sumas acumuladas sobre 4-7 guardados** del Excel APM de Tekiio (verificado: Remito 9,62 = 9,18+0,38+0,06 sobre 6 guardados; NC 6,62 sobre 4; F.Venta 4,09 sobre 7; OV 1,55 sobre 6). Por guardado: NC ≈ 1,7s · Remito ≈ 1,6s · F.Venta ≈ 0,6s · OV ≈ 0,26s. El orden relativo de prioridad cambia con la normalización (NC y Remito pesan más por guardado que F.Venta). Ver [medición APM](../medicion-apm.md).
**Fase:** ANÁLISIS (pre-refactor). Ningún archivo fue modificado.

> **Análisis previo:** este script **SÍ tiene** sección en [priorizacion-scripts.md](../priorizacion-scripts.md) (líneas 225-233, ola 3, score 9 — el #1 de la matriz). Los 8 hallazgos previos se re-verificaron línea por línea y se confirmaron todos; este informe los absorbe (con su ID TRS-) y agrega hallazgos nuevos no relevados antes: TRS-A3, TRS-A4, TRS-A6, TRS-B3/B4/B5, TRS-C1/C3/C4 y todo el Grupo D.

---

## 1. Resumen

UserEvent "ómnibus" de la localización Uruguay que corre sobre casi todas las transacciones. En **beforeLoad** (solo `invoice` CREATE/COPY) intenta precargar sucursal/serie/caja por defecto — bloque probablemente muerto por una comparación de `executionContext` en minúscula (TRS-A4). En **beforeSubmit** (CREATE/EDIT de todo tipo) setea la sucursal por defecto (hasta 4 búsquedas) y el tipo de comprobante FE (3 búsquedas más); en DELETE de `vendorcredit`/`URU-Resguardo` intenta borrar retenciones asociadas con una API inexistente (`objRecord.delete`, TRS-A3). En **afterSubmit** (todo lo no-DELETE) hace `record.load()` del registro completo, setea monto en letras, replica el seteo de tax codes por línea (lógica duplicada de `L598 - Seteo de Tax Codes`), cruza líneas contra 3 saved searches para completar nombre/unidad/indicador de facturación/código percepción-retención por línea, asigna `custbody_l598_nro_comprobante`, re-aplica NC y hace `record.save()` **incondicional** — incluso para `salesorder`/`transferorder`, a los que toda la lógica saltea. El costo dominante está en ese load+save + ~11 búsquedas por guardado, patrón idéntico al que motivó la propuesta STC-A1.

| Métrica | Valor | Evidencia |
|---|---|---|
| LOC / funciones | 2128 / 15 (afterSubmit ~722 líneas) | L1201-1922 |
| Entry points | 3 (beforeLoad, beforeSubmit, afterSubmit) | L2123-2127 |
| Búsquedas por guardado (peor camino) | hasta 6 (BS) + 5 (AS) + 1 lookupFields | ver §Grupo B |
| `record.load()` + `save()` extra | 1 + 1 por cada guardado no-DELETE | L1208, L1915 |
| Consultas al mismo registro de config (`datos_impositivos_emp`) | 4 por guardado | L56, L387, L924, L1219 |
| Sublistas procesadas | item, itemcost, expcost, time (+taxdetails, apply) | L1254, L1932, L1893 |
| Campos escritos | 8 body + 6 custcol | §5 |
| Hallazgos | A: 8 · B: 6 · C: 4 · D: 7 | §2 |

## 2. Hallazgos

### Grupo A — Correctitud (NO entra al refactor; ver §4)

| ID | Hallazgo | Evidencia | Riesgo |
|---|---|---|:--:|
| TRS-A1 | Patrón `afterSubmit` + `record.load()` + `save()` para setear campos calculados — el mismo patrón de STC-A1. El save además re-dispara los UserEvents del registro (entendimiento ya documentado por el proyecto en el análisis de Asignar Rubro IVA). | load L1208, save L1915-1918 | 🔴 |
| TRS-A2 | Para `salesorder`/`transferorder` **toda** la lógica se saltea (L1212, L1864, L1892) pero el load+save se ejecuta igual: se re-guarda un registro sin ningún cambio en cada submit. Explica gran parte del baseline de Orden de Venta (1.5s). | L1207-1212, L1915 | 🔴 |
| TRS-A3 | **(nuevo)** En beforeSubmit DELETE se llama `objRecord.delete({type, id})` sobre el objeto Record; el objeto Record **no tiene método `delete`** en N/record (la función es del módulo: `record.delete`). El TypeError cae en el catch que solo loguea → las retenciones asociadas (`customrecord_l598_retencion`, `customrecord_l598_retencion_nc`) muy probablemente **nunca se borran** y quedan huérfanas al borrar NC de compra / Resguardos. *Hecho verificado:* la llamada y el catch. *Inferencia:* el efecto en runtime — confirmar con logs de la cuenta ("Ocurrio un error al borrar…"). | L1146-1152 (vendorcredit), L1180-1186 (resguardo) | 🔴 |
| TRS-A4 | **(nuevo)** El bloque de beforeLoad está condicionado a `executionContext == "userevent"` (minúscula); `runtime.executionContext` devuelve valores del enum en mayúsculas (`USEREVENT`, `USERINTERFACE`) → la condición sería siempre falsa y el bloque, **código muerto**. El comentario L2013-2019 ("Se comenta esta funcionalidad porque está repetida… el script de cliente también la posee") sugiere desactivación intencional por la vía de la condición. Confirmar en la cuenta (los `log.debug` internos nunca deberían aparecer) y decidir: remover (D) o reactivar (cambio de comportamiento). Incluye además la cláusula redundante `recType != "vendorbill" && recType == "invoice"`. | L2029; comentario L2013-2019 | 🔴 (verificar) |
| TRS-A5 | `getNumberLiteral()` llama `alert(...)` (API de navegador, inexistente en server) cuando `isNaN(n)`; el ReferenceError cae al catch y la función devuelve `"NO DISPONIBLE"`, que puede terminar grabado en `custbody_l598_monto_escrito` (documento fiscal impreso). | L267-270, catch L359-363 | 🔴 |
| TRS-A6 | **(nuevo)** Monto en letras con decimales: `const parteDecimal = partes[1] ?? "00"` toma la parte decimal **sin normalizar a 2 dígitos**. `String(10.5)` → `"5"` → "…CON 5/100" (debería ser 50/100); tres decimales → "CON 567/100". `Number.prototype.toFixedOK` existe (L36-39) pero no se usa en este camino. Bug de correctitud del monto escrito. | L425-441 (L427) | 🔴 |
| TRS-A7 | Las 3 saved searches del afterSubmit usan `getRange({start:0, end:1000})` **sin paginación** → truncamiento silencioso sobre 1000 resultados (líneas sin nombre/UM/indicador/cód. percepción calculados). Los helpers paginados existen en `utilities.searchSaved/searchSavedPro` y no se usan. Clasificado Grupo A por los hechos del proyecto (bug de truncamiento). | L1388-1391, L1433-1436, L1479-1482; Utilities L142-159, L221-234 | 🔴 |
| TRS-A8 | La condición `l598isEmpty(sucursal) \|\| … \|\| !l598isEmpty(location)` fuerza el recálculo de sucursal/serie/caja en casi el 100% de los guardados (location casi siempre está seteado), aun con los campos completos. Intención ambigua (¿recalcular ante cambio de location o condición invertida?): cualquier ajuste cambia cuándo se sobreescriben `custbody_l598_sucursal/serie/caja` → decisión de negocio. | L995 (beforeSubmit), L2057 (beforeLoad) | 🔴 (validar) |

### Grupo B — Governance / Performance (SÍ entra)

| ID | Hallazgo | Evidencia | Riesgo |
|---|---|---|:--:|
| TRS-B1 | `setearCodigoImpuestosLineas`: `arrayTaxDetails.filter(...)` dentro del for por cada línea de `item` → O(items × taxdetails). Mismo patrón que STC-B1 (ya refactorizado a `Map` en el script Seteo de Tax Codes, preservando "primer match gana"). | L1958-1998 (filter L1964) | 🟡 |
| TRS-B2 | Cruces de arrays con `.filter()` anidado en for **y con efectos colaterales dentro del callback** (push a `arrayFinalAux`/`arrayFinal` dentro del filter): O(n×m) por cada combinación líneas×resultados de búsqueda. Indexable con `Map`; la equivalencia debe preservar que se acumulan **todos** los matches y que el consumidor toma `[0]` (L1708-1710). | L1513-1531, L1538-1556, L1569-1590 | 🟡 |
| TRS-B3 | Búsquedas de configuración repetidas por ejecución: `customrecord_l598_datos_impositivos_emp` se consulta **4 veces por guardado** (`l598esOneworld` en beforeSubmit vía `obtenerSucursal` L696 y otra vez en afterSubmit L1219; `usarDecimales` L387-394; `getSucursalxLocation` L924-931). Peor camino: hasta 6 búsquedas en beforeSubmit (L56, L708, L852, L924, L508, L570, L660) + 5 en afterSubmit. Memoizar por ejecución/consolidar sin cambiar salida. Además `l598esOneworld` pide `end: 1000` para un chequeo de existencia (`end: 1` basta). | L40-68, L694-745, L747-883, L885-956 | 🟡 |
| TRS-B4 | `log.debug` con `JSON.stringify` de arrays completos dentro de loops por línea, más un loop **exclusivamente de logging** (L1247-1251): costo de tiempo puro en el camino caliente. Patrón STC-B2 (se conservan los `log.error`). | L1247-1251, L1296, L1620-1649, L1662, L1712-1740, L1774-1775, L1967 | 🟢 |
| TRS-B5 | **(nuevo)** Trabajo muerto: la 1ª pasada recolecta líneas de `itemcost`/`expcost` (condición L1300; `arrayItem` incluye `itemcost`, L1334) y alimenta con ellas la búsqueda y los cruces, pero la 2ª pasada solo escribe sublistas `item` y `time` (condición L1653) → esas filas jamás se usan. Reducir la recolección a lo consumido (con argumento de equivalencia documentado: hoy no se escribe nada para esas sublistas). | L1298-1354 vs L1651-1653 | 🟡 |
| TRS-B6 | Saved searches `customsearch_l598_articulos`, `customsearch_l598_timebill`, `customsearch_l598_cod_impuestos` con columnas accedidas **posicionalmente** (`columns[0..4]` — acople frágil al orden definido en la cuenta; definición/exceso de columnas no verificable desde el repo). Candidatas a migración **SuiteQL** (`SELECT` específico) — hallazgo prioritario según criterio v2. Los filtros con variables sí validan no-vacío antes del push (L1372-1373, L1417-1418, L1465-1466). | L1382-1408, L1427-1454, L1473-1501 | 🔴 (migración = reemplazo de mecanismo → aprobación) |

### Grupo C — Estándares 2.1 (SÍ entra)

| ID | Hallazgo | Evidencia | Riesgo |
|---|---|---|:--:|
| TRS-C1 | `eval(c)/eval(d)/eval(u)` en `letras()` para "convertir" dígitos que ya llegan numéricos → `Number()`. | L79-81 | 🟢 |
| TRS-C2 | ~24 variables sin declarar en `getNumberLiteral` (`rm0, m1…m3, rm1…rm3, r1…r8, tmp, s, tmp1, tmp2, tmpn1, tmpn2, pred, mldata, mdata, cdata`) → globals implícitos en función **recursiva** (L307-308). Verificación fina: el caso de 2 niveles queda accidentalmente a salvo porque la rama de billones se evalúa antes que la de millones y los valores necesarios se copian a locales `let` antes de recursar — pero es frágil. Declararlas con `let` no cambia la salida (no hay dependencia entre llamadas); requiere caracterización porque alimenta el monto escrito. | L272-296, L302-313, L320-344 | 🟡 |
| TRS-C3 | `var` residual en el bloque creditmemo (L1891-1910) y `let` que deberían ser `const` (`let setearCodigoImpuestosLineas = …` L1925, `let proceso` L1927). | L1891-1910, L1925-1927 | 🟢 |
| TRS-C4 | Restos de estilo 1.0: comparaciones duales `'T'/true`, `'F'/false` por todo el script (L617-631, L790, L938, L1299, L1836…) y un filtro pasado como **objeto plano** en vez de `search.createFilter` (única de las 3 búsquedas, inconsistente). Normalizar con helper que preserve ambas semánticas. | L1421-1425 vs L1376-1380 | 🟢 |

### Grupo D — Mantenibilidad (SÍ entra)

| ID | Hallazgo | Evidencia | Riesgo |
|---|---|---|:--:|
| TRS-D1 | **Duplicación inter-script con `L598 - Seteo de Tax Codes.js`:** `setearCodigoImpuestosLineas` (L1925-2007) es copia casi literal de `setearColumnasConTaxDetails` (STC L67-125) para la rama `item` — mismos sets de `custcol_l598_codigo_impuesto/_tasa_impuesto`, mismo manejo Group/Discount, mismos mensajes; y el bloque apply de creditmemo (L1891-1913) duplica `desaplicarYAplicarNC` (STC L137-161, que además cubre `vendorcredit`). Ambos scripts hacen load+save en afterSubmit → **doble seteo y doble guardado CONFIRMADOS en la cuenta (2026-09-07)**: sobre la invoice 15822 corrieron los dos scripts, dos veces cada uno, y el log da el orden — STC escribe a las 1:21:15 y **este script sobrescribe a las 1:21:17 con el mismo valor**. Gana este script por llegar último, así que en la práctica **es el dueño efectivo** de esas columnas en `invoice`. Deja de ser inferencia. Evidencia: [caracterización de STC § invoice 15822](../caracterizacion/1-seteo-de-tax-codes.md#invoice-15822--quién-escribe-las-columnas-en-invoice-2026-09-07). En el refactor solo se documenta/extrae sin cambiar quién ejecuta; definir un dueño único es decisión con Tekiio (Grupo A). | L1925-2007, L1891-1913 | 🟡 |
| TRS-D2 | Dead code: `toFixedOK` sin uso (L36-39); literal suelto `999123456789;` (L299); bloque de monto escrito comentado en beforeSubmit (L1049-1076); `submitFields` comentado (L1872-1882); `UserEventType.COPY` en afterSubmit (L1868 — en afterSubmit una copia llega como CREATE; *inferencia*, verificar); ramas `else` inalcanzables tras `!l598isEmpty(objeto)` que siempre es true (L1013-1019, L2102-2107); comentarios `nlapi*` 1.0 (L1174, L1181, L1188). | citadas | 🟢 |
| TRS-D3 | Extensión de prototipos nativos: `Array.prototype.pushSafe` (L27-33, traga nulos con log.debug) y `Number.prototype.toFixedOK` (L36-39) → helpers de módulo conservando semántica. | L26-39 | 🟢 |
| TRS-D4 | Funciones larguísimas y multi-responsabilidad: `afterSubmit` ~722 líneas (monto en letras + tax codes + cruces + nro comprobante + re-apply NC + save), `beforeSubmit` ~240. Dividir en funciones nombradas **sin reordenar efectos**; por el gotcha fiscal, con caracterización exhaustiva. | L959-1198, L1201-1922 | 🟡 |
| TRS-D5 | Logs con números de línea hardcodeados y desactualizados ('LINE 823' en L1413, 'LINE 852' L1460, 'LINE 880' L1506, 'LINE 998' L1718…), mojibake en el fuente ("NumÃ©rico" L269) y typos ("INFORACIÓN" L1464, L1503). | citadas | 🟢 |
| TRS-D6 | Lecturas repetidas del mismo valor de sublista: `custcol_l598_codigo_impuesto` se lee 3 veces por línea en la 2ª pasada. | L1643-1647, L1656-1660, L1664-1668 | 🟢 |
| TRS-D7 | Duplicación con el módulo compartido: `l598esOneworld` local (L40-68) vs `utilities.l598esOneworld` (Utilities L50-90); `l598isEmpty` local (L22-24) vs `utilities.isEmpty` — con uso **mixto** en el mismo archivo (L1907 usa utilities, el resto la local, y sus semánticas difieren: la local también trata `"null"`/`"undefined"`). Unificar con cuidado de semántica. | L22-24, L40-68, L715, L1907 | 🟢 |

## 3. Plan de Cambios propuesto (solo B/C/D)

| Criterio | ID | Qué se modifica | Riesgo | Estado |
|---|---|---|:--:|:--:|
| #2 | TRS-B3 | Memoizar por ejecución las búsquedas de configuración (esOneworld, usarDecimales, datos impositivos) y `end:1000`→`end:1` en chequeo de existencia | 🟡 | ⏳ Propuesto |
| #2 | TRS-B6 | Migrar las 3 SS de afterSubmit a SuiteQL con `SELECT` específico (elimina acople posicional a columnas) | 🔴 | ⏳ Propuesto (requiere aprobación) |
| #3 | TRS-B1 | `filter` en loop de `setearCodigoImpuestosLineas` → `Map` por `taxdetailsreference` (patrón STC-B1 ya aplicado) | 🟡 | ⏳ Propuesto |
| #3 | TRS-B2 | Cruces O(n×m) con filter-con-efectos → índices `Map`, preservando multi-match y consumo `[0]` | 🟡 | ⏳ Propuesto |
| #3 | TRS-B4 | Quitar `log.debug` de dump en loops y el loop de solo-logging (se conservan `log.error`) | 🟢 | ⏳ Propuesto |
| #3 | TRS-B5 | Dejar de recolectar líneas `itemcost`/`expcost` que la 2ª pasada nunca escribe | 🟡 | ⏳ Propuesto |
| #4 | TRS-C1 | `eval()` → `Number()` en `letras()` | 🟢 | ⏳ Propuesto |
| #4 | TRS-C2 | Declarar con `let` las ~24 variables implícitas de `getNumberLiteral` | 🟡 | ⏳ Propuesto |
| #4 | TRS-C3 | `var`→`const/let`; arrow asignada a `let`→`const` | 🟢 | ⏳ Propuesto |
| #4 | TRS-C4 | Normalizar comparaciones `'T'/true` con helper y unificar filtros con `search.createFilter` | 🟢 | ⏳ Propuesto |
| #5 | TRS-D2 | Eliminar dead code (toFixedOK, literal suelto, bloques comentados, ramas inalcanzables) | 🟢 | ⏳ Propuesto |
| #5 | TRS-D4 | Dividir `afterSubmit`/`beforeSubmit` en funciones nombradas sin reordenar efectos | 🟡 | ⏳ Propuesto |
| #5 | TRS-D5 | Corregir logs con líneas hardcodeadas, mojibake y typos | 🟢 | ⏳ Propuesto |
| #5 | TRS-D6 | Consolidar lecturas repetidas de sublist values | 🟢 | ⏳ Propuesto |
| #6 | TRS-D1 | Extraer/documentar la lógica duplicada con Seteo de Tax Codes (sin cambiar quién ejecuta) | 🟡 | ⏳ Propuesto |
| #6 | TRS-D3 | Prototipos nativos → funciones helper | 🟢 | ⏳ Propuesto |
| #6 | TRS-D7 | Unificar `isEmpty`/`esOneworld` locales vs utilities (respetando diferencias semánticas) | 🟢 | ⏳ Propuesto |

Los 🔴 y todo el Grupo A van al [registro-aprobaciones.md](../registro-aprobaciones.md) antes de planificarse.

## 4. Recomendaciones Grupo A (aparte, requieren aprobación Tekiio)

1. **TRS-A1 — Mover la lógica de afterSubmit a beforeSubmit (equivalente a STC-A1, criterio #8).** Eliminaría el `record.load()` (~10 GU) + `save()` (~20 GU) por transacción y el re-disparo de UserEvents del save extra — sobre un script presente en casi todas las transacciones (4.1-9.6s medidos). Misma validación obligatoria que STC-A1 (¿`taxdetails` poblado en beforeSubmit en todos los contextos?) **más dos salvedades propias**: (a) `custbody_l598_nro_comprobante = recId` (L1883-1886) no puede moverse a beforeSubmit en CREATE porque el id aún no existe — haría falta un híbrido (p. ej. `submitFields` residual en afterSubmit, que el propio código tiene ensayado y comentado en L1872-1882); (b) el toggle apply de creditmemo (L1891-1913) opera sobre el estado post-guardado. Se recomienda extender el experimento de diagnóstico de [STC-A1](../propuestas/STC-A1-entrypoint-seteo-tax-codes.md) a este script. Además, decidir junto con STC-A1 el **dueño único** del seteo de tax codes (hoy duplicado, TRS-D1).
2. **TRS-A2 — Early-return para `salesorder`/`transferorder`.** Cambio de pocas líneas que elimina un load+save sin ningún cambio de datos (y el evento de guardado que genera). Es cambio de comportamiento por definición del proyecto → aprobación explícita. Impacto directo sobre el baseline de Orden de Venta (1.5s ×3).
3. **TRS-A3 — Corregir `objRecord.delete` → `record.delete`.** Hoy el borrado de retenciones asociadas muy probablemente falla en silencio; corregirlo **empezaría a borrar registros que hoy quedan huérfanos** (cambio observable). Antes: confirmar en logs de la cuenta y dimensionar/decidir qué hacer con los huérfanos históricos.
4. **TRS-A4 — Resolver el beforeLoad muerto.** Confirmar en la cuenta que el bloque nunca corre; si la desactivación fue intencional, removerlo es limpieza (D); si debía correr, activarlo es cambio de comportamiento.
5. **TRS-A5/A6 — Corrección del monto en letras** (`alert()` → manejo controlado; parte decimal normalizada a 2 dígitos). Afecta un texto fiscal impreso: corrección aparte con validación funcional de casos borde (total con 1 decimal, sin decimales, no numérico, ≥ mil millones).
6. **TRS-A7 — Paginación de las 3 búsquedas** (o su migración SuiteQL, TRS-B6): cambia el resultado solo cuando hay >1000 filas; confirmar con Tekiio si ese volumen es alcanzable y aprobar como corrección de robustez.
7. **TRS-A8 — Condición `!isEmpty(location)`:** requiere definición de negocio (¿cuándo debe recalcularse/sobreescribirse la sucursal?) antes de cualquier cambio.

## 5. Dependencias y alcance

- **Imports** (L13): `N/log`, `N/search`, `N/runtime`, `N/record`, `L598/utilities` — resuelto vía `@NAmdConfig /SuiteScripts/configuration_l598.json` → `LOC UY/L598 - Utilities.js` (módulo **API 2.0** consumido por un script 2.1). Uso real de utilities: `getLookupFieldsSafe` (L715) e `isEmpty` (L1907) — el resto del archivo usa las versiones locales.
- **No invoca otros scripts:** no hay `N/task`, `url.resolveScript`, `N/https` ni scriptIds en el archivo (verificado en lectura completa). La interacción con otros scripts es implícita: el `save()` de afterSubmit re-dispara los UserEvents del registro, y convive con `L598 - Seteo de Tax Codes` (lógica duplicada, TRS-D1) y con el client script `L598 -Transacción (Cliente).js` (referido en el comentario L2013-2019 como responsable de los defaults en UI).
- **Tipos de registro** (ramas por `objRecord.type`/`recType`): agnóstico con exclusiones — `transferorder`/`salesorder` fuera de toda la lógica de líneas (L1027, L1212, L1864); `vendorbill` parcial (sin tipo comprobante L1033, sin monto escrito L1217, sin nro comprobante L1864, pero SÍ tax codes por línea); `invoice` (único con beforeLoad, L2029); `creditmemo` (toggle apply, L1892); `vendorcredit` y `customtransaction_l598_resguardo` (ramas DELETE, L1132/L1166). Deployments reales no verificables desde el repo.
- **Registros custom consultados:** `customrecord_l598_datos_impositivos_emp`, `_tipo_trans_ns`, `_tipo_trans_loc`, `_tipos_comprobantes`, `_sucursales`; borra (intenta) `customrecord_l598_retencion` y `_retencion_nc`. **Saved searches:** `customsearch_l598_articulos`, `_timebill`, `_cod_impuestos`.
- **Campos que escribe:** body `custbody_l598_sucursal`, `_serie_comprobante`, `_caja`, `_codigo_sucursal`, `_codigo_serie` (beforeLoad), `_tipo_comprobante` (beforeSubmit), `_monto_escrito`, `_nro_comprobante` (afterSubmit); columnas `custcol_l598_codigo_impuesto`, `_tasa_impuesto`, `_articulo_nombre`, `_articulo_unid_medida`, `_ind_facturacion`, `_cod_perc_ret_cred`; toggle de `apply` en creditmemo.

## 6. Casos de caracterización sugeridos

Contexto UAT: órdenes de venta/compra y factura/NC de **compra** están OK; **facturas/NC de venta están bloqueadas por error CAE 100000 y NO deben re-guardarse**. Baseline del original primero, `_REF` aislado con Status=Testing + Audience (metodología §6).

| # | Flujo UAT | Qué caracteriza | Comparar |
|---|---|---|---|
| 1 | Guardar **Orden de Venta** (flujo OK) | Rama salteada + load+save vacío (TRS-A2); sucursal en beforeSubmit | `custbody_l598_sucursal`; que NO se escriba nada más; GU/tiempo vs 1.5s |
| 2 | Guardar **Orden de Compra** (flujo OK) | Camino completo de líneas del lado compra (purchaseorder no está excluido): tax codes, nombre/UM, indicador, nro comprobante, monto escrito | `custcol_l598_*` línea por línea + `custbody_l598_monto_escrito`, `_tipo_comprobante`, `_nro_comprobante` |
| 3 | Guardar **Factura de Compra** (flujo OK) | Gates específicos de `vendorbill` (sin monto escrito / tipo comprobante / nro comprobante, con tax codes) | `custcol_l598_*`; ausencia de los 3 body fields |
| 4 | Crear y **borrar una NC de Compra de prueba** con retenciones asociadas | Rama DELETE + TRS-A3 | Logs ("Ocurrio un error al borrar…") y persistencia de `customrecord_l598_retencion` |
| 5 | Monto escrito — bordes con datos de los flujos OK | TRS-A5/A6/C2: total con 1 decimal (p. ej. 10.50), sin decimales, > 1.000.000 | `custbody_l598_monto_escrito` byte a byte |
| 6 | **Factura/NC de Venta, creditmemo apply, líneas time/itemcost/expcost** (facturables sobre invoice) y **beforeLoad de invoice** | Ramas hoy no ejercitables | ⛔ **Posponer hasta desbloquear CAE 100000 — no re-guardar**; mientras tanto, solo lectura de logs para TRS-A4 |

## 7. Dudas abiertas (no verificable desde el repo)

1. **Deployments reales** de este script (tipos de registro y cantidad) — determina el alcance de caracterización, igual que en STC.
2. **Disponibilidad de `context.newRecord` en beforeSubmit DELETE** (L966 + L1134): si no estuviera disponible, la rama DELETE fallaría antes del `objRecord.delete` (TRS-A3 aplica igual, con otro síntoma). Confirmar con logs.
3. **Si el bloque beforeLoad corre alguna vez** (TRS-A4): confirmar valores reales de `runtime.executionContext` en la cuenta.
4. **Profundidad real del re-disparo de UserEvents** por el `save()` de afterSubmit y la **interacción/orden con `L598 - Seteo de Tax Codes`** en tipos compartidos (¿doble load+save encadenado?): no medible desde el repo.
5. **Definiciones de las 3 saved searches** (columnas totales, filtros propios) — necesarias para dimensionar TRS-B6 (SuiteQL) y el riesgo del acceso posicional.
6. **Volúmenes reales** (>1000 artículos/tax codes por transacción) para priorizar TRS-A7.
7. **`taxdetails` en beforeSubmit** (precondición de TRS-A1): pendiente del experimento de diagnóstico propuesto en STC-A1.
8. **Modo estricto del runtime**: los globals implícitos de `getNumberLiteral` implican ejecución no estricta (si fuera estricta, lanzarían ReferenceError y el monto escrito nunca se grabaría) — evidencia indirecta, confirmar en cuenta.
9. **Configuración real de `usarDecimales`** (`custrecord_l598_dat_imp_usar_d_mont`): decide cuál de las dos ramas del monto en letras corre en producción (la estricta `=== false` manda a la rama con decimales cuando la config no existe).
