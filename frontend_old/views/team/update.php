<?php

use yii\helpers\Html;

/* @var $this yii\web\View */
/* @var $model frontend\models\Team */

$this->title ='ปรับปรุงข้อมูล : '. ' '.'ไอดี ' . ' ' . $model->id. ' '.'ทีมนำ : ' . ' ' . $model->team_name ;
$this->params['breadcrumbs'][] = ['label' => 'ทีมนำ', 'url' => ['index']];
$this->params['breadcrumbs'][] = 'ปรับปรุง';
?>
<div class="team-update">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
