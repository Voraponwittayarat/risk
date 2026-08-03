<?php

use yii\helpers\Html;


/* @var $this yii\web\View */
/* @var $model frontend\models\Departmentgroup */

$this->title = 'บันทึกข้อมูลฝ่าย';
$this->params['breadcrumbs'][] = ['label' => 'ฝ่าย', 'url' => ['index']];
$this->params['breadcrumbs'][] = $this->title;
?>
<div class="departmentgroup-create">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
