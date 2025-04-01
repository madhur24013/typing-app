const db = require('../config/database');
const path = require('path');
const fs = require('fs');
const { extractTextFromPDF, cleanPDFText } = require('../utils/pdfExtractor');

// Upload a new document
const uploadDocument = async (req, res) => {
  const userId = req.user.id;
  
  // Check if file was uploaded
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  
  const { originalname, mimetype, filename, path: filePath } = req.file;
  const title = req.body.title || originalname;
  
  try {
    // Extract text from PDF
    const { text, pages } = await extractTextFromPDF(filePath);
    
    // Clean and prepare text for typing
    const cleanedText = cleanPDFText(text);
    
    // Store in database
    db.run(
      'INSERT INTO documents (user_id, title, file_path, file_type, content, page_count) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, title, filePath, mimetype, cleanedText, pages],
      function(err) {
        if (err) {
          console.error('Error saving document to database:', err);
          // Remove the uploaded file if database insertion fails
          fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) console.error('Error deleting file:', unlinkErr);
          });
          return res.status(500).json({ message: 'Server error' });
        }
        
        res.status(201).json({
          message: 'Document uploaded successfully',
          document: {
            id: this.lastID,
            title,
            filename,
            fileType: mimetype,
            pageCount: pages
          }
        });
      }
    );
  } catch (error) {
    console.error('Error processing PDF:', error);
    // Remove the uploaded file if processing fails
    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr) console.error('Error deleting file:', unlinkErr);
    });
    return res.status(500).json({ message: 'Error processing PDF file' });
  }
};

// Get all documents for a user
const getUserDocuments = (req, res) => {
  const userId = req.user.id;
  
  db.all(
    'SELECT id, title, file_path, file_type, page_count, created_at FROM documents WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
    (err, documents) => {
      if (err) {
        console.error('Error retrieving documents:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      
      res.json({ documents });
    }
  );
};

// Get a specific document
const getDocument = (req, res) => {
  const userId = req.user.id;
  const documentId = req.params.id;
  
  db.get(
    'SELECT id, title, file_path, file_type, content, page_count, created_at FROM documents WHERE id = ? AND user_id = ?',
    [documentId, userId],
    (err, document) => {
      if (err) {
        console.error('Error retrieving document:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      res.json({ document });
    }
  );
};

// Extract text from a specific page of a document
const getDocumentPage = async (req, res) => {
  const userId = req.user.id;
  const documentId = req.params.id;
  const pageNum = parseInt(req.params.page) || 1;
  
  try {
    // First, get the document details
    db.get(
      'SELECT id, title, file_path, file_type, page_count FROM documents WHERE id = ? AND user_id = ?',
      [documentId, userId],
      async (err, document) => {
        if (err) {
          console.error('Error retrieving document:', err);
          return res.status(500).json({ message: 'Server error' });
        }
        
        if (!document) {
          return res.status(404).json({ message: 'Document not found' });
        }
        
        // Check if page number is valid
        if (pageNum < 1 || pageNum > document.page_count) {
          return res.status(400).json({ message: `Invalid page number. Document has ${document.page_count} pages.` });
        }
        
        try {
          // For multi-page documents, extract specific page
          const { extractPageFromPDF } = require('../utils/pdfExtractor');
          const { text, metadata } = await extractPageFromPDF(document.file_path, pageNum);
          const cleanedText = cleanPDFText(text);
          
          res.json({
            documentId: document.id,
            title: document.title,
            pageNumber: pageNum,
            totalPages: document.page_count,
            content: cleanedText
          });
        } catch (error) {
          console.error('Error extracting page from PDF:', error);
          res.status(500).json({ message: 'Error extracting text from PDF' });
        }
      }
    );
  } catch (error) {
    console.error('Error processing page request:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Download a document
const downloadDocument = (req, res) => {
  const userId = req.user.id;
  const documentId = req.params.id;
  
  db.get(
    'SELECT file_path, title, file_type FROM documents WHERE id = ? AND user_id = ?',
    [documentId, userId],
    (err, document) => {
      if (err) {
        console.error('Error retrieving document:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      // Check if file exists
      if (!fs.existsSync(document.file_path)) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      // Send file
      res.setHeader('Content-Type', document.file_type);
      res.setHeader('Content-Disposition', `attachment; filename="${document.title}"`);
      
      const fileStream = fs.createReadStream(document.file_path);
      fileStream.pipe(res);
    }
  );
};

// Delete a document
const deleteDocument = (req, res) => {
  const userId = req.user.id;
  const documentId = req.params.id;
  
  // Get file path before deleting record
  db.get(
    'SELECT file_path FROM documents WHERE id = ? AND user_id = ?',
    [documentId, userId],
    (err, document) => {
      if (err) {
        console.error('Error retrieving document:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      // Delete record from database
      db.run(
        'DELETE FROM documents WHERE id = ? AND user_id = ?',
        [documentId, userId],
        function(err) {
          if (err) {
            console.error('Error deleting document:', err);
            return res.status(500).json({ message: 'Server error' });
          }
          
          if (this.changes === 0) {
            return res.status(404).json({ message: 'Document not found' });
          }
          
          // Delete file from filesystem
          fs.unlink(document.file_path, (unlinkErr) => {
            if (unlinkErr) {
              console.error('Error deleting file:', unlinkErr);
              // We still return success since the database record is deleted
            }
            
            res.json({ message: 'Document deleted successfully' });
          });
        }
      );
    }
  );
};

module.exports = {
  uploadDocument,
  getUserDocuments,
  getDocument,
  getDocumentPage,
  downloadDocument,
  deleteDocument
}; 