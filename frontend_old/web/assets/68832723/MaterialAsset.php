<?php
namespace frontend\themes\material\assets;

use yii\web\AssetBundle;


class MaterialAsset extends AssetBundle{

    public $sourcePath = '@frontend/themes/material/assets';
    public $baseUrl = '@web';
    
    public $css=[
        'css/material-wfont.min.css',
        'css/material.min.css',
        'css/ripples.min.css',
        'css/style.css',
    ];
    public $js=[
        'js/material.min.js',
        'js/ripples.min.js',
    ];
    public $depends = [
        'yii\web\YiiAsset',
        'yii\bootstrap\BootstrapAsset',
        
    ];
    
    public function init(){
        parent::init();
    }
    
}
