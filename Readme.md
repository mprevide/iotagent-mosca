# dojot iotagent-mosca

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

IoT agents outght to receive messages from phisical devices (drirectly or trougth a gateway) and send them commands in order to configure them. This IoT agent, receive messages via MQTT with JSON payloads.

**Before running all those steps a Kafka node (with a zookeeper instance) must be running**

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