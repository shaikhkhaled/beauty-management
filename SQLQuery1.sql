CREATE TABLE Admins (
    admin_id INT IDENTITY(1,1) PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255),
    email VARCHAR(100),
    role VARCHAR(20) CHECK (role IN ('superadmin', 'manager', 'receptionist')) DEFAULT 'manager',
    created_at DATETIME DEFAULT GETDATE()
);