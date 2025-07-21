const { pool } = require("../helpers/database.helper.js");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");
const AWS = require("aws-sdk");
const path = require("path");
const getCurrentDateTime = require("../utils/getCurrentDateTime.js");

// AWS Config
AWS.config.update({
  accessKeyId: process.env.BUCKET_KEY,
  secretAccessKey: process.env.BUCKET_SECRET,
  region: process.env.BUCKET_REGION,
});

// Initializing S3
const s3 = new AWS.S3();

const documentController = {};

documentController.generateDocumentNumber = async (req, res) => {
  try {
    let inputs = req.query;
    let token = req.session.token;
    if (token.user_role == "3") {
      return res.send({
        status: 0,
        msg: "Access Denie Insufficient Permissions.",
      });
    }
    if (!inputs.site_id) {
      return res.send({ status: 0, msg: "Invalid Site Id" });
    }

    let dataFromDb = await pool.query(
      `SELECT * FROM sites WHERE site_id = ${inputs.folder_id}`
    );

    if (dataFromDb.rows.length == 0) {
      return res.send({ status: 0, msg: "Site record not found" });
    }
    res.send({ status: 1, msg: "Success", payload: dataFromDb.rows[0] });
  } catch (error) {
    console.error(error);
    res.send({ status: 0, msg: "Internal Server Error" });
  }
};

documentController.getDocumentReference = async (req, res) => {
  try {
    let inputs = req.query;
    let token = req.session.token;
    if (token.user_role == "3") {
      return res.send({
        status: 0,
        msg: "Access Denie Insufficient Permissions.",
      });
    }
    if (!inputs.query) {
      return res.send({ status: 0, msg: "Invalid Query" });
    }

    let referenceQuery =
      "SELECT doc_number FROM documents WHERE doc_number ILIKE $1";
    let dataFromDb = await pool.query(referenceQuery, [`%${inputs.query}%`]);
    let referenceNumbers = dataFromDb.rows.map((row) => row.doc_number);
    res.send({ status: 1, msg: "Success", payload: referenceNumbers });
  } catch (error) {
    console.error(error);
    res.send({ status: 0, msg: "Internal Server Error" });
  }
};

documentController.saveDraft = async (req, res) => {
  try {
    let inputs = req.body;
    let token = req.session.token;

    if (token.user_role == "3") {
      return res.send({
        status: 0,
        msg: "Access Denied Insufficient Permissions.",
      });
    }

    // getting site id
    let { rows: siteId } = await pool.query(
      `SELECT site_id FROM sites WHERE site_name = $1`,
      [inputs.doc_site]
    );

    // getting folder id
    let { rows: folderId } = await pool.query(
      `SELECT site_id FROM sites WHERE site_name = $1`,
      [inputs.doc_folder]
    );

    // UPDATING REFERNCES
    if (inputs.doc_reference) {
      let references = Array.isArray(inputs.doc_reference)
        ? inputs.doc_reference
        : [inputs.doc_reference];
      references = references.filter((reference) => reference.trim() !== "");

      if (references.length > 0) {
        // Delete existing references for the document
        const deleteQuery = `DELETE FROM doc_reference_junction WHERE doc_junc_number = $1`;
        await pool.query(deleteQuery, [inputs.doc_number]);

        // Insert new references with the current document number as the replied value
        const valuesString = references
          .map((_, i) => `($1, $${i + 2})`)
          .join(", ");
        const referenceValues = [
          inputs.doc_number,
          ...references.map((ref) => ref.trim()),
        ];
        const refQuery = `INSERT INTO doc_reference_junction (doc_junc_number, doc_junc_replied) VALUES ${valuesString}`;
        await pool.query(refQuery, referenceValues);
      }
    }

    const generateInsertQuery = (data) => {
      delete data.doc_file;
      if (inputs.doc_reference && Array.isArray(inputs.doc_reference)) {
        inputs.doc_reference = inputs.doc_reference.join(",");
      }
      data["doc_uploaded_by"] = token.user_name;
      data["doc_uploaded_by_id"] = token.user_id;
      data["doc_uploaded_at"] = moment().format("MM/DD/YYYY");
      data["doc_status"] = "DRAFTED";

      const keys = Object.keys(data);
      const columns = keys.join(", ");
      const values = keys.map((_, i) => `$${i + 1}`).join(", ");
      const updateValues = keys
        .map((key, i) => `${key} = EXCLUDED.${key}`)
        .filter((key) => key !== "doc_number") // Exclude `doc_number` from update
        .join(", ");

      const query = `INSERT INTO documents (${columns}) VALUES (${values}) ON CONFLICT (doc_number) DO UPDATE SET ${updateValues};`;
      return { query, values: Object.values(data) };
    };

    const { query, values } = generateInsertQuery(inputs);
    await pool.query(query, values);
    let selectQuery = `SELECT COUNT(*) FROM documents WHERE doc_number = '${inputs.doc_number}'`;
    let selectResult = await pool.query(selectQuery);
    selectResult = selectResult?.rows[0]?.count;

    if (selectResult == 0 && inputs.doc_type == "OUTGOING") {
      let updateSiteRecordQuery = `
            UPDATE sites
            SET site_record_value = site_record_value + 1
            WHERE site_name = '${inputs.doc_folder}';
        `;
      await pool.query(updateSiteRecordQuery);
    }

    // ADDING HISTORY
    await pool.query(
      `INSERT INTO doc_history_junction (dhj_doc_number, dhj_history_type, dhj_timestamp,dhj_history_blame,dhj_history_blame_user) VALUES ($1,$2,$3,$4,$5)`,
      [
        inputs.doc_number,
        "DRAFTED",
        moment().format("MM/DD/YYYY HH:mm:ss"),
        token.user_id,
        token.user_name,
      ]
    );

    res.send({ status: 1, msg: "Success", payload: inputs.doc_number });
  } catch (error) {
    console.error(error);
    res.send({ status: 0, msg: "Internal Server Error" });
  }
};

