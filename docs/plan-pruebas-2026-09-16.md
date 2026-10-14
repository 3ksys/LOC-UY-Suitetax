# Plan de pruebas — caracterización de los `_REF` en un día (2026-09-16)

Checklist operativo para caracterizar los 6 `_REF` con un día de cuenta. Sigue el [procedimiento que ya funcionó para STC](caracterizacion/1-seteo-de-tax-codes.md#3-procedimiento-en-netsuite) y la [convención de nombres](carga-y-deploy-de-scripts.md#convención-de-nombres-e-ids). No inventa nada nuevo.

**Principio:** una transacción dispara varios scripts. Factura de Compra = STC + TRS + ARI + CRT. Orden de Venta = STC + TRS + SUI. Con dos tipos de registro se cubren 5 de 6.

---

## 0. Las tres reglas que invalidan una corrida si se rompen

1. **Rol.** Todo se hace logueado con **`URU-Contador Suitetax (Mobeats)`**. El usuario de Mobeats **también tiene `URU - Contador`** (otorgado 28/07, [verificado 07/09](caracterizacion/1-seteo-de-tax-codes.md#fase-2--deploy-aislado-del-_ref)), y ese rol está en la audiencia de los originales: con él disparan **original + `_REF` juntos**.
2. **Aislamiento verificado en el primer guardado de cada script.** `Setup > Customization > Script Execution Logs`, filtrar por la transacción: debe aparecer `customscript_…_ref` y **no** el original. Si aparecen los dos, la corrida se descarta.
3. **Deploy solo en los tipos que se van a probar hoy.** `Status = Testing` dispara **por persona, no por rol**: cada deployment `_REF` de más es un script corriendo donde nadie lo mira.

Los originales **no se tocan**. Nunca.

---

## 0.bis Criterio de prueba desde 2026-10-08

**Hallazgo (2026-10-07).** La cuenta de desarrollo (`3KSYS-DEV ACCT SDN`) es **compartida**: otros equipos editan los originales directamente en el File Cabinet. El diff de los originales descargados el 07/10 contra el repo dio:

| Archivo | Original en la cuenta vs `main` |
|---|---|
| ARI, STC | Idénticos |
| SUI | Reescrito sobre una lib nueva, `L598 - Cálculo Unidades Indexadas (Lib)` |
| TRS | Agrega asiento de provisión de IVA **solo en `invoice`/`creditmemo`** (`L598 - LIB - Journal Provisionamiento.js`) |
| CDF | +175/−46: descuento global en `beforeSubmit`, SICFE, `L598/redondeoNexus`, anulación de cobranza |
| CRT V2 | +23/−6: `requestSuitelet`, `total_ret`, resguardo en EDIT |
| `L598 - Utilities` · `configuration_l598.json` | Agrega `limpiarNaN` · agrega 2 rutas de lib |

Tekiio indicó que las versiones productivas viven en las cuentas **SDN4 y SDN2** (sin acceso nuestro). `origin/main` no tiene cambios de contenido (`72a682f` solo mueve archivos para SDF). **Decisión:** `main` es la referencia del refactor (⏳ pendiente de confirmación escrita de Tekiio); los `_REF` ya parten de `main`, no hay nada que portar.

**Criterio por script:**

| Script | Verificamos nosotros | Verifica Tekiio contra su baseline |
|---|---|---|
| ARI, STC | Comparación completa contra el original de la cuenta (idéntico a `main`). Sin cambios | — |
| TRS | Comparación completa en `salesorder`, `vendorbill`, `vendorcredit` (la deriva no los toca). En `invoice`/`creditmemo`: solo el `_REF` | Equivalencia en `invoice`/`creditmemo` |
| SUI, CDF | Solo el `_REF`: aislamiento (Script Execution Log), sin errores, APM (GU, búsquedas, operaciones de registro, efecto de los cambios B) y salidas coherentes con el código de `main` | Equivalencia contra su baseline |
| CRT | ⛔ Bloqueado: original V2 `INACTIVE`; reactivar vs `Calc Ret. Lineas` sigue pendiente de Tekiio | — |

> ⚠️ **No subir las copias del repo de `L598 - Utilities` ni de `configuration_l598.json` sobre las de la cuenta:** rompen los originales de SUI y CDF que viven ahí.
>
> **Regla de mismo día, obligatoria** para cualquier comparación en la cuenta de desarrollo: baseline y `_REF` el mismo día, y anotar la fecha de modificación del original en el File Cabinet.

### Casos para Tekiio

Comparación original (su baseline) vs `_REF`, mismos datos, rol y día:

- **SUI** — Orden de Venta: re-guardar una existente y crear una nueva; comparar `custbody_l598_valor_unidad_indexada` y anotar la rama (TAFACE vs `currency.exchangeRate`), idealmente ambas. Resguardo (URU) y Remito: mismo campo. Borde sin valor (SS de config UI sin filas): campo vacío + mismo log en ambos. `xedit`: no debe setear.
- **CDF** — Remito nuevo, factura simple, multi-tasa y con descuento global (monto y %): comparar el **contenido** del JSON (`custbody_l598_informacion_json_tran_fe`) y del XML (`custbody_l598_documento_xml_fe`), no los nombres (llevan fecha). `custbody_l598_cae` vacío en ambos. Cobranza con forma de pago simple: `detalleMetodosPago` vacío en ambos (CDF-A1 se reproduce, no se corrige). `beforeLoad` sin CAE: botón presente y mismos logs FE.
- **TRS `invoice`/`creditmemo`** — Factura y NC de Venta (incl. `apply` y líneas time/itemcost/expcost): `custcol_l598_codigo_impuesto`, `custcol_l598_tasa_impuesto`, `custbody_l598_nro_comprobante`, `custbody_l598_monto_escrito` (byte a byte, bordes 10.50 / sin decimales / > 1.000.000), sucursal/serie y las 6 `custcol` del `afterSubmit`. El asiento de provisión de IVA es de su versión: queda fuera de la comparación.

---

## 1. Bloque 08–10 — Deploy aislado de los 4 `_REF` nuevos

Procedimiento por script: [carga y deploy §1-§4](carga-y-deploy-de-scripts.md#1-carga-del-archivo-al-file-cabinet). Carpeta del File Cabinet: `Refactor LOC URU - Mobeats`. Propietario: usuario Mobeats.

| Orden | Archivo | Script → Name (≤40) | Script → ID | Deployments (`Status = Testing`) |
|:--:|---|---|---|---|
| 1 | `L598 - Setear Unidad Indexada_REF.js` | `REF - L598 - Setear Unidad Indexada` | `customscript_l598_setear_unidad_ind_ref` | `customdeploy_3k_sui_ref_salesorder` |
| 2 | `L598 - Asignar Rubro IVA_REF.js` | `REF - L598 - Asignar Rubro IVA` | `customscript_l598_asignar_rubro_iva_ref` | `customdeploy_l598_ari_ref_vendorbill` · `_vendorcredit` |
| 3 | `L598 -Transacción (Servidor)_REF.js` | `REF - L598 - Transaccion (Servidor)` | `customscript_l598_transaccion_serv_ref` | `customdeploy_l598_trs_ref_vendorbill` · `_vendorcredit` · `_salesorder` |
| ~~4~~ | ~~`L598 - Calcular Retenciones (SS)V2_REF.js`~~ | **NO SE DEPLOYA** | — | 🔴 **El original está `INACTIVE` en la cuenta** (verificado 17/09, bundle 475567). Sin baseline no hay caracterización posible, y activar un script del bundle es decisión de Tekiio. Los Casos A y B pierden la parte de retenciones; el resto sigue válido |

SUI va primero **a propósito**: es el más chico y tiene parámetro de script — sirve para descubrir el problema de abajo con el menor costo.

Cada deployment se crea **copiando la configuración del deployment original** del mismo tipo de registro (contexto, log level, **valores de parámetros**), con dos diferencias: `Status = Testing` y `Audience` = el usuario Mobeats. STC no se redeploya: ya tiene sus 9 deployments `_ref` en la cuenta.

### ⚠️ Chequeo antes de seguir: los parámetros de script

Tres de los cuatro leen parámetros por ID fijo desde el código:

| Script | Parámetro que lee el código |
|---|---|
| SUI | `custscript_l598_set_ui_tipo_in_fe_taface` |
| ARI | `custscript_l598_rubro_publicidad` |
| CRT | `custscript_l598_calc_ret_ss_pfp2` · `custscript_l598_calc_ret_val_resgret` |

**Resuelto el 2026-09-16, 09:30 — NetSuite rechaza el ID duplicado** ("This custom field already exists"). Decisión: cada `_REF` lee sus parámetros por constantes `PARAM_*` con IDs `_ref`; ya aplicado en los tres archivos (**re-subirlos al File Cabinet antes de deployar**). Regla completa y tabla en [carga y deploy §3.bis](carga-y-deploy-de-scripts.md#3bis-parámetros-de-script-el-_ref-necesita-ids-propios).

Parámetros a crear con **`New Parameter`** (no con el editor en línea: trunca ID y label a 30/25 caracteres), copiando Type / List / Preference del original y el valor en cada deployment:

| Script | ID a crear (el prefijo `custscript` ya está) | Tipo |
|---|---|---|
| SUI | `_l598_set_ui_tipo_fe_ref` | List/Record → `URU-Tipo Integración` |
| ARI | `_l598_rubro_publicidad_ref` | copiar del original |
| CRT | `_l598_calc_ret_ss_pfp2_ref` · `_l598_calc_ret_val_resgret_ref` | copiar del original |

Otros dos gotchas del mismo bloque: el campo ID de Script y de Deployment **ya trae el prefijo** (`customscript`/`customdeploy`) y **no agrega el `_`**: se tipea desde el guion bajo, máximo 28 caracteres. Y el slug sigue el ID **del original en la cuenta**: SUI es `customscript_3k_setear_unidad_indexada`, no `l598`.

### Verificación del bloque (antes de las 10)

> 🔴 **Resultado del humo (2026-09-17):** el primer guardado de una Orden de Venta falló con `ReferenceError: idTransaccion is not defined` en `Transacción (Servidor)_REF.js:1952`. Bug de la extracción TRS-D4 del 20/08 (parámetro muerto pasado fuera de su bloque `let`), invisible para `node --check` y para el chequeo de variables libres. Corregido, verificado con el nuevo `tools/blockscope.py` y commiteado; **re-subir el archivo al File Cabinet antes de repetir el humo.** Detalle en la [bitácora](refactors/2-transaccion-servidor-bitacora-unidades-1-4.md#el-cuarto-bug--el-que-atrapó-la-prueba-de-humo-no-el-chequeo-2026-09-17).

- [x] **3** Script records creados con archivo `_REF` (SUI, ARI, TRS), `node --check` ya pasó en el repo. CRT no: original `INACTIVE`.
- [x] **6** deployments en `Testing` (SUI 1, ARI 2, TRS 3), IDs según la tabla, parámetros `_ref` creados. Los 3 de CRT no se crearon.
- [x] Rol activo = `URU-Contador Suitetax (Mobeats)`. **Humo y Prueba 1 cerradas el 2026-09-17; Pruebas 2 y 3 el 2026-09-18**; **Prueba 4 (TRS/ARI en `vendorbill`, mismo día) el 2026-10-14** — resultados en [caracterización ola 3-6](caracterizacion/ola-3-6-pruebas-2026-09-17.md).
- [x] Un guardado de humo en una **Orden de Venta nueva** → en Script Execution Logs aparecen `customscript_l598_setear_unidad_ind_ref` y `customscript_l598_transaccion_serv_ref`, y **no** `L598 - Setear Unidad Indexada` ni `L598 -Transacción (Servidor)`.

> **Estado de los casos (2026-09-18):** Caso C → **Prueba 1** (OV 52), Caso A → **Prueba 2** (Factura de Compra #578) y Caso B → **Prueba 3** (NC de Compra #128), todos ejecutados **sin CRT** y sin Resguardo. ⛔ **Las partes de CRT están bloqueadas:** el original está `INACTIVE` y reactivarlo o reorientar a `Calc Ret. Lineas` es decisión de Tekiio. ⏳ **Caso D (CDF) pendiente:** requiere crear los 12 parámetros `_ref` (`custscript_l598_cdf_ref_*`, ya aplicados en el `_REF`; re-subirlo al File Cabinet). IDs en [carga y deploy §3.bis](carga-y-deploy-de-scripts.md#3bis-parámetros-de-script-el-_ref-necesita-ids-propios). Detalle en [caracterización ola 3-6](caracterizacion/ola-3-6-pruebas-2026-09-17.md).
>
> **Actualización 2026-10-08:** criterio nuevo en [§0.bis](#0bis-criterio-de-prueba-desde-2026-10-08). Los Casos A y C siguen válidos como comparación completa (`vendorbill`, `salesorder`: TRS y STC/ARI sin deriva); la parte SUI del Caso C pasa a verificación solo del `_REF`. Caso D: Script record `_REF` de CDF ya creado (07/10); faltan **11** parámetros, no 12 — ver §5.

---

## 2. Bloque 10–12 — Caso A: Factura de Compra (UAT Compras 04)

**Baseline:** la factura UAT 04 existente, guardada por el original. Confirmar en *System Notes* que los valores los escribió el script y no una edición manual. Exportar CSV ([§4 del procedimiento](caracterizacion/1-seteo-de-tax-codes.md#4-cómo-extraer-los-datos)).
**`_REF`:** crear una factura **nueva con los mismos datos** (proveedor, ítems con código de impuesto, líneas de gasto con cuenta mapeada, `custbody_l598_cal_ret_auto` activo, estado Aprobada). No editar la UAT 04: el `afterSubmit` de CRT crea registros y encadena 4 POST.

| Script | Qué comparar, línea por línea |
|---|---|
| STC / TRS | `custcol_l598_codigo_impuesto`, `custcol_l598_tasa_impuesto` en `item` y `expense` |
| TRS | `custbody_l598_nro_comprobante`, `custbody_l598_monto_escrito`, sucursal/serie, y las 6 `custcol` que completan las 3 SS del `afterSubmit` ([informe §5](refactors/2-transaccion-servidor.md#5-dependencias-y-alcance)) |
| ARI | `custcol_l598_rubro_iva`, `custcol_l598_rubro_iva_equival_ventas` (esta solo en líneas facturables con cliente) |
| CRT | La **URU-Retención** creada: cada línea de asiento (account / debit / credit / memo / entity / department / location / class), la sublista de detalle completa, los totales por tipo, `custbody_l598_fecha_venc_retenc` y el vínculo a la retención en la factura |

Si `custcol_l598_codigo_impuesto` difiere, el sospechoso es **TRS-D1** (orden de los tres escritores), no el refactor: anotarlo así.

**APM** para el par: GU y operaciones de registro por script. Expectativa: **sin cambio relevante** en ARI/CRT (B2 ahorra 1-2 búsquedas), y TRS con las mismas operaciones (A2 no aplica a `vendorbill`).

---

## 3. Bloque 13–15 — Caso B: NC de Compra + retención + resguardo (UAT Compras 07)

Mismo esquema: baseline = la UAT 07 existente; `_REF` = NC nueva con los mismos datos, que genera su Resguardo.

Es el caso de **mayor valor del día** para CRT, porque atraviesa exactamente los dos cambios más delicados:

- **Rama `vendorcredit`** (signos invertidos, `indFacturacion = 9`): ahí viven los 8 sitios de la **trampa de precedencia de C5** (`parseFloat(x) * toFixedOK(parseFloat(-1), 2)`). Comparar `custrecord_l598_ret_detalle_importe` e `_imp_ret_fina` con signo, y los débitos/créditos.
- **Resguardo → `beforeSubmit`**: `setearMontoEscrito` con la subsidiaria movida adentro (B2c), `letras()` con `Number()` en vez de `eval` (C3) y `getNumberLiteral` con 21 locales (D5). Comparar **`custbody_l598_monto_escrito` byte a byte**, `custbody_l598_resguardo_importe`, `custbody_l598_tipo_comprobante`, serie/sucursal/caja y `custbody_l598_resguardo_ret_det_json`.

Elegir un importe con miles ≠ 0 para no pisar el bug CRT-A8 (que existe en ambas versiones y confundiría la lectura). ARI: rama publicidad de `vendorcredit`.

---

## 4. Bloque 15–16 — Caso C: Orden de Venta (UAT Ventas 03)

- **SUI:** `custbody_l598_valor_unidad_indexada`. Se ejercita la rama TAFACE o la de `currency.exchangeRate` según la config de la cuenta; anotar cuál. *Desde 2026-10-08 ([§0.bis](#0bis-criterio-de-prueba-desde-2026-10-08)):* el original de SUI en la cuenta está reescrito sobre otra lib, así que acá se verifica solo el `_REF` (valor coherente con el código de `main`); la equivalencia la compara Tekiio.
- **TRS-A2 — el único lugar donde es observable.** En `salesorder` el `_REF` ya no hace `load()+save()`. APM debe mostrar **2 → 0 operaciones de registro** para TRS. Es la medición más limpia del día.
- STC sobre `salesorder`: ya caracterizado; sirve de control.

---

## 5. Bloque 16–18 — Caso D: Remito nuevo (Ventas 06), si hay tiempo

> 🔄 **Desde 2026-10-08 ([§0.bis](#0bis-criterio-de-prueba-desde-2026-10-08)):** el original de CDF en la cuenta difiere de `main` (+175/−46), así que este caso es **verificación solo del `_REF`**: aislamiento, sin errores, APM y JSON/XML coherentes con el código de `main`. La equivalencia contra el baseline la verifica Tekiio ([casos](#casos-para-tekiio)).

> ⏸️ **Stand-by (2026-10-14) — bloqueado por permisos.** Prerrequisitos **completos y verificados en la cuenta**: los 11 parámetros `custscript_l598_cdf_ref_*` existen en `customscript_l598_cdf_ss_ref` (id 706) con los **mismos valores** que el original `customdeploy2` (id 23); el deployment `customdeploy_l598_cdf_ref_itemfulfill` (id 352) está creado (`Testing`, audiencia rol Mobeats); el archivo del File Cabinet (id 15574) coincide por SHA-256 con `2497f19`. Aislamiento garantizado por rol: el original en Item Fulfillment tiene audiencia solo `URU - Contador`. Las OV viejas en Pending Fulfillment no ofrecen líneas (sin stock comprometido), así que se creó la **OV #53 (id 15957)**: `60 TK CLIENTE PRUEBA e-Factura`, 1 × `TK ARTICULO BIEN PRUEBA VENTA URUGUAY` (stock en Montevideo) = 1.220. **Queda en Pending Approval: ni el rol Mobeats ni `URU - Contador` pueden aprobar.** Permisos pedidos a Tekiio. Al retomar: aprobar la OV 53 → Fulfill con el rol **Mobeats** → compuerta del log, APM, JSON/XML y `custbody_l598_cae` vacío. Pendiente aparte: inactivar el Script record sobrante `customscript_l598_conex_directa_fe_ref` (id 705, sin deployment).
>
> **Gotchas del formulario `URU-Orden de venta electrónica`:** obligatorios de encabezado en *Localizaciones URU* (Serie `A`, Sucursal `0004 - TAFACE`, Caja `1`, Impuesto Tasa Mínima / Básica) y *To Be E-mailed* tildado por defecto sin email. Ambos disparan un `alert` nativo al guardar.

Requiere deployar el `_REF` en `itemfulfillment`. **Script record ya creado (2026-10-07):** ID `customscript_l598_cdf_ss_ref` (el `customscript_l598_conexion_directa_fe_ss_ref` previsto pasa de 28 caracteres), entry points `beforeLoad` + `afterSubmit`, archivo re-subido (360.07 KB). Deployment a crear: `customdeploy_l598_cdf_ref_itemfulfill`. Crear un Remito **nuevo** — nunca re-guardar los observados por CAE. Revisar los **archivos JSON y XML persistidos** en la transacción (se generan al guardar, aunque el CAE falle con 100000) y que `custbody_l598_cae` quede vacío. B3/B4 deberían mostrar 1 búsqueda y hasta 24 `config.load` menos en APM.

Antes del deploy (⏳ **todavía no creados**), crear en el Script record con **`New Parameter`** (el prefijo `custscript` ya está), copiando Type / List / Preference del original y el valor de cada deployment, los **11** que tiene el original en la cuenta: `_l598_cdf_ref_c_est_erro` · `_l598_cdf_ref_c_est_sine` · `_l598_cdf_ref_m_err_conf` · `_l598_cdf_ref_m_err_cae` · `_l598_cdf_ref_m_err_xml` · `_l598_cdf_ref_m_sin_err` · `_l598_cdf_ref_m_err_bot` · `_l598_cdf_ref_cod_fac_li` · `_l598_cdf_ref_agrupacion` · `_l598_cdf_ref_raz_glob_co` · `_l598_cdf_ref_form_pag_mu`. **No crear** `_l598_cdf_ref_com_est_rem_env`: su original `custscript_l598_com_estado_remito_enviad` no existe en la cuenta, así que lee `null` en ambas versiones. Mapeo a los IDs originales en [carga y deploy §3.bis](carga-y-deploy-de-scripts.md#3bis-parámetros-de-script-el-_ref-necesita-ids-propios).

---

## 6. Cierre del día

- [ ] Por cada caso: CSV baseline + CSV `_REF` + captura de APM guardados en `caracterizacion/` con el nombre del caso.
- [ ] Limpiar las retenciones/resguardos generados por las corridas `_REF` con UAT 09-10 (en verde).
- [ ] Resultado por script en su informe (§ Caracterización) y en el [registro](registro-aprobaciones.md) si algún Grupo A cambió de estado.
- [ ] Lo que no se llegó a probar queda escrito como pendiente, no como hecho.

**Lo que no entra hoy, a propósito:** Resguardo con CAE (UAT 05, observado), STC en tipos restantes, CDF-A7 (necesita logs de Tekiio), y cualquier corrección de Grupo A.
