'use strict';

var config = {};

config.backend_host = process.env.BACKEND_HOST || 'mosca-redis';
config.backend_port = process.env.BACKEND_PORT || 6379;

config.allow_unsecured_mode = process.env.ALLOW_UNSECURED_MODE || 'false';

config.mosca_tls = {
    cert: process.env.MOSCA_TLS_SECURE_CERT || '/opt/iot-agent/mosca/certs/mosca.crt',
    key: process.env.MOSCA_TLS_SECURE_KEY || '/opt/iot-agent/mosca/certs/mosca.key',
    ca: process.env.MOSCA_TLS_CA_CERT || '/opt/iot-agent/mosca/certs/ca.crt',
    crl: process.env.MOSCA_TLS_CA_CRL || '/opt/iot-agent/mosca/certs/ca.crl'
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

module.exports = config;