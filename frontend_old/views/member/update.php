<?php

use yii\helpers\Html;

$this->title ='ปรับปรุงข้อมูล : '. ' '.'ไอดี ' . ' ' . $model->id. ' '.'ชื่อ-นามสกุล : ' . ' ' . $model->member_name ;
$this->params['breadcrumbs'][] = ['label' => 'ข้อมูลหน่วยงาน', 'url' => ['index']];
?>
<div class="member-update">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
