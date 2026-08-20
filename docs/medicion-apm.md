# Medición de tiempos con APM (Page Time Summary)

Procedimiento para medir tiempo y governance de los scripts durante los guardados de transacciones, usando la herramienta nativa **APM** de NetSuite. Es la ejecución del paso "Medición GU/tiempo vs baseline" de la [metodología](metodologia-refactor.md).

**Fuente:** manual "Manual APM.pdf" (Tekiio, 2026-08). Este documento lo destila y agrega las reglas de comparación justa del proyecto.

---

## 1. Ruta y filtros

`Personalización > Performance > Page Time Summary`

| Filtro | Valor |
|---|---|
| Tipo de registro | El tipo de la transacción medida (ej. `Orden de venta`) |
| Operación | **Guardar** |
| Fecha y hora de inicio / finalización | Rango que contenga las corridas a medir |

Clic en **Actualizar** para procesar.

## 2. Las tres secciones y qué anotar

### 2.1 Registros de rendimiento (resumen)

Medidas de tendencia central de los guardados encontrados: media, mediana, desviación estándar y percentil 95, desglosadas en `Cliente / Red / SuiteScript / Flujo de trabajo / Servidor / Total` (segundos).

> Para comparar scripts, la columna que importa es **SuiteScript**. `Servidor` y `Total` incluyen trabajo del sistema que no controlamos (en el smoke test: 35,87s de "Sistema NetSuite" sobre 46,76s totales).

### 2.2 Detalles (por transacción)

Tiempos individuales de cada guardado, con fecha/hora y usuario. Sirve para ubicar una corrida puntual (ej. la del rol Mobeats) y descartar guardados ajenos.

### 2.3 Desglose de script y tiempos del flujo

Torta + tabla con el tiempo de respuesta de **cada proceso** que participó del guardado (cada UserEvent, workflows, sistema). Clic en un script → **Detalles de SuiteScript**, el panel con los datos que realmente comparamos:

| Campo | Qué es |
|---|---|
| Tiempo total | Segundos del script en ese rango |
| **Recuento de uso** | **Governance units consumidas** |
| Operaciones de registro | Cantidad de `load`/`save`/etc. |
| Llamadas de búsqueda | Cantidad de searches ejecutadas |
| Recuento de errores | Errores del script |
| Tipo / Contexto | Entry point (ej. "después de enviar") y contexto (UI, etc.) |

**Plantilla de registro por corrida:**

```
Script · entry point · transacción (id) · fecha/hora · tiempo (s) · GU · ops registro · búsquedas · errores
```

## 3. Reglas de comparación justa

1. **Misma transacción, mismas líneas.** Comparar el original y el `_REF` sobre guardados de la misma transacción (o transacciones idénticas en líneas). El tiempo depende de la cantidad de líneas y taxdetails.
2. **Mediana de varias corridas, no una.** La carga de la cuenta compartida varía; una corrida aislada puede caer en un pico. Mínimo 3 guardados por versión cuando se busque una cifra citable.
3. **Comparar script contra script, no total contra total.** El `Total`/`Servidor` incluye Sistema NetSuite y los demás UserEvents del tipo de registro; solo la fila del script en el desglose aísla lo nuestro.
4. **Audiencias:** el original de Seteo de Tax Codes solo dispara en guardados de `Administrador`; el `_REF` solo con `URU-Contador Suitetax (Mobeats)`. Un head-to-head sobre la misma transacción requiere un guardado de cada rol. Las corridas del rol Mobeats miden solo al `_REF`.
5. **Retención de APM:** verificar hasta qué fecha hacia atrás hay datos antes de planificar sobre corridas históricas.
6. **GU es determinística, el tiempo no.** El `Recuento de uso` no depende de la carga: es la métrica más comparable entre corridas. El tiempo acompaña como evidencia secundaria.

## 4. Datos ya disponibles (del propio manual)

Las capturas del manual corresponden al **smoke test del `_REF`** (Orden de venta 15260, re-guardado 30/07/2026 10:04 AM, usuario `sbenitez@mobea...`):

| Métrica | Valor | Lectura |
|---|---|---|
| `REF - L598 - Seteo de Tax Codes` (afterSubmit, UI) | **1,885 s** | Tiempo del script en el guardado |
| **Recuento de uso** | **30 GU** | Confirma empíricamente la estimación del informe: `record.load()` (10) + `save()` (20) |
| Operaciones de registro | **2** | Exactamente el load + save |
| Llamadas de búsqueda | **0** | Consistente con STC-C1 (no usa searches) |
| Recuento de errores | 0 | |
| `REF` beforeSubmit | 0,029 s | El no-op obligatorio |
| Contexto del guardado | SuiteScript 2,43s de un Total de 46,76s (Sistema NetSuite: 35,87s) | El script es una fracción menor del guardado total |

