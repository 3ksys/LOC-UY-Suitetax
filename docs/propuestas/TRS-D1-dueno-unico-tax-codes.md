# Propuesta Técnica — TRS-D1

## Dueño único de las columnas de tax codes por línea

**De:** Mobeats · **Para:** Tekiio · **Fecha:** 2026-09-08
**Estado:** ⏳ Pendiente de aprobación · 🔴 **Bloquea a TRS-A1**
**Relacionada:** [propuesta TRS-A](TRS-A-transaccion-servidor.md) · [informe de `Transacción (Servidor)`](../refactors/2-transaccion-servidor.md) · [informe de `Seteo de Tax Codes`](../refactors/1-seteo-de-tax-codes.md) · [registro de aprobaciones](../registro-aprobaciones.md)

---

## 0. Por qué llega ahora, y por qué bloquea a TRS-A1

TRS-D1 estaba documentado desde el análisis como **duplicación de código** entre `Transacción (Servidor)` y `Seteo de Tax Codes`, con la nota *"doble seteo y doble guardado probables — inferencia a confirmar"*.

El 2026-09-07 dejó de ser inferencia. Los logs de la invoice 15822 mostraron a los dos scripts corriendo en el **mismo guardado**, con orden verificado. Y al analizar el cruce apareció algo que no estaba previsto: **TRS-A1 no se puede implementar antes de resolver esto.**

TRS-A1 mueve la escritura de `Transacción (Servidor)` de `afterSubmit` a `beforeSubmit`. Eso **invierte el orden** respecto de `Seteo de Tax Codes` y cambia el dueño efectivo de las columnas, sin que nadie lo haya decidido. No es un efecto secundario aceptable: es una decisión de arquitectura tomada por accidente.

De ahí que esta propuesta se adelante a TRS-A1, que ya está aprobado.

---

## 1. Qué pasa hoy

### 1.1 Tres escritores y cinco consumidores

Las columnas `custcol_l598_codigo_impuesto` y `custcol_l598_tasa_impuesto` alimentan el CFE. Hoy las escriben **tres** UserEvents distintos:

| Script | Entry point | Qué escribe |
|---|---|---|
| `L598 - Seteo de Tax Codes` | `beforeSubmit` (rama inline) o `afterSubmit` (legacy) | las 2 columnas |
| `L598 -Transacción (Servidor)` | `afterSubmit` | las 2 columnas **+ 6 columnas propias** |
| `3K-Verificar Tax Codes Group Items` | `beforeSubmit` | `codigo_impuesto` de las líneas de grupo (ver §4) |

Y las consumen cinco scripts, dos de ellos en el camino de emisión del comprobante:

| Script | Qué lee |
|---|---|
| `L598 - Obtener Inf Transacciones FE` | ambas — **calcula el IVA del CFE** |
| `L598 - Conexion Directa FE (SS)` | ambas — ídem, el otro camino de CAE |
| `L598 - Asignar Rubro IVA` | `codigo_impuesto` |
| `L598 - Seteo Campos Gastos Refacturables` | `codigo_impuesto` |
| `3K-Verificar Tax Codes Group Items` | `codigo_impuesto` (lee y escribe) |

### 1.2 El orden, verificado en la cuenta

Invoice **15822**, creación del 03/09:

```
1:21:14  STC   afterSubmit INICIO id interno: 15822
1:21:15  STC   setearColumnasConTaxDetails   indice 0 y 1 / codigo impuesto: 26 / tasa: 22
1:21:16  STC   afterSubmit FIN
1:21:17  TRS   afterSubmit INICIO id: 15822
1:21:17  TRS   setearCodigoImpuestosLineas   arrayTaxDetails 15822_1 / 15822_4, taxCode 26
1:21:19  TRS   afterSubmit FIN
```

Los dos leen `taxdetails` por su cuenta y llegan al mismo resultado. **`Transacción (Servidor)` escribe último, así que en la práctica es el dueño efectivo.** Si alguna vez los dos cálculos divergieran, gana él por llegar después — y nadie lo notaría.

### 1.3 La duplicación no es simétrica

Este es el dato que cambia la pregunta. No se trata de elegir cuál de los dos scripts "es el dueño", porque **no hacen lo mismo**:

- `Seteo de Tax Codes` escribe **exactamente** esas 2 columnas. Nada más.
- `Transacción (Servidor)` escribe esas 2 **y otras 6** que ningún otro script escribe: nombre, descripción y unidad de medida del artículo, indicador de facturación, código de percepción/retención y el flag de retención.

Y hay algo más: **su escritura es prerequisito de sí misma.** La cadena dentro de su propio `afterSubmit`:

```
setearCodigoImpuestosLineas    ESCRIBE codigo_impuesto + tasa_impuesto
        ↓
recolectarLineasDeSublistas    LEE codigo_impuesto → arrayTaxCodes
        ↓
buscarInfoTaxCodes → cruzarConTaxCodes
        ↓
escribirColumnasDeLineas       ESCRIBE las otras 6 columnas
```

