<?php
namespace frontend\controllers;

use Yii;
use yii\base\InvalidParamException;
use yii\web\BadRequestHttpException;
use yii\web\Controller;
use yii\filters\VerbFilter;
use yii\filters\AccessControl;
use common\models\LoginForm;

use frontend\models\PasswordResetRequestForm;
use frontend\models\ResetPasswordForm;
use frontend\models\SignupForm;
use frontend\models\ContactForm;

/**
 * Site controller
 */
class SiteController extends Controller
{
    /**
     * @inheritdoc
     */
    public function behaviors()
    {
        return [
            'access' => [
                'class' => AccessControl::className(),
                'only' => ['logout', 'signup'],
                'rules' => [
                    [
                        'actions' => ['signup'],
                        'allow' => true,
                        'roles' => ['?'],
                    ],
                    [
                        'actions' => ['logout'],
                        'allow' => true,
                        'roles' => ['@'],
                    ],
                ],
            ],
            'verbs' => [
                'class' => VerbFilter::className(),
                'actions' => [
                    'logout' => ['post'],
                ],
            ],
        ];
    }

    /**
     * @inheritdoc
     */
    public function actions()
    {
        return [
            'error' => [
                'class' => 'yii\web\ErrorAction',
            ],
            'captcha' => [
                'class' => 'yii\captcha\CaptchaAction',
                'fixedVerifyCode' => YII_ENV_TEST ? 'testme' : null,
            ],
        ];
    }

