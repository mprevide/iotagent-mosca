"use strict";
const mosca = require("mosca");
const config = require("./config");
const fs = require('fs');
const logger = require("@dojot/dojot-module-logger").logger;
const util = require("util");
const Cert = require("./certificates").Certificates;

const TAG = { filename: "mqtt-backend"};
const logLevel = config.logger.level;
let contador = 1;
/**
 * Class responsible for MQTT backend operations.
 */
class MqttBackend {
  constructor(agent) {

    logger.debug("Initializing xx...", TAG);
    this.cert = new Cert();
    logger.debug("... xxxx xx was successfully initialized");

    // Mosca Settings
    var moscaInterfaces = [];
    // Load CRL - Certificate Revocation List
    var crls = [
      fs.readFileSync(config.mosca_tls.crl)
    ];

    // mandatory
    var mqtts = {
      type: "mqtts",
      port: 8883,
      credentials: {
        keyPath: config.mosca_tls.key,
        certPath: config.mosca_tls.cert,
        caPaths: [config.mosca_tls.ca],
        crl: crls,
        requestCert: true, // enable requesting certificate from clients
        rejectUnauthorized: true // only accept clients with valid certificate
      }
    };
    moscaInterfaces.push(mqtts);

    // optional
    if (config.allow_unsecured_mode === true) {
      var mqtt = {
        type: "mqtt",
        port: 1883
      };
      moscaInterfaces.push(mqtt);
    }

    var moscaSettings = {
      backend: {
        type: "redis",
        redis: require("redis"),
        db: 12,
        port: config.backend_port,
        return_buffers: true, // to handle binary payloads
        host: config.backend_host
      },
      persistence: {
        factory: mosca.persistence.Redis,
        host: config.backend_host
      },
      interfaces: moscaInterfaces,
      logger: { name: "MoscaServer", level: logLevel },
      stats: true
    };

    this.cache = new Map();
    this.agent = agent;
    this.server = new mosca.Server(moscaSettings);

    // Fired when mosca server is ready
    const boundSetMoscaCallbacks = this._setMoscaCallbacks.bind(this);
    this.server.on("ready", boundSetMoscaCallbacks);
    this.agentCallback = undefined;
    this.agentCallbackInternal = undefined;
  }

  /**
   * Set a callback to be invoked when a message is received via MQTT.
   *
   * It should have at least three parameters:
   *
   * - {string} tenant: The tenant associated to the message
   * - {string} deviceId: The device identifier that sent this message
   * - {obj} data: The JSON object sent by the device.
   *
   * @param {function} callback The callback to be invoked whenever a new message
   * is received via Mosca server
   */
  onMessage(callback) {
    this.agentCallback = callback;
  }

  /**
   * Set a callback to be invoked when an internal message is received via MQTT.
   *
   * It should have at least two parameters:
   *
   * - {string} topic: The topic by which the message was received
   * - {string} payload: The message payload
   *
   * @param {function} callback The callback to be invoked whenever a new
   * internal message is received via Mosca server
   */
  onInternalMessage(callback) {
    this.agentCallbackInternal = callback;
  }

  /**
   * Register all Mosca callbacks.
   *
   * This function should be called only once and after Mosca server is ready.
   */
  _setMoscaCallbacks() {
    logger.info("Mosca server is up and running", TAG);

    // callbacks
    this.server.authenticate = this.authenticate.bind(this);

    // Always check whether device is doing the right thing.
    this.server.authorizePublish = (client, topic, payload, callback) => {
      this._checkAuthorization(client, topic, "attrs", callback);
    };
    this.server.authorizeSubscribe = (client, topic, callback) => {
      this._checkAuthorization(client, topic, "config", callback);
    };

    const boundProcessMessage = this._processMessage.bind(this);
    this.server.on("published", boundProcessMessage);
    // Fired when a client connects to mosca server
    this.server.on('clientConnected', (client) => {
      logger.info(`Client connected: ${client.id}`, TAG);
    });

    // Fired when a client disconnects from mosca server
    this.server.on('clientDisconnected', (client) => {
      logger.info(`Client disconnected: ${client.id}`, TAG);
      this.cache.delete(client.id);
    });

  }

  /**
   * Helper function to retrieve parameters from topic tokens.
   *
   * This topic will be split into tokens separated by forward slashes (`/`)
   * @param {string} topic The topic to be split
   * @param {numbr} index The token index
   */
  _getTopicParameter(topic, index) {
    return topic.split('/')[index];
  }

