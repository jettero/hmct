
function TasksAssistant() {
    Mojo.Log.info("Tasks()");

    this.SC = Mojo.Controller.stageController.assistant;
    this.menuSetup = this.SC.menuSetup.bind(this);
}

/* {{{ /**/ TasksAssistant.prototype.setup = function() {
    Mojo.Log.info("Tasks::setup()");

    this.menuSetup();
};

/*}}}*/

Mojo.Log.info('loaded(Tasks.js)');
