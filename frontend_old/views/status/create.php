<?php

use yii\helpers\Html;


/* @var $this yii\web\View */
/* @var $model frontend\models\Status */

$this->title = 'บันทึกข้อมูลสถานะความเสี่ยง';
$this->params['breadcrumbs'][] = ['label' => 'สถานะความเสี่ยง', 'url' => ['index']];
$this->params['breadcrumbs'][] = $this->title;
?>
<div class="status-create">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
