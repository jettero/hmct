/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo $ OPT TMO
*/

function SearchAssistant() {
    Mojo.Log.info("Search()");
}

SearchAssistant.prototype.setup = function() {
    Mojo.Log.info("Search::setup()");

    this.searchModel = { label: "Search", icon: 'search', command: 'search' };
    this.commandMenuModel = { label: 'Search Command Menu', items: [ {}, {}, this.searchModel ]}
	this.controller.setupWidget(Mojo.Menu.commandMenu, undefined, this.commandMenuModel);

    var queryTextFieldAttributes = {
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

    this.controller.setupWidget('query',     queryTextFieldAttributes, this.queryModel    = {});
    this.controller.setupWidget('not-query', queryTextFieldAttributes, this.notQueryModel = {});
    this.controller.setupWidget('sort-by',   sortByAttributes,         this.sortByModel   = {});
};

SearchAssistant.prototype.buildSearch = function() {
    var query = [];

    var append = function(x,y) {
        var q = this[x + "Model"].value;

        if( q ) {
        if( q.match(/\S/) ) {
            query.push(y);
            query.push(escape(q.replace(/^\s+/, "").replace(/\s+$/, "").replace(/\s{2,}/, " ")));
        }}

    }.bind(this);

    append("query",    "query");
    append("notQuery", "not/query");

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
