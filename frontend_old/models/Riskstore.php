<?php

namespace frontend\models;

use Yii;
use yii\helpers\ArrayHelper;
use yii\db\Expression;
use yii\behaviors\TimestampBehavior;
use yii\behaviors\BlameableBehavior;

use frontend\models\Type;
use frontend\models\Riskgroup;
use frontend\models\Level;
use frontend\models\Program;
use frontend\models\Team;
use frontend\models\Member;
use frontend\models\Inform;

use dektrium\user\models\User;

/**
 * This is the model class for table "riskstore".
 *
 * @property int $id
 * @property string $name ชื่อความเสี่ยง
 * @property int $type_id ประเภทความเสี่ยง
 * @property int $program_id โปรแกรมความเสี่ยง
 * @property int $level_id ระดับความรุนแรง
 * @property int $group_id กลุ่มความเสี่ยง
 * @property int $team_id ทีม
 * @property string $create_date วันบันทึก
 * @property string $modify_date วันปรับปรุง
 * @property int $created_by บันทึกโดย
 * @property int $updated_by อับเดทโดย
 */
class Riskstore extends \yii\db\ActiveRecord
{
    /**
     * @inheritdoc
     */
    public static function tableName()
    {
        return 'riskstore';
    }

    /**
     * @inheritdoc
     */
    public function rules()
    {
        return [
            [['riskstore_name'], 'required'],
            [['type_id', 'program_id', 'level_id', 'group_id', 'team_id','member_cid', 'inform_id','created_by', 'updated_by'], 'integer'],
            [['create_date', 'modify_date'], 'safe'],
            [['riskstore_name'], 'string', 'max' => 200],
            [['status'], 'string', 'max' => 1],
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
            'riskstore_id' => 'ID',
            'riskstore_name' => 'ชื่อความเสี่ยง',
            'inform_id' => 'ที่มาของความเสี่ยง',
            'type_id' => 'ประเภทความเสี่ยง',
            'program_id' => 'โปรแกรมความเสี่ยง',
            'level_id' => 'ระดับความรุนแรง',
            'group_id' => 'กลุ่มความเสี่ยง',
            'team_id' => 'ทีมนำ',
            'member_cid' => 'ผู้รับผิดชอบความเสี่ยง',
            'status' => 'สถานะ',
            'create_date' => 'วันบันทึก',
            'modify_date' => 'วันปรับปรุง',
            'created_by' => 'บันทึกโดย',
            'updated_by' => 'อับเดทโดย',
        // เพิ่มฟิวล์ใหม่ จาก funtion get  relation  
            'loginname' => 'ผู้บันทึก',
            'updatename' => 'ผู้อับเดท',
            
        // เพิ่มฟิวล์ใหม่ จาก funtion get  relation  
            'informname' => 'ที่มาของความเสี่ยง',
            'typename' => 'ประเภทความเสี่ยง',
            'groupname' => 'กลุ่มความเสี่ยง',
            'programname' => 'โปรแกรมความเสี่ยง',
            'levelcode' => 'ระดับ',
            'levelname' => 'ระดับความรุนแรง',
            'teamname' => 'ทีมนำ',
            'ownername' => 'ผู้รับผิดชอบความเสี่ยง',
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
    
 // get ที่มาของความเสี่ยง
        public function getInform() {
        return @$this->hasOne(Inform::className(), ['id' => 'inform_id']);
    }

    public function getInformname() {
        return @$this->inform->inform_name;
    }
    
// get ประเภทความเสี่ยง
        public function getType() {
        return @$this->hasOne(Type::className(), ['id' => 'type_id']);
    }

    public function getTypename() {
        return @$this->type->name;
    }
    
// get กลุ่มความเสี่ยง
        public function getRiskgroup() {
        return @$this->hasOne(Riskgroup::className(), ['id' => 'group_id']);
    }

    public function getGroupname() {
        return @$this->riskgroup->name;
    }
    
// get โปรแกรมความเสี่ยง
    public function getProgram() {
        return @$this->hasOne(Program::className(), ['program_id' => 'program_id']);
    }

    public function getProgramname() {
        return @$this->program->program_name;
    }
    
// get ระดับความเสี่ยง
        public function getLevel() {
        return @$this->hasOne(Level::className(), ['level_id' => 'level_id']);
    }
    
    public function getLevelcode() {
        return @$this->level->level_code;
    }
    
    public function getLevelname() {
        return @$this->level->level_name;
    }
    
// get ชื่อทีมนำ
        public function getTeam() {
        return @$this->hasOne(Team::className(), ['id' => 'team_id']);
    }

    public function getTeamname() {
        return @$this->team->team_name;
    }
    
// get ผู้รับผิดชอบความเสี่ยง
        public function getOwner() {
        return @$this->hasOne(Member::className(), ['cid' => 'member_cid']);
    }

    public function getOwnername() {
        return @$this->owner->member_name;
    }
    
     public static function GetListName(){
        return ArrayHelper::map(self::find()->all(), 'riskstore_id', 'riskstore_name');
    } 
}