documentController.editDocument = async (req, res) => {
  try {
    let inputs = req.body;

    // Check if the new doc_number already exists
    const { rows: doc } = await pool.query(
      `SELECT * FROM documents WHERE doc_number = $1`,
      [inputs.new_doc_number]
    );

    if (doc.length > 0) {
      return res.send({ status: 0, msg: "Letter Number Already Exists" });
    }

    let token = req.session.token;
    if (token.user_role === "3") {
      return res.send({
        status: 0,
        msg: "Access Denied: Insufficient Permissions.",
      });
    }

    // getting site id
    let { rows: siteId } = await pool.query(
      `SELECT site_id FROM sites WHERE site_name = $1`,
      [inputs.doc_site]
    );

    // getting folder id
    let { rows: folderId } = await pool.query(
      `SELECT site_id FROM sites WHERE site_name = $1`,
      [inputs.doc_folder]
    );

    // Store the new doc_number
    let doc_data = JSON.parse(JSON.stringify(req.body));
    let newDocNumber = inputs.new_doc_number || inputs.doc_number;

    const generateInsertQuery = (data) => {
      delete data.doc_file;
      delete data.new_doc_number;
      delete data.doc_ID;
      if (inputs.doc_reference && Array.isArray(inputs.doc_reference)) {
        inputs.doc_reference = inputs.doc_reference.join(",");
      }
      data["doc_uploaded_by"] = token.user_name;
      data["doc_uploaded_by_id"] = token.user_id;
      data["doc_uploaded_at"] = moment().format("MM/DD/YYYY");

      if (inputs.insertedFlag) {
        data["doc_status"] = "UPLOADED";
      }
      delete data.insertedFlag;

      const keys = Object.keys(data);
      const columns = keys.join(", ");
      const values = keys.map((_, i) => `$${i + 1}`).join(", ");
      const updateValues = keys
        .map((key) => `${key} = EXCLUDED.${key}`)
        .join(", ");
      Object.values(data);
      if (inputs.doc_reference && Array.isArray(inputs.doc_reference)) {
        inputs.doc_reference = inputs.doc_reference
          .map((item) =>
            typeof item === "string" &&
            item.startsWith('"') &&
            item.endsWith('"')
              ? JSON.parse(item)
              : item
          )
          .join(",");
      }

      data["doc_reference"] = inputs.doc_reference;
      let query;
      const condition = `doc_id = ${doc_data.doc_ID}`;
      const setClause = Object.keys(data)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(", ");

      query = `UPDATE documents SET ${setClause} WHERE ${condition}`;

      return { query, values: Object.values(data) };
    };
    const { query: insertQuery, values: insertValues } = generateInsertQuery({
      ...inputs,
      doc_number: newDocNumber,
    });
    await pool.query(insertQuery, insertValues);

    //Delete the old record with the old doc_number
    if (doc_data.new_doc_number) {
      // const deleteQuery = `DELETE FROM documents WHERE doc_number = $1`;
      // await pool.query(deleteQuery, [doc_data.doc_number]);

      //Updating refs in doc_attachment_junction
      await pool.query(`
				UPDATE doc_attachment_junction
			    SET daj_doc_number = '${newDocNumber}'
				WHERE daj_doc_number = '${doc_data.doc_number}'`);
      // updateing refs in doc_metadata
      await pool.query(`
				UPDATE doc_metadata
			    SET dm_id = '${newDocNumber}'
				WHERE dm_id = '${doc_data.doc_number}'`);
      // updateing refs in doc_history_junction
      await pool.query(`
				UPDATE doc_history_junction
			    SET dhj_doc_number = '${newDocNumber}'
				WHERE dhj_doc_number = '${doc_data.doc_number}'`);
      // updateing refs in crons
      await pool.query(`
				UPDATE crons
			    SET cron_feed = '${newDocNumber}'
				WHERE cron_feed = '${doc_data.doc_number}'`);
      // updateing refs in doc_replied_vide
      const UpdateRepliedVide = `
				UPDATE documents
				SET doc_replied_vide = regexp_replace(
				doc_replied_vide,
				'(^|,)(${doc_data.doc_number})(,|$)',
				'\\1${newDocNumber}\\3',
				'g'
				)
				WHERE doc_replied_vide ~ '(^|,)(${doc_data.doc_number})(,|$)';
				`;

      await pool.query(UpdateRepliedVide);

      // updateing refs in doc_reference
      const updateRefs = `
				UPDATE documents
				SET doc_reference = regexp_replace(
				doc_reference,
				'(^|,)(${doc_data.doc_number})(,|$)',
				'\\1${newDocNumber}\\3',
				'g'
				)
				WHERE doc_reference ~ '(^|,)(${doc_data.doc_number})(,|$)';
				`;

      await pool.query(updateRefs);
    }

    if (inputs.doc_reference) {
      let references = Array.isArray(inputs.doc_reference)
        ? inputs.doc_reference
        : [inputs.doc_reference];
      references = references.filter((reference) => reference.trim() !== "");

      if (references.length > 0) {
        // Update doc_reference_junction with the new doc_number
        const deleteReferencesQuery = `DELETE FROM doc_reference_junction WHERE doc_junc_number = $1`;
        await pool.query(deleteReferencesQuery, [inputs.doc_number]);

        const valuesString = references
          .map((_, i) => `($1, $${i + 2})`)
          .join(", ");
        const referenceValues = [
          newDocNumber,
          ...references.map((ref) => ref.trim()),
        ];
        const insertReferencesQuery = `INSERT INTO doc_reference_junction (doc_junc_number, doc_junc_replied) VALUES ${valuesString}`;
        await pool.query(insertReferencesQuery, referenceValues);
      }
    }

    await pool.query(
      `
			INSERT INTO folder_stats (doc_folder_name, doc_folder_id, last_updated) 
			VALUES ($1, $2, $3) 
			ON CONFLICT (doc_folder_name) 
			DO UPDATE SET
			  last_updated = EXCLUDED.last_updated,
			  doc_folder_id = EXCLUDED.doc_folder_id;
			`,
      [inputs.doc_folder, folderId[0].site_id, getCurrentDateTime()]
    );

    res.send({ status: 1, msg: "Success", payload: newDocNumber });
  } catch (error) {
    console.error(error);
    res.send({ status: 0, msg: "Internal Server Error" });
  }
};

documentController.editProject = async (req, res) => {
  try {
    let { newFormDataEntries, doc_id } = req.body;
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

    const { rows: doc } = await pool.query(
      `SELECT * FROM documents WHERE doc_number = $1`,
      [newFormDataEntries.new_doc_number]
    );

    if (doc.length > 0) {
      return res.send({ status: 0, msg: "Doc Number Already Exists" });
    }

    const generateInsertQuery = (data) => {
      let query;
      const keys = Object.keys(data);
      data["doc_uploaded_by"] = token.user_name;
      data["doc_uploaded_by_id"] = token.user_id;
      data["doc_uploaded_at"] = moment().format("MM/DD/YYYY");

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

      const condition = `doc_id = ${doc_id}`;
      const setClause = nonEmptyKeys
        .map((key, index) => `${key} = $${index + 1}`)
        .join(", ");
      const values = nonEmptyKeys.map((key) => data[key]);

      query = `UPDATE projects_master SET ${setClause} WHERE ${condition}`;

      return { query, values: values };
    };

    const { query: insertQuery, values: insertValues } = generateInsertQuery({
      ...newFormDataEntries,
    });

    await pool.query(insertQuery, insertValues);

    res.send({ status: 1, msg: "Success" });
  } catch (error) {
    console.error(error);
    res.send({ status: 0, msg: "Internal Server Error" });
  }
};

documentController.editBG = async (req, res) => {
  try {
    let { newFormDataEntries, doc_id, bank_id } = req.body;
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

      // Add additional fields
      data["doc_uploaded_by"] = token.user_name;
      data["doc_uploaded_by_id"] = token.user_id;
      data["doc_uploaded_at"] = moment().format("MM/DD/YYYY");

      // Convert empty strings/arrays to null
      Object.keys(data).forEach((key) => {
        const value = data[key];
        if (
          value === undefined ||
          value === null ||
          (typeof value === "string" && value.trim() === "") ||
          (Array.isArray(value) && value.length === 0)
        ) {
          data[key] = null;
        }
      });

      const keys = Object.keys(data);
      const nonEmptyKeys = keys.filter((key) => data[key] !== undefined); // now empty strings/arrays are already null

      const condition = `doc_id = ${doc_id}`;
      const setClause = nonEmptyKeys
        .map((key, index) => `${key} = $${index + 1}`)
        .join(", ");

      const values = nonEmptyKeys.map((key) => data[key]);

      query = `UPDATE doc_manage_bg SET ${setClause} WHERE ${condition}`;

      return { query, values };
    };

    const { query: insertQuery, values: insertValues } = generateInsertQuery({
      ...newFormDataEntries,
    });

    await pool.query(insertQuery, insertValues);
    if (bank_id != null) {
      await pool.query(`
		    UPDATE bank_master
            SET bank_code_status = true
            WHERE doc_id = '${bank_id}'`);
    }

    res.send({ status: 1, msg: "Success" });
  } catch (error) {
    console.error(error);
    res.send({ status: 0, msg: "Internal Server Error" });
  }
};

