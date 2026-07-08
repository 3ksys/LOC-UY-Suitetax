# Análisis: Refactor y Migración Legacy → SuiteTax

**Proyecto:** LOC-UY-Suitetax (Localización Uruguay para NetSuite)
**Fecha de análisis:** 2026-05-21
**Alcance:** Identificación de scripts según el motor de impuestos que utilizan, patrones de migración aplicados y riesgos pendientes.

---

## Resumen ejecutivo

El proyecto **no es 100% SuiteTax**. Convive con código en tres estados distintos:

1. **SuiteTax nativo** — escrito desde el día uno usando la sublist `taxdetails`.
2. **Legacy puro** — sigue tocando el campo `taxcode` directo en líneas `item`/`expense`. Mayormente bajo el namespace `3K-`.
3. **Migrado de Legacy a SuiteTax** — con líneas Legacy comentadas como vestigio y un **workaround de columna custom** (`custcol_l598_codigo_impuesto`) que evita refactorizar lógica de iteración.

La estrategia de migración elegida fue mixta: reescritura total para scripts críticos de cabecera y puente con columna custom para scripts auxiliares.

---

## 1. Clasificación de scripts por motor

### 1.1 SuiteTax nativo

Usan la sublist `taxdetails` con `taxdetailsreference` como join hacia las líneas `item`/`expense`.

| Script | Evidencia |
|---|---|
| `L598 - Seteo de Tax Codes.js` | `getSublistValue("taxdetails", "taxdetailsreference"/"taxcode"/"taxrate", i)` en líneas 27-41 |
| `L598 -Transacción (Servidor).js` | Función `setearcodigoImpuestosLineas`, líneas 1932-1951, mismo patrón `taxdetails` |

**Snippet representativo** (`L598 - Seteo de Tax Codes.js:27-41`):

```js
const taxDetailsQuantity = objRecord.getLineCount({
    sublistId: "taxdetails"
});

for (let i = 0; i < taxDetailsQuantity; i++) {
    const infoTaxDetail = {};
    infoTaxDetail.taxDetailReference = objRecord.getSublistValue("taxdetails", "taxdetailsreference", i);
    infoTaxDetail.taxCode            = objRecord.getSublistValue("taxdetails", "taxcode", i);
    infoTaxDetail.taxRate            = objRecord.getSublistValue("taxdetails", "taxrate", i);
    arrayTaxCodes.push(infoTaxDetail.taxCode);
    arrayTaxDetails.push(infoTaxDetail);
}
```

### 1.2 Legacy puro

Tocan `taxcode` directo en sublist `item`/`expense` o buscan en records Legacy como `salestaxitem`.

| Script | Evidencia | Tipo Legacy |
|---|---|---|
| `3K - Seteo Tax Code Equivalente Ventas.js` | `getSublistValue({sublistId, fieldId:'taxcode', line:i})` y `setSublistValue` con `taxcode` en línea item — líneas 62, 99 | `taxcode` en línea item |
| `3K-Verificar Tax Codes Group Items.js` | Mismo prefijo "3K" (no inspeccionado en detalle) | Asumido por patrón |
| `L598 - Obtener Inf Transacciones FE.js:2120` | `search.create({type: "salestaxitem"})` | Record Legacy |

**Snippet representativo** (`3K - Seteo Tax Code Equivalente Ventas.js:62, 99`):

```js
// LECTURA — Legacy
let codigoImpLinea = objRecord.getSublistValue({
    sublistId: tipoSublistaConsultar, fieldId: 'taxcode', line: i
});

// ESCRITURA — Legacy
objRecord.setSublistValue({
    sublistId: tipoSublistaConsultar, fieldId: 'taxcode', line: i,
    value: codigoImpLineaEquivalente
});
```

### 1.3 Migrados con workaround

Migrados de Legacy a SuiteTax con líneas Legacy comentadas y reemplazo por campo SuiteTax o por columna custom.

| Script | Línea Legacy ORIGINAL (comentada) | Reemplazo SuiteTax |
|---|---|---|
| `L598 - Obtener Inf Transacciones FE.js:1361` | `// getSublistValue(... "tax1amt", k)` | `getSublistValue(... "taxamount", k)` |
| `L598 - Obtener Inf Transacciones FE.js:1364` | `// getSublistValue(... "taxcode", k)` | `getSublistValue(... "custcol_l598_codigo_impuesto", k)` |
| `L598 - Seteo Campos Gastos Refacturables.js:77` | `// getSublistValue({sublistId:'expense', fieldId:'taxcode', line:i})` | `getSublistValue({sublistId:'expense', fieldId:'custcol_l598_codigo_impuesto', line:i})` |

**Snippet representativo** (`L598 - Obtener Inf Transacciones FE.js:1361-1365`):

```js
//  var transImpImpuesto = record_transaccion.getSublistValue(tipoSublistaConsultar, "tax1amt", k);
var transImpImpuesto    = record_transaccion.getSublistValue(tipoSublistaConsultar, "taxamount", k);
var transImporte        = parseFloat(record_transaccion.getSublistValue(tipoSublistaConsultar, "amount", k), 10);
//  var transCodImpuesto = record_transaccion.getSublistValue(tipoSublistaConsultar, "taxcode", k);
var transCodImpuesto    = record_transaccion.getSublistValue(tipoSublistaConsultar, "custcol_l598_codigo_impuesto", k);
```

---

## 2. Patrones de migración detectados

