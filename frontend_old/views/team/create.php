<?php

use yii\helpers\Html;


/* @var $this yii\web\View */
/* @var $model frontend\models\Team */

$this->title = 'บันทึกข้อมูลทีมนำ';
$this->params['breadcrumbs'][] = ['label' => 'ทีมนำ', 'url' => ['index']];
$this->params['breadcrumbs'][] = $this->title;
?>
<div class="team-create">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
