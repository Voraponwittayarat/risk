<?php

use yii\helpers\Html;


/* @var $this yii\web\View */
/* @var $model frontend\models\Type */

$this->title = 'บันทึกข้อมูลประเภทความเสี่ยง';
$this->params['breadcrumbs'][] = ['label' => 'ประเภทความเสี่ยง', 'url' => ['index']];
$this->params['breadcrumbs'][] = $this->title;
?>
<div class="type-create">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