documentController.createDocument = async (req, res) => {
  try {
    let inputs = req.body;

    let { rows: folderId } = await pool.query(
      `SELECT site_id FROM sites WHERE site_name = $1`,
      [inputs.doc_folder]
    );
    let token = req.session.token;
    if (token.user_role == "3") {
      return res.send({
        status: 0,
        msg: "Access Denied Insufficient Permissions.",
      });
    }

    if (!req.file) {
      return res.send({ status: 0, msg: "No file uploaded" });
    }

    inputs.doc_number = inputs.doc_number.replace(/\s/g, "");

    if (inputs.doc_reference && Array.isArray(inputs.doc_reference)) {
      inputs.doc_reference = inputs.doc_reference.join(",");
    }

    const fileName = uuidv4();

    const s3Params = {
      Bucket: process.env.BUCKET_NAME,
      Key: `docs/${fileName}.pdf`,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    const s3Response = await s3.upload(s3Params).promise();
    const pdfLocation = s3Response.Location;

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
        "doc_status",
        "doc_pdf_link",
        "doc_uploaded_by_id",
        "doc_source"
      );
      const currentDate = moment().format("MM/DD/YYYY");
      data["doc_uploaded_by"] = token.user_name;
      data["doc_uploaded_by_id"] = token.user_id;
      data["doc_uploaded_at"] = currentDate;
      data["doc_status"] = "UPLOADED";
      data["doc_pdf_link"] = pdfLocation;
      data["doc_source"] = "FORM";
      const columns = nonEmptyKeys.join(", ");
      const valuesPlaceholder = nonEmptyKeys
        .map((_, i) => `$${i + 1}`)
        .join(", ");
      const values = nonEmptyKeys.map((key) => data[key]);
      const updateValues = nonEmptyKeys
        .map((key, i) => {
          if (key !== "id") {
            return `${key} = EXCLUDED.${key}`;
          }
          return null;
        })
        .filter((value) => value !== null)
        .join(", ");

      const query = `INSERT INTO documents (${columns}) VALUES (${valuesPlaceholder}) ON CONFLICT (doc_number) DO UPDATE SET ${updateValues};`;
      return { query, values };
    };

    const { query, values } = generateInsertQuery(inputs);

    // Check if the document already exists
    let selectQuery = `SELECT COUNT(*) FROM documents WHERE doc_number = $1`;
    let selectResult = await pool.query(selectQuery, [inputs.doc_number]);
    let count = selectResult?.rows[0]?.count;

    // Execute the insert/update query
    await pool.query(query, values);

    // Maintaining site record to auto-generate document numbers
    if (count == 0 && inputs.doc_type == "OUTGOING") {
      const updateSiteRecordQuery = `
                UPDATE sites
                SET site_record_value = site_record_value + 1
                WHERE site_name = $1
            `;
      await pool.query(updateSiteRecordQuery, [inputs.doc_folder]);
    }

    // UPDATING REFERNCES
    if (inputs.doc_reference) {
      let references = Array.isArray(inputs.doc_reference)
        ? inputs.doc_reference
        : [inputs.doc_reference];
      references = references.filter((reference) => reference.trim() !== "");

      if (references.length > 0) {
        // Delete existing references for the document
        const deleteQuery = `DELETE FROM doc_reference_junction WHERE doc_junc_number = $1`;
        await pool.query(deleteQuery, [inputs.doc_number]);

        // Insert new references with the current document number as the replied value
        const valuesString = references
          .map((_, i) => `($1, $${i + 2})`)
          .join(", ");
        const referenceValues = [
          inputs.doc_number,
          ...references.map((ref) => ref.trim()),
        ];
        const refQuery = `INSERT INTO doc_reference_junction (doc_junc_number, doc_junc_replied) VALUES ${valuesString}`;
        await pool.query(refQuery, referenceValues);
      }
    }

    // updating folder stats
    await pool.query(
      `
			INSERT INTO folder_stats (doc_folder_name, doc_folder_id, last_updated) 
			VALUES ($1, $2, $3) 
			ON CONFLICT (doc_folder_name) 
			DO UPDATE SET
			  last_updated = EXCLUDED.last_updated,
			  doc_folder_id = EXCLUDED.doc_folder_id;
			`,
      [inputs.doc_folder, folderId[0].site_id, getCurrentDateTime()]
    );

    // ADDING HISTORY
    await pool.query(
      `INSERT INTO doc_history_junction (dhj_doc_number, dhj_history_type, dhj_timestamp,dhj_history_blame,dhj_history_blame_user) VALUES ($1,$2,$3,$4,$5)`,
      [
        inputs.doc_number,
        "UPDATED",
        moment().format("MM/DD/YYYY HH:mm:ss"),
        token.user_id,
        token.user_name,
      ]
    );
    let { rows: newDoc } = await pool.query(
      `SELECT *  FROM documents  WHERE doc_number = $1`,
      [inputs.doc_number]
    );
    res.send({ status: 1, msg: "Success", payload: newDoc[0].doc_id ?? null });
  } catch (error) {
    res.send({ status: 0, msg: "Something Went Wrong" });
    console.error(error);
  }
};
documentController.createProject = async (req, res) => {
  try {
    let inputs = req.body;
    const pdfName = req.body.doc_pdf_name;
    let token = req.session.token;

    if (token.user_role == "3") {
      return res.send({
        status: 0,
        msg: "Access Denied Insufficient Permissions.",
      });
    }

    let pdfLocation = "";

    if (req.file && req.file) {
      const fileName = uuidv4();

      const s3Params = {
        Bucket: process.env.BUCKET_NAME,
        Key: `docs/${fileName}.pdf`,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };
      const s3Response = await s3.upload(s3Params).promise();
      pdfLocation = s3Response.Location;
    }

    const generateInsertQuery = (data) => {
      delete inputs.doc_pdf_name;
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
        "doc_uploaded_by_id",
        "doc_status"
      );
      data["doc_uploaded_by"] = token.user_name;
      data["doc_uploaded_by_id"] = token.user_id;
      data["doc_uploaded_at"] = getCurrentDateTime();
      data["doc_status"] = "UPLOADED";
      const columns = nonEmptyKeys.join(", ");
      const valuesPlaceholder = nonEmptyKeys
        .map((_, i) => `$${i + 1}`)
        .join(", ");
      const values = nonEmptyKeys.map((key) => data[key]);
      const updateValues = nonEmptyKeys
        .map((key, i) => {
          if (key !== "id") {
            return `${key} = EXCLUDED.${key}`;
          }
          return null;
        })
        .filter((value) => value !== null)
        .join(", ");

      const query = `INSERT INTO projects_master (${columns}) VALUES (${valuesPlaceholder}) RETURNING doc_id;`;

      return { query, values };
    };

    const { query, values } = generateInsertQuery(inputs);
    const createProject = await pool.query(query, values);
    const createdDocId = createProject.rows[0].doc_id;

    if (req.file && req.file) {
      const fileName = uuidv4();

      const s3Params = {
        Bucket: process.env.BUCKET_NAME,
        Key: `docs/${fileName}.pdf`,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };
      const s3Response = await s3.upload(s3Params).promise();
      pdfLocation = s3Response.Location;
      await pool.query(
        `INSERT INTO project_attachments (
				project_pdf_name, 
				project_pdf_link,
				project_code,
				project_id,
				attchment_uploaded_by_id,
				created_at
				) 
				VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          pdfName,
          pdfLocation,
          inputs.doc_code,
          createdDocId,
          token.user_id,
          getCurrentDateTime(),
        ]
      );
    }
    if (createProject.rowCount > 0) {
      return res.send({ status: 1, msg: "Success" });
    }

    return res.send({ status: 0, msg: "Something Went Wrong" });
  } catch (error) {
    console.error(error);
    return res.send({ status: 0, msg: "Something Went Wrong" });
  }
};

documentController.createBG = async (req, res) => {
  try {
    let inputs = req.body;

    const pdfName = req.body.doc_pdf_name;
    let token = req.session.token;

    if (token.user_role == "3") {
      return res.send({
        status: 0,
        msg: "Access Denied Insufficient Permissions.",
      });
    }

    let pdfLocation = "";

    if (req.file && req.file) {
      const fileName = uuidv4();

      const s3Params = {
        Bucket: process.env.BUCKET_NAME,
        Key: `docs/${fileName}.pdf`,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };
      const s3Response = await s3.upload(s3Params).promise();
      pdfLocation = s3Response.Location;
    }

    const generateInsertQuery = (data) => {
      delete inputs.doc_pdf_name;
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
        "doc_uploaded_by_id",
        "doc_status"
      );
      data["doc_uploaded_by"] = token.user_name;
      data["doc_uploaded_by_id"] = token.user_id;
      data["doc_uploaded_at"] = getCurrentDateTime();
      data["doc_status"] = "UPLOADED";
      const columns = nonEmptyKeys.join(", ");
      const valuesPlaceholder = nonEmptyKeys
        .map((_, i) => `$${i + 1}`)
        .join(", ");
      const values = nonEmptyKeys.map((key) => data[key]);
      const updateValues = nonEmptyKeys
        .map((key, i) => {
          if (key !== "id") {
            return `${key} = EXCLUDED.${key}`;
          }
          return null;
        })
        .filter((value) => value !== null)
        .join(", ");

      const query = `INSERT INTO doc_manage_bg (${columns}) VALUES (${valuesPlaceholder}) RETURNING doc_id;`;

      return { query, values };
    };

    const { query, values } = generateInsertQuery(inputs);
    const createProject = await pool.query(query, values);
    const createdDocId = createProject.rows[0].doc_id;

    if (req.file && req.file) {
      const fileName = uuidv4();

      const s3Params = {
        Bucket: process.env.BUCKET_NAME,
        Key: `docs/${fileName}.pdf`,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };
      const s3Response = await s3.upload(s3Params).promise();
      pdfLocation = s3Response.Location;
      await pool.query(
        `INSERT INTO bg_attachments (
				project_pdf_name, 
				project_pdf_link,
				project_code,
				project_id,
				attchment_uploaded_by_id,
				created_at
				) 
				VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          pdfName,
          pdfLocation,
          inputs.project_code,
          createdDocId,
          token.user_id,
          getCurrentDateTime(),
        ]
      );
    }

    if (inputs.master_project_id) {
      await pool.query(`
		    UPDATE projects_master
            SET doc_bg_selected = true
            WHERE doc_id = '${inputs.master_project_id}'`);
    }

    if (createProject.rowCount > 0) {
      return res.send({ status: 1, msg: "Success" });
    }

    return res.send({ status: 0, msg: "Something Went Wrong" });
  } catch (error) {
    console.error(error);
    return res.send({ status: 0, msg: "Something Went Wrong" });
  }
};

