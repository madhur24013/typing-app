const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All routes are protected and require authentication
router.use(authenticate);

// Upload a document
router.post('/', upload.single('document'), documentController.uploadDocument);

// Get all user documents
router.get('/', documentController.getUserDocuments);

// Get specific document
router.get('/:id', documentController.getDocument);

// Get specific page from a document
router.get('/:id/page/:page', documentController.getDocumentPage);

// Download document
router.get('/:id/download', documentController.downloadDocument);

// Delete document
router.delete('/:id', documentController.deleteDocument);

module.exports = router; 