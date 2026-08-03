<?php

use yii\helpers\Html;

/* @var $this yii\web\View */
/* @var $model frontend\models\Risk */

$this->title ='ปรับปรุงข้อมูล : '. ' '.'ไอดี : ' . ' ' . $model->id. ' '.'ความเสี่ยง : ' . ' ' . $model->storename;
$this->params['breadcrumbs'][] = ['label' => 'ความเสี่ยง', 'url' => ['index']];
$this->params['breadcrumbs'][] = 'ปรับปรุง';
?>
<div class="risk-update">
    <div class="panel panel-warning">
        <div class="panel-heading"><span class="glyphicon glyphicon-time" aria-hidden="true"></span> <?= Html::encode($this->title) ?></div>
        <div class="panel-body">
            <?=
            $this->render('_form', [
                'model' => $model,
                'riskse' => $riskse,
                'level' => $level,
            ])
            ?>
        </div>
    </div>
</div>