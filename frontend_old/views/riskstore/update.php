<?php

use yii\helpers\Html;

/* @var $this yii\web\View */
/* @var $model frontend\models\Riskstore */

$this->title ='ปรับปรุงข้อมูล : '. ' '.'ไอดี : ' . ' ' . $model->riskstore_id. ' '.'ชื่อความเสี่ยง : ' . ' ' . $model->riskstore_name;
$this->params['breadcrumbs'][] = ['label' => 'คลังความเสี่ยง', 'url' => ['index']];
$this->params['breadcrumbs'][] = 'ปรับปรุง';
?>
<div class="riskstore-update">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
