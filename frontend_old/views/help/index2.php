<?php
$this->title = Yii::t('app', 'เอกสารวิชาการ\เอกสารอ้างอิง');

use yii\helpers\Html;
?>
<div class="panel panel-success">
    <!-- Default panel contents -->
    <div class="panel-heading"><span class="glyphicon glyphicon-folder-open" aria-hidden="true"></span> เอกสารวิชาการ\เอกสารอ้างอิง</div>
    <div class="panel-body">
        <ul class="list-group">
            <li class="list-group-item"><i class="fa fa-angle-double-right"></i> <?= Html::a('Risk Management in Hospitals ', ['/help/handbook']); ?></li>
        </ul>

    </div>
</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>

