<?php

use yii\helpers\Html;
use kartik\widgets\ActiveForm;
use kartik\widgets\DateTimePicker;


/* @var $this yii\web\View */
/* @var $model app\models\History */
/* @var $form yii\widgets\ActiveForm */
?>

<div class="history-form">

    <?php $form = ActiveForm::begin(); ?>
            <?php
            echo '<label class="control-label">วันที่บันทึก</label>';
            echo DateTimePicker::widget([
                'model' => $model,
                'attribute' => 'datetime',
                'language' => 'th',
                'options' => ['placeholder' => 'ปี-เดือน-วัน'],
                'layout' => '{picker}{input}',
                'pluginOptions' => [
                    'todayHighlight' => true,
                    'todayBtn' => true,
                    'format' => 'yyyy-mm-dd hh:ii:ss',
                    'autoclose' => true,
                ]
            ]);
            ?> 
    
            <?= $form->field($model, 'change')->textInput(['placeholder' => 'ระบุรายการที่เปลี่ยน','maxlength' => true]) ?>
            
            <?= $form->field($model, 'detail')->textarea(['rows' => '6','placeholder' => 'ระบุรายละเอียด','maxlength' => true]) ?>

    <div class="form-group">
        <?= Html::submitButton('<i class="glyphicon glyphicon-floppy-save"></i> ' . ($model->isNewRecord ? 'บันทึก' : 'แก้ไข'), ['class' => ($model->isNewRecord ? 'btn btn-success' : 'btn btn-warning') . ' btn-lg btn-block']) ?>
    </div>

    <?php ActiveForm::end(); ?>
</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>