<?php

use yii\helpers\Html;
use yii\helpers\Url;
//use yii\grid\GridView;
use kartik\grid\GridView;
use kartik\date\DatePicker;
use yii\widgets\Pjax;
use yii\db\Query;
use yii\bootstrap\Modal;


use frontend\models\Reviewresults;

/* @var $this yii\web\View */
/* @var $searchModel frontend\models\RiskreviewSearch */
/* @var $dataProvider yii\data\ActiveDataProvider */

$this->title = 'ผลการทบทวนความเสี่ยง';
//$this->params['breadcrumbs'][] = $this->title;
?>
<div class="riskreview-index">

    <?php Pjax::begin(); ?>
    <?= GridView::widget([
        'dataProvider' => $dataProvider,
        'filterModel' => $searchModel,
         'headerRowOptions' => ['style' => 'background-color:#cccccc'],
            'panel'=>[
                  'type'=>GridView::TYPE_DEFAULT,
                 // 'before'=>Html::button('<i class="glyphicon glyphicon-plus"></i> บันทึกข้อมูล',  ['value' => Url::to(['riskstore/create']), 'title' => 'เพิ่มข้อมูลความเสี่ยง', 'class' => 'showModalButton btn btn-success']),
                'heading'=>'<span class="glyphicon glyphicon-lamp"></span> ผลการทบทวนความเสี่ยง',
                'after' => 'วันที่ประมวลผล '.date('Y-m-d H:i:s').' น.',
                //'footer'=>true
            ],
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
            'exportConfig' => [
                   GridView::CSV => ['label' => 'Export as CSV', 'filename' => 'riskreviewresults_'.date('Y-d-m')],
                   GridView::PDF => ['label' => 'Export as PDF', 'filename' => 'riskreviewresults_'.date('Y-d-m')],
                   GridView::EXCEL=> ['label' => 'Export as EXCEL', 'filename' => 'riskreviewresults_'.date('Y-d-m')],
                   GridView::TEXT=> ['label' => 'Export as TEXT', 'filename' => 'riskreviewresults_'.date('Y-d-m')],
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
            [
              'attribute' => 'risk_id',
              'label' => 'ID Risk',
              'contentOptions' => ['class' => 'text-center'],
              'headerOptions' => ['class' => 'text-center']
            ],
            'riskvisit',
            [
            'attribute'=>'review_date',
            'value' => function ($model, $index, $widget) {
                return Yii::$app->formatter->asDate($model->review_date);
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
                'attribute' => 'reviewresults_id',
                'value' => 'reviewresults.reviewresults_name',
                'label' => 'ผลการทบทวน',
                'width' => '150px',
                'filterType' => GridView::FILTER_SELECT2,
                'filter' => Reviewresults::GetListName(),
                'filterWidgetOptions' => [
                    'pluginOptions' => ['allowClear' => true],
                    ],
                'filterInputOptions' => ['placeholder' => 'กรุณาเลือก'],
                    //  'group' => true,
            ],
            [
                'attribute' => 'repeat',
                'filter' => ['N' => 'ไม่มีการทบทวนซ้ำ', 'Y' => 'ทบทวนซ้ำ'],//กำหนด filter แบบ dropDownlist จากข้อมูล array
                'format' => 'raw',
                'value' => function($model, $key, $index, $column){
                    return $model->repeat == 'N' ? '<span class="label label-success">ไม่มีการทบทวนซ้ำ</span>' : '<span class="label label-danger">ทบทวนซ้ำ</span>';
                }
            ],
            [
                'attribute' => 'discharge',
                'filter' => ['N' => 'ไม่จำหน่าย', 'Y' => 'จำหน่าย'],//กำหนด filter แบบ dropDownlist จากข้อมูล array
                'format' => 'raw',
                'value' => function($model, $key, $index, $column){
                    return $model->discharge == 'N' ? '<span class="label label-warning">ไม่มีการจำหน่าย</span>' : '<span class="label label-danger">จำหน่าย</span>';
                }
            ],
            [
                'attribute' => 'status_risk',
                //'label' => 'สถานะ',
                'filter' => ['ทบทวน' => 'ทบทวน', 'จำหน่าย' => 'จำหน่าย'],//กำหนด filter แบบ dropDownlist จากข้อมูล array
                'format' => 'raw',
                'value' => function($model, $key, $index, $column){
                    return $model->status_risk == 'ทบทวน' ? '<span class="label label-warning">ทบทวน</span>' : '<span class="label label-default">จำหน่าย</span>';
                }
            ],

            //['class' => 'yii\grid\ActionColumn'],
            [
                'class' => 'kartik\grid\ActionColumn',
                'header' => 'Action', 
                //'buttonOptions'=>['class'=>'btn btn-default'],
                'template'=>'{view} {update} {delete}',
                'visibleButtons' => [
                    'update' => function ($model) {
                        return $model->discharge != 'Y';
                        return $model->status_risk != 'จำหน่าย';

                    },
                    'delete' => function ($model) {
                        return $model->discharge != 'Y';
                        return $model->status_risk != 'จำหน่าย';
           
                    },


                ], 
                'visible'=> Yii::$app->user->isGuest ? false : true,
                'buttons'=>[
                    'view'=>function ($url, $model,$key) {
                        return Html::a('<i class="glyphicon glyphicon-eye-open"></i> เปิดดู', ['riskreview/view', 'id' => $model->id,'id_regist' => $model->riskregister_id,'riskvisit' => $model->riskvisit], ['class' => 'btn btn-success btn-xs']);
                    },
                    'update'=>function($url,$model,$key){                        
                        return  Html::a('<i class="glyphicon glyphicon-pencil"></i> แก้ไข', ['riskreview/update', 'id' => $model->id,'id_regist' => $model->riskregister_id,'riskvisit' => $model->riskvisit], ['class' => 'btn btn-warning btn-xs']);
                    },
                    'delete'=>function ($url, $model,$key) {
                        return Html::a('<i class="glyphicon glyphicon-trash"></i> ลบ', ['delete', 'id' => $model->id, 'riskvisit' => $model->riskvisit], ['class' => 'btn btn-danger btn-xs',
                            'data' => [
                                'confirm' => 'คุณแน่ใจหรือว่าต้องการลบรายการนี้หรือไม่?',
                                'method' => 'post',
                            ],
                        ]);

                    },
                  ]
            ],
        ],
    ]); ?>
    <?php Pjax::end(); ?>
</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>