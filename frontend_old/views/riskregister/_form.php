<?php

use yii\helpers\Html;
use yii\bootstrap\ActiveForm;
use yii\helpers\VarDumper;
use yii\helpers\Url;
use kartik\widgets\DatePicker;
use kartik\widgets\TimePicker;
use kartik\checkbox\CheckboxX;
use yii\helpers\ArrayHelper;
use kartik\widgets\Select2;
use kartik\widgets\FileInput;
use kartik\widgets\DepDrop;

// ลิงค์โมดูล dropdownlist
use frontend\models\Team;
use frontend\models\Department;
use frontend\models\Member;
use frontend\models\Levelwarning;
use frontend\models\Duration;
use frontend\models\Location;
use frontend\models\Program;
use frontend\models\Riskstore;
use frontend\models\Level;
use frontend\models\Inform;

/* @var $this yii\web\View */
/* @var $model frontend\models\Riskregister */
/* @var $form yii\widgets\ActiveForm */

?>

<div class="riskregister-form">

    <?php $form = ActiveForm::begin(['options' => ['enctype' => 'multipart/form-data']]); ?> 

  <!-- row1 --> 
    <div class="row">
        <div class="col-md-3 col-xs-12">
            <?php
            echo '<label class="control-label">วันที่</label>';
            echo DatePicker::widget([
                'model' => $model,
                'attribute' => 'date_report',
                'language' => 'th',
                'options'=>[
                    'disabled' => true, 
                ],   
                //'options' => ['placeholder' => 'ป-ด-ว'],
                'layout' => '{picker}{input}',
                'pluginOptions' => [
                    'todayHighlight' => true,
                    'todayBtn' => true,
                    'format' => 'yyyy-mm-dd',
                    'autoclose' => true,
                ]
            ]);
            ?>
        </div>
        <div class="col-md-2 col-xs-12">
            <?php
            echo '<label class="control-label">เวลา</label>';
            echo TimePicker::widget([
                'model' => $model,
                'attribute' => 'time_report',
                'pluginOptions' => [
                    'showSeconds' => true,
                    'showMeridian' => false,
                    'minuteStep' => 1,
                    'secondStep' => 5,
                ],
                'options' => [
                    'disabled' => true, 
                    'class' => 'form-control',
                ],
            ]);
            ?>
        </div>
      
        <div class="col-md-2 col-xs-12">
            <?= $form->field($model, 'duration_id')->widget(Select2::classname(), [
            'data' => ArrayHelper::map(Duration::find()->all(),'id','duration_name'),
            'value' => $model->duration_id,
            'options' => ['placeholder' => 'เลือกเวร'],
            'disabled'=>true,
            'pluginOptions' => [
                'allowClear' => true
                ],
            ]);
            ?>
        </div>
 
        <div class="col-md-5 col-xs-12">
            <?= $form->field($model, 'location_id')->widget(Select2::classname(), [
                'data' => ArrayHelper::map(Location::find()->all(),'id','name'),
                'options' => ['placeholder' => 'เลือกสถานที่พบเหตุ'],
                'disabled'=>true,
                'pluginOptions' => [
                    'allowClear' => true
                    ],
                ]);
            ?>  
        </div>
    </div>
<!-- end row1 --> 
<!-- row2 --> 
    <div class="row">   
            <div class="col-md-3 col-xs-12">
                <?= $form->field($model, 'user_ir_type')->label('ประเภทการรายงาน')->inline()->radioList(frontend\models\Riskregister::itemAlias('irtype')) ?>            
            </div>
            <div class="col-md-4 col-xs-12">
                <?= $form->field($model, 'user_ir')->widget(Select2::classname(), [
                    'data' => ArrayHelper::map(Department::find()->all(),'id','depart_name'),
                    'disabled'=>true,
                    'options' => ['placeholder' => 'เลือกแผนกที่รายงานถึง'],
                    'pluginOptions' => [
                        'allowClear' => true
                        ],
                    ]);
                ?>
            </div>
            <div class="col-md-5 col-xs-12">
                <?= $form->field($model, 'program_id')->dropdownList(
                        ArrayHelper::map(Program::find()->all(), 'program_id', 'program_name'), [
                    'id' => 'ddl-programs',
                    'disabled'=>true,
                    'prompt' => 'เลือกโปรแกรม'
                        ]
                );
                ?>
            </div>
    </div>
