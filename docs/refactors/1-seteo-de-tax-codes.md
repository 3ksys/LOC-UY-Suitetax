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

> **Nota honesta:** la primera versión de este refactor (B+C+D) **no** atacaba el costo dominante del script, que está en el `record.load()`+`save()` de `afterSubmit`. Ese ahorro es **STC-A1**, aprobado por Tekiio el 2026-08-20 y **aplicado con guarda híbrida** (ver [§3.bis](#3bis-stc-a1--guarda-híbrida-aplicada-2026-08-20) y la [propuesta](../propuestas/STC-A1-entrypoint-seteo-tax-codes.md)). **Medido en la cuenta el 2026-08-20 sobre `vendorcredit` 15227: 30 GU → 0 GU y 2 → 0 operaciones de registro, con output byte a byte idéntico** ([evidencia](../caracterizacion/1-seteo-de-tax-codes.md#caracterización-del-híbrido-stc-a1--vendorcredit-15227-2026-08-20)). Es el 100% del footprint de governance del script, más la eliminación del guardado extra. Falta extender la caracterización a los tipos restantes.
>
> **Corrección de la cifra (2026-08-05):** el "11–14s ×2" citado originalmente son **sumas acumuladas sobre 6-7 guardados** del Excel APM de Tekiio (Invoice 11,03s ÷ 7 ≈ 1,6s/guardado · SO 13,92s ÷ 3-6 corridas reales ≈ 2,3-4,6s/guardado), no el costo por guardado. La medición APM del `_REF` dio 1,9-2,3s por guardado — **la comparación de tiempo con el original es inconcluyente a esta precisión** (varianza y cold-starts dominan). Lo medible y determinístico es governance: **30 GU por guardado = 100% del footprint del script, eliminable solo con STC-A1** — ver [medición APM](../medicion-apm.md).

## 2. Plan de Cambios

| Criterio | ID | Qué se modifica | Riesgo | Estado |
|---|---|---|:--:|:--:|
| #3 | STC-B1 | `filter` dentro del loop → `Map` indexado por `taxdetailsreference` (primer match gana) | 🟡 Medio | 🔧 Aplicado |
| #3 | STC-B2 | Eliminado el 2º loop de solo-logging + `log.debug` de dump | 🟢 Bajo | 🔧 Aplicado |
| #4 | STC-C1 | Eliminado `N/search` del `define` (no se usaba) | 🟢 Bajo | 🔧 Aplicado |
| #6 | STC-D1 | Eliminado `arrayTaxCodes` (sólo alimentaba un log) | 🟢 Bajo | 🔧 Aplicado |
| #1/#8 | STC-A1 | `beforeSubmit` con **guarda híbrida** + fallback a `afterSubmit` (elimina load+save en el camino feliz) | 🔴 Alto | ✅ Aplicado y medido (2026-08-20): **30 GU → 0** |
| #1 | STC-A2 | Manejo de error del `save` | 🔴 Alto | ⏳ Aprobación |
| #1 | STC-A3 | Múltiples `taxdetails` por línea → toma `[0]` | 🔴 Alto | ⏳ Validar fiscal |

Alto riesgo registrado en [registro-aprobaciones.md](../registro-aprobaciones.md).

## 3. Garantía de comportamiento (revisión manual)

- **`Map` ≡ `filter(...)[0]`:** el `Map` se llena en orden de `taxdetails` y sólo guarda el **primer** valor por referencia (`if (!has) set`) → equivale a `filter(...)[0]` (primer match). Se conserva incluso el comportamiento de STC-A3 (si hay >1, se usa el primero).
- **`if (td)` ≡ `!isEmpty(taxCodeItemResult) && length > 0`:** `filter` devuelve `[]` (→ no entra) o `[td,...]` (→ entra con `[0]`); `Map.get` devuelve `undefined` (→ no entra) o `td` (→ entra). Mismo resultado.
- **Intacto:** lógica de grupo (`ingroup`→línea "Group" anterior), descuento (`Discount`→hereda anterior), rama sin-match (`log.error`), `isEmpty` local y `desaplicarYAplicarNC`.
- **Cambiado por STC-A1** (ver [§3.bis](#3bis-stc-a1--guarda-híbrida-aplicada-2026-08-20)): el patrón `afterSubmit`+`load`+`save` pasó a ser la **rama de fallback**; el camino normal escribe en `beforeSubmit`. El `beforeSubmit` no-op del original dejó de serlo.

✔ **Sintaxis:** `node --check` OK.
⚠️ **Riesgo residual a confirmar en caracterización:** el match cambió de `==` (loose, en el `filter`) a `String(ref)===String(ref)` (clave del `Map`). Equivalente para referencias numéricas/string (el dominio real), pero la **caracterización byte-a-byte lo confirma** de forma definitiva.

## 3.bis STC-A1 — Guarda híbrida (aplicada 2026-08-20)

**Aprobación:** Tekiio, 2026-08-20 — "pueden avanzar con el cambio y una vez tengamos los resultados de las pruebas, lo revisamos con el equipo", sobre el script copia (`_REF`).

Tekiio agregó dos condiciones que definieron el diseño:

1. El equipo de producto sostiene que *"NS únicamente genera los tax details finales después de guardado"*, aclarando que *"hasta hace 2 o 3 meses, para mejoras de ARG, no se calculaban los tax details hasta luego del guardado"*. Es decir: el `afterSubmit` original era correcto para la plataforma de entonces. La evidencia del [experimento de diagnóstico](../propuestas/STC-A1-experimento-diagnostico.md) (8/8 snapshots `beforeSubmit` idénticos a `afterSubmit`) muestra que hoy ya no lo es — pero si el comportamiento cambió una vez, puede volver a cambiar.
2. *"Debemos asumir que el usuario puede generar las transacciones a través de diversos contextos (csv, integraciones, etc.) aunque algunos no lo utilicen en su cuenta."* Esto elimina la posibilidad de cerrar la validación enumerando contextos: el universo es abierto.

Ambas condiciones apuntan al **escenario híbrido** del [§5 de la propuesta](../propuestas/STC-A1-entrypoint-seteo-tax-codes.md#5-escenarios-de-decisión), que pasa de plan B a diseño elegido.

### Cómo funciona

| Momento | Qué hace | Costo |
|---|---|---|
| `beforeSubmit` | Indexa `taxdetails` de `context.newRecord` y evalúa la **guarda de completitud**. Si pasa, escribe las columnas ahí — viajan en el guardado del sistema. Si no pasa, **no escribe nada** (todo o nada) | 0 GU |
| `afterSubmit` | Reconstruye el índice de `taxdetails` desde `context.newRecord` (sin `load`) y verifica que cada línea ya tenga en sus columnas **exactamente** el valor que le corresponde. Si todo coincide, sale. Si algo difiere, ejecuta el `load`+`save` original sin cambios | 0 GU (feliz) / 30 GU (legacy) |

**La guarda pregunta por el dato, no por el contexto.** Criterio: toda línea de `item`/`expense` con `taxdetailsreference` no vacío debe tener su entrada en el índice con `taxCode` no vacío. Las líneas sin referencia (encabezado de grupo, descripción, descuento) son las que el original tampoco resuelve por índice — no son evidencia de que la sublist no esté lista. Por eso CSV, API, workflow o una integración que todavía no existe pasan por la misma verificación, sin lista que mantener.

**La decisión de `afterSubmit` se toma leyendo el registro, nunca por estado compartido.** La primera versión usaba una variable de módulo que `beforeSubmit` ponía en `true`; **no funciona — el scope del módulo no se comparte entre entry points**, medido en la cuenta el 2026-08-20 (`beforeSubmit` 0 GU con `rama=inline`, pero `afterSubmit` 30 GU / 2 operaciones: el legacy corrió igual). Verificar el resultado es además estrictamente mejor que preguntar quién lo escribió: detecta también columnas obsoletas de una edición previa y las manda al legacy.

**Fail-safe en la dirección correcta:** cualquier duda — verificación que no coincide, `XEDIT` (donde `newRecord` es parcial), excepción en cualquiera de los dos entry points — deriva al camino legacy, con comportamiento y costo idénticos al original. Se pierde el ahorro, nunca la corrección.

**Ambos entry points loguean siempre la rama tomada.** El camino feliz silencioso de la primera versión fue justamente lo que ocultó el fallo de la bandera hasta que se midió el governance.

**Observabilidad:** cada guardado emite un `log.audit` con `rama=inline|legacy`, `motivo`, `eventType`, `executionContext` y `recordType`. Eso da el censo empírico de contextos de producción que Tekiio no puede entregar por escrito.

### Límites explícitos

- La guarda detecta **"vacío o incompleto", no "poblado pero obsoleto"**. Ese escenario se atacó empíricamente en el experimento (caso 5: cambio de artículo por otro de distinta tasa → idéntico). Mitigación: mantener el script de diagnóstico desplegado en paralelo tras aplicar.
- **`desaplicarYAplicarNC` no se ejecuta en la rama inline** — es un workaround del segundo save, que en esa rama no existe. Es el único punto donde el comportamiento podría cambiar y **sigue sin probarse**: la corrida del 2026-08-20 sobre `vendorcredit` 15227 terminó ejecutando el legacy (que sí lo ejecuta), así que la sublist `apply` bajo rama inline pura no está caracterizada. **Caracterizar `vendorcredit` con `Usage Count = 0` confirmado antes de dar el híbrido por cerrado.**
- Los tipos con CFE (`invoice`, `creditmemo`, `cashsale`, `cashrefund`) siguen bloqueados por el middleware CAE — Tekiio lo está revisando en la cuenta y pidió probar también una respuesta exitosa del facturador.

✔ **Sintaxis:** `node --check` OK.

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
- [x] **STC-A1 aplicado con guarda híbrida** + `node --check` OK — 2026-08-20 (ver §3.bis)
- [x] Subir el `_REF` actualizado al File Cabinet y verificar que los deployments tomen la versión nueva — 2026-08-20
- [x] **Corrección de diseño:** eliminada la bandera `escrituraInline` (no sobrevive entre entry points); `afterSubmit` decide por **equivalencia de valores** contra el índice de `taxdetails` de `context.newRecord` (0 GU) — 2026-08-20
- [x] ✅ **`vendorcredit` 15227 caracterizado — el caso que podía fallar, con el ahorro confirmado** — 2026-08-20, [evidencia](../caracterizacion/1-seteo-de-tax-codes.md#caracterización-del-híbrido-stc-a1--vendorcredit-15227-2026-08-20). `rama=inline` + `inline-ok verificadas=1` · **0 GU y 0 operaciones de registro en ambos entry points (contra 30 GU / 2 ops)** · output byte a byte idéntico, sublist `apply` incluida · aislamiento de 3 patas confirmado en el log. **`desaplicarYAplicarNC` era efectivamente un workaround del 2º save** (probado: el legacy no corrió y la sublist quedó intacta igual)
- [ ] Caracterización del híbrido en el resto: `salesorder`, `estimate`, `purchaseorder`, `vendorbill` (rama `expense`)
- [ ] Medir GU reales en APM (esperado: 30 → 0) y capturar el snapshot `afterSubmit` del diagnóstico de la corrida de 15227
- [ ] Residual `apply`: repetir con un `vendorcredit` de **2+ documentos aplicados** (la corrida de 15227 ejercitó el loop con n=1)
- [ ] Caracterización completa con bordes (grupo/descuento/multi-tasa) — bloqueada por casos con bordes (pedido a Tekiio)
- [ ] Tipos con CFE — bloqueados por middleware CAE (Tekiio revisando; probar además respuesta exitosa del facturador)
- [ ] Aprobación STC-A2/A3 (Tekiio)
