const { pool } = require("../helpers/database.helper.js");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");

const bankMasterController = {};

bankMasterController.getAllBankMaster = async (req, res) => {
    try {
        let token = req.session.token;

        const query = `SELECT * FROM bank_master`;
        const { rows: banks } = await pool.query(query);

        if (banks.length === 0) {
            return res.json({ status: 404, msg: "No records found" });
        }

        return res.json({ status: 200, data: banks });
    } catch (error) {
        console.error("Error fetching bank master data:", error);
        return res.status(500).json({ status: 500, msg: "Internal server error" });
    }
};

bankMasterController.addBankMaster = async (req, res) => {
    try {
        let token = req.session.token;
        const { bank_code, bank_name, bank_branch } = req.body;
        console.log(req.body);
        if (!bank_code || !bank_name || !bank_branch) {
            return res.json({ status: 400, msg: "All fields are required" });
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
        return res.status(500).json({ status: 500, msg: "Internal server error" });
    }
};

module.exports = bankMasterController;
