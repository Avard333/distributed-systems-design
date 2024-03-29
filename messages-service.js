const express = require('express');

const app = express();
const port = 3001;

app.get('/messages', (req, res) => {
  res.json('Static Message from messages-service');
});

app.listen(port, () => {
  console.log(`Messages service listening at http://localhost:${port}`);
});
