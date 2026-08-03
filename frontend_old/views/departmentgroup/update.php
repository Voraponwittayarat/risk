<?php

use yii\helpers\Html;

/* @var $this yii\web\View */
/* @var $model frontend\models\Departmentgroup */

$this->title ='ปรับปรุงข้อมูล : '. ' '.'ไอดี ' . ' ' . $model->id. ' '.'ฝ่าย : ' . ' ' . $model->depart_group_name ;
$this->params['breadcrumbs'][] = ['label' => 'ข้อมูลฝ่าย', 'url' => ['index']];
?>
<div class="departmentgroup-update">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
