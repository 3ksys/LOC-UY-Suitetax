# Informe de Refactor — Seteo de Tax Codes

**Script:** `L598 - Seteo de Tax Codes` · **Versión:** `L598 - Seteo de Tax Codes_REF.js`
**Tipo:** UserEvent (afterSubmit) · **Módulo:** Transacciones · **Toca impuestos:** sí 💰
**Alcance aplicado:** B + C + D (comportamiento preservado). Los cambios de Alto riesgo (A) van por aprobación.

---

## 1. Resumen

| Métrica | Original | Refactor | Δ |
|---|---|---|---|
| Líneas de código | 167 | ~150 | limpieza |
| Complejidad match taxdetails | **O(n×m)** (`filter` en loop) | **O(n)** (`Map` O(1)) | ✔ |
| `N/search` sin usar | importado | eliminado | ✔ |
| `log.debug` de dump | ~9 | 0 (se mantienen los `log.error`) | ✔ |
| 2º loop de solo-logging | sí | eliminado | ✔ |

> **Nota honesta:** este refactor **no** ataca el costo dominante del script (11–14s ×2), que está en el `record.load()`+`save()` de `afterSubmit`. Ese ahorro es **STC-A1** (cambio de entry point, requiere aprobación — ver [propuesta](../propuestas/STC-A1-entrypoint-seteo-tax-codes.md)). Este refactor deja el código más limpio y O(n), pero la mejora de tiempo es **modesta** hasta que se apruebe STC-A1.

## 2. Plan de Cambios

| Criterio | ID | Qué se modifica | Riesgo | Estado |
|---|---|---|:--:|:--:|
| #3 | STC-B1 | `filter` dentro del loop → `Map` indexado por `taxdetailsreference` (primer match gana) | 🟡 Medio | 🔧 Aplicado |
| #3 | STC-B2 | Eliminado el 2º loop de solo-logging + `log.debug` de dump | 🟢 Bajo | 🔧 Aplicado |
| #4 | STC-C1 | Eliminado `N/search` del `define` (no se usaba) | 🟢 Bajo | 🔧 Aplicado |
| #6 | STC-D1 | Eliminado `arrayTaxCodes` (sólo alimentaba un log) | 🟢 Bajo | 🔧 Aplicado |
| #1/#8 | STC-A1 | `afterSubmit`→`beforeSubmit` (elimina load+save) | 🔴 Alto | ⏳ Aprobación |
| #1 | STC-A2 | Manejo de error del `save` | 🔴 Alto | ⏳ Aprobación |
| #1 | STC-A3 | Múltiples `taxdetails` por línea → toma `[0]` | 🔴 Alto | ⏳ Validar fiscal |

Alto riesgo registrado en [registro-aprobaciones.md](../registro-aprobaciones.md).

## 3. Garantía de comportamiento (revisión manual)

- **`Map` ≡ `filter(...)[0]`:** el `Map` se llena en orden de `taxdetails` y sólo guarda el **primer** valor por referencia (`if (!has) set`) → equivale a `filter(...)[0]` (primer match). Se conserva incluso el comportamiento de STC-A3 (si hay >1, se usa el primero).
- **`if (td)` ≡ `!isEmpty(taxCodeItemResult) && length > 0`:** `filter` devuelve `[]` (→ no entra) o `[td,...]` (→ entra con `[0]`); `Map.get` devuelve `undefined` (→ no entra) o `td` (→ entra). Mismo resultado.
- **Intacto:** lógica de grupo (`ingroup`→línea "Group" anterior), descuento (`Discount`→hereda anterior), rama sin-match (`log.error`), `isEmpty` local, `desaplicarYAplicarNC`, `beforeSubmit`, y el patrón `afterSubmit`+`load`+`save`.

✔ **Sintaxis:** `node --check` OK.
⚠️ **Riesgo residual a confirmar en caracterización:** el match cambió de `==` (loose, en el `filter`) a `String(ref)===String(ref)` (clave del `Map`). Equivalente para referencias numéricas/string (el dominio real), pero la **caracterización byte-a-byte lo confirma** de forma definitiva.

## 4. Procedimiento de caracterización (en la cuenta)

1. Deploy aislado del `_REF` (`Status=Testing` + Audience del rol de pruebas).
2. Ejecutar los **casos UAT** donde este script participa: Guardar **Orden/Factura/NC de Venta** y **Orden/Factura de Compra** (rol `URU - Contador`).
3. Comparar, **línea por línea**, `custcol_l598_codigo_impuesto` y `custcol_l598_tasa_impuesto` entre original y `_REF`. Deben ser **idénticos**. Poner foco en: líneas de **grupo**, **descuento**, y transacciones con **múltiples tax codes**.
4. Medir GU/tiempo vs baseline de `Mobeats Análisis` (esperado: leve mejora; el salto grande llega con STC-A1).

## 5. Estado

- [x] Análisis verificado + Plan de Cambios
- [x] Refactor B+C+D + `node --check`
- [x] Revisión manual de comportamiento
- [x] Propuesta STC-A1 (entry point) para aprobación
- [ ] Deploy aislado + caracterización *(cuenta)*
- [ ] Medición GU/tiempo vs baseline *(cuenta)*
- [ ] Aprobación STC-A1/A2/A3 (Tekiio)
