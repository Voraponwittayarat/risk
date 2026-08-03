<?php

use yii\helpers\Html;


/* @var $this yii\web\View */
/* @var $model frontend\models\Hospital */

$this->title = 'บันทึกข้อมูล รพ.';
$this->params['breadcrumbs'][] = ['label' => 'โรงพยาบาล', 'url' => ['index']];
$this->params['breadcrumbs'][] = $this->title;
?>
<div class="hospital-create">
    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
