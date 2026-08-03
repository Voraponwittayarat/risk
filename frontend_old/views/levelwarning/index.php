<?php

use yii\helpers\Html;
//use yii\grid\GridView;
use kartik\grid\GridView;
use yii\widgets\Pjax;
use frontend\models\Department;
use yii\db\Query;

use yii\bootstrap\Modal;
use yii\helpers\Url;

/* @var $this yii\web\View */
/* @var $searchModel frontend\models\LevelwarningSearch */
/* @var $dataProvider yii\data\ActiveDataProvider */

$this->title = 'ข้อมูลการทบทวน';
$this->params['breadcrumbs'][] = $this->title;
?>
<div class="levelwarning-index">

 <?php
    Modal::begin([
        'header' => '<span id="modalHeaderTitle"></span>',
        'footer' => '<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>',
        'headerOptions' => ['id' => 'modalHeader'],
        'id' => 'modal',
        'size' => 'modal-lg',
        'closeButton' => ['tag' => 'close', 'label' => '<i class="glyphicon glyphicon-remove"></i> '],
        'clientOptions' => ['backdrop' => 1, 'keyboard' => True]
    ]);
    
    echo "<div id='modalContent'></div>";
    Modal::end();
    ?>
    <?php Pjax::begin(['id' => 'grid-user-pjax','timeout'=>5000]) ?>

    <!-- เรียก view _search.php -->
    <?php echo $this->render('_search', ['model' => $searchModel]); ?>
    <br>     
    <?= GridView::widget([
            'dataProvider' => $dataProvider,
             //'filterModel' => $searchModel,
            'headerRowOptions' => ['style' => 'background-color:#cccccc'],
            'panel'=>[
                'type'=>GridView::TYPE_DEFAULT,
                'before'=>Html::button('<i class="glyphicon glyphicon-plus"></i> เพิ่มข้อมูล',  ['value' => Url::to(['levelwarning/create']), 'title' => 'เพิ่มระดับการทบทวน', 'class' => 'showModalButton btn btn-success']),
                //'heading'=>'สถานที่เกิดความเสี่ยง',
                'after' => 'หมายเหตุ : รหัสการทบทวน RV=Review เช่น RV1 หมายถึง รหัส Review หมายเลข1',
                //'footer'=>true
            ],
            'responsive' => true,
            'hover'=>true,
            'pager' => [
                    'options'=>['class'=>'pagination'],   // set clas name used in ui list of pagination
                    'prevPageLabel' => 'Previous',   // Set the label for the "previous" page button
                    'nextPageLabel' => 'Next',   // Set the label for the "next" page button
                    'firstPageLabel'=>'First',   // Set the label for the "first" page button
                    'lastPageLabel'=>'Last',    // Set the label for the "last" page button
                    'nextPageCssClass'=>'next',    // Set CSS class for the "next" page button
                    'prevPageCssClass'=>'prev',    // Set CSS class for the "previous" page button
                    'firstPageCssClass'=>'first',    // Set CSS class for the "first" page button
                    'lastPageCssClass'=>'last',    // Set CSS class for the "last" page button
                    'maxButtonCount'=>10,    // Set maximum number of page buttons that can be displayed
            ], 
            'exportConfig' => [
                   GridView::CSV => ['label' => 'Export as CSV', 'filename' => 'levelwarning_'.date('Y-d-m')],
                   GridView::PDF => ['label' => 'Export as PDF', 'filename' => 'levelwarning_'.date('Y-d-m')],
                   GridView::EXCEL=> ['label' => 'Export as EXCEL', 'filename' => 'levelwarning_'.date('Y-d-m')],
                   GridView::TEXT=> ['label' => 'Export as TEXT', 'filename' => 'levelwarning_'.date('Y-d-m')],
                ],
        // set your toolbar
            'toolbar' =>  [
                ['content' => 
                    Html::a('<i class="glyphicon glyphicon-repeat"></i>', ['index'], ['data-pjax' => 0, 'class' => 'btn btn-default', 'title' => Yii::t('app', 'รีเซ็ต')])
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
            ['class' => 'yii\grid\SerialColumn'],
            'warning_code',
            'warning_name',
            'create_date',
            //'modify_date',
            'loginname',
            //'updatename',

            //['class' => 'yii\grid\ActionColumn'],
            [
                'class' => 'kartik\grid\ActionColumn',
                'header' => 'Action', 
                'visible'=> Yii::$app->user->isGuest ? false : true,
                'buttons'=>[
                    'view'=>function ($url, $model) {
                        $t = 'index.php?r=levelwarning/view&id='.$model->id;
                        return Html::button('<span class="glyphicon glyphicon-eye-open"></span>', ['value'=>Url::to($t), 'title' => 'ดูข้อมูลระดับการทบทวน', 'class' => 'showModalButton btn btn-success btn-xs']);
                    },
                    'update'=>function ($url, $model) {
                        $t = 'index.php?r=levelwarning/update&id='.$model->id;
                        return Html::button('<span class="glyphicon glyphicon-pencil"></span>', ['value'=>Url::to($t), 'title' => 'แก้ไขข้อมูลระดับการทบทวน','data-pjax' => 0,'data-pjax' => 0,'class' => 'showModalButton btn btn-warning btn-xs']);
                    },
                    'delete'=>function ($url, $model) {
                            $t = 'index.php?r=levelwarning/delete&id='.$model->id;
                            return Html::button('<span class="glyphicon glyphicon-trash"></span>', ['value'=>Url::to($t), 'title' => 'ลบข้อมูลระดับการทบทวน','data-pjax' => 0,'data-pjax' => 0,'class' => 'showModalButton btn btn-danger btn-xs']);
                    }
                ],
            ],
        ],
    ]); ?>
<?php Pjax::end(); ?>
</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>


