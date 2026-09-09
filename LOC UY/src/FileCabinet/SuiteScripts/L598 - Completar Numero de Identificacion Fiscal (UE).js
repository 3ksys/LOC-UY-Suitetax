/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 *@NModuleScope Public
 *@NAmdConfig /SuiteScripts/configuration_l598.json
 
 */
define(['N/record', 'N/error', 'N/search', 'N/runtime', 'N/currency', 'L598/utilities', 'L598/funcionalidadesFiscales'],
    function (record, error, search, runtime, currency, utilities, funcionalidadesFiscales) {

        let beforeSubmit = (scriptContext) => {
            var currScript = runtime.getCurrentScript();

            var proceso = 'Completar Numero de Identificacion Fiscal';

            var respuesta = new Object();
            respuesta.informar = false;
            respuesta.error = false;
            respuesta.mensaje = 'Proceso Correcto';

            try {
                log.audit(proceso, 'INICIO - Contexto : ' + scriptContext.type);
                if (scriptContext.type != scriptContext.UserEventType.DELETE && scriptContext.type != scriptContext.UserEventType.VIEW) {

                    var objRecord = scriptContext.newRecord;
                    var paisValidacion = currScript.getParameter('custscript_l598_com_ident_fisc_ue_p');

                    if (!utilities.isEmpty(paisValidacion)) {
                        // INICIO - Consultar Numero Fiscal
                        var detalleFiscal = funcionalidadesFiscales.consultarNumeroFiscal(objRecord, paisValidacion);

                        if (!utilities.isEmpty(detalleFiscal) && detalleFiscal.error == false) {
                            if (detalleFiscal.existenRegistros == true) {
                                let numeroFiscal = detalleFiscal.numeroFiscal;
                                if (!utilities.isEmpty(numeroFiscal)) {
                                    objRecord.setValue('custentity_l598_nro_documento', numeroFiscal);
                                }
                                else {
                                    respuesta.error = true;
                                    respuesta.mensaje = 'Error Consultando Numero Fiscal - Error : No se recibio Numero Fiscal';
                                    log.error(proceso, respuesta.mensaje);
                                }
                            }
                            else{
                                var numeroFiscal = objRecord.getValue('custentity_l598_nro_documento');
                                
                                if(utilities.isEmpty(numeroFiscal)){
                                    respuesta.informar = true;
                                    respuesta.error = true;
                                    respuesta.mensaje = 'El Numero de Identificación es requerido';
                                    log.error(proceso, respuesta.mensaje);
                                }
                            }
                        }
                        else {
                            respuesta.error = true;
                            if (!utilities.isEmpty(detalleFiscal)) {

                                respuesta.mensaje = 'Error Consultando Numero Fiscal - Error : ' + detalleFiscal.mensaje;
                            }
                            else {
                                respuesta.mensaje = 'Error Consultando Numero Fiscal - Error : No se recibio respuesta de la Busqueda';
                            }

                            log.error(proceso, 'FIN - Contexto : ' + scriptContext.type + ' - Detalle : ' + respuesta.mensaje);
                            //throw new Error(respuesta.mensaje);
                        }
                        // FIN - Validar Unicidad
                    }
                    else {
                        respuesta.mensaje = 'Error Consultando Numero Fiscal -  No se Recibio parametro de Pais de Validacion';
                        log.error(proceso, respuesta.mensaje);
                    }
                }
                log.audit(proceso, 'FIN - Contexto : ' + scriptContext.type + ' - Detalle : ' + respuesta.mensaje);
            } catch (error) {
                log.error(proceso, 'Excepcion Completando el Numero Fiscal - Detalles : ' + error.message);
            }
            if(respuesta.error == true && respuesta.informar == true){
                throw new Error(respuesta.mensaje);
            }
        }

        return {
            beforeSubmit: beforeSubmit
        };
    });
