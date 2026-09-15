# Bitácora de aplicación — Transacción (Servidor), unidades 5-6

Cambios del **Grupo A aprobados por Tekiio el 2026-09-08** (TRS-A2 y TRS-A7), aplicados ese mismo día sobre `L598 -Transacción (Servidor)_REF.js`. A diferencia de las unidades 1-4, estos **sí alteran comportamiento** y por eso requirieron aprobación previa. Se separó del [informe de análisis](2-transaccion-servidor.md) para que ese documento se lea rápido; acá no hay contenido nuevo ni recortado.

← [Informe de análisis](2-transaccion-servidor.md) · [Unidades 1-4 (refactor B/C/D)](2-transaccion-servidor-bitacora-unidades-1-4.md) · [Registro de aprobaciones](../registro-aprobaciones.md)

---

## 3.sexies Unidad 5 — TRS-A2: early return (aplicada 2026-09-08)

**Aprobación:** Tekiio, 2026-09-08, junto con TRS-A1 y TRS-A7. Es el primero de los tres que se aplica: no depende de nada y su validación es la más simple.

### Verificación previa — no se aplicó sobre la palabra de la propuesta

La propuesta afirmaba que el `afterSubmit` es un no-op para `salesorder`/`transferorder`. Se trazó el camino completo antes de tocar nada, porque si alguna escritura se hubiera pasado por alto **el early return la eliminaría en silencio** — y eso sería un cambio de comportamiento real, no formal.

| Paso del `afterSubmit` | Con `salesorder` / `transferorder` |
|---|---|
| `record.load()` | **corre** — ~10 GU |
| Bloque de manejo de líneas | salteado por su guard de tipo |
| Bloque del nro. de comprobante | salteado por su guard de tipo |
| `desaplicarYAplicarNC` | **no-op** — todo su cuerpo está dentro de `if (recType == "creditmemo")` |
| `objRecord.save()` | **corre** — ~20 GU, sin escribir nada |

Entre medio, dos `log.debug`. Confirmado: un `load`+`save` completo para dejar el registro igual.

**El llenado de sucursal vacía, que sí aplica a estos tipos, no se toca.** Ocurre en `beforeSubmit`, en un `setValue` que está *antes y por fuera* del guard de exclusión por tipo. Y el cierre de `beforeSubmit` solo tiene los dos borrados de retenciones, guardados por `vendorcredit` y resguardo.

### Lo aplicado

Un early return **antes del `load`**, que es donde empieza el costo. Los dos guards por tipo de más abajo **quedan a propósito**: ahora son redundantes, pero dicen lo mismo que el early return en vez de contradecirlo, y sostienen el comportamiento si alguna vez esta salida se mueve o se revierte.

Se agrega un `log.audit` con la rama tomada, por el mismo criterio que en STC-A1: allí un camino feliz silencioso fue justamente lo que oculta que el ahorro no se materializaba, hasta que se midió el governance.

### Lo que este cambio NO ahorra, y por qué hay que decirlo

El análisis original citaba, además del load+save, que *"el save re-dispara los UserEvents del registro"*. **Es falso** y quedó cerrado el 2026-09-08 (ver §7.4): quitar el save **no** elimina una segunda ejecución de otros scripts, porque esa segunda ejecución nunca ocurría.

El ahorro es el load+save en sí, que alcanza de sobra. Se anota porque **un beneficio inflado en la propuesta es un beneficio que la medición va a desmentir**, y perder credibilidad en la medición cuesta más que el beneficio que se gana citando de más.

### Criterio de caracterización

| Qué | Esperado |
|---|---|
| Log del `afterSubmit` | `TRS-A2 early-return recordType=salesorder id=<n> eventType=<create\|edit>` |
| APM, este script | `Usage Count = 0` y `Record Operations = 0` en ese guardado |
| El registro guardado | **idéntico** al de una orden guardada antes del cambio, incluida `custbody_l598_sucursal` |
| Ejecuciones por script en el Execution Log | **las mismas que antes** (una por script) — porque la cascada no existía. Si aparecieran menos, la premisa de §7.4 estaría mal y habría que reabrirla |

La última fila es el control que convierte a §7.4 en falsable: si el early return hiciera desaparecer ejecuciones de otros scripts, la conclusión de que no hay cascada quedaría refutada.

✔ **Sintaxis:** `node --check` OK.

## 3.septies Unidad 6 — TRS-A7: paginación de las 3 saved searches (aplicada 2026-09-08)

