<?php

namespace frontend\models;

use Yii;
use yii\base\Model;
use yii\data\ActiveDataProvider;
use frontend\models\Riskregister;

/**
 * RiskregisterSearch represents the model behind the search form of `frontend\models\Riskregister`.
 */
class RiskregisterSearch extends Riskregister
{
    /**
     * @inheritdoc
     */
    public function rules()
    {
        return [
            [['id', 'id_risk', 'duration_id', 'location_id', 'user_ir', 'program_id', 'riskstore_id', 'inform_id', 'created_by', 'updated_by', 'sendto_team_id'], 'integer'],
            [['date_report', 'time_report', 'user_ir_type', 'level_id', 'detail', 'detail_hosxp', 'affected', 'edit', 'problem_basic', 'image', 'status_risk', 'department_id', 'create_date', 'modify_date', 'send_date', 'send_use', 'register_date', 'note', 'sendto_department_id', 'sendto_member_cid','repeat_code','url'], 'safe'],
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
        $query = Riskregister::find();

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
            'id_risk' => $this->id_risk,
            'date_report' => $this->date_report,
            'time_report' => $this->time_report,
            'duration_id' => $this->duration_id,
            'location_id' => $this->location_id,
            'user_ir' => $this->user_ir,
            'program_id' => $this->program_id,
            'riskstore_id' => $this->riskstore_id,
            'inform_id' => $this->inform_id,
            'created_by' => $this->created_by,
            'updated_by' => $this->updated_by,
            'create_date' => $this->create_date,
            'modify_date' => $this->modify_date,
            'send_date' => $this->send_date,
            'register_date' => $this->register_date,
            'sendto_department_id' => $this->sendto_department_id,
            'sendto_team_id' => $this->sendto_team_id,
            'repeat_code' => $this->repeat_code,
        ]);

        $query->andFilterWhere(['like', 'user_ir_type', $this->user_ir_type])
            ->andFilterWhere(['like', 'level_id', $this->level_id])
            ->andFilterWhere(['like', 'detail', $this->detail])
            ->andFilterWhere(['like', 'detail_hosxp', $this->detail_hosxp])
            ->andFilterWhere(['like', 'affected', $this->affected])
            ->andFilterWhere(['like', 'edit', $this->edit])
            ->andFilterWhere(['like', 'problem_basic', $this->problem_basic])
            ->andFilterWhere(['like', 'image', $this->image])
            ->andFilterWhere(['like', 'status_risk', $this->status_risk])
            ->andFilterWhere(['in', 'department_id', $this->department_id])
            ->andFilterWhere(['like', 'send_use', $this->send_use])
            ->andFilterWhere(['like', 'note', $this->note])
            ->andFilterWhere(['like', 'sendto_department_id', $this->sendto_department_id])
            ->andFilterWhere(['like', 'sendto_member_cid', $this->sendto_member_cid])
            ->andFilterWhere(['like', 'repeat_code', $this->repeat_code]);
        return $dataProvider;
    }
}
