(function () {
  'use strict';
  var script = document.currentScript;
  if (!script) return;
  var origin = new URL(script.src).origin;
  document.querySelectorAll('[data-opensync]:not([data-opensync-loaded])').forEach(function (el) {
    var id = el.getAttribute('data-opensync');
    if (!/^[a-f0-9-]{36}$/i.test(id)) return;
    el.setAttribute('data-opensync-loaded', 'true');
    var type = el.getAttribute('data-type') || 'hours';
    if (!['hours', 'status', 'banner'].includes(type)) type = 'hours';
    var frame = document.createElement('iframe');
    frame.src = origin + '/embed/' + encodeURIComponent(id) + '?type=' + type;
    frame.title = type === 'banner' ? 'Business announcement' : 'Business opening hours';
    frame.loading = 'lazy';
    frame.style.cssText = 'width:100%;border:0;display:block;min-width:0;';
    frame.height = type === 'hours' ? '590' : type === 'banner' ? '180' : '130';
    frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    window.addEventListener('message', function(event) {
      if(event.origin !== origin || event.source !== frame.contentWindow || !event.data || event.data.type !== 'opensync:resize' || event.data.id !== id) return;
      var height = event.data.height;
      if(typeof height === 'number' && Number.isFinite(height) && height >= 0 && height <= 4000) frame.height = String(Math.ceil(height));
    });
    el.appendChild(frame);
  });
})();
