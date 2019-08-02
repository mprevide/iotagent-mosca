/* eslint-disable no-undef */
"use strict";

/**
 * Unit tests for iotagent module
 *
 * This module has the following dependencies:
 *
 * - supertest
 */

// const request = require("request");
const app = require("../../src/app").app;
const stopApp = require("../../src/app").stopApp;

const request = require("supertest");
const moscaMestrics = require("../../src/metrics");

//
// Mocking dependencies
//

// a helper function to make a POST request
function get(url, body) {
    const httpRequest = request(app).get(url);
    httpRequest.send(body);
    httpRequest.set('Accept', 'application/json');
    return httpRequest;
}

describe("Testing metrics functions", () => {
    afterEach(() => {
        stopApp();
    });

    it('Should return OK status and the metricStore object', async () => {
        let metricStore = new moscaMestrics.Metrics();
            metricStore.lastMetricsInfo = {
            connectedClients: 0,
            connectionsLoad1min: 0,
            connectionsLoad5min: 0,
            connectionsLoad15min: 0,
            messagesLoad1min: 0,
            messagesLoad5min: 0,
            messagesLoad15min: 0
        };

        app.use(moscaMestrics.getHTTPRouter(metricStore));
        let response = await get('/iotagent-mqtt/metrics', '');

        expect(response.status).toEqual(200);
        expect(JSON.parse(response.text)).toEqual({"connectedClients": 0, "connectionsLoad1min": 0, "connectionsLoad5min": 0, "connectionsLoad15min": 0, "messagesLoad1min": 0, "messagesLoad5min": 0, "messagesLoad15min": 0});

        metricStore.lastMetricsInfo = null;
        app.use(moscaMestrics.getHTTPRouter(metricStore));
        response = await get('/iotagent-mqtt/metrics', '');
        expect(response.status).toEqual(500);
    });


    it("Should return NULL because function expects two strings as argument", () => {
        const metrics = new moscaMestrics.Metrics();
        metrics.preparePayloadObject()
        expect(metrics.lastMetricsInfo.connectedClients).toBeNull();

        metrics.preparePayloadObject(0);
        expect(metrics.lastMetricsInfo.connectedClients).toBeNull();

        const metricsAttribute = "connectedClients";
        metrics.preparePayloadObject(metricsAttribute, 20);
        expect(metrics.lastMetricsInfo[`${metricsAttribute}`]).toEqual("20");
    });
});
