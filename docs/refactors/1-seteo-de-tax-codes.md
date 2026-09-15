# Informe de Refactor — Seteo de Tax Codes

**Script:** `L598 - Seteo de Tax Codes` · **Versión:** `L598 - Seteo de Tax Codes_REF.js`
**Tipo:** UserEvent (`beforeSubmit` + `afterSubmit`; en el original el `beforeSubmit` era un no-op obligatorio) · **Módulo:** Transacciones · **Toca impuestos:** sí 💰
**Alcance aplicado:** **A1** (aprobado 2026-08-20) + B + C + D. Comportamiento preservado, verificado byte a byte. Los cambios de Alto riesgo restantes (A2, A3) van por aprobación.

---

## 1. Resumen

| Métrica | Original | Refactor | Δ |
|---|---|---|---|
| Líneas de código | 167 | ~150 | limpieza |
| Complejidad match taxdetails | **O(n×m)** (`filter` en loop) | **O(n)** (`Map` O(1)) | ✔ |
| `N/search` sin usar | importado | eliminado | ✔ |
| `log.debug` de dump | ~9 | 0 (se mantienen los `log.error`) | ✔ |
| 2º loop de solo-logging | sí | eliminado | ✔ |

> **Nota honesta:** la primera versión de este refactor (B+C+D) **no** atacaba el costo dominante del script, que está en el `record.load()`+`save()` de `afterSubmit`. Ese ahorro es **STC-A1**, aprobado por Tekiio el 2026-08-20 y **aplicado con guarda híbrida** (ver [§3.bis](1-seteo-de-tax-codes-bitacora.md#3bis-stc-a1--guarda-híbrida-aplicada-2026-08-20) y la [propuesta](../propuestas/STC-A1-entrypoint-seteo-tax-codes.md)). **Medido en la cuenta el 2026-08-20 sobre `vendorcredit` 15227: 30 GU → 0 GU y 2 → 0 operaciones de registro, con output byte a byte idéntico** ([evidencia](../caracterizacion/1-seteo-de-tax-codes.md#caracterización-del-híbrido-stc-a1--vendorcredit-15227-2026-08-20)). Es el 100% del footprint de governance del script, más la eliminación del guardado extra. Falta extender la caracterización a los tipos restantes.
>
> **Corrección de la cifra (2026-08-05):** el "11–14s ×2" citado originalmente son **sumas acumuladas sobre 6-7 guardados** del Excel APM de Tekiio (Invoice 11,03s ÷ 7 ≈ 1,6s/guardado · SO 13,92s ÷ 3-6 corridas reales ≈ 2,3-4,6s/guardado), no el costo por guardado. La medición APM del `_REF` dio 1,9-2,3s por guardado — **la comparación de tiempo con el original es inconcluyente a esta precisión** (varianza y cold-starts dominan). Lo medible y determinístico es governance: **30 GU por guardado = 100% del footprint del script, eliminable solo con STC-A1** — ver [medición APM](../medicion-apm.md).

## 1.bis Hallazgos por grupo (A/B/C/D)

Mismo formato que el resto de los informes. Se documentaron a posteriori: este script se refactorizó antes de que la [metodología](../metodologia-refactor.md) fijara la tabla por grupo, y sus hallazgos habían quedado sólo volcados en el Plan de Cambios del §2. Las líneas de evidencia son del **original** `LOC UY/L598 - Seteo de Tax Codes.js` (167 LOC), no del `_REF`.

### Grupo A — Correctitud (NO entran al refactor; recomendación + aprobación Tekiio)

| ID | Hallazgo | Evidencia | Riesgo |
|---|---|---|:--:|
| STC-A1 | Patrón `afterSubmit` + `record.load()` + `save()` para setear columnas calculadas: el registro se vuelve a cargar y guardar entero después de que NetSuite ya lo guardó. El `beforeSubmit` existe pero es un no-op (sólo un `log.audit`). Medido en **30 GU por guardado — el 100% del footprint de governance del script** | load L22, save L52, `beforeSubmit` no-op L132-135 | 🔴 |
| STC-A2 | El `save()` no tiene manejo de error propio: cae en el `catch` general que sólo hace `log.error`. Si el guardado falla, **la transacción queda sin tax codes y nadie se entera** — ni el usuario ni un registro consultable | save L52, catch L56-58 | 🔴 |
| STC-A3 | El `filter` sobre `arrayTaxDetails` puede devolver más de un resultado y se toma siempre `[0]`: el resto **se descarta sin aviso**. Si en UY existen impuestos compuestos por línea, se pierde todo menos el primero | filter L82, uso de `[0]` L89-90 | 🔴 |

### Grupo B — Governance / Performance (SÍ entran)

| ID | Hallazgo | Evidencia | Riesgo |
|---|---|---|:--:|
| STC-B1 | El `filter` se ejecuta **dentro del loop de líneas**: O(líneas × taxdetails) por sublista, y se repite para `item` y `expense` | filter L82 dentro del loop L78+ | 🟡 |
| STC-B2 | Segundo loop completo sobre las líneas cuyo **único cuerpo es un `log.debug`**, con 2 `getSublistValue` por línea. Se suman dumps con `JSON.stringify` en el camino caliente, que se evalúan aunque el Log Level no sea Debug | loop L118-120; dumps L44-45, L85 | 🟢 |

### Grupo C — Estándares 2.1 (SÍ entran)

| ID | Hallazgo | Evidencia | Riesgo |
|---|---|---|:--:|
| STC-C1 | `N/search` se importa en el `define` y **no se usa en ninguna parte** del archivo | L7 |  🟢 |

### Grupo D — Mantenibilidad (SÍ entran)

| ID | Hallazgo | Evidencia | Riesgo |
|---|---|---|:--:|
| STC-D1 | `arrayTaxCodes` se declara y se llena en el loop, pero **sólo alimenta un `log.debug`**: no participa de ningún cálculo | declaración L32, push L40, único uso L45 | 🟢 |

## 2. Plan de Cambios

| Criterio | ID | Qué se modifica | Riesgo | Estado |
|---|---|---|:--:|:--:|
| #3 | STC-B1 | `filter` dentro del loop → `Map` indexado por `taxdetailsreference` (primer match gana) | 🟡 Medio | 🔧 Aplicado |
| #3 | STC-B2 | Eliminado el 2º loop de solo-logging + `log.debug` de dump | 🟢 Bajo | 🔧 Aplicado |
| #4 | STC-C1 | Eliminado `N/search` del `define` (no se usaba) | 🟢 Bajo | 🔧 Aplicado |
| #6 | STC-D1 | Eliminado `arrayTaxCodes` (sólo alimentaba un log) | 🟢 Bajo | 🔧 Aplicado |
| #1/#8 | STC-A1 | `beforeSubmit` con **guarda híbrida** + fallback a `afterSubmit` (elimina load+save en el camino feliz) | 🔴 Alto | ✅ Aplicado y medido (2026-08-20): **30 GU → 0** |
| #1 | STC-A2 | Manejo de error del `save` → diagnóstico por `etapa` + marca en el LOG de FE | 🔴 Alto | 🔧 Aplicado (2026-09-07) — pendiente definir los 2 códigos en la cuenta |
| #1 | STC-A3 | Múltiples `taxdetails` por línea → toma `[0]` | 🔴 Alto | ⏳ Validar fiscal |

Alto riesgo registrado en [registro-aprobaciones.md](../registro-aprobaciones.md).

## 3. Garantía de comportamiento (revisión manual)

- **`Map` ≡ `filter(...)[0]`:** el `Map` se llena en orden de `taxdetails` y sólo guarda el **primer** valor por referencia (`if (!has) set`) → equivale a `filter(...)[0]` (primer match). Se conserva incluso el comportamiento de STC-A3 (si hay >1, se usa el primero).
- **`if (td)` ≡ `!isEmpty(taxCodeItemResult) && length > 0`:** `filter` devuelve `[]` (→ no entra) o `[td,...]` (→ entra con `[0]`); `Map.get` devuelve `undefined` (→ no entra) o `td` (→ entra). Mismo resultado.
- **Intacto:** lógica de grupo (`ingroup`→línea "Group" anterior), descuento (`Discount`→hereda anterior), rama sin-match (`log.error`), `isEmpty` local y `desaplicarYAplicarNC`.
- **Cambiado por STC-A1** (ver [§3.bis](1-seteo-de-tax-codes-bitacora.md#3bis-stc-a1--guarda-híbrida-aplicada-2026-08-20)): el patrón `afterSubmit`+`load`+`save` pasó a ser la **rama de fallback**; el camino normal escribe en `beforeSubmit`. El `beforeSubmit` no-op del original dejó de serlo.

✔ **Sintaxis:** `node --check` OK.
⚠️ **Riesgo residual a confirmar en caracterización:** el match cambió de `==` (loose, en el `filter`) a `String(ref)===String(ref)` (clave del `Map`). Equivalente para referencias numéricas/string (el dominio real), pero la **caracterización byte-a-byte lo confirma** de forma definitiva.

## 3.bis Unidades aplicadas → [bitácora](1-seteo-de-tax-codes-bitacora.md)

El detalle de lo ya aplicado vive en la **[bitácora de aplicación](1-seteo-de-tax-codes-bitacora.md)**, para que este informe se lea rápido:

| Unidad | Qué se aplicó | Fecha |
|---|---|---|
| [STC-A1 — Guarda híbrida](1-seteo-de-tax-codes-bitacora.md#3bis-stc-a1--guarda-híbrida-aplicada-2026-08-20) | Entry point híbrido `beforeSubmit` + fallback `afterSubmit`. Cómo funciona y sus límites explícitos | 2026-08-20 |
| [STC-A2 — Marcado del fallo](1-seteo-de-tax-codes-bitacora.md#3ter-stc-a2--marcado-del-fallo-aplicada-2026-09-07) | LOG de FE al fallar el `save`; por qué `record.create()` y no los Restlets; [verificación en la cuenta](1-seteo-de-tax-codes-bitacora.md#verificación-en-la-cuenta-2026-09-07) (`vendorbill` 15826) y los dos hallazgos derivados | 2026-09-07 |

## 4. Alcance real: 9 deployments

El script es **agnóstico del tipo de registro** (usa `context.newRecord.type`), así que su alcance no está en el código sino en los deployments. El original tiene **9**, todos `Liberado` / API 2.1:

| Deployment original | Tipo de registro | Internal ID | Familia | Rama de código |
|---|---|---|---|---|
| `customdeploy1` | Factura de venta | `invoice` | Venta | `item` |
| `customdeploy9` | Estimación | `estimate` | Venta | `item` |
| `customdeploy2` | Nota de crédito | `creditmemo` | Venta | `item` + **`desaplicarYAplicarNC`** |
| `customdeploy3` | Venta en efectivo | `cashsale` | Venta | `item` |
| `customdeploy5` | Reembolso en efectivo | `cashrefund` | Venta | `item` |
| `customdeploy6` | Factura de proveedor | `vendorbill` | Compra | `item` + **`expense`** |
| `customdeploy7` | Crédito del proveedor | `vendorcredit` | Compra | `item` + `expense` + **`desaplicarYAplicarNC`** |
| `customdeploy4` | Orden de venta | `salesorder` | Venta | `item` |
| `customdeploy8` | Orden de compra | `purchaseorder` | Compra | `item` + `expense` |

**Cobertura mínima de ramas distintas: 4 tipos** — `invoice` (venta/`item`), `vendorbill` (compra/`expense`), `creditmemo` (venta + rama `apply`), `vendorcredit` (compra + rama `apply`). Los otros 5 recorren el mismo código que `invoice`.

Aun así, **el `_REF` necesita los 9**: es el reemplazo del original, y un tipo sin deployment es un tipo nunca caracterizado. Se crean los 4 primeros para caracterizar las ramas y los 5 restantes como regresión.

> **Inferencia a validar:** en transacciones de venta no existe sublista `expense`, y `setearColumnasConTaxDetails("expense", …)` se invoca igual. Como el script funciona en producción, `getLineCount` sobre una sublista ausente no lanza excepción (si lanzara, el `catch` de `afterSubmit` abortaría antes del `save()` y **nunca** se grabarían las columnas). Confirmar en la caracterización de `invoice`.

## 5. Procedimiento de caracterización (en la cuenta)

> **Plan detallado, plantillas CSV y registro de evidencia:** [Caracterización — Seteo de Tax Codes](../caracterizacion/1-seteo-de-tax-codes.md).

1. **Baseline del original primero**, con el `_REF` sin deployments y logueado con un rol de la audiencia del original — ver [Carga y deploy de scripts](../carga-y-deploy-de-scripts.md).
2. Ejecutar los **casos UAT** donde este script participa: Guardar **Orden/Factura/NC de Venta** y **Orden/Factura de Compra** (rol `URU - Contador`).
3. Comparar, **línea por línea**, `custcol_l598_codigo_impuesto` y `custcol_l598_tasa_impuesto` entre original y `_REF`. Deben ser **idénticos**. Poner foco en: líneas de **grupo**, **descuento**, y transacciones con **múltiples tax codes**.
4. Medir GU/tiempo en APM ([procedimiento](../medicion-apm.md)). Con STC-A1 aplicado el criterio es **`Usage Count = 0` y `Record Operations = 0` en ambos entry points**; si sale 30/2, la guarda derivó al fallback y hay que leer el `motivo=` del log.

## 6. Estado

- [x] Análisis verificado + Plan de Cambios
- [x] Refactor B+C+D + `node --check`
- [x] Revisión manual de comportamiento
- [x] Propuesta STC-A1 (entry point) para aprobación
- [x] Archivo en File Cabinet + Script record (`customscript_l598_seteo_tax_codes_ref`)
- [x] Inventario de los 9 deployments del original
- [x] **Smoke test `salesorder` (orden 47 / id 15260): output idéntico, aislamiento probado, sin errores** — 2026-07-30, [evidencia](../caracterizacion/1-seteo-de-tax-codes.md#smoke-test--orden-de-venta-47-id-15260)
- [x] Igualar `Ejecutar como rol` del deployment `_REF` al del original (`Administrador`) — 2026-08-03
- [x] Deployments `_REF` de ramas: `vendorbill` y `vendorcredit` creados y caracterizados ✅ idénticos (2026-08-03/05) — con las 3 ramas alcanzables cubiertas (`item` multi-tasa, `expense` ausente, `apply`). Pendiente: 6 deployments de regresión (`invoice`, `estimate`, `creditmemo`, `cashsale`, `cashrefund`, `purchaseorder`)
- [x] **Aprobación STC-A1 (Tekiio, 2026-08-20)** — avanzar sobre el `_REF` y revisar resultados de pruebas
- [x] **STC-A2 aplicado (aprobación Tekiio, 2026-09-07)** — Alt 2 + Alt 1 sobre la estructura de LOG de FE (ver [bitácora §3.ter](1-seteo-de-tax-codes-bitacora.md#3ter-stc-a2--marcado-del-fallo-aplicada-2026-09-07))
- [x] **STC-A2 verificado en la cuenta (2026-09-07)** — `vendorbill` 15826: camino feliz sin regresión + marcado probado de punta a punta con `throw` forzado (`FE-DLG-3063`, `REFERENCIA TRANSACCIÓN` cargada). Ver [§3.ter](1-seteo-de-tax-codes-bitacora.md#verificación-en-la-cuenta-2026-09-07)
- [ ] STC-A2 — definir `CODIGO_ESTADO` y `CODIGO_MENSAJE` en `URU-FE Estados Log` / `URU-FE Mensajes Log`. El catálogo es consultable con el rol de negocio, así que se puede **proponer** valores concretos
- [ ] STC-A2 — armar la Saved Search de intercepción previa al CFE (criterio: `DETALLE` contiene `STC-A2`)
- [ ] **STC-A1 — dimensionar el hallazgo de la línea de gasto** ([bitácora §3.bis](1-seteo-de-tax-codes-bitacora.md#3bis-stc-a1--guarda-híbrida-aplicada-2026-08-20)): si las Bills reales llevan líneas de gasto sin impuesto, el ahorro de 30 GU → 0 en compras es marginal
- [ ] Reinventariar audiencias de los deployments de `vendorbill` — la premisa de audiencias complementarias quedó refutada (ver caracterización)
- [ ] **STC-A3 sin respuesta** — ni la pregunta fiscal (¿impuestos compuestos por línea en UY?) ni la aprobación de la instrumentación de detección. Se conserva el comportamiento actual (primer match)
- [x] **STC-A1 aplicado con guarda híbrida** + `node --check` OK — 2026-08-20 (ver [bitácora §3.bis](1-seteo-de-tax-codes-bitacora.md#3bis-stc-a1--guarda-híbrida-aplicada-2026-08-20))
- [x] Subir el `_REF` actualizado al File Cabinet y verificar que los deployments tomen la versión nueva — 2026-08-20
- [x] **Corrección de diseño:** eliminada la bandera `escrituraInline` (no sobrevive entre entry points); `afterSubmit` decide por **equivalencia de valores** contra el índice de `taxdetails` de `context.newRecord` (0 GU) — 2026-08-20
- [x] ✅ **`vendorcredit` 15227 caracterizado — el caso que podía fallar, con el ahorro confirmado** — 2026-08-20, [evidencia](../caracterizacion/1-seteo-de-tax-codes.md#caracterización-del-híbrido-stc-a1--vendorcredit-15227-2026-08-20). `rama=inline` + `inline-ok verificadas=1` · **0 GU y 0 operaciones de registro en ambos entry points (contra 30 GU / 2 ops)** · output byte a byte idéntico, sublist `apply` incluida · aislamiento de 3 patas confirmado en el log. **`desaplicarYAplicarNC` era efectivamente un workaround del 2º save** (probado: el legacy no corrió y la sublist quedó intacta igual)
- [ ] Caracterización del híbrido en el resto: `salesorder`, `estimate`, `purchaseorder`, `vendorbill` (rama `expense`)
- [ ] Medir GU reales en APM (esperado: 30 → 0) y capturar el snapshot `afterSubmit` del diagnóstico de la corrida de 15227
- [ ] Residual `apply`: repetir con un `vendorcredit` de **2+ documentos aplicados** (la corrida de 15227 ejercitó el loop con n=1)
- [ ] Caracterización completa con bordes (grupo/descuento/multi-tasa) — bloqueada por casos con bordes (pedido a Tekiio)
- [ ] Tipos con CFE — bloqueados por middleware CAE (Tekiio revisando; probar además respuesta exitosa del facturador)
- [ ] STC-A3: respuesta fiscal (¿impuestos compuestos por línea en UY?) + aprobación de la instrumentación de detección — STC-A2 ya aprobado y aplicado (2026-09-07)
