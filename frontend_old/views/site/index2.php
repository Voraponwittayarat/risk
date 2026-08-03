<?php

use yii\helpers\Html;
use yii\helpers\Url;
use miloschuman\highcharts\Highcharts;
use rmrevin\yii\fontawesome\FA;

use kartik\widgets\Growl;
use yii\widgets\Pjax;
use yii\bootstrap\Modal;


/* @var $this yii\web\View */

$this->title = 'โปรแกรมบริหารความเสี่ยงสำหรับโรงพยาบาล [Hospital Risk Management System]';
?>
<div style='display: none'>
    <?=
    Highcharts::widget([
        'scripts' => [
            'highcharts-more',
            //'themes/grid',
            //'modules/exporting',
            'modules/solid-gauge',
        ]
    ]);
    ?>
</div>
<?php
//$webroot = Yii::$app->request->BaseUrl;
$this->registerJsFile('@web/js/chart-donut.js', ['depends' => [\yii\web\JqueryAsset::className()]]);
?>
<div class="site-index">
<?= Growl::widget([
    'type' => Growl::TYPE_GROWL,
    'title' => 'ยินดีต้อนรับเข้าสู่ระบบ </br> HRMS (Hospital Risk Management System ) โปรแกรมบริหารความเสี่ยงสำหรับโรงพยาบาล'.' </br>-------------------------------------------------------------'.'</br>',
    'icon' => 'glyphicon glyphicon-volume-up',
    'body' => 'พัฒนาระบบโดย <br>นายวิเชียร นุ่นศรี นักวิชาการคอมพิวเตอร์</br>โรงพยาบาลปากพะยูน จังหวัดพัทลุง',
    //'showSeparator' => true,
    'delay' => 0,
    'pluginOptions' => [
        'showProgressbar' => true,
        'placement' => [
            'from' => 'bottom',
            'align' => 'right',
        ],
    ]
]);
?>
<!-- popup start --> 
<!-- เพิ่ม funtion นี้ใน controller  SITE ,public function actionPopup(){return $this->renderAjax('popup');} -->
	
    <script src="http://code.jquery.com/jquery.js"></script>
		<?php
			Modal::begin([
			'header' => '<h3 style="text-align:center;">ขั้นตอนการทำงานโปรแกรมบริหารความเสี่ยงสำหรับโรงพยาบาล</h3>',
			'headerOptions' => ['id' => 'modalHeader'],
			'id' => 'cityModal',
			'size' => 'modal-lg',
			'clientOptions' => ['backdrop' => 'static','tabindex'=>'-1']
			]);
				echo "<div id='modalContent'></div>";
			Modal::end();
		?>
    <script type="text/javascript">
        $(window).load(function() {
            var url = '<?= Url::to(['site/popup']); ?>';
            $('#cityModal').modal('show');
            $('#modalContent').load(url);
        });
    </script>

<!-- popup end -->


<!--    <div class="jumbotron">
        <?= Html::img('images/pyh.png'); ?>
        <h5 style="text-align:center;"><?php echo 'Dashboard For Guest';  ?></h5>
    </div>-->
    <!-- ไม่ทบทวนความเสี่ยง ส่งถึงหน่วยงาน ส่งถึงทีมนำ ส่งถึงประธานกรรมการบริหาร CEO รพ.-->
