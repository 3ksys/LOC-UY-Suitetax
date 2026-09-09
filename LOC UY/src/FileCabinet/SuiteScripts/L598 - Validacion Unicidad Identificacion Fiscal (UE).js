/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 *@NModuleScope Public
 *@NAmdConfig /SuiteScripts/configuration_l598.json
 
 */
 define(['N/record', 'N/error', 'N/search', 'N/runtime', 'N/currency', 'L598/utilities' , 'L598/funcionalidadesFiscales'],
 function (record, error, search, runtime, currency, utilities, funcionalidadesFiscales) {

        let beforeSubmit = (scriptContext) => {
            var currScript = runtime.getCurrentScript();
            
            var proceso = 'Validacion Unicidad de Numero de Identificacion Fiscal';

            var respuesta = new Object();
            respuesta.error = false;
            respuesta.mensaje = 'Proceso Correcto';
            respuesta.mostrarMensaje = false;

            try {
                log.audit(proceso, 'INICIO - Contexto : ' + scriptContext.type);
                if (scriptContext.type != scriptContext.UserEventType.DELETE && scriptContext.type != scriptContext.UserEventType.VIEW) {
                    
                    var objRecord = scriptContext.newRecord;
                    
                    // INICIO - Validar Unicidad
                    var entidadesEncontradas = funcionalidadesFiscales.validarEntidades(objRecord);

                    if (!utilities.isEmpty(entidadesEncontradas) && entidadesEncontradas.error == false) {
                        if (entidadesEncontradas.existenRegistros == true) {
                            respuesta.error = true;
                            respuesta.mostrarMensaje = true;
                            respuesta.mensaje = 'No es posible guardar la entidad debido a que existe una entidad con el mismo numero de Identificacion Fiscal';
                            log.error(proceso, 'FIN - Contexto : ' + scriptContext.type + ' - Detalle : ' + respuesta.mensaje);
                        }
                    }
                    else {
                        respuesta.error = true;
                        if (!utilities.isEmpty(entidadesEncontradas)) {

                            respuesta.mensaje = 'Error Consultando Entidades - Error : ' + entidadesEncontradas.mensaje;
                        }
                        else {
                            respuesta.mensaje = 'Error Consultando Entidades - Error : No se recibio respuesta de la Busqueda';
                        }
                        
                        log.error(proceso, 'FIN - Contexto : ' + scriptContext.type + ' - Detalle : ' + respuesta.mensaje);
                        //throw new Error(respuesta.mensaje);
                    }
                    // FIN - Validar Unicidad

                }
                log.audit(proceso, 'FIN - Contexto : ' + scriptContext.type + ' - Detalle : ' + respuesta.mensaje);
            } catch (error) {
                respuesta.error = true;
                respuesta.mensaje = 'Excepcion Realizando Validación de Unicidad de Numero Fiscal - Detalles : ' + error.message;
                log.error(proceso, respuesta.mensaje);
                //throw new Error(respuesta.mensaje);
            }
            if(respuesta.error == true && respuesta.mostrarMensaje == true){
                throw new Error(respuesta.mensaje);
            }
        }

        return {
            beforeSubmit: beforeSubmit
        };
    });
