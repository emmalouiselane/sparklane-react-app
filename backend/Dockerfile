FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create .env file if it doesn't exist
RUN touch .env

# Expose port
EXPOSE 5000

# Start the app
CMD ["npm", "start"]
