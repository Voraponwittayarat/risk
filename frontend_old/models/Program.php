<?php

namespace frontend\models;

use Yii;
use yii\helpers\ArrayHelper;
use yii\db\Expression;
use yii\behaviors\TimestampBehavior;
use yii\behaviors\BlameableBehavior;

use frontend\models\Type;
use dektrium\user\models\User;
/**
 * This is the model class for table "program".
 *
 * @property int $id
 * @property string $program_name โปรแกรมเชื่อมโยง
 * @property int $type_id รหัสประเภทความเสี่ยง
 * @property string $create_date วันบันทึก
 * @property string $modify_date วันปรับปรุง
 * @property int $created_by บันทึกโดย
 * @property int $updated_by อับเดทโดย
 */
class Program extends \yii\db\ActiveRecord
{
    /**
     * @inheritdoc
     */
    public static function tableName()
    {
        return 'program';
    }

    /**
     * @inheritdoc
     */
    public function rules()
    {
        return [
            [['program_name'], 'required'],
            [['type_id', 'created_by', 'updated_by'], 'integer'],
            [['create_date', 'modify_date'], 'safe'],
            [['program_name'], 'string', 'max' => 100],
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
            'program_id' => 'ID',
            'program_name' => 'โปรแกรมเชื่อมโยง',
            'type_id' => 'ประเภทความเสี่ยง',
            'create_date' => 'วันบันทึก',
            'modify_date' => 'วันปรับปรุง',
            'created_by' => 'บันทึกโดย',
            'updated_by' => 'อับเดทโดย',
        // เพิ่มฟิวล์ใหม่ จาก funtion get  relation  
            'loginname' => 'ผู้บันทึก',
            'updatename' => 'ผู้อับเดท',
        //เพิ่มฟิวล์ใหม่ จาก funtion get  relation  Type     
             'typename' => 'ประเภทความเสี่ยง',
        ];
    }
    
     // get ประเภทความเสี่ยง
    public function getType() {
        return @$this->hasOne(Type::className(), ['id' => 'type_id']);
    }

    public function getTypename() {
        return @$this->type->name;
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
        return ArrayHelper::map(self::find()->all(), 'program_id', 'program_name');
    } 
}
