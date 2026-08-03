<?php

use yii\helpers\Html;
use yii\widgets\ActiveForm;
use yii\helpers\ArrayHelper;
use kartik\widgets\Select2;

use frontend\models\Type;
use frontend\models\Levelwarning;

/* @var $this yii\web\View */
/* @var $model frontend\models\Level */
/* @var $form yii\widgets\ActiveForm */
?>

<div class="level-form">

    <?php $form = ActiveForm::begin(); ?>

    <?= $form->field($model, 'level_code')->textInput(['placeholder' => 'ระบุ A-I หรือ NA ถ้าไม่มีระดับ','maxlength' => true]) ?>
    
    <?= $form->field($model, 'level_name')->textInput(['placeholder' => 'ระบุความรุนแรง','maxlength' => true]) ?>
    
    <?= $form->field($model, 'level_warning_code')->widget(Select2::classname(), [
        'data' => ArrayHelper::map(Levelwarning::find()->all(),'warning_code','warning_name'),
        'options' => ['placeholder' => 'กรุณาเลือกรหัสการแจ้งเตือน'],
        'pluginOptions' => [
            'allowClear' => true
        ],
    ]);
    ?>
    
    <div class="form-group">
        <?= Html::submitButton('<i class="glyphicon glyphicon-floppy-save"></i> ' . ($model->isNewRecord ? 'บันทึก' : 'แก้ไข'), ['class' => ($model->isNewRecord ? 'btn btn-success' : 'btn btn-warning') . ' btn-lg btn-block']) ?>
    </div>
    <?php ActiveForm::end(); ?>
</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>