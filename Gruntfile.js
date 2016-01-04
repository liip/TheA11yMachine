module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        uglify: {
            options: {
                banner: '/*! HTMLCS */\n'
            },
            htmlcs: {
                files: {
                    'resource/HTMLCS.js': [
                        'node_modules/HTML_CodeSniffer/Standards/**/*.js',
                        'node_modules/HTML_CodeSniffer/HTMLCS.js',
                        'node_modules/HTML_CodeSniffer/PhantomJS/runner.js'
                    ]
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.registerTask('default', ['uglify:htmlcs']);

};