  /**
   * Callback to process received messages
   *
   * This should be used only by setting it as callback for "published" event
   * in a Mosca server.
   * @param {obj} packet The received packet from Mosca server
   * @param {obj} client The connected client that sent this packet
   */
  _processMessage(packet, client) {
    logger.debug(`Received a message via MQTT.`, TAG);
    if (!this.agentCallback || !this.agentCallbackInternal) {
      logger.error(`There is no callback to invoke. This is an unrecoverable error.`, TAG);
      logger.error(`Bailing out.`, TAG);
      return;
    }

    const topicType = packet.topic.split('/')[0];
      // publish metrics topics
    if (topicType === '$SYS') {
      this.agentCallbackInternal(packet.topic, packet.payload);
      return;
    } else if ((client === undefined) || (client === null)) {
      logger.debug(`No MQTT client was created. Bailing out.`, TAG);
      return;
    }

    logger.debug(`Parsing it as a JSON object...`, TAG);
    let data;
    try {
      data = JSON.parse(packet.payload.toString());
    } catch (e) {
      logger.debug(`... failed.`, TAG);
      logger.warn(`Received message is not JSON: ${packet.payload.toString()}`, TAG);
      logger.warn(`Ignoring it.`, TAG);
      return;
    }
    logger.debug(`... payload was successfully parsed.`, TAG);

    logger.debug(`Client: ${client.id}`, TAG);
    logger.debug(`Topic: ${packet.topic}`, TAG);
    logger.debug(`Data: ${util.inspect(data)}`, TAG);

    //send data to dojot broker
    let ids = this.parseClientIdOrTopic(client.id, packet.topic);
    this.agentCallback(ids.tenant, ids.device, data);
  }

  /**
   * Retrieve tenant and device identifiers from client ID or topic.
   *
   * This method returns a dictionary like:
   *
   * ```json
   * {
   *    "tenant": "admin",
   *    "device": "98787de"
   * }
   * ```
   * In order to do so, the client ID should be set to `admin:98787de` or
   * the topic should be `/admin/98787de`. First this function will try to parse
   * the client ID and only if it fails it will try to parse the topic. If neither
   * of them are in the expected format, this function will return `undefined`.
   * @param {string} clientId: Identifier associated to the client currently
   * connecting to the broker
   * @param {string} topic The topic being used.
   * @returns A dictionary {"tenant": "", "device": ""} containing the tenant
   * and device ID, if any. Otherwise, it will return `undefined`.
   */
  parseClientIdOrTopic(clientId, topic) {
    if (clientId && typeof clientId === "string") {
      let parsedClientId = clientId.match(/^(\w+):(\w+)$/);
      if (parsedClientId) {
        return { tenant: parsedClientId[1], device: parsedClientId[2] };
      }
    }

    // fallback to topic-based id scheme
    if (topic && typeof topic === "string") {
      let parsedTopic = topic.match(/^\/([^/]+)\/([^/]+)/);
      if (parsedTopic) {
        return { tenant: parsedTopic[1], device: parsedTopic[2] };
      }
    }

    return;
  }

