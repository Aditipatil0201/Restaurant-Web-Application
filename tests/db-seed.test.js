const assert = require('assert');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'node_restaurant.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Unable to open database:', err.message);
    process.exit(1);
  }
});

const query = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) return reject(err);
    resolve(row);
  });
});

(async () => {
  try {
    const userRow = await query("SELECT username FROM users WHERE username = 'admin'");
    assert(userRow, 'Default admin user not found. Start the app once to initialize the DB.');
    assert.strictEqual(userRow.username, 'admin');

    const categoryCount = await query('SELECT COUNT(*) AS count FROM item_lists');
    assert(categoryCount.count >= 5, `Expected at least 5 seeded categories, got ${categoryCount.count}`);

    const itemCount = await query('SELECT COUNT(*) AS count FROM items');
    assert(itemCount.count >= 5, `Expected at least 5 seeded items, got ${itemCount.count}`);

    const aboutCount = await query('SELECT COUNT(*) AS count FROM about_us');
    assert(aboutCount.count >= 1, `Expected at least 1 about entry, got ${aboutCount.count}`);

    console.log('Database seed verification passed.');
    process.exit(0);
  } catch (error) {
    console.error('Database seed verification failed:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
})();
