const { DbService } = require("../db");

exports.tradeHandler = async (_, responseObj) => {
  const responseVars = responseObj.response?.responseVars || {};

  const {
    price = 1,
    supply = 0,
    reserve = 0,
    ["fee%"]: fee = 0,
    coef_multiplier = 0,
    total_fee = 0,
    arb_profit_tax = 0,
    swap_fee = 0,
  } = responseVars;

  const { response_unit, timestamp, trigger_address, trigger_unit } = responseObj;

  await DbService.saveTrade({
    response_unit,
    timestamp,
    trigger_address,
    trigger_unit,
    price,
    supply,
    reserve,
    swap_fee,
    arb_profit_tax,
    total_fee,
    coef_multiplier,
    fee,
  });
};
