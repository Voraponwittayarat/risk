<?php

use yii\helpers\Html;

/* @var $this yii\web\View */
/* @var $model frontend\models\Position */
$this->title ='ปรับปรุงข้อมูล : '. ' '.'ไอดี ' . ' ' . $model->id. ' '.'ฝ่าย : ' . ' ' . $model->position_name ;
$this->params['breadcrumbs'][] = ['label' => 'ตำแหน่ง', 'url' => ['index']];
$this->params['breadcrumbs'][] = 'ปรับปรุง';
?>
<div class="position-update">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
