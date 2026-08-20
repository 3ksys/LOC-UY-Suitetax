# Resumen ejecutivo — Análisis de los 6 scripts críticos

**Fecha:** 2026-07-30 · **Equipo:** Mobeats · **Para:** Tekiio

Análisis pre-refactor de los 6 scripts que dominan el costo real de los flujos de negocio ([ranking medido](flujos-prueba-y-plan-ejecucion.md#4-scripts-que-dominan-el-costo-real-ranking-por-impacto-medido)). Cada script tiene su informe completo con hallazgos verificados línea por línea, plan de cambios propuesto y casos de caracterización. Este documento consolida el estado, los **patrones sistémicos** que se repiten entre scripts y las **decisiones que necesitamos de Tekiio**.

**Metodología:** cada hallazgo se clasifica en Grupo A (correctitud — NO entra al refactor, va a aprobación), B (governance/performance), C (estándares 2.1) o D (mantenibilidad), con riesgo 🟢/🟡/🔴 según la [metodología acordada](metodologia-refactor.md). El refactor B/C/D **no cambia comportamiento** y se valida con caracterización byte-a-byte.

---

## 1. Estado por script

| # | Script | LOC | Baseline medido | Hallazgos A/B/C/D | Estado | Informe |
|:--:|---|--:|---|:--:|---|---|
| 1 | `Seteo de Tax Codes` | 167 | 11.1–13.9s ×2 | 3 A pendientes | ✅ `_REF` aplicado (B+C+D) · smoke test OK 2026-07-30 | [informe](refactors/1-seteo-de-tax-codes.md) · [caracterización](caracterizacion/1-seteo-de-tax-codes.md) |
| 2 | `Transacción (Servidor)` | 2128 | 4.1–9.6s ×3 | 8 / 6 / 4 / 7 | 📋 Análisis listo | [informe](refactors/2-transaccion-servidor.md) |
| 3 | `Calcular Retenciones (SS)V2` | 2431 | 5.4s ×3 | 13 / 5 / 5 / 9 | 📋 Análisis listo | [informe](refactors/3-calcular-retenciones-ss.md) |
| 4 | `Asignar Rubro IVA` | 473 | 2.9s ×1 | 6 / 5 / 3 / 7 | 📋 Análisis listo | [informe](refactors/4-asignar-rubro-iva.md) |
| 5 | `Conexion Directa FE (SS)` | 4362 | **21.6s ×2** (pico) | 8 / 7 / 5 / 7 | 📋 Análisis listo | [informe](refactors/5-conexion-directa-fe-ss.md) |
| 6 | `Setear Unidad Indexada` | 156 | 0.8s ×1 | 4 / 3 / 4 / 6 | 📋 Análisis listo | [informe](refactors/6-setear-unidad-indexada.md) |

El `×N` es la cantidad de entry points declarados, no re-ejecuciones ([verificado](flujos-prueba-y-plan-ejecucion.md#5-hallazgos-críticos)).

## 2. Patrones sistémicos (se repiten entre scripts)

Estos patrones importan más que cualquier hallazgo individual: se corrigen una vez y aplican a toda la ola.

### 2.1 El costo dominante es estructural: `afterSubmit` + `record.load()` + `save()`

**5 de los 6 scripts** re-cargan y re-guardan la transacción completa después de que NetSuite ya la guardó: STC (propuesta STC-A1), TRS-A1, ARI-A1, CRT-A13, CDF-B5 (doble load+save en modo automático). Cada `save()` extra re-dispara además los UserEvents de los demás scripts. Caso extremo: `Transacción (Servidor)` ejecuta load+save **aun para `salesorder`/`transferorder`, a los que toda su lógica saltea** (TRS-A2) — un guardado vacío por cada orden.

**Propuesta:** tratar la familia de cambios de entry point (STC-A1 + TRS-A1 + ARI-A1 + CRT-A13) como **una sola decisión arquitectónica**, no cuatro aprobaciones aisladas — hay dependencias de datos entre ellos (ver 2.2).

### 2.2 Lógica duplicada entre scripts, con dependencia de orden

- `Transacción (Servidor)` **duplica casi literalmente** el seteo de tax codes de `Seteo de Tax Codes` (TRS-D1) → en los tipos compartidos, el mismo trabajo se hace dos veces por guardado, cada una con su load+save.
- El toggle de la sublista `apply` de NC existe **tres veces** (STC, TRS, ARI-D3), con coberturas distintas.
- `Asignar Rubro IVA` y `Conexion Directa FE` **leen** los `custcol` que `Seteo de Tax Codes` escribe en su propio `afterSubmit` → hay acoplamiento por orden de ejecución de UEs que no es visible en el repo.

**Necesitamos de Tekiio:** el orden real de ejecución (Scripted Records) y una decisión de **dueño único** del seteo de tax codes.

### 2.3 Defectos repetidos por copy-paste (bugs preexistentes, Grupo A)

| Patrón | Dónde | Efecto |
|---|---|---|
| `objRecord.delete(...)` — el objeto Record **no tiene** método `delete` | TRS-A3, CRT-A2 | Al borrar NC de compra/Resguardos/Retenciones, los registros asociados **quedan huérfanos en silencio** (TypeError absorbido por catch) |
| `executionContext` comparado en **minúsculas** contra un enum en mayúsculas | TRS-A4, CRT-A1 | Bloques/validaciones **muertos**: el beforeLoad de TRS y la validación ERR002 de Resguardos probablemente nunca corren |
| Bloque "monto en letras" duplicado con bugs propios | TRS-A5/A6, CRT-A6/A8 | `alert()` server-side, decimales mal normalizados ("CON 5/100" en vez de "50/100"), "MIL" espurio en montos ≥1M — **texto fiscal impreso** |
| `getRange({end:1000})` sin paginación | TRS-A7, CRT-A7, CDF-A4, ARI-B3 | Truncamiento silencioso sobre 1000 filas |
| Errores absorbidos por catch que solo loguea | CDF-A1/A2/A3, CRT-A3/A10 | Funcionalidad que **parece andar y no anda**: detalle de métodos de pago del CFE siempre vacío, emails de CAE que nunca salen, Resguardo automático que no se genera en OneWorld |

### 2.4 Saved Searches sobredimensionadas con acceso posicional (prioridad v2 del cliente)

`Conexion Directa FE` consume una SS de **≥89 columnas por índice** (`columns[88]`, CDF-B1); `Calcular Retenciones` una de **≥28** (CRT-B1); TRS usa 3 SS posicionales (TRS-B6); ARI y SUI también (ARI-D7, SUI-D6/B1). Reordenar una columna en la cuenta rompe el cálculo **sin error de compilación**. Candidatas a SuiteQL con `SELECT` específico — es el criterio v2(b)/(c) del pedido original, y requiere aprobación por ser reemplazo de mecanismo.

## 3. Hallazgos accionables HOY (sin esperar el refactor)

1. **Causa raíz probable de UAT-12** (ND e-Ticket no se puede guardar): deadlock de diseño — la validación client-side "5000 UI" exige un campo **antes** del primer guardado, pero su único escritor corre **después** (`afterSubmit`). Con el campo vacío, `subtotal / '' = Infinity` bloquea **cualquier** e-Ticket. Análisis completo con opciones en [SUI-A2](refactors/6-setear-unidad-indexada.md#4-recomendaciones-grupo-a--relación-con-uat-12).
2. **Error 100000 (CAE):** el XML y el JSON del comprobante **ya quedan persistidos en la transacción al guardar** — se puede abrir el XML de la transacción 15280 y verificar qué `tipoCFE` contiene contra el catálogo DGI, sin generar ningún CAE. Mapeo completo del flujo del tipo de CFE en el [anexo del informe CDF](refactors/5-conexion-directa-fe-ss.md#anexo-flujo-del-tipo-de-cfe-evidencia-para-error-100000). Consecuencia adicional: **la caracterización de Conexion Directa FE no está bloqueada** por el 100000 (el output comparable se genera al guardar).
3. **Corrección de atribución de un hallazgo previo:** el bug de APIs SuiteScript 1.0 en `getMetodosPago` documentado en la priorización pertenece a `Obtener Inf Transacciones FE.js`. En `Conexion Directa FE (SS)` las mismas funciones ya están migradas a 2.x, pero con **`formaPagoNetSuite` sin declarar** (CDF-A1) — mismo síntoma (detalle de pago vacío en el CFE), causa distinta. Ambos scripts necesitan la corrección, juntos.

## 4. Decisiones y entregas que necesitamos de Tekiio

| # | Pedido | Bloquea |
|:--:|---|---|
| 1 | **Archivo faltante:** `L598 - Calcular Retenciones (LIBS)V2.js` (referenciado por el botón manual de retenciones) + mapeo Script record de cuenta ↔ archivo (¿qué es "Calcular Ret. Lineas (SS)"?) | Análisis del flujo manual de retenciones |
| 2 | **Inventario de deployments** de los 5 scripts analizados (tipos de registro, status, audiencia, context filtering) — como se hizo con Seteo de Tax Codes | Alcance de caracterización de cada `_REF` |
| 3 | **Orden de ejecución de UEs** sobre transacciones (Scripted Records) | Familia de propuestas de entry point (2.1/2.2) |
| 4 | Revisar el **XML persistido de la transacción 15280** (tipoCFE vs catálogo DGI) | Diagnóstico del error 100000 |
| 5 | Decisión sobre **UAT-12 / validación 5000 UI** (opciones en SUI-A2) | Caso ND e-Ticket completo |
| 6 | Confirmaciones funcionales menores: costos de envío/manipulación en CFE (CDF-A5), expectativa de la validación ERR002 (CRT-A1), defaults del flujo automático de resguardos (CRT-A4), guard de no-sobrescritura de rubros (ARI-A3) | Clasificación definitiva de esos hallazgos |
| 7 | Los ya registrados en [flujos §7](flujos-prueba-y-plan-ejecucion.md#7-dependencias-y-decisiones-abiertas-para-tekiio): rol para disparar originales, transacciones con bordes, deps ausentes | Caracterización completa |

## 5. Próximo paso propuesto

1. Revisión conjunta de estos informes (los Grupo A son ~39 hallazgos de correctitud preexistentes, varios con impacto fiscal directo).
2. Acuerdo de alcance B/C/D por script → arrancamos los `_REF` en el orden de la [Fase B](flujos-prueba-y-plan-ejecucion.md#fase-b--refactor-por-impacto-real-orden-sugerido) (2 → 3 → 4 → 5; el 6 como quick win en paralelo).
3. Decisión sobre la familia de propuestas de entry point — ahí está el salto grande de performance que el baseline midió.
