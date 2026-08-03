<?php

use kartik\grid\GridView;
use yii\helpers\Html;
use yii\helpers\Url;
use kartik\date\DatePicker;
use yii\bootstrap\ActiveForm;

$this->title = 'ค้นหาชื่อความเสี่ยง';
$this->params['breadcrumbs'][] = ['label' => 'ความเสี่ยง', 'url' => ['risk/index']];
$this->params['breadcrumbs'][] = $this->title;
?>

<div class='box-tools'>
    
       <?php $form = ActiveForm::begin([
                   'layout' => 'horizontal',
                   'action' => ['searchrisk'],
                   'method' => 'get',
       ]);
       ?>
       <div class="input-group">
           <input type="text" name="search" id="search"  class="form-control" placeholder="ระบุชื่อความเสี่ยง..">
           <span class="input-group-btn">
               <button class="btn btn-info btn-flat" type="submit">ค้นหา<i class="fa fa-fw fa-search"></i></button>
           </span>
       </div>

   <?php ActiveForm::end(); ?>

</div>
<br>
<div class="panel panel-default">
    <div class="box-body no-padding">
      <?=GridView::widget([
            'dataProvider' => $dataProvider,
           //'filterModel' => $searchModel,
            'headerRowOptions' => ['style' => 'background-color:#cccccc'],
            'panel'=>[],
            'responsiveWrap' => false,
            //'responsive' => true,
            //'hover'=>true,
            'floatHeader' => true,  // header เลื่อนตาม
            'pager' => [
                    'options'=>['class'=>'pagination'],   // set clas name used in ui list of pagination
                    'prevPageLabel' => 'ก่อนหน้า',   // Set the label for the "previous" page button
                    'nextPageLabel' => 'ถัดไป',   // Set the label for the "next" page button
                    'firstPageLabel'=>'เริ่มต้น',   // Set the label for the "first" page button
                    'lastPageLabel'=>'สุดท้าย',    // Set the label for the "last" page button
                    'nextPageCssClass'=>'ถัดไป',    // Set CSS class for the "next" page button
                    'prevPageCssClass'=>'ก่อนหน้า',    // Set CSS class for the "previous" page button
                    'firstPageCssClass'=>'เริ่มต้น',    // Set CSS class for the "first" page button
                    'lastPageCssClass'=>'สุดท้าย',    // Set CSS class for the "last" page button
                    'maxButtonCount'=>10,    // Set maximum number of page buttons that can be displayed
            ], 
 
        // set your toolbar

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
                    'label' => 'Riskstore ID',
                    'attribute' => 'riskstore_id',
                    'hAlign'=>'center',
                    'contentOptions' => ['class' => 'text-left'],
                    'headerOptions' => ['class' => 'text-center'],
                ],
                [
                    'label' => 'ชื่อความเสี่ยง',
                    'attribute' => 'riskstore_name',
                    'contentOptions' => ['class' => 'text-left'],
                    'headerOptions' => ['class' => 'text-center'],
                ],
                [
                    'label' => 'โปรแกรมความเสี่ยง',
                    'attribute' => 'program_name',
                    'contentOptions' => ['class' => 'text-left'],
                    'headerOptions' => ['class' => 'text-center'],
                ],
                [
                    'label' => 'ทีมนำ',
                    'attribute' => 'te',
                    'contentOptions' => ['class' => 'text-center'],
                    'headerOptions' => ['class' => 'text-center'],
                ],
                [
                    'label' => 'ผู้รับผิดชอบ',
                    'attribute' => 'riskmem',
                    'contentOptions' => ['class' => 'text-left'],
                    'headerOptions' => ['class' => 'text-center'],
                ],
                [
                    'class' => 'kartik\grid\DataColumn',
                    'attribute'=>'',
                    'hAlign' => 'center',
                    'format' => 'raw',
                    'header' => 'สถานะ',
                    'value'=>function($model,$url){
                        if($model['status'] == 1)
                        {
                            return '<span class="label label-success">ใช้งาน</span>';
                        }
                        else
                        {
                           return '<span class="label label-danger">ยกเลิก</span>';
                        }
                    },
                ],
            ]
        ]);
        ?>
    </div> 
</div>


<?= \bluezed\scrollTop\ScrollTop::widget() ?>