<?php

namespace frontend\models;

use Yii;
use yii\base\Model;
use yii\data\ActiveDataProvider;
use frontend\models\Program;

/**
 * ProgramSearch represents the model behind the search form of `frontend\models\Program`.
 */
class ProgramSearch extends Program
{
    /**
     * @inheritdoc
     */
    public function rules()
    {
        return [
            [['program_id', 'type_id', 'created_by', 'updated_by'], 'integer'],
            [['program_name', 'create_date', 'modify_date'], 'safe'],
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
        $query = Program::find();

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
            'program_id' => $this->program_id,
            'type_id' => $this->type_id,
            'create_date' => $this->create_date,
            'modify_date' => $this->modify_date,
            'created_by' => $this->created_by,
            'updated_by' => $this->updated_by,
        ]);

        $query->andFilterWhere(['like', 'program_name', $this->program_name]);

        return $dataProvider;
    }
}
