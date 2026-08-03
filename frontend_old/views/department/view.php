<?php

use yii\helpers\Html;
use yii\widgets\DetailView;

/* @var $this yii\web\View */
/* @var $model frontend\models\Department */

$this->title =''. ' '.'ไอดี : ' . ' ' . $model->id. ' '.'แผนก/งาน : ' . ' ' . $model->depart_name ;
$this->params['breadcrumbs'][] = ['label' => 'ข้อมูลแผนก-งาน', 'url' => ['index']];
?>
<div class="department-view">
    <?= DetailView::widget([
        'model' => $model,
        'attributes' => [
            'id',
            'depart_name_eng',
            'depart_name',
            'departgroupname',
            'create_date',
            'modify_date',
            'loginname',
            'updatename'
        ],
    ]) ?>

</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>