<?php

namespace frontend\models;

use Yii;
use yii\helpers\Url;
use yii\db\Expression;
use yii\helpers\Html;
use yii\helpers\ArrayHelper;
use yii\behaviors\TimestampBehavior;
use yii\behaviors\BlameableBehavior;
use yii\behaviors\AttributeBehavior;
use \yii\db\ActiveRecord;
use yii\web\UploadedFile;

use dektrium\user\models\User;

use frontend\models\Duration;
use frontend\models\Department;
use frontend\models\Location;
use frontend\models\Program;
use frontend\models\Riskstore;
use frontend\models\Level;
use frontend\models\Member;
use frontend\models\Inform;


/**
 * This is the model class for table "risk".
 *
 * @property int $id
 * @property string $date_report วันรายงาน
 * @property string $time_report เวลารายงาน
 * @property int $duration_id เวรที่เกิด
 * @property int $location_id สถานที่เกิดความเสี่ยง
 * @property string $user_ir_type ประเภทผู้รายงานความเสี่ยง
 * @property int $user_ir ชื่อผู้รายงาน
 * @property int $program_id โปรแกรมความเสี่ยง
 * @property int $level_id ระดับความรุนแรง
 * @property int $riskstore_id ชื่อความเสี่ยง
 * @property string $detail เหตุการ/รายละเอียดเพิ่มเติม
 * @property string $detail_hosxp รายละเอียดข้อมูลคนไข้
 * @property string $affected ผู้เสียหาย/ได้รับผลกระทบ
 * @property string $edit การแก้ปัญหา
 * @property string $problem_basic วิธีแก้ปัญหาเบื้องต้น
 * @property string $image เอกสาร-ภาพประกอบ
 * @property int $inform_id ที่มาของรายงานความเสี่ยง
 * @property string $status_risk สถานะความเสี่ยง
 * @property int $created_by บันทึกโดย
 * @property int $updated_by อับเดทโดย
 * @property string $create_date วันบันทึก
 * @property string $modify_date วันปรับปรุง
 */
class Risk extends \yii\db\ActiveRecord
{
    const DOC_PATH  = 'riskimage';
    public $foler_upload ='riskimage';
    
    public static function tableName()
    {
        return 'risk';
    }

    /**
     * @inheritdoc
     */
    public function rules()
    {
        return [
            [['date_report', 'time_report','user_ir_type', 'level_id', 'riskstore_id', 'inform_id', 'location_id'], 'required'],
            [['date_report', 'time_report', 'create_date', 'modify_date'], 'safe'],
            [['duration_id', 'location_id', 'user_ir', 'program_id', 'riskstore_id', 'inform_id', 'created_by', 'updated_by'], 'integer'],
            [['user_ir_type','department_id','detail', 'detail_hosxp', 'problem_basic'], 'string'],
            [['edit'], 'string', 'max' => 10],
            [['level_id'], 'string', 'max' => 2],
            [['status_risk'], 'string', 'max' => 100],
            [['affected'], 'safe'],
            [['image'], 'file',
              'skipOnEmpty' => true,
              'maxFiles' => 3,
              'extensions' => 'png,jpg,jpeg,gif'
            ],
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
            [
                'class' => AttributeBehavior::className(),
                'attributes' => [
                    ActiveRecord::EVENT_BEFORE_INSERT => 'affected',
                    ActiveRecord::EVENT_BEFORE_UPDATE => 'affected',
                ],
                'value' => function ($event) {
                    return implode(',', $this->affected);
                },
            ],
        ];
    }
    /**
     * @inheritdoc
     */
    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'date_report' => 'วันรายงาน',
            'time_report' => 'เวลารายงาน',
            'duration_id' => 'เวรที่เกิด',
            'location_id' => 'สถานที่เกิดความเสี่ยง',
            'user_ir_type' => 'ประเภทการรายงาน',
            'user_ir' => 'แผนกที่รายงานถึง',
            'program_id' => 'โปรแกรมความเสี่ยง',
            'level_id' => 'ระดับความรุนแรง',
            'riskstore_id' => 'ชื่อความเสี่ยง',
            'detail' => 'เหตุการณ์/รายละเอียดเพิ่มเติม',
            'detail_hosxp' => 'รายละเอียดข้อมูลคนไข้',
            'affected' => 'ผู้เสียหาย/ได้รับผลกระทบ',
            'edit' => 'การแก้ปัญหา',
            'problem_basic' => 'วิธีแก้ปัญหาเบื้องต้น',
            'image' => 'รูปภาพ',
            'inform_id' => 'ที่มาของรายงาน',
            'status_risk' => 'สถานะความเสี่ยง',
            'created_by' => 'บันทึกโดย',
            'department_id' => 'สังกัดแผนก',
            'updated_by' => 'อับเดทโดย',
            'create_date' => 'วันบันทึก',
            'modify_date' => 'วันปรับปรุง',
            
