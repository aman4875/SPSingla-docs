const { pool } = require("../helpers/database.helper.js");

const renderController = {};

renderController.renderNotFound = async (req, res) => {
	try {
		res.render("404.ejs");
	} catch (err) {
		console.log(err);
		res.send({ status: 0, msg: "Something Went Wrong" });
	}
};
renderController.renderForgotPassword = async (req, res) => {
	try {
		res.render("forget-password.ejs");
	} catch (err) {
		console.log(err);
		res.send({ status: 0, msg: "Something Went Wrong" });
	}
};

renderController.renderDashboard = async (req, res) => {
	try {
		let token = req.session.token;

		let siteQuery;
		if (token.user_role === "0") {
			siteQuery = `SELECT * FROM sites WHERE site_parent_id = 0`;
		} else {
			siteQuery = `
                SELECT s.*
                FROM sites s
                JOIN users_sites_junction usj ON s.site_id = usj.usj_site_id
                WHERE usj.usj_user_id = ${token.user_id} AND site_parent_id = 0
            `;
		}

		let { rows: sites } = await pool.query(siteQuery);
		res.render("dashboard.ejs", { token, sites });
	} catch (err) {
		console.log(err);
		res.send({ status: 0, msg: "Something Went Wrong" });
	}
};

renderController.renderDocuments = async (req, res) => {
	try {
		let token = req.session.token;
		let siteQuery, folderQuery;
		if (token.user_role === "0") {
			siteQuery = `SELECT * FROM sites WHERE site_parent_id = 0`;
			folderQuery = `
                SELECT s.*, sp.site_name as site_parent_name
                FROM sites s
                LEFT JOIN sites sp ON s.site_parent_id = sp.site_id
                WHERE s.site_parent_id != 0
                ORDER BY s.site_name`;
		} else {
			siteQuery = `
                SELECT s.*
                FROM sites s
                JOIN users_sites_junction usj ON s.site_id = usj.usj_site_id
                WHERE usj.usj_user_id = ${token.user_id} AND site_parent_id = 0
            `;
			folderQuery = `
                SELECT s.*, sp.site_name as site_parent_name
                FROM sites s
                JOIN users_sites_junction usj ON s.site_id = usj.usj_site_id
                LEFT JOIN sites sp ON s.site_parent_id = sp.site_id
                WHERE usj.usj_user_id = ${token.user_id} AND s.site_parent_id != 0
                ORDER BY s.site_name
            `;
		}

		const { rows: docPurpose } = await pool.query(`
			SELECT * FROM document_purpose ORDER BY id DESC
		`);

		let siteFromDb = await pool.query(siteQuery);
		let folderFromDb = await pool.query(folderQuery);
		let sites = siteFromDb.rows;
		let folders = folderFromDb.rows;

		res.render("documents.ejs", { token, sites, folders, docPurpose });
	} catch (err) {
		console.log(err);
		res.send({ status: 0, msg: "Something Went Wrong" });
	}
};

renderController.renderBulkImport = async (req, res) => {
	try {
		let token = req.session.token;
		if (token.user_role === "0") {
			siteQuery = `SELECT * FROM sites WHERE site_parent_id = 0`;
			folderQuery = `
				SELECT s.*, sp.site_name as site_parent_name
				FROM sites s
				LEFT JOIN sites sp ON s.site_parent_id = sp.site_id
				WHERE s.site_parent_id != 0
				ORDER BY s.site_name`;
		} else {
			siteQuery = `
				SELECT s.*
				FROM sites s
				JOIN users_sites_junction usj ON s.site_id = usj.usj_site_id
				WHERE usj.usj_user_id = ${token.user_id} AND site_parent_id = 0
			`;
			folderQuery = `
				SELECT s.*, sp.site_name as site_parent_name
				FROM sites s
				JOIN users_sites_junction usj ON s.site_id = usj.usj_site_id
				LEFT JOIN sites sp ON s.site_parent_id = sp.site_id
				WHERE usj.usj_user_id = ${token.user_id} AND s.site_parent_id != 0
				ORDER BY s.site_name
			`;
		}
		let siteFromDb = await pool.query(siteQuery);
		let folderFromDb = await pool.query(folderQuery);
		let sites = siteFromDb.rows;
		let folders = folderFromDb.rows;

		let config = {
			keyId: process.env.BUCKET_KEY,
			accessKey: process.env.BUCKET_SECRET,
			region: process.env.BUCKET_REGION,
			bucketName: process.env.BUCKET_NAME,
		};
		res.render("bulk-import.ejs", { token, sites, folders, config });
	} catch (err) {
		console.log(err);
		res.send({ status: 0, msg: "Something Went Wrong" });
	}
};

