<?php

namespace frontend\models;

use Yii;
use yii\db\Expression;
use yii\behaviors\TimestampBehavior;
use yii\behaviors\BlameableBehavior;
use \yii\web\UploadedFile;
use yii\helpers\ArrayHelper;

use frontend\models\Department;
use frontend\models\Position;
use frontend\models\Team;

use dektrium\user\models\User;

/**
 * This is the model class for table "member".
 *
 * @property integer $id
 * @property string $member_name
 * @property string $member_status
 * @property integer $department_id
 * @property integer $position_id
 * @property string $create_date
 * @property string $modify_date
 * @property integer $created_by
 * @property integer $updated_by
 */
class Member extends \yii\db\ActiveRecord
{
     public $upload_foler = 'personal';
    /**
     * @inheritdoc
     */
    public static function tableName()
    {
        return 'member';
    }

    /**
     * @inheritdoc
     */
    public function rules()
    {
        return [
            [['member_name','cid','department_id1', 'position_id'], 'required'],
            [['department_id1','department_id2','position_id','team_id','created_by', 'updated_by'], 'integer'],
            [['create_date', 'modify_date'], 'safe'],
            [['member_name'], 'string', 'max' => 60],
            [['cid'],'string', 'max' => 13],
            [['status'], 'string', 'max' => 1],
            [['priority','accessrules'],'string'],
            [['img'], 'file',
                'skipOnEmpty' => true,
                'extensions' => 'png,jpg'
            ]
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
            'updatedByAttribute' => 'updated_by',
            ],  
        ];
    }
    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'cid' => 'เลขบัตร 13 หลัก',
            'member_name' => 'ชื่อ-นามสกุล',
            'department_id1' => 'สังกัดหน่วยงานหลัก',
            'department_id2' => 'สังกัดหน่วยงานรอง',
            'position_id' => 'ตำแหน่ง',
            'priority' => 'ตำแหน่งสายอำนวยการ',
            'img' => 'รูปประจำตัว',
            'team_id' => 'ทีมนำ',
            'accessrules' =>'สิทธิการเข้าถึง',
            'status' => 'สถานะ',
            'create_date' => 'วันบันทึก',
            'modify_date' => 'วันปรับปรุง',
            'created_by' => 'บันทึกโดย',
            'updated_by' => 'อับเดทโดย',
            
        // เพิ่มฟิวล์ใหม่ จาก funtion get  relation
            'loginname' => 'ผู้บันทึก',
            'updatename' => 'ผู้อับเดท',
            'departname1' => 'สังกัดหน่วยงานหลัก',
            'departname2' => 'สังกัดหน่วยงานรอง',
            'positionname' => 'ตำแหน่ง',
        //'priorityname' => 'ตำแหน่งสายอำนวยการ',
            'teamname' => 'ทีมนำ',
            'membername' => 'ชื่อ',
        ];
    }
    
    // get สังกัดหน่วยงานหลัก  
    public function getDepart1() {
        return @$this->hasOne(Department::className(), ['id' => 'department_id1']);
    }
    
    public function getDepartname1() {
        return @$this->depart1->depart_name;
    }
    
    // get สังกัดหน่วยงานรอง 
    public function getDepart2() {
        return @$this->hasOne(Department::className(), ['id' => 'department_id2']);
    }

    public function getDepartname2() {
        return @$this->depart2->depart_name;
    }
    
   // get ชื่อตำแหน่ง
    public function getPosition() {
        return @$this->hasOne(Position::className(), ['id' => 'position_id']);
    }

    public function getPositionname() {
        return @$this->position->position_name;
    }
    
  // get ชื่อทีมนำ
    public function getTeam() {
        return @$this->hasOne(Team::className(), ['id' => 'team_id']);
    }

    public function getTeamname() {
        return @$this->team->team_name;
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
    
    // get member_name to profile   
    public static function GetList()
    {
        return \yii\helpers\ArrayHelper::map(self::find()->all(), 'cid', 'member_name');
    }

    public static function getMemberName($cid)
    {
        if (($model = Member::findOne($cid)) !== null) {
            return $model->member_name;
        } else {
            return '';
        }
    }
 // upload image
    public function upload($model,$attribute)
    {
        $img  = UploadedFile::getInstance($model, $attribute);
          $path = $this->getUploadPath();
        if ($this->validate() && $img !== null) {

            $fileName = md5($img->baseName.time()) . '.' . $img->extension;
            //$fileName = $photo->baseName . '.' . $photo->extension;
            if($img->saveAs($path.$fileName)){
              return $fileName;
            }
        }
        return $model->isNewRecord ? false : $model->getOldAttribute($attribute);
    }

    public function getUploadPath(){
      return Yii::getAlias('@webroot').'/'.$this->upload_foler.'/';
    }

    public function getUploadUrl(){
      return Yii::getAlias('@web').'/'.$this->upload_foler.'/';
    }

    public function getPhotoViewer(){
      return empty($this->img) ? Yii::getAlias('@web').'/images/none.png' : $this->getUploadUrl().$this->img;
    }
  
//  สร้างรายการให้เลือก itemAlias  radioList  
    public static function itemAlias($type,$code=NULL) {
        $_items = array(
            'priority' => array(
                '1' => 'ประธานกรรมการบริหาร CEO รพ.',
                '2' => 'หัวหน้าฝ่าย',
                '3' => 'หัวหน้าแผนก',
                '4' => 'หัวหน้างาน',
                '5' => 'ไม่มี',
            ),


        );    
        if (isset($code)){
            return isset($_items[$type][$code]) ? $_items[$type][$code] : false;
        }
        else{         
            return isset($_items[$type]) ? $_items[$type] : false;    
        }
        
    } 
    
    public function getItemPriority(){
        return self::itemsAlias('priority');
    }

    public function getPriorityname(){
        return ArrayHelper::getValue($this->getItemPriority(),$this->priority);
    }
    
   
 
}
