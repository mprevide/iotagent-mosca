'use strict';

var config = {};

config.backend_host = process.env.BACKEND_HOST || 'mosca-redis';
config.backend_port = process.env.BACKEND_PORT || 6379;

config.allow_unsecured_mode = process.env.ALLOW_UNSECURED_MODE || 'false';

// NOTE: Prefill the keys in redis db if use this feature, if the key don't exist it will be 0, that means the client will be forbidden to send messages. It will decrement that number one by one for every message sent with that client id
// Ratelimit disabled by default
config.enable_ratelimit = process.env.ENABLE_RATELIMIT || false
// If not specified use same redis host mosca uses
config.ratelimit_redis_host = process.env.RATELIMIT_REDIS_HOST || config.backend_host
config.ratelimit_redis_port = process.env.RATELIMIT_REDIS_PORT || config.backend_port

config.mosca_tls = {
    cert: process.env.MOSCA_TLS_SECURE_CERT || '/opt/iot-agent/mosca/certs/mosca.crt',
    key: process.env.MOSCA_TLS_SECURE_KEY || '/opt/iot-agent/mosca/certs/mosca.key',
    ca: process.env.MOSCA_TLS_CA_CERT || '/opt/iot-agent/mosca/certs/ca.crt'
};

module.exports = config;
