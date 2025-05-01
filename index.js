import express from "express";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const { Pool } = pg;

app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASSWORD),
  port: Number(process.env.DB_PORT),
});

app.get("/players-scores", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT players.name AS player, games.title AS game, scores.score
      FROM scores
      JOIN players ON scores.player_id = players.id
      JOIN games ON scores.game_id = games.id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/top-players", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT players.name, SUM(scores.score) AS total_score
      FROM scores
      JOIN players ON scores.player_id = players.id
      GROUP BY players.name
      ORDER BY total_score DESC
      LIMIT 3
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/inactive-players", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT name FROM players
      WHERE id NOT IN (
        SELECT DISTINCT player_id FROM scores
      )
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/popular-genres", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT games.genre, COUNT(*) AS times_played
      FROM scores
      JOIN games ON scores.game_id = games.id
      GROUP BY games.genre
      ORDER BY times_played DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/recent-players", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT name, joined_at FROM players
      WHERE joined_at >= CURRENT_DATE - INTERVAL '30 days'
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/favorite-games", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT players.name AS player, games.title AS favorite_game
      FROM players
      JOIN (
        SELECT player_id, game_id, COUNT(*) AS play_count,
               RANK() OVER (PARTITION BY player_id ORDER BY COUNT(*) DESC) AS rank
        FROM scores
        GROUP BY player_id, game_id
      ) AS ranked_games ON players.id = ranked_games.player_id AND ranked_games.rank = 1
      JOIN games ON ranked_games.game_id = games.id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
