<?php

use yii\helpers\Html;
use yii\widgets\DetailView;

/* @var $this yii\web\View */
/* @var $model frontend\models\Team */

$this->title =''. ' '.'ไอดี : ' . ' ' . $model->id. ' '.'ทีมนำ : ' . ' ' . $model->team_name ;
$this->params['breadcrumbs'][] = ['label' => 'ทีมนำ', 'url' => ['index']];
?>
<div class="team-view">
    <?= DetailView::widget([
        'model' => $model,
        'attributes' => [
            'id',
            'team_name',
            'create_date',
            'modify_date',
            'loginname',
            'updatename'
            
        ],
    ]) ?>

</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>