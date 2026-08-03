<?php

use yii\helpers\Html;
use yii\widgets\DetailView;

/* @var $this yii\web\View */
/* @var $model frontend\models\Departmentgroup */

$this->title =''. ' '.'ไอดี : ' . ' ' . $model->id. ' '.'ฝ่าย : ' . ' ' . $model->depart_group_name ;
$this->params['breadcrumbs'][] = ['label' => 'ข้อมูลฝ่าย', 'url' => ['index']];
?>
<div class="departmentgroup-view">
    <?= DetailView::widget([
        'model' => $model,
        'attributes' => [
            'id',
            'depart_group_name',
            'create_date',
            'modify_date',
            'loginname',
            'updatename'
        ],
    ]) ?>

</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>