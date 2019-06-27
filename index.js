#!/usr/bin/node
var mosca = require('mosca');
var iotalib = require('@dojot/iotagent-nodejs');
var dojotLogger = require("@dojot/dojot-module-logger");
var logger = dojotLogger.logger;
var config = require('./config');
var AgentHealthChecker = require("./healthcheck");
var redis = require("redis");
var lastMetricsInfo = {
  connectedClients: null,
  connectionsLoad1min: null,
  connectionsLoad5min: null,
  connectionsLoad15min: null,
  messagesLoad1min: null,
  messagesLoad5min: null,
  messagesLoad15min: null
};

// Base iot-agent
logger.debug("Initializing IoT agent...");
var iota = new iotalib.IoTAgent();
iota.init().then(() => {
  const redisClient = redis.createClient(`redis://${config.backend_host}:${config.backend_port}`);
  const healthChecker = new AgentHealthChecker(iota.messenger, redisClient);
  healthChecker.init();

logger.debug("... IoT agent was initialized");

logger.debug("Initializing configuration endpoints...");
var bodyParser = require("body-parser");
var express = require("express");
var app = express();

//service to get last metrics infos
app.get('/iotagent-mqtt/metrics', (req, res) => {
    if (lastMetricsInfo) {
        return res.status(200).json(lastMetricsInfo);
    } else {
        logger.debug(`Something unexpected happened`);
        return res.status(500).json({status: 'error', errors: []});
    }
});

app.use(bodyParser.json());
app.use(healthChecker.router);
app.use(dojotLogger.getHTTPRouter());
app.listen(10001, () => {
    logger.info(`Listening on port 10001.`);
});
logger.debug("... configuration endpoints were initialized");

// Local device cache
// Keeps the device associated with a MQTT client
//
// key: MQTT client ID
// value: { client: <mosca client>,
//          tenant: <tenant>,
//          deviceId: <deviceId> }
const cache = new Map();

// Mosca Settings
var moscaBackend = {
  type: 'redis',
  redis: redis,
  db: 12,
  port: config.backend_port,
  return_buffers: true, // to handle binary payloads
  host: config.backend_host
};

var moscaInterfaces = [];

// mandatory
var mqtts = {
  type: "mqtts",
  port: 8883,
  credentials:
  {
    keyPath: config.mosca_tls.key,
    certPath: config.mosca_tls.cert,
    caPaths: [config.mosca_tls.ca],
    requestCert: true, // enable requesting certificate from clients
    rejectUnauthorized: true // only accept clients with valid certificate
  }
};
moscaInterfaces.push(mqtts);

// optional
if (config.allow_unsecured_mode === 'true') {
  var mqtt = {
    type: "mqtt",
    port: 1883
  };
  moscaInterfaces.push(mqtt);
}

var moscaSettings = {
  backend: moscaBackend,
  persistence: {
    factory: mosca.persistence.Redis,
    host: moscaBackend.host
  },
  interfaces: moscaInterfaces,
	stats: true,
  logger: { name: 'MoscaServer', level: 'info' }
};

var server = new mosca.Server(moscaSettings);

// Fired when mosca server is ready
server.on('ready', () => {
  logger.info('Mosca server is up and running');

  // callbacks
  server.authenticate = authenticate;

  // Always check whether device is doing the right thing.
  server.authorizePublish = authorizePublish;
  server.authorizeSubscribe = authorizeSubscribe;
});

// Helper Function to parse MQTT clientId
function parseClientIdOrTopic(clientId, topic) {
  if (clientId && (typeof clientId === 'string')) {
    let parsedClientId = clientId.match(/^(\w+):(\w+)$/);
    if (parsedClientId) {
      return { tenant: parsedClientId[1], device: parsedClientId[2] };
    }
  }

  // fallback to topic-based id scheme
  if (topic && (typeof topic === 'string')) {
    let parsedTopic = topic.match(/^\/([^/]+)\/([^/]+)/)
    if (parsedTopic) {
      return ({ tenant: parsedTopic[1], device: parsedTopic[2] });
    }
  }

  return;
}

// Function to authenticate the MQTT client
function authenticate(client, username, password, callback) {
  logger.debug('Authenticating MQTT client', client.id);

  // Condition 1: client.id follows the pattern tenant:deviceId
  // Get tenant and deviceId from client.id
  let ids = parseClientIdOrTopic(client.id);
  if (!ids) {
    if (client.connection.stream.hasOwnProperty('TLSSocket')) {
      //reject client connection
      callback(null, false);
      logger.warn(`Connection rejected due to invalid ${client.id}.`);
      return;
    }
    //
    else {
      // (backward compatibility)
      // authorize
      cache.set(client.id, { client: client, tenant: null, deviceId: null });
      callback(null, true);
      return;
    }
  }

  // Condition 2: Client certificate belongs to the
  // device identified in the clientId
  // TODO: the clientId must contain the tenant too!
  if (client.connection.stream.hasOwnProperty('TLSSocket')) {
    clientCertificate = client.connection.stream.getPeerCertificate();
    if (!clientCertificate.hasOwnProperty('subject') ||
      !clientCertificate.subject.hasOwnProperty('CN') ||
      clientCertificate.subject.CN !== ids.device) {
      //reject client connection
      callback(null, false);
      logger.warn(`Connection rejected for ${client.id}. Invalid client certificate.`);
      return;
    }
  }

  // Condition 3: Device exists in dojot
  iota.getDevice(ids.device, ids.tenant).then((device) => {
    // add device to cache
    cache.set(client.id, { client: client, tenant: ids.tenant, deviceId: ids.device });
    //authorize client connection
    callback(null, true);
    logger.debug('Connection authorized for', client.id);
  }).catch((error) => {
    //reject client connection
    callback(null, false);
    logger.warn(`Connection rejected for ${client.id}. Device doesn't exist in dojot.`);
  });
}

// Function to authourize client to publish to
// topic: {tenant}/{deviceId}/attrs
function authorizePublish(client, topic, payload, callback) {
  logger.debug(`Authorizing MQTT client ${client.id} to publish to ${topic}`);

  let cacheEntry = cache.get(client.id);
  if(!cacheEntry) {
    // If this happens, there is something very wrong!!
    callback(null, false);
    logger.error(`Unexpected client ${client.id} trying to publish to topic ${topic}`);
    return;
  }

  let ids = parseClientIdOrTopic(client.id, topic);
  if (!ids) {
    callback(null, false);
    logger.warn(`Client ${client.id} trying to publish to unexpected topic ${topic}`);
    return;
  }

  // (backward compatibility)
  if(cacheEntry.deviceId === null) {
    // Device exists in dojot
    iota.getDevice(ids.device, ids.tenant).then((device) => {
      logger.debug(`Got device ${JSON.stringify(device)}`);
      // add device to cache
      cacheEntry.tenant = ids.tenant;
      cacheEntry.deviceId = ids.device;
      cache.set(client.id, cacheEntry);
    }).catch((error) => {
      //reject
      callback(null, false);
      logger.debug(`Got error ${error} while trying to get device ${ids.tenant}:${ids.device}.`);
      logger.warn(`Client ${client.id} trying to publish to unknown
      device ${ids.device}.`);
      return;
    });

  }

  // a client is not allowed to publish on behalf of more than one device
  if(ids.tenant !== cacheEntry.tenant && cacheEntry.deviceId !== null &&
    ids.device !== cacheEntry.deviceId) {
    //reject
    callback(null, false);
    logger.warn(`Client ${client.id} trying to publish on behalf of
    devices: ${ids.device} and ${cacheEntry.deviceId}.`);
    return;
  }

  let expectedTopic = `/${ids.tenant}/${ids.device}/attrs`;

  logger.debug(`Expected topic is ${expectedTopic}`);
  logger.debug(`Device published on topic ${topic}`);
  if (topic === expectedTopic) {
    // authorize
    callback(null, true);
    logger.debug(`Authorized client ${client.id} to publish to topic ${topic}`);
    return;
  }

  //reject
  callback(null, false);
  logger.warn(`Rejected client ${client.id} to publish to topic ${topic}`);
}

// Function to authorize client to subscribe to
// topic: {tenant}/{deviceId}/config
function authorizeSubscribe(client, topic, callback) {
  logger.debug(`Authorizing client ${client.id} to subscribe to ${topic}`);

  let cacheEntry = cache.get(client.id);
  if(!cacheEntry) {
    // If this happens, there is something very wrong!!
    callback(null, false);
    logger.error(`Unexpected client ${client.id} trying to subscribe
    to topic ${topic}`);
    return;
  }

  let ids = parseClientIdOrTopic(client.id, topic);
  if (!ids) {
    //reject
    callback(null, false);
    logger.warn(`Client ${client.id} is trying to subscribe to
    unexpected topic ${topic}`);
    return;
  }

  // (backward compatibility)
  if(cacheEntry.deviceId === null) {

    // Device exists in dojot
    iota.getDevice(ids.device, ids.tenant).then((device) => {
      logger.debug(`Got device ${JSON.stringify(device)}`);
      // add device to cache
      cacheEntry.tenant = ids.tenant;
      cacheEntry.deviceId = ids.device;
      cache.set(client.id, cacheEntry);
    }).catch((error) => {
      //reject
      callback(null, false);
      logger.debug(`Got error ${error} while trying to get device ${ids.tenant}:${ids.device}.`);
      logger.warn(`Client ${client.id} trying to subscribe to unknown
      device ${ids.device}.`);
      return;
    });

  }

  // a client is not allowed to subscribe on behalf of more than one device
  if(ids.tenant !== cacheEntry.tenant && cacheEntry.deviceId !== null &&
    ids.device !== cacheEntry.deviceId) {
    //reject
    callback(null, false);
    logger.warn(`Client ${client.id} trying to subscribe on behalf of
    devices: ${ids.device} and ${cacheEntry.deviceId}.`);
    return;
  }

  let expectedTopic = `/${ids.tenant}/${ids.device}/config`;

  if (topic === expectedTopic) {
    // authorize
    callback(null, true);
    logger.debug(`Authorized client ${client.id} to subscribe to topic ${topic}`);
    return;
  }

  //reject
  callback(null, false);
  logger.warn(`Rejected client ${client.id} to subscribe to topic ${topic}`);
}

// Fired when a client connects to mosca server
server.on('clientConnected', function (client) {
  logger.info('client up', client.id);
  // TODO: notify dojot that device is online?
});

// Fired when a client disconnects from mosca server
server.on('clientDisconnected', function (client) {
  logger.info('client down', client.id);
  // delete device from cache
  cache.delete(client.id);
});

// Fired when a message is received by mosca server
// (from device to dojot)
server.on('published', function (packet, client) {

  function getTopicParameter(topic, index) {
    return topic.split('/')[index]
  }

  function preparePayloadObject(payloadObject, payloadTopic, payloadValue) {
    payloadObject[`${payloadTopic}`] = `${payloadValue}`
    logger.debug(`Published metric: ${payloadTopic}=${payloadValue}`)
  }

  const topicType = getTopicParameter(packet.topic, 0)

  // ignore meta (internal) topics
	if ( topicType == '$SYS') {

    const topic = getTopicParameter(packet.topic, 2)
    const topicMetrics = getTopicParameter(packet.topic, 3)
    const topicConnectionsInterval = getTopicParameter(packet.topic, 4)
    const topicMessagesInterval = getTopicParameter(packet.topic, 5)
		const payload = packet.payload.toString()

		switch (topic) {
			case 'clients':
				if(topicMetrics == 'connected') {
					preparePayloadObject(lastMetricsInfo, 'connectedClients', payload)
				}
			  break;
		 
			case 'load':
				if(topicMetrics == 'connections') {
          switch (topicConnectionsInterval) {
            case '1min':
              preparePayloadObject(lastMetricsInfo, 'connectionsLoad1min', payload)
              break;

            case '5min':
              preparePayloadObject(lastMetricsInfo, 'connectionsLoad5min', payload)
              break;

            default:
              preparePayloadObject(lastMetricsInfo, 'connectionsLoad15min', payload)
            break;
          }
				}

        if(topicMetrics == 'publish') {
          switch (topicMessagesInterval) {
            case '1min':
              preparePayloadObject(lastMetricsInfo, 'messagesLoad1min', payload)
              break;

            case '5min':
              preparePayloadObject(lastMetricsInfo, 'messagesLoad5min', payload)
              break;

            default:
              preparePayloadObject(lastMetricsInfo, 'messagesLoad15min', payload)
              break;
          }
				}
			  break;
    }
    
		return;
	}

  // handle packet
  let data;
  try {
    data = JSON.parse(packet.payload.toString());
  }
  catch (e) {
    logger.warn('Payload is not valid JSON. Ignoring.', packet.payload.toString(), e);
    return;
  }

  logger.debug(`Published data: ${packet.payload.toString()}, client: ${client.id}, topic: ${packet.topic}`);

  //TODO: support only ISO string???
  let metadata = {};
  if ("timestamp" in data) {
    metadata = { timestamp: 0 };
    // If it is a number, just copy it. Probably Unix time.
    if (typeof data.timestamp === "number") {
      if (!isNaN(data.timestamp)) {
        metadata.timestamp = data.timestamp;
      }
      else {
        logger.warn("Received an invalid timestamp (NaN)");
        metadata = {};
      }
    }
    else {
      // If it is a ISO string...
      const parsed = Date.parse(data.timestamp);
      if (!isNaN(parsed)) {
        metadata.timestamp = parsed;
      }
      else {
        // Invalid timestamp.
        metadata = {};
      }
    }
  }
  //send data to dojot broker
  let ids = parseClientIdOrTopic(client.id, packet.topic);
  iota.updateAttrs(ids.device, ids.tenant, data, metadata);
});

// Fired when a device.configure event is received
// (from dojot to device)
iota.messenger.on('iotagent.device', 'device.configure', (tenant, event) => {
  logger.debug('Got configure event from Device Manager', event)
  // device id
  let deviceId = event.data.id;
  delete event.data.id;

  // topic
  // For now, we are still using slashes at the beginning. In the future,
  // this will be removed (and topics will look like 'admin/efac/config')
  // let topic = `${tenant}/${deviceId}/config`;
  let topic = `/${tenant}/${deviceId}/config`;

  // device
  let message = {
    'topic': topic,
    'payload': JSON.stringify(event.data.attrs),
    'qos': 0,
    'retain': false
  };

  // send data to device
  logger.debug('Publishing', message)
  server.publish(message, () => { logger.debug('Message out!!') });

});

const disconnectCachedDevice = (event) => {
  const deviceId = event.data.id;
  const tenant = event.meta.service;
  const key = `${tenant}:${deviceId}`;

  let cacheEntry = cache.get(key);
  if (cacheEntry && cacheEntry.tenant === tenant &&
    cacheEntry.deviceId === deviceId) {
    if (cacheEntry.client) {
      cacheEntry.client.close();
    }
    cache.delete(key);
  }
  // (backward compatibility)
  else {
    let client;
    // TODO: keep a reverse map?
    for (let entry of cache.values()) {
      if(entry.tenant === tenant && entry.deviceId === deviceId) {
        client = entry.client;
        break;
      }
    }
    let clientId;
    if(client) {
      clientId = client.id;
      client.close();
    }
    cache.delete(clientId);
  }
}

// // Fired when a device.remove event is received
iota.messenger.on('iotagent.device', 'device.remove', (tenant, event) => {
  logger.debug('Got device.remove event from Device Manager', tenant);
  disconnectCachedDevice(event);
});

}).catch((error)=> {
  logger.error(`Could not initialize messenger: ${error}.`);
  logger.error("Bailing out");
  process.kill(process.pid, "SIGTERM");
});