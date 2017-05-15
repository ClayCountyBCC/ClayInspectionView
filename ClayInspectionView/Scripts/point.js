var IView;
(function (IView) {
    var Point = (function () {
        function Point(X, Y) {
            this.X = X;
            this.Y = Y;
        }
        return Point;
    }());
    IView.Point = Point;
})(IView || (IView = {}));
//# sourceMappingURL=point.js.map