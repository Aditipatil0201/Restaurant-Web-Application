# Burgger Restaurant Web App
A **Node.js + Express** restaurant web application with a static HTML frontend and a SQLite backend.

## What is included
- Express server handling static pages and JSON APIs
- SQLite database stored in `node_restaurant.db`
- Session-based authentication with login/signup
- Guest cart support saved in session
- Table booking and feedback submission
- Seeded menu categories, menu items, about content, and a default admin user

## Quick Start
1. Install dependencies
   ```bash
   npm install
   ```
2. Start the application
   ```bash
   npm start
   ```
3. Open in browser
   ```
   http://localhost:3000
   ```

## Default credentials
Use this default user to log in quickly:
- Username: `admin`
- Password: `admin123`

## Available pages
- `/` - Home
- `/menu` - Browse menu and add items to cart
- `/about` - About page
- `/book_table` - Book a table
- `/feedback` - Submit feedback
- `/login` - Login / signup page

## API Endpoints
- `GET /api/categories` - category list
- `GET /api/items` - menu items
- `GET /api/about` - about content
- `POST /api/book-table` - create booking
- `POST /api/feedback` - submit feedback
- `POST /api/signup` - create user
- `POST /api/login` - login user
- `POST /api/logout` - logout user
- `POST /api/add-to-cart` - add item to session cart
- `GET /api/cart` - view cart items
- `GET /api/user` - current authenticated user

## Testing
Run the basic DB seeding check:
```bash
npm test
```

## Notes
- The database is initialized automatically when the server starts.
- To enable booking confirmation emails, set `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS`, and optionally `EMAIL_FROM` in a `.env` file.
- If you use `npm run dev`, `nodemon` is installed as a dev dependency.
