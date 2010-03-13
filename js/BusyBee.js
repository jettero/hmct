/*jslint white: false, onevar: false
*/
/*global $
*/

function BusyBee() {
    this.tasks = {};
}

BusyBee.prototype.busy = function(task) {
    this.tasks[task] = true;

    $("wait").setStyle({display: 'block'});
};                                                                                                                             

BusyBee.prototype.done = function(task) {

    delete this.tasks[task];

    for( var k in this.tasks )
        return;

    $("wait").setStyle({display: 'none'});
};  

