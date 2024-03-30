const express = require('express');
const { Client } = require('hazelcast-client');
const { exec } = require("child_process");

const CLUSTER_CONFIG={
  3001:{
    node_id:"81f81432aae2b7bcb2728a2e18743d72d17f1b66d4a66ce111335640f4c8cb28",
    node_ip:["192.168.0.102:5701"]
  },
  3002:{
    node_id:"1aa5a01a8307b38ead40624dc312c65bbbb48bc9ec8744b02b1694cc926ec32b",
    node_ip:["192.168.0.102:5701"]
  },
  3003:{
    node_id:"5d5c7d0dc85b0d0ab76bc51dda215da7aa8b7845286e9767c89bfc1adc941bef",
    node_ip:["192.168.0.102:5701"]
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


