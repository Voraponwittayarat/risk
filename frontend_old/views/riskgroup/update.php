<?php

use yii\helpers\Html;

/* @var $this yii\web\View */
/* @var $model frontend\models\Riskgroup */

$this->title =''. ' '.'ไอดี : ' . ' ' . $model->id. ' '.'กลุ่มความเสี่ยง : ' . ' ' . $model->name ;
$this->params['breadcrumbs'][] = ['label' => 'กลุ่มความเสี่ยง', 'url' => ['index']];
$this->params['breadcrumbs'][] = 'ปรับปรุง';
?>
<div class="riskgroup-update">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
