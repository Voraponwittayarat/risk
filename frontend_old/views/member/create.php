<?php

use yii\helpers\Html;

$this->title = 'บันทึกข้อมูลบุคลากร';
$this->params['breadcrumbs'][] = ['label' => 'บุคลากร', 'url' => ['index']];
$this->params['breadcrumbs'][] = $this->title;
?>
<div class="member-create">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