> **Confirmación del "nota honesta" del [informe](refactors/1-seteo-de-tax-codes.md#1-resumen):** los 30 GU del load+save siguen intactos tras B+C+D — ese costo solo lo elimina STC-A1. La medición valida la predicción, no la contradice.

**Desglose completo del guardado (re-extraído de APM 2026-08-05, `NUMBER OF LOGS = 1`):** `NetSuite System` 35,87 · `REF` afterSubmit 1,885 · `FTE UE Transaction` 0,06 y 0,027 · `3K-Verificar Tax Codes Group Items (ss)` 0,051 · `REF` beforeSubmit 0,029. **Ni el STC original ni `Transacción (Servidor)` aparecen** → confirmación de aislamiento independiente de los Execution Logs. El desglose por script de APM sirve como cuarta pata de aislamiento en cualquier corrida futura.

## 5. Procedimiento para Seteo de Tax Codes

**Fase A — perfil del `_REF` (sin corridas nuevas). ✅ Extraída 2026-08-05:**

| Corrida | `afterSubmit` (s) | `beforeSubmit` (s) | GU | SuiteScript total (s) | Save total (s) | Otros scripts en el desglose |
|---|:--:|:--:|:--:|:--:|:--:|---|
| SO 15260 (30/07 10:04) | **1,885** | 0,029 | **30** | 2,43 | 46,76 | FTE ×2, 3K-Verificar Tax Codes Group Items |
| Bill 14990 (03/08 19:23) | **2,306** | 0,069 | **30** | 3,015 | 37,72 | FTE ×2 |
| Bill Credit 15227 (05/08 17:19) | **2,243** | 0,077 | **30** | 2,85 | 34,46 | FTE ×2 |

Las 3 corridas con **2 operaciones de registro, 0 búsquedas, 0 URL requests, 0 errores** (panel SuiteScript Details, verificado 2026-08-05).

**Corridas 4 y 5 (regresión, extraídas 2026-08-06):**

| Corrida | `afterSubmit` (s) | `beforeSubmit` (s) | GU | SuiteScript total (s) | Save total (s) | Notas |
|---|:--:|:--:|:--:|:--:|:--:|---|
| PO 15111 (06/08 13:34) | **1,315** | 0,04 | **30** | 2,466 | 26,90 | En el desglose aparece **`URU - Heredar Campos T…` (0,86s)** — script no visto en corridas anteriores; riesgo bajo para la atribución (el grep del repo muestra que solo STC/TRS escriben `custcol_l598_codigo_impuesto`, y el diff dio idéntico) |
| Estimate 15399 (06/08 15:06) | **7,601** ⚠️ | 0,039 | **30** | 16,811 | 37,84 | **Outlier de tiempo**: CREATE (primera ejecución en ese tipo) + guardado pesado (Server 36,5s). Mismo governance exacto que la corrida de 1,3s |

- **GU verificadas por panel agregado** (SuiteScript Analysis, 06/08, `Number of Logs = 2`): `Total Time 4,458 = (1,315+7,601)÷2` exacto → el panel promedia por log; `Usage Count 30` como promedio de 2 corridas ⇒ ambas consumieron exactamente 30 (2 ops, 0 búsquedas, 0 errores).
- ⚠️ **Gotcha de agregación de APM:** `SuiteScript Analysis` muestra **promedios** por log; el desglose de `Page Time Summary` muestra **sumas** sobre el rango. Dos semánticas distintas en dos pantallas — no mezclar al citar.
- **Los ~9s de SuiteScript no itemizados del Estimate no son un script oculto:** el selector `1/2` de la torta pagina las etiquetas, no la lista (completa, 6 filas). Hipótesis: es el plugin del motor SuiteTax Latam (`CUSTOMSCRIPT_FTE_PL_GENERAL`, el que calculó según Tax Details) — corre en la columna SuiteScript pero no aparece como fila del desglose.
- Aislamiento confirmado por APM también en estas 2 corridas: ni el STC original ni `Transacción (Servidor)` en los desgloses.
- **Conclusión de la Fase A (5 puntos):** `afterSubmit` varía 1,3–7,6s (6×) según tipo y frío/caliente; **el governance no se mueve: 30 GU en las 5 corridas**. El tiempo es clima, el governance es estructura — la métrica citable es GU.

- **Aislamiento cross-validado por APM en las 3 corridas:** en ningún desglose aparecen el STC original ni `Transacción (Servidor)` — solo `REF` ×2 entry points, el motor FTE y (solo en venta) el 3K de verificación.
- `afterSubmit` estable en ~1,9–2,3s en los tres tipos; `beforeSubmit` no-op en 0,03–0,08s. `NetSuite System` domina cada guardado (28–36s).
- **Governance determinística confirmada: 30 GU en los 3 tipos, y el 100% viene del load+save** (2 record ops, 0 searches — no hay ningún otro consumidor). Es el argumento cuantitativo de STC-A1: mover el entry point elimina la totalidad del governance del script.
- ⚠️ **No comparar todavía contra el "11-14s ×2" del análisis previo del original:** ese número salió de otras transacciones, con otras líneas y otra carga de cuenta. La comparación citable la da la Fase B sobre las mismas transacciones o equivalentes.

### Fase A-bis — El `_REF` con la guarda híbrida (STC-A1), 2026-08-20

Medición sobre `vendorcredit` 15227, misma transacción y mismo contexto que la corrida del 05/08. Detalle completo y evidencia de output en la [caracterización](caracterizacion/1-seteo-de-tax-codes.md#caracterización-del-híbrido-stc-a1--vendorcredit-15227-2026-08-20).

| Versión | `beforeSubmit` | `afterSubmit` | **GU** | **Record ops** | Tiempo total script |
|---|:--:|:--:|:--:|:--:|:--:|
| `_REF` B+C+D (afterSubmit puro) | 0,03–0,08 s (no-op) | 1,3–7,6 s | **30** | **2** | — |
| Híbrido, 1ª corrida (bandera de módulo) | 0,11 s | 1,632 s | **30** | **2** | 1,742 s |
| **Híbrido corregido (verificación por valor)** | **0,062 s** | **0,026 s** | **0** | **0** | **0,088 s** |

**El objetivo cuantitativo de STC-A1 está cumplido y medido: 30 GU → 0, el 100% del footprint de governance del script.** `Number of Logs = 1` en cada consulta, rango acotado para evitar el promediado.

Tres aprendizajes de método que esta medición dejó:

1. **La 1ª corrida del híbrido logueaba `rama=inline` y consumía 30 GU igual.** El log decía una cosa y el governance otra; sin APM la conclusión equivocada habría llegado al informe. Causa: la bandera de módulo no sobrevive entre `beforeSubmit` y `afterSubmit`. **Ningún cambio de governance se da por hecho sin medirlo — el log del propio script no es evidencia de su costo.**
2. **El conteo de entradas de log NO prueba ausencia de re-guardado.** El script de diagnóstico logueó una sola vez pese a que el `save()` legacy sí corrió ⇒ un `save()` desde un UserEvent no re-dispara los UserEvents de otros scripts en esta cuenta. La métrica válida es `Record Operations`.
3. **Cuidado con el promediado al comparar antes/después el mismo día.** `SuiteScript Analysis` promedia por log: con las dos corridas en el rango, `After Submit` mostró `Usage Count 15` (= (30+0)/2), un número que no existió nunca. Acotar el rango hasta tener `Number of Logs = 1`.

**Fase B — baseline del original. Retención confirmada 2026-08-05: APM conserva los datos del 09/06.** Dataset: 6 guardados de `Sales Order` el 09/06/2026 19:23–19:33 por `david.briceno@tekiio.com.ar` (rol `Administrador` inferido: el STC original disparó). Coincide con el Excel de mediciones que compartió Tekiio ("Historial de Intentos Reales (APM)" — Orden de Venta).

Hallazgos de la lectura del dataset (2026-08-05):

1. **Los valores del desglose por script son SUMAS sobre los guardados del rango, no por corrida.** Verificación: la suma del desglose (~32,8s) ≈ la suma de la columna SuiteScript de los 6 guardados (~35s). El `13,92s` del STC original del Excel **no es un guardado: son los 6 acumulados**.
2. **El original no corrió en los 6 guardados.** Tres de los seis tienen SuiteScript total ≈ 0,37s — incompatible con el load+save del STC (y del TRS, que también carga y guarda incondicionalmente). El original corrió efectivamente en ~3 guardados → su promedio por corrida está entre `13,92/6 = 2,32s` (supuesto irreal de 6 corridas) y `13,92/3 = 4,64s` (3 corridas), con un guardado frío de 21,5s de SuiteScript que sesga hacia arriba. **Ninguna de las dos cifras es citable sin el drill-down por ejecución.**
3. **Procedencia del "11-14s ×2" del análisis previo:** coincide con el promedio de `Total` de página del Excel (14,10s), que incluye `NetSuite System` (16,44s acumulados) y todos los demás scripts — **no era el costo del script solo**. Recalibrar la narrativa de STC-A1 con esta precisión.
4. **En `salesorder` las audiencias NO son complementarias:** en los guardados de David (Administrador) corrieron el STC original **y** `Transacción (Servidor)` (3 entradas: 1,09 + 0,42 + 0,04) **y** `Setear Unidad Indexada` (0,78). El hallazgo de audiencias complementarias de compras no se generaliza — verificado tipo por tipo.

**Drill-down pendiente para la cifra citable:** clic en la fila del STC original en el desglose → panel SuiteScript Details → `Number of Logs` (cuántas corridas reales) y `Total Time`; con `View Logs`/gráfico, los tiempos por ejecución. La comparación de Fase C se hace **mediana contra mediana, por corrida**.

**Comparación provisional (no citable aún):** `_REF` 1,885s en SO de 1 línea vs original entre ~2,3 y ~4,6s por corrida en SOs equivalentes → mejora real de entre ~20% y ~60% en tiempo de script. El rango se cierra con el drill-down.

> ⚠️ **Retractación (2026-08-05):** el rango provisional de arriba **no sobrevivió** a la lectura completa del Excel de Tekiio. El original en Invoice promedia ~1,6s/guardado (11,11 ÷ 7) y en NC ~1,7s (6,67 ÷ 4) — del mismo orden que el `_REF` (1,9–2,3s). Con cold-starts y varianza de cuenta compartida dominando, **la comparación de tiempo original vs `_REF` es inconcluyente a esta precisión y no se publica ningún porcentaje de mejora**. El argumento citable del refactor es funcional (comportamiento idéntico probado) y el de STC-A1 es governance (30 GU = 100% del footprint) + un evento de guardado menos.

### Lectura del Excel APM de Tekiio (flujos de venta, 09-10/06) — decodificación

Verificado 2026-08-05 contra las planillas "Historial de Intentos Reales (APM)":

1. **Los baselines del proyecto son sumas acumuladas, no tiempos por guardado.** Prueba aritmética: TRS Remito 9,18+0,38+0,06 = 9,62 ≈ "9.6s" del informe (6 guardados); NC 6,62 ≈ "6.6s" (4); F.Venta 4,09 ≈ "4.1s" (7); OV 1,55 ≈ "1.5s" (6). STC: Invoice 11,03 y SO 13,92 acumulados = el "11–14s ×2". Los informes 1 y 2 llevan la corrección.
2. **Por guardado (÷N, piso estimado):** STC ≈ 1,6-1,7s (Invoice/NC) · TRS ≈ 1,7s (NC), 1,6s (Remito), 0,6s (F.Venta), 0,26s (OV) · **Conexión Directa FE (SS) es el verdadero top offender de los flujos FE**: ≈ 3,6s (Remito), 3,0s (NC), 1,7s (Invoice) — consistente con llamadas al middleware CAE (y sus esperas/timeouts). Dato clave para el refactor #5.
3. **Chequeos de consistencia que PASAN:** STC ausente del desglose de Ejecución de Artículo y Pago de Venta (no tiene deployments para esos tipos ✓). Los promedios de Total incluyen cold-starts de 51-62s que inflan la media; la mediana es mucho menor.
4. **Planilla "Pago de Venta" internamente inconsistente:** la columna SuiteScript acumula ~24,6s pero el desglose muestra solo `Sistema NetSuite 7,02` sin ningún script — mismo síntoma que el drill-down expirado del 09/06. Su desglose **no es usable**; los tiempos de página sí.
5. **Retención del detalle por script:** el desglose por script del 09-10/06 ya expiró en APM (el panel muestra solo `NetSuite System`); el Excel de Tekiio es el **snapshot sobreviviente** de ese detalle y por eso es la fuente citable del baseline — con la limitación declarada de ser sumas.

**Fase C — tabla comparativa** en el informe del script: original vs `_REF`, por tipo de registro, con GU y mediana de tiempo. Expectativa declarada: mejora **modesta** en tiempo (menos logs, Map O(1)); GU sin cambio hasta STC-A1.

## Relacionados

- [Metodología de refactor](metodologia-refactor.md) — criterio de medición.
- [Caracterización — Seteo de Tax Codes](caracterizacion/1-seteo-de-tax-codes.md) — corridas funcionales que alimentan la Fase A.
- Manual original: `Manual APM.pdf` (Tekiio).
