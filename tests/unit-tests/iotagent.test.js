/* eslint-disable no-undef */
"use strict";

/**
 * Unit tests for iotagent-mosca
 *
 * This module has the following dependencies:
 *
 * - mosca
 */

// var Agent = require('@dojot/iotagent-nodejs').IoTAgent;
const mosca = require("mosca");
const backend = require("../../src/mosca");
var Agent = require('@dojot/iotagent-nodejs').IoTAgent;
const IoTAgent = require("../../src/iotagent").IoTAgent;
const defaultConfig = require("../../src/config");
const HealthChecker = require("../../src/healthcheck").AgentHealthChecker;
const Metrics = require("../../src/metrics").Metrics;
const moscaSetup = require("../moscaSetup");

jest.mock('fs');
//
// Mocking dependencies
//
jest.mock("mosca");
jest.mock("@dojot/iotagent-nodejs");

const FOLDER_PRESENT_CONFIG = {'./mosca/certs/ca.crl': "TEST"};

describe("Mosca backend", () => {
    beforeEach(() => {
        mosca.Server.mockClear();
        jest.resetModules();
        require("fs").__createMockFiles(FOLDER_PRESENT_CONFIG);
    });
    afterEach(() => {
        mosca.Server.mockReset();
    });

    afterAll(() => {
        mosca.Server.mockRestore();
    });

    it("Should build a MqttBackend instance", () => {
        const mqttBackend = new backend.MqttBackend("sample-agent");
        const iotagent = new IoTAgent();
        expect(mqttBackend).toBeDefined();
        expect(iotagent).toBeDefined();

        const serverArgs = mosca.Server.mock.calls[0][0];
        const mqttInterfaces = serverArgs.interfaces;
        expect(mqttInterfaces.length).toEqual(1);
        expect(mqttInterfaces[0].type).toEqual("mqtts");
        expect(mqttInterfaces[0].port).toEqual(8883);
    });

    it("Should build a MqttBackend instance with support for unsecure connections", () => {
        // const config = JSON.parse(JSON.stringify(defaultConfig));
        defaultConfig.allow_unsecured_mode = true;

        const mqttBackend = new backend.MqttBackend("sample-agent", defaultConfig);
        expect(mqttBackend).toBeDefined();

        const serverArgs = mosca.Server.mock.calls[0][0];
        const mqttInterfaces = serverArgs.interfaces;
        expect(mqttInterfaces.length).toEqual(2);
        expect(mqttInterfaces[0].type).toEqual("mqtts");
        expect(mqttInterfaces[0].port).toEqual(8883);
        expect(mqttInterfaces[1].type).toEqual("mqtt");
        expect(mqttInterfaces[1].port).toEqual(1883);
    });

    it("Should register callbacks for mosca events", () => {
        const mqttBackend = new backend.MqttBackend("sample-agent");
        mqttBackend.server = {
            authenticate: undefined,
            authorizePublish: undefined,
            authorizeSubscribe: undefined,
            on: jest.fn()
        };

        mqttBackend._checkAuthorization = jest.fn();
        mqttBackend._getTopicParameter = jest.fn();
        mqttBackend.cache = { delete: jest.fn() };

        mqttBackend._setMoscaCallbacks();
        expect(mqttBackend.server.authenticate).toBeDefined();
        expect(mqttBackend.server.authorizePublish).toBeDefined();
        expect(mqttBackend.server.authorizeSubscribe).toBeDefined();

        // Checking whether callbacks do the right thing
        mqttBackend.server.authorizePublish("sample-client", "sample-topic", "sample-payload", "sample-callback");
        expect(mqttBackend._checkAuthorization).toHaveBeenCalledWith("sample-client", "sample-topic", "attrs", "sample-callback");

        mqttBackend.server.authorizeSubscribe("sample-client", "sample-topic", "sample-callback");
        expect(mqttBackend._checkAuthorization).toHaveBeenCalledWith("sample-client", "sample-topic", "config", "sample-callback");

        //Checking event registrations
        const eventRegistrations = mqttBackend.server.on.mock.calls;
        expect(eventRegistrations.length).toEqual(3);
        expect(eventRegistrations[0][0]).toEqual("published");

        //Checking "clientConnected" event registration
        expect(eventRegistrations[1][0]).toEqual("clientConnected");
        eventRegistrations[1][1]("sample-client");
        // Expect just not to break

        //Checking "clientDisconnected" event registration
        expect(eventRegistrations[2][0]).toEqual("clientDisconnected");
        eventRegistrations[2][1]({id: "sample-client"});
        expect(mqttBackend.cache.delete).toHaveBeenCalledWith("sample-client");
    });

    it("Should be able to register a callback for processing messages", () => {
        const mqttBackend = new backend.MqttBackend("sample-agent");
        mqttBackend.onMessage("sample-callback");
        expect(mqttBackend.agentCallback).toEqual("sample-callback");
    });

    it("Should split a string and return the value of array[index] passed as second argument", () => {
        const mqttBackend = new backend.MqttBackend("sample-agent");
        expect(mqttBackend._getTopicParameter("tenant/deviceId/attrs", 1)).toEqual("deviceId");
        expect(mqttBackend._getTopicParameter("tenant/deviceId/attrs", 3)).toBeUndefined();
    });

    it("Should parse a string and return an object {tenant:'tenant', device:'deviceId'} or undefined", () => {
        const mqttBackend = new backend.MqttBackend("sample-agent");
        expect(mqttBackend.parseClientIdOrTopic("admin:98787de")).toEqual({tenant: 'admin', device: '98787de'});
        expect(mqttBackend.parseClientIdOrTopic("/admin/98787de/attrs")).toBeUndefined();
        expect(mqttBackend.parseClientIdOrTopic()).toBeUndefined();
        expect(mqttBackend.parseClientIdOrTopic("admin:98787de", "/admin/98787de/attrs")).toEqual({tenant: 'admin', device: '98787de'});
        expect(mqttBackend.parseClientIdOrTopic(null, "/admin/98787de/attrs")).toEqual({tenant: 'admin', device: '98787de'});
        expect(mqttBackend.parseClientIdOrTopic(null, "admin:98787de")).toBeUndefined();
        expect(mqttBackend.parseClientIdOrTopic(0, "98787de")).toBeUndefined();
    });

    it("Should be able to register a callback processing internal messages", () => {
        const mqttBackend = new backend.MqttBackend("sample-agent");
        mqttBackend.onInternalMessage("sample-callback");
        expect(mqttBackend.agentCallbackInternal).toEqual("sample-callback");
    });

    it("Should process internal messages properly", () => {
        //As _processMessages is one entrypoint for data, it will be
        //tested (even if it is a internal function)
        const iotagent = new IoTAgent();
        iotagent.agent = new Agent();
        iotagent.mqttBackend = new backend.MqttBackend(iotagent.agent);
        iotagent.metricsStore = new Metrics();

        const samplePacket = {
            topic: "$SYS/Yoda/",
            payload: { toString: () => "sample-payload" }
        }

        expect(iotagent).toBeDefined();
        expect(iotagent.mqttBackend).toBeDefined();
        expect(iotagent.getTopicParameter(samplePacket.topic, 1)).toEqual('Yoda');
        expect(iotagent.getTopicParameter()).toBeUndefined();
        expect(iotagent.getTopicParameter('topic')).toEqual('topic');

        samplePacket.topic = '$SYS/topic/clients/connected';
        samplePacket.payload = '100';

        iotagent._processInternalMessage(samplePacket.topic, samplePacket.payload);
        expect(iotagent.metricsStore.lastMetricsInfo.connectedClients).toEqual('100');

        samplePacket.topic = '$SYS/topic/load/connections/1min';
        samplePacket.payload = '1';

        iotagent._processInternalMessage(samplePacket.topic, samplePacket.payload);
        expect(iotagent.metricsStore.lastMetricsInfo.connectionsLoad1min).toEqual('1');

        samplePacket.topic = '$SYS/topic/load/connections/5min';
        samplePacket.payload = '5';

        iotagent._processInternalMessage(samplePacket.topic, samplePacket.payload);
        expect(iotagent.metricsStore.lastMetricsInfo.connectionsLoad5min).toEqual('5');

        samplePacket.topic = '$SYS/topic/load/connections/15min';
        samplePacket.payload = '15';

        iotagent._processInternalMessage(samplePacket.topic, samplePacket.payload);
        expect(iotagent.metricsStore.lastMetricsInfo.connectionsLoad15min).toEqual('15');

        samplePacket.topic = '$SYS/topic/load/publish/.../1min';
        samplePacket.payload = '1';

        iotagent._processInternalMessage(samplePacket.topic, samplePacket.payload);
        expect(iotagent.metricsStore.lastMetricsInfo.messagesLoad1min).toEqual('1');

        samplePacket.topic = '$SYS/topic/load/publish/.../5min';
        samplePacket.payload = '5';

        iotagent._processInternalMessage(samplePacket.topic, samplePacket.payload);
        expect(iotagent.metricsStore.lastMetricsInfo.messagesLoad5min).toEqual('5');

        samplePacket.topic = '$SYS/topic/load/publish/.../15min';
        samplePacket.payload = '15';

        iotagent._processInternalMessage(samplePacket.topic, samplePacket.payload);
        expect(iotagent.metricsStore.lastMetricsInfo.messagesLoad15min).toEqual('15');
    });

    it("Should process internal messages properly", () => {
        const iotagent = new IoTAgent();
        const healthcheck = new HealthChecker();
        iotagent.agent = new Agent();
        iotagent.mqttBackend = new backend.MqttBackend(iotagent.agent);
        iotagent.metricsStore = new Metrics();

        iotagent.initHealthCheck(healthcheck.healthChecker);
        expect(iotagent.messageMonitor.monitor).toBeDefined();
        // expect(iotagent._registerCallbacks()).toBeTruthy();

        const data = {
            timestamp: 10294384078
        };

        iotagent._processMessage('admin', 'uu6asd', data);
        expect(iotagent.messageMonitor.value).toBeGreaterThan(0);

        data.timestamp = undefined;

        expect(iotagent._generateMetadata(data)).toEqual({});
    });

    it("Should process internal messages properly", () => {
        const iotagent = new IoTAgent();

        const event = {
            data: {
                id: 235,
            }
        };

        expect(iotagent._processDeviceRemoval('admin', event)).toBeUndefined();
    });

});
