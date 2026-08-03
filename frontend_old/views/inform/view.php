<?php

use yii\helpers\Html;
use yii\widgets\DetailView;

/* @var $this yii\web\View */
/* @var $model frontend\models\Inform */

$this->title =''. ' '.'ไอดี : ' . ' ' . $model->id. ' '.'ที่มาของรายงานความเสี่ยง : ' . ' ' . $model->inform_name ;
$this->params['breadcrumbs'][] = ['label' => 'ที่มาของรายงานความเสี่ยง', 'url' => ['index']];
?>
<div class="inform-view">
    <?= DetailView::widget([
        'model' => $model,
        'attributes' => [
            'id',
            'inform_name',
            'actname',
            'create_date',
            'modify_date',
            'loginname',
            'updatename',
        ],
    ]) ?>

</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>