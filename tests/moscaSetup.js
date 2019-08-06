const clientSetup = {
    id: 'admin:u86fda',
    connection: {
        stream: {
            TLSSocket: true,
            getPeerCertificate() {
                const subject = {
                    CN: 'admin:u86fda'
                }
                return subject
            }
        }
    },
    close() {
        return true
    }
}

const packetSetup = {
    topic: 'admin/6dc341/attrs',
    payload: {
        "temperature": '15.3'
    }
}

const agentSetup = {
    metricsStore: {
        lastMetricsInfo: {
            connectedClients: null,
            connectionsLoad1min: null,
            connectionsLoad5min: null,
            connectionsLoad15min: null,
            messagesLoad1min: null,
            messagesLoad5min: null,
            messagesLoad15min: null
        }
    },
}

module.exports = {
    clientSetup,
    packetSetup,
    agentSetup
};
