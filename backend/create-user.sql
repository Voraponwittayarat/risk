CREATE USER IF NOT EXISTS 'risk'@'localhost' IDENTIFIED BY 'risk1234';
GRANT ALL PRIVILEGES ON riskhospital.* TO 'risk'@'localhost';
FLUSH PRIVILEGES;
