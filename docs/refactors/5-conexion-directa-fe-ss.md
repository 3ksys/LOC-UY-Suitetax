# Informe de Análisis — Conexion Directa FE (SS)

**Script:** `L598 - Conexion Directa FE (SS)` · **Archivo:** `LOC UY/L598 - Conexion Directa FE (SS).js` · **LOC:** 4.362 (verificado con `wc -l`)
**Tipo:** UserEvent 2.1 (`beforeLoad` + `afterSubmit`, retornados en líneas 4360-4361 → **×2** verificado) · **Módulo:** Facturación Electrónica (CFE) · **Toca impuestos:** sí 💰 + FE
**Tiempo medido (baseline):** Remito **21.6s ×2** (pico del proyecto) · NC Venta 12.0s · Factura Venta 11.6s · Resguardo 1.8s
**Estado:** análisis PRE-refactor. Ningún archivo modificado. Todas las referencias `NNNN` son líneas del archivo del script salvo indicación contraria.

---

## 1. Resumen

### Qué hace

Prepara el **payload del comprobante fiscal electrónico (CFE)** de una transacción y lo deja persistido en el File Cabinet como **JSON + XML** (renderizado contra la plantilla FreeMarker del proveedor de facturación). **No envía** el documento: el envío sale por el botón **"Generar CAE 2.0"** (que este script agrega en `beforeLoad`) o, si la configuración del proveedor tiene `generarCaeAutomatico`, por un `https.post` **síncrono** al Suitelet `customscript_l598_conexion_directa_fe_sl` dentro del propio `afterSubmit`.

- **`beforeLoad` (VIEW):** carga el registro completo, valida configuración FE y agrega el botón si no hay CAE ni modo automático (95-135).
- **`afterSubmit` (CREATE/EDIT/"ship"):** `record.load` dinámico (539) → `getConfigurationFE` → Saved Search de ~89 columnas → `buscarInformacionFE` (arma todo el payload: encabezado, cliente, líneas, IVA por tasa, percepciones/retenciones, referencias) → agrupación opcional de líneas (655-696) → archivo JSON (742-749) → render de plantilla XML (766-785) → archivo XML (788-795) → `save()` (811) → *(solo modo automático)* post al Suitelet (842-845), re-load (848), `grabarDatosCAE` (996) y `envioEmail` (1072).

### Mapa estructural

| Función | Líneas | Rol |
|---|---|---|
| `beforeLoad` | 67-166 | Botón Generar CAE 2.0 en VIEW |
| `getConfigurationFE` | 184-500 | Valida transacción + configuración del proveedor FE (TAFACE/UCFE/SIGE/FacturaLista) |
| `afterSubmit` | 511-1151 | Orquestador: payload → archivos → save → (auto) CAE |
| `grabarError` | 1153-1232 | Crea `customrecord_l598_fact_elec_log` + `_dlog` |
| `envioEmail` | 1234-1320 | Notificación por email — **rota, nunca envía** (ver CDF-A2) |
| `parseDate` / `padding_left` | 1322-1344 / 1346-1357 | Fecha con timezone (hace `config.load` por llamada) / padding (duplicada en 3621) |
| **`buscarInformacionFE`** | **1358-3603** | **~2.246 líneas (51% del archivo):** todo el cálculo del CFE — IVA por columna de acumulación (switch de 12 casos, 2117-2181), descuentos/recargos, resguardos, referencias, totales (3349-3370) |
| `nvl` / `validarSiNumero` / `toFixedOK` (prototype) | 3605-3619 | Utilitarios; `Number.prototype.toFixedOK` en 3616 |
| `agruparInformacionCAE` / `verificarCAETransaccionDetalleLogFE` / `grabarDatosCAE` | 3672-3845 | Persistencia del CAE en la transacción (~17 `setValue` + `save` en 3794-3838) |
| `obtenerReferenciasPago` / `factPagada` / `formatDateDGI` | 3847-4005 | Referencias de cobranza |
| `getMetodosPago` / `getPagosSublistas` / `round` | 4007-4118 | Detalle de métodos de pago — **bug CDF-A1** |
| `voidJournalPagosMultiples` / `UnapplyInvoices` / `setTimeout` / `getChequesByCustpayment` | 4120-4284 | **Código muerto: ninguna se invoca en el archivo** (verificado por grep) |
| `getConfigLineasGastos` | 4286-4357 | Config de líneas de gastos refacturables |

### Métricas

