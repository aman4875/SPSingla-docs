let router = require("express").Router();
let documentController = require("../controllers/document.controller");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get("/generate-document-number", documentController.generateDocumentNumber);
router.get("/get-document-reference", documentController.getDocumentReference);
router.post("/save-draft", documentController.saveDraft);
router.post("/edit-document", documentController.editDocument);
router.post("/edit-project", documentController.editProject);
router.post("/create-document", upload.single("doc_file"), documentController.createDocument);
router.post("/create-project", upload.single("doc_file"), documentController.createProject);
router.post("/upload-attachment", upload.single("doc_file"), documentController.uploadAttachment);
router.post("/upload-project-pdfs", upload.single("doc_file"), documentController.uploadProjectAttachments);
router.post("/get-filtered-documents", documentController.getFilteredDocuments);
router.post("/get-filtered-projects", documentController.getFilteredProjects);
router.post("/record-document-viewed", documentController.recordDocumentViewed);
router.get("/view-failed-uploads", documentController.getFailedUploads);
router.post("/clear-records", documentController.clearFailedPdfs);
router.post("/get-replied-vide", documentController.getRepliedVide);
router.post("/delete-doc", documentController.deleteDoc);
router.post("/delete-project", documentController.deleteProject);
router.post("/delete-attachment", documentController.deleteAttachment);
router.delete("/delete-project-pdf", documentController.deleteProjectPdf);
router.post("/save-purpose", documentController.savePurpose);
router.get("/get-all-purpose", documentController.getAllDocPurpose);

module.exports = router;