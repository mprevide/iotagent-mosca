'use strict';

/* private */
const unsecured_mode = (mode) => ((mode || false) && (mode.toLowerCase().trim() === "true" || Number(mode) > 0));

const _zeroToDisabled = (envValue, defaultValue) => {
    if (envValue === 0 || envValue === '0') { return null; }
    else if (Number(envValue)) {
        return Number(envValue);
    }
    return defaultValue;
};

/* public */
const config = {};

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
    crl: process.env.MOSCA_TLS_CA_CRL || './mosca/certs/ca.crl',
    pkiApiUrl: process.env.MQTTREST_EJBCA_URL || 'http://ejbca:5583',
    caName: process.env.MQTTREST_CA_NAME || 'IOTmidCA',
    //If null the CRL will not be updated after initialization
    //Read up on cron patterns here (http://crontab.org/)
    //By default will be updated every 2 hours, if null disabled
    //Eg. : '0 */2 * * *' -> every 2 hours
    crlUpdateTime: process.env.MQTTREST_CRL_UPDATE_TIME || '0 */2 * * *',
    maxLifetime: _zeroToDisabled(process.env.MOSCA_TLS_CON_MAX_LIFETIME, 7200000),
    idleTimeout: _zeroToDisabled(process.env.MOSCA_TLS_CON_IDLE_TIMEOUT, 1800000),
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

config.kafka = {
    producer: {
        "metadata.broker.list": process.env.KAFKA_HOSTS || "kafka:9092",
        "compression.codec": "gzip",
        "retry.backoff.ms": 200,
        "message.send.max.retries": 10,
        "socket.keepalive.enable": true,
        "queue.buffering.max.messages": 100000,
        "queue.buffering.max.ms": 100,
        "batch.num.messages": 1000000,
        "dr_cb": true
    },

    consumer: {
        "group.id": process.env.KAFKA_GROUP_ID || "iotagent-mqtt-group",
        "metadata.broker.list": process.env.KAFKA_HOSTS || "kafka:9092",
    },
    dojot: {
        subscriptionHoldoff: Number(process.env.DOJOT_SUBSCRIPTION_HOLDOFF) || 2500,
        timeoutSleep: 5,
        connectionRetries: 5
    }
};

config.databroker = {
    url: process.env.DATA_BROKER_URL || "http://data-broker",
    timeoutSleep: 2,
    connectionRetries: 5,
};

config.auth = {
    url: process.env.AUTH_URL || "http://auth:5000",
    timeoutSleep: 5,
    connectionRetries: 5,
};

config.deviceManager = {
    url: process.env.DEVICE_MANAGER_URL || "http://device-manager:5000",
    timeoutSleep: 5,
    connectionRetries: 3,
};

config.dojot = {
    management: {
        user: process.env.DOJOT_MANAGEMENT_USER || "dojot-management",
        tenant: process.env.DOJOT_MANAGEMENT_TENANT || "dojot-management"
    },
    subjects: {
        tenancy: process.env.DOJOT_SUBJECT_TENANCY || "dojot.tenancy",
        devices: process.env.DOJOT_SUBJECT_DEVICES || "dojot.device-manager.device",
        deviceData: process.env.DOJOT_SUBJECT_DEVICE_DATA || "device-data",
    },
    events: {
        tenantEvent: {
        NEW_TENANT: "new-tenant",
        DELETE_TENANT: "delete-tenant"
        },
        tenantActionType: {
        CREATE: "create",
        DELETE: "delete"
        }
    }
};

config.deviceToDojotPayloadSize = process.env.DEV_TO_DOJOT_PAYLOAD_MAX_SIZE || 256000000;
config.DojotToDevicePayloadSize = process.env.DOJOT_TO_DEV_PAYLOAD_MAX_SIZE || 256000000;

module.exports = config;
