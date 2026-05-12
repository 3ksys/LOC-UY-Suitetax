/**
* @NApiVersion 2.1
* @NScriptType Suitelet
* @NModuleScope Public
*
*/

define(['N/record', 'N/format'],  function(record, format)  {

    function onRequest(context){
        
        var newRetencion = context.request.parameters.newRetencion;
        log.debug('entro', newRetencion)
        var registroURURetencion = JSON.parse(newRetencion);
        var errorGeneral = false;
        var idRetencion;
        var respuesta = { "error": false, "detalles_errores": [] };
        try {  
           
            var idRetencion = [];
            log.audit('L598 - Crear Retencion Detalle', 'INICIO - Tiempo: ' + new Date());
            log.debug('L598 - Crear Retencion Detalle','CREAR Retencion Detalle - registroURURetencion: ' + JSON.stringify(registroURURetencion) + ' ** TIEMPO' + new Date())
            for (i = 0 ; i<registroURURetencion.length; i++)  {
                var tipoTransaccionOriginal = registroURURetencion[i][11];
                var retImporteMO = 0.00;
                var retImporteAUXMO = 0.00;
                var indFacturacion;
                retImporteMO = parseFloat(registroURURetencion[i][10]).toFixedOK(2);
                if (tipoTransaccionOriginal == 'vendorbill') {
                    indFacturacion = 0;
                    retImporteAUXMO = retImporteMO;
                }
                if (tipoTransaccionOriginal == 'vendorcredit') {
                    indFacturacion = 9;
                    retImporteAUXMO = parseFloat(retImporteMO, 10) * parseFloat(-1, 10).toFixedOK(2);
                }
                var recURURetencion = record.create({ type: 'customrecord_l598_ret_detalle', isDynamic: true});
        
                //INICIO - CREACION URU-Retencion
                recURURetencion.setValue('custrecord__l598_ret_detalle_transaccion', registroURURetencion[i][0]);
                recURURetencion.setValue('custrecord_l598_ret_detalle_esta_rete_id', 'A');
                recURURetencion.setValue('custrecord_l598_ret_detalle_esta_rete', 'Pendiente por Resguardo');
                var fechaRetencion = new Date(registroURURetencion[i][3]);
                fechaRetencion = format.format({ value: fechaRetencion, type: format.Type.TEXT });
                recURURetencion.setValue('custrecord_l598_ret_detalle_fecha_trans', fechaRetencion);
                recURURetencion.setValue('custrecord_l598_ret_detalle_moneda_trans', registroURURetencion[i][4]);
                recURURetencion.setValue('custrecord_l598_ret_detalle_tipo_cambio', registroURURetencion[i][5]);
                recURURetencion.setValue('custrecord_l598_ret_detalle_tipo_ret', registroURURetencion[i][6]);
                recURURetencion.setValue('custrecord_l598_ret_detalle_cod_ret', registroURURetencion[i][7]);
                recURURetencion.setValue('custrecord_l598_ret_detalle_alicuota', registroURURetencion[i][8]);
                recURURetencion.setValue('custrecord_l598_ret_detalle_base_calculo', registroURURetencion[i][9]);
                recURURetencion.setValue('custrecord_l598_ret_detalle_base_cal_fin', registroURURetencion[i][9]); // informacionRetenciones.retencion_IVA[i].transacMontoNetXTC => informacionRetenciones.retencion_IVA[i].retBaseCalculo
                recURURetencion.setValue('custrecord_l598_ret_detalle_importe', retImporteAUXMO);
                recURURetencion.setValue('custrecord_l598_ret_detalle_imp_ret_fina', retImporteAUXMO);// retImporteAUX => retImporteAUXMO
                recURURetencion.setValue('custrecord_l598_ret_detalle_ind_facturac', indFacturacion);
                recURURetencion.setValue('custrecord_l598_ret_detalle_rectype', tipoTransaccionOriginal);
                recURURetencion.setValue('custrecord_l598_ret_detalle_pend_gen_ret',true);
                recURURetencion.setValue('custrecord_l598_ret_detalle_uru_cod_ret', registroURURetencion[i][12]);
                var idRetencionDetalle = recURURetencion.save({ ignoreMandatoryFields: true, enableSourcing: true });
                
                idRetencion.push(idRetencionDetalle);
            }
            log.debug('crearRetencion', 'idRetencion: ' + idRetencion);
            var respuestaRetencionJSON = JSON.stringify(idRetencion);
    
            // Configurar la respuesta como JSON
            //response.setContentType("JSON");
            context.response.write(respuestaRetencionJSON);
            
        }catch (e) {
            //response.setContentType("JSON");
            context.response.write(JSON.stringify({ error: e.toString() }));
            log.error('L598 - Crear Retencion', 'CREAR Retencion - Excepción Crear Retencion. Excepción: ' + e.message);
        } 
    }

    Number.prototype.toFixedOK = function (decimals) {
        var sign = this >= 0 ? 1 : -1;
        return (Math.round((this * Math.pow(10, decimals)) + (sign * 0.001)) / Math.pow(10, decimals)).toFixed(decimals);
    }

    return {
        onRequest: onRequest
    };
});




