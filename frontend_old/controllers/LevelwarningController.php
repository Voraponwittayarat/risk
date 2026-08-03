<?php

namespace frontend\controllers;

use Yii;
use frontend\models\Levelwarning;
use frontend\models\LevelwarningSearch;
use yii\data\ActiveDataProvider;
use yii\web\Controller;
use yii\web\NotFoundHttpException;
use yii\filters\AccessControl;
use yii\filters\VerbFilter;
use yii\authclient\AuthAction;

//  Add User Dektrium
use dektrium\user\filters\AccessRule;
use dektrium\user\Finder;
use dektrium\user\models\Profile;
use dektrium\user\Module;
use dektrium\user\traits\EventTrait;

/**
 * LevelwarningController implements the CRUD actions for Levelwarning model.
 */
class LevelwarningController extends Controller
{
    /**
     * @inheritdoc
     */
    public function behaviors() 
    {
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
                'rules' => [
                    [
                        'allow' => true,
                        'actions' => ['switch'],
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
     * Lists all Levelwarning models.
     * @return mixed
     */
    public function actionIndex()
    {
        $searchModel = new LevelwarningSearch();
        $dataProvider = $searchModel->search(Yii::$app->request->queryParams);
        $dataProvider->pagination->pageSize=100;
        
        return $this->render('index', [
            'searchModel' => $searchModel,
            'dataProvider' => $dataProvider,
        ]);
    }

    /**
     * Displays a single Levelwarning model.
     * @param integer $id
     * @return mixed
     * @throws NotFoundHttpException if the model cannot be found
     */
    public function actionView($id)
    {
        return $this->renderAjax('view', [
            'model' => $this->findModel($id),
        ]);
    }

    /**
     * Creates a new Levelwarning model.
     * If creation is successful, the browser will be redirected to the 'view' page.
     * @return mixed
     */
    public function actionCreate()
    {
        $model = new Levelwarning();

        if ($model->load(Yii::$app->request->post()) && $model->save()) {
            Yii::$app->session->setFlash('success', 'เพิ่มข้อมูลเรียบร้อยแล้ว');
            return $this->redirect('index.php?r=levelwarning/index');
        }

        return $this->renderAjax('create', [
            'model' => $model,
        ]);
    }

    /**
     * Updates an existing Levelwarning model.
     * If update is successful, the browser will be redirected to the 'view' page.
     * @param integer $id
     * @return mixed
     * @throws NotFoundHttpException if the model cannot be found
     */
    public function actionUpdate($id)
    {
        $model = $this->findModel($id);

        if ($model->load(Yii::$app->request->post()) && $model->save()) {
            Yii::$app->session->setFlash('success', 'แก้ไขข้อมูลเรียบร้อยแล้ว');
            return $this->redirect('index.php?r=levelwarning/index');
        }

        return $this->renderAjax('update', [
            'model' => $model,
        ]);
    }

    /**
     * Deletes an existing Levelwarning model.
     * If deletion is successful, the browser will be redirected to the 'index' page.
     * @param integer $id
     * @return mixed
     * @throws NotFoundHttpException if the model cannot be found
     */
    public function actionDelete($id)
    {
        $this->findModel($id)->delete();
        Yii::$app->session->setFlash('success', 'ลบข้อมูลเรียบร้อยแล้ว');
        return $this->redirect(['index']);
    }

    /**
     * Finds the Levelwarning model based on its primary key value.
     * If the model is not found, a 404 HTTP exception will be thrown.
     * @param integer $id
     * @return Levelwarning the loaded model
     * @throws NotFoundHttpException if the model cannot be found
     */
    protected function findModel($id)
    {
        if (($model = Levelwarning::findOne($id)) !== null) {
            return $model;
        }

        throw new NotFoundHttpException('The requested page does not exist.');
    }
}
