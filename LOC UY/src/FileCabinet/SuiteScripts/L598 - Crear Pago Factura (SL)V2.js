/**
* @NApiVersion 2.0
* @NScriptType Suitelet
* @NModuleScope Public
*
*/

define(['N/record', 'N/search'],  function(record, search) {
    function onRequest(context){
        var pagoFactura = context.request.parameters.pagoFactura;
        var dataFactura = JSON.parse(pagoFactura);
        try {  
            log.audit('L598 - Crear Pago Factura', 'INICIO - Tiempo: ' + new Date());
            log.debug('L598 - Crear Pago Factura', 'CREAR PAGO FACTURA: ' + JSON.stringify(dataFactura) + ' ** TIEMPO' + new Date());
            var objVendPaymtRec = record.transform({
                fromType: 'vendorbill',
                fromId: dataFactura.transaction,
                toType: 'vendorpayment',
                isDynamic: true,
            });
            //var objVendPaymtRec = record.create({ type: 'vendorpayment', isDynamic: true});
            objVendPaymtRec.setValue('entity', dataFactura.entity);
            objVendPaymtRec.setValue('currency', dataFactura.currency);
            objVendPaymtRec.setValue('memo', dataFactura.memo);
            var intApplyLns = objVendPaymtRec.getLineCount('apply');
            for (var i = 0; i < intApplyLns; i++) {
            var internalId = objVendPaymtRec.getSublistValue('apply', 'internalid', i);
            if (internalId == dataFactura.retencion || internalId == dataFactura.transaction) {
                objVendPaymtRec.selectLine('apply', i);
                objVendPaymtRec.setCurrentSublistValue('apply', 'apply', true);
                objVendPaymtRec.commitLine('apply');
            }
            }
            var idVendPayment = objVendPaymtRec.save({ ignoreMandatoryFields: true, enableSourcing: false });
            log.debug('L598 - Crear Pago Factura', 'idVendPayment: ' + idVendPayment);
            var respuestaPagoFacturaJSON = JSON.stringify(idVendPayment);
            log.debug('respuestaPagoFacturaJSON', respuestaPagoFacturaJSON)
            log.audit('L598 - Crear Pago Factura', 'FIN - Tiempo: ' + new Date());
            // Configurar la respuesta como JSON
            
            context.response.write({ output: JSON.stringify(idVendPayment) });
        }catch (e) {
            context.response.write(JSON.stringify({ error: e.toString() }));
            log.error('L598 - Pago Factura', 'CREAR PAGO FACTURA - Excepción Crear Pago Factura. Excepción: ' + e.message);
        } 
    }

    return {
        onRequest: onRequest
    };
})
  