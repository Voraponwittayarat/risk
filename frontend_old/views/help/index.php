<?php
use yii\helpers\Html;

$this->title = Yii::t('app', 'คู่มือการใช้งาน');

?>
<div class="panel panel-success">
    <!-- Default panel contents -->
    <div class="panel-heading"><span class="glyphicon glyphicon-book" aria-hidden="true"></span> คู่มือการใช้งาน</div>
    <div class="panel-body">
        <ul class="list-group">
            <li class="list-group-item"><i class="fa fa-angle-double-right"></i> <?= Html::a('คู่มือการใช้งานโปรแกรมบริหารความเสี่ยงสำหรับโรงพยาบาล สำหรับผู้ใช้งานทั่วไป', ['/help/userkey']); ?></li>
            <li class="list-group-item"><i class="fa fa-angle-double-right"></i> <?= Html::a('คู่มือการใช้งานโปรแกรมบริหารความเสี่ยงสำหรับโรงพยาบาล สำหรับผู้ดูแลระบบ', ['/help/adminkey']); ?></li>
            <li class="list-group-item"><i class="fa fa-angle-double-right"></i> <?= Html::a('คู่มือการใช้งานโปรแกรมบริหารความเสี่ยงสำหรับโรงพยาบาล สำหรับผู้บริหารความเสี่ยง', ['/help/teamkey']); ?></li>
        </ul>

    </div>
</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>

