/* eslint-disable no-undef */
"use strict";

/**
 * Unit tests for iotagent module
 *
 * This module has the following dependencies:
 *
 * - express
 */

const express = require("express");
const moscaMestrics = require("../../src/metrics");

//
// Mocking dependencies
//
jest.mock("express");

describe("Testing payload", () => {
    beforeEach(() => {
        express.Router.mockClear();
    });


    it("Should return NULL because function expects two strings as argument", () => {
        const metrics = new moscaMestrics.Metrics();

        metrics.preparePayloadObject()
        expect(metrics.lastMetricsInfo.connectedClients).toBeNull();

        metrics.preparePayloadObject(0);
        expect(metrics.lastMetricsInfo.connectedClients).toBeNull();

        const metricsAttribute = "connectedClients";
        metrics.preparePayloadObject(metricsAttribute, 20);
        expect(metrics.lastMetricsInfo[`${metricsAttribute}`]).toEqual('20');
    });

    it("Should get metrics object from endpoint", (done) => {
        const metrics = new moscaMestrics.Metrics();
        metrics.getHTTPRouter = jest.fn();

        expect(metrics.getHTTPRouter()).toBeUndefined();
    });
})
