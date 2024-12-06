const router = require("express").Router();
const AIController = require("../controllers/ai.controller");

router.post("/add-job", AIController.addNewJob);

module.exports = router;