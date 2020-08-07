"use strict";

const mockCert = require("./certMocks");

const mockCrlNoRevokeRevoke = mockCert.mockCrlNoRevokeRevoke;
const mockCrlWithRevoke = mockCert.mockCrlWithRevoke;
const mockCRLAxios = mockCert.mockCRLAxios;

jest.mock("openssl-nodejs");
jest.useFakeTimers();

describe("Certificates", () => {

    afterEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        jest.resetAllMocks();
    });

    afterAll(() => {
    });


    it("_callbackOpenSSL with revoked", (done) => {
        const Certificates = require('../../src/certificates.js');
        expect(Certificates).toBeDefined();

        const testCallBack = Certificates._callbackOpenSSL();
        testCallBack([], Buffer.from(mockCrlWithRevoke.decode, 'ascii'));
        mockCrlWithRevoke.revokedList.forEach((value) => {
            expect(Certificates.hasRevoked(value)).toBe(true);
        });

        expect(Certificates.hasRevoked('1234FFF')).toBe(false);

        expect(Certificates.revokeSerialNumberSet.size).toBe(3);

        try {
            const error = [];
            error[1] = 'x';
            testCallBack(error, null);
        }catch (e) {
            done();
        }


    });

    it("_callbackOpenSSL without revoked", async () => {
        const Certificates = require('../../src/certificates.js');
        expect(Certificates).toBeDefined();

        const testCallBack = Certificates._callbackOpenSSL();
        testCallBack([], Buffer.from(mockCrlNoRevokeRevoke.decode, 'ascii'));
        expect(Certificates.revokeSerialNumberSet.size).toBe(0);
    });

    it("_updateCRL sucess", (done) => {
        const Certificates = require('../../src/certificates.js');
        expect(Certificates).toBeDefined();
        Certificates.crlPEM = null;
        jest.mock("axios", () => jest.fn(() => Promise.resolve({status: 200, data: {crl: mockCRLAxios.PEM}})));

        const updateCRLPromise = Certificates.updateCRL();

        updateCRLPromise.then(() => {

            expect(Certificates.getCRLPEM()).toBe(mockCRLAxios.PEM);
            done();
        });
    });

    it("_updateCRL error", (done) => {
        const Certificates = require('../../src/certificates.js');
        expect(Certificates).toBeDefined();
        Certificates.crlPEM = null;
        jest.mock("axios", () => jest.fn(() => Promise.resolve({status: 500, error: "Error"})));

        const updateCRLPromise = Certificates.updateCRL();

        updateCRLPromise.catch(() => {
            done();
        });
    });
});
