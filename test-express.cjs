const express = require('express');
const app = express();

app.use("/api", (req, res, next) => {
  console.log("path:", req.path);
  console.log("query:", req.query);
  res.send("ok");
});

const server = app.listen(3001, async () => {
  const fetch = (await import('node-fetch')).default;
  const res = await fetch('http://localhost:3001/api/load-data?scope=regulatory-agenda');
  server.close();
});
