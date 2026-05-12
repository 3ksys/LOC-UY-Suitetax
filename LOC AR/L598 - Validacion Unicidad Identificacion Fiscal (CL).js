/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 * @NAmdConfig /SuiteScripts/configuration_l598.json
 */

define(['L598/utilities', 'N/log', 'L598/funcionalidadesFiscales'],
    function (utilities, log, funcionalidadesFiscales) {

        function saveRecord(context) {
            const PROCESO = 'Validacion Unicidad de Numero de Identificacion Fiscal';
            console.log(PROCESO, 'INICIO');

            try {

                var respuesta = new Object();
                respuesta.error = false;
                respuesta.mensaje = '';

                var currentRecord = context.currentRecord;
                // INICIO - Validar Unicidad
                var entidadesEncontradas = funcionalidadesFiscales.validarEntidades(currentRecord);
                if (!utilities.isEmpty(entidadesEncontradas) && entidadesEncontradas.error == false) {
                    if (entidadesEncontradas.existenRegistros == true) {
                        alert("No es posible guardar la entidad debido a que existe una entidad con el mismo numero de Identificacion Fiscal");
                        console.log(PROCESO, 'FIN - Validacion de Unicidad de Numero Fiscal : Existe otra Entidad con el mismo Numero de Identificacion Fiscal');
                        return false;
                    }
                }
                else {
                    if (!utilities.isEmpty(entidadesEncontradas)) {
                        console.log(PROCESO, 'FIN - Error Consultando Entidades - Error : ' + entidadesEncontradas.mensaje);
                    }
                    else {
                        console.log(PROCESO, 'FIN - Error Consultando Entidades - Error : No se recibio respuesta de la Busqueda');
                    }
                }
                // FIN - Validar Unicidad
            }
            catch (excepcion) {
                console.log(PROCESO, 'FIN - Excepcion en Validacion de Unicidad de Numero de Identificacion Fiscal - Error : ' + JSON.stringify(excepcion.message));
                alert('Excepcion Realizando Validación de Unicidad de Numero Fiscal - Detalles : ' + JSON.stringify(excepcion.message));
                return true;
            }
            console.log(PROCESO, 'FIN - Validacion de Unicidad de Numero de Identificacion Fiscal - Respuesta : ' + JSON.stringify(respuesta));
            return true;
        }

        return {
            saveRecord: saveRecord
        };
    });