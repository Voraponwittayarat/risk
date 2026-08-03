<?php
use yii\helpers\Html;
use yii\helpers\Url;
use yii\web\JsExpression;
use yii\bootstrap\ActiveForm;
use miloschuman\highcharts\Highcharts;
use rmrevin\yii\fontawesome\FA;

use kartik\grid\GridView;
use kartik\widgets\Growl;


/* @var $this yii\web\View */

$this->title = 'โปรแกรมบริหารความเสี่ยงสำหรับโรงพยาบาล [Hospital Risk Management System]';
?>
<div class="site-index">
    <div style='display: none'>
        <?=
            Highcharts::widget([
                'scripts' => [
                    'highcharts-more',
                    //'themes/grid'
                ]
            ]);
        ?>
    </div>
    <?= Growl::widget([
        'type' => Growl::TYPE_GROWL,
        'title' => 'ยินดีต้อนรับเข้าสู่ระบบ </br> HRMS (Hospital Risk Management System) โปรแกรมบริหารความเสี่ยงสำหรับโรงพยาบาล' . ' </br>-------------------------------------------------------------' . '</br>',
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

    <div class="alert alert-info alert-dismissible fade in" role="alert">
        <!-- คิวรี่จากฐาน ข้อมูลผู้ใช้งาน -->
        <?php
        $by = Yii::$app->db->createCommand("SELECT m.member_name,r.role_name,t.team_name,d1.depart_name AS dep1,d2.depart_name AS dep2
                    FROM user u 
                    INNER JOIN user_role r ON r.role_id=u.role
                    INNER JOIN member m ON m.cid collate utf8_general_ci=u.cid collate utf8_general_ci 
                    LEFT JOIN team t ON t.id=m.team_id
                    LEFT JOIN department d1 ON d1.id=m.department_id1
                    LEFT JOIN department d2 ON d2.id=m.department_id2
                    WHERE u.id=$user_ir  ")->queryOne();
        $member = $by['member_name'];
        $role = $by['role_name'];
        $team = $by['team_name'];
        $dep1 = $by['dep1'];
        $dep2 = $by['dep2'];
        ?>
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">×</span>
        </button>
        <h4><span class="glyphicon glyphicon-gift" aria-hidden="true"></span> โปรแกรมบริหารความเสี่ยงสำหรับโรงพยาบาล
            (Hospital Risk Management System) <b>
                <font color="#ff0066">ปีงบประมาณ <?= $b_year ?></font>
            </b></h4>
        <button class="btn btn-warning" type="button"> ยินดีต้อนรับ : <?php echo $member; ?> </button>
        <button class="btn btn-danger" type="button"> สิทธิการใช้งาน : <?php echo $role ?> </button>
        <button class="btn btn-default" type="button"> สังกัดหน่วยงานหลัก : <?php echo $dep1; ?> / สังกัดหน่วยงานรอง :
            <?php echo $dep2; ?> </button>
        <button class="btn btn-default" type="button"> สังกัดทีมนำ : <?php echo $team; ?></button>
        <a href="<?= Yii::$app->request->baseUrl ?>/riskfiles/Hosp.html" target="_blank" class="btn btn-info"
            type="button">
            <i class="fa fa-external-link"></i> วิเคราะห์วัฒนธรรมความปลอดภัย
        </a>
        <?php if (Yii::$app->user->identity->role == '02') { ?>
            <a href="http://172.20.250.202/risk-dashboard/" target="_blank" class="btn btn-primary" type="button">
                <i class="fa fa-dashboard"></i> Risk Dashboard
            </a>
        <?php } ?>

    </div>
    <div class="body-content">
        <!--row1     -->
        <div class="row">

            <div class="col-md-3 col-sm-4">
                <div class="alert alert-success">
                    <div class="caption">
                        <div class="panel-heading text-center">
                            <h4><b>อุบัติการณ์ความเสี่ยงทั้งหมดที่คุณรายงาน</b></h4>
                        </div>
                        <?php foreach ($toall as $all) { ?>
                            <div class="progress">
                                <div class="progress-bar progress-bar-success" role="progressbar"
                                    aria-valuenow="<?php echo $all['cc']; ?>" aria-valuemin="0" aria-valuemax="100"
                                    style="width: <?php echo $all['cc']; ?>%"><?php echo $all['cc']; ?></div>
                            </div>
                        </div>

                        <div class="text-right">
                            <?php
                            if (!Yii::$app->user->isGuest && Yii::$app->user->identity->role != 99 && Yii::$app->user->identity->role != 3) {
                                echo 'นับจำนวนครั้ง';
                            }
                            ?>
                        </div>
                    <?php } ?>
                </div>
            </div>
            <div class="col-md-3 col-sm-4">
                <div class="alert alert-danger">
                    <div class="caption">
                        <div class="panel-heading text-center">
                            <h4><b>อุบัติการณ์ความเสี่ยงมาถึงหน่วยงานคุณ</b></h4>
                        </div>
                        <?php foreach ($todep1 as $dep1) { ?>
                            <div class="progress">
                                <div class="progress-bar progress-bar-warning" role="progressbar"
                                    aria-valuenow="<?php echo $dep1['cc']; ?>" aria-valuemin="0" aria-valuemax="100"
                                    style="width: <?php echo $dep1['cc']; ?>%"><?php echo $dep1['cc']; ?></div>
                            </div>
                        </div>
                        <div class="text-right">
                            <?php
                            if (!Yii::$app->user->isGuest && Yii::$app->user->identity->role != 99 && Yii::$app->user->identity->role != 3) {
                                echo Html::a('ทบทวน <i class="fa fa-arrow-circle-right"></i>', ['/riskreview/todep']);
                            }
                            ?>
                        </div>
                    <?php } ?>
                </div>
            </div>
            <div class="col-md-3 col-sm-4">
                <div class="alert alert-danger">
                    <div class="caption">
                        <div class="panel-heading text-center">
                            <h4><b>อุบัติการณ์ความเสี่ยงมาถึงทีมคุณ</b></h4>
                        </div>
                        <?php foreach ($toteam as $team) { ?>
                            <div class="progress">
                                <div class="progress-bar progress-bar-info" role="progressbar"
                                    aria-valuenow="<?php echo $team['cc']; ?>" aria-valuemin="0" aria-valuemax="100"
                                    style="width: <?php echo $team['cc']; ?>%"><?php echo $team['cc']; ?></div>
                            </div>
                        </div>
                        <div class="text-right">
                            <?php
                            if (!Yii::$app->user->isGuest && Yii::$app->user->identity->role != 99 && Yii::$app->user->identity->role != 3) {
                                echo Html::a('ทบทวน <i class="fa fa-arrow-circle-right"></i>', ['/riskreview/toteam']);
                            }
                            ?>
                        </div>
                    <?php } ?>
                </div>
            </div>
            <div class="col-md-3 col-sm-4">
                <div class="alert alert-danger">
                    <div class="caption">
                        <div class="panel-heading text-center">
                            <h4><b>อุบัติการณ์ความเสี่ยงมาถึง CEO</b></h4>
                        </div>
                        <?php foreach ($touse as $use) { ?>
                            <div class="progress">
                                <div class="progress-bar progress-bar-info" role="progressbar"
                                    aria-valuenow="<?php echo $use['cc']; ?>" aria-valuemin="0" aria-valuemax="100"
                                    style="width: <?php echo $use['cc']; ?>%"><?php echo $use['cc']; ?></div>
                            </div>
                        </div>
                        <div class="text-right">
                            <?php
                            if (!Yii::$app->user->isGuest && Yii::$app->user->identity->role != 99 && Yii::$app->user->identity->role != 3) {
                                echo Html::a('ทบทวน <i class="fa fa-arrow-circle-right"></i>', ['/riskreview/toceo']);
                            }
                            ?>
                        </div>
                    <?php } ?>
                </div>
            </div>

        </div>
        <!--row2     -->

        <div class="row">
            <div class="col-sm-8">
                <div class="panel panel-primary">
                    <div class="panel-heading text-center"><b>อุบัติการณ์ความเสี่ยงแยกตามสถานะ</b></div>
                    <div class="panel-body">
                        <div id="container1"></div>
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
                                        $('#container1').highcharts({
                                            chart: {
                                               height:363,
                                               width: 700
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
                                                    text: 'จำนวน(ครั้ง)'
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
            <!-- คิวรี่จากฐาน ระดับความเสี่ยง 5 ระดับ-->
            <?php
            $a = Yii::$app->db->createCommand("SELECT COUNT(id) FROM riskregister WHERE register_date BETWEEN '$date1' AND '$date2' AND created_by=$user_ir AND level_id BETWEEN 'A' AND 'B' or level_id='1' ")->queryScalar();
            $c = Yii::$app->db->createCommand("SELECT COUNT(id) FROM riskregister WHERE register_date BETWEEN '$date1' AND '$date2' AND created_by=$user_ir AND level_id BETWEEN 'C' AND 'D' or level_id='2' ")->queryScalar();
            $e = Yii::$app->db->createCommand("SELECT COUNT(id) FROM riskregister WHERE register_date BETWEEN '$date1' AND '$date2' AND created_by=$user_ir AND level_id BETWEEN 'E' AND 'F' or level_id='3' ")->queryScalar();
            $g = Yii::$app->db->createCommand("SELECT COUNT(id) FROM riskregister WHERE register_date BETWEEN '$date1' AND '$date2' AND created_by=$user_ir AND level_id BETWEEN 'G' AND 'H' or level_id='4' ")->queryScalar();
            $i = Yii::$app->db->createCommand("SELECT COUNT(id) FROM riskregister WHERE register_date BETWEEN '$date1' AND '$date2' AND created_by=$user_ir AND level_id='I'or level_id='5' ")->queryScalar();
            ?>

            <div class="col-sm-4">
                <div class="list-group">
                    <a href="#"
                        class="list-group-item active text-center"><b>ระดับความรุนแรงอุบัติการณ์ความเสี่ยงแยกตามกลุ่ม</b></a>

                    <a href="#" class="list-group-item">
                        <h6 class="list-group-item-heading">ระดับความรุนแรง (น้อยมาก)</h6>
                        <div class="progress">
                            <div class="progress-bar progress-bar-success" role="progressbar" aria-valuenow="<?= $a ?>"
                                aria-valuemin="0" aria-valuemax="100" style="width: <?= $a ?>%"><?= $a ?></div>
                        </div>
                    </a>
                    <a href="#" class="list-group-item">
                        <h6 class="list-group-item-heading">ระดับความรุนแรง (น้อย)</h6>
                        <div class="progress">
                            <div class="progress-bar progress-bar-info" role="progressbar" aria-valuenow="<?= $c ?>"
                                aria-valuemin="0" aria-valuemax="100" style="width: <?= $c ?>%"><?= $c ?></div>
                        </div>
                    </a>
                    <a href="#" class="list-group-item">
                        <h6 class="list-group-item-heading">ระดับความรุนแรง (ปานกลาง)</h6>
                        <div class="progress">
                            <div class="progress-bar progress-bar-secondary" role="progressbar"
                                aria-valuenow="<?= $e ?>" aria-valuemin="0" aria-valuemax="100"
                                style="width: <?= $e ?>%"><?= $e ?></div>
                        </div>
                    </a>
                    <a href="#" class="list-group-item">
                        <h6 class="list-group-item-heading">ระดับความรุนแรง (ค่อนข้างรุนแรง)</h6>
                        <div class="progress">
                            <div class="progress-bar progress-bar-warning" role="progressbar" aria-valuenow="<?= $g ?>"
                                aria-valuemin="0" aria-valuemax="100" style="width: <?= $g ?>%"><?= $g ?></div>
                        </div>
                    </a>
                    <a href="#" class="list-group-item">
                        <h6 class="list-group-item-heading">ระดับความรุนแรง (รุนแรงที่สุด)</h6>
                        <div class="progress">
                            <div class="progress-bar progress-bar-danger" role="progressbar" aria-valuenow="<?= $i ?>"
                                aria-valuemin="0" aria-valuemax="100" style="width: <?= $i ?>%"><?= $i ?></div>
                        </div>
                    </a>
                </div>
            </div>

        </div>
        <!-- End row2     -->
        <div class="row">
            <div class="col-sm-12">
                <div class="panel panel-primary">
                    <div class="panel-heading text-center"><b>จำนวนอุบัติการณ์ความเสี่ยงแยกรายเดือน</b></div>
                    <div class="panel-body">
                        <div id="container2"></div>
                        <?php
                        $categ = [];
                        for ($i = 0; $i < count($mrisk); $i++) {
                            $categ[] = $mrisk[$i]['m'];
                        }
                        $js_categ = implode("','", $categ);

                        $data_cc = [];
                        for ($i = 0; $i < count($mrisk); $i++) {
                            $data_cc[] = $mrisk[$i]['cc'];
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
                                                    text: 'จำนวน(ครั้ง)'
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
        <!-- End row3    -->
    </div>
</div>


<?= \bluezed\scrollTop\ScrollTop::widget() ?>