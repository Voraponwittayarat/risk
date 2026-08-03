<?php

use yii\helpers\Html;
//use yii\grid\GridView;
use kartik\grid\GridView;
use yii\widgets\Pjax;
use yii\db\Query;

use yii\bootstrap\Modal;
use yii\helpers\Url;

use frontend\models\Department;
/* @var $this yii\web\View */
/* @var $searchModel frontend\models\RiskSearch */
/* @var $dataProvider yii\data\ActiveDataProvider */

$this->title = 'ตรวจสอบความเสี่ยง';
//$this->params['breadcrumbs'][] = $this->title;
?>
<div class="risk-index">   
    <div class="panel panel-danger">
        <div class="panel-heading"><span class="glyphicon glyphicon-send" aria-hidden="true"></span> ลงทะเบียนความเสี่ยง </div>
        <div class="panel-body">
<?php Pjax::begin(); ?>    
    <?= GridView::widget([
            'dataProvider' => $dataProvider,
            //'filterModel' => $searchModel,
            'headerRowOptions' => ['style' => 'background-color:#cccccc'],
            'responsive' => true,
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
            'pjax' => true,
            'pjaxSettings' => [
                'neverTimeout' => true,
                'beforeGrid' => '',
                'afterGrid' => '',
            ],
        'columns' => [
            ['class' => 'yii\grid\SerialColumn'],
            [
                'attribute' => 'storename',
                'format' => 'raw',
                'contentOptions' => [
                    'style'=>'max-width:1000px; overflow: auto; white-space: normal; word-wrap: break-word;'
                ],
            ],
            [
            'header' => 'ระดับ',
            'attribute' => 'level_id'
            ],
            'date_report',
            [
            'header' => 'เวลา',
            'attribute' => 'time_report'
            ],
            [
            'header' => 'เวร',
            'attribute' => 'durationname'
            ],
            // 'programname',
            //'time_report',

            //'detail_hosxp:ntext',
            //'departgroupname',
            //'departname',
            'loginname',
            [
                'attribute' => 'departname',
                'format' => 'raw',
                'contentOptions' => [
                    'style'=>'max-width:1000px; overflow: auto; white-space: normal; word-wrap: break-word;'
                ],
            ],
           
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
            //'status_risk',
            [
                'label' => 'สถานะ',
                'attribute' => 'status_risk',
                'format' => 'raw',
                'filter' => false,
                'hAlign' => 'center',
                'vAlign' => 'middle',
                #'format' => ['decimal', 2],
                'value' => function($data) {
                        if ($data['status_risk'] == 'ตรวจสอบ') {
                            return '<i class="glyphicon glyphicon-ok"></i>';
                        } else {
                            return '<i class="glyphicon glyphicon-remove"></i> รอ...ตรวจสอบ';
                        }
                    },
            ],
            [
                //'attribute' => 'ลงทะเบียน',
               'label' => 'Action',
                'format' => 'raw',
                'value' => function($data) {
                    return
                        Html::a('<i class="glyphicon glyphicon-send"></i> Send', ['risk/send','id' => $data->id], ['class' => 'btn btn-danger btn-xs']);
                }
            ],
           
            //'created_by',
            //'updated_by',
            //'create_date',
            //'modify_date',

           // ['class' => 'yii\grid\ActionColumn'],


        ],
    ]); ?>
<?php Pjax::end(); ?>
                    </div>
</div>

</div>

<div class="panel panel-primary">
        <div class="panel-heading"><span class="glyphicon glyphicon-check" aria-hidden="true"></span> ตรวจสอบความเสี่ยงที่ผ่านการลงทะเบียนเแล้ว </div>
        <div class="panel-body">
<?php Pjax::begin(); ?>
         <?= GridView::widget([
        'dataProvider' => $dataProvider2,
        'filterModel' => $searchModel2, 
        'headerRowOptions' => ['style' => 'background-color:#cccccc'],
       'responsive' => true,
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
       'pjax' => true,
       'pjaxSettings' => [
           'neverTimeout' => true,
           'beforeGrid' => '',
           'afterGrid' => '',
       ],
        'columns' => [
            ['class' => 'yii\grid\SerialColumn'],
            //'id_risk',
            //'riskstore_id',
            [
                'attribute' => 'storename',
                'format' => 'raw',
                'contentOptions' => [
                    'style'=>'max-width:1000px; overflow: auto; white-space: normal; word-wrap: break-word;'
                ],
            ],
            [
                'attribute' => 'level_id',
                'label' => 'ระดับ',
                'width' => '5%',
            ],
            //'created_by',
           // 'loginname',
//            [
//                'attribute' => 'loginname',
//                'label' => 'รายงานโดย',
//                'width' => '10%',
//            ],
            [
                'attribute' => 'department_id',
                'value' => 'depart.depart_name',
                'label' => 'แผนกที่รายงาน',
                'width' => '100px',
                'filterType' => GridView::FILTER_SELECT2,
                'filter' => Department::GetListName(),
                'filterWidgetOptions' => [
                    'pluginOptions' => ['allowClear' => true],
                    ],
                'filterInputOptions' => ['placeholder' => 'กรุณาเลือก'],
                    //  'group' => true,
            ],
            [
                'attribute' => 'user_ir',
                'value' => 'departir.depart_name',
                'label' => 'รายงานถึงแผนก',
                'width' => '100px',
                'filterType' => GridView::FILTER_SELECT2,
                'filter' => Department::GetListName(),
                'filterWidgetOptions' => [
                    'pluginOptions' => ['allowClear' => true],
                    ],
                'filterInputOptions' => ['placeholder' => 'กรุณาเลือก'],
                    //  'group' => true,
            ],
            //'create_date',
            [
                'attribute' => 'date_report',
                'label' => 'วันที่รายงาน',
                'width' => '10%',
            ],
            'send_date',
            //'send_date:date:ลงทะเบียน', // แสดงผลวันที่
            //'send_use',
            [
                'attribute' => 'send_use',
                'label' => 'ลงทะเบียนโดย',
                'width' => '11%',
            ],

            //['class' => 'yii\grid\ActionColumn'],
            [
                'class' => 'kartik\grid\ActionColumn',
                'header' => 'Action', 
                //'buttonOptions'=>['class'=>'btn btn-default'],
                'template'=>'{update}',
//                'visibleButtons' => [
//                    'update' => function ($model) {
//                        return $model->status_risk == 'ลงทะเบียน';
//                    },
//
//                ], 
                'visible'=> Yii::$app->user->isGuest ? false : true,
                'buttons'=>[
                    'update'=>function($url,$model,$key){                        
                        return  Html::a('<i class="glyphicon glyphicon-check"></i> Approve', ['riskregister/update', 'id' => $model->id,'id_risk' => $model->id_risk], ['class' => 'btn btn-primary btn-xs']);
                    },
                  ]
            ],
        ],
    ]); ?>
    <?php Pjax::end(); ?>
        </div>
</div>

<!--
<div class="alert alert-success alert-dismissible" role="alert">
  <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>
  <h4><b class="text-red">หมายเหตุ : </b></h4>
    <ol>
        <li class="list-group-item-info"> หลังจากกด send ข้อมูลจากตาราง risk จะ ถูก insert ไปยังตาราง riskregister และ insert ฟิว status_risk='ตรวจสอบ' where id=id </li>
    </ol>
</div>
-->
<?= \bluezed\scrollTop\ScrollTop::widget() ?>