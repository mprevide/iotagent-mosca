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
    getDevice(device, tenant) {
        return true;
    }
}

module.exports = {
    clientSetup,
    packetSetup,
    agentSetup
};
