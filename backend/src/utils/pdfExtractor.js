const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

/**
 * Extract text from a PDF file
 * 
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<{text: string, pages: number, metadata: object}>} - Extracted text and metadata
 */
const extractTextFromPDF = async (filePath) => {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Read PDF file
    const dataBuffer = fs.readFileSync(filePath);
    
    // Parse PDF content
    const data = await pdfParse(dataBuffer);
    
    // Return extracted text and metadata
    return {
      text: data.text,
      pages: data.numpages,
      metadata: {
        info: data.info,
        version: data.version
      }
    };
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
};

/**
 * Extract text from a specific page of a PDF file
 * 
 * @param {string} filePath - Path to the PDF file
 * @param {number} pageNum - Page number to extract (1-based index)
 * @returns {Promise<{text: string, metadata: object}>} - Extracted text and metadata
 */
const extractPageFromPDF = async (filePath, pageNum) => {
  try {
    // Read PDF file
    const dataBuffer = fs.readFileSync(filePath);
    
    // Options for pdf-parse
    const options = {
      max: pageNum, // Extract up to this page
      pagerender: pageNum === 1 ? undefined : function(pageData) {
        // Skip pages before the target page
        if (pageData.pageNumber < pageNum) {
          return Promise.resolve('');
        }
        // Return text for the target page
        return Promise.resolve(pageData.getTextContent().then(item => {
          let text = '';
          item.items.forEach(item => {
            text += item.str + ' ';
          });
          return text;
        }));
      }
    };
    
    // Parse PDF with options
    const data = await pdfParse(dataBuffer, options);
    
    // For single page extraction, we need to clean up the text
    let pageText = data.text;
    
    // If not first page, we need to extract the last page's content
    if (pageNum > 1) {
      // Split by pages (not perfect but works in many cases)
      const pages = pageText.split(/\f/);
      pageText = pages[pageNum - 1] || pageText;
    }
    
    return {
      text: pageText.trim(),
      metadata: {
        info: data.info,
        version: data.version,
        page: pageNum,
        totalPages: data.numpages
      }
    };
  } catch (error) {
    console.error(`Error extracting page ${pageNum} from PDF:`, error);
    throw error;
  }
};

/**
 * Clean and normalize PDF text for typing practice
 * 
 * @param {string} text - Raw text from PDF
 * @returns {string} - Cleaned text ready for typing practice
 */
const cleanPDFText = (text) => {
  if (!text) return '';
  
  return text
    .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
    .replace(/\f/g, '\n\n')         // Replace form feeds with double newlines
    .replace(/(\r\n|\r|\n)+/g, '\n') // Normalize line breaks
    .trim();                         // Remove leading/trailing whitespace
};

module.exports = {
  extractTextFromPDF,
  extractPageFromPDF,
  cleanPDFText
}; 