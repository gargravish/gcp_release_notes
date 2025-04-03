#!/bin/bash

CONTAINER_ID=$(docker ps -q --filter ancestor=gcp-release-notes-dashboard:local)

if [ -z "$CONTAINER_ID" ]; then
  echo "No running container found. Start the container first."
  exit 1
fi

echo "========================================"
echo "CONTAINER ENVIRONMENT VARIABLES"
echo "========================================"
docker exec $CONTAINER_ID env | grep -E "BIGQUERY|NODE_ENV|PORT|GOOGLE"

echo "========================================"
echo "CONTAINER ENV FILE CONTENT"
echo "========================================"
docker exec $CONTAINER_ID cat .env || echo "No .env file found"

echo "========================================"
echo "CHECKING BIGQUERY CONNECTION"
echo "========================================"
docker exec $CONTAINER_ID node -e "
const {BigQuery} = require('@google-cloud/bigquery');
const bigquery = new BigQuery({projectId: process.env.GOOGLE_CLOUD_PROJECT});

console.log('Project ID:', process.env.GOOGLE_CLOUD_PROJECT);
console.log('Dataset:', process.env.BIGQUERY_DATASET || 'google_cloud_release_notes');
console.log('Table:', process.env.BIGQUERY_TABLE || 'release_notes');

async function testConnection() {
  try {
    // List datasets
    console.log('Attempting to list datasets...');
    const [datasets] = await bigquery.getDatasets();
    console.log('Datasets found:');
    datasets.forEach(dataset => console.log('- ' + dataset.id));
    
    // Check if our dataset exists
    const datasetName = process.env.BIGQUERY_DATASET || 'google_cloud_release_notes';
    const [datasetExists] = await bigquery.dataset(datasetName).exists();
    console.log('Dataset', datasetName, 'exists:', datasetExists);
    
    if (datasetExists) {
      // List tables in the dataset
      const [tables] = await bigquery.dataset(datasetName).getTables();
      console.log('Tables in dataset', datasetName + ':');
      tables.forEach(table => console.log('- ' + table.id));
      
      // Check if our table exists
      const tableName = process.env.BIGQUERY_TABLE || 'release_notes';
      const [tableExists] = await bigquery.dataset(datasetName).table(tableName).exists();
      console.log('Table', tableName, 'exists:', tableExists);
      
      if (tableExists) {
        // Run a sample query
        console.log('Running sample query...');
        const query = \`SELECT COUNT(*) as count FROM \${datasetName}.\${tableName}\`;
        const [rows] = await bigquery.query({query, location: 'US'});
        console.log('Query result:', rows[0].count, 'rows found');
      }
    }
  } catch (error) {
    console.error('BigQuery connection test failed:', error);
  }
}

testConnection();
"

echo "========================================"
echo "API TEST"
echo "========================================"
curl -s http://localhost:5173/api/health
echo
curl -s http://localhost:5173/api/products
echo

echo "========================================"
echo "LOGS FROM CONTAINER"
echo "========================================"
docker logs --tail 50 $CONTAINER_ID 