"use strict";
const axios = require('axios');
const util = require("util");
const logger = require("@dojot/dojot-module-logger").logger;
const openssl = require('openssl-nodejs');
const config = require("./config");
const TAG = {filename: "certificates"};

/**
 * Class responsible for managing certificates,
 * currently CRL only, but intended for all certificates.
 */
class Certificates {

    /**
     *
     */
    constructor() {
        this.crlPEM = null;
        this.revokeSerialNumberSet = new Set();
    }

    /**
     * Returns CRL PEM
     * @returns {string|null|Buffer}
     */
    getCRLPEM() {
        return this.crlPEM;
    }

    /**
     * Checks if a certificate is revoked by serial number
     * @param serialNumber
     * @returns {boolean}
     */
    hasRevoked(serialNumber) {
        return this.revokeSerialNumberSet.has(serialNumber);
    }

    /**
     * Update set with Certificate Revocation List
     * @private
     */
    _updateRevokeSerialSet() {
        logger.debug(`Starting openssl parse CRL to add Revoke Serial Numbers `, TAG);
        openssl(
            [
                'crl',
                '-in',
                {
                    name: 'ca.crl',
                    buffer: Buffer.from(this.crlPEM, 'ascii')
                },
                '-text',
                '-noout'
            ],
            this._callbackOpenSSL()
        );
        logger.debug(`Finish openssl parse CRL to add Revoke Serial Numbers `, TAG);
    }

    /**
     *
     * @returns {Function}
     * @private
     */
    _callbackOpenSSL() {
        return (err, buffer) => {
            if (err && err.length) {
                logger.warn(`OpenSSL error ${err.toString()}`, TAG);
                //kill process
                throw Error(`OpenSSL error ${err.toString()}`);
            } else {
                let crlTextBuffer = buffer.toString();
                if (Certificates._checkHasNoRevoked(crlTextBuffer)) {
                    this.revokeSerialNumberSet = new Set();
                    logger.debug(`No certificate revoked found.`, TAG);
                } else {
                    const revokeSerialNumberArr = Certificates._extractSerialNumber(crlTextBuffer);
                    this.revokeSerialNumberSet = new Set(revokeSerialNumberArr);
                    logger.debug(`Revoked certificates serial numbers: ${revokeSerialNumberArr}`, TAG);
                }
            }
        };
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

        const {pkiApiUrl} = config.mosca_tls;
        const url = `${pkiApiUrl}/internal/api/v1/throw-away/ca/crl?update=true`;
        return new Promise((resolve, reject) => {
            logger.info(`Starting update CRL...`, TAG);
            axios({
                method: 'GET',
                headers: {
                    'content-type': 'application/json',
                    'Accept': 'application/json'
                },
                url: url,
            }).then(response => {
                if (response.status === 200) {
                    logger.debug(`HTTP response ${util.inspect(response)}`, TAG);
                    const {data: {crl}} = response;
                    this.crlPEM = crl;
                    this._updateRevokeSerialSet();
                    resolve();
                } else {
                    logger.warn(`HTTP code ${response.status} to access ${url}`, TAG);
                    logger.debug(`HTTP response ERROR ${util.inspect(response)}`, TAG);
                    reject(new Error(`HTTP code ${response.status} to access ${url}`));
                }
            }).catch(error => {
                logger.debug(`Failed to execute http request (${error}).`);
                reject(error);
            });

            logger.info(`... update CRL finish`, TAG);
        });
    }

}

/**
 *
 * @type {{Certificates: Certificates}}
 */
module.exports = new Certificates();
