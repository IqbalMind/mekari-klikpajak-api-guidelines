/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 *
 * Mekari Klikpajak CoreTax (CTAS) - SuiteScript 2.1 Service Module
 * Handles HMAC-SHA256 authentication and e-Faktur submission from Oracle NetSuite.
 */
define(['N/crypto', 'N/encode', 'N/https'], (crypto, encode, https) => {

    /**
     * Generate RFC 1123 / UTC Date string (e.g. Thu, 15 Oct 2026 06:15:00 GMT)
     */
    function getRfc1123Date() {
        return new Date().toUTCString();
    }

    /**
     * Generate HMAC-SHA256 authentication and integrity headers for Mekari Klikpajak API.
     * 
     * @param {Object} options
     * @param {string} options.method - HTTP Method ('POST', 'GET', etc.)
     * @param {string} options.path - Endpoint path (e.g. '/v2/klikpajak/v2/efaktur/out')
     * @param {string} options.bodyString - JSON body string
     * @param {string} options.clientId - Mekari Client ID
     * @param {string} options.clientSecret - Mekari Client Secret
     * @param {string} [options.idempotencyKey] - Custom key (e.g. INVQBL0001 or INVQBL0001-1)
     * @returns {Object} Headers object
     */
    function generateHmacHeaders(options) {
        const method = options.method.toUpperCase();
        const path = options.path;
        const bodyString = options.bodyString || '';
        const clientId = options.clientId;
        const clientSecret = options.clientSecret;
        const idempotencyKey = options.idempotencyKey || ('NS-' + Date.now());

        // 1. Date header
        const dateString = getRfc1123Date();

        // 2. Request Line format: '[METHOD] [PATH] HTTP/1.1'
        const requestLine = `${method} ${path} HTTP/1.1`;

        // 3. Signing payload: 'date: <dateString>\n<requestLine>'
        const signingPayload = `date: ${dateString}\n${requestLine}`;

        // 4. HMAC-SHA256 signature using NetSuite N/crypto
        const hmacKey = crypto.createSecretKey({
            secret: clientSecret,
            encoding: encode.Encoding.UTF_8
        });

        const hmacObj = crypto.createHmac({
            algorithm: crypto.Hash.SHA256,
            key: hmacKey
        });
        hmacObj.update({ input: signingPayload, encoding: encode.Encoding.UTF_8 });
        const signature = hmacObj.digest({ outputEncoding: encode.Encoding.BASE_64 });

        // 5. Authorization header
        const authHeader = `hmac username="${clientId}", algorithm="hmac-sha256", headers="date request-line", signature="${signature}"`;

        const headers = {
            'Authorization': authHeader,
            'Date': dateString,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': idempotencyKey
        };

        // 6. SHA-256 Digest header of request body
        if (bodyString && bodyString.length > 0) {
            const hashObj = crypto.createHash({ algorithm: crypto.Hash.SHA256 });
            hashObj.update({ input: bodyString, encoding: encode.Encoding.UTF_8 });
            const bodyDigest = hashObj.digest({ outputEncoding: encode.Encoding.BASE_64 });
            headers['Digest'] = `SHA-256=${bodyDigest}`;
        }

        return headers;
    }

    /**
     * Submit CoreTax Single Tax Invoice from NetSuite
     * 
     * @param {Object} config
     * @param {string} config.baseUrl - 'https://sandbox-api.mekari.com' or 'https://api.mekari.com'
     * @param {string} config.clientId - Mekari Client ID
     * @param {string} config.clientSecret - Mekari Client Secret
     * @param {Object} config.payload - The CoreTax JSON payload object
     * @param {string} [config.idempotencyKey] - Transaction ID (e.g. TranID or TranID-1)
     * @param {boolean} [config.autoApproval=false]
     * @param {boolean} [config.autoCalculate=true]
     * @returns {Object} { status: number, body: Object }
     */
    function createTaxInvoice(config) {
        const path = '/v2/klikpajak/v2/efaktur/out';
        const queryParams = `?auto_approval=${config.autoApproval ? 'true' : 'false'}&auto_calculate=${config.autoCalculate !== false ? 'true' : 'false'}`;
        const fullUrl = `${config.baseUrl}${path}${queryParams}`;
        const bodyString = JSON.stringify(config.payload);

        const headers = generateHmacHeaders({
            method: 'POST',
            path: path,
            bodyString: bodyString,
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            idempotencyKey: config.idempotencyKey || config.payload.client_reference_id
        });

        const response = https.post({
            url: fullUrl,
            headers: headers,
            body: bodyString
        });

        let parsedBody;
        try {
            parsedBody = JSON.parse(response.body);
        } catch (e) {
            parsedBody = response.body;
        }

        return {
            status: response.code,
            body: parsedBody
        };
    }

    return {
        generateHmacHeaders: generateHmacHeaders,
        createTaxInvoice: createTaxInvoice
    };
});
