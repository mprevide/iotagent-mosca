'use strict';

var config = {};

config.backend_host = process.env.BACKEND_HOST || 'mosca-redis';
config.backend_port = process.env.BACKEND_PORT || 6379;

config.allow_unsecured_mode = process.env.ALLOW_UNSECURED_MODE || 'false';

config.log_level = process.env.LOG_LEVEL || 'info';

config.mosca_tls = {
    cert: process.env.MOSCA_TLS_SECURE_CERT || '/opt/iot-agent/mosca/certs/mosca.crt',
    key: process.env.MOSCA_TLS_SECURE_KEY || '/opt/iot-agent/mosca/certs/mosca.key',
    ca: process.env.MOSCA_TLS_CA_CERT || '/opt/iot-agent/mosca/certs/ca.crt'
};

config.healthcheck = {
    timeout: {
        uptime: process.env.HC_UPTIME_TIMEOUT || 300000,
        memory: process.env.HC_MEMORY_USAGE_TIMEOUT || 300000,
        cpu: process.env.HC_CPU_USAGE_TIMEOUT || 300000,
        mongodb: process.env.HC_MONGODB_TIMEOUT || 30000,
        kafka: process.env.HC_KAFKA_TIMEOUT || 30000
    }
};

module.exports = config;
