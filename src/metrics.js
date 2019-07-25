const express = require("express");
const logger = require("@dojot/dojot-module-logger").logger;

/**
 * Metrics agent for IoT agent MQTT.
 */
class Metrics {
  constructor() {
    this.lastMetricsInfo = {
      connectedClients: null,
      connectionsLoad1min: null,
      connectionsLoad5min: null,
      connectionsLoad15min: null,
      messagesLoad1min: null,
      messagesLoad5min: null,
      messagesLoad15min: null
    };
    this.logger = logger;
  }
  preparePayloadObject(payloadTopic, payloadValue) {
    this.lastMetricsInfo[`${payloadTopic}`] = `${payloadValue}`;
    this.logger.debug(`Published metric: ${payloadTopic}=${payloadValue}`);
  }
}
function getHTTPRouter(metricsStore) {
  const router = new express.Router();
  router.get('/iotagent-mqtt/metrics', (req, res) => {
    if (metricsStore.lastMetricsInfo) {
      return res.status(200).json(metricsStore.lastMetricsInfo);
    } else {
      logger.debug(`Something unexpected happened`);
      return res.status(500).json({ status: 'error', errors: [] });
    }
  });
  return router;
}

module.exports = {
  Metrics,
  getHTTPRouter
};

