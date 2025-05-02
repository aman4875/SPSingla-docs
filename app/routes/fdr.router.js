const router = require("express").Router();
const fdrController = require("../controllers/fdr.controller.js");

router.post("/save-site", fdrController.getAllFdrData);

module.exports = router;
