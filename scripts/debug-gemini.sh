#!/bin/bash

# This script tests the Gemini API directly to verify your API key and model

# Get the API key from environment or file
if [ -n "$GEMINI_API_KEY" ]; then
  API_KEY=$GEMINI_API_KEY
elif [ -f "backend/.env.prod" ]; then
  API_KEY=$(grep "GEMINI_API_KEY" backend/.env.prod | cut -d'=' -f2)
else
  echo "ERROR: No GEMINI_API_KEY found. Please set it in backend/.env.prod or as an environment variable."
  exit 1
fi

# Determine model to use
if [ -n "$GEMINI_MODEL" ]; then
  MODEL=$GEMINI_MODEL
elif [ -f "backend/.env.prod" ] && grep -q "GEMINI_MODEL" backend/.env.prod; then
  MODEL=$(grep "GEMINI_MODEL" backend/.env.prod | cut -d'=' -f2)
else
  MODEL="gemini-1.5-pro"
fi

# Validate model
case "$MODEL" in
  # Standard models
  "gemini-1.5-pro"|"gemini-1.5-flash"|"gemini-pro"|"gemini-1.0-pro"|"gemini-pro-vision")
    echo "Using standard Gemini model: $MODEL"
    ;;
  # Experimental models
  "gemini-2.5-pro-exp-03-25"|"gemini-2.0-flash")
    echo "Using experimental Gemini model: $MODEL"
    echo "Note: Experimental models may have limited availability"
    ;;
  *)
    echo "WARNING: '$MODEL' is not a recognized model name but will be attempted"
    ;;
esac

echo "======================= GEMINI API TEST ======================="
echo "Using model: $MODEL"
echo "API Key (masked): ${API_KEY:0:4}...${API_KEY: -4}"
echo "=============================================================="

# Create a simple API request
PROMPT="Tell me about Google Cloud Platform in 2 short sentences."
ENDPOINT="https://generativelanguage.googleapis.com/v1/models/$MODEL:generateContent?key=$API_KEY"

echo "Testing API with a simple prompt..."
echo "Endpoint: ${ENDPOINT//$API_KEY/API_KEY_MASKED}"

# Send the request
RESPONSE=$(curl -s -X POST $ENDPOINT \
  -H "Content-Type: application/json" \
  -d "{
    \"contents\": [
      {
        \"parts\": [
          {
            \"text\": \"$PROMPT\"
          }
        ]
      }
    ]
  }")

echo "=============================================================="
echo "API Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo "=============================================================="

# Analyze the response
if echo "$RESPONSE" | grep -q "text"; then
  echo "✅ SUCCESS: The API returned a response with text."
elif echo "$RESPONSE" | grep -q "error"; then
  echo "❌ ERROR: The API returned an error."
  ERROR_CODE=$(echo "$RESPONSE" | grep -o '"code": [0-9]*' | awk '{print $2}')
  ERROR_MESSAGE=$(echo "$RESPONSE" | grep -o '"message": "[^"]*"' | sed 's/"message": "//' | sed 's/"//')
  
  echo "Error code: $ERROR_CODE"
  echo "Error message: $ERROR_MESSAGE"
  
  if [[ "$ERROR_MESSAGE" == *"API key"* ]]; then
    echo "This appears to be an API key issue. Please check:"
    echo "1. The API key is correct and active"
    echo "2. Billing is enabled on your Google Cloud project"
    echo "3. The API key has access to the Gemini API"
  elif [[ "$ERROR_MESSAGE" == *"model"* ]]; then
    echo "This appears to be a model issue. Please check:"
    echo "1. The model name is correct ($MODEL)"
    echo "2. The model is available in your region"
    echo "3. Try a different model like 'gemini-pro'"
  fi
else
  echo "⚠️ UNKNOWN RESPONSE: Could not determine if the response was successful."
fi

echo "==============================================================" 