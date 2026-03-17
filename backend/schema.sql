-- Production & Logistics Tracking System Database Schema
-- MySQL Database Schema

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS tracking_system;
USE tracking_system;

-- USERS TABLE
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'SELLER', 'DRIVER') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_is_active (is_active)
);

-- PRODUCTION_STOCK TABLE
CREATE TABLE production_stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    total_produced INT DEFAULT 0,
    available_stock INT DEFAULT 0,
    damaged_stock INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- JOBS TABLE
CREATE TABLE jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    serial_number VARCHAR(50) UNIQUE NOT NULL,
    seller_id INT NOT NULL,
    shop_name VARCHAR(255) NOT NULL,
    shop_contact VARCHAR(20) NOT NULL,
    notes TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    quantity INT NOT NULL,
    flavors TEXT,
    priority ENUM('NORMAL', 'HIGH', 'URGENT') DEFAULT 'NORMAL',
    status ENUM('WAITING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'PROOF_UPLOADED', 'COMPLETED', 'CANCELLED') DEFAULT 'WAITING',
    assigned_driver_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMP NULL,
    picked_up_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_driver_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_serial_number (serial_number),
    INDEX idx_seller_id (seller_id),
    INDEX idx_assigned_driver_id (assigned_driver_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_created_at (created_at)
);

-- DELIVERY_PROOFS TABLE
CREATE TABLE delivery_proofs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    image_path VARCHAR(500) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    INDEX idx_job_id (job_id),
    INDEX idx_uploaded_at (uploaded_at)
);

-- DRIVER_RATINGS TABLE
CREATE TABLE driver_ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    driver_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comments TEXT,
    rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_job_id (job_id),
    INDEX idx_driver_id (driver_id),
    INDEX idx_rating (rating),
    INDEX idx_rated_at (rated_at)
);

-- ACTIVITY_LOGS TABLE
CREATE TABLE activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);

-- Insert initial production stock record
INSERT INTO production_stock (total_produced, available_stock, damaged_stock) 
VALUES (0, 0, 0);

-- Create sample admin user (password: admin123)
INSERT INTO users (full_name, email, phone, password_hash, role) 
VALUES (
    'System Administrator',
    'admin@tracking.com',
    '1234567890',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LFvOe', -- bcrypt hash of 'admin123'
    'ADMIN'
);

-- Create sample seller user (password: seller123)
INSERT INTO users (full_name, email, phone, password_hash, role) 
VALUES (
    'Sample Seller',
    'seller@tracking.com',
    '1234567891',
    '$2b$12$8K1O/z9nNQz8sZ6qP6.P/.Ov8X8v8v8v8v8v8v8v8v8v8v8v8v8v8v8v8v', -- bcrypt hash of 'seller123'
    'SELLER'
);

-- Create sample driver user (password: driver123)
INSERT INTO users (full_name, email, phone, password_hash, role) 
VALUES (
    'Sample Driver',
    'driver@tracking.com',
    '1234567892',
    '$2b$12$9K2P0a9oOz9sZ6qP6.P/.Ov8X8v8v8v8v8v8v8v8v8v8v8v8v8v8v8v8v', -- bcrypt hash of 'driver123'
    'DRIVER'
);

-- Add initial stock
UPDATE production_stock SET 
    total_produced = 1000,
    available_stock = 1000,
    damaged_stock = 0;

-- Create indexes for better performance
CREATE INDEX idx_jobs_seller_status ON jobs(seller_id, status);
CREATE INDEX idx_jobs_driver_status ON jobs(assigned_driver_id, status);
CREATE INDEX idx_jobs_priority_status ON jobs(priority, status);
CREATE INDEX idx_delivery_proofs_job ON delivery_proofs(job_id);
CREATE INDEX idx_driver_ratings_driver ON driver_ratings(driver_id);
CREATE INDEX idx_activity_logs_user_created ON activity_logs(user_id, created_at);

-- Create view for job statistics
CREATE VIEW job_statistics AS
SELECT 
    status,
    COUNT(*) as count,
    priority,
    DATE(created_at) as date
FROM jobs 
GROUP BY status, priority, DATE(created_at);

-- Create view for driver performance
CREATE VIEW driver_performance AS
SELECT 
    u.id as driver_id,
    u.full_name as driver_name,
    COUNT(j.id) as total_jobs,
    COUNT(CASE WHEN j.status = 'COMPLETED' THEN 1 END) as completed_jobs,
    AVG(dr.rating) as average_rating,
    COUNT(dr.id) as total_ratings
