/*jslint white: false, onevar: false
*/
/*global Mojo $ setTimeout
*/

function TaskAssistant(_i) {
    Mojo.Log.info("Task(%s)", (this.item = _i).record_locator);

    this.clickCollapsibleList = this.clickCollapsibleList.bind(this);
}

TaskAssistant.prototype.setup = function() {
    Mojo.Log.info("Task()::setup()");

    $("id").update(this.item.record_locator);

    this.tasksListAttrs = {
        dividerFunction: function(mi) { return mi.category; },
        dividerTemplate: 'misc/li-task-div',
        listTemplate:    'misc/naked-list-container',
        emptyTemplate:   'misc/empty-list',
        itemTemplate:    'misc/li-task-row',
        swipeToDelete:   false
    };

    this.tasksListModel = {listTitle: 'Hiveminder Tasks', items: [

        {id: 1, row_name: "test", category: "blarg", row_data: "test test test test"},
        {id: 2, row_name: "test", category: "blarg", row_data: "test test test test"},
        {id: 3, row_name: "test", category: "blarg", row_data: "test test test test"},
        {id: 4, row_name: "test", category: "blarg", row_data: "test test test test"},
             
        {id: 5, row_name: "test", category: "gralb", row_data: "test test test test"},
        {id: 6, row_name: "test", category: "gralb", row_data: "test test test test"},
        {id: 7, row_name: "test", category: "gralb", row_data: "test test test test"},
        {id: 8, row_name: "test", category: "gralb", row_data: "test test test test"}

    ]};

    this.controller.setupWidget('hm_task_list', this.tasksListAttrs, this.tasksListModel);
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
        me.clickCollapsibleList(compressible, category, e); });

    this.moveElementIntoDividers(category);
    compressible.hide();
};

TaskAssistant.prototype.activate = function() {
    Mojo.Log.info("Task()::activate()");

    this.startCompressor("blarg");
    this.startCompressor("gralb");
};

TaskAssistant.prototype.moveElementIntoDividers = function(category) {
    Mojo.Log.info("Task()::moveElementIntoDividers(category: %s)", category);

    var compressible = this.controller.get('compressible' + category);

    var me = this;
    this.tasksListModel.items.findAll(function(item){ return item.category === category; }).each(function(item){
        compressible.insert( me.controller.get('element' + item.id) );
    });
};

TaskAssistant.prototype.clickCollapsibleList = function(compressible, category, event) {
    Mojo.Log.info("Task()::clickCollapsibleList()");

    var targetRow = this.controller.get(event.target);
    if (!targetRow.hasClassName("selection_target"))
        targetRow = targetRow.up('.selection_target');

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
