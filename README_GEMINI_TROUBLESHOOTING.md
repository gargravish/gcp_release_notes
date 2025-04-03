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

## Configuration Changes

### Updated API Key Configuration

1. Make sure you have a valid Gemini API key in your `.env.prod` file:

```
GEMINI_API_KEY=your_actual_api_key_here
```

2. Use one of the recommended Gemini models:

```
# Choose one of these models:
GEMINI_MODEL=gemini-2.0-flash
#GEMINI_MODEL=gemini-2.5-pro-exp-03-25
```

### Network Configuration

Ensure that your Google Cloud Compute Engine VM:
- Has the necessary IAM permissions to access the Gemini API
- Has outbound internet access to `*.googleapis.com` domains
- Is not blocked by a firewall or proxy

### API Errors & Debugging

The application now provides improved error messages in the logs:
- Check VM logs using `sudo journalctl -u your-service-name -f` 
- Look for specific error responses like 403 (permission denied) or 404 (model not found)

## Deployment Steps

1. After making changes to the code, rebuild and restart the application:

```bash
# Navigate to your application directory
cd /path/to/Data_Dashboard

# Pull the latest changes
git pull

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