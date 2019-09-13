"use strict";

/**
 * Unit tests for iotagent app file
 *
 * This module has the following dependencies:
 *
 * - express
 */

const App = require("../../src/app");
const express = require("express");
const healthCheck = require('@dojot/healthcheck');
const metrics = require("../../src/metrics");

//
// Mocking dependencies
//
jest.mock("express");
jest.mock("@dojot/healthcheck");
jest.mock("../../src/metrics");

describe("Testing app functions", () => {
    const listen = jest.fn(() => {
        App.isInitialized = true
    });
    const use = jest.fn();
    const close = jest.fn();
    beforeEach(() => {
        express.Router.mockImplementation(() => {
            const router = Object.create(express.Router.prototype);
            router.get = jest.fn();
            router.use = jest.fn();
            router.put = jest.fn();
            return router;
        });


        express.mockReturnValue({
            use: use,
            listen: listen,
            router: jest.fn(),
        });

    });

    it("Should not throw an error", () => {
        App.initApp({}, {});
        expect(use).toBeCalled();
        expect(listen).toBeCalled();
    });

    it("Stop", () => {
        const mockHttp = {
            close: jest.fn(),
        };
        App.setInitialized(true);
        App.setHttpServer(mockHttp);
        App.stopApp();
    });

});
