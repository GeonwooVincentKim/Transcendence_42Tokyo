import express from 'express';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 8080;

// Serve static files
app.use(express.static(path.join(__dirname, '../web-interface')));

// API endpoint to run tests
app.get('/api/run-tests', async (req, res) => {
  try {
    const { stdout, stderr } = await execAsync('npm test -- --json --outputFile=test-results.json');
    res.json({
      success: true,
      output: stdout,
      error: stderr
    });
  } catch (error: any) {
    res.json({
      success: false,
      output: error.stdout,
      error: error.stderr
    });
  }
});

// API endpoint to get test results
app.get('/api/test-results', (req, res) => {
  try {
    const fs = require('fs');
    const resultsPath = path.join(__dirname, '../test-results.json');
    
    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      res.json(results);
    } else {
      res.json({ message: 'No test results available' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to read test results' });
  }
});

// API endpoint to get project status
app.get('/api/status', async (req, res) => {
  try {
    const services = {
      backend: 'http://backend:8000',
      frontend: 'http://frontend:80',
      tester: 'http://localhost:8080'
    };

    const status = {};
    
    for (const [service, url] of Object.entries(services)) {
      try {
        const response = await fetch(url);
        status[service] = {
          status: 'running',
          code: response.status
        };
      } catch (error) {
        status[service] = {
          status: 'down',
          error: error.message
        };
      }
    }

    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check service status' });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../web-interface/index.html'));
});

app.listen(PORT, () => {
  console.log(`Tester service running on port ${PORT}`);
  console.log(`Access the test interface at http://localhost:${PORT}`);
});
