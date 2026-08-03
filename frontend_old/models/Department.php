<?php

namespace frontend\models;

use Yii;
use yii\helpers\ArrayHelper;
use yii\db\Expression;
use yii\behaviors\TimestampBehavior;
use yii\behaviors\BlameableBehavior;

use frontend\models\Departmentgroup;
use dektrium\user\models\User;

class Department extends \yii\db\ActiveRecord
{
    /**
     * @inheritdoc
     */
    public static function tableName()
    {
        return 'department';
    }

    /**
     * @inheritdoc
     */
    public function rules()
    {
        return [
            [['depart_name','depart_name_eng'], 'required'],
            [['depart_group_id', 'created_by', 'updated_by'], 'integer'],
            [['create_date', 'modify_date'], 'safe'],
            [['depart_name'], 'string', 'max' => 150],
            [['depart_name_eng'], 'string', 'max' => 50],
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
            'depart_name_eng' => 'ชื่อย่ออังกฤษ',
            'depart_name' => 'ชื่อแผนก',
            'depart_group_id' => 'รหัสฝ่าย',
            'create_date' => 'วันบันทึก',
            'modify_date' => 'วันปรับปรุง',
            'created_by' => 'บันทึกโดย',
            'updated_by' => 'อับเดทโดย',
        // เพิ่มฟิวล์ใหม่ จาก funtion get  relation  
            'loginname' => 'ผู้บันทึก',
            'updatename' => 'ผู้อับเดท',
        //เพิ่มฟิวล์ใหม่ จาก funtion get  relation  Departmentgroup     
             'departgroupname' => 'ฝ่าย',
        ];
    }
    // get ชื่อฝ่าย   
    public function getDepartgroup() {
        return @$this->hasOne(Departmentgroup::className(), ['id' => 'depart_group_id']);
    }

    public function getDepartgroupname() {
        return @$this->departgroup->depart_group_name;
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
        return ArrayHelper::map(self::find()->all(), 'id', 'depart_name');
    } 
}
