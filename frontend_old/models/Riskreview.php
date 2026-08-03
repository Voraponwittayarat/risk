<?php

namespace frontend\models;

use Yii;
use yii\helpers\Url;
use yii\db\Expression;
use yii\helpers\Html;
use yii\helpers\Json;
use yii\helpers\ArrayHelper;
use yii\behaviors\TimestampBehavior;
use yii\behaviors\BlameableBehavior;
use yii\behaviors\AttributeBehavior;
use \yii\db\ActiveRecord;
use yii\web\UploadedFile;

use dektrium\user\models\User;
use frontend\models\Reviewresults;
use frontend\models\Risk;
use frontend\models\Riskstore;


/**
 * This is the model class for table "riskreview".
 *
 * @property int $id
 * @property int $risk_id เลขความเสี่ยง
 * @property int $riskregister_id เลขทะเบียนความเสี่ยง
 * @property string $riskvisit เลขทบทวน
 * @property string $active ยืนยันการทบทวน
 * @property string $review_date ที่มาของรายงานความเสี่ยง
 * @property string $review_time สถานะความเสี่ยง
 * @property string $token_upload token_upload
 * @property string $files เอกสารแนบ
 * @property string $cause_problem สาเหตุของปัญหา 
 * @property string $notereview แนวทางปรับปรุงป้องกัน
 * @property int $reviewtype_id ประเภทการทบทวน
 * @property int $reviewresults_id ผลการทวบทวน
 * @property string $join_review ผู้ร่วมทบทวน
 * @property int $created_by บันทึกโดย
 * @property int $updated_by อับเดทโดย
 * @property string $create_date วันบันทึก
 * @property string $modify_date วันปรับปรุง
 */
//@property string $notereview บันทึกการทบทวน
class Riskreview extends \yii\db\ActiveRecord
{
  
    const DOC_PATH = 'riskfiles';
 
    public static function tableName()
    {
        return 'riskreview';
    }

    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            [['risk_id', 'riskregister_id', 'reviewresults_id','hits', 'count','created_by', 'updated_by'], 'integer'],
            [['riskvisit', 'review_date', 'notereview', 'reviewresults_id'], 'required'],
            [['review_cid','review_date', 'review_time', 'create_date', 'modify_date'], 'safe'],
            [['notereview'], 'string'],
            [['riskvisit'], 'string', 'max' => 14],
            [['discharge','repeat'], 'string', 'max' => 1],
            [['token_upload','status_risk'], 'string', 'max' => 100],
            [['files'], 'file'], //extensions' => 'cds,txt,sql'
            [['cause_problem'], 'safe'],
        ];
    }

    /**
     * {@inheritdoc}
     */
     public function behaviors() {
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
                    ActiveRecord::EVENT_BEFORE_INSERT => 'cause_problem',
                    ActiveRecord::EVENT_BEFORE_UPDATE => 'cause_problem',
                ],
                'value' => function ($event) {
                    return implode(',', $this->cause_problem);
                },
            ],

        ];
    }
    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'risk_id' => 'เลขความเสี่ยง',
            'riskregister_id' => 'เลขทะเบียนความเสี่ยง',
            'riskvisit' => 'เลขทบทวน',
            'review_date' => 'วันที่ทบทวน',
            'review_time' => 'เวลา',
            'token_upload' => 'token_upload',
            'files' => 'เอกสารแนบ',
            'hits' => 'จำนวนโหลด',
           //'notereview' => 'บันทึกการทบทวน',
           // 'n1'=>'1.ไม่ปฏิบัติตามมาตรฐานวิธีปฏิบัติที่มีอยู่',
          //  'n2'=>'2.ขาดความรู้และทักษะ',
          'cause_problem' =>'สาเหตุของปัญหา',//เพิ่มใหม่
          'cause_problem_name' =>'สาเหตุของปัญหา',//เพิ่มใหม่
            'notereview' => 'แนวทางปรับปรุงป้องกัน',
            'reviewresults_id' => 'ผลการทวบทวน',
            'review_cid' => 'ผู้ร่วมทบทวน',
            'repeat' => 'ทบทวนซ้ำ',
            'discharge' => 'จำหน่าย',
            'status_risk' => 'สถานะ',
            'count' =>'จำนวนทบทวน',
            'created_by' => 'บันทึกโดย',
            'updated_by' => 'อับเดทโดย',
            'create_date' => 'วันบันทึก',
            'modify_date' => 'วันปรับปรุง',
            
        // เพิ่มฟิวล์ใหม่ จาก funtion get  relation    
            'loginname' => 'ชื่อผู้บันทึก',
            'updatename' => 'ชื่อผู้ทบทวน',
            'reviewresultsname' => 'ผลการทวบทวน',
           // 'viewusename' => 'ผู้ร่วมทบทวน',
            'download' => ''
        ];
    }
    
