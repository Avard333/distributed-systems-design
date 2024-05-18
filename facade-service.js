const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const _ = require('lodash')
const { v4: uuidv4 } = require('uuid');
const { Client } = require('hazelcast-client');
const { exec } = require("child_process");
const Consul = require('consul');

const consulClient = new Consul({ host: 'localhost', port: 8500 });

const app = express();
const port = process.argv[2] || 3000;


consulClient.agent.service.register({
  id: `facade-${port.toString()}`,
  address: "/facade",
  name: "facade",
  port: parseInt(port),
}, function(err) {
  if (err) throw err;
});

let CONFIG;

consulClient.kv.get('config', (err, result) => {
  if (err) {
    throw err;
  }
  CONFIG = result;
  console.log('KV value:', result);
});




let queue

(async () => {
  try {
    const hz = await Client.newHazelcastClient({
      clusterName: CONFIG["cluster_name"],
    });
    queue = await hz.getQueue(CONFIG["queue_name"]);
  } catch (error) {
    console.error('Failed to initialize Hazelcast client:', error);
    process.exit(1); 
  }
})();

async function getURls() {
  let LOGGING_SERVICE_URLS = [];
  let MESSAGES_SERVICE_URLS = [];

  try {
    const loggingResult = await consulClient.health.service('logging');
    LOGGING_SERVICE_URLS = loggingResult.map(el => 
      `http://127.0.0.1:${el.Service.Port}${el.Service.Address}`
    );
  } catch (err) {
    console.error('Error fetching logging service health:', err);
  }

  try {
    const messagesResult = await consulClient.health.service('messages');
    MESSAGES_SERVICE_URLS = messagesResult.map(el => 
      `http://127.0.0.1:${el.Service.Port}${el.Service.Address}`
    );
    console.log(MESSAGES_SERVICE_URLS);
  } catch (err) {
    console.error('Error fetching messages service health:', err);
  }

  return { LOGGING_SERVICE_URLS, MESSAGES_SERVICE_URLS };
}

app.use(bodyParser.raw({ type: '*/*' }));

app.post('/facade', async (req, res) => {
  try {
    let urls = await getURls()
    let logging_sevice_url = _.sample(urls["LOGGING_SERVICE_URLS"])
    let messages_sevice_url = _.sample(urls["MESSAGES_SERVICE_URLS"])
    await queue.put(req.body.toString('utf-8'));
    await axios.post(messages_sevice_url)
    const messagesResponse = await axios.post(logging_sevice_url, {
      data:
        {
          id: uuidv4(), 
          msg:req.body.toString('utf-8')
        }
  });
    res.sendStatus(200);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/facade', async (req, res) => {
  try {
    let urls = await getURls()
    console.log(urls)
    let logging_sevice_url = _.sample(urls["LOGGING_SERVICE_URLS"])
    let messages_sevice_url = _.sample(urls["MESSAGES_SERVICE_URLS"])
    const loggingResponse = await axios.get(logging_sevice_url);
    const messagesResponse = await axios.get(messages_sevice_url);
    res.json({
      messages: messagesResponse.data,
      logging: loggingResponse.data,
    });
    res.sendStatus(200)
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

let server = app.listen(port, () => {
  console.log(`Facade service listening at http://localhost:${port}`);
});

process.on('SIGINT', () => {
  console.info('SIGINT signal received.');
  console.log('Closing http server.');
  consulClient.agent.service.deregister(`facade-${port.toString()}`, (err) => {
    if (err) throw err;
    console.log('Service deregistered successfully.');
  });
  server.close((err) => {
    console.log('Http server closed.');
    process.exit(err ? 1 : 0);
  });
});
