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

    this.controller.setupWidget('sort-by', sortByAttributes, this.sortByModel = {value: ""});

    var modelize = function(str) {
        var s = str.split("-");
        var r = "";

        for(var i=0; i<s.length; i++)
            r += i!=0 ? s[i].charAt(0).toUpperCase() + s[i].slice(1) : s[i];

        return r + "Model";
    };

    this.setupToggleRow = function(name, nnme, na_attr, nn_attr) {
        if( !na_attr ) na_attr = textFieldAttributes;
        if( !nn_attr ) nn_attr = textFieldAttributes;

        try {

            this.controller.setupWidget(name, na_attr, this[modelize(name)] = {value: ""});
            this.controller.setupWidget(nnme, nn_attr, this[modelize(nnme)] = {value: ""});

            Mojo.Event.listen(this.controller.get(name + "-t"), Mojo.Event.tap, function(){
                this.controller.get(name + "-c").addClassName("generically-hidden");
                this.controller.get(nnme + "-c").removeClassName("generically-hidden");
            }.bind(this));

            Mojo.Event.listen(this.controller.get(nnme + "-t"), Mojo.Event.tap, function(){
                this.controller.get(nnme + "-c").addClassName("generically-hidden");
                this.controller.get(name + "-c").removeClassName("generically-hidden");
            }.bind(this));

        } catch(e) {
            Mojo.Log.error("problem with setupToggleRow(%s,%s): %s", name, nnme, e);
        }

    }.bind(this);

    this.setupToggleRow("query",              "not-query");
    this.setupToggleRow("task-contains",      "task-lacks");
    this.setupToggleRow("notes-contains",     "notes-lacks");
    this.setupToggleRow("tag-contains",       "tag-lacks");
    this.setupToggleRow("owner-is",           "owner-isnt");
    this.setupToggleRow("requestor-is",       "requestor-isnt");
    this.setupToggleRow("nextaction-by",      "nextaction-notby");
    this.setupToggleRow("hidden-until-after", "hidden-until-before");
    this.setupToggleRow("due-after",          "due-before");
    this.setupToggleRow("completed-after",    "completed-before");

    var prios = [
        {label: "Highest", value: "highest", iconPath: 'img/highest.png' },
        {label: "High",    value: "high",    iconPath: 'img/high.png'    },
        {label: "Normal",  value: "normal",  iconPath: 'img/normal.png'  },
        {label: "Low",     value: "low",     iconPath: 'img/low.png'     },
        {label: "Lowest",  value: "lowest",  iconPath: 'img/lowest.png'  },
    ];
    this.setupToggleRow("priority-higher-than", 'priority-lower-than',
        {label: "priority higher than", choices: prios},
        {label: "priority lower than",  choices: prios});

    this.setupToggleRow("but-first", "and-then");

    this.controller.setupWidget('group', textFieldAttributes, this.groupModel = {value: ""});

     if( AMO.isCurrentAccountPro() ) {
        this.setupToggleRow("estimate-less-than", "estimate-greater-than");
        this.setupToggleRow("worked-less-than",   "worked-greater-than");
        this.setupToggleRow("left-less-than",     "left-greater-than");

    } else {
        this.controller.get("last-row-before-pro").addClassName("last");
        this.controller.get("pro").addClassName('generically-hidden');
    }

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

    // group/1/query/2/not/query/3/sort_by/4
    append_txt("query",    "query");
    append_txt("notQuery", "not/query");
    append_txt("group",    "group");
    append_txt("sortBy",   "sort_by");

    // accepted/not/accepted/complete/not/complete/has/attachment/
    // has/no/attachments/unaccepted/not/hidden/forever/hidden/forever
    append_bin("done",        "complete");
    append_bin("notDone",     "not/complete");
    append_bin("accepted",    "accepted");
    append_bin("declined",    "not/accepted");
    append_bin("unaccept",    "unaccepted");
    append_bin("hiddenFE",    "hidden/forever");
    append_bin("notHiddenFE", "not/hidden/forever");

    // description/3/not/description/4/summary/1/not/summary/2/tag/5/not/tag/6
    append_txt("taskContains",  "summary");
    append_txt("taskLacks",     "not/summary");
    append_txt("notesContains", "description");
    append_txt("notesLacks",    "not/description");
    append_txt("tagContains",   "tag");
    append_txt("tagLacks",      "not/tag");

    // next/action/by/5/not/next/action/by/6/owner/1/not/owner/2/requestor/3/not/requestor/4
    append_txt("ownerIs",         "owner");
    append_txt("ownerIsnt",       "not/owner");
    append_txt("requestorIs",     "requestor");
    append_txt("requestorIsnt",   "not/requestor");
    append_txt("nextactionBy",    "next/action/by");
    append_txt("nextactionNotby", "not/next/action/by");

    // completed/after/5/completed/before/6/due/after/3/due/before/4/
    // priority/above/2/priority/below/4/hidden/until/after/1/hidden/until/before/2
    append_txt("hiddenUntilAfter",   "hiddenUntilAfter");
    append_txt("hiddenUntilBefore",  "hiddenUntilBefore");
    append_txt("dueAfter",           "due/after");
    append_txt("dueBefore",          "due/before");
    append_txt("completedAfter",     "completed/after");
    append_txt("completedBefore",    "completed/before");
    append_txt("priorityHigherThan", "priority/above");
    append_txt("priorityLowerThan",  "priority/below");

    // and/then/2/but/first/1/time/estimate/gt/4/time/estimate/lt/3
    // time/left/gt/8/time/left/lt/7/time/worked/gt/6/time/worked/lt/5
    append_txt("butFirst",            "but/first");
    append_txt("andThen",             "and/then");
    append_txt("estimateLessThan",    "time/estimate/lt");
    append_txt("estimateGreaterThan", "time/estimate/gt");
    append_txt("workedLessThan",      "time/worked/lt");
    append_txt("workedGreaterThan",   "time/worked/gt");
    append_txt("leftLessThan",        "time/left/lt");
    append_txt("leftGreaterThan",     "time/left/gt");

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
