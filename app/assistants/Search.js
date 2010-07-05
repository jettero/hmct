/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo $ OPT TMO AMO escape
*/

function SearchAssistant() {
    Mojo.Log.info("Search()");
}

SearchAssistant.prototype.setup = function() {
    Mojo.Log.info("Search::setup()");

    this.searchModel = { label: "Search", icon: 'search', command: 'search' };
    this.commandMenuModel = { label: 'Search Command Menu', items: [ {}, {}, this.searchModel ]};
	this.controller.setupWidget(Mojo.Menu.commandMenu, undefined, this.commandMenuModel);

    var textFieldAttributes = {
        textCase:      Mojo.Widget.steModeLowerCase,
        multiline:     false,
        autoFocus:     false,
        enterSubmits:  true
    };

    // NOTE: secondaryIcon is a cssClassName, sIP is an image path, see widget_submenu.js
    // NOTE: icon/iconPath works the same way.  Lastly, icons are on right, secondary icons are on left
    var sortByAttributes = { label: "Sort By", choices: [
        {label: "Default",    value: ""                                              },
        {label: "Name",       value: "summary"                                       },
        {label: "Priority",   value: "priority",     iconPath: 'img/dull-prio.png'   },
        {label: "Due",        value: "due",          iconPath: 'img/date.png'        },
        {label: "Completed",  value: "completed_at", iconPath: 'img/green-check.png' },
        {label: "Hide until", value: "starts",       iconPath: 'img/date.png'        },
        {label: "Age",        value: "created",      iconPath: 'img/date.png'        },
        {label: "Owner",      value: "owner"                                         },
        {label: "Requestor",  value: "requestor"                                     },
        {label: "Progress",   value: "progress"                                      }
    ]};

    if( AMO.isCurrentAccountPro() )
        sortByAttributes.choices.push({label: "Time Left",  value: "time_left", iconPath: 'img/clock.png' });

    var modelize = function(str) {
        var s = str.split("-");
        var r = "";

        for(var i=0; i<s.length; i++)
            r += i!=0 ? s[i].charAt(0).toUpperCase() + s[i].slice(1) : s[i];

        return r + "Model";
    };

    this.setupToggleRow = function(name, nnme) {
        this.controller.setupWidget(name, textFieldAttributes, this[modelize(name)] = {value: ""});
        this.controller.setupWidget(nnme, textFieldAttributes, this[modelize(nnme)] = {value: ""});

        Mojo.Event.listen(this.controller.get(name + "-t"), Mojo.Event.tap, function(){
            this.controller.get(name + "-c").addClassName("generically-hidden");
            this.controller.get(nnme + "-c").removeClassName("generically-hidden");
        }.bind(this));

        Mojo.Event.listen(this.controller.get(nnme + "-t"), Mojo.Event.tap, function(){
            this.controller.get(nnme + "-c").addClassName("generically-hidden");
            this.controller.get(name + "-c").removeClassName("generically-hidden");
        }.bind(this));

    }.bind(this);

    this.setupToggleRow("query", "not-query");
    this.setupToggleRow("task-contains", "task-lacks");

    this.controller.setupWidget('group',     textFieldAttributes, this.groupModel    = {value: ""});
    this.controller.setupWidget('sort-by',   sortByAttributes,    this.sortByModel   = {value: ""});

    var checkBoxAttributes = { trueValue: 'on', falseValue: 'off' };

    this.controller.setupWidget('done-cb',     checkBoxAttributes, this.doneModel    = {value: "off"});
    this.controller.setupWidget('not-done-cb', checkBoxAttributes, this.notDoneModel = {value: "off"});

    this.controller.setupWidget('accepted-cb', checkBoxAttributes, this.acceptedModel = {value: "off"});
    this.controller.setupWidget('declined-cb', checkBoxAttributes, this.declinedModel = {value: "off"});
    this.controller.setupWidget('unaccept-cb', checkBoxAttributes, this.unacceptModel = {value: "off"});

    this.controller.setupWidget('hiddenfe-cb',     checkBoxAttributes, this.hiddenFEModel    = {value: "off"});
    this.controller.setupWidget('not-hiddenfe-cb', checkBoxAttributes, this.notHiddenFEModel = {value: "off"});
};

SearchAssistant.prototype.buildSearch = function() {
    var query = [];
    var me = this;

    var append_txt = function(x,y) {
        try {
            var q = me[x + "Model"].value;

            if( q ) {
            if( q.match(/\S/) ) {
                query.push(y);
                query.push(escape(q.replace(/^\s+/, "").replace(/\s+$/, "").replace(/\s{2,}/, " ")));
            }}
        }

        catch(e) {
            Mojo.Log.error("problem reading " + x + "-txt from search objects: " + e);
        }
    };

    var append_bin = function(x,y) {
        try {
            var q = me[x + "Model"].value;

            if( q === "on" )
                query.push(y);
        }

        catch(e) {
            Mojo.Log.error("problem reading " + x + "-bin from search objects: " + e);
        }
    };

    append_txt("query",    "query");
    append_txt("notQuery", "not/query");
    append_txt("group",    "group");
    append_txt("sortBy",   "sort_by");

    append_bin("done",     "complete");
    append_bin("notDone",  "not/complete");
    append_bin("accepted", "accepted");
    append_bin("declined", "not/accepted");
    append_bin("unaccept", "unaccepted");

    append_bin("hiddenFE",    "hidden/forever");
    append_bin("notHiddenFE", "not/hidden/forever");

    query = query.join("/");

    Mojo.Log.info("built query: %s", query);
    return query;
};

SearchAssistant.prototype.handleCommand = function(event) {
    Mojo.Log.info("Search::handleCommand()");

    if (event.type === Mojo.Event.command) {
        var s_a = event.command.split(/\s*(?:@@)\s*/);

        switch (s_a[0]) {
            case 'search':
                Mojo.Log.info("Search::handleCommand(search)");
                TMO.searchTasks(this.buildSearch());
                Mojo.Controller.stageController.popScene();
                break;

            default:
                Mojo.Log.info("Search::handleCommand(unknown command: %s)", Object.toJSON(s_a));
                break;
        }
    }

};

Mojo.Log.info('loaded(Search.js)');
