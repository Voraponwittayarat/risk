<?php

namespace frontend\controllers;

use Yii;
use frontend\models\Riskregister;
use frontend\models\RiskregisterSearch;
use yii\web\Controller;
use yii\web\NotFoundHttpException;
use yii\filters\VerbFilter;
use yii\helpers\ArrayHelper;
use yii\helpers\Url;
use yii\data\ActiveDataProvider;
use yii\data\ArrayDataProvider;


//AccessControl
use yii\filters\AccessControl;
use yii\authclient\AuthAction;

//  Add User Dektrium
use dektrium\user\filters\AccessRule;
use dektrium\user\Finder;

//  dropdownlist function Get
use frontend\models\Riskstore;
use frontend\models\Level;

// Add upload
use yii\web\UploadedFile;
use yii\helpers\Json;
use yii\helpers\BaseFileHelper;
use yii\helpers\Html;

// follow
use frontend\models\Department;


/**
 * RiskregisterController implements the CRUD actions for Riskregister model.
 */
class RiskregisterController extends Controller
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
            $arr = ['view','create', 'update', 'delete','views','viewuse','viewdep','viewteam','follow','print']; //action login ok ต้องเข้าสู่ระบบ และ role ไม่เท่ากับ 99 (Waiting)
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
                'only' => ['view','create', 'update', 'delete','viewuse','viewdep','viewteam','follow','print','approve'],  //ถ้าไม่ระบุแสดงว่าไม่ต้องตรวจสอบสิทธิ
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

    public function actionIndex()
    {
        return $this->goHome();
    }


    public function actionView($id, $id_risk)
    {
        return $this->render('view', [
            'model' => $this->findModel($id, $id_risk),
        ]);
    }
    
     public function actionLink($link_key)
    {
        //$model = Riskregister::find()->where(['link_kye' => $link_kye])->one();
   
        $sql_key = Yii::$app->db->createCommand("SELECT id,id_risk FROM riskregister  WHERE link_key='$link_key'")->queryOne();
        $id =  $sql_key['id'];
        $id_risk =  $sql_key['id_risk'];
        return $this->render('views', [
            'model' => $this->findModel($id, $id_risk),
        ]);
    }
    
//    public function actionViews($id, $id_risk)
//    {
//        return $this->render('views', [
//            'model' => $this->findModel($id, $id_risk),
//        ]);
//    }
    
    public function actionViewuse($id, $id_risk)
    {
        return $this->render('viewuse', [
            'model' => $this->findModel($id, $id_risk),
        ]);
    }
    
    public function actionViewdep($id, $id_risk)
    {
        return $this->render('viewdep', [
            'model' => $this->findModel($id, $id_risk),
        ]);
    }
    public function actionViewteam($id, $id_risk)
    {
        return $this->render('viewteam', [
            'model' => $this->findModel($id, $id_risk),
        ]);
    }



    public function actionCreate()
    {
        $model = new Riskregister();

        if ($model->load(Yii::$app->request->post()) && $model->save()) {
            return $this->redirect(['view', 'id' => $model->id, 'id_risk' => $model->id_risk]);
        }

        return $this->render('create', [
            'model' => $model,
        ]);
    }
        
