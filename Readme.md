# dojot iotagent-mosca

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

IoT agents outght to receive messages from phisical devices (drirectly or trougth a gateway) and send them commands in order to configure them. This IoT agent, receive messages via MQTT with JSON payloads.

**Before running all those steps a [Kafka node](https://github.com/dojot/libKafka_nodejs) (with a zookeeper instance) must be running**

## How does it work

iotagent-mosca depends on a [Kafka broker](https://kafka.apache.org/) in order to receive payloads about existing and new devices and their updates. Internally it's broker implements a [NodeJS Mosca Library](https://www.npmjs.com/package/mosca). For more information about the internals of this mechanism, check [iotagent-nodejs](https://github.com/dojot/iotagent-nodejs) documentation.

## How to build

As this is a npm-based project, open the terminal and run

```
# you may need sudo to run this command
$ npm install
```

A docker images is also available on dockerhub for pull [here](https://hub.docker.com/r/dojot/iotagent-mosca)

You can also build this component using docker, open the terminal on the project path and run

```
# you may need sudo on your machine: https://docs.docker.com/engine/installation/linux/linux-postinstall/
$ docker build -t <tag> .
```

## How to run

There are some initial config that must be maded, to this run properly, make sure you have python3 or higher installed on your machine. We highly recomend to install the python dependencies on a virtual environment [virtualenv](https://virtualenv.pypa.io/en/latest/installation/)

** Optional steps for running in a virtual environment
```
# This command create a folder named env
$ virtualenv env

# activate the created environment
$ source ./env/bin/activate

# to undo the changes
$ deactivate
```

Open the terminal and run

```
# intall the requierements for python scripts
pip install -r requirements.txt

# generates the mosca key-pair and retrieves a certificate and CRL from CA
$ python3 initialConf.py

# then start the project
$ node index.js
```
## Configuration
These are the environment variables used by iotagent-mosca

Key                     | Purpose                                       | Default Value
----------------------- | --------------------------------------------- | --------------
BACKEND_HOST            | redis host                                    | mosca-redis
BACKEND_PORT            | redis port                                    | 6379
ALLOW_UNSECURED_MODE    | allow iotagent mosca to run on insecure mode  | false
LOG_LEVEL               | logger level (debug, error, warning, info)    | info
MOSCA_TLS_SECURE_CERT   | mosca tls **certificate** path                | ```<project-path>```/mosca/certs/mosca.crt
MOSCA_TLS_SECURE_KEY    | mosca tls **key** path                        | ```<project-path>```/mosca/certs/mosca.key
MOSCA_TLS_CA_CERT       | mosca tls **certificate authority** path      | ```<project-path>```/mosca/certs/ca.crt
HC_UPTIME_TIMEOUT       | *healcheck uptime timeout                     | 30000
HC_MEMORY_USAGE_TIMEOUT | *healcheck memory usage timeout               | 30000
HC_CPU_USAGE_TIMEOUT    | *healcheck cpu usage timeout                  | 30000
HC_MONGODB_TIMEOUT      | *healcheck mongodb monitor timeout            | 30000
HC_KAFKA_TIMEOUT        | *healcheck Kafka monitor timeout              | 3000

*Healcheck is is responsible for monitoring all important internal states, connections to services and resources used (CPU and memory)

## Send Message from device via MQTT
To send a message via mqtt, the device must publish to following topic, and they must be in JSON format

Attribute   |                Description                    | Example
----------- | --------------------------------------------- | ------------------------------
topic       | Topic where the device must publish messages. | ```/<tenant>/<device-id>/attrs```

### Example

* tenant: mosca
* device-id: fg7ad

**The json _key_ is the device attribute**

The topic where device must public is ```/mosca/fg7ad/attrs```

```
{
  "attr1": value1,
  "attr2": value2
}
```

This example uses mosquitto_pub tool, available with mosquitto_clients package. To send a message to iotagent-mosca via MQTT, open a terminal and run

```mosquitto_pub -h localhost -i "mosca" -t /mosca/fg7ad/attrs -m '{"attr1": value1, "attr2": value2 }'```

* -i : id to use for the client. Defaults to mosquitto_pub_ appended with the process id.
* -t : mqtt topic to publish to.
* -m : message payload to send.
