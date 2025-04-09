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
ARG FRONTEND_ENV_FILE=frontend/.env.production
ARG GEMINI_API_KEY
ARG GEMINI_MODEL

# Print debug information about environment files
RUN echo "Checking for backend env file: $BACKEND_ENV_FILE"
RUN if [ -f "$BACKEND_ENV_FILE" ]; then echo "Backend env file exists"; else echo "Backend env file does not exist"; fi

# Copy environment files if they exist and are different from the default destination
RUN if [ -f "$BACKEND_ENV_FILE" ] && [ "$BACKEND_ENV_FILE" != "backend/.env" ]; then cp $BACKEND_ENV_FILE backend/.env; echo "Copied $BACKEND_ENV_FILE to backend/.env"; fi

# Make sure GEMINI_MODEL is set in the environment file
RUN if [ ! -z "$GEMINI_MODEL" ]; then \
      grep -q "GEMINI_MODEL=" backend/.env || echo "GEMINI_MODEL=$GEMINI_MODEL" >> backend/.env; \
      sed -i "s|GEMINI_MODEL=.*|GEMINI_MODEL=$GEMINI_MODEL|" backend/.env; \
    else \
      grep -q "GEMINI_MODEL=" backend/.env || echo "GEMINI_MODEL=gemini-1.5-pro" >> backend/.env; \
    fi

# Make sure GEMINI_API_KEY is set in the environment file
RUN if [ ! -z "$GEMINI_API_KEY" ]; then \
      grep -q "GEMINI_API_KEY=" backend/.env || echo "GEMINI_API_KEY=$GEMINI_API_KEY" >> backend/.env; \
      sed -i "s|GEMINI_API_KEY=.*|GEMINI_API_KEY=$GEMINI_API_KEY|" backend/.env; \
    fi

# Display environment settings (masked for security)
RUN echo "Using Gemini settings:" && grep "GEMINI" backend/.env | sed 's/GEMINI_API_KEY=.*/GEMINI_API_KEY=****/g'

# Set up frontend environment
RUN if [ -f "$FRONTEND_ENV_FILE" ] && [ "$FRONTEND_ENV_FILE" != "frontend/.env" ]; then cp $FRONTEND_ENV_FILE frontend/.env; fi

# Debug frontend environment
RUN echo "=== Frontend Environment ===" && ls -la frontend && echo "===================="

# Build frontend with Vite
WORKDIR /usr/src/app/frontend
RUN npm run build:no-check

# Debug frontend build output with more detailed information
WORKDIR /usr/src/app
RUN echo "=== Frontend Build Output ===" && ls -la frontend/dist || echo "frontend/dist directory not found" && echo "============================"
RUN if [ -d "frontend/dist/assets" ]; then echo "=== Frontend Assets Directory ===" && ls -la frontend/dist/assets && echo "============================="; fi
RUN if [ -d "frontend/dist" ]; then echo "=== Frontend dist contents recursive ===" && find frontend/dist -type f | sort && echo "============================="; fi

# Create public directory in backend for frontend assets
RUN mkdir -p backend/public

# Copy frontend build to backend/public with more verification
RUN cp -r frontend/dist/* backend/public/ || { echo "Failed to copy frontend/dist to backend/public"; exit 1; }

# Make sure index.html exists in backend/public
RUN if [ ! -f "backend/public/index.html" ]; then echo "ERROR: index.html not found in backend/public"; exit 1; fi

# Debug backend public directory with more detailed information
RUN echo "=== Backend Public Directory ===" && ls -la backend/public && echo "================================="
RUN if [ -d "backend/public/assets" ]; then echo "=== Backend Public Assets Directory ===" && ls -la backend/public/assets && echo "===================================="; fi
RUN echo "=== Backend public contents recursive ===" && find backend/public -type f | sort && echo "=============================";

# Build backend with TypeScript
WORKDIR /usr/src/app/backend
RUN npm run build

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

# Debug the public directory in production stage
RUN echo "=== Production Public Directory ===" && ls -la public && echo "==================================="
RUN if [ -d "public/assets" ]; then echo "=== Production Public Assets Directory ===" && ls -la public/assets && echo "=========================================="; fi
RUN echo "=== Production public contents recursive ===" && find public -type f | sort && echo "=============================";

# Verify index.html exists in the final image
RUN if [ ! -f "public/index.html" ]; then echo "ERROR: index.html not found in final image"; exit 1; fi

# Copy .env file explicitly
COPY --from=build /usr/src/app/backend/.env ./.env
RUN echo "Checking environment in final image:" && cat .env | grep -E "BIGQUERY|GEMINI" | sed 's/GEMINI_API_KEY=.*/GEMINI_API_KEY=****/g'

# Set environment variables explicitly to override any default values in code
ENV BIGQUERY_DATASET=raves_us
ENV BIGQUERY_TABLE=release_notes
ENV GOOGLE_CLOUD_PROJECT=raves-altostrat
ENV GEMINI_API_KEY=$GEMINI_API_KEY
ENV GEMINI_MODEL=$GEMINI_MODEL

# Expose port
EXPOSE 5173

# Start the application with explicit host binding and log environment variables
CMD ["sh", "-c", "echo 'Starting with:' && env | grep -E 'BIGQUERY|GEMINI' | sed 's/GEMINI_API_KEY=.*/GEMINI_API_KEY=****/g' && node dist/index.js --host 0.0.0.0"] 