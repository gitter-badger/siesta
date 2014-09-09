module.exports = function (grunt) {

    require('load-grunt-tasks')(grunt);
    require('time-grunt')(grunt);


    grunt.initConfig({
        delta: {
            options: {
                livereload: true
            },
            less: {
                files: ['static/less/**/*.less'],
                tasks: ['build']
            },
            jekyll: {
                files: ['*.md', '_includes/*.html', '_data/*.yml', '_layouts/*.html', '_posts/*.md', 'blog/*.html', '_config.yml'],
                tasks: ['build']
            }
        },
        less: {
            dev: {
                options: {
                    paths: ['static/less']
                },
                files: {
                    'static/css/main.css': 'static/less/daux-blue.less'
                }
            }
        }, 
        jekyll: {
            options: {
                bundleExec: true,
                dest: './_site',
                serve: false
            },
            build: {  
                options: {
                    config: '_config.dev.yml'
                }
            },  
            dist: {
                options: {
                    config: '_config.yml'
                }
            }
        },
        connect: {
            site: {
                options: {
                    livereload: true,
                    port: 4000,
                    base: './_site'
                }
            }
        }
    });

    grunt.registerTask('build', ['less:dev', 'jekyll:build']);
    grunt.renameTask('watch', 'delta');
    grunt.registerTask('watch', ['build', 'connect:site', 'delta']);
    grunt.registerTask('compile', ['less:dev', 'jekyll:dist'])

};
