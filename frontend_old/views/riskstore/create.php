<?php

use yii\helpers\Html;


/* @var $this yii\web\View */
/* @var $model frontend\models\Riskstore */

$this->title = 'บันทึกข้อมูลความเสี่ยง';
$this->params['breadcrumbs'][] = ['label' => 'คลังความเสี่ยง', 'url' => ['index']];
$this->params['breadcrumbs'][] = $this->title;
?>
<div class="riskstore-create">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
