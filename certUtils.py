import re
import requests
import json
from OpenSSL import crypto

# this is a script with utility functions related to certificate files creation
# and x509-identity-mgmt requests


# the following functions are related to file manipulation
# these functions  may throw crypto.Error


def saveCRT(filename, rawCRT):
    with open(filename, "w") as crtFile:
        crtFile.write(rawCRT)


def saveCRL(filename, rawCRL):
    crypto.load_crl(crypto.FILETYPE_PEM, rawCRL)
    with open(filename, "w") as crlFile:
        crlFile.write(rawCRL)


def generateCSR(CName, privateKeyFile, csrFileName, dnsname=None, ipaddr=None):
    # based on https://github.com/cjcotton/python-csr

    if dnsname is None:
        dnsname = []

    if ipaddr is None:
        ipaddr = []

    ss = []
    for i in dnsname:
        ss.append("DNS: %s" % i)
    for i in ipaddr:
        ss.append("IP: %s" % i)
    ss = ", ".join(ss)

    req = crypto.X509Req()
    req.get_subject().CN = CName

    x509_extensions = []

    if ss:
        san_constraint = crypto.X509Extension(
            b"subjectAltName", False, ss.encode("utf-8"))
        x509_extensions.append(san_constraint)

    req.add_extensions(x509_extensions)

    with open(privateKeyFile) as keyfile:
        key = crypto.load_privatekey(crypto.FILETYPE_PEM, keyfile.read())

    req.set_pubkey(key)
    req.sign(key, "sha256")

    with open(csrFileName, "w") as csrFile:
        csrFile.write(
            crypto.dump_certificate_request(crypto.FILETYPE_PEM, req).decode("utf-8")[:-1])


def generatePrivateKey(keyFile, bitLen):
    key = crypto.PKey()
    key.generate_key(crypto.TYPE_RSA, bitLen)
    key_file = None
    with open(keyFile, "w") as key_file:
        key_file.write(crypto.dump_privatekey(
            crypto.FILETYPE_PEM, key).decode("utf-8"))


# default header for HTTP requests
defaultHeader = {'content-type': 'application/json',
                 'Accept': 'application/json'}


# the following functions are related to x509IdentityMgmt requests
# they may throw requests.exceptions.ConnectionError,
# KeyError or the custom x509IdentityMgmtException

class x509IdentityMgmtException(Exception):
    pass


def retrieveCAChain(ejbcaApiUrl):
    response = requests.get(ejbcaApiUrl + '/internal/api/v1/throw-away/ca',
                            headers=defaultHeader)

    if response.status_code == 200:
        return json.loads(response.content)['caPem']

    raise x509IdentityMgmtException(
        "Code:" + str(response.status_code) + " Message:" + str(response.content))


def retrieveCACRL(EJBCA_API_URL):
    response = requests.get(EJBCA_API_URL + "/internal/api/v1/throw-away/ca/crl",
                            headers=defaultHeader, params={'update': 'true'})
    if response.status_code == 200:
        return json.loads(response.content)['crl']

    raise x509IdentityMgmtException(
        "Code:" + str(response.status_code) + " Message:" + str(response.content))


def signCert(ejbcaApiUrl, csrFile, CName):
    csr_file = None
    with open(csrFile, "r") as csr_file:
        csr = csr_file.read()

    req = json.dumps({
        "csr": csr
    })

    response = requests.post(ejbcaApiUrl + "/internal/api/v1/throw-away",
                             headers=defaultHeader, data=req)

    if response.status_code == 201:
        return json.loads(response.content)['certificatePem']

    raise x509IdentityMgmtException(
        "Code:" + str(response.status_code) + " Message:" + str(response.content))
