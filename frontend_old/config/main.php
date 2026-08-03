<?php

$params = array_merge(
    require __DIR__ . '/../../common/config/params.php',
    require __DIR__ . '/../../common/config/params-local.php',
    require __DIR__ . '/params.php',
    require __DIR__ . '/params-local.php'
);
return [
    'id' => 'app-frontend',
	'name'=>'โปรแกรมบริหารความเสี่ยงสำหรับโรงพยาบาล Hospital Risk Management System',
    'basePath' => dirname(__DIR__),
    'bootstrap' => ['log'],
    'timeZone' => 'Asia/Bangkok',
    'language'=>'th_TH',
    'controllerNamespace' => 'frontend\controllers',
    'components' => [
        'request' => [
            'csrfParam' => '_csrf-frontend',
        ],
        'user' => [
            //'identityClass' => 'common\models\User',
            'identityClass' => 'dektrium\user\models\User',
            'enableAutoLogin' => true,
            'identityCookie' => ['name' => '_identity-frontend', 'httpOnly' => true],
        ],
        'session' => [
            'class' => '\frontend\components\CustomDbSession',
            // 'db' => 'mydb',  // the application component ID of the DB connection. Defaults to 'db'.
            'sessionTable' => 'session_frontend_user', // session table name. Defaults to 'session'.
        ], 
        'log' => [
            'traceLevel' => YII_DEBUG ? 3 : 0,
            'targets' => [
                [
                    'class' => 'yii\log\FileTarget',
                    'levels' => ['error', 'warning'],
                ],
            ],
        ],
        'errorHandler' => [
            'errorAction' => 'site/error',
        ],
        /*
        'urlManager' => [
            'enablePrettyUrl' => true,
            'showScriptName' => false,
            'rules' => [
            ],
        ],
        */
    ],
    'modules' => [
        'user' => [
        'class' => 'dektrium\user\Module',
        'enableUnconfirmedLogin' => true,
        'enableConfirmation' => false,
        'cost' => 12,
        'confirmWithin' => 21600,
        'cost' => 12,
        'admins' => ['admin','omii','way','sukree']
        ],
        
        'gridview' => [
            'class' => '\kartik\grid\Module'
        ],
        
        'pdfjs' => [
            'class' => '\yii2assets\pdfjs\Module',
        ]
    ],
    'params' => $params,
];
