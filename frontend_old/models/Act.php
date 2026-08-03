<?php

namespace frontend\models;

use Yii;

/**
 * This is the model class for table "act".
 *
 * @property int $id
 * @property string $act_name เชิงรับ/เชิงรุก
 */
class Act extends \yii\db\ActiveRecord
{
    /**
     * @inheritdoc
     */
    public static function tableName()
    {
        return 'act';
    }

    /**
     * @inheritdoc
     */
    public function rules()
    {
        return [
            [['act_name'], 'required'],
            [['act_name'], 'string', 'max' => 100],
        ];
    }

    /**
     * @inheritdoc
     */
    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'act_name' => 'เชิงรับ/เชิงรุก',
        ];
    }
}