| Métrica | Valor | Evidencia |
|---|---|---|
| LOC | 4.362 | `wc -l` |
| Función más grande | `buscarInformacionFE`, ~2.246 líneas | 1358-3603 |
| Entry points | 2 (`beforeLoad`, `afterSubmit`) | 4360-4361 |
| Código muerto | ~165 líneas de funciones jamás invocadas + >160 líneas de bloques comentados (incluye restos `nlapi*` 1.0) | 4120-4284; 2507-2565, 2703-2744, 3322-3339, 3558-3585 |
| Saved Searches vivas | 8 (+1 `search.create` en `envioEmail`) — la principal con **≥89 columnas por índice** | 286, 602, 1251, 2724, 2992, 3175, 3939, 4305; `columns[88]` en 3385 |
| Cargas/saves del registro por `afterSubmit` | 1 `record.load` dinámico + 1 `save` (modo botón); **2 loads + 2 saves** (modo automático) | 539/811 y 848/3838 |
| Imports sin uso real | `N/error` (0 usos); `N/transaction` solo en código muerto (4167) | grep verificado |
| Global leaks (asignación sin declarar) | ≥12 | 734-735, 1335, 1768/1770, 1849, 1856, 2023, 2227, 2581, 2768, 2799, 2819, 2954, 3140 |

---

## 2. Hallazgos

### Grupo A — Correctitud (NO entran al refactor; recomendación separada)

| ID | Hallazgo | Evidencia | Hecho/Inferencia | Riesgo del fix |
|---|---|---|---|:--:|
| CDF-A1 | `getMetodosPago`: `formaPagoNetSuite` **no está declarada en ningún lugar del archivo** (único match del grep: 4042). En la rama de forma de pago **simple** (la más común: `formaPagoMultiple != formaPago`, 4024/4040) lanza `ReferenceError` → atrapado por el catch (4057-4061) que solo hace `log.debug` → `response.error=true` → `detalleMetodosPago` queda **siempre vacío** en el CFE (1430-1434). La rama múltiple (`getPagosSublistas`) sí funciona. | 4042; llamada incondicional en 1430 | Hecho (estático, determinístico) | 🔴 |
| CDF-A2 | `envioEmail` **nunca envía el mail**, por triple defecto: (a) usa `isEmpty(...)` y `userActual`, ninguno definido (1303) → `ReferenceError` antes de `email.send` (1307); (b) el `catch` loguea con `proceso`, tampoco definido en esa función (1318) → segundo `ReferenceError` que **escapa** de `envioEmail` y cae en el catch general de `afterSubmit` (1142); (c) la llamada pasa **10 argumentos** (1072, incluye `userObj.id`) contra una firma de **9 parámetros** (1234) — el usuario actual nunca llega, que es justamente lo que `userActual` intentaba ser. | 1303, 1318, 1072 vs 1234 | Hecho | 🔴 |
| CDF-A3 | Rama de **anulación de resguardo**: el `lookupFields` pide la columna `custentity_l598_tipo_documento` (1626) pero el código accede `informacionCliente.custbody_l598_tipo_comprobante[0].value` (1634) → propiedad inexistente → `TypeError` → catch general (3593) marca el documento con error. Toda `customtransaction_l598_anul_resguardo` con NC vinculada entra a esta rama (1619). | 1619-1641 | Hecho por lectura; confirmar en sandbox que la rama se ejercita | 🔴 |
| CDF-A4 | Detalle de retenciones de resguardos: `search.load('customsearch_l598_obt_inf_uru_det_ret')` + `getRange({start:0,end:1000})` **sin bucle de paginación** (2724-2734) — truncamiento silencioso si el resguardo vincula >1000 detalles. Reemplazó una versión comentada que sí paginaba vía `utilities.searchSavedPro` (2736-2744; `searchSavedPro` pagina con do/while, verificado en `L598 - Utilities.js:221-234`). | 2724-2744 | Hecho | 🔴 |
| CDF-A5 | Bloques **Costo de Envío** (2951-3133) y **Costo de Manipulación** (3135-3315) están muertos: `costoEnvio = ""` (2954) y `CostoManipulacion = ""` (3140) se hardcodean justo antes de la condición que los habilitaría (2956, 3144). Si el negocio espera esos costos como línea del CFE, hoy no viajan a DGI. No se puede determinar del código si es funcionalidad deshabilitada a propósito. | 2954-2956, 3140-3144 | Hecho (código muerto); intención = duda funcional | 🔴 confirmar antes de corregir **o** eliminar |
| CDF-A6 | `getLineCount(string)` en **2** llamadas: `getLineCount(tipoSublistaConsultar)` (1995, loop principal de líneas) y `getLineCount(sublistaRefCFE)` (2926, referencias de resguardo), contra las **9** llamadas correctas con `{sublistId}` del mismo archivo (641, 1977, 2673, 2697, 3720, 3815, 3855, 4094, 4203). La forma string no está documentada en la API 2.x; los CFE salen con líneas en producción, así que hoy es tolerada, pero es frágil ante cambios de runtime. Normalizarla toca el loop del cálculo fiscal → validar con caracterización antes de aplicar. | 1995, 2926 | Hecho (inconsistencia); tolerancia del runtime = inferencia apoyada en que producción funciona | 🟡 con caracterización |
| CDF-A7 | **Reentrancia sin guard:** `afterSubmit` hace `save()` de la misma transacción que disparó el evento (811) y otro en `grabarDatosCAE` (3838), sin chequear `runtime.executionContext` ni marca de re-disparo. Si el deployment no filtra contexto, cada guardado re-dispararía este UE (y los demás de la transacción), multiplicando el costo medido. | 811, 3838, 537 (types que disparan) | Inferencia — depende del *context filtering* del deployment (no visible en el repo); confirmar con logs de ejecución | 🔴 |
| CDF-A8 | Degradación de diagnóstico (menor): en el loop de resguardos se loguea `log.error(proceso, mensaje)` con `mensaje` (hoisted, normalmente `undefined`) en lugar de `mensajeError` (2894, 2902, 2919); en la validación de subtotal se chequea 2 veces `descripcionLinea` y nunca `transImporte` (2593); el mensaje de error solo pierde detalle, el flujo de error es el mismo. | 2894, 2902, 2919, 2593 | Hecho | 🟡 |

