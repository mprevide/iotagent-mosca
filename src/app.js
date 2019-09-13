"use strict";
const bodyParser = require("body-parser");
const express = require("express");
const dojot = require("@dojot/dojot-module-logger");
const healthCheck = require('@dojot/healthcheck');
const metrics = require("./metrics");
const logger = require("@dojot/dojot-module-logger").logger;

const TAG = {filename: "app"};

let isInitialized = false;
let httpServer;
let app = null;

function setInitialized(_isInitialized) {
    isInitialized = _isInitialized;
}

function getInitialized() {
    return isInitialized;
}

function setHttpServer(_httpServer) {
    httpServer = _httpServer;
}

function getHttpServer() {
    return httpServer;
}

function initApp(healthChecker, metricStore) {
    console.log('initApp isInitialized', isInitialized);
    app = express();
    app.use(bodyParser.json());
    if (healthChecker) {
        app.use(healthCheck.getHTTPRouter(healthChecker));
    }
    if (metricStore) {
        app.use(metrics.getHTTPRouter(metricStore));
    }
    app.use(dojot.getHTTPRouter());

    logger.debug("Initializing configuration endpoints...", TAG);

    setHttpServer( app.listen(10001, () => {
        logger.info(`Listening on port 10001.`, TAG);
        setInitialized(true);
    }));

    logger.debug("... configuration endpoints were initialized", TAG);
}

function stopApp() {
    if (getInitialized()) {
        getHttpServer().close();
        isInitialized = false;
    }
}


module.exports = {
    initApp, stopApp, app, setInitialized, setHttpServer
};

