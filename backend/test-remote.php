<?php
$dsn = 'mysql:host=172.20.250.202;port=3306;dbname=riskhospital';
$username = 'wangchao';
$password = 'wangchao27443';

try {
    $db = new PDO($dsn, $username, $password);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $stmt = $db->query('SELECT * FROM user WHERE username = "panupong"');
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "Found user panupong:\n";
    print_r($user);
    
} catch (PDOException $e) {
    echo 'Connection failed: ' . $e->getMessage();
}
