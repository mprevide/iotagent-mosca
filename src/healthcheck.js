var HealthChecker = require('@dojot/healthcheck').HealthChecker;
var endpoint = require('@dojot/healthcheck').getHTTPRouter;
var pjson = require('../package.json');

/**
 * Healthcheck agent for IoT agent MQTT.
 */
class AgentHealthChecker {
  constructor() {
    const configHealth = {
      description: "IoT agent - MQTT",
      releaseId: "0.3.0-nightly20181030 ",
      status: "pass",
      version: pjson.version
    };
    const monitor = {
      componentId: "service-memory",
      componentName: "total memory used",
      componentType: "system",
      measurementName: "memory",
      observedUnit: "MB",
      status: "pass",
    };
    this.healthChecker = new HealthChecker(configHealth);
    this.healthChecker.registerMonitor(monitor, this._memoryCollector.bind(this), 10000);
    this.router = endpoint;
  }

  _memoryCollector(trigger) {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    const round = Math.round(used * 100) / 100;
    if (round > 30) {
      trigger.trigger(round, "fail", "memory usage is high");
    } else {
      trigger.trigger(round, "pass", "I'm ok");
    }

    return round;
  }
}

module.exports = {
  AgentHealthChecker
};

