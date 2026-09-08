# Caracterización — Seteo de Tax Codes

Plan de captura y comparación para validar que `L598 - Seteo de Tax Codes_REF.js` produce **exactamente** el mismo output que el original.

- **Refactor:** [informe](../refactors/1-seteo-de-tax-codes.md) · **Alcance:** B+C+D
- **Output observable:** `custcol_l598_codigo_impuesto` y `custcol_l598_tasa_impuesto` por línea (+ estado de la sublista `apply` en NC y Crédito de proveedor).

---

## 1. Qué se compara

El script no genera archivos, así que el equivalente al `cmp` byte-a-byte de la [metodología §7](../metodologia-refactor.md#7-caracterización-byte-a-byte) es un **CSV por línea de transacción**, exportado antes y después, comparado con `diff`.

| Plantilla | Qué captura | Aplica a |
|---|---|---|
| [`lineas-impuestos.csv`](plantillas/lineas-impuestos.csv) | Código y tasa de impuesto por línea | Los 4 tipos |
| [`aplicaciones-nc.csv`](plantillas/aplicaciones-nc.csv) | Estado de la sublista `apply` | `creditmemo`, `vendorcredit` |

La segunda existe porque `desaplicarYAplicarNC()` desaplica y vuelve a aplicar las líneas: el estado final debería ser idéntico, pero es comportamiento observable y se verifica, no se asume.

## 2. Casos a capturar

**3 transacciones cubren el 100% de las ramas del script, sin tocar CAE.**

| # | Tipo | Rama que ejercita | Líneas que debe incluir | UAT |
|:--:|---|---|---|:--:|
| 1 | **Orden de venta** (`salesorder`) | `item` + grupo + descuento + múltiples tax codes | ≥2 tax codes distintos · 1 **ítem de grupo** · 1 línea de **descuento** | ✅ OK |
| 2 | **Factura de proveedor** (`vendorbill`) | sublista **`expense`** | líneas de gasto (sin ítem) + líneas de ítem | ✅ OK |
| 3 | **Crédito de proveedor** (`vendorcredit`) | `expense` + **`apply`** | gasto + ≥1 documento **aplicado** | ✅ OK |

Tres decisiones detrás de esta selección:

1. **`salesorder` en lugar de `invoice`** para los bordes del `item`. Recorre el mismo código, pero **no genera CAE** — evita el error `100000` y cualquier llamada al proveedor externo si la cuenta está en modo automático. El caso UAT Venta 03-05 está ✅ OK, contra 9 de 14 Observados en los flujos con e-Factura.
2. **`creditmemo` no aporta cobertura.** `desaplicarYAplicarNC()` ejecuta **código idéntico** para `creditmemo` y `vendorcredit` (`if (recType == "creditmemo" || recType == "vendorcredit")`, sin ramas internas por tipo). `vendorcredit` cubre la rama completa y es el caso ✅ OK; `creditmemo` (Venta 10-11) está Observado por CAE. Se deja como regresión opcional, no como requisito.
3. **Los tres casos elegidos están ✅ OK en UAT**, así que ninguno arrastra un bloqueo ambiental preexistente que confunda el diagnóstico.

Los bordes del caso 1 — **grupo**, **descuento** y **múltiples tax codes** — son las tres ramas de `setearColumnasConTaxDetails` y donde el cambio `filter` → `Map` podría divergir. Si el caso 1 no los incluye, el refactor queda sin caracterizar donde más importa.

### Cómo construir los casos en la cuenta

**Prerrequisito:** debe existir un artículo de tipo **Grupo** y uno de tipo **Descuento** (`Listas > Contabilidad > Artículos`). Sin ellos, dos de los tres bordes del caso 1 no se pueden probar.

**Datos de prueba:** los de la demo de Tekiio — cliente `60 TK CLIENTE PRUEBA E-FACTURA`, ubicación Montevideo, artículo `TK ARTICULO BIEN PRUEBA VENTA URUGUAY` ([detalle](../analisis/demo-tekiio-flujos-y-scripts.md#3-receta-para-reproducir-una-factura-de-venta)). Usar el **formulario personalizado de localización**, o puede no aparecer la solapa `Localización URU`.

| Caso | Ruta | Líneas |
|---|---|---|
| Orden de venta | `Transacciones > Ventas > Introducir órdenes de venta` | 1) artículo con TASA 22% · 2) artículo con tasa mínima · 3) artículo de tipo **Grupo** · 4) artículo de tipo **Descuento**, inmediatamente después de una línea normal |
| Factura de proveedor | `Transacciones > Proveedores > Introducir facturas` | ≥1 línea en solapa **Gastos** (con Cuenta y código impositivo) + ≥1 línea en **Artículos** |
| Crédito de proveedor | `Transacciones > Proveedores > Introducir créditos de proveedor` | ≥1 línea en **Gastos** + en solapa **Aplicar**, tildar la factura del caso anterior |

⚠️ **El orden de la línea de descuento importa:** el script hereda los valores de la línea **anterior** (`i - 1`). Si el descuento no está justo después de una línea normal, se está probando otra cosa.

⚠️ **La línea aplicada del crédito de proveedor no es opcional:** sin un documento aplicado, `desaplicarYAplicarNC()` no ejecuta nada y esa rama queda sin caracterizar.

El internal id de cada transacción queda en la URL después de guardar (`...?id=NNNNN`). Es el filtro de la Saved Search.

## 3. Procedimiento en NetSuite

### Fase 1 — Baseline del original (recomendado: transacciones UAT existentes)

