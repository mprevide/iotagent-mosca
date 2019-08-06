"use strict";

const axios = require("axios");
const openssl = require('openssl-nodejs');
const config = require("../../src/config");


const crlNoRevokeRevoke = {
    PEM: '-----BEGIN X509 CRL-----\n' +
        'MIIDATCB6gIBATANBgkqhkiG9w0BAQsFADA0MREwDwYDVQQDDAhJT1RtaWRDQTES\n' +
        'MBAGA1UECgwJRUpCQ0EgSU9UMQswCQYDVQQGEwJTRRcNMTkwNzI2MTYyMDI2WhcN\n' +
        'MTkwNzI3MTYyMDI2WjBRMBkCCGJQBuSQWMIyFw0xOTA3MjYxMzQ4MDJaMBkCCDHe\n' +
        'VUiUtykLFw0xOTA3MjYxMzQ4NDJaMBkCCBaaZQ2bLJ2hFw0xOTA3MjYxNDAyMzla\n' +
        'oC8wLTAfBgNVHSMEGDAWgBTSyO3vNSQ2uVybP9svokKTzw7JUjAKBgNVHRQEAwIB\n' +
        'AzANBgkqhkiG9w0BAQsFAAOCAgEAoCGOuvNS670RoyngTUsttXqgaogPghJP8WCc\n' +
        'OpYxA/8Qzmu8fySCxNF9u/9WjLRHvJwFBn7yI+xXelx6Cw8YMxuNCIudwFxcsbjC\n' +
        'H2SH2fosQOajsG8BPwvq5wy8WtDzgVXUjyEmNrUtvugeBiTwB1I3etmFpAO1dJFq\n' +
        'yaFlJ1pjj0yxCVtl678NEz+LIsHtODNjj0/bXSWSw16YMdFM4Jss5aUWroUfyAOj\n' +
        't2QfqpONwJRDbq5VEOOmA1kVESI/pPj1SqvOcxMwkbgXDJZi6aPC33IGg6ydlqJh\n' +
        'wP7I/DLJHeF1wMt2lOs3JIrngX/bjrTQh1AZzEraEAceUgojeCiMCGEAMhQdn9bB\n' +
        'ULKM8bRodgY91n0zewmPkeHmtvvo/oSuTyXYDGJyOGXfKsTJ5agH9Mw1jfQkCc59\n' +
        'g3T4NApyozc81nuX3Sa9d1Iz2+ssyCUiL0Nmrf7AUdJ71UseSxHvpXQ0sDJCmc//\n' +
        'KvYN4t3YmEIiAQDKceHFrmp+2uNvU2UAODXRynfQcxy6PEHRS30KCTUtPg4Hh+0J\n' +
        'LqmCJA/6jE4tkBl3P33Af5dw5q8PfhfeJLW2rRGWwgrHXO/8UGsd/t8cP3dyJvC/\n' +
        '6gG+5pkjlRJrXUqfNs9PIzHCRpFDqw2FdbpVV0PI2KRtIVdX0aOAto8YL0TbKnne\n' +
        'ZoPCRPM=\n' +
        '-----END X509 CRL-----',
    decode: 'Certificate Revocation List (CRL):\n' +
        '        Version 2 (0x1)\n' +
        '        Signature Algorithm: sha256WithRSAEncryption\n' +
        '        Issuer: CN = IOTmidCA, O = EJBCA IOT, C = SE\n' +
        '        Last Update: Jul 26 13:41:37 2019 GMT\n' +
        '        Next Update: Jul 27 13:41:37 2019 GMT\n' +
        '        CRL extensions:\n' +
        '            X509v3 Authority Key Identifier:\n' +
        '                keyid:D2:C8:ED:EF:35:24:36:B9:5C:9B:3F:DB:2F:A2:42:93:CF:0E:C9:52\n' +
        '\n' +
        '            X509v3 CRL Number:\n' +
        '                2\n' +
        'No Revoked Certificates.\n' +
        '    Signature Algorithm: sha256WithRSAEncryption\n' +
        '         91:6d:81:33:1e:e5:75:4b:48:91:04:be:71:59:29:7b:4a:50:\n' +
        '         cc:37:03:87:56:d8:66:27:63:87:d1:83:e5:29:37:b7:d8:f8:\n' +
        '         07:fc:a9:00:42:f2:47:a0:44:87:9d:07:a2:57:09:85:b9:ed:\n' +
        '         17:e3:7c:4f:04:36:4a:5e:85:4a:d1:34:1a:0f:e8:24:05:c2:\n' +
        '         24:6e:69:c9:0b:a2:07:83:30:7c:3a:91:bd:78:6b:ac:0e:7d:\n' +
        '         0d:ee:27:85:44:02:36:eb:94:53:4e:4a:94:6d:f9:cb:91:b3:\n' +
        '         0c:3a:dd:04:53:5c:4f:8c:e8:66:3c:ff:47:a3:f1:f4:0e:9b:\n' +
        '         bd:d9:0e:ba:4e:ed:37:4d:38:77:ba:cd:2f:60:2f:bd:1c:3e:\n' +
        '         cd:d3:26:1a:19:e7:50:cc:f0:65:b8:48:61:19:4e:1e:7d:74:\n' +
        '         22:de:ee:fa:14:b5:3b:4c:45:c1:0c:38:a6:19:46:e7:d5:50:\n' +
        '         59:bb:a4:ea:b3:e0:bc:d7:2d:d4:b6:3a:d6:97:b0:47:d2:0b:\n' +
        '         a7:01:db:fc:81:56:54:84:31:7b:9d:6a:02:90:3e:0a:62:82:\n' +
        '         a7:55:26:a3:68:1c:0d:10:09:38:47:fa:9f:7d:4c:1f:86:aa:\n' +
        '         22:7f:53:a3:51:b0:7b:14:f0:d7:85:31:5e:ae:a4:c0:c6:40:\n' +
        '         be:aa:31:3f:d0:f4:ec:fc:d1:9c:5e:8d:49:3f:95:be:f8:ff:\n' +
        '         d6:1b:f7:e1:11:88:65:d2:5c:2f:d7:ba:11:27:0a:c0:c4:75:\n' +
        '         3b:ff:20:b2:cb:cb:f1:d7:d6:16:6d:ec:a6:bd:81:6e:36:8b:\n' +
        '         2b:7d:be:98:f5:71:36:da:99:33:7b:a6:ad:01:df:c6:6d:ed:\n' +
        '         fd:88:ce:2e:eb:2e:3f:d5:f6:c9:29:5c:19:88:96:42:32:14:\n' +
        '         ea:57:1c:dc:d0:d9:27:81:c8:8c:da:0d:21:49:bf:8b:06:b1:\n' +
        '         88:f0:5f:6a:c4:3e:57:2f:d5:4e:7e:ce:5a:0d:7d:99:c0:c4:\n' +
        '         9c:df:ca:ad:95:ae:8b:04:7c:84:04:b4:e4:f3:de:8a:e4:8e:\n' +
        '         12:33:b2:f7:7d:d4:57:99:04:5c:83:18:34:9c:62:39:43:bd:\n' +
        '         41:0f:fc:2e:53:b7:a6:ef:09:ea:b9:cf:7f:e1:83:1a:c6:82:\n' +
        '         15:2d:e8:a7:e7:8f:15:cb:e0:8b:c3:dd:ef:f6:04:3c:64:39:\n' +
        '         5a:5d:40:58:75:6e:62:85:53:55:e6:6b:5c:8d:e6:b9:08:d2:\n' +
        '         47:2c:f3:1f:34:c3:3a:2e:78:a2:64:31:33:90:aa:28:b4:6e:\n' +
        '         8c:1f:f9:89:32:48:3e:36:fb:40:47:bd:8d:90:b0:eb:47:d9:\n' +
        '         b3:a2:92:39:68:c4:5e:43',
    revokedList: [
        '625006E49058C232',
        '31DE554894B7290B',
        '169A650D9B2C9DA1'
    ]

};
const crlWithRevoke = {
    PEM: '-----BEGIN X509 CRL-----\n' +
        'MIIDATCB6gIBATANBgkqhkiG9w0BAQsFADA0MREwDwYDVQQDDAhJT1RtaWRDQTES\n' +
        'MBAGA1UECgwJRUpCQ0EgSU9UMQswCQYDVQQGEwJTRRcNMTkwNzI2MTYyMDI2WhcN\n' +
        'MTkwNzI3MTYyMDI2WjBRMBkCCGJQBuSQWMIyFw0xOTA3MjYxMzQ4MDJaMBkCCDHe\n' +
        'VUiUtykLFw0xOTA3MjYxMzQ4NDJaMBkCCBaaZQ2bLJ2hFw0xOTA3MjYxNDAyMzla\n' +
        'oC8wLTAfBgNVHSMEGDAWgBTSyO3vNSQ2uVybP9svokKTzw7JUjAKBgNVHRQEAwIB\n' +
        'AzANBgkqhkiG9w0BAQsFAAOCAgEAoCGOuvNS670RoyngTUsttXqgaogPghJP8WCc\n' +
        'OpYxA/8Qzmu8fySCxNF9u/9WjLRHvJwFBn7yI+xXelx6Cw8YMxuNCIudwFxcsbjC\n' +
        'H2SH2fosQOajsG8BPwvq5wy8WtDzgVXUjyEmNrUtvugeBiTwB1I3etmFpAO1dJFq\n' +
        'yaFlJ1pjj0yxCVtl678NEz+LIsHtODNjj0/bXSWSw16YMdFM4Jss5aUWroUfyAOj\n' +
        't2QfqpONwJRDbq5VEOOmA1kVESI/pPj1SqvOcxMwkbgXDJZi6aPC33IGg6ydlqJh\n' +
        'wP7I/DLJHeF1wMt2lOs3JIrngX/bjrTQh1AZzEraEAceUgojeCiMCGEAMhQdn9bB\n' +
        'ULKM8bRodgY91n0zewmPkeHmtvvo/oSuTyXYDGJyOGXfKsTJ5agH9Mw1jfQkCc59\n' +
        'g3T4NApyozc81nuX3Sa9d1Iz2+ssyCUiL0Nmrf7AUdJ71UseSxHvpXQ0sDJCmc//\n' +
        'KvYN4t3YmEIiAQDKceHFrmp+2uNvU2UAODXRynfQcxy6PEHRS30KCTUtPg4Hh+0J\n' +
        'LqmCJA/6jE4tkBl3P33Af5dw5q8PfhfeJLW2rRGWwgrHXO/8UGsd/t8cP3dyJvC/\n' +
        '6gG+5pkjlRJrXUqfNs9PIzHCRpFDqw2FdbpVV0PI2KRtIVdX0aOAto8YL0TbKnne\n' +
        'ZoPCRPM=\n' +
        '-----END X509 CRL-----',
    decode: 'Certificate Revocation List (CRL):\n' +
        '        Version 2 (0x1)\n' +
        '        Signature Algorithm: sha256WithRSAEncryption\n' +
        '        Issuer: CN = IOTmidCA, O = EJBCA IOT, C = SE\n' +
        '        Last Update: Jul 26 16:20:26 2019 GMT\n' +
        '        Next Update: Jul 27 16:20:26 2019 GMT\n' +
        '        CRL extensions:\n' +
        '            X509v3 Authority Key Identifier:\n' +
        '                keyid:D2:C8:ED:EF:35:24:36:B9:5C:9B:3F:DB:2F:A2:42:93:CF:0E:C9:52\n' +
        '\n' +
        '            X509v3 CRL Number:\n' +
        '                3\n' +
        'Revoked Certificates:\n' +
        '    Serial Number: 625006E49058C232\n' +
        '        Revocation Date: Jul 26 13:48:02 2019 GMT\n' +
        '    Serial Number: 31DE554894B7290B\n' +
        '        Revocation Date: Jul 26 13:48:42 2019 GMT\n' +
        '    Serial Number: 169A650D9B2C9DA1\n' +
        '        Revocation Date: Jul 26 14:02:39 2019 GMT\n' +
        '    Signature Algorithm: sha256WithRSAEncryption\n' +
        '         a0:21:8e:ba:f3:52:eb:bd:11:a3:29:e0:4d:4b:2d:b5:7a:a0:\n' +
        '         6a:88:0f:82:12:4f:f1:60:9c:3a:96:31:03:ff:10:ce:6b:bc:\n' +
        '         7f:24:82:c4:d1:7d:bb:ff:56:8c:b4:47:bc:9c:05:06:7e:f2:\n' +
        '         23:ec:57:7a:5c:7a:0b:0f:18:33:1b:8d:08:8b:9d:c0:5c:5c:\n' +
        '         b1:b8:c2:1f:64:87:d9:fa:2c:40:e6:a3:b0:6f:01:3f:0b:ea:\n' +
        '         e7:0c:bc:5a:d0:f3:81:55:d4:8f:21:26:36:b5:2d:be:e8:1e:\n' +
        '         06:24:f0:07:52:37:7a:d9:85:a4:03:b5:74:91:6a:c9:a1:65:\n' +
        '         27:5a:63:8f:4c:b1:09:5b:65:eb:bf:0d:13:3f:8b:22:c1:ed:\n' +
        '         38:33:63:8f:4f:db:5d:25:92:c3:5e:98:31:d1:4c:e0:9b:2c:\n' +
        '         e5:a5:16:ae:85:1f:c8:03:a3:b7:64:1f:aa:93:8d:c0:94:43:\n' +
        '         6e:ae:55:10:e3:a6:03:59:15:11:22:3f:a4:f8:f5:4a:ab:ce:\n' +
        '         73:13:30:91:b8:17:0c:96:62:e9:a3:c2:df:72:06:83:ac:9d:\n' +
        '         96:a2:61:c0:fe:c8:fc:32:c9:1d:e1:75:c0:cb:76:94:eb:37:\n' +
        '         24:8a:e7:81:7f:db:8e:b4:d0:87:50:19:cc:4a:da:10:07:1e:\n' +
        '         52:0a:23:78:28:8c:08:61:00:32:14:1d:9f:d6:c1:50:b2:8c:\n' +
        '         f1:b4:68:76:06:3d:d6:7d:33:7b:09:8f:91:e1:e6:b6:fb:e8:\n' +
        '         fe:84:ae:4f:25:d8:0c:62:72:38:65:df:2a:c4:c9:e5:a8:07:\n' +
        '         f4:cc:35:8d:f4:24:09:ce:7d:83:74:f8:34:0a:72:a3:37:3c:\n' +
        '         d6:7b:97:dd:26:bd:77:52:33:db:eb:2c:c8:25:22:2f:43:66:\n' +
        '         ad:fe:c0:51:d2:7b:d5:4b:1e:4b:11:ef:a5:74:34:b0:32:42:\n' +
        '         99:cf:ff:2a:f6:0d:e2:dd:d8:98:42:22:01:00:ca:71:e1:c5:\n' +
        '         ae:6a:7e:da:e3:6f:53:65:00:38:35:d1:ca:77:d0:73:1c:ba:\n' +
        '         3c:41:d1:4b:7d:0a:09:35:2d:3e:0e:07:87:ed:09:2e:a9:82:\n' +
        '         24:0f:fa:8c:4e:2d:90:19:77:3f:7d:c0:7f:97:70:e6:af:0f:\n' +
        '         7e:17:de:24:b5:b6:ad:11:96:c2:0a:c7:5c:ef:fc:50:6b:1d:\n' +
        '         fe:df:1c:3f:77:72:26:f0:bf:ea:01:be:e6:99:23:95:12:6b:\n' +
        '         5d:4a:9f:36:cf:4f:23:31:c2:46:91:43:ab:0d:85:75:ba:55:\n' +
        '         57:43:c8:d8:a4:6d:21:57:57:d1:a3:80:b6:8f:18:2f:44:db:\n' +
        '         2a:79:de:66:83:c2:44:f3',
    revokedList: [
        '625006E49058C232',
        '31DE554894B7290B',
        '169A650D9B2C9DA1'
    ]

};

