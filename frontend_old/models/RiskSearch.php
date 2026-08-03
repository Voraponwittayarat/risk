<?php

namespace frontend\models;

use Yii;
use yii\base\Model;
use yii\data\ActiveDataProvider;
use frontend\models\Risk;

/**
 * RiskSearch represents the model behind the search form of `frontend\models\Risk`.
 */
class RiskSearch extends Risk
{
    /**
     * @inheritdoc
     */
    public function rules()
    {
        return [
            [['id', 'duration_id', 'location_id', 'user_ir', 'program_id', 'riskstore_id', 'inform_id', 'created_by', 'updated_by'], 'integer'],
            [['date_report', 'time_report', 'user_ir_type', 'detail', 'detail_hosxp', 'affected', 'level_id', 'edit', 'problem_basic', 'image', 'status_risk','department_id', 'create_date', 'modify_date'], 'safe'],
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
        $query = Risk::find();

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
            'id' => $this->id,
            'date_report' => $this->date_report,
            'time_report' => $this->time_report,
            'duration_id' => $this->duration_id,
            'location_id' => $this->location_id,
            'user_ir' => $this->user_ir,
            'program_id' => $this->program_id,
            'level_id' => $this->level_id,
            'riskstore_id' => $this->riskstore_id,
            'inform_id' => $this->inform_id,
            'status_risk', $this->status_risk,
            'created_by' => $this->created_by,
            'updated_by' => $this->updated_by,
            'create_date' => $this->create_date,
            'modify_date' => $this->modify_date,
        ]);

        $query->andFilterWhere(['like', 'user_ir_type', $this->user_ir_type])
            ->andFilterWhere(['like', 'detail', $this->detail])
            ->andFilterWhere(['like', 'detail_hosxp', $this->detail_hosxp])
            ->andFilterWhere(['like', 'affected', $this->affected])
            ->andFilterWhere(['like', 'edit', $this->edit])
            ->andFilterWhere(['like', 'problem_basic', $this->problem_basic])
            ->andFilterWhere(['like', 'image', $this->image])
            ->andFilterWhere(['like', 'status_risk', $this->status_risk])
            ->andFilterWhere(['in', 'department_id', $this->department_id])
            ->andFilterWhere(['like', 'date_report', $this->date_report])
            ->andFilterWhere(['like', 'time_report', $this->time_report])
            ->andFilterWhere(['like', 'level_id', $this->level_id]);

        return $dataProvider;
    }
}
