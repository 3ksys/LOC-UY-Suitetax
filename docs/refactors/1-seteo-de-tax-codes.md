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
| #1 | STC-A2 | Manejo de error del `save` → diagnóstico por `etapa` + marca en el LOG de FE | 🔴 Alto | 🔧 Aplicado (2026-09-07) — pendiente definir los 2 códigos en la cuenta |
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
- 🔵 **En `invoice` el ahorro vale más de lo que decía el análisis, por un motivo distinto (2026-09-07).** Los logs de la invoice 15822 muestran que `L598 -Transacción (Servidor)` corre **después** de STC y **sobrescribe las mismas dos columnas con el mismo valor** (TRS-D1, orden verificado: STC a las 1:21:15, TRS a las 1:21:17). Es decir: los 30 GU del `afterSubmit` de STC producen un resultado que **no sobrevive**. Ver [caracterización § invoice 15822](../caracterizacion/1-seteo-de-tax-codes.md#invoice-15822--quién-escribe-las-columnas-en-invoice-2026-09-07).
- 🔴 **Hallazgo 2026-09-07 — una línea de gasto sin tax code bloquea la rama inline para siempre.** Medido en `vendorbill` **15826**: SuiteTax le asigna `taxdetailsreference` a la línea de `expense` (`15826_1`) **pero no crea su fila en `taxdetails`**, porque esa línea no tiene impuesto. Como la guarda de completitud es todo-o-nada, devuelve `linea-sin-taxdetail:expense[0]` y **el `beforeSubmit` nunca escribe inline**. No es un defecto del refactor — el original tampoco resuelve esa línea — pero significa que para esa forma de transacción **el ahorro de 30 GU → 0 no se materializa nunca**. Costo medido del legacy en esa corrida: **14,4 s de los ~30 s de SuiteScript** del guardado. **Dimensionar con Tekiio: ¿qué proporción de las Bills reales lleva líneas de gasto sin impuesto?** Si es lo habitual, el beneficio de STC-A1 en compras es marginal.
- Los tipos con CFE (`invoice`, `creditmemo`, `cashsale`, `cashrefund`) siguen bloqueados por el middleware CAE. **Causa identificada 2026-09-07** — detalles de LOG 3061/3062 sobre `URU-Resguardo #263`: `No se encuentran Configurados los siguientes Campos Requeridos de la Configuración del Middleware de Factura Electrónica : Password Para la conexion con el Middleware de Factura Electronica / URL del RestLet`. No está fallando: está **sin configurar**, y los dos campos que faltan están nombrados. Pasa de "Tekiio lo está revisando" a un pedido puntual.

✔ **Sintaxis:** `node --check` OK.

## 3.ter STC-A2 — Marcado del fallo (aplicada 2026-09-07)

Tekiio aprobó la **Alternativa 2 + Alternativa 1** de la [propuesta STC-A2/A3](../propuestas/STC-A2-A3-manejo-error-y-multiples-taxdetails.md), con una precisión sobre nuestra recomendación: en lugar de un campo custom de cabecera, **reutilizar la estructura de tablas y registros de detalle de LOG del proceso de Facturación Electrónica**. Eso responde el bullet abierto del §5 de la propuesta.

### Qué se aplicó

| | Antes | Ahora |
|---|---|---|
| Diagnóstico (Alt 1) | `Error NetSuite Excepcion - detalles: ${error.message}` — un mensaje único para todo el `afterSubmit` | `etapa=` + `error.name` + `error.message` + contexto. Las etapas son `verificacion`, `load`, `indexado-taxdetails`, `seteo-columnas`, `desaplicar-aplicar-nc`, `save` |
| Marca permanente (Alt 2) | ninguna | cabecera `customrecord_l598_fact_elec_log` + detalle `customrecord_l598_fact_elec_dlog`, con `custrecord_l598_fact_elec_dlog_rtrans` → transacción |
| Interceptable por Saved Search | ❌ | ✅ filtrando el detalle por transacción no vacía |

### Por qué `record.create()` y no los Restlets de LOG

`L598 - Grabar Cabecera LOG Proceso FE.js` y `L598 - Grabar Detalle LOG Proceso FE.js` son **Restlets** (`@NScriptType Restlet`, exponen `post`) que el middleware consume por HTTP. Desde un User Event no se invocan como módulo: haría falta un `N/https` dentro del guardado — latencia y un punto de fallo de red extra en el camino crítico. Se reutiliza la **estructura de datos**, no el transporte, copiando campo por campo lo que hacen esos Restlets: misma fecha `DATETIMETZ` en `AMERICA_BUENOS_AIRES`, mismo recorte del detalle a 3997 caracteres, misma opcionalidad del campo de mensaje.

### Orden de las dos alternativas (no es cosmético)

El `log.error` de la Alt 1 se emite **antes** del `record.create()` de la Alt 2. `log.error` no consume governance; el `create`+`save` sí. Si el fallo original fue por unidades agotadas, el log es la única evidencia que va a existir.

### Límites explícitos

- **Governance agotado:** si el `save` falló por falta de unidades, el marcado también falla. Ese caso queda cubierto sólo por el `log.error`, que se purga. La marca cubre validación, permisos y campo bloqueado — la mayoría.
- **Alcance:** se marca ante **excepción** del camino legacy. Una línea que queda sin tax code por falta de `taxdetailsreference` **no lanza excepción** y hoy sólo deja un `log.error` en `setearColumnasConTaxDetails`. Extender la marca a ese caso es una decisión aparte, fuera de lo aprobado.
- **Costo:** hasta 2 búsquedas de código + 2 `create`/`save` de custom record, **sólo en el camino de fallo**. El camino feliz sigue en 0 GU.
- **`N/search` y `N/format` vuelven al `define`** — revierte parcialmente C1, que los había quitado por no usarse.

### ⚠ Pendiente de dato de Tekiio (no bloquea el deploy)

El objeto `LOG_FE` del script tiene dos constantes vacías que son **datos de la cuenta, no código**:

| Constante | Dónde debe existir | Si queda vacía o no se resuelve |
|---|---|---|
| `CODIGO_ESTADO` | `customrecord_l598_fe_est_log.custrecord_l598_fe_est_log_codigo` | el detalle se graba **huérfano** (sin cabecera), pero **con** la referencia a la transacción — la Saved Search funciona igual |
| `CODIGO_MENSAJE` | `customrecord_l598_msg_log.custrecord_l598_msg_log_codigo` | el detalle se graba sin el campo de mensaje; la descripción libre queda prefijada con `STC-A2` para poder filtrarla |

El marcado **degrada sin romper** en ambos casos, y cada degradación deja su propio `log.error` diciendo qué constante falta. Definir los dos códigos es lo único que queda para que la marca quede completa y tipificada.

### Verificación en la cuenta (2026-09-07)

El marcado de STC-A2 solo corre **ante excepción**, así que ningún guardado normal lo ejercita. Se verificó en dos pasos.

**Paso 1 — no rompe el camino feliz.** `vendorbill` 15826 creada y guardada con el `_REF` de producción. Resultado: sin errores de módulo (`N/search` + `N/format` cargan — era el único riesgo de STC-A2 sobre el camino feliz), el rastreo de `etapa` es transparente (`STC-A1 rama=legacy resultado=ok`) y el marcado no se disparó. Aislamiento y tiempos en [caracterización § vendorbill 15826](../caracterizacion/1-seteo-de-tax-codes.md#caracterización-stc-a2--vendorbill-15826-2026-09-07).

**Paso 2 — el marcado funciona.** Se subió temporalmente una copia del `_REF` con un `throw` deliberado antes del `save()` y `STC_A2 = "STC-A2-PRUEBA"` (prefijo distinto para que los registros generados sean triviales de borrar y no contaminen la Saved Search real con alertas fiscales falsas), se hizo `Edit`+`Save` de la Bill 15826, y se restauró el archivo original.

> **Técnica reutilizable:** las dos versiones se distinguen por **tamaño** en la ficha del File Cabinet — **32.120** bytes la de prueba, **28.561** la real. La restauración se verifica de un vistazo en lugar de depender de que alguien se acuerde. Y como se reusa el archivo y el deployment existentes, no hay que crear un Script record ni destildar deployments: menos manipulación de configuración, menos superficie de error. El radio de impacto de la ventana con el `throw` es solo el owner del script record, porque `Status = Testing` no ejecuta para nadie más.

Log obtenido, en orden:

```
15:09:20 AUDIT  beforeSubmit           STC-A1 rama=legacy motivo=linea-sin-taxdetail:expense[0]
15:09:25 AUDIT  afterSubmit            STC-A1 rama=legacy motivo=linea-sin-taxdetail:expense[0]
15:09:25 ERROR  afterSubmit            STC-A2-PRUEBA fallo etapa=save error=STC_A2_PRUEBA_FORZADA: ...
15:09:25 ERROR  crearCabeceraLogFE     CODIGO_ESTADO sin configurar: se graba solo el detalle
15:09:26 ERROR  crearDetalleLogFE      CODIGO_MENSAJE sin configurar: el detalle se graba sin mensaje
15:09:27 AUDIT  registrarFalloEnLogFE  STC-A2-PRUEBA transaccion marcada idTransaccion=15826 cabecera=sin-cabecera detalle=3063
```

Las tres líneas `ERROR` del medio son **degradación esperada**, no fallas. Y `resultado=ok` no aparece, que es la prueba de que el `save` no se ejecutó.

Registro creado — `FE-DLG-3063`, borrado después de verificar:

| Campo | Valor | Qué verifica |
|---|---|---|
| `REFERENCIA TRANSACCIÓN` | `Bill #TEST-STC-A2-01` | ✅ la Saved Search de intercepción **sí** encuentra la transacción. Era el único riesgo capaz de invalidar la Alternativa 2 |
| `FECHA` | `07/09/2026 3:09:26 pm` | ✅ el campo aceptó el string `DATETIMETZ` |
| `DETALLE` | texto completo con `etapa=save` y `error.name` | ✅ el diagnóstico de la Alt 1 llega al registro |
| `MENSAJE` | vacío | degradación esperada sin `CODIGO_MENSAJE` |
| `REFERENCIA LOG` | vacía | detalle huérfano esperado sin `CODIGO_ESTADO` |

Los tres riesgos que no se podían cerrar leyendo código quedaron descartados: **permisos** de creación sobre los custom records, **tipo del campo de fecha**, y que el **detalle huérfano** conserve la referencia a la transacción.

#### Dos hallazgos derivados

**El campo `fecha` del detalle es texto libre, no fecha.** Mi preocupación era que rechazara el string; era la preocupación equivocada. Acepta cualquier texto, y por eso la tabla — **3.052 registros** — tiene tres formatos distintos conviviendo:

| Registro | Valor |
|---|---|
| 3063 (nuestro) y 3061/3062 (Restlets) | `07/09/2026 3:09:26 pm` |
| 3060 | `Fri Sep 04 2026 16:09:22 GMT-0300 (hora estándar de Uruguay)` |
| 3058/3059 | `Wed Sep 02 20:00:44 PDT 2026` — **horario del Pacífico** |

Nuestra escritura sigue la convención de los Restlets, que es la consistente. Pero 3.052 registros con fechas no comparables ni ordenables es un problema de trazabilidad **preexistente**, que conviene reportar a Tekiio aparte de STC-A2.

**El rol que opera sí puede consultar los registros de LOG.** El rol `URU-Contador Suitetax (Mobeats)` no tiene el permiso `Custom Record Types` — que gobierna la página de *definiciones* — pero **sí** puede armar Búsquedas Guardadas sobre `URU-Factura Electronica Detalle Log`, `URU-Factura Electronica Log`, `URU-FE Estados Log` y `URU-FE Mensajes Log`. Es decir: **la Alternativa 2 es operable por el rol de negocio sin permisos extra**, y los dos códigos pendientes se pueden proponer con datos en lugar de dejarlos como pregunta abierta — el catálogo de mensajes es consultable.

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
- [x] **STC-A2 aplicado (aprobación Tekiio, 2026-09-07)** — Alt 2 + Alt 1 sobre la estructura de LOG de FE (ver §3.ter)
- [x] **STC-A2 verificado en la cuenta (2026-09-07)** — `vendorbill` 15826: camino feliz sin regresión + marcado probado de punta a punta con `throw` forzado (`FE-DLG-3063`, `REFERENCIA TRANSACCIÓN` cargada). Ver [§3.ter](#verificación-en-la-cuenta-2026-09-07)
- [ ] STC-A2 — definir `CODIGO_ESTADO` y `CODIGO_MENSAJE` en `URU-FE Estados Log` / `URU-FE Mensajes Log`. El catálogo es consultable con el rol de negocio, así que se puede **proponer** valores concretos
- [ ] STC-A2 — armar la Saved Search de intercepción previa al CFE (criterio: `DETALLE` contiene `STC-A2`)
- [ ] **STC-A1 — dimensionar el hallazgo de la línea de gasto** (§3.bis): si las Bills reales llevan líneas de gasto sin impuesto, el ahorro de 30 GU → 0 en compras es marginal
- [ ] Reinventariar audiencias de los deployments de `vendorbill` — la premisa de audiencias complementarias quedó refutada (ver caracterización)
- [ ] **STC-A3 sin respuesta** — ni la pregunta fiscal (¿impuestos compuestos por línea en UY?) ni la aprobación de la instrumentación de detección. Se conserva el comportamiento actual (primer match)
- [x] **STC-A1 aplicado con guarda híbrida** + `node --check` OK — 2026-08-20 (ver §3.bis)
- [x] Subir el `_REF` actualizado al File Cabinet y verificar que los deployments tomen la versión nueva — 2026-08-20
- [x] **Corrección de diseño:** eliminada la bandera `escrituraInline` (no sobrevive entre entry points); `afterSubmit` decide por **equivalencia de valores** contra el índice de `taxdetails` de `context.newRecord` (0 GU) — 2026-08-20
- [x] ✅ **`vendorcredit` 15227 caracterizado — el caso que podía fallar, con el ahorro confirmado** — 2026-08-20, [evidencia](../caracterizacion/1-seteo-de-tax-codes.md#caracterización-del-híbrido-stc-a1--vendorcredit-15227-2026-08-20). `rama=inline` + `inline-ok verificadas=1` · **0 GU y 0 operaciones de registro en ambos entry points (contra 30 GU / 2 ops)** · output byte a byte idéntico, sublist `apply` incluida · aislamiento de 3 patas confirmado en el log. **`desaplicarYAplicarNC` era efectivamente un workaround del 2º save** (probado: el legacy no corrió y la sublist quedó intacta igual)
- [ ] Caracterización del híbrido en el resto: `salesorder`, `estimate`, `purchaseorder`, `vendorbill` (rama `expense`)
- [ ] Medir GU reales en APM (esperado: 30 → 0) y capturar el snapshot `afterSubmit` del diagnóstico de la corrida de 15227
- [ ] Residual `apply`: repetir con un `vendorcredit` de **2+ documentos aplicados** (la corrida de 15227 ejercitó el loop con n=1)
- [ ] Caracterización completa con bordes (grupo/descuento/multi-tasa) — bloqueada por casos con bordes (pedido a Tekiio)
- [ ] Tipos con CFE — bloqueados por middleware CAE (Tekiio revisando; probar además respuesta exitosa del facturador)
- [ ] STC-A3: respuesta fiscal (¿impuestos compuestos por línea en UY?) + aprobación de la instrumentación de detección — STC-A2 ya aprobado y aplicado (2026-09-07)
