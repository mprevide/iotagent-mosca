"use strict";

const mockCert = require("../certMocks");

const mockCrlNoRevokeRevoke = mockCert.mockCrlNoRevokeRevoke;
const mockCrlWithRevoke = mockCert.mockCrlWithRevoke;
const mockCRLAxios = mockCert.mockCRLAxios;

jest.mock('fs');
jest.mock("openssl-nodejs");
jest.useFakeTimers();

const FOLDER_PRESENT_CONFIG = {'./mosca/certs/ca.crl': mockCrlNoRevokeRevoke.PEM};
const NO_FOLDER_CONFIG = {};

describe("Certificates", () => {

    afterEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        jest.resetAllMocks();
    });

    afterAll(() => {
    });

    it("shouldnt build a Cerficiates", (done) => {
        require("fs").__createMockFiles(NO_FOLDER_CONFIG);
        try {
            require('../../src/certificates.js');
        } catch (e) {
            done();
        }
    });

    it("should build a Cerficiates", () => {
        require("fs").__createMockFiles(FOLDER_PRESENT_CONFIG);
        const Certificat = require('../../src/certificates.js');
        expect(Certificat).toBeDefined();
        expect(Certificat.getCRLPEM()).toBe(mockCrlNoRevokeRevoke.PEM);
    });


    it("_callbackOpenSSL with revoked", () => {
        const Certificates = require('../../src/certificates.js');
        expect(Certificates).toBeDefined();

        const testCallBack = Certificates._callbackOpenSSL();
        testCallBack([], Buffer.from(mockCrlWithRevoke.decode, 'ascii'));
        mockCrlWithRevoke.revokedList.forEach((value) => {
            expect(Certificates.hasRevoked(value)).toBe(true);
        });

        expect(Certificates.hasRevoked('1234FFF')).toBe(false);

        expect(Certificates.revokeSerialNumberSet.size).toBe(3);

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
        jest.mock("axios", () => {
            return jest.fn(() => Promise.resolve({status: 200, data: {CRL: mockCRLAxios.raw}}));
        });

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
        jest.mock("axios", () => {
            return jest.fn(() => Promise.resolve({status: 500, error: "Error"}));
        });

        const updateCRLPromise = Certificates.updateCRL();

        updateCRLPromise.catch(() => {
            done();
        });
    });
});