<!-- end row2 --> 
<!-- row3 --> 
    <div class="row">

        <div class="col-md-12 col-xs-12">
            <?= $form->field($model, 'riskstore_id')->widget(DepDrop::classname(), [
                'disabled'=>true,
                'options' => ['id' => 'ddl-riskstore'],
                //'data' => [],
                'data' => $riskse,
                'type' => DepDrop::TYPE_SELECT2,
                'pluginOptions' => [
                    'depends' => ['ddl-programs'],
                    'placeholder' => 'เลือกความเสี่ยง',
                    'url' => Url::to(['/riskregister/get-risk'])
                ]
            ]);
            ?>
        </div>
        <div class="col-md-12 col-xs-12"><font color="red"><label>* <u>หมายเหตุ</u> ระดับ A-I ใช้สำหรับความเสี่ยงทางคลินิก / ระดับ 1-5 ใช้สำหรับความเสี่ยงทั่วไป</label></font>
            <?= $form->field($model, 'level_id')->radioList(
                ArrayHelper::map(Level::find()->all(), 'level_code', 'level_name'), [
                    'prompt' => 'เลือกระดับความรุนแรง'
                ]
            );
            ?>
        </div>
    </div>   
<!-- end row3 --> 
<!-- row4 --> 
        <?= $form->field($model, 'detail')->textarea(['readonly' => true,'rows' => 6]) ?>
<!-- end row4 --> 

<!-- row5 --> 
 <div class="row">
        <div class="col-md-3 col-xs-12">
            <?= $form->field($model, 'inform_id')->widget(Select2::classname(), [
                'data' => ArrayHelper::map(Inform::find()->all(),'id','inform_name'),
                'disabled'=>true,
                'options' => ['placeholder' => 'เลือกที่มาของความเสี่ยง'],
                'pluginOptions' => [
                    'allowClear' => true
                    ],
                ]);
            ?>
        </div>
        <div class="col-md-7 col-xs-12">

            <?= $form->field($model, 'affected')->label('ผู้เสียหาย/ผู้ได้รับผลกระทบ')->inline()->checkBoxList(frontend\models\Riskregister::itemAlias('affected')) ?> 
        </div>       
        <div class="col-md-2 col-xs-12">
            <?= $form->field($model, 'edit')->label('การแก้ปัญหา')->inline()->radioList(frontend\models\Riskregister::itemAlias('edit')) ?>  
        </div>

    </div>

<!-- end row5 -->
           <?= $form->field($model, 'image[]')->widget(FileInput::classname(), [
                'options' => [
                   'accept' => 'image/*',
                    'multiple' => true
                ],
                    'pluginOptions' => [
                    'initialPreview' => empty($model->image) ? [] : [
                        Yii::getAlias('@web') . '/riskimage/' . $model->image,
                    ],
                    'allowedFileExtensions' => ['gif', 'jpg', 'png'],
                    'showPreview' => true,
                    'showCaption' => true,
                    'showRemove' => true,
                    'showUpload' => false,
                ]
            ]);
            ?> 

<!-- row6 --> 
            <?= $form->field($model, 'problem_basic')->textarea(['readonly' => true,'rows' => 6]) ?>
<!-- end row6 --> 



    <!-- end row7 --> 
  <div class="panel panel-danger">
    <div class="panel-heading" role="tab" id="heading1">
      <h4 class="panel-title">
        <a data-toggle="collapse" data-parent="#accordion" href="#collapse1" aria-expanded="true" aria-controls="collapse1">
          <h5><span class="glyphicon glyphicon-triangle-bottom"></span> ส่งต่อเพื่อการทบทวนความเสี่ยง (ส่งต่อหน่วยงาน > ส่งต่อทีมนำ > ส่งต่อ CEO รพ.) </h5>
        </a>
      </h4>
    </div>

    <div id="collapse1" class="accordion-body collapse" role="tabpanel" aria-labelledby="heading1">
      <div class="panel-body">
          <div class="row">

              <div class="col-md-3 col-xs-12">
                  <?php
                  echo '<label class="control-label">วันที่ตรวจสอบ</label>';
                  echo DatePicker::widget([
                      'model' => $model,
                      'attribute' => 'register_date',
                      'language' => 'th',
                      //'options' => ['placeholder' => 'ป-ด-ว'],
                      'layout' => '{picker}{input}',
                      'pluginOptions' => [
                          'todayHighlight' => true,
                          'todayBtn' => true,
                          'format' => 'yyyy-mm-dd',
                          'autoclose' => true,
                      ]
                  ]);
                  ?>
              </div>
              <div class="col-md-9 col-xs-12">
                  <?= $form->field($model, 'note')->textInput() ?>  
              </div>

          </div>

          <div class="row"> 
              <div class="col-md-12 col-xs-12">
                  <?=
                  $form->field($model, 'repeat_code')->widget(Select2::classname(), [
                      'data' => ArrayHelper::map(Levelwarning::find()->all(), 'warning_code', 'warning_name'),
                      'options' => ['placeholder' => 'กรุณาเลือกระดับการทบทวน'],
                      'pluginOptions' => [
                          'allowClear' => true
                      ],
                  ]);
                  ?>
              </div>
          </div>
          <div class="row">  
                <div class="col-md-12 col-xs-12">
                <?= $form->field($model, 'refer_type')->label('เลือกการส่งต่อ')->inline()->radioList(frontend\models\Riskregister::itemAlias('retype')) ?>            
                </div>
          </div>
       
			  <?=
			  $form->field($model, 'sendto_department_id')->widget(Select2::classname(), [
				  'data' => ArrayHelper::map(Department::find()->all(), 'id', 'depart_name'),
				  'options' => ['placeholder' => 'เลือกหน่วยงาน'],
				  'pluginOptions' => [
					  'allowClear' => true
				  ],
			  ]);
			  ?>

			  <?=
			  $form->field($model, 'sendto_team_id')->widget(Select2::classname(), [
				  'data' => ArrayHelper::map(Team::find()->all(), 'id', 'team_name'),
				  'options' => ['placeholder' => 'กรุณาเลือกทีมนำ'],
				  'pluginOptions' => [
					  'allowClear' => true
				  ],
			  ]);
			  ?>

			  <?=
			  $form->field($model, 'sendto_member_cid')->widget(Select2::classname(), [
				  'data' => ArrayHelper::map(Member::find()->where(['priority' => 1])->all(), 'cid', 'member_name'), //  เลือกเฉพาะ pirority=1 ประธานบริหาร รพ. CEO
				  'options' => ['placeholder' => 'กรุณาเลือก CEO รพ.'],
				  'pluginOptions' => [
					  'allowClear' => true
				  ],
			  ]);
			  ?>
			<div class="form-group">
				<?= Html::submitButton('<i class="glyphicon glyphicon-check"></i> ' . ($model->isNewRecord ? 'บันทึก' : 'ยืนยัน'), ['class' => ($model->isNewRecord ? 'btn btn-success' : 'btn btn-primary') . ' btn-lg btn-block']) ?>
			</div>
      </div>

      </div>
    </div>
  </div>
    
 

    <?php ActiveForm::end(); ?>

