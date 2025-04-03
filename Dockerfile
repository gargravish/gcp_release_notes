# Build stage
FROM node:20-alpine as build

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm install
RUN cd backend && npm install
RUN cd frontend && npm install

# Copy source code
COPY . .

# Use a build arg to specify the environment file to use
ARG BACKEND_ENV_FILE=backend/.env.prod
ARG FRONTEND_ENV_FILE=frontend/.env.example
ARG GEMINI_API_KEY
ARG GEMINI_MODEL

# Print debug information about environment files
RUN echo "Checking for backend env file: $BACKEND_ENV_FILE"
RUN if [ -f "$BACKEND_ENV_FILE" ]; then echo "Backend env file exists"; else echo "Backend env file does not exist"; fi

# Copy environment files if they exist and are different from the default destination
RUN if [ -f "$BACKEND_ENV_FILE" ] && [ "$BACKEND_ENV_FILE" != "backend/.env" ]; then cp $BACKEND_ENV_FILE backend/.env; echo "Copied $BACKEND_ENV_FILE to backend/.env"; cat backend/.env | grep -E "BIGQUERY|GEMINI"; fi
RUN if [ -f "$FRONTEND_ENV_FILE" ] && [ "$FRONTEND_ENV_FILE" != "frontend/.env" ]; then cp $FRONTEND_ENV_FILE frontend/.env; fi

# Build frontend (using no-check to bypass TypeScript errors for now)
RUN cd frontend && npm run build:no-check

# Create public directory in backend for frontend assets
RUN mkdir -p backend/public

# Copy frontend build to backend/public
RUN cp -r frontend/dist/* backend/public/

# Build backend
RUN cd backend && npm run build

# Production stage
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Receive build args
ARG GEMINI_API_KEY
ARG GEMINI_MODEL

# Copy package files for backend only (we only need backend in production)
COPY backend/package*.json ./

# Install production dependencies only
RUN npm install --only=production

# Copy built app
COPY --from=build /usr/src/app/backend/dist ./dist
COPY --from=build /usr/src/app/backend/public ./public

# Copy .env file explicitly
COPY --from=build /usr/src/app/backend/.env ./.env
RUN echo "Checking environment in final image:" && cat .env | grep -E "BIGQUERY|GEMINI"

# Set environment variables explicitly to override any default values in code
ENV BIGQUERY_DATASET=raves_us
ENV BIGQUERY_TABLE=release_notes
ENV GOOGLE_CLOUD_PROJECT=raves-altostrat
ENV GEMINI_API_KEY=$GEMINI_API_KEY
ENV GEMINI_MODEL=$GEMINI_MODEL

# Expose port
EXPOSE 5173

# Start the application with explicit host binding and log environment variables
CMD ["sh", "-c", "echo 'Starting with:' && env | grep -E 'BIGQUERY|GEMINI' && node dist/index.js --host 0.0.0.0"] 