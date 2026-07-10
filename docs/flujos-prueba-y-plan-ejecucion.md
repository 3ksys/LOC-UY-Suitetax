# Flujos de Prueba y Plan de Ejecución — LOC URU SuiteTax

**Fecha:** 2026-07-09 · **Equipo:** Mobeats · **Cliente:** Tekiio

Relevamiento de la demo funcional de Tekiio para determinar los **flujos reales de prueba**, los **scripts involucrados** (con su costo real de ejecución) y el **plan de ejecución** del refactor.

---

## 1. Fuentes relevadas

| Fuente | Contenido |
|---|---|
| `Casos de Uso UAT — Ventas` (Tekiio) | 14 casos UAT: 5 OK, 9 Observados |
| `Casos de Uso UAT — Compras` (Tekiio) | 12 casos UAT: 10 OK, 2 Observados |
| `Mobeats Análisis / {Venta,Compra}` | Informes de rendimiento + `DesgloseScripts-*.csv` = **baseline real de tiempos por script y por operación** |

---

## 2. Flujos reales de prueba

### 2.1 Venta — Cuentas por cobrar (rol `URU - Contador`)

| # UAT | Caso de prueba | Estado |
|---|---|---|
| 01 | Crear Artículo (campos localización) | ✅ OK |
| 02 | Crear Cliente (campos localización) | ✅ OK |
| 03-05 | Orden de venta: e-Factura / e-Ticket / Exportación | ✅ OK |
| 06-07 | Ejecución de artículo (Remito): e-Factura/e-Ticket / Exportación | ⚠️ Observado (CAE) |
| 08-09 | Factura de venta: e-Factura/e-Ticket / Exportación | ⚠️ Observado (CAE) |
| 10-11 | Nota de crédito: e-Factura/e-Ticket / Exportación | ⚠️ Observado (CAE) |
| 12-13 | Nota de débito: e-Factura/e-Ticket / Exportación | ⚠️ Observado (CAE / error al guardar) |
| 14 | Pago de cliente (cobranza) | ⚠️ Observado (botón CAE) |

**Cadena:** Artículo → Cliente → Orden de venta → Remito → Factura → NC/ND → Cobranza (todo con generación de CAE ante DGI).

### 2.2 Compra — Cuentas por pagar (rol `URU - Contador`)

| # UAT | Caso de prueba | Estado |
|---|---|---|
| 01-02 | Crear Artículo / Proveedor | ✅ OK |
| 03 | Orden de compra | ✅ OK |
| 04 | Factura de compra + retención | ✅ OK |
| 05 | Resguardo + generar CAE | ⚠️ Observado (CAE) |
| 06 | Pago a proveedor | ✅ OK |
| 07 | NC de compra + retención + resguardo | ✅ OK |
| 08 | Anular resguardo | ⚠️ Observado (CAE) |
| 09-10 | Anular retención / Anular pago | ✅ OK |
| 11 | Balance tributario 4 columnas (reporte) | ✅ OK |
| 12 | Reporte BETA 2181 (email con TXT) | ✅ OK |

**Cadena:** Artículo → Proveedor → Orden de compra → Factura + retención → Resguardo → Pago → NC → Anulaciones → Reportes (Balance, **BETA 2181** — el TXT del piloto).

---

## 3. Mapeo operación → scripts → **tiempo real** (baseline medido)

Sólo scripts **custom** (se omite "Sistema NetSuite"). El tiempo es la suma por operación; `xN` = veces que se ejecuta el script en un guardado.

### Venta

