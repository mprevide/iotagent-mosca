const clientSetup = {
    id: 'admin:u86fda',
    connection: {
        stream: null,
    },
    close() {
        return true;
    },
    deviceId: 'u86fda'
};

const packetSetup = {
    topic: 'admin/6dc341/attrs',
    payload: {
        "temperature": '15.3'
    }
};

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
    getDevice() {
        return Promise.resolve();
    }
};

module.exports = {
    clientSetup,
    packetSetup,
    agentSetup
};
