<?php

use yii\helpers\Html;

/* @var $this yii\web\View */
/* @var $model frontend\models\Department */
$this->title ='ปรับปรุงข้อมูล : '. ' '.'ไอดี ' . ' ' . $model->id. ' '.'แผนก/งาน : ' . ' ' . $model->depart_name ;
$this->params['breadcrumbs'][] = ['label' => 'ข้อมูลแผนก-งาน', 'url' => ['index']];
?>
<div class="department-update">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
