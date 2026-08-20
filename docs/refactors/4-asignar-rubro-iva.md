# Informe de Análisis — Asignar Rubro IVA

**Script:** `L598 - Asignar Rubro IVA` · **Archivo:** `LOC UY/L598 - Asignar Rubro IVA.js` · **LOC:** 473
**Tipo:** UserEvent · **Entry points declarados:** solo `afterSubmit` (`return` en líneas 470-472) → consistente con el **×1** del baseline
**Módulo:** Transacciones · **Toca impuestos:** sí 💰 · **Tiempo medido:** **2.9s ×1** (Factura de Compra; 2.7s en Factura y NC de Venta — [baseline](../flujos-prueba-y-plan-ejecucion.md))
**Estado:** análisis PRE-refactor (fase 1 del flujo §4 de la metodología). Ningún cambio aplicado.

---

## 1. Resumen

El script asigna **por línea** el Rubro IVA en las sublistas `item` y `expense` de transacciones (campo `custcol_l598_rubro_iva`) y, para Facturas de Compra con líneas facturables, el rubro equivalente de ventas (`custcol_l598_rubro_iva_equival_ventas`, línea 346). **No escribe campos de cabecera.** El mapeo sale de:

1. **SS `customsearch_l598_rubros_iva_codigos_imp`** — mapa *código de impuesto → rubro* (línea 47), invocada sin filtro.
2. **SS `customsearch_l598_rubros_iva_cuentas_con`** — mapa *cuenta contable → rubro* (línea 50), filtrada por `subsidiary` si la cuenta es OneWorld (líneas 43-45, 398-404).
3. **Parámetro de script `custscript_l598_rubro_publicidad`** (línea 30) — rubro fijo que pisa el asignado cuando el ítem tiene `custitem_l598_aplica_publicidad` o la cuenta tiene `custrecord_l598_aplica_publicidad` (solo `vendorbill`/`vendorcredit`, líneas 110-222).

Todo ocurre en `afterSubmit` con el patrón `record.load()` (línea 38) + `objRecord.save()` (línea 224) — el mismo costo estructural que motivó **STC-A1** en `Seteo de Tax Codes`.

| Métrica | Valor |
|---|---|
| LOC / funciones | 473 / 6 (`afterSubmit` ocupa ~215 líneas, 22-236) |
| Entry points declarados | `afterSubmit` (470-472) → ×1 ✔ coincide con baseline |
| Búsquedas por guardado | 3 fijas (`l598esOneworld` + 2 SS de mapeo) + hasta 2 más en compras (líneas 111-138 y 176-191) |
| `record.load()`+`save()` | Sí (38 / 224) — con `ignoreMandatoryFields: true` |
| Complejidad de matching | O(n×m): `filter` dentro de loops (317-319, 326-328, 159, 207) |
| Hallazgos | A: 6 · B: 5 · C: 3 · D: 7 |
| Análisis previo ([priorización, ola 2](../priorizacion-scripts.md)) | 6 hallazgos previos: **los 6 verificados** contra código (ver §2) |

> **Nota honesta:** igual que en `Seteo de Tax Codes`, el costo dominante probable no está en el matching sino en el `load()`+`save()` de `afterSubmit` más las 3-5 búsquedas por guardado. El refactor B/C/D limpia y ordena; el salto de tiempo/GU grande es **ARI-A1** (entry point, requiere aprobación).

## 2. Hallazgos

### Grupo A — Correctitud (NO entran al refactor; recomendación + aprobación Tekiio)

