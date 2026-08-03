<?php

use yii\helpers\Html;

/* @var $this yii\web\View */
/* @var $model frontend\models\Location */

$this->title =''. ' '.'ไอดี : ' . ' ' . $model->id. ' '.'สถานที่เกิดความเสี่ยง : ' . ' ' . $model->name ;
$this->params['breadcrumbs'][] = ['label' => 'สถานที่เกิดความเสี่ยง', 'url' => ['index']];
$this->params['breadcrumbs'][] = 'ปรับปรุง';
?>
<div class="location-update">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
