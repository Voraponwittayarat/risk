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

use frontend\models\Riskstore;
use frontend\models\Levelwarning;
use frontend\models\Duration;
use frontend\models\Location;
use frontend\models\Department;
use frontend\models\Program;
use frontend\models\Level;
use frontend\models\Inform;
use frontend\models\Team;
use frontend\models\Member;

/**
 * This is the model class for table "riskregister".
 *
 * @property int $id ID_Riskregister
 * @property int $id_risk ID_Risk
 * @property string $date_report วันรายงาน
 * @property string $time_report เวลารายงาน
 * @property int $duration_id เวรที่เกิด
 * @property int $location_id สถานที่เกิดความเสี่ยง
 * @property string $user_ir_type ประเภทการรายงาน
 * @property int $user_ir แผนกที่รายงานถึง
 * @property int $program_id โปรแกรมความเสี่ยง
 * @property string $level_id ระดับความรุนแรง
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
 * @property string $department_id สังกัดแผนก
 * @property int $updated_by อับเดทโดย
 * @property string $create_date วันบันทึก
 * @property string $modify_date วันปรับปรุง
 * @property string $send_date วันที่นำเข้าข้อมูล
 * @property string $send_use ผู้ลงทะเบียน
 * @property string $register_date วันที่ตรวจสอบ
 * @property string $note Note
 * @property int $sendto_team_id ส่งให้ทีม
 * @property string $sendto_department_id ส่งให้แผนก
 * @property string $sendto_member_cid ส่งให้ผู้รับผิดชอบ
 */
class Riskregister extends \yii\db\ActiveRecord
{
    
    const DOC_PATH  = 'riskimage';
    public $foler_upload ='riskimage';
    
    public static function tableName()
    {
        return 'riskregister';
    }