| Patrón | Motivo | Files que lo usan |
|---|---|---|
| `tax1amt` → `taxamount` | SuiteTax renombró el campo; ya no se llama así en la sublist `item` | `Obtener Inf Transacciones FE.js` |
| `taxcode` (línea item) → sublist `taxdetails` | SuiteTax sacó `taxcode` de la línea, lo movió a sublist independiente correlacionada por `taxdetailsreference` | `Seteo de Tax Codes.js`, `Transacción (Servidor).js` |
| `taxcode` (línea item) → columna custom `custcol_l598_codigo_impuesto` | **Workaround de migración**: en vez de refactorizar la lógica que iteraba por líneas, crearon una custom column que replica el taxcode para que el código viejo siga funcionando sin reescribir | `Obtener Inf Transacciones FE.js`, `Seteo Campos Gastos Refacturables.js` |
| `salestaxitem` search NO migrado | Quedó búsqueda en record Legacy. Funciona por backward compat pero no es la forma correcta SuiteTax (debería ser `taxitem`) | `Obtener Inf Transacciones FE.js:2120` |

---

## 3. Decisión arquitectónica del refactor

La estrategia de migración elegida por el equipo tuvo **dos vías paralelas**:

### Vía A — Reescritura total

Aplicada a scripts críticos de cabecera de transacción. Se adoptó la sublist `taxdetails` con `taxdetailsreference` como join.

**Ejemplos:** `L598 - Seteo de Tax Codes.js`, `L598 -Transacción (Servidor).js`

### Vía B — Puente con columna custom

Aplicada a scripts auxiliares con lógica de iteración compleja. Se creó la columna custom `custcol_l598_codigo_impuesto` en líneas `item`/`expense` para que el código existente siguiera operando sin tocar la estructura del loop.

**Ejemplos:** `L598 - Obtener Inf Transacciones FE.js`, `L598 - Seteo Campos Gastos Refacturables.js`

### Trade-off

La columna custom es un **trade-off consciente**:

- **Ventaja:** ahorra horas de refactor de scripts con loops complejos sobre líneas item/expense.
- **Costo:** duplica la fuente de verdad. El `taxcode` vive en `taxdetails` Y en `custcol_l598_codigo_impuesto`. Si esos dos se desincronizan, hay bug en runtime que no es detectable en compile-time.

---

## 4. Coexistencia Legacy / SuiteTax

El proyecto **NO es 100% SuiteTax**. Convive con scripts Legacy bajo el namespace `3K-`. Esto sugiere:

- Hay **subsidiarias o cuentas** que todavía usan motor Legacy.
- Los scripts `3K-*` son de **equivalencias / mapeo** entre los dos mundos.
- SuiteTax se habilita **por subsidiaria** en NetSuite, por lo que un mismo deployment puede tener Legacy en una subsidiaria (ej: AR) y SuiteTax en otra (ej: UY) conviviendo.

---

## 5. Riesgos pendientes identificados

| Riesgo | Detalle | Ubicación |
|---|---|---|
| Búsqueda Legacy viva | `search.create({type:"salestaxitem"})` sigue activo | `L598 - Obtener Inf Transacciones FE.js:2120` |
| Doble fuente de verdad | `taxcode` está en `taxdetails` Y en `custcol_l598_codigo_impuesto` — si se desincronizan, falla cálculo | Todos los migrados con custom column |
| Scripts 3K sin tocar | Si la cuenta llega a SuiteTax, los `3K-*` pueden romper porque iteran `taxcode` en línea | `3K - Seteo Tax Code Equivalente Ventas.js`, `3K - Verificar Tax Codes Group Items.js` |

---

## 6. Lo que NO se analizó todavía

Limitaciones del scan actual que conviene cerrar en próxima iteración:

- **Quién popula `custcol_l598_codigo_impuesto`** — existe pero no buscamos qué script la setea desde `taxdetails`. Hay que rastrear el flujo origen para entender el puente completo.
- **Scripts 3K en detalle** — solo confirmamos que `3K - Seteo Tax Code Equivalente Ventas` usa `taxcode` Legacy. El `3K - Verificar` se asumió por patrón pero no se inspeccionó.
- **Triggers donde corren estos scripts** — no mapeamos en qué momento (beforeSubmit/afterSubmit/etc.) corre cada uno, lo que define el orden real de ejecución.
- **Scripts de FE (CAE) que dependan del taxcode** — en el flujo de FE, los CAE consumen el XML pre-armado. Falta confirmar si el armado del XML usa `taxdetails` o `custcol_l598_codigo_impuesto`.

---

## 7. Reglas prácticas para modificar código de impuestos en este proyecto

Antes de tocar cualquier script de impuestos, verificar qué motor usa:

| Si el script... | Entonces es... | Cómo modificarlo |
|---|---|---|
| Lee/escribe sublist `taxdetails` | SuiteTax nativo | Mantener API `taxdetails` |
| Lee `custcol_l598_codigo_impuesto` | Migrado con workaround | Mantener el patrón custom column; NO volver a `taxcode` en línea |
| Lee `taxcode` directo en `item`/`expense` | Legacy puro | Probablemente prefijo `3K-`; si vas a SuiteTax, migrar |
| Usa `tax1amt`, `tax2amt`, o `salestaxitem` | Legacy puro | Son vestigios; revisar si conviene migrar |

**Gotcha crítico:** usar la API equivocada **NO rompe en compile-time**. Rompe en runtime cuando DGI rechaza la transacción por impuestos mal calculados o mal informados en el CFE.