renderController.aiImport = async (req, res) => {
	try {
		let token = req.session.token;
		if (token.user_role === "0") {
			siteQuery = `SELECT * FROM sites WHERE site_parent_id = 0`;
			folderQuery = `
				SELECT s.*, sp.site_name as site_parent_name
				FROM sites s
				LEFT JOIN sites sp ON s.site_parent_id = sp.site_id
				WHERE s.site_parent_id != 0
				ORDER BY s.site_name`;
		} else {
			siteQuery = `
				SELECT s.*
				FROM sites s
				JOIN users_sites_junction usj ON s.site_id = usj.usj_site_id
				WHERE usj.usj_user_id = ${token.user_id} AND site_parent_id = 0
			`;
			folderQuery = `
				SELECT s.*, sp.site_name as site_parent_name
				FROM sites s
				JOIN users_sites_junction usj ON s.site_id = usj.usj_site_id
				LEFT JOIN sites sp ON s.site_parent_id = sp.site_id
				WHERE usj.usj_user_id = ${token.user_id} AND s.site_parent_id != 0
				ORDER BY s.site_name
			`;
		}
		let siteFromDb = await pool.query(siteQuery);
		let folderFromDb = await pool.query(folderQuery);
		let sites = siteFromDb.rows;
		let folders = folderFromDb.rows;

		let config = {
			keyId: process.env.BUCKET_KEY,
			accessKey: process.env.BUCKET_SECRET,
			region: process.env.BUCKET_REGION,
			bucketName: process.env.BUCKET_NAME,
		};
		res.render("ai-import.ejs", { token, sites, folders, config });
	} catch (err) {
		console.log(err);
		res.send({ status: 0, msg: "Something Went Wrong" });
	}
};
renderController.renderSingleDocument = async (req, res) => {
	let token = req.session.token;
	try {
		let siteQuery, folderQuery, documentQuery, referencesQuery;
		let doc_id = Buffer.from(req.params.id, "base64").toString("utf-8");


		// Query to get document details
		documentQuery = `
			 SELECT d.*, string_agg(j.doc_junc_number, ', ') AS doc_replied_vide
            FROM documents d
            LEFT JOIN doc_reference_junction j ON j.doc_junc_replied = d.doc_number
			WHERE d.doc_id = '${doc_id}'
			GROUP BY d.doc_id,d.doc_number
		`;

		let documentData = await pool.query(documentQuery);

		documentData = documentData?.rows[0];
		if (!documentData) return res.render("404");

		if (token.user_role != 0) {
			let permissionQuery = `
                SELECT s.*
                FROM sites s
                JOIN users_sites_junction usj ON s.site_id = usj.usj_site_id
                WHERE usj.usj_user_id = ${token.user_id}
            `;
			let permittedSites = await pool.query(permissionQuery);
			permittedSites = permittedSites.rows;
			const isFolderPermitted = permittedSites.some((site) => site.site_name === documentData.doc_folder);
			if (!isFolderPermitted) {
				return res.render("404");
			}
		}

		if (token.user_role === "0") {
			siteQuery = `SELECT * FROM sites WHERE site_parent_id = 0`;
			folderQuery = `
                SELECT s.*, sp.site_name as site_parent_name
                FROM sites s
                LEFT JOIN sites sp ON s.site_parent_id = sp.site_id
                WHERE s.site_parent_id != 0
                ORDER BY s.site_name
            `;
		} else {
			siteQuery = `
                SELECT s.*
                FROM sites s
                JOIN users_sites_junction usj ON s.site_id = usj.usj_site_id
                WHERE usj.usj_user_id = ${token.user_id} AND site_parent_id = 0
            `;
			folderQuery = `
                SELECT s.*, sp.site_name as site_parent_name
                FROM sites s
                JOIN users_sites_junction usj ON s.site_id = usj.usj_site_id
                LEFT JOIN sites sp ON s.site_parent_id = sp.site_id
                WHERE usj.usj_user_id = ${token.user_id} AND s.site_parent_id != 0
                ORDER BY s.site_name
            `;
		}

		let siteFromDb = await pool.query(siteQuery);
		let folderFromDb = await pool.query(folderQuery);
		let sites = siteFromDb.rows;
		let folders = folderFromDb.rows;

		if (documentData.doc_status == "DRAFTED") {
			res.render("create-document.ejs", { token, sites, folders, documentData });
		} else if (documentData.doc_status == "INSERTED") {
			res.render("edit-document.ejs", { token, sites, folders, documentData });
		} else {
			let { rows: docHistory } = await pool.query(`SELECT * FROM doc_history_junction WHERE dhj_doc_number = $1`, [documentData.doc_number]);
			let { rows: docAttachments } = await pool.query(`SELECT * FROM doc_attachment_junction WHERE daj_doc_number = $1`, [documentData.doc_number]);

			res.render("view-document.ejs", { token, sites, folders, documentData, docHistory, docAttachments });
		}
	} catch (error) {
		console.error(error);
		res.send("Internal Server Error");
	}
};

