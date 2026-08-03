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



class Report1Controller extends Controller{
    
    public $enableCsrfValidation = false;
    public function behaviors() 
    {
        $role = 0;
        if (!Yii::$app->user->isGuest) {
            $role = Yii::$app->user->identity->role;
        }
        $arr = ['index'];
        if ($role != 99) {
            $arr = ['warning','rep01','rep01_1','rep02','report2_detail','rep03','report3_detail','rep04','rep05','rep06','rep07','rep08','rep09','report9_detail','rep10','rep11','rep11_detail','rep12','rep13','rep14','rep14_detail','rep15'];
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
                'only' => ['warning','rep01','rep01_1','rep02','report2_detail','rep03','report3_detail','rep04','rep05','rep06','rep07','rep08','rep09','report9_detail','rep10','rep11'],
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
                LEFT JOIN department d ON d.id=r.department_id
                WHERE r.date_report BETWEEN '$date1'AND '$date2'
                AND r.department_id = '$dep'
                AND r.status_risk <>'ไม่ใช่ความเสี่ยง'
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
    } /*
    public function actionRep01_1($date1=NULL,$date2=NULL,$dep=NULL) {
        
        $sql_date = Yii::$app->db->createCommand('SELECT date FROM set_datetime')->queryOne();
        $date1 =  $sql_date['date'];
        $date2 = date('Y-m-d');
        
        $dep = '0';
        
        if (Yii::$app->request->isPost) {
            $date1 = $_POST['date1'];
            $date2 = $_POST['date2'];
            $dep = $_POST['dep'];
        }
        
        $sql_dep = Yii::$app->db->createCommand("SELECT depart_name FROM department WHERE id='$dep' ")->queryOne();
        $depname =  $sql_dep['depart_name'];
        
        $sql = "SELECT m.member_name
                ,SUM(CASE WHEN r.level_id='1' THEN 1 ELSE 0 END) AS '1'
                ,SUM(CASE WHEN r.level_id='2' THEN 1 ELSE 0 END) AS '2'
                ,SUM(CASE WHEN r.level_id='3' THEN 1 ELSE 0 END) AS '3'
                ,SUM(CASE WHEN r.level_id='4' THEN 1 ELSE 0 END) AS '4'
                ,SUM(CASE WHEN r.level_id='5' THEN 1 ELSE 0 END) AS '5'
                ,COUNT(r.level_id) AS TOTAL

                FROM riskregister r
                LEFT JOIN `user` u ON u.id=r.created_by
                LEFT JOIN member m ON m.cid collate utf8_general_ci=u.cid collate utf8_general_ci
                LEFT JOIN department d ON d.id=r.department_id
                WHERE r.date_report BETWEEN '$date1'AND '$date2'
                AND r.department_id = '$dep' and r.level_id in('1','2','3','4','5')
                GROUP BY r.created_by
                ORDER BY TOTAL DESC ";

        $data = Yii::$app->db->createCommand($sql)->queryAll();
        $dataProvider = new ArrayDataProvider([
                'allModels'=>$data,
                'pagination'=>[
                'pageSize'=>100 //แบ่งหน้า
                ]
        ]);

        return $this->render('report1_2', [
            'dataProvider' => $dataProvider, 
            'date1' => $date1, 
            'date2' => $date2,
            'depname' => $depname,
            'dep' => $dep]);
    } */



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
                FROM riskregister r
                LEFT JOIN riskstore t ON t.riskstore_id=r.riskstore_id
                LEFT JOIN department d ON d.id=r.department_id
                WHERE r.date_report BETWEEN '$date1'AND '$date2'
                 AND r.department_id = '$dep'
                -- AND (r.sendto_department_id = '$dep' or r.sendto_department_id = '$dep')
                AND r.status_risk <>'ไม่ใช่ความเสี่ยง'
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
                LEFT JOIN department d ON d.id=r.department_id
                LEFT JOIN `user` u ON u.id=r.created_by
                LEFT JOIN member m ON m.cid collate utf8_general_ci=u.cid collate utf8_general_ci      
                WHERE r.date_report BETWEEN '$date1'AND '$date2'
                 AND r.department_id = '$dep'
               -- AND (r.sendto_department_id = '$dep' or r.user_ir = '$dep')
                AND r.riskstore_id= '$id'
                AND r.status_risk <>'ไม่ใช่ความเสี่ยง'
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
    
    public function actionRep03($date1=NULL,$date2=NULL,$dep=NULL) {
        
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
        
        $sql = "SELECT p.program_id,p.program_name
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
        
        FROM program p
        LEFT JOIN riskregister r ON r.program_id=p.program_id
        WHERE r.date_report BETWEEN '$date1'AND '$date2'
        AND r.department_id = '$dep'
        -- AND (r.sendto_department_id = '$dep' or r.user_ir = '$dep')
        AND r.status_risk <>'ไม่ใช่ความเสี่ยง'
        GROUP BY p.program_id
        ORDER BY TOTAL DESC ";

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
            'depname' => $depname,
            'dep' => $dep]);
    } 
    public function actionRep03detail($date1=NULL,$date2=NULL,$dep=NULL,$id=NULL) {
        
        if (Yii::$app->user->identity->role != 1 && Yii::$app->user->identity->role != 2) {
            return $this->redirect(['user/security/login']);
            $this->redirect(Yii::$app->urlManager->createAbsoluteUrl('site/login'));
            return $this->goHome();
        }

        
        $sql_dep = Yii::$app->db->createCommand("SELECT depart_name FROM department WHERE id='$dep' ")->queryOne();
        $depname =  $sql_dep['depart_name'];
        
        $sql_risk = Yii::$app->db->createCommand("SELECT program_name FROM program WHERE program_id='$id' ")->queryOne();
        $pname =  $sql_risk['program_name'];
        
        $sql = "SELECT r.riskstore_id,t.riskstore_name,r.id_risk,p.program_name,CONCAT(r.date_report,' ',r.time_report) AS rep_datetime,r.level_id,r.detail,
        r.edit,r.problem_basic,d.depart_name,m.member_name
        FROM riskregister r
        LEFT JOIN riskstore t ON t.riskstore_id=r.riskstore_id
        LEFT JOIN program p ON p.program_id=r.program_id
        LEFT JOIN department d ON d.id=r.department_id
        LEFT JOIN `user` u ON u.id=r.created_by
        LEFT JOIN member m ON m.cid collate utf8_general_ci=u.cid collate utf8_general_ci      
        WHERE r.date_report BETWEEN '$date1'AND '$date2'
        AND (r.sendto_department_id = '$dep' or r.user_ir = '$dep')
        -- AND r.department_id = '$dep'
        AND r.program_id= '$id'
        AND r.status_risk <>'ไม่ใช่ความเสี่ยง'
        ORDER BY r.date_report ASC ";

        $data = Yii::$app->db->createCommand($sql)->queryAll();
        $dataProvider = new ArrayDataProvider([
                'allModels'=>$data,
                'pagination' => false,
        ]);

        return $this->render('report3_detail', [
            'dataProvider' => $dataProvider, 
            'date1' => $date1, 
            'date2' => $date2,
            'depname' => $depname,
            'pname' => $pname,
            'dep' => $dep,
            'id' => $id]);
    } 

    public function actionRep04($date1=NULL,$date2=NULL,$dep=NULL) {
        
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
        
        $sql = "SELECT t.name AS type_name
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
        LEFT JOIN riskstore rt ON rt.riskstore_id=r.riskstore_id
        LEFT JOIN type t ON t.id=rt.type_id
        WHERE r.date_report BETWEEN '$date1'AND '$date2'
        -- AND (r.sendto_department_id = '$dep' or r.user_ir = '$dep')
        AND r.department_id = '$dep'
        AND r.status_risk <>'ไม่ใช่ความเสี่ยง'
        GROUP BY t.id
        ORDER BY TOTAL DESC ";

        $data = Yii::$app->db->createCommand($sql)->queryAll();
        $dataProvider = new ArrayDataProvider([
                'allModels'=>$data,
                'pagination'=>[
                'pageSize'=>100 //แบ่งหน้า
                ]
        ]);

        return $this->render('report4', [
            'dataProvider' => $dataProvider, 
            'date1' => $date1, 
            'date2' => $date2,
            'depname' => $depname,
            'dep' => $dep]);
    } 

    public function actionRep05($date1=NULL,$date2=NULL,$dep=NULL) {
        
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
        
        $sql = "SELECT rt.riskstore_name
        ,SUM(CASE WHEN r.level_id IN('A','B')  THEN 1 ELSE 0 END)  AS G1
        ,SUM(CASE WHEN r.level_id IN('C','D')  THEN 1 ELSE 0 END) AS G2
        ,SUM(CASE WHEN r.level_id IN('E','F')  THEN 1 ELSE 0 END) AS G3
        ,SUM(CASE WHEN r.level_id IN('G','H')  THEN 1 ELSE 0 END) AS G4
        ,SUM(CASE WHEN r.level_id IN('I')  THEN 1 ELSE 0 END) AS G5
        ,COUNT(r.level_id) AS TOTAL
        
        FROM riskregister r
        LEFT JOIN riskstore rt ON rt.riskstore_id=r.riskstore_id
        WHERE r.date_report BETWEEN '$date1'AND '$date2'
        AND r.department_id = '$dep' 
        -- AND (r.sendto_department_id = '$dep' or r.user_ir = '$dep')
        and r.level_id in('A','B','C','D','E','F','G','H','I')
        AND r.status_risk <>'ไม่ใช่ความเสี่ยง'
        GROUP BY r.riskstore_id
        ORDER BY TOTAL DESC ";

        $data = Yii::$app->db->createCommand($sql)->queryAll();
        $dataProvider = new ArrayDataProvider([
                'allModels'=>$data,
                'pagination'=>[
                'pageSize'=>100 //แบ่งหน้า
                ]
        ]);

        return $this->render('report5', [
            'dataProvider' => $dataProvider, 
            'date1' => $date1, 
            'date2' => $date2,
            'depname' => $depname,
            'dep' => $dep]);
    }
    public function actionRep05_1($date1=NULL,$date2=NULL,$dep=NULL) {
        
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
        
        $sql = "SELECT rt.riskstore_name
        ,SUM(CASE WHEN r.level_id IN('1')  THEN 1 ELSE 0 END)  AS G1
        ,SUM(CASE WHEN r.level_id IN('2')  THEN 1 ELSE 0 END) AS G2
        ,SUM(CASE WHEN r.level_id IN('3')  THEN 1 ELSE 0 END) AS G3
        ,SUM(CASE WHEN r.level_id IN('4')  THEN 1 ELSE 0 END) AS G4
        ,SUM(CASE WHEN r.level_id IN('5')  THEN 1 ELSE 0 END) AS G5
        ,COUNT(r.level_id) AS TOTAL
        
        FROM riskregister r
        LEFT JOIN riskstore rt ON rt.riskstore_id=r.riskstore_id
        WHERE r.date_report BETWEEN '$date1'AND '$date2'
        -- AND (r.sendto_department_id = '$dep' or r.user_ir = '$dep')
        AND r.department_id = '$dep' 
        and r.level_id in('1','2','3','4','5')
        AND r.status_risk <>'ไม่ใช่ความเสี่ยง'
        GROUP BY r.riskstore_id
        ORDER BY TOTAL DESC ";

        $data = Yii::$app->db->createCommand($sql)->queryAll();
        $dataProvider = new ArrayDataProvider([
                'allModels'=>$data,
                'pagination'=>[
                'pageSize'=>100 //แบ่งหน้า
                ]
        ]);

        return $this->render('report5_2', [
            'dataProvider' => $dataProvider, 
            'date1' => $date1, 
            'date2' => $date2,
            'depname' => $depname,
            'dep' => $dep]);
    }
    public function actionRep06($date1=NULL,$date2=NULL,$dep=NULL) {
        
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
        
        $sql = "SELECT i.inform_name
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
        LEFT JOIN inform i ON i.id=r.inform_id
        WHERE r.date_report BETWEEN '$date1'AND '$date2'
        AND r.department_id = '$dep' 
        AND r.status_risk <>'ไม่ใช่ความเสี่ยง'
        GROUP BY i.id
        ORDER BY TOTAL DESC ";

        $data = Yii::$app->db->createCommand($sql)->queryAll();
        $dataProvider = new ArrayDataProvider([
                'allModels'=>$data,
                'pagination'=>[
                'pageSize'=>100 //แบ่งหน้า
                ]
        ]);

        return $this->render('report6', [
            'dataProvider' => $dataProvider, 
            'date1' => $date1, 
            'date2' => $date2,
            'depname' => $depname,
            'dep' => $dep]);
    } /*
    public function actionRep06_1($date1=NULL,$date2=NULL,$dep=NULL) {
        
        $sql_date = Yii::$app->db->createCommand('SELECT date FROM set_datetime')->queryOne();
        $date1 =  $sql_date['date'];
        $date2 = date('Y-m-d');
        
        $dep = '0';
        
        if (Yii::$app->request->isPost) {
            $date1 = $_POST['date1'];
            $date2 = $_POST['date2'];
            $dep = $_POST['dep'];
        }
        
        $sql_dep = Yii::$app->db->createCommand("SELECT depart_name FROM department WHERE id='$dep' ")->queryOne();
        $depname =  $sql_dep['depart_name'];
        
        $sql = "SELECT i.inform_name
        ,SUM(CASE WHEN r.level_id='1' THEN 1 ELSE 0 END) AS '1'
        ,SUM(CASE WHEN r.level_id='2' THEN 1 ELSE 0 END) AS '2'
        ,SUM(CASE WHEN r.level_id='3' THEN 1 ELSE 0 END) AS '3'
        ,SUM(CASE WHEN r.level_id='4' THEN 1 ELSE 0 END) AS '4'
        ,SUM(CASE WHEN r.level_id='5' THEN 1 ELSE 0 END) AS '5'
        ,COUNT(r.level_id) AS TOTAL
        
        FROM riskregister r
        LEFT JOIN inform i ON i.id=r.inform_id
        WHERE r.date_report BETWEEN '$date1'AND '$date2'
        AND r.department_id = '$dep' and r.level_id in('1','2','3','4','5')
        GROUP BY i.id
        ORDER BY TOTAL DESC ";

        $data = Yii::$app->db->createCommand($sql)->queryAll();
        $dataProvider = new ArrayDataProvider([
                'allModels'=>$data,
                'pagination'=>[
                'pageSize'=>100 //แบ่งหน้า
                ]
        ]);

        return $this->render('report6_2', [
            'dataProvider' => $dataProvider, 
            'date1' => $date1, 
            'date2' => $date2,
            'depname' => $depname,
            'dep' => $dep]);
    } */

    public function actionRep07($date1=NULL,$date2=NULL,$dep=NULL) {
        
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
        
        $sql = "SELECT a.act_name
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
        LEFT JOIN inform i ON i.id=r.inform_id
        LEFT JOIN act a ON a.id=i.act_id
        WHERE r.date_report BETWEEN '$date1'AND '$date2'
        AND r.department_id = '$dep'
        AND r.status_risk <>'ไม่ใช่ความเสี่ยง'
        GROUP BY i.act_id
        ORDER BY TOTAL DESC ";

        $data = Yii::$app->db->createCommand($sql)->queryAll();
        $dataProvider = new ArrayDataProvider([
                'allModels'=>$data,
                'pagination'=>[
                'pageSize'=>100 //แบ่งหน้า
                ]
        ]);

        return $this->render('report7', [
            'dataProvider' => $dataProvider, 
            'date1' => $date1, 
            'date2' => $date2,
            'depname' => $depname,
            'dep' => $dep]);
    }
    public function actionRep08($date1=NULL,$date2=NULL,$dep=NULL) {
        
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
        
        $sql = "SELECT rt.riskstore_name
        ,SUM(CASE WHEN r.m='10' THEN 1 ELSE 0 END) AS M10
        ,SUM(CASE WHEN r.m='11' THEN 1 ELSE 0 END) AS M11
        ,SUM(CASE WHEN r.m='12' THEN 1 ELSE 0 END) AS M12
        ,SUM(CASE WHEN r.m='1' THEN 1 ELSE 0 END) AS M01
        ,SUM(CASE WHEN r.m='2' THEN 1 ELSE 0 END) AS M02
        ,SUM(CASE WHEN r.m='3' THEN 1 ELSE 0 END) AS M03
        ,SUM(CASE WHEN r.m='4' THEN 1 ELSE 0 END) AS M04
        ,SUM(CASE WHEN r.m='5' THEN 1 ELSE 0 END) AS M05
        ,SUM(CASE WHEN r.m='6' THEN 1 ELSE 0 END) AS M06
        ,SUM(CASE WHEN r.m='7' THEN 1 ELSE 0 END) AS M07
        ,SUM(CASE WHEN r.m='8' THEN 1 ELSE 0 END) AS M08
        ,SUM(CASE WHEN r.m='9' THEN 1 ELSE 0 END) AS M09
        ,COUNT(r.m) AS TOTAL
        
        FROM tmp_riskregister r
        LEFT JOIN riskstore rt ON rt.riskstore_id=r.riskstore_id
        WHERE r.date_report BETWEEN '$date1'AND '$date2'
        AND r.department_id = '$dep'
       --  AND r.status_risk <>'ไม่ใช่ความเสี่ยง'
        GROUP BY r.riskstore_id
        ORDER BY TOTAL DESC ";

        $data = Yii::$app->db->createCommand($sql)->queryAll();
        $dataProvider = new ArrayDataProvider([
                'allModels'=>$data,
                'pagination'=>[
                'pageSize'=>100 //แบ่งหน้า
                ]
        ]);

        return $this->render('report8', [
            'dataProvider' => $dataProvider, 
            'date1' => $date1, 
            'date2' => $date2,
            'depname' => $depname,
            'dep' => $dep]);
    }
    public function actionRep09($date1=NULL,$date2=NULL) {
        
        $sql_date = Yii::$app->db->createCommand('SELECT date FROM set_datetime')->queryOne();
        $date1 =  $sql_date['date'];
        $date2 = date('Y-m-d');
        

        
        if (Yii::$app->request->isPost) {
            $date1 = $_POST['date1'];
            $date2 = $_POST['date2'];
        }
        
        
        $sql = "SELECT p.program_id,p.program_name
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
        
        FROM program p
        LEFT JOIN riskregister r ON r.program_id=p.program_id
        WHERE r.date_report BETWEEN '$date1'AND '$date2'
        AND r.status_risk <>'ไม่ใช่ความเสี่ยง'
        GROUP BY p.program_id
        ORDER BY TOTAL DESC ";

        $data = Yii::$app->db->createCommand($sql)->queryAll();
        $dataProvider = new ArrayDataProvider([
                'allModels'=>$data,
                'pagination'=>[
                'pageSize'=>100 //แบ่งหน้า
                ]
        ]);

        return $this->render('report9', [
            'dataProvider' => $dataProvider, 
            'date1' => $date1, 
            'date2' => $date2]);
    } 
    public function actionRep09detail($date1=NULL,$date2=NULL,$id=NULL) {
        
        if (Yii::$app->user->identity->role != 1 && Yii::$app->user->identity->role != 2) {
            return $this->redirect(['user/security/login']);
            $this->redirect(Yii::$app->urlManager->createAbsoluteUrl('site/login'));
            return $this->goHome();
        }
        
        $sql_risk = Yii::$app->db->createCommand("SELECT program_name FROM program WHERE program_id='$id' ")->queryOne();
        $pname =  $sql_risk['program_name'];
        
        $sql = "SELECT r.riskstore_id,t.riskstore_name,r.id_risk,p.program_name,CONCAT(r.date_report,' ',r.time_report) AS rep_datetime,r.level_id,r.detail,
        r.edit,r.problem_basic,d.depart_name,m.member_name,r.status_risk
        FROM riskregister r
        LEFT JOIN riskstore t ON t.riskstore_id=r.riskstore_id
        LEFT JOIN program p ON p.program_id=r.program_id
        LEFT JOIN department d ON d.id=r.department_id
        LEFT JOIN `user` u ON u.id=r.created_by
        LEFT JOIN member m ON m.cid collate utf8_general_ci=u.cid collate utf8_general_ci      
        WHERE r.date_report BETWEEN '$date1'AND '$date2'
        AND r.program_id= '$id'
        AND r.status_risk <>'ไม่ใช่ความเสี่ยง'
        ORDER BY r.department_id ";

        $data = Yii::$app->db->createCommand($sql)->queryAll();
        $dataProvider = new ArrayDataProvider([
                'allModels'=>$data,
                'pagination' => false,
        ]);

        return $this->render('report9_detail', [
            'dataProvider' => $dataProvider, 
            'date1' => $date1, 
            'date2' => $date2,
            'pname' => $pname,
            'id' => $id]);
    }
    public function actionRep10($date1=NULL,$date2=NULL) {
         //รายงาน10
        $sql_date = Yii::$app->db->createCommand('SELECT date FROM set_datetime')->queryOne();
        $date1 =  $sql_date['date'];
        $date2 = date('Y-m-d');
        
        //$dep = '0';
        
        if (Yii::$app->request->isPost) {
            $date1 = $_POST['date1'];
            $date2 = $_POST['date2'];
            //$dep = $_POST['dep'];
        }
        
       // $sql_dep = Yii::$app->db->createCommand("SELECT depart_name FROM department WHERE id='$dep' ")->queryOne();
       // $depname =  $sql_dep['depart_name'];
        
        $sql = "SELECT 
         d.depart_name
	    ,count(DISTINCT member.id) as จำนวนคน
	    ,count(DISTINCT r.id_risk) as จำนวนรายงาน
        -- ,round(count(DISTINCT r.id_risk * 100 )/ count(DISTINCT member.id ) AS TOTAL
        ,count(DISTINCT r.id_risk) / count(DISTINCT member.id ) AS TOTAL
        FROM department d 
        LEFT JOIN riskregister r  ON r.department_id = d.id
        LEFT JOIN member on  member.department_id1 =d.id
        WHERE r.date_report BETWEEN '$date1'AND '$date2'
        AND r.status_risk <>'ไม่ใช่ความเสี่ยง'
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

        return $this->render('report10', [
            'dataProvider' => $dataProvider, 
            'date1' => $date1, 
            'date2' => $date2
           // 'depname' => $depname,
           // 'dep' => $dep
            ]);

   }public function actionRep11($date1=NULL,$date2=NULL) {
    $sql_date = Yii::$app->db->createCommand('SELECT date FROM set_datetime')->queryOne();
    $date1 =  $sql_date['date'];
    $date2 = date('Y-m-d');
   
   // $dep = '0'; //

    if (Yii::$app->request->isPost) {
        $date1 = $_POST['date1'];
        $date2 = $_POST['date2']; 
   //  $dep = $_POST['dep'];  //
    }
    
    //$sql_dep = Yii::$app->db->createCommand("SELECT depart_name as name FROM department  where id='$dep' UNION SELECT  team_name as name from team where id ='$dep'  ")->queryOne();
    //$depname =  $sql_dep['name'];
    
    $sql = " SELECT 
       DISTINCT d.depart_name as dname
       ,g3.id,IF(g3.sendto_team_id is null,g3.sendto_department_id,g3.sendto_team_id) AS dep_id
       ,count(DISTINCT g3.id_risk) as cc
   FROM  department d
       LEFT JOIN riskregister g3 on g3.sendto_department_id = d.id  
     WHERE  g3.date_report BETWEEN '$date1'AND '$date2' 
     and ((DATEDIFF(NOW(),g3.register_date) > 14 AND g3.repeat_code ='RV1') or 
       (DATEDIFF(NOW(),g3.register_date) > 7 AND g3.repeat_code = 'RV2' ) or 
       (DATEDIFF(NOW(),g3.register_date) > 5 AND g3.repeat_code = 'RV3' ) or 
       (DATEDIFF(NOW(),g3.register_date) > 1 AND g3.repeat_code = 'RV4' ))
     and g3.status_risk ='ตรวจสอบ'
   GROUP BY dname 
   
   UNION
   
    SELECT 
       DISTINCT d.team_name as dname
       ,g3.id,IF(g3.sendto_team_id is null,g3.sendto_department_id,g3.sendto_team_id) AS dep_id
       ,count(DISTINCT g3.id_risk) as cc
   FROM  team d
       LEFT JOIN riskregister g3 on g3.sendto_team_id = d.id  
     WHERE  g3.date_report BETWEEN '$date1'AND '$date2' 
     and ((DATEDIFF(NOW(),g3.register_date) > 14 AND g3.repeat_code ='RV1') or 
       (DATEDIFF(NOW(),g3.register_date) > 7 AND g3.repeat_code = 'RV2' ) or 
       (DATEDIFF(NOW(),g3.register_date) > 5 AND g3.repeat_code = 'RV3' ) or 
       (DATEDIFF(NOW(),g3.register_date) > 1 AND g3.repeat_code = 'RV4' ))
       and g3.status_risk ='ตรวจสอบ'
   GROUP BY dname 
   ORDER BY cc DESC
     "; 
    //$dep_id =  $sql['dep_id'];
  //  $depname =  $sql['dname'];

    $data = Yii::$app->db->createCommand($sql)->queryAll();
    $dataProvider = new ArrayDataProvider([
            'allModels'=>$data,
            'pagination'=>[
            'pageSize'=>100 //แบ่งหน้า
            ]
    ]);

    return $this->render('report11', [
        'dataProvider' => $dataProvider, 
        'date1' => $date1, 
        'date2' => $date2
       // 'depname' => $depname,
        //'dep' => $dep_id
        ]);
    }
    
    public function actionRep11detail($date1=NULL,$date2=NULL,$dep=NULL,$id=NULL) {
        
        if (Yii::$app->user->identity->role != 1 && Yii::$app->user->identity->role != 2) {
            return $this->redirect(['user/security/login']);
            $this->redirect(Yii::$app->urlManager->createAbsoluteUrl('site/login'));
            return $this->goHome();
        }
        
        $sql_dep = Yii::$app->db->createCommand("SELECT depart_name as name FROM department  where id='$dep' UNION SELECT  team_name as name from team where id ='$dep'  ")->queryOne();
        $depname =  $sql_dep['name'];
        
        $sql_risk = Yii::$app->db->createCommand("SELECT riskstore_name FROM riskstore WHERE riskstore_id='$id' ")->queryOne();
        $risk_name =  $sql_risk['riskstore_name'];
        
        $sql = "SELECT r.id_risk,CONCAT(r.date_report,' ',r.time_report) AS rep_datetime,r.level_id,r.detail,
                r.edit,r.problem_basic,m.member_name,r.status_risk
                FROM riskregister r
                LEFT JOIN riskstore t ON t.riskstore_id=r.riskstore_id
                LEFT JOIN department d ON d.id=r.department_id
                LEFT JOIN `user` u ON u.id=r.created_by
                LEFT JOIN member m ON m.cid collate utf8_general_ci=u.cid collate utf8_general_ci      
                WHERE r.date_report BETWEEN '$date1'AND '$date2'
                AND r.sendto_department_id = '$dep' 
                and ((DATEDIFF(NOW(),r.register_date) > 14 AND r.repeat_code ='RV1') or 
                     (DATEDIFF(NOW(),r.register_date) > 7 AND r.repeat_code = 'RV2' ) or 
                     (DATEDIFF(NOW(),r.register_date) > 5 AND r.repeat_code = 'RV3' ) or 
                     (DATEDIFF(NOW(),r.register_date) > 1 AND r.repeat_code = 'RV4' ))
                and r.status_risk ='ตรวจสอบ'
                ORDER BY r.date_report ASC ";

        $data = Yii::$app->db->createCommand($sql)->queryAll();
        $dataProvider = new ArrayDataProvider([
                'allModels'=>$data,
                'pagination' => false,
        ]);

        return $this->render('report11_detail', [
            'dataProvider' => $dataProvider, 
            'date1' => $date1, 
            'date2' => $date2,
            'depname' => $depname,
            'r_name' => $risk_name,
            'dep' => $dep,
            'id' => $id]);
    } 
    
    
    public function actionRep12($date1=NULL,$date2=NULL) {
        $sql_date = Yii::$app->db->createCommand('SELECT date FROM set_datetime')->queryOne();
        $date1 =  $sql_date['date'];
        $date2 = date('Y-m-d');
        
        if (Yii::$app->request->isPost) {
            $date1 = $_POST['date1'];
            $date2 = $_POST['date2'];   
        }
        
        $sql = " SELECT 
             r.id_risk as id
            ,g.riskstore_name as rname
            ,r.status_risk as rstatus
            ,m.member_name as review
            ,re.review_cid as cidreview
            ,rs.reviewresults_name as result
        FROM  riskregister r
            LEFT JOIN riskstore g on g.riskstore_id = r.riskstore_id 
            LEFT JOIN riskreview re on re.risk_id = r.id_risk
            LEFT JOIN user u on  u.id = re.created_by
            LEFT JOIN member m  on m.cid  collate utf8_general_ci = u.cid collate utf8_general_ci
            LEFT JOIN reviewresults rs on rs.id = re.reviewresults_id
        WHERE  r.date_report BETWEEN '$date1'AND '$date2'
        and r.status_risk in('ทบทวน')
         "; 
    
        $data = Yii::$app->db->createCommand($sql)->queryAll();
        $dataProvider = new ArrayDataProvider([
                'allModels'=>$data,
                'pagination'=>[
                'pageSize'=>100 //แบ่งหน้า
                ]
        ]);
    
        return $this->render('report12', [
            'dataProvider' => $dataProvider, 
            'date1' => $date1, 
            'date2' => $date2
            ]);
        }public function actionRep13($date1=NULL,$date2=NULL) {
            $sql_date = Yii::$app->db->createCommand('SELECT date FROM set_datetime')->queryOne();
            $date1 =  $sql_date['date'];
            $date2 = date('Y-m-d');
            
            if (Yii::$app->request->isPost) {
                $date1 = $_POST['date1'];
                $date2 = $_POST['date2'];   
            }
            
            $sql = " SELECT 
                m.member_name as mname,
                count(DISTINCT g.id) as cr
            FROM  riskregister g
            LEFT JOIN user u on  u.id = g.created_by
            LEFT JOIN member m  on m.cid  collate utf8_general_ci = u.cid collate utf8_general_ci
            WHERE  g.date_report BETWEEN '$date1'AND '$date2'
            AND g.status_risk <>'ไม่ใช่ความเสี่ยง'
            GROUP BY u.username
            ORDER BY  cr DESC
             "; 
        
            $data = Yii::$app->db->createCommand($sql)->queryAll();
            $dataProvider = new ArrayDataProvider([
                    'allModels'=>$data,
                    'pagination'=>[
                    'pageSize'=>100 //แบ่งหน้า
                    ]
            ]);
        
            return $this->render('report13', [
                'dataProvider' => $dataProvider, 
                'date1' => $date1, 
                'date2' => $date2
                ]);
            }  
            
            public function actionRep14($date1=NULL,$date2=NULL) {
        
                $sql_date = Yii::$app->db->createCommand('SELECT date FROM set_datetime')->queryOne();
                $date1 =  $sql_date['date'];
                $date2 = date('Y-m-d');
                
        
                
                if (Yii::$app->request->isPost) {
                    $date1 = $_POST['date1'];
                    $date2 = $_POST['date2'];
                }
                
                
                $sql = "SELECT p.riskstore_id,p.riskstore_name 
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
                
                FROM riskstore p
                LEFT JOIN riskregister r ON p.riskstore_id = r.riskstore_id
                WHERE ( r.date_report IS NULL or r.date_report BETWEEN '$date1'AND '$date2')
                AND r.status_risk <>'ไม่ใช่ความเสี่ยง'
                GROUP BY p.riskstore_name
                ORDER BY TOTAL DESC";
        
                $data = Yii::$app->db->createCommand($sql)->queryAll();
                $dataProvider = new ArrayDataProvider([
                        'allModels'=>$data,
                        'pagination'=>[
                        'pageSize'=>100 //แบ่งหน้า
                        ]
                ]);
        
                return $this->render('report14', [
                    'dataProvider' => $dataProvider, 
                    'date1' => $date1, 
                    'date2' => $date2]);
            } 
            public function actionRep14detail($date1=NULL,$date2=NULL,$id=NULL) {
                
                if (Yii::$app->user->identity->role != 1 && Yii::$app->user->identity->role != 2) {
                    return $this->redirect(['user/security/login']);
                    $this->redirect(Yii::$app->urlManager->createAbsoluteUrl('site/login'));
                    return $this->goHome();
                }
                
                $sql_risk = Yii::$app->db->createCommand("SELECT riskstore_name FROM riskstore WHERE riskstore_id='$id' ")->queryOne();
                $pname =  $sql_risk['riskstore_name'];
                
                $sql = "SELECT r.riskstore_id,t.riskstore_name,r.id_risk,p.program_name,CONCAT(r.date_report,' ',r.time_report) AS rep_datetime,r.level_id,r.detail,
                r.edit,r.problem_basic,d.depart_name,m.member_name
                FROM riskregister r
                LEFT JOIN riskstore t ON t.riskstore_id=r.riskstore_id
                LEFT JOIN program p ON p.program_id=r.program_id
                LEFT JOIN department d ON d.id=r.department_id
                LEFT JOIN `user` u ON u.id=r.created_by
                LEFT JOIN member m ON m.cid collate utf8_general_ci=u.cid collate utf8_general_ci      
                WHERE r.date_report BETWEEN '$date1'AND '$date2'
                AND r.riskstore_id= '$id'
                AND r.status_risk <>'ไม่ใช่ความเสี่ยง'
                ORDER BY r.department_id ";
        
                $data = Yii::$app->db->createCommand($sql)->queryAll();
                $dataProvider = new ArrayDataProvider([
                        'allModels'=>$data,
                        'pagination' => false,
                ]);
        
                return $this->render('report14_detail', [
                    'dataProvider' => $dataProvider, 
                    'date1' => $date1, 
                    'date2' => $date2,
                    'pname' => $pname,
                    'id' => $id]);
            }
            public function actionRep15($date1=NULL,$date2=NULL,$dep=NULL) {
        
                $sql_date = Yii::$app->db->createCommand('SELECT date FROM set_datetime')->queryOne();
                $date1 =  $sql_date['date'];
                $date2 = date('Y-m-d');
                
                //$dep = '0';
                
                if (Yii::$app->request->isPost) {
                    $date1 = $_POST['date1'];
                    $date2 = $_POST['date2'];
                   // $dep = $_POST['dep'];
                }
                /*
                $sql_dep = Yii::$app->db->createCommand("SELECT depart_name FROM department WHERE id='$dep' ")->queryOne();
                $depname =  $sql_dep['depart_name'];*/
                
                $sql = "SELECT rt.riskstore_name
                ,SUM(CASE WHEN substr(date_report,6,2)='10' THEN 1 ELSE 0 END) AS M10
                ,SUM(CASE WHEN substr(date_report,6,2)='11' THEN 1 ELSE 0 END) AS M11
                ,SUM(CASE WHEN substr(date_report,6,2)='12' THEN 1 ELSE 0 END) AS M12
                ,SUM(CASE WHEN substr(date_report,6,2)='01' THEN 1 ELSE 0 END) AS M01
                ,SUM(CASE WHEN substr(date_report,6,2)='02' THEN 1 ELSE 0 END) AS M02
                ,SUM(CASE WHEN substr(date_report,6,2)='03' THEN 1 ELSE 0 END) AS M03
                ,SUM(CASE WHEN substr(date_report,6,2)='04' THEN 1 ELSE 0 END) AS M04
                ,SUM(CASE WHEN substr(date_report,6,2)='05' THEN 1 ELSE 0 END) AS M05
                ,SUM(CASE WHEN substr(date_report,6,2)='06' THEN 1 ELSE 0 END) AS M06
                ,SUM(CASE WHEN substr(date_report,6,2)='07' THEN 1 ELSE 0 END) AS M07
                ,SUM(CASE WHEN substr(date_report,6,2)='08' THEN 1 ELSE 0 END) AS M08
                ,SUM(CASE WHEN substr(date_report,6,2)='09' THEN 1 ELSE 0 END) AS M09
                ,COUNT(substr(date_report,6,2)) AS TOTAL
                
                FROM riskregister r
                LEFT JOIN riskstore rt ON rt.riskstore_id=r.riskstore_id
                WHERE r.date_report BETWEEN '$date1'AND '$date2'
                AND r.status_risk <>'ไม่ใช่ความเสี่ยง'
                GROUP BY r.riskstore_id
                ORDER BY TOTAL DESC ";
        
                $data = Yii::$app->db->createCommand($sql)->queryAll();
                $dataProvider = new ArrayDataProvider([
                        'allModels'=>$data,
                        'pagination'=>[
                        'pageSize'=>100 //แบ่งหน้า
                        ]
                ]);
        
                return $this->render('report15', [
                    'dataProvider' => $dataProvider, 
                    'date1' => $date1, 
                    'date2' => $date2,
                    ]);
            }


            public function actionRep16($date1=NULL,$date2=NULL) {
        
                $sql_date = Yii::$app->db->createCommand('SELECT date FROM set_datetime')->queryOne();
                $date1 =  $sql_date['date'];
                $date2 = date('Y-m-d');
                
        
                
                if (Yii::$app->request->isPost) {
                    $date1 = $_POST['date1'];
                    $date2 = $_POST['date2'];
                }
                
                
                $sql = "SELECT p.riskstore_id,p.riskstore_name 
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
                
                FROM riskstore p
                LEFT JOIN riskregister r ON p.riskstore_id = r.riskstore_id
                WHERE  (r.date_report IS NULL or r.date_report BETWEEN '$date1'AND '$date2')
                and r.status_risk ='ไม่ใช่ความเสี่ยง'
                GROUP BY p.riskstore_name
                ORDER BY TOTAL DESC";
        
                $data = Yii::$app->db->createCommand($sql)->queryAll();
                $dataProvider = new ArrayDataProvider([
                        'allModels'=>$data,
                        'pagination'=>[
                        'pageSize'=>100 //แบ่งหน้า
                        ]
                ]);
        
                return $this->render('report16', [
                    'dataProvider' => $dataProvider, 
                    'date1' => $date1, 
                    'date2' => $date2]);
            } 
            public function actionRep16detail($date1=NULL,$date2=NULL,$id=NULL) {
                
                if (Yii::$app->user->identity->role != 1 && Yii::$app->user->identity->role != 2) {
                    return $this->redirect(['user/security/login']);
                    $this->redirect(Yii::$app->urlManager->createAbsoluteUrl('site/login'));
                    return $this->goHome();
                }
                
                $sql_risk = Yii::$app->db->createCommand("SELECT riskstore_name FROM riskstore WHERE riskstore_id='$id' ")->queryOne();
                $pname =  $sql_risk['riskstore_name'];
                
                $sql = "SELECT r.riskstore_id,t.riskstore_name,r.id_risk,p.program_name,CONCAT(r.date_report,' ',r.time_report) AS rep_datetime,r.level_id,r.detail,
                r.edit,r.problem_basic,d.depart_name,m.member_name
                FROM riskregister r
                LEFT JOIN riskstore t ON t.riskstore_id=r.riskstore_id
                LEFT JOIN program p ON p.program_id=r.program_id
                LEFT JOIN department d ON d.id=r.department_id
                LEFT JOIN `user` u ON u.id=r.created_by
                LEFT JOIN member m ON m.cid collate utf8_general_ci=u.cid collate utf8_general_ci      
                WHERE r.date_report BETWEEN '$date1'AND '$date2'
                AND r.riskstore_id= '$id'
                and r.status_risk ='ไม่ใช่ความเสี่ยง'
                ORDER BY r.department_id ";
        
                $data = Yii::$app->db->createCommand($sql)->queryAll();
                $dataProvider = new ArrayDataProvider([
                        'allModels'=>$data,
                        'pagination' => false,
                ]);
        
                return $this->render('report16_detail', [
                    'dataProvider' => $dataProvider, 
                    'date1' => $date1, 
                    'date2' => $date2,
                    'pname' => $pname,
                    'id' => $id]);
            }

}
   


