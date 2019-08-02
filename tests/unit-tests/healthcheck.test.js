/* eslint-disable no-undef */
"use strict";

/**
 * Unit tests for healthckeck app file
 *
 * This module has the following dependencies:
 *
 */
var HealthChecker = require('@dojot/healthcheck');
// var endpoint = require('@dojot/healthcheck').getHTTPRouter;
var pjson = require('../../package.json');
const Agent = require("../../src/healthcheck").AgentHealthChecker;

//
// Mocking dependencies
//

describe("Testing healthCheck functions", () => {
    const agent = new Agent();
    agent.configHealth = {
        description: "IoT agent - MQTT",
        releaseId: "0.3.0-nightly20181030 ",
        status: "pass",
        version: pjson.version
    };

    agent.monitor = {
        componentId: "service-memory",
        componentName: "total memory used",
        componentType: "system",
        measurementName: "memory",
        observedUnit: "MB",
        status: "pass",
    };

    it("Should not throw an error", (done) => {
        const trigger = new HealthChecker.DataTrigger(agent.configHealth, agent.monitor);
        const memoryDiag = agent._memoryCollector(trigger);
        // console.log(memoryDiag);
        expect(typeof memoryDiag).toEqual('number');
        expect(memoryDiag).toBeGreaterThan(0);
        done();
    });
});