renderController.renderUsers = async (req, res) => {
	let token = req.session.token;
	try {
		let query = `SELECT * FROM users WHERE user_role != 0`;
		let users = await pool.query(query);
		users = users.rows;
		res.render("users.ejs", { token, users });
	} catch (err) {
		console.log(err);
		res.send({ status: 0, msg: "Something Went Wrong" });
	}
};

renderController.renderSites = async (req, res) => {
	let token = req.session.token;
	try {
		let query = `SELECT * FROM sites ORDER BY site_id ASC;`;
		let permissionsQuery = `
        SELECT users_sites_junction.*, users.user_name
        FROM users_sites_junction
        LEFT JOIN users ON users_sites_junction.usj_user_id = users.user_id;`;
		let usersQuery = `SELECT user_id,user_name FROM users WHERE user_role != 0`;
		let { rows: sites } = await pool.query(query);
		let { rows: permissions } = await pool.query(permissionsQuery);
		let { rows: users } = await pool.query(usersQuery);
		res.render("sites.ejs", { token, sites, permissions, users });
	} catch (err) {
		console.log(err);
		res.send({ status: 0, msg: "Something Went Wrong" });
	}
};

renderController.editDoc = async (req, res) => {
	let token = req.session.token;
	try {
		let siteQuery, folderQuery, documentQuery, referencesQuery;
		let doc_id = Buffer.from(req.params.id, "base64").toString("utf-8");

		// Query to get document details
		documentQuery = `
			 SELECT d.*, string_agg(j.doc_junc_number, ', ') AS doc_replied_vide
            FROM documents d
            LEFT JOIN doc_reference_junction j ON j.doc_junc_replied = d.doc_number
			WHERE d.doc_id = '${doc_id}'
			GROUP BY d.doc_id,d.doc_number
		`;

		let documentData = await pool.query(documentQuery);

		documentData = documentData?.rows[0];
		if (!documentData) return res.render("404");

		if (token.user_role != 0) {
			let permissionQuery = `
                SELECT s.*
                FROM sites s
                JOIN users_sites_junction usj ON s.site_id = usj.usj_site_id
                WHERE usj.usj_user_id = ${token.user_id}
            `;
			let permittedSites = await pool.query(permissionQuery);
			permittedSites = permittedSites.rows;
			const isFolderPermitted = permittedSites.some((site) => site.site_name === documentData.doc_folder);
			if (!isFolderPermitted) {
				return res.render("404");
			}
		}

		if (token.user_role === "0") {
			siteQuery = `SELECT * FROM sites WHERE site_parent_id = 0`;
			folderQuery = `
                SELECT s.*, sp.site_name as site_parent_name
                FROM sites s
                LEFT JOIN sites sp ON s.site_parent_id = sp.site_id
                WHERE s.site_parent_id != 0
                ORDER BY s.site_name
            `;
		} else {
			siteQuery = `
                SELECT s.*
                FROM sites s
                JOIN users_sites_junction usj ON s.site_id = usj.usj_site_id
                WHERE usj.usj_user_id = ${token.user_id} AND site_parent_id = 0
            `;
			folderQuery = `
                SELECT s.*, sp.site_name as site_parent_name
                FROM sites s
                JOIN users_sites_junction usj ON s.site_id = usj.usj_site_id
                LEFT JOIN sites sp ON s.site_parent_id = sp.site_id
                WHERE usj.usj_user_id = ${token.user_id} AND s.site_parent_id != 0
                ORDER BY s.site_name
            `;
		}

		let siteFromDb = await pool.query(siteQuery);
		let folderFromDb = await pool.query(folderQuery);
		let sites = siteFromDb.rows;
		let folders = folderFromDb.rows;
		const { rows: docPurpose } = await pool.query(`
			SELECT * FROM document_purpose ORDER BY id DESC
		`);

		if (documentData.doc_status == "DRAFTED") {
			res.render("create-document.ejs", { token, sites, folders, documentData, docPurpose });
		} else if (documentData.doc_status == "INSERTED") {
			res.render("edit-document.ejs", { token, sites, folders, documentData, docPurpose });
		} else {
			let { rows: docHistory } = await pool.query(`SELECT * FROM doc_history_junction WHERE dhj_doc_number = $1`, [documentData.doc_number]);
			let { rows: docAttachments } = await pool.query(`SELECT * FROM doc_attachment_junction WHERE daj_doc_number = $1`, [documentData.doc_number]);
			res.render("edit-document.ejs", { token, sites, folders, documentData, docHistory, docAttachments, docPurpose });
		}
	} catch (error) {
		console.error(error);
		res.send("Internal Server Error");
	}
};

