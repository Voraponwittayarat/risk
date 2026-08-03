<?php

use miloschuman\highcharts\Highcharts;
use yii\web\JsExpression;
use kartik\grid\GridView;
use yii\helpers\Html;
use yii\bootstrap\ActiveForm;
use kartik\date\DatePicker;
use yii\helpers\ArrayHelper;

use frontend\models\Department;


/* @var $this yii\web\View */
$this->title = 'REP1_13 : รายชื่อเจ้าหน้าที่ที่รายงานอุบัติการณ์ความเสี่ยง';
$this->params['breadcrumbs'][] = ['label' => 'รายงาน', 'url' => ['/risk/report']];
//$this->params['breadcrumbs'][] = $this->title;

?>

<div class='bg-success'>
    <?php $form = ActiveForm::begin(['layout' => 'inline']); ?>
    <div class="form-group">
        <label class="control-label"> เลือกวันที่ </label>
        <?php
        echo DatePicker::widget([
            'name' => 'date1',
            'value' => $date1,
            'language' => 'th',
            'pluginOptions' => [
                'format' => 'yyyy-mm-dd',
                'changeMonth' => true,
                'changeYear' => true,
                'todayHighlight' => true
            ]
        ]);
        ?>

    </div>
    <div class="form-group">
        <label class="control-label"> ถึง </label>
        <?php
        echo DatePicker::widget([
            'name' => 'date2',
            'value' => $date2,
            'language' => 'th',
            'pluginOptions' => [
                'format' => 'yyyy-mm-dd',
                'changeMonth' => true,
                'changeYear' => true,
                'todayHighlight' => true
            ]
        ]);
        ?>
    </div>
    <!--
    <div class="form-group">
        <label class="control-label"> หน่วยงาน </label>
        <?php /*
            $category = Department::find()->all();
            $listData = ArrayHelper::map($category,'id','depart_name');
            echo Html::dropDownList('dep', $dep, $listData, ['class' => 'form-control','prompt'=>'-- Select --']);*/
        ?>
    </div> -->
    <div class="form-group">
        <?= Html::submitButton('ประมวลผล', ['class' => 'btn btn-warning btn-flat']) ?>
    </div><!-- /.input group -->
    <?php ActiveForm::end(); ?>
</div>
<br>
<div class="panel panel-default">
    <div class="panel-heading"> <h3 class="panel-title"><i class="fa fa-bar-chart" aria-hidden="true"></i> <?= $this->title; ?>  ข้อมูลวันที่ <?=$date1 ?> ถึง <?=$date2 ?>  <font color="#ff0066"><?php //$depname ?></font> </h3> </div>
    <div class="panel-body">
 
        <?=GridView::widget([
            'dataProvider' => $dataProvider,
            'showPageSummary'=>true,
            'headerRowOptions' => ['style' => 'background-color:#cccccc'],
           /* 'beforeHeader'=>[
                [
                    'columns'=>[
                        ['content'=>'', 'options'=>['colspan'=>2, 'class'=>'text-center default']], 
                        ['content'=>'ความเสียงทางคลินิก', 'options'=>['colspan'=>9, 'class'=>'text-center warning']], 
                        ['content'=>'ความเสี่ยงทั่วไป', 'options'=>['colspan'=>5, 'class'=>'text-center info']],
                        ['content'=>'', 'options'=>['colspan'=>1, 'class'=>'text-center danger']],
                    ],
                    'options'=>['class'=>'skip-export'] // remove this row from export
                ]
            ],*/
            'panel' => [
                'type' => GridView::TYPE_DEFAULT,
                'heading'=>'',
                'after' => '<i class="fa fa-clock-o" aria-hidden="true"></i> วันที่ประมวลผล '.date('Y-m-d H:i:s').' น.',
                'footer'=>false
            ],
            'responsive' => true,
            'hover' => true,
            'exportConfig' => [
                   GridView::EXCEL=> ['label' => 'Export as EXCEL', 'filename' => 'Rep1_13_'.date('Y-m-d')],
                ],
        // set your toolbar
            'toolbar' =>  [
                ['content' => 
                    Html::a('<i class="glyphicon glyphicon-repeat"></i>', ['rep13'], ['data-pjax' => 0, 'class' => 'btn btn-default', 'title' => Yii::t('app', 'รีเซ็ต')])
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
                    'attribute' => 'mname',
                    'header' => 'ชื่อ-สกุล',
                    'headerOptions' => ['class' => 'text-center'],
                    'contentOptions' => ['class'=>'text default'],
                    'pageSummary'=>'รวมทั้งหมด',
                    //'width' => '30%',
                ],

                [
                    'attribute'=>'cr',
                    'header' => 'จำนวนอุบัติการณ์ความเสี่ยง',
                    'hAlign'=>'center',
                    'format'=>['decimal', 0],
                   // 'contentOptions' => ['class'=>'text warning'],
                    'pageSummary'=>true
                ],
               
               
            ]
        ]);
        ?>
     </div>
</div>
<div class="row">
    <div class="col-lg-12">
        <div class="alert alert-danger" role="alert">
            <strong>หมายเหตุ !</strong>  ความเสี่ยงต้องผ่านการลงทะเบียนก่อนจึงจะมีข้อมูลขึ้นในรายงานนี้
        </div>
    </div>
</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>