<?php


namespace dektrium\user\models;

use Yii;

/**
 * This is the model class for table "user_role".
 *
 * @property int $role_id
 * @property string $role_name สิทธิผู้ใช้งาน
 */
class UserRole extends \yii\db\ActiveRecord
{
    /**
     * @inheritdoc
     */
    public static function tableName()
    {
        return 'user_role';
    }

    /**
     * @inheritdoc
     */
    public function rules()
    {
        return [
            [['role_id'], 'required'],
            [['role_id'], 'integer'],
            [['role_name'], 'string', 'max' => 255],
            [['role_id'], 'unique'],
        ];
    }

    /**
     * @inheritdoc
     */
    
    
    public function getRole_desc(){
        return $this->role_id."-".$this->role_name;
    }
    
    public function attributeLabels()
    {
        return [
            'role_id' => 'Role ID',
            'role_name' => 'สิทธิผู้ใช้งาน',
        ];
    }
}
