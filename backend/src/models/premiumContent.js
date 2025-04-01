const db = require('../config/database');

// Define content categories and types
const CONTENT_CATEGORIES = {
  BUSINESS: 'business',
  LEGAL: 'legal',
  MEDICAL: 'medical',
  PROGRAMMING: 'programming',
  CREATIVE: 'creative',
  ACADEMIC: 'academic',
  GENERAL: 'general'
};

const CONTENT_TYPES = {
  COURSE: 'course',
  EXERCISE: 'exercise',
  CHALLENGE: 'challenge',
  TEST: 'test'
};

// Create premium content tables
const createPremiumContentTables = async () => {
  try {
    // Create premium content table
    const contentTableQuery = `
      CREATE TABLE IF NOT EXISTS premium_content (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(50) NOT NULL,
        type VARCHAR(50) NOT NULL,
        difficulty VARCHAR(20) NOT NULL,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        isFree BOOLEAN NOT NULL DEFAULT FALSE,
        authorId INT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        isPublished BOOLEAN NOT NULL DEFAULT FALSE,
        publishedAt DATETIME,
        metadata JSON,
        thumbnailUrl VARCHAR(255),
        FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE SET NULL
      )
    `;
    await db.query(contentTableQuery);
    
    // Create premium content sections table
    const sectionsTableQuery = `
      CREATE TABLE IF NOT EXISTS premium_content_sections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contentId INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        orderIndex INT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (contentId) REFERENCES premium_content(id) ON DELETE CASCADE
      )
    `;
    await db.query(sectionsTableQuery);
    
    // Create premium content items table
    const itemsTableQuery = `
      CREATE TABLE IF NOT EXISTS premium_content_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sectionId INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        orderIndex INT NOT NULL,
        duration INT, -- Duration in seconds
        targetWPM INT, -- Target words per minute
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (sectionId) REFERENCES premium_content_sections(id) ON DELETE CASCADE
      )
    `;
    await db.query(itemsTableQuery);
    
    // Create user purchased content table
    const purchasedTableQuery = `
      CREATE TABLE IF NOT EXISTS user_purchased_content (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        contentId INT NOT NULL,
        purchasedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expiresAt DATETIME,
        paymentId VARCHAR(255),
        amount DECIMAL(10, 2),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (contentId) REFERENCES premium_content(id) ON DELETE CASCADE
      )
    `;
    await db.query(purchasedTableQuery);
    
    // Create user progress in premium content table
    const progressTableQuery = `
      CREATE TABLE IF NOT EXISTS user_content_progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        contentId INT NOT NULL,
        itemId INT NOT NULL,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        wpm INT,
        accuracy DECIMAL(5, 2),
        completedAt DATETIME,
        attemptCount INT NOT NULL DEFAULT 0,
        lastAttempt DATETIME,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (contentId) REFERENCES premium_content(id) ON DELETE CASCADE,
        FOREIGN KEY (itemId) REFERENCES premium_content_items(id) ON DELETE CASCADE
      )
    `;
    await db.query(progressTableQuery);
    
    console.log('Premium content tables created or already exist');
    return true;
  } catch (error) {
    console.error('Error creating premium content tables:', error);
    return false;
  }
};

// Get available premium content with filters
const getAvailablePremiumContent = async (filters = {}) => {
  try {
    let query = `
      SELECT 
        pc.id, pc.title, pc.description, pc.category, pc.type, 
        pc.difficulty, pc.price, pc.isFree, pc.createdAt, 
        pc.updatedAt, pc.thumbnailUrl,
        u.username as authorName,
        (SELECT COUNT(*) FROM premium_content_sections pcs WHERE pcs.contentId = pc.id) as sectionCount,
        (SELECT COUNT(*) FROM premium_content_sections pcs 
         INNER JOIN premium_content_items pci ON pcs.id = pci.sectionId 
         WHERE pcs.contentId = pc.id) as itemCount
      FROM premium_content pc
      LEFT JOIN users u ON pc.authorId = u.id
      WHERE pc.isPublished = TRUE
    `;
    
    const queryParams = [];
    
    // Apply filters
    if (filters.category) {
      query += ' AND pc.category = ?';
      queryParams.push(filters.category);
    }
    
    if (filters.type) {
      query += ' AND pc.type = ?';
      queryParams.push(filters.type);
    }
    
    if (filters.difficulty) {
      query += ' AND pc.difficulty = ?';
      queryParams.push(filters.difficulty);
    }
    
    if (filters.isFree !== undefined) {
      query += ' AND pc.isFree = ?';
      queryParams.push(filters.isFree);
    }
    
    if (filters.priceMax) {
      query += ' AND (pc.price <= ? OR pc.isFree = TRUE)';
      queryParams.push(filters.priceMax);
    }
    
    if (filters.search) {
      query += ' AND (pc.title LIKE ? OR pc.description LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      queryParams.push(searchTerm, searchTerm);
    }
    
    // Add sorting
    query += ' ORDER BY pc.createdAt DESC';
    
    // Add pagination
    if (filters.limit) {
      query += ' LIMIT ?';
      queryParams.push(parseInt(filters.limit));
      
      if (filters.offset) {
        query += ' OFFSET ?';
        queryParams.push(parseInt(filters.offset));
      }
    }
    
    const [rows] = await db.query(query, queryParams);
    return rows;
  } catch (error) {
    console.error('Error getting premium content:', error);
    throw error;
  }
};

