// This script can be added to the application to force HTTP
// Add this to index.html before other scripts if issues persist

if (window.location.protocol === 'https:') {
  // Redirect to HTTP version of the same URL
  window.location.href = window.location.href.replace('https:', 'http:');
} 