(function () {
  var list = document.getElementById('list');
  var q = document.getElementById('q');
  var count = document.getElementById('count');
  var catBar = document.getElementById('cats');
  var base = new URL('./', location.href).href;
  var NONE = '__none__';
  var active = 'all';

  function el(t, c, x) {
    var e = document.createElement(t);
    if (c) e.className = c;
    if (x != null) e.textContent = x;
    return e;
  }

  function safe(u) {
    try {
      var x = new URL(u);
      return (x.protocol === 'https:' || x.protocol === 'http:') ? x.href : null;
    } catch (e) { return null; }
  }

  function clean(s) {
    return String(s == null ? '' : s).replace(/\\n|\n/g, ' ').trim();
  }

  function fmt(n) {
    if (!n) return '';
    return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  }

  function link(txt, href, alt) {
    var u = safe(href);
    if (!u) return null;
    var a = el('a', 'btn' + (alt ? ' alt' : ''), txt);
    a.href = u;
    a.rel = 'noopener';
    return a;
  }

  function latest(m) {
    var v = Array.isArray(m.versions) ? m.versions : [];
    return v.reduce(function (a, b) {
      return (!a || (b.versionCode || 0) >= (a.versionCode || 0)) ? b : a;
    }, null);
  }

  // Returns [{key, label}] for a module; modules without categories get Uncategorized.
  function catsOf(m) {
    var raw = Array.isArray(m.categories) ? m.categories : (m.categories ? [m.categories] : []);
    var seen = {}, out = [];
    raw.forEach(function (c) {
      var label = clean(c);
      var key = label.toLowerCase();
      if (label && !seen[key]) { seen[key] = 1; out.push({ key: key, label: label }); }
    });
    return out.length ? out : [{ key: NONE, label: 'Uncategorized' }];
  }

  function card(m) {
    var d = el('details', 'mod');
    var s = el('summary');
    s.appendChild(el('span', 'nm', m.name || m.id));
    if (m.version) s.appendChild(el('span', 'ver', m.version));
    d.appendChild(s);

    var b = el('div', 'body');
    if (m.description) b.appendChild(el('p', '', clean(m.description)));

    var meta = [];
    if (m.author) meta.push('By ' + clean(m.author));
    if (m.size) meta.push(fmt(m.size));
    if (meta.length) b.appendChild(el('p', 'meta', meta.join(', ')));

    var links = el('div', 'links');
    var v = latest(m);
    [
      v && link('Download ZIP', v.zipUrl, false),
      v && link('Changelog', v.changelog, true),
      m.track && link('Source', m.track.source, true),
      link('Support', m.support, true)
    ].forEach(function (a) { if (a) links.appendChild(a); });
    if (links.children.length) b.appendChild(links);

    d.appendChild(b);
    d.dataset.find = [m.name, m.id, m.author, m.description].map(clean).join(' ').toLowerCase();
    d.dataset.cats = '|' + catsOf(m).map(function (c) { return c.key; }).join('|') + '|';
    return d;
  }

  function buildChips(mods) {
    var map = {};
    mods.forEach(function (m) {
      catsOf(m).forEach(function (c) {
        if (!map[c.key]) map[c.key] = { key: c.key, label: c.label, n: 0 };
        map[c.key].n++;
      });
    });
    var cats = Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) {
      if (a.key === NONE) return 1;
      if (b.key === NONE) return -1;
      return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
    });

    catBar.textContent = '';
    // Only show the bar when there is something to filter by.
    if (!cats.length || (cats.length === 1 && cats[0].key === NONE)) return;

    [{ key: 'all', label: 'All', n: mods.length }].concat(cats).forEach(function (c) {
      var b = el('button', 'chip');
      b.type = 'button';
      b.dataset.key = c.key;
      b.setAttribute('aria-pressed', c.key === active ? 'true' : 'false');
      b.appendChild(el('span', 'n', c.n));
      b.appendChild(el('span', '', c.label));
      b.addEventListener('click', function () {
        // Tapping the selected category again goes back to All.
        active = (active === c.key && c.key !== 'all') ? 'all' : c.key;
        catBar.querySelectorAll('.chip').forEach(function (x) {
          x.setAttribute('aria-pressed', x.dataset.key === active ? 'true' : 'false');
        });
        filter();
      });
      catBar.appendChild(b);
    });
  }

  function filter() {
    var t = q.value.trim().toLowerCase();
    var cards = list.querySelectorAll('.mod');
    var n = 0;
    cards.forEach(function (c) {
      var okText = !t || c.dataset.find.indexOf(t) > -1;
      var okCat = active === 'all' || c.dataset.cats.indexOf('|' + active + '|') > -1;
      var ok = okText && okCat;
      c.hidden = !ok;
      if (ok) n++;
    });
    var filtered = t || active !== 'all';
    count.textContent = cards.length
      ? (filtered ? n + ' of ' + cards.length + ' modules' : cards.length + ' modules')
      : '';
    var empty = list.querySelector('.empty');
    if (cards.length && !n) {
      if (!empty) {
        empty = el('div', 'state empty', 'No modules match your filters.');
        list.appendChild(empty);
      }
    } else if (empty) {
      empty.remove();
    }
  }

  document.getElementById('copy').addEventListener('click', function () {
    var b = this;
    function done(t) {
      b.textContent = t;
      setTimeout(function () { b.textContent = 'Copy repo URL'; }, 1800);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(base).then(
        function () { done('Copied'); },
        function () { done('Copy failed'); }
      );
    } else {
      done('Copy failed');
    }
  });

  q.addEventListener('input', filter);

  fetch(base + 'json/modules.json', { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then(function (data) {
      if (data.name) {
        document.getElementById('title').textContent = data.name;
        document.title = data.name;
      }
      document.getElementById('desc').textContent = clean(data.description);

      var mods = (Array.isArray(data) ? data : data.modules || []).slice().sort(function (a, b) {
        return String(a.name || a.id).toLowerCase().localeCompare(String(b.name || b.id).toLowerCase());
      });

      list.textContent = '';
      if (!mods.length) {
        list.appendChild(el('div', 'state', 'No modules yet. Run the sync workflow to add some.'));
        return;
      }
      mods.forEach(function (m) { list.appendChild(card(m)); });
      buildChips(mods);
      filter();
    })
    .catch(function () {
      list.textContent = '';
      list.appendChild(el('div', 'state', 'Could not load json/modules.json. Check that the sync workflow has run and Pages is deployed.'));
    });
})();