> **Nota sobre filtros de Saved Search con variables (criterio v2-a):** los filtros dinámicos de este script validan vacío antes del push (p. ej. 244-249, 594-600, 2979-2985) o usan valores constantes. El riesgo real de robustez está en CDF-A4 (paginación), no en filtros sin validar.

### Grupo B — Governance / Performance (SÍ entran)

Anatomía del costo del `afterSubmit` (explica los 11-21s medidos): `record.load` dinámico (539) + `getConfigurationFE` [lookupFields 212 + búsqueda `l598esOneworld` 198 + SS proveedor 286 + lookupFields indicador 309] + **segunda** llamada a `l598esOneworld` (581) + SS de 89 columnas (602) + `buscarInformacionFE` (lookups condicionales + SS config gastos 4305 + loop de 4 sublistas × líneas con ~20 `getSublistValue` por línea) + `parseDate`→`config.load` (700) + 2 `file.create/save` + `file.delete` + `file.load` plantilla + render + `save()`; en modo automático suma `https.post` **síncrono** (842), segundo `record.load` (848), `grabarDatosCAE` (17 setValue + save, 3794-3838) y 2 `record.create/save` de logs por `grabarError` (1181-1223).

| ID | Hallazgo | Evidencia | Riesgo |
|---|---|---|:--:|
| CDF-B1 | **`customsearch_l598_trans_gen_cae_con_dire`: ≥89 columnas accedidas por índice posicional** (`columns[0]`…`columns[88]`, p. ej. 622-635, 1373-1382, 3376-3386) en el corazón del flujo CAE. Candidata **prioritaria** a SuiteQL/Workbook (criterio v2-b/c): exceso de columnas, fragilidad ante reordenamiento (rompe en runtime sin error de compilación) y costo de GU. Reemplazo estructural → iniciativa propia con regresión completa. | 602, 3385 | 🔴 |
| CDF-B2 | `beforeLoad` en **cada VIEW** hace `record.load` completo (95-98) solo para leer 5 campos, y encima `getConfigurationFE` vuelve a consultar la misma transacción por `lookupFields` (212). Consolidar en un único `lookupFields` elimina la carga completa por visualización. | 95-98, 110-122, 212 | 🟡 |
| CDF-B3 | `utilities.l598esOneworld()` ejecuta una búsqueda **cada llamada** (`L598 - Utilities.js:50-90`) y se invoca 2 veces por `afterSubmit` (198 vía `getConfigurationFE` + 581) y 1 por `beforeLoad`. Es una constante de la cuenta → memoizar a nivel módulo. | 198, 581 | 🟢 |
| CDF-B4 | `parseDate` hace `config.load(COMPANY_INFORMATION)` en **cada llamada** (1336); lo llaman `grabarError` (1162 — o sea, cada log FE, éxito o error) y `afterSubmit` (700). Cachear el timezone por ejecución. Además calcula `companyDateTime2` que solo se loguea (1340-1341). | 1322-1344 | 🟢 |
| CDF-B5 | Modo automático: **doble load + doble save** de la misma transacción (539/811 y 848/3838). La consolidación (o `submitFields` para los campos de cabecera del CAE) reduce GU y triggers, pero cambia el mecanismo de persistencia de un flujo fiscal → solo con aprobación y regresión (mismo patrón ya señalado en `Actualizar Inf Transacciones FE`). | 539, 811, 848, 3838 | 🔴 |
| CDF-B6 | Logging de alto volumen dentro del loop de líneas: `log.debug` por línea e iteración (2206, 2209, 2213, 2218, 2247) más `JSON.stringify` de objetos grandes (`resultadoIndividual` completo en 3372, `objetoRespuesta` completo en 3601, `loadSearch` en 2729). En un remito de N líneas son 5N+ escrituras de log; contribuye al tiempo real medido. | 2206-2247, 3372, 3601 | 🟢 |
| CDF-B7 | `searchSavedPro` construye siempre un array procesado extra (`armarArreglosSS`, `L598 - Utilities.js:238`) que este script **nunca consume** (usa `.result`/`.search`). Para la SS de 89 columnas es CPU desperdiciada por fila. Fix en `utilities_REF` (convención §5 de la metodología) para no contaminar otros consumidores. | Utilities.js:238-239 | 🟡 |

