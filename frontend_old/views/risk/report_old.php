<?php

use yii\helpers\Html;

/* @var $this yii\web\View */
/* @var $dataProvider yii\data\ActiveDataProvider */

$this->title = 'ระบบรายงาน';
//$this->params['breadcrumbs'][] = $this->title;
?>
<div class="report-index">
 <!-- วัดปริมาณ -->
    <div class="panel panel-info">
        <div class="panel-heading"><span class="glyphicon glyphicon-object-align-left" aria-hidden="true"></span> กลุ่มรายงานวัดปริมาณของการรายงานอุบัติการณ์ความเสี่ยง</div>
        <div class="panel-body">
            <?= Html::a('1. รายงานตามโปรแกรมเชื่อมโยง  17 ด้าน', ['/report/volume01']) ?> </br>
            <?= Html::a('2. รายงานประเภทความเสี่ยง 3 ประเภท (General Risk,Common Clinical risk,Specific Clinical Risk)', ['/report/volume02']) ?> </br>
            <?= Html::a('3. รายงานจำนวนอุบัติการณ์แยกตามระดับ 4 ระดับ (1.รุนแรงน้อง A-B,2.รุนแรงปานกลาง C-D,3.รุนแรงมาก E-F,4.ร้ายแรง H-I)', ['/report/volume03']) ?> </br>
            <?= Html::a('4. รายงานแยกตามระดับความรุนแรง A-I', ['/report/volume04']) ?> </br>
            <?= Html::a('5. รายงานจำนวนครั้งของการรายงานอุบัติการณ์ แยกตามชื่อเรื่อง', ['/report/volume05']) ?> </br>
            <?= Html::a('6. รายงานจำนวนครั้งของการรายงานอุบัติการณ์แยกตามหน่วยงาน (หน่วยงานที่ทำให้เกิดความเสี่ยง)', ['/report/volume06']) ?> </br>
            <?= Html::a('7. รายงานจำนวนครั้งของการรายงานอุบัติการณ์แยกตามหน่วยงาน (หน่วยงานที่รายงานความเสี่ยง)', ['/report/volume07']) ?> </br>
            <?= Html::a('8. รายงานจำนวนครั้งของการรายงานอุบัติการณ์แยกตามสถานที่เกิดเหตุการณ์', ['/report/volume08']) ?> </br>
            <?= Html::a('9. รายงานจำนวนครั้งของการรายงานอุบัติการณ์แยกตามผู้รายงาน', ['/report/volume09']) ?> </br>
            <?= Html::a('10. รายงานจำนวนครั้งของการรายงานอุบัติการณ์หน่วยงานตนเองรายงาน', ['/report/volume10']) ?> </br>
            <?= Html::a('11. รายงานจำนวนครั้งของการรายงานอุบัติการณ์รายงานหน่วยงานผู้อื่น', ['/report/volume11']) ?> </br>
            <?= Html::a('12. จำนวนรายงานอุบัติการณ์แยกตามสถานะ', ['/report/volume12']) ?> </br>
            <?= Html::a('13. จำนวนรายงานอุบัติการณ์ความเสี่ยง แยกตามทีมคร่อมสายงาน', ['/report/volume13']) ?> </br>
        </div>
    </div> 
 
<!--  วัดประสิทธิภาพ  -->

    <div class="panel panel-danger">
        <div class="panel-heading"><span class="glyphicon glyphicon-object-align-left" aria-hidden="true"></span> กลุ่มรายงานวัดประสิทธิภาพของอุบัติการณ์ความเสี่ยงที่เกิดขึ้น</div>
        <div class="panel-body">
            <?= Html::a('1. รายงานเชิงรุก-เชิงรุก  Clinicและ หน่วยงาน', ['/report/performance01']) ?> </br>
            <?= Html::a('2. รายงาน Sentinial Event ความรุนแรงระดับ G-I ต้องรายงาน ผอ. หรือ QMR', ['/report/performance02']) ?> </br>
            <?= Html::a('3. อัตราการรายงาน Near Miss (A-B/A-D)', ['/report/performance03']) ?> </br>
            <?= Html::a('4. อัตราการรายงานอุบัติการณ์ความเสี่ยงภายในเวลาที่กำหนด', ['/report/performance04']) ?> </br>
            <?= Html::a('5. อัตราการปิดอุบัติการณ์ภายในเวลาที่กำหนด', ['/report/performance05']) ?> </br>
            <?= Html::a('6. อัตราการรายงานอุบัติการณ์ซ้ำ', ['/report/performance06']) ?> </br>
            <?= Html::a('7. รายงานอุบัติการณ์ความเสี่ยงที่ยังไม่ได้ทบทวน', ['/report/performance07']) ?> </br>
            <?= Html::a('8. รายงานอุบัติการณ์ความเสี่ยง ที่มีระดับความเสี่ยง E ขึ้นไป แยกหน่วยงาน', ['/report/performance08']) ?> </br>
            <?= Html::a('9. รายงาน Near Miss (เหตุการณ์ที่ยังไม่ถึงผู้ป่วยตรวจพบก่อน ระดับ A และ B)', ['/report/performance09']) ?> </br>
            <?= Html::a('10. รายงาน Miss (เหตุการณ์ที่มีผลกระทบกับผู้ป่วยได้แก่ ระดับ C ถึง  I)', ['/report/performance10']) ?> </br>

        </div>
    </div>  
    
    
    
</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>