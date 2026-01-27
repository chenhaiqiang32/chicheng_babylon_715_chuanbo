if (!window.registry) {
  Object.defineProperty(Node.prototype, 'active', {
    get: function () {
      return this._nodeDataStorage._isVisible;
    },
    set: function (v: boolean) {
      this._nodeDataStorage._isVisible = v;
    },
  });
  window.registry = true;
}