        // เพิ่มฟิวล์ใหม่ จาก funtion get  relation
            'typename' => 'ประเภทความเสี่ยง',
            'durationname' => 'เวรที่เกิด',
            'programname' => 'โปรแกรมความเสี่ยง',
            'levelname' => 'ระดับความรุนแรง',
            'informname' => 'ที่มาของรายงาน',
            'locationname' => 'สถานที่พบเหตุ',
            'storename' => 'ชื่อความเสี่ยง',
            'departname' => 'แผนก',
            'irtypename' => 'ประเภทการรายงาน',
            'irdepname' => 'แผนกที่รายงานถึง',
            'affectedname' => 'ผู้เสียหาย/ได้รับผลกระทบ',
            'loginname' => 'รายงานโดย',
            'updatename' => 'อับเดทโดย',
        ];
    }
 
// get ชื่อแผนก  
    public function getDepart() {
        return @$this->hasOne(Department::className(), ['id' => 'department_id']);
    }

    public function getDepartname() {
        return @$this->depart->depart_name;
    }
    
 // get ชื่อเวร 
    public function getDuration() {
        return @$this->hasOne(Duration::className(), ['id' => 'duration_id']);
    }
    public function getDurationname() {
        return @$this->duration->duration_name;
    }
       
  // get ประเภทความเสี่ยง 
    public function getType() {
        return @$this->hasOne(Type::className(), ['id' => 'type_id']);
    }
    public function getTypename() {
        return @$this->type->name;
    }
    
 // get โปรแกรมความเสี่ยง 
    public function getProgram() {
        return @$this->hasOne(Program::className(), ['program_id' => 'program_id']);
    }
    public function getProgramname() {
        return @$this->program->program_name;
    }
    
// get ระดับความรุนแรง
    public function getLevel() {
        return @$this->hasOne(Level::className(), ['level_code' => 'level_id']);
    }
    public function getLevelname() {
        return @$this->level->level_name;
    }
    
 // get ชื่อสถานที่ 
    public function getLocation() {
        return @$this->hasOne(Location::className(), ['id' => 'location_id']);
    }
    public function getLocationname() {
        return @$this->location->name;
    } 
    
  // get ชื่อความเสี่ยงจากระบบ 
    public function getRiskstore() {
        return @$this->hasOne(Riskstore::className(), ['riskstore_id' => 'riskstore_id']);
    }
    public function getStorename() {
        return @$this->riskstore->riskstore_name;
    }   

