<?php

use yii\helpers\Html;
use yii\widgets\DetailView;

/* @var $this yii\web\View */
/* @var $model frontend\models\Type */

$this->title =''. ' '.'ไอดี : ' . ' ' . $model->id. ' '.'ประเภทความเสี่ยง : ' . ' ' . $model->name ;
$this->params['breadcrumbs'][] = ['label' => 'ประเภทความเสี่ยง', 'url' => ['index']];
?>
<div class="type-view">

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
