<?php

namespace frontend\models;

use Yii;
use yii\db\Expression;
use yii\behaviors\TimestampBehavior;
use yii\behaviors\BlameableBehavior;

use frontend\models\Act;
use dektrium\user\models\User;

/**
 * This is the model class for table "inform".
 *
 * @property int $id
 * @property string $inform_name ที่มาของรายงาน
 * @property int $act_id เชิงรับ/เชิงรุก
 * @property string $create_date วันบันทึก
 * @property string $modify_date วันปรับปรุง
 * @property int $created_by บันทึกโดย
 * @property int $updated_by อับเดทโดย
 */
class Inform extends \yii\db\ActiveRecord
{
    /**
     * @inheritdoc
     */
    public static function tableName()
    {
        return 'inform';
    }

    /**
     * @inheritdoc
     */
    public function rules()
    {
        return [
            [['inform_name'], 'required'],
            [['act_id', 'created_by', 'updated_by'], 'integer'],
            [['create_date', 'modify_date'], 'safe'],
            [['inform_name'], 'string', 'max' => 100],
        ];
    }

    public function behaviors()
    {
        return [
            [
            'class' => TimestampBehavior::className(),
            'createdAtAttribute' => 'create_date',
            'updatedAtAttribute' => 'modify_date',
            'value' => new Expression('NOW()'),
            ],
            [  
            'class' => BlameableBehavior::className(),
            'createdByAttribute' => 'created_by',
            'updatedByAttribute' => 'updated_by',],  
        ];
    }
    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'inform_name' => 'ที่มาของรายงาน',
            'act_id' => 'เชิงรับ/เชิงรุก',
            'create_date' => 'วันบันทึก',
            'modify_date' => 'วันปรับปรุง',
            'created_by' => 'บันทึกโดย',
            'updated_by' => 'อับเดทโดย',
        // เพิ่มฟิวล์ใหม่ จาก funtion get  relation  
            'loginname' => 'ผู้บันทึก',
            'updatename' => 'ผู้อับเดท',
        //เพิ่มฟิวล์ใหม่ จาก funtion get  relation  Act
            'actname' => 'เชิงรับ/เชิงรุก',
        ];
    }

    // get เชิงรับ/เชิงรุก  
    public function getAct() {
        return @$this->hasOne(Act::className(), ['id' => 'act_id']);
    }

    public function getActname() {
        return @$this->act->act_name;
    }
   // get ชื่อผู้บันทึก
    public function getLogin() {
        return @$this->hasOne(User::className(), ['id' => 'created_by']);
    }
    public function getLoginname() {
        return @$this->login->username;
    }
    // get ชื่อผู้อับเดท
    public function getUpdate() {
        return @$this->hasOne(User::className(), ['id' => 'updated_by']);
    }
    public function getUpdatename() {
        return @$this->update->username;
    }
}

