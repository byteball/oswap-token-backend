const db = require("ocore/db.js");
const conf = require("ocore/conf.js");
const moment = require("moment");

const { objectContains } = require("../utils");

const MAX_DAYS_HOURLY_AUTO = 30;

class DbService {
  static async create() {
    await db.query(`CREATE TABLE IF NOT EXISTS ${conf.project_db_prefix || ""}_trades (
			response_unit CHAR(44) PRIMARY KEY NOT NULL,
			timestamp TIMESTAMP NOT NULL,
			trigger_address CHAR(32) NOT NULL,
			trigger_unit CHAR(44) NOT NULL,

			price REAL DEFAULT 1,
			supply REAL DEFAULT 0,
			swap_fee REAL DEFAULT 0,
			reserve INTEGER DEFAULT 0,
			arb_profit_tax REAL DEFAULT 0,
			total_fee REAL DEFAULT 0,
			coef_multiplier REAL DEFAULT 1,
			fee REAL DEFAULT 1
		)`);

    await db.query(`CREATE TABLE IF NOT EXISTS ${conf.project_db_prefix || ""}_hourly_candles (
			start_timestamp TIMESTAMP PRIMARY KEY NOT NULL,
      open_price REAL DEFAULT 1,
			open_supply REAL DEFAULT 0,
			open_reserve INTEGER DEFAULT 0,
			open_coef_multiplier REAL DEFAULT 1,

			close_price REAL DEFAULT 1,
			close_supply REAL DEFAULT 0,
			close_reserve INTEGER DEFAULT 0,
			close_coef_multiplier REAL DEFAULT 1
		)`);

    await db.query(`CREATE TABLE IF NOT EXISTS ${conf.project_db_prefix || ""}_daily_candles (
      start_timestamp TIMESTAMP PRIMARY KEY NOT NULL,

			open_price REAL DEFAULT 1,
			open_supply REAL DEFAULT 0,
			open_reserve INTEGER DEFAULT 0,
			open_coef_multiplier REAL DEFAULT 1,

			close_price REAL DEFAULT 1,
			close_supply REAL DEFAULT 0,
			close_reserve INTEGER DEFAULT 0,
			close_coef_multiplier REAL DEFAULT 1
		)`);

    await db.query(`CREATE TABLE IF NOT EXISTS ${conf.project_db_prefix || ""}_pools (
      asset CHAR(44) PRIMARY KEY NOT NULL,
      asset_key CHAR(10) NOT NULL,
      group_key CHAR(10) NOT NULL,
      address CHAR(32),
      name CHAR(50),
      symbol CHAR(50),
      status CHAR(10) NOT NULL,
      updated_symbol_ts TIMESTAMP NOT NULL
    )`);

    console.error("db installed");
  }

  static async savePool(data) {
    const expectedFields = [
      "asset",
      "asset_key",
      "group_key",
      "address",
      "name",
      "symbol",
      "status",
      "updated_symbol_ts"
    ];

    const { fields, values, length } = objectContains(data, expectedFields);

    const pool = await this.getPoolInfoByKeys(data.group_key, data.asset_key);

    if (!pool) {
      await db.query(
        `INSERT INTO ${conf.project_db_prefix || ""}_pools (${fields.join(", ")}) VALUES (?${", ?".repeat(length - 1)})`,
        values
      );
    } else {
      await db.query(
        `UPDATE ${conf.project_db_prefix || ""}_pools SET name=?, symbol=?, status=?, updated_symbol_ts=? WHERE group_key=? AND asset_key=?`,
        [data.name, data.symbol, data.status, data.updated_symbol_ts, data.group_key, data.asset_key]
      );
    }
  }

