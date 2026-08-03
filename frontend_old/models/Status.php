<?php

namespace frontend\models;

use Yii;
use yii\helpers\ArrayHelper;
use yii\db\Expression;
use yii\behaviors\TimestampBehavior;
use yii\behaviors\BlameableBehavior;

use dektrium\user\models\User;

/**
 * This is the model class for table "status".
 *
 * @property integer $id
 * @property string $status_name
 * @property string $create_date
 * @property string $modify_date
 * @property integer $created_by
 * @property integer $updated_by
 */
class Status extends \yii\db\ActiveRecord
{
    /**
     * @inheritdoc
     */
    public static function tableName()
    {
        return 'status';
    }

    /**
     * @inheritdoc
     */
    public function rules()
    {
        return [
            [['status_name'], 'required'],
            [['create_date', 'modify_date'], 'safe'],
            [['created_by', 'updated_by'], 'integer'],
            [['status_name'], 'string', 'max' => 100],
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
            'status_name' => 'สถานะความเสี่ยง',
            'create_date' => 'วันบันทึก',
            'modify_date' => 'วันปรับปรุง',
            'created_by' => 'บันทึกโดย',
            'updated_by' => 'อับเดทโดย',
            // เพิ่มฟิวล์ใหม่ จาก funtion get  relation  
            'loginname' => 'ผู้บันทึก',
            'updatename' => 'ผู้อับเดท',
        ];
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
        return ArrayHelper::map(self::find()->all(), 'status_name', 'status_name');
    } 
}

