const express = require('express');
const { Client } = require('hazelcast-client');

const app = express();
const port = process.argv[2] || 3004;
let queue

(async () => {
  try {
    const hz = await Client.newHazelcastClient({
      clusterName: "hz_lab"
    });
    queue = await hz.getQueue('queue'); 
  } catch (error) {
    console.error('Failed to initialize Hazelcast client:', error);
    process.exit(1); 
  }
})();

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

app.listen(port, () => {
  console.log(`Messages service listening at http://localhost:${port}`);
});
