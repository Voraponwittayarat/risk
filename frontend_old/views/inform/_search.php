<?php

use yii\helpers\Html;
use yii\widgets\ActiveForm;

/* @var $this yii\web\View */
/* @var $model frontend\models\InformSearch */
/* @var $form yii\widgets\ActiveForm */
?>

<div class="inform-search">

    <?php $form = ActiveForm::begin([
        'action' => ['index'],
        'method' => 'get',
        'options' => [
            'data-pjax' => 1
        ],
    ]); ?>


    <div class="input-group">
      <?= Html::activeTextInput($model, 'inform_name',['class'=>'form-control','placeholder'=>'ค้นหา...']) ?>
      
        <span class="input-group-btn">
        <button class="btn btn-default" type="submit"><i class="glyphicon glyphicon-search"></i> ค้นหา</button>
      </span>
    </div>

    <?php ActiveForm::end(); ?>

</div>
