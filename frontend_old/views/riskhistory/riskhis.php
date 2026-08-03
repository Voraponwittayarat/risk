<?php

use yii\helpers\Html;
use yii\helpers\Url;

/* @var $this yii\web\View */
/* @var $model frontend\models\Riskregister */

$this->title ='รายงานผลการติดตามความเสี่ยง';
//$this->params['breadcrumbs'][] = ['label' => 'ติดตามความเสี่ยง', 'url' => ['riskregister/follow']];
//$this->params['breadcrumbs'][] = 'ความเสี่ยงที่ผ่านการยืนยันแล้ว';

?>




<div class="riskregister-print" id="printableArea" style="display:block;">  
    <div class="panel panel-primary"> 

        <div class="panel-body">
            <div class="table-responsive"> 
                <table class="table table-bordered table-striped"> 
                    <thead> </thead> 
                    <tbody> 
                        <tr> 
                            <th class="success">RiskID/RiskID Register</th> 
                                <td class="warning"> <?= $id_risk ?> / <?= $id ?> </td> 
                            <th class="success">วันที่เวลารายงาน</th> 
                                <td class="warning"> <?= $date_report ?>   <?= $time_report ?> น.</td> 
                            <th class="success">เวรที่เกิด</th> 
                                <td class="warning" colspan="2"> <?= $duration_name ?>  </td> 
                        </tr> 
                        <tr> 
                            <th class="success">ผู้รายงานความเสี่ยง</th> 
                                <td class="warning"> <?= $use_rep ?> </td> 
                            <th class="success">แผนกที่รายงาน</th>
                                <td class="warning" colspan="4">  <?= $depart_name ?> </td> 
                        </tr> 
                        <tr> 
                            <th class="success">ประเภทการายงาน</th> 
                                <td class="warning"> <?= $ir_type ?> </td> 
                            <th class="success">แผนกที่รายงานถึง</th>
                                <td class="warning" colspan="4"><?= $ir ?> </td> 
                        </tr> 
                        <tr> 
                            <th class="success">โปรแกรม</th> 
                                <td class="warning" colspan="10"><?= $program_name ?> </td>
                        </tr> 
                        <tr> 
                            <th class="success">ชื่อความเสี่ยง</th> 
                                <td class="text-muted warning" colspan="10"> <?= $riskstore_name ?> </td>
                        </tr> 
                        <tr> 
                            <th class="success">ระดับ A-I</th> 
                                <td class="text-muted warning" colspan="10"><?= $level_name ?> </td>
    
                        </tr> 
                        <tr> 
                            <th class="success">สถานที่เกิด</th> 
                                <td class="text-muted warning" colspan="10"><?= $locat_name ?> </td>
                        </tr> 
                        <tr> 
                            <th class="success">อุบัติการณ์หรือเหตุการณ์</th> 
                                <td class="text-muted warning" colspan="10"> <?= $detail ?></td>
                        </tr> 
                        <tr> 
                            <th class="success">การแก้ปัญหาเฉพาะหน้า</th> 
                                <td class="text-muted warning" colspan="10"><?= $problem_basic ?> </td>
                        </tr> 
                        <tr> 
                            <th class="success">แก้ได้/ไม่ได้</th> 
                                <td class="warning" colspan="2"> <?= $edit ?> </td> 
                            <th class="success">สถานะ</th> 
                                <td class="warning" colspan="2"> <?= $status_risk ?> </td> 
                        </tr> 
                    </tbody> 
                </table> 
            </div>
        </div> 
  
    </div>

    
</div>

<?= \bluezed\scrollTop\ScrollTop::widget() ?>
