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

> **Insight:** el mayor ROI de performance NO está en el script más grande, sino en **`Seteo de Tax Codes`**, que domina el tiempo en 5 de 7 operaciones.
>
> ⚠️ **Corrección:** el `×N` de esta tabla es la **cantidad de entry points declarados**, no ejecuciones repetidas del mismo trabajo (ver [Hallazgo 2](#5-hallazgos-críticos)). No hay trabajo duplicado que eliminar: el ROI está en el costo interno de cada script, no en su multiplicador.

---

## 5. Hallazgos críticos

1. **🔴 Error `100000` — CAE no se genera (bloqueante).** 9 de 14 casos de Venta y 2 de Compra quedaron **Observados**.

   ⚠️ **Corregido — no es un error de conexión.** El mensaje literal de la demo es: *"ocurrió un error al solicitar firmar comprobante… **TL tipo de CFE no es válido, posible error de sintaxis**, código de error: 100000"*. La solicitud **llegó** al servicio de firma y fue **rechazada por validación del payload**. Ver [evidencia completa](analisis/demo-tekiio-flujos-y-scripts.md#4-evidencia-del-error-100000).

   **La causa sigue indeterminada** entre configuración (mapeo de tipo de documento/serie en dev) y construcción del XML por `Conexion Directa FE (SS)`. La afirmación previa de que "no es un defecto de los scripts" **no estaba probada** y esta evidencia abre esa segunda hipótesis.

   **Acción:** escalar a Tekiio **con el mensaje exacto**, no como "falla de conexión" — o van a revisar conectividad en lugar del tipo de CFE. El refactor y la caracterización del resto (guardado, cálculos, TXT) **sí** pueden avanzar.

2. **✅ RESUELTO — el `×N` es la cantidad de entry points declarados, NO re-triggers.** Verificado sobre el `return` de los tres scripts:

   | Script | Entry points declarados | `×N` del informe |
   |---|---|---|
   | `Seteo de Tax Codes` | `beforeSubmit`, `afterSubmit` | ×2 |
   | `Transacción (Servidor)` | `beforeLoad`, `beforeSubmit`, `afterSubmit` | ×3 |
   | `Conexion Directa FE (SS)` | `beforeLoad`, `afterSubmit` | ×2 |

   Correlación exacta en los tres. **No hay re-ejecución del mismo trabajo ni un bug de re-trigger que perseguir**, y no hay un "×2 de trabajo duplicado" que eliminar.

   **Consecuencia sobre la lectura del tiempo:** el `×N` es un contador de ejecuciones, no un multiplicador del tiempo listado. En `Seteo de Tax Codes` el `beforeSubmit` es un no-op que solo loguea, así que prácticamente **todo** el tiempo está en `afterSubmit` (su `record.load()` + `save()`). Eso refuerza STC-A1, que ataca justamente ese costo sin cambiar la cantidad de entry points.

   ⚠️ Confirmar contra el CSV de `DesgloseScripts` si la columna de tiempo es total por script o promedio por ejecución. La lectura "total" es la consistente: en Factura de Venta, `11.1 + 11.6 + 4.1 + 2.7 = 29.5s` cabe dentro de los 44.8s de la operación, mientras que multiplicar cada uno por su `×N` la excedería.

3. **Scripts fuera del repo corriendo en los flujos.** Aparecen `URU-Blanquear Campos FE`, `URU-Conf. Tasas IVA`, `PAN - Obligatoriedad...`, `FTE UE Transaction`, etc. — no están en los 75 del repo. **Acción:** confirmar con Tekiio si son alcance del refactor o de otro bundle/SuiteApp.

4. **`Pago de Factura` (Compra)** — el CSV de desglose vino sin tiempos (sólo timestamps). Re-capturar ese caso.

---

## 6. Plan de ejecución

### Fase A — Habilitar la medición (bloqueantes)
- **A1.** Escalar a Tekiio el **error 100000** en la cuenta de dev, con el mensaje exacto: *"TL tipo de CFE no es válido, posible error de sintaxis"*. **No** presentarlo como falla de conexión.
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
- [ ] 🔴 **Rol para disparar los originales.** La audiencia de los 9 deployments de `Seteo de Tax Codes` es `Administrador` (+ `URU - Contador` solo en Factura de venta) y Mobeats no tiene ninguno. Sin eso no se puede generar baseline de output sobre transacciones nuevas. Pedido alternativo más rápido que el otorgamiento de rol: **que Tekiio guarde las transacciones de prueba con su rol** y Mobeats solo exporte.
- [ ] Resolver error 100000 en dev — **rechazo de validación del tipo de CFE**, no conectividad.
- [ ] Confirmar si `L598 - Calcular Ret. Lineas (SS)` (mencionado en la demo) es un script del repo con otro nombre o está fuera de él.
- [ ] Confirmar si la cuenta de dev está en modo **automático** de generación de CAE al guardar (afecta re-guardar transacciones para caracterizar).
- [ ] Proveer fuentes de deps ausentes (3K/utilities, crear_resguardo, L595).
- [ ] Confirmar alcance de scripts fuera del repo (URU-*, PAN-*, FTE).
- [ ] Confirmar baseline de performance oficial (¿el de `Mobeats Análisis` es el de referencia?).
- [ ] Aprobar el orden de refactor por impacto real (Fase B).
