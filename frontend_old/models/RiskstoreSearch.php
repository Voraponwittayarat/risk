<?php

namespace frontend\models;

use Yii;
use yii\base\Model;
use yii\data\ActiveDataProvider;
use frontend\models\Riskstore;

/**
 * RiskstoreSearch represents the model behind the search form of `frontend\models\Riskstore`.
 */
class RiskstoreSearch extends Riskstore
{
    /**
     * @inheritdoc
     */
    public function rules()
    {
        return [
            [['riskstore_id', 'type_id', 'program_id', 'level_id', 'group_id', 'team_id', 'created_by', 'updated_by'], 'integer'],
            [['riskstore_name', 'create_date', 'modify_date'], 'safe'],
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
        $query = Riskstore::find();

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
            'riskstore_id' => $this->riskstore_id,
            //'type_id' => $this->type_id,
            'program_id' => $this->program_id,
            'level_id' => $this->level_id,
            'group_id' => $this->group_id,
            'team_id' => $this->team_id,
            'create_date' => $this->create_date,
            'modify_date' => $this->modify_date,
            'created_by' => $this->created_by,
            'updated_by' => $this->updated_by,
        ]);

        $query->andFilterWhere(['like', 'riskstore_name', $this->riskstore_name]);

        return $dataProvider;
    }
}