| Operación (Guardar) | Scripts custom dominantes (tiempo real) |
|---|---|
| **Ejecución Artículo/Remito** (55.8s) | `Conexion Directa FE (SS)` **21.6s ×2** · `Transacción (Servidor)` **9.6s ×3** · `Setear Unidad Indexada` 0.7s |
| **Factura de Venta** (44.8s) | `Conexion Directa FE (SS)` **11.6s ×2** · `Seteo de Tax Codes` **11.1s ×2** · `Transacción (Servidor)` **4.1s ×3** · `Asignar Rubro IVA` 2.7s |
| **Nota de Crédito** (41.3s) | `Conexion Directa FE (SS)` **12.0s ×2** · `Seteo de Tax Codes` **6.7s ×2** · `Transacción (Servidor)` **6.6s ×3** · `Asignar Rubro IVA` 2.7s |
| **Orden de Venta** (32.8s) | `Seteo de Tax Codes` **13.9s ×2** · `Transacción (Servidor)` 1.5s ×3 · `Setear Unidad Indexada` 0.8s |
| **Pago de Venta** (7.0s) | (sólo NetSuite base — sin scripts custom relevantes) |

### Compra

| Operación (Guardar) | Scripts custom dominantes (tiempo real) |
|---|---|
| **Factura de Compra** (49.8s) | `Seteo de Tax Codes` **12.5s ×2** · `Calcular Retenciones (SS)` **5.4s ×3** · `Transacción (Servidor)` **4.8s ×3** · `Asignar Rubro IVA` 2.9s |
| **Orden de Compra** (29.4s) | `Seteo de Tax Codes` **9.9s ×2** · `URU - Heredar Campos` 1.3s |
| **Resguardo (URU)** (6.4s) | `Conexion Directa FE (SS)` 1.8s ×2 · `Calcular Retenciones (SS)` 0.8s ×3 · `Setear Unidad Indexada` 0.2s |
| **Pago de Factura** | _(CSV sin tiempos — datos a re-capturar)_ |

---

## 4. Scripts que dominan el costo real (ranking por impacto medido)

Este ranking manda sobre la priorización teórica: es lo que **realmente** consume tiempo en los flujos de negocio.

| Script | Aparece en | Pico | Veces | 💰 | En repo (75) |
|---|---|--:|:--:|:--:|:--:|
| **`L598 - Seteo de Tax Codes`** | Factura/Orden/NC Venta, Factura/Orden Compra | **13.9s** | ×2 | 💰 | ✅ |
| **`L598 - Conexion Directa FE (SS)`** | Remito, Factura, NC Venta, Resguardo | **21.6s** | ×2 | 💰 | ✅ (4362 LOC) |
| **`L598 -Transacción (Servidor)`** | casi todas las transacciones | 9.6s | **×3** | 💰 | ✅ (2129 LOC) |
| **`L598 - Calcular Retenciones (SS)`** | Factura Compra, Resguardo | 5.4s | ×3 | 💰 | ✅ |
| **`L598 - Asignar Rubro IVA`** | Factura/NC Venta, Factura Compra | 2.9s | ×1 | 💰 | ✅ |
| **`L598 - Setear Unidad Indexada`** | Orden/Factura Venta, Resguardo | 0.8s | ×1 | | ✅ |

> **Insight:** el mayor ROI de performance NO está en el script más grande, sino en **`Seteo de Tax Codes`** (se ejecuta ×2 y domina el tiempo en 5 de 7 operaciones) y en reducir las **ejecuciones repetidas** de `Transacción (Servidor)` (×3) y `Conexion Directa FE` (×2).

---

## 5. Hallazgos críticos

1. **🔴 Error `100000` — CAE no se genera (bloqueante ambiental).** 9 de 14 casos de Venta y 2 de Compra quedaron **Observados** por "no genera CAE por error de conexión". Esto **no es un defecto de los scripts** — es la conexión al middleware de FE/DGI en la cuenta de dev. **Acción:** escalar a Tekiio; sin esto no se pueden probar/caracterizar los flujos con CAE. El refactor y la caracterización del resto (guardado, cálculos, TXT) **sí** pueden avanzar.

2. **Ejecuciones repetidas por guardado.** `Transacción (Servidor)` corre **×3**, `Conexion Directa FE` y `Seteo de Tax Codes` **×2**. Entender por qué (¿beforeSubmit + afterSubmit? ¿re-triggers?) puede rendir tanto como optimizar el script en sí — pero un cambio de entry point es **criterio #8 (aprobación previa)**.

