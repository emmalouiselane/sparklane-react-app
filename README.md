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
5. All data is stored in memory and will reset when the server restarts

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License