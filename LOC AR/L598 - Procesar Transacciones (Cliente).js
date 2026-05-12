/**
 *@NApiVersion 2.1
 *@NAmdConfig /SuiteScripts/configuration.json
 *@NModuleScope Public
 */
define(["N/currentRecord"],
  function (currentRecord) {
    /* global define */
    /**
    *  Codigo migrado desde L598-ProcesarTransacciones-Cliente
    */
  
    function generarCAE() {
      const objRecord = currentRecord.get();
      objRecord.setValue({
        fieldId: "custpage_accion",
        value: "GENERAR_CAE"
      });
      document.forms["main_form"].submitter.click();
    }

    return {
      generarCAE
    };

  });
