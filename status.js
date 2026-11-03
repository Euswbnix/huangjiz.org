// Online / offline dots on the machine cards. Uses the hub's public load endpoint, reading only whether each
// machine is up. If the hub can't be reached the dots simply stay hidden: the page never depends on this.
(function () {
  var URL = 'https://hub.huangjiz.org/hub/metrics/load';

  function refresh() {
    fetch(URL, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.machines) return;
        d.machines.forEach(function (m) {
          var card = document.querySelector('[data-machine="' + m.title + '"]');
          var dot = card && card.querySelector('.status');
          if (!dot) return;
          dot.hidden = false;
          dot.classList.toggle('off', m.online === false);
          dot.querySelector('span').textContent = m.online === false ? 'offline' : 'online';
        });
      })
      .catch(function () {});
  }

  refresh();
  setInterval(refresh, 60000);
})();
