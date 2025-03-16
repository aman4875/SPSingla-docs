let router = require("express").Router();
let adminController = require("../controllers/admin.controller");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/settings", upload.none(), adminController.settings);

module.exports = router;