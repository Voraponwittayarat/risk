<?php

use yii\helpers\Html;


/* @var $this yii\web\View */
/* @var $model frontend\models\Level */

$this->title = 'บันทึกข้อมูลระดับความรุนแรง';
$this->params['breadcrumbs'][] = ['label' => 'ระดับความรุนแรง', 'url' => ['index']];
$this->params['breadcrumbs'][] = $this->title;
?>
<div class="level-create">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