// Get details of a specific premium content item
const getPremiumContentDetails = async (contentId) => {
  try {
    // Get content details
    const [contentRows] = await db.query(
      `SELECT 
        pc.*, u.username as authorName
       FROM premium_content pc
       LEFT JOIN users u ON pc.authorId = u.id
       WHERE pc.id = ? AND pc.isPublished = TRUE`,
      [contentId]
    );
    
    if (contentRows.length === 0) {
      throw new Error('Premium content not found');
    }
    
    const content = contentRows[0];
    
    // Get sections
    const [sectionRows] = await db.query(
      `SELECT * FROM premium_content_sections 
       WHERE contentId = ? 
       ORDER BY orderIndex ASC`,
      [contentId]
    );
    
    // Get items for each section
    const sections = await Promise.all(sectionRows.map(async (section) => {
      const [itemRows] = await db.query(
        `SELECT * FROM premium_content_items 
         WHERE sectionId = ? 
         ORDER BY orderIndex ASC`,
        [section.id]
      );
      
      return {
        ...section,
        items: itemRows
      };
    }));
    
    return {
      ...content,
      sections
    };
  } catch (error) {
    console.error('Error getting premium content details:', error);
    throw error;
  }
};

// Check if a user has purchased a specific premium content
const hasUserPurchasedContent = async (userId, contentId) => {
  try {
    // Check if the content is free
    const [contentRows] = await db.query(
      'SELECT isFree FROM premium_content WHERE id = ?',
      [contentId]
    );
    
    if (contentRows.length === 0) {
      return false;
    }
    
    // If the content is free, the user has access
    if (contentRows[0].isFree) {
      return true;
    }
    
    // Check if the user has purchased this content
    const [purchaseRows] = await db.query(
      `SELECT * FROM user_purchased_content 
       WHERE userId = ? AND contentId = ? 
       AND (expiresAt IS NULL OR expiresAt > NOW())`,
      [userId, contentId]
    );
    
    return purchaseRows.length > 0;
  } catch (error) {
    console.error('Error checking user content purchase:', error);
    return false;
  }
};

// Get premium content purchased by a user
const getUserPurchasedContent = async (userId) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        pc.id, pc.title, pc.description, pc.category, pc.type, 
        pc.difficulty, pc.thumbnailUrl, upc.purchasedAt,
        (SELECT COUNT(*) FROM premium_content_sections pcs WHERE pcs.contentId = pc.id) as sectionCount,
        (SELECT COUNT(*) FROM premium_content_sections pcs 
         INNER JOIN premium_content_items pci ON pcs.id = pci.sectionId 
         WHERE pcs.contentId = pc.id) as totalItems,
        (SELECT COUNT(*) FROM user_content_progress ucp
         WHERE ucp.userId = ? AND ucp.contentId = pc.id AND ucp.completed = TRUE) as completedItems
       FROM user_purchased_content upc
       JOIN premium_content pc ON upc.contentId = pc.id
       WHERE upc.userId = ? AND (upc.expiresAt IS NULL OR upc.expiresAt > NOW())
       ORDER BY upc.purchasedAt DESC`,
      [userId, userId]
    );
    
    return rows;
  } catch (error) {
    console.error('Error getting user purchased content:', error);
    throw error;
  }
};

// Record a purchase of premium content
const recordContentPurchase = async (userId, contentId, paymentDetails) => {
  try {
    const { paymentId, amount, expiresAt } = paymentDetails;
    
    // Insert the purchase record
    await db.query(
      `INSERT INTO user_purchased_content 
       (userId, contentId, paymentId, amount, expiresAt) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, contentId, paymentId, amount, expiresAt]
    );
    
    return {
      success: true,
      message: 'Purchase recorded successfully'
    };
  } catch (error) {
    console.error('Error recording content purchase:', error);
    throw error;
  }
};

