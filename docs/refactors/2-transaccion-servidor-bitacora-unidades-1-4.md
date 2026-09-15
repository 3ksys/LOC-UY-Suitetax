# Bitácora de aplicación — Transacción (Servidor), unidades 1-4

Refactor **B/C/D sin cambio de comportamiento**, aplicado el **2026-08-20** sobre `L598 -Transacción (Servidor)_REF.js`. Cubre las unidades 1 a 4: qué se cambió, qué quedó deliberadamente afuera, y los tres bugs que atrapó el chequeo de alcance. Se separó del [informe de análisis](2-transaccion-servidor.md) para que ese documento se lea rápido; acá no hay contenido nuevo ni recortado.

← [Informe de análisis](2-transaccion-servidor.md) · [Unidades 5-6 (Grupo A aprobado)](2-transaccion-servidor-bitacora-unidades-5-6.md) · [Registro de aprobaciones](../registro-aprobaciones.md)

---

## 3.bis Unidad 1 — C + D mecánicos (aplicada 2026-08-20)

**Archivo:** `LOC UY/L598 -Transacción (Servidor)_REF.js` · 2.128 → 2.125 líneas · `node --check` ✔
**Criterio:** sólo cambios sin efecto sobre el flujo. Todo lo que requiriera una inferencia no verificada quedó afuera y está listado abajo.

| ID | Qué se hizo | Verificación |
|---|---|---|
| TRS-C1 | `eval(c/d/u)` → `Number(...)` en `letras()` | Los 3 argumentos vienen **siempre** de `parseInt()` en `getNumberLiteral` → equivalentes, `NaN` incluido. Verificado en los 6 call sites |
| TRS-C3 | `var` → `const/let` en el bloque `creditmemo`; `let` → `const` en `setearCodigoImpuestosLineas` y su `proceso` | Ver ⚠️ abajo: **no** se tocaron los `var` de `getNumeroEnLetras` |
| TRS-C4 | Helper `esVerdadero()` reemplazando **20 ocurrencias** del patrón `x == 'T' \|\| x == true`; filtro objeto plano → `search.createFilter` (`ANYOF === 'anyof'`) | Helper probado contra la semántica original en 9 casos (`"T"`, `true`, `"F"`, `false`, `""`, `null`, `undefined`, `"X"`, `1`) |
| TRS-D2 | Eliminados: literal suelto `999123456789;`, 3 comentarios `nlapi*`, bloque comentado del monto escrito en beforeSubmit | El `submitFields` comentado **se conserva a propósito** (ver abajo) |
| TRS-D3 | `Array.prototype.pushSafe` → función de módulo `pushSafe(array, val)`; 4 call sites actualizados. `Number.prototype.toFixedOK` eliminado (0 usos) | Misma semántica, log del caso descartado incluido |
| TRS-D5 | Removidos los 15 números de línea hardcodeados y desactualizados de los logs; corregido el mojibake `NumÃ©rico`; `INFORACIÓN` → `INFORMACIÓN` | El `alert()` de la misma línea **no se tocó**: es TRS-A5 |
| TRS-D6 | 3 lecturas del mismo `custcol_l598_codigo_impuesto` (misma sublista, misma línea, sin nada que las modificara en el medio) → 1 | `getSublistValue` pasó de 34 a 32 ocurrencias |
| TRS-D7 | **Documentado, NO unificado** | Ver abajo |

### Lo que quedó deliberadamente afuera, y por qué