    /**
     * Displays homepage.
     *
     * @return mixed
     */
    public function actionIndex()
    {
        $sql_date = Yii::$app->db->createCommand('SELECT date FROM set_datetime')->queryOne();
        $date1 =  $sql_date['date'];
        $date2 = date('Y-m-d');
        
        $a_year = Yii::$app->db->createCommand('SELECT YEAR(date)+543 AS d FROM set_datetime LIMIT 1')->queryScalar();
        $b_year=$a_year+1;
        
          if (!Yii::$app->user->isGuest) {
              
                $ir= Yii::$app->user->identity->id;
                
                $cid_d= Yii::$app->user->identity->cid;
                
                if (Yii::$app->user->identity->role == 99) {
                    return $this->render('/site/warning'); 
                } 
                    $sql_dep1 = Yii::$app->db->createCommand("SELECT department_id1 FROM member  WHERE cid='$cid_d'")->queryOne();
                    $dep_id1 = $sql_dep1['department_id1'];
                
                $sql_te = Yii::$app->db->createCommand("SELECT IFNULL(team_id,0) AS team_id FROM member  WHERE cid='$cid_d'")->queryOne();
                $te_id =  $sql_te['team_id'];
        
                $use = "SELECT COUNT(id) AS cc,status_risk FROM riskregister WHERE register_date BETWEEN '$date1' AND '$date2' AND sendto_member_cid=$cid_d AND  status_risk ='ตรวจสอบ' ";
                $dep1 = "SELECT COUNT(id) AS cc,status_risk FROM riskregister WHERE register_date BETWEEN '$date1' AND '$date2' AND sendto_department_id=$dep_id1 AND  status_risk ='ตรวจสอบ' ";
                $team = "SELECT COUNT(id) AS cc,status_risk FROM riskregister WHERE register_date BETWEEN '$date1' AND '$date2' AND sendto_team_id=$te_id AND  status_risk ='ตรวจสอบ' ";
                $all = "SELECT COUNT(id) AS cc FROM riskregister WHERE date_report BETWEEN '$date1' AND '$date2' AND created_by=$ir ";
                $status = "SELECT 'สถานะรายงาน' AS st,COUNT(id) AS c
                           FROM riskregister
                           WHERE date_report BETWEEN '$date1' AND '$date2'
                           AND created_by=$ir AND status_risk='รายงาน'

                           UNION
                           SELECT 'สถานะตรวจสอบ' AS st,COUNT(id) AS c
                           FROM riskregister
                           WHERE register_date BETWEEN '$date1' AND '$date2'
                           AND created_by=$ir AND status_risk='ตรวจสอบ'

                           UNION
                           SELECT 'สถานะทบทวน' AS st,COUNT(id) AS c
                           FROM riskregister
                           WHERE register_date BETWEEN '$date1' AND '$date2'
                           AND created_by=$ir AND status_risk='ทบทวน'

                           UNION
                           SELECT 'สถานะจำหน่าย' AS st,COUNT(id) AS c
                           FROM riskregister
                           WHERE register_date BETWEEN '$date1' AND '$date2'
                           AND created_by=$ir AND status_risk='จำหน่าย'";
                
                $m_ir = "SELECT 'ต.ค.' AS m,COUNT(id) AS cc
                        FROM tmp_riskregister
                        WHERE m='10'  AND created_by=$ir

                        UNION
                        SELECT 'พ.ย.' AS m,COUNT(id) AS cc
                        FROM tmp_riskregister
                        WHERE m='11'  AND created_by=$ir

                        UNION
                        SELECT 'ธ.ค.' AS m,COUNT(id) AS cc
                        FROM tmp_riskregister
                        WHERE m='12'  AND created_by=$ir

                        UNION
                        SELECT 'ม.ค.' AS m,COUNT(id) AS cc
                        FROM tmp_riskregister
                        WHERE m='1'  AND created_by=$ir

                        UNION
                        SELECT 'ก.พ.' AS m,COUNT(id) AS cc
                        FROM tmp_riskregister
                        WHERE m='2'  AND created_by=$ir 

                        UNION
                        SELECT 'มี.ค.' AS m,COUNT(id) AS cc
                        FROM tmp_riskregister
                        WHERE m='3'  AND created_by=$ir

                        UNION
                        SELECT 'เม.ย.' AS m,COUNT(id) AS cc
                        FROM tmp_riskregister
                        WHERE m='4'  AND created_by=$ir 

                        UNION
                        SELECT 'พ.ค.' AS m,COUNT(id) AS cc
                        FROM tmp_riskregister
                        WHERE m='5'  AND created_by=$ir

                        UNION
                        SELECT 'มิ.ย.' AS m,COUNT(id) AS cc
                        FROM tmp_riskregister
                        WHERE m='6'  AND created_by=$ir

                        UNION
                        SELECT 'ก.ค.' AS m,COUNT(id) AS cc
                        FROM tmp_riskregister
                        WHERE m='7'  AND created_by=$ir

                        UNION
                        SELECT 'ส.ค.' AS m,COUNT(id) AS cc
                        FROM tmp_riskregister
                        WHERE m='8'  AND created_by=$ir

                        UNION
                        SELECT 'ก.ย.' AS m,COUNT(id) AS cc
                        FROM tmp_riskregister
                        WHERE m='9'  AND created_by=$ir ";
                
                
                
                $touse= Yii::$app->db->createCommand($use)->queryAll();
                $todep1= Yii::$app->db->createCommand($dep1)->queryAll();
                $toteam= Yii::$app->db->createCommand($team)->queryAll();
                $toall= Yii::$app->db->createCommand($all)->queryAll();
                
                $risk_st= Yii::$app->db->createCommand($status)->queryAll();
                $mrisk= Yii::$app->db->createCommand($m_ir)->queryAll();
   
                return $this->render('index',[
                        'date1' => $date1,
                        'date2' => $date2,
                        'b_year' => $b_year,
                        'user_ir' => $ir,
                        'touse' => $touse,
                        'todep1' => $todep1,
                        'toteam' => $toteam,
                        'toall' => $toall,
                        'risk_st' => $risk_st,
                        'mrisk' => $mrisk,
                        ]);

          } else {
                $dep_notre = "SELECT COUNT(id_risk) AS cc
                                FROM riskregister
                                WHERE register_date BETWEEN '$date1' AND '$date2'
                                AND sendto_department_id<>''
                                AND id_risk NOT IN (SELECT risk_id FROM riskreview) ";
                $team_notre = "SELECT COUNT(id_risk) AS cc
                                FROM riskregister
                                WHERE register_date BETWEEN '$date1' AND '$date2'
                                AND sendto_team_id<>''
                                AND id_risk NOT IN (SELECT risk_id FROM riskreview) ";
                $ceo_notre = "SELECT COUNT(id_risk) AS cc
                                FROM riskregister
                                WHERE register_date BETWEEN '$date1' AND '$date2'
                                AND sendto_member_cid<>''
                                AND id_risk NOT IN (SELECT risk_id FROM riskreview) ";
               

                $status = "SELECT 'สถานะรายงาน' AS st,COUNT(id) AS c
                           FROM riskregister
                           WHERE  date_report BETWEEN '$date1' AND '$date2'
                           AND status_risk='รายงาน'

                           UNION
                           SELECT 'สถานะตรวจสอบ' AS st,COUNT(id) AS c
                           FROM riskregister
                           WHERE  register_date BETWEEN '$date1' AND '$date2'
                           AND status_risk='ตรวจสอบ'

                           UNION
                           SELECT 'สถานะทบทวน' AS st,COUNT(id) AS c
                           FROM riskregister
                           WHERE register_date BETWEEN '$date1' AND '$date2'
                           AND status_risk='ทบทวน'

                           UNION
                           SELECT 'สถานะจำหน่าย' AS st,COUNT(id) AS c
                           FROM riskregister
                           WHERE register_date BETWEEN '$date1' AND '$date2'
                           AND status_risk='จำหน่าย'";
                
                $userall = "SELECT COUNT(id) AS cc_user FROM `user` WHERE role<>99";
                $useronline = "SELECT COUNT(DISTINCT user_id) AS cc_online FROM session_frontend_user WHERE user_id<>''";
                $c_user= "SELECT u.username,COUNT(s.id) AS cc
                        FROM session_frontend_user s
                        INNER JOIN `user` u ON u.id=s.user_id
                        WHERE s.user_id<>''
                        GROUP BY s.user_id
                        ORDER BY cc DESC
                        LIMIT 10 ";
                $s_dep= "SELECT d.depart_name,COUNT(id_risk) AS cc
                        FROM riskregister g
                        LEFT JOIN department d ON d.id=g.department_id
                        WHERE g.date_report BETWEEN '$date1' AND '$date2'
                        GROUP BY g.department_id ";
                $s_level= "SELECT 'A' AS level_name,COUNT(id_risk)  AS cc      
                        FROM riskregister 
                        WHERE  date_report BETWEEN '$date1' AND '$date2'
                        AND level_id='A'

                        UNION

                        SELECT 'B' AS level_name,COUNT(id_risk)  AS cc      
                        FROM riskregister 
                        WHERE  date_report BETWEEN '$date1' AND '$date2'
                        AND level_id='B'

                        UNION

                        SELECT 'C' AS level_name,COUNT(id_risk)  AS cc      
                        FROM riskregister 
                        WHERE  date_report BETWEEN '$date1' AND '$date2'
                        AND level_id='C'

                        UNION

                        SELECT 'D' AS level_name,COUNT(id_risk)  AS cc      
                        FROM riskregister 
                        WHERE  date_report BETWEEN '$date1' AND '$date2'
                        AND level_id='D'

                        UNION

                        SELECT 'E' AS level_name,COUNT(id_risk)  AS cc      
                        FROM riskregister 
                        WHERE  date_report BETWEEN '$date1' AND '$date2'
                        AND level_id='E'

                        UNION

                        SELECT 'F' AS level_name,COUNT(id_risk)  AS cc      
                        FROM riskregister 
                        WHERE  date_report BETWEEN '$date1' AND '$date2'
                        AND level_id='F'

                        UNION

                        SELECT 'G' AS level_name,COUNT(id_risk)  AS cc      
                        FROM riskregister 
                        WHERE  date_report  BETWEEN '$date1' AND '$date2'
                        AND level_id='G'

                        UNION

                        SELECT 'H' AS level_name,COUNT(id_risk)  AS cc      
                        FROM riskregister 
                        WHERE  date_report BETWEEN '$date1' AND '$date2'
                        AND level_id='H'

                        UNION

                        SELECT 'I' AS level_name,COUNT(id_risk)  AS cc      
                        FROM riskregister 
                        WHERE  date_report BETWEEN '$date1' AND '$date2'
                        AND level_id='I' 

                        UNION

                        SELECT '1' AS level_name,COUNT(id_risk)  AS cc      
                        FROM riskregister 
                        WHERE  date_report BETWEEN '$date1' AND '$date2'
                        AND level_id='1'
                        UNION

                        SELECT '2' AS level_name,COUNT(id_risk)  AS cc      
                        FROM riskregister 
                        WHERE  date_report BETWEEN '$date1' AND '$date2'
                        AND level_id='2'

                        UNION

                        SELECT '3' AS level_name,COUNT(id_risk)  AS cc      
                        FROM riskregister 
                        WHERE  date_report BETWEEN '$date1' AND '$date2'
                        AND level_id='3'     

                        UNION

                        SELECT '4' AS level_name,COUNT(id_risk)  AS cc      
                        FROM riskregister 
                        WHERE  date_report BETWEEN '$date1' AND '$date2'
                        AND level_id='4'  

                        UNION

                        SELECT '5' AS level_name,COUNT(id_risk)  AS cc      
                        FROM riskregister 
                        WHERE  date_report BETWEEN '$date1' AND '$date2'
                        AND level_id='5'          
                        ";
                
                $dep= Yii::$app->db->createCommand($dep_notre)->queryAll();
                $team= Yii::$app->db->createCommand($team_notre)->queryAll();
                $ceo= Yii::$app->db->createCommand($ceo_notre)->queryAll();

                $risk_st= Yii::$app->db->createCommand($status)->queryAll();
                
                $uall = Yii::$app->db->createCommand($userall)->queryScalar();
                $uonline = Yii::$app->db->createCommand($useronline)->queryScalar();
                
                $cc_user= Yii::$app->db->createCommand($c_user)->queryAll();
                $cc_dep= Yii::$app->db->createCommand($s_dep)->queryAll();
                
                $cc_level= Yii::$app->db->createCommand($s_level)->queryAll();
                return $this->render('index2',[
                        'date1' => $date1,
                        'date2' => $date2,
                        'b_year' => $b_year,
                        'nodep' => $dep,
                        'noteam' => $team,
                        'noceo' => $ceo,
                        'risk_st' => $risk_st,
                        'uall' => $uall,
                        'uonline' => $uonline,
                        'cc_user' => $cc_user,
                        'cc_dep' => $cc_dep,
                        'cc_level' => $cc_level,
                ]);
          }
    }

