# Use the official Node.js 18 image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Bundle app source
COPY . .

# Build the app (if needed)
# RUN npm run build

# Expose port
EXPOSE 8080

# Start the application
CMD ["npm", "start"]