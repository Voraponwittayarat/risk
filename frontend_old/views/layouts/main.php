<?php

/* @var $this \yii\web\View */
/* @var $content string */
use yii\helpers\Html;
use yii\bootstrap\Nav;
use yii\bootstrap\NavBar;
use yii\widgets\Breadcrumbs;
use kartik\nav\NavX;

use frontend\assets\AppAsset;
use frontend\assets\DatatablesAsset;
use common\widgets\Alert;
use rmrevin\yii\fontawesome\FA;



AppAsset::register($this);
?>
<?php $this->beginPage() ?>
<!DOCTYPE html>
<html lang="<?= Yii::$app->language ?>">
<head>
    <meta charset="<?= Yii::$app->charset ?>">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="Description" content="Hospital Risk Management System โปรแกรมบริหารความเสี่ยงสำหรับโรงพยาบาล">
    <meta name="KeyWords" content="Risk">
	<link rel="shortcut icon" href="favicon.ico" type="image/x-icon">
    <link rel="icon" href="favicon.ico" type="image/x-icon">
    <?= Html::csrfMetaTags() ?>
    <title><?= Html::encode($this->title) ?></title>
    <?php $this->head() ?>
</head>
<body>
<?php $this->beginBody() ?>

<div class="wrap">
<div style=" :90%;background-color:#333333;">
    <?php
    NavBar::begin([
		
        //'brandLabel' => Yii::$app->name,
        'brandLabel' => '<i class="fa fa-hospital-o fa-1x fa-fw"></i> WANGCHAO HOSPITAL<i class="fa fa-book fa-1x fa-fw"></i>RISK',
        //'brandLabel' => '<img src="logo.png" style="display:inline; vertical-align: top; height:32px;"><b>HRMS</b>',
        'brandUrl' => Yii::$app->homeUrl,
        'options' => [
            'class' => 'navbar navbar-default navbar-fixed-top',
			'style'=>'width=90%',
        ],
    ]);
        $username = '';
            if (!Yii::$app->user->isGuest) {
                $username = '(' . Html::encode(Yii::$app->user->identity->username) . ')';
            }
            if (Yii::$app->user->isGuest) {
                $submenuItems[] = ['label' => '<span class="glyphicon glyphicon-log-in"></span> เข้าสู่ระบบ', 'url' => ['/user/security/login']];
                $submenuItems[] = ['label' => '<span class="glyphicon glyphicon-globe"></span> ลงทะเบียนผู้ใช้งาน', 'url' => ['/user/registration/register']];
            } else {
                $submenuItems[] = ['label' => '<span class="glyphicon glyphicon-education"></span> โปรไฟล', 'url' => ['/user/settings/profile'],'visible' => !Yii::$app->user->isGuest && Yii::$app->user->identity->role != 99];
                $submenuItems[] = [
                    'label' => '<span class="glyphicon glyphicon-log-out"></span> ออกจากระบบ',
                    'url' => ['/site/logout'],
                    'linkOptions' => ['data-method' => 'post']
                ];
            }

            $risk_mnu_itms[] = ['label' => '<i class="fa fa-list-alt" aria-hidden="true"></i> รายงานความเสี่ยง', 'url' => ['/risk/index']];
       

            $help_mnu_itms[] =['label' => '<span class="glyphicon glyphicon-list-alt"></span> ประวัติการปรับปรุงโปรแกรม','url' => ['/historyview/index']];
            $help_mnu_itms[] =['label' => '<span class="glyphicon glyphicon-book"></span> คู่มือการใช้งาน','url' => ['/help/manual']];
            $help_mnu_itms[] =['label' => '<span class="glyphicon glyphicon-book"></span> คู่มือการบริหารความเสี่ยง (Risk Management)','url' =>'https://drive.google.com/file/d/1aqvwPzyP1wUVWCxiUIOltaZJDjY1KVrx/view' ];
            $help_mnu_itms[] =['label' => '<span class="glyphicon glyphicon-book"></span> แบบบันทึก RCA โรงพยาบาลวังเจ้า','url' =>'https://docs.google.com/document/d/1S1hW-3iyH7Mnk14pN9M3VwzVieYeHtY1/edit?usp=sharing&ouid=112207264540016977595&rtpof=true&sd=true' ];
            $help_mnu_itms[] =['label' => '<span class="glyphicon glyphicon-folder-open"></span> เอกสารวิชาการ\อ้างอิง','url' => ['/help/books']];
            $help_mnu_itms[] =['label' => '<span class="glyphicon glyphicon-phone-alt"></span> ติดต่อ', 'url' => ['/site/about']];

            if (!Yii::$app->user->isGuest && Yii::$app->user->identity->role != 99) {
                $risk_mnu_itms[] = ['label' => '<i class="fa fa-check-square-o" aria-hidden="true"></i> ตรวจสอบความเสี่ยง', 'url' => ['/risk/approve'],'visible' => !Yii::$app->user->isGuest && Yii::$app->user->identity->role != 3 ];
                $risk_mnu_itms[] = ['label' => '<i class="fa fa-repeat" aria-hidden="true"></i> ทบทวนความเสี่ยง', 'url' => ['/riskreview/index'],
                                    'items' => [    
                                                   
                                                    ['label' => '<i class="fa fa-angle-double-right" aria-hidden="true"></i> Risk มาถึงหน่วยงาน', 'url'=> ['/riskreview/todep']],
                                                 // ['label' => '<i class="fa fa-angle-double-right" aria-hidden="true"></i> Risk มาถึงฝ่ายงาน', 'url'=> ['/riskreview/todepgroup']],
                                                    ['label' => '<i class="fa fa-angle-double-right" aria-hidden="true"></i> Risk มาถึงทีมนำ', 'url'=> ['/riskreview/toteam']],
                                                    ['label' => '<i class="fa fa-angle-double-right" aria-hidden="true"></i> Risk มาถึง CEO', 'url'=> ['/riskreview/toceo']],
                                                    ['label' => '<i class="fa fa-angle-double-right" aria-hidden="true"></i> Risk ที่ผ่านทบทวน', 'url'=> ['/riskreview/index']],
                                               ],'visible' => !Yii::$app->user->isGuest && Yii::$app->user->identity->role != 99 && Yii::$app->user->identity->role != 3
                                   ];   
            }
            $risk_mnu_itms[] = ['label' => '<i class="fa fa-history" aria-hidden="true"></i> ดูประวัติความเสี่ยง', 'url' => ['/riskhistory/index'],'visible' => !Yii::$app->user->isGuest && Yii::$app->user->identity->role != 3 ];
            $risk_mnu_itms[] = ['label' => '<i class="fa fa-bell" aria-hidden="true"></i> ติดตามความเสี่ยง', 'url' => ['/riskregister/follow']];
            $risk_mnu_itms[] = ['label' => '<i class="fa fa-bell" aria-hidden="true"></i> ติดตามความเสี่ยงแผนก', 'url' => ['/riskregister/followteam'],'visible' => !Yii::$app->user->isGuest && Yii::$app->user->identity->role != 3];
            $risk_mnu_itms[] = ['label' => '<i class="fa fa-bell" aria-hidden="true"></i> ติดตามความเสี่ยงRM', 'url' => ['/riskregister/followrm'],'visible' => !Yii::$app->user->isGuest && Yii::$app->user->identity->role != 3 && Yii::$app->user->identity->role != 2];

            $risk_mnu_itms[] = ['label' => '<i class="fa fa-link" aria-hidden="true"></i> ทะเบียนความเสี่ยง (Risk Register)', 'url' => 'https://docs.google.com/spreadsheets/d/1QmOBx_w_wSXnfVJYvjvut9ySMg_Wrrlq/edit?gid=139968549#gid=139968549'];

            $menuItems = [
                ['label' => '<span class="glyphicon glyphicon-home"></span> หน้าหลัก','url' => ['/site/index']],
                ['label' => '<span class="glyphicon glyphicon-screenshot"></span> จัดการความเสี่ยง', 'items' => $risk_mnu_itms,'visible' => !Yii::$app->user->isGuest && Yii::$app->user->identity->role != 99],
                ['label' => '<span class="glyphicon glyphicon-list-alt"></span> รายงาน', 'url' => ['/risk/report'],'visible' => !Yii::$app->user->isGuest && Yii::$app->user->identity->role != 99],
                [
                'label' => '<span class="glyphicon glyphicon-cog"></span> ตั้งค่าระบบ',
                'items' => [
                     //'<li class="divider"></li>',
                     '<li class="dropdown-header">จัดการข้อมูลทั่วไป</li>',
                        ['label' => '<span class="glyphicon glyphicon-menu-right"></span> ข้อมูลโรงพยาบาล','url' => ['/hospital/index']],
                        ['label' => '<span class="glyphicon glyphicon-menu-right"></span> ฝ่าย','url' => ['/departmentgroup/index']],
                        ['label' => '<span class="glyphicon glyphicon-menu-right"></span> แผนก-งาน','url' => ['/department/index']],
                        ['label' => '<span class="glyphicon glyphicon-menu-right"></span> ตำแหน่ง','url' => ['/position/index']],
                        ['label' => '<span class="glyphicon glyphicon-menu-right"></span> ทีมนำโรงพยาบาล','url' => ['/team/index']],
                        ['label' => '<span class="glyphicon glyphicon-menu-right"></span> ข้อมูลบุคลากร','url' => ['/member/index']],
                        ['label' => '<span class="glyphicon glyphicon-menu-right"></span> เวรทำการ','url' => ['/duration/index']],
                        ['label' => '<span class="glyphicon glyphicon-menu-right"></span> ประวัติการปรับปรุง','url' => ['/history/index']],
                     '<li class="divider"></li>',
                     //'<li class="dropdown-header">จัดการสมาชิก</li>',
                        ['label' => '<span class="glyphicon glyphicon-menu-right"></span> จัดการผู้ใช้งาน','url' => ['/user/admin/index']],
                     '<li class="divider"></li>',
                     '<li class="dropdown-header">จัดการข้อมูลความเสี่ยง</li>',
                        ['label' => '<span class="glyphicon glyphicon-menu-right"></span> ประเภทความเสี่ยง','url' => ['/type/index']],
                        ['label' => '<span class="glyphicon glyphicon-menu-right"></span> กลุ่มความเสี่ยง','url' => ['/riskgroup/index']], 
                        ['label' => '<span class="glyphicon glyphicon-menu-right"></span> ระดับความรุนแรง','url' => ['/level/index']],          
                        ['label' => '<span class="glyphicon glyphicon-menu-right"></span> โปรแกรมความเสี่ยง','url' => ['/program/index']],
                        ['label' => '<span class="glyphicon glyphicon-menu-right"></span> คลังความเสี่ยง',  'url' => ['/riskstore/index']],
                        ['label' => '<span class="glyphicon glyphicon-menu-right"></span> ที่มาของรายงานความเสี่ยง', 'url' => ['/inform/index']],
                        ['label' => '<span class="glyphicon glyphicon-menu-right"></span> ระดับการทบทวน','url' => ['/levelwarning/index']], 
                        ['label' => '<span class="glyphicon glyphicon-menu-right"></span> ผลการทบทวน', 'url' => ['/reviewresults/index']],
                        ['label' => '<span class="glyphicon glyphicon-menu-right"></span> สถานที่เกิดความเสี่ยง','url' => ['/location/index']],
                        ['label' => '<span class="glyphicon glyphicon-menu-right"></span> สถานะความเสี่ยง', 'url' => ['/status/index']],
                ],
                    'visible' => !Yii::$app->user->isGuest && Yii::$app->user->identity->role == 1
                ],
                ['label' => '<span class="glyphicon glyphicon-comment"></span> ช่วยเหลือ', 'items' => $help_mnu_itms],
                ['label' => '<span class="glyphicon glyphicon-user"></span> ผู้ใช้งาน' . $username, 'items' => $submenuItems],
            ];
   


            echo NavX::widget([
                'options' => ['class' => 'navbar-nav navbar-right'],
                'encodeLabels' => false,
                'items' => $menuItems,
            ]);
            NavBar::end();
            ?>
       </div>   
    <div class="container" style=" width:90%;">   
        <?= Breadcrumbs::widget([
            'links' => isset($this->params['breadcrumbs']) ? $this->params['breadcrumbs'] : [],
        ]) ?>
        <?=\yii2mod\alert\Alert::widget()?>
        <?= $content ?>
    </div>
        
</div>

<div class="footer">
     <div class="container">
        <p style="text-align:center;">Copyright &copy; <?= date('Y') ?> <a href="#">Hospital Risk Management System.</a> Developed By <?=  Html::a('Wichian Nunsri') ?> </p>
    <?php
        $ver = file_get_contents(Yii::getAlias('@webroot/version/version.txt'));
        $ver = explode(',', $ver);
    ?>
    <?php $visit = Yii::$app->db->createCommand("SELECT COUNT(id) FROM session_frontend_user")->queryScalar(); ?>
        <h6><p style="text-align:center;">เวอร์ชั่น <i class="fa fa-fw fa-plug"></i> <?= $ver[0] ?>  |  ผู้เยี่ยมชม <i class="fa fa-fw fa-wifi"></i> <?= $visit;?> ครั้ง </p></h6>
    </div>
</div>
<?php $this->endBody() ?>
</body>
</html>
<?php $this->endPage() ?>
