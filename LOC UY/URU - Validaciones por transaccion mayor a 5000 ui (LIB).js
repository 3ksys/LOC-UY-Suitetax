/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define([],
    /* global define log */
    /* eslint-disable */

    function () {

        /***************************** FUNCIONES AUXILIARES - INICIO ********************************/

        function validarUnidadesIndexadas(registro) {
            const PROCESO = 'Validaciones por transacción mayor a 5000 ui';
            var respuesta = new Object();
            respuesta.error = false;
            respuesta.mensaje = '';
            respuesta.mayor5000 = false;

            try {

                if (!isEmpty(registro)) {
                    var esETicket = registro.getValue({ fieldId: 'custbody_l598_trans_eticket' });
                    if (esETicket) {
                        var ui = registro.getValue({ fieldId: 'custbody_l598_valor_unidad_indexada' });
                        log.debug(PROCESO, 'ui: ' + ui);
    
                        var subtotal = registro.getValue({ fieldId: 'subtotal' });
                        log.debug(PROCESO, 'subtotal: ' + subtotal);
                        
                        // Calculo de ui
                        var totalUi = subtotal / ui
                        log.debug(PROCESO, 'totalUi: ' + totalUi);
                        
                        respuesta.mayor5000 = totalUi > 5000;
                    }

                }
            }
            catch (e) {
                respuesta.error = true;
                respuesta.mensaje = 'Error validando la unidad indexada - Excepción : ' + JSON.stringify(e.message);
                log.debug(PROCESO, respuesta.mensaje);
            }
            log.debug(PROCESO, "respuesta: " + JSON.stringify(respuesta));
            return respuesta;
        }

        function isEmpty(value) {
            return value === '' || value === null || value === undefined || value === 'null' || value === 'undefined';
        };

        /***************************** FUNCIONES AUXILIARES - FIN ********************************/

        return {
            validarUnidadesIndexadas: validarUnidadesIndexadas
        };
    });