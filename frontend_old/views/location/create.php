<?php

use yii\helpers\Html;


/* @var $this yii\web\View */
/* @var $model frontend\models\Location */

$this->title = 'บันทึกข้อมูลสถานที่เกิดความเสี่ยง';
$this->params['breadcrumbs'][] = ['label' => 'สถานที่เกิดความเสี่ยง', 'url' => ['index']];
$this->params['breadcrumbs'][] = $this->title;
?>
<div class="location-create">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
