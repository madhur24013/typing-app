const { pool } = require('../config/database');
const { logError } = require('../utils/logger');

const getTeamStreaks = async (req, res) => {
  try {
    const userId = req.user.id;
    const query = `
      SELECT 
        ts.*,
        u.username as leader_username,
        COUNT(tm.user_id) as member_count,
        ARRAY_AGG(tm.user_id) as member_ids
      FROM team_streaks ts
      JOIN users u ON ts.leader_id = u.id
      LEFT JOIN team_members tm ON ts.id = tm.team_id
      WHERE ts.id IN (
        SELECT team_id FROM team_members WHERE user_id = $1
        UNION
        SELECT id FROM team_streaks WHERE leader_id = $1
      )
      GROUP BY ts.id, u.username
    `;
    
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    logError('Error in getTeamStreaks:', error);
    res.status(500).json({ error: 'Failed to fetch team streaks' });
  }
};

const createTeam = async (req, res) => {
  try {
    const leaderId = req.user.id;
    const { name, description, maxMembers } = req.body;
    
    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Create team
      const teamQuery = `
        INSERT INTO team_streaks (
          name,
          description,
          leader_id,
          max_members,
          current_streak,
          longest_streak,
          created_at
        ) VALUES ($1, $2, $3, $4, 0, 0, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const teamResult = await client.query(teamQuery, [
        name,
        description,
        leaderId,
        maxMembers || 5
      ]);
      
      // Add leader as first member
      const memberQuery = `
        INSERT INTO team_members (team_id, user_id, joined_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
      `;
      await client.query(memberQuery, [teamResult.rows[0].id, leaderId]);
      
      await client.query('COMMIT');
      res.json(teamResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logError('Error in createTeam:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
};

const joinTeam = async (req, res) => {
  try {
    const userId = req.user.id;
    const { teamId } = req.params;
    
    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Check if team exists and has space
      const teamQuery = `
        SELECT ts.*, COUNT(tm.user_id) as member_count
        FROM team_streaks ts
        LEFT JOIN team_members tm ON ts.id = tm.team_id
        WHERE ts.id = $1
        GROUP BY ts.id
      `;
      
      const teamResult = await client.query(teamQuery, [teamId]);
      
      if (teamResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Team not found' });
      }
      
      if (teamResult.rows[0].member_count >= teamResult.rows[0].max_members) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Team is full' });
      }
      
      // Check if user is already a member
      const memberCheckQuery = `
        SELECT * FROM team_members
        WHERE team_id = $1 AND user_id = $2
      `;
      const memberCheckResult = await client.query(memberCheckQuery, [teamId, userId]);
      
      if (memberCheckResult.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Already a member of this team' });
      }
      
      // Add user to team
      const memberQuery = `
        INSERT INTO team_members (team_id, user_id, joined_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      const result = await client.query(memberQuery, [teamId, userId]);
      
      await client.query('COMMIT');
      res.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logError('Error in joinTeam:', error);
    res.status(500).json({ error: 'Failed to join team' });
  }
};

module.exports = {
  getTeamStreaks,
  createTeam,
  joinTeam
}; 