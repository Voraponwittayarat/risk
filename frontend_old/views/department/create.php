<?php

use yii\helpers\Html;


/* @var $this yii\web\View */
/* @var $model frontend\models\Department */

$this->title = 'บันทึกข้อมูลแผนก-งาน';
$this->params['breadcrumbs'][] = ['label' => 'แผนก-งาน', 'url' => ['index']];
$this->params['breadcrumbs'][] = $this->title;
?>
<div class="department-create">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
