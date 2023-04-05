const { Hooks } = require("aa-hooks");

const { tradeHandler } = require("./handlers/tradeHandler.js");
const bootstrap = require("./bootstrap.js");

bootstrap().then(() => {
  require("./webserver");

  new Hooks([process.env.AA_ADDRESS])
    .register(tradeHandler)
    .isSuccess()
    .responseContainsKey("price")
    .responseContainsKey("coef_multiplier")
    .responseContainsKey("swap_fee")
    .responseContainsKey("fee%");
});
