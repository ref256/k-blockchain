const crypto = require('crypto');
const Swarm = require('discovery-swarm');
const defaults = require('dat-swarm-defaults');
const getPort = require('get-port');

// set your vars to hold and object with the peers and conn sequence
const peers = {};
let connSeq = 0;

// choose a channel name that all your nodes will be connecting to
let channel = 'kblockchain';

const myPeerId = crypto.randomBytes(32);
console.log('myPeersId: ' + myPeerId.toString('hex'));

// generate a config object that holds your peer ID
const config = defaults({
    id: myPeerId,
});

// initialize swarm library using config as object
const swarm = Swarm(config);

(async () => {
    // listen on the random port selected
    const port = await getPort();

    swarm.listen(port);
    console.log('Listening port: ' + port);

    swarm.join(channel);
    swarm.on('connection', (conn, info) => {
        const seq = connSeq;
        const peerId = info.id.toString('hex');
        console.log(`Connected #${seq} to peer: ${peerId}`);
        if (info.initiator) {
            try {
                // use setKeepAlive to ensure the network connection stays with other peers
                conn.setKeepAlive(true, 600);
            } catch (ex) {
                console.log('exception', ex);
            }
        }

        // once you receive a data message on the P2P network, you parse the data using JSON.parse
        conn.on('data', (data) => {
            let message = JSON.parse(data);
            console.log('----------- Received Message start -----------');
            console.log(
                'from: ' + peerId.toString('hex'),
                'to: ' + peerId.toString(message.to),
                'my: ' + myPeerId.toString('hex'),
                'type: ' + JSON.stringify(message.type),
            );
            console.log('----------- Received Message end -----------');
        });

        /*
            listen to a close event, which will indicate that you
            lost a connections with peers, so you can take action, such as delete
            the peers from your peers list object.
        */
        conn.on('close', () => {
            console.log(`Connection ${seq} closed, peerId: ${peerId}`);
            if (peers[peerId].seq === seq) {
                delete peers[peerId];
            }
        });

        if (!peers[peerId]) {
            peers[peerId] = {};
        }
        peers[peerId].conn = conn;
        peers[peerId].seq = seq;
        connSeq++;
    });
})();

// using setTImeout node.js native function to send a message after 10 seconds to any available peers
setTimeout(function () {
    writeMessageToPeers('hello', null);
}, 10000);

// writeMessageToPeers method will be sending messages to all the connected peers
const writeMessageToPeers = (type, data) => {
    for (let id in peers) {
        console.log('-------- writeMessageToPeers start --------');
        console.log('type: ' + type + ', to: ' + id);
        console.log('-------- writeMessageToPeers end --------');
        sendMessage(id, type, data);
    }
};

// writeMessageToPeerToId method will be sending the message to a specific peer id
const writeMessageToPeerToId = (toId, type, data) => {
    for (let id in peers) {
        if (id === toId) {
            console.log('-------- writeMessageToPeerToId start --------');
            console.log('type: ' + type + ', to: ' + id);
            console.log('-------- writeMessageToPeerToId end --------');
            sendMessage(id, type, data);
        }
    }
};

/*
    sendMessage is a generic method that we will be using to send a
    message formatted with the params you would like to pass and includes th
    following:
        - to/from: the peer id you sending the message to and from
        - type: the message type
        - data: any data you would like to share on the P2P network
*/

const sendMessage = (id, type, data) => {
    peers[id].conn.write(
        JSON.stringify({
            to: id,
            from: myPeerId,
            type,
            data,
        }),
    );
};
