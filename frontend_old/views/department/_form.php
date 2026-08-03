<?php

use yii\helpers\Html;
use yii\widgets\ActiveForm;
use yii\helpers\ArrayHelper;
use kartik\widgets\Select2;

use frontend\models\Departmentgroup;

?>

<div class="department-form">

    <?php $form = ActiveForm::begin(); ?>
    
        
            <?= $form->field($model, 'depart_name_eng')->textInput(['maxlength' => true]) ?>
      
            <?= $form->field($model, 'depart_name')->textInput(['maxlength' => true]) ?>
      
            <?= $form->field($model, 'depart_group_id')->widget(Select2::classname(), [
                'data' => ArrayHelper::map(Departmentgroup::find()->all(),'id','depart_group_name'),
                'options' => ['placeholder' => 'กรุณาเลือกฝ่าย'],
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
