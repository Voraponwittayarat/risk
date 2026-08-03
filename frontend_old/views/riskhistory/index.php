<?php

/* @var $this yii\web\View */
use yii\helpers\Url;
use yii\widgets\Breadcrumbs;
use yii\bootstrap\Html;
use kartik\grid\GridView;
use yii\jui\Tabs;
use kartik\tabs\TabsX;
use yii\bootstrap\ActiveForm;

$this->title = 'ค้นหาประวัติความเสี่ยง Riskhistory Search';
?>
<div class="site-index">

<div class='box-tools'>
 <!-- ค้นหา RiskID -->   
       <?php $form = ActiveForm::begin([
                   'layout' => 'horizontal',
                   //'action' => ['index'],
                   //'method' => 'get',
       ]);
       ?>
       <div class="input-group">
           <input type="text" name="rstid"  class="form-control" placeholder="ระบุเลข Riskstore ID..">
           <span class="input-group-btn">
               <button class="btn btn-info btn-flat" >ค้นหา<i class="fa fa-fw fa-search"></i></button>
           </span>
       </div>

   <?php ActiveForm::end(); ?>

</div>
<br>

<!-- ข้อมูลคลังความเสี่ยง ตาราง Riskstore -->
    <?php if ($rstid <> '') { ?>
        <div class="row">
        <div class="col-md-12">
            <div class="panel panel-info">
                <div class="panel-heading"><i class="fa fa-filter" aria-hidden="true"></i> ข้อมูลความเสี่ยง  Riskstore ID : <?= $rstid ?> (<font color="#ff0066">จากคลังความเสี่ยง</font>)</div>
                <div class="panel-body">
                    <dl class="dl-horizontal">
                        <dt>ชื่อความเสี่ยง : </dt>
                            <dd><?=$riskstore ?></dd>
                        <dt>ที่มาของความเสี่ยง : </dt>
                            <dd><?=$inform ?></dd>
                        <dt>ประเภทความเสี่ยง : </dt>
                            <dd><?= $group ?></dd>
                        <dt>โปรแกรมความเสี่ยง : </dt>
                            <dd><?= $program ?></dd>
                        <dt>ระดับความรุนแรง : </dt>
                            <dd><?= $level ?></dd>
                        <dt>กลุ่มความเสี่ยง : </dt>
                            <dd><?= $group ?></dd>
                        <dt>ทีมนำ : </dt>
                            <dd><?= $team ?></dd>
                        <dt>ผู้รับผิดชอบความเสี่ยง : </dt>
                            <dd><?= $member ?></dd>
                        <dt>สถานะ : </dt>
                            <dd><?= $status ?></dd>
                    </dl>
                </div>
            </div>
        </div>
    </div>

<!-- ข้อมูลอุบัติการณ์ตวามเสี่ยงแต่ละ ID-->
<div class="row">
        <div class="col-md-3">
            <div class="panel panel-info">
                <div class="panel-heading"><span class="glyphicon glyphicon-time"></span> วันที่รายงานอุบัติการความเสี่ยง</div>
                <div class="panel-body">
                    <?php
                        $gridColumns = [
                            ['class' => 'kartik\grid\SerialColumn'],
                            [
                                'attribute' => 'dt',
                                'label' => 'วันรายงาน',
                                'value' => function ($model, $key, $index, $widget) {
                                    if ($model['dt'] === 'N') {
                                        return "<font  color='000000'>" . $model['dt'] . "</font>";
                                    } else {
                                        return "<font  color='ff0066'>" . $model['dt'] . "</font>";
                                
                                    }
                                },
                                'filterType' => GridView::FILTER_COLOR,
                                //'vAlign' => 'middle',
                                'hAlign' => 'center',
                                'format' => 'raw',
                               // 'width' => '150px',
                                'noWrap' => true
                            ],
                            [
                                'attribute' => 'id_risk',
                                'label' => 'ไอดี',
                                'value' => function($model, $key) {
                                    return Html::a($model['id_risk'], [
                                                '',
                                                'rstid' => $model['riskstore_id'],
                                                'rid' => $model['id_risk'],
                                    ]);
                                },
                                'filterType' => GridView::FILTER_COLOR,
                                'hAlign' => 'center',
                                'format' => 'raw',
                            ]
                      
                    ];
                            
                    echo GridView::widget([
                        'dataProvider' => $dataProvider,
                        //'filterModel' => $searchModel,
                        'autoXlFormat' => true,
                        'export' => [
                            'fontAwesome' => true,
                            'showConfirmAlert' => false,
                            'target' => GridView::TARGET_BLANK
                        ],
                        'columns' => $gridColumns,
                        'resizableColumns' => true,
                        'resizeStorageKey' => Yii::$app->user->id . '-' . date("m"),
                            //'floatHeader' => true,
                            //'floatHeaderOptions' => ['scrollingTop' => '100'],
                            /* 'pjax' => true,
                              'pjaxSettings' => [
                              'neverTimeout' => true,
                              //'beforeGrid' => 'My fancy content before.',
                              //'afterGrid' => 'My fancy content after.',
                              ] */
                    ]);
                    ?>
                </div>
            </div>
        </div>
        
    <?php } ?>   
        
    <?php if ($rstid<> '') { ?>    
        <div class="col-md-9">
            <div class="panel panel-info">
                <div class="panel-heading"><span class="glyphicon glyphicon-menu-hamburger"></span> รายละเอียดอุบัติการความเสี่ยงแต่ละครั้งของการรายงาน</div>
                <div class="panel-body">
                <?php
                    echo TabsX::widget([
                        'position' => TabsX::POS_ABOVE,
                        'align' => TabsX::ALIGN_LEFT,
                        'items' => [
                            [
                                'label' => 'อุบัติการความเสี่ยง',
                                'content' => $this->render('riskhis', [
                                    'id' =>  $id,
                                    'id_risk' => $id_risk,
                                    'date_report' => $date_report,
                                    'time_report' => $time_report,
                                    'use_rep' => $use_rep,
                                    'depart_name' => $depart_name,
                                    'program_name' => $program_name,
                                    'riskstore_name' => $riskstore_name,
                                    'level_name' => $level_name,
                                    'duration_name' => $duration_name,
                                    'locat_name' => $locat_name,
                                    'ir_type' => $ir_type,
                                    'ir' => $ir,
                                    'detail' => $detail,
                                    'url' => $url,
                                    'affected' => $affected,
                                    'edit' => $edit,
                                    'problem_basic' => $problem_basic,
                                    'status_risk' => $status_risk,
                                    
                                ]),
                                'active' => true
                            ],
      
     
      


                        ],
                    ]);
                    ?>
 
                </div>
            </div>
        </div>
    </div>
  
  <?php } ?>   
</div>

<?= \bluezed\scrollTop\ScrollTop::widget() ?>