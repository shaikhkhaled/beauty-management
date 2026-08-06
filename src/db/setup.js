const { getPool } = require('./connection');
require('dotenv').config();

async function setup() {
  const pool = getPool();
  const conn = await pool.getConnection();

  console.log('Creating tables...');

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      full_name   VARCHAR(100) NOT NULL,
      email       VARCHAR(150) NOT NULL UNIQUE,
      phone       VARCHAR(20)  NOT NULL,
      password    VARCHAR(255) NOT NULL,
      role        ENUM('customer','admin','staff') DEFAULT 'customer',
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS staff (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      full_name  VARCHAR(100) NOT NULL,
      specialty  VARCHAR(100),
      phone      VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS services (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      name        VARCHAR(100) NOT NULL,
      category    VARCHAR(100) NOT NULL,
      price       DECIMAL(10,2) NOT NULL,
      duration_min INT NOT NULL,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS appointments (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      user_id      INT NOT NULL,
      staff_id     INT NOT NULL,
      service_id   INT NOT NULL,
      appt_date    DATE NOT NULL,
      appt_time    TIME NOT NULL,
      status       ENUM('pending','confirmed','cancelled','completed') DEFAULT 'pending',
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id)    REFERENCES users(id),
      FOREIGN KEY (staff_id)   REFERENCES staff(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS payments (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      appointment_id INT NOT NULL UNIQUE,
      amount         DECIMAL(10,2) NOT NULL,
      method         ENUM('cash','card','upi') DEFAULT 'cash',
      status         ENUM('pending','completed','failed','refunded') DEFAULT 'pending',
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    )
  `);

  // Seed default staff and services
  await conn.execute(`
    INSERT IGNORE INTO staff (id, full_name, specialty, phone)
    VALUES (1,'Priya Sharma','Hair & Styling','9876543210'),
           (2,'Anjali Mehta','Skin & Beauty','9876543211'),
           (3,'Rekha Joshi','Nails & Makeup','9876543212')
  `);

  await conn.execute(`
    INSERT IGNORE INTO services (id, name, category, price, duration_min)
    VALUES (1,'Haircut & Styling','Hair',500,45),
           (2,'Facial Treatment','Skin',800,60),
           (3,'Manicure & Pedicure','Nails',600,50),
           (4,'Bridal Makeup','Makeup',5000,120),
           (5,'Hair Coloring','Hair',1500,90)
  `);

  conn.release();
  console.log('Database setup complete!');
  process.exit(0);
}

setup().catch(err => { console.error(err); process.exit(1); });
