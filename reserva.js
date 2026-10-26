const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const $ = (s) => document.querySelector(s);
const estado = { servicio: null, peluquero: null, fecha: null, hora: null };
let cfg;

const fechaLarga = (f) => new Date(f + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

function opcion(contenedor, items, clave, alElegir) {
  contenedor.innerHTML = '';
  for (const it of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'opt';
    b.innerHTML = `<b>${it.titulo}</b><small>${it.detalle}</small>`;
    b.onclick = () => {
      contenedor.querySelectorAll('.opt').forEach((x) => x.classList.remove('sel'));
      b.classList.add('sel');
      estado[clave] = it.id;
      alElegir();
    };
    contenedor.appendChild(b);
  }
}

function desbloquear(id) { $(id).classList.remove('locked'); }
function bloquear(id) { $(id).classList.add('locked'); }

async function init() {
  cfg = await fetch('/api/config').then((r) => r.json());

  opcion($('#servicios'), cfg.servicios.map((s) => ({ id: s.id, titulo: s.nombre, detalle: `${s.duracion} min · ${s.precio} €` })), 'servicio', () => {
    desbloquear('#paso2');
    if (estado.peluquero) cargarHoras();
  });

  opcion($('#peluqueros'), [
    { id: 'cualquiera', titulo: 'Me da igual', detalle: 'Más horas disponibles' },
    ...cfg.peluqueros.map((p) => ({ id: p.id, titulo: p.nombre, detalle: 'Peluquero' })),
  ], 'peluquero', () => {
    desbloquear('#paso3');
    if (!estado.fecha) elegirDia(primerDiaAbierto()); else cargarHoras();
  });

  $('#nota-sillas').textContent = `Tenemos ${cfg.sillas} sillas, así que solo mostramos las horas en las que queda sitio.`;

  // Días
  const dias = $('#dias');
  for (let i = 0; i <= cfg.diasReservables; i++) {
    const d = new Date(cfg.hoy + 'T00:00:00');
    d.setDate(d.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dia';
    b.dataset.fecha = iso;
    b.disabled = !(cfg.horario[d.getDay()] || []).length;
    b.innerHTML = `<span>${i === 0 ? 'hoy' : DIAS[d.getDay()].slice(0, 3)}</span><b>${d.getDate()}</b><span>${d.toLocaleDateString('es-ES', { month: 'short' })}</span>`;
    b.onclick = () => elegirDia(iso);
    dias.appendChild(b);
  }

  // Horario
  $('#horario').innerHTML = [1, 2, 3, 4, 5, 6, 0].map((d) => {
    const t = cfg.horario[d] || [];
    return `<div><b>${DIAS[d][0].toUpperCase() + DIAS[d].slice(1)}</b> ${t.length ? t.map(([a, b]) => `${a}–${b}`).join(' / ') : 'Cerrado'}</div>`;
  }).join('');
}

function primerDiaAbierto() {
  return [...document.querySelectorAll('.dia')].find((b) => !b.disabled)?.dataset.fecha;
}

function elegirDia(iso) {
  estado.fecha = iso;
  document.querySelectorAll('.dia').forEach((b) => b.classList.toggle('sel', b.dataset.fecha === iso));
  cargarHoras();
}

async function cargarHoras() {
  if (!estado.servicio || !estado.peluquero || !estado.fecha) return;
  estado.hora = null;
  bloquear('#paso4');
  const q = new URLSearchParams({ fecha: estado.fecha, servicio: estado.servicio, peluquero: estado.peluquero });
  const { huecos } = await fetch('/api/huecos?' + q).then((r) => r.json());
  const cont = $('#horas');
  cont.innerHTML = '';
  $('#sin-horas').classList.toggle('hidden', huecos.length > 0);
  for (const h of huecos) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hora';
    b.textContent = h;
    b.onclick = () => {
      cont.querySelectorAll('.hora').forEach((x) => x.classList.remove('sel'));
      b.classList.add('sel');
      estado.hora = h;
      pintarResumen();
      desbloquear('#paso4');
      $('#paso4').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    cont.appendChild(b);
  }
}

function pintarResumen() {
  const s = cfg.servicios.find((x) => x.id === estado.servicio);
  const p = cfg.peluqueros.find((x) => x.id === estado.peluquero);
  $('#resumen').innerHTML = `
    <div><span>Servicio</span><b>${s.nombre} · ${s.precio} €</b></div>
    <div><span>Peluquero</span><b>${p ? p.nombre : 'El primero libre'}</b></div>
    <div><span>Cuándo</span><b>${fechaLarga(estado.fecha)}, ${estado.hora}</b></div>`;
}

$('#form').onsubmit = async (e) => {
  e.preventDefault();
  const datos = Object.fromEntries(new FormData(e.target));
  const btn = $('#btn-reservar');
  btn.disabled = true;
  $('#error').textContent = '';
  try {
    const r = await fetch('/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...datos, ...estado }),
    });
    const res = await r.json();
    if (!r.ok) {
      $('#error').textContent = res.error;
      if (r.status === 409) cargarHoras();
      return;
    }
    $('#reserva').classList.add('hidden');
    $('#hecho').classList.remove('hidden');
    $('#hecho-texto').textContent = `${res.servicio} con ${res.peluquero}, el ${fechaLarga(res.fecha)} a las ${res.hora}.`;
    $('#hecho-codigo').textContent = res.codigo;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch {
    $('#error').textContent = 'No se pudo conectar. Inténtalo de nuevo.';
  } finally {
    btn.disabled = false;
  }
};

$('#form-cancelar').onsubmit = async (e) => {
  e.preventDefault();
  const datos = Object.fromEntries(new FormData(e.target));
  const r = await fetch('/api/reservas/cancelar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
  const res = await r.json();
  const p = $('#error-cancelar');
  if (!r.ok) { p.style.color = ''; p.textContent = res.error; return; }
  p.style.color = 'var(--ok)';
  p.textContent = `Cita del ${fechaLarga(res.fecha)} a las ${res.hora} cancelada.`;
  e.target.reset();
  cargarHoras();
};

init();

$('#otra').onclick = () => location.reload();