  /**
   * Authenticate a user when a message is received.
   *
   * This function will permit or deny a message to be received. The results
   * are passed back to Mosca backend by the `callback` parameter. It has two
   * parameters: the first one is an error description, if any, and the second
   * one is the authorization result (`true` for permission, `false` for
   * blocking).
   *
   * For now, this function won't use the username nor password, only connection
   * data such as TLS flags and certificates.
   *
   * @param {*} client The MQTT client defined by Mosca
   * @param {string} username The username used by the client.
   * @param {string} password The password used by the client.
   * @param {function} callback The callback to be executed when the decision is
   * made.
   */
  authenticate(client, username, password, callback) {
    logger.debug(`Authenticating MQTT client: ${client.id}`, TAG);

    // Condition 1: client.id follows the pattern tenant:deviceId
    // Get tenant and deviceId from client.id
    logger.debug(`Trying to retrieve tenant and device ID...`, TAG);
    let ids = this.parseClientIdOrTopic(client.id);
    if (!ids) {
      if (client.connection.stream.hasOwnProperty("TLSSocket")) {
        // reject client connection
        logger.debug(`... could not get tenant and device ID.`, TAG);
        logger.warn(`Connection rejected for ${client.id} due to invalid client ID.`, TAG);
        callback(null, false);
        return;
      } else {
        logger.debug(`... could not get tenant and device ID.`, TAG);
        logger.warn(`Couldn't get client data via neither client ID nor topic.`, TAG);
        logger.warn(`Will authorize nonetheless.`, TAG);
        logger.warn(`This behavior will be deprecated in the future.`, TAG);
        this.cache.set(client.id, { client: client, tenant: null, deviceId: null });
        callback(null, true);
        return;
      }
    }
    logger.debug(`... tenant and device ID were successfully retrieved.`, TAG);
    logger.debug(`They are: ${ids.tenant}:${ids.device}`, TAG);

    //test
    this.cert._updateCRLFile();
    console.log("MOSCA "+this.cert.getCRLPEM());
      contador++;
    fs.writeFile('mynewfile'+contador, this.cert.getCRLPEM(), function (err) {
          if (err) throw err;
          console.log('Saved!');
    });

    // Condition 2: Client certificate belongs to the
    // device identified in the clientId
    // TODO: the clientId must contain the tenant too!
    logger.debug(`Checking its certificates...`, TAG);
    if (client.connection.stream.hasOwnProperty("TLSSocket")) {
      const clientCertificate = client.connection.stream.getPeerCertificate();
      if (
        !clientCertificate.hasOwnProperty("subject") ||
        !clientCertificate.subject.hasOwnProperty("CN") ||
        clientCertificate.subject.CN !== ids.device
      ) {
        // reject client connection
        logger.debug(`... client certificate is invalid.`, TAG);
        logger.warn(`Connection rejected for ${client.id} due to invalid client certificate.`);
        callback(null, false);
        return;
      }
    }
    logger.debug(`... client certificate was successfully retrieved and it is valid.`, TAG);

    // Condition 3: Device exists in dojot
    logger.debug(`Checking whether this device exists in dojot...`, TAG);
    this.agent
      .getDevice(ids.device, ids.tenant)
      .then(() => {
        // add device to cache
        logger.debug(`... device exists in dojot.`, TAG);
        logger.debug(`Adding it to the cache...`, TAG);
        this.cache.set(client.id, {
          client: client,
          tenant: ids.tenant,
          deviceId: ids.device
        });
        //authorize client connection
        logger.debug(`... cache entry added.`, TAG);
        logger.info(`Connection authorized for ${client.id}.`, TAG);
        callback(null, true);
      })
      .catch(error => {
        //reject client connection
        logger.debug(`... device does not exist in dojot.`, TAG);
        logger.warn(`Connection rejected for ${client.id} due to invalid device.`, TAG);
        logger.warn(`Error is: ${error}.`, TAG);
        callback(null, false);
      });
    logger.debug(`... device check was requested.`, TAG);
  }


