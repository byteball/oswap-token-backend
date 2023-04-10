const dag = require('aabot/dag.js');
const moment = require('moment');

const { getExchangeRates, getAppreciationState } = require('../../utils');

const DECIMALS = 9;
const CACHE_TS = 1800; // 30 min
const MAX_SHOWN_APY = 7000;

let poolsApy = { data: [], ts: undefined };

module.exports = async (_, res) => {
    if (poolsApy.ts && moment.utc().unix() - poolsApy.ts < CACHE_TS) return res.send(poolsApy);

    const pools = await dag.readAAStateVars(process.env.AA_ADDRESS, "pool_").then((pools) => {
        return Object.entries(pools).filter(([key, data]) => !key.startsWith("pool_asset") && !key.startsWith("pool_vps") && !data.blacklisted).map(([key, data]) => {
            const asset = key.split("_")?.[1];
            return ({
                asset,
                ...data
            });
        })
    });

    const poolVps = {};
    const totalLpTokens = {};
    const addresses = {};

    for (const { group_key, asset_key, asset } of pools) {
        if (!(group_key in poolVps)) {
            poolVps[group_key] = await dag.readAAStateVars(process.env.AA_ADDRESS, `pool_vps_${group_key}`).then((data) => data[`pool_vps_${group_key}`]);
        }

        totalLpTokens[asset] = await dag.readAAStateVars(process.env.AA_ADDRESS, `pool_asset_balance_${asset_key}`).then((data) => data[`pool_asset_balance_${asset_key}`]);

        const objJoint = await dag.readJoint(asset);
        
        const defMsg = objJoint.unit.messages.find(({ app }) => app === "definition");

        if (defMsg) {
            addresses[asset] = defMsg.payload.definition[1].params.pool_aa;
        }
    }

    const rates = await getExchangeRates();

    const oldState = await dag.readAAStateVars(process.env.AA_ADDRESS, 'state').then((data) => data.state);
    const appreciationRate = await dag.executeGetter(process.env.AA_ADDRESS, 'get_appreciation_rate', []);
    const stakersShare = await dag.executeGetter(process.env.AA_ADDRESS, 'get_stakers_share', [])
    const inflationRate = await dag.executeGetter(process.env.AA_ADDRESS, 'get_inflation_rate', []);

    const state = getAppreciationState(oldState, appreciationRate);
    const gbyteToUSDRate = rates[`GBYTE_USD`];

    const totalNormalizedVp = state?.total_normalized_vp || 0;
    const supply = state?.supply || 0;

    const oswapTokenPrice = state.coef * (state.s0 / (state.s0 - state.supply)) ** 2;

    const oswapTokenPriceUsd = oswapTokenPrice * gbyteToUSDRate;

    const totalEmissionsPerDay = ((1 / 360) * inflationRate * supply) / 10 ** DECIMALS;
    const totalEmissionsPerDayLP = totalEmissionsPerDay * (1 - stakersShare);

    pools.forEach(({ asset_key, asset, group_key }, i) => {
        const lpPriceUsd = rates[`${asset}_USD`];

        const dailyPoolIncome = totalEmissionsPerDayLP * (poolVps[group_key][asset_key] / totalNormalizedVp);

        const dailyPoolIncomeUsd = dailyPoolIncome * oswapTokenPriceUsd;
        const rateOfReturn = (1 + dailyPoolIncomeUsd / (totalLpTokens[asset] * lpPriceUsd)) ** 360;

        pools[i].apy = Number((rateOfReturn - 1) * 100).toPrecision(6);
    })

    poolsApy = { data: pools.map(({ apy, asset }) => ({ asset, apy, address: addresses[asset] })).filter(({ apy }) => apy <= MAX_SHOWN_APY), ts: moment.utc().unix() };

    res.send(poolsApy);
}