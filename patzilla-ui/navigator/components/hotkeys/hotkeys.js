// -*- coding: utf-8 -*-
// (c) 2014,2018 Andreas Motl <andreas.motl@ip-tools.org>
require('jquery-hotkeys');
var urljoin = require('url-join');

HotkeysPlugin = Marionette.Controller.extend({

    initialize: function(options) {
        console.log('HotkeysPlugin.initialize');
        this.app = options.app;
    },

    setup_hotkeys: function() {

        var _this = this;

        // ------------------------------------------
        //   hotkeys
        // ------------------------------------------

        // Perform CQL expression search
        // submit on meta+enter
        $('#query').on('keydown', null, 'meta+return', function() {
            _this.app.start_expert_search();
        });
        $('#query').on('keydown', null, 'ctrl+return', function(event) {
            _this.app.start_expert_search();
        });

        // Perform numberlist search
        // submit on meta+enter
        $('#numberlist').on('keydown', null, 'meta+return', function() {
            _this.app.perform_numberlistsearch();
        });

        // open cql field chooser
        $('#query').on('keydown', null, 'alt+ctrl+f', function(event) {
            event.preventDefault();
            $('#cql-field-chooser').select2('open');
            $('#cql-field-chooser').off('select2-close');
            $('#cql-field-chooser').on('select2-close', function(event) {
                window.setTimeout(function() {
                    $('#query').trigger('focus');
                }, 100);
            });
        });

        // zoom input field
        $('input').on('keydown', null, 'shift+return', function(event) {
            event.preventDefault();
            $(this).parent().find('.add-on.add-on-zoom').trigger('click');
        });

        _([document, '#query', '#numberlist', 'input']).each(function (selector) {
            _this.querybuilder_hotkeys(selector);
        });

        // add/remove/rate the document in viewport to/from basket
        $(document).on('keydown', null, '+', function() {
            _this.app.viewport.document_add_basket();
        });
        $(document).on('keydown', null, 'insert', function() {
            _this.app.viewport.document_rate(1);
        });

        $(document).on('keydown', null, '-', function() {
            _this.app.viewport.document_remove_basket();
        });
        $(document).on('keydown', null, 'r', function() {
            _this.app.viewport.document_remove_basket();
        });
        $(document).on('keydown', null, 'del', function() {
            _this.app.viewport.document_remove_basket();
        });
        $(document).on('keydown', null, 'ctrl+d', function() {
            _this.app.viewport.document_remove_basket();
        });

        $(document).on('keydown', null, '0', function() {
            _this.app.viewport.document_rate(null, true);
        });
        $(document).on('keydown', null, 'd', function() {
            _this.app.viewport.document_rate(null, true);
        });
        $(document).on('keydown', null, '1', function() {
            _this.app.viewport.document_rate(1);
        });
        $(document).on('keydown', null, '2', function() {
            _this.app.viewport.document_rate(2);
        });
        $(document).on('keydown', null, '3', function() {
            _this.app.viewport.document_rate(3);
        });


        var scroll_smooth = _this.app.ui.scroll_smooth;


        // Snap scrolling to document items with space key
        $(document).on('keydown', null, null, function(event) {

            if (event.keyCode == 32 && !_(['input', 'textarea']).contains(event.target.localName)) {
                event.preventDefault();

                // scroll to the best next target element
                if (event.shiftKey == false) {
                    scroll_smooth(_this.app.viewport.next_item({paging: true}));

                // scroll to the best previous target element
                } else if (event.shiftKey == true) {
                    scroll_smooth(_this.app.viewport.previous_item({paging: true}));
                }

            }
        });

        // Snap scrolling to document items with page-up/page-down keys
        $(document).on('keydown', null, 'pagedown', function(event) {
            event.preventDefault();
            scroll_smooth(_this.app.viewport.next_item({paging: true}));
        });
        $(document).on('keydown', null, 'pageup', function(event) {
            event.preventDefault();
            scroll_smooth(_this.app.viewport.previous_item({paging: true}));
        });


        // Navigate the Biblio, Desc, Claims with left/right arrow keys
        $(document).on('keydown', null, 'right', function(event) {
            event.preventDefault();
            var tab_chooser = _this.app.viewport.get_document().find('.document-anchor .document-details-chooser').first();
            var active_button = tab_chooser.find('button.active');
            var next = active_button.next('button');
            if (!next.length) {
                next = active_button.siblings('button').first();
            }
            next.tab('show');
        });
        $(document).on('keydown', null, 'left', function(event) {
            event.preventDefault();
            var tab_chooser = _this.app.viewport.get_document().find('.document-anchor .document-details-chooser').first();
            var active_button = tab_chooser.find('button.active');
            var next = active_button.prev('button');
            if (!next.length) {
                next = active_button.siblings('button').last();
            }
            next.tab('show');
        });


        // Navigate the drawings carousel with shift+left/right arrow keys
        $(document).on('keydown', null, 'shift+right', function(event) {
            event.preventDefault();
            var drawings_carousel = _this.app.viewport.get_document().find('.drawings-carousel').first();
            var carousel_button_more = drawings_carousel.find('.carousel-control.right');
            carousel_button_more.trigger('click');
        });
        $(document).on('keydown', null, 'shift+left', function(event) {
            event.preventDefault();
            var drawings_carousel = _this.app.viewport.get_document().find('.drawings-carousel').first();
            var carousel_button_more = drawings_carousel.find('.carousel-control.left');
            carousel_button_more.trigger('click');
        });
        $(document).on('keydown', null, 'shift+down', function(event) {
            event.preventDefault();
            var drawings_carousel = _this.app.viewport.get_document().find('.drawings-carousel').first();
            var carousel_button_more = drawings_carousel.find('.carousel-control.rotate');
            carousel_button_more.trigger('click');
        });
        $(document).on('keydown', null, 'shift+up', function(event) {
            event.preventDefault();
            var drawings_carousel = _this.app.viewport.get_document().find('.drawings-carousel').first();
            var carousel_button_more = drawings_carousel.find('.carousel-control.rotate');
            carousel_button_more.trigger('click', 'counter');
        });


        // Open PDF document on "shift+p"
        $(document).on('keydown', null, 'shift+p', function(event) {
            _this.keypress_to_click(event, 'a.anchor-pdf');
        });


        // Links to various patent offices

        // Ppen Espacenet on "shift+e"
        $(document).on('keydown', null, 'shift+e', function(event) {
            _this.keypress_to_click(event, 'a.anchor-biblio-espacenet');
        });
        // Open DEPATISnet on "shift+d"
        $(document).on('keydown', null, 'shift+d', function(event) {
            _this.keypress_to_click(event, 'a.anchor-biblio-depatisnet');
        });
        // Open EPOregister on "shift+alt+e"
        $(document).on('keydown', null, 'alt+shift+e', function(event) {
            _this.keypress_to_click(event, 'a.anchor-register-epo');
        });
        // Open DPMAregister on "shift+alt+d"
        $(document).on('keydown', null, 'alt+shift+d', function(event) {
            _this.keypress_to_click(event, 'a.anchor-register-dpma');
        });
        // Open CCD Viewer on "shift+c"
        $(document).on('keydown', null, 'shift+c', function(event) {
            _this.keypress_to_click(event, 'a.anchor-ccd');
        });


        // Open help about hotkeys with "h"
        $(document).on('keydown', null, 'h', function(event) {
            event.preventDefault();
            var baseurl = _this.app.config.get('baseurl');
            var url = urljoin(baseurl, '/help#hotkeys');
            window.open(url);
        });

    },

    keypress_to_click: function(event, selector) {
            event.preventDefault();
            var element = this.app.viewport.get_document().find(selector)[0];
            element && element.click();
    },

    querybuilder_hotkeys: function(selector) {

        var _this = this;

        // User interface flavor chooser
        $(selector).on('keydown', null, 'ctrl+shift+c', function(event) {
            $('#querybuilder-flavor-chooser button[data-value="comfort"]').tab('show');
        });
        $(selector).on('keydown', null, 'ctrl+shift+x', function(event) {
            $('#querybuilder-flavor-chooser button[data-value="cql"]').tab('show');
        });
        $(selector).on('keydown', null, 'ctrl+shift+n', function(event) {
            $('#querybuilder-flavor-chooser button[data-value="numberlist"]').tab('show');
        });

        // Generic data source selector
        _.each(navigatorApp.config.get('datasources_enabled'), function(datasource) {

            var datasource_info = navigatorApp.datasource_info(datasource);
            if (!datasource_info) return;

            var hotkey = datasource_info.querybuilder.hotkey;
            if (!hotkey) {
                console.warn('No hotkey defined for data source', datasource);
                return;
            }

            $(selector).on('keydown', null, hotkey, function(event) {
                $('#datasource button[data-value="' + datasource + '"]').button('toggle');
                _this.app.set_datasource(datasource);
            });
        });

        // TODO: Remove or integrate into generic data source selector
        if (navigatorApp.config.get('google_enabled')) {
            $(selector).on('keydown', null, 'ctrl+shift+g', function(event) {
                var google_button = $('#datasource button[data-value="google"]');
                google_button.show();
                google_button.button('toggle');
                _this.app.set_datasource('google');
            });
        }

        // Basket review action
        $(selector).on('keydown', null, 'ctrl+shift+r', function(event) {
            _this.app.basketModel.review();
        });

    },

    querybuilder_zoomed_hotkeys: function(selector, regular_element) {
        // submit on meta+enter
        $(selector).off('keydown');
        $(selector).on('keydown', null, 'meta+return', function() {
            $("#querybuilder-comfort-form").submit();
        });
        $(selector).on('keydown', null, 'ctrl+return', function(event) {
            $("#querybuilder-comfort-form").submit();
        });
        $(selector).on('keydown', null, 'shift+return', function(event) {
            event.preventDefault();
            navigatorApp.queryBuilderView.comfort_form_zoomed_to_regular_data();
            navigatorApp.queryBuilderView.comfort_form_zoomed_to_regular_ui(regular_element);
        });
    },

});

// setup plugin
navigatorApp.addInitializer(function(options) {
    this.hotkeys = new HotkeysPlugin({app: this});

    this.listenTo(this, 'application:ready', function() {
        this.hotkeys.setup_hotkeys();
    });

});