renderController.editProject = async (req, res) => {
	let token = req.session.token;
	try {
		let doc_id = Buffer.from(req.params.id, "base64").toString("utf-8");
		const query = `
        SELECT 
            d.*, 
            COALESCE(json_agg(
                jsonb_build_object(
                    'project_pdf_link', pa.project_pdf_link, 
                    'project_pdf_name', pa.project_pdf_name, 
                    'doc_id', pa.doc_id,
                    'attachment_upload_date', pa.created_at
                )
            ) FILTER (WHERE pa.project_id IS NOT NULL), '[]') AS attachments
        FROM projects_master AS d
        LEFT JOIN project_attachments AS pa ON d.doc_id = pa.project_id
        WHERE d.doc_id = $1
        GROUP BY d.doc_id;
    `;
		let sitesQuery = `SELECT * FROM sites WHERE site_parent_id = 0`;
		let { rows: sites } = await pool.query(sitesQuery);
		const { rows } = await pool.query(query, [doc_id]);
		const projectData = rows[0]
		return res.render("project-master/edit-project.ejs", { token, projectData, sites });
	} catch (error) {
		console.error(error);
		return res.send("Internal Server Error");
	}
};


renderController.editBG = async (req, res) => {
	let token = req.session.token;
	try {
		let doc_id = Buffer.from(req.params.id, "base64").toString("utf-8");
		const query = `
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
							'doc_id', pa.doc_id,
							'attachment_upload_date', pa.created_at
						)
					)
					FROM bg_attachments AS pa
					WHERE pa.project_id = d.doc_id), '[]'
				) AS attachments
			FROM 
				doc_manage_bg AS d
			LEFT JOIN 
				projects_master AS pm
			ON 
				d.project_code = pm.doc_code
			WHERE d.doc_id = $1	
				`;

		const { rows: beneficiaryNames } = await pool.query(`
					SELECT * FROM beneficiary_names ORDER BY id DESC
				`);
		const { rows: applicantNames } = await pool.query(`
					SELECT * FROM applicant_names ORDER BY id DESC
				`);
		let { rows: types } = await pool.query(
			`SELECT * FROM contract_types ORDER BY id DESC`
		)

		let { rows: bankName } = await pool.query(
			`SELECT * FROM bank_master ORDER BY doc_id DESC`
		)
		const { rows: banks } = await pool.query(`SELECT * FROM bank_master`);

		const { rows } = await pool.query(query, [doc_id]);
		const manageBgData = rows[0]
		const bank_id = manageBgData.bank_id
		const total_margin_available = `
			SELECT
				SUM(COALESCE(doc_margin_available, 0)) AS total_margin_available
			FROM fdr_menu
			WHERE bank_id = $1
		`;
		const {rows:total_margin} = await pool.query(total_margin_available,[bank_id])
		const dynamic_total_margin = total_margin[0].total_margin_available

		return res.render("manage-bg/edit-bg.ejs", { token, manageBgData, beneficiaryNames, applicantNames, types, bankName, banks,dynamic_total_margin });
	} catch (error) {
		console.error(error);
		return res.send("Internal Server Error");
	}
};

