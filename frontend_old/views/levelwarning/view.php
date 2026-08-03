<?php

use yii\helpers\Html;
use yii\widgets\DetailView;

/* @var $this yii\web\View */
/* @var $model frontend\models\Levelwarning */

$this->title =''. ' '.'ไอดี : ' . ' ' . $model->id. ' '.'ระดับการทบทวน : ' . ' ' . $model->warning_name ;
$this->params['breadcrumbs'][] = ['label' => 'ข้อมูลระดับการทบทวน', 'url' => ['index']];
?>
<div class="levelwarning-view">

    <?= DetailView::widget([
        'model' => $model,
        'attributes' => [
            'id',
            'warning_code',
            'warning_name',
            'create_date',
            'modify_date',
            'loginname',
            'updatename'
        ],
    ]) ?>

</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>