#!/bin/sh

# Replace ${PORT} in nginx.conf with the actual PORT environment variable value
# If PORT is not set, default to 8080 for Cloud Run
export PORT="${PORT:-8080}"
envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Start Nginx
exec nginx -g 'daemon off;' 