### Grupo C — Estándares 2.1 (SÍ entran)

| ID | Hallazgo | Evidencia | Riesgo |
|---|---|---|:--:|
| CDF-C1 | Mezcla masiva `var`/`let`/`const` con hoisting explotado (p. ej. `montoItem` logueado en 2213 antes de declararse en 2216; `mensaje` de 1668 leído en 2894). Migrar a `const`/`let` con alcance de bloque. | todo el archivo | 🟢 |
| CDF-C2 | Restos SuiteScript 1.0 **solo en comentarios**: `nlapiLookupField` (1620, 1686-1688, 1771), `nlobjSearchFilter/Column` (2987-2990), `nlapiLogExecution` (2512, 3584 — ambos dentro de bloques comentados). No hay 1.0 vivo; se eliminan junto con el dead code. | grep verificado | 🟢 |
| CDF-C3 | `Number.prototype.toFixedOK` (3616-3619) extiende el prototipo nativo y se usa ~45 veces en montos fiscales. Mover a función de módulo **sin alterar la fórmula de redondeo** (mismo patrón ya detectado en `Descuento por Cuenta Ajena` y `Balance Tributario`). | 3616-3619 | 🟡 |
| CDF-C4 | Imports sin uso: `N/error` (0 referencias) y `N/transaction` usado únicamente por la función muerta `voidJournalPagosMultiples` (4167). `N/email` queda condicionado a la decisión sobre CDF-A2. | define 9-11 | 🟢 |
| CDF-C5 | Patrón `parseFloat(x, 10)` en decenas de expresiones — `parseFloat` no acepta radix, el segundo argumento se ignora. Limpieza cosmética sin cambio de resultado; también `parseInt(10, 10)` (642). | 642, 2125, 2131 y decenas más | 🟢 |

### Grupo D — Mantenibilidad (SÍ entran)

| ID | Hallazgo | Evidencia | Riesgo |
|---|---|---|:--:|
| CDF-D1 | **`buscarInformacionFE`: ~2.246 líneas** (1358-3603), >12 niveles de anidamiento, ~60 variables mutables compartidas entre bloques (importes de IVA por tasa, banderas de error). Es la función fiscal central: su división es una **iniciativa dedicada** con cobertura de caracterización previa, no un cambio incremental. | 1358-3603 | 🔴 |
| CDF-D2 | **Código muerto:** 4 funciones jamás invocadas — `voidJournalPagosMultiples` (4120-4186), `UnapplyInvoices` (4188-4238), `setTimeout` con **busy-wait** (4240-4247), `getChequesByCustpayment` (4249-4284) — aparentemente copiadas de `Setear Valores Anulacion Cobranza`; + `padding_left` duplicada (1346 vs 3621); + bloques comentados grandes (2507-2565, 2703-2744, 3322-3339, 3558-3585, 2783-2793, 1597-1611). Arrastran 2 Saved Searches fantasma (4137, 4261). | grep: solo definiciones, cero llamadas | 🟢 |
| CDF-D3 | **Global leaks** (asignación sin declaración): `importeNoFacturable`/`cantidadLineas` en `afterSubmit` (734-735, además escriben sobre nombres que `buscarInformacionFE` usa como locales), `currentDateTime` (1335), `codigoMonedaTransaccion` (1768/1770), `columnaAcumIndFacturacionDescRec` (1849), `porcentajeParaAplicar` (1856), `infoPercepcion` (2023, 2768), `informacionLinea` (2227, 2799), `informacionSubTotal` (2581), `infoRetencion` (2819), `costoEnvio` (2954), `CostoManipulacion` (3140). Declararlas localmente — sin tocar la semántica de CDF-A5. | líneas citadas | 🟡 |
| CDF-D4 | Filtro duplicado idéntico en `getConfigurationFE`: el mismo push de `custrecord_l598_prov_fe_comp_dgi_tip_com` se hace dos veces seguidas (252-259 y 261-268) — la SS recibe el filtro repetido; inocuo pero confuso. | 252-268 | 🟢 |
| CDF-D5 | `codigoPercEncontrado == true;` — comparación donde debía haber asignación (2298): el flag del loop nunca se setea. **Sin efecto observable hoy** porque los códigos del acumulador son únicos por construcción (solo se pushean si no existen, 2311-2321), pero es un bug lógico latente; corregirlo es byte-idéntico. | 2296-2302 | 🟢 |
| CDF-D6 | Logs con marcadores desincronizados: ~90 mensajes `'LINE NNN'` que no corresponden a las líneas reales del archivo (p. ej. `LINE 95` en 138, `LINE 2436` en 3600) — sabotean el diagnóstico en producción. | 138, 151, 291, 3600, etc. | 🟢 |
| CDF-D7 | Cosmética: dobles `;;` (2802-2804), `new Array()`/`new Object()` (2676, 2312, 3891), naming inconsistente (`referenciaGloabal`, 3376). | citadas | 🟢 |

