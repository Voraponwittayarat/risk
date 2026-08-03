<?php

use yii\helpers\Html;


/* @var $this yii\web\View */
/* @var $model frontend\models\Program */

$this->title = 'บันทึกข้อมูลโปรแกรมความเสี่ยง';
$this->params['breadcrumbs'][] = ['label' => 'โปรแกรมความเสี่ยง', 'url' => ['index']];
$this->params['breadcrumbs'][] = $this->title;
?>
<div class="program-create">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
