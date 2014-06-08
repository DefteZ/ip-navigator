// -*- coding: utf-8 -*-
// (c) 2013,2014 Andreas Motl, Elmyra UG

BasketModel = Backbone.RelationalModel.extend({

    sync: Backbone.localforage.sync('Basket'),

    relations: [
        {
            type: Backbone.HasMany,
            key: 'entries',
            relatedModel: 'BasketEntryModel',
            autoFetch: true,
            includeInJSON: Backbone.Model.prototype.idAttribute,

            /*
            reverseRelation: {
                type: Backbone.One,
                key: 'basket',
                // 'relatedModel' is automatically set to 'ProjectModel'
                includeInJSON: Backbone.Model.prototype.idAttribute,
            },
            */

        }
    ],

    defaults: {
    },

    initialize: function() {
        console.log('BasketModel.initialize');
    },

    // initialize model from url query parameters
    init_from_query: function() {
        var _this = this;
        var url = $.url(window.location.href);
        var attribute_name = 'numberlist';
        var value = url.param(attribute_name);
        if (value) {
            value = decodeURIComponent(value);
            var entries = value.split(/[,\n]/);
            _(entries).each(function(entry) {
                _this.add(entry.trim());
            });
        }
    },

    get_entry_by_number: function(item) {
        var entrymodels = this.get('entries').where({number: item});
        if (_.isEmpty(entrymodels)) {
            return;
        } else {
            return entrymodels[0];
        }
    },

    // add item to basket
    add: function(item) {
        var _this = this;

        if (this.get_entry_by_number(item)) {
            return;
        }

        var entries = this.get('entries');
        var entry = new BasketEntryModel({number: item /*, basket: this*/});
        entry.save(null, {success: function() {
            entries.add(entry);
            _this.save({'entries': entries}, {success: function() {
                $.when(_this.fetch_entries()).then(function() {
                    _this.trigger('change', _this);
                    _this.trigger('change:add', item);
                });
            }});
        }});
    },

    // remove item from basket
    remove: function(item) {
        var _this = this;

        var entry = this.get_entry_by_number(item);
        if (!entry) {
            return;
        }

        var entries = this.get('entries');
        entries.remove(entry);
        entry.destroy();
        _this.save({'entries': entries}, {success: function() {
            $.when(_this.fetch_entries()).then(function() {
                _this.trigger('change:remove', item);
                _this.trigger('change', _this);
            });
        }});
    },

    get_numbers: function() {
        return this.get('entries').invoke('get', 'number');
    },

    review: function(options) {

        // compute cql query from entries in basket
        var basket = $('#basket').val();
        if (!basket) {
            return;
        }

        var options = options || {};
        var query = null;
        var publication_numbers = basket
            .split('\n')
            .filter(function(entry) { return entry; });
        var hits = publication_numbers.length;

        // TODO: decouple from referencing the main application object e.g. by using events!?
        opsChooserApp.set_datasource('review');
        opsChooserApp.metadata.set('reviewmode', true);
        opsChooserApp.perform_listsearch(options, query, publication_numbers, hits, 'pn', 'OR');
    },

    // fetch all basket entries from datastore, one by one; this is nasty
    fetch_entries: function() {

        var _this = this;
        var main_deferred = $.Deferred();
        $.when(this.fetchRelated('entries')).then(function() {

            var deferreds = [];
            _this.get('entries').each(function(entry) {

                // prepare a deferred which will get resolved after successfully fetching an item from datastore
                var deferred = $.Deferred();
                deferreds.push(deferred.promise());

                entry.fetch({
                    success: function() {
                        deferred.resolve(entry);
                    },
                    error: function() {
                        // HACK: sometimes, the item has vanished while fetching from store, so let's recreate it
                        console.log('error while fetching basket entry:', entry);
                        entry.save(null, {
                            success: function() {
                                console.log('success');
                                deferred.resolve(entry);
                            },
                            error: function() {
                                console.log('error');
                                deferred.resolve(entry);
                            },
                        });
                    }
                });
            });

            $.when.apply($, deferreds).then(function() {
                main_deferred.resolve();
            });
        });

        return main_deferred.promise();

    },

});


