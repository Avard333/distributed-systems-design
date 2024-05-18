const express = require('express');
const { Client } = require('hazelcast-client');
const { exec } = require("child_process");
const Consul = require('consul');

const consulClient = new Consul({ host: '127.0.0.1', port: 8500 });

let CONFIG;

consulClient.kv.get('config', (err, result) => {
  if (err) {
    throw err;
  }
  CONFIG = result;
  console.log('KV value:', result);
});

const CLUSTER_CONFIG = CONFIG["node"]

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
      clusterName: CONFIG["cluster_name"],
      network: {
        clusterMembers: node.node_ip
      }
    });
    map = await hz.getMap(CONFIG["map_name"]); 
  } catch (error) {
    console.error('Failed to initialize Hazelcast client:', error);
    process.exit(1); 
  }
})();

consulClient.agent.service.register({
  id: `logging-${port.toString()}`,
  address: "/logging",
  name: "logging",
  port: parseInt(port),
}, function(err) {
  if (err) throw err;
});


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
  consulClient.agent.service.deregister(`logging-${port.toString()}`, (err) => {
    if (err) throw err;
    console.log('Service deregistered successfully.');
  });
  server.close((err) => {
    console.log('Http server closed.');
    process.exit(err ? 1 : 0);
  });
});