| ID | Hallazgo | Evidencia | Riesgo |
|---|---|---|:--:|
| ARI-A1 | Patrón `afterSubmit` + `record.load()` + `save()` para setear campos calculados. Migrar a `beforeSubmit` sobre `newRecord` eliminaría load+save y la cascada de re-disparo de UEs. **Criterio #8: solo sugerencia.** | 38, 224; entry point único 470-472 | 🔴 |
| ARI-A2 | Loop de publicidad de ítems accede `resultado[0].aplicaPublicidad` **sin validar longitud**; el loop análogo de expensas sí valida (`resultado.length > 0`). Un ítem sin match → `TypeError` → catch global (228) → **`save()` (224) nunca corre y se pierden TODOS los seteos de la ejecución**, incluidos los de `setearRubrosIVA` ya calculados en memoria. | 159-161 vs 207-209; try global 35-232 | 🔴 |
| ARI-A3 | Guards de no-sobrescritura **comentados**: el script siempre pisa `custcol_l598_rubro_iva` en cada create/edit (incluso valores manuales) y **lo limpia con `''` cuando no hay mapeo** (349). `custcol_l598_rubro_iva_equival_ventas`, en cambio, nunca se limpia (asimetría). Reinstaurar o no el guard es decisión de negocio (gotcha fiscal). | 315, 338, 343, 351; limpieza 348-350 | 🔴 |
| ARI-A4 | **(nuevo)** Inconsistencia guard/valor en ventas: la condición valida `idRubroIVA` (339), pero para tipos ≠ `vendorbill`/`vendorcredit` `getRubro` devuelve `rubroIVAEquivalente` (367-371). Un mapeo con rubro de compra sin equivalente escribiría vacío en la línea de venta. *Hecho: la asimetría en código. Inferencia: el impacto depende de datos de las SS — validar con negocio.* | 339-341, 364-376 | 🔴 |
| ARI-A5 | `save({ enableSourcing: false, ignoreMandatoryFields: true })` — puede persistir registros con obligatorios incompletos sin aviso. Sin evidencia en código de por qué es necesario. | 224 | 🔴 |
| ARI-A6 | **(nuevo)** `custscript_l598_rubro_publicidad` se usa como `value` sin validar `isEmpty` (a diferencia del patrón del proyecto): con el parámetro vacío, borraría el rubro de las líneas con publicidad. | 30; usos 166, 214 | 🔴 |

> **Cumplimiento criterio v2(a):** los filtros de SS con variables **sí** validan nulos/vacíos (`getRubrosIVA` valida `subsidiaria` antes de filtrar, 398-404). Sin hallazgo en este punto.
>
> **Verificación del análisis previo:** los 6 ítems de [priorizacion-scripts.md §Asignar Rubro IVA](../priorizacion-scripts.md) se confirmaron con línea exacta: `resultado[0]` (159-161 → ARI-A2), load+save (38/224 → ARI-A1), `getRange` sin paginación (135-138 y 188-191 → ARI-B3), guard comentado (315/338/343/351 → ARI-A3), `ignoreMandatoryFields` (224 → ARI-A5) y SS candidatas SuiteQL (47/50/176-186 → ARI-B4).

### Grupo B — Governance / Performance (SÍ entran)

| ID | Hallazgo | Evidencia | Riesgo |
|---|---|---|:--:|
| ARI-B1 | `filter` dentro de loops por línea → O(n×m). Indexar con `Map` (primer match gana), análogo a STC-B1: matching de rubros (317-319 y re-filtro expense 326-328), publicidad ítems (159), publicidad expensas (207). | 317-319, 326-328, 159, 207 | 🟡 |
| ARI-B2 | Búsquedas incondicionales: las 2 SS de mapeo corren **antes** de conocer los line counts (48, 51 vs 70-76, 90-96) — en ventas sin sublista `expense` la SS de cuentas se ejecuta igual. Además `l598esOneworld()` ejecuta una búsqueda por corrida (`L598 - Utilities.js` 50-90) solo para decidir si leer `subsidiary`. Reordenar/condicionar. | 41, 48, 51, 70-76, 90-96 | 🟡 |
| ARI-B3 | Dos búsquedas ad-hoc con `run().getRange({start:0,end:1000})` **sin paginación** (patrón de truncamiento del proyecto; `utilities.searchSavedPro` 221-234 sí pagina). Riesgo práctico bajo (dominio acotado: ítems de la propia transacción / cuentas con flag), pero >1000 filas se descartan en silencio — y combinado con ARI-A2, un ítem fuera del top-1000 dispara el `TypeError`. Comportamiento idéntico ≤1000; el borde >1000 es corrección de bug latente (si Tekiio prefiere, tratarlo como A). | 135-138, 188-191 | 🟡 |
| ARI-B4 | SS candidatas **SuiteQL/Workbooks (prioritario v2)**: las 2 SS de mapeo (47, 50), la búsqueda de cuentas con publicidad (176-186) y la búsqueda agrupada de ítems (111-133). `SELECT` específico de 4 columnas. Es reemplazo de mecanismo completo → Alto riesgo por definición del proyecto, requiere validar mapeo idéntico de columnas/nulls. | 47, 50, 111-133, 176-186 | 🔴 |
| ARI-B5 | `searchSavedPro` ya materializa los resultados en `.array` (`L598 - Utilities.js` 238, 250-291) y `getRubrosIVA` lo ignora y re-mapea a mano (417-438): doble recorrido filas×columnas por búsqueda. Consolidar del lado de este script (sin tocar el módulo compartido). | 406, 414-438 | 🟡 |

### Grupo C — Estándares 2.1 (SÍ entran)

