# Bitácora de aplicación — Calcular Retenciones (SS)V2

Registro de lo **ya aplicado** sobre `L598 - Calcular Retenciones (SS)V2_REF.js`: qué se cambió, qué verificación se corrió y qué quedó afuera con motivo. Se separó del [informe de análisis](3-calcular-retenciones-ss.md) para que ese documento se lea rápido.

← [Informe de análisis](3-calcular-retenciones-ss.md) · [Registro de aprobaciones](../registro-aprobaciones.md)

---

## 3.bis Unidades aplicadas (2026-09-15)

**Archivo:** `LOC UY/L598 - Calcular Retenciones (SS)V2_REF.js` · 2427 → 2510 líneas de código (crecen por firmas y JSDoc de las funciones extraídas; el código ejecutable no) · `node --check` ✔ · el original no se tocó.

Entraron **15** de los 18 IDs del plan: B2, B3, C1-C5, D2-D9. Afuera: **B1** y **D1** (🔴), **B4** y **B5** (ver §Exclusiones).

### Verificación — lo que se midió, no lo que se revisó

| Chequeo | Resultado |
|---|---|
| Sintaxis | `node --check` OK |
| Alcance (variables libres) | Solo `alert` y `g`. `alert` es **CRT-A6** (Grupo A: hoy lanza `ReferenceError` que el catch convierte en `"NO DISPONIBLE"`; corregirlo cambia el texto fiscal). `g` es el flag de dos regex `/…/g`, falso positivo del heurístico. El original tenía **28** variables libres; las otras 26 las cerró D5 |
| Invariantes (código sin comentarios, original = REF) | `log.error` 22=22 · `log.audit` 6=6 · `.save(` 3=3 · `submitFields` 4=4 · `.setValue(` 34=34 · `setCurrentSublistValue` 128=128 · `removeLine` 1=1 · `https.post` 4=4 · `record.create` 1=1 · `record.load` 3=3 · `lookupFields` 7=7 · `getRange` 14=14 · `JSON.parse` 4=4 · `search.create` 43=43 · `throw` 2=2 · `catch` 14=14 · `letras(` 7=7 |
| Diferencias esperadas | `eval(` 3→0 (C3) · `isEmptyOK` 3→0 (D2) · `var` 47→0 (C1) · `log.debug` 37→28: los 9 son exactamente los de D4 · `JSON.stringify` 14→10: los 4 estaban dentro de esos logs · `return` 36→34: el de `isEmptyOK` y el del callback del `filter` (B3). **Ningún `return` de entry point se perdió** |
| Bloques fiscales IRPF/IRNR/IRAE/IVA (orig. 1138-1546) | `diff -w` contra el REF: **solo** las 16 conversiones de `toFixedOK` y 4× `var arrayRetencion`→`const`. Ningún otro renglón |
| Fuga de datos en las extracciones (D7) | Para cada bloque extraído: ninguna variable escrita adentro se lee después en el caller. Verificado sobre los rangos originales |
| `removeLine(sublistaRefCFE, 1)` | Textualmente idéntico (CRT-A11 reservado) |

### Unidad 1 — C + D mecánicos (C1, C2, C4, D2, D3, D4, D6, D8)

