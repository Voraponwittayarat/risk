<?php

use yii\helpers\Html;
use yii\helpers\Url;
//use yii\widgets\DetailView;
use kartik\detail\DetailView;


/* @var $this yii\web\View */
/* @var $model frontend\models\Riskregister */

$this->title =''. ' '.'โปรแกรมความเสี่ยง : ' . ' ' . $model->programname. ' '.'ความเสี่ยง : ' . ' ' . $model->storename. ' '.'ส่งถึงทีมนำ : ' . ' ' . $model->teamname ;
$this->params['breadcrumbs'][] = ['label' => 'ทบทวนความเสี่ยง', 'url' => ['riskreview/toteam']];
//$this->params['breadcrumbs'][] = 'ความเสี่ยงที่ผ่านการยืนยันแล้ว';

?>
<div class="riskregister-view">
     <div class="alert alert-success alert-dismissible fade in" role="alert"> 
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">×</span>
        </button> 
        <h4><span class="glyphicon glyphicon-time" aria-hidden="true"></span> <?= Html::encode($this->title) ?></h4> 
    </div>
    <p>
    <?php
        if (!Yii::$app->user->isGuest && Yii::$app->user->identity->role != 3) {
           echo Html::a('<i class="glyphicon glyphicon-pencil">แก้ไขการลงทะเบียน</i>', ['update', 'id' => $model->id, 'id_risk' => $model->id_risk], ['class' => 'btn btn-primary']);
       
        } else {
            
            echo Html::a('<i class="glyphicon glyphicon-pencil">แก้ไขการลงทะเบียน</i>', ['update', 'id' => $model->id, 'id_risk' => $model->id_risk], ['class' => 'btn btn-primary', 'style' => 'display: none;']);
        }
        ?>
    </P>
            <?=
            DetailView::widget([
                'model' => $model,
                   'hover' => true,
                   'hideAlerts' => true,
                   'enableEditMode' => true,
                   'mode' => DetailView::MODE_VIEW,
                   'hAlign' => 'left',
                'attributes' => [
                   [
                       'group' => true,
                       'label' => '<span class="glyphicon glyphicon-bookmark" aria-hidden="true"></span> ความเสี่ยงที่ได้จากการรายงานและผ่านการยืนยันจาก คณะกรรมการ RM แล้ว สามารถนำไปใช้งานและอ้างอิงได้',
                       'rowOptions' => ['class' => 'success']
                   ],
           // cal_1  
                        [
                            'columns' => [
                                [
                                    'label' => 'ID Register/ID Risk',
                                    'value'=>$model->id. ' / '. $model->id_risk ,
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
                                    'label' => 'รายงานโดย',
                                    'value'=>'***',//$model->loginname,
                                    'labelColOptions' => ['style' => 'width: 20%'],
                                    'valueColOptions'=>['style'=>'width:15%'],
                                    'displayOnly' => true,
                                ],
                                [
                                    'label' => 'แผนกที่รายงาน',
                                    'value'=>$model->departname,
                                    'labelColOptions' => ['style' => 'width: 15%'],
                                    'valueColOptions'=>['style'=>'width:20%'],
                                    'displayOnly' => true,
                                ],
                                [
                                    'label' => 'วันที่บันทึก',
                                    'value'=>$model->create_date.'  '.'น.',
                                     'labelColOptions' => ['style' => 'width: 10%'],
                                    'valueColOptions'=>['style'=>'width:20%'],
                                    'displayOnly' => true,
                                ],               
                            ],
                        ],
                    
                  
                    [
                        'group'=>true,
                        'label'=>'<span class="glyphicon glyphicon-check" aria-hidden="true"></span> รายละเอียดการลงทะเบียน,การยืนยันความเสี่ยง และการส่งความเสี่ยงไปยังผู้รับผิดชอบเพื่อทบทวนและแก้ปัญหาต่อไป...',
                        'rowOptions'=>['class'=>'info'],
                        //'groupOptions'=>['class'=>'text-center']
                    ],
                // cal_1
                        [
                            'columns' => [
                                
                                [
                                    //'attribute' => 'id',
                                    //'format' => 'raw',
                                    'label' => 'วันที่ส่งข้อมูล',
                                    'value' => $model->send_date.'  '.'น.',
                                    'valueColOptions' => ['style' => 'width:15%'],
                                    'displayOnly' => true,
                                ],
                                [
                                    //'attribute' => 'id',
                                    //'format' => 'raw',
                                    'label' => 'วันที่ลงทะเบียน',
                                    'value' => $model->register_date,
                                    'labelColOptions' => ['style' => 'width: 10%'],
                                    'valueColOptions' => ['style' => 'width:10%'],
                                    'displayOnly' => true,
                                ],
                                [
                                  'attribute' => 'send_use',
                                  'format' => 'raw',
                                  //'label' => 'ผู้ลงทะเบียน',
                                  'value' => $model->send_use,
                                  'labelColOptions' => ['style' => 'width: 10%'],
                                  'valueColOptions' => ['style' => 'width:7%'],
                                  'displayOnly' => true,
                                ], 
                                [
                                    'attribute'=>'repeat_code',
                                    //'label' => 'ระดับการทบทวน',
                                    'format'=>'raw', 
                                    'value'=>"<span class='badge' style='background-color:#ff0000 '> </span>  <code>" .$model->repeat_code. '  '. $model->repeatname . '</code>',
                                    'type'=>DetailView::INPUT_COLOR,
                                    'labelColOptions' => ['style' => 'width: 15%'],
                                    'valueColOptions'=>['style'=>'width:30%'], 
                                ],
                            ],
                        ],
                // cal_2
                        [
                            'columns' => [
                                [
                                    'attribute'=>'note',
                                    //'label'=>'เหตุการณ์/รายละเอียดเพิ่มเติม',
                                    'format'=>'raw',
                                    'value'=>'<span class="text-justify"><em>' . $model->note . '</em></span>',
                                    'labelColOptions' => ['style' => 'width: 20%'],
                                    'type'=>DetailView::INPUT_TEXTAREA, 
                                    'options'=>['rows'=>4]
                                ],

               
                            ],
                        ],
                // cal_3
                        [
                            'columns' => [
                                [
                                    //'attribute'=>'sdepartname',
                                    'label'=>'ส่งหน่วยงาน',
                                    'value'=>$model->sdepartname,
                                    'displayOnly' => true,
                                    //'format'=>['decimal', 2],
                                    //'inputContainer' => ['class'=>'col-sm-6'],
                                ],
                                [
                                    //'attribute'=>'teamname',
                                    'label'=>'ส่งทีมนำ',
                                    'value'=>$model->teamname,
                                    'labelColOptions' => ['style' => 'width: 10%'],
                                    'valueColOptions' => ['style' => 'width:20%'],
                                    //'format'=>['decimal', 2],
                                    //'inputContainer' => ['class'=>'col-sm-6'],
                                ],

                                [
                                    'label'=>'ส่ง CEO รพ.',
                                    'value'=>$model->smembername,
                                    'labelColOptions' => ['style' => 'width: 10%'],
                                    'valueColOptions' => ['style' => 'width:20%'],
                                    'displayOnly' => true,
                                ],
                            ],
                        ],
                // end cal
                            
                   
                ],
            ])
            ?>

</div>
 
<?= \bluezed\scrollTop\ScrollTop::widget() ?>