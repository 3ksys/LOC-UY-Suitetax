# Anexo — Flujo del tipo de CFE (evidencia para el error 100000)

Traza completa de cómo `L598 - Conexion Directa FE (SS).js` resuelve el tipo de CFE, usada como evidencia para el diagnóstico del error 100000. Se separó del [informe de análisis](5-conexion-directa-fe-ss.md) para que ese documento se lea rápido; acá no hay contenido nuevo ni recortado.

← [Informe de análisis](5-conexion-directa-fe-ss.md) · [Resumen de scripts críticos](../resumen-analisis-scripts-criticos.md)

---

## Anexo: flujo del tipo de CFE (evidencia para error 100000)

Mensaje en dev: `"TL tipo de CFE no es válido, posible error de sintaxis, código de error: 100000"` — rechazo de validación del payload por el servicio de firma (evidencia literal en [demo-tekiio-flujos-y-scripts.md §4](../analisis/demo-tekiio-flujos-y-scripts.md#4-evidencia-del-error-100000), transacción 15280). Mapeo del recorrido del **tipo de CFE** en este script, sin diagnóstico de causa raíz:

**Origen del valor (transacción):**
1. `custbody_l598_tipo_comprobante` — campo de lista "Tipo de Comprobante DGI" del body. Ningún script del repo lo setea para ventas (solo `Calcular Retenciones (SS)V2.js:2356` para resguardos) → en facturas viene del formulario/usuario/defaulting de la cuenta.
2. `custbody_l598_cod_tipo_comprobante` — el **código numérico** (101/111/etc., "ID de Transacción URUGUAY"). **Ningún script del repo lo escribe** (grep: solo lecturas) → se puebla por sourcing/fórmula/configuración en la cuenta. Punto de verificación #1 para Tekiio.

**Validación y selección de plantilla (`getConfigurationFE`):**
3. Se lee vía `lookupFields` (197-216); si `custbody_l598_cod_tipo_comprobante` está vacío o ≤0 → error "Falta Configurar el ID de Transacción Electrónica" (239-241, 468-470).
4. Con `custbody_l598_tipo_comprobante` (id de lista, 224) se filtra la SS `customsearch_l598_proveedor_fe_ss` por `custrecord_l598_prov_fe_comp_dgi_tip_com` (join `custrecord_l598_prov_fe_comp_dgi_prov_fe`, 252-268) + flag cobranza T/F según recType (270-284) + subsidiaria (244-249) → registro **URU-Proveedor FE Comprobantes DGI** → `idPlantillaXML` (321-323). Punto de verificación #2: que exista el mapeo proveedor↔tipo de comprobante para la subsidiaria (si no, error "No se Encuentra configurado el registro del Proveedor…", 456-458).

**Inyección en el payload (`afterSubmit` + `buscarInformacionFE`):**
5. `idTransaccionURU = columns[8]` de `customsearch_l598_trans_gen_cae_con_dire` (635, validado en 637). La correspondencia columns[8] ↔ `custbody_l598_cod_tipo_comprobante` es **inferencia fuerte** (mismo nombre de variable que en 239; el Suitelet usa el índice 8 para ese mismo campo en su propia búsqueda, `(SL).js:707`) — la definición de la SS vive en la cuenta. Punto de verificación #3: qué devuelve exactamente esa columna (valor vs texto vs fórmula).
6. El valor de `columns[8]` se copia a **tres** campos del payload: `objetoRespuesta.tipoComprobanteURU` (1405), `informacionAdicional.documentoTipo` (1474) y **`informacionEncabezado.tipoCFE` (1547)**.
7. Tipos de CFE de **referencias** (NC/ND/pagos): `infoReferencia.tipoCFE` sale de `columns[46]` (3378 → 3404) o, para cobranzas, de `columns[1]` de `customsearch_l598_trans_ref_custpayment` (3950); la rama de referencia global lo deja `''`/`0` (3394, 3895). Un tipo inválido también puede entrar por aquí.
8. El JSON completo se escribe a archivo (742-749, con `replace(/&/g,'Y')` en 740) y se renderiza contra la **plantilla XML del proveedor** (`file.load(idPlantillaXML)` 768-770; `addCustomDataSource` alias `informacionTransaccion`, 777-783). Punto de verificación #4: cómo la plantilla mapea `informacionTransaccion.informacionEncabezado.tipoCFE` al tag del XML final (un defecto de plantilla produciría exactamente un "tipo de CFE" inválido con el script sano).
9. El XML queda en `custbody_l598_documento_xml_fe` (795-801). El Suitelet lo lee y lo postea a `URLServicioFirma` (`(SL).js:163-169, 212, 226-227`); la respuesta del servicio contiene su propio tag `tipoCFE` (`(SL).js:570`).

**Acción inmediata disponible para Tekiio sin generar CAE:** abrir los archivos **XML y JSON ya persistidos** en la transacción 15280 (`custbody_l598_documento_xml_fe` / `custbody_l598_informacion_json_tran_fe`) y comparar el `tipoCFE` que contiene contra el catálogo DGI. Si el XML lleva un código válido → investigar configuración del servicio de firma/middleware; si lleva un valor anómalo (p. ej. el literal `TL` del mensaje, que podría ser un eco del valor recibido — *inferencia, no verificada*) → seguir la cadena hacia atrás por los puntos #1-#4 (campo código en la transacción → columna 8 de la SS → plantilla).

