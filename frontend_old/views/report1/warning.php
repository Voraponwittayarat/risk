<?php
/* @var $this yii\web\View */

use yii\helpers\Html;
use rmrevin\yii\fontawesome\FA;

$this->title = 'Warning Report Developing';
//$this->params['breadcrumbs'][] = $this->title;
?>
<div class="row"> 
        <div class="text-center"> 
                <?php echo Html::img('@web/images/comingsoon.png') ?>
                
                <p>กำลังปรับปรุง-พัฒนา.... <i class="fa fa-cog fa-spin fa-1x fa-fw"></i></p>
                <p class='text-center'>
                        <?= Html::a('<i class="fa fa-arrow-circle-left fa-1x fa-fw"></i> กลับหน้ารายงาน', ['/risk/report'], ['class' => 'btn btn-success', 'title' => 'กลับหน้ารายงาน']) ?>
                        <?= Html::a('ติดต่อผู้ดูแลระบบ <i class="fa fa-arrow-circle-right fa-1x fa-fw"></i>', ['/site/about'], ['class' => 'btn btn-warning', 'title' => 'ติดต่อผู้ดูแลระบบ']) ?>
                </p> 
        </div> 
</div> 
      

<?= \bluezed\scrollTop\ScrollTop::widget() ?>