const router = require("express").Router();
const AIController = require("../controllers/ai.controller");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/add-job", AIController.addNewJob);
router.post("/process-single-file", upload.single("doc_file"), AIController.processSingleFile);

module.exports = router;