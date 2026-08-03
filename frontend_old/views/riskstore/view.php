<?php

use yii\helpers\Html;
use yii\widgets\DetailView;

/* @var $this yii\web\View */
/* @var $model frontend\models\Riskstore */

$this->title =''. ' '.'ไอดี : ' . ' ' . $model->riskstore_id. ' '.'ชื่อความเสี่ยง : ' . ' ' . $model->riskstore_name ;
$this->params['breadcrumbs'][] = ['label' => 'คลังความเสี่ยง', 'url' => ['index']];
?>
<div class="riskstore-view">

    <?= DetailView::widget([
        'model' => $model,
        'attributes' => [
            'riskstore_id',
            'riskstore_name',
            'informname',
            'typename',
            'programname',
            'levelname',
            'groupname',
            'teamname',
            'ownername',
            [
                'label' => 'สถานะ',
                'attribute' => 'status',
                'format' => 'raw',
                'filter' => false,
                'hAlign' => 'center',
                'vAlign' => 'middle',
                #'format' => ['decimal', 2],
                'value' => function($data) {
                    if ($data['status'] > '0') {
                        return '<i class="glyphicon glyphicon-ok"></i> ใช้งาน';
                    } else {
                        return '<i class="glyphicon glyphicon-remove"></i> ปิดใช้งาน';
                    }
                },
            ],
            'create_date',
            'modify_date',
            'loginname',
            'updatename',
        ],
    ]) ?>

</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>