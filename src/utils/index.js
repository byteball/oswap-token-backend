const moment = require('moment');
const network = require('ocore/network.js');
const dag = require('aabot/dag.js');
const token_registry = require('aabot/token_registry.js');

const YEAR = 360 * 24 * 3600;
const COMMON_TS = 1657843200;
const EXCHANGE_RATES_TIMEOUT = 30 * 1000;

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

// the light vendor callback is (ws, request, response) — the 2nd argument is the request,
// not an error. Failures arrive as response.error, and an unresponsive hub means the callback
// is never called at all, hence the timeout: otherwise the promise hangs forever.
const getExchangeRates = () => {
  return new Promise((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      settled = true;
      reject(Error("timed out waiting for exchange rates from the hub"));
    }, EXCHANGE_RATES_TIMEOUT);

    network.requestFromLightVendor('hub/get_exchange_rates', null, (ws, request, response) => {
      if (settled) return;
      clearTimeout(timer);

      if (!response || response.error) {
        return reject(Error(`failed to get exchange rates: ${(response && response.error) || "empty response"}`));
      }

      resolve(response);
    });
  })
}

// resolves how a pool asset should be displayed: its symbol from the token registry, or the
// "XSYM-YSYM" pair read from the pool AA definition when the asset has no registered symbol.
// address is undefined when the asset was not issued by an oswap pool — every step is optional
// because the asset may be an arbitrary token and the definition may be unreadable.
const getPoolAssetInfo = async (pool_asset) => {
  const symbol = await token_registry.getSymbolByAsset(pool_asset);

  const objJoint = await dag.readJoint(pool_asset);

  const defMsg = objJoint?.unit?.messages?.find(({ app }) => app === "definition");
  const address = defMsg?.payload?.definition?.[1]?.params?.pool_aa;

  let name = null;

  if (!symbol && address) {
    const poolDef = await dag.readAADefinition(address);

    const xAsset = poolDef?.[1]?.params?.x_asset;
    const yAsset = poolDef?.[1]?.params?.y_asset;

    if (xAsset && yAsset) {
      const xSymbol = await token_registry.getSymbolByAsset(xAsset) || (`${xAsset.slice(0, 5)}...`);
      const ySymbol = await token_registry.getSymbolByAsset(yAsset) || (`${yAsset.slice(0, 5)}...`);

      name = `${xSymbol}-${ySymbol}`;
    }
  }

  return { symbol, name, address };
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

const getUpdatedState = (state, appreciation_rate) => {
  const appr_res = getAppreciationResult(state, appreciation_rate);

  return {
    ...state,
    s0: appr_res.new_s0,
    coef: state.coef * appr_res.coef_multiplier,
    last_ts: moment.utc().unix(),
  };
};

const getDataByTriggerUnit = (triggerUnit)=> {
  return triggerUnit.messages.find((m => m.app === 'data'))?.payload || {};
}

const getResponseVarsByResponseObj = (responseObj) => {
  return responseObj?.response?.responseVars || {}
}

const getCurrentVpByNormalized = (normalized_vp) => {
  return normalized_vp / 4 ** ((moment.utc().unix() - COMMON_TS) / YEAR);
};


exports.getUpdatedState = getUpdatedState;
exports.exists = exists;
exports.objectContains = objectContains;
exports.getExchangeRates = getExchangeRates;
exports.getPoolAssetInfo = getPoolAssetInfo;
exports.getDataByTriggerUnit = getDataByTriggerUnit;
exports.getCurrentVpByNormalized = getCurrentVpByNormalized;
exports.getResponseVarsByResponseObj = getResponseVarsByResponseObj;