BasketEntryModel = Backbone.RelationalModel.extend({

    sync: Backbone.localforage.sync('BasketEntry'),

    defaults: {
        number: undefined,
        timestamp: undefined,
        title: undefined,
        rating: undefined,
        dismiss: undefined,
        // TODO: link to QueryModel
        //query: undefined,
    },

    initialize: function() {
        console.log('BasketEntryModel.initialize');
    },
});

BasketView = Backbone.Marionette.ItemView.extend({

    template: "#basket-template",

    initialize: function() {
        console.log('BasketView.initialize');
        this.listenTo(this.model, "change", this.render);
        this.listenTo(this, "item:rendered", this.setup_ui);
    },

    serializeData: function() {

        var _this = this;

        var data = {};
        data = this.model.toJSON();

        _(data).extend(this.params_from_query());

        var numbers = this.model.get_numbers();
        if (numbers) {
            data['numbers_display'] = numbers.join('\n');
        }

        return data;

    },

    // initialize more template variables from url query parameters
    // TODO: refactor to utils.js modulo basket_option_names
    params_from_query: function() {
        var tplvars = {};
        var basket_option_names = ['ship-url', 'ship-param'];
        var _this = this;
        var url = $.url(window.location.href);
        _(basket_option_names).each(function(query_name) {
            var attribute_name = query_name.replace('-', '_');
            var value = url.param(query_name);
            // fall back to deprecated parameter name for backwards compatibility
            if (!value) {
                value = url.param(attribute_name);
            }
            if (value) {
                value = decodeURIComponent(value);
                value = value.split(',');
                tplvars[attribute_name] = value;
            }
        });

        _(tplvars).defaults({ship_param: 'payload'});

        return tplvars;
    },

    setup_ui: function() {
        console.log('BasketView.setup_ui');

        var _this = this;

        // basket import
        $('#basket-import-button').click(function(e) {
            _this.future_premium_feature();
            return false;
        });

        // only enable submit button, if ship url is given
        var params = this.params_from_query();
        if (params.ship_url) {
            $('#basket-submit-button').prop('disabled', false);
        } else {
            $('#basket-submit-button').prop('disabled', true);
        }

        // review feature: trigger search from basket content
        $('.basket-review-button').click(function() {
            _this.model.review();
        });

        // basket sharing
        $('#share-numberlist-email').click(function() {

            var projectname = opsChooserApp.project.get('name');

            var numbers = _this.model.get_numbers();
            var numbers_count = numbers.length;
            var numbers_string = numbers.join('\n');

            var subject = _.template('[IPSUITE] Shared <%= count %> patent numbers through project <%= projectname %> at <%= date %>')({
                count: numbers_count,
                date: now_iso_human(),
                projectname: projectname,
            });
            var body = numbers_string + '\r\n\r\n--\r\nPowered by https://patentsearch.elmyra.de/';
            var mailto_link = _.template('mailto:?subject=<%= subject %>&body=<%= body %>')({
                subject: encodeURIComponent(subject),
                body: encodeURIComponent(body),
            });
            $(this).attr('href', mailto_link);
        });
        $('#share-documents-transfer').click(function() {
            _this.future_premium_feature();
        });

        // display number of entries in basket
        var entry_count = this.model.get('entries').length;
        $('.basket-entry-count').text(entry_count);

    },

    future_premium_feature: function() {
        bootbox.dialog(
            'Available soon via subscription.', [{
                "label": 'OK',
                "icon" : 'OK',
                "callback": null,
            }],
            {header: 'Future feature'});
    },

    onDomRefresh: function() {
        console.log('BasketView.onDomRefresh');
    },

    // backpropagate current basket entries into checkbox state
    link_document: function(entry) {

        // why do we have to access the global object here?
        // maybe because of the event machinery which dispatches to us?
        var numbers = opsChooserApp.basketModel.get_numbers();

        var checkbox_element = $('#' + 'chk-patent-number-' + entry);
        var add_button_element = $('#' + 'add-patent-number-' + entry);
        var remove_button_element = $('#' + 'remove-patent-number-' + entry);

        // number is not in basket, show "add" button
        if (!_(numbers).contains(entry)) {
            checkbox_element && checkbox_element.prop('checked', false);
            add_button_element && add_button_element.show();
            remove_button_element && remove_button_element.hide();

        // number is already in basket, show "remove" button
        } else {
            checkbox_element && checkbox_element.prop('checked', true);
            add_button_element && add_button_element.hide();
            remove_button_element && remove_button_element.show();

        }

    },

});
