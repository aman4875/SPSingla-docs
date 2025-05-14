const router = require("express").Router();
const fdrController = require("../controllers/fdr.controller.js");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/get-all-fdrs",upload.none() ,fdrController.getAllFdrData);
router.post("/create-fdr", upload.none(), fdrController.saveFdrData);
router.post("/save-clause", upload.none(), fdrController.saveClause);
router.post("/edit-fdr", upload.none(), fdrController.editFdr);
router.get("/get-all-clause", fdrController.getAllClause);
router.delete("/delete-fdr", fdrController.deleteFdr);

module.exports = router;
