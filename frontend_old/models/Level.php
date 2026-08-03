<?php

namespace frontend\models;

use Yii;
use yii\helpers\ArrayHelper;
use yii\db\Expression;
use yii\behaviors\TimestampBehavior;
use yii\behaviors\BlameableBehavior;

use frontend\models\Levelwarning;
use dektrium\user\models\User;
/**
 * This is the model class for table "level".
 *
 * @property int $id
 * @property string $level_code ระดับ
 * @property string $level_name ชื่อระดับความรุนแรง
 * @property int $level_warning_id การเตือน
 * @property string $url_pic ลิงค์ภาพระดับความเสี่ยง
 * @property string $create_date วันบันทึก
 * @property string $modify_date วันปรับปรุง
 * @property int $created_by บันทึกโดย
 * @property int $updated_by อับเดทโดย
 */
class Level extends \yii\db\ActiveRecord
{
    /**
     * @inheritdoc
     */
    public static function tableName()
    {
        return 'level';
    }

    /**
     * @inheritdoc
     */
    public function rules()
    {
        return [
            [['level_code', 'level_name'], 'required'],
            [['created_by', 'updated_by'], 'integer'],
            [['create_date', 'modify_date'], 'safe'],
            [['level_warning_code'], 'string', 'max' => 3],
            [['level_code'], 'string', 'max' => 2],
            [['level_name'], 'string', 'max' => 200],
            [['url_pic'], 'string', 'max' => 100],
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
            'level_id' => 'ID',
            'level_code' => 'ระดับ',
            'level_name' => 'ชื่อระดับความรุนแรง',
            'level_warning_code' => 'รหัสการเตือน',
            'url_pic' => 'ลิงค์ภาพระดับความเสี่ยง',
            'create_date' => 'วันบันทึก',
            'modify_date' => 'วันปรับปรุง',
            'created_by' => 'บันทึกโดย',
            'updated_by' => 'อับเดทโดย',
        // เพิ่มฟิวล์ใหม่ จาก funtion get  relation  
            'loginname' => 'ผู้บันทึก',
            'updatename' => 'ผู้อับเดท',
        //เพิ่มฟิวล์ใหม่ จาก funtion get  relation  Type และ Levelwarning 
            'warningcode' => 'รหัสการเตือน',
            'warningname' => 'รายละเอียดการเตือน',
        ];
    }

    // get การแจ้งเตือน   
    public function getWarning() {
        return @$this->hasOne(Levelwarning::className(), ['warning_code' => 'level_warning_code']);
    }

    public function getWarningname() {
        return @$this->warning->warning_name;
    }
    
    public function getWarningcode() {
        return @$this->warning->warning_code;
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
    
    public static function GetListName(){
        return ArrayHelper::map(self::find()->all(), 'level_id', 'level_code');
    } 
}