**Aprobación:** Tekiio, 2026-09-08. Aprobaron la paginación; **quedó sin responder** la otra mitad del pedido — si el volumen de 1.000 filas es alcanzable en la operación real. No bloquea, porque el resultado solo cambia por encima de ese volumen, pero define la **prioridad**: si nunca se llega, es robustez preventiva.

### Alcance verificado

De los **10** `getRange` del script, solo **3** truncan — las tres saved searches del `afterSubmit`. Los otros 7 usan `end: 1`: lookups de un resultado, sin riesgo.

| Saved search | Columnas | Qué alimenta |
|---|:--:|---|
| `customsearch_l598_articulos` | 3 | nombre y unidad de medida por línea de artículo |
| `customsearch_l598_timebill` | 4 | ídem para líneas de tiempo |
| `customsearch_l598_cod_impuestos` | 5 | indicador de facturación, cód. percepción, flags |

### Por qué NO se usaron los helpers de `utilities`

La propuesta decía reusar `utilities.searchSaved` / `searchSavedPro`, que efectivamente paginan. Al leerlos aparecieron tres costos que la propuesta no había previsto — y el tercero es el que decide:

| # | Costo | Impacto |
|:-:|---|---|
| 1 | `searchSavedPro` llama `armarArreglosSS()` sin condición: recorre **cada fila por cada columna** con un `getValue` | Mapeamos por índice de columna, así que ese array se descarta. Hasta **1.000 × 5 = 5.000 `getValue` tirados** por búsqueda — y peor justamente en el caso de volumen alto que TRS-A7 viene a cubrir |
| 2 | `searchSaved` emite 2 `log.audit` por llamada, uno con `JSON.stringify` del array de ids | Es el patrón que **TRS-B4 acaba de sacar** del camino caliente de este mismo script |
| 3 | Los dos capturan la excepción y la devuelven como `objRespuesta.error` | Este `afterSubmit` **no tiene `try/catch`**: hoy un fallo de búsqueda es un error no manejado y **ruidoso**. Adoptarlos sin chequear ese flag convertiría el fallo en **silencioso**, con líneas incompletas viajando al CFE. Es el mismo defecto que STC-A2 |

El punto 3 es el argumento, no el rendimiento: **chequear el flag implica escribir el guard de todos modos**, y entonces la reutilización deja de ahorrar código.

**Lo aplicado** es un loop de paginado local, `correrSavedSearchPaginada`, usado por las tres. Preserva la semántica de error actual, no agrega pasadas sobre el result set, y corta en la primera página incompleta — lo que evita la llamada extra que hace el paginado de `utilities` cuando el total es múltiplo exacto de 1.000.

**El costo asumido:** la lógica de paginado queda repetida una cuarta vez en el proyecto. Es el más barato de los cuatro, y está declarado en el comentario del helper para que se pueda discutir.

> ⚠️ **Esto se aparta de lo que la propuesta le dijo a Tekiio.** Conviene mencionárselo: lo aprobado fue *paginar*, y se paginó; lo que cambió es el mecanismo, por razones que no se conocían al escribir la propuesta.

### Dos hallazgos sobre `L598 - Utilities.js`

Salieron de leer los helpers y **no son de este script**: corresponden al análisis propio de Utilities.

1. **`operadorBusqueda()` hace `switch` sobre nombres en MAYÚSCULA** (`'ANYOF'`, `'IS'`) y **no tiene rama `default`**: el `var operator = ''` inicial se devuelve tal cual si no hay match. Pasarle `search.Operator.ANYOF` — que vale `'anyof'` — produce un operador vacío, el `createFilter` falla dentro del `try` del helper y queda como `error: true`. Es **el mismo desajuste de mayúsculas contra un enum de NetSuite que TRS-A4**. Verificado que los llamadores actuales del proyecto pasan las mayúsculas correctas, así que **no hay bug activo** — pero es una trampa esperando al próximo.
2. **`objRsponseFunction` se asigna sin declarar** en los dos helpers (`objRsponseFunction = new Object()`): es un **global implícito** en un módulo compartido por todos los scripts de la localización.

### Criterio de caracterización

Por debajo de 1.000 filas el output debe ser **idéntico**, y ese es el caso que se puede probar hoy: guardar una transacción normal y comparar las columnas de línea contra el baseline. El caso de >1.000 filas no es reproducible sin saber si el volumen existe — justamente la pregunta que quedó abierta.

✔ **Sintaxis:** `node --check` OK.