Es decir: **no se le puede simplemente "apagar" el seteo de tax codes.** Si dejara de escribir la columna, se quedaría sin el insumo con el que resuelve las otras seis.

---

## 2. Las opciones

| | Qué implica | Problema |
|---|---|---|
| **A** | `Transacción (Servidor)` deja de escribir y **lee** lo que escribió `Seteo de Tax Codes` | Introduce una **dependencia de orden entre scripts**. NetSuite no garantiza el orden de ejecución entre UserEvents de scripts distintos. Hoy es STC→TRS; el día que se invierta, TRS lee vacío y escribe mal las 6 columnas propias, **en silencio** |
| **B** ⭐ | `Transacción (Servidor)` deja de escribir las 2 columnas y **resuelve el tax code en memoria** desde `taxdetails`, que ya tiene a mano | Refactor interno de ese script. Sin dependencia de orden |
| **C** | `Transacción (Servidor)` es el dueño; `Seteo de Tax Codes` deja de escribir | Hay que **agregar deployment de TRS a `purchaseorder`** (hoy no lo tiene) y **revertir el early return de `salesorder`** que se aplicó en TRS-A2. Más invasivo y contradictorio |
| **D** | Dejar como está | Se paga doble escritura y doble `load`+`save`, y el dueño efectivo depende de un orden que nadie garantizó |

---

## 3. Lo que proponemos: opción B

`Transacción (Servidor)` **deja de escribir** `custcol_l598_codigo_impuesto` y `custcol_l598_tasa_impuesto`, y en su lugar resuelve el tax code de cada línea **en una variable en memoria**, desde la misma sublista `taxdetails` que ya lee hoy. Esa variable alimenta el resto de su cadena.

`Seteo de Tax Codes` queda como **único escritor** de las dos columnas.

### 3.1 Por qué B y no A

A parece más simple —"que lea lo que el otro ya escribió"— pero **convierte una duplicación visible en un acoplamiento invisible.** El orden de ejecución entre dos UserEvents de scripts distintos no es una garantía de la plataforma. B elimina la duplicación *y* la dependencia: cada script resuelve lo que necesita desde el registro, sin esperar nada de otro.

### 3.2 Tres verificaciones que hicimos antes de recomendarla

| Qué verificamos | Resultado |
|---|---|
| ¿`Transacción (Servidor)` lee `tasa_impuesto`? | **No.** Solo lee `codigo_impuesto`. Puede dejar de escribir ambas sin romper nada propio |
| ¿El valor en memoria sería el mismo que hoy queda en la columna? | **Sí.** Su `setearCodigoImpuestosLineas` corre *antes* de la lectura y sobrescribe cualquier valor previo, así que hoy ya lee su propio cálculo |
| ¿Hay algún tipo de transacción donde TRS escriba las columnas y STC no corra? | **No.** Ver §3.3 |

### 3.3 Alcance verificado: B no le quita las columnas a ningún tipo

`setearCodigoImpuestosLineas` está envuelto en `if (taxDetailsByRef.size > 0)`: **donde el registro no tiene `taxdetails`, no escribe ninguna de las dos columnas.**

| Tipo con deployment de TRS y sin STC | Qué escribe hoy |
|---|---|
| `payment` | sin sublista `item` → el loop no corre → **nada** |
| `itemfulfillment` | no es transacción gravada, sin `taxdetails` → **ninguna columna de impuesto**. Sí escribe las 6 de artículo, que B no toca |
| `URU - Anulación Cobranza` | mismo guard: sin `taxdetails`, no escribe impuestos |
| `transferorder` | *early return* (TRS-A2) → nada |
| `salesorder` | *early return* (TRS-A2) → nada |

Los tipos gravados donde TRS **sí** escribe —`invoice`, `estimate`, `creditmemo`, `cashsale`, `cashrefund`, `vendorbill`, `vendorcredit`— **todos tienen deployment de `Seteo de Tax Codes`**. La opción B no puede quitar una escritura que no estaba ocurriendo.

### 3.4 Lo que la versión en memoria tiene que preservar

`setearCodigoImpuestosLineas` no es un mapeo directo. Tiene dos reglas que hay que replicar tal cual:

- **Grupos:** cuando una línea está `ingroup` y la anterior es de tipo `Group`, escribe el tax code **también en el encabezado del grupo** (propagación hacia arriba).
- **Descuentos:** una línea de tipo `Discount` hereda el código y la tasa de la línea **anterior**.

Son las mismas dos reglas que tiene `Seteo de Tax Codes` — parte de por qué son código duplicado.

---

## 4. El tercer escritor: `3K-Verificar Tax Codes Group Items`

Es un `beforeSubmit` de 101 líneas. Recorre la sublista `item`; cuando encuentra una línea de tipo `Group` guarda su `codigo_impuesto` y lo escribe en cada línea miembro del grupo: **propaga hacia abajo**.

