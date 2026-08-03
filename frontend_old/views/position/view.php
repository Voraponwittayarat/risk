<?php

use yii\helpers\Html;
use yii\widgets\DetailView;

/* @var $this yii\web\View */
/* @var $model frontend\models\Position */

$this->title =''. ' '.'ไอดี : ' . ' ' . $model->id. ' '.'ตำแหน่ง : ' . ' ' . $model->position_name ;
$this->params['breadcrumbs'][] = ['label' => 'ตำแหน่ง', 'url' => ['index']];
?>
<div class="position-view">
    <?= DetailView::widget([
        'model' => $model,
        'attributes' => [
            'id',
            'position_name',
            'create_date',
            'modify_date',
            'loginname',
            'updatename'
        ],
    ]) ?>

</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>