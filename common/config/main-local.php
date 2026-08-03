<?php
return [
    'components' => [
	    'db' => [
           'class' => 'yii\db\Connection',
           'dsn' => 'mysql:host=172.20.250.202;port=3306;dbname=riskhospital',
           'username' => 'wangchao',
           'password' => 'wangchao27443',
            'charset' => 'utf8',
        ], /*
        'mailer' => [ //กำหนดการส่ง Email ผ่าน SMTP ของ Google
            'class' => 'yii\swiftmailer\Mailer',
            'viewPath' => '@common/mail',
            // send all mails to a file by default. You have to set
            // 'useFileTransport' to false and configure a transport
            // for the mailer to send real emails.
            'useFileTransport' => false,
            'transport' => [
                'class' => 'Swift_SmtpTransport',
                'host' => 'smtp.gmail.com',
		'username' => 'natchawee02@gmail.com', //user ทีจะใช้ smtp
                'password' => 'tlpnwbykqsuhjcsx',//รหัสผ่านของ user
                'port' => '587',
                'encryption' => 'tls', //tls:587,ssl:465
            ],
        ],*/
    ],
];
