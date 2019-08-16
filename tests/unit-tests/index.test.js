"use strict";

/**
 * Unit tests for index  file
 *
 * This module has the following dependencies:
 *
 */

jest.mock('node-rdkafka');
jest.mock("@dojot/dojot-module-logger");

describe("Testing index", () => {

    beforeEach(() => {

    });

    it("Should catch a error", () => {
        try {
            require("../../src/index");
        } catch (e) {
            expect(e).toMatch('error');
        }
    });

});