---

## 3. Plan de Cambios propuesto (solo B/C/D — ordenado por criterio #1→#6)

| Criterio | ID | Qué se modifica | Riesgo | Estado |
|---|---|---|:--:|:--:|
| #2 Governance | CDF-B1 | Migrar `customsearch_l598_trans_gen_cae_con_dire` (89 col. posicionales) a SuiteQL/Workbook — **propuesta dedicada**, prioridad v2 del cliente | 🔴 | ⏳ Propuesto |
| #2 Governance | CDF-B2 | `beforeLoad`: reemplazar `record.load` completo por el `lookupFields` que ya existe en `getConfigurationFE` (una sola consulta) | 🟡 | ⏳ Propuesto |
| #2 Governance | CDF-B3 | Memoizar `l598esOneworld()` por ejecución (hoy 2-3 búsquedas idénticas por evento) | 🟢 | ⏳ Propuesto |
| #2 Governance | CDF-B4 | Cachear timezone en `parseDate` (elimina `config.load` por cada log FE) + quitar cálculo muerto `companyDateTime2` | 🟢 | ⏳ Propuesto |
| #2 Governance | CDF-B7 | `utilities_REF`: `armarArreglosSS` bajo demanda en `searchSavedPro` | 🟡 | ⏳ Propuesto |
| #3 Performance | CDF-B6 | Quitar `log.debug` por línea del loop y `JSON.stringify` de objetos grandes (conservar `log.error`) | 🟢 | ⏳ Propuesto |
| #4 Patrones | CDF-C4 | Eliminar `N/error` del `define`; `N/transaction` cae con CDF-D2 | 🟢 | ⏳ Propuesto |
| #4 Patrones | CDF-C3 | `toFixedOK`: de prototype a función de módulo, fórmula intacta | 🟡 | ⏳ Propuesto |
| #4 Patrones | CDF-C5 | Limpiar `parseFloat(x,10)`/`parseInt(10,10)` (radix inerte) | 🟢 | ⏳ Propuesto |
| #5 Legibilidad | CDF-C1 | `var` → `const`/`let` con alcance de bloque | 🟢 | ⏳ Propuesto |
| #5 Legibilidad | CDF-D3 | Declarar los ≥12 global leaks (sin cambiar la semántica de CDF-A5) | 🟡 | ⏳ Propuesto |
| #5 Legibilidad | CDF-D4 | Quitar el filtro duplicado (252-268) | 🟢 | ⏳ Propuesto |
| #5 Legibilidad | CDF-D5 | `codigoPercEncontrado =` (asignación) — byte-idéntico, documentado en el informe del refactor | 🟢 | ⏳ Propuesto |
| #5 Legibilidad | CDF-D6/D7 | Corregir/retirar marcadores `LINE NNN` y cosmética | 🟢 | ⏳ Propuesto |
| #6 Reutilización | CDF-D2 | Eliminar funciones muertas (4120-4284), `padding_left` duplicada y bloques comentados con restos 1.0 (CDF-C2) | 🟢 | ⏳ Propuesto |
| #6 Reutilización | CDF-D1 | División de `buscarInformacionFE` — **iniciativa dedicada**, no entra en esta ola | 🔴 | 💡 Candidato |

**Matriz de riesgo:** 🟢 ×9 (sin aprobación) · 🟡 ×5 (revisión conjunta) · 🔴 ×3 (CDF-B1, CDF-B5, CDF-D1 — requieren aprobación explícita y no se aplican en este refactor).

---

## 4. Recomendaciones Grupo A

Todas fuera del refactor; requieren decisión/aprobación de Tekiio. Para el registro central de aprobaciones: CDF-A1…CDF-A7.

