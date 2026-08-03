<?php

use yii\helpers\Html;
//use yii\grid\GridView;
use kartik\grid\GridView;
use yii\widgets\Pjax;
use yii\db\Query;

use yii\bootstrap\Modal;
use yii\helpers\Url;

use frontend\models\Program;
use frontend\models\Riskstore;
use frontend\models\Duration;
use frontend\models\Level;
/* @var $this yii\web\View */
/* @var $searchModel frontend\models\RiskSearch */
/* @var $dataProvider yii\data\ActiveDataProvider */

$this->title = 'ความเสี่ยง';
//$this->params['breadcrumbs'][] = $this->title;
?>
<div class="risk-index">   
    <p class='text-center'>
        <?= Html::a('<i class="glyphicon glyphicon-send"></i> รายงานความเสี่ยง', ['/risk/create'], ['class' => 'btn btn-success', 'title' => 'รายงานความเสี่ยง']) ?>
        <?= Html::a('<i class="glyphicon glyphicon-search"></i> ค้นหาชื่อความเสี่ยง', ['risk/searchrisk'], ['class' => 'btn btn-warning', 'title' => 'ค้นหาชื่อความเสี่ยง']) ?>
    </p>
<?php Pjax::begin(); ?>    
    <?= GridView::widget([
            'dataProvider' => $dataProvider,
            //'filterModel' => $searchModel,
            'headerRowOptions' => ['style' => 'background-color:#cccccc'],
            /*'panel'=>[
                'type'=>GridView::TYPE_DEFAULT,
                'before'=>Html::a('<i class="glyphicon glyphicon-send"></i> รายงานความเสี่ยง', ['risk/create'], ['class' => 'btn btn-success', 'title' => 'รายงานความเสี่ยง']) .' '.Html::a('<i class="glyphicon glyphicon-search"></i> ค้นหาชื่อความเสี่ยง', ['risk/searchrisk'], ['class' => 'btn btn-warning' , 'title' => 'ค้นหาชื่อความเสี่ยง']),
                //'heading'=>'สถานที่เกิดความเสี่ยง',
                //'after' => 'วันที่ประมวลผล '.date('Y-m-d H:i:s').' น.',
                //'footer'=>true
            ], */
            'responsive' => true,
            'responsiveWrap' => false,
            'hover'=>true,
            'floatHeader' => true,  // header เลื่อนตาม
            'pager' => [
                    'options'=>['class'=>'pagination'],   // set clas name used in ui list of pagination
                    'prevPageLabel' => 'ก่อนหน้า',   // Set the label for the "previous" page button
                    'nextPageLabel' => 'ถัดไป',   // Set the label for the "next" page button
                    'firstPageLabel'=>'เริ่มต้น',   // Set the label for the "first" page button
                    'lastPageLabel'=>'สุดท้าย',    // Set the label for the "last" page button
                    'nextPageCssClass'=>'ถัดไป',    // Set CSS class for the "next" page button
                    'prevPageCssClass'=>'ก่อนหน้า',    // Set CSS class for the "previous" page button
                    'firstPageCssClass'=>'เริ่มต้น',    // Set CSS class for the "first" page button
                    'lastPageCssClass'=>'สุดท้าย',    // Set CSS class for the "last" page button
                    'maxButtonCount'=>10,    // Set maximum number of page buttons that can be displayed
            ], 
            'exportConfig' => [
                   GridView::CSV => ['label' => 'Export as CSV', 'filename' => 'risk_'.date('Y-d-m')],
                   GridView::PDF => ['label' => 'Export as PDF', 'filename' => 'risk_'.date('Y-d-m')],
                   GridView::EXCEL=> ['label' => 'Export as EXCEL', 'filename' => 'risk_'.date('Y-d-m')],
                   GridView::TEXT=> ['label' => 'Export as TEXT', 'filename' => 'risk_'.date('Y-d-m')],
                ],
        // set your toolbar
            'toolbar' =>  [
                ['content' => 
                    Html::a('<i class="glyphicon glyphicon-repeat"></i>', ['index'], ['data-pjax' => 0, 'class' => 'btn btn-default', 'title' => Yii::t('app', 'รีเซ็ต')])
                ],
                '{toggleData}',
                '{export}',
            ],
        // set export properties
            'export' => [
                'fontAwesome' => true
            ],
            'pjax' => true,
            'pjaxSettings' => [
                'neverTimeout' => true,
                'beforeGrid' => '',
                'afterGrid' => '',
            ],
        'columns' => [
            ['class' => 'yii\grid\SerialColumn'],
            'date_report',
            [
            'header' => 'เวร',
            'attribute' => 'durationname'
            ],
            'programname',
           //'time_report',
            [
                    'attribute' => 'storename',
                    'format' => 'raw',
                    'contentOptions' => [
                        'style'=>'max-width:1000px; overflow: auto; white-space: normal; word-wrap: break-word;'
                    ],
            ],
            [
                    'attribute' => 'detail',
                    'format' => 'raw',
                    'contentOptions' => [
                        'style'=>'max-width:1000px; overflow: auto; white-space: normal; word-wrap: break-word;'
                    ],
            ],
            [
            'header' => 'ระดับ',
            'attribute' => 'level_id'
            ],
            //'detail_hosxp:ntext',
            //'departgroupname',
            //'departname',
            //'locationname',
            //'irdepname',
            //'user_ir_type',
            //'user_ir',
            //'program_id',
            //'affected',
            [
            'header' => 'แก้',
            'attribute' => 'edit'
            ],
            //'problem_basic:ntext',
            //'image:ntext',
            //'inform_id',
           // 'status_risk',
            [
                'label' => 'สถานะ',
                'attribute' => 'status_risk',
                'format' => 'raw',
                'filter' => false,
                'hAlign' => 'center',
                'vAlign' => 'middle',
                #'format' => ['decimal', 2],
                'value' => function($data) {
                        if ($data['status_risk'] == 'รายงาน') {
                            return '<i class="glyphicon glyphicon-ok"></i>..รายงานแล้ว';
                        } else {
                            return '<i class="glyphicon glyphicon-remove"></i>..รายงานไม่สำเร็จ';
                        }
                    },
            ],
            //'loginname',
            //'created_by',
            //'updated_by',
            //'create_date',
            //'modify_date',

           // ['class' => 'yii\grid\ActionColumn'],
            [
                'class' => 'kartik\grid\ActionColumn',
                'header' => 'Action', 
                //'buttonOptions'=>['class'=>'btn btn-default'],
                'template'=>'{view} {update} {delete}',
             /*   'visibleButtons' => [
                    'view' => function ($model) {
                        return $model->status_risk == 'รายงาน';
                    },
                    'update' => function ($model) {
                        return $model->status_risk == 'รายงาน';
                    },
                    'delete' => function ($model) {
                        return $model->status_risk == 'รายงาน';
                    },
                ], */
                'visible'=> Yii::$app->user->isGuest ? false : true,
                'buttons'=>[
                    'view'=>function ($url, $model,$key) {
                        $t = 'index.php?r=risk/view&id='.$model->id;
                            return Html::a('<i class="glyphicon glyphicon-eye-open"></i>',$url,['class'=>'btn btn-success btn-xs']);
                    },
                    'update'=>function ($url, $model,$key) {
                        $t = 'index.php?r=risk/update&id='.$model->id;
                            return Html::a('<i class="glyphicon glyphicon-pencil"></i>',$url,['class'=>'btn btn-warning btn-xs']);
                    },
                    'delete'=>function ($url, $model,$key) {
                        $t = 'index.php?r=risk/delete&id='.$model->id;
                            return Html::a('<i class="glyphicon glyphicon-trash"></i>',$url,['class'=>'btn btn-danger btn-xs']);
                    },
                  ]
            ],

        ],
    ]); ?>
<?php Pjax::end(); ?>
</div>
<!--
<div class="alert alert-success alert-dismissible" role="alert">
  <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>
  <h4><b class="text-red">หมายเหตุ : </b></h4>
    <ol>
        <li class="list-group-item-info"> รายการความเสี่ยงในหน้านี้ จะแสดงเฉพาะ ของตัวเองรายงาน ไม่ว่าจะรายงานต้นเองหรือรายงานผู้อื่น</li>
        <li class="list-group-item-info"> รายการความเสี่ยงในหน้านี้จะแสดงเฉพาะที่มีสถานนะ "รายงาน" เท่านั้น</li>
        <li class="list-group-item-danger"> กำลังปรับปรุงให้แผนกตัวเองเห็นรายงานความเสี่ยงทั้งหมดแต่ไม่สามารถแก้ไขหรือลบของผู้อื่นได้ สามารถดูได้อย่างเดี่ยว</li>
    </ol>
</div>
-->
<?= \bluezed\scrollTop\ScrollTop::widget() ?>