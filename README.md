# Sparklane Full-Stack App

A modern full-stack web application built with Node.js, Express, and React TypeScript.

## Features

- **Backend**: Node.js with Express.js
- **Frontend**: React with TypeScript
- **API**: RESTful API with CRUD operations
- **Styling**: Modern CSS with responsive design
- **Data Management**: Users and Posts with relationships

## Project Structure

```
sparklane-react-app/
├── backend/
│   ├── server.js          # Express server
│   ├── package.json       # Backend dependencies
│   └── .env               # Environment variables
├── frontend/
│   ├── src/
│   │   ├── App.tsx        # Main React component
│   │   ├── App.css        # Styling
│   │   └── ...            # Other React files
│   └── package.json       # Frontend dependencies
├── package.json           # Root package.json with scripts
└── README.md             # This file
```

## Installation

1. Install all dependencies for the entire project:
```bash
npm run install-all
```

Or install separately:

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
```

## Running the Application

### Development Mode (Recommended)

Run both backend and frontend concurrently:
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:5000
- Frontend development server on http://localhost:3000

### Individual Services

Start only the backend:
```bash
npm run server
```

Start only the frontend:
```bash
npm run client
```

### Production

Build the frontend for production:
```bash
npm run build
```

Start the backend in production mode:
```bash
npm start
```

## API Endpoints
### TBA

## Technology Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **CORS** - Cross-Origin Resource Sharing
- **Helmet** - Security middleware
- **Morgan** - HTTP request logger
- **dotenv** - Environment variable management

### Frontend
- **React** - UI library
- **TypeScript** - Type-safe JavaScript
- **Axios** - HTTP client for API calls
- **CSS3** - Modern styling with responsive design

## Development Scripts

- `npm run dev` - Start both backend and frontend in development
- `npm run server` - Start backend only with nodemon
- `npm run client` - Start frontend only
- `npm run build` - Build frontend for production
- `npm start` - Start backend in production mode
- `npm run install-all` - Install all dependencies

## Usage

1. Start the application with `npm run dev`
2. Open http://localhost:3000 in your browser
3. The app will display users and posts from the backend API
4. Use the forms to add new users and posts
5. Budgets, to-dos, time logs, routines, meal plans, and account preferences are stored in MongoDB under the authenticated user's Google ID (account preferences live on their account record). Calendar events are stored in their Google Calendar. Data survives application restarts; protect the database and configure backups in your hosting environment.

Recurring budget splits use MongoDB transactions and require a replica set or sharded deployment (including MongoDB Atlas). For local development, configure a replica set; an unsupported transaction returns an error without saving either half.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Google OAuth security configuration

The backend uses Google OpenID Connect authorization-code flow with PKCE, state, and nonce. Configure these exact redirect URIs in the Google Cloud OAuth client:

- `http://localhost:5000/auth/google/callback`
- `http://localhost:5000/auth/google/calendar/callback`

Replace the host with the production value from `BACKEND_PUBLIC_URL`. Redirect URIs must match exactly.

Calendar permission is requested separately from sign-in at `/auth/google/calendar`. The production frontend and backend must use HTTPS. Keep `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `TOKEN_ENCRYPTION_KEY`, and `MONGODB_URI` in the deployment secret manager.

### Cross-Account Protection

Enable the RISC API in the same Google Cloud project as the OAuth client, create the required service account, and register the HTTPS receiver:

`POST https://your-api.example.com/security-events`

The receiver validates Google-signed security event tokens, deduplicates `jti`, revokes local sessions, and removes affected Google tokens. Follow Google's current registration steps at https://developers.google.com/identity/protocols/risc. RISC signals are intended for security, anti-fraud, and session-management purposes only.

## License

MIT License
