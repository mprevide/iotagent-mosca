#!/bin/sh

echo "Generating keys and certificates for TLS ..."
python initialConf.py && echo "TLS configured." || { echo "Error on TLS setup"; exit 1; }

echo "Starting iotagent-mosca..."
node ./src/index.js
