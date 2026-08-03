<?php

use yii\helpers\Html;
use yii\widgets\ActiveForm;

/* @var $this yii\web\View */
/* @var $model frontend\models\RiskSearch */
/* @var $form yii\widgets\ActiveForm */
?>

<div class="risk-search">

    <?php $form = ActiveForm::begin([
        'action' => ['index'],
        'method' => 'get',
        'options' => [
            'data-pjax' => 1
        ],
    ]); ?>

    <?= $form->field($model, 'id') ?>

    <?= $form->field($model, 'date_report') ?>

    <?= $form->field($model, 'time_report') ?>

    <?= $form->field($model, 'duration_id') ?>

    <?= $form->field($model, 'depart_group_id') ?>

    <?php // echo $form->field($model, 'depart_id') ?>

    <?php // echo $form->field($model, 'location_id') ?>

    <?php // echo $form->field($model, 'user_ir_type') ?>

    <?php // echo $form->field($model, 'user_ir') ?>

    <?php // echo $form->field($model, 'programs_id') ?>

    <?php // echo $form->field($model, 'level_id') ?>

    <?php // echo $form->field($model, 'riskstore_id') ?>

    <?php // echo $form->field($model, 'detail') ?>

    <?php // echo $form->field($model, 'detail_hosxp') ?>

    <?php // echo $form->field($model, 'affected') ?>

    <?php // echo $form->field($model, 'edit') ?>

    <?php // echo $form->field($model, 'problem_basic') ?>

    <?php // echo $form->field($model, 'image') ?>

    <?php // echo $form->field($model, 'inform_id') ?>

    <?php // echo $form->field($model, 'status_risk') ?>

    <?php // echo $form->field($model, 'created_by') ?>

    <?php // echo $form->field($model, 'updated_by') ?>

    <?php // echo $form->field($model, 'create_date') ?>

    <?php // echo $form->field($model, 'modify_date') ?>

    <div class="form-group">
        <?= Html::submitButton('Search', ['class' => 'btn btn-primary']) ?>
        <?= Html::resetButton('Reset', ['class' => 'btn btn-default']) ?>
    </div>

    <?php ActiveForm::end(); ?>

</div>
