<?php

namespace frontend\controllers;

use Yii;
use yii\db\Query;
use backend\models\History;
use yii\data\ActiveDataProvider;
use yii\web\Controller;
use yii\web\NotFoundHttpException;
use yii\filters\VerbFilter;

class HistoryviewController extends Controller{
    public function actionIndex(){
        $sql = "SELECT * FROM history ORDER BY datetime DESC";

        $data = Yii::$app->db->createCommand($sql)->queryAll();
        return $this->render('index', ['data_view' => $data]);

    }

}
