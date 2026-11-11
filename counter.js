/* Licznik czystych podciągnięć z punktów sylwetki (MediaPipe Pose, 33 punkty).
   Powtórzenie liczy się tylko wtedy, gdy start był z wyprostowanych rąk, a broda minęła linię nadgarstków. */
(function () {
  const CFG = { straight: 155, bent: 130, minVis: 0.5 };
  const angle = (a, b, c) => {
    const ux = a.x - b.x, uy = a.y - b.y, vx = c.x - b.x, vy = c.y - b.y;
    const d = (ux * vx + uy * vy) / ((Math.hypot(ux, uy) * Math.hypot(vx, vy)) || 1);
    return Math.acos(Math.max(-1, Math.min(1, d))) * 180 / Math.PI;
  };
  const MSG = {
    wait: 'Zawiśnij na wyprostowanych rękach',
    ready: 'Gotowe. Podciągnij się',
    up: 'W górę, broda nad drążek',
    top: 'Zaliczone. Opuść się do wyprostu',
    down: 'Niżej, do pełnego wyprostu rąk'
  };
  function create() { return { phase: 'wait', count: 0, faults: 0, fault: '', ang: 180, ok: false, msg: MSG.wait, ev: null }; }

  /* lm: tablica 33 punktów {x,y,visibility} w układzie 0..1; aspect = szerokość/wysokość obrazu */
  function step(s, lm, aspect) {
    s.ev = null;
    const need = [0, 9, 10, 11, 12, 13, 14, 15, 16];
    if (!lm || need.some(i => !lm[i] || (lm[i].visibility != null && lm[i].visibility < CFG.minVis))) {
      s.ok = false; s.msg = 'Nie widzę głowy, barków i obu rąk'; return s;
    }
    const P = i => ({ x: lm[i].x * aspect, y: lm[i].y });
    const wristY = (lm[15].y + lm[16].y) / 2, shoulderY = (lm[11].y + lm[12].y) / 2;
    const mouthY = (lm[9].y + lm[10].y) / 2, chinY = mouthY + (mouthY - lm[0].y);
    const scale = Math.abs(lm[11].x - lm[12].x) * aspect || 0.1;
    if (wristY >= shoulderY) { s.ok = false; s.phase = 'wait'; s.msg = 'Chwyć drążek, ręce nad głową'; return s; }
    s.ok = true;
    const a = (angle(P(11), P(13), P(15)) + angle(P(12), P(14), P(16))) / 2;
    s.ang = s.ang * 0.6 + a * 0.4;
    const over = chinY < wristY, under = chinY > wristY + 0.15 * scale, straight = s.ang >= CFG.straight;
    if (s.phase === 'wait') { if (straight) s.phase = 'ready'; }
    else if (s.phase === 'ready') { if (s.ang < CFG.bent) s.phase = 'up'; }
    else if (s.phase === 'up') {
      if (over) { s.count++; s.fault = ''; s.phase = 'top'; s.ev = 'rep'; }
      else if (straight) { s.faults++; s.fault = 'Nie liczę: broda nie minęła drążka'; s.phase = 'ready'; s.ev = 'fault'; }
    }
    else if (s.phase === 'top') { if (under) s.phase = 'down'; }
    else if (s.phase === 'down') {
      if (straight) s.phase = 'ready';
      else if (over) { s.faults++; s.fault = 'Nie liczę: brak pełnego wyprostu na dole'; s.phase = 'top'; s.ev = 'fault'; }
    }
    s.msg = MSG[s.phase];
    return s;
  }
  window.PullCounter = { create, step, CFG };
})();