// Function Send To Line
    public function sendLine($model,$id, $id_risk){
		
	    $model = Riskregister::find()->where(['id' => $id,'id_risk' => $id_risk])
			->andWhere(['IN', 'level_id', ['E','F','G','H','I','3','4','5']])
			->one();
        //$model = Riskregister::find()->where(['id' => $id,'id_risk' => $id_risk])->one();

        $sql_key = Yii::$app->db->createCommand("SELECT link_key FROM riskregister  WHERE id=$id AND id_risk = $id_risk")->queryOne();
        $link_key =  $sql_key['link_key'];
        
        $link = Url::to(['riskregister/link&link_key='.$link_key], true);

        $command1 = Yii::$app->db->createCommand("SELECT linetoken FROM hospital WHERE id='1' ");
        $line_token = $command1->queryScalar();
        
        //$line_token = "Rh8MR5G3fkKgvxKTab5zVhhpdaIk4HGZobYhjvzhdlf";
        //$line_token = "";
        if ($line_token <> '' && $model <> '') {
            $ch = curl_init();  
            curl_setopt($ch, CURLOPT_URL,"https://notify-api.line.me/api/notify");
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0); 
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0); 
            curl_setopt($ch, CURLOPT_POST, 1);
			curl_setopt($ch, CURLOPT_POSTFIELDS,"message=".'ความเสี่ยงที่ : ' .$model->riskstore_id. '  ระดับ : ' .$model->level_id. ' วันที่รายงาน : ' .$model->date_report. ' เหตุการณ์ : ' .$model->detail.' ระดับการทบทวน : ' . $model->repeat_code. ' สถานะ : ' .$model->status_risk.' Read more : ' . $link); // ตรงนี้คือ Field ที่จะส่งข้อความไป Line
          //curl_setopt($ch, CURLOPT_POSTFIELDS,"message=".'ความเสี่ยง : ' .$model->id_risk. ' วันที่รายงาน : ' .$model->date_report. ' เหตุการณ์ : ' .$model->detail.' ระดับการทบทวน : ' . $model->repeat_code. ' สถานะ : ' .$model->status_risk.' Read more : ' . $link); // ตรงนี้คือ Field ที่จะส่งข้อความไป Line

            // follow redirects
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
            curl_setopt($ch, CURLOPT_HTTPHEADER,[
                    'Content-type: application/x-www-form-urlencoded',
                    'Authorization: Bearer ' .$line_token,
            ]);

            // receive server response...
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            $server_output = curl_exec ($ch);

            curl_close ($ch);
         }
	 
    }
        
    public function actionUpdate($id, $id_risk)
    {
        
        $role = Yii::$app->user->identity->role;
           if ($role == 99 || $role == 3) {
               // return $this->redirect('index');
                return $this->goHome();
                //return $this->redirect(['user/security/login']);
            }
      

        $model = $this->findModel($id, $id_risk);
        $model->affectedToArray();
        
        $riskse = ArrayHelper::map($this->GetRisk($model->program_id),'id','name');
        $level = ArrayHelper::map($this->GetLevel($model->level_id),'id','name');

        $url_link = Url::to(['riskregister/views', 'id' => $id,'id_risk'=>$id_risk], true); // ลิงค์แบบเต็ม http://localhost/myweb/controller/action=para1=para2
        
        $model->link_key = substr(Yii::$app->getSecurity()->generateRandomString(), 5); 
        $model->register_date = date('Y-m-d');   
        //$model->refer_type= 1;
		$model->repeat_code='RV1';
        $connection = Yii::$app->db;

          if ($model->load(Yii::$app->request->post()) && $model->validate()) {
              $model->image = $model->uploadMultiple($model,'image');
              $model->save();
        
        $datals = $connection->createCommand("UPDATE riskregister SET status_risk = 'ตรวจสอบ' ,url='$url_link' WHERE id='$id' AND id_risk='$id_risk'")->execute();
        
        $this->sendLine($model,$id, $id_risk); // ส่งไปให้ Function sendLine
            Yii::$app->session->setFlash('success', 'ส่งความเสียงไปทบทวนเรียบร้อยแล้ว');
            return $this->redirect(['view', 'id' => $model->id, 'id_risk' => $model->id_risk]);
            //return $this->redirect('index.php?r=risk/approve');
        }

        return $this->render('update', [
            'model' => $model,
            'riskse' => $riskse,
            'level' =>$level
        ]);
    }

    protected function findModel($id, $id_risk)
    {
        if (($model = Riskregister::findOne(['id' => $id, 'id_risk' => $id_risk])) !== null) {
            return $model;
        }

        throw new NotFoundHttpException('The requested page does not exist.');
    }
    
// function ดึงชื่อความเสี่ยง DepDrop 3 ตัวเลือก
    public function actionGetRisk() {
        $out = [];
        if (isset($_POST['depdrop_parents'])) {
            $parents = $_POST['depdrop_parents'];
            if ($parents != null) {
                $program_id = $parents[0];
                $out = $this->getRisk($program_id );
                echo Json::encode(['output' => $out, 'selected' => '']);
                return;
            }
        }
        echo Json::encode(['output' => '', 'selected' => '']);
    }
    
    public function actionGetLevel() {
        $out = [];
        if (isset($_POST['depdrop_parents'])) {
            $ids = $_POST['depdrop_parents'];
            $program_id = empty($ids[0]) ? null : $ids[0];
            $level_id = empty($ids[1]) ? null : $ids[1];
            if ($program_id != null) {
               $data = $this->getLevel($level_id);      
               echo Json::encode(['output'=>$data, 'selected'=>'']);
               return;
            }
        }
        echo Json::encode(['output'=>'', 'selected'=>'']);
    }
    
    protected function GetRisk($id) {
        $datas = Riskstore::find()->where(['program_id' => $id])->all();
        return $this->MapData1($datas, 'riskstore_id', 'riskstore_name');
    }
    
      protected function GetLevel($id) {
        $datas = Level::find()->where(['level_id' => $id])->all();
        return $this->MapData1($datas, 'level_id', 'level_name');
    }
    
 
    protected function MapData1($datas, $fieldId, $fieldName) {
        $obj = [];
        foreach ($datas as $key => $value) {
            array_push($obj, ['id' => $value->{$fieldId}, 'name' => $value->{$fieldName}]);
        }
        return $obj;
    }
 