renderController.renderCreateDocument = async (req, res) => {
	let token = req.session.token;

	try {
		let siteQuery, folderQuery;
		if (token.user_role === "0") {
			siteQuery = `SELECT * FROM sites WHERE site_parent_id = 0`;
			folderQuery = `
                SELECT s.*, sp.site_name as site_parent_name
                FROM sites s
                LEFT JOIN sites sp ON s.site_parent_id = sp.site_id
                WHERE s.site_parent_id != 0
                ORDER BY s.site_name`;
		} else {
			siteQuery = `
                SELECT s.*
                FROM sites s
                JOIN users_sites_junction usj ON s.site_id = usj.usj_site_id
                WHERE usj.usj_user_id = ${token.user_id} AND site_parent_id = 0
            `;
			folderQuery = `
                SELECT s.*, sp.site_name as site_parent_name
                FROM sites s
                JOIN users_sites_junction usj ON s.site_id = usj.usj_site_id
                LEFT JOIN sites sp ON s.site_parent_id = sp.site_id
                WHERE usj.usj_user_id = ${token.user_id} AND s.site_parent_id != 0
                ORDER BY s.site_name
            `;
		}

		let siteFromDb = await pool.query(siteQuery);
		let folderFromDb = await pool.query(folderQuery);
		let sites = siteFromDb.rows;
		let folders = folderFromDb.rows;
		let documentData = [];
		let { rows: docPurpose } = await pool.query(`SELECT * From document_purpose`)

		res.render("create-document.ejs", { token, sites, folders, documentData, docPurpose });
	} catch (error) {
		console.error(error);
		res.status(500).send("Internal Server Error");
	}
};

renderController.renderProjectMaster = async (req, res) => {

	let token = req.session.token;
	res.render("project-master/project-master", { token });
}

renderController.renderCreateProjectMaster = async (req, res) => {
	let token = req.session.token;
	let query = `SELECT * FROM sites WHERE site_parent_id = 0`;
	let { rows: sites } = await pool.query(query);
	res.render("project-master/create-project", { token, sites });
}

renderController.renderCreateBg = async (req, res) => {
	let token = req.session.token;
	let docAttachments = [];
	let projectData = {}

	let { rows: projects } = await pool.query(
		`SELECT doc_id, doc_code, doc_work_name FROM projects_master ORDER BY doc_id DESC`
	);
	let { rows: types } = await pool.query(
		`SELECT * FROM contract_types ORDER BY id DESC`
	)
	let { rows: bankName } = await pool.query(
		`SELECT * FROM bank_master ORDER BY doc_id DESC`
	)

	let { rows: beneficiaryNames } = await pool.query(
		`SELECT * FROM beneficiary_names ORDER BY id DESC`
	)
	let { rows: applicantNames } = await pool.query(
		`SELECT * FROM applicant_names ORDER BY id DESC;`
	)
	const { rows: banks } = await pool.query(`SELECT * FROM bank_master`);

	res.render("manage-bg/create-manage-bg", {
		token,
		docAttachments,
		projects,
		projectData,
		types,
		bankName,
		beneficiaryNames,
		applicantNames,
		banks
	});
}

