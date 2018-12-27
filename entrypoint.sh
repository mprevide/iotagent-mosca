#!/bin/sh

if [ "${MOSCA_TLS}" = "true" ]; then
    echo "Generating keys and certificates for TLS..."
    /opt/iot-agent/initialConf.py && echo "TLS configured." || { echo "Error on TLS setup"; exit 1; }
else 
    echo "No TLS is configured. All connections are unsecured."
fi

echo "Starting iotagent-mosca..."
node /opt/iot-agent/index.js
