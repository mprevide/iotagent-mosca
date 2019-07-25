# configuration file
import os

EJBCA_API_URL = os.environ.get("MQTTREST_EJBCA_URL", "http://ejbca:5583")

CAName = os.environ.get("MQTTREST_CA_NAME", "IOTmidCA")

keyLength = int(os.environ.get("MQTTREST_KEY_LENGHT", 2048))

kafkaHost = os.environ.get("MQTTREST_KAFKA_HOST", "kafka:9092")

subjectAltNameDnsList = os.environ.get("MOSCA_TLS_DNS_LIST", "mqtt,mosca,localhost").split(',')

ACLfilePath = "./mosca/certs/access.acl"
certsDir = "./mosca/certs/"
