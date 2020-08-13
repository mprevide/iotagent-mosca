"use strict";
const logger = require("@dojot/dojot-module-logger").logger;
const CronJob = require('cron').CronJob;
const IoTAgent = require("./iotagent").IoTAgent;
const AgentHealthChecker = require("./healthcheck").AgentHealthChecker;
const Certificates = require("./certificates");
const app = require("./app");
const config = require("./config");
const TAG = { filename: "main" };

const logLevel = config.logger.level;
logger.setLevel(logLevel);

const unhandledRejections = new Map();

// the unhandledRejections Map will grow and shrink over time,
// reflecting rejections that start unhandled and then become handled.
process.on('unhandledRejection', (reason, promise) => {
  // The 'unhandledRejection' event is emitted whenever a Promise is rejected and
  // no error handler is attached to the promise within a turn of the event loop.
  logger.error(`Unhandled Rejection at: ${reason.stack || reason}.`);

  unhandledRejections.set(promise, reason);

  logger.debug(`unhandledRejection: List of Unhandled Rejection size ${unhandledRejections.size}`);
});

process.on('rejectionHandled', (promise) => {
  // The 'rejectionHandled' event is emitted whenever a Promise has
  // been rejected and an error handler was attached to it
  // later than one turn of the Node.js event loop.
  logger.debug('rejectionHandled: A event');

  unhandledRejections.delete(promise);

  logger.debug(`rejectionHandled: List of Unhandled Rejection size ${unhandledRejections.size}`);
});

process.on('uncaughtException', (ex) => {
  // The 'uncaughtException' event is emitted when an uncaught JavaScript
  // exception bubbles all the way back to the event loop.
  logger.error(`uncaughtException: Unhandled Exception at: ${ex.stack || ex}. Bailing out!!`);

  process.kill(process.pid);
});

const updateRevokedListFromCRL = () => {
  Certificates.updateCRL().then(() => {
    logger.info(`... Succeeded to cron to update CRL .`, TAG);
  }).catch(error => {
    logger.debug(`... Failed to cron to update CRL  (${error}).`, TAG);
    //kill process
    throw error;
  });
}

try {

  if(config.allow_unsecured_mode === true) {
    logger.info("MQTT and MQTTS are enabled.", TAG);
  }
  else{
    logger.info("Only MQTTS is enabled.", TAG);
  }

  logger.info(`Starting IoT agent MQTT...`, TAG);
  const agent = new IoTAgent(config);
  logger.info(`... IoT agent MQTT initialization started.`, TAG);
  logger.info(`Starting health checker...`, TAG);
  const healthChecker = new AgentHealthChecker();
  agent.initHealthCheck(healthChecker.healthChecker);
  logger.info(`... health checker started`, TAG);

  //If null the CRL will not be updated after initialization
  if(config.mosca_tls.crlUpdateTime) {
    logger.info(`Initializing cron to update CRL every ${config.mosca_tls.crlUpdateTime}...`, TAG);

    //update list at first time
    updateRevokedListFromCRL();

    const jobUpdateCRL = new CronJob(config.mosca_tls.crlUpdateTime, function () {
      updateRevokedListFromCRL();
    });

    jobUpdateCRL.start();
    logger.info(`... cron to update CRL every ${config.mosca_tls.crlUpdateTime} started`, TAG);
  }

  logger.info(`Initializing endpoints...`, TAG);
  app.initApp(healthChecker.healthChecker, agent.metricsStore);
  logger.info(`... app initialized.`, TAG);


} catch (error) {
  logger.error(`Caught an error: ${error.stack || error}`, TAG);
  app.stopApp();
  process.kill(process.pid);
}


