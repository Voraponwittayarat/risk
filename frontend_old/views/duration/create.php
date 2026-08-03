<?php

use yii\helpers\Html;


/* @var $this yii\web\View */
/* @var $model frontend\models\Duration */

$this->title = 'บันทึกข้อมูลเวร';
$this->params['breadcrumbs'][] = ['label' => 'เวรทำการ', 'url' => ['index']];
$this->params['breadcrumbs'][] = $this->title;
?>
<div class="duration-create">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
