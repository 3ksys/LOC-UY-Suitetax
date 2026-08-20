# Informe de Análisis — Setear Unidad Indexada

**Script:** `L598 - Setear Unidad Indexada` · **Archivo:** `LOC UY/L598 - Setear Unidad Indexada.js` · **LOC:** 156
**Tipo:** UserEvent — entry points declarados en el `return{}`: **solo `afterSubmit`** (`L598 - Setear Unidad Indexada.js:153-155`) → **×1 verificado ✔** (coincide con el baseline)
**Módulo:** BCU según ranking (`priorizacion-scripts.md:146`); funcionalmente escribe sobre Transacciones
**Toca impuestos:** sin marca 💰 en el ranking — pero el campo que escribe alimenta una **validación fiscal DGI** (umbral 5000 UI para e-Tickets), relevancia indirecta alta
**Tiempo medido:** 0.8s ×1 en Orden de Venta · 0.7s en Ejecución Artículo/Remito · 0.2s en Resguardo ([flujos](../flujos-prueba-y-plan-ejecucion.md#3-mapeo-operación--scripts--tiempo-real-baseline-medido))

Análisis pre-refactor (fase 1 de la [metodología](../metodologia-refactor.md)). Cobertura: total (156/156 líneas) + dependencias del `define`.

---

## 1. Resumen

El script hace una sola cosa: en `afterSubmit` (create/edit) escribe el campo de cuerpo **`custbody_l598_valor_unidad_indexada`** vía `record.submitFields` (líneas 62-72). El valor sale de dos fuentes posibles: la configuración TAFACE (Saved Search `customsearch_l598_config_ui_seteo_ui`, línea 131) o el tipo de cambio `UI→UYU` de NetSuite (`currency.exchangeRate`, líneas 52-55). Es chico y legible, pero paga 2–3 búsquedas de configuración casi estática **en cada guardado** más una **segunda escritura** del registro ya guardado.

El hallazgo de mayor valor no es de performance: este script es **el único escritor del campo en todo el repo**, y ese campo es exactamente el que exige la validación client-side que **bloqueó el guardado de la Nota de débito e-Ticket en UAT-12**. El análisis del flujo cruzado (§4, SUI-A2) muestra un **deadlock de diseño**: la validación exige el campo *antes* del primer guardado y el único escritor corre *después* del guardado.

| Métrica | Valor verificado |
|---|---|
| LOC | 156 |
| Entry points declarados | 1 (`afterSubmit`) — ×1 ✔ baseline |
| Funciones | 3 (`afterSubmit`, `getConfigFE`, `getConfigUnidadIndexada`) |
| Búsquedas por create/edit | 2–3 (`l598esOneworld` + config FE + [config UI si TAFACE]) + `currency.exchangeRate` en rama no-TAFACE |
| Escrituras por create/edit | 1 `submitFields` extra sobre el registro ya guardado |
| Campos que escribe | **1**: `custbody_l598_valor_unidad_indexada` (línea 66) — ningún `custcol` |
| Tiempo medido | 0.8s ×1 (bajo impacto; valor = higiene de proceso + hallazgo A2) |
| Hallazgos | A: 4 · B: 3 · C: 4 · D: 6 |

> **Nota honesta** (mismo criterio que el informe de Seteo de Tax Codes): el refactor B/C/D de este script aporta una mejora de tiempo **marginal** (0.8s de pico). Su valor real está en (1) aceitar el proceso de la ola 1 y (2) el hallazgo Grupo A sobre UAT-12, que es accionable para Tekiio hoy.

## 2. Hallazgos

### Grupo A — Correctitud (NO entran al refactor; recomendación + aprobación Tekiio)

| ID | Hallazgo | Evidencia | Riesgo |
|---|---|---|:--:|
| SUI-A1 | Patrón `afterSubmit` + `record.submitFields`: segunda escritura completa del registro **después** de que el sistema ya lo guardó; re-dispara los UserEvents de otros scripts en contexto `xedit`. La mejora natural (`beforeSubmit` + `setValue`) es **cambio de entry point → criterio v2 #8: solo sugerencia**. ✔ Verifica el hallazgo del baseline (`priorizacion-scripts.md:235-236`). **Ojo:** este cambio NO resuelve UAT-12 por sí solo (ver §4). | `L598 - Setear Unidad Indexada.js:13,21,62-72` | 🔴 |
| SUI-A2 | **Deadlock con la validación 5000 UI — origen probable de UAT-12.** El campo solo se puebla post-guardado, pero un Client Script lo exige *antes* del primer guardado en e-Tickets. Flujo completo con líneas en §4. | multi-archivo, ver §4 | 🔴 |
| SUI-A3 | **Caminos silenciosos que dejan el campo vacío** (hecho, por lectura del código): (a) rama TAFACE con SS de config UI vacía/con error → retorna `''` (líneas 127, 133, 146-148) → el guard de la línea 60 no escribe; (b) rama no-TAFACE: si `currency.exchangeRate({source:'UI',target:'UYU'})` lanza (p. ej. sin cotización UI del día), el `catch` general solo loguea (75-76) y no escribe; (c) `rate` ≤ 0 o no numérico → no escribe (60). Además, si `getConfigFE` falla, el `catch` (117-120) devuelve `false` y el script **cambia silenciosamente de fuente** (usa el tipo de cambio NS en lugar del valor TAFACE configurado). Toda transacción que quede así con el campo vacío es candidata a bloquearse en un edit posterior por la validación de §4. | líneas citadas | 🟡 |
| SUI-A4 | `ignoreMandatoryFields: true` en el `submitFields` (línea 70): permite persistir la actualización aunque el registro tenga obligatorios incompletos. Sin evidencia en código de por qué es necesario; confirmar intencionalidad (mismo patrón ya cuestionado en el baseline de Asignar Rubro IVA, `priorizacion-scripts.md:246`). | `:68-71` | 🟡 |

> **Criterio v2(a) — filtros de SS con variables sin validar: SIN hallazgo.** El único filtro variable (`custrecord_l598_conf_fe_subsidiaria`) se agrega solo si `isOneWorld && !isEmpty(idSubsidiaria)` (líneas 90-96) ✔. La segunda búsqueda pasa `null` y `searchSavedPro` lo tolera (`L598 - Utilities.js:184`).

### Grupo B — Governance / Performance (SÍ entran)

| ID | Hallazgo | Evidencia | Riesgo |
|---|---|---|:--:|
| SUI-B1 | **2 Saved Searches de configuración casi estática ejecutadas en cada create/edit**: `customsearch_l598_config_fe_seteo_ui` (siempre, línea 98) y `customsearch_l598_config_ui_seteo_ui` (rama TAFACE, línea 131), ambas vía `searchSavedPro` (`search.load` + paginación completa) para leer **una sola columna de una sola fila** (`columns[2]`, líneas 108-110 y 141-143). Candidatas prioritarias del criterio v2(b)/(c): SuiteQL con `SELECT` específico o cacheo (`N/cache`). Reemplazo de mecanismo → requiere validación de equivalencia. | `:98,131` + `L598 - Utilities.js:176-248` | 🔴 |
| SUI-B2 | `utilities.l598esOneworld()` (línea 29) ejecuta un `search.create + runPaged` sobre `customrecord_l598_datos_impositivos_emp` **en cada guardado** para un dato de cuenta invariante (si es OneWorld no cambia entre transacciones). Cachear/memorizar. Módulo compartido → va por `utilities_REF` coordinado (metodología §5). | `L598 - Utilities.js:50-90` | 🟡 |
| SUI-B3 | `searchSavedPro` pagina con `do-while` hasta página vacía: para resultados de 1 fila (el caso de este script) paga **una llamada `getRange` extra siempre**. Se documenta como nota de dependencia compartida. | `L598 - Utilities.js:221-234` | 🟢 |

### Grupo C — Estándares 2.1 (SÍ entran)

| ID | Hallazgo | Evidencia | Riesgo |
|---|---|---|:--:|
| SUI-C1 | `var` en todo el archivo pese a `@NApiVersion 2.1` (línea 2) → `const/let`. Incluye `var subsidiaria` y `var rate` declaradas en **ambas ramas** de sus if/else (33/35 y 44/52) apoyándose en hoisting — requiere declaración única al migrar. | `:11,16,23,26-28,33-35,38,44,52,85,88,91,98,102-103,108,112,127,131,135,141` | 🟢 |
| SUI-C2 | `parseFloat(rate, 10)` (línea 60): `parseFloat` no acepta radix (es la firma de `parseInt`); el `10` se ignora. Quitarlo no cambia comportamiento. | `:60` | 🟢 |
| SUI-C3 | `'N/error'` importado y nunca usado → eliminar del `define` (espejo de STC-C1 del informe modelo). | `:7-9` | 🟢 |
| SUI-C4 | Igualdad loose `==`: en línea 21 (`scriptContext.type`) es seguro migrar a `===` (strings literales). En línea 112 (`tipoIntegracionFE == parametroTipoIntegracionFE`) **NO migrar a ciegas**: el valor de columna SS es string y el parámetro podría no serlo; normalizar con `String()` como hizo el refactor de Seteo de Tax Codes (aprendizaje de su §3). | `:21,112` | 🟡 |

### Grupo D — Mantenibilidad (SÍ entran)

| ID | Hallazgo | Evidencia | Riesgo |
|---|---|---|:--:|
| SUI-D1 | Logs con números de línea hardcodeados **desincronizados**: `"LINE 44"` está en la línea 46 y `"LINE 55"` en la 57. Diagnóstico engañoso. | `:46,57` | 🟢 |
| SUI-D2 | Logging verboso de dump: `log.audit` INICIO/FIN (15, 79), governance remaining (17, 78), debugs de contexto (30, 46, 57, 105, 138). Criterio del modelo: se eliminan los `log.debug` de dump, se conservan los `log.error`. | líneas citadas | 🟢 |
| SUI-D3 | Chequeo redundante/dead branch: la no-vacuidad del resultado se valida dos veces (línea 100 y de nuevo 107 sobre el mismo array; ídem 133 y 140) — la segunda condición nunca es false. | `:100,107,133,140` | 🟢 |
| SUI-D4 | `!utilities.isEmpty(resultConfigFETaface) && resultConfigFETaface` (línea 41) sobre un valor que es **siempre boolean** (`getConfigFE` retorna `true/false`, líneas 85, 113, 119, 122) → `if (resultConfigFETaface)`. | `:41` | 🟢 |
| SUI-D5 | `getConfigFE` y `getConfigUnidadIndexada` duplican el mismo patrón de desempaquetado de `searchSavedPro` (98-116 vs 131-145) → helper único parametrizado (id de SS, filtros, índice de columna). | `:98-116,131-145` | 🟡 |
| SUI-D6 | Acceso **posicional** a columnas de la SS (`columns[2]`, líneas 108-110 y 141-143): acople frágil al orden de columnas definido en la cuenta; reordenar la Saved Search rompería el valor leído sin error visible. Nombrar la columna requiere confirmar la definición de la SS (duda abierta #3). | `:108-110,141-143` | 🟡 |

## 3. Plan de Cambios propuesto (solo B/C/D)

| Criterio | ID | Qué se modifica | Riesgo | Estado |
|---|---|---|:--:|:--:|
| #2 | SUI-B1 | Config FE + config UI: SuiteQL `SELECT` específico o `N/cache` (hoy 2 SS completas por guardado) — **requiere aprobación previa por reemplazo de mecanismo** | 🔴 | ⏳ Propuesto |
| #2 | SUI-B2 | Cachear/memorizar `l598esOneworld` (vía `utilities_REF`, coordinado con el resto de consumidores) | 🟡 | ⏳ Propuesto |
| #3 | SUI-B3 | Nota de dependencia: página `getRange` extra en `searchSavedPro` (se documenta, no se toca en este script) | 🟢 | ⏳ Propuesto |
| #4 | SUI-C1 | `var` → `const/let` (unificando las declaraciones dobles de `subsidiaria`/`rate`) | 🟢 | ⏳ Propuesto |
| #4 | SUI-C2 | Quitar el 2º argumento de `parseFloat(rate, 10)` | 🟢 | ⏳ Propuesto |
| #4 | SUI-C3 | Eliminar `'N/error'` del `define` | 🟢 | ⏳ Propuesto |
| #4 | SUI-C4 | `==` → `===` en línea 21; línea 112 con normalización `String()` (no a ciegas) | 🟡 | ⏳ Propuesto |
| #5 | SUI-D1 | Eliminar logs con "LINE 44"/"LINE 55" desincronizados | 🟢 | ⏳ Propuesto |
| #5 | SUI-D2 | Limpieza de `log.debug`/`log.audit` de dump (conservar `log.error`) | 🟢 | ⏳ Propuesto |
| #5 | SUI-D3 | Simplificar chequeos redundantes de resultado (100/107, 133/140) | 🟢 | ⏳ Propuesto |
| #5 | SUI-D4 | Simplificar el boolean re-chequeado de línea 41 | 🟢 | ⏳ Propuesto |
| #6 | SUI-D5 | Helper único de desempaquetado de `searchSavedPro` para ambas funciones de config | 🟡 | ⏳ Propuesto |
| #6 | SUI-D6 | Referenciar la columna de la SS por nombre en lugar de `columns[2]` (bloqueado por duda abierta #3) | 🟡 | ⏳ Propuesto |

## 4. Recomendaciones Grupo A — relación con UAT-12

### SUI-A2 — El deadlock que explica UAT-12 (hallazgo de alto valor para Tekiio)

**Flujo completo, con líneas.** Tres piezas:

1. **Único escritor (hecho).** `grep` de `custbody_l598_valor_unidad_indexada` en todo `LOC UY/`: 3 archivos. Este script lo **escribe** (`L598 - Setear Unidad Indexada.js:62-72`, solo en `afterSubmit` create/edit); los otros dos solo lo **leen**. No existe otro escritor en el repo.
2. **El validador (hecho).** `URU - Validaciones por transacciones mayor a 5000 ui (CL).js` — Client Script `saveRecord`, corre **en el navegador antes de enviar el registro al servidor**. Si `validacionUi.mayor5000` es true y el campo está vacío → `alert("El campo URU-Valor Unidad Indexada debe estar completo.")` y `return false` → **el guardado nunca ocurre** (líneas 23, 44-47). Ese texto existe en un único lugar del repo (verificado por grep): es, con certeza práctica, la fuente literal del error de UAT-12.
3. **La coerción que arma la trampa (hecho, semántica JS).** `URU - Validaciones por transaccion mayor a 5000 ui (LIB).js:23-35`: solo valida si `custbody_l598_trans_eticket` es true; calcula `totalUi = subtotal / ui` (línea 32). Con el campo vacío, `Number('') === 0` → `subtotal / 0 = Infinity` → `Infinity > 5000 = true` para **cualquier** subtotal positivo. Es decir: **con el campo UI vacío, todo e-Ticket con subtotal > 0 se bloquea, esté o no realmente por encima de 5000 UI.**

**La secuencia del deadlock (hecho por semántica del código):** en el **alta** de una transacción e-Ticket, el `saveRecord` client-side corre antes del primer guardado; en ese momento el campo está necesariamente vacío (el único escritor es un `afterSubmit` que jamás corrió para ese registro) → la validación bloquea → el guardado no ocurre → el escritor no corre nunca. Salida posible solo cargando el valor a mano.

**Qué es hecho y qué es inferencia sobre UAT-12 concretamente:**
- *Hecho (deducción código + mensaje observado):* el mensaje reportado solo puede salir de la rama CL:44-47, que exige simultáneamente flag e-Ticket true, campo vacío y subtotal > 0. El error observado prueba además que el CL **sí está deployado** en el tipo de registro de la ND.
- *Inferencia (alta confianza):* que la ND de UAT-12 siguió exactamente este camino y por eso "ni siquiera existe como transacción" ([caracterización](../caracterizacion/1-seteo-de-tax-codes.md) — consistente con un `return false` pre-submit).
- *Inferencia (por qué la Orden de Venta sí guardó):* o el flag `custbody_l598_trans_eticket` estaba false en la OV, o el CL no está deployado en `salesorder`. Tras el primer guardado, este script pobló el campo (evidencia medida: corre en OV), por eso la OV es re-guardable. No verificable desde el repo (duda abierta #5).

**Punto clave para la decisión:** la sugerencia del baseline (mover este UE a `beforeSubmit`) **NO resuelve UAT-12**: el bloqueo es client-side y ocurre antes de cualquier evento server-side. Opciones a evaluar con Tekiio (todas 🔴, cambian comportamiento): (a) corregir la LIB para que "campo vacío" no se evalúe como `> 5000` (la división por vacío es indistinguible de un monto gigante); (b) poblar el campo client-side (p. ej. `pageInit`/`fieldChanged`) o por defaulting de formulario; (c) definir la semántica fiscal deseada cuando el valor UI no está disponible. Nota: (a) sola abriría un hueco (un e-Ticket genuinamente > 5000 UI pasaría la primera vez sin los campos DGI) — la decisión es de negocio, no técnica.

### Resto del Grupo A

- **SUI-A1** (entry point `afterSubmit`→`beforeSubmit` + `setValue`): elimina la segunda escritura y el re-disparo de UEs (`xedit`); criterio v2 #8 → solo sugerencia con aprobación explícita. Beneficio de GU real, pero **complementario** a la solución de UAT-12, no sustituto.
- **SUI-A3**: los caminos silenciosos que dejan el campo vacío son los que *siembran* transacciones bloqueables por la validación de arriba. Recomendación: definir con Tekiio si un fallo al obtener el valor debe ser visible (log.error ya existe solo en algunos caminos) y si el fallback de fuente (TAFACE→exchangeRate ante error de SS) es intencional.
- **SUI-A4**: confirmar la intencionalidad de `ignoreMandatoryFields: true`.

Todos a registrar en [registro-aprobaciones.md](../registro-aprobaciones.md) con estado ⏳ Pendiente (metodología §9).

## 5. Dependencias y alcance

- **`@NAmdConfig /SuiteScripts/configuration_l598.json`** (`LOC UY/configuration_l598.json`): mapea `L598/utilities` → `L598 - Utilities.js` (**API 2.0**, compartido). Funciones consumidas: `isEmpty` (11-24), `l598esOneworld` (50-90), `searchSavedPro` (176-248). Nota: `searchSavedPro` asigna `objRsponseFunction` **sin `var`** (`L598 - Utilities.js:235`) — global implícito en módulo compartido; inocuo en la práctica por reasignación inmediata, pero es un leak a corregir en `utilities_REF`, no en este script.
- **Módulos NetSuite:** `N/record` (submitFields), `N/runtime` (parámetro), `N/currency` (exchangeRate `UI→UYU`), `N/error` (**muerto**, SUI-C3).
- **Parámetro de script:** `custscript_l598_set_ui_tipo_in_fe_taface` (línea 23) — decide qué configuración FE cuenta como TAFACE.
- **Artefactos de cuenta (no versionados):** SS `customsearch_l598_config_fe_seteo_ui` y `customsearch_l598_config_ui_seteo_ui`; registro `customrecord` de config FE (filtro `custrecord_l598_conf_fe_subsidiaria`, línea 92). *Inferencia razonable:* la cotización `UI→UYU` la alimenta la integración BCU del paquete (módulo BCU del ranking) — si la cotización del día falta, aplica SUI-A3(b).
- **Consumidores del campo:** la dupla CL/LIB de 5000 UI (§4). El flag `custbody_l598_trans_eticket` que gatilla esa validación lo manejan `L598 -Transacción (Servidor).js:1040-1042` y `L598 - Descuento por Cuenta Ajena.js:125-127`, entre otros.
- **Deployments:** no versionados en el repo. Evidencia medida de ejecución: Orden de Venta, Ejecución Artículo/Remito y Resguardo; la tabla resumen agrega Factura de Venta. Inventario real → duda abierta #1.

## 6. Casos de caracterización sugeridos

Contexto UAT: la Orden de Venta existe y es re-guardable; la ND e-Ticket **no existe como transacción** (falló al guardar) → no sirve para caracterizar.

1. **Edit + guardar la OV existente** (caso base, mismo criterio que el smoke de Seteo de Tax Codes): comparar `custbody_l598_valor_unidad_indexada` original vs `_REF` — valor idéntico; medir GU/tiempo vs baseline 0.8s.
2. **Create de OV nueva (no e-Ticket):** campo poblado tras el primer guardado en ambas versiones.
3. **Resguardo (URU)** create/edit (baseline 0.2s) y **Remito/Ejecución de artículo** (0.7s): mismos pares original/`_REF`.
4. **Cobertura de ambas ramas de fuente:** un caso con config TAFACE activa (rama `getConfigUnidadIndexada`) y otro con la rama `currency.exchangeRate` — cuál aplica en la cuenta es la duda abierta #2; idealmente forzar ambas.
5. **Borde SUI-A3 (sin disparar el bug, regla metodología §7):** escenario donde el valor no se obtiene (p. ej. SS de config UI sin filas) → verificar comportamiento idéntico en ambas versiones (campo queda vacío + mismo log); es preexistente, no debe "arreglarse" en el `_REF`.
6. **Contexto `xedit`:** un `submitFields` de otro script no debe disparar el seteo (guard de línea 21) — verificar equivalencia original/`_REF`.
7. **ND e-Ticket:** excluida de la caracterización hasta que Tekiio resuelva SUI-A2; hoy el caso ni puede crearse.

## 7. Dudas abiertas

1. **Inventario de deployments del original**: qué record types cubre (¿incluye el tipo de registro de la ND e-Ticket?), estado y log level — no versionado en repo.
2. **¿Qué rama corre en la cuenta UAT/demo?** TAFACE (SS config UI) o `currency.exchangeRate` — depende del parámetro del deployment y del registro de config FE.
3. **Definición de las 2 Saved Searches de config**: qué campo es `columns[2]` en cada una y cuántas columnas tienen (necesario para SUI-D6 y para la migración SUI-B1; también permite evaluar criterio v2(b) exceso de columnas).
4. **¿Existe defaulting de formulario/workflow en la cuenta** que pueble `custbody_l598_valor_unidad_indexada` antes del guardado? En el repo no hay otro escritor; si existiera, matiza el diagnóstico de SUI-A2.
5. **¿Por qué la OV de UAT no disparó la validación 5000 UI?** (¿flag e-Ticket false en OV, o CL sin deployment en `salesorder`?) — confirmar deployments del CL `URU - Validaciones por transacciones mayor a 5000 ui`.
6. **¿Qué record type es la ND e-Ticket en esta implementación** (invoice con tipo de comprobante localizado vs `customtransaction`)? Define dónde habría que deployar cualquier fix de SUI-A2.
7. **Moneda `UI` y cotización diaria**: ¿qué pasa un día sin cotización cargada por la integración BCU? (activa SUI-A3(b); hoy el fallo sería silencioso salvo por el `log.error` del catch general).