    /**
     * @inheritdoc
     */
    public function rules()
    {
        return [
            [['id_risk','repeat_code','date_report', 'time_report', 'user_ir_type', 'level_id', 'riskstore_id', 'inform_id', 'department_id','register_date'], 'required'],
            [['id_risk', 'duration_id', 'location_id', 'user_ir', 'program_id', 'riskstore_id', 'inform_id', 'created_by', 'updated_by', 'sendto_team_id'], 'integer'],
            [['affected','date_report', 'time_report', 'create_date', 'modify_date', 'send_date'], 'safe'],
            [['detail', 'detail_hosxp', 'problem_basic','url','refer_type'], 'string'],
            [['user_ir_type'], 'string', 'max' => 50],
            [['level_id'], 'string', 'max' => 2],
            [['edit'], 'string', 'max' => 10],
            [['status_risk','link_key'], 'string', 'max' => 100],
            [['department_id', 'sendto_department_id','repeat_code'], 'string', 'max' => 3],
            [['send_use'], 'string', 'max' => 150],
            [['note'], 'string', 'max' => 255],
            [['sendto_member_cid'], 'string', 'max' => 13],
            [['image'], 'file',
              'skipOnEmpty' => true,
              'maxFiles' => 3,
              'extensions' => 'png,jpg,gif'
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
            'id' => 'ID_Regis',
            'id_risk' => 'ID_Risk',
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
            'image' => 'ภาพถ่าย',
            'inform_id' => 'ที่มาของรายงานความเสี่ยง',
            'status_risk' => 'สถานะความเสี่ยง',
            'created_by' => 'บันทึกโดย',
            'department_id' => 'สังกัดแผนก',
            'updated_by' => 'อับเดทโดย',
            'create_date' => 'วันบันทึก',
            'modify_date' => 'วันปรับปรุง',
            'send_date' => 'วันที่ลงทะเบียน',
            'send_use' => 'ผู้ลงทะเบียน',
            'register_date' => 'วันที่ตรวจสอบ',
            'note' => 'Note',
            'refer_type' =>'การส่งต่อ',
            'sendto_team_id' => 'ส่งให้ทีมนำ',
            'sendto_department_id' => 'ส่งให้หน่วยงาน',
            'sendto_member_cid' => 'ส่งให้CEO รพ.',
            'repeat_code' => 'ระดับการทบทวน',
            'link_key' => 'รหัสลิงค์สำหรับไลน์',
            'url' => 'ลิงค์',
            
        // เพิ่มฟิวล์ใหม่ จาก funtion get  relation
            'storename' => 'ชื่อความเสี่ยง',
            'repeatname' => 'ระดับการทบทวน',
            'durationname' => 'เวรที่เกิด',
            'locationname' => 'สถานที่พบเหตุ',
            'irtypename' => 'ประเภทการรายงาน',
            'departname' => 'แผนก',
            'programname' => 'โปรแกรมความเสี่ยง',
            'levelname' => 'ระดับความรุนแรง',
            'affectedname' => 'ผู้เสียหาย/ได้รับผลกระทบ',
            'irdepname' => 'แผนกที่รายงานถึง',
            'loginname' => 'รายงานโดย',
            'updatename' => 'อับเดทโดย',
            'teamname' => 'ส่งให้ทีมนำ',
            'sdepartname' => 'ส่งให้หน่วยงาน',
            'smembername'=> 'ส่งให้CEO รพ.',
            'informname' =>'ที่มาของรายงานความเสี่ยง',

        ];
    }

// get ชื่อความเสี่ยงจากระบบ 
    public function getRiskstore() {
        return @$this->hasOne(Riskstore::className(), ['riskstore_id' => 'riskstore_id']);
    }
    public function getStorename() {
        return @$this->riskstore->riskstore_name;
    }  

 // get ระดับการทบทวน
    public function getRepeat() {
        return @$this->hasOne(Levelwarning::className(), ['warning_code' => 'repeat_code']);
    }
    public function getRepeatname() {
        return @$this->repeat->warning_name;
  
    }
 // get ชื่อเวร 
    public function getDuration() {
        return @$this->hasOne(Duration::className(), ['id' => 'duration_id']);
    }
    public function getDurationname() {
        return @$this->duration->duration_name;
    }
 // get ชื่อสถานที่ 
    public function getLocation() {
        return @$this->hasOne(Location::className(), ['id' => 'location_id']);
    }
    public function getLocationname() {
        return @$this->location->name;
    } 

// get ชื่อแผนก  
    public function getDepart() {
        return @$this->hasOne(Department::className(), ['id' => 'department_id']);
    }

    public function getDepartname() {
        return @$this->depart->depart_name;
    }
    
// get รายงานถึงแผนก  
    public function getDepartir() {
        return @$this->hasOne(Department::className(), ['id' => 'user_ir']);
    }

    public function getDepartnameir() {
        return @$this->departir->depart_name;
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
    
 // get ที่มาของรายงาน 
    public function getInform() {
        return @$this->hasOne(Inform::className(), ['id' => 'inform_id']);
    }
    public function getInformname() {
        return @$this->inform->inform_name;
    }
    
// get แผนกที่รายงานถึง
    public function getIrdep() {
        return @$this->hasOne(Department::className(), ['id' => 'user_ir']);
    }
    public function getIrdepname() {
        return @$this->irdep->depart_name;
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

// get ชื่อทีมนำ ที่ส่งความเสี่ยงทบทวน  
    public function getTeam() {
        return @$this->hasOne(Team::className(), ['id' => 'sendto_team_id']);
    }
    public function getTeamname() {
        return @$this->team->team_name;
    }
    
// get ชื่อแผนกที่ส่งความเสี่ยงทบทวน  
    public function getSdepart() {
        return @$this->hasOne(Department::className(), ['id' => 'sendto_department_id']);
    }

    public function getSdepartname() {
        return @$this->sdepart->depart_name;
    }
    
// get ชื่อแผนกที่ส่งความเสี่ยงทบทวน  
    public function getSmember() {
        return @$this->hasOne(Member::className(), ['cid' => 'sendto_member_cid']);
    }
    public function getSmembername() {
        return @$this->smember->member_name;
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
            'retype' => array(
                '1' => 'ส่งต่อหน่วยงาน',
                '2' => 'ส่งต่อทีมนำ',
                '3' => 'ส่งต่อ CEO รพ.',
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
    
    public function getItemRetype(){
        return self::itemsAlias('retype');
    }

    public function getRetypename(){
        return ArrayHelper::getValue($this->getItemRetype(),$this->refer_type);
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
}