// Update user progress in premium content
const updateContentProgress = async (userId, contentId, itemId, progressData) => {
  try {
    const { completed, wpm, accuracy } = progressData;
    
    // Check if progress record exists
    const [existingRows] = await db.query(
      `SELECT * FROM user_content_progress 
       WHERE userId = ? AND contentId = ? AND itemId = ?`,
      [userId, contentId, itemId]
    );
    
    const completedAt = completed ? new Date() : null;
    
    if (existingRows.length > 0) {
      // Update existing record
      await db.query(
        `UPDATE user_content_progress 
         SET completed = ?, wpm = ?, accuracy = ?, 
         completedAt = ?, attemptCount = attemptCount + 1, lastAttempt = NOW()
         WHERE userId = ? AND contentId = ? AND itemId = ?`,
        [completed, wpm, accuracy, completedAt, userId, contentId, itemId]
      );
    } else {
      // Create new record
      await db.query(
        `INSERT INTO user_content_progress 
         (userId, contentId, itemId, completed, wpm, accuracy, completedAt, attemptCount, lastAttempt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
        [userId, contentId, itemId, completed, wpm, accuracy, completedAt]
      );
    }
    
    return {
      success: true,
      message: 'Progress updated successfully'
    };
  } catch (error) {
    console.error('Error updating content progress:', error);
    throw error;
  }
};

// Get user progress in a specific premium content
const getUserContentProgress = async (userId, contentId) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        ucp.itemId, ucp.completed, ucp.wpm, ucp.accuracy, 
        ucp.completedAt, ucp.attemptCount, ucp.lastAttempt
       FROM user_content_progress ucp
       WHERE ucp.userId = ? AND ucp.contentId = ?`,
      [userId, contentId]
    );
    
    // Convert to a map for easier access
    const progressMap = {};
    rows.forEach(row => {
      progressMap[row.itemId] = row;
    });
    
    return progressMap;
  } catch (error) {
    console.error('Error getting user content progress:', error);
    throw error;
  }
};

// Create premium content (admin or authorized users)
const createPremiumContent = async (contentData) => {
  try {
    const {
      title, description, category, type, difficulty, 
      price = 0, isFree = false, authorId, metadata = {},
      thumbnailUrl, sections = []
    } = contentData;
    
    // Start a transaction
    await db.query('START TRANSACTION');
    
    // Insert the content
    const [contentResult] = await db.query(
      `INSERT INTO premium_content 
       (title, description, category, type, difficulty, price, isFree, authorId, metadata, thumbnailUrl) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, category, type, difficulty, price, isFree, authorId, JSON.stringify(metadata), thumbnailUrl]
    );
    
    const contentId = contentResult.insertId;
    
    // Insert sections and items
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      
      const [sectionResult] = await db.query(
        `INSERT INTO premium_content_sections 
         (contentId, title, description, orderIndex) 
         VALUES (?, ?, ?, ?)`,
        [contentId, section.title, section.description, i]
      );
      
      const sectionId = sectionResult.insertId;
      
      // Insert items for this section
      if (section.items && section.items.length > 0) {
        for (let j = 0; j < section.items.length; j++) {
          const item = section.items[j];
          
          await db.query(
            `INSERT INTO premium_content_items 
             (sectionId, title, type, content, orderIndex, duration, targetWPM) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [sectionId, item.title, item.type, item.content, j, item.duration, item.targetWPM]
          );
        }
      }
    }
    
    // Commit the transaction
    await db.query('COMMIT');
    
    return {
      success: true,
      contentId
    };
  } catch (error) {
    // Rollback in case of error
    await db.query('ROLLBACK');
    console.error('Error creating premium content:', error);
    throw error;
  }
};

// Publish premium content (make it available to users)
const publishPremiumContent = async (contentId) => {
  try {
    await db.query(
      `UPDATE premium_content 
       SET isPublished = TRUE, publishedAt = NOW() 
       WHERE id = ?`,
      [contentId]
    );
    
    return {
      success: true,
      message: 'Content published successfully'
    };
  } catch (error) {
    console.error('Error publishing premium content:', error);
    throw error;
  }
};

module.exports = {
  createPremiumContentTables,
  getAvailablePremiumContent,
  getPremiumContentDetails,
  hasUserPurchasedContent,
  getUserPurchasedContent,
  recordContentPurchase,
  updateContentProgress,
  getUserContentProgress,
  createPremiumContent,
  publishPremiumContent,
  CONTENT_CATEGORIES,
  CONTENT_TYPES
}; 