| ID | Qué se hizo | Argumento de equivalencia |
|---|---|---|
| C1 | `var` → `const`/`let` (47 → 0) | Redeclaraciones (`var arrayRetencion` ×4 por rama) → una declaración por bloque |
| C2 | `getParameter({name})`; `getSublistValue({sublistId, fieldId, line})` en 1627 y 1873 | Forma documentada de 2.x, mismo valor. **`removeLine(sublista, 1)` no se tocó**: su semántica es CRT-A11 |
| C4 | Bloques comentados con `nlapi*`/`getLineItemCount` eliminados (incluidos 970 y 2043, no listados) | Solo comentarios: 0 llamadas 1.0 vivas antes y después |
| D2 | `isEmptyOK` eliminada; sus 3 usos → `isEmpty` | Los mismos 5 chequeos en otro orden |
| D3 | `999123456789;` eliminado. `var newRetencion = JSON.parse(…)` ×2 y `var newVendorPayment = JSON.parse(…)`: se quita la variable, **se conserva la llamada** | `JSON.parse` lanza si el body del Suitelet no es JSON válido y esa excepción hoy cae en un catch. Quitar la llamada habría cambiado el camino de error |
| D4 | 9 `log.debug` eliminados (`braian9`, `braian buscando…` ×3 con `JSON.stringify(objRecord)`, `LINE 765`, `LINE 934`, 3 dumps). Los 22 `log.error` quedan | Ninguno alimenta datos |
| D6 | El segundo `objRecord` de `afterSubmit` (la URU-Retención cargada, orig. 1587-1627) → `registroRetencion`, dentro de `generarResguardoAutomatico` | Renombre completo: el chequeo de alcance habría marcado cualquier referencia sobrante |
| D8 | `obtenerTipoTransaccionLocal(tipoTransStr, esND)`: se quita el tercer argumento (`subsidiaria`) que la función ignoraba; JSDoc dice que **no filtra por subsidiaria** | Agregar el filtro sería cambio de comportamiento (Grupo A) |

### Unidad 2 — B2, B3, C3, C5, D5, D9

| ID | Qué se hizo | Argumento de equivalencia |
|---|---|---|
| B2 | (a) `esOneworld()`: `getRange end:1000` → `end:1`. (b) Memo por ejecución `esOneworldMemo`, reseteado a `undefined` al inicio de los 3 entry points. (c) La llamada incondicional de `beforeSubmit` (orig. 2258) se movió adentro de `setearMontoEscrito`, la única rama que usaba `subsidiaria` una vez aplicado D8 | (a) chequeo de existencia. (b) el scope de módulo no se comparte entre entry points (medido en STC); el reset explícito lo hace independiente de eso. (c) `esOneworld` es una búsqueda sin efectos; correrla solo para Resguardos create/edit ahorra **1 búsqueda en cada guardado de cualquier otro tipo** |
| B3 | Dedup `filter((e,i,self) => i == self.indexOf(e))` → `Array.from(new Set(arr))` | Ambos conservan la primera aparición en orden de inserción. El `submitFields` dentro del loop se mantiene: es una escritura necesaria |
| C3 | `eval(c)`/`eval(d)`/`eval(u)` en `letras()` → `Number(…)` | Los 6 call sites pasan resultados de `parseInt`: números. `Number(x) ≡ eval(x)` para números y strings numéricos, y el `switch` usa `case 0:` estricto, así que el tipo tiene que ser número. **No** se usó asignación directa: `Number("0")` → `0` como `eval("0")`; `c` a secas no |
| C5 | `Number.prototype.toFixedOK` → `toFixedOK(valor, decimales)`, fórmula byte-idéntica; 21 usos convertidos | ⚠️ **Precedencia:** en `parseFloat(retImporte, 10) * parseFloat(-1, 10).toFixedOK(2)` (8 casos en los bloques fiscales) el método aplicaba **solo** a `parseFloat(-1, 10)` y el resultado es un número (string coercionado en la multiplicación). Quedó `parseFloat(retImporte, 10) * toFixedOK(parseFloat(-1, 10), 2)`. No se "arregló" |
| D5 | 21 variables implícitas de `getNumberLiteral` declaradas con `let`; `eslint-disable/enable` fuera | La función es recursiva. La rama `n ≥ 1e9` es la única que recursa, y después de las llamadas recursivas solo usa `tmp, s, tmp1, tmp2, tmpn1, tmpn2, pred`; las recursiones (n < 1000 y n < 1e9) no entran a esa rama. Sin dependencia entre niveles. **`if (mdata != "\t")` intacto** (CRT-A8) |
| D9 | `beforeLoad`: el loop que sobrescribía 5 variables → lectura directa de `results[results.length - 1]` | El cuerpo del loop no tenía otro efecto. Comentario en el código: "semántica original: última fila; afterSubmit usa la primera" |

