# Build stage
FROM node:20-alpine as build

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Use a build arg to specify the environment file to use
ARG ENV_FILE=.env
# Create an empty .env file if it doesn't exist, then copy the specified env file if it exists
RUN touch .env && if [ -f "$ENV_FILE" ]; then cp $ENV_FILE .env; fi

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --only=production

# Copy built app
COPY --from=build /usr/src/app/dist ./dist

# Copy .env file (it will exist now even if empty)
COPY --from=build /usr/src/app/.env ./.env

# Expose port
EXPOSE 8080

# Start the application
CMD ["node", "dist/index.js"] 