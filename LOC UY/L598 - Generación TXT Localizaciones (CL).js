/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 *@NModuleScope Public
 */
define(['N/currentRecord', 'N/ui/dialog'],

    function (currentRecord, dialog) {

        function saveRecord(context) {
            var accion = currentRecord.get().getValue({ fieldId: 'custpage_accion' });

            if (accion != 'GENERAR') {

                var options = {
                    title: "Atencion",
                    message: "Este proceso puede tardar algunos segundos. ¿Desea continuar?"
                };

                function success(result) {
                    console.log('El usuario seleccionó: ' + result);
                    if (result == true) {
                        var record = currentRecord.get();

                        record.setValue({
                            fieldId: 'custpage_accion',
                            value: 'GENERAR'
                        });

                        document.forms['main_form'].submitter.click();
                    }
                }

                function failure(reason) {
                    console.log('Algo falló al intentar ejecutar el proceso!');
                    return false;
                }

                dialog.confirm(options).then(success).catch(failure);
            } else {

                return true;
            }
        }

        return {
            saveRecord: saveRecord
        }
    });
