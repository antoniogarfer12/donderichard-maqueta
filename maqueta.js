// MAQUETA: sustituye al servidor con datos de ejemplo para enseñar la web sin instalar nada.
// Se abre con doble clic en index.html. No guarda ninguna cita.
(function () {
  const cfg = {
    nombre: 'DondeRichard',
    sillas: 2,
    peluqueros: [
      { id: 'richard', nombre: 'Richard' },
      { id: 'peluquero2', nombre: 'Peluquero 2' },
      { id: 'peluquero3', nombre: 'Peluquero 3' },
    ],
    servicios: [
      { id: 'corte', nombre: 'Corte de pelo', duracion: 30, precio: 15 },
      { id: 'barba', nombre: 'Arreglo de barba', duracion: 15, precio: 8 },
      { id: 'corte-barba', nombre: 'Corte + barba', duracion: 45, precio: 20 },
      { id: 'nino', nombre: 'Corte niño', duracion: 30, precio: 12 },
    ],
    horario: {
      0: [],
      1: [['10:00', '14:00'], ['17:00', '20:30']],
      2: [['10:00', '14:00'], ['17:00', '20:30']],
      3: [['10:00', '14:00'], ['17:00', '20:30']],
      4: [['10:00', '14:00'], ['17:00', '20:30']],
      5: [['10:00', '14:00'], ['17:00', '20:30']],
      6: [['10:00', '14:00']],
    },
    diasReservables: 21,
  };

  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const aMin = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
  const aHora = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  // Número pseudoaleatorio estable para que cada día tenga siempre los mismos huecos ocupados.
  function azar(texto) {
    let h = 2166136261;
    for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return ((h >>> 0) % 1000) / 1000;
  }

  function huecos(fecha, servicioId, peluqueroId) {
    const srv = cfg.servicios.find((s) => s.id === servicioId);
    if (!srv || !fecha) return [];
    const d = new Date(fecha + 'T00:00:00');
    const esHoy = fecha === iso(new Date());
    const ahora = new Date().getHours() * 60 + new Date().getMinutes() + 30;
    const ocupacion = peluqueroId && peluqueroId !== 'cualquiera' ? 0.65 : 0.5;
    const res = [];
    for (const [a, b] of cfg.horario[d.getDay()] || []) {
      for (let ini = aMin(a); ini + srv.duracion <= aMin(b); ini += 15) {
        if (esHoy && ini < ahora) continue;
        if (azar(fecha + peluqueroId + Math.floor(ini / 30)) < ocupacion) continue; // simula citas ya cogidas
        res.push(aHora(ini));
      }
    }
    return res;
  }

  const respuesta = (datos) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(datos) });

  window.fetch = function (url) {
    const u = new URL(url, 'http://maqueta');
    if (u.pathname === '/api/config') return respuesta({ ...cfg, hoy: iso(new Date()) });
    if (u.pathname === '/api/huecos') {
      const q = u.searchParams;
      return respuesta({ huecos: huecos(q.get('fecha'), q.get('servicio'), q.get('peluquero')) });
    }
    return respuesta({});
  };

  // El botón de confirmar (y el de cancelar cita) no hacen nada en la maqueta.
  window.addEventListener('DOMContentLoaded', () => {
    const avisar = (form, idError) => (form.onsubmit = (e) => {
      e.preventDefault();
      const p = document.getElementById(idError);
      p.textContent = 'Esto es una maqueta: no se guarda ninguna cita.';
    });
    avisar(document.getElementById('form'), 'error');
    avisar(document.getElementById('form-cancelar'), 'error-cancelar');
  });
})();
