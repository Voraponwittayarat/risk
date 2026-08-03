<?php

use yii\helpers\Html;
use yii\widgets\ActiveForm;
use yii\helpers\ArrayHelper;

use dektrium\user\models\UserRole;

/*
 * This file is part of the Dektrium project.
 *
 * (c) Dektrium project <http://github.com/dektrium>
 *
 * For the full copyright and license information, please view the LICENSE.md
 * file that was distributed with this source code.
 */

/**
 * @var yii\widgets\ActiveForm $form
 * @var dektrium\user\models\User $user
 */
?>
<?= $form->field($user, 'cid')->textInput(['maxlength' => 13]) ?>
<?= $form->field($user, 'username')->textInput(['maxlength' => 255]) ?>
<?= $form->field($user, 'password')->passwordInput() ?>
<?= $form->field($user, 'email')->textInput(['maxlength' => 255]) ?>
<?= $form->field($user, 'role')->dropDownList(ArrayHelper::map(UserRole::find()->all(), 'role_id', 'role_desc')); ?>