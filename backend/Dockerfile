FROM node:18-alpine

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm install

# Copy the rest of the application code
COPY . .

# Create .env file if it doesn't exist
RUN touch .env

# Expose port
EXPOSE 5000

# Start the app
CMD ["npm", "start"]