`Seteo de Tax Codes` hace la propagación **inversa** — del primer miembro al encabezado.

En un grupo donde todos los miembros tienen el mismo tax code, las dos se cancelan y no hay nada observable. **El cruce aparece solo en un grupo con tax codes mixtos:**

1. `Seteo de Tax Codes` escribe en el encabezado el tax code del **primer** miembro.
2. `3K` lo baja a **todos** los miembros → se pierden los tax codes propios de los demás.

**Hoy no llega a producirse**, porque `3K` corre en `beforeSubmit` y el `afterSubmit` de `Seteo de Tax Codes` recalcula cada línea desde su propio `taxdetails` y lo repara.

⚠️ **Con TRS-A1 y la rama inline de STC-A1, las dos escrituras pasan a `beforeSubmit`** y el orden entre ellas y `3K` deja de estar garantizado. La guarda híbrida de STC-A1 debería absorberlo —`columnasYaCorrectas` compara cada línea contra su propio `taxdetails`, así que un aplanamiento hace fallar la verificación y deriva al camino legacy, que recalcula bien— pero **eso está razonado, no medido**.

Caso de prueba definido para cerrarlo (lo corremos nosotros, es de solo lectura sobre una transacción de prueba):

> Una transacción con **grupo de artículos cuyos miembros tengan tax codes distintos**, en un tipo donde `Seteo de Tax Codes` pueda tomar la rama inline.
>
> Esperado: `rama=legacy motivo=columna-difiere:item[n]` y las columnas correctas al final. Si saliera `rama=inline-ok` con las columnas aplanadas, el fail-safe no cubre el caso y **hay que frenar TRS-A1**.

**Lo que necesitamos de Tekiio sobre este script** es su intención, no su código: ¿el aplanamiento de tax codes dentro de un grupo es una regla de negocio deliberada, o un efecto colateral? Escribe además el campo `amount` de las líneas miembro, lo cual sugiere que resuelve un problema concreto que no conocemos.

---

## 5. Por qué `tasa_impuesto` no puede dejar de escribirse

Vale registrarlo porque refuerza el pedido de STC-A2 desde otro ángulo.

`tasa_impuesto` la leen dos scripts, y los dos son el camino de emisión del comprobante:

```js
// L598 - Obtener Inf Transacciones FE.js:1373  (y L598 - Conexion Directa FE (SS).js:2053)
var porcentajeImpuestoParcial = record_transaccion.getSublistValue(..., "custcol_l598_tasa_impuesto", k);
var porcentajeImpuesto = porcentajeImpuestoParcial;
if (l598isEmpty(porcentajeImpuestoParcial)) {
  porcentajeImpuesto = parseFloat(0, 10);
}
```

Ese porcentaje multiplica el importe de línea para calcular `importeIVATasaMinima`, `importeIVATasaBasica`, `importeIVAOtraTasa` y los netos gravados. **Es la tasa con la que se calcula el IVA que se informa a DGI.**

Y el detalle que importa: **si está vacía, ambos usan `0`.**

Es un segundo mecanismo del riesgo de STC-A2, y peor que el primero. Si falla la escritura del **código**, el CFE sale sin código y es más probable que DGI lo rechace. Si falla la de la **tasa**, el comprobante sale bien formado **con impuesto cero**: pasa el control y queda mal declarado.

---

## 6. Qué necesitamos de Tekiio

- [ ] **Aprobar la opción B** como dueño único: `Seteo de Tax Codes` escribe las dos columnas, `Transacción (Servidor)` resuelve el tax code en memoria para su propio uso.
- [ ] **Confirmar el rol de `3K-Verificar Tax Codes Group Items`** (§4): ¿el aplanamiento de tax codes dentro de un grupo es regla de negocio deliberada? ¿Y la escritura de `amount`?
- [ ] **Tomar nota de que TRS-A1 queda en espera** hasta que B esté aprobada y el caso de prueba de §4 esté corrido. TRS-A1 ya está aprobado; lo que pedimos no es revisar esa aprobación sino respetar el orden.

Sin aprobación de Tekiio y bajo nuestra responsabilidad: el caso de prueba de §4, que es de solo lectura.

---

## 7. Resumen del pedido

| ID | Qué pedimos | Prioridad | Bloquea a |
|---|---|:--:|---|
| **TRS-D1** | Aprobar la **opción B** (dueño único = `Seteo de Tax Codes`; TRS resuelve en memoria) | 🥇 Alta — **bloquea TRS-A1** | TRS-A1 |
| **TRS-D1** b | Confirmar la intención de `3K-Verificar Tax Codes Group Items` | 🥈 Media | Cerrar el borde de grupos con impuestos mixtos |

**Lo que no pedimos:** revisar la aprobación de TRS-A1. Está aprobado y se va a implementar. Lo único que cambia es el **orden**: primero se define el dueño, después se mueve la escritura.