documentController.getFilteredDocuments = async (req, res) => {
	try {
		let inputs = req.body;
		let token = req.session.token;
		const userRole = token.user_role;
		const userId = token.user_id;
		const page = inputs.page || 1;
		const pageSize = inputs.limit || 10;
		const offset = (page - 1) * pageSize;

    let { rows } = await pool.query(
      `SELECT setting_value FROM admin_settings WHERE setting_name = $1`,
      ["doc_lock_date"]
    );

    let baseQuery = `
					SELECT 
						d.*,
						(
							SELECT JSON_AGG(
									JSON_BUILD_OBJECT(
										'ref', ref,
										'exists', EXISTS (
											SELECT 1 
											FROM documents AS sub_docs
											WHERE sub_docs.doc_number = ref
										),
										'pdfLink', (
											SELECT sub_docs.doc_pdf_link
											FROM documents AS sub_docs
											WHERE sub_docs.doc_number = ref
											LIMIT 1
										)
									)
								)
              FROM UNNEST(
              ARRAY(
                SELECT TRIM(ref)
                FROM UNNEST(STRING_TO_ARRAY(d.doc_reference, ',')) AS ref
              )
            ) AS ref
						) AS references,
						(
							SELECT JSON_AGG(
									JSON_BUILD_OBJECT(
										'ref', ref,
										'exists', EXISTS (
											SELECT 1 
											FROM documents AS sub_docs
											WHERE sub_docs.doc_number = ref
										),
										'pdfLink', (
											SELECT sub_docs.doc_pdf_link
											FROM documents AS sub_docs
											WHERE sub_docs.doc_number = ref
											LIMIT 1
										)
									)
								)
							FROM UNNEST(
								ARRAY(
									SELECT REGEXP_REPLACE(TRIM(ref), '\s*/\s*', '/', 'g') 
									FROM UNNEST(STRING_TO_ARRAY(d.doc_replied_vide, ',')) AS ref
								)
							) AS ref
						) AS repliedvide,
						 (
							CASE
								WHEN EXISTS (
									SELECT 1
									FROM documents AS sub_docs
									WHERE 
										sub_docs.doc_number IN (
											SELECT REGEXP_REPLACE(TRIM(ref), '\s+', '', 'g')
											FROM UNNEST(STRING_TO_ARRAY(d.doc_replied_vide, ',')) AS ref
										)
										AND (
											(sub_docs.doc_type = 'OUTGOING' AND d.doc_type = 'INCOMING') OR
											(sub_docs.doc_type = 'INCOMING' AND d.doc_type = 'OUTGOING')
										)
										AND TO_DATE(d.doc_created_at, 'DD/MM/YYYY') <= TO_DATE(sub_docs.doc_created_at, 'DD/MM/YYYY')
								)
								THEN TRUE
								ELSE FALSE
							END
						) AS highlightrow,
						(
							CASE
							    WHEN TO_DATE(d.doc_created_at, 'DD/MM/YYYY') < TO_DATE('${rows[0]?.setting_value}', 'DD/MM/YYYY')
								THEN FALSE
								ELSE TRUE
							END
						) AS actionActive
						 FROM documents d
						 `
		let conditions = [`(
        d.doc_confidential = FALSE
        OR (
            d.doc_confidential = TRUE
            AND (
                ${userRole} = 0
                OR d.doc_uploaded_by_id = ${userId}
            )
        )
    )`];
		let joins = "";
		let folderQuery = ''
		// Handle folder permissions based on user role
		if (token.user_role == "0") {
			// Admin role
			folderQuery = `
          SELECT s.*, sp.site_name as site_parent_name
          FROM sites s
          LEFT JOIN sites sp ON s.site_parent_id = sp.site_id
          WHERE s.site_parent_id != 0
          ORDER BY s.site_name`;
    } else {
      // Non-admin role with permissions
      folderQuery = `
          SELECT s.*, sp.site_name as site_parent_name
          FROM sites s
          JOIN users_sites_junction as usj ON s.site_id = usj.usj_site_id
          LEFT JOIN sites as sp ON s.site_parent_id = sp.site_id
          WHERE usj.usj_user_id = ${token.user_id} AND s.site_parent_id != 0
          ORDER BY s.site_name`;

      let { rows: folderPermission } = await pool.query(folderQuery);
      const permission = folderPermission
        .map((fp) => `'${fp.site_name.replace(/'/g, "''")}'`)
        .join(", ");

      if (permission.length > 0) {
        joins += ` JOIN sites s ON d.doc_folder = s.site_name`;
        baseQuery += joins;
        conditions.push(`s.site_name IN (${permission})`);
      } else if (permission.length == 0 && token.user_role != "0") {
        return res.json({
          status: 1,
          msg: "Success",
          payload: { documents: [], totalPages: 0, currentPage: page },
        });
      }
    }

    // Handle filters from inputs.activeFilter
    for (const [field, filter] of Object.entries(inputs.activeFilter)) {
      if (filter.type === "multiple") {
        const values = filter.value
          .map((val) => `'${val.replace(/'/g, "''")}'`)
          .join(", ");
        values && conditions.push(`d.${field} IN (${values})`);
      } else if (filter.type === "text") {
        filter?.value &&
          conditions.push(
            `LOWER(d.${field}) LIKE LOWER('%${filter.value.replace(
              /'/g,
              "''"
            )}%')`
          );
      } else if (filter.type === "keyword") {
        baseQuery += `
				JOIN doc_metadata dm 
				ON d.doc_number = dm.dm_id 
				AND (
				 LOWER(dm.dm_id) LIKE LOWER('%${filter.value}%')
				  OR d.doc_storage_location = '${filter.value}'
				  OR d.doc_from = '${filter.value}'
				  OR d.doc_to = '${filter.value}'
				  OR LOWER(dm.dm_ocr_content) LIKE LOWER('%${filter.value}%')
				  )
			  `;
      }
    }

    // Handle sorting
    let orderByClause = "";
    if (inputs.sort && Object.keys(inputs.sort).length > 0) {
      const sortFields = Object.entries(inputs.sort).map(
        ([field, direction]) => {
          const dir = direction.toLowerCase() === "asc" ? "ASC" : "DESC";

          // adding storing for date
          if (field === "doc_created_at") {
            return `CASE
						WHEN d.doc_created_at IS NULL OR d.doc_created_at = '' THEN 
						CASE
						WHEN '${dir}' = 'ASC' THEN NULL
						ELSE TO_DATE('01/01/1900', 'DD/MM/YYYY')
						END
					    WHEN NOT d.doc_created_at ~ '^\\d{2}/\\d{2}/\\d{4}$' THEN NULL 
						ELSE TO_DATE(d.doc_created_at, 'DD/MM/YYYY')
						END ${dir} NULLS LAST`;
          }

          return `d.${field} ${dir}`;
        }
      );
      orderByClause = `ORDER BY ${sortFields.join(", ")}`;
    } else {
      orderByClause = `ORDER BY d.doc_id DESC`;
    }
    // Build the WHERE clause
    if (conditions.length > 0) {
      baseQuery += " WHERE " + conditions.join(" AND ");
    }

    // Query to get the total count of documents
    let countQuery = `
		SELECT COUNT(DISTINCT d.doc_number) as total
		FROM documents d
		LEFT JOIN doc_reference_junction j ON j.doc_junc_replied = d.doc_number
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
          d.doc_id,
          d.doc_number,
          d.doc_site,
          d.doc_folder,
          d.doc_type,
          d.doc_status,
          d.doc_purpose,
          d.doc_subject,
          d.doc_from,
          d.doc_to,
          d.doc_storage_location,
          d.doc_reference,
          d.doc_created_at
        ${orderByClause}
        LIMIT ${pageSize}
        OFFSET ${offset}
      `;

		// Execute the main query
		let { rows: documents } = await pool.query(query);
		res.json({
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
		res.json({ status: 0, msg: "Internal Server Error" });
	}
};

documentController.getFilteredProjects = async (req, res) => {
  try {
    let inputs = req.body;
    let token = req.session.token;
    const page = inputs.page || 1;
    const pageSize = inputs.limit || 10;
    const offset = (page - 1) * pageSize;
    let orderByClause = "";
    let baseQuery = `
		SELECT    d.*,
				COALESCE(Json_agg( Jsonb_build_object( 
				'project_pdf_link', pa.project_pdf_link, 
				'project_pdf_name', pa.project_pdf_name, 
				'doc_id', pa.doc_id ) ) filter (WHERE pa.project_id IS NOT NULL), '[]') AS attachments
		FROM      projects_master                                                                                                                                                                                      AS d
		LEFT JOIN project_attachments                                                                                                                                                                                  AS pa
		ON        d.doc_id = pa.project_id`;
    let conditions = [];
    let joins = "";

    // Handle filters from inputs.activeFilter
    for (const [field, filter] of Object.entries(inputs.activeFilter)) {
      if (filter.type === "multiple") {
        const values = filter.value
          .map((val) => `'${val.replace(/'/g, "''")}'`)
          .join(", ");
        values && conditions.push(`d.${field} IN (${values})`);
      } else if (filter.type === "text") {
        filter?.value &&
          conditions.push(
            `LOWER(d.${field}) LIKE LOWER('%${filter.value.replace(
              /'/g,
              "''"
            )}%')`
          );
      } else if (filter.type === "boolean") {
        filter?.value &&
          conditions.push(
            `d.${field} =  ${
              filter.value.replace(/'/g, "''") === "Yes" ? "TRUE" : "FALSE"
            }`
          );
      } else if (filter.type === "date") {
        filter?.value &&
          conditions.push(
            `LOWER(d.${field}) LIKE LOWER('%${filter.value.replace(
              /'/g,
              "''"
            )}%')`
          );
      } else if (filter.type === "number") {
        filter?.value &&
          conditions.push(
            `d.${field}::TEXT LIKE '${filter.value.replace(/'/g, "''")}%'`
          );
      } else if (filter.type === "keyword") {
        conditions.push(`
				LOWER(d.doc_code::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(d.doc_work_name::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(d.doc_department::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(d.doc_financial_date::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(d.doc_agreement_no::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(d.doc_agreement_date::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(d.doc_completion_date::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(d.doc_bal_mobilisation_amount::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(d.doc_retention_amount::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(d.doc_dlp_period::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(d.doc_revised_date::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(d.doc_dlp_ending::TEXT) LIKE LOWER('%${filter.value}%') 
				`);
      }
    }

    // // Handle sorting
    if (inputs.sort && Object.keys(inputs.sort).length > 0) {
      const sortFields = Object.entries(inputs.sort).map(
        ([field, direction]) => {
          const dir = direction.toLowerCase() === "asc" ? "ASC" : "DESC";

          // adding storing for date
          if (inputs.isDate === true) {
            return `CASE
						WHEN d.${field} IS NULL OR d.${field} = '' THEN 
						CASE
						WHEN '${dir}' = 'ASC' THEN NULL
						ELSE TO_DATE('01/01/1900', 'DD/MM/YYYY')
						END
					    WHEN NOT d.${field} ~ '^\\d{2}/\\d{2}/\\d{4}$' THEN NULL 
						ELSE TO_DATE(d.${field}, 'DD/MM/YYYY')
						END ${dir} NULLS LAST`;
          }

          return `d.${field} ${dir}`;
        }
      );
      orderByClause = `ORDER BY ${sortFields.join(", ")}`;
    } else {
      orderByClause = `ORDER BY d.doc_id DESC`;
    }
    // // Build the WHERE clause
    if (conditions.length > 0) {
      baseQuery += " WHERE " + conditions.join(" AND ");
    }

    // Query to get the total count of documents
    let countQuery = `
		SELECT COUNT(DISTINCT d.doc_id) as total
		FROM projects_master d
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

documentController.getProjectsBg = async (req, res) => {
  try {
    let inputs = req.body;
    let projectID = req.query;

    let token = req.session.token;
    const page = inputs.page || 1;
    const pageSize = inputs.limit || 10;
    const offset = (page - 1) * pageSize;
    let orderByClause = "";
    let baseQuery = `
			SELECT
				d.*,
				pm.doc_code,
				pm.doc_work_name,
				pm.doc_department,
				pm.doc_financial_date,
				pm.doc_agreement_no,
				pm.doc_agreement_date,
				pm.doc_completion_date,
				pm.doc_awarded,
				pm.doc_dlp_period,
				COALESCE(
					(SELECT Json_agg(
						Jsonb_build_object(
							'project_pdf_link', pa.project_pdf_link,
							'project_pdf_name', pa.project_pdf_name,
							'doc_id', pa.doc_id
						)
					)
					FROM bg_attachments AS pa
					WHERE pa.project_id = d.doc_id), '[]'
				) AS attachments,
			    CASE
					WHEN NULLIF(d.doc_claim_date, '') IS NOT NULL
					AND TO_DATE(d.doc_claim_date, 'DD/MM/YYYY') >= CURRENT_DATE
					THEN d.doc_bg_amount
					ELSE 0
				END AS future_bg_amount,
				CASE
				WHEN TO_DATE(d.doc_claim_date, 'DD/MM/YYYY')
					BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '45 days'
				THEN true
				ELSE false
				END AS claim_pass,
       (
        SELECT COALESCE(SUM(f.doc_margin_available), 0)
        FROM fdr_menu AS f
        WHERE f.bank_id = d.bank_id
        ) AS dynamic_total_margin
			FROM
				doc_manage_bg AS d
			LEFT JOIN
				projects_master AS pm
			ON
				d.master_project_id = pm.doc_id`;

    let conditions = [];
    let joins = "";

    if (
      projectID.project &&
      projectID.project !== "null" &&
      projectID.project.trim() !== ""
    ) {
      conditions.push(`d.master_project_id = '${projectID.project}'`);
    }
    // Handle filters from inputs.activeFilter
    for (const [field, filter] of Object.entries(inputs?.activeFilter)) {
      if (filter.type === "multiple") {
        const values = filter.value
          .map((val) => `'${val.replace(/'/g, "''")}'`)
          .join(", ");
        values && conditions.push(`d.${field} IN (${values})`);
      } else if (filter.type === "text" && filter.dataTable == null) {
        filter?.value &&
          conditions.push(
            `LOWER(d.${field}) LIKE LOWER('%${filter.value.replace(
              /'/g,
              "''"
            )}%')`
          );
      } else if (
        filter.type === "text" &&
        filter.dataTable === "projects_master" &&
        filter.dataTable != null
      ) {
        filter?.value &&
          conditions.push(
            `LOWER(pm.${field}) LIKE LOWER('%${filter.value.replace(
              /'/g,
              "''"
            )}%')`
          );
      } else if (
        filter.type === "boolean" &&
        filter.dataTable === "projects_master" &&
        filter.dataTable != null
      ) {
        filter?.value &&
          conditions.push(
            `pm.${field} =  ${
              filter.value.replace(/'/g, "''") === "Yes" ? "TRUE" : "FALSE"
            }`
          );
      } else if (filter.type === "date" && filter.dataTable == null) {
        filter?.value &&
          conditions.push(
            `LOWER(d.${field}) LIKE LOWER('%${filter.value.replace(
              /'/g,
              "''"
            )}%')`
          );
      } else if (
        filter.type === "date" &&
        filter.dataTable === "projects_master" &&
        filter.dataTable != null
      ) {
        filter?.value &&
          conditions.push(
            `LOWER(pm.${field}) LIKE LOWER('%${filter.value.replace(
              /'/g,
              "''"
            )}%')`
          );
      } else if (filter.type === "number" && filter.dataTable == null) {
        filter?.value &&
          conditions.push(
            `d.${field}::TEXT LIKE '${filter.value.replace(/'/g, "''")}%'`
          );
      } else if (
        filter.type === "number" &&
        filter.dataTable === "projects_master" &&
        filter.dataTable != null
      ) {
        filter?.value &&
          conditions.push(
            `pm.${field}::TEXT LIKE '${filter.value.replace(/'/g, "''")}%'`
          );
      } else if (filter.type === "keyword") {
        conditions.push(`
				LOWER(d.project_code::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(pm.doc_work_name::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(pm.doc_department::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(pm.doc_financial_date::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(pm.doc_agreement_no::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(pm.doc_agreement_date::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(pm.doc_completion_date::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(pm.doc_bal_mobilisation_amount::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(pm.doc_retention_amount::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(pm.doc_dlp_period::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(pm.doc_revised_date::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(pm.doc_dlp_ending::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(d.doc_type::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(d.doc_bank_name::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(d.doc_issuing_branch::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(d.doc_beneficiary_name::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(d.doc_bg_number::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(d.doc_applicant_name::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(d.doc_claim_date::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(d.doc_bg_amount::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(d.doc_expiry_date::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(d.doc_bg_cancelled_date::TEXT) LIKE LOWER('%${filter.value}%') OR
				LOWER(d.doc_issue_date::TEXT) LIKE LOWER('%${filter.value}%') 
				`);
      }
    }

    // Handle sorting
    const tableId = Object.keys(inputs.sort).find((val) => val === "dataTable");
    const tableValue = tableId ? inputs.sort[tableId] : null;

    if (tableId) {
      delete inputs.sort[tableId];
    }
    const TableAliases = tableValue === "projects_master" ? "pm" : "d";

    if (inputs.sort && Object.keys(inputs.sort).length > 0) {
      const sortFields = Object.entries(inputs.sort).map(
        ([field, direction]) => {
          const dir = direction.toLowerCase() === "asc" ? "ASC" : "DESC";

          // adding storing for date
          if (inputs.isDate === true) {
            return `CASE
						WHEN ${TableAliases}.${field} IS NULL OR d.${field} = '' THEN 
						CASE
						WHEN '${dir}' = 'ASC' THEN NULL
						ELSE TO_DATE('01/01/1900', 'DD/MM/YYYY')
						END
					    WHEN NOT ${TableAliases}.${field} ~ '^\\d{2}/\\d{2}/\\d{4}$' THEN NULL 
						ELSE TO_DATE(d.${field}, 'DD/MM/YYYY')
						END ${dir} NULLS LAST`;
          }

          return `${TableAliases}.${field} ${dir}`;
        }
      );
      orderByClause = `ORDER BY ${sortFields.join(", ")}`;
    } else {
      orderByClause = `ORDER BY d.doc_id DESC`;
    }

    // Build the WHERE clause
    if (conditions.length > 0) {
      baseQuery += " WHERE " + conditions.join(" AND ");
    }

    const subqueryConditions = conditions.map((cond) =>
      cond.replace(/\bd\./g, "d2.").replace(/\bpm\./g, "pm2.")
    );
    // total count of documents
    let countQuery = `
		SELECT 
		  d.*,
		  pm.doc_code, 
		  pm.doc_work_name,
		  pm.doc_department,
		  pm.doc_financial_date,
		  pm.doc_agreement_no,
		  pm.doc_agreement_date,
		  pm.doc_completion_date,
		  pm.doc_awarded,
		  pm.doc_dlp_period, 
			(
			SELECT COUNT(DISTINCT d2.doc_id) 
			FROM doc_manage_bg AS d2
			LEFT JOIN projects_master AS pm2 ON d2.master_project_id = pm2.doc_id
			${conditions.length ? "WHERE " + subqueryConditions.join(" AND ") : ""}
			) AS total_count
		FROM 
		  doc_manage_bg AS d
		LEFT JOIN 
		  projects_master AS pm ON d.master_project_id = pm.doc_id
		${conditions.length ? "WHERE " + conditions.join(" AND ") : ""}
	  `;

    let { rows: countResult } = await pool.query(countQuery);
    const totalDocuments = countResult[0]?.total_count;
    const totalPages = Math.ceil(totalDocuments / pageSize);

    // Main query with pagination
    let query = `
        ${baseQuery}
        ${orderByClause}
        LIMIT ${pageSize}
        OFFSET ${offset}`;

    if (
      Object.keys(inputs?.activeFilter).length > 0 ||
      projectID.project !== "null"
    ) {
      query = `
			WITH filtered_docs AS(
			${baseQuery}
			${orderByClause}
		),

		fetched_docs AS (
		  SELECT * FROM filtered_docs
		  ORDER BY doc_id DESC
		  LIMIT ${pageSize}
		  OFFSET ${offset}
		)

		SELECT
			Jsonb_build_object(
				'data', Jsonb_agg(fetched_docs),
				'total_bg_amount', COALESCE(
					(SELECT SUM(fd.future_bg_amount) FROM filtered_docs fd),
					0
				)
			) AS result
		FROM fetched_docs;`;
    }

    // Execute the main query
    let { rows: documents } = await pool.query(query);
    let totalBgAmount = null;
    let docs = documents;

    if (
      Object.keys(inputs?.activeFilter).length > 0 ||
      projectID.project !== "null"
    ) {
      docs = documents[0]?.result?.data;
      totalBgAmount = documents[0]?.result?.total_bg_amount;
    }

    return res.json({
      status: 1,
      msg: "Success",
      payload: {
        documents: docs,
        totalPages,
        currentPage: page,
        totalBgAmount,
      },
    });
  } catch (err) {
    console.error("Error fetching filtered documents:", err);
    return res.json({ status: 0, msg: "Internal Server Error" });
  }
};

