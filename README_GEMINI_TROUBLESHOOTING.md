# Gemini API Troubleshooting Guide

This guide addresses common issues with the Gemini API integration in the GCP Release Notes Dashboard application.

## Common Issues

### 1. AI Summary Error: "Could not extract text from the Gemini API response"

This error typically occurs when:
- The Gemini API key is invalid or missing
- The selected Gemini model is unavailable or deprecated
- Network connectivity issues between your server and the Gemini API
- API rate limiting or quota issues

### 2. Application Reloads When Generating Summary

The application has been updated to handle summary generation asynchronously without reloading the entire application.

### 3. Docker Build TypeScript Errors

You might encounter TypeScript errors during Docker builds like:
```
src/services/gemini.service.ts:21:5: error TS2322: Type 'string | undefined' is not assignable to type 'string'.
```

This typically happens when:
- The GEMINI_MODEL environment variable is not properly set
- TypeScript strict checking is detecting potential undefined values

## Environment Variable Configuration

The application is designed to **only** use environment variables for API key and model configuration. No hardcoded values are used.

### Proper Configuration

1. Make sure both GEMINI_API_KEY and GEMINI_MODEL are set in your `.env.prod` file:

```
GEMINI_API_KEY=your_actual_api_key_here
GEMINI_MODEL=gemini-1.5-pro
```

2. Never use hardcoded values directly in code. All configuration should come from the .env file.

3. Use the provided scripts to manage environment variables:

```bash
# To update your API key and model
./scripts/update_api_key.sh --key=YOUR_API_KEY --model=gemini-1.5-pro

# To verify your environment variables are properly set
./scripts/verify_env.sh
```

### Docker Build Configuration

When building with Docker, make sure to:

1. Pass the Gemini API key and model as build arguments:

```bash
docker build \
  --build-arg GEMINI_API_KEY=your_api_key \
  --build-arg GEMINI_MODEL=gemini-1.5-pro \
  -t gcp-release-notes-dashboard:local .
```

2. Use the build-and-run.sh script which automatically handles environment variables:

```bash
./build-and-run.sh
```

### Recommended Gemini Models

Use one of these recommended models:
- `gemini-1.5-pro` - Stable, widely available model
- `gemini-2.0-flash` - Fast, newer model for quick responses
- `gemini-2.5-pro-exp-03-25` - Experimental preview model

## Network Configuration

Ensure that your Google Cloud Compute Engine VM:
- Has the necessary IAM permissions to access the Gemini API
- Has outbound internet access to `*.googleapis.com` domains
- Is not blocked by a firewall or proxy

## API Errors & Debugging

The application now provides improved error messages in the logs:
- Check VM logs using `sudo journalctl -u your-service-name -f` 
- Look for specific error responses like 403 (permission denied) or 404 (model not found)
- Check for messages indicating missing environment variables

## Deployment Steps

1. After making changes to the code, rebuild and restart the application:

```bash
# Navigate to your application directory
cd /path/to/Data_Dashboard

# Pull the latest changes
git pull

# Verify environment variables
./scripts/verify_env.sh

# Rebuild the application
npm run build

# Restart the service
sudo systemctl restart your-service-name
```

2. Check application logs for any errors:

```bash
sudo journalctl -u your-service-name -f
```

## Verifying the Fix

1. Open the dashboard in your browser
2. Select your filters and toggle "Generate Summary"
3. The summary should now generate asynchronously without page reload
4. If errors persist, check the logs for specific error messages

## Additional Resources

- [Gemini API Documentation](https://ai.google.dev/docs/gemini_api_overview)
- [Google Cloud Authentication Guide](https://cloud.google.com/docs/authentication/application-default-credentials)
- [Vertex AI Quotas and Limits](https://cloud.google.com/vertex-ai/docs/quotas) 