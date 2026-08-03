<?php

namespace frontend\models;

use Yii;
use yii\base\Model;
use yii\data\ActiveDataProvider;
use frontend\models\Level;

/**
 * LevelSearch represents the model behind the search form of `frontend\models\Level`.
 */
class LevelSearch extends Level
{
    /**
     * @inheritdoc
     */
    public function rules()
    {
        return [
            [['level_id', 'level_warning_code','created_by', 'updated_by'], 'integer'],
            [['level_code', 'level_name', 'url_pic', 'create_date', 'modify_date'], 'safe'],
        ];
    }

    /**
     * @inheritdoc
     */
    public function scenarios()
    {
        // bypass scenarios() implementation in the parent class
        return Model::scenarios();
    }

    /**
     * Creates data provider instance with search query applied
     *
     * @param array $params
     *
     * @return ActiveDataProvider
     */
    public function search($params)
    {
        $query = Level::find();

        // add conditions that should always apply here

        $dataProvider = new ActiveDataProvider([
            'query' => $query,
        ]);

        $this->load($params);

        if (!$this->validate()) {
            // uncomment the following line if you do not want to return any records when validation fails
            // $query->where('0=1');
            return $dataProvider;
        }

        // grid filtering conditions
        $query->andFilterWhere([
            'level_id' => $this->level_id,
            'level_warning_code' => $this->level_warning_code,
            'create_date' => $this->create_date,
            'modify_date' => $this->modify_date,
            'created_by' => $this->created_by,
            'updated_by' => $this->updated_by,
        ]);

        $query->andFilterWhere(['like', 'level_code', $this->level_code])
            ->andFilterWhere(['like', 'level_name', $this->level_name])
            ->andFilterWhere(['like', 'url_pic', $this->url_pic]);

        return $dataProvider;
    }
}
