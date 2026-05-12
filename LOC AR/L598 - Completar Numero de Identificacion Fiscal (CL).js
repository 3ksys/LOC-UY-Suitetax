/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 * @NAmdConfig /SuiteScripts/configuration_l598.json
 */

 define(['N/runtime', 'L598/utilities' , 'L598/funcionalidadesFiscales'],
 function (runtime, utilities, funcionalidadesFiscales) {

        function saveRecord (scriptContext) {
            var currScript = runtime.getCurrentScript();
            
            var proceso = 'Completar Numero de Identificacion Fiscal';

            var respuesta = new Object();
            respuesta.informar = false;
            respuesta.error = false;
            respuesta.mensaje = 'Proceso Correcto';

            try {
                log.audit(proceso, 'INICIO - Contexto : ' + scriptContext.type);
                    
                    var objRecord = scriptContext.currentRecord;
                    var paisValidacion = currScript.getParameter('custscript_l598_com_ident_fisc_cl_p');

                    if(!utilities.isEmpty(paisValidacion)){
                    // INICIO - Consultar Numero Fiscal
                    var detalleFiscal = funcionalidadesFiscales.consultarNumeroFiscal(objRecord,paisValidacion);
                    

                    if (!utilities.isEmpty(detalleFiscal) && detalleFiscal.error == false) {
                        if (detalleFiscal.existenRegistros == true) {

                            let numeroFiscal = detalleFiscal.numeroFiscal;
                            if(!utilities.isEmpty(numeroFiscal)){
                                objRecord.setValue('custentity_l598_nro_documento',numeroFiscal);
                            }
                            else{
                                respuesta.error = true;
                                respuesta.mensaje = 'Error Consultando Numero Fiscal - Error : No se recibio Numero Fiscal';
                                console.log(proceso, respuesta.mensaje);
                            }
                        }
                        else{
                            var numeroFiscal = objRecord.getValue('custentity_l598_nro_documento');
                            if(utilities.isEmpty(numeroFiscal)){
                                alert("No es posible guardar la entidad debido a que el Numero de Identificacion Fiscal es requerido");
                                console.log(PROCESO, 'No es posible guardar la entidad debido a que el Numero de Identificacion Fiscal es requerido');
                                return false;
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

                        console.log(proceso, respuesta.mensaje);

                        //throw new Error(respuesta.mensaje);
                    }
                    // FIN - Validar Unicidad
                }
                else{
                    respuesta.mensaje = 'Error Consultando Numero Fiscal - No se Recibio parametro de Pais de Validacion';
                    console.log(proceso, respuesta.mensaje);
                }
                console.log(proceso, 'FIN - Contexto : ' + scriptContext.type + ' - Detalle : ' + respuesta.mensaje);

            } catch (error) {
                console.log(proceso, 'Excepcion Completando el Numero Fiscal - Detalles : ' + error.message);
                return true;
            }
            return true;
        }

        return {
            saveRecord: saveRecord
        };
    });
