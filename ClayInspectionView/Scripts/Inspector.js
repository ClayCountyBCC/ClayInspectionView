/// <reference path="point.ts" />
/// <reference path="ui.ts" />
/// <reference path="app.ts" />
var IView;
(function (IView) {
    var Inspector = (function () {
        function Inspector() {
        }
        Inspector.prototype.GetInspectors = function () {
            var x = XHR.Get("/API/Inspectors/");
            return new Promise(function (resolve, reject) {
                x.then(function (response) {
                    var ar = JSON.parse(response.Text);
                    return resolve(ar);
                }).catch(function () {
                    console.log("error in Get Inspectors");
                    return reject(null);
                });
            });
        };
        return Inspector;
    }());
    IView.Inspector = Inspector;
})(IView || (IView = {}));
//# sourceMappingURL=Inspector.js.map