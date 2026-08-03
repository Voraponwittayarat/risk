<?php

namespace frontend\controllers;

use Yii;

use frontend\models\Riskreview;
use frontend\models\RiskreviewSearch;
use frontend\models\Riskregister;
use frontend\models\RiskregisterSearch;
use frontend\models\Risk; //neeเพิ่มทีหลัง

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
use dektrium\user\models\User;

//  dropdownlist function Get
use frontend\models\Riskstore;
use frontend\models\Level;

use frontend\models\Reviewtype;
use frontend\models\Reviewresults;


// Add upload
use yii\web\UploadedFile;
use yii\helpers\Json;
use yii\helpers\BaseFileHelper;
use yii\helpers\Html;

// condatabase
use yii\db\Command;

/**
 * RiskreviewController implements the CRUD actions for Riskreview model.
 */
class RiskreviewController extends Controller
{
    public $enableCsrfValidation = false;
    
    public function behaviors() 
    {
        $role = 0;
        if (!Yii::$app->user->isGuest) {
            $role = Yii::$app->user->identity->role;
        }
        $arr = ['index'];
        if ($role != 99) {
            $arr = ['index','view','create', 'update', 'delete','touse','todep','toteam']; //action login ok ต้องเข้าสู่ระบบ และ role ไม่เท่ากับ 99 (Waiting)
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
                'only' => ['index','view','create', 'update', 'delete','touse','todep','toteam'],  //ถ้าไม่ระบุแสดงว่าไม่ต้องตรวจสอบสิทธิ
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

    /**
     * Lists all Riskreview models.
     * @return mixed
     */
    public function actionIndex()
    {
        $id_r= Yii::$app->user->identity->id; 
       
        $searchModel = new RiskreviewSearch();
        $dataProvider = $searchModel->search(Yii::$app->request->queryParams);
        
        //$dataProvider->query->groupBy(['risk_id']);
        $dataProvider->query->andWhere(['created_by'=> $id_r]); //  ดึงเฉพาะที่ risk status = รายงาน และ ตรวจสอบผู้ใช้ให้แสดงข้อมูลเฉพาะของตัวเอง
       
        return $this->render('index', [
            'searchModel' => $searchModel,
            'dataProvider' => $dataProvider,
        ]);
    }
    
    public function actionToceo()
    {
        $model2 = new Riskregister();
        
        $searchModel = new RiskreviewSearch();
       // $searchModel->repeat = 'Y';
        
         
        $searchModel2 = new RiskregisterSearch();
        
        $searchModel2->status_risk = 'ตรวจสอบ';
        //$searchModel2->sendto_member_cid =Yii::$app->user->identity->cid;
        
        $cid_ceo= Yii::$app->user->identity->cid;
        $sql_ceo = Yii::$app->db->createCommand("SELECT cid FROM member  WHERE cid='$cid_ceo' AND priority='1' ")->queryOne();
        $ceo_id =  $sql_ceo['cid'];
        
        //die(print_r($sql_ceo['cid']));

        if(empty( $ceo_id )) {
            $searchModel2->sendto_member_cid = '0000000000000';
        } else {
            $searchModel2->sendto_member_cid =  $ceo_id;
        }

        $dataProvider = $searchModel->search(Yii::$app->request->queryParams);
        $dataProvider2 = $searchModel2->search(Yii::$app->request->queryParams);

        
        $dataProvider2->pagination->pageSize=100;
        $dataProvider2->sort->enableMultiSort = true;
        $dataProvider2->sort->defaultOrder = [
                 'repeat_code' => SORT_ASC,
                 'level_id' => SORT_DESC,
               //'level_id' => SORT_ASC, 
        ];

        return $this->render('ceo', [
            'searchModel' => $searchModel,'dataProvider' => $dataProvider,
            'searchModel2' => $searchModel2,'dataProvider2' => $dataProvider2,
        ]);
    }
    
    public function actionTodep()
    {
        $model2 = new Riskregister();
        
        $cid_d= Yii::$app->user->identity->cid;
        
        $sql_dep = Yii::$app->db->createCommand("SELECT department_id1 AS dep  FROM member  WHERE cid='$cid_d'")->queryOne();
        $dep_id =  $sql_dep['dep'];
        
       // die(print_r($sql_dep['dep']));
        
        $sql_p = Yii::$app->db->createCommand("SELECT priority FROM member  WHERE cid='$cid_d' ")->queryOne();
        $prior  =  $sql_p['priority'];
        
       // die(print_r($sql_p['priority']));

        $searchModel = new RiskreviewSearch();
        $searchModel2 = new RiskregisterSearch();
        
        $searchModel2->sendto_department_id = $dep_id;
        $searchModel2->status_risk = 'ตรวจสอบ';
        
        $dataProvider = $searchModel->search(Yii::$app->request->queryParams);
        $dataProvider2 = $searchModel2->search(Yii::$app->request->queryParams);
        
        $dataProvider2->pagination->pageSize=100;
        $dataProvider2->sort->enableMultiSort = true;
        $dataProvider2->sort->defaultOrder = [
                 'repeat_code' => SORT_ASC,
                 'level_id' => SORT_DESC,
               //'level_id' => SORT_ASC, 
        ];

        return $this->render('dep', [
            'searchModel' => $searchModel,
            'dataProvider' => $dataProvider,
            'searchModel2' => $searchModel2,
            'dataProvider2' => $dataProvider2,
            'prior' =>$prior,
        ]);
    }
    
    public function actionToteam()
    {
        
        $model2 = new Riskregister();
         
        $cid_t= Yii::$app->user->identity->cid;
        $sql_te = Yii::$app->db->createCommand("SELECT IFNULL(team_id,0) AS team_id FROM member  WHERE cid='$cid_t'")->queryOne();
        $te_id =  $sql_te['team_id'];
        
        $searchModel = new RiskreviewSearch();
        $searchModel2 = new RiskregisterSearch();
        
        
        $searchModel2->sendto_team_id = $te_id;
        $searchModel2->status_risk = 'ตรวจสอบ';
        
        $dataProvider = $searchModel->search(Yii::$app->request->queryParams);
        $dataProvider2 = $searchModel2->search(Yii::$app->request->queryParams);
        
        $dataProvider2->pagination->pageSize=100;
        $dataProvider2->sort->enableMultiSort = true;
        $dataProvider2->sort->defaultOrder = [
                 'repeat_code' => SORT_ASC,
                 'level_id' => SORT_DESC,
               //'level_id' => SORT_ASC, 
        ];


        return $this->render('team', [
            'searchModel' => $searchModel,'dataProvider' => $dataProvider,
            'searchModel2' => $searchModel2,'dataProvider2' => $dataProvider2,
        ]);
    }

    public function actionView($id,$id_regist, $riskvisit)
    {
       
        $model2 = Riskregister::find()->where(['id' => $id_regist])->one();
        
       // $searchModel2 = new RiskregisterSearch();

        return $this->render('view', [
            'model' => $this->findModel($id, $riskvisit),
            'model2' => $model2,
        ]);
    }
    public function actionReject($risk_id)
    {
        /*$risk_register =  Riskregister::findOne(['id_risk' => $risk_id]);
        $risk_register->status_risk = 'จำหน่าย';
        $risk_register->save();
        $risk = Risk::findOne($risk_id);
        $risk->status_risk = 'จำหน่าย';
        $risk->save();*/
        
        $connection = Yii::$app->db;
        $connection->createCommand("UPDATE riskregister SET status_risk = 'ไม่ใช่ความเสี่ยง' WHERE id_risk='$risk_id'")->execute();
        $connection->createCommand("UPDATE risk SET status_risk = 'ไม่ใช่ความเสี่ยง' WHERE id='$risk_id'")->execute();

        Yii::$app->session->setFlash('success', 'ยกเลิกข้อมูลเรียบร้อยแล้ว');

        return $this->redirect(['index']);
    }
    
    public function actionCreate($id_regist, $id_risk)
    {
        $connection = Yii::$app->db;
        $model = new Riskreview();
        $model->risk_id = $id_risk; //NEE ย้ายมาอยู่ด้านบน
        $model->token_upload = substr(Yii::$app->getSecurity()->generateRandomString(), 10);         
        $model->review_date = date('Y-m-d'); 

        if ($model->load(Yii::$app->request->post())) {
           // $model->risk_id = $id_risk;
            $model->riskregister_id = $id_regist;
            $model->riskvisit = date('Ymdhms');
            $model->count = 1;
                //die(print_r($model->attributes));
                //$this->Uploads(false);
            
            $model->files = UploadedFile::getInstance($model, 'files');
            if ($model->files && $model->validate()) {
                $fileName = ($model->files->baseName .'_'. time()) . '.' . $model->files->extension;
                $image = $model->files;
                $model->files = $fileName;
                $image->saveAs('riskfiles/' . $fileName);

                if ($model->save()) {
                    $st1 = $connection->createCommand("UPDATE riskregister SET status_risk = 'ทบทวน' WHERE id='$id_regist'")->execute();
                    Yii::$app->session->setFlash('success', 'ทบทวนความเสี่ยงเรียบร้อยแล้ว');
                    return $this->redirect(['view', 'id' => $model->id,'id_regist' => $model->riskregister_id,'riskvisit' => $model->riskvisit]);
                }
                } else if ($model->save()) {
                    $st1 = $connection->createCommand("UPDATE riskregister SET status_risk = 'ทบทวน' WHERE id_risk='$id_risk'")->execute();
                    Yii::$app->session->setFlash('success', 'ทบทวนความเสี่ยงเรียบร้อยแล้ว');
                    return $this->redirect(['view', 'id' => $model->id,'id_regist' => $model->riskregister_id, 'riskvisit' => $model->riskvisit]);
                }
        }

        return $this->render('create', [
            'model' => $model,
        ]);
    }
// ทบทวนความเสี่ยงซ้ำ
    public function actionRepeat($id_regist, $id_risk)
    {
        $connection = Yii::$app->db;
        $model = new Riskreview();
        
        $model->token_upload = substr(Yii::$app->getSecurity()->generateRandomString(), 10);         
        $model->review_date = date('Y-m-d'); 
        
        $n = 1;
        $sql_cc = Yii::$app->db->createCommand("SELECT count(*) AS cc FROM riskreview  WHERE risk_id='$id_risk' AND riskregister_id='$id_regist'")->queryOne();
        $equal = $sql_cc['cc'];
    

        if ($model->load(Yii::$app->request->post())) {
            $model->risk_id = $id_risk;
            $model->riskregister_id = $id_regist;
            $model->riskvisit = date('Ymdhms');
            $model->count = $equal+$n;
            
            //die(print_r($model->attributes));
            //$this->Uploads(false);
            
            $model->files = UploadedFile::getInstance($model, 'files');
            if ($model->files && $model->validate()) {
                $fileName = ($model->files->baseName .'_'. time()) . '.' . $model->files->extension;
                $image = $model->files;
                $model->files = $fileName;
                $image->saveAs('riskfiles/' . $fileName);

                if ($model->save()) {
                    $st1 = $connection->createCommand("UPDATE riskregister SET status_risk = 'ทบทวน' WHERE id_risk='$id_risk'")->execute();
                    Yii::$app->session->setFlash('success', 'ทบทวนความเสี่ยงเรียบร้อยแล้ว');
                    return $this->redirect(['view', 'id' => $model->id,'id_regist' => $model->riskregister_id,'riskvisit' => $model->riskvisit]);
                }
                } else if ($model->save()) {
                    $st1 = $connection->createCommand("UPDATE riskregister SET status_risk = 'ทบทวน' WHERE id_risk='$id_risk'")->execute();
                    Yii::$app->session->setFlash('success', 'ทบทวนความเสี่ยงเรียบร้อยแล้ว');
                    return $this->redirect(['view', 'id' => $model->id,'id_regist' => $model->riskregister_id, 'riskvisit' => $model->riskvisit]);
                }
        }

        return $this->render('create', [
            'model' => $model,
        ]);
    }



    public function actionUpdate($id,$id_regist,$riskvisit)
    {
        $connection = Yii::$app->db;
         
        $model = $this->findModel($id, $riskvisit);
        $tempResume = $model->files;
        $model->review_cid = $model->getArray($model->review_cid);
        $model->causeProblemToArray();

            if ($model->load(Yii::$app->request->post())) {

            //$this->Uploads(false);

            $model->files = UploadedFile::getInstance($model, 'files');
            if ($model->files && $model->validate()) {
                $fileName = ($model->files->baseName .'_'. time()) . '.' . $model->files->extension;
                $image = $model->files;
                $model->files = $fileName;
                $image->saveAs('riskfiles/' . $fileName);
                if ($model->save()) {
                    $st1 = $connection->createCommand("UPDATE riskregister SET status_risk = 'ทบทวน' WHERE id='$id_regist'")->execute();
                    Yii::$app->session->setFlash('success', 'แก้ไขข้อมูลเรียบร้อยแล้ว');
                    return $this->redirect(['view', 'id' => $model->id,'id_regist' => $model->riskregister_id, 'riskvisit' => $model->riskvisit]);
                }
            } else {
                $model->files = $tempResume;
                if ($model->save()) {
                    $st1 = $connection->createCommand("UPDATE riskregister SET status_risk = 'ทบทวน' WHERE id='$id_regist'")->execute();
                    Yii::$app->session->setFlash('success', 'แก้ไขข้อมูลเรียบร้อยแล้ว');
                    return $this->redirect(['view', 'id' => $model->id,'id_regist' => $model->riskregister_id, 'riskvisit' => $model->riskvisit]);
                }
            }
        }

        return $this->render('update', [
            'model' => $model,
        ]);
    }

    public function actionConf($id,$id_regist,$riskvisit) {
        
        if (Yii::$app->user->isGuest || Yii::$app->user->identity->role == 99 ) {
              return $this->redirect(['user/security/login']);
        }  
        $model = Riskreview::find()->where(['id' => $id])->one();
        $connection = Yii::$app->db;

        if ($model->discharge === 'N' && $model->discharge !== 'จำหน่าย') {
            Yii::$app->session->setFlash('warning', 'ไม่มีการจำหน่าย !');
            //return $this->redirect(['riskreview/index']);
            return $this->redirect(Yii::$app->request->referrer ?: Yii::$app->homeUrl);
        } else {

            $data_rv = $connection->createCommand("UPDATE riskreview SET status_risk = 'จำหน่าย' WHERE id='$id' AND riskvisit='$riskvisit'")->execute();
            $data_re = $connection->createCommand("UPDATE riskregister SET status_risk = 'จำหน่าย' WHERE id='$id_regist'")->execute();
            Yii::$app->session->setFlash('success', 'จำหน่ายเรียบร้อยแล้ว');
            return $this->redirect(Yii::$app->request->referrer ?: Yii::$app->homeUrl);
        }     
    }
    
    public function actionDelete($id, $riskvisit)
    {
        $this->findModel($id, $riskvisit)->delete();
        Yii::$app->session->setFlash('success', 'ลบข้อมูลเรียบร้อยแล้ว');

        return $this->redirect(['index']);
    }


    protected function findModel($id, $riskvisit)
    {
        if (($model = Riskreview::findOne(['id' => $id, 'riskvisit' => $riskvisit])) !== null) {
            return $model;
        }

        throw new NotFoundHttpException('The requested page does not exist.');
    }
    
// รับค่ามาจาก from เพื่อ ดาวน์โหลด 
    public function actionDownload($type, $id, $riskvisit) {
        $model = $this->findModel($id, $riskvisit);
        $model->review_cid = $model->getArray($model->review_cid);
        if ($type === 'files') {
            Yii::$app->response->sendFile($model->getDocPath() . '/' . $model->files);
            $model->hits +=1; // นับจำนวนดาวน์โหลด
            $model->save();
        }
    }
    public function actionTodepgroup(){
        $model2 = new Riskregister();
        
        $cid_d= Yii::$app->user->identity->cid;
        
//เรียกรหัสฝ่ายของคนที่เข้าระบบมา
        $sql_depG = Yii::$app->db->createCommand(" SELECT dr.id as dep
        FROM member m
        INNER JOIN department  d on d.id = m.department_id1
        INNER JOIN departmentgroup dr on dr.id = d.depart_group_id
        where m.cid ='$cid_d' ")->queryOne();

        $dep_id_group =  $sql_depG['dep'];

        //die(print_r($sql_depG['dep']));

//เรียกแผนกทั้งหมดที่สังกัดฝ่าย        
        $sql_dep = Yii::$app->db->createCommand(" SELECT m.department_id1 AS dep2 
        FROM member m
        INNER JOIN department  d on d.id = m.department_id1
        INNER JOIN departmentgroup dr on dr.id = d.depart_group_id where  dr.id ='$dep_id_group' 
        ")->queryAll();
        $dep_id =  $sql_dep['dep2']; //รหัสฝ่าย
       
       //die(print_r($sql_dep['dep2']));
        
        $sql_p = Yii::$app->db->createCommand("SELECT priority FROM member  WHERE cid='$cid_d' ")->queryOne();
        $prior  =  $sql_p['priority'];
        
        //die(print_r($sql_p['priority']));

        $searchModel = new RiskreviewSearch();
        $searchModel2 = new RiskregisterSearch();
        
        //$searchModel2->sendto_departmentG_id = $depG_id;
        $searchModel2->sendto_department_id = $dep_id;
        $searchModel2->status_risk = 'ตรวจสอบ';
        

        
        $dataProvider = $searchModel->search(Yii::$app->request->queryParams);
        $dataProvider2 = $searchModel2->search(Yii::$app->request->queryParams);
        
        $dataProvider2->pagination->pageSize=100;
        $dataProvider2->sort->enableMultiSort = true;
        $dataProvider2->sort->defaultOrder = [
                 'repeat_code' => SORT_ASC,
                 'level_id' => SORT_DESC,
               //'level_id' => SORT_ASC, 
        ];

        return $this->render('depgroup', [
            'searchModel' => $searchModel,
            'dataProvider' => $dataProvider,
            'searchModel2' => $searchModel2,
            'dataProvider2' => $dataProvider2,
            'prior' =>$prior,
          
        ]);
    }
}
