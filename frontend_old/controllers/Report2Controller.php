<?php

namespace frontend\controllers;

use Yii;
use yii\web\Controller;
use yii\db\Query;
use yii\helpers\ArrayHelper;
use yii\data\ActiveDataProvider;
use yii\data\ArrayDataProvider;

//AccessControl
use yii\filters\AccessControl;
use yii\filters\VerbFilter;


// Add User Dektrium
use dektrium\user\filters\AccessRule;
use dektrium\user\Finder;
use dektrium\user\models\Profile;
use dektrium\user\Module;
use dektrium\user\traits\EventTrait;
use dektrium\user\models\User;



class Report2Controller extends Controller{
    
    public $enableCsrfValidation = false;
    public function behaviors() 
    {
        $role = 0;
        if (!Yii::$app->user->isGuest) {
            $role = Yii::$app->user->identity->role;
        }
        $arr = ['index'];
        if ($role != 99) {
            $arr = ['warning','rep01','rep02','report2_detail'];
        }
        return [
            'verbs' => [
                'class' => VerbFilter::className(),
                'actions' => [
                    'switch'  => ['post'],
                ],
            ],
            'access' => [
                'class' => AccessControl::className(),
                'ruleConfig' => [
                    'class' => AccessRule::className(),
                ],
                'only' => ['warning','rep01','rep02','report2_detail'],
                'rules' => [
                    [
                        'allow' => true,
                        'actions' => $arr,
                        'roles' => ['@'],
                    ],
                    [
                        'allow' => true,
                        'roles' => ['admin'],
                    ],
                ],
            ],
        ];
    }
   
    public function actionWarning() {
        return $this->render('warning');
    }

    public function actionRep01($date1=NULL,$date2=NULL,$dep=NULL) {
        
        $sql_date = Yii::$app->db->createCommand('SELECT date FROM set_datetime')->queryOne();
        $date1 =  $sql_date['date'];
        $date2 = date('Y-m-d');
        
        $dep = '1';
        
        if (Yii::$app->request->isPost) {
            $date1 = $_POST['date1'];
            $date2 = $_POST['date2'];
            $dep = $_POST['dep'];
        }
        
        $sql_dep = Yii::$app->db->createCommand("SELECT depart_name FROM department WHERE id='$dep' ")->queryOne();
        $depname =  $sql_dep['depart_name'];
        
        $sql = "SELECT m.member_name
                ,SUM(CASE WHEN r.level_id='A' THEN 1 ELSE 0 END) AS A
                ,SUM(CASE WHEN r.level_id='B' THEN 1 ELSE 0 END) AS B
                ,SUM(CASE WHEN r.level_id='C' THEN 1 ELSE 0 END) AS C
                ,SUM(CASE WHEN r.level_id='D' THEN 1 ELSE 0 END) AS D
                ,SUM(CASE WHEN r.level_id='E' THEN 1 ELSE 0 END) AS E
                ,SUM(CASE WHEN r.level_id='F' THEN 1 ELSE 0 END) AS F
                ,SUM(CASE WHEN r.level_id='G' THEN 1 ELSE 0 END) AS G
                ,SUM(CASE WHEN r.level_id='H' THEN 1 ELSE 0 END) AS H
                ,SUM(CASE WHEN r.level_id='I' THEN 1 ELSE 0 END) AS I
                ,SUM(CASE WHEN r.level_id='1' THEN 1 ELSE 0 END) AS '1'
                ,SUM(CASE WHEN r.level_id='2' THEN 1 ELSE 0 END) AS '2'
                ,SUM(CASE WHEN r.level_id='3' THEN 1 ELSE 0 END) AS '3'
                ,SUM(CASE WHEN r.level_id='4' THEN 1 ELSE 0 END) AS '4'
                ,SUM(CASE WHEN r.level_id='5' THEN 1 ELSE 0 END) AS '5'
                ,COUNT(r.level_id) AS TOTAL

                FROM riskregister r
                LEFT JOIN `user` u ON u.id=r.created_by
                LEFT JOIN member m ON m.cid collate utf8_general_ci=u.cid collate utf8_general_ci
                LEFT JOIN department d ON d.id=r.user_ir
                WHERE r.date_report BETWEEN '$date1'AND '$date2'
                AND r.user_ir = '$dep'
                GROUP BY r.created_by
                ORDER BY TOTAL DESC ";

        $data = Yii::$app->db->createCommand($sql)->queryAll();
        $dataProvider = new ArrayDataProvider([
                'allModels'=>$data,
                'pagination'=>[
                'pageSize'=>100 //แบ่งหน้า
                ]
        ]);

        return $this->render('report1', [
            'dataProvider' => $dataProvider, 
            'date1' => $date1, 
            'date2' => $date2,
            'depname' => $depname,
            'dep' => $dep]);
    } 
    public function actionRep02($date1=NULL,$date2=NULL,$dep=NULL) {
        
        $sql_date = Yii::$app->db->createCommand('SELECT date FROM set_datetime')->queryOne();
        $date1 =  $sql_date['date'];
        $date2 = date('Y-m-d');
        
        $dep = '1';
        
        if (Yii::$app->request->isPost) {
            $date1 = $_POST['date1'];
            $date2 = $_POST['date2'];
            $dep = $_POST['dep'];
        }
        
        $sql_dep = Yii::$app->db->createCommand("SELECT depart_name FROM department WHERE id='$dep' ")->queryOne();
        $depname =  $sql_dep['depart_name'];
        
        $sql = "SELECT r.riskstore_id,t.riskstore_name,COUNT(r.riskstore_id) AS cc
                ,SUM(CASE WHEN r.level_id='A' THEN 1 ELSE 0 END) AS A
                ,SUM(CASE WHEN r.level_id='B' THEN 1 ELSE 0 END) AS B
                ,SUM(CASE WHEN r.level_id='C' THEN 1 ELSE 0 END) AS C
                ,SUM(CASE WHEN r.level_id='D' THEN 1 ELSE 0 END) AS D
                ,SUM(CASE WHEN r.level_id='E' THEN 1 ELSE 0 END) AS E
                ,SUM(CASE WHEN r.level_id='F' THEN 1 ELSE 0 END) AS F
                ,SUM(CASE WHEN r.level_id='G' THEN 1 ELSE 0 END) AS G
                ,SUM(CASE WHEN r.level_id='H' THEN 1 ELSE 0 END) AS H
                ,SUM(CASE WHEN r.level_id='I' THEN 1 ELSE 0 END) AS I
                ,SUM(CASE WHEN r.level_id='1' THEN 1 ELSE 0 END) AS '1'
                ,SUM(CASE WHEN r.level_id='2' THEN 1 ELSE 0 END) AS '2'
                ,SUM(CASE WHEN r.level_id='3' THEN 1 ELSE 0 END) AS '3'
                ,SUM(CASE WHEN r.level_id='4' THEN 1 ELSE 0 END) AS '4'
                ,SUM(CASE WHEN r.level_id='5' THEN 1 ELSE 0 END) AS '5'
                ,COUNT(r.level_id) AS TOTAL
                FROM riskregister r
                LEFT JOIN riskstore t ON t.riskstore_id=r.riskstore_id
                LEFT JOIN department d ON d.id=r.user_ir
                WHERE r.date_report BETWEEN '$date1'AND '$date2'
                AND r.user_ir = '$dep'
                GROUP BY r.riskstore_id
                ORDER BY cc DESC ";

        $data = Yii::$app->db->createCommand($sql)->queryAll();
        $dataProvider = new ArrayDataProvider([
                'allModels'=>$data,
                'pagination' => false,
        ]);

        return $this->render('report2', [
            'dataProvider' => $dataProvider, 
            'date1' => $date1, 
            'date2' => $date2,
            'depname' => $depname,
            'dep' => $dep]);
    }

