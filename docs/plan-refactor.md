# Plan de Refactor — LOC URU SuiteTax

**Cliente:** Tekiio · **Equipo:** Mobeats · **Última actualización:** 2026-07-07

---

## 1. Objetivo

Reducir el tiempo de análisis y mejora del código existente de la Localización Uruguay (SuiteTax) usando IA, **manteniendo al 100% la lógica funcional original** y mejorando la calidad técnica (governance, performance, estándares y mantenibilidad).

## 2. Alcance

| ✅ Dentro | ❌ Fuera |
|---|---|
| Optimización de performance y Governance Units (GU) | Cambios de lógica funcional/tributaria |
| Estándares SuiteScript 2.1 | Rediseño de la arquitectura de la localización |
| Legibilidad y mantenibilidad | Cambios que no puedan validarse en QA |
| Detección de código duplicado | Corrección de bugs sin aprobación (van separados) |
| Refactor de funciones complejas | |
| Documentación comparativa | |

## 3. El terreno (escala real)

- **73 scripts SuiteScript**, ~39.845 líneas. Plataforma NetSuite 2.0/2.1, AMD, SuiteTax Engine.
- **NO es 100% SuiteTax**: convive con Legacy (prefijo `3K-`) y migrados con workaround (`custcol_l598_codigo_impuesto`).
- **Sin test runner**: la garantía de "no romper" se apoya en **caracterización** (golden master), no en tests.
- Scripts monstruo: `Conexion Directa FE (SS)` 4.362 · `Obtener Inf Transacciones FE` 2.548 · `Calcular Retenciones SS/SL` ~2.400 · `Transacción (Servidor)` 2.128.
- Dependencias ausentes en el repo: `3K/utilities`, `L598/crear_resguardo`, `L595/utilidades`.

## 4. Restricciones del entorno

- **Cuenta única de desarrollo** (`3KSYS-DEV ACCT SDN` — LOC URU / LOC PAN, SuiteTax). Es producción de desarrollo.
- **No se sobreescriben scripts originales.** Se crean versiones nuevas con sufijo `_REF`.
- **Roles:** `URU-Contador` (ejecuta originales → baseline) vs `URU-Contador (Mobeats)` (ejecuta refactorizados).
- **Aislamiento:** deployments nuevos, separados de los activos.

## 5. Tensiones críticas y cómo las resolvemos

| Tensión | Resolución |
|---|---|
| "100% lógica" + **sin tests** | **Caracterización byte-a-byte**: capturar output del original y comparar contra el refactor. |
| Aislar un UserEvent no se logra solo con el rol (se dispara por evento) | Deployment con **`Status = Testing` + Audience** = solo corre para el rol/empleado de pruebas. |
| "No rediseño" vs scripts de miles de líneas | Extraer funciones, dedup y cachear **es** refactor. Partir módulos o cambiar flujo **es** rediseño → se acuerda por escrito. |
| Medir GU/tiempo sin datos representativos | Exigir a Tekiio el **baseline de performance** y volumen. |
| Duplicación vs aislamiento | Módulos compartidos nuevos se versionan (`_REF`) para no contaminar los originales. |

## 6. Fases

```
F0 Setup & Bloqueantes → F1 Análisis & Priorización → F2 PILOTO → F3 Escalado iterativo
                                                          (transversal: caracterización)
```

| Fase | Descripción | Estado |
|---|---|---|
| **F0** | Acceso a cuenta, baseline, deps faltantes, versiones activas, convención de naming | 🟡 En curso |
| **F1** | Matriz impacto × esfuerzo × riesgo de los 73 scripts | 🟡 Parcial (priorización preliminar en §7) |
| **F2** | Piloto end-to-end (Generación TXT DGI) | 🟢 Refactor + informe listos; falta ejecución en cuenta |
| **F3** | Refactor script por script | ⬜ No iniciado |

### Detalle F0 (bloqueantes)

- [x] Acceso a la cuenta dev — **OK**
- [ ] **Baseline de performance de Tekiio** (tiempos y métricas usadas en sus pruebas) — **PENDIENTE**
- [ ] Resolver dependencias faltantes (`3K/utilities`, `L598/crear_resguardo`, `L595/utilidades`)
- [ ] Confirmar qué versiones `V2` están activas en producción
- [x] Convención de naming (`_REF`) — **definida**
- [ ] Acordar por escrito la línea "refactor vs rediseño"

## 7. Priorización preliminar (F1)

| Prioridad | Scripts | Por qué | Riesgo |
|---|---|---|---|
| 🥇 Alto impacto GU | `Generación CAE Automatico (MR)`, `Pendiente Generar Retencion (MR)V2`, `Obtener Inf Transacciones FE` (Restlet) | MR/Restlet = ejecución masiva y repetida | Alto (fiscal) |
| 🥈 Alta frecuencia | `Transacción (Servidor)` (UE en toda transacción), `Asignar Rubro IVA`, `Seteo de Tax Codes` | Impacto acumulado por corrida constante | Alto (fiscal) |
| 🥉 Quick wins / piloto | `Generación TXT (Sched)` ✔, `BCU (Sched)`, validaciones de unicidad | Bajo riesgo, medición limpia | Bajo/Medio |
| ⚠️ Bloqueados | Todo lo que depende de deps ausentes | No medible sin las fuentes | — |

## 8. Estado actual y próximos pasos

**Hoy tenemos:** cuenta dev habilitada, refactor del piloto escrito y syntax-verificado, informe del piloto y este plan.

**Desbloqueado con la cuenta (no requiere baseline de Tekiio):**
1. Deploy aislado del `_REF` (Status=Testing) del piloto.
2. Ejecutar original vs `_REF` con el mismo período → **caracterización byte-a-byte** (`cmp`).
3. Medir GU/tiempo propios de ambas versiones.

**Requiere el baseline de Tekiio (pendiente):**
- Elegir períodos/volúmenes representativos.
- Comparar contra la medición de referencia del cliente.

**Decisión abierta con Tekiio:** corrección de bugs del Grupo A (A1/A2/A3) en cambio separado.

## 9. Descubrimientos clave

- **Gotcha fiscal:** una API de impuestos equivocada NO rompe en compile-time; rompe en runtime cuando la DGI rechaza el CFE. → máxima cautela en scripts fiscales.
- **`searchSavedPro` sí pagina** correctamente (do/while de a 1000); `searchRubroPublicidad` NO la usa y trunca a 1000 (bug A1).
- **No toda "doble ejecución" es consolidable:** la search `2181` corre en dos niveles de agregación distintos (detalle vs SUM/GROUP); unificarla requiere SuiteQL.
- **Refactor ≠ bugfix:** ver [metodología](metodologia-refactor.md).
