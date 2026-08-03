<?php

use yii\web\JsExpression;
use kartik\grid\GridView;
use yii\helpers\Html;
use yii\bootstrap\ActiveForm;
use yii\helpers\ArrayHelper;


/* @var $this yii\web\View */
$this->title = 'REP2_02 : จำนวนอุบัติการณ์ความเสี่ยง แยกตามชื่อความเสี่ยง';
$this->params['breadcrumbs'][] = ['label' => 'Go Back REP2_02 : จำนวนอุบัติการณ์ความเสี่ยง แยกตามชื่อความเสี่ยง', 'url' => ['/report2/rep02','date1'=>$date1,'date2'=>$date2,'dep'=>$dep]];
//$this->params['breadcrumbs'][] = $this->title;

?>

<div class="panel panel-default">
    <div class="panel-heading"> <h3 class="panel-title"><i class="fa fa-bar-chart" aria-hidden="true"></i> ชื่ออุบัติการณ์ความเสี่ยง<font color="#ff0066"> <?= $r_name; ?></font>  หน่วยงาน <font color="#ff0066"><?= $depname ?></font> ถูกรายงาน  ข้อมูลวันที่ <?=$date1 ?> ถึง <?=$date2 ?></h3> </div>
    <div class="panel-body">
 
        <?=GridView::widget([
            'dataProvider' => $dataProvider,
            'showPageSummary'=>true,
            'headerRowOptions' => ['style' => 'background-color:#cccccc'],
            'panel' => [
                'type' => GridView::TYPE_DEFAULT,
                'heading'=>'',
                'after' => '<i class="fa fa-clock-o" aria-hidden="true"></i> วันที่ประมวลผล '.date('Y-m-d H:i:s').' น.',
                'footer'=>false
            ],
            'responsive' => true,
            'hover' => true,
            'exportConfig' => [
                   GridView::EXCEL=> ['label' => 'Export as EXCEL', 'filename' => 'rep2_02detail_'.date('Y-m-d H:i:s')],
                ],
        // set your toolbar
            'toolbar' =>  [
                ['content' => 
                    Html::a('<i class="glyphicon glyphicon-repeat"></i>', ['/report2/rep02detail','date1'=>$date1,'date2'=>$date2,'dep'=>$dep,'id'=>$id], ['data-pjax' => 0, 'class' => 'btn btn-default', 'title' => Yii::t('app', 'รีเซ็ต')])
                ],
                '{toggleData}',
                '{export}',
            ],
        // set export properties
            'export' => [
                'fontAwesome' => true
            ],
            'pjax' => true,
            'pjaxSettings' => [
                'neverTimeout' => true,
                'beforeGrid' => '',
                'afterGrid' => '',
            ],
            'columns' => [
                [
                    'class' => 'kartik\grid\SerialColumn'
                ],
                [
                    'attribute' => 'id_risk',
                    'format'=>'text', 
                    'header' => 'RiskID',
                    'vAlign' => 'middle',
                    'hAlign' => 'center',
                ],
                [
                    'attribute' => 'rep_datetime',
                    'format'=>'text', 
                    'header' => 'วันที่รายงาน',
                    'vAlign' => 'middle',
                    'hAlign' => 'center',
                ],
                [
                    'attribute' => 'level_id',
                    'format'=>'text', 
                    'header' => 'ระดับ',
                    'vAlign' => 'middle',
                    'hAlign' => 'center',
                ],
                [
                    'attribute' => 'detail',
                    'header' => 'รายละเอียด',
                    'format' => 'raw',
                    'contentOptions' => [
                        'style'=>'max-width:1000px; overflow: auto; white-space: normal; word-wrap: break-word;'
                    ],
                    'vAlign' => 'middle',
                    'headerOptions' => ['class' => 'text-center'],
                    'width' => '40%',  
                ], 
                [
                    'attribute' => 'edit',
                    'format'=>'text', 
                    'header' => 'แก้',
                    'vAlign' => 'middle',
                    'hAlign' => 'center',
                ],
                [
                    'attribute' => 'problem_basic',
                    'header' => 'การแก้ปัญหา',
                    'format' => 'raw',
                    'contentOptions' => [
                        'style'=>'max-width:1000px; overflow: auto; white-space: normal; word-wrap: break-word;'
                    ],
                    'vAlign' => 'middle',
                    'headerOptions' => ['class' => 'text-center'],
                    'width' => '30%',  
                ],
                [
                    'attribute' => 'member_name',
                    'format'=>'text', 
                    'header' => 'ผู้รายงาน',
                    'vAlign' => 'middle',
                    'headerOptions' => ['class' => 'text-center'],
                ],
            ]
        ]);
        ?>
     </div>
</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>

