<?php

use yii\helpers\Html;

/* @var $this yii\web\View */
/* @var $model frontend\models\Hospital */

$this->title ='ปรับปรุงข้อมูล : '. ' '.'HCODE ' . ' ' . $model->hoscode. ' '.'ชื่อ : ' . ' ' . $model->hosname ;
$this->params['breadcrumbs'][] = ['label' => 'ข้อมูลโรงพยาบาล', 'url' => ['index']];
?>
<div class="hospital-update">
    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
