<?php

use yii\helpers\Html;
//use yii\grid\GridView;
use kartik\grid\GridView;
use yii\widgets\Pjax;
use yii\db\Query;
use kartik\date\DatePicker;

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
            'filterModel' => $searchModel,
            'headerRowOptions' => ['style' => 'background-color:#cccccc'],
            'responsiveWrap' => false,
            //'responsive' => true,
            //'hover'=>true,
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
                'header'=>Html::checkbox('selection_all', false, ['class'=>'select-on-check-all', 'value'=>1, 'onclick'=>'$(".kv-row-checkbox").prop("checked", $(this).is(":checked"));']),
                'contentOptions'=>['class'=>'kv-row-select'],
                'content'=>function($model, $key){
                    return Html::checkbox('selection[]', false, ['class'=>'kv-row-checkbox', 'value'=>$key, 'onclick'=>'$(this).closest("tr").toggleClass("danger");', 'disabled'=> isset($model->stopDelete)&&!($model->stopDelete===1)]);
                },
                'hAlign'=>'center',
                'vAlign'=>'middle',
                'hiddenFromExport'=>true,
                'mergeHeader'=>true,
            ],
            [
                'header' => 'ชื่อความเสี่ยง',
                'attribute' => 'storename',
                'format' => 'raw',
                'headerOptions' => ['class' => 'text-center'],
                'contentOptions' => [
                    'style'=>'max-width:1000px; overflow: auto; white-space: normal; word-wrap: break-word;'
                ],
            ],
            [
                'label' => 'ระดับ',
                'attribute' => 'level_id',
                'contentOptions' => ['class' => 'text-center'],
                'headerOptions' => ['class' => 'text-center'],
            ],
            [
                'attribute'=>'date_report',
                'value' => function ($model, $index, $widget) {
                    return Yii::$app->formatter->asDate($model->date_report);
                },
                'filterType' => GridView::FILTER_DATE,
                'filterWidgetOptions' => [
				    'language' => 'th',
                    //'type' => DatePicker::TYPE_COMPONENT_APPEND,
                    'pluginOptions' => [
                        'format' => 'yyyy-mm-dd',
                        'autoclose' => true,
                        'todayHighlight' => true,
                    ]
                ],
                'width' => '200px',
                'hAlign' => 'center',
            ],
            [
                'label' => 'เวลา',
                'attribute' => 'time_report',
                'contentOptions' => ['class' => 'text-center'],
                'headerOptions' => ['class' => 'text-center'],   
            ],
            [
                'header' => 'ผู้รายงาน',
                'attribute' => 'loginname',
                'contentOptions' => ['class' => 'text-left'],
                'headerOptions' => ['class' => 'text-center'],   
            ],
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
                'headerOptions' => ['class' => 'text-center'], 
                    //  'group' => true,
            ],
           
            //'locationname',
            //'irdepname',
            [
                'label' => 'สถานะ',
                'attribute' => 'status_risk',
                'format' => 'raw',
                'filter' => false,
                'contentOptions' => ['class' => 'text-center'],
                'headerOptions' => ['class' => 'text-center'],   
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
                'contentOptions' => ['class' => 'text-center'],
                'headerOptions' => ['class' => 'text-center'], 
                'value' => function($data) {
                    return
                        Html::a('<i class="glyphicon glyphicon-send"></i> Send', ['risk/send','id' => $data->id], ['class' => 'btn btn-danger btn-xs']);
                }
            ],
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
        'responsiveWrap' => false,
        //'responsive' => true,
        //'hover'=>true,
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
                'header' => 'ชื่อความเสี่ยง',
                'attribute' => 'storename',
                'format' => 'raw',
                'headerOptions' => ['class' => 'text-center'],
                'contentOptions' => [
                    'style'=>'max-width:1000px; overflow: auto; white-space: normal; word-wrap: break-word;'
                ],
            ],
            [
                'label' => 'ระดับ',
                'attribute' => 'level_id',
                'contentOptions' => ['class' => 'text-center'],
                'headerOptions' => ['class' => 'text-center'],
            ],
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
                'headerOptions' => ['class' => 'text-center'], 
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
                'headerOptions' => ['class' => 'text-center'], 
                    //  'group' => true,
            ],
            //'create_date',
            [
                'attribute' => 'date_report',
                'label' => 'วันรายงาน',
                'contentOptions' => ['class' => 'text-center'],
                'headerOptions' => ['class' => 'text-center'], 
            ],
            [
                'attribute' => 'send_date',
                'label' => 'วันลงทะเบียน',
                'contentOptions' => ['class' => 'text-center'],
                'headerOptions' => ['class' => 'text-center'], 
            ],
            [
                'attribute' => 'send_use',
                'label' => 'Send By',
                'contentOptions' => ['class' => 'text-center'],
                'headerOptions' => ['class' => 'text-center'], 
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