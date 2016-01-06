var HTMLCS_Custom_Sniffs_A = {
    /**
     * Determines the elements to register for processing.
     *
     * Each element of the returned array can either be an element name, or "_top"
     * which is the top element of the tested code.
     *
     * @returns {Array} The list of elements.
     */
    register: function()
    {
        return [
            //'html',
            //'a'
        ];
    },

    /**
     * Process the registered element.
     *
     * @param {DOMNode} element The element registered.
     * @param {DOMNode} top     The top element of the tested code.
     */
    process: function(element, top)
    {
        /*
        var nodeName = element.nodeName.toLowerCase();

        switch (nodeName) {
            default:
                this.testSomething(element);
            break;
        }
        */
    },

    /**
     * Test something custom.
     *
     * We throw a notice to ensure that …
     *
     * @param {DOMNode} element The element to test.
     *
     * @returns void
     */
    testSomething: function(element)
    {
        // HTMLCS.addMessage(HTMLCS.NOTICE, element, 'Hello world!', 'Custom01');
    }
};
