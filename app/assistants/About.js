function AboutAssistant() {
    Mojo.Log.info("About()");
    this.buildDate = new Date(Mojo.loadJSONFile(Mojo.appPath + "build_date.json"));
}

AboutAssistant.prototype.setup = function() {
    this.controller.get("build-date").update(this.buildDate.toLocaleString());
};

Mojo.Log.info('loaded(About.js)');
