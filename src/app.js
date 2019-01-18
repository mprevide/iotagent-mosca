"use strict";
const bodyParser = require("body-parser");
const express = require("express");
const dojot = require("@dojot/dojot-module-logger");
const healthCheck = require('@dojot/healthcheck');
const logger = require("@dojot/dojot-module-logger").logger;

const TAG = {filename: "app"};
function initApp(healthChecker) {
    const app = express();

    app.use(bodyParser.json());
    app.use(healthCheck.getHTTPRouter(healthChecker));
    app.use(dojot.getHTTPRouter());

    logger.debug("Initializing configuration endpoints...", TAG);

    app.listen(10001, () => {
        logger.info(`Listening on port 10001.`, TAG);
    });
    logger.debug("... configuration endpoints were initialized", TAG);
}

module.exports = {
    initApp,
};

