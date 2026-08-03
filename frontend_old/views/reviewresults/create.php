<?php

use yii\helpers\Html;


/* @var $this yii\web\View */
/* @var $model frontend\models\Reviewresults */

$this->title = 'ผลการทบทวน';
$this->params['breadcrumbs'][] = ['label' => 'ผลการทบทวน', 'url' => ['index']];
$this->params['breadcrumbs'][] = $this->title;
?>
<div class="reviewresults-create">

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
