USE admin_db;

-- Create parents table first
CREATE TABLE IF NOT EXISTS parents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  wife_name VARCHAR(255),
  mobile VARCHAR(20),
  email VARCHAR(255),
  occupation VARCHAR(255),
  door_no VARCHAR(255),
  street VARCHAR(255),
  district VARCHAR(255),
  state VARCHAR(255),
  pincode VARCHAR(10),
  husband_photo VARCHAR(255),
  wife_photo VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  parent_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE SET NULL
);

-- Create children table
CREATE TABLE IF NOT EXISTS children (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parent_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  occupation VARCHAR(255),
  dob DATE,
  photo VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE
);
