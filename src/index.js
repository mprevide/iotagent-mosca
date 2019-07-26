var logger = require("@dojot/dojot-module-logger").logger;
const IoTAgent = require("./iotagent").IoTAgent;
const AgentHealthChecker = require("./healthcheck").AgentHealthChecker;
const app = require("./app");
const config = require("./config");
const TAG = { filename: "main" };

var logLevel = config.logger.level;
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
  logger.info(`Starting health checker...`);
  const healthChecker = new AgentHealthChecker();
  agent.initHealthCheck(healthChecker.healthChecker);
  logger.info(`... health checker started`);

  logger.info(`Initializing endpoints...`, TAG);
  app.initApp(healthChecker.healthChecker, agent.metricsStore);
  logger.info(`... app initialized.`, TAG);

} catch (error) {
  logger.error(`Caught an error: ${error}`, TAG);
  app.stopApp();
}
