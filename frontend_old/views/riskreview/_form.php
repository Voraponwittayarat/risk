<?php

use yii\helpers\Html;
use yii\bootstrap\ActiveForm;
use kartik\widgets\DatePicker;
use kartik\widgets\TimePicker;
use yii\helpers\ArrayHelper;
use kartik\widgets\Select2;
use kartik\widgets\DepDrop;


// add models
use frontend\models\Reviewtype;
use frontend\models\Reviewresults;
use frontend\models\Member;

// add upload
use yii\helpers\Url;
use kartik\widgets\TypeaheadBasic;
use kartik\widgets\FileInput;
use yii\helpers\VarDumper;

/* @var $this yii\web\View */
/* @var $model frontend\models\Riskreview */
/* @var $form yii\widgets\ActiveForm */
?>

<div class="riskreview-form">
    
<?php $form = ActiveForm::begin(['options' => ['enctype' => 'multipart/form-data']]); ?> 

 <div class="row">
    <div class="col-md-2 col-xs-12">
        <?php
            echo '<label class="control-label">วันที่ทบทวน</label>';
            echo DatePicker::widget([
                'model' => $model,
                'attribute' => 'review_date',
                'language' => 'th',
                'options'=>[
                   // 'disabled' => true,
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

    <div class="col-md-3 col-xs-12">
        <?php
           echo '<label class="control-label">เวลาทบทวน</label>';
           echo TimePicker::widget([
               'model' => $model,
               'attribute' => 'review_time',
               'pluginOptions' => [
                   'showSeconds' => true,
                   'showMeridian' => false,
                   'minuteStep' => 1,
                   'secondStep' => 5,
               ],
               'options' => [
                  // 'disabled' => true,
                   'class' => 'form-control',
               ],
           ]);
        ?> 
    </div>


    <div class="col-md-7 col-xs-12">
        <?=
            $form->field($model, 'files')->widget(FileInput::classname(), [
                //'options' => ['accept' => 'image/*'],
                'pluginOptions' => [
                    'initialPreview' => empty($model->files) ? [] : [
                        Yii::getAlias('@web') . '/sqlscript/' . $model->files,
                            ],
                    'allowedFileExtensions' => ['pdf'],
                    'showPreview' => false,
                    'showCaption' => true,
                    'showRemove' => true,
                    'showUpload' => false
                ]
        ]);
        ?>
        <p class="help-block">รองรับนามสกุล .pdf เท่านั้น ขนาดไฟล์ไม่เกิน 5 Mb</p>
    </div>
     </div>
     

     <div class="row">
        <div class="col-md-12 col-xs-12">
            <?= $form->field($model, 'cause_problem')->label('สาเหตุของปัญหา')->inline()->checkBoxList(frontend\models\Riskreview::itemAlias('cause_problem')) ?> 
        </div>
    </div>



    <div class="row">
        <div class="col-md-12 col-xs-12">
            <?= $form->field($model, 'notereview')->textarea(['rows' => 3]) ?>
        </div>
    </div>
    <div class="row">

        <div class="col-md-2 col-xs-12">
            <?php echo '<label class="control-label">ต้องการทบทวนซ้ำ</label>';  ?>
            <?= $form->field($model, 'repeat')->checkBox(['uncheck' => 'N', 'value' => 'Y']); ?>
        </div>
        <div class="col-md-2 col-xs-12">
            <?php echo '<label class="control-label">ต้องการจำหน่าย</label>';  ?>
            <?= $form->field($model, 'discharge')->checkBox(['uncheck' => 'N', 'value' => 'Y']); ?>
        </div>
        <div class="col-md-8 col-xs-12">
            <?=
            $form->field($model, 'reviewresults_id')->widget(Select2::classname(), [
                'data' => ArrayHelper::map(Reviewresults::find()->all(), 'id', 'reviewresults_name'),
                'options' => ['placeholder' => 'เลือกผลการทวบทวน'],
                'pluginOptions' => [
                    'allowClear' => true
                ],
            ]);
            ?>
        </div>
    </div>
    
    <div class="row">
        <div class="col-md-12 col-xs-12">
            <?=
            $form->field($model, 'review_cid')->widget(Select2::classname(), [
                'data' => ArrayHelper::map(Member::find()->where(['status' => 1])->all(), 'member_name', 'member_name'), // ดึกเฉพาะบุคคลการที่ยังปฏิบัติงานอยู่
                'options' => ['placeholder' => 'เลือกผู้ร่วมทบทวน'],
                'pluginOptions' => [
                    'allowClear' => true,
                    'multiple' => true
                ],
            ]);
            ?>
        </div>
    </div>
 

    <div class="form-group">
        <?= Html::submitButton('<i class="glyphicon glyphicon-floppy-save"></i> ' . ($model->isNewRecord ? 'บันทึก' : 'แก้ไข'), ['class' => ($model->isNewRecord ? 'btn btn-success' : 'btn btn-warning') . ' btn-lg btn-block']) ?>
    </div>
    <?php ActiveForm::end(); ?>

</div>
<?php /*

if(!Yii::$app->user->isGuest && Yii::$app->user->identity->role != 99 && Yii::$app->user->identity->role != 3){
    if($model->isNewRecord) {
        ?>
        <div class="form-group">
            <?php
            echo Html::a('<i class="glyphicon glyphicon-remove">&nbsp;ทบทวนแล้วไม่ใช่ความเสี่ยง</i>', ['reject', 'risk_id' => $model->risk_id], [
                'class' => 'btn btn-danger btn-lg btn-block','title' => 'ทบทวนแล้วไม่ใช่ความเสี่ยง',
                'data' => [
                    'confirm' => 'คุณแน่ใจหรือว่าต้องการยกเลิกรายการนี้หรือไม่?',
                    'method' => 'post',
                ],
            ]); */
            ?>
        </div>

        <?php
    //}
    ?>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>