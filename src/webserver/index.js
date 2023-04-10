const express = require("express");
var cors = require('cors');

const candlesController = require("./controllers/candlesController");
const farmingLpApyController = require("./controllers/farmingLpApyController");

const app = express();

// middlewares
app.use(cors());

// routes
app.get("/candles", candlesController);
app.get("/lp_apy", farmingLpApyController);

app.listen(process.env.PORT, () => {
  console.log(`Webserver started on port ${process.env.PORT}`);
});
