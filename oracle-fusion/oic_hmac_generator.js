/**
 * Oracle Integration Cloud (OIC) - JavaScript Action / Library
 * Mekari Klikpajak CoreTax HMAC-SHA256 Header Generator
 *
 * This function can be imported into Oracle Integration Cloud (OIC) Libraries
 * and called inside an integration orchestration before invoking the REST Adapter.
 */

function generateKlikpajakHeaders(clientId, clientSecret, method, path, bodyString, customIdempotencyKey) {
    var crypto = require('crypto');

    // 1. UTC Date in RFC 1123 format (e.g. Thu, 15 Oct 2026 06:15:00 GMT)
    var dateString = new Date().toUTCString();

    // 2. Request Line: '[METHOD] [PATH] HTTP/1.1'
    var requestLine = method.toUpperCase() + ' ' + path + ' HTTP/1.1';

    // 3. Signing String
    var signingPayload = 'date: ' + dateString + '\n' + requestLine;

    // 4. HMAC-SHA256 signature
    var hmac = crypto.createHmac('sha256', clientSecret);
    hmac.update(signingPayload);
    var signature = hmac.digest('base64');

    // 5. Authorization header
    var authHeader = 'hmac username="' + clientId + '", algorithm="hmac-sha256", headers="date request-line", signature="' + signature + '"';

    // 6. SHA-256 Digest of Body
    var digestHeader = '';
    if (bodyString && bodyString.length > 0) {
        var hash = crypto.createHash('sha256').update(bodyString, 'utf8').digest('base64');
        digestHeader = 'SHA-256=' + hash;
    }

    // 7. X-Idempotency-Key (Oracle Fusion AR Transaction Number or AR-xxxx-1 for replacement)
    var idempotencyKey = customIdempotencyKey || ('OF-' + Date.now());

    return {
        "Authorization": authHeader,
        "Date": dateString,
        "Digest": digestHeader,
        "X-Idempotency-Key": idempotencyKey
    };
}

module.exports = {
    generateKlikpajakHeaders: generateKlikpajakHeaders
};
