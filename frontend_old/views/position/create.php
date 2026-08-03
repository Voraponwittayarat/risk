<?php

use yii\helpers\Html;


/* @var $this yii\web\View */
/* @var $model frontend\models\Position */

$this->title = 'บันทึกข้อมูลตำแหน่ง';
$this->params['breadcrumbs'][] = ['label' => 'ตำแหน่ง', 'url' => ['index']];
$this->params['breadcrumbs'][] = $this->title;
?>
<div class="position-create">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
