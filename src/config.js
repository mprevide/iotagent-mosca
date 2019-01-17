'use strict';

var config = {};

config.backend_host = process.env.BACKEND_HOST || 'mosca-redis';
config.backend_port = process.env.BACKEND_PORT || 6379;

config.allow_unsecured_mode = process.env.ALLOW_UNSECURED_MODE || 'false';

config.mosca_tls = {
    cert: process.env.MOSCA_TLS_SECURE_CERT || '/opt/iot-agent/mosca/certs/mosca.crt',
    key: process.env.MOSCA_TLS_SECURE_KEY || '/opt/iot-agent/mosca/certs/mosca.key',
    ca: process.env.MOSCA_TLS_CA_CERT || '/opt/iot-agent/mosca/certs/ca.crt'
};

module.exports = config;
