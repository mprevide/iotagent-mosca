const axios = require('axios');
const CronJob = require('cron').CronJob;
const logger = require("@dojot/dojot-module-logger").logger;
const config = require("./config");
const TAG = {filename: "iotagent"};


/**
 *
 */
class Certificates {
    constructor() {
        this.logger = logger;
        this.crlContent = "";
    }

    getCRLPEM(){
        return this.crlContent;
    }

    _updateCRLFile() {
        const {ejbcaApiUrl, caName} = config.mosca_tls;
        axios({
            method: 'GET',
            headers: {
                'content-type': 'application/json',
                'Accept': 'application/json'
            },
            url: ejbcaApiUrl + '/ca/' + caName + "/crl?update='true'",
        }).then(response => {
            logger.debug(`HTTP response - status (${response.status}) data(${JSON.stringify(response.data)}).`, TAG);
        });
    }

}

module.exports = {
    Certificates
};
