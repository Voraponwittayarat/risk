<?php

use yii\helpers\Html;
use yii\widgets\DetailView;

/* @var $this yii\web\View */
/* @var $model frontend\models\Member */

$this->title = $model->id;
$this->title =''. ' '.'ชื่อ : ' . ' ' . $model->member_name. ' '.'หน่วยงานหลัก : ' . ' ' . $model->departname1 ;
$this->params['breadcrumbs'][] = ['label' => 'ข้อมูลบุคลากร', 'url' => ['index']];
?>
<div class="member-view">
    <?= DetailView::widget([
        'model' => $model,
        'attributes' => [
           // 'id',
            [
            'format'=>'raw',
            'attribute'=>'img',
            'value'=>Html::img($model->photoViewer,['class'=>'img-thumbnail','style'=>'width:150px;'])
            ],
            'member_name',
            'cid',
            'departname1',
            'departname2',
            'positionname',
            //'priority',
            'priority',
            'teamname',
            'create_date',
            'modify_date',
            'loginname',
            'updatename',
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
                        return '<span class="glyphicon glyphicon-ok-sign"></span> ยังปฏิบัติงานอยู่';
                    } else {
                        return '<span class="glyphicon glyphicon-remove-sign"></span> ไม่ได้ปฏิบัติงานแล้ว';
                    }
                },
            ],
        ],
    ]) ?>

</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>