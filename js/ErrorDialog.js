/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo Template
*/

function ErrorDialog(launcher) {
    this.t = new Template(launcher + " [#{desc}]: #{error}");
}

ErrorDialog.prototype.showError = function(desc,error) {
    var errorText = this.t.evaluate({desc: desc, error: error});

    Mojo.Log.error(errorText);
    Mojo.Controller.errorDialog(errorText.substr(0,100));
};
