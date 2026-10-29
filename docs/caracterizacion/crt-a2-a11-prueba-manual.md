# CRT-A2 y CRT-A11 — prueba manual en la cuenta (borrados)

> Estas dos pruebas **requieren borrar registros** en NetSuite. No las ejecuta el asistente (no borra datos); las hace una persona sobre registros de prueba. Cuenta `3KSYS-DEV` (tstdrv2734457), rol **URU-Contador Suitetax (Mobeats)**. Preparado el 2026-10-28.

## Qué se prueba y qué cambió

| Hallazgo | Evento que lo dispara | Antes del arreglo | Después (`_REF`, commit `b42c82e`) |
|---|---|---|---|
| **CRT-A2** | Borrar una **URU-Retención** (`DELETE` sobre `customtransaction_l598_retencion`) | `objRecord.delete(...)` no existe: cada línea lanzaba `TypeError`, se logueaba y los **URU-Retención Detalle quedaban huérfanos** | `record.delete({type, id})`: los detalles se borran |
| **CRT-A11** | Borrar un **URU-Resguardo** (`DELETE` sobre `customtransaction_l598_resguardos`) | `removeLine(sublista, 1)` con índice fijo: fallaba en la última iteración, el `save()` no se ejecutaba y se logueaba el error | `removeLine({sublistId, line})` en orden descendente: limpia toda la sublista y guarda |

Ambos corren en `beforeSubmit` del script `REF - L598 - Calcular Retenciones (SS)` (id 707), por los deployments `customdeploy_l598_crt_ref_retencion` (355) y `customdeploy_l598_crt_ref_resguardo` (356), Status Testing, solo para el rol de Mobeats.

## Antes de empezar (las dos)

1. Iniciá sesión con el rol **URU-Contador Suitetax (Mobeats)** (si usás otro rol, el `_REF` no corre).
2. Abrí en otra pestaña el log: Customization > Scripting > Scripts > `REF - L598 - Calcular Retenciones (SS)` > **Execution Log** (o `/app/common/scripting/script.nl?id=707`). Anotá la hora actual.
3. Todo es dato de prueba, pero un borrado de una transacción contable **no se deshace**: usá solo los candidatos de abajo o los que confirmes.

## A2 — borrar una URU-Retención

**Candidato:** URU-Retención **"Retencion ac3"** (id **15944**, 14/09/2026, estado *Generado*, vinculada a la factura #ac3 id 15941, **sin Resguardo**).
Ficha: `/app/accounting/transactions/transaction.nl?id=15944`. Tiene 4 líneas de retención: IRPF 35.000, IRNR 35.000, IRAE 40.000, IVA 34.100.

**Pasos:**
1. Abrí la ficha y, **antes de borrar**, mirá la pestaña **Localizaciones URU** (o la sublista *URU-Retención Detalle*): debería haber **4 detalles** (uno por tipo de retención). Anotá sus IDs internos.
2. `Edit` > `Actions` > **Delete** (el botón **Void** *no* sirve: no dispara el evento de borrado). Confirmá.
3. Volvé al Execution Log del script 707, filtrando por la hora de la prueba.

**Resultado esperado (A2 funciona):**
- En el log **no** aparece `Ocurrio un error al borrar URU-Retencion Detalle asociadas al registro URU-Retencion` (con `objRecord.delete is not a function`), que sí aparecía antes del arreglo.
- Los 4 URU-Retención Detalle **ya no existen** (buscalos por ID en la lista del tipo de registro *URU-Retención Detalle*).
- La factura #ac3 (id 15941) queda con `custbody_l598_cal_ret_auto` en falso (lo hace el mismo método con `submitFields`).

**Si falla:** hay un `ERROR` en el log con el motivo; copiá el título, hora y detalle.

## A11 — borrar un URU-Resguardo

**Candidato:** URU-Resguardo **#271** (id **15925**, 09/11/2026, *Sin informar a DGI*, proveedor "a proveedor 12", USD, importes IRPF 157.500 / IRNR 180.000 / IRAE 375.000 / IVA 297.000).
Ficha: `/app/accounting/transactions/custom.nl?id=15925&customtype=103`.
Es el mismo que se usó para verificar A1 (ERR002), que bloquea la **edición** pero no el borrado.

**Pasos:**
1. En la ficha, antes de borrar, mirá dos sublistas: **URU-Información Referencia** (líneas de referencia CFE) y **URU-Retención Detalle** (versión resguardo). Anotá cuántas líneas tiene cada una y a qué URU-Retención pertenecen los detalles.
2. `Edit` > `Actions` > **Delete**. Confirmá.
3. Abrí cada URU-Retención vinculada y mirá su estado.
4. Revisá el Execution Log del script 707.

**Resultado esperado (A11 funciona):**
- En el log **no** aparece `Ocurrio un error al borrar URU-Informacion Referencia asociadas al registro URU-Resguardo`, que sí aparecía antes porque el último `removeLine` fallaba.
- Las URU-Retenciones vinculadas vuelven a **"Pendiente de Resguardo"** (`transtatus = A`).
- No quedan referencias huérfanas.

**Ojo:** si el #271 no tiene líneas en *URU-Información Referencia*, la parte A11 propiamente dicha (el bucle de `removeLine`) no se ejercita; en ese caso elegí otro Resguardo sin informar a DGI que sí las tenga (Lists de URU-Resguardos, filtro *Status = SIN INFORMAR A DGI*, 134 resultados al 28/10/2026).

## Qué registrar después

- Hora, ID del registro borrado y resultado (OK / error con el texto del log).
- Pasarlo a `docs/refactors/3-calcular-retenciones-ss-bitacora.md` (tabla de estado) y a `docs/registro-aprobaciones.md`.

## Por qué no se probó por el botón ni por el camino automático

La búsqueda guardada `customsearch_l598_transaction_det_ret` de la cuenta está desalineada con la librería y con el `afterSubmit` (lectura por posición), así que ninguna vía puede **crear** retenciones hoy. Ver la bitácora de CRT.
