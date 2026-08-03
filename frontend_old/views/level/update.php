<?php

use yii\helpers\Html;

/* @var $this yii\web\View */
/* @var $model frontend\models\Level */

$this->title ='ปรับปรุงข้อมูล : '. ' '.'ไอดี : ' . ' ' . $model->level_id. ' '.'ระดับความรุนแรง : ' . ' ' . $model->level_name;
$this->params['breadcrumbs'][] = ['label' => 'ข้อมูลระดับความรุนแรง', 'url' => ['index']];
$this->params['breadcrumbs'][] = 'ปรับปรุง';
?>
<div class="level-update">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