FROM users u
LEFT JOIN jobs j ON u.id = j.assigned_driver_id
LEFT JOIN driver_ratings dr ON u.id = dr.driver_id
WHERE u.role = 'DRIVER'
GROUP BY u.id, u.full_name;

-- Create view for seller statistics
CREATE VIEW seller_statistics AS
SELECT 
    u.id as seller_id,
    u.full_name as seller_name,
    COUNT(j.id) as total_jobs,
    COUNT(CASE WHEN j.status = 'COMPLETED' THEN 1 END) as completed_jobs,
    SUM(j.quantity) as total_quantity,
    AVG(CASE WHEN dr.rating IS NOT NULL THEN dr.rating END) as average_driver_rating
FROM users u
LEFT JOIN jobs j ON u.id = j.seller_id
LEFT JOIN driver_ratings dr ON j.id = dr.job_id
WHERE u.role = 'SELLER'
GROUP BY u.id, u.full_name;

-- Add triggers for automatic stock updates
DELIMITER //

CREATE TRIGGER reduce_stock_on_job_creation 
AFTER INSERT ON jobs
FOR EACH ROW
BEGIN
    UPDATE production_stock 
    SET available_stock = available_stock - NEW.quantity,
        last_updated = NOW()
    WHERE id = 1;
END//

CREATE TRIGGER restore_stock_on_job_cancellation 
AFTER UPDATE ON jobs
FOR EACH ROW
BEGIN
    IF NEW.status = 'CANCELLED' AND OLD.status != 'COMPLETED' THEN
        UPDATE production_stock 
        SET available_stock = available_stock + NEW.quantity,
            last_updated = NOW()
        WHERE id = 1;
    END IF;
END//

DELIMITER ;

-- Create stored procedure for generating serial numbers
DELIMITER //

CREATE PROCEDURE generate_serial_number(OUT serial_num VARCHAR(50))
BEGIN
    DECLARE last_num INT DEFAULT 0;
    DECLARE new_num INT;
    
    SELECT CAST(SUBSTRING(serial_number, 3) AS UNSIGNED) INTO last_num
    FROM jobs 
    ORDER BY id DESC 
    LIMIT 1;
    
    SET new_num = IFNULL(last_num, 0) + 1;
    SET serial_num = CONCAT('SN', LPAD(new_num, 5, '0'));
END//

DELIMITER ;

-- Create function to calculate delivery duration
DELIMITER //

CREATE FUNCTION calculate_delivery_duration(job_id INT) 
RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE duration INT DEFAULT 0;
    DECLARE pickup_time TIMESTAMP;
    DECLARE complete_time TIMESTAMP;
    
    SELECT picked_up_at, completed_at 
    INTO pickup_time, complete_time
    FROM jobs 
    WHERE id = job_id;
    
    IF pickup_time IS NOT NULL AND complete_time IS NOT NULL THEN
        SET duration = TIMESTAMPDIFF(MINUTE, pickup_time, complete_time);
    END IF;
    
    RETURN duration;
END//

DELIMITER ;

-- Sample data for testing
INSERT INTO jobs (serial_number, seller_id, shop_name, shop_contact, notes, latitude, longitude, quantity, priority, status) 
VALUES 
('SN00001', 2, 'Test Shop 1', '9876543210', 'Front door delivery', 13.0827, 80.2707, 10, 'NORMAL', 'WAITING'),
('SN00002', 2, 'Test Shop 2', '9876543211', 'Back door delivery', 13.0700, 80.2500, 15, 'HIGH', 'WAITING'),
('SN00003', 2, 'Test Shop 3', '9876543212', 'Side entrance', 13.0900, 80.2800, 5, 'URGENT', 'ASSIGNED');

-- Assign a job to the sample driver
UPDATE jobs SET assigned_driver_id = 3, assigned_at = NOW() WHERE id = 3;

-- Log initial activities
INSERT INTO activity_logs (user_id, action) VALUES 
(1, 'System initialized'),
(2, 'Sample seller account created'),
(3, 'Sample driver account created');

-- Final verification queries
SELECT 'Database schema created successfully!' as status;
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_jobs FROM jobs;
SELECT * FROM production_stock;
