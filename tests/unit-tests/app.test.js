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

//
// Mocking dependencies
//
jest.mock("express");

describe("Testing app functions", () => {
    const listen = jest.fn();
    const use = jest.fn();
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
        App.initApp(null, null);
        expect(use).toBeCalled();
        expect(listen).toBeCalled();
    });

});