// get แผนกที่รายงานถึง
    public function getIrdep() {
        return @$this->hasOne(Department::className(), ['id' => 'user_ir']);
    }
    public function getIrdepname() {
        return @$this->irdep->depart_name;
    }
    
 // get ที่มาของรายงาน 
    public function getInform() {
        return @$this->hasOne(Inform::className(), ['id' => 'inform_id']);
    }
    public function getInformname() {
        return @$this->inform->inform_name;
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
    
// funtion Part Upload file

    public function getUploadPath(){
      return Yii::getAlias('@webroot').'/'.$this->foler_upload.'/';
    }

    public function getUploadUrl(){
      return Yii::getAlias('@web').'/'.$this->foler_upload.'/';
    }

    public function getPhotoViewer(){
      return empty($this->files) ? Yii::getAlias('@web').'/images/none.png' : $this->getUploadUrl().$this->files;
    }

// funtion Multiple Upload file
    public function uploadMultiple($model,$attribute)
    {
      $image  = UploadedFile::getInstances($model, $attribute);
      $path = $this->getUploadPath();
      if ($this->validate() && $image !== null) {
          $filenames = [];
          foreach ($image as $file) {
                  $filename = md5($file->baseName.time()) . '.' . $file->extension;
                  if($file->saveAs($path . $filename)){
                    $filenames[] = $filename;
                  }
          }
          if($model->isNewRecord){
            return implode(',', $filenames);
          }else{
            return implode(',',(ArrayHelper::merge($filenames,$model->getOwnPhotosToArray())));
          }
      }

      return $model->isNewRecord ? false : $model->getOldAttribute($attribute);
    }

    public function getPhotosViewer(){
      $image = $this->image ? @explode(',',$this->image) : [];
      $img = '';
      foreach ($image as  $image) {
        $img.= ' '.Html::img($this->getUploadUrl().$image,['class'=>'img-thumbnail','style'=>'max-width:300px;']);
      }
      return $img;
    }

    public function getOwnPhotosToArray()
    {
      return $this->getOldAttribute('image') ? @explode(',',$this->getOldAttribute('image')) : [];
    }
 // funtion File Part ในการdownload
        public static function getFilesPath(){
        return Yii::getAlias('@webroot').'/'.self::DOC_PATH;
    }

    public static function getFilesUrl(){
        return Url::base(true).'/'.self::DOC_PATH;
    }
 //  สร้างรายการให้เลือก itemAlias  radioList  

    public static function itemAlias($type,$code=NULL) {
        $_items = array(
            'edit' => array(
                'ได้' => 'ได้',
                'ไม่ได้' => 'ไม่ได้',
            ),
            'irtype' => array(
                '1' => 'รายงานตนเอง',
                '2' => 'รายงานผู้อื่น',
            ),
            'affected'=>[
                'ผู้ป่วย' => 'ผู้ป่วย',
                'ญาติ' => 'ญาติ',
                'เจ้าหน้าที่' => 'เจ้าหน้าที่',
                'โรงพยาบาล' => 'โรงพยาบาล',
                'ชุมชน' => 'ชุมชน',
                'อื่นๆ' => 'อื่นๆ'
            ],

        );    
        if (isset($code)){
            return isset($_items[$type][$code]) ? $_items[$type][$code] : false;
        }
        else{         
            return isset($_items[$type]) ? $_items[$type] : false;    
        }
        
    } 
    
//แปลง string ในฟิวด์ skill เป็น array
    public function affectedToArray(){
        return $this->affected = explode(',', $this->affected);
    }
// ดึงค่า  จาก itemsAlias
    public function getItemAffected(){
        return self::itemsAlias('affected');
    } 
    public function getAffectedName(){
        $affected = $this->getItemAffected();
        $affectedSelected = explode(',', $this->affected);
        $affectedSelectedName = [];
        foreach ($affected as $key => $affectedName) {
          foreach ($affectedSelected as $affectedKey) {
            if($key === $affectedKey){
              $affectedSelectedName[] = $affectedName;
            }
          }
        }

        return implode(', ', $affectedSelectedName);
    }

    public function getItemIrtype(){
        return self::itemsAlias('irtype');
    }

    public function getIrtypename(){
        return ArrayHelper::getValue($this->getItemIrtype(),$this->user_ir_type);
    }

}

