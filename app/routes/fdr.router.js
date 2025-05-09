const router = require("express").Router();
const fdrController = require("../controllers/fdr.controller.js");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/get-all-fdrs", fdrController.getAllFdrData);
router.post("/create-fdr", upload.none(), fdrController.saveFdrData);

module.exports = router;
