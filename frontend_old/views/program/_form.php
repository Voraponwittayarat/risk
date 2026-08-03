<?php

use yii\helpers\Html;
use yii\widgets\ActiveForm;
use yii\helpers\ArrayHelper;
use kartik\widgets\Select2;

use frontend\models\Type;


/* @var $this yii\web\View */
/* @var $model frontend\models\Program */
/* @var $form yii\widgets\ActiveForm */
?>

<div class="program-form">

    <?php $form = ActiveForm::begin(); ?>
    
    <?= $form->field($model, 'program_name')->textInput(['placeholder' => 'ระบุชื่อโปรแกรม','maxlength' => true]) ?>

    <?= $form->field($model, 'type_id')->widget(Select2::classname(), [
        'data' => ArrayHelper::map(Type::find()->all(),'id','name'),
        'options' => ['placeholder' => 'กรุณาเลือกประเภทความเสี่ยง'],
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

   