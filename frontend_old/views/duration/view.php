<?php

use yii\helpers\Html;
use yii\widgets\DetailView;

/* @var $this yii\web\View */
/* @var $model frontend\models\Duration */

$this->title =''. ' '.'ไอดี : ' . ' ' . $model->id. ' '.'เวร : ' . ' ' . $model->duration_name ;
$this->params['breadcrumbs'][] = ['label' => 'เวรทำการ', 'url' => ['index']];
?>
<div class="duration-view">
    
    <?= DetailView::widget([
        'model' => $model,
        'attributes' => [
            'id',
            'duration_name',
            'create_date',
            'modify_date',
            'loginname',
            'updatename'
        ],
    ]) ?>

</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>