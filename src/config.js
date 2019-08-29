'use strict';

/* private */
const unsecured_mode = (mode) => ((mode || false) && (mode.toLowerCase().trim() === "true" || Number(mode) > 0));
const _toNumber = (envValue) => ((envValue) ? Number(envValue) : null);

/* public */
var config = {};

config.backend_host = process.env.BACKEND_HOST || 'mosca-redis';
config.backend_port = process.env.BACKEND_PORT || 6379;

config.allow_unsecured_mode = unsecured_mode(process.env.ALLOW_UNSECURED_MODE);

config.logger = {
    level: process.env.LOG_LEVEL || 'info'
};

config.mosca_tls = {
    cert: process.env.MOSCA_TLS_SECURE_CERT || './mosca/certs/mosca.crt',
    key: process.env.MOSCA_TLS_SECURE_KEY || './mosca/certs/mosca.key',
    ca: process.env.MOSCA_TLS_CA_CERT || './mosca/certs/ca.crt',
    maxLifetime: _toNumber(process.env.MOSCA_TLS_CON_MAX_LIFETIME) || 7200000,
    idleTimeout: _toNumber(process.env.MOSCA_TLS_CON_IDLE_TIMEOUT) || 1800000,
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

config.deviceToDojotPayloadSize = process.env.DEV_TO_DOJOT_PAYLOAD_MAX_SIZE || 256000000;
config.DojotToDevicePayloadSize = process.env.DOJOT_TO_DEV_PAYLOAD_MAX_SIZE || 256000000;

module.exports = config;
