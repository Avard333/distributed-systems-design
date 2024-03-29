const express = require('express');

const app = express();
const port = 3002;

let storedMessages = [];

app.use(express.json());

app.post('/logging', (req, res) => {
  const message = req.body.data;
  console.log(req.body.data)
  storedMessages.push(message);
  res.status(201).send('Message logged successfully');
});

app.get('/logging', (req, res) => {
  const concatenatedMsg = storedMessages.map(item => item.msg).join(' ');
  res.json(concatenatedMsg);
});

app.listen(port, () => {
  console.log(`Logging service listening at http://localhost:${port}`);
});
