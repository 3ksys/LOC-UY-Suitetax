/**
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/configuration_l598.json
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(["N/record", "N/error", "N/search", "N/format", "N/ui/serverWidget", "N/file", "N/url", "N/https", "N/runtime", "URU/Validaciones_por_transaccion_mayor_a_5000_ui"],
    function (record, error, search, format, serverWidget, file, url, https, runtime, funcionalidadUi) {
        
        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function beforeSubmit(scriptContext) {
            let process = "URU - Validaciones por transaccion mayor a 5000 iu (SS)";
            try {

                const objRecord = scriptContext.newRecord;
                const validacionUi = funcionalidadUi.validarUnidadesIndexadas(objRecord);
                log.debug(process, 'validacionUi ss: ' + JSON.stringify(validacionUi));
                
                let esMayor = validacionUi.mayor5000;
                log.debug(process, 'esMayor: ' + esMayor);
            

                if (esMayor == true) {
                    let mensaje = 'Al superar las 5000 ui se deben completar los siguientes campos: URU-TIpo de Documento, URU-Numero de Documento, URU-Pais Origen'
                    throw new Error(mensaje);
                }
            } catch (e) {
                log.error(process, "ERROR EN EL EVENTO BEFORESUBMIT - CONTEXTO: " + scriptContext.type + " - EXCEPCIÓN DETALLES COMPLETO: " + JSON.stringify(e));

            }

        }

        return {
            beforeSubmit: beforeSubmit
        };
    });