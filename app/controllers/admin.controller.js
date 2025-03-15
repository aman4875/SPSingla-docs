"use strict";
const { pool } = require("../helpers/database.helper.js");


const adminController = {};

adminController.settings = async (req, res) => {
    const inputs = req.body;
    const token = req.session.token;
    try {
        const query = `
            INSERT INTO admin_settings (setting_name, setting_value) 
            VALUES ($1, $2) 
            ON CONFLICT (setting_name) 
            DO UPDATE SET setting_value = EXCLUDED.setting_value;
        `;

        const values = [Object.keys(inputs)[0], inputs.doc_lock_date]
        await pool.query(query, values);

        return res.json({ status: 1, msg: "Settings Saved" });
    } catch (error) {
        console.log("🚀 ~ adminController.settings= ~ error:", error)
        return res.json({ status: 0, msg: "Internal Server Error" });
    }
}

module.exports = adminController;