// ติดตามความเสี่ยง follow
    public function actionFollow(){
        
        $id_r= Yii::$app->user->identity->id; 

        $searchModel = new RiskregisterSearch();
        $dataProvider = $searchModel->search(Yii::$app->request->queryParams);
        $dataProvider->query->andWhere( ['created_by'=> $id_r] ); //  ติดตามความเสี่ยงได้เฉพาะของตัวเอง
        $dataProvider->pagination->pageSize=10;
        
        $dataProvider->sort->enableMultiSort = true;
        $dataProvider->sort->defaultOrder = [
                 'date_report' => SORT_DESC,
               //'create_date' => SORT_ASC, 
        ];
        
        return $this->render('follow', [
            'searchModel' => $searchModel,
            'dataProvider' => $dataProvider,
        ]);
    }

    public function actionFollowteam(){
        
        $id_r= Yii::$app->user->identity->id; 


        $sql_t = Yii::$app->db->createCommand("SELECT user.id as id_c,member.department_id1  as team
        from member INNER JOIN user on member.cid collate utf8_general_ci =user.cid  collate utf8_general_ci
        where user.id= $id_r")->queryOne();

        
       // $id_t= Yii::$app->member->identity->team_id; 
        $id_t=$sql_t['team'];
        //$id_c=$sql_t['id_c'];

        $searchModel = new RiskregisterSearch();
        $dataProvider = $searchModel->search(Yii::$app->request->queryParams);
        $dataProvider->query->andWhere( ['sendto_department_id'=> $id_t] ); //  ติดตามความเสี่ยงได้เฉพาะของฝ่าย
        $dataProvider->pagination->pageSize=10;
        
        $dataProvider->sort->enableMultiSort = true;
        $dataProvider->sort->defaultOrder = [
                 'date_report' => SORT_DESC,
               //'create_date' => SORT_ASC, 
        ];
        
        return $this->render('follow', [
            'searchModel' => $searchModel,
            'dataProvider' => $dataProvider,
        ]);
    }
    public function actionFollowrm(){
        
            
        $id_r= Yii::$app->user->identity->id; 

        $searchModel = new RiskregisterSearch();
        $dataProvider = $searchModel->search(Yii::$app->request->queryParams);
       // $dataProvider->query->andWhere( ['status_risk'=> "ไม่ใช่ความเสี่ยง"] ); //  ติดตามความเสี่ยงได้เฉพาะของตัวเอง
        $dataProvider->pagination->pageSize=100;
        
        $dataProvider->sort->enableMultiSort = true;
        $dataProvider->sort->defaultOrder = [
                 'date_report' => SORT_DESC,
               //'create_date' => SORT_ASC, 
        ];
        
        return $this->render('follow', [
            'searchModel' => $searchModel,
            'dataProvider' => $dataProvider,
        ]);
    }


    
    public function actionPrint($id=NULL ,$id_risk=NULL) {
       
        if (Yii::$app->request->isPost) {
            $id = $_POST['id'];
            $id_risk = $_POST['id_risk'];
        }
            $sql1 = "SELECT r.id,r.id_risk,r.date_report,r.time_report,m.member_name AS use_rep,d.depart_name,p.program_name,s.riskstore_name,
                    le.level_name,di.duration_name,lo.`name` AS locat_name,IF(r.user_ir_type=1,'รายงานตนเอง','รายงานผู้อื่น') AS ir_type,d1.depart_name AS ir,
                    r.detail,r.url,r.affected,r.edit,r.problem_basic,r.status_risk,r.image
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
                    WHERE r.id=$id AND r.id_risk=$id_risk ";
    
            $sql2 = "SELECT v.riskvisit,v.count,CONCAT(v.review_date,' ',v.review_time) AS review_datetime,v.notereview,v.files,
                    m1.member_name AS review_main,v.review_cid,l.reviewresults_name,v.status_risk AS st_review,
                    IF(v.`repeat`='Y','ทบทวนซ้ำ','ไม่ทบทวน') AS rep,IF(v.discharge='Y','จำหน่าย','ไม่จำหน่าย') AS dc
                    FROM  riskreview v 
                    LEFT OUTER JOIN `user` u ON u.id=v.created_by
                    LEFT OUTER JOIN `user` u1 ON u1.id=v.created_by
                    LEFT OUTER JOIN member m1 ON m1.cid collate utf8_general_ci=u1.cid collate utf8_general_ci
                    LEFT OUTER JOIN member m2 ON m2.cid collate utf8_general_ci=v.review_cid collate utf8_general_ci
                    LEFT OUTER JOIN reviewresults l ON  l.id=v.reviewresults_id
                    WHERE v.riskregister_id=$id AND v.risk_id=$id_risk
                    ORDER BY v.count ";

            $rawData1 = Yii::$app->db->createCommand($sql1)->queryAll();
            $rawData2 = Yii::$app->db->createCommand($sql2)->queryAll();
                   

        return $this->render('print', [
              'id' => $id,
              'id_risk' => $id_risk,
              'data1' =>$rawData1,
              'data2' =>$rawData2,
        ]);
    }
    
}
