const os = require("os");
const HealthCheck = require("@dojot/healthcheck");
const pjson = require('./package.json');
const config = require("./config");


/**
 * Healthcheck agent for IoT agent MQTT.
 *
 * This class is responsible for monitoring all important internal states,
 * connections to services and resources used (CPU and memory)
 */
class AgentHealthChecker {
    constructor(kafkaMessenger, redisClient) {
        const configHealth = {
            description: 'Health status for IoT agent - MQTT',
            version: pjson.version,
            status: 'pass',
        };

        this.healthChecker = new HealthCheck.HealthChecker(configHealth);
        this.router = HealthCheck.getHTTPRouter(this.healthChecker);
        this.kafkaMessenger = kafkaMessenger;
        this.redisClient = redisClient;
    }

    /**
     * Register all monitors
     */
    init() {
        this._registerUptimeMonitor();
        this._registerMemoryMonitor();
        this._registerCpuMonitor();
        this._registerKafkaMonitor();
        this._registerRedisMonitor();
    }

    _registerUptimeMonitor() {
        // uptime
        const uptime = {
            measurementName: 'uptime',
            componentType: 'system',
            observedUnit: 's',
            status: 'pass',
        };

        const collectUptime = (trigger = HealthCheck.DataTrigger) => {
            const value = Math.floor(process.uptime());
            trigger.trigger(value, 'pass');
            return value;
        };

        this.healthChecker.registerMonitor(uptime, collectUptime,
            config.healthcheck.timeout.uptime);
    }

    _registerMemoryMonitor() {
        const memory = {
            componentName: 'memory',
            componentType: 'system',
            measurementName: 'utilization',
            observedUnit: 'percent',
            status: 'pass',
        };

        const collectMemory = (trigger = HealthCheck.DataTrigger) => {
            const tmem = os.totalmem();
            const fmem = os.freemem();
            const pmem = (100 - (fmem / tmem) * 100).toFixed(2);
            if (pmem > 75) {
                trigger.trigger(pmem, 'warn');
            } else {
                trigger.trigger(pmem, 'pass');
            }
            return pmem;
        };

        this.healthChecker.registerMonitor(memory, collectMemory,
            config.healthcheck.timeout.memory);
    }

    _registerCpuMonitor() {
        const cpu = {
            componentName: 'cpu',
            componentType: 'system',
            measurementName: 'utilization',
            observedUnit: 'percent',
            status: 'pass',
        };


        const collectCpu = (trigger = HealthCheck.DataTrigger) => {
            const ncpu = os.cpus().length;
            const lcpu = os.loadavg()[1]; // last five minute
            const pcpu = (100 * lcpu / ncpu).toFixed(2);
            if (pcpu > 75) {
                trigger.trigger(pcpu, 'warn');
            } else {
                trigger.trigger(pcpu, 'pass');
            }
            return pcpu;
        };

        this.healthChecker.registerMonitor(cpu, collectCpu,
            config.healthcheck.timeout.cpu);
    }

    _registerRedisMonitor() {
        const redisInfo = {
            componentName: 'redis',
            componentType: 'datastore',
            measurementName: 'accessibility',
            observedUnit: 'boolean',
            status: 'pass',
        };

        const dataTrigger = this.healthChecker.registerMonitor(redisInfo);
        this.redisClient.on("ready", () => {
            dataTrigger.trigger(true, "pass");
        });

        this.redisClient.on("end", () => {
            dataTrigger.trigger(false, "fail");
        });
    }


    _getKafkaStatus() {
        return new Promise((resolve, reject) => {
            const kafkaStatus = {
                connected: false,
            };

            // It can be the consumer or the producer because the returned value is the same.
            this.kafkaMessenger.consumer.consumer.getMetadata({ timeout: 3000 },
                (error, metadata) => {
                    if (error) {
                        reject(new Error('Internal error while getting kafka metadata.'));
                    } else {
                        kafkaStatus.connected = true;
                        kafkaStatus.details = {
                            metadata,
                        };
                        resolve(kafkaStatus);
                    }
                });
        });
    }

    _registerKafkaMonitor() {
        // kafka:connections
        const kafka = {
            componentName: 'kafka',
            componentType: 'datastore',
            measurementName: 'accessibility',
            observedUnit: 'boolean',
            status: 'pass',
        };


        const collectKafkaState = (trigger = HealthCheck.DataTrigger) => this._getKafkaStatus().then((status) => {
                if (status.connected) {
                    trigger.trigger(1 /* one connection */, 'pass');
                } else {
                    trigger.trigger(0 /* zero connection */, 'fail');
                }
            }).catch((error) => {
                trigger.trigger(0 /* zero connection */, 'fail', error);
            });


        this.healthChecker.registerMonitor(kafka, collectKafkaState,
            config.healthcheck.timeout.kafka);
    }
}

module.exports = AgentHealthChecker;
