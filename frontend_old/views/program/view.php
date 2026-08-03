<?php

use yii\helpers\Html;
use yii\widgets\DetailView;

/* @var $this yii\web\View */
/* @var $model frontend\models\Program */

$this->title =''. ' '.'ไอดี : ' . ' ' . $model->program_id. ' '.'โปรแกรมความเสี่ยง : ' . ' ' . $model->program_name ;
$this->params['breadcrumbs'][] = ['label' => 'โปรแกรมความเสี่ยง', 'url' => ['index']];
?>
<div class="program-view">

    <?= DetailView::widget([
        'model' => $model,
        'attributes' => [
            'program_id',
            'program_name',
            'typename',
            'create_date',
            'modify_date',
            'loginname',
            'updatename'
        ],
    ]) ?>

</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>