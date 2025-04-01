const { pool } = require('../config/database');
const { logError } = require('../utils/logger');

const getActiveBattles = async (req, res) => {
  try {
    const userId = req.user.id;
    const query = `
      SELECT 
        sb.*,
        u1.username as challenger_username,
        u2.username as opponent_username,
        us1.current_streak as challenger_streak,
        us2.current_streak as opponent_streak
      FROM streak_battles sb
      JOIN users u1 ON sb.challenger_id = u1.id
      JOIN users u2 ON sb.opponent_id = u2.id
      JOIN user_streaks us1 ON sb.challenger_id = us1.user_id
      JOIN user_streaks us2 ON sb.opponent_id = us2.user_id
      WHERE (sb.challenger_id = $1 OR sb.opponent_id = $1)
      AND sb.status = 'active'
      AND sb.end_date >= CURRENT_DATE
    `;
    
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    logError('Error in getActiveBattles:', error);
    res.status(500).json({ error: 'Failed to fetch active battles' });
  }
};

const getPendingBattles = async (req, res) => {
  try {
    const userId = req.user.id;
    const query = `
      SELECT 
        sb.*,
        u1.username as challenger_username,
        u2.username as opponent_username
      FROM streak_battles sb
      JOIN users u1 ON sb.challenger_id = u1.id
      JOIN users u2 ON sb.opponent_id = u2.id
      WHERE sb.opponent_id = $1
      AND sb.status = 'pending'
      AND sb.end_date >= CURRENT_DATE
    `;
    
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    logError('Error in getPendingBattles:', error);
    res.status(500).json({ error: 'Failed to fetch pending battles' });
  }
};

const createBattle = async (req, res) => {
  try {
    const challengerId = req.user.id;
    const { friendId, duration } = req.body;
    
    // Validate friend exists
    const friendQuery = `
      SELECT id FROM users WHERE id = $1
    `;
    const friendResult = await pool.query(friendQuery, [friendId]);
    
    if (friendResult.rows.length === 0) {
      return res.status(404).json({ error: 'Friend not found' });
    }
    
    // Create battle
    const battleQuery = `
      INSERT INTO streak_battles (
        challenger_id,
        opponent_id,
        start_date,
        end_date,
        status
      ) VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + $3::INTERVAL, 'pending')
      RETURNING *
    `;
    
    const result = await pool.query(battleQuery, [challengerId, friendId, duration]);
    res.json(result.rows[0]);
  } catch (error) {
    logError('Error in createBattle:', error);
    res.status(500).json({ error: 'Failed to create battle' });
  }
};

const respondToBattle = async (req, res) => {
  try {
    const userId = req.user.id;
    const { battleId } = req.params;
    const { accept } = req.body;
    
    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Verify battle exists and user is opponent
      const verifyQuery = `
        SELECT * FROM streak_battles
        WHERE id = $1 AND opponent_id = $2 AND status = 'pending'
      `;
      const verifyResult = await client.query(verifyQuery, [battleId, userId]);
      
      if (verifyResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Battle not found or already responded' });
      }
      
      // Update battle status
      const updateQuery = `
        UPDATE streak_battles
        SET status = $1
        WHERE id = $2
        RETURNING *
      `;
      const result = await client.query(updateQuery, [
        accept ? 'active' : 'rejected',
        battleId
      ]);
      
      await client.query('COMMIT');
      res.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logError('Error in respondToBattle:', error);
    res.status(500).json({ error: 'Failed to respond to battle' });
  }
};

module.exports = {
  getActiveBattles,
  getPendingBattles,
  createBattle,
  respondToBattle
}; 