renderController.renderManageBg = async (req, res) => {
	let token = req.session.token;

	let { rows: projects } = await pool.query(
		`SELECT doc_id, doc_code, doc_work_name FROM projects_master ORDER BY doc_id DESC`
	);
	const { rows: beneficiaryNames } = await pool.query(`
		SELECT * FROM beneficiary_names ORDER BY id DESC
	`);
	const { rows: applicantNames } = await pool.query(`
		SELECT * FROM applicant_names ORDER BY id DESC
	`);
	let { rows: types } = await pool.query(
		`SELECT * FROM contract_types ORDER BY id DESC`
	)
	const { rows: banks } = await pool.query(`SELECT * FROM bank_master`);

	res.render("manage-bg/manage-bg", { token, projects, applicantNames, beneficiaryNames, types, banks });
}
renderController.settings = async (req, res) => {
	let token = req.session.token;

	try {

		let { rows: settingValues } = await pool.query(`SELECT * FROM admin_settings ORDER BY id ASC`);
		let doc_lock_date = settingValues[0]

		return res.render("settings/settings", { token, doc_lock_date: doc_lock_date });
	} catch (err) {
		console.log(err);
		return res.send({ status: 0, msg: "Something Went Wrong" });
	}
};

renderController.renderBankMaster = async (req, res) => {
	let token = req.session.token;

	try {

		return res.render("bank-master/bank-master", { token });
	} catch (err) {
		console.log(err);
		return res.send({ status: 0, msg: "Something Went Wrong" });
	}
};

renderController.renderFdr = async (req, res) => {
	let token = req.session.token;
	const bankQuery = `SELECT * FROM bank_master`;
	const { rows: banks } = await pool.query(bankQuery);
	try {
		return res.render("Fdr/Fdr", { token, banks });
	} catch (err) {
		console.log(err);
		return res.send({ status: 0, msg: "Something Went Wrong" });
	}
};

renderController.renderAddFdr = async (req, res) => {
	let token = req.session.token;
	const query = `SELECT * FROM bank_master`;
	const { rows: banks } = await pool.query(query);
	console.log("🚀 ~ renderController.renderAddFdr= ~ banks:", banks)
	const payoutClause = `SELECT * FROM fdr_payout_clause`;
	const renewalQuery = `SELECT * FROM renewal_types`
	const purposeQuery = `SELECT * FROM purpose_types`
	try {
		const { rows: payoutClauseData } = await pool.query(payoutClause);
		const {rows:renewalTypes} = await pool.query(renewalQuery)
		const {rows:purposeTypes} = await pool.query(purposeQuery)
		
		return res.render("Fdr/add-fdr", { token, banks, payoutClauseData, renewalTypes, purposeTypes });
	} catch (err) {
		console.log(err);
		return res.send({ status: 0, msg: "Something Went Wrong" });
	}
};

renderController.renderEditFdr = async (req, res) => {
	let token = req.session.token;
	try {
		let doc_id = Buffer.from(req.params.id, "base64").toString("utf-8");
		let query = `SELECT * FROM fdr_menu WHERE doc_id = $1`;
		const bankQuery = `SELECT * FROM bank_master`;
		const payoutClause = `SELECT * FROM fdr_payout_clause`;
		const renewalQuery = `SELECT * FROM renewal_types`
		const purposeQuery = `SELECT * FROM purpose_types`
		const { rows: banks } = await pool.query(bankQuery);
		const { rows: payoutClauseData } = await pool.query(payoutClause);
		const {rows:data} = await pool.query(query, [doc_id])
		const {rows:renewalTypes} = await pool.query(renewalQuery)
		const {rows:purposeTypes} = await pool.query(purposeQuery)
		const fdrData = data[0]

		return res.render("Fdr/edit-fdr", { token, fdrData, banks, payoutClauseData, renewalTypes,purposeTypes  })

	} catch (error) {
		console.log("🚀 ~ renderController.renderEditFdr= ~ error:", error)
		return res.send({ status: 0, msg: "Something Went Wrong" });
	}
}

module.exports = renderController;
