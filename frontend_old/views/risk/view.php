<?php

use yii\helpers\Html;
//use yii\widgets\DetailView;
use kartik\detail\DetailView;



/* @var $this yii\web\View */
/* @var $model frontend\models\Risk */

$this->title =''. ' '.'โปรแกรมความเสี่ยง : ' . ' ' . $model->programname. ' '.'ความเสี่ยง : ' . ' ' . $model->storename ;
$this->params['breadcrumbs'][] = ['label' => 'ความเสี่ยง', 'url' => ['index']];
?>
<div class="risk-view">
     <div class="alert alert-success alert-dismissible fade in" role="alert"> 
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">×</span>
        </button> 
        <h4><span class="glyphicon glyphicon-time" aria-hidden="true"></span> <?= Html::encode($this->title) ?></h4> 
    </div>

            <?= DetailView::widget([
                'model' => $model,
                'hover' => true,
                'hideAlerts' => true,
                'enableEditMode' => true,
                'mode' => DetailView::MODE_VIEW,
                'hAlign' => 'left',
                'attributes' => [
                    [
                       'group' => true,
                       'label' => '<span class="glyphicon glyphicon-eye-open" aria-hidden="true"></span> ความเสี่ยงที่ได้จากการรายงาน ของคุณ...',
                       'rowOptions' => ['class' => 'success']
                    ],
                      // cal_1  
                        [
                            'columns' => [
                                [
                                    'label' => 'ID Risk',
                                    'value'=>$model->id,
                                    'labelColOptions' => ['style' => 'width: 20%'],
                                    'valueColOptions'=>['style'=>'width:20%'],
                                    'displayOnly' => true,
                                ],
                                [
                                    'label' => 'วันที่เวลารายงาน',
                                    'value'=>$model->date_report. '  '. $model->time_report.'  '.'น.',
                                    'valueColOptions'=>['style'=>'width:20%'],
                                    'displayOnly' => true,
                                ],
                                [
                                    'attribute' => 'durationname',
                                    'format' => 'raw',
                                    //'label' => 'ผู้ลงทะเบียน',
                                    'value' => $model->durationname,
                                    'labelColOptions' => ['style' => 'width: 10%'],
                                    'valueColOptions' => ['style' => 'width:10%'],
                                    'displayOnly' => true,
                                ],
            
                               
                            ],
                        ],
            // cal_2        
                        [
                            'columns' => [
                                [
                                    //'attribute' => 'locationname',
                                    'format' => 'raw',
                                    'label' => 'สถานที่พบเหตุ',
                                    'value' => $model->locationname,
                                    'labelColOptions' => ['style' => 'width: 20%'],
                                    'valueColOptions' => ['style' => 'width:50%'],
                                    'displayOnly' => true,
                                ],
                                [
                                    'attribute'=>'user_ir_type', 
                                    //'label'=>'ประเภทการรายงาน?',
                                    //'filter' => [1 => 'รายงานตนเอง', 2 => 'รายงานผู้อื่น'],//กำหนด filter แบบ dropDownlist จากข้อมูล array
                                    'format'=>'raw',
                                    'type'=>DetailView::INPUT_SWITCH,
                                    'widgetOptions' => [
                                        'pluginOptions' => [
                                            '1' => 'รายงานตนเอง',
                                            '2' => 'รายงานผู้อื่น',
                                        ]
                                    ],
                                    'value'=>$model->user_ir_type == 1 ? '<span class="label label-success">รายงานตนเอง</span>' : '<span class="label label-danger">รายงานผู้อื่น</span>',
                                    'valueColOptions'=>['style'=>'width:35%']
                                ],
                            ],
                        ],
            // cal_3
                        [
                           'columns' => [
                                [
                                    'attribute' => 'irdepname',
                                    'format' => 'raw',
                                    //'label' => 'ผู้ลงทะเบียน',
                                    'value' => $model->irdepname,
                                    'labelColOptions' => ['style' => 'width: 20%'],
                                    'valueColOptions' => ['style' => 'width:30%'],
                                    'displayOnly' => true,
                                ],
                                [
                                    'attribute' => 'programname',
                                    'format' => 'raw',
                                    //'label' => 'ผู้ลงทะเบียน',
                                    'value' => $model->programname,
                                    'valueColOptions' => ['style' => 'width:30%'],
                                    'displayOnly' => true,
                                ],
                            ],
                        ],
                // cal_4
                        [
                            'columns' => [
                                [
                                    //'attribute' => 'storename',
                                    'format' => 'raw',
                                    'label' => 'ชื่อความเสี่ยง',
                                    'value' => '<span style="color:blue;">'.$model->storename.'</span>',
                                    //'value' => $model->storename,
                                    'labelColOptions' => ['style' => 'width: 20%'],
                                    'valueColOptions' => ['style' => 'width:30%'],
                                    'displayOnly' => true,
                                ],
                                [
                                    //'attribute' => 'levelname',
                                    'format' => 'raw',
                                    'label' => 'ระดับความรุนแรง',
                                    'value' => $model->levelname,
                                    //'labelColOptions' => ['style' => 'width: 20%'],
                                    'valueColOptions' => ['style' => 'width:30%'],
                                    'displayOnly' => true,
                                ],
                            ],
                        ],
                // cal_5    
                        [
                            'columns' => [
                                [
                                    //'attribute'=>'detail',
                                    'label'=>'เหตุการณ์/รายละเอียดเพิ่มเติม?',
                                    'format'=>'raw',
                                    'value'=>'<span class="text-justify"><em>' . $model->detail . '</em></span>',
                                    'labelColOptions' => ['style' => 'width: 20%'],
                                    'type'=>DetailView::INPUT_TEXTAREA, 
                                    'options'=>['rows'=>4]
                                ],
                            ],
                        ],
                // cal_6     
                        [
                            'columns' => [
                                [
                                    'attribute'=>'problem_basic',
                                    //'label'=>'เหตุการณ์/รายละเอียดเพิ่มเติม',
                                    'format'=>'raw',
                                    'value'=>'<span class="text-justify"><em>' . $model->problem_basic . '</em></span>',
                                    'labelColOptions' => ['style' => 'width: 20%'],
                                    'type'=>DetailView::INPUT_TEXTAREA, 
                                    'options'=>['rows'=>4]
                                ],
                            ],   
                        ],
                // cal_7  
                        [
                            'columns' => [
                                [  
                                    'attribute' => 'image',
                                    'format' => 'raw',
                                    //'label' => 'เอกสาร-ภาพประกอบ',
                                    'value'=>$model->getPhotosViewer(),
                                    //'format' => ['image',['width'=>'100','height'=>'100']],
                                    'labelColOptions' => ['style' => 'width: 20%'],
                                    'valueColOptions' => ['style' => 'width:80%'],
                                    'displayOnly' => true,
                                ],
                            ],
                        ],
                // cal_8     
                        [
                            
                            'columns' => [
                                [
                                    'attribute' => 'edit',
                                    'format' => 'raw',
                                    //'label' => 'การแก้ปัญหา',
                                    'value' => $model->edit,
                                    'labelColOptions' => ['style' => 'width: 20%'],
                                    'valueColOptions' => ['style' => 'width:30%'],
                                    'displayOnly' => true,
                                ],
                                [
                                    'attribute' => 'affected',
                                    'format' => 'raw',
                                    //'label' => 'ผู้เสียหาย/ได้รับผลกระทบ',
                                    'value' => $model->affected,
                                    //'labelColOptions' => ['style' => 'width: 20%'],
                                    'valueColOptions' => ['style' => 'width:30%'],
                                    'displayOnly' => true,
                                ],
                            ],
                        ],
                // cal_9  
                        [
                            
                            'columns' => [
                                [
                                    'attribute' => 'informname',
                                    'format' => 'raw',
                                    //'label' => 'การแก้ปัญหา',
                                    'value' => $model->informname,
                                    'labelColOptions' => ['style' => 'width: 20%'],
                                    'valueColOptions' => ['style' => 'width:30%'],
                                    'displayOnly' => true,
                                ],
                                [
                                    'attribute' => 'status_risk',
                                    'format' => 'raw',
                                    //'label' => 'ผู้เสียหาย/ได้รับผลกระทบ',
                                    'value' => $model->status_risk,
                                    //'labelColOptions' => ['style' => 'width: 20%'],
                                    'valueColOptions' => ['style' => 'width:30%'],
                                    'displayOnly' => true,
                                ],
                            ],
                        ],
                    // cal_10
                        [
                            'columns' => [

                                [
                                    'label' => 'แผนกที่รายงาน',
                                    'value'=>$model->departname,
                                    'labelColOptions' => ['style' => 'width: 20%'],
                                    'valueColOptions'=>['style'=>'width:80%'],
                                    'displayOnly' => true,
                                ],              
                            ],
                        ],
                // cal_11
                        [
                            'columns' => [
                                [
                                    'label' => 'รายงานโดย/อับเดทโดย',
                                    'value'=>$model->loginname. ' / '. $model->updatename ,
                                    'labelColOptions' => ['style' => 'width: 20%'],
                                    'valueColOptions'=>['style'=>'width:30%'],
                                    'displayOnly' => true,
                                ],
                                [
                                    'label' => 'วันที่บันทึก/วันที่ปรับปรุง',
                                    'value'=>$model->create_date. ' / '. $model->modify_date.'  '.'น.',
                                    'valueColOptions'=>['style'=>'width:30%'],
                                    'displayOnly' => true,
                                ],               
                            ],
                        ],
                      
                ],
            ]) ?>
</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>