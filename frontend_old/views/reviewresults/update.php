<?php

use yii\helpers\Html;

/* @var $this yii\web\View */
/* @var $model frontend\models\Reviewresults */

$this->title =''. ' '.'ไอดี : ' . ' ' . $model->id. ' '.'ผลการทบทวน : ' . ' ' . $model->reviewresults_name ;
$this->params['breadcrumbs'][] = ['label' => 'ผลการทบทวน', 'url' => ['index']];
$this->params['breadcrumbs'][] = 'ปรับปรุง';
?>
<div class="reviewresults-update">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
