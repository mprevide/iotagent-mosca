"use strict";

/**
 * Unit tests for Auth module
 *
 * This module has the following dependencies:
 *
 * - axios
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
    it("should build a MqttBackend instance", () => {
        const mqttBackend = new backend.MqttBackend("sample-agent");
        expect(mqttBackend).toBeDefined();
        const serverArgs = mosca.Server.mock.calls[0][0];
        const mqttInterfaces = serverArgs.interfaces
        expect(mqttInterfaces.length).toEqual(1);
        expect(mqttInterfaces[0].type).toEqual("mqtts");
        expect(mqttInterfaces[0].port).toEqual(8883);
    });

    it("should build a MqttBackend instance with support for unsecured connections", () => {
        const config = JSON.parse(JSON.stringify(defaultConfig));
        config.allow_unsecured_mode = true;
        const mqttBackend = new backend.MqttBackend("sample-agent", config);
        expect(mqttBackend).toBeDefined();
        const serverArgs = mosca.Server.mock.calls[0][0];
        const mqttInterfaces = serverArgs.interfaces;
        expect(mqttInterfaces.length).toEqual(2);
        expect(mqttInterfaces[0].type).toEqual("mqtts");
        expect(mqttInterfaces[0].port).toEqual(8883);
        expect(mqttInterfaces[1].type).toEqual("mqtt");
        expect(mqttInterfaces[1].port).toEqual(1883);
    });


    it("should register callbacks for mosca events", () => {
        const mqttBackend = new backend.MqttBackend("sample-agent");
        mqttBackend.server = {
            authenticate: undefined,
            authorizePublish: undefined,
            authorizeSubscribe: undefined,
            on: jest.fn()
        };
        mqttBackend._checkAuthorization = jest.fn();
        mqttBackend.cache = { delete: jest.fn()};

        mqttBackend._setMoscaCallbacks();
        expect(mqttBackend.server.authenticate).toBeDefined();
        expect(mqttBackend.server.authorizePublish).toBeDefined();
        expect(mqttBackend.server.authorizeSubscribe).toBeDefined();

        // Checking whether callbacks do the right thing
        mqttBackend.server.authorizePublish("sample-client", "sample-topic", "sample-payload", "sample-callback");
        expect(mqttBackend._checkAuthorization).toHaveBeenCalledWith("sample-client", "sample-topic", "attrs", "sample-callback");

        mqttBackend.server.authorizeSubscribe("sample-client", "sample-topic", "sample-callback");
        expect(mqttBackend._checkAuthorization).toHaveBeenCalledWith("sample-client", "sample-topic", "config", "sample-callback");

        // Checking event registrations
        const eventRegistrations = mqttBackend.server.on.mock.calls;
        expect(eventRegistrations.length).toEqual(3);

        expect(eventRegistrations[0][0]).toEqual("published");

        // Checking "clientConnected" event registration
        expect(eventRegistrations[1][0]).toEqual("clientConnected");
        eventRegistrations[1][1]("sample-client");
        // Expect just not to break

        // Checking "clientDisconnected" event registration
        expect(eventRegistrations[2][0]).toEqual("clientDisconnected");
        eventRegistrations[2][1]({id: "sample-client"});
        expect(mqttBackend.cache.delete).toHaveBeenCalledWith("sample-client");
    });

    it("should be able to register a callback for processing messages", () => {
        const mqttBackend = new backend.MqttBackend("sample-agent");
        mqttBackend.onMessage("sample-callback");
        expect(mqttBackend.agentCallback).toEqual("sample-callback");
    });

    it("should be able to register a callback for processing internal messages", () => {
        const mqttBackend = new backend.MqttBackend("sample-agent");
        mqttBackend.onInternalMessage("sample-callback");
        expect(mqttBackend.agentCallbackInternal).toEqual("sample-callback");
    })

    it("should process messages properly", () => {
        // As _processMessages is one entrypoint for data, it will be
        // tested (even if it is a internal function)

    });

    it("should process internal messages properly", () => {
        // As _processMessages is one entrypoint for data, it will be
        // tested (even if it is a internal function)
        const mqttBackend = new backend.MqttBackend("sample-agent");
        mqttBackend.agentCallback = jest.fn();
        mqttBackend.agentCallbackInternal = jest.fn();

        const samplePacket = {
            topic: "$SYS/Yada",
            payload: { toString: () => "sample-payload" }
        }
        const sampleClient = {
            id: "tenant:device"
        }
        mqttBackend._processMessage(samplePacket, sampleClient);
        expect(mqttBackend.agentCallbackInternal).toHaveBeenCalledWith("$SYS/Yada", samplePacket.payload);

    });
});
