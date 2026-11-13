// Physics Lens — the notes page (concepts.html): every section of the course, written out the way a student would keep notes.
// Built from the pack's data by concepts.js; works offline; prints cleanly. #<chapter> or #eq-<id> jumps to a place.
import { CHAPTERS } from './data.js';
import { chapterHTML, esc } from './concepts.js';

const body = document.getElementById('notesBody'), toc = document.getElementById('notesToc');
toc.innerHTML = Object.entries(CHAPTERS).map(([id, c]) => `<a href="#${esc(id)}">${esc(c.short || c.title)}</a>`).join('');
body.innerHTML = Object.keys(CHAPTERS).map(chapterHTML).join('');
// an equation anchor may sit inside any chapter: scroll once the page has been built
const go = () => { const h = decodeURIComponent(location.hash.slice(1)); const t = h && document.getElementById(h); if (t){ t.scrollIntoView(); t.classList.add('n-hit'); } };
go(); addEventListener('hashchange', go);
document.getElementById('notesPrint').onclick = () => print();