    public function actionRep02detail($date1=NULL,$date2=NULL,$dep=NULL,$id=NULL) {
        
        if (Yii::$app->user->identity->role != 1 && Yii::$app->user->identity->role != 2) {
            return $this->redirect(['user/security/login']);
            $this->redirect(Yii::$app->urlManager->createAbsoluteUrl('site/login'));
            return $this->goHome();
        }
       
        
        $sql_dep = Yii::$app->db->createCommand("SELECT depart_name FROM department WHERE id='$dep' ")->queryOne();
        $depname =  $sql_dep['depart_name'];
        
        $sql_risk = Yii::$app->db->createCommand("SELECT riskstore_name FROM riskstore WHERE riskstore_id='$id' ")->queryOne();
        $risk_name =  $sql_risk['riskstore_name'];
        
        $sql = "SELECT r.id_risk,CONCAT(r.date_report,' ',r.time_report) AS rep_datetime,r.level_id,r.detail,
                r.edit,r.problem_basic,m.member_name
                FROM riskregister r
                LEFT JOIN riskstore t ON t.riskstore_id=r.riskstore_id
                LEFT JOIN department d ON d.id=r.user_ir
                LEFT JOIN `user` u ON u.id=r.created_by
                LEFT JOIN member m ON m.cid collate utf8_general_ci=u.cid collate utf8_general_ci      
                WHERE r.date_report BETWEEN '$date1'AND '$date2'
                AND r.user_ir = '$dep'
                AND r.riskstore_id= '$id'
                ORDER BY r.date_report ASC ";

        $data = Yii::$app->db->createCommand($sql)->queryAll();
        $dataProvider = new ArrayDataProvider([
                'allModels'=>$data,
                'pagination' => false,
        ]);

        return $this->render('report2_detail', [
            'dataProvider' => $dataProvider, 
            'date1' => $date1, 
            'date2' => $date2,
            'depname' => $depname,
            'r_name' => $risk_name,
            'dep' => $dep,
            'id' => $id]);
    }
    public function actionRep03($date1=NULL,$date2=NULL) {
        $sql_date = Yii::$app->db->createCommand('SELECT date FROM set_datetime')->queryOne();
        $date1 =  $sql_date['date'];
        $date2 = date('Y-m-d');
        
        if (Yii::$app->request->isPost) {
            $date1 = $_POST['date1'];
            $date2 = $_POST['date2'];   
        }
        
        $sql = "SELECT 
         d.depart_name
         ,count(g.id_risk) AS TOTAL
         FROM  riskregister g
         INNER JOIN department d  on  d.id = g.user_ir
         WHERE g.date_report BETWEEN '$date1'AND '$date2'
         GROUP BY d.depart_name
         ORDER BY TOTAL DESC
         "; 
 
        $data = Yii::$app->db->createCommand($sql)->queryAll();
        $dataProvider = new ArrayDataProvider([
                'allModels'=>$data,
                'pagination'=>[
                'pageSize'=>100 //แบ่งหน้า
                ]
        ]);
 
        return $this->render('report3', [
            'dataProvider' => $dataProvider, 
            'date1' => $date1, 
            'date2' => $date2,
            ]);
    }
   
}

