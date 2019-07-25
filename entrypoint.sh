#!/bin/sh

echo "Generating keys and certificates for TLS ..."
python initialConf.py && echo "TLS configured." || { echo "Error on TLS setup"; exit 1; }

if [ "${ALLOW_UNSECURED_MODE}" = "true" ]; then
    echo "MQTT and MQTTS are enabled."
else
    echo "Only MQTTS is enabled."
fi

echo "Starting iotagent-mosca..."
node ./src/index.js
