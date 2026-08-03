<?php

use yii\helpers\Html;
//use yii\grid\GridView;
use kartik\grid\GridView;
use yii\widgets\Pjax;
use yii\db\Query;

use yii\bootstrap\Modal;
use yii\helpers\Url;

use frontend\models\Program;
use frontend\models\Level;
use frontend\models\Team;

/* @var $this yii\web\View */
/* @var $searchModel frontend\models\RiskstoreSearch */
/* @var $dataProvider yii\data\ActiveDataProvider */

$this->title = 'ข้อมูลคลังความเสี่ยง';
$this->params['breadcrumbs'][] = $this->title;
?>
<div class="riskstore-index">

    <?php
    Modal::begin([
        'header' => '<span id="modalHeaderTitle"></span>',
        'footer' => '<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>',
        'headerOptions' => ['id' => 'modalHeader'],
        'id' => 'modal',
        'size' => 'modal-lg',
        'options'=>[
                'tabindex' => false
        ],
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
            'filterModel' => $searchModel,
            'headerRowOptions' => ['style' => 'background-color:#cccccc'],
            'panel'=>[
                  'type'=>GridView::TYPE_DEFAULT,
                  'before'=>Html::button('<i class="glyphicon glyphicon-plus"></i> เพิ่มข้อมูล',  ['value' => Url::to(['riskstore/create']), 'title' => 'เพิ่มข้อมูลความเสี่ยง', 'class' => 'showModalButton btn btn-success']),
                //'heading'=>'สถานที่เกิดความเสี่ยง',
                //'after' => 'วันที่ประมวลผล '.date('Y-m-d H:i:s').' น.',
                //'footer'=>true
            ],
            'responsive' => true,
            'hover'=>true,
            'floatHeader' => true,  // header เลื่อนตาม
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
                   GridView::CSV => ['label' => 'Export as CSV', 'filename' => 'riskstore_'.date('Y-d-m')],
                   GridView::PDF => ['label' => 'Export as PDF', 'filename' => 'riskstore_'.date('Y-d-m')],
                   GridView::EXCEL=> ['label' => 'Export as EXCEL', 'filename' => 'riskstore_'.date('Y-d-m')],
                   GridView::TEXT=> ['label' => 'Export as TEXT', 'filename' => 'riskstore_'.date('Y-d-m')],
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
                
                [
                    'attribute' => 'riskstore_name',
                    'format' => 'raw',
                    'contentOptions' => [
                        'style'=>'max-width:1000px; overflow: auto; white-space: normal; word-wrap: break-word;'
                    ],
                ],
                //'typename',
                //'programname',
                
                [
                    'attribute' => 'program_id',
                    'value' => 'program.program_name',
                    'label' => 'โปรแกรมเชื่อมโยง',
                    'width' => '150px',
                    'filterType' => GridView::FILTER_SELECT2,
                    'filter' => Program::GetListName(),
                    'filterWidgetOptions' => [
                        'pluginOptions' => ['allowClear' => true],
                        ],
                    'filterInputOptions' => ['placeholder' => 'กรุณาเลือก'],
                        //  'group' => true,
                ],
                //'groupname',
                //'levelcode',
                [
                    'attribute' => 'level_id',
                    'value' => 'level.level_code',
                    'label' => 'ระดับ',
                    'width' => '150px',
                    'filterType' => GridView::FILTER_SELECT2,
                    'filter' => Level::GetListName(),
                    'filterWidgetOptions' => [
                        'pluginOptions' => ['allowClear' => true],
                        ],
                    'filterInputOptions' => ['placeholder' => 'กรุณาเลือก'],
                        //  'group' => true,
                ],
                //'teamname',
                [
                    'attribute' => 'team_id',
                    'value' => 'team.team_name',
                    'label' => 'ทีมนำ',
                    'width' => '150px',
                    'filterType' => GridView::FILTER_SELECT2,
                    'filter' => Team::GetListName(),
                    'filterWidgetOptions' => [
                        'pluginOptions' => ['allowClear' => true],
                        ],
                    'filterInputOptions' => ['placeholder' => 'กรุณาเลือก'],
                        //  'group' => true,
                ],
               // 'create_date',
                [
                    'attribute'=>'create_date',
                    'value' => function ($model, $index, $widget) {
                        return Yii::$app->formatter->asDate($model->create_date);
                    },
                    'filterType' => GridView::FILTER_DATE,
                    'filterWidgetOptions' => [
                        'pluginOptions' => [
                            'format' => 'yyyy-mm-dd',
                            'autoclose' => true,
                            'todayHighlight' => true,
                        ]
                    ],
                    'width' => '200px',
                    'hAlign' => 'center',
                ],
                [
                'label' => 'สถานะ',
                'attribute' => 'status',
                'format' => 'raw',
                'filter' => false,
                'hAlign' => 'center',
                'vAlign' => 'middle',
                #'format' => ['decimal', 2],
                'value' => function($data) {
                        if ($data['status'] > '0') {
                            return '<i class="glyphicon glyphicon-ok"></i>';
                        } else {
                            return '<i class="glyphicon glyphicon-remove"></i>';
                        }
                    },
                ],
                //'modify_date',
                //'created_by',
                //'updated_by',

                //['class' => 'yii\grid\ActionColumn'],
                [
                'class' => 'kartik\grid\ActionColumn',
                'header' => 'Action', 
                    'header' => 'Action', 
                    'visible'=> Yii::$app->user->isGuest ? false : true,
                    'buttons'=>[
                        'view'=>function ($url, $model) {
                            $t = 'index.php?r=riskstore/view&id='.$model->riskstore_id;
                            return Html::button('<span class="glyphicon glyphicon-eye-open"></span>', ['value'=>Url::to($t), 'title' => 'ดูข้อมูลคลังความเสี่ยง', 'class' => 'showModalButton btn btn-success btn-xs']);
                        },
                        'update'=>function ($url, $model) {
                            $t = 'index.php?r=riskstore/update&id='.$model->riskstore_id;
                            return Html::button('<span class="glyphicon glyphicon-pencil"></span>', ['value'=>Url::to($t), 'title' => 'แก้ไขข้อมูลคลังความเสี่ยง','data-pjax' => 0,'data-pjax' => 0,'class' => 'showModalButton btn btn-warning btn-xs']);
                        },
                        'delete'=>function ($url, $model) {
                            $t = 'index.php?r=riskstore/delete&id='.$model->riskstore_id;
                            return Html::button('<span class="glyphicon glyphicon-trash"></span>', ['value'=>Url::to($t), 'title' => 'ลบข้อมูลคลังความเสี่ยง','data-pjax' => 0,'data-pjax' => 0,'class' => 'showModalButton btn btn-danger btn-xs']);
                        }
                    ],
                ],
        ],
    ]); ?>
<?php Pjax::end(); ?>
</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>