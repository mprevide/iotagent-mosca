# dojot iotagent-mosca

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![codecov](https://codecov.io/gh/dojot/iotagent-mosca/branch/development/graph/badge.svg)](https://codecov.io/gh/dojot/iotagent-mosca)

IoT agents ought to receive messages from physical devices (directly or through a gateway) and send them commands in order to configure them. This IoT agent, receive messages via MQTT with JSON payloads.

**Before running all those steps a [Kafka node](https://github.com/dojot/libKafka_nodejs) (with a zookeeper instance) must be running**

## How does it work

iotagent-mosca depends on a [Kafka broker](https://kafka.apache.org/) in order to receive payloads about existing and new devices and their updates. Internally it's broker implements a [NodeJS Mosca Library](https://www.npmjs.com/package/mosca). For more information about the internals of this mechanism, check [iotagent-nodejs](https://github.com/dojot/iotagent-nodejs) documentation.

## How to build

As this is a npm-based project, open the terminal and run

```
$ npm install
```

A docker image is also available on dockerhub for pull [here](https://hub.docker.com/r/dojot/iotagent-mosca)

You can also build this component using docker, open the terminal on the project path and run

```
# you may need sudo on your machine: https://docs.docker.com/engine/installation/linux/linux-postinstall/
$ docker build -t <tag> .
```

## How to run

There are some initial config that must be made, to this run properly, make sure you have python3 or higher installed on your machine. We highly recommend installing the python dependencies on a virtual environment [virtualenv](https://virtualenv.pypa.io/en/latest/installation/)

** Optional steps for running in a virtual environment
```
# This command creates a folder named env
$ virtualenv env

# activate the created environment
$ source ./env/bin/activate

# to undo the changes
$ deactivate
```

Open the terminal and run

```
# install the requirements for python scripts
pip install -r requirements.txt

# generates the mosca key-pair and retrieves a certificate and CRL from CA
$ python3 initialConf.py

# then start the project
$ node src/index.js or npm start
```
## Configuration
These are the environment variables used by iotagent-mosca

Key                     | Purpose                                             | Default Value
----------------------- | --------------------------------------------------- | --------------
BACKEND_HOST            | redis host                                          | mosca-redis
BACKEND_PORT            | redis port                                          | 6379
ALLOW_UNSECURED_MODE    | allow iotagent mosca to run on insecure mode        | false
LOG_LEVEL               | logger level (debug, error, warning, info)          | info
MOSCA_TLS_SECURE_CERT   | Mosca TLS **certificate** path                      | ```<project-path>```/mosca/certs/mosca.crt
MOSCA_TLS_SECURE_KEY    | Mosca TLS **key** path                              | ```<project-path>```/mosca/certs/mosca.key
MOSCA_TLS_CA_CERT       | Mosca TLS **certificate authority** path            | ```<project-path>```/mosca/certs/ca.crt
MOSCA_TLS_CRL_CERT      | Mosca TLS **certificate revocation list** path      | ```<project-path>```/mosca/certs/ca.crl
MOSCA_TLS_DNS_LIST      | Mosca TLS DNS list (separated by a comma)           | mqtt,mosca,localhost
MOSCA_TLS_CNAME  | To be used in the certificate common name         | iotagent-mosca-mqtt or the value of the HOSTNAME environment variable if it exists
MOSCA_TLS_CON_MAX_LIFETIME  | TLS: Maximum lifetime of a connection in ms (If is 0 then is disabled)          | 7200000
MOSCA_TLS_CON_IDLE_TIMEOUT  | TLS: The idle timeout for a connection in ms (If is 0 then is disabled)         | 1800000
MOSCA_TLS_X509_IDENTITY_MGMT | Address of the EJBCA service                        | http://x509-identity-mgmt:3000
MOSCA_TLS_CRL_UPDATE_TIME| CRL will be updated every set time. If null the CRL will not be updated after initialization. By default will be updated every 2 hours. (Read up on cron patterns here http://crontab.org/).    | '0 */2 * * *'
HC_UPTIME_TIMEOUT       | *healtcheck uptime timeout in milliseconds          | 30000
HC_MEMORY_USAGE_TIMEOUT | *healtcheck memory usage timeout in milliseconds    | 30000
HC_CPU_USAGE_TIMEOUT    | *healtcheck cpu usage timeout in milliseconds       | 30000
HC_MONGODB_TIMEOUT      | *healtcheck mongodb monitor timeout in milliseconds | 30000
HC_KAFKA_TIMEOUT        | *healtcheck Kafka monitor timeout in milliseconds   | 30000
MQTTREST_KAFKA_HOST     | Mqtt Rest api kafka hostname                        | kafka:9092


*HealthCheck is responsible for monitoring all important internal states, connections to services and resources used (CPU and memory)

## Send Message from device via MQTT
To send a message via MQTT, the device must publish to the following topic, and they must be in JSON format

Attribute   |                Description                    | Example
----------- | --------------------------------------------- | ------------------------------
topic       | Topic where the device must publish messages. | ```/<tenant>/<device-id>/attrs```

### Example

* tenant: mosca
* device-id: fg7ad

**The json _key_ is the device attribute**

The topic where the device must publish is ```/mosca/fg7ad/attrs```

```
{
  "attr1": value1,
  "attr2": value2
}
```

You can also publish a message and include its `timestamp` in UNIX or ISO format, with a precision
of seconds or milliseconds. If no timestamp is passed, this IoT agent will create it by its own.

This example uses mosquitto_pub tool, available with mosquitto_clients package. To send a message to iotagent-mosca via MQTT, open a terminal and run

```mosquitto_pub -h localhost -i "mosca" -t /mosca/fg7ad/attrs -m '{"attr1": value1, "attr2": value2 }'```

* -i : id to use for the client. Defaults to mosquitto_pub_ appended with the process id.
* -t : MQTT topic to publish to.
* -m : message payload to send.

## Receiving a device actuation event

To receive a device actuation, you must subscribe to the following topic.

Attribute   |                          Description                            | Example
----------- | --------------------------------------------------------------- | ----------------------------------
topic       | Topic where the device must subscribe to receive configuration. | ```/<tenant>/<device-id>/config```

The data received from this topic is intended to do something in the device, like set a particular target value for one of its actuators, reset it, etc.


## API Documentation
URL to api documentation https://dojot.github.io/iotagent-mosca/apiary_development.html && https://dojot.github.io/iotagent-mosca/apiary_latest.html for development and latest version of this IoT agent.
