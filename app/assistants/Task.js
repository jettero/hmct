
function TaskAssistant(_i) {
    Mojo.Log.info("Task(%s)", (this.item = _i).record_locator);
}

TaskAssistant.prototype.setup = function() {
    Mojo.Log.info("Task()::setup()");

    $("id").update(this.item.record_locator);

    this.tasksListAttrs = {
        dividerFunction: function(mi) { return mi.category },
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

TaskAssistant.prototype.activate = function() {
    Mojo.Log.info("Task()::activate()");
    var hrm = {blarg: true, gralb: true};
    var me  = this;

    for(var k in hrm) {
        var compress     = this.controller.get('compress'     + k);
        var compressable = this.controller.get('compressable' + k).hide();

        compress.addClassName('compressor')
        compress.compressorID = k;

        this.controller.listen(compress, Mojo.Event.tap, this.clickCollapsibleList.bind(this, compressable, k));
		this.tasksListModel.items.findAll(function(i){ return i.category === k }).each(function(i){

            var compressable = me.controller.get('compressable' + i.category);
                compressable.insert( me.controller.get('element' + i.id) );

            me.controller.get('element' + i.id).show();

        });
    }
};

TaskAssistant.prototype.clickCollapsibleList = function(drawer, category, event) {
    Mojo.Log.info("Task()::clickCollapsibleList()");

	var targetRow = this.controller.get(event.target);
    if (!targetRow.hasClassName("selection_target")) {
        Mojo.Log.info("Task()::clickCollapsibleList() !selection_target" );
        targetRow = targetRow.up('.selection_target');
    }		

    if (targetRow) {
        var toggleButton = targetRow.down("div.arrow_button");

        if (!toggleButton.hasClassName('palm-arrow-expanded') && !toggleButton.hasClassName('palm-arrow-closed'))
            return;

        var show = toggleButton.className;
        Mojo.Log.info("Task()::clickCollapsibleList() open/close " + show );
        this._toggleShowHideFolders(targetRow, this.controller.window.innerHeight, null, category);
    }
};
