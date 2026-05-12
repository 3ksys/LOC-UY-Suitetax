/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 * @Author Jose Borja <jose.borja@tekiio.com.co>
 * @Description Copia campos del proveedor a la OC si vienen vacíos
 */
define(['N/search'], function (search) {
    const beforeSubmit = (context) => {
        try {
            const newRecord = context.newRecord;
            const MapeoCamposEntidad = {
                custbody_l598_nro_documento: "custentity_l598_nro_documento",
                custbody_l598_pais_origen: "custentity_l598_pais_origen",
                custbody_l598_razon_social_cliente: "custentity_l598_nombre_legal",
                custbody_l598_tipo_documento: "custentity_l598_tipo_documento",
                custbody_l598_codigo_ret_irae: "custentity_l598_codigo_ret_irae",
                custbody_l598_codigo_ret_irnr: "custentity_l598_codigo_ret_irnr",
                custbody_l598_codigo_ret_irpf: "custentity_l598_codigo_ret_irpf",
                custbody_l598_codigo_ret_iva: "custentity_l598_codigo_ret_iva"
            };
            const vendorId = newRecord.getValue({ fieldId: 'entity' });
            if (vendorId) {
                const columnas = Object.values(MapeoCamposEntidad);
                const vendorValues = search.lookupFields({
                    type: search.Type.VENDOR,
                    id: vendorId,
                    columns: columnas
                });
                Object.entries(MapeoCamposEntidad).forEach(([campoTransaccion, campoEntidad]) => {
                    const valor = vendorValues[campoEntidad];
                    if (!valor || (Array.isArray(valor) && valor.length === 0)) {
                        return;
                    }
                    if (!newRecord.getValue({ fieldId: campoTransaccion })) {
                        let valorFinal = null;
                        if (Array.isArray(valor)) {
                            valorFinal = valor[0].value;
                        } else {
                            valorFinal = valor;
                        }
                        if (valorFinal !== null && valorFinal !== '' && valorFinal !== undefined) {
                            newRecord.setValue({
                                fieldId: campoTransaccion,
                                value: valorFinal
                            });
                        }
                    }
                });
            }
        } catch (error) {
            log.error({
                title: 'Error en beforeSubmit',
                details: error
            });
        }
    };
    return {
        beforeSubmit
    };
});
