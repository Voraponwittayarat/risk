<?php

use yii\helpers\Html;


/* @var $this yii\web\View */
/* @var $model frontend\models\Levelwarning */

$this->title = 'บันทึกข้อมูลระดับการทบทวน';
$this->params['breadcrumbs'][] = ['label' => 'ระดับการทบทวน', 'url' => ['index']];
$this->params['breadcrumbs'][] = $this->title;
?>
<div class="levelwarning-create">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
