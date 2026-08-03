<?php

use yii\helpers\Html;
use yii\widgets\DetailView;

/* @var $this yii\web\View */
/* @var $model frontend\models\Status */

$this->title =''. ' '.'ไอดี : ' . ' ' . $model->id. ' '.'สถานะความเสี่ยง : ' . ' ' . $model->status_name ;
$this->params['breadcrumbs'][] = ['label' => 'สถานะความเสี่ยง', 'url' => ['index']];
?>
<div class="status-view">

    <?= DetailView::widget([
        'model' => $model,
        'attributes' => [
            'id',
            'status_name',
            'create_date',
            'modify_date',
            'loginname',
            'updatename'
        ],
    ]) ?>

</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>