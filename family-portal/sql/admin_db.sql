USE admin_db;

-- Sample INSERTS for family table
INSERT INTO family (name, wife_name, husband_photo, wife_photo, mobile, email, occupation, door_no, street, district, state, pincode) VALUES
('Rajesh Kumar','Sangeeta Kumar','photos/rajesh1.jpg','photos/sangeeta1.jpg','9876543210','','Engineer','12A','MG Road','Bangalore','Karnataka','560001'),
('Amit Sharma','Priya Sharma','photos/amit1.jpg','photos/priya1.jpg','9123456780','','Teacher','45','Park Street','Kolkata','West Bengal','700016'),
('Vikram Singh','Anjali Singh','photos/vikram1.jpg','photos/anjali1.jpg','9988776655','','Doctor','78','Civil Lines','Jaipur','Rajasthan','302001'),
('Suresh Reddy','Lakshmi Reddy','photos/suresh1.jpg','photos/lakshmi1.jpg','9876512340','','Business','23','MG Road','Hyderabad','Telangana','500001'),
('Manoj Patel','Neha Patel','photos/manoj1.jpg','photos/neha1.jpg','9567891230','','Banker','56','Ashok Nagar','Ahmedabad','Gujarat','380015'),
('Ravi Nair','Anu Nair','photos/ravi1.jpg','photos/anu1.jpg','9871234567','','Software Engineer','34','Marine Drive','Kochi','Kerala','682016'),
('Arun Verma','Pooja Verma','photos/arun1.jpg','photos/pooja1.jpg','9123459876','','Lawyer','67','Sector 12','Gurgaon','Haryana','122001'),
('Karan Mehta','Ritika Mehta','photos/karan1.jpg','photos/ritika1.jpg','9988771122','','Professor','21','Connaught Place','Delhi','Delhi','110001'),
('Sanjay Yadav','Renu Yadav','photos/sanjay1.jpg','photos/renu1.jpg','9876541122','','Farmer','89','MG Road','Patna','Bihar','800001'),
('Ajay Gupta','Neelam Gupta','photos/ajay1.jpg','photos/neelam1.jpg','9123451122','','Entrepreneur','12','Civil Lines','Lucknow','Uttar Pradesh','226001'),
('Rahul Deshmukh','Seema Deshmukh','photos/rahul1.jpg','photos/seema1.jpg','9988773344','','Engineer','77','Shivaji Nagar','Pune','Maharashtra','411005'),
('Vijay Joshi','Sunita Joshi','photos/vijay1.jpg','photos/sunita1.jpg','9876547788','','Teacher','14','MG Road','Jaipur','Rajasthan','302002'),
('Deepak Kumar','Richa Kumar','photos/deepak1.jpg','photos/richa1.jpg','9123456677','','Doctor','56','Park Street','Kolkata','West Bengal','700017'),
('Praveen Rao','Divya Rao','photos/praveen1.jpg','photos/divya1.jpg','9988775566','','Software Engineer','9','Marine Drive','Bangalore','Karnataka','560002'),
('Siddharth Choudhary','Ankita Choudhary','photos/siddharth1.jpg','photos/ankita1.jpg','9876511123','','Business','33','Sector 5','Gurgaon','Haryana','122002'),
('Anil Kapoor','Rashmi Kapoor','photos/anil1.jpg','photos/rashmi1.jpg','9123457788','','Banker','45','Connaught Place','Delhi','Delhi','110002'),
('Nitin Sharma','Sunita Sharma','photos/nitin1.jpg','photos/sunita2.jpg','9988778899','','Lawyer','18','Ashok Nagar','Hyderabad','Telangana','500002'),
('Ramesh Yadav','Kiran Yadav','photos/ramesh1.jpg','photos/kiran1.jpg','9876549900','','Farmer','78','MG Road','Patna','Bihar','800002'),
('Mohit Jain','Anjali Jain','photos/mohit1.jpg','photos/anjali2.jpg','9123458899','','Engineer','25','Civil Lines','Lucknow','Uttar Pradesh','226002'),
('Sanjeev Mehra','Pallavi Mehra','photos/sanjeev1.jpg','photos/pallavi1.jpg','9988779900','','Professor','67','Shivaji Nagar','Pune','Maharashtra','411006');

-- Children INSERTS
INSERT INTO children (family_id, child_name, date_of_birth, occupation) VALUES
(1, 'Aarav Kumar', '2010-05-12', 'Student'),
(1, 'Ananya Kumar', '2013-08-23', 'Student'),

(2, 'Rohan Sharma', '2012-03-15', 'Student'),

(3, 'Maya Singh', '2008-11-05', 'Student'),
(3, 'Vivaan Singh', '2011-06-19', 'Student'),
(3, 'Ishita Singh', '2014-01-22', 'Student'),

(4, 'Aditya Reddy', '2009-09-10', 'Student'),

(5, 'Diya Patel', '2013-07-17', 'Student'),
(5, 'Kartik Patel', '2015-02-28', 'Student'),

(6, 'Riya Nair', '2010-12-05', 'Student'),

(7, 'Ansh Verma', '2011-04-22', 'Student'),
(7, 'Saanvi Verma', '2014-09-30', 'Student'),

(8, 'Vihaan Mehta', '2009-05-14', 'Student'),

(9, 'Prisha Yadav', '2012-08-19', 'Student'),

(10, 'Aryan Gupta', '2010-11-01', 'Student'),
(10, 'Aanya Gupta', '2013-03-23', 'Student'),

(11, 'Shiv Deshmukh', '2008-10-12', 'Student'),

(12, 'Meera Joshi', '2011-06-05', 'Student'),

(13, 'Anika Kumar', '2009-01-15', 'Student'),
(13, 'Kian Kumar', '2012-07-22', 'Student'),

(14, 'Ira Rao', '2010-05-19', 'Student'),

(15, 'Neil Choudhary', '2013-03-11', 'Student'),
(15, 'Tara Choudhary', '2015-08-09', 'Student'),

(16, 'Saanvi Kapoor', '2012-02-20', 'Student'),

(17, 'Raghav Sharma', '2010-09-14', 'Student'),

(18, 'Anvi Yadav', '2011-12-03', 'Student'),

(19, 'Kavya Jain', '2013-07-07', 'Student'),
(19, 'Ritvik Jain', '2016-01-21', 'Student'),

(20, 'Ishaan Mehra', '2009-04-28', 'Student'),
(20, 'Diya Mehra', '2012-11-19', 'Student'),
(20, 'Rhea Mehra', '2014-08-12', 'Student');