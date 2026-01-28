USE survey_app;

-- Create family_members table that combines parents and children
CREATE TABLE IF NOT EXISTS family_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  member_type ENUM('parent', 'child') NOT NULL,
  name VARCHAR(255) NOT NULL,
  relationship VARCHAR(50), -- husband, wife, son, daughter, etc.
  mobile VARCHAR(20),
  email VARCHAR(255),
  occupation VARCHAR(255),
  door_no VARCHAR(255),
  street VARCHAR(255),
  district VARCHAR(255),
  state VARCHAR(255),
  pincode VARCHAR(10),
  dob DATE,
  gender ENUM('Male', 'Female', 'Other'),
  photo VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert existing parents data into family_members (without photo columns for now)
INSERT INTO family_members (user_id, member_type, name, relationship, mobile, email, occupation, door_no, street, district, state, pincode)
SELECT u.id, 'parent', p.name, 'husband', p.mobile, p.email, p.occupation, p.door_no, p.street, p.district, p.state, p.pincode
FROM parents p
JOIN users u ON u.parent_id = p.id;

-- Insert wife data (skip if wife_name column doesn't exist)
-- This will be handled manually if needed

-- Insert children data
INSERT INTO family_members (user_id, member_type, name, relationship, occupation, dob, gender)
SELECT u.id, 'child', c.name, CASE WHEN c.gender = 'Male' THEN 'son' ELSE 'daughter' END, c.occupation, c.dob, c.gender
FROM children c
JOIN parents p ON c.parent_id = p.id
JOIN users u ON u.parent_id = p.id;
