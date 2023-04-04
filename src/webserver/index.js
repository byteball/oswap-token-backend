const express = require("express");
var cors = require('cors');

const candlesController = require("./controllers/candlesController");

const app = express();

// middlewares
app.use(cors());

// routes
app.get("/candles", candlesController);

app.listen(process.env.PORT, () => {
  console.log(`Webserver started on port ${process.env.PORT}`);
});
