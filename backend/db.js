const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function setupDb() {
    const db = await open({
        filename: path.join(__dirname, 'signals.db'),
        driver: sqlite3.Database,
    });

    await db.exec(`
    CREATE TABLE IF NOT EXISTS signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      eventId TEXT NOT NULL,
      action TEXT NOT NULL,
      category TEXT,
      dwellTimeSeconds REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    return db;
}

module.exports = setupDb;
