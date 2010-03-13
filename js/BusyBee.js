/*jslint white: false, onevar: false
*/
/*global $
*/

function BusyBee() {
    this.tasks = {};
}

BusyBee.prototype.busy = function(task) {
    Mojo.Log.info("BusyBee::busy(%s)", task);

    this.tasks[task] = true;

    $("wait").setStyle({display: 'block'});
};                                                                                                                             

BusyBee.prototype.done = function(task) {
    Mojo.Log.info("BusyBee::done(%s)", task);

    delete this.tasks[task];

    for( var k in this.tasks ) {
        Mojo.Log.info("BusyBee::done() [tasks remaining]");
        return;
    }

    Mojo.Log.info("BusyBee::done() [all done, hiding bee]");
    $("wait").setStyle({display: 'none'});
};  

