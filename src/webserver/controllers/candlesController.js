const { DbService } = require("../../db");

module.exports = async (req, res) => {
  try {
    const {
      query: { type = "hourly", onlyPrice = false, limit },
    } = req;

    if (limit) {
      const nLimit = Number(limit);

      if (!nLimit || nLimit < 1 || nLimit > 360) {
        return res.status(400).send({
          error: "Please check the limit field",
        });
      }
    }

    const showOnlyPrice = onlyPrice && onlyPrice !== "false";

    const candles = await DbService.getCandles(type, limit ? +limit : undefined, showOnlyPrice);

    return res.send({ data: candles });
  } catch (e) {
    return res.status(400).send({
      error: e.message,
    });
  }
};