1. **CDF-A1 — `detalleMetodosPago` siempre vacío (verificación del hallazgo previo, con corrección de alcance).** El hallazgo documentado en `docs/priorizacion-scripts.md:289` — `getMetodosPago` (662-687) y `getPagosSublistas` (597-645) con APIs SuiteScript 1.0 (`rec.getFieldValue`, `getLineItemCount`, etc.) — **pertenece a `LOC UY/L598 - Obtener Inf Transacciones FE.js`** (así está encabezado en esa sección del documento), no a este script. Verificado contra este archivo: aquí las mismas funciones ya están **migradas a 2.x** (`rec.getValue({fieldId})` en 4020, `getLineCount({sublistId})` en 4094, `getSublistValue/Text` en 4099-4105), pero la migración dejó **`formaPagoNetSuite` sin declarar (4042)**. El efecto neto es el equivalente al documentado: `ReferenceError` atrapado por el catch interno (4057-4061), solo `log.debug`, y el CFE viaja **sin detalle de método de pago** en toda transacción cuya forma de pago no sea la "múltiple" configurada (la rama más común para `customerpayment`). Es el mismo síntoma de **migración 1.0→2.0 incompleta**, con causa distinta en cada script. Ambos deben tratarse juntos como recomendación de corrección aparte, con validación fiscal de qué debe viajar en `detalleMetodosPago`/`detalleFormaPago`. **No se corrige en el refactor.**
2. **CDF-A2 — Notificaciones de CAE muertas.** `envioEmail` nunca envía (1303: `isEmpty`/`userActual` inexistentes; 1318: `proceso` inexistente en el catch; 1072 vs 1234: 10 argumentos contra 9 parámetros). Corregirlo *enciende* mails que hoy no salen → cambio de comportamiento observable, decisión de negocio.
3. **CDF-A3 — Anulación de resguardo rompe el payload.** Lookup pide `custentity_l598_tipo_documento` y el código lee `custbody_l598_tipo_comprobante` (1626/1634) → toda la rama falla con `TypeError`. Validar en sandbox con una anulación real antes de decidir el fix.
4. **CDF-A4 — Truncamiento a 1000 en detalle de retenciones** (2724-2734). Restaurar paginación (p. ej. volver a `searchSavedPro`) cambia resultados posibles → aprobación. Coincide con el patrón de truncamiento ya marcado como riesgo del proyecto.
5. **CDF-A5 — Costo de Envío/Manipulación deshabilitados por hardcode** (2954, 3140). Confirmar con Tekiio si es decisión de negocio (→ eliminar ~360 líneas muertas en el refactor D) o un defecto (→ corrección fiscal con aprobación).
6. **CDF-A6 — `getLineCount(string)`** (1995, 2926): normalizar a `{sublistId}` solo con caracterización byte-a-byte que cubra el loop de líneas y las referencias de resguardo.
7. **CDF-A7 — Reentrancia de los `save()` internos** (811, 3838): pedir a Tekiio los logs de ejecución / configuración de context filtering del deployment para confirmar si el `afterSubmit` se re-dispara a sí mismo (impacta directamente la lectura del 21.6s del Remito).

---

## 5. Dependencias y alcance

**Imports (`define`, 9-11):** `N/record`, `N/error` (sin uso), `N/search`, `L598/utilities`, `N/runtime`, `N/format`, `N/config`, `N/file`, `N/render`, `N/url`, `N/https`, `N/transaction` (solo código muerto), `N/email` (solo `envioEmail` rota). Resolución AMD vía `@NAmdConfig /SuiteScripts/configuration_l598.json` → `L598/utilities` = `LOC UY/L598 - Utilities.js`.

**Módulo compartido `L598 - Utilities.js`:** usa `isEmpty` (11-24), `l598esOneworld` (50-90, una búsqueda por llamada), `searchSavedPro` (176-248, **pagina correctamente** — do/while 221-234). Cualquier cambio va a `utilities_REF`.

**Scripts que invoca / lo invocan:**
- Client script del botón: `./L598 - Conexion Directa FE (CL).js` (131-135).
- Suitelet de envío: `customscript_l598_conexion_directa_fe_sl` / `customdeploy1` vía `url.resolveScript` + `https.post` síncrono (821-845) → es quien postea el XML a `URLServicioFirma` (`(SL).js:163, 212, 226-227`).
- **Dependencia de datos con `L598 - Seteo de Tax Codes`:** este script lee `custcol_l598_codigo_impuesto`/`custcol_l598_tasa_impuesto` (2026, 2053) que aquel setea en su propio `afterSubmit` — hay acoplamiento por orden de ejecución de UEs sobre el mismo evento (ver Dudas). La propuesta STC-A1 (mover Seteo a `beforeSubmit`) es compatible: los custcol quedarían persistidos antes de este `afterSubmit`.
- `custbody_l598_tipo_comprobante` lo escribe por script solo `L598 - Calcular Retenciones (SS)V2.js:2356` (resguardos).

**Saved Searches vivas:** `customsearch_l598_proveedor_fe_ss` (286), `customsearch_l598_trans_gen_cae_con_dire` (602, ≥89 col.), `customsearch_l598_obt_inf_uru_det_ret` (2725), `customsearch_l598_generacion_cae_cod_imp` (2992, 3175), `customsearch_l598_trans_ref_custpayment` (3939), `customsearch_l598_config_lin_gas_refactu` (4305), `customrecord_l598_conf_factura_elec` ad-hoc (1251-1255). Muertas: `customsearch_3k_asiento_mult_cobro_asoc` (4137), `customsearch_3k_cartera_chq_en_pago` (4261).

**Registros/archivos de configuración que lee:** RT **URU-Proveedor FE Comprobantes DGI** (45 campos `camposInfoFE`, 13-56 → 302-304; incluye `idPlantillaXML`, credenciales de middleware TAFACE/UCFE/SIGE/FacturaLista, emisor); `customrecord_l598_ind_fact_det` (309); `customrecord_l598_tipos_documentos` (1632); `customrecord_l598_conf_factura_elec` (email); **plantilla XML** del File Cabinet (`file.load(idPlantillaXML)`, 768-770); logs FE `customrecord_l598_fact_elec_log`/`_dlog` (1181, 1203). **12 parámetros de script** `custscript_l598_*` (71-78, 101, 515-523, 546, 3891, 4019).

