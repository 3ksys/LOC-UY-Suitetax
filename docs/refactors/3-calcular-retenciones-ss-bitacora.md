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

- [x] **Desvío de deploy (2026-09-16):** los IDs de parámetro no se pueden duplicar en la cuenta; el `_REF` los lee por constantes `PARAM_*` con sufijo `_ref`. Revertir al reemplazar al original. Regla en [carga y deploy §3.bis](../carga-y-deploy-de-scripts.md#3bis-parámetros-de-script-el-_ref-necesita-ids-propios).
- [ ] ⛔ **Bloqueado** — deploy aislado: el original `customscript_l598_calcular_ret_ss_v2` está **INACTIVE** en la cuenta ([nota del informe](3-calcular-retenciones-ss.md)). Precondición: que Tekiio decida reactivarlo o reorientar el refactor a `Calc Ret. Lineas`.
- [ ] ⛔ **Bloqueado por lo mismo** — caracterización: los 7 casos del §6, con **UAT Compras 04** como primario. Regla: elegir casos donde CRT-A3/A8 no se disparen.
- [ ] Medición GU: esperado ahorro **modesto** — 1 búsqueda por guardado de cualquier tipo (B2c) y las repetidas de `esOneworld` en Resguardo. El salto grande es B1 (🔴) y A13.

### Verificación en la cuenta — 2026-10-27/28 (CRT-A1/A2/A3/A6/A8/A11 y botón "Calcular Retenciones")

**Qué quedó hecho:** los 6 Grupo A aplicados al `_REF` (commits `b42c82e`, `513c71c`), archivo en el File Cabinet (id 15573), script record `REF - L598 - Calcular Retenciones (SS)` (id 707, `customscript_l598_calc_ret_ss_ref`) y 4 deployments en Testing (Vendor Bill 353, Vendor Credit 354, URU-Retención 355, URU-Resguardo 356), copiados del original con el rol de Mobeats. Bill de prueba #585 (id 15982, `crt-ref-t1`).

**Verificado en la cuenta:** `beforeSubmit` y `afterSubmit` del `_REF` corren sin errores sobre una factura nueva. El botón **Calcular Retenciones** aparece y ejecuta `calcularRetencionesl598` (el desvío de deploy #2, `CLIENT_SCRIPT_LIBS`, funciona).

> 🔴 **El cálculo no avanza, y no es por el `_REF`: la librería del bundle y la búsqueda guardada de la cuenta están desalineadas.**

- La librería `L598 - Calcular Retenciones (LIBS)V2.js` (SuiteBundles > Bundle 475567, archivo id 56) lee por **posición** la búsqueda guardada `customsearch_l598_transaction_det_ret` (id 20): `columns[11]` = "ESTADO DE APROBACIÓN FACTURA", `[12..15]` = códigos IRAE/IRNR/IRPF/IVA, `[17..]` = retención, dirección, ciudad, país, etc.
- La búsqueda de la cuenta tiene **otro orden**: el estado de aprobación (valor 2 en la #585) está en la posición 9; en la 11 está el código IRNR (10). Faltan al menos las columnas de **período** y **moneda** que la librería espera entre la 3 y la 7.
- Resultado: `estado` toma el código IRNR, no vale 2, y sale la alerta "La transacción debe estar en Estado de Aprobación = Aprobada…" (con el parámetro "procesar pendientes" en true o false). No se crea ninguna URU-Retención.
- Es el mismo tipo de deriva que en CDF (lectura posicional de una búsqueda editada en la cuenta). Explica por qué el CRT V2 original está **inactivo** en la cuenta: con esta búsqueda tampoco podría calcular.
- No se tocó ni la búsqueda ni la librería.

**Consecuencia:** CRT-A1, A2, A3 y A11 no se pueden ejercitar vía el botón en esta cuenta. A6 y A8 (monto en letras) y A1 se verificaron offline con `tools/arnes-grupo-a.js`.

**Pendiente (Tekiio):**
- [ ] Decidir cuál es la versión correcta: restaurar las columnas faltantes de `customsearch_l598_transaction_det_ret` o actualizar la librería del bundle.
- [ ] Hasta entonces, probar A1/A2/A3/A11 por otra vía (URU-Retención / URU-Resguardo directos, o la rama automática en `afterSubmit` con `custrecord_l598_conf_proc_ret` configurado).

#### Intento de ejercitar A1/A2/A3/A11 por otras vías — 2026-10-28 (solo lectura; nada guardado)

- **Camino automático (`afterSubmit`) también bloqueado:** lee la misma búsqueda `customsearch_l598_transaction_det_ret` por posición (`columns[11]` = estado, `[12..15]` = códigos, `[17..]` = retención/dirección…; líneas ~1100-1124 del `_REF`), así que no puede crear retenciones con la búsqueda actual de la cuenta. Toda creación de URU-Retención (botón o automática) queda bloqueada hasta que se alinee búsqueda y librería.
- **A1 (ERR002 al editar un Resguardo ya usado):** hay muchos Resguardos con detalle de retención (búsqueda `URU-RETENCION DETALLE W URU-RESGUARDO`, 847 detalles; p. ej. URU-Resguardo #1, #4, #9, #11…). La búsqueda `URU-Resguardos Pendiente de Envío` (111 resultados) **no sirve para elegir candidato**: el #9 (id interno 1402) figura ahí pero está en estado **"Informado a DGI"** (documento fiscal ya firmado). **No se guardó**: el handoff prohíbe re-guardar documentos fiscales. Para probar A1 hay que encontrar un Resguardo con detalle que **no esté informado a DGI**.
- **A2 y A11 requieren borrar** una URU-Retención / un Resguardo (borrado permanente de datos): no lo hace el asistente; si se prueban, lo borra una persona sobre un registro de prueba.
- Verificación offline de los 6 CRT con `tools/arnes-grupo-a.js` (A11 contra el comportamiento documentado de `removeLine`, no contra NetSuite).

**Estado de prueba por hallazgo (28/10/2026):**

| ID | Arnés offline | En la cuenta |
|---|:-:|---|
| CRT-A1 | ✅ | ✅ **verificado 2026-10-28** (ver abajo) |
| CRT-A2 | ✅ | ❌ requiere borrar una URU-Retención |
| CRT-A3 | ✅ (forma del filtro) | ❌ depende de crear retenciones (búsqueda desalineada) |
| CRT-A6 | ✅ | ❌ ruta de error difícil de provocar |
| CRT-A8 | ✅ | ❌ requiere generar monto escrito ≥ 1M en URU-Retención/Resguardo |
| CRT-A11 | ✅ (simulado) | ❌ requiere borrar un Resguardo |
| CDF-A2 | ✅ | ❌ bloqueado por deriva SICFE |
| CDF-C2 | ✅ (estático) | n/a |
| CDF-A8 (extra) | ❌ no cubierto | ❌ bloqueado por deriva SICFE |
| TRS-A6 (extra) | ✅ | ❌ campo `custbody_l598_monto_escrito` no aplicado a Vendor Credit |

#### CRT-A1 verificado en la cuenta — 2026-10-28

- **Caso:** URU-Resguardo #271 (id 15925), estado "Sin informar a DGI" (no firmado), proveedor "a proveedor 12", USD, con detalle de retención. Se abrió en edición **sin cambiar ningún campo** y se guardó una vez, con el rol de Mobeats (deployment `customdeploy_l598_crt_ref_resguardo`, Testing, parámetro "Ejecutar validaciones Resguardo/Retención" marcado).
- **Resultado:** el guardado se **rechazó** con `ERR002` — "No se puede editar la transaccion de URU-Resguardo porque ya fue considerada en una transaccion de URU-Retención - ID Transaccion: 15925 - TIPO Transaccion: URU-Resguardo" — lanzado desde `validarEdicionUruResguardo` (`_REF` línea 2282) vía `beforeSubmit` (línea 2174). Antes de A1 la comparación `runtime.executionContext == "userinterface"` nunca era verdadera y la validación no corría.
- **Efecto visible para usuarios:** con A1 aplicado, editar y guardar un Resguardo ya usado en una retención pasa a mostrar este error (Tekiio pidió avisarlo en las Release Notes).
- **Cómo se llegó:** lista de Resguardos filtrada por Status "SIN INFORMAR A DGI" (134 de 268). No alcanza con la búsqueda "Pendiente de Envío" (el #9 figuraba ahí pero estaba "Informado a DGI").
- **Detalle técnico:** la primera vez la pantalla se congeló al guardar; el log del `_REF` solo mostró `beforeLoad` (el guardado no llegaba al servidor). La segunda vez, con las alertas del navegador capturadas, el guardado llegó al servidor y devolvió el ERR002.
