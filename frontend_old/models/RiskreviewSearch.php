<?php

namespace frontend\models;

use Yii;
use yii\base\Model;
use yii\data\ActiveDataProvider;
use frontend\models\Riskreview;

/**
 * RiskreviewSearch represents the model behind the search form of `frontend\models\Riskreview`.
 */
class RiskreviewSearch extends Riskreview
{
    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            [['id', 'risk_id', 'riskregister_id', 'reviewresults_id', 'created_by', 'updated_by'], 'integer'],
            [['riskvisit', 'discharge','repeat', 'status_risk','review_date', 'review_time', 'token_upload', 'files', 'notereview', 'review_cid', 'create_date', 'modify_date'], 'safe'],
        ];
    }

    /**
     * {@inheritdoc}
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
        $query = Riskreview::find();

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
            'risk_id' => $this->risk_id,
            'riskregister_id' => $this->riskregister_id,
            'riskvisit' => $this->riskvisit,
            'review_date' => $this->review_date,
            'repeat' => $this->repeat,
            'status_risk' => $this->status_risk,
            'review_time' => $this->review_time,
            'reviewresults_id' => $this->reviewresults_id,
            'created_by' => $this->created_by,
            'updated_by' => $this->updated_by,
            'create_date' => $this->create_date,
            'modify_date' => $this->modify_date,
        ]);

        $query->andFilterWhere(['like', 'riskvisit', $this->riskvisit])
            ->andFilterWhere(['like', 'repeat', $this->repeat])
            ->andFilterWhere(['like', 'discharge', $this->discharge])
            ->andFilterWhere(['like', 'status_risk', $this->status_risk])
            ->andFilterWhere(['like', 'token_upload', $this->token_upload])
            ->andFilterWhere(['like', 'files', $this->files])
            ->andFilterWhere(['like', 'notereview', $this->notereview])
            ->andFilterWhere(['like', 'review_cid', $this->review_cid]);

        return $dataProvider;
    }
}
