let router = require("express").Router();
let renderRouter = require("./render.router.js");
let authRouter = require("./auth.router.js");
let documentRouter = require("./document.router.js");
let usersRouter = require("./users.router.js");
let sitesRouter = require("./sites.router.js");

router.use("/", renderRouter);
router.use("/auth", authRouter);
router.use("/docs", documentRouter);
router.use("/users", usersRouter);
router.use("/sites", sitesRouter);

router.use((req, res) => {
	res.render("404.ejs");
});
router.get("/ping", async (req, res) => {
  try {
    let { rows } = await pool.query(
      `SELECT * FROM users WHERE user_email = $1`,
      ["helpdesk@spsingla.com"]
    );
    console.log(rows);
    return res.send(rows);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).send("Internal Server Error");
  }
});
module.exports = router;
