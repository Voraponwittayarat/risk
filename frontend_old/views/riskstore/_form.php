<?php

use yii\helpers\Html;
use yii\widgets\ActiveForm;

use yii\helpers\ArrayHelper;
use kartik\widgets\Select2;
use kartik\widgets\SwitchInput;
use frontend\models\Type;
use frontend\models\Riskgroup;
use frontend\models\Level;
use frontend\models\Program;
use frontend\models\Team;
use frontend\models\Inform;

use frontend\models\Member;

/* @var $this yii\web\View */
/* @var $model frontend\models\Riskstore */
/* @var $form yii\widgets\ActiveForm */
?>

<div class="riskstore-form">

    <?php $form = ActiveForm::begin(); ?>
    
    <?= $form->field($model, 'riskstore_name')->textInput(['placeholder' => 'กรุณาระบุชื่อความเสี่ยง','maxlength' => true]) ?>
   
    <?= $form->field($model, 'inform_id')->widget(Select2::classname(), [
             'data' => ArrayHelper::map(Inform::find()->all(),'id','inform_name'),
             'options' => ['placeholder' => 'กรุณาเลือกที่มาของความเสี่ยง'],
             'pluginOptions' => [
                 'allowClear' => true
             ],
         ]);
    ?>
    <?= $form->field($model, 'type_id')->widget(Select2::classname(), [
             'data' => ArrayHelper::map(Type::find()->all(),'id','name'),
             'options' => ['placeholder' => 'กรุณาเลือกประเภทความเสี่ยง'],
             'pluginOptions' => [
                 'allowClear' => true
             ],
         ]);
    ?>

    <?= $form->field($model, 'program_id')->widget(Select2::classname(), [
            'data' => ArrayHelper::map(Program::find()->all(),'program_id','program_name'),
            'options' => ['placeholder' => 'กรุณาเลือกโปรแกรม'],
            'pluginOptions' => [
                'allowClear' => true
            ],
        ]);
    ?>

    <?= $form->field($model, 'level_id')->widget(Select2::classname(), [
            'data' => ArrayHelper::map(Level::find()->all(),'level_id','level_name'),
            'options' => ['placeholder' => 'กรุณาเลือกระดับ'],
            'pluginOptions' => [
                'allowClear' => true
            ],
        ]);
    ?>

    <?= $form->field($model, 'group_id')->widget(Select2::classname(), [
         'data' => ArrayHelper::map(Riskgroup::find()->all(),'id','name'),
         'options' => ['placeholder' => 'กรุณาเลือกกลุ่มความเสี่ยง'],
         'pluginOptions' => [
             'allowClear' => true
         ],
     ]);
     ?>

    <?= $form->field($model, 'team_id')->widget(Select2::classname(), [
        'data' => ArrayHelper::map(Team::find()->all(),'id','team_name'),
        'options' => ['placeholder' => 'กรุณาเลือกทีม'],
        'pluginOptions' => [
            'allowClear' => true
        ],
    ]);
    ?>

    <?= $form->field($model, 'member_cid')->widget(Select2::classname(), [
        'data' => ArrayHelper::map(Member::find()->all(),'cid','member_name'),
        'options' => ['placeholder' => 'กรุณาเลือกผู้รับผิดชอบ'],
        'pluginOptions' => [
            'allowClear' => true
        ],
    ]);
    ?>
    <?= $form->field($model, 'status')->widget(SwitchInput::classname(),[
           'pluginOptions' => [
               'size' => 'Medium',
               'onColor' => 'success',
               'offColor' => 'danger',
           ]             

       ]);
   ?>
    <div class="form-group">
        <?= Html::submitButton('<i class="glyphicon glyphicon-floppy-save"></i> ' . ($model->isNewRecord ? 'บันทึก' : 'แก้ไข'), ['class' => ($model->isNewRecord ? 'btn btn-success' : 'btn btn-warning') . ' btn-lg btn-block']) ?>
    </div>


    <?php ActiveForm::end(); ?>

</div>
