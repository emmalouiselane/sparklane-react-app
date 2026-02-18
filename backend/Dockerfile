FROM node:18-alpine

WORKDIR /app

# Copy all files
COPY . .

# Install dependencies
RUN npm install

# Expose port
EXPOSE 5000

# Start the app
CMD ["node", "server.js"]
