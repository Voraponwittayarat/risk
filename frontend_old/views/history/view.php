<?php

use yii\helpers\Html;
use yii\widgets\DetailView;

/* @var $this yii\web\View */
/* @var $model frontend\Models\History */

$this->title ='ปรับปรุงข้อมูล : '. ' '.'ไอดี ' . ' ' . $model->id. ' '.'ปรับปรุง : ' . ' ' . $model->change ;
$this->params['breadcrumbs'][] = ['label' => 'ปรับปรุงโปรแกรม', 'url' => ['index']];
$this->params['breadcrumbs'][] = $this->title;
?>
<div class="program-view">

    <?= DetailView::widget([
        'model' => $model,
        'attributes' => [
            'id',
            'datetime',
            'change',
            'detail',
        ],
    ]) ?>

</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>


