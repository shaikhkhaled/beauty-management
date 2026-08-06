const db = require('../db/connection');

async function getAllServices(req, res) {
  try {
    const rows = await db.query('SELECT * FROM services ORDER BY category, name');
    return res.status(200).json({ services: rows });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

async function getServiceById(req, res) {
  try {
    const rows = await db.query('SELECT * FROM services WHERE id = ?', [req.params.id]);
    if (rows.length === 0)
      return res.status(404).json({ error: 'Service not found.' });
    return res.status(200).json({ service: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

async function createService(req, res) {
  try {
    const { name, category, price, duration_min } = req.body;
    if (!name || !category || !price || !duration_min)
      return res.status(400).json({ error: 'name, category, price, and duration_min are required.' });

    if (Number(price) <= 0)
      return res.status(400).json({ error: 'price must be a positive number.' });

    const result = await db.query(
      'INSERT INTO services (name, category, price, duration_min) VALUES (?,?,?,?)',
      [name, category, price, duration_min]
    );
    return res.status(201).json({ message: 'Service created.', serviceId: result.insertId });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

async function getAllStaff(req, res) {
  try {
    const rows = await db.query('SELECT id, full_name, specialty, phone FROM staff ORDER BY full_name');
    return res.status(200).json({ staff: rows });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { getAllServices, getServiceById, createService, getAllStaff };
