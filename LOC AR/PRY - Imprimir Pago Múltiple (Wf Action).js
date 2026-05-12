/**
 *@NApiVersion 2.x
 *@NScriptType WorkflowActionScript
 *@NAmdConfig /SuiteScripts/configuration_l595.json
 */
define(
    [
        'L595/utilidades', 'N/redirect', 'N/runtime'
    ],
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @Since 2016.1
     */
    function (utilidades, redirect, runtime) {

        function onAction(scriptContext) {

            try {
                var recPayment = scriptContext.newRecord;
                var idPayment = recPayment.getValue({ fieldId: 'id' });
                var typePayment = recPayment.getValue({ fieldId: 'type' });
                var currentScript = runtime.getCurrentScript();
                var isOneWorld = runtime.isFeatureInEffect({
                    feature: "SUBSIDIARIES"
                });
                var idSubsidiaria = null;

                if (isOneWorld) {
                    idSubsidiaria = recPayment.getValue({ fieldId: 'subsidiary' });
                } else {
                    idSubsidiaria = null;
                }

                log.debug('onAction', 'ID Payment: ' + idPayment + ' --- type: ' + typePayment + ' ---- idSubsidiaria: ' + idSubsidiaria);

                var params = {};
                log.debug('onAction', 'LINE 63 - Estoy en: ' + typePayment.toUpperCase());

                if (typePayment.toUpperCase() == 'VENDPYMT') {
                    params.campoPDFPagoYRet = "custbody_l595_pdf_pago_retenciones";
                }
                params.idPago = idPayment;
                params.tipoPago = typePayment.toUpperCase(); // 'VENDORYPAYMENT' u 'ORDPAGO'
                params.numero = recPayment.getValue({ fieldId: 'transactionnumber' });
                params.subsidiaria = idSubsidiaria;
                params.guardarPago = "SI";
                params.esperarespuesta = "SI";

                log.debug('onAction', 'Id Transaction: ' + params.idPago + ', type: ' + typePayment + ', restoParams:' + JSON.stringify(params));

                redirect.toSuitelet({
                    scriptId: 'customscript_l595_imprim_pag_multp',
                    deploymentId: 'customdeploy_l595_imprimir_pago_mult_sl',
                    parameters: params,
                    returnExternalUrl: true
                });

                log.debug('onAction', 'FIN');

            } catch (e) {
                log.debug('onAction', 'Error Netsuite - Error: ' + e.message);
            }

            return true;
        }

        return {
            onAction: onAction
        };
    }
);
