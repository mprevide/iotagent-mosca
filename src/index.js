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

try {

  if(config.allow_unsecured_mode === true) {
    logger.info("MQTT and MQTTS are enabled.", TAG);
  }
  else{
    logger.info("Only MQTTS is enabled.", TAG);
  }

  logger.info(`Starting IoT agent MQTT...`, TAG);
  const agent = new IoTAgent();
  logger.info(`... IoT agent MQTT initialization started.`, TAG);
  logger.info(`Starting health checker...`, TAG);
  const healthChecker = new AgentHealthChecker();
  agent.initHealthCheck(healthChecker.healthChecker);
  logger.info(`... health checker started`, TAG);

  //If null the CRL will not be updated after initialization
  if(config.mosca_tls.crlUpdateTime) {
    logger.info(`Initializing cron to update CRL every ${config.mosca_tls.crlUpdateTime}...`, TAG);
    const jobUpdateCRL = new CronJob(config.mosca_tls.crlUpdateTime, function () {
      Certificates.updateCRL().then(() => {
        logger.info(`... Succeeded to cron to update CRL .`, TAG);
      }).catch(error => {
        logger.debug(`... Failed to cron to update CRL  (${error}).`, TAG);
        //kill process
        throw error;
      });
    });
    jobUpdateCRL.start();
    logger.info(`... cron to update CRL every ${config.mosca_tls.crlUpdateTime} started`, TAG);
  }

  logger.info(`Initializing endpoints...`, TAG);
  app.initApp(healthChecker.healthChecker, agent.metricsStore);
  logger.info(`... app initialized.`, TAG);


} catch (error) {
  logger.error(`Caught an error: ${error}`, TAG);
  app.stopApp();
}
