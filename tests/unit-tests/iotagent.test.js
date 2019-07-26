/* eslint-disable no-undef */
"use strict";

/**
 * Unit tests for iotagent-mosca
 *
 * This module has the following dependencies:
 *
 * - mosca
 */

const mosca = require("mosca");
const backend = require("../../src/mosca");
const defaultConfig = require("../../src/config");

//
// Mocking dependencies
//
jest.mock("mosca");

describe("Mosca backend", () => {

    beforeEach(() => {
        mosca.Server.mockClear();
    });

    it("Should build a MqttBackend instance", () => {
        const mqttBackend = new backend.MqttBackend("sample-agent");
        expect(mqttBackend).toBeDefined();

        const serverArgs = mosca.Server.mock.calls[0][0];
        const mqttInterfaces = serverArgs.interfaces;
        expect(mqttInterfaces.length).toEqual(1);
        expect(mqttInterfaces[0].type).toEqual("mqtts");
        expect(mqttInterfaces[0].port).toEqual(8883);
    });

    it("Should build a MqttBackend instance with support for unsecure connections", () => {
        const config = JSON.parse(JSON.stringify(defaultConfig));
        config.allow_unsecured_mode = 'true';

        const mqttBackend = new backend.MqttBackend("sample-agent", config);
        expect(mqttBackend).toBeDefined();

        const serverArgs = mosca.Server.mock.calls[0][0];
        const mqttInterfaces = serverArgs.interfaces;
        // expect(mqttInterfaces.length).toEqual(2);
        expect(mqttInterfaces[0].type).toEqual("mqtts");
        expect(mqttInterfaces[0].port).toEqual(8883);
        // expect(mqttInterfaces[1].type).toEqual("mqtt");
        // expect(mqttInterfaces[1].port).toEqual(1883);
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
        const mqttBackend = new backend.MqttBackend("sample-agent");
        mqttBackend.agentCallback = jest.fn();
        mqttBackend.agentCallbackInternal = jest.fn();

        const samplePacket = {
            topic: "$SYS/Yoda",
            payload: { toString: () => "sample-payload" }
        }

        const sampleClient = {
            id: "tenant:device"
        }

        mqttBackend._processMessage(samplePacket, sampleClient);
        expect(mqttBackend.agentCallbackInternal).toHaveBeenCalledWith("$SYS/Yoda", samplePacket.payload);
    });

});
