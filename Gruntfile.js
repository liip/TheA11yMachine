module.exports = function (grunt) {
    var sniffersDirectory =
        grunt.option('sniffers-directory') ||
        __dirname + '/resource/sniffers/custom';
    var sniffersOutput =
        grunt.option('sniffers-output') ||
        'resource/HTMLCS.js';

    var configuration = {
        pkg: grunt.file.readJSON('package.json'),

        uglify: {
            options: {
                banner: '/*! HTMLCS */\n'
            },
            htmlcs: {
                files: {}
            }
        }
    };
    configuration.uglify.htmlcs.files[sniffersOutput] = [
        'node_modules/HTML_CodeSniffer/Standards/**/*.js',
        'node_modules/HTML_CodeSniffer/HTMLCS.js',
        'node_modules/HTML_CodeSniffer/PhantomJS/runner.js',
        sniffersDirectory + '/**/*.js'
    ];

    grunt.initConfig(configuration);
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.registerTask('default', ['uglify:htmlcs']);
};
