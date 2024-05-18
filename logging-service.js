const express = require('express');
const { Client } = require('hazelcast-client');
const { exec } = require("child_process");

const CLUSTER_CONFIG={
  3001:{
    node_id:"defc7825e2fa32c6216fee84dc3f8d3e701329684c0e5d2deb3cef1491ccfd25",
    node_ip:["192.168.0.106:5701"]
  },
  3002:{
    node_id:"09bada0ad4f418a81a5d77123ff32b0063e7be7ba1b5ebfecd8515c1f554aeee",
    node_ip:["192.168.0.106:5702"]
  },
  3003:{
    node_id:"f74e50671acd5432f094dad2c3a527fe5a03842502c2d2b8f76ab0a6565a22de",
    node_ip:["192.168.0.106:5703"]
  }
}

const app = express();
const port = process.argv[2] || 3001;
const node = CLUSTER_CONFIG[port]
let map;

function shutdownServer(){
  exec(`docker stop ${node.node_id}`)
}


(async () => {
  try {
    const hz = await Client.newHazelcastClient({
      clusterName: "hz_lab",
      network: {
        clusterMembers: node.node_ip
      }
    });
    map = await hz.getMap('message-map'); 
  } catch (error) {
    console.error('Failed to initialize Hazelcast client:', error);
    process.exit(1); 
  }
})();



app.use(express.json());

app.post('/logging', async (req, res) => {
  const message = req.body.data;
  console.log(req.body.data)
  await map.put(message.id, message.msg)
  res.status(201).send('Message logged successfully');
});

app.get('/logging', async (req, res) => {
  if (!map) return res.status(500).send('Hazelcast client is not initialized.');
  const values = await map.values(); 
  const messages = Array.from(values); 
  const concatenatedMsg = messages.map(item => item.toString()).join(' '); 
  res.json({ concatenatedMsg });
});

let server = app.listen(port, () => {
  console.log(`Logging service listening at http://localhost:${port}`);
});

process.on('SIGINT', () => {
  shutdownServer()
  console.info('SIGINT signal received.');
  console.log('Closing http server.');
  server.close((err) => {
    console.log('Http server closed.');
    process.exit(err ? 1 : 0);
  });
});


