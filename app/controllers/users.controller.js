const { pool } = require("../helpers/database.helper.js");
let userController = {};

userController.saveUser = async (req, res) => {
	try {
		const inputs = req.body;
		const query = `
        INSERT INTO users (user_name, user_email, user_password, user_role, user_status, bank_guarantee_status, FDR_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_email)
        DO UPDATE SET
          user_name = EXCLUDED.user_name,
          user_password = EXCLUDED.user_password,
          user_role = EXCLUDED.user_role,
          user_status = EXCLUDED.user_status,
          bank_guarantee_status = EXCLUDED.bank_guarantee_status,
		  FDR_status = EXCLUDED.FDR_status
		  `; 
		  

		let updatedUser = await pool.query(query, [
			inputs.user_name,
			inputs.user_email,
			inputs.user_password,
			inputs.user_role,
			inputs.user_status,
			inputs.bank_guarantee_status,
			inputs.FDR_status
		]);

		if (updatedUser.rowCount > 0) { // Check if rows were affected
			res.send({ status: 1, msg: "User saved successfully" });
		} else {
			res.send({ status: 0, msg: "Something went wrong" });
		}
	} catch (error) {
		console.error("Error saving user:", error);
		res.send({ status: 0, msg: "Something went wrong" });
	}
};

module.exports = userController;

