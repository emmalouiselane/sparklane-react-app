# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Copy the entire frontend folder contents
COPY . .

# Install dependencies
RUN npm ci --only=production

# Build the app
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy build from build stage
COPY --from=build /app/build ./build

# Expose port
EXPOSE 3000

# Start the app
CMD ["serve", "-s", "build", "-l", "3000"]
