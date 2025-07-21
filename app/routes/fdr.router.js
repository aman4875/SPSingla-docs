const router = require("express").Router();
const fdrController = require("../controllers/fdr.controller.js");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/get-all-fdrs",upload.none() ,fdrController.getAllFdrData);
router.post("/create-fdr", upload.none(), fdrController.saveFdrData);
router.post("/save-clause", upload.none(), fdrController.saveClause);
router.post("/save-new-renewal", upload.none(), fdrController.saveRenewal);
router.post("/save-purpose", upload.none(), fdrController.savePurpose);
router.post("/edit-fdr", upload.none(), fdrController.editFdr);
router.get("/get-all-clause", fdrController.getAllClause);
router.get("/get-all-renewal", fdrController.getAllRenewal);
router.get("/get-all-purpose", fdrController.getAllPurpose);
router.get("/get-margin-available", fdrController.getAvailableMargin);
router.get("/update-financials", fdrController.updateFinancials);
router.delete("/delete-fdr", fdrController.deleteFdr);
router.get("/update-financial", fdrController.updateFinancial)

module.exports = router;