// Array to string conversion    By พี่ไอน้ำ
    public function getArray($value)
    {
        return explode(',', $value);
    }

    public function setToArray($value)
    {   
        return is_array($value)?implode(',', $value):NULL;
    }

    public function beforeSave($insert)
    {
        if (parent::beforeSave($insert)) {
            if(!empty($this->review_cid)){
                $this->review_cid = $this->setToArray($this->review_cid);                
            }
            return true;
        } else {
            return false;
        }
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

// get ผลการทวบทวน
    public function getReviewresults() {
        return @$this->hasOne(Reviewresults::className(), ['id' => 'reviewresults_id']);
    }

    public function getReviewresultsname() {
        return @$this->reviewresults->reviewresults_name;
    }
    
// get ผู้ร่วมทบทวน
        public function getViewuse() {
        return @$this->hasOne(Member::className(), ['cid' => 'review_cid']);
    }

    public function getViewusename() {
        return @$this->viewuse->member_name;
    }

// Function upload files.

    public static function getDocPath() {
        return Yii::getAlias('@webroot') . '/' . self::DOC_PATH;
    }

    public static function getDocUrl() {
        return Url::base(true) . '/' . self::DOC_PATH;
    }
//เพิ่มในส่วนของสาเหตุของปัญหา
    public static function itemAlias($type,$code=NULL) {
        $_items = array(
            'cause_problem' => [
                '1.ไม่ปฏิบัติตามมาตรฐาน/วิธีปฏิบัติที่มีอยู่' => '1.ไม่ปฏิบัติตามมาตรฐาน/วิธีปฏิบัติที่มีอยู่',
                '2.ขาดความรู้และทักษะ' => '2.ขาดความรู้และทักษะ',
                '3.เหนื่อยล้าจากการทำงาน' => '3.เหนื่อยล้าจากการทำงาน',
                '4.จัดลำดับความสำคัญของงานผิดพลาด' => '4.จัดลำดับความสำคัญของงานผิดพลาด',
                '5.มีงานอื่นที่เร่งด่วน' => '5.มีงานอื่นที่เร่งด่วน',
                '6.ภาระงานมาก' => '6.ภาระงานมาก',
                '7.ปัญหาเนื่องจากสภาพทางกายและใจ' => '7.ปัญหาเนื่องจากสภาพทางกายและใจ',
                '8.ขาดการบันทึกข้อมูลส่งต่อที่สำคัญ' => '8.ขาดการบันทึกข้อมูลส่งต่อที่สำคัญ',
                '9.ขาดการสื่อสารข้อมูลที่สำคัญ' => '9.ขาดการสื่อสารข้อมูลที่สำคัญ',
                '10.ผู้ป่วยไม่เข้าใจการสื่อสารของเจ้าหน้าที่' => '10.ผู้ป่วยไม่เข้าใจการสื่อสารของเจ้าหน้าที่',
                '11.ความรุนแรงและซับซ้อนของโรคผู้ป่วย' => '11.ความรุนแรงและซับซ้อนของโรคผู้ป่วย',
                '12.เครื่องมือ อุปกรณ์ ไม่มีระบบสัญญาณเตือนอันตราย' => '12.เครื่องมือ อุปกรณ์ ไม่มีระบบสัญญาณเตือนอันตราย',
                '13.ตรวจสอบเครื่องมือไม่พร้อม' => '13.ตรวจสอบเครื่องมือไม่พร้อม',
                '14.ประมาทเลินเล่อ' => '14.ประมาทเลินเล่อ',
                '15.ขาดการสื่อสารแนวทางปฏิบัติ/การดูแล' => '15.ขาดการสื่อสารแนวทางปฏิบัติ/การดูแล',
                '16.ขาดการสนับสนุนทรัพยาการที่จำเป็น' => '16.ขาดการสนับสนุนทรัพยาการที่จำเป็น',
                '17.อื่นๆ' => '17.อื่นๆ',

            ]
        );
        if (isset($code)){
            return isset($_items[$type][$code]) ? $_items[$type][$code] : false;
        }
        else{         
            return isset($_items[$type]) ? $_items[$type] : false;    
        } 
    }
    public function causeProblemToArray(){
        return $this->cause_problem = explode(',', $this->cause_problem);
    }
    public function getItemCauseProblem(){
        return self::itemsAlias('cause_problem');
    } 
    public function getCauseProblemName(){
        $cause_problem = $this->getItemCauseProblem();
        $cause_problem_selected = explode(',', $this->cause_problem);
        $cause_problem_selected_name = [];
        foreach ($cause_problem as $key => $cause_problem_name) {
          foreach ($cause_problem_selected as $cause_problem_key) {
            if($key === $cause_problem_key){
              $cause_problem_selected_name[] = $cause_problem_name;
            }
          }
        }

        return implode(', ', $cause_problem_selected_name);
    }

}
