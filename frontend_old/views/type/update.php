<?php

use yii\helpers\Html;

/* @var $this yii\web\View */
/* @var $model frontend\models\Type */

$this->title =''. ' '.'ไอดี : ' . ' ' . $model->id. ' '.'ประเภทความเสี่ยง : ' . ' ' . $model->name ;
$this->params['breadcrumbs'][] = ['label' => 'ประเภทความเสี่ยง', 'url' => ['index']];
$this->params['breadcrumbs'][] = 'ปรับปรุง';
?>
<div class="type-update">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
