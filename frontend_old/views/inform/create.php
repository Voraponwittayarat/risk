<?php

use yii\helpers\Html;


/* @var $this yii\web\View */
/* @var $model frontend\models\Inform */

$this->title = 'บันทึกข้อมูลที่มาของรายงานความเสี่ยง';
$this->params['breadcrumbs'][] = ['label' => 'ที่มาของรายงานความเสี่ยง', 'url' => ['index']];
$this->params['breadcrumbs'][] = $this->title;
?>
<div class="inform-create">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>

