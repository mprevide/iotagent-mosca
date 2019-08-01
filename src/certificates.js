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
            "-----END X509 CRL-----\n";
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
     * @private
     * @param crlPEM
     */
    _updateRevokeSerialSet(crlPEM) {
        logger.debug(`Starting openssl parse CRL to add Revoke Serial Numbers `, TAG);
        openssl(['crl', '-in', {
            name: 'ca.crl',
            buffer: Buffer.from(crlPEM, 'ascii')
        }, '-text', '-noout'], (err, buffer) => {
            let crlTextBuffer = buffer.toString();
            if (err && err.length) {
                logger.warn(`OpenSSL error ${err.toString()}`, TAG);
            } else {
                if (Certificates._checkHasNoRevoked(crlTextBuffer)) {
                    this.revokeSerialNumberSet = new Set();
                    logger.debug(`No certificate revoked found.`, TAG);
                }
                const revokeSerialNumberArr = Certificates._extractSerialNumber(crlTextBuffer);
                this.revokeSerialNumberSet = new Set(revokeSerialNumberArr);
                logger.debug(`Revoked certificates serial numbers: ${revokeSerialNumberArr}`, TAG);
            }
        });
        logger.debug(`Finish openssl parse CRL to add Revoke Serial Numbers `, TAG);
    }

    /**
     * Check if there are no certificate revoked
     * @param crlTextBuffer
     * @returns {Boolean|*|Promise<Response | undefined>|RegExpMatchArray|never}
     * @private
     */
    static _checkHasNoRevoked(crlTextBuffer) {
        return crlTextBuffer.match(/^No Revoked Certificates.$/gm);
    }

    /**
     * Regex to extract array with revoked series numbers from crl
     * @param crlTextBuffer
     * @returns {RegExpMatchArray}
     * @private
     */
    static _extractSerialNumber(crlTextBuffer) {
        return crlTextBuffer
            .match(/(Serial Number: \w+)/gm)
            .join(" ")
            .match(/\b(?:(?!Serial|Number: )\w)+\b/gm);
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
                logger.debug(`HTTP response ${response}`, TAG);
                const {data: {CRL}} = response;
                this.crlPEM = Certificates._formatPEM(CRL);
                this._updateRevokeSerialSet(this.crlPEM);
            } else {
                logger.warn(`HTTP code ${response.status} to access ${url}`, TAG);
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
        return rawCertificate
            .toString('base64')
            .match(/.{0,64}/g)
            .join('\n');
    }
}

/**
 *
 * @type {{Certificates: Certificates}}
 */
module.exports = new Certificates();
