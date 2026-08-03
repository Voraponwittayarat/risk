<?php

use yii\helpers\Html;


/* @var $this yii\web\View */
/* @var $model frontend\models\Riskregister */

$this->title = 'Create Riskregister';
$this->params['breadcrumbs'][] = ['label' => 'Riskregisters', 'url' => ['index']];
$this->params['breadcrumbs'][] = $this->title;
?>
<div class="riskregister-create">

    <h1><?= Html::encode($this->title) ?></h1>

    <?= $this->render('_form', [
        'model' => $model,
    ]) ?>

</div>
