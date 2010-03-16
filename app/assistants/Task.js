
function TaskAssistant(_i) {
    Mojo.Log.info("Task(%s)", (this.item = _i).record_locator);
}

TaskAssistant.prototype.setup = function() {
    Mojo.Log.info("Task()::setup()");

    $("id").update(this.item.record_locator);

    this.tasksListAttrs = {
        listTemplate:  'misc/naked-list-container',
        emptyTemplate: 'misc/empty-list',
        itemTemplate:  'misc/li-task-row',
        swipeToDelete: false
    };
    this.tasksListModel = {listTitle: 'Hiveminder Tasks', items: [
        {row_name: "test", row_data: "test test test test"},
        {row_name: "test", row_data: "test test test test"},
        {row_name: "test", row_data: "test test test test"},
        {row_name: "test", row_data: "test test test test"}
    ]};
    this.controller.setupWidget('hm_task_list', this.tasksListAttrs, this.tasksListModel);
};