| ID | Hallazgo | Evidencia | Riesgo |
|---|---|---|:--:|
| ARI-C1 | `var` en todo el script (un único `let` en 340) → `const`/`let`. `@NApiVersion 2.1` ya correcto (línea 2). | global | 🟢 |
| ARI-C2 | Sintaxis mixta de `getSublistValue`: posicional (295-296) vs objeto (293-294). Unificar a la forma con objeto (documentada en 2.x). | 295-296 | 🟢 |
| ARI-C3 | Literales de summary inconsistentes: `summary: "group"` (142) vs `"GROUP"` (143) → `search.Summary.GROUP`. Ambos funcionan hoy (evidencia: producción operativa); unificar. | 142-143 | 🟢 |

### Grupo D — Mantenibilidad (SÍ entran)

| ID | Hallazgo | Evidencia | Riesgo |
|---|---|---|:--:|
| ARI-D1 | Dead code: `createError` (459-468) nunca invocada (llamadas comentadas en 83, 103, 231) → permite quitar `N/error` del `define` (9); `var name` sin uso (25); bloque debug comentado (58-66); restos comentados (287, 297, 315, 338, 343, 351); `return true` sin efecto en UE (235). | citadas | 🟢 |
| ARI-D2 | Lecturas muertas por línea: `rubroIVA` (293) y `rubroIVAEquivalente` (294) se leen y no se usan (el guard que las usaba está comentado) → 2 `getSublistValue` desperdiciados por línea. | 293-294 | 🟢 |
| ARI-D3 | Duplicación: para expensas sin tax code, el filtro de 317-319 y el de 326-328 son la **misma** búsqueda (misma clave y mismo array) ejecutada dos veces. Cross-script: `_refreshApplyTranList` (238-267) duplica `desaplicarYAplicarNC` de `Seteo de Tax Codes` (137-161 de ese archivo) con cobertura distinta (solo `creditmemo` vs `creditmemo`+`vendorcredit`) — unificación fuera de alcance, se documenta. | 317-333, 238-267 | 🟡 |
| ARI-D4 | `afterSubmit` de ~215 líneas (22-236): extraer el bloque de publicidad (110-222) a función. JSDoc desactualizado: cabecera dice "before record is save" (14) y la de `setearRubrosIVA` documenta parámetros inexistentes (`idFieldKey`, 269-281 vs firma real 282). Pasar `''` como array de resultados (77) es frágil (string donde se espera array). | 22-236, 269-282, 77 | 🟡 |
| ARI-D5 | Logs de dump: `log.audit` con el JSON completo de ambas SS (53-54), dump de parámetros por llamada (288), `log.debug` por línea (160, 208, 335). Reducir conservando `log.error`. | 53-54, 288, 160, 208, 335 | 🟢 |
| ARI-D6 | `getRubro` (364-376): parámetro `paramSublist` sin uso, `catch` que devuelve `undefined` en silencio, naming genérico. Simplificar **preservando la semántica exacta** (la corrección del guard/valor es ARI-A4, no entra acá). | 364-376 | 🟢 |
| ARI-D7 | Acceso **posicional** a columnas de las SS de mapeo (`columns[0..3]`, 422-437): reordenar columnas en la SS reasignaría rubros sin error de compilación. Mitigar documentando el contrato de 4 columnas (o migrar junto con ARI-B4). | 417-438 | 🟡 |

## 3. Plan de Cambios propuesto (solo B/C/D)

Ordenado por criterio del cliente #1→#6. Estado inicial: todo ⏳ Propuesto (pre-acuerdo de alcance).

