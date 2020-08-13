#!/usr/bin/python3
# This script makes the initial configuration to use TLS with mosca.
# It generates the mosca key-pair
# and retrieves a certificate and CRL from CA.
# If the configuration has already been done, this script does nothing!

import conf
import os
import binascii
from OpenSSL import crypto
import certUtils
from time import sleep
import requests


def generateKeys():
    try:
        certUtils.generatePrivateKey(conf.certsDir + "/mosca.key",
                                     conf.keyLength)
        print("mosca key-pair created")
    except crypto.Error:
        print("crypto Error: Could not create Keys")
        exit(-1)


def generateCSR(CName):
    try:
        certUtils.generateCSR(CName=CName,
                              privateKeyFile=conf.certsDir + "/mosca.key",
                              csrFileName=conf.certsDir + "/mosca.csr",
                              dnsname=conf.subjectAltNameDnsList)
    except crypto.Error:
        print("crypto Error: Could not create CSR")
        exit(-1)


def askCertSign(CName):
    try:
        cert = certUtils.signCert(conf.ejbcaApiUrl,
                                  conf.certsDir + "/mosca.csr",
                                  CName)
        certUtils.saveCRT(conf.certsDir + "/mosca.crt", cert)
        print("mosca certificate signed")
    except certUtils.x509IdentityMgmtException as err:
        print("Cant sign the CRT. Error from x509-identity-mgmt: " + err.message)
        exit(-1)


def retrieveCAChain():
    try:
        rawCrt = certUtils.retrieveCAChain(conf.ejbcaApiUrl)
        certUtils.saveCRT(conf.certsDir + "/ca.crt", rawCrt)
        print("CA certificates retrieved")
    except certUtils.x509IdentityMgmtException as err:
        print(
            "Cant retrieve CA Chain. Error from x509-identity-mgmt: " + err.message)
        exit(-1)
    except KeyError:
        print("Invalid answer returned from EJBCA.")
        exit(-1)


def retrieveCRL():
    try:
        rawCRL = certUtils.retrieveCACRL(conf.ejbcaApiUrl)
        certUtils.saveCRL(conf.certsDir + "/ca.crl", rawCRL)
    except certUtils.x509IdentityMgmtException as err:
        print(
            "Cant retrieve CRL. Error from x509-identity-mgmt: " + err.message)
        exit(-1)
    except KeyError:
        print("Invalid answer returned from EJBCA.")
        exit(-1)
    except crypto.Error:
        print("Could not decode retrieved CRL")
        exit(-1)


if __name__ == '__main__':

    while True:
        try:
            print("Retrieving CA Chain")
            retrieveCAChain()
            print("Generating keys")
            generateKeys()
            print("Generating CSR")
            generateCSR(conf.CName)
            print("Asking certification signature")
            askCertSign(conf.CName)
            print("Retrieving CRL")
            retrieveCRL()
            break
        except requests.exceptions.ConnectionError:
            print("Cant connect to EJBCA server at "
                  + conf.ejbcaApiUrl + " for initial configuration")
            print("Chances are the server is not ready yet."
                  " Will retry in 30sec")
            sleep(30)
exit(0)
