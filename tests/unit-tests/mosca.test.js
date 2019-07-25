/* eslint-disable no-undef */

const Mosca = require("../../src/mosca").MqttBackend;
const mosca = new Mosca();
const client = require("./moscaSetup").clientSetup;
const packet = require("./moscaSetup").packetSetup;

const agent = require("./moscaSetup").agentSetup;

describe("Testing Mosca functions", () => {
    test("Should define the attribute agentCallback as the string passed as argument", () => {
        mosca.onMessage('message');
        expect(mosca.agentCallback).toEqual('message');
    });

    test("Should define the attribute agentCallbackInternal as the string passed as argument", () => {
        mosca.onInternalMessage('message');
        expect(mosca.agentCallbackInternal).toEqual('message');
    });

    test("Should split a string passed as first argument and return a string that corresponds to value of array at index passed as second argument", () => {
        expect(mosca._getTopicParameter('tenant/deviceId/attrs', 1)).toEqual('deviceId');
    });

});


describe("Testing Mosca authenticate function using Setup", () => {
    test("Testing Condition 1: client.id follows the pattern tenant:deviceId)", (done) => {
        let newClient = {...client};
        newClient.id = null;

        mosca.authenticate(newClient, "admin", "admin", (moscaCache) => {
            expect(mosca.cache.client).toBeUndefined();
            done();
        });
    });

    test("Testing Condition 2: Client certificate belongs to the device identified in the clientId", (done) => {
        mosca.authenticate(client, "admin", "admin", (moscaCache) => {
            expect(mosca.cache.client).toBeUndefined();
            done();
        });
    });

});

describe("Testing Mosca functions using Setup", () => {
    test("Should split a string passed as first argument and return a debug message", () => {
        mosca._processMessage(packet, client);
        expect(mosca.agentCallback).toEqual("message");
    });
});

describe("Testing Mosca function parseClientidOrTopic", () => {
    test("Should parse a string and return an object {tenant:'admin', device:'98787de'} or undefined", () => {
        expect(mosca.parseClientIdOrTopic("admin:98787de")).toEqual({tenant: 'admin', device: '98787de'});
    });

    test("Should parse a string and return an object {'tenant':'', 'device':''} or undefined", () => {
        expect(mosca.parseClientIdOrTopic()).toBeUndefined();
    });

    test("Should parse a string and return an object {'tenant':'admin', 'device':'98787de'} or undefined", () => {
        expect(mosca.parseClientIdOrTopic(null, "/admin/98787de/attrs")).toEqual({tenant: 'admin', device: '98787de'});
    });

    test("Should parse a string and return an object {tenant:'admin', device:'98787de'} or undefined", () => {
        expect(mosca.parseClientIdOrTopic(null, "admin:98787de")).toBeUndefined();
    });

    test("Should parse a string and return an object {tenant:'admin', device:'98787de'} or undefined", () => {
        expect(mosca.parseClientIdOrTopic(0, "98787de")).toBeUndefined();
    });
});


describe("Testing Mosca function _checkAuthorization", () => {

    test("Should check the authorization of device", (done) => {
        mosca._checkAuthorization(client, '/tenant/98787de/attrs', 'temperature', (callback) => {
            expect(mosca.cache.client).toBeUndefined();
            done();
        });
    });

    it("Test .then function", () => {
        const newMosca = new Mosca(agent);
        newMosca.cache.set(client.id, { client: client, tenant: null, deviceId: null });

        return(newMosca._checkAuthorization(client, '/tenant/98787de/attrs', 'temperature').then(expect(newMosca.cache.client).toBeUndefined()));
    });
});

describe("Testing Mosca function _checkAuthorization", () => {
    const newMosca = new Mosca(agent);

    test("Should check the authorization of device", () => {
        newMosca.cache.set('admin:u86fda', {tenant: 'admin', deviceId: 'u86fda', client: client});

        newMosca.disconnectDevice('admin', 'u86fda');
        expect(newMosca.cache.client).toBeUndefined();
    });

    test("Should check the authorization of device", () => {
        newMosca.cache.set('admin:u86fda', {tenant: 'admin', deviceId: 'u86fda'});

        newMosca.disconnectDevice('admin', 'u86fda');
        expect(newMosca.cache.client).toBeUndefined();
    });
});
