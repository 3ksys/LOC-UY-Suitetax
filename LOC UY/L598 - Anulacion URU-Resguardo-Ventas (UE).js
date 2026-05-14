/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NAmdConfig /SuiteScripts/configuration_l598.json
 * @NModuleScope Public
 */
define(['N/record', 'N/log', 'N/search'],
function(record, log, search) {

    /**
     * Function definition to be triggered before record is loaded.
     */
    function beforeLoad(context) {
        try {
            var newRecord = context.newRecord;
            var recordType = newRecord.type;
            
            // Solo ejecutar en modo 'create' o 'copy'
            if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.COPY) {
                return;
            }
            
            // Verificar si el campo "URU-Resguardo Anulado" está lleno
            var resguardoAnuladoId = newRecord.getValue({
                fieldId: 'custbody_l598_resg_anulado'
            });
            
            
            if (!resguardoAnuladoId) {
                return;
            }

            
            // Cargar el resguardo anulado
            var resguardoAnulado = record.load({
                type: recordType,
                id: resguardoAnuladoId,
                isDynamic: false
            });
            
            // Copiar los campos relevantes del resguardo anulado
            var fieldsToCopy = [
                'subsidiary', 'currency', 'custbody_l598_resguardo_cliente','custbody_l598_resguardo_direccion_prov','custbody_l598_resguardo_ciudad',
                'custbody_l598_resguardo_pais','custbody_l598_resguardo_cod_postal','custbody_l598_tipo_documento','custbody_l598_nro_documento',
                'custbody_l598_razon_social_cliente','trandate', 'custbody_l598_resguardo_fecha_emision','custbody_l598_trans_interna','postingperiod'
            ];
            
            fieldsToCopy.forEach(function(fieldId) {
                var value = resguardoAnulado.getValue({
                    fieldId: fieldId
                });
                
                if (value) {
                    newRecord.setValue({
                        fieldId: fieldId,
                        value: value
                    });
                }
            });
            
            // Invertir los importes
            var importeTotal = resguardoAnulado.getValue({
                fieldId: 'custbody_l598_resguardo_importe' 
            });
            
            var importeCF416 = resguardoAnulado.getValue({
                fieldId: 'custbody_l598_cred_fisc_imp_416' 
            });

            var importeCF426 = resguardoAnulado.getValue({
                fieldId: 'custbody_l598_cred_fisc_imp_426' 
            });
            
            if (importeTotal) {
                newRecord.setValue({
                    fieldId: 'custbody_l598_resguardo_importe',
                    value: -(importeTotal)
                });
            }
            
            if (importeCF416) {
                newRecord.setValue({
                    fieldId: 'custbody_l598_cred_fisc_imp_416',
                    value: -(importeCF416)
                });
            }

            if (importeCF426) {
                newRecord.setValue({
                    fieldId: 'custbody_l598_cred_fisc_imp_426',
                    value: -(importeCF426)
                });
            }
            //Campos de Referencia
            var refCAE = resguardoAnulado.getValue({
                fieldId: 'custbody_l598_cae' 
            });
            var refTipoComp = resguardoAnulado.getValue({
                fieldId: 'custbody_l598_tipo_comprobante' 
            });
            var refSerie = resguardoAnulado.getValue({
                fieldId: 'custbody_l598_serie_comprobante' 
            });
            var refFecha = resguardoAnulado.getValue({
                fieldId: 'trandate' 
            });
            if (refCAE) {
                newRecord.setValue({
                    fieldId: 'custbody_l598_razon_comp_ref',
                    value: refCAE
                });
                newRecord.setValue({
                    fieldId: 'custbody_l598_nro_comp_ref',
                    value: refCAE
                });
            
            }
            if(refTipoComp){
                newRecord.setValue({
                    fieldId: 'custbody_l598_tipo_comp_ref',
                    value: refTipoComp
                });
            }
            if(refSerie){
                newRecord.setValue({
                    fieldId: 'custbody_l598_serie_comp_ref',
                    value: refSerie
                });
            }
            if(refFecha){
                newRecord.setValue({
                    fieldId: 'custbody_l598_fecha_comp_ref',
                    value: refFecha
                });
            }
            newRecord.setValue({
                fieldId: 'custbody_l598_referencia_global',
                value: false
            });
            newRecord.setValue({
                fieldId: 'custbody_l598_resguardo_anulacion',
                value: true
            });
            

            
            

            // Procesar la sublista de Detalle de Resguardo
            var sublistId = 'recmachcustrecord_l598_det_cre_fis_resg_rel';
            var lineCount = resguardoAnulado.getLineCount({
                sublistId: sublistId
            });
            
            // Campos de la sublista a copiar
            var sublistFields = [
                'custrecord_l598_det_cre_fis_resg_cod_for',
                'custrecord_l598_det_cre_fis_resg_alicuot',
                'custrecord_l598_det_cre_fis_resg_ind_fac',
                'custrecord_l598_det_cre_fi_res_ba_im_cre'
            ];
            
            // Eliminar líneas existentes si las hubiera
            var currentLineCount = newRecord.getLineCount({
                sublistId: sublistId
            });
            
            for (var i = currentLineCount - 1; i >= 0; i--) {
                newRecord.removeLine({
                    sublistId: sublistId,
                    line: i
                });
            }
            
            // Copiar líneas del resguardo anulado
            for (var i = 0; i < lineCount; i++) {
                // Insertar nueva línea
                var lineNum = newRecord.insertLine({
                    sublistId: sublistId,
                    line: i
                });
                
                // Copiar cada campo de la sublista
                sublistFields.forEach(function(fieldId) {
                    var value = resguardoAnulado.getSublistValue({
                        sublistId: sublistId,
                        fieldId: fieldId,
                        line: i
                    });
                    
                    // Para Indicador Facturacion, se marca en 9
                    if (fieldId === 'custrecord_l598_det_cre_fis_resg_ind_fac') {
                        value = 9;
                    }
                    
                    newRecord.setSublistValue({
                        sublistId: sublistId,
                        fieldId: fieldId,
                        line: i,
                        value: value
                    });
                });
            }
            
        } catch (e) {
            log.error({
                title: 'Error en beforeLoad',
                details: e.toString()
            });
        }
    }
    function afterSubmit(context) {
        try {
            var newRecord = context.newRecord;
            var recordType = newRecord.type;
            var resguardoAnuladoId = newRecord.getValue({fieldId: 'custbody_l598_resg_anulado'});
            
            if (!resguardoAnuladoId) return;

            var resguardoClienteId = newRecord.getValue({fieldId: 'custbody_l598_resguardo_cliente'});

            if (!resguardoClienteId) return;

            var importeTotal = newRecord.getValue({fieldId: 'custbody_l598_resguardo_importe'});

            if (importeTotal == 0) return;


            // 1. Buscar y actualizar factura relacionada
            var docSearch = search.create({
                type: 'transaction',
                filters: [
                    ['custbody_l598_link_uru_resguardo', 'is', resguardoAnuladoId],
                    'AND',
                    ['mainline','is','T']
                ],
                columns: ['internalid', 'recordtype']
            });

            var docIds = [];
            docSearch.run().each(function(result) {
                docIds.push({
                    id: result.id,
                    type: result.getValue('recordtype')
                });
                return true;
            });
            log.debug('docIds',docIds)
            // Eliminar referencia en documentos encontrados
            docIds.forEach(function(doc) {
                try {
                    record.submitFields({
                        type: doc.type,
                        id: doc.id,
                        values: {
                            'custbody_l598_link_uru_resguardo': null
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    });
                    
                    log.audit({
                        title: 'Documento actualizado',
                        details: 'Se eliminó referencia al resguardo anulado en Transaccion: ' + doc.id
                    });
                } catch (e) {
                    log.error({
                        title: 'Error actualizando documento ' + doc.id,
                        details: e.toString()
                    });
                }
            });

            // 2. Actualizar estado del resguardo anulado
            try {
                record.submitFields({
                    type: recordType,
                    id: resguardoAnuladoId,
                    values: {
                        'transtatus': 'C' // Anulado
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });
   
                log.audit({
                    title: 'Resguardo anulado actualizado',
                    details: 'Se actualizó el estado del resguardo: ' + resguardoAnuladoId
                });
            } catch (e) {
                log.error({
                    title: 'Error actualizando resguardo anulado',
                    details: e.toString()
                });
            }
            
        } catch (e) {
            log.error({title: 'Error en afterSubmit', details: e.toString()});
        }
    }

    return {
        beforeLoad: beforeLoad,
        afterSubmit: afterSubmit
    };
});