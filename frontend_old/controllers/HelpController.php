<?php

namespace frontend\controllers;

use Yii;
use yii\helpers\Url;
use yii\web\Controller;
use yii\db\Query;
use yii\data\ArrayDataProvider;

class HelpController extends Controller {
    
    public function actionIndex()
    {
        return $this->goHome();
    }

// คู่มือการใช้งาน
    public function actionManual() {
        return $this->render('index');
    }
    
    public function actionUserkey() {
        return $this->render('userkey');
    }
    
    public function actionAdminkey() {
        return $this->render('adminkey');
    }
    public function actionTeamkey() {
        return $this->render('teamkey');
    }
    
 // เอกสารวิชาการ   
    public function actionBooks() {
        return $this->render('index2');
    }
    
    public function actionHandbook() {
        return $this->render('handbook1');
    }
    

}

