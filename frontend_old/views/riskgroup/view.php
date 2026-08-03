<?php

use yii\helpers\Html;
use yii\widgets\DetailView;

/* @var $this yii\web\View */
/* @var $model frontend\models\Riskgroup */

$this->title =''. ' '.'ไอดี : ' . ' ' . $model->id. ' '.'กลุ่มความเสี่ยง : ' . ' ' . $model->name ;
$this->params['breadcrumbs'][] = ['label' => 'กลุ่มความเสี่ยง', 'url' => ['index']];
?>
<div class="riskgroup-view">
    
    <?= DetailView::widget([
        'model' => $model,
        'attributes' => [
            'id',
            'name',
            'create_date',
            'modify_date',
            'loginname',
            'updatename'
        ],
    ]) ?>

</div>
