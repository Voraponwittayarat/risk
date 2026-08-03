<?php

use yii\helpers\Html;




$this->title = 'ประวัติการปรับปรุงโปรแกรม';
$this->params['breadcrumbs'][] = ['label' => 'ปรับปรุงโปรแกรม', 'url' => ['index']];
$this->params['breadcrumbs'][] = $this->title;
?>
<div class="program-create">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>

