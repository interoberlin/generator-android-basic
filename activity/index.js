'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var path = require('path');
var wiring = require('html-wiring');
var pathExists = require('path-exists');

/**
 * Functionally the same as directory however applies templating if file name begins with an underscore (_).
 *
 * @param source
 * @param destination
 */
function templateDirectory(source, destination) {
  var root = this.isPathAbsolute(source) ? source : path.join(this.sourceRoot(), source);
  var files = this.expandFiles('**', {
      dot : true,
      cwd : root
    });

  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    var src = path.join(root, f);
    if (path.basename(f).indexOf('_') == 0) {
      var dest = path.join(destination, path.dirname(f), path.basename(f).replace(/^_/, ''));
      this.template(src, dest);
    } else {
      var dest = path.join(destination, f);
      this.copy(src, dest);
    }
  }
}

/**
 * Determines whether a file exists
 *
 * @param file
 */
function exists(file) {
  return pathExists.sync(file);
}

String.prototype.camelCaseToSnakeCase = function () {
  return this.replace(/\.?([A-Z]+)/g, function (x, y) {
    return "_" + y.toLowerCase()
  }).replace(/^_/, "");
}

String.prototype.capitalizeFirst = function () {
  return this.charAt(0).toUpperCase() + this.slice(1);
}

String.prototype.removeTrailingActivity = function () {
  return this.replace(/Activity$/, '');
}

String.prototype.contains = function (substring) {
  return this.indexOf(substring) > -1;
}

