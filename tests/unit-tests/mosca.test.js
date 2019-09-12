/* eslint-disable no-undef */

const Mosca = require("../../src/mosca");
const client = require("../moscaSetup").clientSetup;
const packet = require("../moscaSetup").packetSetup;
const config = require("../../src/config");
const agent = require("../moscaSetup").agentSetup;
const TLSSocket = require("tls").TLSSocket;
const ioTAgent = require('@dojot/iotagent-nodejs').IoTAgent;
const mosca = new Mosca.MqttBackend();

jest.mock('fs');
jest.mock('tls');

const FOLDER_PRESENT_CONFIG = {'./mosca/certs/ca.crl': "TEST"};

jest.mock('tls');
jest.mock('@dojot/iotagent-nodejs');


describe("Testing Mosca functions", () => {

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        jest.resetAllMocks();
        require("fs").__createMockFiles(FOLDER_PRESENT_CONFIG);
    });

    test("Should define the attribute agentCallback as the string passed as argument", () => {
        mosca.onMessage();
        expect(mosca.agentCallback).toBeUndefined();
    });

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

    test("Test tls Inactivity Timeout ", () => {
        const cmds = {};
        TLSSocket.mockImplementation(() => {
            const rv = Object.create(TLSSocket.prototype);
            rv.on = function (eventName, callback) {
                cmds[eventName] = callback;
            };
            return rv;
        });
        client.connection.stream = new TLSSocket(null);
        config.mosca_tls.idleTimeout = 1;
        mosca._tlsIdleTimeout(client, '', '');
        expect(client.connection.stream.setTimeout).toBeCalled();
        const spy = jest.spyOn(Mosca.MqttBackend.prototype, 'disconnectDevice');
        cmds.timeout();
        expect(Mosca.MqttBackend.prototype.disconnectDevice).toHaveBeenCalled();
        spy.mockRestore();
    });

    test("Testing method tls Connection Expiration ", () => {
        jest.useFakeTimers();
        client.connection.stream = new TLSSocket(null);
        mosca._tlsMaxLifetime(client, '', '');
        expect(client.connection.stream.end).not.toBeCalled();
        const spy = jest.spyOn(Mosca.MqttBackend.prototype, 'disconnectDevice');
        jest.runAllTimers();
        expect(mosca.disconnectDevice).toBeCalled();
        expect(Mosca.MqttBackend.prototype.disconnectDevice).toHaveBeenCalled();
        spy.mockRestore();
    });


    test("Testing  authenticate : for a authorized client and find device", (done) => {

        TLSSocket.mockImplementation(() => {
            const rv = Object.create(TLSSocket.prototype);
            rv.getPeerCertificate = function () {
                return {subject: {CN: client.id}};
            };
            return rv;
        });
        client.connection.stream = new TLSSocket(null);

        ioTAgent.mockImplementation(() => {
            const rv = Object.create(ioTAgent.prototype);
            rv.getDevice = function (deviceId, tenantId) {
                return Promise.resolve();
            };
            return rv;
        });

        const mosca2 = new Mosca.MqttBackend(new ioTAgent());

        mosca2.authenticate(client, "", "", (param1, param2) => {
            expect(param1).toBeNull();
            expect(param2).toBeTruthy();
            done();
        });

    });

    test("Testing  authenticate : for a authorized client and cant find device", (done) => {

        TLSSocket.mockImplementation(() => {
            const rv = Object.create(TLSSocket.prototype);
            rv.getPeerCertificate = function () {
                return {subject: {CN: client.id}};
            };
            return rv;
        });
        client.connection.stream = new TLSSocket(null);

        ioTAgent.mockImplementation(() => {
            const rv = Object.create(ioTAgent.prototype);
            rv.getDevice = function (deviceId, tenantId) {
                return Promise.reject();
            };
            return rv;
        });

        const mosca2 = new Mosca.MqttBackend(new ioTAgent());
        mosca2.authenticate(client, "", "", (param1, param2) => {
            expect(param1).toBeNull();
            expect(param2).toBeFalsy();
            done();
        });

    });

    test("Testing  authenticate : for a user with client.id and tls", (done) => {

        TLSSocket.mockImplementation(() => {
            const rv = Object.create(TLSSocket.prototype);
            rv.getPeerCertificate = function () {
                return {subject: {CN: client.id}};
            };
            return rv;
        });
        client.connection.stream = new TLSSocket(null);
        let newClient = {...client};
        newClient.id = null;

        const mosca2 = new Mosca.MqttBackend();
        mosca2.authenticate(newClient, "", "", (param1, param2) => {
            expect(param1).toBeNull();
            expect(param2).toBeFalsy();
            done();
        });

    });

    test("Testing  authenticate : for a user with client.id not tls", (done) => {
        client.connection.stream = {};
        let newClient = {...client};
        newClient.id = null;

        const mosca2 = new Mosca.MqttBackend();
        mosca2.authenticate(newClient, "", "", (param1, param2) => {
            expect(param1).toBeNull();
            expect(param2).toBeTruthy();
            done();
        });

    });


    test("Testing  authenticate Condition 2: wrong certificate", (done) => {

        TLSSocket.mockImplementation(() => {
            const rv = Object.create(TLSSocket.prototype);
            rv.getPeerCertificate = function () {
                return {subject: {CN: client.id + 'xx'}};
            };
            return rv;
        });
        client.connection.stream = new TLSSocket(null);

        const mosca2 = new Mosca.MqttBackend();
        mosca2.authenticate(client, "", "", (param1, param2) => {
            expect(param1).toBeNull();
            expect(param2).toBeFalsy();
            done();
        });

    });

    test("Should split a string passed as first argument and return a debug message", () => {
        mosca.onMessage('message');
        mosca._processMessage(packet, client);
        expect(mosca.agentCallback).toEqual("message");

        expect(mosca._processMessage(packet, null)).toBeUndefined();

        packet.topic = '$SYS/admin/6dc341/attrs';
        packet.payload = {'message': 'ashfhasdjfkasdfaksfdasfasdfasdhfasdfasdhfhasdfhasdfasdfhkasdhflasdfhasdhfasdjfiopasdfjnasfgasdfjasdfoasdfhasdlflasdfjlasdlçfjklçasdfoasfgakljkl'};

        mosca.agentCallbackInternal = jest.fn();
        expect(mosca._processMessage(packet, null)).toBeUndefined();
    });

    test("_processMessage without agentCallBack", () => {
        mosca.agentCallbackInternal = null;
        expect(mosca._processMessage(null, null)).toBeUndefined();
    });

    test("Should parse a string and return an object {tenant:'admin', device:'98787de'} or undefined", () => {
        expect(mosca.parseClientIdOrTopic("admin:98787de")).toEqual({tenant: 'admin', device: '98787de'});
        expect(mosca.parseClientIdOrTopic()).toBeUndefined();
        expect(mosca.parseClientIdOrTopic(null, "/admin/98787de/attrs")).toEqual({tenant: 'admin', device: '98787de'});
        expect(mosca.parseClientIdOrTopic(null, "admin:98787de")).toBeUndefined();
        expect(mosca.parseClientIdOrTopic(0, "98787de")).toBeUndefined();
    });

    test("_checkAuthorization without cache", async () => {
        await mosca._checkAuthorization(client, '/tenant/98787de/attrs', 'temperature', (param1, param2) => {
            expect(mosca.cache.client).toBeUndefined();
            expect(param1).toBeNull();
            expect(param2).toBeFalsy();
        });

    });

    test("_checkAuthorization with cache but not complete - getDevice", async () => {
        mosca.cache.set("tenant:98787de", {
            client: null,
            tenant: 'tenant',
            deviceId: null
        });

        ioTAgent.mockImplementation(() => {
            const rv = Object.create(ioTAgent.prototype);
            rv.getDevice = function (deviceId, tenantId) {
                return Promise.resolve();
            };
            return rv;
        });

        mosca.agent = new ioTAgent();

        await mosca._checkAuthorization({'id': 'tenant:98787de'}, '/tenant/98787de/attrs', 'attrs', (param1, param2) => {
            expect(param1).toBeNull();
            expect(param2).toBeTruthy();
        });

    });

    test("_checkAuthorization with cache and callback true", async () => {
        mosca.cache.set("tenant:98787de", {
            client: null,
            tenant: 'tenant',
            deviceId: '98787de'
        });

        await mosca._checkAuthorization({'id': 'tenant:98787de'}, '/tenant/98787de/attrs', 'attrs', (param1, param2) => {
            expect(param1).toBeNull();
            expect(param2).toBeTruthy();
        });

    });

    test("Should check the authorization of device", () => {
        expect(undefined).toBeUndefined();
    });


    test("Should use unsecured mode", () => {
        config.allow_unsecured_mode = true;

        let newMosca = new Mosca.MqttBackend(agent);
        // console.log(newMosca.server.opts.interfaces[1]);

        expect(newMosca.server.opts.interfaces[1]).toBeDefined();
        expect(newMosca.server.opts.interfaces.length).toEqual(2);
        expect(newMosca.server.opts.interfaces[1]).toMatchObject({type: "mqtt", port: 1883});
        expect(newMosca.server.opts.interfaces[1].type).toEqual("mqtt");
        expect(newMosca.server.opts.interfaces[1].port).toEqual(1883);
    });

    test("Should check the authorization of device", () => {
        client.close = jest.fn(client.close);

        const newMosca = new Mosca.MqttBackend(agent);
        newMosca.cache.set(client.id, {tenant: 'admin', deviceId: 'u86fda', client: client});
        const cacheEntry = newMosca.cache.get(client.id);

        newMosca.maxLifetimeTimeoutTLS.set(client.id,jest.fn());
        let disconnect = newMosca.disconnectDevice('admin', 'u86fda');
        expect(disconnect).toBeDefined();
        expect(disconnect.deviceId).toEqual('u86fda');
        expect(client.close).toHaveBeenCalled();
        expect(newMosca.moscaInterfaces).toBeUndefined();
        expect(cacheEntry.client).toBeDefined();
    });

    test("Should check the authorization of device", () => {
        client.close = jest.fn(client.close);

        const newMosca = new Mosca.MqttBackend(agent);
        newMosca.cache.set('admin:u86fda', {tenant: 'admin', deviceId: 'u86fda'});

        disconnect = newMosca.disconnectDevice();
        expect(disconnect).toBeUndefined();
    });

    test("Should check the authorization of device", () => {
        client.close = jest.fn(client.close);

        const newMosca = new Mosca.MqttBackend(agent);
        newMosca.cache.set('admin:u86fda', {});
        newMosca.disconnectDevice();

        expect(client.close).not.toHaveBeenCalled();
    });

    test("Should check the authorization of device", () => {
        client.close = jest.fn(client.close);

        const newMosca = new Mosca.MqttBackend(agent);
        newMosca.cache.set('admin:u86fda', {});

        cacheEntry = newMosca.cache.get(client.id);
        newMosca.disconnectDevice('admin', 'aaaaaa');

        expect(client.close).not.toHaveBeenCalled();
        expect(cacheEntry.deviceId).toBeUndefined();
    });
});
