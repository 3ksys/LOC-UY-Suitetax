/**
 * @NApiVersion 2.0
 * @NModuleScope Public
 */
define(['N/currentRecord'],
    function (currentRecord) {
    function generarResguardo() {
        var record = currentRecord.get();

        record.setValue({
            fieldId : 'custpage_accion',
            value : 'GENERARESGUARDO'
        });

        document.forms['main_form'].submitter.click();
    }

    return {
        generarResguardo : generarResguardo
    };
});
