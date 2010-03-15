
function TaskAssistant(_i) {
    Mojo.Log.info("Task(%s)", (this.item = _i).record_locator);
}

TaskAssistant.prototype.setup = function() {
    $("id").update(this.item.record_locator);
};