---

## 6. Casos de caracterización sugeridos

**Clave: la caracterización de este script NO está bloqueada por el error 100000.** El output tangible del script son los archivos **JSON** (`custbody_l598_informacion_json_tran_fe`) y **XML** (`custbody_l598_documento_xml_fe`) que se generan **al guardar** (742-811), *antes* de cualquier llamada al servicio de firma. El `https.post` solo ocurre con `generarCaeAutomatico=true` (816). Con el proveedor en modo **manual** (botón), guardar la transacción produce los dos archivos sin tocar el servicio → comparación byte-a-byte original vs `_REF` sobre el **contenido** de los archivos (los **nombres** incluyen `new Date()` — 743, 789 — no comparar nombres).

**Caracterizable sin generar CAE (desbloqueado):**
1. Factura de venta simple (1 línea, tasa básica) — caso demo §3 del [análisis de la demo](../analisis/demo-tekiio-flujos-y-scripts.md).
2. Factura multi-tasa (mínima + básica + exenta) — ejercita el switch de columnas de acumulación (2117-2181).
3. Factura con descuento global por monto y por porcentaje (1833-1958, 2612-2662) y con descuento/recargo de línea (2389-2505).
4. Comprobante de exportación (cláusula/modalidad/vía, 1568-1613) y e-Ticket vs e-Factura (límite 700/250 líneas, 1984).
5. Remito (`itemfulfillment` + estado enviado, 547-553) — el caso de 21.6s; medir GU/tiempo además de bytes.
6. Resguardo con detalle de retenciones (<1000 detalles, 2667-2921).
7. `customerpayment` forma de pago simple — **debe seguir saliendo con `detalleMetodosPago` vacío** (bug CDF-A1 preexistente: el `_REF` debe reproducirlo, no corregirlo) — y forma de pago múltiple (rama sana, 4024-4039).
8. `beforeLoad`: visualizar transacción sin CAE → botón presente + mismos registros de log FE ante configuración incompleta.
9. Anulación de resguardo: fallará igual en ambas versiones (CDF-A3) — comparar que el **mensaje de error y el log FE** sean idénticos (regla §7 de la metodología: elegir casos donde los bugs A no se disparen para el resto).

**Bloqueado por el error 100000 (queda pendiente hasta resolverlo):** el tramo automático posterior a la respuesta del Suitelet con CAE real — `grabarDatosCAE` con `CAEGENERADO='SI'` (875-1009), la rama "ya posee CAE en detalle log" (1039-1056) y la persistencia de los 17 campos CAE (3794-3810). *Mitigación parcial:* aun con el 100000, el flujo automático escribe los registros de log de error (`grabarError`) — esa escritura es comparable entre versiones si se decide correr en modo automático, aunque conviene evitar re-guardados masivos de casos e-Factura (advertencia ya registrada en [caracterización STC](../caracterizacion/1-seteo-de-tax-codes.md)).

---

## Anexo: flujo del tipo de CFE (evidencia para error 100000)

