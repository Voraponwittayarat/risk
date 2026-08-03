<?php

use yii\helpers\Html;
use yii\helpers\Url;

/* @var $this yii\web\View */
/* @var $model frontend\models\Riskregister */

$this->title ='รายงานผลการติดตามความเสี่ยง';
//$this->params['breadcrumbs'][] = ['label' => 'ติดตามความเสี่ยง', 'url' => ['riskregister/follow']];
//$this->params['breadcrumbs'][] = 'ความเสี่ยงที่ผ่านการยืนยันแล้ว';

?>


<div class="alert alert-success" >
    <div class="row">
        <div class="col-lg-10 col-md-12">
            <p><h4> <?= Html::encode($this->title) ?>  RiskID/RiskIR Register ที่ ... <?= $id ?>... /...<?= $id_risk ?>...</h4> </p>
        </div>
        <div class="col-lg-2 col-md-12">
            <div class="pull-right">
                <button class="btn btn-success btn-sm" onclick="printDiv('printableArea')"><i class="glyphicon glyphicon-print" aria-hidden="true"> Print</i></button>
            </div>
        </div>
    </div>
</div>

<div class="riskregister-print" id="printableArea" style="display:block;">  
    <div class="panel panel-primary"> 
        <div class="panel-heading"> 
            <h3 class="panel-title">ความเสี่ยงที่ได้จากการรายงานและผ่านการยืนยันจาก คณะกรรมการ RM แล้ว สามารถนำไปใช้งานและอ้างอิงได้ RiskID/RiskIR Register ที่...<span class="badge"><?= $id ?> </span> / <span class="badge"><?= $id_risk ?> </span></h3> 
        </div> 
        <?php foreach ($data1 as $view1) { ?>
        <div class="panel-body">
            <div class="table-responsive"> 
                <table class="table table-bordered table-striped"> 
                    <thead> </thead> 
                    <tbody> 
                        <tr> 
                            <th class="success">RiskID/RiskID Register</th> 
                                <td class="warning"><?php echo $view1['id_risk']; ?> / <?php echo $view1['id']; ?></td> 
                            <th class="success">วันที่เวลารายงาน</th> 
                                <td class="warning"><?php echo $view1['date_report']; ?>  <?php echo $view1['time_report']; ?> น.</td> 
                            <th class="success">เวรที่เกิด</th> 
                                <td class="warning" colspan="8"><?php echo $view1['duration_name']; ?></td> 
                        </tr> 
                        <tr> 
                            <th class="success">ผู้รายงานความเสี่ยง</th> 
                                <td class="warning"><?php echo $view1['use_rep']; ?></td> 
                            <th class="success">แผนกที่รายงาน</th>
                                <td class="warning" colspan="8"><?php echo $view1['depart_name']; ?></td> 
                        </tr> 
                        <tr> 
                            <th class="success">ประเภทการายงาน</th> 
                                <td class="warning"><?php echo $view1['ir_type']; ?></td> 
                            <th class="success">แผนกที่รายงานถึง</th>
                                <td class="warning" colspan="8"><?php echo $view1['ir']; ?></td> 
                        </tr> 
                        <tr> 
                            <th class="success">โปรแกรม</th> 
                                <td class="warning" colspan="10"><?php echo $view1['program_name']; ?></td>
                        </tr> 
                        <tr> 
                            <th class="success">ชื่อความเสี่ยง</th> 
                                <td class="text-muted warning" colspan="10"><?php echo $view1['riskstore_name']; ?></td>
                        </tr> 
                        <tr> 
                            <th class="success">ระดับ A-I</th> 
                                <td class="text-muted warning" colspan="10"><?php echo $view1['level_name']; ?></td>
    
                        </tr> 
                        <tr> 
                            <th class="success">สถานที่เกิด</th> 
                                <td class="text-muted warning" colspan="10"><?php echo $view1['locat_name']; ?></td>
                        </tr> 
                        <tr> 
                            <th class="success">อุบัติการณ์หรือเหตุการณ์</th> 
                                <td class="text-muted warning" colspan="10"><?php echo $view1['detail']; ?></td>
                        </tr> 
                        <tr> 
                            <th class="success">รูปประกอบ</th> 
                                <td class="text-muted warning" colspan="10"><?php echo $view1['image']; ?></td>
                        </tr> 
                       
                        <tr> 
                            <th class="success">การแก้ปัญหาเฉพาะหน้า</th> 
                                <td class="text-muted warning" colspan="10"><?php echo $view1['problem_basic']; ?></td>
                        </tr> 
                        <tr> 
                            <th class="success">แก้ได้/ไม่ได้</th> 
                                <td class="warning" colspan="8"><?php echo $view1['edit']; ?></td> 
                            <th class="success">สถานะ</th> 
                                <td class="warning" colspan="4"><?php echo $view1['status_risk']; ?></td> 
                        </tr> 
                    </tbody> 
                </table> 
            </div>
        </div> 
        <?php } ?> 
    </div>

    <?php foreach ($data2 as $view2) { ?>
    <div class="panel panel-info"> 
        <div class="panel-heading"> 
            <h3 class="panel-title">ทบทวนครั้งที่ <span class="badge"><?php echo $view2['count']; ?></span></h3> 
        </div> 
        <div class="panel-body"> 
            
                        <div class="table-responsive"> 
                <table class="table table-bordered table-striped"> 
                    <thead> </thead> 
                    <tbody> 
                        <tr> 
                            <th class="success">เลขที่ทบทวน</th> 
                                <td class="warning"><?php echo $view2['riskvisit']; ?></td> 
                            <th class="success">วันที่เวลาทบทวน</th> 
                                <td class="warning"><?php echo $view2['review_datetime']; ?> น.</td>  
                            <th class="success">ผู้ทบทวนหลัก</th> 
                                <td class="warning" colspan="8"><?php echo $view2['review_main']; ?></td> 
                        </tr> 
                        <tr> 
                            <th class="success">ผู้ร่วมทบทวน</th> 
                                <td class="text-muted warning" colspan="10"><?php echo $view2['review_cid']; ?></td>
                        </tr> 
                        <tr> 
                            <th class="success">Note.</th> 
                                <td class="text-muted warning" colspan="10"><?php echo $view2['notereview']; ?></td>
                        </tr> 
                        <tr> 
                            <th class="success">ไฟล์แนบ</th> 
                                <td class="text-muted warning" colspan="10"><?php echo $view2['files']; ?></td>
                        </tr> 
                        <tr> 
                            <th class="success">ผลการทบทวน</th> 
                                <td class="text-muted warning" colspan="10"><?php echo $view2['reviewresults_name']; ?></td>
                        </tr> 
                        <tr> 
                            <th class="success">สถานะหลังทบทวน</th> 
                                <td class="warning"><?php echo $view2['st_review']; ?></td> 
                            <th class="success">การทบทวนซ้ำ</th> 
                                <td class="warning"><?php echo $view2['rep']; ?></td> 
                            <th class="success">จำหน่าย/ไม่จำหน่าย</th> 
                                <td class="warning" colspan="8"><?php echo $view2['dc']; ?></td> 
                        </tr> 
  
                    </tbody> 
                </table> 
            </div>
    
        </div> 
         
    </div> 
    <?php } ?> 
    
</div>

<?= \bluezed\scrollTop\ScrollTop::widget() ?>

<script>
    function printDiv(divName) {
         var printContents = document.getElementById(divName).innerHTML;
         var originalContents = document.body.innerHTML;

         document.body.innerHTML = printContents;

         window.print();

         document.body.innerHTML = originalContents;
    }
</script>