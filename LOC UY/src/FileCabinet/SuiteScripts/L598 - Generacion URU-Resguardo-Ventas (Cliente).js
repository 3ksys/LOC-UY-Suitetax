/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/currentRecord', 'N/ui/dialog'],
    function (currentRecord, dialog) {
        function saveRecord(context) {
            //alert(currentRecord.get().getValue({fieldId : 'custpage_accion'}))
            if(currentRecord.get().getValue({fieldId : 'custpage_accion'}) != 'GENERARRESGUARDOS') {

                var options = {
                    title: "Atencion",
                    message: "Este proceso puede tardar algunos segundos, no debe cerrar la ventana durante la ejecución. ¿Desea continuar?"
                };

                function success(result) {
                    console.log('El usuario selecciono: ' + result);
                    if(result == true){
                        var record = currentRecord.get();

                        record.setValue({
                            fieldId : 'custpage_accion',
                            value : 'GENERARRESGUARDOS'
                        });                    

                        document.forms['main_form'].submitter.click();    
                    }
                }

                function failure(reason) {
                    console.log('Algo fallo al intentar ejecutar el proceso!');
                    return false;
                }

                dialog.confirm(options).then(success).catch(failure);
            } else{

                var html = '<font color="blue">' + 'Generando su solicitud...' + '</font><br><font>' + '(Por favor espere, ¡No cierre esta ventana!)' + '</font>';
                var idNetsuiteContainer = 'custpage_resultado_fs';

                javascript:document.getElementById(idNetsuiteContainer).innerHTML = html;

                return true;
            }
        }   
    return {
        saveRecord : saveRecord
    };
});
