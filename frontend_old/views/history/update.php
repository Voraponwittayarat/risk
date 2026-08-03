<?php

use yii\helpers\Html;

/* @var $this yii\web\View */
/* @var $model frontend\models\Program */

$this->title = 'ปรับปรุงข้อมูล : ' . ' ' . 'ไอดี ' . ' ' . $model->id . ' ' . 'ปรับปรุง : ' . ' ' . $model->change;
$this->params['breadcrumbs'][] = ['label' => 'ปรับปรุงโปรแกรม', 'url' => ['index']];
$this->params['breadcrumbs'][] = $this->title;
?>
<div class="program-update">

    <?=
    $this->render('_form', [
        'model' => $model,
    ])
    ?>

</div>