**⚠️ Los `var` de `getNumeroEnLetras` no son residuo de estilo — son estructurales.** El bloque `else` (rama "usar decimales") **reasigna `parteEntera`, `parteEnteraLetras` y `numeroEnLetras` sin declararlas**, dependiendo del hoisting de los `var` de la rama `if`. El propio archivo lo marca con `/* eslint-disable no-var, block-scoped-var */`. Convertirlos a `let` rompería esa rama — que, según la [duda abierta #9](2-transaccion-servidor.md#7-dudas-abiertas-no-verificable-desde-el-repo), es probablemente **la que corre en producción**. Se dejaron intactos. Arreglar esto pertenece al mismo cambio que TRS-A6.

**TRS-D7 — `isEmpty` no se unificó.** La versión local también trata como vacíos los strings `"null"` y `"undefined"`; `utilities.isEmpty` no. Con 73 usos de la local y 1 de la de utilities, unificarlas es un **cambio de comportamiento**, no una limpieza. Se documentó la divergencia en el código y queda como pendiente. Ídem `l598esOneworld`, que además se toca en TRS-B3 (memoización).

**Ramas `else` inalcanzables (TRS-D2) y `UserEventType.COPY` (TRS-D2):** su inalcanzabilidad es una **inferencia** del análisis, no un hecho verificado. Quitar un `log.error` inalcanzable no compensa el riesgo de que la inferencia sea falsa. Quedan pendientes de verificación en la cuenta.

**El `submitFields` comentado se conserva**, contra el criterio general de borrar código muerto: es la evidencia de que la alternativa que propone [TRS-A1](../propuestas/TRS-A-transaccion-servidor.md) ya estaba ensayada en este código. Lleva un comentario que lo explica, para que nadie lo borre por prolijidad.

### Hallazgo nuevo durante el refactor

**El monto en letras ESTUVO en `beforeSubmit` y alguien lo movió a `afterSubmit`.** El bloque comentado que se eliminó estaba rotulado *"? Pasado al afterSubmit"*. Es directamente relevante para TRS-A1, que propone el movimiento inverso: **hay que averiguar por qué se movió antes de proponer devolverlo**. Si `total` no es definitivo en `beforeSubmit`, es el mismo tipo de problema que `taxdetails` en STC-A1 y lo resolvería la misma guarda híbrida — pero hay que verificarlo, no suponerlo. Registrado como [duda abierta #10](2-transaccion-servidor.md#7-dudas-abiertas-no-verificable-desde-el-repo).

### Un error que la verificación atrapó

El reemplazo automatizado de las 20 ocurrencias de `x == 'T' || x == true` **también reescribió el cuerpo del helper que las reemplaza**, dejando `esVerdadero` llamándose a sí misma — recursión infinita. **`node --check` lo dio por válido**, porque es sintácticamente correcto. Se detectó revisando el diff, no por el chequeo de sintaxis. De ahí que el helper hoy esté escrito en tres líneas con variables intermedias, y que tenga prueba unitaria de sus 9 casos. Recordatorio de que en reemplazos masivos **hay que revisar el diff, siempre**.


## 3.ter Unidad 2 — B performance (aplicada 2026-08-20)

**Archivo:** el mismo `_REF` · 2.125 → 2.069 líneas · `node --check` ✔
**Criterio:** cada cambio con su argumento de equivalencia escrito. Ninguno altera qué se escribe ni en qué orden.

| ID | Qué se hizo | Argumento de equivalencia |
|---|---|---|
| TRS-B1 | `setearCodigoImpuestosLineas`: `filter()` por línea → `Map` por `taxdetailsreference`. O(items × taxdetails) → O(items + taxdetails) | "Primer match gana": el `Map` guarda sólo la primera aparición de cada referencia, igual que `filter(...)[0]`. **Es el mismo cambio que STC-B1, ya caracterizado byte a byte** en Seteo de Tax Codes |
| TRS-B2 | Los **3 cruces** con `filter()` anidado en `for` y `push` desde adentro del callback → helper `indexarPor()` que devuelve `Map<clave, elementos[]>` | El `filter` recorría el array fuente **en orden** y empujaba un objeto **por cada** coincidencia. Recorrer la lista del índice hace lo mismo: mismo orden, misma cantidad, multi-match conservados. El consumidor sigue tomando `[0]` |
| TRS-B3 | **Parcial**: `getRange({end: 1000})` → `{end: 1}` en `l598esOneworld` (chequeo de existencia) y en `getSucursalxLocation` (sólo lee `[0]`) | Ninguna de las dos usaba más de una fila. Ver abajo por qué **no** se memoizó |
| TRS-B4 | **29 `log.debug` eliminados** de 43 (los que serializaban estructuras con `JSON.stringify`) + el **loop cuyo único cuerpo era un log** y hacía 2 `getSublistValue` por línea | Los 21 `log.error` se conservan intactos. **El costo se pagaba aunque el Log Level no fuera Debug**: los argumentos se evalúan antes de la llamada |
| TRS-B5 | 1ª pasada: condición `\|\| tipoSublistaConsultar != 'time'` → `== 'item'`, igualándola a la 2ª pasada | Ver la cadena completa abajo |

### El argumento de TRS-B5, completo

La 1ª pasada recolectaba líneas de `itemcost`/`expcost`/`expenses`; la 2ª sólo escribe `item` y `time`. Esas filas viajaban por toda la cadena — alimentaban `arrayItem` y `arrayTaxCodes`, que son los filtros de dos saved searches, y producían entradas en `arrayFinalAux` y `arrayFinal` — para no usarse nunca.

Se verificó la cadena entera, no sólo el extremo: si un artículo o un tax code aparece **también** en una línea `item`, se sigue recolectando desde ahí. Si aparecía **sólo** en `itemcost`/`expcost`, sus resultados de búsqueda únicamente podían cruzar contra entradas de `arrayFinalAux` con esa misma sublista — que la 2ª pasada ignora. El output para las líneas `item` y `time` es idéntico.

### Por qué TRS-B3 quedó parcial — el análisis sobreestimó la oportunidad

El hallazgo decía "`customrecord_l598_datos_impositivos_emp` se consulta **4 veces por guardado**, memoizar por ejecución". Al mapear los call sites reales, esas 4 consultas **no ocurren en la misma ejecución**:

| Entry point | Consultas a ese registro |
|---|---|
| `beforeSubmit` | `l598esOneworld()` (vía `obtenerSucursal`) + `getSucursalxLocation()` = **2** |
| `afterSubmit` | `l598esOneworld()` + `usarDecimales` (vía `getNumeroEnLetras`) = **2** |

Y **el scope del módulo no se comparte entre entry points** — medido en STC el 2026-08-20. Una memoización de módulo no ahorraría ninguna búsqueda: agregaría maquinaria por cero beneficio.

Consolidar las dos consultas de cada entry point en una sola **sí** ahorraría una búsqueda, pero no es equivalente: `l598esOneworld` filtra por `custrecord_l598_dat_imp_es_oneworld = true` y pregunta por **existencia**, mientras que las otras dos traen el registro y leen `[0]`. Si hubiera **más de un registro de configuración activo**, las dos formas dan resultados distintos.

Queda como [duda abierta #11](2-transaccion-servidor.md#7-dudas-abiertas-no-verificable-desde-el-repo): confirmar con Tekiio si puede haber más de un `datos_impositivos_emp` activo por subsidiaria. Si la respuesta es no, la consolidación pasa a ser segura y ahorra 1 búsqueda por entry point.

### Riesgo residual declarado

Las comparaciones originales de los cruces eran `==` (débil); las claves de los `Map` se normalizan con `String()`. Equivalente para ids numéricos y string — el dominio real — pero es el **mismo riesgo residual que se declaró en STC-B1 y que la caracterización de aquel script cerró en ✅ idéntico**. Acá se cierra igual: byte a byte contra el original.

La clave compuesta de `arrayItemTimeSS` (`itemId` + separador + `idTime`) no puede colisionar porque ambos componentes son ids internos numéricos.


## 3.quater Unidad 3 — TRS-D4: división en funciones (aplicada 2026-08-20)

**Archivo:** el mismo `_REF` · 2.069 → 2.180 líneas (crecen por las firmas y la documentación; el código ejecutable no) · `node --check` ✔

**Método: extracción pura, sin reordenar efectos.** Ningún bloque se reescribió a mano: se cortaron por balanceo de llaves y se re-indentaron programáticamente. Cada función queda en el mismo punto de la secuencia donde corría el bloque.

### El resultado

| Función | Líneas | Qué hace |
|---|:--:|---|
| `escribirMontoEscrito` | 23 | Monto en letras (gate `!= vendorbill` conservado adentro) |
| `recolectarLineasDeSublistas` | 107 | 1ª pasada: recolecta líneas, ids de artículo y de tax code |
| `buscarInfoArticulos` | 45 | Saved search `customsearch_l598_articulos` |
| `buscarInfoTimebill` | 49 | Saved search `customsearch_l598_timebill` |
| `buscarInfoTaxCodes` | 44 | Saved search `customsearch_l598_cod_impuestos` |
| `cruzarLineasConArticulos` | 53 | Los 2 cruces que producen `arrayFinalAux` |
| `cruzarConTaxCodes` | 45 | Cruce final con los tax codes (rama `else` incluida) |
| `escribirColumnasDeLineas` | 213 | 2ª pasada: escribe las columnas custom por línea |
| `desaplicarYAplicarNC` | 24 | Toggle de `apply` en NC |

**`afterSubmit`: 722 → 98 líneas.** Hoy se lee como lo que hace: carga el registro, escribe el monto, setea tax codes, recolecta, busca, cruza, escribe columnas, pone el número de comprobante, re-aplica la NC y guarda.

Los arrays que antes se llenaban por **efecto colateral** desde adentro de un `filter` o de un `for` ahora se declaran, se llenan y se devuelven dentro de su función. Es el cambio que hace verificable el resto.

### Verificación de scope — y el bug que atrapó

Se corrió un chequeo automático sobre las **12 funciones** del archivo, buscando referencias a variables que ya no estén en su alcance. Encontró una real: `escribirColumnasDeLineas` usaba `recId`, que no era parámetro. **En runtime habría sido un `ReferenceError` dentro del try/catch del afterSubmit: las columnas nunca se habrían escrito y sólo habría quedado una línea de log.** Se agregó a la firma y a la llamada.

`node --check` **no lo detectó**: es sintácticamente válido. Es el segundo bug de esta clase en el refactor de este script — el otro fue el helper `esVerdadero` que se reemplazó a sí mismo. En ambos casos lo atrapó una verificación específica, no el chequeo de sintaxis.

Estado final: **12 funciones, 0 referencias sin resolver, 0 funciones huérfanas** (las 9 nuevas se definen y se llaman exactamente una vez).

### Lo que NO se dividió, y por qué

**`beforeSubmit` (208 líneas) queda entero.** El plan lo incluía, pero sus dos secciones más separables son las ramas `DELETE` de `vendorcredit` y de Resguardo — que es exactamente donde vive **TRS-A3** (el `objRecord.delete` inexistente que deja retenciones huérfanas). Tocar ese código antes de que Tekiio decida qué hacer con A3 mezclaría un refactor con un bug pendiente y haría ambiguo el diagnóstico. Se divide cuando A3 esté resuelto.

### Advertencia sobre la caracterización

Las 3 unidades se van a caracterizar **juntas**, por decisión de alcance. Conviene tenerlo presente al leer el resultado: si aparece una diferencia, hay que discriminar entre ≈60 cambios de 4 naturalezas distintas (estándares, performance, estructura y eliminación de logs) en vez de entre los de una sola unidad. Los candidatos más probables, en orden: la normalización `String()` de las claves de los `Map` (TRS-B1/B2), la condición de recolección de TRS-B5, y el movimiento de bloques de TRS-D4.


## 3.quinquies Unidad 4 — Lo que se destrabó verificando (aplicada 2026-08-20)

Tres cambios que en las unidades anteriores habían quedado afuera. **Ninguno estaba bloqueado por aprobación de Tekiio: los tres esperaban una verificación que se podía hacer desde el código o desde la cuenta.**

`node --check` ✔ · **28 funciones, 0 referencias sin resolver** · 2.206 líneas

### TRS-D7 — parcial: se eliminó el uso mixto, no la duplicación

Había **una sola** llamada a `utilities.isEmpty` en todo el archivo, sobre `idTransApply`, que es siempre un array. Para un array las dos implementaciones devuelven `false` idéntico (un array no es `""`, `null`, `undefined`, `"null"` ni `"undefined"`), y el `&& length > 0` que sigue cubre cualquier diferencia. Se cambió a `l598isEmpty`: **el uso mixto desaparece sin cambiar comportamiento**.

Lo que sigue pendiente es la unificación inversa — las 70 llamadas locales hacia `utilities.isEmpty` — y **no es cuestión de permiso sino de verificabilidad**: cambiaría el resultado en cada línea donde un campo devuelva los strings `"null"` o `"undefined"`, y no hay forma de enumerar esos casos sin ejercitar los 9 tipos de transacción en todos sus caminos. Beneficio cosmético, riesgo silencioso y disperso: **no se hace, con o sin aprobación**.

### TRS-D2 — las dos ramas `else` inalcanzables: de inferencia a hecho

El análisis las marcaba como *"inalcanzables tras `!l598isEmpty(objeto)` que siempre es true"*, con la salvedueda de ser una inferencia. **Verificado el 2026-08-20 leyendo `obtenerSucursal` completa:**

- tiene **un solo `return`**,
- **sin `try`/`catch`**,
- y devuelve `informacionSucursal`, inicializado siempre como objeto con `sucursal = 1` y `serie = 1`.

Nunca puede ser `null` ni `undefined`, así que `!l598isEmpty(infoSucursal)` es siempre verdadero y los `else` de `beforeSubmit` y `beforeLoad` eran código muerto. Se eliminaron, dejando en su lugar el argumento de por qué.

### TRS-D4 — división de `beforeSubmit`: 208 → 150 líneas

Se extrajeron las dos ramas `DELETE` a `borrarRetencionesDeVendorCredit()` y `borrarRetencionesDeResguardo()`.

**Corrección de un razonamiento propio.** En la unidad 3 se dejó sin dividir con el argumento de que "el día que se apruebe TRS-A3, el diff mezclaría el arreglo del bug con el movimiento del código". **Es al revés:** extraer ahora y caracterizar hace que el arreglo posterior de A3 sea un diff chico y aislado. El mezclado sólo ocurriría haciendo las dos cosas en el mismo cambio.

Las dos funciones llevan documentado que contienen TRS-A3 y que **el bug no se corrigió**: sigue esperando decisión de Tekiio.

> ⚠️ **La rama `DELETE` no está caracterizada todavía.** Requiere el caso 4 de la matriz (crear y borrar una NC de compra de prueba con retenciones asociadas). Es código movido, no reescrito, pero movido igual: **no se da por bueno hasta correr ese caso**.

### El tercer bug que atrapó el chequeo de scope — y el peor de los tres

Las dos funciones nuevas usaban `recType` sin recibirlo como parámetro. A diferencia del caso de `recId` en la unidad 3, acá la referencia está en la **condición de guarda** y la llamada quedó incondicional: habría lanzado `ReferenceError` en **todos los guardados, de cualquier tipo de transacción**, no sólo en los DELETE.

`node --check` lo dio por válido, otra vez. Van **tres bugs de esta clase** en el refactor de este script, los tres detectados por verificaciones específicas y ninguno por el chequeo de sintaxis:

| # | Unidad | Bug | Consecuencia si llegaba a la cuenta |
|:--:|---|---|---|
| 1 | 1 | El regex reemplazó el cuerpo del helper `esVerdadero` por una llamada a sí misma | Recursión infinita en cada línea evaluada |
| 2 | 3 | `escribirColumnasDeLineas` sin el parámetro `recId` | Columnas fiscales nunca escritas, sólo un log |
| 3 | 4 | `borrarRetenciones*` sin el parámetro `recType` | **Todos** los guardados fallando |

**Conclusión de método:** en un refactor que mueve código programáticamente, `node --check` verifica que el archivo *parsea*, no que *funciona*. El chequeo que sirve es el de alcance: para cada función, calcular sus locales (declaraciones + parámetros + destructuring) y buscar referencias a variables que ya no estén en su scope, excluyendo accesos a propiedad. Es lo único que atrapó los tres.

