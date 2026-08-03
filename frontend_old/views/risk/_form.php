<?php

use yii\helpers\Html;
//use yii\widgets\ActiveForm;
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
use frontend\models\Duration;
use frontend\models\Department;
use frontend\models\Location;
use frontend\models\Program;
use frontend\models\Riskstore;
use frontend\models\Level;
use frontend\models\Member;
use frontend\models\Inform;
use frontend\models\LevelGroups;
use frontend\models\Type;


/* @var $this yii\web\View */
/* @var $model frontend\models\Risk */
/* @var $form yii\widgets\ActiveForm */
?>

<div class="risk-form">
    
    <?php $form = ActiveForm::begin(['options' => ['enctype' => 'multipart/form-data']]); ?> 

<!-- row1 --> 
    <div class="row">
        <div class="col-sm-2 col-xs-12">
            <?php
            echo '<label class="control-label">วันที่เกิดเหตุ</label>';
            echo DatePicker::widget([
                'model' => $model,
                'attribute' => 'date_report',
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
        <div class="col-sm-3 col-xs-12">
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
                    'class' => 'form-control',
                ],
            ]);
            ?>
        </div>
      
        <div class="col-sm-2 col-xs-12">
            <?= $form->field($model, 'duration_id')->widget(Select2::classname(), [
            'data' => ArrayHelper::map(Duration::find()->all(),'id','duration_name'),
            'value' => $model->duration_id,
            'options' => ['placeholder' => 'เลือกเวร'],
            'pluginOptions' => [
                'allowClear' => true
                ],
            ]);
            ?>
        </div>
 
        <div class="col-sm-5 col-xs-12">
            <?= $form->field($model, 'location_id')->widget(Select2::classname(), [
                'data' => ArrayHelper::map(Location::find()->all(),'id','name'),
                'options' => ['placeholder' => 'เลือกสถานที่พบเหตุ'],
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
            <div class="col-sm-3 col-xs-12">
                <?= $form->field($model, 'user_ir_type')->label('ประเภทการรายงาน')->inline()->radioList(frontend\models\Risk::itemAlias('irtype')) ?>            
            </div>
            <div class="col-sm-4 col-xs-12">
                <?= $form->field($model, 'user_ir')->widget(Select2::classname(), [
                    'data' => ArrayHelper::map(Department::find()->all(),'id','depart_name'),
                    'options' => ['placeholder' => 'เลือกแผนกที่รายงานถึง'],
                    'pluginOptions' => [
                        'allowClear' => true
                        ],
                    ]);
                ?>
            </div>
            <div class="col-sm-5 col-xs-12">
                <?= $form->field($model, 'program_id')->dropdownList(
						ArrayHelper::map(Program::find()->orderBy(['program_name'=>SORT_ASC])->all(), 'program_id', 'program_name'), [
						
                    'id' => 'ddl-programs',
                    'prompt' => 'เลือกโปรแกรม'
                        ]
                );
                ?>
            </div>
    </div>
<!-- end row2 --> 


<!-- row3 --> 
    <div class="row">
    
        <div class="col-sm-12 col-xs-12"><font color="red"><label>* กรณีไม่มีชื่อความเสี่ยงที่ต้องการ สามารถแจ้งให้ทีมความเสี่ยงตามลิงค์นี้ค่ะ [<a href="https://docs.google.com/forms/d/1iSbrKWrDskkXFMRtlV3crQ3D2cLXU6dP5oTwXClo9Cw/edit" target ="_blank">คลิก!!</a>]</label></font>
            <?= $form->field($model, 'riskstore_id')->widget(DepDrop::classname(), [
                'options' => ['id' => 'ddl-riskstore'],
                //'data' => [],
                'data' => $riskse,
                'type' => DepDrop::TYPE_SELECT2,
                'pluginOptions' => [
                    'depends' => ['ddl-programs'],
                    'placeholder' => 'เลือกความเสี่ยง',
                    'url' => Url::to(['/risk/get-risk'])
                ]
            ]);
            ?>

        </div>
        <div class="col-sm-12 col-xs-12">   
            <input type="hidden" id="_level_id" value="<?=$model->level_id; ?>" />   
            <?= $form->field($model, 'level_id')->radioList([]);?>
        </div>
    </div>   
<!-- end row3 --> 

<!-- row4 --> 
        <?= $form->field($model, 'detail')->textarea(['rows' => 2]) ?>
<!-- end row4 --> 

<!-- row5 --> 
 <div class="row">
        <div class="col-sm-3 col-xs-12">
            <?= $form->field($model, 'inform_id')->widget(Select2::classname(), [
                'data' => ArrayHelper::map(Inform::find()->all(),'id','inform_name'),
                'options' => ['placeholder' => 'เลือกที่มาของความเสี่ยง'],
                'pluginOptions' => [
                    'allowClear' => true
                    ],
                ]);
            ?>
        </div>
        <div class="col-sm-7 col-xs-12">

            <?= $form->field($model, 'affected')->label('ผู้เสียหาย/ผู้ได้รับผลกระทบ')->inline()->checkBoxList(frontend\models\Risk::itemAlias('affected')) ?> 
        </div>       
        <div class="col-sm-2 col-xs-12">
            <?= $form->field($model, 'edit')->label('การแก้ปัญหา')->inline()->radioList(frontend\models\Risk::itemAlias('edit')) ?>  
        </div>

    </div>

<!-- end row5 -->

<!-- row6 --> 
            <?= $form->field($model, 'problem_basic')->textarea(['rows' => 2]) ?>
<!-- end row6 --> 

<!-- row7 -->
    <?= $form->field($model, 'image[]')->widget(FileInput::classname(), [
        'options' => [
            'accept' => 'image/*',
            'multiple' => true
        ],
        'pluginOptions' => [
            'initialPreview' => empty($model->image) ? [] : [
                Yii::getAlias('@web') . '/riskimage/' . $model->image,
                //Url::to(Yii::getAlias('@web') . '/riskimage/' . $model->image, true),
            ],
            'allowedFileExtensions' => ['gif', 'jpg','jpeg','png'],
            'showPreview' => true,
            'showCaption' => true,
            'showRemove' => true,
            'showUpload' => false,
        ]
    ]);
    ?>

<!-- end row7 --> 

    <div class="form-group">
        <?= Html::submitButton('<i class="glyphicon glyphicon-floppy-save"></i> ' . ($model->isNewRecord ? 'บันทึก' : 'แก้ไข'), ['class' => ($model->isNewRecord ? 'btn btn-success' : 'btn btn-warning') . ' btn-lg btn-block']) ?>
    </div>
    <?php ActiveForm::end(); ?>

</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>


<?php
$this->registerJs("
  var input1 = 'input[name=\"Risk[user_ir_type]\"]';
  setHideInput(2,$(input1).val(),'.field-risk-user_ir');
  $(input1).click(function(val){
    setHideInput(2,$(this).val(),'.field-risk-user_ir');
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

  $( document ).ready(function() {        
    $(this).removeClass(\"has-success\");
    $('#risk-level_id').html('<div style=\"color: #999\">-</div>');
    if($('#ddl-riskstore').val()) {
      getRiskLevelGroups();
    }
});

$( '#ddl-programs' ).change(function() {
    $('.field-risk-level_id').removeClass(\"has-success\");
    $('#risk-level_id').html('<div style=\"color: #999\">-</div>');
});

$( '#ddl-riskstore' ).change(function() {
    $('.field-risk-level_id').removeClass(\"has-success\");
    getRiskLevelGroups();
});

$('.field-risk-level_id').change(function() {
    $(this).addClass(\"has-success\");
});


function getRiskLevelGroups() {
  $.ajax({
        url: 'index.php?r=' + encodeURIComponent('risk/get-level-groups') + '&riskstore_id=' + $('#ddl-riskstore').val(),
        type: 'GET',
        dataType: 'json',
        success: function(data) {   
            var levelOptionStr = '';
            $.each(data.output, function( index, obj ) {
              var checkStr = '';
              if($('#_level_id').val() == obj.level_code) {
                checkStr = 'checked';
              }
              levelOptionStr += '<div class=\"radio\"><label><input type=\"radio\" name=\"Risk[level_id]\" value=\"' + obj.level_code + '\" ' + checkStr + '>' + obj.level_name + '</label></div>';
            });
            $('#risk-level_id').html(levelOptionStr);
        }
    });
}



");



 ?>
 