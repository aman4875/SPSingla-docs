let router = require("express").Router();
let renderController = require("../controllers/render.controller.js");
let authMiddleware = require("../middlewares/auth.middleware.js");

router.get("/", authMiddleware.checkLoginStatus, renderController.renderDashboard);
router.get("/forgot-password", authMiddleware.checkLoginStatus, renderController.renderForgotPassword);
router.get("/documents", authMiddleware.checkLoginStatus, renderController.renderDocuments);
router.get("/users", authMiddleware.checkLoginStatus, renderController.renderUsers);
router.get("/sites", authMiddleware.checkLoginStatus, renderController.renderSites);
router.get("/documents/create-document", authMiddleware.checkLoginStatus, renderController.renderCreateDocument);
router.get("/documents/:id", authMiddleware.checkLoginStatus, renderController.renderSingleDocument);
router.get("/documents/import/bulk", authMiddleware.checkLoginStatus, renderController.renderBulkImport);
router.get("/ai-import", authMiddleware.checkLoginStatus, renderController.aiImport);
router.get("/project-master", authMiddleware.checkLoginStatus, renderController.renderProjectMaster);
router.get("/manage-bg", authMiddleware.checkLoginStatus, renderController.renderManageBg);
router.get("/project/create-project", authMiddleware.checkLoginStatus, renderController.renderCreateProjectMaster);
router.get("/manage/create-bg", authMiddleware.checkLoginStatus, renderController.renderCreateBg);
router.get("/edit-document/:id", authMiddleware.checkLoginStatus, renderController.editDoc);
router.get("/edit-project/:id", authMiddleware.checkLoginStatus, renderController.editProject);
router.get("/edit-bg/:id", authMiddleware.checkLoginStatus, renderController.editBG);
router.get("/settings", authMiddleware.checkLoginStatus, renderController.settings);
router.get("/bank-master", authMiddleware.checkLoginStatus, renderController.renderBankMaster);
router.get("/fdr", authMiddleware.checkLoginStatus, renderController.renderFdr);
router.get("/add-fdr", authMiddleware.checkLoginStatus, renderController.renderAddFdr);
router.get("/edit-fdr/:id", authMiddleware.checkLoginStatus, renderController.renderEditFdr);


module.exports = router;
