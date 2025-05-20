const { pool } = require("../helpers/database.helper.js");
const getCurrentDateTime = require("../utils/getCurrentDateTime.js");

class fdrController {
  getAllFdrData = async (req, res) => {
    let token = req.session.token;

    if (token?.user_role != "0" && token?.bank_guarantee_status == false) {
      return res.json({
        status: 1,
        msg: "no permission",
        payload: {
          documents: [],
          totalPages: 0,
          currentPage: 0,
        },
      });
    }

    try {
      let inputs = req.body;
      const { selectedBankId } = req.query;
      const page = inputs.page || 1;
      const pageSize = inputs.limit || 10;
      const offset = (page - 1) * pageSize;
      let orderByClause = "ORDER BY d.doc_id DESC";
      let baseQuery = `
          SELECT
            *,
            CASE
              WHEN d.doc_interest_rate < MAX(d.doc_interest_rate) OVER () THEN true
              ELSE false
            END AS is_lowest_interest_rate
          FROM fdr_menu d
          ${
            selectedBankId !== "null"
              ? `WHERE d.bank_id = '${selectedBankId}'`
              : ""
          }`;

      const rowSummary = `
            SELECT
              SUM(COALESCE("doc_deposit_amount", 0)) AS total_deposit_amount,
              SUM(COALESCE("doc_renewal_amount", 0)) AS total_renewal_amount,
              SUM(COALESCE("doc_maturity_amount", 0)) AS total_maturity_amount,
              SUM(COALESCE("doc_interest", 0)) AS total_interest,
              SUM(COALESCE("doc_tds", 0)) AS total_tds,
              SUM(COALESCE("doc_margin_available", 0)) AS total_margin_available
            FROM fdr_menu ${
              selectedBankId !== "null"
                ? `WHERE fdr_menu.bank_id = '${selectedBankId}'`
                : ""
            }`;

      let conditions = [];
      if (selectedBankId !== "null") {
        conditions.push(`d.bank_id = '${selectedBankId}'`);
      }
      let joins = "";

      // Query to get the total count of documents
      let countQuery = `
          SELECT COUNT(DISTINCT d.doc_id) as total
          FROM fdr_menu d
          ${joins}
          ${conditions.length ? " WHERE " + conditions.join(" AND ") : ""}`;

      let { rows: countResult } = await pool.query(countQuery);

      const totalDocuments = countResult[0].total;
      const totalPages = Math.ceil(totalDocuments / pageSize);

      // Main query with pagination
      let query = `
        ${baseQuery}
        GROUP BY
          d.doc_id
        ${orderByClause}
        LIMIT ${pageSize}
        OFFSET ${offset}
      `;
      console.log(query);
      // Execute the main query
      let { rows: documents } = await pool.query(query);
      let { rows: aggregatedAmountRow } = await pool.query(rowSummary);
      return res.json({
        status: 1,
        msg: "Success",
        payload: {
          documents,
          totalPages,
          currentPage: page,
          aggregatedAmountRow,
        },
      });
    } catch (err) {
      console.error("Error fetching filtered documents:", err);
      return res.json({ status: 0, msg: "Internal Server Error" });
    }
  };

  saveFdrData = async (req, res) => {
    try {
      const inputs = req.body;
      const bank_id = inputs && inputs.bank_id ? inputs.bank_id : null;
      let token = req.session.token;

      const generateInsertQuery = (data) => {
        const keys = Object.keys(data);
        const nonEmptyKeys = keys.filter((key) => {
          const value = data[key];
          return (
            value !== undefined &&
            value !== null &&
            (Array.isArray(value)
              ? value.length > 0
              : typeof value === "string"
              ? value.trim() !== ""
              : true)
          );
        });

        nonEmptyKeys.push(
          "doc_uploaded_by",
          "doc_uploaded_at",
          "doc_uploaded_by_id"
        );

        data["doc_uploaded_by"] = token.user_name;
        data["doc_uploaded_by_id"] = token.user_id;
        data["doc_uploaded_at"] = getCurrentDateTime();
        const columns = nonEmptyKeys.join(", ");
        const valuesPlaceholder = nonEmptyKeys
          .map((_, i) => `$${i + 1}`)
          .join(", ");
        const values = nonEmptyKeys.map((key) => data[key]);
        const query = `INSERT INTO fdr_menu (${columns}) VALUES (${valuesPlaceholder}) RETURNING doc_id;`;

        return { query, values };
      };

      const { query, values } = generateInsertQuery(inputs);
      const { rows: data } = await pool.query(query, values);
      if (bank_id != null) {
        await pool.query(`
		    UPDATE bank_master
            SET bank_code_status = true
            WHERE doc_id = '${bank_id}'`);
      }

      res.send({
        status: 1,
        msg: "FDR data saved successfully!`",
        doc_id: data[0].doc_id,
      });
    } catch (error) {
      console.error("Error saving FDR data:", error);
      res.send({ status: 0, msg: "Something went wrong" });
    }
  };

  getAllClause = async (req, res) => {
    try {
      const query = `SELECT * FROM fdr_payout_clause ORDER BY clause_name`;
      const { rows: data } = await pool.query(query);
      res.send({
        status: 1,
        msg: "FDR data fetched successfully!",
        data: data,
      });
    } catch (error) {
      console.error("Error saving FDR data:", error);
      res.send({ status: 0, msg: "Something went wrong" });
    }
  };

  getAllRenewal = async (req, res) => {
    try {
      const query = `SELECT * FROM renewal_types ORDER BY id`;
      const { rows: data } = await pool.query(query);
      res.send({
        status: 1,
        msg: "success",
        data: data,
      });
    } catch (error) {
      console.error("Error saving FDR data:", error);
      res.send({ status: 0, msg: "Something went wrong" });
    }
  };