### Unidad 3 — D7: 9 extracciones, extracción pura

Sin reordenar efectos, sin partir `try/catch`, sin closures: todo se pasa por parámetro y ninguna devuelve valor.

| Entry point | Función extraída | Origen |
|---|---|---|
| `afterSubmit` | `generarResguardoAutomatico(idCTRetencion, idRetencionNueva)` | 1586-1646 |
| | `aplicarPagoFacturaAutomatico(datos)` | 1648-1676 (try/catch completo) |
| | `setearDetalleRetencionJson(contextType, recType, recId)` | 1853-1995 |
| `beforeSubmit` | `validarEdicionUruRetencion(…)` — ERR001, el `throw` propaga igual | 2019-2026 |
| | `validarEdicionUruResguardo(…)` — ERR002 | 2031-2066 |
| | `eliminarDetallesDeUruRetencion(objRecord)` | 2095-2120 |
| | `limpiarResguardoEliminado(objRecord, recType)` — incluye B3 y el `removeLine` intacto | 2129-2237 |
| | `setearMontoEscrito(objRecord, contextType, idTransaccion)` — incluye B2(c) | 2262-2281 |
| | `setearTipoComprobanteFE(objRecord, contextType, recType, idTransaccion)` | 2285-2365 |

**No se extrajeron:** los 4 bloques IRPF/IRNR/IRAE/IVA (CRT-D1, 🔴); el `if (!isEmpty(idRetencionNueva))` completo (1575-1677) porque exigía ≥10 parámetros — se extrajeron sus dos sub-bloques; el `try` de `duedate` (2075-2087) por trivial.

### Exclusiones que no estaban en el plan

- **B4 — `save()` → `submitFields` en el bloque JSON del Resguardo.** `submitFields` no dispara el mismo sourcing ni las mismas validaciones que `save()`. CDF-B5, el mismo tipo de cambio, está clasificado 🔴. Se revisa con el código en mano antes de aplicarlo; no entra como 🟡 "revisión conjunta".
- **B5 — parcial.** Solo entra la caché de `esOneworld` (vía B2). Las 3 lecturas de `datos_impositivos_emp` (orig. 341, 450, 579) tienen **filtros y columnas distintos** — una sin filtro de subsidiaria. Consolidarlas no es equivalente si hay más de un registro de configuración activo: la misma lección de TRS-B3.

### Hallazgos nuevos durante el refactor (no corregidos)

- `var newResguardo = ''` (orig. 945) es dead code: la única aparición posterior de ese nombre es la clave de string `objInformacionResguardo['newResguardo']`. No estaba en D3; quedó como `const`.
- `errorGeneral = false` (943) y `mensajeError = ""` (944) son constantes: `if (!errorGeneral)` (967) es siempre verdadero y la rama `else` de 1845 es **inalcanzable**. Restos del bloque 1.0 que C4 eliminó.
- `decimal` en `getNumberLiteral` estaba declarado y no se usa.
- Dos logs con números de línea desactualizados sobreviven: `"LINE 2048"` y `"LINE 2076"` (orig. 2310 y 2340). D4 no los listaba.

### Riesgo residual declarado

Ninguna comparación cambió de `==` a `===` (el plan no lo pedía). Lo único que toca semántica de tipo es C3 (`eval` → `Number`), acotado a argumentos numéricos verificados. La caracterización byte a byte cierra el resto, con los casos del [§6 del informe](3-calcular-retenciones-ss.md#6-casos-de-caracterización-sugeridos).

### Pendiente

- [ ] Deploy aislado (Status `Testing`, Audience rol de pruebas) — necesita inventario de deployments (duda #7).
- [ ] Caracterización: los 7 casos del §6, con **UAT Compras 04** como primario. Regla: elegir casos donde CRT-A3/A8 no se disparen.
- [ ] Medición GU: esperado ahorro **modesto** — 1 búsqueda por guardado de cualquier tipo (B2c) y las repetidas de `esOneworld` en Resguardo. El salto grande es B1 (🔴) y A13.
