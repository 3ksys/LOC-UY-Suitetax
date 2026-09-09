/**
* @NApiVersion 2.1
* @NScriptType Suitelet
* @NModuleScope Public
*
*/

define(['N/record', 'N/search'],  function(record, search)  {
    
    function onRequest(context){
        var newResguardo = context.request.parameters.newResguardo;
        var registroURURetencion = JSON.parse(newResguardo);
        var errorGeneral = false;
        var idResguardo;
        var respuesta = { "error": false, "detalles_errores": [] };
        try {  

            log.audit('L598 - Crear Resguardo', 'INICIO - Tiempo: ' + new Date());
            log.debug('L598 - Crear Resguardo', 'CREAR RESGUARDO - registroURURetencion: ' + JSON.stringify(registroURURetencion) + ' ** TIEMPO' + new Date());

            var recURUResguardo = record.create({ type: 'customtransaction_l598_resguardos', isDynamic: true});
           

            //INICIO - CREACION URU-RESGUARDO

            if (l598esOneworld()) {
                recURUResguardo.setValue('subsidiary', registroURURetencion.subsidiaria);
            }

            recURUResguardo.setValue('currency', registroURURetencion.moneda);
            recURUResguardo.setValue('custbody_l598_resguardo_proveedor', registroURURetencion.idProveedor);
            recURUResguardo.setValue('custbody_l598_resguardo_direccion_prov', registroURURetencion.direccion);
            recURUResguardo.setValue('custbody_l598_resguardo_ciudad', registroURURetencion.ciudad);
            recURUResguardo.setValue('custbody_l598_resguardo_pais', registroURURetencion.pais);
            recURUResguardo.setValue('custbody_l598_tipo_documento', registroURURetencion.tipoDocumento);
            recURUResguardo.setValue('custbody_l598_nro_documento', registroURURetencion.nroDocumento);
            recURUResguardo.setValue('custbody_l598_razon_social_cliente', registroURURetencion.razonSocial);
            recURUResguardo.setValue('transtatus', 'A');

            var fechaResguardo = new Date(registroURURetencion.fechaResguardo);
            recURUResguardo.setValue('trandate', fechaResguardo);

            var fechaEmisionResguardo = new Date(registroURURetencion.fechaEmisionResguardo);
            recURUResguardo.setValue('custbody_l598_resguardo_fecha_emision', fechaEmisionResguardo);
            //nlapiLogExecution('DEBUG', 'registroURURetencion.idPeriodoContable', 'registroURURetencion.idPeriodoContable: ' + registroURURetencion.idPeriodoContable);
            recURUResguardo.setValue('postingperiod', registroURURetencion.periodo);

            var idsRetenciones = registroURURetencion.idsRetencionesDet.toString();
            var arrayIdRetenciones = idsRetenciones.split(',');
            log.debug('arrayIdRetenciones', 'arrayIdRetenciones: ' + arrayIdRetenciones.length);
            //INICIO - DETERMINAR IMPORTE TOTAL DEL URU-RESGUARDO, ARRAY DE URU-RETENCION DETALLE Y ARRAY DE URU-RETENCION
            if (!isEmpty(arrayIdRetenciones) && arrayIdRetenciones.length > 0){
                var tipoRecord = 'customrecord_l598_ret_detalle'; // Cambia esto al tipo de registro que deseas buscar
                var searchId = 'customsearch_l598_ret_detalle'; // Cambia esto al ID de la búsqueda que deseas ejecutar
            
                // Ejecuta la búsqueda y obtén los resultados

                var searchCustom = search.load({ id: searchId }),   
                filters = searchCustom.filters;
                var filterOne = search.createFilter({ name: 'internalid', operator: search.Operator.ANYOF, values: arrayIdRetenciones });
                filters.push(filterOne);
                var filterTwo = search.createFilter({ name: 'custrecord_l598_ret_detalle_resguardo', operator: search.Operator.ANYOF, values: '@NONE@' });
                filters.push(filterTwo);

                var results = searchCustom.run().getRange({ start: 0, end: 1000 });
                var arrayIdRetDetalle = [];
                var arrayUruRetencion = [];
                var arrayReferenciasAUX = [];
                var importeTotalRet = 0.00;
                var importeRetIRPF = 0.00;
                var importeRetIRNR = 0.00;
                var importeRetIRAE = 0.00;
                var importeRetIVA = 0.00;

                if (!isEmpty(results) && results.length > 0) {
                    for (var cont = 0; cont < results.length; cont++) {
                        var resultSearch = results[cont];
                        var columns = resultSearch.columns;
                        var idRetDetalle = resultSearch.getValue(columns[0]);
                        var idURURetencion = resultSearch.getValue(columns[1]);
                        var importeTotalRetAux = resultSearch.getValue(columns[12]);
                        var tipoRet = resultSearch.getValue(columns[18]);
                        var referenciaCFE = resultSearch.getValue(columns[4]);
        /*                             nlapiLogExecution('DEBUG', 'idRetDetalle', 'idRetDetalle: ' + idRetDetalle);
                        nlapiLogExecution('DEBUG', 'idURURetencion', 'idURURetencion: ' + idURURetencion);
                        nlapiLogExecution('DEBUG', 'importeTotalRetAux', 'importeTotalRetAux: ' + importeTotalRetAux);
                        nlapiLogExecution('DEBUG', 'tipoRet', 'idURURetencion: ' + tipoRet);
                        nlapiLogExecution('DEBUG', 'referenciaCFE', 'referenciaCFE: ' + referenciaCFE); */
                        if (tipoRet == 1) // IRPF
                            importeRetIRPF = parseFloat(importeTotalRetAux) + parseFloat(importeRetIRPF);

                        if (tipoRet == 2) // IRNR
                            importeRetIRNR = parseFloat(importeTotalRetAux) + parseFloat(importeRetIRNR);

                        if (tipoRet == 3) // IVA
                            importeRetIVA = parseFloat(importeTotalRetAux) + parseFloat(importeRetIVA);

                        if (tipoRet == 4) // IRAE
                            importeRetIRAE = parseFloat(importeTotalRetAux) + parseFloat(importeRetIRAE);

                        importeTotalRet = parseFloat((parseFloat(importeTotalRetAux) + parseFloat(importeTotalRet)),10).toFixedOK(2);
                        log.audit('importeTotalRet', 'importeTotalRet'+ importeTotalRet);
                        arrayIdRetDetalle.push(idRetDetalle);
                        arrayUruRetencion.push(idURURetencion);
                        arrayReferenciasAUX.push(referenciaCFE);
                    }
                } else {
                    var mensajeError = 'No se encontraron registros de URU-Retencion Detalle para los IDs: ' + arrayIdRetenciones.toString();
                    respuesta.error = true;
                    respuesta.detalles_errores.push(mensajeError);
                    log.error('Generacion URU-Resguardo', mensajeError);
                    errorGeneral = true;
                }
            }
            //FIN - DETERMINAR IMPORTE TOTAL DEL URU-RESGUARDO, ARRAY DE URU-RETENCION DETALLE Y ARRAY DE URU-RETENCION

            if (!isEmpty(importeTotalRet)) {
                recURUResguardo.setValue('custbody_l598_resguardo_importe', importeTotalRet);
                recURUResguardo.setValue('custbody_l598_retencion_imp_ret_irpf', importeRetIRPF);
                recURUResguardo.setValue('custbody_l598_retencion_imp_ret_irnr', importeRetIRNR);
                recURUResguardo.setValue('custbody_l598_retencion_imp_ret_irae', importeRetIRAE);
                recURUResguardo.setValue('custbody_l598_retencion_imp_ret_iva', importeRetIVA);
                recURUResguardo.setValue('custbody_l598_resguardo_ret_det_json', arrayIdRetDetalle.toString());
            }

            if (!errorGeneral)
            {
                if(!isEmpty(arrayReferenciasAUX) && arrayReferenciasAUX.length>0)
                {
                    var arrayReferencias = arrayReferenciasAUX.filter(function(elem, index, self) {
                        return index == self.indexOf(elem);
                    });
                }

                //log.debug('LINE 669','arrayReferencias: '+JSON.stringify(arrayReferencias));

                for (var i = 0; !isEmpty(arrayReferencias) && i < arrayReferencias.length; i++) {
                    var refCFE = arrayReferencias[i];
                    recURUResguardo.selectNewLine('recmachcustrecord_l598_info_referencia_transac');
                    recURUResguardo.setCurrentSublistValue('recmachcustrecord_l598_info_referencia_transac', 'custrecord_l598_info_referencia_razon', refCFE);
                    recURUResguardo.commitLine('recmachcustrecord_l598_info_referencia_transac');
                }

                //SE VERIFICA SI SE AGREGARON REFERENCIA CFE
                var numRefCFE = recURUResguardo.getLineCount('recmachcustrecord_l598_info_referencia_transac');
                if (numRefCFE > 0) {
                    recURUResguardo.setValue('custbody_l598_referencia_global', true);
                }

                try {
                    idResguardo = recURUResguardo.save();
                } catch (excepcion) {
                    errorGeneral = true;
                    var mensajeError = 'Excepcion ocurrida mientras se creaba la transaccion de URU-Resguardo';
                    respuesta.error = true;
                    respuesta.detalles_errores.push(mensajeError);
                    if (!isEmpty(excepcion) && !isEmpty(excepcion.message)) {
                        mensajeError = 'Excepcion ocurrida mientras se creaba la transaccion de URU-Resguardo - Excepcion  : ' + excepcion.message.toString();
                    }
                   log.error('Generacion URU-Resguardo', mensajeError);
                }
                log.debug('Generacion URU-Resguardo', 'URU-RESGUARDO GENERADO ID: ' + idResguardo);
                //SI SE CREO OK LA TRANSACCION DE URU-RESGUARDO
                if (!isEmpty(idResguardo) && !errorGeneral) {
                    if (!isEmpty(arrayIdRetDetalle) && arrayIdRetDetalle.length > 0) {
                        for (var i=0; !isEmpty(arrayIdRetDetalle) && i < arrayIdRetDetalle.length; i++) {
                            try {
                                var idRetDetalle = arrayIdRetDetalle[i];
                                record.submitFields({
                                    type: 'customrecord_l598_ret_detalle',
                                    id: idRetDetalle,
                                    values: {
                                      "custrecord_l598_ret_detalle_resguardo": idResguardo,
                                      "custrecord_l598_ret_detalle_status_resgu": "A"
                                    }
                                  });
                               } catch (excepcion) {
                                errorGeneral = true;
                                var mensajeError = 'Excepcion ocurrida mientras se actualizaba el link del resguardo en el registro de URU-Retencion Detalle con ID: ' + idRetDetalle;
                                respuesta.error = true;
                                respuesta.detalles_errores.push(mensajeError);
                                if (!isEmpty(excepcion) && !isEmpty(excepcion.message)) {
                                    mensajeError = 'Excepcion ocurrida mientras se actualizaba el link del resguardo en el registro de URU-Retencion Detalle con ID: ' + idRetDetalle + '. Detalles: ' + excepcion.message.toString();
                                }
                                log.error('Generacion URU-Resguardo', mensajeError);
                            }
                        }
                    }

                    //INICIO - ACTUALIZAR IMPORTE TOTAL DEL RESGUARDO
                    //log.debug('LINE 549','importeTotalRet: '+importeTotalRet);
                    if ((importeTotalRet > 0.00) && !errorGeneral) {
                        try {
                            var newrecord = record.load({
                                type: 'customtransaction_l598_resguardos',
                                id: idResguardo
                              });
                            newrecord.setValue('custbody_l598_resguardo_importe', importeTotalRet);
                            
                            // Guarda el registro usando nlapiSubmitRecord
                            newrecord.save({
                                enableSourcing: true,
                                ignoreMandatoryFields: true
                              });
                        } catch (excepcion) {
                            errorGeneral = true;
                            var mensajeError = 'Excepcion ocurrida mientras se actualizaba el importe total de la transacción URU-Resguardo con ID: ' + idResguardo;
                            respuesta.error = true;
                            respuesta.detalles_errores.push(mensajeError);
                            if (!isEmpty(excepcion) && !isEmpty(excepcion.message)) {
                                mensajeError = 'Excepcion ocurrida mientras se actualizaba el importe total de la transacción URU-Resguardo con ID: ' + idResguardo + '. Detalles: ' + excepcion.message.toString();
                            }
                            log.error('Generacion URU-Resguardo', mensajeError);
                        }
                    }
                    record.submitFields({
                        type: 'customtransaction_l598_retencion',
                        id: idURURetencion,
                        values: {
                          "custbody_l598_link_uru_resguardo": idResguardo
                        }
                      });
                    //FIN - ACTUALIZAR IMPORTE TOTAL DEL RESGUARDO
                }                     
                //FIN - CREACION URU-RESGUARDO
            }

            //SI EL PROCESO SE EJECUTA OK SE INFORMA VIA EMAIL AL USUARIO
        /*       if (!isEmpty(idResguardo) && !errorGeneral) {                     
                //INICIO - ENVIO EMAIL      
                var host = 'https://tstdrv1195989.app.netsuite.com';

                var url = nlapiResolveURL('RECORD', 'customtransaction_l598_resguardos', idResguardo, 'VIEW');
                nlapiLogExecution('DEBUG', 'url', 'url: ' + url);
                var urlRT = host + url;
                var mensajeErrorGeneral = 'El proceso de Generación Transacción URU-Resguardo';
                var mensajeOKGeneral = 'El proceso de Generación Transacción URU-Resguardo finalizó correctamente';
                var autor = registroURURetencion.autor;
                nlapiLogExecution('DEBUG', 'Generacion URU-Resguardo autor', 'autor: ' + autor);
                var destinatario = autor;
                var mensajeMail = mensajeOKGeneral;
                var link = '';
                if (!isEmpty(urlRT))
                    link = 'Puede observar el detalle de la transaccion URU-Resguardo en el siguiente link <br> <a href="' + urlRT + '">Transacción URU-Resguardo '+idResguardo+'</a>'

                var titulo = 'Proceso Generación Transacción URU-Resguardo';
                var mensaje = '<html><head></head><body><br>' + mensajeMail + '<br>' + link + '</body></html>';
                enviarEmail(autor, destinatario, titulo, mensaje);
                //FIN - ENVIO EMAIL      
            } */

            //SI OCURRE ERROR EN ALGUNA ETAPA DEL PROCESO SE INFORMA POR EMAIL AL USUARIO
        /*       if (errorGeneral) {
                var mensajeErrorGeneral = 'El proceso de Generación Transacción URU-Resguardo finalizó con errores. Detalles: ';
                var autor = registroURURetencion.autor;
                var destinatario = autor;
                var mensajeMail = mensajeErrorGeneral;
                var retenciones = '';
                var retencionesDet = '';
                var resguardo = '';
                var body = JSON.stringify(respuesta);
                var titulo = 'Error en Proceso Generación Transacción URU-Resguardo';
                var mensaje = '<html><head></head><body><br>' + mensajeMail + '<br>' + body + '</body></html>';
                enviarEmail(autor, destinatario, titulo, mensaje);
                nlapiLogExecution('ERROR', 'Generacion URU-Resguardo', 'Respuesta JSON: ' + JSON.stringify(respuesta));
            } */

            if (!errorGeneral) {
                log.debug('Generacion URU-Resguardo', 'Respuesta JSON: ' + JSON.stringify(respuesta));
            }
             log.debug("Calculo Retenciones", "Respuesta : " + JSON.stringify(idResguardo));
            context.response.write({ output: JSON.stringify(idResguardo) });
        }catch (e) {
           
            context.response.write(JSON.stringify({ error: e.toString() }));
            log.error('L598 - Crear Resguardo', 'CREAR RESGUARDO - Excepción Crear Resguardo. Excepción: ' + e.message);
        } 
    }

    Number.prototype.toFixedOK = function (decimals) {
        var sign = this >= 0 ? 1 : -1;
        return (Math.round((this * Math.pow(10, decimals)) + (sign * 0.001)) / Math.pow(10, decimals)).toFixed(decimals);
    }

    function isEmpty(value) {
        if (value === '') {
            return true;
        }
      
        if (value === null) {
            return true;
        }
      
        if (value === undefined) {
            return true;
        }
        return false;
    }

    function l598esOneworld() {

        var mySS = search.create({
            type: "customrecord_l598_datos_impositivos_emp",
            filters:
            [
               ["isinactive","is","F"], 
               "AND", 
               ["custrecord_l598_dat_imp_es_oneworld","is","T"]
            ]
        });

        var mySSResul = mySS.run().getRange(0,1);
        if (mySSResul != null && mySSResul.length > 0)
            return true
        else
            return false
    }

    

    return {
        onRequest: onRequest
    }
})