Mensaje en dev: `"TL tipo de CFE no es válido, posible error de sintaxis, código de error: 100000"` — rechazo de validación del payload por el servicio de firma (evidencia literal en [demo-tekiio-flujos-y-scripts.md §4](../analisis/demo-tekiio-flujos-y-scripts.md#4-evidencia-del-error-100000), transacción 15280). Mapeo del recorrido del **tipo de CFE** en este script, sin diagnóstico de causa raíz:

**Origen del valor (transacción):**
1. `custbody_l598_tipo_comprobante` — campo de lista "Tipo de Comprobante DGI" del body. Ningún script del repo lo setea para ventas (solo `Calcular Retenciones (SS)V2.js:2356` para resguardos) → en facturas viene del formulario/usuario/defaulting de la cuenta.
2. `custbody_l598_cod_tipo_comprobante` — el **código numérico** (101/111/etc., "ID de Transacción URUGUAY"). **Ningún script del repo lo escribe** (grep: solo lecturas) → se puebla por sourcing/fórmula/configuración en la cuenta. Punto de verificación #1 para Tekiio.

**Validación y selección de plantilla (`getConfigurationFE`):**
3. Se lee vía `lookupFields` (197-216); si `custbody_l598_cod_tipo_comprobante` está vacío o ≤0 → error "Falta Configurar el ID de Transacción Electrónica" (239-241, 468-470).
4. Con `custbody_l598_tipo_comprobante` (id de lista, 224) se filtra la SS `customsearch_l598_proveedor_fe_ss` por `custrecord_l598_prov_fe_comp_dgi_tip_com` (join `custrecord_l598_prov_fe_comp_dgi_prov_fe`, 252-268) + flag cobranza T/F según recType (270-284) + subsidiaria (244-249) → registro **URU-Proveedor FE Comprobantes DGI** → `idPlantillaXML` (321-323). Punto de verificación #2: que exista el mapeo proveedor↔tipo de comprobante para la subsidiaria (si no, error "No se Encuentra configurado el registro del Proveedor…", 456-458).

**Inyección en el payload (`afterSubmit` + `buscarInformacionFE`):**
5. `idTransaccionURU = columns[8]` de `customsearch_l598_trans_gen_cae_con_dire` (635, validado en 637). La correspondencia columns[8] ↔ `custbody_l598_cod_tipo_comprobante` es **inferencia fuerte** (mismo nombre de variable que en 239; el Suitelet usa el índice 8 para ese mismo campo en su propia búsqueda, `(SL).js:707`) — la definición de la SS vive en la cuenta. Punto de verificación #3: qué devuelve exactamente esa columna (valor vs texto vs fórmula).
6. El valor de `columns[8]` se copia a **tres** campos del payload: `objetoRespuesta.tipoComprobanteURU` (1405), `informacionAdicional.documentoTipo` (1474) y **`informacionEncabezado.tipoCFE` (1547)**.
7. Tipos de CFE de **referencias** (NC/ND/pagos): `infoReferencia.tipoCFE` sale de `columns[46]` (3378 → 3404) o, para cobranzas, de `columns[1]` de `customsearch_l598_trans_ref_custpayment` (3950); la rama de referencia global lo deja `''`/`0` (3394, 3895). Un tipo inválido también puede entrar por aquí.
8. El JSON completo se escribe a archivo (742-749, con `replace(/&/g,'Y')` en 740) y se renderiza contra la **plantilla XML del proveedor** (`file.load(idPlantillaXML)` 768-770; `addCustomDataSource` alias `informacionTransaccion`, 777-783). Punto de verificación #4: cómo la plantilla mapea `informacionTransaccion.informacionEncabezado.tipoCFE` al tag del XML final (un defecto de plantilla produciría exactamente un "tipo de CFE" inválido con el script sano).
9. El XML queda en `custbody_l598_documento_xml_fe` (795-801). El Suitelet lo lee y lo postea a `URLServicioFirma` (`(SL).js:163-169, 212, 226-227`); la respuesta del servicio contiene su propio tag `tipoCFE` (`(SL).js:570`).

**Acción inmediata disponible para Tekiio sin generar CAE:** abrir los archivos **XML y JSON ya persistidos** en la transacción 15280 (`custbody_l598_documento_xml_fe` / `custbody_l598_informacion_json_tran_fe`) y comparar el `tipoCFE` que contiene contra el catálogo DGI. Si el XML lleva un código válido → investigar configuración del servicio de firma/middleware; si lleva un valor anómalo (p. ej. el literal `TL` del mensaje, que podría ser un eco del valor recibido — *inferencia, no verificada*) → seguir la cadena hacia atrás por los puntos #1-#4 (campo código en la transacción → columna 8 de la SS → plantilla).

---

## 7. Dudas abiertas

1. **Sourcing de `custbody_l598_cod_tipo_comprobante`:** ¿fórmula/sourcing del registro de tipo de comprobante, o carga manual? No es visible en el repo y es el insumo raíz del tipo de CFE (anexo, punto #1).
2. **`replace(/&/g, 'Y')` sobre el JSON completo (740):** convierte cualquier `&` de razones sociales/direcciones en `Y` dentro del CFE (`"J&J"` → `"JYJ"`). ¿Decisión deliberada para no romper el XML (en lugar de escapar `&amp;`) o deuda aceptada? Afecta contenido del documento fiscal.
3. **Deployments reales y context filtering:** ¿sobre qué tipos de registro está desplegado el UE y con qué filtrado de contexto? Define el alcance del `_REF`, la matriz de caracterización y la respuesta a CDF-A7 (reentrancia de los `save()` internos: 811, 3838).
4. **Interacción con `Seteo de Tax Codes`:** ambos corren en `afterSubmit` del mismo evento y este script consume los `custcol` que aquel escribe con `load`+`save`. ¿El orden de ejecución está garantizado por configuración, o este script funciona gracias al re-disparo del EDIT que provoca el save de Seteo? Impacta la lectura del 21.6s del Remito y la secuenciación si se aprueba STC-A1.
5. **Botón `functionName` con parámetros concatenados (134):** si algún parámetro de mensaje del script está vacío, el string `generarCAE(...)` queda con comas vacías del lado cliente. ¿Hay garantía operativa de que los 7 parámetros estén siempre configurados?
6. **CDF-A5:** ¿el negocio factura costos de envío/manipulación en Uruguay? Define si el bloque muerto (2951-3315) se corrige (fiscal, aprobación) o se elimina (~360 líneas menos en el refactor D).
7. **Resguardos, `unidadMedida`:** en el loop de detalle de retenciones la línea toma `articuloCodUnidadMedida` residual del loop anterior (2806, `var` hoisted, normalmente `undefined` en resguardos) — ¿la plantilla de resguardo usa ese campo? Si no, es inocuo; si sí, es otro A menor.
