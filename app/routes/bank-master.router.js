const router = require("express").Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const authMiddleware = require("../middlewares/auth.middleware.js");
const bankMasterController = require("../controllers/bankMaster.controller.js");


router.get("/get-all-banks", authMiddleware.checkLoginStatus, bankMasterController.getAllBankMaster);
router.post("/add-bank", authMiddleware.checkLoginStatus, bankMasterController.addBankMaster);
module.exports = router;