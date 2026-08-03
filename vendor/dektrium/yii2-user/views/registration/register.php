<?php

/*
 * This file is part of the Dektrium project.
 *
 * (c) Dektrium project <http://github.com/dektrium>
 *
 * For the full copyright and license information, please view the LICENSE.md
 * file that was distributed with this source code.
 */

use yii\helpers\Html;
use yii\widgets\ActiveForm;

/**
 * @var yii\web\View $this
 * @var dektrium\user\models\User $model
 * @var dektrium\user\Module $module
 */

$this->title = Yii::t('user', 'Sign up');
//$this->params['breadcrumbs'][] = $this->title;
?>
<br>
<div class="row">
    <div class="col-md-4 col-md-offset-4 col-sm-6 col-sm-offset-3">
        <div class="panel panel-default">
    <div class="panel-heading">
        <img class="profile-img" src="<?php echo Yii::$app->request->baseUrl.'/images/register.png';?>" alt="">
    </div>
            <div class="panel-body">
                <?php $form = ActiveForm::begin([
                    'id' => 'registration-form',
                    'enableAjaxValidation' => true,
                    'enableClientValidation' => false,
                ]); ?>
                
                <?= $form->field($model, 'cid')->textInput(['placeholder'=>'ระบุเลข 13 หลัก','maxlength' => 13]) ?>

                <?= $form->field($model, 'username')->textInput(['placeholder' => 'ระบุชื่อผู้ใช้งาน ต้องเป็นภาษาอังกฤษเท่านั้น']) ?>


                <?php if ($module->enableGeneratingPassword == false): ?>
                    <?= $form->field($model, 'password')->passwordInput(['placeholder' => 'ระบุรหัสผ่าน ไม่น้อยกว่า 6 ตัวอักษร']) ?>
                <?php endif ?>
                
                <?= $form->field($model, 'email')->textInput(['placeholder' => 'ระบุอีเมล']) ?>
       

                <?= Html::submitButton(Yii::t('user', 'Sign up'), ['class' => 'btn btn-success btn-block']) ?>

                <?php ActiveForm::end(); ?>
            </div>
        </div>
        <p class="text-center">
            <?= Html::a(Yii::t('user', 'Already registered? Sign in!'), ['/user/security/login']) ?>
        </p>
    </div>
</div>
