<?php

use yii\helpers\Html;

/* @var $this yii\web\View */
/* @var $model frontend\models\Levelwarning */

$this->title ='ปรับปรุงข้อมูล : '. ' '.'ไอดี : ' . ' ' . $model->id. ' '.'ระดับการทบทวน : ' . ' ' . $model->warning_name;
$this->params['breadcrumbs'][] = ['label' => 'ข้อมูลระดับการทบทวน', 'url' => ['index']];
$this->params['breadcrumbs'][] = 'ปรับปรุง';
?>
<div class="levelwarning-update">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
