/* eslint-disable no-undef */
"use strict";

/**
 * Unit tests for iotagent app file
 *
 * This module has the following dependencies:
 *
 * - express
*/

const App = require("../../src/app");
const moscaMestrics = require("../../src/metrics");
const HealthChecker = require("../../src/healthcheck").AgentHealthChecker;

//
// Mocking dependencies
//
// jest.mock("express");
//

describe("Testing app functions", () => {
    // store the original implementation
    // const originalStop = App.closeApp;

    const initApp = jest.fn(App.initApp);

    beforeEach(() => jest.resetModules());

    afterEach(() => {
        App.stopApp();
    });

    afterAll(() => {
        App.stopApp();
    });

    it("Should not throw an error", async () => {

        const metricStore = new moscaMestrics.Metrics();
        const healthcheck = new HealthChecker();

        await expect(initApp(healthcheck, metricStore)).toBeFalsy();
    });

    it("Test initApp", (done) => {
        // App.initApp = jest.fn(App.initApp);
        // const metricStore = new moscaMestrics.Metrics();
        // const healthcheck = new HealthChecker();

        // App.initApp(healthcheck, metricStore);
        // expect(App.initApp).toBeCalled();
        // expect(App.initApp).toBeTruthy();

        // spy the calls to add
        expect(App.stopApp()).toBeFalsy();
        done();
    });
});
