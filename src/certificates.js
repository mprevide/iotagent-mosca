"use strict";
const axios = require('axios');
const fs = require('fs');
const logger = require("@dojot/dojot-module-logger").logger;
const openssl = require('openssl-nodejs');
const config = require("./config");
const TAG = {filename: "certificates"};

/**
 * Header for axios request
 * @type {{headers: {Accept: string, "content-type": string}}}
 */
const httpHeader = {
    headers: {
        'content-type': 'application/json',
        'Accept': 'application/json'
    }
};

/**
 * Class responsible for maintaining and managing certificates,
 * currently CRL only, but is intended for all certificates.
 */
class Certificates {
    /**
     *
     */
    constructor() {
        //create crlPEM
        this.crlPEM = null;
        //filled crlPEM
        this._initCRL();

        this.revokeSerialNumberSet = new Set();
    }

    /**
     * Fills CRL with initial
     * @private
     */
    _initCRL() {
        if (config.mosca_tls.crl) {
            try {
                this.crlPEM = fs.readFileSync(config.mosca_tls.crl);
            } catch (err) {
                if (err.code === 'ENOENT') {
                    logger.warn(`CRL File not found`, TAG);
                } else {
                    throw err;
                }
            }
        }
    }

    /**
     * Returns CRL PEM
     * @returns {string|null|Buffer}
     */
    getCRLPEM() {
        return this.crlPEM;
    }

    /**
     *  Add PEM pattern headers
     * @param rawCRL
     * @returns {string}
     * @private
     */
    static _formatPEM(rawCRL) {
        return "-----BEGIN X509 CRL-----\n" +
            Certificates._format(rawCRL) +
            "\n-----END X509 CRL-----\n";
    }

    /**
     * Checks if a certificate is revoked by its serial number.
     * @param serialNumber
     * @returns {boolean}
     */
    hasRevoked(serialNumber) {
        return this.revokeSerialNumberSet.has(serialNumber);
    }

    /**
     * Update set with Certificate Revocation List
     * @param data
     * @private
     */
    _updateRevokeSerialSet(data) {
        openssl(['crl', '-in', {
            name: 'ca.crl',
            buffer: fs.readFileSync(config.mosca_tls.crl)
        }, '-text', '-noout'], (err, buffer) => {
            let crlTextBuffer = buffer.toString();
            if (!err) {
                if (crlTextBuffer.match(/^No Revoked Certificates.$/gm)) {
                    this.revokeSerialNumberSet = new Set();
                    logger.debug(`No certificate revoked found.`, TAG);
                }
                this.revokeSerialNumberSet = new Set(Certificates._extractSerialNumber(crlTextBuffer));
            } else {
                logger.warn(`OpenSSL error: ${err.toString()}`, TAG);
            }
        });
    }

    /**
     * Regex to extract array with revoked series numbers from crl
     * @param crlTextBuffer
     * @returns {RegExpMatchArray}
     * @private
     */
    static _extractSerialNumber(crlTextBuffer) {
        let found = crlTextBuffer.match(/(Serial Number: \w+)/gm).join(" ");
        found = found.match(/\b(?:(?!Serial|Number: )\w)+\b/gm);
        return found;
    }

    /**
     * Updates CRL from PKI
     */
    updateCRL() {
        logger.info(`Starting update CRL...`, TAG);
        const {pkiApiUrl, caName} = config.mosca_tls;
        const url = pkiApiUrl + '/ca/' + caName + "/crl?update=true";
        axios({
            method: 'GET',
            httpHeader,
            url: url,
        }).then(response => {
            if (response.status === 200) {
                const {data: {CRL}} = response;
                this.crlPEM = this._updateRevokeSerialSet(Certificates._formatPEM(CRL));
            } else {
                logger.warn(`HTTP ERROR to access ${url}`, TAG);
                logger.debug(`HTTP response ERROR ${response}`, TAG);
            }
        });
        logger.info(`... update CRL finish`, TAG);
    }

    /**
     * CRL Formats for PEM Body
     * @param rawCertificate
     * @returns {void | string | never}
     * @private
     */
    static _format(rawCertificate) {
        // crl = ("-----BEGIN X509 CRL-----\n"
        //     + re.sub("(.{64})", "\\1\n", crlPEM, 0, re.DOTALL)
        //     + "\n-----END X509 CRL-----\n")

        //derBuffer.toString('base64').match(/.{0,64}/_updateRevokeSerialSet).join('\n')
        return rawCertificate.replace("(.{64})", "\\1\n");
    }
}

/**
 *
 * @type {{Certificates: Certificates}}
 */
module.exports = new Certificates();