  getAllPurpose = async (req, res) => {
    try {
      const query = `SELECT * FROM purpose_types ORDER BY id`;
      const { rows: data } = await pool.query(query);
      res.send({
        status: 1,
        msg: "success",
        data: data,
      });
    } catch (error) {
      console.error("Error saving FDR data:", error);
      res.send({ status: 0, msg: "Something went wrong" });
    }
  };

  saveClause = async (req, res) => {
    const inputs = req.body;
    const clause_name = inputs?.clause_name || null;

    if (!clause_name) {
      return res.status(400).json({ message: "clause_name is required" });
    }

    const saveClauseQuery = `
    INSERT INTO fdr_payout_clause (clause_name)
    VALUES ($1)
    RETURNING *;`;

    try {
      const { rows } = await pool.query(saveClauseQuery, [clause_name]);
      res.send({
        status: 1,
        msg: "Clause saved successfully!",
        data: rows[0],
      });
    } catch (error) {
      console.error("Error saving clause:", error);
      res.send({
        status: 0,
        msg: "Something went wrong",
        data: null,
      });
    }
  };

  saveRenewal = async (req, res) => {
    const inputs = req.body;
    const renewal = inputs?.renewal || null;

    if (!renewal) {
      return res.status(400).json({ message: "renewal is required" });
    }

    const saveClauseQuery = `
      INSERT INTO renewal_types (renewal)
      VALUES ($1)
      RETURNING *;`;

    try {
      const { rows } = await pool.query(saveClauseQuery, [renewal]);
      res.send({
        status: 1,
        msg: "Clause saved successfully!",
        data: rows[0],
      });
    } catch (error) {
      console.error("Error saving clause:", error);
      res.send({
        status: 0,
        msg: "Something went wrong",
        data: null,
      });
    }
  };

  savePurpose = async (req, res) => {
    const inputs = req.body;
    const purpose = inputs?.purpose || null;

    if (!purpose) {
      return res.status(400).json({ message: "purpose is required" });
    }

    const saveClauseQuery = `
      INSERT INTO purpose_types (purpose)
      VALUES ($1)
      RETURNING *;`;

    try {
      const { rows } = await pool.query(saveClauseQuery, [purpose]);
      res.send({
        status: 1,
        msg: "success",
        data: rows[0],
      });
    } catch (error) {
      console.error("Error saving clause:", error);
      res.send({
        status: 0,
        msg: "Something went wrong",
        data: null,
      });
    }
  };

  deleteFdr = async (req, res) => {
    const { docIdToDelete, bank_id } = req.body;

    if (!docIdToDelete) {
      return res.status(400).json({ message: "Project ID is required" });
    }
    try {
      const deleteQuery = `DELETE FROM fdr_menu WHERE doc_id = $1`;
      await pool.query(deleteQuery, [docIdToDelete]);

      const { rows: checkForBanks } = await pool.query(
        `SELECT * FROM fdr_menu WHERE bank_id = $1 AND doc_id <> $2`,
        [bank_id, docIdToDelete]
      );

      if (checkForBanks.length === 0) {
        await pool.query(`
		    UPDATE bank_master
            SET bank_code_status = false
            WHERE doc_id = '${bank_id}'`);
      }

      res.json({ status: 1, msg: "Document deleted successfully!" });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ status: 0, msg: "Error while deleting document" });
    }
  };

  editFdr = async (req, res) => {
    try {
      let inputs = req.body;
      const preBankId = (inputs && inputs?.preBankId) || null;
      if (preBankId) delete inputs.preBankId;
      const docId = inputs && inputs.doc_id;
      delete inputs.doc_id;
      let token = req.session.token;
      if (!token) {
        return res.json({ status: 0, msg: "User not logged In" });
      }

      if (token.user_role === "3") {
        return res.send({
          status: 0,
          msg: "Access Denied: Insufficient Permissions.",
        });
      }

      const generateInsertQuery = (data) => {
        let query;
        const keys = Object.keys(data);
        data["doc_uploaded_by"] = token.user_name;
        data["doc_uploaded_by_id"] = token.user_id;
        data["doc_uploaded_at"] = getCurrentDateTime();

        const nonEmptyKeys = keys.filter((key) => {
          const value = data[key];
          return (
            value !== undefined &&
            value !== null &&
            (Array.isArray(value)
              ? value.length > 0
              : typeof value === "string"
              ? value.trim() !== ""
              : true)
          );
        });

        const condition = `doc_id = ${docId}`;
        const setClause = nonEmptyKeys
          .map((key, index) => `${key} = $${index + 1}`)
          .join(", ");
        const values = nonEmptyKeys.map((key) => data[key]);

        query = `UPDATE fdr_menu SET ${setClause} WHERE ${condition}`;

        return { query, values: values };
      };

      const { query: insertQuery, values: insertValues } =
        generateInsertQuery(inputs);

      await pool.query(insertQuery, insertValues);

      if (preBankId != null) {
        const { rows: checkIfBankExists } = await pool.query(
          `SELECT * FROM fdr_menu WHERE bank_id = $1`,
          [preBankId]
        );

        if (checkIfBankExists.length === 0) {
          await pool.query(`
		        UPDATE bank_master
            SET bank_code_status = false
            WHERE doc_id = '${preBankId}'`);
        }
      }

      res.send({ status: 1, msg: "Success" });
    } catch (error) {
      console.error(error);
      res.send({ status: 0, msg: "Internal Server Error" });
    }
  };
}

module.exports = new fdrController();