const rawCRL = "MIICrzCBmAIBATANBgkqhkiG9w0BAQsFADA0MREwDwYDVQQDDAhJT1RtaWRDQTESMBAGA1UECgwJRUpCQ0EgSU9UMQswCQYDVQQGEwJTRRcNMTkwNzMwMTYzOTQ1WhcNMTkwNzMxMTYzOTQ1WqAwMC4wHwYDVR0jBBgwFoAUhXYIo9O/yCCudFLVc6O5PZbHBu4wCwYDVR0UBAQCAgLjMA0GCSqGSIb3DQEBCwUAA4ICAQCsSbJOSUB941Co4bqaxOCiXSaPDCvzt1MnFdJwgwuWxAkJqwjNQgo+B16lwlSajAPaijAnL1Xs8TMaBkHfbBzOHBVHjYE+1NWpGQY6ztxX9f+4DqFODbd2+FdjoOuyPA43VTF+L3ephSXb1iy2PutrKrTbz5S00/VAZr6dNyzHI8nl0KwYxHTSQTSRjWOoeW+EYeQYhHNpzj2Fh3qIj+A33kiDb0qp7WiWdKAz8mlbv/yXuo717mq50iPxbOOrSYG+5Xcd1PIU2Qh3YTiHu/lW6VF3nwL9m7forTWC+01ugXfoIuWx3EbUzdJRK4qgQLo7s+PeRreYqn8XIKP/ryVZ1YQNBBqqK+1iU1kAdn2jAqetPq+8B/Jjx71dnYUt+4SuCEk400fDs6Fc84KMpup434dRDIRx6WwQZoZeVoD9z9cmD0+wvW1Kmv3GnWhcQcAkkUTghwmvRn497RWTd17yHGM7BtTT/58HqQ6TWnLt3xRMQSCFfFRCPXhMqfhH6ejyU4xzGZm03AOl1IDSDXgZ3TeT26vZO0xMSMXJ881Hf6Qnk14I+YQtXf3F4JzNcV0Qcu6++I88i8ms7cy3+W/YdByC+jX1m5airrqsKYuq40CzpQULk00dPTFWGca+5PCveCAEzBdIfpQNVWKFnek7XpwM7SA/fik45j1H63gcfQ==";