| Criterio | ID | Qué se modifica | Riesgo | Estado |
|---|---|---|:--:|:--:|
| #2 | ARI-B2 | Ejecutar SS de mapeo solo si hay líneas que procesar; evaluar evitar la búsqueda de `l598esOneworld` | 🟡 | ⏳ Propuesto |
| #2 | ARI-B3 | Paginación en las 2 búsquedas ad-hoc (135-138, 188-191) | 🟡 | ⏳ Propuesto |
| #2 | ARI-B4 | Migración SS → SuiteQL/Workbooks (prioritario v2) | 🔴 | ⏳ Propuesto (requiere aprobación) |
| #3 | ARI-B1 | `filter`-en-loop → `Map` indexado (primer match gana) | 🟡 | ⏳ Propuesto |
| #3 | ARI-B5 | Eliminar re-mapeo manual duplicado de resultados en `getRubrosIVA` | 🟡 | ⏳ Propuesto |
| #4 | ARI-C1 | `var` → `const`/`let` | 🟢 | ⏳ Propuesto |
| #4 | ARI-C2 | Unificar `getSublistValue` a sintaxis de objeto | 🟢 | ⏳ Propuesto |
| #4 | ARI-C3 | `search.Summary.GROUP` en lugar de literales mixtos | 🟢 | ⏳ Propuesto |
| #4 | ARI-D7 | Documentar/robustecer contrato posicional de columnas de SS | 🟡 | ⏳ Propuesto |
| #5 | ARI-D1 | Eliminar dead code (`createError`, `N/error`, comentados, `return true`) | 🟢 | ⏳ Propuesto |
| #5 | ARI-D2 | Eliminar lecturas muertas por línea (293-294) | 🟢 | ⏳ Propuesto |
| #5 | ARI-D4 | Extraer bloque publicidad; corregir JSDoc | 🟡 | ⏳ Propuesto |
| #5 | ARI-D5 | Reducir logs de dump (conservar `log.error`) | 🟢 | ⏳ Propuesto |
| #6 | ARI-D3 | Dedup del doble filtro de expensas | 🟡 | ⏳ Propuesto |
| #6 | ARI-D6 | Simplificar `getRubro` preservando semántica | 🟢 | ⏳ Propuesto |

**Matriz de riesgo:** 🟢 ×7 (sin aprobación) · 🟡 ×7 (revisión conjunta) · 🔴 ×1 (ARI-B4 — aprobación explícita). Los 🔴 van a [registro-aprobaciones.md](../registro-aprobaciones.md).

## 4. Recomendaciones Grupo A

- **ARI-A1 — Entry point (la propuesta central, estilo STC-A1):** mover el seteo de rubros a `beforeSubmit` sobre `scriptContext.newRecord` elimina `record.load()` (38) + `save()` (224), el re-disparo de los UserEvents del registro y, presumiblemente, la necesidad del workaround `_refreshApplyTranList` (238-267), que existe para reparar la sublista `apply` de NC tras el save del script (*inferencia del análisis previo del proyecto, a confirmar*). **Condición de viabilidad a validar:** este script lee `custcol_l598_codigo_impuesto` (302), que `Seteo de Tax Codes` escribe **en su propio `afterSubmit`** — en `beforeSubmit` de un `create`, ese campo podría no estar poblado aún (ver §5). ARI-A1 y STC-A1 deben analizarse **en conjunto**, no por separado. Criterio #8: sugerencia formal + aprobación Tekiio.
- **ARI-A2 — Guard faltante en publicidad ítems (159-161):** corregirlo es un bugfix (cambia el comportamiento del caso de fallo: hoy aborta y pierde todo el seteo; con fix, continúa). Requiere aprobación. Baja probabilidad de disparo en `vendorbill` normal, pero se agrava con >1000 ítems (ARI-B3).
- **ARI-A3 — Sobrescritura incondicional:** decidir con negocio si se reinstaura el guard comentado (315) y si la limpieza con `''` (349) es intencional.
- **ARI-A4 — Guard `idRubroIVA` vs valor `rubroIVAEquivalente` en ventas (339 vs 367-371):** validar con datos reales de las SS si existen mapeos con rubro sin equivalente.
- **ARI-A5 / ARI-A6:** confirmar intencionalidad de `ignoreMandatoryFields:true` (224) y agregar validación del parámetro de publicidad (30).

Todos con estado ⏳ Pendiente en [registro-aprobaciones.md](../registro-aprobaciones.md).

## 5. Dependencias y alcance

**Módulos:** `N/record`, `N/error` (solo dead code), `N/search`, `N/runtime`, `L598/utilities` vía `@NAmdConfig` `configuration_l598.json` (`isEmpty`, `l598esOneworld`, `searchSavedPro` — este último pagina correctamente).

**Relación con `Seteo de Tax Codes` (crítica para caracterización):**
- **Dependencia de datos (hecho):** este script usa `custcol_l598_codigo_impuesto` (302) como clave de mapeo; ese campo lo escribe `Seteo de Tax Codes` en `afterSubmit` (`L598 - Seteo de Tax Codes.js` 89, 99, 110) — y también `Transacción (Servidor)` según el análisis del proyecto. **No hay conflicto de escritura** (ARI escribe `custcol_l598_rubro_iva`/`_equival_ventas`; STC escribe `_codigo_impuesto`/`_tasa_impuesto`), pero ambos re-persisten el registro completo en `afterSubmit`.
- **Orden de ejecución (inferencia — dato faltante):** el orden relativo de los UE (Scripted Records) no es visible en el repo. En un `create`, si ARI corre antes que STC, la primera pasada ve el tax code vacío y saltea las líneas de ítems (condición 305); la convergencia dependería del re-disparo tipo `edit` que provoca el `save()` de STC. **Confirmar en la cuenta antes de caracterizar y antes de evaluar ARI-A1/STC-A1.**
- El `_REF` de STC está aislado (Status Testing), así que la caracterización de ARI corre contra el **original** de STC activo — sin interferencia.

