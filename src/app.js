"use strict";
const bodyParser = require("body-parser");
const express = require("express");
const dojot = require("@dojot/dojot-module-logger");
const healthCheck = require('@dojot/healthcheck');
const metrics = require("./metrics");
const logger = require("@dojot/dojot-module-logger").logger;

const TAG = {filename: "app"};

var isInitialized = false;
var httpServer;
const app = express();

function initApp(healthChecker, metricStore) {
    app.use(bodyParser.json());
    app.use(healthCheck.getHTTPRouter(healthChecker));
    app.use(metrics.getHTTPRouter(metricStore));
    app.use(dojot.getHTTPRouter());

    logger.debug("Initializing configuration endpoints...", TAG);

    httpServer = app.listen(10001, () => {
        logger.info(`Listening on port 10001.`, TAG);
        isInitialized = true;
    });
    logger.debug("... configuration endpoints were initialized", TAG);

    return isInitialized;
}

function stopApp() {
    if(isInitialized) {
        httpServer.close();
        isInitialized = false;
    }

    return isInitialized;
}

module.exports = {
    initApp, stopApp, app
};

