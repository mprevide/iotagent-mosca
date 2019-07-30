const axios = require('axios');
const CronJob = require('cron').CronJob;
const fs = require('fs');
const logger = require("@dojot/dojot-module-logger").logger;
const config = require("./config");
const TAG = {filename: "certificates"};

const httpHeader = {
    headers: {
        'content-type': 'application/json',
        'Accept': 'application/json'
    }
};

/**
 *
 */
class Certificates {
    /**
     *
     */
    constructor() {
        this.logger = logger;
        this.rawCRL = null;
    }

    /**
     *
     * @returns {string|null|Buffer}
     */
    getCRLPEM() {
        if (this.rawCRL == null) {
            if (config.mosca_tls.crl) {
                return fs.readFileSync(config.mosca_tls.crl);
            } else {
                return null;
            }
        } else {
            return "-----BEGIN X509 CRL-----\n" +
                Certificates.format(this.rawCRL) +
                "\n-----END X509 CRL-----\n";
        }

    }

    /**
     *
     * @private
     */
    _updateCRLFile() {
        const {ejbcaApiUrl, caName} = config.mosca_tls;
        axios({
            method: 'GET',
            httpHeader,
            url: ejbcaApiUrl + '/ca/' + caName + "/crl?update='true'",
        }).then(response => {
            //this.logger.debug(`HTTP response - status (${response.status}) data(${JSON.stringify(response.data.CRL)}).`, TAG);
            if (response.status === 200) {
                const {data: {CRL}} = response;
                this.rawCRL = CRL;
            } else {
                this.logger.debug(`HTTP response ERROR`, TAG);
            }
        });
    }

    /**
     *
     * @param rawCertificate
     * @returns {void | string | never}
     */
    static format(rawCertificate) {
        return rawCertificate.replace("(.{64})", "\\1\n");
    }
}

/**
 *
 * @type {{Certificates: Certificates}}
 */
module.exports = {
    Certificates
};
