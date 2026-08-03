<?php
use yii\helpers\Html;

$this->title = 'ประวัติการปรับปรุงโปรแกรม';
//$this->params['breadcrumbs'][] = $this->title;
?>
    <div class="panel panel-success">
        <div class="panel-heading"><span class="glyphicon glyphicon-list-alt" aria-hidden="true"></span> ประวัติการปรับปรุงโปรแกรม </div>
        <div class="panel-body">
            <?php foreach ($data_view as $data) { ?>
            <strong><i class="fa fa-bell"></i> <?php echo $data['datetime']; ?></strong> <br>
                 <p class="text-muted"><i class="fa fa-angle-double-right"></i> <?php echo $data['change']; ?> </p>
            <hr>
            <?php } ?>  
        </div>
    </div>

<?= \bluezed\scrollTop\ScrollTop::widget() ?>