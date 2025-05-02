const { pool } = require("../helpers/database.helper.js");

const fdrController = {};

fdrController.getAllFdrData = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM fdr`);
    return res.json({ status: 1, data: result.rows });
  } catch (error) {
    console.error("Error fetching FDR data:", error);
    return res.json({ status: 0, msg: "Internal Server Error" });
  }
};

module.exports = fdrController;