documentController.uploadAttachment = async (req, res) => {
  try {
    let inputs = req.body;
    if (!req.file) {
      return res.send({ status: 0, msg: "No file uploaded" });
    }

    const fileExtension = path.extname(req.file.originalname);
    const fileName = uuidv4();

    const s3Params = {
      Bucket: process.env.BUCKET_NAME,
      Key: `attachments / ${fileName}${fileExtension} `,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    const s3Response = await s3.upload(s3Params).promise();
    const attachmentLocation = s3Response.Location;
    let { rows: folderId } = await pool.query(
      `SELECT site_id FROM sites WHERE site_name = $1`,
      [inputs.doc_folder]
    );

    await pool.query(
      `
					INSERT INTO folder_stats(doc_folder_name, doc_folder_id, last_updated)
		VALUES($1, $2, $3) 
					ON CONFLICT(doc_folder_name) 
					DO UPDATE SET
		last_updated = EXCLUDED.last_updated,
			doc_folder_id = EXCLUDED.doc_folder_id;
		`,
      [inputs.doc_folder, folderId[0].site_id, getCurrentDateTime()]
    );

    await pool.query(
      `INSERT INTO doc_attachment_junction(daj_doc_number, daj_attachment_name, daj_attachment_link, daj_attachment_upload_date) VALUES($1, $2, $3, $4)`,
      [
        inputs.doc_number,
        inputs.doc_attachment,
        attachmentLocation,
        moment().format("DD/MM/YYYY"),
      ]
    );
    res.send({ status: 1, msg: "Attachment Uploaded" });
  } catch (err) {
    console.error("Error Uploading Attachments", err);
    res.json({ status: 0, msg: "Internal Server Error" });
  }
};

documentController.uploadProjectAttachments = async (req, res) => {
  try {
    let inputs = req.body;
    let token = req.session.token;

    if (!req.file) {
      return res.send({ status: 0, msg: "No file uploaded" });
    }

    const fileExtension = path.extname(req.file.originalname);
    const fileName = uuidv4();

    const s3Params = {
      Bucket: process.env.BUCKET_NAME,
      Key: `docs / ${fileName}${fileExtension} `,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    const s3Response = await s3.upload(s3Params).promise();
    const attachmentLocation = s3Response.Location;

    await pool.query(
      `INSERT INTO project_attachments(
			project_pdf_name,
			project_pdf_link,
			project_code,
			project_id,
			attchment_uploaded_by_id,
			created_at
		)
		VALUES($1, $2, $3, $4, $5, $6)`,
      [
        inputs.pdfFileName,
        attachmentLocation,
        inputs.doc_code,
        inputs.project_id,
        token.user_id,
        getCurrentDateTime(),
      ]
    );

    res.send({ status: 1, msg: "Attachment Uploaded" });
  } catch (err) {
    console.error("Error Uploading Attachments", err);
    res.json({ status: 0, msg: "Internal Server Error" });
  }
};

documentController.uploadBGAttachments = async (req, res) => {
  try {
    let inputs = req.body;
    let token = req.session.token;

    if (!req.file) {
      return res.send({ status: 0, msg: "No file uploaded" });
    }

    const fileExtension = path.extname(req.file.originalname);
    const fileName = uuidv4();

    const s3Params = {
      Bucket: process.env.BUCKET_NAME,
      Key: `docs / ${fileName}${fileExtension} `,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    const s3Response = await s3.upload(s3Params).promise();
    const attachmentLocation = s3Response.Location;

    await pool.query(
      `INSERT INTO bg_attachments(
			project_pdf_name,
			project_pdf_link,
			project_code,
			project_id,
			attchment_uploaded_by_id,
			created_at
		)
		VALUES($1, $2, $3, $4, $5, $6)`,
      [
        inputs.pdfFileName,
        attachmentLocation,
        inputs.project_code,
        inputs.project_id,
        token.user_id,
        getCurrentDateTime(),
      ]
    );

    res.send({ status: 1, msg: "Attachment Uploaded" });
  } catch (err) {
    console.error("Error Uploading Attachments", err);
    res.json({ status: 0, msg: "Internal Server Error" });
  }
};

documentController.recordDocumentViewed = async (req, res) => {
  try {
    let inputs = req.body;
    let token = req.session.token;
    await pool.query(
      `INSERT INTO doc_history_junction(dhj_doc_number, dhj_history_type, dhj_timestamp, dhj_history_blame, dhj_history_blame_user) VALUES($1, $2, $3, $4, $5)`,
      [
        inputs.doc_number,
        "VIEWED",
        moment().format("MM/DD/YYYY HH:mm:ss"),
        token.user_id,
        token.user_name,
      ]
    );
  } catch (err) {
    console.error("Error Uploading Attachments", err);
    res.json({ status: 0, msg: "Internal Server Error" });
  }
};

documentController.getFailedUploads = async (req, res) => {
  try {
    const inputs = req.body;
    const { user_id } = req.session.token;
    let { rows: files } = await pool.query(
      `SELECT * FROM failed_job_stats  WHERE user_id = $1`,
      [user_id]
    );

    if (!files.length) {
      return res.json({ status: 1, msg: null });
    }

    return res.json({ status: 1, msg: files });
  } catch (error) {
    return res.json({ status: 0, msg: "Internal Server Error" });
  }
};

documentController.clearFailedPdfs = async (req, res) => {
  try {
    const inputs = req.body;
    const { user_id } = req.session.token;
    let { rows: files } = await pool.query(
      `DELETE FROM failed_job_stats WHERE user_id = $1`,
      [user_id]
    );
    return res.json({ status: 1, msg: "success" });
  } catch (error) {
    return res.json({ status: 0, msg: "Internal Server Error" });
  }
};
documentController.getRepliedVide = async (req, res) => {
  try {
    const { folderId } = req.body;
    const { user_id } = req.session.token;

    if (!folderId) {
      return res.json({ status: 0, msg: "Invalid Folder ID" });
    }
    const { rows: isfolderIdExist } = await pool.query(
      `SELECT * FROM sites WHERE site_id = $1`,
      [folderId]
    );
    if (isfolderIdExist.length === 0) {
      return res.json({ status: 0, msg: "Invalid Folder ID" });
    }

    const { rows: data } = await pool.query(
      `
			UPDATE documents t1
			SET doc_replied_vide = (
			SELECT STRING_AGG(t2.doc_number, ',')
				FROM documents t2
				WHERE TRIM(t2.doc_site) = TRIM($1)-- Match strict doc_site after trimming spaces
				  AND TRIM(t1.doc_number) = ANY(
				SELECT TRIM(UNNEST(string_to_array(t2.doc_reference, ',')))-- Strict match for doc_number in doc_reference
		)
			)
			WHERE TRIM(t1.doc_site) = TRIM($1); --Ensure strict match for t1 doc_site
			`,
      [isfolderIdExist[0].site_name.trim()]
    );

    return res.json({ status: 1, msg: "success" });
  } catch (error) {
    console.log("🚀 ~ documentController.getRepliedVide= ~ error:", error);
    return res.json({ status: 0, msg: "Internal Server Error" });
  }
};

documentController.deleteDoc = async (req, res) => {
  const { docId } = req.body;
  const token = req.session.token;

  try {
    if (!token) {
      return res.json({ status: 0, msg: "User not logged In" });
    }
    const result = await pool.query(
      `DELETE FROM documents WHERE doc_id = ${docId} `
    );
    if (result.rowCount === 0) {
      return res.json({ status: 0, msg: "Document not found" });
    }
    return res.json({ status: 1, msg: "Document Deleted" });
  } catch (error) {
    console.log("🚀 ~ documentController.deleteDoc ~ error:", error);
    return res.json({ status: 0, msg: "Internal Server Error" });
  }
};

documentController.deleteProject = async (req, res) => {
  const { docId } = req.body;
  const token = req.session.token;

  try {
    if (!token) {
      return res.json({ status: 0, msg: "User not logged In" });
    }
    const result = await pool.query(
      `DELETE FROM projects_master WHERE doc_id = ${docId} `
    );
    if (result.rowCount === 0) {
      return res.json({ status: 0, msg: "Document not found" });
    }

    return res.json({ status: 1, msg: "Document Deleted" });
  } catch (error) {
    console.log("🚀 ~ documentController.deleteDoc ~ error:", error);
    return res.json({ status: 0, msg: "Internal Server Error" });
  }
};

documentController.deleteAttachment = async (req, res) => {
  const { docId } = req.body;
  const token = req.session.token;

  try {
    if (!token) {
      return res.json({ status: 0, msg: "User not logged In" });
    }
    const result = await pool.query(
      `DELETE FROM doc_attachment_junction WHERE id = $1`,
      [docId]
    );

    if (result.rowCount === 0) {
      return res.json({ status: 0, msg: "Document not found" });
    }

    return res.json({ status: 1, msg: "Document deleted successfully" });
  } catch (error) {
    return res.json({ status: 0, msg: "Internal Server Error" });
  }
};

documentController.deleteBG = async (req, res) => {
  const { docId, docCode, projectIdToDelete, bank_id } = req.body;

  const token = req?.session?.token;

  try {
    if (!token) {
      return res.json({ status: 0, msg: "User not logged In" });
    }

    const checkForDoc = await pool.query(
      `SELECT * FROM doc_manage_bg WHERE doc_id = $1`,
      [docId]
    );

    if (checkForDoc.rowCount === 0) {
      return res.json({ status: 0, msg: "Document not found" });
    }

    await pool.query(`DELETE FROM doc_manage_bg WHERE doc_id = ${docId} `);

    const removeFlag = await pool.query(
      `SELECT * FROM doc_manage_bg WHERE master_project_id = $1`,
      [projectIdToDelete]
    );

    const { rows: checkForBanks } = await pool.query(
      `
        SELECT doc_id FROM fdr_menu WHERE bank_id = $1
        UNION
        SELECT doc_id FROM doc_manage_bg WHERE bank_id = $1`,
      [bank_id]
    );

    if (checkForBanks.length === 0) {
      await pool.query(`
		    UPDATE bank_master
            SET bank_code_status = false
            WHERE doc_id = '${bank_id}'`);
    }

    if (removeFlag.rows.length === 0) {
      await pool.query(
        `UPDATE projects_master 
				 SET doc_bg_selected = false 
				 WHERE doc_id = $1`,
        [projectIdToDelete]
      );
    }

    return res.json({ status: 1, msg: "Document Deleted" });
  } catch (error) {
    console.log(error);
    return res.json({ status: 0, msg: "Internal Server Error" });
  }
};

documentController.deleteProjectPdf = async (req, res) => {
  const { docId } = req.query;
  const token = req?.session?.token;

  try {
    if (!token) {
      return res.json({ status: 0, msg: "User not logged In" });
    }
    const result = await pool.query(
      `DELETE FROM project_attachments WHERE doc_id = ${docId} `
    );
    if (result.rowCount === 0) {
      return res.json({ status: 0, msg: "Document not found" });
    }
    return res.json({ status: 1, msg: "Document Deleted" });
  } catch (error) {
    console.log("🚀 ~ documentController.deleteProjectPdf ~ error:", error);
    return res.json({ status: 0, msg: "Internal Server Error" });
  }
};

documentController.deleteBGPdf = async (req, res) => {
  const { docId } = req.query;
  const token = req?.session?.token;

  try {
    if (!token) {
      return res.json({ status: 0, msg: "User not logged In" });
    }
    const result = await pool.query(
      `DELETE FROM bg_attachments WHERE doc_id = ${docId} `
    );
    if (result.rowCount === 0) {
      return res.json({ status: 0, msg: "Document not found" });
    }
    return res.json({ status: 1, msg: "Document Deleted" });
  } catch (error) {
    console.log("🚀 ~ documentController.deleteProjectPdf ~ error:", error);
    return res.json({ status: 0, msg: "Internal Server Error" });
  }
};

documentController.getProjectById = async (req, res) => {
  const { projectId } = req.query;
  const token = req?.session?.token;

  try {
    if (!token) {
      return res.json({ status: 0, msg: "User not logged In" });
    }

    const { rows: project } = await pool.query(
      `SELECT * FROM projects_master WHERE doc_id = $1`,
      [parseInt(projectId)]
    );

    if (project.length === 0) {
      return res.json({ status: 0, msg: "Project not found" });
    }

    return res.json({ status: 1, msg: "success", project });
  } catch (error) {
    console.log("🚀 ~ documentController.deleteProjectPdf ~ error:", error);
    return res.json({ status: 0, msg: "Internal Server Error" });
  }
};

documentController.saveBeneficiary = async (req, res) => {
  const input = req.body;
  const token = req?.session?.token;

  try {
    if (!token) {
      return res.json({ status: 0, msg: "User not logged In" });
    }

    const { rowCount } = await pool.query(
      "SELECT 1 FROM beneficiary_names WHERE beneficiary_code = $1",
      [input.beneficiary_code]
    );

    if (rowCount > 0) {
      return res.json({ tatus: 0, msg: "Beneficiary already exists" });
    }

    await pool.query(
      "INSERT INTO beneficiary_names (beneficiary_code) VALUES ($1)",
      [input.beneficiary_code]
    );

    return res.json({ status: 1, msg: "success" });
  } catch (error) {
    console.error("Error saving beneficiary:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
documentController.saveType = async (req, res) => {
  const input = req.body;
  const token = req?.session?.token;

  try {
    if (!token) {
      return res.json({ status: 0, msg: "User not logged In" });
    }

    const { rowCount } = await pool.query(
      "SELECT 1 FROM contract_types WHERE type_name = $1",
      [input.type]
    );

    if (rowCount > 0) {
      return res.json({ tatus: 0, msg: "type already exists" });
    }

    await pool.query("INSERT INTO contract_types (type_name) VALUES ($1)", [
      input.type,
    ]);

    return res.json({ status: 1, msg: "success" });
  } catch (error) {
    console.error("Error saving beneficiary:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

documentController.saveApplicant = async (req, res) => {
  const input = req.body;
  const token = req?.session?.token;

  try {
    if (!token) {
      return res.json({ status: 0, msg: "User not logged In" });
    }

    const { rowCount } = await pool.query(
      "SELECT 1 FROM applicant_names WHERE applicant_name = $1",
      [input.applicant_name]
    );

    if (rowCount > 0) {
      return res.json({ status: 1, msg: "Applicant already exists" });
    }

    await pool.query(
      "INSERT INTO applicant_names (applicant_name) VALUES ($1)",
      [input.applicant_name]
    );

    res.json({ status: 1, msg: "Applicant saved successfully" });
  } catch (error) {
    console.error("Error saving applicant:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

documentController.getAllBeneficiary = async (req, res) => {
  try {
    const { rows: beneficiary } = await pool.query(`
		SELECT * FROM beneficiary_names ORDER BY id DESC
			`);

    res.json({ status: 1, msg: "success", payload: beneficiary });
  } catch (error) {
    console.error("Error saving applicant:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

documentController.getAllApplicantName = async (req, res) => {
  try {
    const { rows: beneficiary } = await pool.query(`
		SELECT * FROM applicant_names ORDER BY id DESC
			`);

    res.json({ status: 1, msg: "success", payload: beneficiary });
  } catch (error) {
    console.error("Error saving applicant:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

documentController.savePurpose = async (req, res) => {
  const input = req.body;
  const token = req?.session?.token;

  try {
    if (!token) {
      return res.json({ status: 0, msg: "User not logged In" });
    }

    const { rowCount } = await pool.query(
      "SELECT 1 FROM document_purpose WHERE dropdown_val = $1",
      [input.dropdown_val]
    );

    if (rowCount > 0) {
      return res.json({ status: 1, msg: "Applicant already exists" });
    }

    await pool.query(
      "INSERT INTO document_purpose (dropdown_val) VALUES ($1)",
      [input.dropdown_val]
    );

    res.json({ status: 1, msg: "Applicant saved successfully" });
  } catch (error) {
    console.error("Error saving applicant:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

documentController.getAllDocPurpose = async (req, res) => {
  try {
    const { rows: beneficiary } = await pool.query(`
		SELECT * FROM document_purpose ORDER BY id DESC
			`);

    res.json({ status: 1, msg: "success", payload: beneficiary });
  } catch (error) {
    console.error("Error saving applicant:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
documentController.getAllType = async (req, res) => {
  try {
    const { rows: types } = await pool.query(`
		SELECT * FROM contract_types ORDER BY id DESC
			`);

    res.json({ status: 1, msg: "success", payload: types });
  } catch (error) {
    console.error("Error saving applicant:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = documentController;
