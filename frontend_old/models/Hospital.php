<?php

namespace frontend\models;

use Yii;
use yii\db\Expression;
use yii\behaviors\TimestampBehavior;
use yii\behaviors\BlameableBehavior;

use dektrium\user\models\User;

class Hospital extends \yii\db\ActiveRecord
{
    /**
     * @inheritdoc
     */
    public static function tableName()
    {
        return 'hospital';
    }

    /**
     * @inheritdoc
     */
    public function rules()
    {
        return [
            [['hoscode', 'hosname', 'address', 'tel'], 'required'],
            [['hoscode', 'created_by', 'updated_by'], 'integer'],
            [['website', 'linetoken','linenotify','sendmail'], 'string'],
            [['create_date', 'modify_date'], 'safe'],
            [['hosname'], 'string', 'max' => 150],
            [['address', 'email'], 'string', 'max' => 200],
            [['tel', 'fax'], 'string', 'max' => 10],
            [['phone'], 'string', 'max' => 11],
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
    
    /**
     * @inheritdoc
     */
    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'hoscode' => 'รหัสสถานพยาบาล',
            'hosname' => 'ชื่อโรงพยาบาล',
            'address' => 'ที่อยู่',
            'tel' => 'เบอร์โทรสำนักงาน',
            'phone' => 'เบอร์โทรมือถือ',
            'fax' => 'แฟกซ์',
            'email' => 'อีเมล์',
            'website' => 'เว็บไซต์',
            'linetoken' => 'Line Token',
            'linenotify'=> 'แจ้งเตือนความเสี่ยงผ่าน Line Notify',
            'sendmail'=> 'แจ้งเตือนความเสี่ยงผ่าน eMail',
            'create_date' => 'วันบันทึก',
            'modify_date' => 'วันปรับปรุง',
            'created_by' => 'บันทึกโดย',
            'updated_by' => 'อับเดทโดย',
        // เพิ่มฟิวล์ใหม่ จาก funtion get  relation  
            'loginname' => 'ผู้บันทึก',
            'updatename' => 'ผู้อับเดท',
            'linename' => 'แจ้งเตือนความเสี่ยงผ่าน Line Notify',
            'mailname' => 'แจ้งเตือนความเสี่ยงผ่าน eMail',
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

//  สร้างรายการให้เลือก itemAlias  radioList  
    public static function itemAlias($type,$code=NULL) {
        $_items = array(
            'line' => array(
                '1' => 'แจ้งเตือน',
                '2' => 'ไม่แจ้งเตือน',
           
            ),
            'mail' => array(
                '1' => 'แจ้งเตือน',
                '2' => 'ไม่แจ้งเตือน',
            ),


        );    
        if (isset($code)){
            return isset($_items[$type][$code]) ? $_items[$type][$code] : false;
        }
        else{         
            return isset($_items[$type]) ? $_items[$type] : false;    
        }
        
    } 
    
    public function getItemprior(){
        return self::itemsAlias('prior');
    }

    public function getPriorname(){
        return ArrayHelper::getValue($this->getItemprior(),$this->priority);
    }
}
