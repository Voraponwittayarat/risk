<?php

use yii\helpers\Html;
use yii\widgets\DetailView;

/* @var $this yii\web\View */
/* @var $model frontend\models\Location */

$this->title =''. ' '.'ไอดี : ' . ' ' . $model->id. ' '.'สถานที่เกิดความเสี่ยง : ' . ' ' . $model->name ;
$this->params['breadcrumbs'][] = ['label' => 'สถานที่เกิดความเสี่ยง', 'url' => ['index']];

?>

<div class="location-view">
    
    <?= DetailView::widget([
        'model' => $model,
        'attributes' => [
            'id',
            'name',
            'lat',
            'long',
            'create_date',
            'modify_date',
            'loginname',
            'updatename'
        ],
    ]) ?>

</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>