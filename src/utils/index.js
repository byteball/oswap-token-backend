const moment = require('moment');
const network = require('ocore/network.js');

const YEAR = 360 * 24 * 3600;

const exists = (array) => {
  array.forEach((item) => {
    if (item === undefined) {
      throw Error("value is undefined");
    }
  });
};

const objectContains = (obj, keys = []) => {
  const fields = Object.keys(obj);
  const values = Object.values(obj);

  if (fields.length === keys.length) {
    keys.forEach((key) => {
      if (obj[key] === undefined) {
        throw Error("not valid object");
      }
    });
  } else {
    throw Error("Please enter all parameters");
  }

  return {
    fields,
    values,
    length: keys.length,
  };
};

const getExchangeRates = () => {
  return new Promise((resolve) => {
    network.requestFromLightVendor('hub/get_exchange_rates', null, (ws, err, result) => {
      resolve(result)
    });
  })
}

const getAppreciationResult = (state, appreciation_rate) => {
  const timestamp = moment.utc().unix();
  const elapsed_time = timestamp - state.last_ts;

  const r = state.reserve;
  const s = state.supply;
  const s0 = state.s0;

  if (s === 0 || elapsed_time === 0) {
    return { new_s0: s0, coef_multiplier: 1 };
  }

  const p = state.coef * (s0 / (s0 - s)) ** 2;

  const new_p = p * (1 + (elapsed_time / YEAR) * appreciation_rate);
  const new_s0 = s + 1 / (new_p / r - 1 / s);

  const coef_multiplier = ((s0 / new_s0) * (new_s0 - s)) / (s0 - s); //   < 1

  return {
    new_s0,
    coef_multiplier,
  };
};

const getAppreciationState = (state, appreciation_rate) => {
  const appr_res = getAppreciationResult(state, appreciation_rate);

  return {
    ...state,
    s0: appr_res.new_s0,
    coef: state.coef * appr_res.coef_multiplier,
    last_ts: moment.utc().unix(),
  };
};

exports.getAppreciationState = getAppreciationState;
exports.exists = exists;
exports.objectContains = objectContains;
exports.getExchangeRates = getExchangeRates;