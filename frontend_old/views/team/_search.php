<?php

use yii\helpers\Html;
use yii\widgets\ActiveForm;

/* @var $this yii\web\View */
/* @var $model frontend\models\TeamSearch */
/* @var $form yii\widgets\ActiveForm */
?>

<div class="team-search">

    <?php $form = ActiveForm::begin([
        'action' => ['index'],
        'method' => 'get',
    ]); ?>

     <div class="input-group">
      <?= Html::activeTextInput($model, 'team_name',['class'=>'form-control','placeholder'=>'ค้นหา...']) ?>
      
        <span class="input-group-btn">
        <button class="btn btn-default" type="submit"><i class="glyphicon glyphicon-search"></i> ค้นหา</button>
      </span>
    </div>
    
    <?php ActiveForm::end(); ?>

</div>
