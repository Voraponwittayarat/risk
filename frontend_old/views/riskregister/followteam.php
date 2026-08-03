<?php
use kartik\grid\GridView;
use yii\helpers\Html;
use yii\helpers\Url;
use kartik\date\DatePicker;
use yii\bootstrap\ActiveForm;
use yii\helpers\ArrayHelper;
use yii\widgets\Pjax;

use frontend\models\Department;
use frontend\models\Program;
use frontend\models\Riskstore;
use frontend\models\Level;
use frontend\models\Status;
use frontend\models\Levelwarning;

use dektrium\user\models\User;


$this->title = 'ติดตามความเสี่ยงฝ่าย';
//$this->params['breadcrumbs'][] = $this->title;
?>

<?php Pjax::begin(); ?>
    <?= GridView::widget([
        'dataProvider' => $dataProvider,
        'filterModel' => $searchModel,
        'headerRowOptions' => ['style' => 'background-color:#cccccc'],
            'panel'=>[
                  'type'=>GridView::TYPE_DEFAULT,
                 // 'before'=>Html::button('<i class="glyphicon glyphicon-plus"></i> บันทึกข้อมูล',  ['value' => Url::to(['riskstore/create']), 'title' => 'เพิ่มข้อมูลความเสี่ยง', 'class' => 'showModalButton btn btn-success']),
                'heading'=>'<span class="glyphicon glyphicon-bell"></span> ติดตามความเสี่ยงฝ่าย',
                'after' => 'วันที่ประมวลผล '.date('Y-m-d H:i:s').' น.',
                //'footer'=>true
            ],
            'responsive' => true,
            'hover'=>true,
            //'floatHeader' => true,  // header เลื่อนตาม
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
                   GridView::CSV => ['label' => 'Export as CSV', 'filename' => 'riskfollow_'.date('Y-d-m')],
                   GridView::PDF => ['label' => 'Export as PDF', 'filename' => 'riskfollow_'.date('Y-d-m')],
                   GridView::EXCEL=> ['label' => 'Export as EXCEL', 'filename' => 'riskfollow_'.date('Y-d-m')],
                   GridView::TEXT=> ['label' => 'Export as TEXT', 'filename' => 'riskfollow_'.date('Y-d-m')],
                ],
        // set your toolbar
            'toolbar' =>  [
                ['content' => 
                    Html::a('<i class="glyphicon glyphicon-repeat"></i>', ['follow'], ['data-pjax' => 0, 'class' => 'btn btn-default', 'title' => Yii::t('app', 'รีเซ็ต')])
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
            'rowOptions' => function($model){
                if($model['register_date'] < $model['date_report']){
                  //return ['style'=>'background-color: #4dff4d'];
                    return ['class' => 'danger'];
                }else{
                  //return ['style'=>'background-color: #ff4d4d'];
                    return ['class' => 'default']; 
                }
            },    
        'columns' => [
            ['class' => 'yii\grid\SerialColumn'],
            //'id',
            //'id_risk',
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
                'attribute'=>'register_date',
                'value' => function ($model, $index, $widget) {
                    return Yii::$app->formatter->asDate($model->register_date);
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
            ],/*
            [
                'attribute' => 'created_by',
                'value' => 'login.username',
                'label' => 'ผู้รายงาน',
                'width' => '150px',
                'filterType' => GridView::FILTER_SELECT2,
                'filter' => User::GetListName(),
                'filterWidgetOptions' => [
                    'pluginOptions' => ['allowClear' => true],
                    ],
                'filterInputOptions' => ['placeholder' => 'กรุณาเลือก'],
                    //  'group' => true,
            ],*/
            [
                'attribute' => 'department_id',
                'value' => 'depart.depart_name',
                'label' => 'แผนกที่รายงาน',
                'width' => '150px',
                'filterType' => GridView::FILTER_SELECT2,
                'filter' => Department::GetListName(),
                'filterWidgetOptions' => [
                    'pluginOptions' => ['allowClear' => true],
                    ],
                'filterInputOptions' => ['placeholder' => 'กรุณาเลือก'],
                    //  'group' => true,
            ],
            [
                'attribute' => 'program_id',
                'value' => 'program.program_name',
                'label' => 'โปรแกรมเชื่อมโยง',
                'width' => '150px',
                'filterType' => GridView::FILTER_SELECT2,
                'filter' => Program::GetListName(),
                'filterWidgetOptions' => [
                    'pluginOptions' => ['allowClear' => true],
                    ],
                'filterInputOptions' => ['placeholder' => 'กรุณาเลือก'],
                    //  'group' => true,
            ],
            [
                'attribute' => 'riskstore_id',
                'value' => 'riskstore.riskstore_name',
                'label' => 'ชื่อความเสี่ยง',
                'width' => '150px',
                'filterType' => GridView::FILTER_SELECT2,
                'filter' => Riskstore::GetListName(),
                'filterWidgetOptions' => [
                    'pluginOptions' => ['allowClear' => true],
                    ],
                'filterInputOptions' => ['placeholder' => 'กรุณาเลือก'],
                    //  'group' => true,
            ],
   
            [
                'attribute' => 'level_id',
                'value' => 'level.level_code',
                'label' => 'ระดับ',
                'width' => '150px',
                'filterType' => GridView::FILTER_SELECT2,
                'filter' => Level::GetListName(),
                'filterWidgetOptions' => [
                    'pluginOptions' => ['allowClear' => true],
                    ],
                'filterInputOptions' => ['placeholder' => 'กรุณาเลือก'],
                    //  'group' => true,
            ],
            [
                'attribute' => 'repeat_code',
                'value' => 'repeat_code',
                'label' => 'ทบทวน',
                'width' => '150px',
                'filterType' => GridView::FILTER_SELECT2,
                'filter' => Levelwarning::GetListName(),
                'filterWidgetOptions' => [
                    'pluginOptions' => ['allowClear' => true],
                    ],
                'filterInputOptions' => ['placeholder' => 'กรุณาเลือก'],
                    //  'group' => true,
            ],
            [
                'attribute' => 'status_risk',
                'value' => 'status_risk',
                'label' => 'สถานนะ',
                'width' => '150px',
                'filterType' => GridView::FILTER_SELECT2,
                'filter' => Status::GetListName(),
                'filterWidgetOptions' => [
                    'pluginOptions' => ['allowClear' => true],
                    ],
                'filterInputOptions' => ['placeholder' => 'กรุณาเลือก'],
                    //  'group' => true,
            ],
            [
                'class' => 'kartik\grid\ActionColumn',
                'header' => 'ปริ้น', 
                //'buttonOptions'=>['class'=>'btn btn-default'],
                'template'=>'{print}',
                'visibleButtons' => [
//                    'print' => function ($model) {
//                        return $model->discharge != 'Y';
//                        return $model->status_risk != 'จำหน่าย';
//
//                    }
                ], 
                'visible'=> Yii::$app->user->isGuest ? false : true,
                'buttons'=>[
                    'print'=>function ($url, $model,$key) {
                        return Html::a('<i class="glyphicon glyphicon-print"></i>', ['riskregister/print', 'id' => $model->id,'id_risk' => $model->id_risk], ['class' => 'btn btn-default btn-xs','title' => 'ปริ้น']);
                    }
                  ]
            ],
        ],
    ]); ?>
    <?php Pjax::end(); ?>
	<div class="alert alert-warning alert-dismissible" role="alert">
		<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>
		<h4><b class="text-red">Note ! : ระดับการทบทวน (Review)</b></h4>
        <p> <span class="label label-primary">RV1</span> = ทบทวนภายใน 14 วัน <span class="label label-info">RV2</span> = ทบทวนภายใน 7 วัน <span class="label label-warning">RV3</span> = ทบทวนภายใน 3 วัน <span class="label label-danger">RV4</span> = ทบทวนภายใน 24 ชม.</p>
	</div>

</div>

<?= \bluezed\scrollTop\ScrollTop::widget() ?>