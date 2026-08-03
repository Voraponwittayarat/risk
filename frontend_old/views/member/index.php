<?php
use yii\helpers\Html;
//use yii\grid\GridView;
use kartik\grid\GridView;
use yii\widgets\Pjax;
use yii\db\Query;

use yii\bootstrap\Modal;
use yii\helpers\Url;

use frontend\models\Department;
use frontend\models\Position;
use frontend\models\Team;


$this->title = 'ข้อมูลบุคลากร';
$this->params['breadcrumbs'][] = $this->title;
?>
<div class="member-index">
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
            'filterModel' => $searchModel,
            'headerRowOptions' => ['style' => 'background-color:#cccccc'],
            'panel'=>[
                'type'=>GridView::TYPE_DEFAULT,
                'before'=>Html::button('<i class="glyphicon glyphicon-plus"></i> เพิ่มข้อมูล',  ['value' => Url::to(['member/create']), 'title' => 'เพิ่มข้อมูลบุคลากร', 'class' => 'showModalButton btn btn-success']),
                'heading'=>'<span class="glyphicon glyphicon-ok-sign"></span> = ยังปฏิบัติงานอยู่ | <span class="glyphicon glyphicon-remove-sign"></span> = ไม่ได้ปฏิบัติงานแล้ว',
                //'after' => 'วันที่ประมวลผล '.date('Y-m-d H:i:s').' น.',
                //'footer'=>true
            ],
            'responsive' => true,
            'hover'=>true,
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
                    'maxButtonCount'=>20,    // Set maximum number of page buttons that can be displayed
            ],
            'exportConfig' => [
                   GridView::CSV => ['label' => 'Export as CSV', 'filename' => 'member_'.date('Y-d-m')],
                   GridView::PDF => ['label' => 'Export as PDF', 'filename' => 'member_'.date('Y-d-m')],
                   GridView::EXCEL=> ['label' => 'Export as EXCEL', 'filename' => 'member_'.date('Y-d-m')],
                   GridView::TEXT=> ['label' => 'Export as TEXT', 'filename' => 'member_'.date('Y-d-m')],
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
            'options'=>['style'=>'width:110px;'],
            'format'=>'raw',
            'hAlign' => 'center',
            'vAlign' => 'middle',
            'attribute'=>'img',
            'value'=>function($model){
              return Html::tag('div','',[
                'style'=>'width:100px;height:105px;
                          border-top: 10px solid rgba(255, 255, 255, .46);
                          background-image:url('.$model->photoViewer.');
                          background-size: cover;
                          background-position:center center;
                          background-repeat:no-repeat;
                          ']);
            }
            ],
            [
                'label' => 'เลข 13 หลัก',
                'attribute' => 'cid',
                'hAlign' => 'center',
                'vAlign' => 'middle',
            ],
            [
                //'label' => 'ชือ-นามสกุล',
                'attribute' => 'member_name',
                //'hAlign' => 'center',
                'vAlign' => 'middle',
            ],
            [
                'attribute' => 'department_id1',
                'value' => 'depart1.depart_name',
                'label' => 'หน่วยงานหลัก',
                'width' => '150px',
                'filterType' => GridView::FILTER_SELECT2,
                'filter' => Department::GetListName(),
                'filterWidgetOptions' => [
                    'pluginOptions' => ['allowClear' => true],
                    ],
                'filterInputOptions' => ['placeholder' => 'กรุณาเลือก'],
                //'hAlign' => 'center',
                'vAlign' => 'middle',
                //'group' => true,
            ],
            [
                'attribute' => 'department_id2',
                'value' => 'depart2.depart_name',
                'label' => 'หน่วยงานรอง',
                'width' => '150px',
                'filterType' => GridView::FILTER_SELECT2,
                'filter' => Department::GetListName(),
                'filterWidgetOptions' => [
                    'pluginOptions' => ['allowClear' => true],
                    ],
                'filterInputOptions' => ['placeholder' => 'กรุณาเลือก'],
                //'hAlign' => 'center',
                'vAlign' => 'middle',
                //'group' => true,
            ],

            [
                'attribute' => 'position_id',
                'value' => 'position.position_name',
                'label' => 'ตำแหน่ง',
                'width' => '150px',
                'filterType' => GridView::FILTER_SELECT2,
                'filter' => Position::GetListName(),
                'filterWidgetOptions' => [
                    'pluginOptions' => ['allowClear' => true],
                    ],
                'filterInputOptions' => ['placeholder' => 'กรุณาเลือก'],
                //'hAlign' => 'center',
                'vAlign' => 'middle',
                //  'group' => true,
            ],
                    
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
                //'hAlign' => 'center',
                'vAlign' => 'middle',
                //'group' => true,
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
                        return '<span class="glyphicon glyphicon-ok-sign"></span>';
                    } else {
                        return '<span class="glyphicon glyphicon-remove-sign"></span>';
                    }
                },
            ],

            //['class' => 'yii\grid\ActionColumn'],
            [
                'class' => 'kartik\grid\ActionColumn',
                'header' => 'Action', 
                'visible'=> Yii::$app->user->isGuest ? false : true,
                'buttons'=>[
                    'view'=>function ($url, $model) {
                        $t = 'index.php?r=member/view&id='.$model->id;
                        return Html::button('<span class="glyphicon glyphicon-eye-open"></span>', ['value'=>Url::to($t), 'title' => 'ดูข้อมูลบุคลากร', 'class' => 'showModalButton btn btn-success btn-xs']);
                    },
                    'update'=>function ($url, $model) {
                        $t = 'index.php?r=member/update&id='.$model->id;
                        return Html::button('<span class="glyphicon glyphicon-pencil"></span>', ['value'=>Url::to($t), 'title' => 'แก้ไขข้อมูลบุคลากร','data-pjax' => 0,'data-pjax' => 0,'class' => 'showModalButton btn btn-warning btn-xs']);
                    },
                    'delete'=>function ($url, $model) {
                            $t = 'index.php?r=member/delete&id='.$model->id;
                            return Html::button('<span class="glyphicon glyphicon-trash"></span>', ['value'=>Url::to($t), 'title' => 'ลบข้อมูลบุคลากร','data-pjax' => 0,'data-pjax' => 0,'class' => 'showModalButton btn btn-danger btn-xs']);
                    }
                ],
            ],
        ],
    ]); ?>
<?php Pjax::end(); ?>
</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>