const { pool } = require("../helpers/database.helper.js");

const fdrController = {};

fdrController.getAllFdrData = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM fdr_menu`);
    return res.json({ status: 1, data: result.rows });
  } catch (error) {
    console.error("Error fetching FDR data:", error);
    return res.json({ status: 0, msg: "Internal Server Error" });
  }
};

fdrController.saveFdrData = async (req, res) => {
  try {
    const inputs = req.body;
    const query = `
      INSERT INTO fdr_menu (fdr_name, fdr_amount, fdr_interest_rate, fdr_start_date, fdr_end_date)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (fdr_name)
      DO UPDATE SET
        fdr_amount = EXCLUDED.fdr_amount,
        fdr_interest_rate = EXCLUDED.fdr_interest_rate,
        fdr_start_date = EXCLUDED.fdr_start_date,
        fdr_end_date = EXCLUDED.fdr_end_date`;

    let updatedFDR = await pool.query(query, [
      inputs.fdr_name,
      inputs.fdr_amount,
      inputs.fdr_interest_rate,
      inputs.fdr_start_date,
      inputs.fdr_end_date,
    ]);

    if (updatedFDR.rowCount > 0) {
      res.send({ status: 1, msg: "FDR saved successfully" });
    } else {
      res.send({ status: 0, msg: "Something went wrong" });
    }
  } catch (error) {
    console.error("Error saving FDR data:", error);
    res.send({ status: 0, msg: "Something went wrong" });
  }
};

module.exports = fdrController;
