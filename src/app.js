const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/payments',     require('./routes/payments'));
app.use('/api/services',     require('./routes/services'));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'Beauty Parlor Management API' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error.' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Beauty Parlor API running on http://localhost:${PORT}`);
  });
}

module.exports = app;  // export for supertest
