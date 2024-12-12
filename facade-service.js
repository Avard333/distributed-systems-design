const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const _ = require('lodash')
const { v4: uuidv4 } = require('uuid');
const { Client } = require('hazelcast-client');

const app = express();
const port = 3000;
let queue
const LOGGING_SERVICE_URLS = ['http://localhost:3001/logging', 'http://localhost:3002/logging', 'http://localhost:3003/logging'];
const MESSAGES_SERVICE_URLS = ['http://localhost:3004/messages', 'http://localhost:3005/messages'];


(async () => {
  try {
    const hz = await Client.newHazelcastClient({
      clusterName: "hz_lab",
    });
    queue = await hz.getQueue('queue');
  } catch (error) {
    console.error('Failed to initialize Hazelcast client:', error);
    process.exit(1); 
  }
})();


app.use(bodyParser.raw({ type: '*/*' }));

app.post('/facade', async (req, res) => {
  try {
    let logging_sevice_url = _.sample(LOGGING_SERVICE_URLS)
    let messages_sevice_url = _.sample(MESSAGES_SERVICE_URLS)
    await queue.put(req.body.toString('utf-8'));
    await axios.post(messages_sevice_url)
    // console.log(req.body.toString('utf-8'))
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
    let logging_sevice_url = _.sample(LOGGING_SERVICE_URLS)
    let messages_sevice_url = _.sample(MESSAGES_SERVICE_URLS)
    const loggingResponse = await axios.get(logging_sevice_url);
    const messagesResponse = await axios.get(messages_sevice_url);
    res.json({
      messages: messagesResponse.data,
      logging: loggingResponse.data,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Facade service listening at http://localhost:${port}`);
});
