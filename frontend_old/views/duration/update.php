<?php

use yii\helpers\Html;

/* @var $this yii\web\View */
/* @var $model frontend\models\Duration */

$this->title =''. ' '.'ไอดี : ' . ' ' . $model->id. ' '.'เวร : ' . ' ' . $model->duration_name ;
$this->params['breadcrumbs'][] = ['label' => 'เวรทำการ', 'url' => ['index']];
$this->params['breadcrumbs'][] = 'ปรับปรุง';
?>
<div class="duration-update">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