</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>



 <?php 
 $this->registerJs("
 function triggerReferType()
 {    
     var referType = parseInt($('input[type=radio][name=\"Riskregister[refer_type]\"]:checked').val());
     switch(referType)
     {
         case 1:
             $('.field-riskregister-sendto_department_id').show();
             $('.field-riskregister-sendto_team_id').hide();
             $('.field-riskregister-sendto_member_cid').hide();
             $('#riskregister-sendto_team_id').val('');
             $('#riskregister-sendto_member_cid').val('');   
             break;
         case 2:
             $('.field-riskregister-sendto_department_id').hide();
             $('.field-riskregister-sendto_team_id').show();
             $('.field-riskregister-sendto_member_cid').hide();
             $('#riskregister-sendto_department_id').val('');
             $('#riskregister-sendto_member_cid').val('');   
             break;            
         case 3:
             $('.field-riskregister-sendto_department_id').hide();
             $('.field-riskregister-sendto_team_id').hide();
             $('.field-riskregister-sendto_member_cid').show();
             $('#riskregister-sendto_department_id').val('');
             $('#riskregister-sendto_team_id').val('');
             break;
     }
 } 

 $('.field-riskregister-sendto_department_id').hide();
 $('.field-riskregister-sendto_team_id').hide();
 $('.field-riskregister-sendto_member_cid').hide();
 
 if($('input[type=radio][name=\"Riskregister[refer_type]\"]:checked').length == 0) {
     $('input[type=radio][name=\"Riskregister[refer_type]\"][value=\"1\"]').attr('checked', true);
 }  
 
 triggerReferType();

 $('input[type=radio][name=\"Riskregister[refer_type]\"]').change(function(){
     triggerReferType();
 });
");
 
 /*
$this->registerJs("
    
  var input2 = 'input[name=\"Riskregister[refer_type]\"]';
  setHideInput(2,$(input2).val(),'.field-riskregister-sendto_team_id');
  $(input2).click(function(val){
    setHideInput(1,$(this).val(),'.field-riskregister-sendto_team_id');
    setHideInput(3,$(this).val(),'.field-riskregister-sendto_member_cid');
  });
  
  var input3 = 'input[name=\"Riskregister[refer_type]\"]';
  setHideInput(3,$(input3).val(),'.field-riskregister-sendto_member_cid');
  $(input3).click(function(val){
    setHideInput(1,$(this).val(),'.field-riskregister-sendto_department_id');
    setHideInput(2,$(this).val(),'.field-riskregister-sendto_team_id');
  });


  function setHideInput(set,value,objTarget)
  {
    console.log(set+'='+value);
      if(set==value)
      {
        $(objTarget).show(500);
      }
      else
      {
        $(objTarget).hide(500);
      }
  }
");*/
 ?>