<?php

use yii\helpers\Html;
use yii\widgets\DetailView;

/* @var $this yii\web\View */
/* @var $model frontend\models\Hospital */

$this->title =''. ' '.'HCODE : ' . ' ' . $model->hoscode. ' '.'ชื่อ : ' . ' ' . $model->hosname ;
$this->params['breadcrumbs'][] = ['label' => 'ข้อมูลโรงพยาบาล', 'url' => ['index']];
?>
<div class="hospital-view">
    <?= DetailView::widget([
        'model' => $model,
        'attributes' => [
            'id',
            'hoscode',
            'hosname',
            'address',
            'tel',
            'phone',
            'fax',
            'email:email',
            'website:ntext',
            'linetoken',
            'linenotify',
            'sendmail',
            'create_date',
            'modify_date',
            'loginname',
            'updatename'
        ],
    ]) ?>

</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>