**Consumidor aguas abajo (hecho):** `Generación TXT Localizaciones (Sched)` usa `custcol_l598_rubro_iva` (join a `custrecord_l598_rubro_iva_codigo`, código `514` publicidad) en el TXT DGI (línea 176 del original; 200 del `_REF`). Un error de rubro se propaga al reporte fiscal.

**Alcance por deployments:** el script es agnóstico del tipo (`newRecord.type`); su alcance real está en los deployments de la cuenta (no en el repo). El baseline lo registra en Factura/NC de Venta y Factura de Compra; la rama publicidad solo corre en `vendorbill`/`vendorcredit` (110). **Inventariar deployments como se hizo con STC.**

## 6. Casos de caracterización sugeridos

Contexto UAT: Ventas 06-13 observadas por CAE (**no re-guardar** facturas/NC de venta existentes bloqueadas); Compra UAT 04 ✅ OK.

1. **Factura de Compra (UAT 04) — caso primario, re-ejecutable hoy:** líneas de ítem con tax code mapeado + líneas de gasto con cuenta mapeada. Comparar **línea por línea** `custcol_l598_rubro_iva` y `custcol_l598_rubro_iva_equival_ventas` entre original y `_REF`.
2. **Bordes en la misma Factura de Compra:** gasto cuya cuenta Y tax code tienen rubro (predominio de cuenta, 322-333); línea sin mapeo (rama que limpia con `''`, 349); línea facturable con `customer` (equivalente ventas, 345-347); ítem con `custitem_l598_aplica_publicidad` marcado y sin marcar (161 — de paso confirma el tipo devuelto por el checkbox agrupado); gasto con cuenta con `custrecord_l598_aplica_publicidad`.
3. **NC de Compra (UAT 07 OK, `vendorcredit`):** rama publicidad + verificación de que las aplicaciones (`apply`) quedan intactas tras el save (ARI **no** las refresca para `vendorcredit`; `_refreshApplyTranList` solo cubre `creditmemo`, 241).
4. **Venta (invoice / NC):** crear transacciones **nuevas** de prueba (el guardado y los cálculos avanzan pese al error CAE 100000, según el relevamiento); nunca re-guardar las bloqueadas. Valida la rama `getRubro → rubroIVAEquivalente` (367-371) y ARI-A4. Para NC de venta: aplicaciones intactas post-save (acá sí actúa `_refreshApplyTranList`).
5. **Medición:** GU/tiempo vs baseline 2.9s (`Mobeats Análisis`); esperado leve mejora con B/C/D — el salto llega con ARI-A1.
6. **Verificación indirecta:** re-generar el TXT DGI (BETA 2181) sobre el período de las transacciones caracterizadas — byte-a-byte contra el TXT con el original.

## 7. Dudas abiertas

1. **Orden de ejecución de UEs** (Scripted Records) entre `Asignar Rubro IVA`, `Seteo de Tax Codes` y `Transacción (Servidor)` — determina la viabilidad de ARI-A1 y el diseño de la caracterización.
2. **Tipo devuelto por `getValue` en checkbox con summary GROUP** (161): ¿boolean o string `"T"/"F"`? Si fuera string, `"F"` sería truthy y el rubro publicidad se aplicaría siempre; la operación en producción sugiere que no ocurre — confirmar con un log en la cuenta.
3. **Deployments reales** del script (tipos de registro, status, audiencia, rol de ejecución) — inventario pendiente.
4. **`ignoreMandatoryFields: true` y `enableSourcing: false`** (224): ¿decisión deliberada? ¿Qué obligatorio faltaba?
5. **Contrato de columnas de las 2 SS de mapeo** (orden posicional 0-3, 422-437): documentar IDs de columnas en la cuenta antes de ARI-B4/D7.
6. **Propósito confirmado de `_refreshApplyTranList`** (238-267) y por qué cubre solo `creditmemo` cuando el análogo de STC cubre también `vendorcredit`.
7. **¿Qué proceso consume `custcol_l598_rubro_iva_equival_ventas`?** En el repo solo este script lo escribe/lee; el consumidor (¿refacturación de gastos?) no está identificado.
