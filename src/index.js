const { Hooks } = require("aa-hooks");

const { tradeHandler } = require("./handlers/tradeHandler.js");
const bootstrap = require("./bootstrap.js");

bootstrap().then(() => {
  require("./webserver");

  new Hooks([process.env.AA_ADDRESS])
    .register(tradeHandler)
    .isSuccess()
    .responseKeyContains("price")
    .responseKeyContains("coef_multiplier")
    .responseKeyContains("swap_fee")
    .responseKeyContains("fee%");
});
