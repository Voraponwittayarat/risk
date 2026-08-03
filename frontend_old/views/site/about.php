<?php
/* @var $this yii\web\View */

use yii\helpers\Html;

$this->title = 'ทีมพัฒนาระบบ HRMS';
//$this->params['breadcrumbs'][] = $this->title;
?>
<div class="panel panel-success">
    <div class="panel-heading"><span class="glyphicon glyphicon-phone-alt" aria-hidden="true"></span> ทีมพัฒนาโปรแกรมบริหารความเสี่ยงสำหรับโรงพยาบาล HRMS.</div>


    <div class="panel-body">  
        <div class="bs-example" data-example-id="thumbnails-with-custom-content"> 

            <!-- row1--->
            <div class="row"> 
                <div class="col-md-4"></div> 
                <div class="col-md-4"> 
                    <div class="thumbnail"> <?php echo Html::img('@web/images/user_m.png') ?>
                        <div class="caption"> 
                            <h3 style="text-align:center;">นายแพทย์พิจารณ์ สารเสวก</h3>
                            <p style="text-align:center;">ผู้อำนวยการโรงพยาบาล</P>
                            <div class="list-group">
                                <button type="button" class="list-group-item"><span class="glyphicon glyphicon-envelope" aria-hidden="true"></span> s.pijarn13579@gmail.com </button>
                                <button type="button" class="list-group-item"><span class="glyphicon glyphicon-earphone" aria-hidden="true"></span> 055-593060 ต่อ 103</button>
                            </div>
                        </div> 
                    </div> 
                </div> 
                <div class="col-md-4"></div> 
            </div> 
            <!-- row2--->   
            <div class="row"> 
                <div class="col-md-4"> 
                    <div class="thumbnail"> <?php echo Html::img('@web/images/user_m.png') ?>  
                        <div class="caption"> 
                            <h3 style="text-align:center;">นายภานุพงศ์ บรรลือ</h3>
                            <p style="text-align:center;">รองประธานความเสี่ยง</P>
                            <div class="list-group">
                                <button type="button" class="list-group-item"><span class="glyphicon glyphicon-envelope" aria-hidden="true"></span> panupongb54@gmail.com</button>
                                <button type="button" class="list-group-item"><span class="glyphicon glyphicon-earphone" aria-hidden="true"></span>  055-593060 ต่อ 113 </button>
                            </div>      
                        </div> 
                    </div> 
                </div> 
                <div class="col-md-4"> 
                    <div class="thumbnail"> <?php echo Html::img('@web/images/user_f.png') ?>  
                        <div class="caption"> 
                            <h3 style="text-align:center;">นางแสงดาว มณีปัญญา</h3>
                            <p style="text-align:center;">เลขาความเสี่ยง</P>
                            <div class="list-group">
                                <button type="button" class="list-group-item"><span class="glyphicon glyphicon-envelope" aria-hidden="true"></span> sangdao1313@gmail.com</button>
                                <button type="button" class="list-group-item"><span class="glyphicon glyphicon-earphone" aria-hidden="true"></span> 055-593060 ต่อ 115 </button>
                            </div> 
                        </div> 
                    </div> 
                </div> 
                <div class="col-md-4"> 
                    <div class="thumbnail"> <?php echo Html::img('@web/images/user_m.png') ?>
                        <div class="caption"> 
                            <h3 style="text-align:center;">นางสาวกฤติยา สุนทรวิริยะวงศ์</h3>
                            <p style="text-align:center;">ผู้ช่วยเลขาความเสี่ยง</P>
                            <div class="list-group">
                                <button type="button" class="list-group-item"><span class="glyphicon glyphicon-envelope" aria-hidden="true"></span> aajustalive@gmail.com</button>
                                <button type="button" class="list-group-item"><span class="glyphicon glyphicon-earphone" aria-hidden="true"></span> 055-593060 ต่อ 113 </button>
                            </div> 
                        </div> 
                    </div> 
                </div> 
            </div> 
           
        </div>
    </div> 
</div>

<?= \bluezed\scrollTop\ScrollTop::widget() ?>