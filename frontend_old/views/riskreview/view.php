<?php

use yii\helpers\Html;
//use yii\widgets\DetailView;
use kartik\detail\DetailView;

/* @var $this yii\web\View */
/* @var $model frontend\models\Riskreview */

$this->title =''.'รายละเอียดการทบทวนความเสี่ยงของคุณ : ' . ' ' . $model->loginname ;
$this->params['breadcrumbs'][] = ['label' => 'ทบทวนความเสี่ยง', 'url' => ['index']];
//$this->params['breadcrumbs'][] = ''. ' '.'RiskID : ' . ' ' . $model->risk_id. ' '.'RegisterID : ' . ' ' . $model->riskregister_id. ' '.'RsikVisit : ' . ' ' . $model->riskvisit. ' '.'ผู้ทบทวน : ' . ' ' . $model->loginname ;
?>
<div class="riskreview-view">
     <div class="alert alert-success alert-dismissible fade in" role="alert"> 
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">×</span>
        </button> 
        <h4><span class="glyphicon glyphicon-repeat" aria-hidden="true"></span> <?= Html::encode($this->title) ?></h4> 
    </div>

        <?=
            DetailView::widget([
                'model' => $model2,
                   'hover' => true,
                   'hideAlerts' => true,
                   'enableEditMode' => true,
                   'mode' => DetailView::MODE_VIEW,
                   'hAlign' => 'left',
                'attributes' => [
                   [
                       'group' => true,
                       'label' => '<span class="glyphicon glyphicon-bookmark" aria-hidden="true"></span> ความเสี่ยงที่ได้จากการรายงานและผ่านการยืนยันจาก คณะกรรมการ RM แล้ว สามารถนำไปใช้งานและอ้างอิงได้ ',
                       'rowOptions' => ['class' => 'success']
                   ],
           // cal_1  
                        [
                            'columns' => [
                                [
                                    'label' => 'ID Register/ID Risk',
                                    'value'=>$model2->id. ' / '. $model2->id_risk ,
                                    'labelColOptions' => ['style' => 'width: 20%'],
                                    'valueColOptions'=>['style'=>'width:20%'],
                                    'displayOnly' => true,
                                ],
                                [
                                    'label' => 'วันที่เวลารายงาน',
                                    'value'=>$model2->date_report. '  '. $model2->time_report.'  '.'น.',
                                    'valueColOptions'=>['style'=>'width:20%'],
                                    'displayOnly' => true,
                                ],
                                [
                                    'attribute' => 'durationname',
                                    'format' => 'raw',
                                    //'label' => 'ผู้ลงทะเบียน',
                                    'value' => $model2->durationname,
                                    'labelColOptions' => ['style' => 'width: 10%'],
                                    'valueColOptions' => ['style' => 'width:10%'],
                                    'displayOnly' => true,
                                ]
                               
                            ],
                        ],
            // cal_2        
                        [
                            'columns' => [
                                [
                                    //'attribute' => 'locationname',
                                    'format' => 'raw',
                                    'label' => 'สถานที่พบเหตุ',
                                    'value' => $model2->locationname,
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
                                    'value'=>$model2->user_ir_type == 1 ? '<span class="label label-success">รายงานตนเอง</span>' : '<span class="label label-danger">รายงานผู้อื่น</span>',
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
                                    'value' => $model2->irdepname,
                                    'labelColOptions' => ['style' => 'width: 20%'],
                                    'valueColOptions' => ['style' => 'width:30%'],
                                    'displayOnly' => true,
                                ],
                                [
                                    'attribute' => 'programname',
                                    'format' => 'raw',
                                    //'label' => 'ผู้ลงทะเบียน',
                                    'value' => $model2->programname,
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
                                    'value' => '<span style="color:blue;">'.$model2->storename.'</span>',
                                    //'value' => $model->storename,
                                    'labelColOptions' => ['style' => 'width: 20%'],
                                    'valueColOptions' => ['style' => 'width:30%'],
                                    'displayOnly' => true,
                                ],
                                [
                                    //'attribute' => 'levelname',
                                    'format' => 'raw',
                                    'label' => 'ระดับความรุนแรง',
                                    'value' => $model2->levelname,
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
                                    'value'=>'<span class="text-justify"><em>' . $model2->detail . '</em></span>',
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
                                    'value'=>'<span class="text-justify"><em>' . $model2->problem_basic . '</em></span>',
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
                                    'value'=>$model2->getPhotosViewer(),
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
                                    'value' => $model2->edit,
                                    'labelColOptions' => ['style' => 'width: 20%'],
                                    'valueColOptions' => ['style' => 'width:30%'],
                                    'displayOnly' => true,
                                ],
                                [
                                    'attribute' => 'affected',
                                    'format' => 'raw',
                                    //'label' => 'ผู้เสียหาย/ได้รับผลกระทบ',
                                    'value' => $model2->affected,
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
                                    'value' => $model2->informname,
                                    'labelColOptions' => ['style' => 'width: 20%'],
                                    'valueColOptions' => ['style' => 'width:30%'],
                                    'displayOnly' => true,
                                ],
                                [
                                    'attribute' => 'status_risk',
                                    'format' => 'raw',
                                    //'label' => 'ผู้เสียหาย/ได้รับผลกระทบ',
                                    'value' => $model2->status_risk,
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
                                    'value'=>'xxx',//$model2->loginname,
                                    'labelColOptions' => ['style' => 'width: 20%'],
                                    'valueColOptions'=>['style'=>'width:15%'],
                                    'displayOnly' => true,
                                ],
                                [
                                    'label' => 'แผนกที่รายงาน',
                                    'value'=>$model2->departname,
                                    'labelColOptions' => ['style' => 'width: 15%'],
                                    'valueColOptions'=>['style'=>'width:20%'],
                                    'displayOnly' => true,
                                ],
                                [
                                    'label' => 'วันที่บันทึก',
                                    'value'=>$model2->create_date.'  '.'น.',
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
                                    'value' => $model2->send_date.'  '.'น.',
                                    'valueColOptions' => ['style' => 'width:15%'],
                                    'displayOnly' => true,
                                ],
                                [
                                    //'attribute' => 'id',
                                    //'format' => 'raw',
                                    'label' => 'วันที่ลงทะเบียน',
                                    'value' => $model2->register_date,
                                    'labelColOptions' => ['style' => 'width: 10%'],
                                    'valueColOptions' => ['style' => 'width:10%'],
                                    'displayOnly' => true,
                                ],
                                [
                                  'attribute' => 'send_use',
                                  'format' => 'raw',
                                  //'label' => 'ผู้ลงทะเบียน',
                                  'value' => $model2->send_use,
                                  'labelColOptions' => ['style' => 'width: 10%'],
                                  'valueColOptions' => ['style' => 'width:7%'],
                                  'displayOnly' => true,
                                ], 
                                [
                                    'attribute'=>'repeat_code',
                                    //'label' => 'ระดับการทบทวน',
                                    'format'=>'raw', 
                                    'value'=>"<span class='badge' style='background-color:#ff0000 '> </span>  <code>" .$model2->repeat_code. '  '. $model2->repeatname . '</code>',
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
                                    'value'=>'<span class="text-justify"><em>' . $model2->note . '</em></span>',
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
                                    //'attribute'=>'teamname',
                                    'label'=>'ส่งทีม',
                                    'value'=>$model2->teamname,
                                    //'format'=>['decimal', 2],
                                    //'inputContainer' => ['class'=>'col-sm-6'],
                                ],
                                [
                                    //'attribute'=>'sdepartname',
                                    'label'=>'ส่งแผนก',
                                    'value'=>$model2->sdepartname,
                                    'labelColOptions' => ['style' => 'width: 10%'],
                                    'valueColOptions' => ['style' => 'width:20%'],
                                    'displayOnly' => true,
                                    //'format'=>['decimal', 2],
                                    //'inputContainer' => ['class'=>'col-sm-6'],
                                ],
                                [
                                    'label'=>'ส่งผู้รับผิดชอบ',
                                    'value'=>$model2->smembername,
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

 <!-- ผลการทบทวนของความเสี่ยงรายการนี้ -->
          <div class="box-tools pull-left">
            <?php
            if (Yii::$app->user->identity->id == $model->created_by && $model->repeat != 'Y' && $model->discharge != 'Y') {

                echo Html::a('<i class="glyphicon glyphicon-pencil">แก้ไขการทบทวน</i>', ['update', 'id' => $model->id, 'id_regist' => $model->riskregister_id, 'riskvisit' => $model->riskvisit], ['class' => 'btn btn-success','title' => 'แก้ไขการทบทวน']); 
                echo Html::a('<i class="glyphicon glyphicon-trash">ลบ</i>', ['delete', 'id' => $model->id, 'riskvisit' => $model->riskvisit], [
                    'class' => 'btn btn-danger','title' => 'ลบการทบทวน',
                    'data' => [
                        'confirm' => 'คุณแน่ใจหรือว่าต้องการลบรายการนี้หรือไม่?',
                        'method' => 'post',
                    ],
                ]); 
            } else if (Yii::$app->user->identity->id == $model->created_by && $model->repeat == 'Y') {

                echo Html::a('<i class="glyphicon glyphicon-repeat">ทบทวนซ้ำ</i>', ['repeat', 'id_regist' => $model2->id, 'id_risk' => $model2->id_risk], ['class' => 'btn btn-success','title' => 'ทบทวนซ้ำ']);
                echo Html::a('<i class="glyphicon glyphicon-trash">ลบ</i>', ['delete', 'id' => $model->id, 'riskvisit' => $model->riskvisit], [
                    'class' => 'btn btn-danger','title' => 'ลบการทบทวน',
                    'data' => [
                        'confirm' => 'คุณแน่ใจหรือว่าต้องการลบรายการนี้หรือไม่?',
                        'method' => 'post',
                    ],
                ]);
            } else {
                
            }
            ?>

        </div>

        <div class="box-tools text-center">
            <?php
            if (Yii::$app->user->identity->id == $model->created_by  && $model->repeat != 'Y' && $model->discharge == 'Y' & $model->status_risk !== 'จำหน่าย') {
                echo Html::a('ยืนยันการจำหน่าย', ['riskreview/conf', 'id' => $model->id, 'id_regist' => $model->riskregister_id,'riskvisit' => $model->riskvisit], ['class' => 'btn btn-warning', 'title' => 'ยืนยันการจำหน่วย']);
            } else {
                echo Html::a('ยืนยันการจำหน่าย', ['riskreview/conf', 'id' => $model->id, 'id_regist' => $model->riskregister_id,'riskvisit' => $model->riskvisit], ['class' => 'btn btn-warning', 'style' => 'display: none;']);
            }
            ?>
        </div>
<hr>

<div class="panel panel-primary">
  <!-- Default panel contents -->
  <div class="panel-heading"><span class="glyphicon glyphicon-repeat"></span> ผลการทบทวนของความเสี่ยงครั้งที่ <?= $model->count;?></div>

  <div class="panel-body">
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
            //'label' => '<span class="glyphicon glyphicon-repeat"></span> ผลการทบทวนรายงานความเสี่ยงของคุณ...',
            'rowOptions' => ['class' => 'success']
            ],
    // cal_1  
            [
                 'columns' => [
                     [
                         'label' => 'RiskID/RiskregisterID',
                         'value'=>$model->risk_id. ' /  '. $model->riskregister_id,
                         'labelColOptions' => ['style' => 'width: 20%'],
                         'valueColOptions'=>['style'=>'width:7%'],
                         'displayOnly' => true,
                     ],
                     [
                         'attribute' => 'riskvisit',
                         'format' => 'raw',
                         //'label' => 'เลขทบทวน',
                         'value' => $model->riskvisit,
                         'labelColOptions' => ['style' => 'width: 10%'],
                         'valueColOptions' => ['style' => 'width:15%'],
                         'displayOnly' => true,
                     ],
                    [
                        'label' => 'วันที่เวลาทบทวน',
                        'value'=>$model->review_date. '  '. $model->review_time.'  '.'น.',
                        'labelColOptions' => ['style' => 'width: 15%'],
                        'valueColOptions'=>['style'=>'width:20%'],
                        'displayOnly' => true,
                    ],
                    [
                         //'attribute' => 'count',
                         'format' => 'raw',
                         'label' => 'ทบทวนครั้งที่',
                         'value' => $model->count,
                         'labelColOptions' => ['style' => 'width: 10%'],
                         'valueColOptions' => ['style' => 'width:5%'],
                         'displayOnly' => true,
                     ]

                 ],
             ],
        // cal_2        
            [
                'columns' => [
                    [
                        'attribute' => 'files',
                        'format' => 'raw',
                        //'label' => 'ผู้ลงทะเบียน',
                        'value' => !$model->files?'':Html::a('ดาวน์โหลด', ['/riskreview/download','type'=>'files','id'=>$model->id,'riskvisit'=>$model->riskvisit,
                        'labelColOptions' => ['style' => 'width: 20%'],
                        'valueColOptions' => ['style' => 'width:60%'],
                        'displayOnly' => true,
                    ])],
                    [
                        'attribute' => 'hits',
                        'format' => 'html',
                        //'label' => 'ผู้ลงทะเบียน',
                        'value' => $model->hits,
                        'labelColOptions' => ['style' => 'width: 10%'],
                        'valueColOptions' => ['style' => 'width:10%'],
                        'displayOnly' => true,
                    ],
       
                ],
            ],
            // เพิ่มสาเหตุของปัญหา

            [
                'columns' => [
                    [
                        //'attribute'=>'detail',
                        //'label'=>'บันทึกการทบทวน',
                        'label'=>'สาเหตุของปัญหา',
                        
                        'format'=>'raw',
                        'value'=>'<span class="text-justify"><em>' . $model->cause_problem . '</em></span>',
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
                        //'attribute'=>'detail',
                        //'label'=>'บันทึกการทบทวน',
                        'label'=>'แนวทางปรับปรุงป้องกัน',
                        
                        'format'=>'raw',
                        'value'=>'<span class="text-justify"><em>' . $model->notereview . '</em></span>',
                        'labelColOptions' => ['style' => 'width: 20%'],
                        'type'=>DetailView::INPUT_TEXTAREA, 
                        'options'=>['rows'=>4]
                    ],
                ],
            ],
        // cal_4 
            [
                'columns' => [
                    [
                        //'attribute'=>'detail',
                        'label'=>'ผู้ร่วมทบทวน',
                        'format'=>'raw',
                        'value'=>'<span class="text-justify"><em>' . $model->review_cid . '</em></span>',
                        'labelColOptions' => ['style' => 'width: 20%'],
                        'type'=>DetailView::INPUT_TEXTAREA, 
                        'options'=>['rows'=>4]
                    ],
                ],
            ],
        // cal_5 
            [

                  'columns' => [
                      [
                          'attribute' => 'reviewresultsname',
                          'format' => 'raw',
                          //'label' => 'ผลการทวบทวน',
                          'value' => $model->reviewresultsname,
                          'labelColOptions' => ['style' => 'width: 20%'],
                          'valueColOptions' => ['style' => 'width:80%'],
                          'displayOnly' => true,
                      ],

                  ],
              ],

        // cal_6
            [
                'columns' => [
                    [
                        'label' => 'ทบทวนโดย/อับเดทโดย',
                        'value'=>$model->loginname. ' / '. $model->updatename ,
                        'labelColOptions' => ['style' => 'width: 20%'],
                        'valueColOptions'=>['style'=>'width:20%'],
                        'displayOnly' => true,
                    ],
                    [
                        'label' => 'ทบทวนซ้ำ',
                        'value'=>$model->repeat,
                        'labelColOptions' => ['style' => 'width: 10%'],
                        'valueColOptions'=>['style'=>'width:5%'],
                        'displayOnly' => true,
                    ], 
                    [
                        'label' => 'สถานนะการจำหน่าย',
                        'value'=>$model->discharge,
                        'valueColOptions'=>['style'=>'width:5%'],
                        'displayOnly' => true,
                    ], 
                    [
                        'label' => 'สถานนะ',
                        'value'=>$model->status_risk,
                        'labelColOptions' => ['style' => 'width: 10%'],
                        'valueColOptions'=>['style'=>'width:30%'],
                        'displayOnly' => true,
                    ],
                ],
            ],
        ],
    ]) ?>
      
  </div>

</div>

</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>