/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo Template OPT
*/

function ErrorDialog(launcher) {
    this.logTemplate = new Template(launcher + "::#{fname}() [#{desc}]: #{error}");
    this.showError = this.showError.bind(this);
}

ErrorDialog.prototype.showError = function(fname,desc,error) {
    Mojo.Log.error( this.logTemplate.evaluate({fname: fname, desc: desc, error: error}) );
    Mojo.Controller.errorDialog( error.length > OPT.maxErrLen ? error.substr(0, OPT.maxErrLen-4) + " ..." : error );
};
