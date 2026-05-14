/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * @NAmdConfig /SuiteScripts/configuration_l598.json
 * @NModuleScope Public
 */
define(["N/log", "URU/Validaciones_por_transaccion_mayor_a_5000_ui"],
    /* global define log */
    /* eslint-disable no-var */
    function (log, funcionalidadUi) {
        
        function saveRecord(scriptContext) {
            var proceso = "Validaciones por transacción mayor a 5000 ui (CL)";
            try {
                log.debug(proceso, 'INICIO - saveRecord');

                var currentRecord = scriptContext.currentRecord;
                var validacionUi = funcionalidadUi.validarUnidadesIndexadas(currentRecord);
                log.debug(proceso, 'validacionUi: ' + JSON.stringify(validacionUi));
                var unidadesIndexadas = currentRecord.getValue({ fieldId: 'custbody_l598_valor_unidad_indexada' });

                
                if (validacionUi.mayor5000) {
                    if (!isEmpty(unidadesIndexadas)) {
                        // Validar si los campos tienen valor URU-TIpo de Documento, URU-Numero de Documento, URU-Pais Origen
                        var tipoDoc = normalize(currentRecord.getValue({ fieldId: 'custbody_l598_tipo_documento' }));
                        var numDoc = normalize(currentRecord.getValue({ fieldId: 'custbody_l598_nro_documento' }));
                        var paisOrigen = normalize(currentRecord.getValue({ fieldId: 'custbody_l598_pais_origen' }));
                        console.log('tipoDoc: ', tipoDoc)
                        console.log('numDoc: ', numDoc)
                        console.log('paisOrigen: ', paisOrigen)
    
                        var missingFields = [];
    
                        if (!tipoDoc) missingFields.push("URU-Tipo de Documento");
                        if (!numDoc) missingFields.push("URU-Número de Documento");
                        if (!paisOrigen) missingFields.push("URU-País de Origen");
    
                        if (missingFields.length > 0) {
                            var mensaje = "Al pasar de las 5000 UI se deben completar los siguientes campos:\n- " + missingFields.join("\n- ");
                            alert(mensaje);
                            return false;
                        }
                    } else {
                        var mensaje = "El campo URU-Valor Unidad Indexada debe estar completo.";
                        alert(mensaje);
                        return false;
                    }
                }
                
                log.debug(proceso, 'FIN - saveRecord');
                return true;

            } catch (e) {
                log.error(proceso, 'Function saveRecord: ' + e.message);
                return false;
            }
        }

        function normalize(value) {
            if (value === null || value === undefined) return "";
            return String(value).trim();
        }

        function isEmpty(value) {
            if (value === '') {
                return true;
            }

            if (value === null || value === 'null') {
                return true;
            }

            if (value === undefined || value === 'undefined') {
                return true;
            }

            return false;
        }

        return {
            saveRecord: saveRecord
        };

    });