  /**
   * Check authorization when a MQTT client wants to publish something or
   * subscribe to a particular topic.
   *
   * The client must have connected to Mosca using a TLS connection (its
   * identity is checked using its certificate) or by connecting with specific
   * client ID which has the tenant and device ID it represents. This function
   * will check these information to allow or deny this device to publish to
   * a particular topic (in this case, `/tenant/deviceid/attrs`) or create a
   * subscription so that it can receive actuation messages (in this case, the
   * topic would be `/tenant/deviceid/config`).
   *
   * The callback should be a function with two parameters. The first one should
   * have the error, if any, and the second one is the decision made. `true`
   * should allow the client to perform what it intended to do (publish or
   * subscribe) and `false` should block its action.
   *
   * @param {*} client The MQTT client defined by Mosca
   * @param {string} topic The topic to be checked (both publishing and subscription)
   * @param {string} tag The topic ending which will be checked
   * @param {string} payload The payload send by the device (or actuation message)
   * @param {function} callback The callback to be executed when the decision is
   * made
   */
  _checkAuthorization(client, topic, tag, callback) {
    logger.debug(`Authorizing MQTT client ${client.id} to publish to ${topic}`, TAG);

    logger.debug(`Retrieving cache entry...`, TAG);
    let cacheEntry = this.cache.get(client.id);
    if (!cacheEntry) {
      // If this happens, there is something very wrong!!
      logger.debug(`... could not retrieve cache entry.`, TAG);
      logger.error(`Received an unexpected messagem from ${client.id}.`, TAG);
      callback(null, false);
      return;
    }
    logger.debug(`... cache entry was successfully retrieved.`, TAG);

    logger.debug(`Retrieving tenant and device ID...`, TAG);
    let ids = this.parseClientIdOrTopic(client.id, topic);
    if (!ids) {
      logger.debug(`... error while retrieving tenant and device ID.`, TAG);
      logger.warn(`Blocking ${client.id} from accessing ${topic}.`, TAG);
      callback(null, false);
      return;
    }
    logger.debug(`... tenant and device ID were successfully retrieved.`, TAG);
    logger.debug(`They are: ${ids.tenant}:${ids.device}`, TAG);

    // (backward compatibility)

    // NOTE: This doesn't work as intended.
    // If the device is not in the cache, then a request is sent to DeviceManager.
    // Despite sending the request and processing it, its results *won't affect*
    // anything, as the callback will be invoked *after* the decision is made, as
    // this is an asynchronous call. This is not definetly the same case as
    // the authentication procedure performed in `authenticate` function. There,
    // there is nothing to be done after the call to DeviceManager is performed,
    // so any call to `callback` will be its final decision.
    if (cacheEntry.deviceId === null) {
      logger.warn(`Client connection was not properly authenticated.`, TAG);
      logger.warn(`This behavior will be deprecated in the future.`, TAG);
      logger.warn(`Checking whether this device exists in dojot...`, TAG);
      // Device exists in dojot
      this.agent.getDevice(ids.device, ids.tenant)
        .then(() => {
          logger.warn(`... device exists in dojot.`, TAG);
          logger.warn(`Adding it to the cache...`, TAG);
          // add device to cache
          cacheEntry.tenant = ids.tenant;
          cacheEntry.deviceId = ids.device;
          this.cache.set(client.id, cacheEntry);
          logger.warn(`... cache entry added.`, TAG);
        })
        .catch(error => {
          logger.warn(`... device does not exist in dojot.`, TAG);
          logger.warn(`Connection was rejected and device doesn't exist. Really?`, TAG);
          logger.warn(`Error is: ${error}.`, TAG);
          callback(null, false);
          return;
        });
    }

    // a client is not allowed to publish on behalf of more than one device
    logger.debug(`Checking whether client is associated to device...`, TAG);
    if (ids.tenant !== cacheEntry.tenant && cacheEntry.deviceId !== null && ids.device !== cacheEntry.deviceId) {
      logger.debug(`... client is not associated to device.`, TAG);
      //reject
      logger.warn(`Client ${client.id} trying to publish on behalf of
        devices: ${ids.device} and ${cacheEntry.deviceId}.`, TAG);
      callback(null, false);
      return;
    }
    logger.debug(`... client is associated to device.`);

    let expectedTopic = `/${ids.tenant}/${ids.device}/${tag}`;

    logger.debug(`Expected topic is ${expectedTopic}`, TAG);
    logger.debug(`Device published on topic ${topic}`, TAG);
    if (topic === expectedTopic) {
      // authorize
      logger.debug(`Authorizing client ${client.id} to publish on ${topic}`, TAG);
      callback(null, true);
      return;
    }

    //reject
    logger.warn(`Rejected client ${client.id} to publish to topic ${topic}`, TAG);
    callback(null, false);
  }

  /**
   * Force disconnect a device.
   *
   * This function will disconnect a particular device (set by deviceId) which
   * will no longer be used in dojot. This function could be invoked when
   * receiving a device removal message from DeviceManager, for instance.
   *
   * @param {string} tenant The tenant associated to the device being disconnected.
   * @param {*} deviceId The ID of the device being disconnected.
   */
  disconnectDevice(tenant, deviceId) {
    logger.debug(`Disconnecting device ${tenant}:${deviceId}...`, TAG);
    const key = `${tenant}:${deviceId}`;

    let cacheEntry = this.cache.get(key);
    if (cacheEntry && cacheEntry.tenant === tenant &&
      cacheEntry.deviceId === deviceId) {
      if (cacheEntry.client) {
        logger.info(`Closing device connection...`, TAG);
        cacheEntry.client.close();
        logger.info(`... device connection was successfully closed.`, TAG);
      }
      logger.debug(`Removing it from cache...`, TAG);
      this.cache.delete(key);
      logger.debug(`... device was successfully removed from cache.`, TAG);
    }
    // (backward compatibility)
    else {
      let client;
      // TODO: keep a reverse map?
      for (let entry of this.cache.values()) {
        if (entry.tenant === tenant && entry.deviceId === deviceId) {
          client = entry.client;
          break;
        }
      }
      let clientId;
      if (client) {
        clientId = client.id;
        client.close();
      }
      this.cache.delete(clientId);
    }
    logger.debug(`... device was successfully disconnected from broker.`, TAG);
  }
}

module.exports = {
  MqttBackend,
};
