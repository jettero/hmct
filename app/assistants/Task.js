/*jslint white: false, onevar: false
*/
/*global Mojo $ setTimeout
*/

function TaskAssistant(_i) {
    Mojo.Log.info("Task(%s)", (this.item = _i).record_locator);
}

TaskAssistant.prototype.setup = function() {
    Mojo.Log.info("Task()::setup()");

    this.controller.get("id").update(this.item.record_locator);

    this.tasksListAttrs = {
        dividerFunction: function(mi) { return mi.category; },
        dividerTemplate: 'misc/li-generic-div',
        listTemplate:    'misc/naked-list-container',
        emptyTemplate:   'misc/empty-list',
        itemTemplate:    'misc/li-generic-row',
        swipeToDelete:   false
    };

    // {"priority": 3, "record_locator": "YU68", "time_worked": "54m41s",
    // "attachment_count": 0, "repeat_period": "once", "group": null,
    // "summary": "address checker", "time_left": null, "id": 1009798,
    // "repeat_every": 1, "owner": "Paul Miller <paul@xxxxxxxxxx>", "due":
    // "2010-03-16", "time_estimate": null, "last_modified": "2010-03-19
    // 17:28:23", "repeat_stacking": 0, "repeat_days_before_due": 1,
    // "description": "On Mon, Mar 15, 2010 at 9:10 AM, David Stoll
    // <dstoll@xxxxxxx> wrote:\n> finalize the address checker and get it
    // posted to the...", "tags": "work", "starts": "2010-03-16", "created":
    // "2010-03-15 10:29:00", "will_complete": 1, "accepted": 1, "type":
    // "task", "requestor": "Paul Miller (work) <paul@xxxxx>",
    // "completed_at": null, "repeat_next_create": null, "complete": 0,
    // "next_action_by": "Paul Miller (work) <paul@xxxxxxx>"}

    Mojo.Log.info("testtest(%s,%s)", Mojo.appPath, palmGetResource(Mojo.appPath + "sources.json", true));

    var items = [];
    var _set = function(cat, key, title) {
        if( !title )
            title = key.replace(/_/, " ");

        var x = { id: key, row_name: title, category: cat, row_data: this.item[key] };

        if( x.row_data )
            items.push(x);

    }.bind(this);

    var set_ti = function(key, title) { _set("basic", key, title); };
    var set_ei = function(key, title) { _set("extra", key, title); };

    set_ti("summary");
    set_ti("description");
    set_ti("due");
    set_ti("time_worked");
    set_ti("time_left");

    if( this.item.requestor !== this.item.owner )
        set_ti("requestor");

    set_ei("created");
    set_ei("last_modified");
    set_ti("time_estimate");

    this.tasksListModel = {listTitle: 'Hiveminder Tasks', items: items};
    this.controller.setupWidget('hm_task_list', this.tasksListAttrs, this.tasksListModel);
};

TaskAssistant.prototype.activate = function() {
    Mojo.Log.info("Task()::activate()");

    this.startCompressor("basic");
    this.startCompressor("extra");

    // force a click on task info
    this.clickCollapsibleList( this.controller.get('compressible' + "basic"), "basic" );
};

TaskAssistant.prototype.startCompressor = function(category) {
    Mojo.Log.info("Task()::startCompressor(%s)", category);

    var compressible = this.controller.get('compressible' + category);
    var compress     = this.controller.get('compress'     + category);

    compress.addClassName('compressor');
    compress.compressorID = category;

    var me = this;
    this.controller.listen(compress, Mojo.Event.tap, function(e) {
        Mojo.Log.info("Task()::startCompressor() lambda:[tap event for: %s]", category);
        me.clickCollapsibleList(compressible, category); });

    this.moveElementIntoDividers(category);
    compressible.hide();
};

TaskAssistant.prototype.moveElementIntoDividers = function(category) {
    Mojo.Log.info("Task()::moveElementIntoDividers(category: %s)", category);

    var compressible = this.controller.get('compressible' + category);

    var me = this;
    this.tasksListModel.items.findAll(function(item){ return item.category === category; }).each(function(item){
        compressible.insert( me.controller.get('element' + item.id) );
    });
};

TaskAssistant.prototype.clickCollapsibleList = function(compressible, category) {
    Mojo.Log.info("Task()::clickCollapsibleList()");

    var targetRow = this.controller.get(category + "-sit");

    if (targetRow) {
        compressible.show(); // show immediately or getHeight() is mysteriously off by 76px ...

        var toggleButton    = targetRow.down("div.arrow_button");
        var showContents    = toggleButton.hasClassName('palm-arrow-closed');
        var maxHeight       = compressible.getHeight();

        var options = {
            curve:      'over-easy',
            from:       1,
            to:         maxHeight,
            duration:   0.4
        };

        if (showContents) {
            toggleButton.addClassName('palm-arrow-expanded');
            toggleButton.removeClassName('palm-arrow-closed');
            compressible.setStyle({ height: '1px' });

            options.onComplete = function(e) {
                compressible.setStyle({height: 'auto'});
            };

        } else {
            toggleButton.addClassName('palm-arrow-closed');
            toggleButton.removeClassName('palm-arrow-expanded');

            compressible.setStyle({ height: maxHeight + 'px' });

            options.reverse    = true;
            options.onComplete = function(e) {
                compressible.setStyle({height: 'auto'});
                compressible.hide();
            };
        }

        Mojo.Animation.animateStyle(compressible, 'height', 'bezier', options);
    }
};
