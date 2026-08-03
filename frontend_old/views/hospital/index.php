<?php
use yii\helpers\Html;
//use yii\grid\GridView;
use kartik\grid\GridView;
use yii\widgets\Pjax;
use frontend\models\Hospital;
use yii\db\Query;

use yii\bootstrap\Modal;
use yii\helpers\Url;
/* @var $this yii\web\View */
/* @var $dataProvider yii\data\ActiveDataProvider */

$this->title = 'ข้อมูลโรงพยาบาล';
$this->params['breadcrumbs'][] = $this->title;
?>
<div class="hospital-index">

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

      <?php Pjax::begin(); ?>   
      <?=GridView::widget([
            'dataProvider' => $dataProvider,
            'headerRowOptions' => ['style' => 'background-color:#cccccc'],
            'panel' => [
                'type' => GridView::TYPE_DEFAULT,
                'before'=>Html::button('<i class="glyphicon glyphicon-plus"></i> เพิ่มข้อมูล',  ['value' => Url::to(['hospital/create']), 'title' => 'เพิ่มข้อมูลโรงพยาบาล', 'class' => 'showModalButton btn btn-success']),
                //'after' => 'วันที่ประมวลผล '.date('Y-m-d H:i:s').' น.',
                //'footer'=>false
            ],
            'responsive' => true,
            'hover' => true,
          
            'exportConfig' => [
                   GridView::CSV => ['label' => 'Export as CSV', 'filename' => 'hospital_'.date('Y-d-m')],
                   GridView::PDF => ['label' => 'Export as PDF', 'filename' => 'hospital_'.date('Y-d-m')],
                   GridView::EXCEL=> ['label' => 'Export as EXCEL', 'filename' => 'hospital_'.date('Y-d-m')],
                   GridView::TEXT=> ['label' => 'Export as TEXT', 'filename' => 'hospital_'.date('Y-d-m')],
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
            'hoscode',
            'hosname',
            'address',
            'tel',
            'create_date',
            'loginname',
           // ['class' => 'yii\grid\ActionColumn'],
            [
                'class' => 'kartik\grid\ActionColumn',
                'header' => 'Action', 
                'visible'=> Yii::$app->user->isGuest ? false : true,
                'buttons'=>[
                    'view'=>function ($url, $model) {
                        $t = 'index.php?r=hospital/view&id='.$model->id;
                        return Html::button('<span class="glyphicon glyphicon-eye-open"></span>', ['value'=>Url::to($t), 'title' => 'ดูข้อมูลโรงพยาบาล', 'class' => 'showModalButton btn btn-success btn-xs']);
                    },
                    'update'=>function ($url, $model) {
                        $t = 'index.php?r=hospital/update&id='.$model->id;
                        return Html::button('<span class="glyphicon glyphicon-pencil"></span>', ['value'=>Url::to($t), 'title' => 'แก้ไขข้อมูลโรงพยาบาล','data-pjax' => 0,'data-pjax' => 0,'class' => 'showModalButton btn btn-warning btn-xs']);
                    },
                    'delete'=>function ($url, $model) {
                        $t = 'index.php?r=hospital/delete&id='.$model->id;
                        return Html::button('<span class="glyphicon glyphicon-trash"></span>', ['value'=>Url::to($t), 'title' => 'ลบข้อมูลโรงพยาบาล','data-pjax' => 0,'data-pjax' => 0,'class' => 'showModalButton btn btn-danger btn-xs']);
                    }
                ],
            ],
    ],
    ]); ?>
<?php Pjax::end(); ?>
</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>