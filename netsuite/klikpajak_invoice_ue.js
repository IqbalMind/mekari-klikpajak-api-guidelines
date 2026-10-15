/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 *
 * Mekari Klikpajak CoreTax - Sample Invoice User Event Script
 * Triggered after submit to generate/update Faktur Pajak Keluaran (Normal or Pengganti).
 */
define(['N/record', 'N/log', './klikpajak_hmac_service'], (record, log, klikpajakService) => {

    const CONFIG = {
        CLIENT_ID: 'YOUR_MEKARI_CLIENT_ID',
        CLIENT_SECRET: 'YOUR_MEKARI_CLIENT_SECRET',
        BASE_URL: 'https://sandbox-api.mekari.com'
    };

    function afterSubmit(context) {
        if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) {
            return;
        }

        const newRecord = context.newRecord;
        const invoiceId = newRecord.id;

        try {
            const invRecord = record.load({
                type: record.Type.INVOICE,
                id: invoiceId,
                isDynamic: false
            });

            const tranId = invRecord.getValue({ fieldId: 'tranid' }); // e.g. "INV-10023"
            const isReplacement = invRecord.getValue({ fieldId: 'custbody_kp_is_pengganti' }) || false;
            const originalKpId = invRecord.getValue({ fieldId: 'custbody_kp_original_faktur_id' }); // ID from previous submission
            const revisionCount = invRecord.getValue({ fieldId: 'custbody_kp_revision_count' }) || 0;

            // Determine X-Idempotency-Key & client_reference_id
            // Normal: INV-10023
            // Pengganti 1: INV-10023-1
            // Pengganti 2: INV-10023-2
            let idempotencyKey = tranId;
            let currentRevision = 0;
            if (isReplacement) {
                currentRevision = Number(revisionCount) + 1;
                idempotencyKey = `${tranId}-${currentRevision}`;
            }

            // Map NetSuite line items to CoreTax items
            const lineCount = invRecord.getLineCount({ sublistId: 'item' });
            const items = [];
            for (let i = 0; i < lineCount; i++) {
                const itemName = invRecord.getSublistText({ sublistId: 'item', fieldId: 'item', line: i });
                const rate = Number(invRecord.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i })) || 0;
                const qty = Number(invRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i })) || 1;
                const amount = Number(invRecord.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i })) || 0;
                const vatAmount = Number(invRecord.getSublistValue({ sublistId: 'item', fieldId: 'tax1amt', line: i })) || (amount * 0.12);

                items.push({
                    goods_service: 'GOODS',
                    goods_service_code: '000000',
                    goods_service_name: itemName || 'Item',
                    unit_price: rate,
                    unit_measurement: 'UNIT',
                    selling_price: amount,
                    quantity: qty,
                    discount: 0,
                    tax_base: amount,
                    other_tax_base: amount,
                    vat: vatAmount,
                    stlg_rate: 0,
                    stlg: 0
                });
            }

            const totalAmount = Number(invRecord.getValue({ fieldId: 'subtotal' })) || 0;
            const totalTax = Number(invRecord.getValue({ fieldId: 'taxtotal' })) || (totalAmount * 0.12);

            // Construct CoreTax payload
            const payload = {
                client_reference_id: idempotencyKey,
                transaction_detail: '04',
                additional_trx_detail: '00',
                substitution_flag: isReplacement,
                substituted_tax_invoice_id: isReplacement ? Number(originalKpId) : null,
                tax_invoice_number_term: '',
                description: isReplacement ? `Invoice Pengganti ke-${currentRevision}` : 'Invoice Penjualan Normal',
                document_date: new Date().toISOString().split('T')[0],
                reference: idempotencyKey,
                total_tax_base: totalAmount,
                total_other_tax_base: totalAmount,
                total_vat: totalTax,
                total_stlg: 0,
                total_price: totalAmount,
                total_discount: 0,
                downpayment_flag: 0,
                downpayment_stlg: 0,
                downpayment_tax_base: 0,
                downpayment_other_tax_base: 0,
                downpayment_vat: 0,
                customer: {
                    npwp: '1091031210912281', // Map from customer record custom field (e.g. custentity_npwp_16)
                    id_type: 'NPWP',
                    country_code: 'IDN',
                    other_id: '',
                    name: invRecord.getText({ fieldId: 'entity' }) || 'Customer',
                    address: invRecord.getValue({ fieldId: 'billaddress' }) || 'Jakarta',
                    nitku: '000000', // Map from customer record (e.g. custentity_nitku)
                    email: 'finance@customer.com'
                },
                items: items
            };

            log.audit({
                title: 'Submitting to Klikpajak CoreTax',
                details: { tranId: tranId, idempotencyKey: idempotencyKey, isReplacement: isReplacement }
            });

            const result = klikpajakService.createTaxInvoice({
                baseUrl: CONFIG.BASE_URL,
                clientId: CONFIG.CLIENT_ID,
                clientSecret: CONFIG.CLIENT_SECRET,
                payload: payload,
                idempotencyKey: idempotencyKey,
                autoApproval: false,
                autoCalculate: true
            });

            log.audit({
                title: 'Klikpajak API Response',
                details: result
            });

            // Update NetSuite Invoice custom fields with response
            if (result.status >= 200 && result.status < 300) {
                const responseData = result.body.data || {};
                record.submitFields({
                    type: record.Type.INVOICE,
                    id: invoiceId,
                    values: {
                        'custbody_kp_faktur_id': responseData.id || '',
                        'custbody_kp_faktur_status': responseData.status || 'DRAFT',
                        'custbody_kp_revision_count': currentRevision
                    }
                });
            } else {
                log.error({
                    title: 'Klikpajak Submission Failed',
                    details: result.body
                });
            }

        } catch (e) {
            log.error({
                title: 'Error in Klikpajak afterSubmit',
                details: e.toString()
            });
        }
    }

    return {
        afterSubmit: afterSubmit
    };
});
