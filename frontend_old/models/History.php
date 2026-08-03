<?php

namespace frontend\models;

use Yii;

/**
 * This is the model class for table "history".
 *
 * @property int $id
 * @property string $datetime วันบันทึก
 * @property string $change รายการที่เปลี่ยน
 * @property string $detail รายละเอียด
 */
class History extends \yii\db\ActiveRecord
{
    /**
     * @inheritdoc
     */
    public static function tableName()
    {
        return 'history';
    }

    /**
     * @inheritdoc
     */
    public function rules()
    {
        return [
            [['datetime'], 'safe'],
            [['detail'], 'required'],
            [['change', 'detail'], 'string', 'max' => 255],
        ];
    }

    /**
     * @inheritdoc
     */
    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'datetime' => 'วันบันทึก',
            'change' => 'รายการที่เปลี่ยน',
            'detail' => 'รายละเอียด',
        ];
    }
}
