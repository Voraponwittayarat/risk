<?php

use yii\helpers\Html;
use yii\widgets\ActiveForm;

/* @var $this yii\web\View */
/* @var $model frontend\models\DepartmentgroupSearch */
/* @var $form yii\widgets\ActiveForm */
?>

<div class="departmentgroup-search">
    
    <?php $form = ActiveForm::begin([
        'action' => ['index'],
        'method' => 'get',
    ]); ?>
    
    <div class="input-group">
      <?= Html::activeTextInput($model, 'depart_group_name',['class'=>'form-control','placeholder'=>'ค้นหา...']) ?>
      
        <span class="input-group-btn">
        <button class="btn btn-default" type="submit"><i class="glyphicon glyphicon-search"></i> ค้นหา</button>
      </span>
    </div>
    
    <?php ActiveForm::end(); ?>

</div>
