/* eslint-disable no-undef */

const Metrics = require("../../src/metrics").Metrics;

// jest.genMockFromModule('../../src/metrics');
// jest.mock('../../src/metrics');

// const mockMetrics = {
//     metrics: jest.fn()
//   };

// Metrics.mockImplementation(() => mockMetrics);

describe("Testing payload", () => {
    let metrics = new Metrics();

    test("Should return NULL because function expects two strings as argument", () => {
        metrics.preparePayloadObject()
        expect(metrics.lastMetricsInfo.connectedClients).toBeNull();
    });

    test("Should return NULL because function expects two strings as argument", () => {
        metrics.preparePayloadObject(0);
        expect(metrics.lastMetricsInfo.connectedClients).toBeNull();
    });

    test("Should return the string passed as second argument as value to object attribute passed as first argument", () => {
        const metricsAttribute = 'connectedClients';
        metrics.preparePayloadObject(metricsAttribute, 20);
        expect(metrics.lastMetricsInfo[`${metricsAttribute}`]).toEqual('20');
    });
})