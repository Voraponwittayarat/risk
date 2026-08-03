<?php

use yii\helpers\Html;

/* @var $this yii\web\View */
/* @var $model frontend\models\Program */

$this->title ='ปรับปรุงข้อมูล : '. ' '.'ไอดี ' . ' ' . $model->program_id. ' '.'โปรแกรมความเสี่ยง : ' . ' ' . $model->program_name ;
$this->params['breadcrumbs'][] = ['label' => 'โปรแกรมความเสี่ยง', 'url' => ['index']];
$this->params['breadcrumbs'][] = 'ปรับปรุง';
?>
<div class="program-update">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
