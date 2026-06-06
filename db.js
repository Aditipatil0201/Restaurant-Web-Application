const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const dbPath = path.join(__dirname, 'node_restaurant.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open database', err);
    process.exit(1);
  }
});

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) return reject(err);
    resolve(this);
  });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) return reject(err);
    resolve(row);
  });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) return reject(err);
    resolve(rows);
  });
});

const initializeDatabase = async () => {
  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS item_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    Category_name TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    Item_name TEXT NOT NULL,
    description TEXT NOT NULL,
    Price INTEGER NOT NULL,
    Category INTEGER,
    Image TEXT,
    FOREIGN KEY (Category) REFERENCES item_lists(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS about_us (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    Description TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS feedbacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    User_name TEXT NOT NULL,
    Description TEXT NOT NULL,
    Rating INTEGER NOT NULL,
    Image TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS book_table (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    Phone_number TEXT NOT NULL,
    Email TEXT NOT NULL,
    Total_person INTEGER NOT NULL,
    Booking_date TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS carts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    item_id INTEGER,
    quantity INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (item_id) REFERENCES items(id)
  )`);

  const categoryCount = await get('SELECT COUNT(*) AS count FROM item_lists');
  if (!categoryCount || categoryCount.count === 0) {
    const categoryIds = {};
    const categories = ['Burgers', 'Pizza', 'Salads', 'Desserts', 'Drinks'];
    for (const name of categories) {
      const result = await run('INSERT INTO item_lists (Category_name) VALUES (?)', [name]);
      categoryIds[name] = result.lastID;
    }

    const items = [
      { name: 'Classic Burger', description: 'Beef patty, cheese, lettuce, tomato, onion, pickles, and our special sauce.', price: 149, category: 'Burgers', image: 'o1.jpg' },
      { name: 'Cheese Burst Pizza', description: 'Loaded with cheese, peppers, onions, and fresh herbs.', price: 299, category: 'Pizza', image: 'o2.jpg' },
      { name: 'Caesar Salad', description: 'Crispy romaine, parmesan, croutons, and Caesar dressing.', price: 129, category: 'Salads', image: 'salad.jpg' },
      { name: 'Chocolate Brownie', description: 'Warm chocolate brownie with a scoop of vanilla ice cream.', price: 99, category: 'Desserts', image: 'dessert.jpg' },
      { name: 'Mango Shake', description: 'Creamy mango shake with fresh mango puree.', price: 89, category: 'Drinks', image: 'drink.jpg' }
    ];

    for (const item of items) {
      await run(
        'INSERT INTO items (Item_name, description, Price, Category, Image) VALUES (?, ?, ?, ?, ?)',
        [item.name, item.description, item.price, categoryIds[item.category], item.image]
      );
    }
  }

  const aboutCount = await get('SELECT COUNT(*) AS count FROM about_us');
  if (!aboutCount || aboutCount.count === 0) {
    await run('INSERT INTO about_us (Description) VALUES (?)', [
      'Burgger is a modern fast food restaurant that serves fresh burgers, pizzas, salads, desserts, and beverages. Our mission is to serve delicious meals with fast delivery and exceptional customer service.'
    ]);
  }

  const userCount = await get('SELECT COUNT(*) AS count FROM users');
  if (!userCount || userCount.count === 0) {
    const password_hash = await bcrypt.hash('admin123', 10);
    await run('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', ['admin', 'admin@example.com', password_hash]);
    console.log('Default admin user created: admin / admin123');
  }
};

module.exports = {
  db,
  run,
  get,
  all,
  initializeDatabase,
};
