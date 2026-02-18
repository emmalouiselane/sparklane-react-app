#!/bin/bash
echo "Testing Docker build locally..."
docker build -t test-backend .
echo "Running container to test..."
docker run --rm test-backend ls -la /app/
