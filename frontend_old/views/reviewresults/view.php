<?php

use yii\helpers\Html;
use yii\widgets\DetailView;

/* @var $this yii\web\View */
/* @var $model frontend\models\Reviewresults */

$this->title =''. ' '.'ไอดี : ' . ' ' . $model->id. ' '.'ผลการทบทวน : ' . ' ' . $model->reviewresults_name ;
$this->params['breadcrumbs'][] = ['label' => 'ผลการทบทวน', 'url' => ['index']];
?>
<div class="reviewresults-view">

    <?= DetailView::widget([
        'model' => $model,
        'attributes' => [
            'id',
            'reviewresults_name',
            'create_date',
            'modify_date',
            'loginname',
            'updatename',
        ],
    ]) ?>

</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>