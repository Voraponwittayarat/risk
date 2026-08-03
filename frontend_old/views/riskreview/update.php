<?php

use yii\helpers\Html;

/* @var $this yii\web\View */
/* @var $model frontend\models\Riskreview */

$this->title = 'แก้ไขรายละเอียดการทบทวนความเสี่ยงของคุณ : ' . ' ' . $model->loginname ;
$this->params['breadcrumbs'][] = ['label' => 'รายการทบทวนความเสี่ยง', 'url' => ['index']];
$this->params['breadcrumbs'][] = ['label' => 'แสดงรายละเอียดการทบทวน', 'url' => ['view', 'id' => $model->id, 'riskvisit' => $model->riskvisit]];
//$this->params['breadcrumbs'][] = 'Update';
?>
<div class="riskreview-update">

    <div class="panel panel-warning">
        <div class="panel-heading"><span class="glyphicon glyphicon-repeat" aria-hidden="true"></span> <?= Html::encode($this->title) ?></div>
        <div class="panel-body">
            <?=
            $this->render('_form', [
                'model' => $model
            ])
            ?>
        </div>
    </div>
</div>
