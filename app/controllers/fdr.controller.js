const { pool } = require("../helpers/database.helper.js");

const fdrController = {};

fdrController.getAllFdrData = async (req, res) => {
  try {
    let inputs = req.body;
    let token = req.session.token;
    const page = inputs.page || 1;
    const pageSize = inputs.limit || 10;
    const offset = (page - 1) * pageSize;
    let orderByClause = "";
    let baseQuery = `SELECT * FROM fdr_menu d`;
    let conditions = [];
    let joins = "";

    // Query to get the total count of documents
    let countQuery = `
		SELECT COUNT(DISTINCT d.doc_id) as total
		FROM fdr_menu d
		${joins}
		${conditions.length ? " WHERE " + conditions.join(" AND ") : ""}
	  `;

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

    // Execute the main query
    let { rows: documents } = await pool.query(query);
    return res.json({
      status: 1,
      msg: "Success",
      payload: {
        documents,
        totalPages,
        currentPage: page,
      },
    });
  } catch (err) {
    console.error("Error fetching filtered documents:", err);
    return res.json({ status: 0, msg: "Internal Server Error" });
  }
};

fdrController.saveFdrData = async (req, res) => {
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

module.exports = fdrController;
