<?php

use yii\helpers\Html;
use yii\widgets\DetailView;

/* @var $this yii\web\View */
/* @var $model frontend\models\Level */

$this->title =''. ' '.'ไอดี : ' . ' ' . $model->level_id. ' '.'ระดับความรุนแรง : ' . ' ' . $model->level_name ;
$this->params['breadcrumbs'][] = ['label' => 'ข้อมูลระดับความรุนแรง', 'url' => ['index']];
?>
<div class="level-view">

    <?= DetailView::widget([
        'model' => $model,
        'attributes' => [
            'level_id',
            'level_code',
            'level_name',
            'warningcode',
            'warningname',
            'url_pic:url',
            'create_date',
            'modify_date',
            'loginname',
            'updatename'
        ],
    ]) ?>

</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>