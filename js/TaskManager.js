
function TaskManager() {
    Mojo.Log.info("TaskManager()");

    Mojo.Log.info("test-md5: %s, %s", hex_md5(""), hex_md5("abc"));

    this.handleLoginChange = this.handleLoginChange.bind(this);

    AMO.registerLoginChange(this.handleLoginChange);
}

TaskManager.prototype.handleLoginChange = function(emails,current) {
    Mojo.Log.info("TaskManager::handleLoginChange(current=%s)", current);

};

/*}}}*/

Mojo.Log.info('loaded(TaskManager.js)');
