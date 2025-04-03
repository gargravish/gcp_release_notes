#!/bin/bash

# Script to update the Gemini API key and model in the .env.prod file

# Default values
ENV_FILE="../backend/.env.prod"
API_KEY=""
MODEL=""

# Display usage information
show_usage() {
  echo "Usage: $0 --key=YOUR_API_KEY [--model=YOUR_MODEL] [--env-file=PATH_TO_ENV_FILE]"
  echo ""
  echo "Options:"
  echo "  --key=KEY         Gemini API key (required)"
  echo "  --model=MODEL     Gemini model to use (optional)"
  echo "  --env-file=PATH   Path to env file (defaults to ../backend/.env.prod)"
  echo ""
  echo "Examples:"
  echo "  $0 --key=AIzaSyAy8Bps0Jd2BtGCgyFkTuxAR4FJLrpD4HA"
  echo "  $0 --key=AIzaSyAy8Bps0Jd2BtGCgyFkTuxAR4FJLrpD4HA --model=gemini-1.5-pro"
  exit 1
}

# Parse command line arguments
for arg in "$@"; do
  case $arg in
    --key=*)
      API_KEY="${arg#*=}"
      ;;
    --model=*)
      MODEL="${arg#*=}"
      ;;
    --env-file=*)
      ENV_FILE="${arg#*=}"
      ;;
    --help|-h)
      show_usage
      ;;
    *)
      echo "Unknown option: $arg"
      show_usage
      ;;
  esac
done

# Check if API key was provided
if [ -z "$API_KEY" ]; then
  echo "Error: API key is required."
  show_usage
fi

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
  echo "Error: Environment file $ENV_FILE not found."
  exit 1
fi

# Make backup of current env file
BACKUP_FILE="$ENV_FILE.backup.$(date +%Y%m%d%H%M%S)"
cp "$ENV_FILE" "$BACKUP_FILE"
echo "Created backup at $BACKUP_FILE"

# Update the API key in the env file
sed -i "s|GEMINI_API_KEY=.*|GEMINI_API_KEY=$API_KEY|" "$ENV_FILE"
echo "Updated GEMINI_API_KEY in $ENV_FILE"

# Update the model if provided
if [ ! -z "$MODEL" ]; then
  # Check if GEMINI_MODEL line exists
  if grep -q "GEMINI_MODEL=" "$ENV_FILE"; then
    # Replace existing GEMINI_MODEL line
    sed -i "s|GEMINI_MODEL=.*|GEMINI_MODEL=$MODEL|" "$ENV_FILE"
  else
    # Add GEMINI_MODEL line
    echo "GEMINI_MODEL=$MODEL" >> "$ENV_FILE"
  fi
  echo "Updated GEMINI_MODEL in $ENV_FILE to $MODEL"
fi

# Display current configuration
echo ""
echo "Current configuration:"
echo "---------------------"
grep "GEMINI_" "$ENV_FILE"
echo "---------------------"

# Suggest next steps
echo ""
echo "Next steps:"
echo "1. Rebuild and restart the application:"
echo "   cd .."
echo "   npm run build"
echo "   sudo systemctl restart your-service-name"
echo ""
echo "2. Check logs for errors:"
echo "   sudo journalctl -u your-service-name -f" 