<div class="row"> 
    <div class="col-md-4 col-sm-4">
        <div class="panel panel-primary">
            <div class="panel-heading text-center">จำนวนความเสี่ยง ปีงบ <?= $b_year ?> ที่ <b><font color="#ffff00">หน่วยงานไม่ทบทวน</font></b></div>
            <div class="panel-body">
                <?php
                $data1 = [];
                for ($i = 0; $i < count($nodep); $i++) {
                    $data1[] = $nodep[$i]['cc'];
                }
                $js_cc1 = implode(",", $data1);

                $this->registerJs("
                                var obj_div=$('#nodep');
                                gen_donut(obj_div,'',$js_cc1);
                             ");
                ?>
                <div id="nodep" style="width: 330px; height: 250px; float: left"></div>
            </div>
        </div>
    </div>
    <div class="col-md-4 col-sm-4">
        <div class="panel panel-primary">
            <div class="panel-heading text-center">จำนวนความเสี่ยง ปีงบ <?= $b_year ?> ที่ <b><font color="#ffff00">ทีมนำไม่ทบทวน</font></b></div>
            <div class="panel-body">

                <?php
                $data1 = [];
                for ($i = 0; $i < count($noteam); $i++) {
                    $data1[] = $noteam[$i]['cc'];
                }
                $js_cc1 = implode(",", $data1);

                $this->registerJs("
                                var obj_div=$('#noteam');
                                gen_donut(obj_div,'',$js_cc1);
                             ");
                ?>
                <div id="noteam" style="width: 330px; height: 250px; float: left"></div>
            </div>
        </div>
    </div>
    <div class="col-md-4 col-sm-4">
        <div class="panel panel-primary">
            <div class="panel-heading text-center">จำนวนความเสี่ยง ปีงบ <?= $b_year ?> ที่ <b><font color="#ffff00">CEO รพ.ไม่ทบทวน</font></b></div>
            <div class="panel-body">
                <?php
                $data1 = [];
                for ($i = 0; $i < count($noceo); $i++) {
                    $data1[] = $noceo[$i]['cc'];
                }
                $js_cc1 = implode(",", $data1);

                $this->registerJs("
                                var obj_div=$('#noceo');
                                gen_donut(obj_div,'',$js_cc1);
                             ");
                ?>
                <div id="noceo" style="width: 330px; height: 250px; float: left"></div>
            </div>
        </div>

    </div>
</div>
<!-- End row1     -->  
    <div class="panel panel-primary">
        <div class="panel-heading"><i class="fa fa-fw fa-bar-chart"></i> จำนวนการรายงานอุบัติการณ์ความเสี่ยงแยกตามระดับความเสี่ยง ปีงบประมาณ <?= $b_year ?></div>
        <div class="panel-body">
           <div id="container3"></div>
        <?php
          $categ = [];
          for ($i = 0; $i < count($cc_level); $i++) {
              $categ[] = $cc_level[$i]['level_name'];
          }
          $js_categ = implode("','", $categ);

          $data_cc = [];
          for ($i = 0; $i < count($cc_level); $i++) {
              $data_cc[] = $cc_level[$i]['cc'];
          }
          $js_cc = implode(",", $data_cc);



          $this->registerJs(" $(function () {
                $('#container3').highcharts({
                    chart: {
                        height: 200,
                        width: 1120
                     }, 
                     title: {
                         text: '',
                         x: -20 //center
                     },
                     subtitle: {
                         text: '',
                         x: -20
                     },
                     xAxis: {
                           categories: ['$js_categ'],
                     },
                     yAxis: {
                         title: {
                             text: 'จำนวน (ครั้ง)'
                         },
                         plotLines: [{
                             value: 0,
                             width: 1,
                             color: '#808080'
                         }]
                     },
                     tooltip: {
                         valueSuffix: ''
                     },
                     legend: {
                         layout: 'vertical',
                         align: 'right',
                         verticalAlign: 'middle',
                         borderWidth: 0
                     },
                     credits: {
                         enabled: false
                     },
                     series: [{
                         type: 'column',
                         name: 'จำนวนระดับความเสี่ยง',
                         data: [$js_cc],
                         marker: {
                             lineWidth: 2,
                             lineColor: Highcharts.getOptions().colors[3],
                             fillColor: 'white'
                         }
                     }],


                 });
             });
    ");
    ?>  
        </div>
    </div>
<!-- End row2     -->  
<div class="row">
    <!-- นับจำนวนผู้ใช้งาน Top10 -->
    <div class="col-sm-3">
        <div class="list-group">
            <a href="#" class="list-group-item active"><i class="fa fa-fw fa-users"></i> จำนวนผู้ใช้งาน 10 อันดับ</a>
             <?php foreach ($cc_user as $cuser) : ?>
            <a href="#" class="list-group-item"> <span class="badge"><?php echo $cuser['cc']; ?></span> <?php echo $cuser['username']; ?></a>
            <?php endforeach; ?>
            <a href="#" class="list-group-item active"><i class="fa fa-fw fa-street-view"></i>UserAll <b><font color="#ffff00"><?php echo number_format($uall,0,".",",") ?></font></b> คน <i class="fa fa-fw fa-podcast"></i>UserOnline <b><font color="#ffff00"><?php echo number_format($uonline,0,".",",") ?></font></b> คน</a>
        </div>
    </div>
    <!-- ระดับความรุนแรงแบ่งตามกลุ่ม 5 ระดับ-->
        <div class="col-sm-9">
            <div class="panel panel-primary"> 
                <div class="panel-heading"><i class="fa fa-fw fa-bar-chart"></i> จำนวนอุบัติการณ์ความเสี่ยงแยกตามสถานะ ปีงบประมาณ <?= $b_year ?></div> 
                <div class="panel-body"> 
                    <div id="container"></div>
                    <?php
                    $categ = [];
                    for ($i = 0; $i < count($risk_st); $i++) {
                        $categ[] = $risk_st[$i]['st'];
                    }
                    $js_categ = implode("','", $categ);

                    $data_cc = [];
                    for ($i = 0; $i < count($risk_st); $i++) {
                        $data_cc[] = $risk_st[$i]['c'];
                    }
                    $js_cc = implode(",", $data_cc);



                    $this->registerJs(" $(function () {
                        $('#container').highcharts({
                            chart: {
                               height:250,
                               width: 800
                            }, 
                            title: {
                                text: '',
                                x: -20 //center
                            },
                            subtitle: {
                                text: '',
                                x: -20
                            },
                            xAxis: {
                                  categories: ['$js_categ'],
                            },
                            yAxis: {
                                title: {
                                    text: 'จำนวน (ครั้ง)'
                                },
                                plotLines: [{
                                    value: 0,
                                    width: 1,
                                    color: '#808080'
                                }]
                            },
                            tooltip: {
                                valueSuffix: ''
                            },
                            legend: {
                                layout: 'vertical',
                                align: 'right',
                                verticalAlign: 'middle',
                                borderWidth: 0
                            },
                            credits: {
                                enabled: false
                            },
                            series: [{
                                type: 'column',
                                name: 'จำนวนอุบัติการณ์ความเสี่ยง',
                                data: [$js_cc]
                            }],


                                });
                            });
                         ");
                    ?>  

                </div> 
            </div>
        </div>

    </div>
 <!-- End row2   -->  
 
    <div class="panel panel-primary">
        <div class="panel-heading"><i class="fa fa-fw fa-bar-chart"></i> จำนวนการรายงานอุบัติการณ์ความเสี่ยงแยกตามหน่วยงาน ปีงบประมาณ <?= $b_year ?></div>
        <div class="panel-body">
          <div id="container2"></div>
        <?php
          $categ = [];
          for ($i = 0; $i < count($cc_dep); $i++) {
              $categ[] = $cc_dep[$i]['depart_name'];
          }
          $js_categ = implode("','", $categ);

          $data_cc = [];
          for ($i = 0; $i < count($cc_dep); $i++) {
              $data_cc[] = $cc_dep[$i]['cc'];
          }
          $js_cc = implode(",", $data_cc);



          $this->registerJs(" $(function () {
                $('#container2').highcharts({
                    chart: {
                        height: 300,
                        width: 1120
                     }, 
                     title: {
                         text: '',
                         x: -20 //center
                     },
                     subtitle: {
                         text: '',
                         x: -20
                     },
                     xAxis: {
                           categories: ['$js_categ'],
                     },
                     yAxis: {
                         title: {
                             text: 'จำนวน (ครั้ง)'
                         },
                         plotLines: [{
                             value: 0,
                             width: 1,
                             color: '#808080'
                         }]
                     },
                     tooltip: {
                         valueSuffix: ''
                     },
                     legend: {
                         layout: 'vertical',
                         align: 'right',
                         verticalAlign: 'middle',
                         borderWidth: 0
                     },
                     credits: {
                         enabled: false
                     },
                     series: [{
                         type: 'column',
                         name: 'จำนวนอุบัติการณ์ความเสี่ยง (column)',
                         data: [$js_cc]
                     }, {
                         type: 'spline',
                         name: 'จำนวนอุบัติการณ์ความเสี่ยง (line)',
                          data: [$js_cc],
                         marker: {
                             lineWidth: 2,
                             lineColor: Highcharts.getOptions().colors[3],
                             fillColor: 'white'
                         }
                     }],


                 });
             });
    ");
    ?>

        </div>
    </div>

</div>
<?= \bluezed\scrollTop\ScrollTop::widget() ?>
