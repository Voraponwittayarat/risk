<?php

use yii\helpers\Html;


/* @var $this yii\web\View */
/* @var $model frontend\models\Riskgroup */


$this->title = 'บันทึกข้อมูลกลุ่มความเสี่ยง';
$this->params['breadcrumbs'][] = ['label' => 'กลุ่มความเสี่ยง', 'url' => ['index']];
$this->params['breadcrumbs'][] = $this->title;
?>
<div class="riskgroup-create">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