    /**
     * Logs in a user.
     *
     * @return mixed
     */

      public function actionLogin()
    {
        if (!Yii::$app->user->isGuest) {
            return $this->goHome();
        }

        $model = new LoginForm();
        if ($model->load(Yii::$app->request->post()) && $model->login()) {
            
            $username = $model->username;
            $ip = \Yii::$app->getRequest()->getUserIP();

            $sql = " INSERT INTO `user_log` (`username`,`login_date`, `ip`) VALUES ('$username',NOW(), '$ip') ";
            \Yii::$app->db->createCommand($sql)->execute();
            return $this->goBack();
        } else {
            $model->password = '';

            return $this->render('login', [
                'model' => $model,
            ]);
        }
    }

    /**
     * Logs out the current user.
     *
     * @return mixed
     */
    public function actionLogout()
    {
        Yii::$app->user->logout();

        return $this->goHome();
    }

    /**
     * Displays contact page.
     *
     * @return mixed
     */
    public function actionContact()
    {
        $model = new ContactForm();
        if ($model->load(Yii::$app->request->post()) && $model->validate()) {
            if ($model->sendEmail(Yii::$app->params['adminEmail'])) {
                Yii::$app->session->setFlash('success', 'Thank you for contacting us. We will respond to you as soon as possible.');
            } else {
                Yii::$app->session->setFlash('error', 'There was an error sending your message.');
            }

            return $this->refresh();
        } else {
            return $this->render('contact', [
                'model' => $model,
            ]);
        }
    }

