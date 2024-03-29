const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;

app.use(bodyParser.raw({ type: '*/*' }));

app.post('/facade', async (req, res) => {
  try {
    console.log(req.body.toString('utf-8'))
    const messagesResponse = await axios.post('http://localhost:3002/logging', {
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
    const loggingResponse = await axios.get('http://localhost:3002/logging');
    const messagesResponse = await axios.get('http://localhost:3001/messages');
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