**El baseline ya está en la cuenta.** Los flujos UAT de Ventas y Compras se ejecutaron con el rol `URU - Contador` ([flujos de prueba §2](../flujos-prueba-y-plan-ejecucion.md#2-flujos-reales-de-prueba)), así que esas transacciones **ya tienen escrito el output del original**. Exportar sus valores actuales *es* capturar el baseline, sin cambiar de rol y sin crear transacciones nuevas.

> 🔴 **Verificado 2026-07-28: la audiencia de los 9 deployments del original incluye `Administrador`; solo `customdeploy1` (Factura de venta) incluye además `URU - Contador`.** Mobeats no tiene ninguno de los dos.
>
> **Consecuencia que invalida el supuesto inicial:** si la audiencia de un deployment excluye `URU - Contador`, entonces las corridas UAT hechas con ese rol **nunca dispararon el script**, y esas transacciones tienen las columnas **vacías**. No se puede asumir que las transacciones UAT tienen baseline: hay que verificarlo por tipo.
>
> **Búsqueda de candidatos** (Transaction): `custcol_l598_codigo_impuesto` **is not empty** · `Main Line = No` · `Type` any of los tipos buscados. Columnas: `Internal ID` · `Type` · `Document Number` · `Date` · `Item` · `Item Type` · las dos columnas de impuesto. Contesta a la vez: qué tipos tienen baseline, cuáles incluyen líneas de `Group`/`Discount` ya escritas, y cuáles tienen más de un tax code.
>
> ⚠️ Preferir transacciones recientes con datos de prueba (`TK ...`). Re-guardar transacciones históricas de la cuenta compartida dispara otros scripts y puede tocar datos de terceros.

> **Fuente de ids: el Excel UAT de Tekiio.** Cada caso trae el link directo a su transacción (`...nl?id=NNNNN`). Además: los casos **OBSERVADO por CAE (error 100000) igual sirven como baseline** — fallaron al *generar el CAE*, no al *guardar*, así que el script corrió y sus columnas tienen el output del original. Lo que no se hace con ellos es **re-guardarlos** (riesgo de re-disparar CAE). Para la corrida del `_REF`, usar los casos sin CFE (órdenes de venta, compras sin resguardo).
>
> Nota al margen del Excel: UAT-12 (ND e-Ticket) falló **al guardar** con `"El campo URU-Valor Unidad Indexada debe estar completo"` — ese caso ni siquiera existe como transacción; no es candidato.

1. Elegir las transacciones UAT de cada rama, **priorizando los casos de Compra que están ✅ OK** — el error ambiental `100000` (CAE) bloquea 9 de 14 casos de Venta, y re-guardar una transacción con e-Factura reintenta la generación de CAE contra un middleware caído:

   | Rama | Caso UAT | Estado |
   |---|---|---|
   | `item` base | Orden de compra (Compra 03) | ✅ OK |
   | sublista `expense` | Factura de proveedor (Compra 04) | ✅ OK |
   | sublista `apply` | NC de compra (Compra 07) | ✅ OK |
   | `apply` en venta | NC de venta (Venta 10-11) | ⚠️ Observado (CAE) — último recurso |

2. Confirmar en **System Notes** de cada transacción que los valores actuales los escribió el script y no una edición manual.
3. Exportar los CSV (ver §4) → `baseline/original-<tipo>.csv`.

⚠️ **Límite de este atajo:** si las transacciones UAT no tienen **ítem de grupo**, **línea de descuento** o **múltiples tax codes**, esas tres ramas quedan sin caracterizar y hace falta un caso construido a propósito — lo que sí exige el rol que dispara el original (ver alternativa abajo).

### Fase 1 alternativa — Transacciones nuevas

> ⚠️ **Dos condiciones que invalidan el baseline si no se cumplen.**
>
> 1. **El `_REF` no debe tener ningún deployment todavía.** `Status = Testing` significa que el script corre **para el propietario, con cualquier rol** (ver [manual de carga](../carga-y-deploy-de-scripts.md)). Si el deployment del `_REF` existe, ambas versiones disparan sobre el mismo guardado y se pisan los mismos campos: la comparación deja de significar algo.
> 2. **Hay que estar logueado con un rol de la audiencia del original** (`Administrador` o `URU - Contador`, según `customdeploy1`). Con el rol `URU-Contador Suitetax (Mobeats)` el original **no dispara** — las columnas quedarían vacías y eso no es un baseline, es un falso negativo.
>
> El manual de carga indica `URU-Contador Suitetax (Mobeats)` como **audiencia del deployment del `_REF`**, que es otra cosa: no es el rol con el que se captura el baseline del original.

Solo necesaria si hace falta forzar bordes que las transacciones UAT no cubren (grupo, descuento, múltiples tax codes).

> 🔴 **Bloqueada al 2026-07-28.** Requiere un rol de la audiencia del original (`Administrador` o `URU - Contador`) y **Mobeats no tiene ninguno de los dos** en su selector de roles. [Lineamientos_Refactor_Tekiio.md:103](../requerimientos-cliente/Lineamientos_Refactor_Tekiio.md#L103) asigna a Tekiio la entrega del rol `URU-Contador` al inicio del proyecto. Sin eso, los bordes ausentes en UAT los tiene que crear Tekiio.
>
> **Atajo rechazado:** agregar `URU-Contador Suitetax (Mobeats)` a la audiencia del deployment **original**. Modifica la configuración del original y destruye el mecanismo de aislamiento del que depende todo el proyecto: a partir de ahí, cada `_REF` y su original disparan juntos para el rol de pruebas ([plan-refactor.md:42](../plan-refactor.md#L42)).

1. Verificar que el Script record del `_REF` tiene la pestaña **Despliegues vacía**.
2. Loguearse con `Administrador` o `URU - Contador`.
3. Crear y guardar una transacción de cada caso faltante. Anotar el **internal id** de cada una.
4. Exportar los CSV (ver §4) → `baseline/original-<tipo>.csv`.

### Fase 2 — Deploy aislado del `_REF`

5. Crear los 4 deployments del `_REF` copiando la config del deployment original correspondiente, con dos diferencias deliberadas: `Status = Testing` y `Audience = URU-Contador Suitetax (Mobeats)`. Procedimiento y campos en [Carga y deploy de scripts §3](../carga-y-deploy-de-scripts.md#3-creación-del-deployment).

> 🔴 **Corrección verificada en la cuenta (2026-08-20) — el aislamiento del `_REF` NO es por audiencia.**
>
> Inspección del deployment `customdeploy_l598_stc_ref_vendorcredit`: `INTERNAL ROLES` está **vacío** (sin roles seleccionados, `Select All` destildado), igual que Groups, Employees y Partners. La audiencia nunca se cargó — ni en este deployment ni, presumiblemente, en los otros 8.
>
> **Y sin embargo el script ejecuta**: las caracterizaciones de `salesorder`, `vendorbill`, `vendorcredit`, `purchaseorder` y `estimate` corrieron y dejaron logs con esta misma configuración. La explicación es `Status = Testing`: en ese estado NetSuite ejecuta el deployment **sólo para el owner del script record** (`Sebastian Benitez`) e **ignora la audiencia**. Ese —y no el rol— es el mecanismo que aisló todas las corridas del proyecto.
>
> **Las caracterizaciones anteriores siguen siendo válidas.** La pata 2 (que el original no dispare) nunca dependió de la audiencia del `_REF`, sino de la del **original**, que excluye al rol Mobeats. Eso no cambia.
>
> ⚠️ **La trampa que esto abre.** Como la restricción es *por persona* y no *por rol*, el `_REF` dispara con **cualquier rol** que use ese usuario. Hoy es inofensivo porque Mobeats no tiene `Administrador` ni `URU - Contador`. Pero el proyecto tiene un **pedido abierto a Tekiio para que entregue el rol `URU - Contador`** (necesario para forzar bordes — ver §3, Fase 1). **El día que ese rol se otorgue, el aislamiento se rompe en silencio**: con `URU - Contador`, el original y el `_REF` dispararían juntos sobre la misma transacción. Antes de aceptar ese rol hay que cargar la audiencia real en los 9 deployments y/o revisar el `Status`.
>
> **Acción pendiente (no urgente):** cargar `URU-Contador Suitetax (Mobeats)` en `INTERNAL ROLES` de los 9 deployments del `_REF`. Con `Status = Testing` no cambia el comportamiento actual, pero deja de ser una configuración cuya seguridad depende de un supuesto no escrito. **No hacerlo en medio de una corrida de caracterización.**
>
> 🔴 **La trampa se activó — verificado 2026-09-07.** El rol `URU - Contador` **ya fue otorgado** al usuario de Mobeats: figura en `My Roles` con último login **28/07/2026**. La condición que este bloque daba por futura — *"el día que ese rol se otorgue, el aislamiento se rompe en silencio"* — **ya ocurrió, y el registro no lo reflejaba.**
>
> Con `URU - Contador`, al guardar un `vendorbill` disparan **tres** escritores de las mismas dos columnas: el STC original, `Transacción (Servidor)` — los dos que se vieron correr **juntos** sobre la 15824, ver corrección al final de la Fase 3 — y el `_REF`, que corre igual porque `Status = Testing` habilita **por owner, no por rol**.
>
> Mientras esto no se corrija, **la validez de toda corrida depende de recordar con qué rol se está logueado**. La acción pendiente de arriba deja de ser "no urgente".

### Fase 3 — Corrida del `_REF`

6. Loguearse con **`URU-Contador Suitetax (Mobeats)`**.
7. **Editar y guardar de nuevo la MISMA transacción** del caso 1 (sin cambiar datos). `afterSubmit` también corre en edición, así que recalcula y sobrescribe las columnas.
8. **Verificación de aislamiento — no saltear.** Abrir `Setup > Customization > Script Execution Logs` filtrando por esa transacción y confirmar que aparece **`customscript_l598_seteo_tax_codes_ref` y NO el script original**. Si aparecen los dos, la corrida no sirve: hay que separarlos destildando `DESPLEGADOS` en uno de los dos.
   ⚠️ **En `vendorbill`/`vendorcredit` el chequeo tiene una tercera pata:** confirmar que **tampoco corrió `L598 -Transacción (Servidor)`** (verificado 2026-08-03: la Bill 14990 tiene `UY - Articulo Nombre`/`Unid Medida`/`URU-Rubro IVA` poblados → ese script también disparó al crear el baseline). Transacción (Servidor) escribe las **mismas** `custcol_l598_codigo_impuesto/_tasa_impuesto` en compras (duplicación TRS-D1): si su audiencia incluye el rol Mobeats y corre en el re-guardado, su output puede enmascarar por completo el del `_REF` y el `diff` daría "idénticos" aunque el `_REF` estuviera roto. En `salesorder` este riesgo no existía (Transacción Servidor saltea toda la lógica de líneas para ese tipo, TRS-A2). Si Transacción (Servidor) aparece en los logs del re-guardado: **parar y replanificar** — la comparación estaría midiendo el pipeline combinado, no el `_REF`.

   ✅ **Pata 3 cerrada para `vendorbill` (2026-08-03):** el deployment de Vendor Bill de Transacción (Servidor) (`customdeploy_proveedor`: Released, Event Type vacío, Log Level Debug, Execute As Administrator) tiene **Audience = `URU - Contador` únicamente** — no incluye al rol Mobeats → no pudo correr en el re-guardado. Un log de ejecución vacío NO habría alcanzado como prueba (la vista por defecto del subtab muestra solo entradas recientes); la audiencia es el cierre determinístico.

   📌 **Hallazgo derivado — audiencias complementarias y autoría del baseline:** en `vendorbill`, STC original corre solo para `Administrador` (customdeploy6) y Transacción (Servidor) solo para `URU - Contador` (customdeploy_proveedor) → en cada guardado dispara **a lo sumo uno** de los dos scripts duplicados, según el rol. Como el UAT/QA de compras corrió con `URU - Contador`, el baseline de tax codes de las Bills (14990 incluida) **lo escribió Transacción (Servidor)** (`setearCodigoImpuestosLineas`, copia casi literal de la lógica de STC — TRS-D1), no el STC original. **Alcance honesto del diff de `vendorbill`:** "idénticos" prueba que el `_REF` reproduce el baseline existente (escrito por la lógica duplicada de TRS); la equivalencia con el STC original se apoya además en la revisión de código (TRS-D1) y en el smoke test de `salesorder` (donde solo STC pudo escribir, por TRS-A2). Un baseline estricto de STC-original en `vendorbill` requeriría una Bill guardada por `Administrador` (pedido opcional a Tekiio). Dato clave además para la decisión de **dueño único** (TRS-D1): en la práctica, las compras de `URU - Contador` ya son territorio exclusivo de Transacción (Servidor). No generalizar a otros tipos sin revisar cada deployment.
9. Repetir 7–8 para los casos 2, 3 y 4.

> 🔴 **Corrección verificada en la cuenta (2026-09-07) — las audiencias NO son complementarias.**
>
> El hallazgo derivado del paso 8 afirma que en `vendorbill` dispara "a lo sumo uno" de los dos scripts duplicados según el rol. **Los logs lo refutan.** Sobre la transacción **15824**, mismo usuario y **mismo timestamp**:
>
> | Script | Deployment | Hora |
> |---|---|---|
> | `L598 - Seteo de Tax Codes` | `CUSTOMDEPLOY6` | 07/09/2026 10:08:26 am |
> | `L598 -Transacción (Servidor)` | `CUSTOMDEPLOY_PROVEEDOR` | 07/09/2026 10:08:26 am |
>
> Y el segundo loguea `setearcodigoImpuestosLineas` con `arrayTaxDetails: [{"taxDetailReference":"15824_1","taxCode":"28","taxRate":22}]` — escribió las mismas dos columnas. Es la duplicación **TRS-D1 observada en vivo**, no inferida del código.
>
> **Tres consecuencias:**
>
> 1. O `customdeploy_proveedor` incluye más roles que los inventariados, o el rol de ese usuario está en las dos audiencias. Hay que **reinventariar**.
> 2. El "alcance honesto del diff de `vendorbill`" del paso 8 se apoyaba en esta premisa y queda **sin sustento**: en la Bill 14990 pudieron escribir los dos.
> 3. **La pata 3 del aislamiento no se puede cerrar por audiencia.** Hay que mirar el log o el APM de la corrida concreta — como se hizo con la 15826.
10. Exportar los mismos CSV → `baseline/ref-<tipo>.csv`.

### Fase 4 — Comparación

```bash
diff baseline/original-invoice.csv baseline/ref-invoice.csv && echo "IDÉNTICOS"
```

- **Resultado esperado:** `IDÉNTICOS` en los 4 tipos.
- Cualquier diferencia se investiga **antes** de avanzar. La sospecha primaria está en el cambio de match `==` (loose) a `String(ref) === String(ref)` — ver el riesgo residual declarado en el [informe §3](../refactors/1-seteo-de-tax-codes.md#3-garantía-de-comportamiento-revisión-manual).

## 4. Cómo extraer los datos

### Opción recomendada — Saved Search exportada a CSV

Es exacta, repetible y produce el mismo orden en ambas corridas, que es lo que hace comparable el `diff`.

**Ruta con el rol `URU-Contador Suitetax (Mobeats)`:** `Informes > Búsquedas guardadas > Todas las búsquedas guardadas` → `Crear Búsqueda guardada`.

> El rol de pruebas usa un centro propio: **no tiene menú `Listas` ni `Transacciones`**, así que las rutas del centro clásico de Administrador no aplican. Verificado 2026-07-28: el rol **sí** puede crear búsquedas guardadas y exportarlas a CSV.

**Tipo:** Transaction

**Criterios:**
- `Internal ID` — any of → los internal ids de los casos
- `Main Line` = `No` ← sin esto se obtiene la cabecera, no las líneas
- `Tax Line` = `No`, `Shipping Line` = `No`, `COGS Line` = `No` ← ruido que no escribe el script

**Columnas de resultado**, en este orden: `Internal ID` · `Document Number` · `Type` · `Line ID` · `Account` · `Item` · `Item Type` · `custcol_l598_codigo_impuesto` · `custcol_l598_tasa_impuesto`

**Orden (crítico):** `Internal ID` asc, luego `Line ID` asc. Si el orden no es determinístico, el `diff` marca diferencias que no existen.

Notas:
- **Etiquetas exactas en el buscador de campos** (verificado 2026-08-03): `custcol_l598_codigo_impuesto` = **`UY - Código de Impuesto (Custom Column)`** y `custcol_l598_tasa_impuesto` = **`UY - Tasa de Impuesto`**. Buscar con el **acento**: NetSuite ordena `Código` lejos de sus vecinos sin acento (`UY - Codigo Indicador Facturación`, `UY - Codigo Perc/Ret/Cred Fisc`), así que no aparece donde el orden alfabético sugiere. Al ser campos List/Record, "no está vacío" se expresa como `is not` / `none of` → `- None -`.
- ⚠️ **Campos señuelo, todos verosímiles:** `3K - Tax Code Equivalente Ventas` (`custcol_3k_tax_code_equivalent_ventas`, de otro script sin relación) y `UY - Codigo Indicador Facturación` / `UY - Codigo Perc/Ret/Cred Fisc` (`custcol_l598_ind_facturacion` / `_cod_perc_ret_cred`, de `L598 -Transacción (Servidor)`). Ninguno es output de este script.
- Las líneas de **gasto** (`expense`) no tienen `Item`; se distinguen por tener `Account`. Por eso la columna `Account` está en la plantilla.
- `Tax Details Reference` y `In Group` **pueden no estar expuestos** como columnas de búsqueda en la cuenta. Si no aparecen, se dejan vacíos en el CSV: son contexto de diagnóstico, no el output que se compara.
- Exportar siempre con las **mismas columnas y el mismo orden** en ambas corridas.

### Opción manual

Para pocas líneas: leer los valores en la transacción y tipearlos en la plantilla. Más lento y expuesto a error de transcripción, pero no depende de qué campos exponga la búsqueda.

## 5. Resultados

### Precondiciones del baseline

- [x] **2026-07-28** — `REF - L598 - Seteo de Tax Codes` con **0 deployments** (verificado en la lista con `MOSTRAR LO QUE NO SE DESPLEGÓ` tildado → `TOTAL: 0`). El original corre solo: ventana válida para capturar baseline.
- [ ] Baseline capturado con rol de la audiencia del original (`URU - Contador` preferido, `Administrador` alternativa). Rol usado: ______

Llenar al ejecutar. Un `diff` vacío es la única evidencia válida de identidad de comportamiento.

### Smoke test — Orden de venta 47 (id 15260)

Transacción de la demo Tekiio (cliente `60 TK CLIENTE PRUEBA e-Factura`, 09/06/2026). **Baseline capturado 2026-07-30** leyendo el formulario (1 línea de artículo):

| Línea | Artículo | UY - Código de impuesto | UY - Tasa de impuesto |
|:--:|---|---|:--:|
| 1 | TK ARTICULO BIEN PRUEBA VENTA URUGUAY | `Tasa Básica (22%) - Ventas` | `22.0%` |

Contexto: subtotal 1.000.000 · impuestos 220.000 (VAT_UY) · total 1.220.000 URY.

Los campos custom aparecen en el formulario con las etiquetas **`UY - CÓDIGO DE IMPUESTO`** y **`UY - TASA DE IMPUESTO`** (son `custcol_l598_codigo_impuesto` / `custcol_l598_tasa_impuesto`).

⚠️ Alcance: 1 línea, sin grupo/descuento/multi-tasa → **smoke test**, no caracterización completa. Los bordes siguen pendientes (pedido a Tekiio).

**Resultado (2026-07-30): ✅ IDÉNTICOS.** Re-guardado de la orden con el rol Mobeats vía `customdeploy_l598_stc_ref_salesorder` (`Testing`):

- **Output:** `Tasa Básica (22%) - Ventas` / `22.0%` — sin cambios vs baseline. Totales intactos (1.000.000 / 220.000 / 1.220.000).
- **Aislamiento probado:** el execution log del `_REF` tiene las entradas de la corrida (10:04 AM); el del original no tiene ejecuciones nuevas.
- **Log esperado del `_REF`:** exactamente **una** entrada (`Audit beforeSubmit — ingreso beforeSubmit NO ELIMINAR`) y **cero errores**. El `afterSubmit` limpio no loguea nada por diseño: STC-B2 eliminó los `log.debug` de dump; solo quedan `log.error`, y no apareció ninguno. En el original, la misma corrida habría dejado ~9 entradas debug.
- **Confirmada la inferencia del `expense`:** `salesorder` no tiene sublista `expense` y `setearColumnasConTaxDetails("expense", …)` corrió igual sin excepción (no hay `log.error` y el `save()` completó). La duda declarada en el [informe §4](../refactors/1-seteo-de-tax-codes.md#4-alcance-real-9-deployments) queda cerrada.
- ✅ **Desviación de config corregida (2026-08-03):** el deployment había quedado con `Ejecutar como rol = URU-Contador Suitetax (Mobeats)` en lugar de `Administrador` (valor del original `customdeploy4`). Para el smoke test no invalidó nada (sin errores de permisos, output idéntico), y quedó igualado al del original antes de la caracterización formal — una diferencia de permisos efectivos es una variable que no queremos en la comparación.

| # | Tipo | Internal ID | Original | `_REF` | `diff` | Notas |
|:--:|---|---|:--:|:--:|:--:|---|
| 1 | `salesorder` | 15260 | ✅ 2026-07-30 | ✅ 2026-07-30 | ✅ idénticos | Smoke test — 1 línea, sin bordes |
| 2 | `vendorbill` | **14990** (+15114 control) | ✅ 2026-08-03 | ✅ 2026-08-03 19:23 | ✅ idénticos | FACTURA-101: 3 líneas, 3 tasas (22/0/10) — ejercita el `Map` con 3 referencias (riesgo residual STC-B1 cubierto en compra). Baseline = export pre-deployment (inventario 175 filas); System Notes sin ediciones post-creación. Aislamiento 3 patas ✅ (pata 3 por audiencia). 15114 sin tocar = control negativo, idéntica |
| 3 | `vendorcredit` | **15227** | ✅ 2026-08-03 | ✅ 2026-08-05 17:19 | ✅ idénticos | Par de Bill 15226 (URU-00005). Línea: byte-idéntica al inventario (Tasa Básica 22%, id 28). Solapa Aplicar post-guardado = baseline: Bill URU-00005 tildada, PAYMENT 1.220.000,00, UNAPPLIED 0.00 (retenciones y otras bills sin tildar, intactas). **Primera ejecución histórica de `desaplicarYAplicarNC` sobre esta transacción** (ningún script la había tocado: TRS solo cubre creditmemo, STC original nunca disparó para URU - Contador) — desaplicó y re-aplicó dejando estado idéntico. Aislamiento 3 patas ✅ (patas 2 y 3 por audiencia, pata 3 vía `customdeploy11`) |
| 4 | `purchaseorder` | **15111** (+15110/12/13 control) | ✅ 2026-08-03 | ✅ 2026-08-06 13:34 | ✅ idénticos | Regresión: PO 48 (Inventory 22%) recalculada por el `_REF`; 3 POs de control intactas (servicio/inventario × 22%/Exento). Aislamiento: patas 2 y 3 **determinísticas** (audiencia Administrador-only del original; TRS sin deployment de PO) |
| 5 | `estimate` | **15399** (Estimate #5, nueva) | n/a | ✅ 2026-08-06 15:06 | ✅ patrón | 2 líneas, 2 tasas: espejo **exacto** columnas ≡ Tax Details (`Tasa Básica (22%) - Ventas` 22.0% / `Tasa Mínima (10%) - Ventas` 10.0%; VAT_UY 2.300 = 2.200+100). **Prueba positiva de escritura:** el client script había precargado los códigos *sin* sufijo `- Ventas`; el guardado los reemplazó por los valores de taxdetails → el `afterSubmit` del `_REF` demostradamente escribió. Log: 1 Audit, 0 errores. Aislamiento determinístico por audiencias (original = Administrador only; TRS `customdeploy8` = URU - Contador only) |
| 6 | `invoice` / `creditmemo` / `cashsale` / `cashrefund` | | ⬜ | ⬜ | ⬜ | ⛔ Diferidos por riesgo CFE (e-Factura / e-Ticket). Deployments creados e inertes |

### Caracterización del híbrido STC-A1 — `vendorcredit` 15227 (2026-08-20)

Primera caracterización del `_REF` con la [guarda híbrida](../refactors/1-seteo-de-tax-codes.md#3bis-stc-a1--guarda-híbrida-aplicada-2026-08-20). Se eligió `vendorcredit` **a propósito**: es el único tipo donde el híbrido cambia comportamiento, porque en la rama inline no se ejecuta `desaplicarYAplicarNC` (workaround del segundo save, que en esa rama no existe).

**Transacción:** Bill Credit `URU-00005` (id 15227), par de la Bill 15226. Misma transacción caracterizada el 2026-08-05, así que el baseline ya existía y estaba probado.

Hicieron falta **dos corridas**: la primera destapó un defecto de diseño que sólo era visible midiendo governance. Ambas quedan registradas — la primera es la que explica por qué el diseño final es el que es.

#### Corrida 1 (14:07) — output correcto, ahorro nulo

`beforeSubmit` logueó `STC-A1 rama=inline lineas=1`, el output quedó byte a byte idéntico al baseline… y **el governance no bajó**:

| Entry point | Total Time | **Usage Count (GU)** | **Record Operations** |
|---|:--:|:--:|:--:|
| `Before Submit` | 0,11 s | 0 | 0 |
| `After Submit` | 1,632 s | **30** | **2** |

30 GU y 2 operaciones son, exactamente, el `record.load()` (10) + `save()` (20) del camino legacy. El script no hace búsquedas ni llamadas externas: no hay otra lectura posible.

**Causa raíz — la bandera de módulo no sobrevive entre entry points.** La versión de ese momento salía temprano sólo si `escrituraInline && columnasEscritas(...)`. No hay ningún `log.error` de `columnasEscritas` en la corrida, así que esa función nunca se ejecutó: el `&&` cortó antes, con `escrituraInline === false`, pese a que `beforeSubmit` la había puesto en `true` segundos antes. **El scope del módulo no se comparte entre `beforeSubmit` y `afterSubmit`.**

**El fail-safe funcionó como fue diseñado:** se perdió el ahorro, no la corrección.

> ⚠️ **Dos razonamientos que esta corrida invalidó**, y que habían llegado a escribirse acá antes de medir:
>
> 1. *"El conteo de logs prueba que no hubo segundo save"* — **falso**. El diagnóstico logueó dos veces pese a que el `save()` legacy sí corrió ⇒ **un `save()` desde un UserEvent no re-dispara los UserEvents de otros scripts** en esta cuenta. La única métrica válida para probar ausencia de re-guardado es `Record Operations` de APM.
> 2. *"`desaplicarYAplicarNC` era un workaround del segundo save"* — no probado **en ese momento**: la sublist `apply` quedó idéntica porque corrió la rama legacy, que sí lo ejecuta. Quedó probado recién en la corrida 2.

#### Corrección de diseño

Se eliminó la bandera. `afterSubmit` ahora decide **leyendo el registro** — la única fuente que sobrevive entre entry points: reconstruye el índice de `taxdetails` desde `context.newRecord` (0 GU) y verifica que cada línea ya tenga en sus columnas **exactamente** el valor que le corresponde (`columnasYaCorrectas`). Verificar el resultado es estrictamente mejor que preguntar quién lo escribió: detecta además columnas obsoletas de una edición previa y las deriva al legacy.

Dos detalles que decidieron el resultado:

- **Comparación tolerante al formato** (`mismoValor`): NetSuite puede devolver la tasa como `22`, `"22.0"` o `"22.0%"`. Sin normalizar, un falso negativo sistemático mandaría siempre al legacy y el ahorro volvería a ser cero, por otra causa.
- **Los dos entry points loguean siempre la rama.** El camino feliz silencioso de la corrida 1 fue justamente lo que ocultó el defecto hasta que se midió el governance.

#### Corrida 2 (17:31-17:32) — ✅ el resultado

**Log del `_REF`** (2 entradas, 0 errores):

```
17:31  beforeSubmit  STC-A1 rama=inline lineas=1 eventType=edit executionContext=USERINTERFACE recordType=vendorcredit
17:32  afterSubmit   STC-A1 rama=inline-ok verificadas=1 eventType=edit executionContext=USERINTERFACE recordType=vendorcredit
```

**Governance** (`SuiteScript Analysis`, `Number of Logs = 1` en cada consulta, rango acotado desde las 15:00 para evitar el promediado con la corrida 1):

| Entry point | Total Time | **Usage Count** | **Record Operations** | Search Calls | Errors |
|---|:--:|:--:|:--:|:--:|:--:|
| `Before Submit` | 0,062 s | **0** | **0** | 0 | 0 |
| `After Submit` | 0,026 s | **0** | **0** | 0 | 0 |
| **Total script** | **0,088 s** | **0** | **0** | 0 | 0 |
| *Original / corrida 1* | *1,742 s* | *30* | *2* | *0* | *0* |

**Output — idéntico al baseline:**

| Qué | Baseline (2026-08-05) | Post-híbrido | |
|---|---|---|:--:|
| `UY - Código de impuesto` | Tasa Básica (22%) | igual | ✅ |
| `UY - Tasa de impuesto` | 22.0% | igual | ✅ |
| Tax Amount / Gross | 220.000,00 / 1.220.000,00 | igual | ✅ |
| **Apply — `URU-00005`** | tildada · 1.220.000,00 | tildada · 1.220.000,00 | ✅ |
| **UNAPPLIED / APPLIED** | 0.00 / 1.220.000,00 | 0.00 / 1.220.000,00 | ✅ |
| **Filas aplicadas** | 1 | 1 — sin aplicaciones espurias | ✅ |

> El modo vista de NetSuite lista **sólo las líneas aplicadas**: que se vea una sola fila es lo esperado, no una pérdida de las 4 retenciones y las 9 bills que nunca estuvieron tildadas.

Confirmación visual de la línea tras la corrida 2, con el juego completo de columnas: `Tasa Básica (22%)` · `22.0%` · Tax 220.000,00 · Gross 1.220.000,00 · `URU-Rubro IVA 505 | IVA Compras Plaza Tasa Básica` · `UY - Artículo Nombre` · `Unidad Medida un` · `Indicador Facturación Tasa Basica` · `Código Indicador Facturación 3`. **Las columnas que escribe `Transacción (Servidor)` (Rubro IVA, Artículo Nombre, Unidad Medida) quedaron sin tocar** — refuerza por el lado del dato lo que el Execution Log ya mostraba: TRS no intervino en este guardado.

`verificadas=1` no es un mensaje decorativo: es la aserción de que el script comparó la columna persistida contra el `taxdetails` del propio registro y coincidieron. Evidencia de máquina sobre el output, complementaria a la comparación visual contra el baseline.

#### Conclusiones (esta vez con la evidencia completa)

- ✅ **30 GU → 0. El 100% del footprint de governance del script**, que es exactamente lo que la propuesta STC-A1 prometía.
- ✅ **`desaplicarYAplicarNC` era un workaround del segundo save.** Ahora sí probado: en la corrida 2 el legacy **no** corrió, así que la función **no** se ejecutó, y la sublist `apply` quedó intacta igual.
- ✅ Output byte a byte idéntico al baseline, cero errores.
- ✅ La guarda de completitud evalúa correctamente y el diagnóstico apareado dio `beforeSubmit ≡ afterSubmit` (caso 9 del experimento: `vendorcredit` en contexto EDIT, combinación no cubierta por los 8 previos).
- ✅ Aislamiento de 3 patas confirmado en el log: corrieron sólo el `_REF` y el diagnóstico; ni el STC original ni `Transacción (Servidor)`. Corroborado por `URU-Rubro IVA` y `UY - Artículo Nombre` sin tocar.
- 📉 Tiempo: 1,742 s → 0,088 s. **Secundario y no citable como métrica** (varianza y cold-starts dominan, ver [medición APM](../medicion-apm.md)); se registra porque el origen del delta es estructural — desaparecieron un `load` y un `save`.

> ⚠️ **Residual declarado:** la transacción tenía **una sola línea aplicada** entre 14, así que el loop de `desaplicarYAplicarNC` se ejercitó con n=1. Un `vendorcredit` con 2+ documentos aplicados sería el caso más exigente. No bloqueante — el mecanismo quedó entendido y no depende de la cantidad de líneas — pero se deja anotado.

### Caracterización STC-A2 — `vendorbill` 15826 (2026-09-07)

Dos corridas sobre la misma transacción. Detalle del marcado y del registro generado en [refactor §3.ter](../refactors/1-seteo-de-tax-codes.md#verificación-en-la-cuenta-2026-09-07).

| # | Hora | Versión desplegada | Resultado |
|:-:|---|---|---|
| 1 | 11:57–11:58 | `_REF` de producción (28.561 b) | ✅ sin regresión. `rama=legacy` en ambos entry points, `resultado=ok`, sin errores de módulo |
| 2 | 15:09 | copia con `throw` forzado (32.120 b) | ✅ marcado end-to-end: `FE-DLG-3063` con `REFERENCIA TRANSACCIÓN = Bill #TEST-STC-A2-01` |

**Aislamiento — 3 patas cerradas, y ninguna por audiencia:**

| Pata | Evidencia |
|---|---|
| 1. El original no corrió | Execution Log del original en el rango 07/09: filas **contiguas** `11:31:18 am` → `12:02:55 pm`, sin nada en la ventana 11:57–11:58. Todas de otro usuario sobre la transacción 15824. El `TOTAL: 165` hace la vista parcial, pero la contigüidad la vuelve concluyente |
| 2. Solo el `_REF` | `TOTAL: 6` entradas, deployment `CUSTOMDEPLOY_L598_STC_REF_VENDORBILL`. El total del día prueba además que corrió **una sola vez** |
| 3. `Transacción (Servidor)` no corrió | APM `Page Time Summary` filtrado a `11:00–12:00`, `NUMBER OF LOGS: 1`, único log `11:57:44 sbenitez@mobeats.io`: en el `Script and Workflow Time Breakdown` de **ese** guardado no aparece |

> **Técnica a reutilizar.** El APM acotado a un solo log cerró la pata 3 de forma limpia. El `Script Execution Log` obliga a filtrar por script y a leer ventanas de tiempo — y una vista parcial nunca prueba una ausencia — mientras el desglose de APM **es** el conjunto exacto de scripts que corrieron en un guardado. Preferirlo cuando la pregunta es "quién corrió en esta transacción".

**Costo medido del camino legacy** (mismo APM, un solo guardado): `REF - L598 - Seteo de Tax Codes` = `0,077 s` en `beforeSubmit` + **`14,425 s` en `afterSubmit`**, sobre `30,001 s` de SuiteScript total del guardado. Casi la mitad del tiempo de script es el `load`+`save` legacy — exactamente lo que STC-A1 elimina cuando puede tomar la rama inline.

⚠️ **Por qué esta corrida no tomó inline.** La línea de gasto sin tax code recibe `taxdetailsreference` (`15826_1`) sin que SuiteTax genere su fila en `taxdetails`, y la guarda todo-o-nada deriva al legacy **siempre**. Ver el límite nuevo en [refactor §3.bis](../refactors/1-seteo-de-tax-codes.md#límites-explícitos).

**Alcance NO cubierto — dicho antes de que alguien lo lea como cubierto:** la rama `expense` no quedó caracterizada **en escritura**. SuiteTax no creó fila de `taxdetails` para la línea de gasto, así que el script la recorre y no resuelve nada (mismo comportamiento que el original, que emite el mismo `log.error`). Para caracterizar `expense` hace falta una Bill con **tax code en la línea de gasto**, cargado como fila `LINE TYPE = Expense` en la solapa `Tax Details`: el campo **no existe** en la fila de la sublista, que solo expone `TAX AMOUNT` y `GROSS AMT` calculados.

**Cobertura que sí aportó esta Bill:** rama `item` con dos referencias distintas (`NEW2`/`NEW3` → `15826_2`/`15826_3`), y el par **Grupo / End of Group**, que ejercita la rama `ingroup` de `setearColumnasConTaxDetails` — la que además escribe la línea anterior cuando `itemtype == "Group"`. Era uno de los bordes pendientes del §2.

**Defecto menor detectado (Grupo D, sin efecto en comportamiento):** los tres `log.error` de `setearColumnasConTaxDetails` dicen `linea de articulos nro: 0`, `nro: 1`, `nro: 3` **sin nombrar la sublista**. El `nro: 0` era `expense[0]`; los otros dos, `item[1]` e `item[3]`. Si ambas sublistas fallaran en la línea 0 habría dos mensajes idénticos apuntando a cosas distintas.

### Invoice 15822 — quién escribe las columnas en `invoice` (2026-09-07)

Tekiio reportó la primera generación exitosa de CAE sobre la **invoice 15822** (`E-Factura Local A-4-15822`, `CAE : 48`), lo que destraba la caracterización de los tipos con CFE. Antes de usarla como baseline se determinó **qué scripts corrieron sobre ella**.

| Script | Creación (03/09) | Edición (04/09) |
|---|---|---|
| `L598 - Seteo de Tax Codes` (`CUSTOMDEPLOY1`) | 1:21:14 → 1:21:16 am | 4:09:47 → 4:09:50 pm |
| `L598 -Transacción (Servidor)` (`CUSTOMDEPLOY_L598_TRANSACCION_SERVIDOR`) | 1:21:17 → 1:21:19 am | 4:09:50 → 4:09:54 pm |
| `REF - L598 - Seteo de Tax Codes` | `TOTAL: 0` — nunca corrió | `TOTAL: 0` |

**Corrieron los dos, dos veces cada uno.** Y el log da el **orden de escritura**, que era el dato que faltaba:

```
1:21:14  STC   afterSubmit INICIO id interno: 15822
1:21:15  STC   setearColumnasConTaxDetails   indice 0 y 1 / codigo impuesto: 26 / tasa: 22
1:21:16  STC   afterSubmit FIN
1:21:17  TRS   afterSubmit INICIO id: 15822
1:21:17  TRS   setearCodigoImpuestosLineas   arrayTaxDetails 15822_1 / 15822_4, taxCode 26
1:21:19  TRS   afterSubmit FIN
```

**STC escribe primero; `Transacción (Servidor)` escribe encima, con el mismo valor.** Los dos leen `taxdetails` por su cuenta y llegan al mismo resultado. Es la duplicación **TRS-D1 observada, con orden establecido**: si alguna vez divergieran, **gana TRS por llegar último**.

#### Tres consecuencias

**1. 15822 NO sirve como baseline de `invoice`.** El valor que quedó en el registro lo escribió TRS, no el STC original. Un diff del `_REF` contra 15822 mediría si el `_REF` reproduce la salida del script *duplicado*. Es la misma limitación del baseline de `vendorbill` 14990 — pero acá con **prueba del orden** en lugar de una inferencia por audiencia. Un baseline limpio de `invoice` requiere una transacción guardada con un rol que dispare **solo** el STC, y eso hay que construirlo a propósito.

**2. En `invoice`, los 30 GU de STC son gasto descartado.** El `load`+`save` del `afterSubmit` produce un valor que TRS sobrescribe dos segundos después. El ahorro de STC-A1 en `invoice` no es solo performance: elimina trabajo cuyo resultado **no sobrevive**.

**3. El flujo de CAE dispara otro guardado.** El detalle de LOG 3060 tiene fecha `16:09:22` y el `Before Submit` de ambos scripts es `4:09:27 pm`: la generación del CAE escribe en el registro y **ese** guardado vuelve a disparar a los dos escritores. El proceso de emisión no es de solo lectura — paga los 30 GU duplicados cada vez que emite.

> **Nota de método.** Acá alcanzó con buscar el internal id en la columna `DETAIL` del Execution Log, porque los dos scripts lo loguean (`id interno:` en STC, `id:` en TRS). Eso evita adivinar ventanas de tiempo. El APM acotado a un log sigue siendo la herramienta cuando hay que probar una **ausencia** en un guardado puntual, como en la 15826.

### Plan de regresión — 6 deployments restantes (definido 2026-08-05)

Los 6 tipos restantes recorren la misma rama `item` ya caracterizada; el objetivo es regresión (que el `_REF` exista y se comporte igual en cada tipo donde el original está deployado). Se dividen en tres niveles según seguridad CFE y existencia de baseline:

| Nivel | Tipo | ID deployment (tipeado) | Original | Baseline | Corrida |
|---|---|---|:--:|---|---|
| 🟢 Ciclo completo ya | `purchaseorder` | `_l598_stc_ref_purchaseorder` | `customdeploy8` | ✅ POs 15110-15113 (inventario 175: 22% y Exento, item + cuenta de gasto) | Re-save + diff, protocolo estándar |
| 🟡 Sin baseline, sin CFE | `estimate` | `_l598_stc_ref_estimate` | `customdeploy9` | ❌ Ninguna estimación en el inventario — verificar con búsqueda de control si existe alguna | La Estimación no es documento CFE → se puede **crear una nueva** con el rol Mobeats y validar por patrón (tasas esperadas según artículo) |
| 🔴 Riesgo CFE — diferido | `invoice`, `creditmemo`, `cashsale`, `cashrefund` | `_l598_stc_ref_invoice` / `_creditmemo` / `_cashsale` / `_cashrefund` | `customdeploy1` / `2` / `3` / `5` | Invoice/CM: ✅ abundante. Cashsale/refund: ❌ ninguno en inventario | ⛔ **No re-guardar ni crear** hasta desbloquear CAE 100000: invoice/CM re-disparan e-Factura; cashsale/refund mapean a e-Ticket (confirmar con Tekiio). Los deployments se crean igual (inertes: Testing + audiencia Mobeats no ejecutan hasta un guardado del rol) |

**Precheck transversal — ✅ capturado 2026-08-05.** Inventario completo de deployments de `Transacción (Servidor)` (12, todos Released/Deployed, Event Type vacío, Log Level Debug): Cash Refund `customdeploy10` · Cash Sale `customdeploy7` · Credit Memo `customdeploy2` · Estimate `customdeploy8` · Invoice `customdeploy_l598_transaccion_servidor` · Item Fulfillment `customdeploy5` · Payment `customdeploy12` · Sales Order `customdeploy6` · Transfer Order `customdeploy9` · URU - Anulación Cobranza `customdeploy13` · Vendor Bill `customdeploy_proveedor` · Vendor Credit `customdeploy11`.

- **NO existe deployment de Purchase Order** → para la regresión de `purchaseorder`, la pata 3 queda cerrada **por ausencia** (sin deployment no hay ejecución, con ningún rol). Luz verde directa.
- **Estimate sí tiene deployment (`customdeploy8`)** → antes del test de estimación nueva, abrirlo y verificar **audiencia** (la lista no la muestra). Si incluyera al rol Mobeats, TRS escribiría las mismas columnas y comprometería la atribución del patrón.
- Nota: los IDs de deployment son únicos **por script**, no por cuenta (los `customdeploy2/5/6/7/8/9` de TRS coexisten con los del STC) — no es una inconsistencia.
- Payment (`customdeploy12`) explica el SuiteScript acumulado (~24,6s) de la hoja "Pago de Venta" cuyo desglose apareció vacío — refuerza la teoría de expiración del profiler.
- Audiencias verificadas hasta ahora: Vendor Bill y Vendor Credit = `URU - Contador` only; `salesorder` corrió para Administrador (Excel 09/06) → difieren por tipo, verificar al necesitar cada uno.

**Nota `purchaseorder`:** las 4 POs del inventario incluyen artículo de servicio a cuenta de gasto (15110, 15112) y artículo de inventario (15111, 15113), con 22% y Exento — cubre las dos variantes de línea del lado compra. Candidato primario: **15111** (Inventory, 22%) + **15112** (Exento) como segundo; el resto queda de control negativo.

### Inventario de candidatos (búsqueda `customsearch_ref_stc_candidatos_baseline`, 2026-08-03)

Export de 175 líneas con `custcol_l598_codigo_impuesto` no vacío desde 01/01/2026. Conclusiones:

- ✅ **Compras CON baseline** (refuta el falso negativo temido): Bills `14990/14993/14997/15001/15104/15107` (FACTURA-10x, QA, 3 tasas c/u), `15114-15252` (URU-0000x, demo TK, 1 línea), `15292/15295`; Bill Credits `15227`, `15229`, `15297`.
- 🎁 **Borde descuento CON baseline**: líneas `Artículo de descuento QA` (Account vacío) heredando la tasa de la línea anterior — Invoice `14919` (líneas 4 y 8 heredan 22%), `15288` (línea 2 hereda 22% con línea 3 en 10% → prueba que hereda de la línea anterior, no de la transacción), CM `14976/15290`. ⚠️ Todos en Invoice/CM (tipos CAE): sirven como baseline de lectura, **no re-guardar**.
- 🎁 **Borde multi-tasa CON baseline**: Invoices `14863/14903/14944…` y Bills `14990…` con 2-3 tax codes distintos (22/0/10). Los Bills son re-guardables sin CAE.
- ❌ **Rama `expense` SIN baseline**: cero filas con Item vacío + cuenta de gasto. Todas las líneas de Bill son de la sublista `item` (ítems de servicio a Miscellaneous Expense — engañoso, pero son item lines). El caso con solapa **Gastos** hay que construirlo (pedido a Tekiio).
- ❌ **Borde grupo sigue sin cobertura**: ningún ítem de grupo en el inventario.
- Tax codes vistos: 25 (Mínima 10% V), 26 (Básica 22% V), 27 (Exento V), 28 (Básica 22% C), 29 (Mínima 10% C), 33 (Exento C), 109 (Exportación V).
- Evitar como candidatos `14924/14968` (Document Number = "ERROR: Invalid Expression").
- El export vino con mojibake (UTF-8 leído como Latin-1). Inofensivo si **ambas** corridas se exportan igual; no "arreglar" un solo lado.

### Verificaciones puntuales

- [ ] Aislamiento confirmado en Script Execution Logs (solo corrió el `_REF`) en los 4 casos
- [ ] Líneas de **grupo**: la línea "Group" anterior heredó código y tasa
- [ ] Líneas de **descuento**: heredaron los valores de la línea anterior
- [ ] Líneas con **múltiples tax details** por referencia: se tomó el primero (STC-A3 preservado)
- [ ] Sublista `apply` idéntica en `creditmemo` y `vendorcredit`
- [x] Sin excepciones nuevas en el log del `_REF` — **confirmado en smoke test 2026-07-30**: la inferencia del `expense` ausente en ventas quedó probada (`salesorder` sin sublista `expense`, cero `log.error`, `save()` completo)
