<?php

use yii\helpers\Html;


/* @var $this yii\web\View */
/* @var $model frontend\models\Riskreview */

$this->title = 'การทบทวนความเสี่ยง';
$this->params['breadcrumbs'][] = ['label' => 'ผลการทบทวน', 'url' => ['index']];
$this->params['breadcrumbs'][] = $this->title;
?>
<div class="riskreview-create">

    <div class="panel panel-success">
        <div class="panel-heading"><span class="glyphicon glyphicon-time" aria-hidden="true"></span> <?= Html::encode($this->title) ?></div>
        <div class="panel-body">
            <?=
            $this->render('_form', [
                'model' => $model
            ])
            ?>
        </div>
    </div>

</div>
