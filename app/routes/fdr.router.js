const router = require("express").Router();
const fdrController = require("../controllers/fdr.controller.js");

router.post("/get-allFdr", fdrController.getAllFdrData);
router.post("/save-fdr", fdrController.getAllFdrData);

module.exports = router;
