<?php

use yii\helpers\Html;

/* @var $this yii\web\View */
/* @var $model frontend\models\Riskregister */

$this->title ='ยืนยันความเสี่ยง : '. ' '.'ไอดี : ' . ' ' . $model->id_risk. ' '.'ความเสี่ยง : ' . ' ' . $model->storename;
$this->params['breadcrumbs'][] = ['label' => 'ตรวจสอบความเสี่ยง', 'url' => ['risk/approve']];
$this->params['breadcrumbs'][] = 'ยืนยันความเสี่ยง';

?>
<div class="riskregister-update">
    <div class="panel panel-primary">
        <div class="panel-heading"><span class="glyphicon glyphicon-check" aria-hidden="true"></span> <?= Html::encode($this->title) ?></div>
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