  static async saveTrade(data) {
    const start_hourly_timestamp = moment
      .unix(data.timestamp)
      .utc()
      .startOf("hour")
      .unix();
    const start_daily_timestamp = moment
      .unix(data.timestamp)
      .utc()
      .startOf("day")
      .unix();

    const expectedFields = [
      "response_unit",
      "timestamp",
      "trigger_address",
      "trigger_unit",
      "price",
      "supply",
      "reserve",
      "swap_fee",
      "arb_profit_tax",
      "total_fee",
      "coef_multiplier",
      "fee",
    ];

    const { fields, values, length } = objectContains(data, expectedFields);

    await db.query(
      `INSERT INTO ${conf.project_db_prefix || ""}_trades (${fields.join(", ")}) VALUES (?${", ?".repeat(length - 1)})`,
      values
    );

    const [existHourlyCandle] = await db.query(
      `SELECT * FROM ${conf.project_db_prefix || ""}_hourly_candles WHERE start_timestamp = ?`,
      [start_hourly_timestamp]
    );
    const [existDailyCandle] = await db.query(
      `SELECT * FROM ${conf.project_db_prefix || ""}_daily_candles WHERE start_timestamp = ?`,
      [start_daily_timestamp]
    );

    if (existHourlyCandle) {
      await db.query(
        `UPDATE ${conf.project_db_prefix || ""}_hourly_candles SET close_price = ?, close_supply = ?, close_reserve = ?, close_coef_multiplier = ? WHERE start_timestamp = ?`,
        [
          data.price,
          data.supply,
          data.reserve,
          data.coef_multiplier,
          start_hourly_timestamp,
        ]
      );
    } else {
      await db.query(
        `INSERT INTO ${conf.project_db_prefix || ""}_hourly_candles (open_price, open_supply, open_reserve, open_coef_multiplier, close_price, close_supply, close_reserve, close_coef_multiplier, start_timestamp) VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          data.price,
          data.supply,
          data.reserve,
          data.coef_multiplier,

          data.price,
          data.supply,
          data.reserve,
          data.coef_multiplier,

          start_hourly_timestamp,
        ]
      );
    }

    if (existDailyCandle) {
      await db.query(
        `UPDATE ${conf.project_db_prefix || ""}_daily_candles SET close_price = ?, close_supply = ?, close_reserve = ?, close_coef_multiplier = ? WHERE start_timestamp = ?`,
        [
          data.price,
          data.supply,
          data.reserve,
          data.coef_multiplier,
          start_daily_timestamp,
        ]
      );
    } else {
      await db.query(
        `INSERT INTO ${conf.project_db_prefix || ""}_daily_candles (open_price, open_supply, open_reserve, open_coef_multiplier, close_price, close_supply, close_reserve, close_coef_multiplier, start_timestamp) VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          data.price,
          data.supply,
          data.reserve,
          data.coef_multiplier,
          data.price,
          data.supply,
          data.reserve,
          data.coef_multiplier,
          start_daily_timestamp,
        ]
      );
    }
  }

  static async getCandles(customType, customLimit, showOnlyPrice) {
    if (customType !== "daily" && customType !== "hourly" && customType !== "auto") throw Error("unknown type");

    const [first_trade] = await db.query(
      `SELECT * FROM ${conf.project_db_prefix || ""}_trades ORDER BY timestamp ASC LIMIT 1`
    );

    const first_trade_ts = first_trade?.timestamp || 0;
    const now_ts = moment.utc().unix();

    let limit;
    let type;

    if (customType === "auto") {
      if ((now_ts - first_trade_ts) <= 3600 * 24 * MAX_DAYS_HOURLY_AUTO) {
        type = "hourly";
        limit = customLimit ? customLimit : 24 * MAX_DAYS_HOURLY_AUTO;
      } else {
        limit = customLimit ? customLimit : 30 * 12;
        type = "daily";
      }
    } else {
      limit = customLimit ? customLimit : customType === "hourly" ? 24 : 30 * 12;
      type = customType;
    }

    const step_length = type === "hourly" ? 3600 : 24 * 3600; // hour in seconds OR day in seconds
    const end = moment
      .utc()
      .startOf(type === "hourly" ? "hour" : "day")
      .add(1, type === "hourly" ? "h" : "d")
      .unix();

    let start = end - step_length * limit;
    // 1st step: select all candles in period
    let rows = await db.query(
      `SELECT * FROM ${conf.project_db_prefix || ""}_${type}_candles WHERE start_timestamp >= ? ORDER BY start_timestamp DESC LIMIT ${limit}`,
      [start]
    );

    // 2nd step: If there was no trading for the selected period, then we look for the most recent trading event and take its date
    if (!rows[0]) {
      rows = await db.query(
        `SELECT * FROM ${conf.project_db_prefix || ""}_${type}_candles ORDER BY start_timestamp DESC LIMIT 1`,
        []
      );

      // If the market has no trading events return empty array
      if (!rows[0]) return [];

      rows[0].start_timestamp = start;
    } else if (rows[0].start_timestamp !== start) {
      // 3rd step: Find the first element, if there was one before
      const [lastRow] = await db.query(
        `SELECT * FROM ${conf.project_db_prefix || ""}_${type}_candles WHERE start_timestamp < ? ORDER BY start_timestamp DESC LIMIT 1`,
        [start]
      );

      if (lastRow) {
        lastRow.start_timestamp = start;
        rows = [...rows, lastRow];
      } else {
        start = rows[rows.length - 1].start_timestamp;
      }
    }

    let currentRowIndex = 0;
    const data = [];

    // 4th step: fill empty candles
    rows = rows.reverse();

    for (let currentTs = start; currentTs < end; currentTs += step_length) {
      if (rows[currentRowIndex] && currentTs >= rows[currentRowIndex].start_timestamp) {
        // we have a candle with this timestamp
        data.push({ ...rows[currentRowIndex], start_timestamp: currentTs });
        currentRowIndex++;
      } else {
        // we don't have a candle with this timestamp, so we have to take the last one
        const prevCandle = rows[currentRowIndex - 1];

        const newCandle = {
          ...prevCandle,
          open_price: prevCandle.close_price,
          open_supply: prevCandle.close_supply,
          open_reserve: prevCandle.close_reserve,
          open_coef_multiplier: prevCandle.close_coef_multiplier,

          close_price: prevCandle.close_price,
          close_supply: prevCandle.close_supply,
          close_reserve: prevCandle.close_reserve,
          close_coef_multiplier: prevCandle.close_coef_multiplier,

          start_timestamp: currentTs,
        };

        data.push(newCandle);
      }
    }

    if (data.length && type === "hourly") {
      data[0].start_timestamp = first_trade_ts;
    }

    return showOnlyPrice ? data.map(({ open_price }) => open_price) : data;
  }

  static async getPoolInfoByKeys(group_key, asset_key) {
    const rows = await db.query(`SELECT * FROM ${conf.project_db_prefix || ""}_pools WHERE group_key = ? AND asset_key = ? LIMIT 1`, [group_key, asset_key])

    return rows[0];
  }
}

exports.DbService = DbService;
