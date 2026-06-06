const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const { initializeDatabase, run, get, all } = require('./db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'Static')));
app.use(express.static(path.join(__dirname, 'Template')));
app.use('/media', express.static(path.join(__dirname, 'Media')));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'restaurant-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, 'Media', 'feedback'));
    },
    filename: (req, file, cb) => {
      const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      cb(null, safeName);
    }
  })
});

const sendBookingEmail = async ({ name, email, total_person, booking_data }) => {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: 'Booking Confirmation',
    text: `Hello ${name},\n\nYour booking has been scheduled successfully.\nTotal persons: ${total_person}\nBooking date: ${booking_data}\n\nThank you for choosing our restaurant.`
  });
};

app.get('/api/items', async (req, res) => {
  try {
    const items = await all(`SELECT items.id, items.Item_name, items.description, items.Price, items.Image, item_lists.Category_name AS category_name
      FROM items
      LEFT JOIN item_lists on items.Category = item_lists.id`);
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to load items' });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await all('SELECT * FROM item_lists');
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to load categories' });
  }
});

app.get('/api/about', async (req, res) => {
  try {
    const data = await all('SELECT * FROM about_us');
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to load about data' });
  }
});

app.post('/api/book-table', async (req, res) => {
  const { user_name, phone_number, user_email, total_person, booking_data } = req.body;
  if (!user_name || !phone_number || !user_email || !total_person || !booking_data) {
    return res.status(400).json({ error: 'Missing required booking fields' });
  }

  try {
    await run(`INSERT INTO book_table (Name, Phone_number, Email, Total_person, Booking_date) VALUES (?, ?, ?, ?, ?)`,
      [user_name, phone_number, user_email, Number(total_person), booking_data]);

    await sendBookingEmail({
      name: user_name,
      email: user_email,
      total_person,
      booking_data
    });

    res.json({ message: 'Booking confirmation created successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not create booking' });
  }
});

app.post('/api/feedback', upload.single('Selfie'), async (req, res) => {
  const { User_name, Description, Rating } = req.body;
  const image = req.file ? `/media/feedback/${req.file.filename}` : null;

  if (!User_name || !Description || !Rating) {
    return res.status(400).json({ error: 'Missing required feedback fields' });
  }

  try {
    await run(`INSERT INTO feedbacks (User_name, Description, Rating, Image) VALUES (?, ?, ?, ?)`,
      [User_name, Description, Number(Rating), image]);
    res.json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to save feedback' });
  }
});

app.post('/api/signup', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing username, email, or password' });
  }

  try {
    const existingUser = await get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    await run('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, email, password_hash]);
    res.json({ message: 'Signup successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to create user' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }

  try {
    const user = await get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.user = { id: user.id, username: user.username, email: user.email };
    res.json({ message: 'Login successful', user: req.session.user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to login' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Unable to log out' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

app.post('/api/add-to-cart', async (req, res) => {
  const { item_id } = req.body;

  if (!item_id) {
    return res.status(400).json({ error: 'item_id is required' });
  }

  const cart = req.session.cart || {};
  const item = await get('SELECT * FROM items WHERE id = ?', [item_id]);
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  if (cart[item_id]) {
    cart[item_id].quantity += 1;
  } else {
    cart[item_id] = {
      name: item.Item_name,
      price: item.Price,
      quantity: 1
    };
  }

  req.session.cart = cart;
  res.json({ message: 'Item added to cart', cart });
});

app.get('/api/cart', (req, res) => {
  const cart = req.session.cart || {};
  const items = Object.values(cart).map((entry) => ({
    ...entry,
    total: entry.quantity * entry.price
  }));
  res.json({ items });
});

app.get('/api/user', (req, res) => {
  if (req.session.user) {
    return res.json({ user: req.session.user });
  }
  res.status(401).json({ error: 'Not authenticated' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Template', 'home.html'));
});

app.get('/menu', (req, res) => {
  res.sendFile(path.join(__dirname, 'Template', 'menu.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'Template', 'about.html'));
});

app.get('/book_table', (req, res) => {
  res.sendFile(path.join(__dirname, 'Template', 'book_table.html'));
});

app.get('/feedback', (req, res) => {
  res.sendFile(path.join(__dirname, 'Template', 'feedback.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'Template', 'login.html'));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Node.js backend listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database initialization failed', error);
    process.exit(1);
  });
