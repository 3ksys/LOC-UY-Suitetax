# Resumen ejecutivo — Análisis de los 6 scripts críticos

**Fecha:** 2026-09-15 · **Equipo:** Mobeats · **Para:** Tekiio
*Actualiza la versión del 2026-07-30. Los cambios de fondo respecto de aquella están marcados con 🔄.*

Análisis pre-refactor de los 6 scripts que dominan el costo real de los flujos de negocio ([ranking medido](flujos-prueba-y-plan-ejecucion.md#4-scripts-que-dominan-el-costo-real-ranking-por-impacto-medido)). Cada script tiene su informe completo con hallazgos verificados línea por línea, plan de cambios propuesto y casos de caracterización. Este documento consolida el estado, los **patrones sistémicos** que se repiten entre scripts y las **decisiones que necesitamos de Tekiio**.

**Metodología:** cada hallazgo se clasifica en Grupo A (correctitud — NO entra al refactor, va a aprobación), B (governance/performance), C (estándares 2.1) o D (mantenibilidad), con riesgo 🟢/🟡/🔴 según la [metodología acordada](metodologia-refactor.md). El refactor B/C/D **no cambia comportamiento** y se valida con caracterización byte-a-byte.

---

## 1. Estado por script

| # | Script | LOC | Baseline medido | Hallazgos A/B/C/D | Estado | Informe |
|:--:|---|--:|---|:--:|---|---|
| 1 | `Seteo de Tax Codes` | 167 | 11.1–13.9s ×2 | 3 A (2 🔧 · 1 ⏳) | 🔄 **`_REF` con B/C/D + STC-A1 + STC-A2 aplicados.** Caracterizado: **30 GU → 0** | [informe](refactors/1-seteo-de-tax-codes.md) · [bitácora](refactors/1-seteo-de-tax-codes-bitacora.md) · [caracterización](caracterizacion/1-seteo-de-tax-codes.md) |
| 2 | `Transacción (Servidor)` | 2128 | 4.1–9.6s ×3 | 8 / 6 / 4 / 7 | 🔄 **6 unidades aplicadas** sobre el `_REF` (4 B/C/D + TRS-A2 + TRS-A7). Pendiente caracterización | [informe](refactors/2-transaccion-servidor.md) · [bitácora 1-4](refactors/2-transaccion-servidor-bitacora-unidades-1-4.md) · [5-6](refactors/2-transaccion-servidor-bitacora-unidades-5-6.md) |
| 3 | `Calcular Retenciones (SS)V2` | 2431 | 5.4s ×3 | 13 / 5 / 5 / 9 | 🔄 **`_REF` con 15 de 18 B/C/D aplicados**; los 4 bloques de posteo fiscal solo con cambios mecánicos. Pendiente caracterización | [informe](refactors/3-calcular-retenciones-ss.md) · [bitácora](refactors/3-calcular-retenciones-ss-bitacora.md) |
| 4 | `Asignar Rubro IVA` | 473 | 2.9s ×1 | 6 / 5 / 3 / 7 | 🔄 **`_REF` con 12 de 15 B/C/D aplicados.** Pendiente caracterización | [informe](refactors/4-asignar-rubro-iva.md) |
| 5 | `Conexion Directa FE (SS)` | 4362 | **21.6s ×2** (pico) | 8 / 7 / 5 / 7 | 🔄 **`_REF` con 10 B/C/D aplicados + 2 parciales**; 4362 → 4048 líneas. Pendiente caracterización | [informe](refactors/5-conexion-directa-fe-ss.md) · [bitácora](refactors/5-conexion-directa-fe-ss-bitacora.md) · [anexo CFE](refactors/5-conexion-directa-fe-ss-anexo-tipo-cfe.md) |
| 6 | `Setear Unidad Indexada` | 156 | 0.8s ×1 | 4 / 3 / 4 / 6 | 🔄 **`_REF` con los 9 B/C/D aplicables aplicados.** Pendiente caracterización | [informe](refactors/6-setear-unidad-indexada.md) |

El `×N` es la cantidad de entry points declarados, no re-ejecuciones ([verificado](flujos-prueba-y-plan-ejecucion.md#5-hallazgos-críticos)).

🔄 **Los 6 scripts tienen `_REF`.** En los scripts 3 a 6 se aplicaron **46 cambios B/C/D completos y 2 parciales** el 2026-09-15, sin tocar ningún original ni ningún Grupo A. Cada cambio tiene su argumento de equivalencia escrito y verificación medida (sintaxis, variables libres, invariantes contra el original) en la bitácora de su informe. Quedaron afuera con motivo escrito: los 🔴, y 6 ítems cuya equivalencia **no se puede probar desde el repo** — dependen de datos de la cuenta que pedimos abajo (#12).

🔄 **Los 42 hallazgos del Grupo A de los 6 scripts están registrados uno por uno** en [registro-aprobaciones.md](registro-aprobaciones.md), junto con 11 cambios B/D que requieren aprobación: 9 por reemplazo de mecanismo y **2 reclasificados al aplicar el refactor** porque resultaron correcciones de bug, no refactor (ARI-B3, CDF-D5). Son **56 filas** con su riesgo, el motivo del bloqueo y el enlace al hallazgo. Estado hoy: **4 aplicados** (STC-A1, STC-A2, TRS-A2, TRS-A7), **1 aprobado en espera** (TRS-A1, bloqueado por TRS-D1) y **51 pendientes de respuesta**.

## 2. Patrones sistémicos (se repiten entre scripts)

Estos patrones importan más que cualquier hallazgo individual: se corrigen una vez y aplican a toda la ola.

### 2.1 El costo dominante es estructural: `afterSubmit` + `record.load()` + `save()`

**5 de los 6 scripts** re-cargan y re-guardan la transacción completa después de que NetSuite ya la guardó: STC (propuesta STC-A1), TRS-A1, ARI-A1, CRT-A13, CDF-B5 (doble load+save en modo automático). Caso extremo: `Transacción (Servidor)` ejecutaba load+save **aun para `salesorder`/`transferorder`, a los que toda su lógica saltea** (TRS-A2) — un guardado vacío por cada orden; ya corregido y aplicado.

🔄 **Corrección respecto de la versión anterior.** Aquella decía que cada `save()` extra "re-dispara además los UserEvents de los demás scripts". **Es falso y quedó cerrado el 2026-09-08** con dos observaciones independientes en la cuenta: el diagnóstico sobre `vendorcredit` 15227 y `Seteo de Tax Codes` sobre la `invoice` 15822 — en ambas, el `save()` de un UserEvent **no** volvió a ejecutar los UserEvents de otros scripts. Lo decimos explícitamente porque era una premisa que sostenía parcialmente TRS-A1, TRS-A2, ARI-A1, SUI-A1 y CDF-A7.

**El argumento de fondo no se cae: se apoya solo.** El ahorro real es el load+save en sí — medido en STC-A1 en **30 GU por guardado, el 100% del footprint de governance de ese script**, que tras la corrección bajó a **0**. Eso es dato de la cuenta, no inferencia.

**Propuesta:** tratar la familia de cambios de entry point (STC-A1 ✅ + TRS-A1 + ARI-A1 + CRT-A13) como **una sola decisión arquitectónica**, no cuatro aprobaciones aisladas — hay dependencias de datos entre ellos (ver 2.2).

### 2.2 Lógica duplicada entre scripts, con dependencia de orden

- `Transacción (Servidor)` **duplica casi literalmente** el seteo de tax codes de `Seteo de Tax Codes` (TRS-D1) → en los tipos compartidos, el mismo trabajo se hace dos veces por guardado, cada una con su load+save.
- El toggle de la sublista `apply` de NC existe **tres veces** (STC, TRS, ARI-D3), con coberturas distintas.
- `Asignar Rubro IVA` y `Conexion Directa FE` **leen** los `custcol` que `Seteo de Tax Codes` escribe en su propio `afterSubmit` → hay acoplamiento por orden de ejecución de UEs que no es visible en el repo.

🔄 **Esto dejó de ser teórico y hoy bloquea trabajo aprobado.** Verificamos en la `invoice` 15822 que `custcol_l598_codigo_impuesto` la escriben **3 UserEvents** y que el dueño efectivo es el que escribe último — un orden que NetSuite no garantiza. TRS-A1 está **aprobado desde el 2026-09-08 y sin aplicar** por esta razón: moverlo a `beforeSubmit` invierte el orden y cambiaría el dueño de las columnas por accidente, no por decisión. La propuesta con la recomendación concreta está en [TRS-D1](propuestas/TRS-D1-dueno-unico-tax-codes.md) — **es el desbloqueo más urgente que tenemos pendiente.**

### 2.3 Defectos repetidos por copy-paste (bugs preexistentes, Grupo A)

| Patrón | Dónde | Efecto |
|---|---|---|
| `objRecord.delete(...)` — el objeto Record **no tiene** método `delete` | TRS-A3, CRT-A2 | Al borrar NC de compra/Resguardos/Retenciones, los registros asociados **quedan huérfanos en silencio** (TypeError absorbido por catch) |
| `executionContext` comparado en **minúsculas** contra un enum en mayúsculas | TRS-A4, CRT-A1 | Bloques/validaciones **muertos**: el beforeLoad de TRS y la validación ERR002 de Resguardos probablemente nunca corren |
| Bloque "monto en letras" duplicado con bugs propios | TRS-A5/A6, CRT-A6/A8 | `alert()` server-side, decimales mal normalizados ("CON 5/100" en vez de "50/100"), "MIL" espurio en montos ≥1M — **texto fiscal impreso** |
| `getRange({end:1000})` sin paginación | TRS-A7 🔧, CRT-A7, CDF-A4, ARI-B3 | Truncamiento silencioso sobre 1000 filas. Ya corregido en TRS |
| Errores absorbidos por catch que solo loguea | CDF-A1/A2/A3, CRT-A3/A10 | Funcionalidad que **parece andar y no anda**: detalle de métodos de pago del CFE siempre vacío, emails de CAE que nunca salen, Resguardo automático que no se genera en OneWorld |

### 2.4 Saved Searches sobredimensionadas con acceso posicional (prioridad v2 del cliente)

`Conexion Directa FE` consume una SS de **≥89 columnas por índice** (`columns[88]`, CDF-B1); `Calcular Retenciones` una de **≥28** (CRT-B1); TRS usa 3 SS posicionales (TRS-B6); ARI y SUI también (ARI-B4, SUI-B1). Reordenar una columna en la cuenta rompe el cálculo **sin error de compilación**. Candidatas a SuiteQL con `SELECT` específico — es el criterio v2(b)/(c) del pedido original, y requiere aprobación por ser reemplazo de mecanismo.

🔄 **Pedido concreto:** son **5 migraciones con el mismo motivo** (TRS-B6, CRT-B1, ARI-B4, CDF-B1, SUI-B1). Proponemos **un único criterio de aprobación para las cinco**, no cinco pedidos sueltos. Concentran buena parte de la ganancia de governance que queda sin capturar.

## 3. Hallazgos accionables HOY (sin esperar el refactor)

1. **Causa raíz probable de UAT-12** (ND e-Ticket no se puede guardar): deadlock de diseño — la validación client-side "5000 UI" exige un campo **antes** del primer guardado, pero su único escritor corre **después** (`afterSubmit`). Con el campo vacío, `subtotal / '' = Infinity` bloquea **cualquier** e-Ticket. Análisis completo con opciones en [SUI-A2](refactors/6-setear-unidad-indexada.md#sui-a2--el-deadlock-que-explica-uat-12-hallazgo-de-alto-valor-para-tekiio). **Sigue sin respuesta** — es el pedido #5 de §4.
2. **Error 100000 (CAE):** el XML y el JSON del comprobante **ya quedan persistidos en la transacción al guardar** — se puede abrir el XML de la transacción 15280 y verificar qué `tipoCFE` contiene contra el catálogo DGI, sin generar ningún CAE. Mapeo completo del flujo del tipo de CFE en el [anexo del informe CDF](refactors/5-conexion-directa-fe-ss-anexo-tipo-cfe.md). Consecuencia adicional: **la caracterización de Conexion Directa FE no está bloqueada** por el 100000 (el output comparable se genera al guardar).
3. **Corrección de atribución de un hallazgo previo:** el bug de APIs SuiteScript 1.0 en `getMetodosPago` documentado en la priorización pertenece a `Obtener Inf Transacciones FE.js`. En `Conexion Directa FE (SS)` las mismas funciones ya están migradas a 2.x, pero con **`formaPagoNetSuite` sin declarar** (CDF-A1) — mismo síntoma (detalle de pago vacío en el CFE), causa distinta. Ambos scripts necesitan la corrección, juntos.

## 4. Decisiones y entregas que necesitamos de Tekiio

🔄 Ordenado por lo que hoy **bloquea trabajo ya aprobado**, no por antigüedad.

| # | Pedido | Bloquea |
|:--:|---|---|
| 1 | 🔴 **Dueño único de las columnas de tax codes por línea** ([TRS-D1](propuestas/TRS-D1-dueno-unico-tax-codes.md), recomendación: opción B) | **TRS-A1, que ya está aprobado y no podemos aplicar.** Lo más urgente |
| 2 | **Orden de ejecución de UEs** sobre transacciones (Scripted Records) | Familia de propuestas de entry point (2.1/2.2) y la validación de TRS-D1 |
| 3 | Decisión sobre **UAT-12 / validación 5000 UI** (opciones en SUI-A2) | Caso ND e-Ticket completo |
| 4 | **Un criterio único para las 5 migraciones SS → SuiteQL** (2.4) | TRS-B6, CRT-B1, ARI-B4, CDF-B1, SUI-B1 |
| 5 | **Validación fiscal:** ¿existen en UY impuestos compuestos por línea? (STC-A3) · ¿qué debe viajar en `detalleMetodosPago` del CFE? (CDF-A1) | STC-A3 y CDF-A1 |
| 6 | **Dato menor, pendiente desde el 07/09:** los 2 códigos a usar en `URU-FE Estados Log` / `URU-FE Mensajes Log` para el marcado de fallo de STC-A2 | Cierre fino de STC-A2 (ya aplicado y funcionando) |
| 7 | **Inventario de deployments** de los 5 scripts restantes (tipos de registro, status, audiencia, context filtering) — como se hizo con Seteo de Tax Codes. Incluye los logs/context filtering del deployment de `Conexion Directa FE` (CDF-A7) | Alcance de caracterización de cada `_REF` · lectura del 21.6s del Remito |
| 8 | **Archivo faltante:** `L598 - Calcular Retenciones (LIBS)V2.js` (referenciado por el botón manual de retenciones) + mapeo Script record de cuenta ↔ archivo (¿qué es "Calcular Ret. Lineas (SS)"?) | Análisis del flujo manual de retenciones |
| 9 | Revisar el **XML persistido de la transacción 15280** (tipoCFE vs catálogo DGI) | Diagnóstico del error 100000 |
| 10 | Confirmaciones funcionales menores: costos de envío/manipulación en CFE (CDF-A5), expectativa de la validación ERR002 (CRT-A1), defaults del flujo automático de resguardos (CRT-A4), guard de no-sobrescritura de rubros (ARI-A3) | Clasificación definitiva de esos hallazgos |
| 11 | Los ya registrados en [flujos §7](flujos-prueba-y-plan-ejecucion.md#7-dependencias-y-decisiones-abiertas-para-tekiio): rol para disparar originales, transacciones con bordes, deps ausentes | Caracterización completa |
| 12 | 🔄 **Definiciones de la cuenta que destraban 6 cambios ya analizados:** tipos de los 7 campos que lee el `beforeLoad` de `Conexion Directa FE` (`custbody_l598_cae`, `_trans_interna`, `_documento_xml_fe`, `_sucursal`, `_tipo_comprobante`, `_serie_comprobante`, `shipstatus`) · columnas de las 2 SS de mapeo de `Asignar Rubro IVA` · columnas de las 2 SS de config de `Setear Unidad Indexada` · cuántos registros activos puede tener `datos_impositivos_emp` por subsidiaria | CDF-B2 · ARI-B5/D7 · SUI-D6 · CRT-B5 |

## 5. Próximo paso propuesto

🔄 El refactor B/C/D de los 6 scripts está escrito. Lo que falta no es código: es **caracterizar** y **decidir**.

1. **Desbloquear TRS-D1** (pedido #1). Es una decisión de una sola pregunta y libera un cambio ya aprobado.
2. **Caracterización byte a byte de los 6 `_REF`**, empezando por los casos UAT que ya funcionan (Compras 04 y 07). Bloqueada por el inventario de deployments (pedido #7): sin él no sabemos qué tipos de registro cubrir ni qué `Audience` darle a cada deployment `Testing`.
3. **Revisión conjunta de los 42 hallazgos del Grupo A**, ahora que están registrados uno por uno con su motivo de bloqueo. Varios tienen impacto fiscal directo y son preexistentes al refactor.
4. **Un criterio para las 5 migraciones SS → SuiteQL** (pedido #4). Es donde queda la ganancia de governance grande que el refactor B/C/D **no** capturó: lo aplicado ahorra búsquedas repetidas y limpia, pero el costo dominante sigue en los `load()+save()` (Grupo A) y en las Saved Searches posicionales (🔴).
