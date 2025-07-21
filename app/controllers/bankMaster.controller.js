const { pool } = require("../helpers/database.helper.js");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");

class bankMasterController {
  getAllBankMaster = async (req, res) => {
    try {
      let token = req.session.token;

      const query = `SELECT * FROM bank_master ORDER BY bank_master.doc_id DESC`;
      const { rows: banks } = await pool.query(query);

      if (banks.length === 0) {
        return res.json({ status: 404, msg: "No records found" });
      }

      return res.json({ status: 200, data: banks });
    } catch (error) {
      console.error("Error fetching bank master data:", error);
      return res
        .status(500)
        .json({ status: 500, msg: "Internal server error" });
    }
  };

  deleteBankMaster = async (req, res) => {
    try {
      let token = req.session.token;
      const { bank_id } = req.body;

      if (!bank_id) {
        return res.json({ status: 400, msg: "Bank ID is required" });
      }

      const query = `DELETE FROM bank_master WHERE doc_id = $1`;
      await pool.query(query, [bank_id]);

      return res.json({ status: 200, msg: "Bank deleted successfully" });
    } catch (error) {
      console.error("Error deleting bank master data:", error);
      return res
        .status(500)
        .json({ status: 500, msg: "Internal server error" });
    }
  };

  addBankMaster = async (req, res) => {
    try {
      let token = req.session.token;
      const { bank_code, bank_name, bank_branch } = req.body;

      if (!bank_code || !bank_name || !bank_branch) {
        return res.json({ status: 400, msg: "All fields are required" });
      }

      // Check if the bank already exists
      const checkQuery = `SELECT * FROM bank_master WHERE bank_code = $1`;
      const { rowCount } = await pool.query(checkQuery, [bank_code]);
      if (rowCount > 0) {
        return res.json({ status: 400, msg: "Bank code already exists!" });
      }

      const query = `INSERT INTO bank_master (user_id, bank_name, bank_code, bank_branch, created_at) VALUES ($1, $2, $3, $4, $5)`;
      const values = [
        token.user_id,
        bank_name,
        bank_code,
        bank_branch,
        moment().format("YYYY-MM-DD HH:mm:ss"),
      ];
      await pool.query(query, values);

      return res.json({ status: 200, msg: "Bank added successfully" });
    } catch (error) {
      console.error("Error adding bank master data:", error);
      return res
        .status(500)
        .json({ status: 500, msg: "Internal server error" });
    }
  };

  editBankMaster = async (req, res) => {
    try {
      let token = req.session.token;
      const { docId, bank_code, bank_name, bank_branch } = req.body;

      if (!docId || !bank_code || !bank_name || !bank_branch) {
        return res.json({ status: 400, msg: "All fields are required" });
      }

      const query = `UPDATE bank_master SET bank_code = $1, bank_name = $2, bank_branch = $3 WHERE doc_id = $4`;
      const values = [bank_code, bank_name, bank_branch, docId];
      await pool.query(query, values);

      return res.json({ status: 200, msg: "Bank updated successfully" });
    } catch (error) {
      console.error("Error updating bank master data:", error);
      return res
        .status(500)
        .json({ status: 500, msg: "Internal server error" });
    }
  };
}

module.exports = new bankMasterController();
