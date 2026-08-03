
<?php
use yii\helpers\Url;

$this->title = Yii::t('app', 'Risk Management in Hospitals');
$this->params['breadcrumbs'][] = ['label' => 'เอกสารวิชาการ', 'url' => ['books']];
$this->params['breadcrumbs'][] = $this->title;
?>

<?= \yii2assets\pdfjs\PdfJs::widget([
        'width'=>'100%',
        'height'=> '100vh',
        'url'=> Url::base().'/documents/books/handbook1.pdf'
]); ?>

<?= \bluezed\scrollTop\ScrollTop::widget() ?>
