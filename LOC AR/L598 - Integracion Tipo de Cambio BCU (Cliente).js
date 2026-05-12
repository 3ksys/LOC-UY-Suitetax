/**
 * @NApiVersion 2.0
 * @NAmdConfig /SuiteScripts/configuration.json
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/currentRecord', 'N/ui/dialog', 'N/format', '3K/utilities'],

function (currentRecord, dialog, format, utilities) {

    function saveRecord(context) {
        var accion = currentRecord.get().getValue({fieldId : 'custpage_accion'});
        if (accion != 'ACTUALIZAR' && accion != 'CONSULTAR') {
            var fechaDeCampo = new Date(currentRecord.get().getValue({fieldId : 'custpage_fecha'}));
            var fechaDeNotif = format.format({
              value: fechaDeCampo,
              type: format.Type.DATE
            });
            //var fechaDeNotif = utilities.padding_left(f.getDate(), '0', 2)+'/'+utilities.padding_left(parseInt(f.getMonth())+1, '0', 2)+'/'+fechaDeNotif.getFullYear()

            dialog.confirm({
                title: "Atenci\u00F3n",
                message: "Se actualizara el tipo de cambio con el tipo de cambio consultado "+ fechaDeNotif +" Este proceso puede tardar algunos segundos. ¿Desea continuar?"
            })
            .then(function(res){
                if(res === true){
                    var record = currentRecord.get();
                    record.setValue({
                        fieldId : 'custpage_accion',
                        value : 'ACTUALIZAR'
                    });  
                    document.forms['main_form'].submitter.click(); 
                }
            })
            .catch(function(err){
                console.log('Algo fallo al intentar ejecutar el proceso: ' + err);
            });
        } else {
            return true;
        }
    }

    function consultarTipoCambio() {
        var record = currentRecord.get();

        record.setValue({
            fieldId : 'custpage_accion',
            value : 'CONSULTAR'
        });

        document.forms['main_form'].submitter.click();
    }    

    return {
        saveRecord: saveRecord,
        consultarTipoCambio: consultarTipoCambio
    };
});