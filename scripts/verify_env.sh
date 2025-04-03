#!/bin/bash

# Script to verify environment variables are properly set for the Gemini API

ENV_FILE="../backend/.env.prod"

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
  echo "Error: Environment file $ENV_FILE not found."
  exit 1
fi

echo "Checking environment variables in $ENV_FILE..."
echo ""

# Check for Gemini API key
if grep -q "GEMINI_API_KEY=" "$ENV_FILE"; then
  KEY_LINE=$(grep "GEMINI_API_KEY=" "$ENV_FILE")
  
  # Extract key value
  KEY_VALUE=$(echo "$KEY_LINE" | cut -d= -f2)
  
  # Check if key is empty or placeholder
  if [ -z "$KEY_VALUE" ] || [ "$KEY_VALUE" == "YOUR_API_KEY_HERE" ]; then
    echo "❌ GEMINI_API_KEY is not set properly. Current value: '$KEY_VALUE'"
  else
    # Mask key except last 4 chars
    MASKED_KEY="${KEY_VALUE: -4}"
    echo "✅ GEMINI_API_KEY is set (ending with: '...$MASKED_KEY')"
  fi
else
  echo "❌ GEMINI_API_KEY is missing from $ENV_FILE"
fi

# Check for Gemini model
if grep -q "GEMINI_MODEL=" "$ENV_FILE"; then
  MODEL_LINE=$(grep "GEMINI_MODEL=" "$ENV_FILE" | grep -v "#")
  
  # Check if the line is commented out (starts with #)
  if [ -z "$MODEL_LINE" ]; then
    echo "❌ GEMINI_MODEL is commented out or not set"
  else
    # Extract model value
    MODEL_VALUE=$(echo "$MODEL_LINE" | cut -d= -f2)
    
    # Check if model is empty
    if [ -z "$MODEL_VALUE" ]; then
      echo "❌ GEMINI_MODEL is empty"
    else
      echo "✅ GEMINI_MODEL is set to: '$MODEL_VALUE'"
    fi
  fi
else
  echo "❌ GEMINI_MODEL is missing from $ENV_FILE"
fi

echo ""
echo "Reminder: Both GEMINI_API_KEY and GEMINI_MODEL must be properly set in $ENV_FILE"
echo "Use the update_api_key.sh script to set or update these values:"
echo ""
echo "  ./update_api_key.sh --key=YOUR_API_KEY --model=gemini-1.5-pro"
echo "" 