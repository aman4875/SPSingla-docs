const router = require("express").Router();
const dashboardController = require("../controllers/dashboard.controller");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const authMiddleware = require("../middlewares/auth.middleware.js");


router.post("/site-stats", authMiddleware.checkLoginStatus,dashboardController.documentStatus);
module.exports = router;