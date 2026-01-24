# Use Node.js LTS (Alpine for smaller size)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first to leverage cache
COPY package.json ./

# Install dependencies (including devDeps for tsx, or use multi-stage build)
# Since we use tsx in start script, we need it.
RUN npm install

# Copy source code
COPY . .

# Expose port
ENV PORT=3000
EXPOSE 3000

# Start server
CMD ["npm", "start"]
