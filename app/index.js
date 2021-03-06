'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var path = require('path');

/**
 * Functionally the same as directory however applies templating if file name begins with an underscore (_).
 *
 * @param source
 * @param destination
 */
function templateDirectory(source, destination) {
  var root = this.isPathAbsolute(source) ? source : path.join(this.sourceRoot(), source);
  var files = this.expandFiles('**', { dot: true, cwd: root });

  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    var src = path.join(root, f);
    if(path.basename(f).indexOf('_') == 0){
      var dest = path.join(destination, path.dirname(f), path.basename(f).replace(/^_/, ''));
      this.template(src, dest);
    }
    else{
      var dest = path.join(destination, f);
      this.copy(src, dest);
    }
  }
}

module.exports = yeoman.generators.Base.extend({
	constructor: function () {
    yeoman.generators.Base.apply(this, arguments);
	
	this.argument('appName', { type: String, required: false });
	this.argument('appPackage', { type: String, required: false });
  },
  
  initializing: function () {
    this.pkg = require('../package.json');
    this.templateDirectory = templateDirectory.bind(this);
  },

  prompting: function () {
	this.androidTargetSdkVersion = 23;
	this.androidMinSdkVersion = 17;
	  
	if (this.appName == null || this.appPackage == null) {
		var done = this.async();

		// Have Yeoman greet the user.
		this.log(yosay(
		  'Welcome to the ' + chalk.red('Android Basic') + ' generator!'
		));

		var prompts = [{
		  name: 'appName',
		  message: 'What are you calling your app?',
		  store: true,
		  default : this.appname // Default to current folder name
		},
		{
		  name: 'appPackage',
		  message: 'What package will you be publishing the app under?',
		  store: true
		},
		{
		  name: 'androidTargetSdkVersion',
		  message: 'What Android SDK will you be targeting?',
		  store: true,
		  default: 23  // Android 5.0 (Lollipop)
		},
		{
		  name: 'androidMinSdkVersion',
		  message: 'What is the minimum Android SDK you wish to support?',
		  store: true,
		  default: 17
		}];

		this.prompt(prompts, function (props) {
		  this.appName = props.appName;
		  this.appPackage = props.appPackage;
		  this.androidTargetSdkVersion = props.androidTargetSdkVersion;
		  this.androidMinSdkVersion = props.androidMinSdkVersion;

		  done();
		}.bind(this));
	}
  },

  configuring: {
    saveSettings: function() {
      this.config.set('appName', this.appName);
      this.config.set('appPackage', this.appPackage);
      this.config.set('androidTargetSdkVersion', this.androidTargetSdkVersion);
      this.config.set('androidMinSdkVersion', this.androidMinSdkVersion);
    }
  },

  writing: {
    projectfiles: function () {
      this.copy('build.gradle', 'build.gradle');
      this.copy('gitignore', '.gitignore');
      this.copy('gradle.properties', 'gradle.properties');
      this.copy('gradlew', 'gradlew');
      this.copy('gradlew.bat', 'gradlew.bat');
      this.copy('settings.gradle', 'settings.gradle');
      this.template('_README.md', 'README.md');
      this.directory('gradle', 'gradle');
    },

    app: function () {
      var packageDir = this.appPackage.replace(/\./g, '/');

      this.mkdir('app');
      this.copy('app/gitignore', 'app/.gitignore');
      this.copy('app/proguard-rules.pro', 'app/proguard-rules.pro');
      this.template('app/_build.gradle', 'app/build.gradle');

	  this.mkdir('app/libs');
	  
	  // androidTest
      this.mkdir('app/src/androidTest/java/' + packageDir);
      this.templateDirectory('app/src/androidTest/java', 'app/src/androidTest/java/' + packageDir);
      this.directory('app/src/androidTest/res', 'app/src/androidTest/res');
	  
	  // test
      this.mkdir('app/src/test/java/' + packageDir);
      this.templateDirectory('app/src/test/java', 'app/src/test/java/' + packageDir);

	  // main
      this.mkdir('app/src/main/assets');
      this.mkdir('app/src/main/java/' + packageDir);
	  this.directory('app/src/main/assets', 'app/src/main/assets');
      this.template('app/src/main/_AndroidManifest.xml', 'app/src/main/AndroidManifest.xml');
      this.templateDirectory('app/src/main/java', 'app/src/main/java/' + packageDir);
      this.templateDirectory('app/src/main/res', 'app/src/main/res');
    }

  }
});
