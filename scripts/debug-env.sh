#!/bin/bash

# Debug script to check environment variables in the container

echo "========== ENVIRONMENT VARIABLES DEBUG =========="
echo "Checking for BigQuery environment variables..."
env | grep -E 'BIGQUERY|DATABASE|DATASET'

echo "========== CONTAINER FILE SYSTEM =========="
echo "Checking for .env file in root directory..."
ls -la / | grep -E '\.env'
echo "Checking for .env file in app directory..."
ls -la /usr/src/app | grep -E '\.env'

echo "========== CONTENT OF ENV FILES =========="
if [ -f "/usr/src/app/.env" ]; then
  echo "Content of /usr/src/app/.env:"
  cat /usr/src/app/.env
fi

echo "========== CONFIG FROM NODE =========="
echo "Running a simple Node script to print config..."
node -e "const dotenv = require('dotenv'); dotenv.config(); console.log('BIGQUERY_DATASET from process.env:', process.env.BIGQUERY_DATASET); console.log('NODE_ENV:', process.env.NODE_ENV);"

echo "========== END DEBUG ==========" 