3. **Scripts fuera del repo corriendo en los flujos.** Aparecen `URU-Blanquear Campos FE`, `URU-Conf. Tasas IVA`, `PAN - Obligatoriedad...`, `FTE UE Transaction`, etc. — no están en los 75 del repo. **Acción:** confirmar con Tekiio si son alcance del refactor o de otro bundle/SuiteApp.

4. **`Pago de Factura` (Compra)** — el CSV de desglose vino sin tiempos (sólo timestamps). Re-capturar ese caso.

---

## 6. Plan de ejecución

### Fase A — Habilitar la medición (bloqueantes)
- **A1.** Escalar a Tekiio el **error 100000 (conexión FE/CAE)** en la cuenta de dev.
- **A2.** Conseguir las **dependencias ausentes** (`3K/utilities`, `L598/crear_resguardo`, `L595/utilidades`) — bloquean 14 scripts (Resguardos/Pagos).
- **A3.** Confirmar con Tekiio el **alcance** de los scripts fuera del repo (`URU-*`, `PAN-*`, `FTE`).
- **A4.** Baseline de tiempos: **ya capturado** en `Mobeats Análisis` (DesgloseScripts). Re-capturar `Pago de Factura`.

### Fase B — Refactor por impacto real (orden sugerido)
Cada script sigue el flujo del piloto: análisis verificado → Plan de Cambios (matriz de riesgo) → `_REF` → caracterización con los flujos UAT → medición vs baseline.

| Orden | Script | Por qué primero | Riesgo |
|:--:|---|---|:--:|
| 1 | **`Seteo de Tax Codes`** | Domina el tiempo (×2, 11–14s) en 5/7 operaciones | 🔴 Alto (fiscal) |
| 2 | **`Transacción (Servidor)`** | Corre ×3 en toda transacción; revisar repeticiones (#8) | 🔴 Alto (fiscal) |
| 3 | **`Calcular Retenciones (SS)`** | ×3 en Compra; núcleo de retenciones | 🔴 Alto (fiscal) |
| 4 | **`Asignar Rubro IVA`** | Presente en casi toda transacción | 🔴 Alto (fiscal) |
| 5 | **`Conexion Directa FE (SS)`** | El más pesado y grande (4362 LOC), pero atado al CAE (bloqueado por A1) | 🔴 Alto (fiscal + FE) |

> Todos tocan impuestos → **caracterización byte-a-byte estricta** + los cambios de comportamiento van al **registro de aprobaciones**. Los quick wins no-fiscales de la [priorización calibrada](priorizacion-scripts.md) (ola 1) sirven para **aceitar el proceso** en paralelo, con menor riesgo.

### Fase C — Caracterización y medición (con los flujos UAT)
- Por cada script refactorizado: ejecutar las **operaciones del flujo UAT** donde aparece (Guardar Orden/Factura/etc.) con el rol de pruebas, y comparar **tiempo/GU y output** contra el baseline de `Mobeats Análisis`.
- Los casos UAT de Tekiio son los **escenarios de prueba oficiales** → se usan como casos de caracterización.

### Fase D — Validación conjunta Mobeats/Tekiio
- Revisión de resultados por flujo; aprobación de los cambios de Alto riesgo antes de aplicarlos.

---

## 7. Dependencias y decisiones abiertas (para Tekiio)
- [ ] Resolver error 100000 (conexión FE/CAE) en dev.
- [ ] Proveer fuentes de deps ausentes (3K/utilities, crear_resguardo, L595).
- [ ] Confirmar alcance de scripts fuera del repo (URU-*, PAN-*, FTE).
- [ ] Confirmar baseline de performance oficial (¿el de `Mobeats Análisis` es el de referencia?).
- [ ] Aprobar el orden de refactor por impacto real (Fase B).
