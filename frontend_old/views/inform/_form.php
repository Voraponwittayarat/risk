<?php

use yii\helpers\Html;
use yii\widgets\ActiveForm;
use yii\helpers\ArrayHelper;
use kartik\widgets\Select2;

use frontend\models\Act;

/* @var $this yii\web\View */
/* @var $model frontend\models\Inform */
/* @var $form yii\widgets\ActiveForm */
?>

<div class="inform-form">

    <?php $form = ActiveForm::begin(); ?>

    <?= $form->field($model, 'inform_name')->textInput(['maxlength' => true]) ?>

    <?= $form->field($model, 'act_id')->widget(Select2::classname(), [
                'data' => ArrayHelper::map(Act::find()->all(),'id','act_name'),
                'options' => ['placeholder' => 'กรุณาเลือก'],
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