    /**
     * Displays about page.
     *
     * @return mixed
     */
    public function actionAbout()
    {
        return $this->render('about');
    }

    /**
     * Signs user up.
     *
     * @return mixed
     */
    public function actionSignup()
    {
        $model = new SignupForm();
        if ($model->load(Yii::$app->request->post())) {
            if ($user = $model->signup()) {
                if (Yii::$app->getUser()->login($user)) {
                    return $this->goHome();
                }
            }
        }

        return $this->render('signup', [
            'model' => $model,
        ]);
    }

    /**
     * Requests password reset.
     *
     * @return mixed
     */
    public function actionRequestPasswordReset()
    {
        $model = new PasswordResetRequestForm();
        if ($model->load(Yii::$app->request->post()) && $model->validate()) {
            if ($model->sendEmail()) {
                Yii::$app->session->setFlash('success', 'Check your email for further instructions.');

                return $this->goHome();
            } else {
                Yii::$app->session->setFlash('error', 'Sorry, we are unable to reset password for the provided email address.');
            }
        }

        return $this->render('requestPasswordResetToken', [
            'model' => $model,
        ]);
    }

    /**
     * Resets password.
     *
     * @param string $token
     * @return mixed
     * @throws BadRequestHttpException
     */
    public function actionResetPassword($token)
    {
        try {
            $model = new ResetPasswordForm($token);
        } catch (InvalidParamException $e) {
            throw new BadRequestHttpException($e->getMessage());
        }

        if ($model->load(Yii::$app->request->post()) && $model->validate() && $model->resetPassword()) {
            Yii::$app->session->setFlash('success', 'New password saved.');

            return $this->goHome();
        }

        return $this->render('resetPassword', [
            'model' => $model,
        ]);
    }
   
    public function actionPopup(){
        return $this->renderAjax('popup');
    }
}
