# configuration file
import os

ejbcaApiUrl = os.environ.get(
    "MOSCA_TLS_X509_IDENTITY_MGMT ", "http://x509-identity-mgmt:3000")

keyLength = 4096

hostName = os.environ.get("HOSTNAME", "iotagent-mosca-mqtt")

CName = os.environ.get("MOSCA_TLS_CNAME", hostName)

subjectAltNameDnsList = os.environ.get(
    "MOSCA_TLS_DNS_LIST", "mqtt,mosca,localhost").split(',')

certsDir = "./mosca/certs/"
