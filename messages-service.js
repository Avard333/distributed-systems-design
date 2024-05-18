const express = require('express');
const { Client } = require('hazelcast-client');
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

const app = express();
const port = process.argv[2] || 3004;
let queue

(async () => {
  try {
    const hz = await Client.newHazelcastClient({
      clusterName: CONFIG["cluster_name"]
    });
    queue = await hz.getQueue(CONFIG["queue_name"]); 
  } catch (error) {
    console.error('Failed to initialize Hazelcast client:', error);
    process.exit(1); 
  }
})();


consulClient.agent.service.register({
  id: `messages-${port.toString()}`,
  address: "/messages",
  name: "messages",
  port: parseInt(port),
}, function(err) {
  if (err) throw err;
});

let messages = []

app.get('/messages', async (req, res) => {
  res.json(messages);
});

app.post('/messages', async (req, res) => {
  let taked_item = await queue.take()
  messages.push(taked_item)
  console.log(`Taked item from queue messages:${port} ${taked_item}`)
  res.sendStatus(200)
});

let server = app.listen(port, () => {
  console.log(`Messages service listening at http://localhost:${port}`);
});


process.on('SIGINT', () => {
  console.info('SIGINT signal received.');
  console.log('Closing http server.');
  consulClient.agent.service.deregister(`messages-${port.toString()}`, (err) => {
    if (err) throw err;
    console.log('Service deregistered successfully.');
  });
  server.close((err) => {
    console.log('Http server closed.');
    process.exit(err ? 1 : 0);
  });
});