module.exports = yeoman.generators.Base.extend({
    constructor : function () {
      yeoman.generators.Base.apply(this, arguments);

      this.argument('activityType', {
        type : String,
        required : false
      });
      this.argument('activityName', {
        type : String,
        required : false
      });
      this.argument('activityPackage', {
        type : String,
        required : false
      });
      this.argument('layoutName', {
        type : String,
        required : false
      });
      this.argument('launcher', {
        type : String,
        required : false
      });
      this.argument('appPackage', {
        type : String,
        required : false
      });

      this.appPackage = this.config.get("appPackage");
    },

    initializing : function () {
      this.pkg = require('../package.json');
      this.templateDirectory = templateDirectory.bind(this);
      this.okay = true;
    },

    prompting : {
      promptActivityType : function () {
        if (this.activityType == null) {
          var questions = 5;
          var done = this.async();
          var prompts = [{
              type : 'list',
              name : 'activityType',
              message : '(1/' + questions + ') Which ' + chalk.green('type') + ' of activity would you like to create?',
              choices : [{
                  value : 'empty',
                  name : 'empty activity'
                }, {
                  value : 'blank',
                  name : 'blank activity'
                }, {
                  value : 'fullscreen',
                  name : 'fullscreen activity'
                }, {
                  value : 'login',
                  name : 'login activity'
                }
              ],
              store : true,
            default:
              0
            }
          ];

          this.prompt(prompts, function (props) {
            this.activityType = props.activityType;

            done();
          }
            .bind(this));
        }
      },

      promptActivityName : function () {
        if (this.activityName == null) {
          var questions = 5;
          var done = this.async();
          var prompts = [{
              name : 'activityName',
              message : '(2/' + questions + ') What are you calling your activity?',
              store : true,
            default:
              this.activityType.toString().capitalizeFirst() + 'Activity',
            }
          ];

          this.prompt(prompts, function (props) {
            this.activityName = props.activityName;

            done();
          }
            .bind(this));
        }
      },

      promptRest : function () {
        if (this.activityPackage == null || this.layoutName == null || this.launcher == null) {
          var appPackage = this.config.get("appPackage");
          var questions = 5;
          var done = this.async();
          var prompts = [{
              name : 'activityPackage',
              message : '(3/' + questions + ') Under which package you want to create the activity?',
              store : true,
            default:
              appPackage + '.view.activities',
            }, {
              name : 'layoutName',
              message : '(4/' + questions + ') What are you calling the corresponding layout?',
              store : true,
            default:
              'activity_' + this.activityName.toString().removeTrailingActivity().camelCaseToSnakeCase()
            }, {
              type : 'list',
              name : 'launcher',
              message : '(5/' + questions + ') Should this activity be started on launch?',
              choices : [{
                  value : true,
                  name : 'Yes'
                }, {
                  value : false,
                  name : 'No'
                }
              ],
              store : true,
            default:
              1,
            }
          ];

          this.prompt(prompts, function (props) {
            this.activityPackage = props.activityPackage;
            this.layoutName = props.layoutName;
            this.launcher = props.launcher;

            done();
          }
            .bind(this));
        }
      }
    },

    configuring : {
      saveSettings : function () {
        this.config.set('activityType', this.activityType);
        this.config.set('activityName', this.activityName);
        this.config.set('activityPackage', this.activityPackage);
        this.config.set('layoutName', this.layoutName);
        this.config.set('launcher', this.launcher);
      }
    },

  default: {
      check : function () {
        var packageDir = this.activityPackage.replace(/\./g, '/');
        var activityFile = 'app/src/main/java/' + packageDir + '/' + this.activityName + '.java';
        var layoutFile = 'app/src/main/res/layout/' + this.layoutName + '.xml';

        // Checks if activity file already exists
        if (exists(this.destinationPath(activityFile))) {
          console.log(chalk.red('    error') + ' activity ' + activityFile + ' already exists');
          this.okay = false;
        }

        // Check if layout file already exists
        if (exists(this.destinationPath(layoutFile))) {
          console.log(chalk.red('    error') + ' layout ' + layoutFile + ' already exists');
          this.okay = false;
        }
      }
    },

    writing : {
      activity : function () {
        if (this.okay) {
          var packageDir = this.activityPackage.replace(/\./g, '/');
          var activityFile = 'app/src/main/java/' + packageDir + '/' + this.activityName + '.java';

          this.mkdir('app/src/main/java/' + packageDir);
          this.template('app/src/main/java/view/activities/_' + this.activityType.toString().capitalizeFirst() + 'Activity.java', activityFile);
        }
      },

      res : function () {
        if (this.okay) {
          var done = this.async();
          var stringsFile = 'app/src/main/res/values/strings.xml';
          var dimensFile = 'app/src/main/res/values/dimens.xml';
          var colorsFile = 'app/src/main/res/values/colors.xml';
          var stylesFile = 'app/src/main/res/values/styles.xml';
          var attrsFile = 'app/src/main/res/values/attrs.xml';

          this.mkdir('app/src/main/res/values');

          switch (this.activityType.toString()) {
          case 'empty': {
              if (!exists(this.destinationPath(stringsFile))) {
                this.copy(stringsFile, stringsFile);
              }
              if (!exists(this.destinationPath(dimensFile))) {
                this.copy(dimensFile, dimensFile);
              }
              break;
            }
          case 'blank': {
              if (!exists(this.destinationPath(stringsFile))) {
                this.copy(stringsFile, stringsFile);
              }
              if (!exists(this.destinationPath(dimensFile))) {
                this.copy(dimensFile, dimensFile);
              }
              break;
            }
          case 'fullscreen': {
              if (!exists(this.destinationPath(stringsFile))) {
                this.copy(stringsFile, stringsFile);
              }
              if (!exists(this.destinationPath(colorsFile))) {
                this.copy(colorsFile, colorsFile);
              }
              if (!exists(this.destinationPath(stylesFile))) {
                this.copy(stylesFile, stylesFile);
              }
              if (!exists(this.destinationPath(attrsFile))) {
                this.copy(attrsFile, attrsFile);
              }
              break;
            }
          case 'login': {
              if (!exists(this.destinationPath(stringsFile))) {
                this.copy(stringsFile, stringsFile);
              }
              if (!exists(this.destinationPath(dimensFile))) {
                this.copy(dimensFile, dimensFile);
              }
              break;
            }
          }
          done();
        }
      },

      layout : function () {
        if (this.okay) {
          var layoutFile = 'app/src/main/res/layout/' + this.layoutName + '.xml';

          this.mkdir('app/src/main/res/layout');
          this.template('app/src/main/res/layout/_activity_' + this.activityType + '.xml', layoutFile);
        }
      }
    },

    install : {
      res : function () {
        if (this.okay) {
          try {
            var stringsFile = 'app/src/main/res/values/strings.xml';
            var dimensFile = 'app/src/main/res/values/dimens.xml';
            var colorsFile = 'app/src/main/res/values/colors.xml';
            var stylesFile = 'app/src/main/res/values/styles.xml';
            var attrsFile = 'app/src/main/res/values/attrs.xml';

            var stringsFileDest = this.destinationPath(stringsFile);
            var dimensFileDest = this.destinationPath(dimensFile);
            var colorsFileDest = this.destinationPath(colorsFile);
            var stylesFileDest = this.destinationPath(stylesFile);
            var attrsFileDest = this.destinationPath(attrsFile);

            var stringsUpdated = false;
            var dimensUpdated = false;
            var colorsUpdated = false;
            var stylesUpdated = false;
            var attrsUpdated = false;

            switch (this.activityType.toString()) {
            case 'empty': {
                var strings = this.readFileAsString(stringsFileDest);
                var dimens = this.readFileAsString(dimensFileDest);

                if (!strings.contains('<string name="title_' + this.layoutName + '">')) {
                  wiring.appendToFile(stringsFileDest, 'resources', '\t<string name="title_' + this.layoutName + '">' + this.activityName.toString().removeTrailingActivity() + '</string>  \n');
                  stringsUpdated = true;
                }
                if (!dimens.contains('activity_horizontal_margin')) {
                  wiring.appendToFile(dimensFileDest, 'resources', '\t<dimen name="activity_horizontal_margin">16dp</dimen>\n');
                  dimensUpdated = true;
                }
                if (!dimens.contains('activity_vertical_margin')) {
                  wiring.appendToFile(dimensFileDest, 'resources', '\t<dimen name="activity_vertical_margin">16dp</dimen>\n');
                  dimensUpdated = true;
                }

                if (dimensUpdated) {
                  console.log(chalk.cyan('   update') + ' ' + dimensFile);
                }
                if (stringsUpdated) {
                  console.log(chalk.cyan('   update') + ' ' + stringsFile);
                }

                break;
              }
            case 'blank': {
                var strings = this.readFileAsString(stringsFileDest);
                var dimens = this.readFileAsString(dimensFileDest);

                if (!strings.contains('<string name="title_' + this.layoutName + '">')) {
                  wiring.appendToFile(stringsFileDest, 'resources', '\t<string name="title_' + this.layoutName + '">' + this.activityName.toString().removeTrailingActivity() + '</string>  \n');
                  stringsUpdated = true;
                }
                if (!dimens.contains('<dimen name="activity_horizontal_margin">')) {
                  wiring.appendToFile(dimensFileDest, 'resources', '\t<dimen name="activity_horizontal_margin">16dp</dimen>\n');
                  dimensUpdated = true;
                }
                if (!dimens.contains('<dimen name="activity_vertical_margin">')) {
                  wiring.appendToFile(dimensFileDest, 'resources', '\t<dimen name="activity_vertical_margin">16dp</dimen>\n');
                  dimensUpdated = true;
                }

                if (stringsUpdated) {
                  console.log(chalk.cyan('   update') + ' ' + stringsFile);
                }
                if (dimensUpdated) {
                  console.log(chalk.cyan('   update') + ' ' + dimensFile);
                }

                break;
              }
            case 'fullscreen': {
                var strings = this.readFileAsString(stringsFileDest);
                var colors = this.readFileAsString(colorsFileDest);
                var styles = this.readFileAsString(stylesFileDest);
                var attrs = this.readFileAsString(attrsFileDest);

                if (!strings.contains('<string name="title_' + this.layoutName + '">')) {
                  wiring.appendToFile(stringsFileDest, 'resources', '\t<string name="title_' + this.layoutName + '">' + this.activityName.toString().removeTrailingActivity() + '</string>  \n');
                  stringsUpdated = true;
                }
                if (!strings.contains('<string name="dummy_content">')) {
                  wiring.appendToFile(stringsFileDest, 'resources', '\t<string name="dummy_content">DUMMY\nCONTENT</string>\n');
                  stringsUpdated = true;
                }

                if (!strings.contains('<string name="dummy_button">')) {
                  wiring.appendToFile(stringsFileDest, 'resources', '\t<string name="dummy_button">Dummy Button</string>\n');
                  stringsUpdated = true;
                }

                if (!colors.contains('<color name="black_overlay">')) {
                  wiring.appendToFile(colorsFileDest, 'resources', '\t<color name="black_overlay">#66000000</color>\n');
                  colorsUpdated = true;
                }

                if (!styles.contains('<style name="FullscreenTheme" parent="@android:style/Theme.Holo.Light">')) {
                  wiring.appendToFile(stylesFileDest, 'resources', '\t<style name="FullscreenTheme" parent="@android:style/Theme.Holo.Light">\n\t<item name="android:actionBarStyle">@style/FullscreenActionBarStyle</item>\n\t<item name="android:windowActionBarOverlay">true</item>\n\t<item name="android:windowBackground">@null</item>\n\t<item name="metaButtonBarStyle">?android:attr/buttonBarStyle</item>\n\t<item name="metaButtonBarButtonStyle">?android:attr/buttonBarButtonStyle</item>\n</style>');
                  stylesUpdated = true;
                }

                if (!styles.contains('<style name="FullscreenActionBarStyle" parent="android:Widget.Holo.ActionBar">')) {
                  wiring.appendToFile(stylesFileDest, 'resources', '\t<style name="FullscreenActionBarStyle" parent="android:Widget.Holo.ActionBar">\n\t<item name="android:background">@color/black_overlay</item>\n</style>');
                  stylesUpdated = true;
                }

                if (!attrs.contains('<declare-styleable name="ButtonBarContainerTheme">')) {
                  wiring.appendToFile(attrsFileDest, 'resources', '\t<declare-styleable name="ButtonBarContainerTheme">\n\t<attr name="metaButtonBarStyle" format="reference"></attr>\n\t        <attr name="metaButtonBarButtonStyle" format="reference"></attr>\n</declare-styleable>');
                  attrsUpdated = true;
                }

                if (stringsUpdated) {
                  console.log(chalk.cyan('   update') + ' ' + stringsFile);
                }
                if (colorsUpdated) {
                  console.log(chalk.cyan('   update') + ' ' + colorsFile);
                }
                if (stylesUpdated) {
                  console.log(chalk.cyan('   update') + ' ' + stylesFile);
                }
                if (attrsUpdated) {
                  console.log(chalk.cyan('   update') + ' ' + attrsFile);
                }

                break;
              }
            case 'login': {
                var strings = this.readFileAsString(stringsFileDest);
                var dimens = this.readFileAsString(dimensFileDest);

                if (!strings.contains('<string name="title_' + this.layoutName + '">')) {
                  wiring.appendToFile(stringsFileDest, 'resources', '\t<string name="title_' + this.layoutName + '">Sign in</string> \n');
                  stringsUpdated = true;
                }
                if (!strings.contains('<!-- Strings related to login -->')) {
                  wiring.appendToFile(stringsFileDest, 'resources', '\n\t<!-- Strings related to login --> \n');
                  stringsUpdated = true;
                }
                if (!strings.contains('<string name="prompt_email">')) {
                  wiring.appendToFile(stringsFileDest, 'resources', '\t<string name="prompt_email">Email</string> \n');
                  stringsUpdated = true;
                }
                if (!strings.contains('<string name="prompt_password">')) {
                  wiring.appendToFile(stringsFileDest, 'resources', '\t<string name="prompt_password">Password (optional)</string> \n');
                  stringsUpdated = true;
                }
                if (!strings.contains('<string name="action_sign_in">')) {
                  wiring.appendToFile(stringsFileDest, 'resources', '\t<string name="action_sign_in">Sign in or register</string> \n');
                  stringsUpdated = true;
                }
                if (!strings.contains('<string name="action_sign_in_short">')) {
                  wiring.appendToFile(stringsFileDest, 'resources', '\t<string name="action_sign_in_short">Sign in</string> \n');
                  stringsUpdated = true;
                }
                if (!strings.contains('<string name="error_invalid_email">')) {
                  wiring.appendToFile(stringsFileDest, 'resources', '\t<string name="error_invalid_email">This email address is invalid</string> \n');
                  stringsUpdated = true;
                }
                if (!strings.contains('<string name="error_invalid_password">')) {
                  wiring.appendToFile(stringsFileDest, 'resources', '\t<string name="error_invalid_password">This password is too short</string> \n');
                  stringsUpdated = true;
                }
                if (!strings.contains('<string name="error_incorrect_password">')) {
                  wiring.appendToFile(stringsFileDest, 'resources', '\t<string name="error_incorrect_password">This password is incorrect</string> \n');
                  stringsUpdated = true;
                }
                if (!strings.contains('<string name="error_field_required">')) {
                  wiring.appendToFile(stringsFileDest, 'resources', '\t<string name="error_field_required">This field is required</string> \n');
                  stringsUpdated = true;
                }
                if (!strings.contains('<string name="permission_rationale">')) {
                  wiring.appendToFile(stringsFileDest, 'resources', '\t <string name="permission_rationale">"Contacts permissions are needed for providing email completions."</string> \n');
                  stringsUpdated = true;
                }
                if (!dimens.contains('<dimen name="activity_horizontal_margin">')) {
                  wiring.appendToFile(dimensFileDest, 'resources', '\t<dimen name="activity_horizontal_margin">16dp</dimen>\n');
                  dimensUpdated = true;
                }
                if (!dimens.contains('<dimen name="activity_vertical_margin">')) {
                  wiring.appendToFile(dimensFileDest, 'resources', '\t<dimen name="activity_vertical_margin">16dp</dimen>\n');
                  dimensUpdated = true;
                }

                if (stringsUpdated) {
                  console.log(chalk.cyan('   update') + ' ' + stringsFile);
                }
                if (dimensUpdated) {
                  console.log(chalk.cyan('   update') + ' ' + dimensFile);
                }

                break;
              }
            }
          } catch (err) {
            console.log(chalk.yellow('     warn') + ' error updating res files');
            console.log(chalk.red('     error') + err);
          }
        }
      },
      buildgradle : function () {
        if (this.okay) {
          try {
            var buildFile = 'app/build.gradle';

            var buildFileDest = this.destinationPath(buildFile);

            var buildUpdated = false;

            switch (this.activityType.toString()) {
            case 'login': {
                var build = this.readFileAsString(buildFileDest);

                if (build.contains('dependencies {')) {
                  this.conflicter.force = true;
                  var b = build.replace('dependencies {', 'dependencies {\n\tcompile \'com.android.support:design:23.1.1\'');
                  this.write(buildFileDest, b);
                  this.conflicter.force = false;
                  buildUpdated = true;
                }

                if (buildUpdated) {
                  console.log(chalk.cyan('   update') + ' ' + buildFile);
                }

                break;
              }
            }
          } catch (err) {}
        }
      },
      manifest : function () {
        if (this.okay) {
          try {
            var manifestFile = this.destinationPath('app/src/main/AndroidManifest.xml');
            var manifest = this.readFileAsString(manifestFile);

            if (this.launcher == 'true') {
              if (!manifest.contains('LAUNCHER')) {
                // Add launcher activity
                wiring.appendToFile(manifestFile, 'application',
                  '\n\t<activity android:name=".view.activities.' + this.activityName + '" android:label="@string/title_' + this.layoutName + '" />\n' +
                  '\t<intent-filter>\n' +
                  '\t<action android:name="android.intent.action.MAIN"></action>\n' +
                  '\t<category android:name="android.intent.category.LAUNCHER"></category>\n' +
                  '\t</intent-filter>\n' +
                  '\t</activity>\n');
              } else {
                // Add normal activity
                wiring.appendToFile(manifestFile, 'application', '\n\t<activity android:name=".view.activities.' + this.activityName + '" android:label="@string/title_' + this.layoutName + '" />\n');
                console.log(chalk.yellow('     warn') + ' manifest already contains an activity with launcher intent');
              }

              console.log(chalk.cyan('   update') + ' app/src/main/AndroidManifest.xml');
            } else {
              // Add normal activity
              wiring.appendToFile(manifestFile, 'application', '\n\t<activity android:name=".view.activities.' + this.activityName + '" android:label="@string/title_' + this.layoutName + '" />\n');
              console.log(chalk.cyan('   update') + ' app/src/main/AndroidManifest.xml');
            }
          } catch (err) {}
        }
      }
    }
  });
