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

## 1. Bloque 08–10 — Deploy aislado de los 4 `_REF` nuevos

Procedimiento por script: [carga y deploy §1-§4](carga-y-deploy-de-scripts.md#1-carga-del-archivo-al-file-cabinet). Carpeta del File Cabinet: `Refactor LOC URU - Mobeats`. Propietario: usuario Mobeats.

| Orden | Archivo | Script → Name (≤40) | Script → ID | Deployments (`Status = Testing`) |
|:--:|---|---|---|---|
| 1 | `L598 - Setear Unidad Indexada_REF.js` | `REF - L598 - Setear Unidad Indexada` | `customscript_l598_setear_unidad_indexada_ref` | `customdeploy_l598_sui_ref_salesorder` |
| 2 | `L598 - Asignar Rubro IVA_REF.js` | `REF - L598 - Asignar Rubro IVA` | `customscript_l598_asignar_rubro_iva_ref` | `customdeploy_l598_ari_ref_vendorbill` · `_vendorcredit` |
| 3 | `L598 -Transacción (Servidor)_REF.js` | `REF - L598 - Transaccion (Servidor)` | `customscript_l598_transaccion_servidor_ref` | `customdeploy_l598_trs_ref_vendorbill` · `_vendorcredit` · `_salesorder` |
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

- [ ] 4 Script records creados con archivo `_REF`, `node --check` ya pasó en el repo.
- [ ] 9 deployments en `Testing`, IDs según la tabla, parámetros cargados.
- [x] Rol activo = `URU-Contador Suitetax (Mobeats)`. **Humo y Prueba 1 cerradas el 2026-09-17** — resultados en [caracterización ola 3-6](caracterizacion/ola-3-6-pruebas-2026-09-17.md).
- [ ] Un guardado de humo en una **Orden de Venta nueva** → en Script Execution Logs aparecen `customscript_l598_setear_unidad_indexada_ref` y `customscript_l598_transaccion_servidor_ref`, y **no** `L598 - Setear Unidad Indexada` ni `L598 -Transacción (Servidor)`.

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

- **SUI:** `custbody_l598_valor_unidad_indexada`. Se ejercita la rama TAFACE o la de `currency.exchangeRate` según la config de la cuenta; anotar cuál.
- **TRS-A2 — el único lugar donde es observable.** En `salesorder` el `_REF` ya no hace `load()+save()`. APM debe mostrar **2 → 0 operaciones de registro** para TRS. Es la medición más limpia del día.
- STC sobre `salesorder`: ya caracterizado; sirve de control.

---

## 5. Bloque 16–18 — Caso D: Remito nuevo (Ventas 06), si hay tiempo

Requiere deployar `customscript_l598_conexion_directa_fe_ss_ref` en `itemfulfillment`. Crear un Remito **nuevo** — nunca re-guardar los observados por CAE. Comparar los **archivos JSON y XML persistidos** en la transacción (se generan al guardar, aunque el CAE falle con 100000) y que `custbody_l598_cae` quede vacío en ambos. B3/B4 deberían mostrar 1 búsqueda y hasta 24 `config.load` menos en APM.

---

## 6. Cierre del día

- [ ] Por cada caso: CSV baseline + CSV `_REF` + captura de APM guardados en `caracterizacion/` con el nombre del caso.
- [ ] Limpiar las retenciones/resguardos generados por las corridas `_REF` con UAT 09-10 (en verde).
- [ ] Resultado por script en su informe (§ Caracterización) y en el [registro](registro-aprobaciones.md) si algún Grupo A cambió de estado.
- [ ] Lo que no se llegó a probar queda escrito como pendiente, no como hecho.

**Lo que no entra hoy, a propósito:** Resguardo con CAE (UAT 05, observado), STC en tipos restantes, CDF-A7 (necesita logs de Tekiio), y cualquier corrección de Grupo A.
