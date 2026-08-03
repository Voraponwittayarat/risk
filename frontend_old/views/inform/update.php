<?php

use yii\helpers\Html;

/* @var $this yii\web\View */
/* @var $model frontend\models\Inform */

$this->title =''. ' '.'ไอดี : ' . ' ' . $model->id. ' '.'ที่มาของรายงานความเสี่ยง : ' . ' ' . $model->inform_name ;
$this->params['breadcrumbs'][] = ['label' => 'ที่มาของรายงานความเสี่ยง', 'url' => ['index']];
$this->params['breadcrumbs'][] = 'ปรับปรุง';
?>
<div class="inform-update">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
