<?php

use yii\helpers\Html;
use rmrevin\yii\fontawesome\FA;

/* @var $this yii\web\View */
/* @var $dataProvider yii\data\ActiveDataProvider */

$this->title = 'Report Center : Hospital Risk Management System.';
//$this->params['breadcrumbs'][] = $this->title;
?>
<div class="report-index">
 <!-- หน่วยงานที่รายงาน -->
    <div class="panel panel-info">
        <div class="panel-heading"><span class="glyphicon glyphicon-object-align-left" aria-hidden="true"></span> รายงานอุบัติการณ์ความเสี่ยง (<font color="#ff0066">หน่วยงานที่รายงาน</font>)</div>
        <div class="panel-body">
            <?= Html::a('<span class="label label-success">REP1_01</span> รายงานจำนวนอุบัติการณ์ความเสี่ยง แยกตามระดับความเสี่ยง', ['/report1/rep01']) ?> </br>
            <?= Html::a('<span class="label label-success">REP1_02</span> รายงานจำนวนอุบัติการณ์ความเสี่ยง แยกตามชื่อความเสี่ยง', ['/report1/rep02']) ?> </br>
            <?= Html::a('<span class="label label-success">REP1_03</span> รายงานจำนวนอุบัติการณ์ความเสี่ยง แยกตามโปรแกรมเชื่อมโยง (8 ด้าน)', ['/report1/rep03']) ?> <?php //echo Html::img('@web/images/new.png') ?></br>
            <?= Html::a('<span class="label label-success">REP1_04</span> รายงานประเภทความเสี่ยง 2 ประเภท (General Risk,Common Clinical risk)', ['/report1/rep04']) ?> <?php //echo Html::img('@web/images/new.png') ?></br>
            <?= Html::a('<span class="label label-success">REP1_05</span> รายงานจำนวนอุบัติการณ์แยกตามระดับ 5 ระดับ ความเสี่ยงทางคลินิก', ['/report1/rep05']) ?> <?php //echo Html::img('@web/images/new.png') ?></br>
            <?= Html::a('<span class="label label-success">REP1_05</span> รายงานจำนวนอุบัติการณ์แยกตามระดับ 5 ระดับ ความเสี่ยงทั่วไป', ['/report1/rep05_1']) ?> <?php //echo Html::img('@web/images/new.png') ?></br>
            <?= Html::a('<span class="label label-success">REP1_06</span> รายงานจำนวนอุบัติการณ์ความเสี่ยง แยกตามที่มาของการรายงานความเสี่ยง', ['/report1/rep06']) ?> <?php //echo Html::img('@web/images/new.png') ?></br>
            <?= Html::a('<span class="label label-success">REP1_07</span> รายงานจำนวนอุบัติการณ์ความเสี่ยง แยกตามเชิงรับ-เชิงรุก', ['/report1/rep07']) ?> <?php //echo Html::img('@web/images/new.png') ?></br>
            <?= Html::a('<span class="label label-success">REP1_08</span> จำนวนการรายงานอุบัติการณ์ความเสี่ยงซ้ำ (นับซ้ำ ID ของชื่อความเสี่ยง)', ['/report1/rep08']) ?> <?php //echo Html::img('@web/images/new.png') ?></br>
            <?= Html::a('<span class="label label-success">REP1_09</span> รายงานจำนวนอุบัติการณ์ความเสี่ยง แยกตามโปรแกรมเชื่อมโยง (8 ด้าน) ทั้งหมด', ['/report1/rep09']) ?> <?php //echo Html::img('@web/images/new.png') ?></br>
            <?= Html::a('<span class="label label-success">REP1_10</span> รายงานจำนวนอุบัติการณ์ความเสี่ยง แยกตามฝ่ายงาน', ['/report1/rep10']) ?> <?php //echo Html::img('@web/images/new.png') ?></br>
            <?= Html::a('<span class="label label-success">REP1_11</span> รายงานจำนวนอุบัติการณ์ความเสี่ยง ที่ยังไม่ทบทวน', ['/report1/rep11']) ?> <?php //echo Html::img('@web/images/new.png') ?></br>
            <?= Html::a('<span class="label label-success">REP1_12</span> รายงานความเสี่ยงที่ได้รับการทบทวนแล้ว', ['/report1/rep12']) ?> <?php //echo Html::img('@web/images/new.png') ?></br>
            <?= Html::a('<span class="label label-success">REP1_13</span> รายชื่อเจ้าหน้าที่ที่รายงานอุบัติการณ์ความเสี่ยง', ['/report1/rep13']) ?> <?php //echo Html::img('@web/images/new.png') ?></br>
            <?= Html::a('<span class="label label-success">REP1_14</span> รายงานจำนวนอุบัติการณ์ความเสี่ยงที่เกิดขึ้นทั้งหมด', ['/report1/rep14']) ?> <?php echo Html::img('@web/images/new.png') ?></br>
            <?= Html::a('<span class="label label-success">REP1_15</span> รายงานจำนวนอุบัติการณ์ความเสี่ยงที่เกิดขึ้นแยกรายเดือน', ['/report1/rep15']) ?> <?php echo Html::img('@web/images/new.png') ?></br>
            <?= Html::a('<span class="label label-success">REP1_16</span> รายงานจำนวนอุบัติการณ์ที่ไม่ใช่ความเสี่ยงทั้งหมด', ['/report1/rep16']) ?> <?php echo Html::img('@web/images/new.png') ?></br>
           
        </div>
    </div> 
 
<!--  หน่วยงานที่ถูกรายงาน  -->
<?php if (!Yii::$app->user->isGuest && Yii::$app->user->identity->role != 3){ ?>
    <div class="panel panel-info">
        <div class="panel-heading"><span class="glyphicon glyphicon-object-align-left" aria-hidden="true"></span> รายงานอุบัติการณ์ความเสี่ยง (<font color="#ff0066">หน่วยงานที่ถูกรายงาน</font>)</div>
        <div class="panel-body">
           <!--  <?php//= Html::a('<span class="label label-success">REP2_01</span> รายงานจำนวนอุบัติการณ์ความเสี่ยง แยกตามระดับความเสี่ยง A-I', ['/report2/rep01']) ?> <?php //echo Html::img('@web/images/new.png') ?></br> -->
            <?= Html::a('<span class="label label-success">REP2_01</span> รายงานจำนวนอุบัติการณ์ความเสี่ยง แยกตามชื่อความเสี่ยง', ['/report2/rep02']) ?> <?php //echo Html::img('@web/images/new.png') ?></br>
            <?= Html::a('<span class="label label-success">REP2_02</span> รายงานจำนวนอุบัติการณ์ความเสี่ยง แยกตามฝ่าย', ['/report2/rep03']) ?> <?php echo Html::img('@web/images/new.png') ?></br>
        </div>
    </div>
<?php } ?>
</div>
<div class="row">
    <div class="col-lg-12">
        <div class="alert alert-danger" role="alert">
            <strong>หมายเหตุ !</strong>  สถานนะรายงาน <span class="label label-success">ใช้งานได้</span>  <span class="label label-warning">กำลังพัฒนา/ปรับปรุง</span> 
        </div>
    </div>
</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>