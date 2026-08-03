<?php

namespace frontend\controllers;

use Yii;
use yii\base\InvalidParamException;
use yii\web\BadRequestHttpException;
use yii\db\Query;

use yii\data\ActiveDataProvider;
use yii\data\ArrayDataProvider;
use yii\web\Controller;
use yii\web\NotFoundHttpException;

use yii\filters\VerbFilter;


// Models
use frontend\models\Riskregister;
use frontend\models\RiskregisterSearch;

//  Add User Dektrium
use dektrium\user\filters\AccessRule;
use dektrium\user\Finder;
use dektrium\user\models\Profile;
use dektrium\user\Module;
use dektrium\user\traits\EventTrait;
use dektrium\user\models\User;

//AccessControl
use yii\filters\AccessControl;
use yii\authclient\AuthAction;






/**
 * RiskController implements the CRUD actions for Risk model.
 */
class RiskhistoryController extends Controller
{
    /**
     * @inheritdoc
     */
    public $enableCsrfValidation = false;
    
    public function behaviors() 
    {
        $role = 0;
        if (!Yii::$app->user->isGuest) {
            $role = Yii::$app->user->identity->role;
        }
        $arr = ['index'];
        if ($role != 99) {
            $arr = ['index'];
        }
        return [
            'verbs' => [
                'class' => VerbFilter::className(),
                'actions' => [
                    'switch'       => ['post'],
                ],
            ],
            'access' => [
                'class' => AccessControl::className(),
                'ruleConfig' => [
                    'class' => AccessRule::className(),
                ],
                'only' => ['index'],
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


 public function actionIndex() {
    //$this->permitRole([1, 2]);
        if (Yii::$app->user->isGuest || Yii::$app->user->identity->role == 99 || Yii::$app->user->identity->role == 3) {
            return $this->redirect(['user/security/login']);
        }  

    // connect database
            $connection = Yii::$app->db;
            $rstid = ''; 
            $rid = ''; 
            $riskstore = '';
            $inform = '';
            $type = '';
            $program = '';
            $level = '';
            $group = '';
            $team = '';
            $member = '';
            $status = '';

            $id = ''; 
            $id_risk = ''; 
            $date_report = ''; 
            $time_report = ''; 
            $use_rep = ''; 
            $depart_name = ''; 
            $program_name = ''; 
            $riskstore_name = ''; 
            $level_name = ''; 
            $duration_name = ''; 
            $locat_name = ''; 
            $ir_type = ''; 
            $ir = ''; 
            $detail = ''; 
            $url = ''; 
            $affected = ''; 
            $edit = ''; 
            $problem_basic = ''; 
            $status_risk = ''; 

        
        if (Yii::$app->request->isPost) {
            $rstid = Yii::$app->request->post('rstid');
            Yii::$app->session['rstid'] = $rstid;
        }

        if (isset($_GET['rid'])) {
            $rstid= Yii::$app->session['rstid'];
            $rid = $_GET['rid'];
        }
        
        if (isset($_GET['page'])) {
            $rstid = Yii::$app->session['rstid'];
        }
        

    // ข้อมูลคลังความเสี่ยง ตาราง Riskstore
        $sql = "SELECT rt.riskstore_id,rt.riskstore_name,i.inform_name,t.name AS type_name,
        p.program_name,l.level_name,g.name AS group_name,e.team_name,m.member_name,
        if(rt.status='1','ใช้งาน','ปิดใช้งาน') AS status_name
        FROM  riskstore rt 
        LEFT JOIN inform i ON i.id=rt.inform_id
        LEFT JOIN type t ON t.id=rt.type_id
        LEFT JOIN program p ON p.program_id=rt.program_id
        LEFT JOIN level l ON l.level_id=rt.level_id
        LEFT JOIN riskgroup g ON g.id=rt.group_id
        LEFT JOIN team e ON e.id=rt.team_id
        LEFT JOIN member m ON m.cid collate utf8_general_ci=rt.member_cid collate utf8_general_ci 
        WHERE rt.riskstore_id = '$rstid'
        LIMIT 1 ";

        $data = $connection->createCommand($sql)
                ->queryAll();

        for ($i = 0; $i < sizeof($data); $i++) {
            $id = $data[$i]['riskstore_id'];
            $riskstore = $data[$i]['riskstore_name'];
            $inform = $data[$i]['inform_name'];
            $type = $data[$i]['type_name'];
            $program = $data[$i]['program_name'];
            $level= $data[$i]['level_name'];
            $group = $data[$i]['group_name'];
            $team = $data[$i]['team_name'];
            $member = $data[$i]['member_name'];
            $status = $data[$i]['status_name'];
        }

    // ข้อมูลวันที่รายงานความเสี่ยงขอ riskstore_id นั้นๆ
            $sql1 = "SELECT riskstore_id,id_risk,CONCAT(date_report,' ',time_report) AS dt
                    FROM riskregister
                    WHERE riskstore_id ='$rstid'
                    ORDER BY dt DESC";
            $rawData1 = $connection->createCommand($sql1)->queryAll();
            $dataProvider = new ArrayDataProvider([
                //'key' => 'seq_id',
                'allModels' => $rawData1,
                'pagination' => [
                'pageSize' => 1000
                ],
            ]);
 //ข้อมูลการบันทึกความเสี่ยง
                $sqlr = "SELECT 
                    r.id,
                    r.id_risk,
                    r.date_report,
                    r.time_report,
                    m.member_name AS use_rep,
                    d.depart_name,
                    p.program_name,
                    s.riskstore_name,
                    le.level_name,
                    di.duration_name,
                    lo.`name` AS locat_name,
                    IF(r.user_ir_type=1,'รายงานตนเอง','รายงานผู้อื่น') AS ir_type,
                    d1.depart_name AS ir,
                    r.detail,
                    r.url,
                    r.affected,
                    r.edit,
                    r.problem_basic,
                    r.status_risk
                    FROM riskregister r
                    LEFT OUTER JOIN duration di ON di.id=r.duration_id
                    LEFT OUTER JOIN location lo ON lo.id=r.location_id
                    LEFT OUTER JOIN `level` le ON le.level_code=r.level_id
                    LEFT OUTER JOIN department d ON d.id=r.department_id
                    LEFT OUTER JOIN department d1 ON d1.id=r.user_ir
                    LEFT OUTER JOIN program p ON p.program_id=r.program_id
                    LEFT OUTER JOIN riskstore s ON s.riskstore_id=r.riskstore_id
                    LEFT OUTER JOIN `user` u ON u.id=r.created_by
                    LEFT OUTER JOIN member m ON m.cid collate utf8_general_ci=u.cid collate utf8_general_ci
                    WHERE  r.id_risk = '$rid' 
                    LIMIT 1 ";

                $datar = $connection->createCommand($sqlr)->queryAll();

                for ($i = 0; $i < sizeof($datar); $i++) {
                $id = $datar[$i]['id'];
                $id_risk = $datar[$i]['id_risk'];
                $date_report = $datar[$i]['date_report'];
                $time_report = $datar[$i]['time_report'];
                $use_rep = $datar[$i]['use_rep'];
                $depart_name = $datar[$i]['depart_name'];
                $program_name= $datar[$i]['program_name'];
                $riskstore_name= $datar[$i]['riskstore_name'];
                $level_name= $datar[$i]['level_name'];
                $duration_name = $datar[$i]['duration_name'];
                $locat_name = $datar[$i]['locat_name'];
                $ir_type = $datar[$i]['ir_type'];
                $ir = $datar[$i]['ir'];
                $detail= $datar[$i]['detail'];
                $url = $datar[$i]['url'];
                $affected = $datar[$i]['affected'];
                $edit = $datar[$i]['edit'];
                $problem_basic = $datar[$i]['problem_basic'];
                $status_risk = $datar[$i]['status_risk'];

                }   

             return $this->render('index', [
                        'rstid' => $rstid, 
                        'riskstore' => $riskstore,
                        'inform' =>$inform,
                        'type' =>$type,
                        'program' =>$program,
                        'level' =>$level,
                        'group' =>$group,
                        'team' =>$team,
                        'member' =>$member,
                        'status' =>$status,
                        'dataProvider' => $dataProvider,
                        'id' =>  $id,
                        'id_risk' => $id_risk,
                        'date_report' => $date_report,
                        'time_report' => $time_report,
                        'use_rep' => $use_rep,
                        'depart_name' => $depart_name,
                        'program_name' => $program_name,
                        'riskstore_name' => $riskstore_name,
                        'level_name' => $level_name,
                        'duration_name' => $duration_name,
                        'locat_name' => $locat_name,
                        'ir_type' => $ir_type,
                        'ir' => $ir,
                        'detail' => $detail,
                        'url' => $url,
                        'affected' => $affected,
                        'edit' => $edit,
                        'problem_basic' => $problem_basic,
                        'status_risk' => $status_risk,
                 
        ]);
        
    }

    
}