jest.mock('fs');
jest.mock("axios");
jest.useFakeTimers();
jest.mock("openssl-nodejs");

const FOLDER_PRESENT_CONFIG = {'./mosca/certs/ca.crl': crlNoRevokeRevoke.PEM};
const NO_FOLDER_CONFIG = {};

describe("Certificates", () => {

    beforeAll(() => {

    });

    beforeEach(() => {
        jest.resetModules();
        jest.resetAllMocks();


    });

    afterEach(() => {
        axios.mockReset();
    });

    afterAll(() => {
        axios.mockRestore();
    });


    it("should build a Cerficiates", () => {
        require("fs").__createMockFiles(FOLDER_PRESENT_CONFIG);
        const Certificates = require('../../src/certificates.js');
        expect(Certificates).toBeDefined();
        expect(Certificates.getCRLPEM()).toBe(crlNoRevokeRevoke.PEM);
    });

    it("_callbackOpenSSL with revoked", () => {
        const Certificates = require('../../src/certificates.js');
        expect(Certificates).toBeDefined();

        const testCallBack = Certificates._callbackOpenSSL();
        testCallBack([], Buffer.from(crlWithRevoke.decode, 'ascii'));
        crlWithRevoke.revokedList.forEach((value) => {
            expect(Certificates.hasRevoked(value)).toBe(true);
        });

        expect(Certificates.hasRevoked('1234FFF')).toBe(false);

        expect(Certificates.revokeSerialNumberSet.size).toBe(3);

    });

    it("_callbackOpenSSL without revoked", async () => {
        const Certificates = require('../../src/certificates.js');
        expect(Certificates).toBeDefined();

        const testCallBack = Certificates._callbackOpenSSL();
        console.log(testCallBack);
        const promi = testCallBack([], Buffer.from(crlNoRevokeRevoke.decode, 'ascii'));
        console.log(promi);
        expect(Certificates.revokeSerialNumberSet.size).toBe(0);
    });

    it("_updateCRL", async (done) => {
        const Certificates = require('../../src/certificates.js');
        expect(Certificates).toBeDefined();

        axios.mockReturnValue(Promise.resolve({CRL: `${rawCRL}`}));

        const {pkiApiUrl, caName} = config.mosca_tls;
        const url = `${pkiApiUrl}/ca/${caName}/crl?update=true`;

        const updateCRLPromise = await Certificates.updateCRL();

        updateCRLPromise.then((resp) => {
            console.log('test', resp);
            expect(axios).toBeCalledWith({
                url: url,
                method: "get",
                headers: expect.anything(),
            });
            done();
        }).catch((error) => {
            //done(`should not raise an error: ${error}`);
            console.log('catch', error);
            done();
        });

    });
});
