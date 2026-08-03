<?php

use yii\helpers\Html;

/* @var $this yii\web\View */
/* @var $model frontend\models\Status */

$this->title ='ปรับปรุงข้อมูล : '. ' '.'ไอดี ' . ' ' . $model->id. ' '.'สถานะความเสี่ยง : ' . ' ' . $model->status_name ;
$this->params['breadcrumbs'][] = ['label' => 'สถานะความเสี่ยง', 'url' => ['index']];
$this->params['breadcrumbs'][] = 'ปรับปรุง';
?>
<div class="status-update">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
