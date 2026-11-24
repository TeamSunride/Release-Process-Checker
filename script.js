
(() => {
  const $ = (id) => document.getElementById(id);
  let config, currentId, history = [], answers = {}, activeActions = new Set(), completed = false;

  const themeToggle = $('theme-toggle');
  const themeLabel = $('theme-label');
  const brandLogo = $('brand-logo');

  function syncThemeControls() {
    const dark = document.documentElement.dataset.theme === 'dark';
    themeToggle.setAttribute('aria-pressed', String(dark));
    themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    themeLabel.textContent = dark ? 'Light' : 'Dark';
    brandLogo.src = dark
      ? 'assets/sunride-logo-red-white.png'
      : 'assets/sunride-logo-red-black.png';
  }

  themeToggle.addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme !== 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    syncThemeControls();
  });
  syncThemeControls();

  async function loadConfig() {
    try {
      const response = await fetch('./workflows/electronics.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Workflow file returned ${response.status}`);
      config = await response.json();
    //   $('workflow-name').textContent = config.title;
    //   $('version').textContent = config.version;
      start();
    } catch (err) {
      $('question-area').innerHTML = '<p class="error">The workflow could not be loaded.</p>';
      $('load-error').textContent = `Check that workflows/electronics.json exists and is valid JSON. (${err.message})`;
      $('load-error').classList.remove('hidden');
      $('back').disabled = true;
    }
  }

  function start() {
    currentId = config.start;
    history = [];
    answers = {};
    activeActions = new Set();
    completed = false;
    $('results').classList.add('hidden');
    $('quiz').classList.remove('hidden');
    $('load-error').classList.add('hidden');
    renderQuestion();
  }

  function node() { return config.nodes[currentId]; }

  function renderQuestion() {
    const n = node();
    if (!n) return showError(`Unknown question node: ${currentId}`);
    if (n.type === 'result') return renderResults(n);

    $('question-area').innerHTML = '';
    const title = document.createElement('p');
    title.className = 'question';
    title.textContent = n.question;
    $('question-area').appendChild(title);
    if (n.help) {
      const help = document.createElement('p');
      help.className = 'help';
      help.textContent = n.help;
      $('question-area').appendChild(help);
    }
    const choices = document.createElement('div');
    choices.className = 'choices';
    n.options.forEach(option => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice';
      b.textContent = option.label;
      b.addEventListener('click', () => choose(option.value));
      choices.appendChild(b);
    });
    $('question-area').appendChild(choices);
    // $('step-count').textContent = `${history.length + 0} decision${history.length === 0 ? '' : 's'} answered`;
    // $('progress').style.width = `${Math.min(95, (history.length + 0) / (history.length + 4) * 100)}%`;
    $('back').disabled = history.length === 0;
    $('copy-status').textContent = '';
    const first = choices.querySelector('button');
    if (first) first.focus({ preventScroll: true });
  }

  function choose(value) {
    const n = node();
    history.push({ id: currentId, value });
    answers[currentId] = value;
    const branch = n.next[value];
    (branch.addActions || []).forEach(id => activeActions.add(id));
    (branch.removeActions || []).forEach(id => activeActions.delete(id));
    currentId = branch.to;
    renderQuestion();
  }

  function renderResults(n) {
    completed = true;
    $('quiz').classList.add('hidden');
    $('results').classList.remove('hidden');
    $('result-title').textContent = n.title || 'Your next actions';
    $('result-intro').textContent = n.intro || 'Use this list to complete the applicable steps.';
    const list = $('actions-container');
    list.innerHTML = '';
    const actions = [...activeActions].map(id => config.actions[id]).filter(Boolean);
    const mandatory = actions.filter(a => a.priority !== 'recommended');
    const recommended = actions.filter(a => a.priority === 'recommended');
    $('result-status').textContent = mandatory.length ? `${mandatory.length} required action${mandatory.length === 1 ? '' : 's'}` : 'No required actions';
    $('result-status').classList.toggle('done', mandatory.length === 0);

    function addGroup(label, items) {
      if (!items.length) return;
      const heading = document.createElement('div');
      heading.className = 'section-label';
      heading.textContent = label;
      list.appendChild(heading);
      const ul = document.createElement('ul');
      ul.className = 'action-list';
      items.forEach((a, i) => {
        const li = document.createElement('li');
        li.className = 'action-item';
        const number = document.createElement('span');
        number.className = 'number';
        number.textContent = String(i + 1);
        const body = document.createElement('div');
        const h = document.createElement('h3');
        h.textContent = a.title;
        body.appendChild(h);
        const p = document.createElement('p');
        p.textContent = a.detail || '';
        body.appendChild(p);
        if (a.link) {
          const link = document.createElement('a');
          link.href = a.link;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = 'Open guidance';
          link.style.display = 'inline-block';
          link.style.marginTop = '6px';
          body.appendChild(link);
        }
        li.append(number, body);
        ul.appendChild(li);
      });
      list.appendChild(ul);
    }
    addGroup('Required next actions', mandatory);
    addGroup('Recommended follow-ups', recommended);
    if (!actions.length) {
      const p = document.createElement('div');
      p.className = 'empty';
      p.textContent = 'No actions were added by your answers. Confirm that this path is valid for your change and follow the applicable engineering release procedure.';
      list.appendChild(p);
    }
    $('progress').style.width = '100%';
    $('step-count').textContent = 'Complete';
  }

  function showError(message) {
    $('load-error').textContent = message;
    $('load-error').classList.remove('hidden');
  }

  $('back').addEventListener('click', () => {
    if (!history.length || completed) return;
    const previous = history.pop();
    // Recalculate actions from the beginning so changed answers cannot leave stale actions.
    const replay = [...history];
    answers = {};
    activeActions = new Set();
    currentId = config.start;
    history = [];
    replay.forEach(item => {
      const n = config.nodes[item.id];
      if (!n || !n.next[item.value]) return;
      history.push(item);
      answers[item.id] = item.value;
      const branch = n.next[item.value];
      (branch.addActions || []).forEach(id => activeActions.add(id));
      (branch.removeActions || []).forEach(id => activeActions.delete(id));
      currentId = branch.to;
    });
    currentId = previous.id;
    renderQuestion();
  });

  $('restart').addEventListener('click', start);
  $('new-run').addEventListener('click', start);
//   $('edit-answers').addEventListener('click', () => {
//     completed = false;
//     $('results').classList.add('hidden');
//     $('quiz').classList.remove('hidden');
//     renderQuestion();
//   });
  $('copy').addEventListener('click', async () => {
    const actions = [...activeActions].map(id => config.actions[id]).filter(Boolean);
    const lines = [
    //   `${config.title} — ${config.version}`,
      `Result: ${actions.length ? 'Actions identified' : 'No actions identified'}`,
      '',
      ...actions.map((a, i) => `${i + 1}. ${a.title}\n   ${a.detail || ''}${a.link ? '\n   Guidance: ' + a.link : ''}`)
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      $('copy-status').textContent = 'Action list copied to clipboard.';
    } catch {
      const ta = document.createElement('textarea');
      ta.value = lines.join('\n');
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      $('copy-status').textContent = ok ? 'Action list copied to clipboard.' : 'Copy was blocked by the browser. Select and copy the action list manually.';
    }
  });

  loadConfig();
})();