/* templates/interface_avatar/dessin_avatar.js
 *
 * Pack Interface / Avatar IA — les 21 avatars DESSINES, plein ecran (scene carree 400 x 400).
 * SOURCE UNIQUE : ressource Lovelace de la carte (televersee par le deploiement), page du site
 * (chargee a la demande), outils de recette (Node, Chromium).
 *
 * JavaScript ES2017 SANS module. UNE seule globale, `AvatarIADessin` (window, ou globalThis
 * sous Node) :
 *   ids                       l'ordre du catalogue (templates/interface_avatar/<id>/)
 *   svg(id, prefixe)          '<svg class="av-svg av-<id>" viewBox="0 0 400 400">...</svg>'
 *   css(id, ancetre)          feuille CSS : regles communes + regles de l'avatar
 *   scene(id, options)        le contenu d'une scene : <style>, le dessin, les 4 videos
 *   monter(hote, cfg)         remplit la scene d'une carte (racine d'ombre de button-card)
 *
 * Regles tenues :
 *  - DETERMINISTE : ni Math.random ni Date. Tout ce qui est « seme » (etoiles, pluie de code,
 *    voyants) l'est par un generateur a graine fixe (mulberry32), graine tiree de l'id : la
 *    meme chaine sort a chaque appel. button-card ne recree un champ que si sa chaine change,
 *    et une scene qui changerait a chaque rendu relancerait ses animations.
 *  - Les id SVG sont prefixes (`prefixe` + id de l'avatar) : deux avatars rendus dans la meme
 *    page ne se marchent pas dessus (lecon du pack Piscine : `url(#eau)` se resolvait sur le
 *    PREMIER bassin de la page).
 *  - Aucun fichier externe, aucun <script>, aucun filtre SVG : les lueurs sont des couches
 *    d'opacite (traits larges translucides, degrades radiaux). Seules polices : celles du
 *    systeme (sans-serif, monospace), pour les rares inscriptions (HAL 9000, WOPR, MU/TH/UR).
 *  - Les ETATS ne changent que des attributs de l'ancetre (data-etat, data-audio) et la
 *    variable --bouche (amplitude reelle de la voix, posee par le pilote) : tout mouvement est
 *    en CSS. Un groupe ANIME ne porte JAMAIS d'attribut transform (le CSS l'ecraserait) : le
 *    placement statique se fait sur un groupe parent.
 *  - Vitesse qui change avec l'etat : on CROISE deux couches (une lente toujours la, une
 *    rapide en fondu), on ne change jamais la duree d'une animation en cours (elle sauterait).
 *  - Les noms d'animation sont prefixes « avc- » (communs) ou « <id>- » (propres a l'avatar) :
 *    deux @keyframes du meme nom dans une racine d'ombre, c'est la DERNIERE qui gagne partout
 *    (piege paye le 29/09/2026).
 */
(function (G) {
  'use strict';

  var VERSION = '2026.10.04';
  var ORDRE = ['jarvis', 'vision', 'skynet', 'hal_9000', 'c3po', 'baymax', 'glados', 'robocop',
    'agent_smith', 'samantha', 'cortana', 'walle', 'daft_punk', 'ava', 'tars', 'wopr', 'm3gan',
    'viki', 'muthur', 'sonny', 'tron'];
  var ETATS = ['idle', 'listening', 'processing', 'speaking'];
  /* palette officielle du pack */
  var BL = '#FFFFFF', VE = '#52BE80', JA = '#F8C471', RO = '#EC7063', CY = '#5DADE2', VI = '#BF71B2', GR = '#333333';

  /* ------------------------------------------------------------------ outils */
  function f(v) { var r = Math.round(v * 10) / 10; return String(r === 0 ? 0 : r); }
  function pt(x, y) { return f(x) + ' ' + f(y); }
  function stops(a) {
    return a.map(function (s) {
      return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' +
        (s[2] != null ? ' stop-opacity="' + s[2] + '"' : '') + '/>';
    }).join('');
  }
  function graine(a) {
    return function () {
      a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function at(o) {
    var s = '';
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k) && o[k] != null && o[k] !== false) s += ' ' + k + '="' + o[k] + '"';
    return s;
  }
  function el(tag, o, inner) { return '<' + tag + at(o || {}) + (inner == null ? '/>' : '>' + inner + '</' + tag + '>'); }
  function cercle(cx, cy, r, o) { return el('circle', Object.assign({ cx: f(cx), cy: f(cy), r: f(r) }, o || {})); }
  function ellipse(cx, cy, rx, ry, o) { return el('ellipse', Object.assign({ cx: f(cx), cy: f(cy), rx: f(rx), ry: f(ry) }, o || {})); }
  function rect(x, y, w, h, o) { return el('rect', Object.assign({ x: f(x), y: f(y), width: f(w), height: f(h) }, o || {})); }
  function chemin(d, o) { return el('path', Object.assign({ d: d }, o || {})); }
  function ligne(x1, y1, x2, y2, o) { return el('line', Object.assign({ x1: f(x1), y1: f(y1), x2: f(x2), y2: f(y2) }, o || {})); }
  function g(o, inner) { return el('g', o, inner || ''); }
  function texte(x, y, t, o) { return el('text', Object.assign({ x: f(x), y: f(y) }, o || {}), t); }
  /* style d'un groupe anime : origine et parametres en variables CSS */
  function sty(o) {
    var s = [];
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) s.push(k + ':' + o[k]);
    return s.join(';');
  }
  function origine(x, y) { return 'transform-origin:' + f(x) + 'px ' + f(y) + 'px'; }
  /* groupe qui tourne sur lui-meme (repere de la vue) */
  function tourne(cx, cy, duree, inner, inverse, cls) {
    return g({ 'class': 'av-rot' + (inverse ? ' av-rot-inv' : '') + (cls ? ' ' + cls : ''),
      style: origine(cx, cy) + ';--d:' + duree + 's' }, inner);
  }
  function arcD(cx, cy, r, a0, a1) {
    var p = Math.PI / 180, x0 = cx + r * Math.cos(a0 * p), y0 = cy + r * Math.sin(a0 * p),
      x1 = cx + r * Math.cos(a1 * p), y1 = cy + r * Math.sin(a1 * p);
    return 'M' + pt(x0, y0) + 'A' + f(r) + ' ' + f(r) + ' 0 ' + (a1 - a0 > 180 ? 1 : 0) + ' 1 ' + pt(x1, y1);
  }
  /* miroir gauche -> droite d'un trace absolu (M L H V C Q Z) autour de x = ax */
  function miroir(d, ax) {
    var out = [], cmd = '', i = 0;
    d.replace(/[MLHVCQZA]|-?\d*\.?\d+/g, function (t) {
      if (/[A-Z]/.test(t)) { cmd = t; i = 0; out.push(t); return t; }
      var v = parseFloat(t);
      if (cmd === 'H' || (cmd !== 'V' && cmd !== 'A' && i % 2 === 0)) v = 2 * ax - v;
      i++; out.push(f(v)); return t;
    });
    return out.join(' ').replace(/ ?([A-Z]) ?/g, '$1');
  }
  function sym(d, ax) { return d + miroir(d, ax == null ? 200 : ax); }
  function points(l) { return l.map(function (p) { return 'M' + pt(p[0], p[1]) + 'h0'; }).join(''); }

  /* le « kit » d'un rendu : prefixe des id, degrades, generateur a graine */
  function kit(id, prefixe) {
    var P = String(prefixe == null ? 'av' : prefixe).replace(/[^A-Za-z0-9_-]/g, '') + '-' + id + '-';
    var k = {
      id: id, P: P, R: graine(hash(id) || 1),
      u: function (n) { return 'url(#' + P + n + ')'; },
      rg: function (n, attrs, a) { return '<radialGradient id="' + P + n + '"' + (attrs || '') + '>' + stops(a) + '</radialGradient>'; },
      lg: function (n, attrs, a) { return '<linearGradient id="' + P + n + '"' + (attrs || '') + '>' + stops(a) + '</linearGradient>'; },
      clip: function (n, inner) { return '<clipPath id="' + P + n + '">' + inner + '</clipPath>'; },
      motif: function (n, w, h, inner) {
        return '<pattern id="' + P + n + '" width="' + w + '" height="' + h + '" patternUnits="userSpaceOnUse">' + inner + '</pattern>';
      }
    };
    return k;
  }

  /* ------------------------------------------------------- briques partagees */
  /* ondes d'ecoute (cercles qui s'ouvrent) */
  function ondes(cx, cy, r, col) {
    var o = '';
    [0, 1, 2].forEach(function (i) {
      o += g({ 'class': 'av-onde av-o' + (i + 1), style: origine(cx, cy) },
        cercle(cx, cy, r + i * 12, { fill: 'none', stroke: col, 'stroke-width': 6, 'stroke-opacity': '.18' }) +
        cercle(cx, cy, r + i * 12, { fill: 'none', stroke: col, 'stroke-width': f(1.8 - i * .4) }));
    });
    return g({ 'class': 'av-ondes' }, o);
  }
  /* champ d'etoiles scintillantes */
  function etoiles(R, n, x, y, w, h, col, rmax) {
    var s = '';
    for (var i = 0; i < n; i++) {
      var d = (2 + R() * 4).toFixed(1), r = .4 + R() * (rmax || 1.3);
      s += cercle(x + R() * w, y + R() * h, r, { fill: col, 'class': 'av-scintille',
        style: '--d:' + d + 's;animation-delay:-' + (R() * 6).toFixed(1) + 's' });
    }
    return s;
  }
  /* particules qui montent lentement */
  function poussieres(R, n, col, rmax, x0, w) {
    var s = '';
    for (var i = 0; i < n; i++) {
      var x = (x0 || 0) + R() * (w || 400), y = 40 + R() * 380, r = .6 + R() * (rmax || 1.6);
      s += cercle(x, y, r, { fill: col, 'fill-opacity': f(.35 + R() * .5), 'class': 'av-monte',
        style: '--d:' + (9 + R() * 12).toFixed(1) + 's;--h:-' + Math.round(60 + R() * 120) + 'px;animation-delay:-' + (R() * 20).toFixed(1) + 's' });
    }
    return s;
  }
  /* sol en perspective : lignes fuyantes + horizontales */
  function solGrille(hy, col, op, ecart, larg) {
    var s = '', i, cx = 200;
    for (i = -9; i <= 9; i++) s += ligne(cx + i * 10, hy, cx + i * (larg || 70), 420, { stroke: col, 'stroke-opacity': op, 'stroke-width': 1 });
    var y = hy + 6, e = ecart || 6;
    for (i = 0; i < 14 && y < 420; i++) { s += ligne(0, y, 400, y, { stroke: col, 'stroke-opacity': op, 'stroke-width': 1 }); e *= 1.32; y += e; }
    return s;
  }
  /* fond plein : degrade radial */
  function fondPlein(k, a) {
    return k.rg('fond', ' cx=".5" cy=".42" r=".75"', a);
  }

  /* --------------------------------------------------------------- registre */
  var DESSINS = {};

  /* =====================================================================
   *  VISAGE PARAMETRE — repris de la « Cyber IA » du 28/09/2026 (dessinee et
   *  validee a l'ecran), en coordonnees d'origine (290 x 196, centre 145) :
   *  forme feminine ou masculine, peau, yeux, bouche, circuits. Les avatars
   *  qui ont un visage (Cortana, Ava, M3GAN, Sonny, Vision, Agent Smith) le
   *  placent dans la scene 400 x 400 par un groupe parent STATIQUE.
   * ===================================================================== */
  var PLACE_VISAGE = 'translate(-17.5 46) scale(1.5)';   /* 145 -> 200, yeux a y = 175 */
  var COU = 'M128 136C129 151 128 162 120 172L118 192L118 240L172 240L172 192L170 172C162 162 161 151 162 136Z';
  var BUSTE = 'M20 196C36 182 76 174 116 171Q145 199 174 171C214 174 254 182 270 196V250H20Z';

  function visage(k, o) {
    o = o || {};
    var u = k.u, M = o.forme === 'm';
    function scl(cx, cy, s) {
      return 'M' + pt(cx - s * 14, cy + 1.5) + 'Q' + pt(cx - s * 1, cy - 12) + ' ' + pt(cx + s * 15, cy - 1) +
        'Q' + pt(cx + s * 1, cy + 9) + ' ' + pt(cx - s * 14, cy + 1.5) + 'Z';
    }
    function trait(d, c, w, op) {
      return '<path d="' + d + '" stroke="' + c + '" stroke-width="' + w + '"' + (op != null ? ' stroke-opacity="' + op + '"' : '') + '/>';
    }
    var forme = M
      ? 'M145 24C174 24 195 43 197 70C199 93 196 114 187 130C177 147 161 157 145 158C129 157 113 147 103 130C94 114 91 93 93 70C95 43 116 24 145 24Z'
      : 'M145 26C171 26 191 43 193 69C195 92 189 113 178 129C168 144 157 154 145 155C133 154 122 144 112 129C101 113 95 92 97 69C99 43 119 26 145 26Z';
    var kO = o.oeilK || 1;
    var trc = o.trait || '#150a0e';
    function oeil(cx, cy, s, clip) {
      var sc = scl(cx, cy, s);
      var dedans = '<g class="av-oeil av-cligne" style="--d:' + (o.cligne || 6.5) + 's">' +
        '<path d="' + sc + '" fill="' + (o.sclere || '#edf3f6') + '"/>' +
        '<g clip-path="url(#' + k.P + clip + ')"><g class="av-iris">' +
        cercle(cx, cy - .6, 6.7, { fill: u('viris'), stroke: o.irisBord || '#0b3350', 'stroke-width': '.6' }) +
        cercle(cx, cy - .6, 6.7, { fill: u('virisf'), 'class': 'av-irisf' }) +
        g({ 'class': 'av-pupille', style: origine(cx, cy - .6) }, cercle(cx, cy - .6, 2.7, { fill: o.pupille || '#03121a' })) +
        cercle(cx - 2.4, cy - 3.1, 1.7, { fill: '#fff' }) +
        cercle(cx + 2.4, cy + 1.5, .8, { fill: '#fff', 'fill-opacity': '.7' }) +
        '</g><path d="' + sc + '" fill="' + u('vpaup') + '"/></g>' +
        '<g fill="none" stroke-linecap="round">' +
        trait('M' + pt(cx - s * 14.5, cy + 1.3) + 'Q' + pt(cx - s * 1, cy - 12.9) + ' ' + pt(cx + s * 15.6, cy - 1.3), trc, M ? 1.5 : 2.2) +
        (o.cils === false ? '' :
          trait('M' + pt(cx + s * 14.2, cy - 1.3) + 'Q' + pt(cx + s * 18, cy - 2) + ' ' + pt(cx + s * 21, cy - 5.8), trc, 1.5) +
          trait('M' + pt(cx + s * 6, cy - 5.6) + 'l' + pt(s * 1.2, -2.6) + 'M' + pt(cx + s * 9.5, cy - 4.4) + 'l' + pt(s * 1.8, -2.4) +
            'M' + pt(cx + s * 12.5, cy - 2.8) + 'l' + pt(s * 2.3, -1.9), trc, .8)) +
        trait('M' + pt(cx - s * 10, cy + 4.2) + 'Q' + pt(cx + s * 3, cy + 7.8) + ' ' + pt(cx + s * 14.5, cy - .4), o.paupiere || '#4a2821', .7, .75) +
        '</g></g>';
      return kO === 1 ? dedans : '<g transform="translate(' + cx + ' ' + cy + ') scale(' + kO + ') translate(' + (-cx) + ' ' + (-cy) + ')">' + dedans + '</g>';
    }
    function sourcil(cx, cy, s) {
      if (M) {
        return 'M' + pt(cx - s * 15, cy - 11.5) + 'Q' + pt(cx, cy - 18.5) + ' ' + pt(cx + s * 18, cy - 13.5) +
          'L' + pt(cx + s * 17.5, cy - 10.5) + 'Q' + pt(cx, cy - 14.5) + ' ' + pt(cx - s * 15, cy - 8.2) + 'Z';
      }
      return 'M' + pt(cx - s * 14, cy - 11) + 'Q' + pt(cx - s * 1, cy - 21.5) + ' ' + pt(cx + s * 17.5, cy - 12.5) +
        'Q' + pt(cx + s * 1, cy - 17.8) + ' ' + pt(cx - s * 14, cy - 9) + 'Z';
    }
    function paupiere(cx, cy, s) {
      return 'M' + pt(cx - s * 12, cy - 6.4) + 'Q' + pt(cx + s * 1, cy - 16) + ' ' + pt(cx + s * 15, cy - 6.4);
    }
    var nez = o.nez || ['#8a4b32', '#f2c6a8', '#763c26', '#95553a', '#57291b', '#f4c7a9'];
    var lv = o.levres || [[[0, '#b3605e'], [1, '#86403f']], [[0, '#d5827d'], [1, '#a14f4e']]];
    var defs =
      k.rg('vpeau', ' cx=".46" cy=".4" r=".64"', o.peau || [[0, '#ecb693'], [.42, '#d49571'], [.78, '#ad6a45'], [1, '#7e4429']]) +
      k.rg('vomb', ' cx=".5" cy=".38" r=".62"', [[.62, o.ombre || '#4d2415', 0], [1, o.ombre || '#3a170b', .6]]) +
      (o.bord ? k.lg('vbord', '', [[0, o.bord, .95], [.22, o.bord, 0], [.78, o.bord, 0], [1, o.bord, .95]]) : '') +
      k.rg('viris', '', o.iris || [[0, '#f2fdff'], [.25, '#9be6ff'], [.6, '#5DADE2'], [.88, '#1d6a98'], [1, '#0c3653']]) +
      k.rg('virisf', '', [[0, '#e8fdff', .9], [.7, o.lueurOeil || '#8fe6ff', .5], [1, o.lueurOeil || CY, 0]]) +
      k.rg('vlueur', '', [[0, '#ffffff', .9], [.3, o.lueurOeil || CY, .6], [1, o.lueurOeil || CY, 0]]) +
      k.rg('vjoue', '', [[0, o.joue || '#e46f7e', .4], [1, o.joue || '#e46f7e', 0]]) +
      k.rg('vfard', '', [[0, o.fard || '#5a2c55', .6], [1, o.fard || '#5a2c55', 0]]) +
      k.rg('vlum', '', [[0, o.lum || '#fbd9c2', .55], [1, o.lum || '#fbd9c2', 0]]) +
      k.lg('vlv1', ' x2="0" y2="1"', lv[0]) + k.lg('vlv2', ' x2="0" y2="1"', lv[1]) +
      k.lg('vpaup', ' x2="0" y2="1"', [[0, o.paupiere || '#3b1d19', .6], [.5, o.paupiere || '#3b1d19', 0]]) +
      k.clip('vcg', '<path d="' + scl(124, 86, -1) + '"/>') +
      k.clip('vcd', '<path d="' + scl(166, 86, 1) + '"/>');
    var levres =
      '<g class="av-v-sy"><path d="M129.5 131.3Q145 130 160.5 131.3Q153 140 145 140.6Q137 140 129.5 131.3Z" fill="' + (o.bouche || '#2a0e13') + '"/>' +
      '<path d="M134 131.3Q145 130.6 156 131.3L155 133.7Q145 134.5 135 133.7Z" fill="' + (o.dents || '#f4eeea') + '"/>' +
      ellipse(145, 138.4, 6, 1.8, { fill: o.langue || '#a3474f' }) + '</g>' +
      '<g class="av-v-y" style="--k:6px"><path d="M128 131.2Q136 132.6 145 132.8Q154 132.6 162 131.2Q157 139.4 145 140.6Q133 139.4 128 131.2Z" fill="' + u('vlv2') + '"/>' +
      '<path d="M139 135.5Q145 134.4 151 135.5" fill="none" stroke="#ffe6de" stroke-opacity=".5" stroke-width="1.1" stroke-linecap="round"/></g>' +
      '<path d="M128 131.2Q133 126.4 138.6 126Q142.6 125.7 145 127.3Q147.4 125.7 151.4 126Q157 126.4 162 131.2Q154 132.5 145 132.7Q136 132.5 128 131.2Z" fill="' + u('vlv1') + '"/>' +
      '<path d="M128.5 131.3Q145 133.3 161.5 131.3" fill="none" stroke="' + (o.ligneLevres || '#561f25') + '" stroke-width=".7" stroke-opacity=".8"/>';
    if (M) levres = '<g transform="translate(145 131) scale(.92 .78) translate(-145 -131)">' + levres + '</g>';
    var yeux = o.sansYeux ? '' :
      (o.lueurOeil ? cercle(124, 85.5, 17, { fill: u('vlueur'), 'class': 'av-lueur' }) + cercle(166, 85.5, 17, { fill: u('vlueur'), 'class': 'av-lueur' }) : '') +
      oeil(124, 86, -1, 'vcg') + oeil(166, 86, 1, 'vcd');
    var s = '<path d="' + forme + '" fill="' + u('vpeau') + '"' + (o.opacite ? ' fill-opacity="' + o.opacite + '"' : '') + '/>' +
      '<path d="' + forme + '" fill="' + u('vomb') + '"/>' +
      ellipse(145, 54, 22, 11, { fill: u('vlum') }) +
      ellipse(112, 97, 9, 5, { fill: u('vlum') }) + ellipse(178, 97, 9, 5, { fill: u('vlum') }) +
      (o.joue === null ? '' : ellipse(117, 109, 14, 9, { fill: u('vjoue') }) + ellipse(173, 109, 14, 9, { fill: u('vjoue') })) +
      (o.fard === null ? '' : ellipse(123, 80, 17, 9, { fill: u('vfard') }) + ellipse(167, 80, 17, 9, { fill: u('vfard') })) +
      (o.sourcil === null ? '' : '<path d="' + sourcil(124, 86, -1) + sourcil(166, 86, 1) + '" fill="' + (o.sourcil || '#3a2117') + '"/>') +
      (o.sansYeux ? '' : '<g fill="none" stroke-linecap="round">' + trait(paupiere(124, 86, -1) + paupiere(166, 86, 1), o.paupiere || '#5a2d22', .9, .5) + '</g>') +
      yeux +
      '<g fill="none" stroke-linecap="round">' +
      trait('M140 91Q137.6 102 137.4 110', nez[0], 1.5, .3) + trait('M150 92Q151.3 102 151.2 108', nez[1], 1, .4) +
      trait('M134.5 111.5Q137 117.6 145 117.9Q153 117.6 155.5 111.5', nez[2], 1, .45) +
      trait('M143 120L143.7 126M147 120L146.3 126', nez[3], .8, .3) + '</g>' +
      ellipse(145, 109.6, 4.4, 3, { fill: nez[5], 'fill-opacity': '.55' }) +
      '<path d="' + sym('M137.5 113.6Q140.6 117 143.5 114.9Q140.6 112.6 137.5 113.6Z', 145) + '" fill="' + nez[4] + '" fill-opacity=".75"/>' +
      levres +
      ellipse(145, 147, 7, 3.4, { fill: o.menton || '#eeb592', 'fill-opacity': '.35' }) +
      (o.bord ? '<path d="' + forme + '" fill="none" stroke="' + u('vbord') + '" stroke-width="1.3"/>' : '');
    return { defs: defs, visage: s, forme: forme };
  }

  /* circuits lumineux du visage (cote gauche, le droit est le miroir autour de 145) */
  function circuitsVisage(col, clair) {
    var k1 = 'M127 97L127 105L121 111L121 127L126 136L126 145L135 152', k2 = 'M116 96L112 100L112 116L106 122',
      k3 = 'M108 91L104 95L104 106', k4 = 'M121 118L115 124L115 133';
    function c(n, d, pts) {
      var dl = sym(d, 145), dp = points(pts) + points(pts.map(function (p) { return [290 - p[0], p[1]]; }));
      return '<g class="av-k av-k' + n + '" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="' + dl + '" stroke="' + col + '" stroke-width="3.4" stroke-opacity=".3"/>' +
        '<path d="' + dp + '" stroke="' + col + '" stroke-width="6.2" stroke-opacity=".3"/>' +
        '<path d="' + dl + '" stroke="' + clair + '" stroke-width="1"/>' +
        '<path d="' + dp + '" stroke="' + clair + '" stroke-width="3"/>' +
        '<path class="av-flux" d="' + dl + '" stroke="#fff" stroke-width="1.5"/></g>';
    }
    return c(3, k3, [[104, 106]]) + c(2, k2, [[106, 122], [116, 96]]) + c(1, k1, [[135, 152], [127, 97]]) + c(4, k4, [[115, 133]]);
  }
  function cssCircuits(S) {
    return [
      '.av-k{animation:avk-circ 4.5s ease-in-out infinite}',
      '@keyframes avk-circ{0%,100%{opacity:.62}50%{opacity:.95}}',
      S.PR + '.av-k{animation:avk-seq 1.3s linear infinite}',
      S.PR + '.av-k2{animation-delay:.18s}', S.PR + '.av-k1{animation-delay:.36s}', S.PR + '.av-k4{animation-delay:.54s}',
      '@keyframes avk-seq{0%,55%,100%{opacity:.3}18%{opacity:1}}',
      S.AU + '.av-k{animation:none;opacity:calc(.55 + var(--bouche,0) * .45)}',
      '.av-flux{opacity:0;stroke-dasharray:2.5 21;transition:opacity .4s}',
      S.PR + '.av-flux{opacity:1;animation:avk-flux 1.1s linear infinite}',
      '@keyframes avk-flux{to{stroke-dashoffset:-23.5}}'
    ].join('\n');
  }
  /* yeux : saccades en reflexion, iris eclaire a l'ecoute (repris de la Cyber IA) */
  function cssYeux(S) {
    return [
      '.av-irisf{opacity:0;transition:opacity .5s}', S.L + '.av-irisf{opacity:.5}', S.PR + '.av-irisf{opacity:.3}',
      S.PR + '.av-iris{animation:avy-saccade 1.1s steps(1,end) infinite}',
      '@keyframes avy-saccade{0%{transform:translate(0,0)}18%{transform:translate(1.7px,-.3px)}36%{transform:translate(-1.3px,.3px)}52%{transform:translate(.6px,.6px)}70%{transform:translate(-1.8px,-.4px)}86%{transform:translate(1px,.2px)}}',
      '.av-pupille{transform-box:view-box;transition:transform .6s}', S.L + '.av-pupille{transform:scale(1.25)}'
    ].join('\n');
  }

  /* ---------------------------------------------------------------- CORTANA */
  DESSINS.cortana = {
    dessin: function (k) {
      var R = k.R, u = k.u;
      var v = visage(k, {
        forme: 'f', opacite: '.86',
        peau: [[0, '#d6f1ff'], [.45, '#7fc2ef'], [.8, '#4a76cf'], [1, '#3a3f9e']],
        ombre: '#1b1f63', lum: '#e9f8ff', joue: null, fard: '#6b4fc0',
        iris: [[0, '#ffffff'], [.3, '#bdf0ff'], [.65, '#5DADE2'], [1, '#2a4fa0']], lueurOeil: CY,
        trait: '#141a4a', sourcil: '#27306e', paupiere: '#2a2f7a',
        nez: ['#2b3c8c', '#dff4ff', '#2b3c8c', '#2b3c8c', '#1d2a6b', '#cbeaff'],
        levres: [[[0, '#8b7fd6'], [1, '#5c4fb0']], [[0, '#a99be6'], [1, '#6c5fc4']]],
        bouche: '#141a46', dents: '#dff2ff', langue: '#6c5fc4', ligneLevres: '#2a2f7a', menton: '#cbeaff', bord: CY
      });
      /* lignes de donnees qui montent (sur le cou et les epaules) */
      var montee = '';
      for (var i = 0; i < 22; i++) {
        var x = 40 + R() * 210, y = 150 + R() * 90, h = 6 + R() * 14;
        montee += rect(x, y, 1.2, h, { fill: i % 3 ? CY : VI, 'fill-opacity': '.8', 'class': 'av-monte',
          style: '--d:' + (3 + R() * 4).toFixed(1) + 's;--h:-' + Math.round(40 + R() * 60) + 'px;animation-delay:-' + (R() * 6).toFixed(1) + 's' });
      }
      /* glyphes : petits traits anguleux qui circulent */
      var glyphes = '';
      for (i = 0; i < 9; i++) {
        var gx = 108 + R() * 74, gy = 40 + R() * 110;
        glyphes += chemin('M' + pt(gx, gy) + 'h' + f(3 + R() * 5) + 'v' + f(2 + R() * 4) + 'h' + f(3 + R() * 4),
          { stroke: '#e6f8ff', 'stroke-width': '.7', fill: 'none', 'class': 'av-pulse',
            style: '--d:' + (1.5 + R() * 3).toFixed(1) + 's;animation-delay:-' + (R() * 3).toFixed(1) + 's;--o0:.1;--o1:.9' });
      }
      var cheveux = 'M145 12C186 12 207 42 205 84C204 108 201 124 195 137C190 128 188 114 189 98C190 80 186 64 180 56' +
        'C170 48 120 48 110 56C104 64 100 80 101 98C102 114 100 128 95 137C89 124 86 108 85 84C83 42 104 12 145 12Z';
      var frange = 'M97 72C100 42 122 26 150 28C172 30 188 42 194 62C183 52 166 47 148 50C128 53 110 60 97 72Z';
      var defs = v.defs +
        fondPlein(k, [[0, '#0b1636'], [.55, '#060b20'], [1, '#02030a']]) +
        k.lg('holo', ' x2="0" y2="1"', [[0, CY, .55], [1, VI, .06]]) +
        k.lg('chev', ' x2="0" y2="1"', [[0, '#3c3f9e', .95], [.6, '#26307a', .9], [1, '#5a4fb0', .5]]) +
        k.motif('tr', 6, 3, '<rect width="6" height=".8" fill="#e0f6ff" fill-opacity=".28"/>');
      /* anneaux de donnees (Forerunner) : ellipses inclinees qui tournent */
      var anneaux = '';
      [[150, 46, 0, 40], [190, 60, 1, 64], [120, 34, 0, 30]].forEach(function (a, i) {
        anneaux += g({ transform: 'translate(200 150) rotate(' + (i * 28 - 18) + ')' },
          tourne(0, 0, a[3], ellipse(0, 0, a[0], a[1], { fill: 'none', stroke: i === 1 ? VI : CY, 'stroke-width': 1.4,
            'stroke-opacity': '.45', 'stroke-dasharray': '18 6 3 6' }), a[2]));
      });
      var fond = rect(0, 0, 400, 400, { fill: u('fond') }) + etoiles(R, 46, 0, 0, 400, 400, '#cfe9ff', 1.1) +
        g({ 'class': 'av-repos' }, anneaux) +
        g({ 'class': 'av-actif' }, g({ transform: 'translate(200 150)' },
          tourne(0, 0, 9, ellipse(0, 0, 170, 52, { fill: 'none', stroke: CY, 'stroke-width': 2, 'stroke-opacity': '.6', 'stroke-dasharray': '30 10 4 10' }))) +
          rect(0, 0, 400, 400, { fill: CY, 'fill-opacity': '.05' }));
      var corps = g({ transform: PLACE_VISAGE },
        '<path d="' + COU + '" fill="' + u('holo') + '"/>' +
        '<path d="' + BUSTE + '" fill="' + u('holo') + '"/><path d="' + BUSTE + '" fill="' + u('tr') + '"/>' +
        '<path d="M20 196C36 182 76 174 116 171M174 171C214 174 254 182 270 196" fill="none" stroke="#bfeaff" stroke-width="1" stroke-opacity=".85"/>' +
        g({}, montee) +
        g({ 'class': 'av-pose', style: origine(145, 150) },
          g({ 'class': 'av-tete', style: origine(145, 150) },
            '<path d="' + cheveux + '" fill="' + u('chev') + '"/>' +
            v.visage + '<path d="' + v.forme + '" fill="' + u('tr') + '"/>' +
            circuitsVisage(VI, '#e9d6ff') + glyphes +
            '<path d="' + frange + '" fill="' + u('chev') + '"/>' +
            '<path d="M104 64Q128 50 158 50M118 58Q140 46 170 52" fill="none" stroke="#9aa6ff" stroke-width=".8" stroke-opacity=".6"/>')) +
        g({ 'class': 'av-calc' }, g({ 'class': 'av-balayage' }, rect(60, 0, 170, 6, { fill: CY, 'fill-opacity': '.35' }) +
          rect(60, 5, 170, 1, { fill: '#e6f8ff' }))));
      return { defs: defs, fond: fond, corps: ondes(200, 175, 128, CY) + corps };
    },
    css: function (S) {
      return [cssCircuits(S), cssYeux(S),
        '.av-cortana .av-balayage{transform-box:view-box;animation:cortana-balai 1.6s linear infinite}',
        '@keyframes cortana-balai{0%{transform:translateY(20px)}100%{transform:translateY(170px)}}',
        S.REP + '.av-cortana .av-corps{animation:avc-souffle 5.2s ease-in-out infinite,cortana-holo 7s steps(1,end) infinite}',
        '@keyframes cortana-holo{0%,100%{opacity:1}43%{opacity:.86}44%{opacity:1}71%{opacity:.92}72%{opacity:1}}'
      ].join('\n');
    }
  };

  /* -------------------------------------------------------------------- AVA */
  DESSINS.ava = {
    dessin: function (k) {
      var R = k.R, u = k.u, i;
      var v = visage(k, {
        forme: 'f',
        peau: [[0, '#f7dccb'], [.45, '#e8bba2'], [.8, '#cf9479'], [1, '#a46d55']],
        ombre: '#5a3022', lum: '#fff0e6', joue: '#e08a86', fard: '#8a6f78',
        iris: [[0, '#f6e7d6'], [.3, '#b88a5c'], [.65, '#6e4a2c'], [1, '#2e1d10']], lueurOeil: null,
        sourcil: '#6a4a36', nez: ['#9a6450', '#fbe2d2', '#87533f', '#a26a54', '#6b3a2a', '#fbe0d0'],
        levres: [[[0, '#c78077'], [1, '#a05e58']], [[0, '#d9938a'], [1, '#b06a63']]], menton: '#f6cdb7'
      });
      var crane = 'M145 6C181 6 205 32 206 70C207 98 199 118 190 132L186 104C188 86 184 66 176 52C166 40 124 40 114 52' +
        'C106 66 102 86 104 104L100 132C91 118 83 98 84 70C85 32 109 6 145 6Z';
      var hexa = 'M0 4.6L4 2.3L8 4.6L8 9.2L4 11.5L0 9.2Z';
      var defs = v.defs +
        fondPlein(k, [[0, '#d9e2e6'], [.5, '#9fb0b7'], [1, '#5d6e75']]) +
        k.motif('maille', 8, 6.9, '<path d="' + hexa + '" fill="none" stroke="#5f6f78" stroke-width=".6" stroke-opacity=".8"/>') +
        k.motif('maille2', 6, 5.2, '<path d="M0 3.5L3 1.7L6 3.5L6 6.9L3 8.7L0 6.9Z" fill="none" stroke="#c9d2d8" stroke-width=".5" stroke-opacity=".7"/>') +
        k.rg('verre', ' cx=".5" cy=".4" r=".6"', [[0, '#ffffff', .1], [.8, '#9fb4c0', .14], [1, '#5f7480', .3]]) +
        k.rg('pense', '', [[0, '#e8fbff', .95], [.35, CY, .55], [1, CY, 0]]) +
        k.lg('brume', ' x2="0" y2="1"', [[0, '#ffffff', 0], [.5, '#eef3f5', .55], [1, '#ffffff', 0]]) +
        k.lg('vitre', '', [[0, '#ffffff', .0], [.5, '#ffffff', .18], [1, '#ffffff', 0]]) +
        k.clip('crane', '<path d="' + crane + '"/>');
      /* foret brumeuse derriere les vitres */
      var foret = '';
      for (i = 0; i < 30; i++) {
        var x = R() * 420 - 10, h = 120 + R() * 170, w = 14 + R() * 26, y0 = 400 - h * (.4 + R() * .3);
        foret += chemin('M' + pt(x, y0) + 'L' + pt(x - w, 420) + 'L' + pt(x + w, 420) + 'Z',
          { fill: i % 2 ? '#3f5f4e' : '#567a63', 'fill-opacity': f(.35 + R() * .45) });
      }
      var vitres = '';
      [8, 112, 288, 392].forEach(function (x) { vitres += rect(x - 3, 0, 6, 400, { fill: '#46545a' }); });
      var fond = rect(0, 0, 400, 400, { fill: u('fond') }) + g({}, foret) +
        g({ 'class': 'av-glisse', style: '--d:28s;--h:-160px' }, rect(0, 180, 800, 90, { fill: u('brume') }) + rect(120, 250, 800, 70, { fill: u('brume') })) +
        vitres + rect(0, 0, 400, 400, { fill: u('vitre') }) + rect(0, 58, 400, 4, { fill: '#46545a' }) +
        g({ 'class': 'av-actif' }, rect(0, 0, 400, 400, { fill: CY, 'fill-opacity': '.08' }));
      /* structure interne visible sous la maille du crane */
      var interne = '';
      for (i = 0; i < 7; i++) interne += chemin(arcD(145, 70, 14 + i * 6, 200 + i * 9, 330 - i * 7), { fill: 'none', stroke: '#3d4c55', 'stroke-width': '1', 'stroke-opacity': '.55' });
      var pensees = '';
      for (i = 0; i < 6; i++) {
        pensees += cercle(112 + R() * 66, 22 + R() * 50, 9 + R() * 10, { fill: u('pense'), 'class': 'av-pulse',
          style: '--d:' + (.8 + R() * 1.2).toFixed(1) + 's;animation-delay:-' + (R() * 2).toFixed(1) + 's;--o0:.2;--o1:1' });
      }
      var corps = g({ transform: PLACE_VISAGE },
        /* cou et epaules : maille translucide, colonne argentee */
        '<path d="' + BUSTE + '" fill="#7b878d"/><path d="' + BUSTE + '" fill="' + u('maille2') + '"/>' +
        '<path d="' + COU + '" fill="#c9d4d9" fill-opacity=".45"/><path d="' + COU + '" fill="' + u('maille2') + '"/>' +
        '<path d="M145 140V196" stroke="#e9eef1" stroke-width="3" stroke-linecap="round"/>' +
        '<path d="' + points([[145, 150], [145, 162], [145, 174], [145, 186]]) + '" stroke="' + CY + '" stroke-width="3.4" stroke-linecap="round" class="av-lueur"/>' +
        g({ 'class': 'av-pose', style: origine(145, 150) },
          g({ 'class': 'av-tete', style: origine(145, 150) },
            '<path d="' + crane + '" fill="' + u('verre') + '"/>' +
            g({ 'clip-path': u('crane') }, interne + '<path d="' + crane + '" fill="' + u('maille') + '"/>' + g({ 'class': 'av-calc' }, pensees)) +
            '<path d="' + crane + '" fill="none" stroke="#3d4c55" stroke-width="1.1" stroke-opacity=".7"/>' +
            v.visage +
            '<path d="M99 70C104 48 122 36 145 35C168 36 186 48 191 70" fill="none" stroke="#f5e1d4" stroke-width="1.2" stroke-opacity=".7"/>')));
      return { defs: defs, fond: fond, corps: ondes(200, 175, 128, CY) + corps };
    },
    css: function (S) { return cssYeux(S); }
  };

  /* ------------------------------------------------------------------ M3GAN */
  DESSINS.m3gan = {
    dessin: function (k) {
      var R = k.R, u = k.u, i;
      var v = visage(k, {
        forme: 'f', oeilK: 1.28, cligne: 9,
        peau: [[0, '#fbe6da'], [.45, '#f1cdb8'], [.8, '#dcaa92'], [1, '#b98068']],
        ombre: '#6a3a2a', lum: '#ffffff', joue: '#f08f9c', fard: '#b48fa8',
        iris: [[0, '#f0fbff'], [.3, '#a8dcfa'], [.65, '#4a8fd0'], [1, '#1c3e74']], lueurOeil: null,
        sourcil: '#7a5136', paupiere: '#5a3a30', nez: ['#b07a64', '#fff0e8', '#9a6450', '#b07a64', '#7a4636', '#fff0e8'],
        levres: [[[0, '#d98a8f'], [1, '#b66a70']], [[0, '#e8a2a5'], [1, '#c47a7f']]], menton: '#fbe0d2'
      });
      var dos = 'M145 9C190 9 211 40 212 82C213 126 214 166 224 206L226 250H64L66 206C76 166 77 126 78 82C79 40 100 9 145 9Z';
      var meches = 'M145 16C116 16 99 36 96 66C94 98 99 128 92 168C86 150 85 112 87 78C89 40 110 16 145 16Z' +
        'M145 16C174 16 191 36 194 66C196 98 191 128 198 168C204 150 205 112 203 78C201 40 180 16 145 16Z' +
        'M145 16C128 18 112 30 106 52C122 38 134 30 145 26C156 30 168 38 184 52C178 30 162 18 145 16Z';
      var defs = v.defs +
        fondPlein(k, [[0, '#2a1840'], [.55, '#120a24'], [1, '#05040c']]) +
        k.lg('chev', ' x2="0" y2="1"', [[0, '#c99566'], [.5, '#a8744a'], [1, '#7c5234']]) +
        k.lg('robe', ' x2="0" y2="1"', [[0, '#5d6a86'], [1, '#2b3346']]);
      /* couloir high-tech : lignes fuyantes et bandeaux neon */
      var couloir = '', fx = 200, fy = 168;
      [[-1, 0], [1, 0], [-1, 1], [1, 1]].forEach(function (c, i) {
        var x = c[0] < 0 ? 0 : 400, y = c[1] ? 400 : 0;
        couloir += ligne(fx + c[0] * 40, fy + (c[1] ? 30 : -30), x, y, { stroke: i % 2 ? VI : CY, 'stroke-width': 2.4, 'stroke-opacity': '.7' });
      });
      for (i = 0; i < 6; i++) {
        var t = .18 + i * .14, w = 40 + t * 360, h = 60 + t * 340;
        couloir += rect(fx - w / 2, fy - h / 2, w, h, { fill: 'none', stroke: i % 2 ? CY : VI, 'stroke-opacity': f(.18 + t * .25), 'stroke-width': 1 });
      }
      var fond = rect(0, 0, 400, 400, { fill: u('fond') }) + g({ 'class': 'av-repos' }, couloir) +
        g({ 'class': 'av-actif' }, g({ 'class': 'av-pulse', style: '--d:1.4s;--o0:.4;--o1:1' }, couloir) + rect(0, 0, 400, 400, { fill: VI, 'fill-opacity': '.06' }));
      var brins = '';
      for (i = 0; i < 26; i++) {
        var bx = R() < .5 ? 80 + R() * 20 : 190 + R() * 20, top = 40 + R() * 30;
        brins += chemin('M' + pt(bx, top) + 'Q' + pt(bx + (bx < 145 ? -6 : 6), top + 80) + ' ' + pt(bx + (bx < 145 ? -4 : 4), 196),
          { fill: 'none', stroke: i % 3 ? '#d9a77a' : '#6e462c', 'stroke-width': '.7', 'stroke-opacity': '.55' });
      }
      var noeud = '<path d="M145 172C130 162 112 160 108 170C106 180 128 184 145 176Z" fill="#8f9bb5"/>' +
        '<path d="M145 172C160 162 178 160 182 170C184 180 162 184 145 176Z" fill="#8f9bb5"/>' +
        '<path d="M140 176L130 206L138 205L145 182L152 205L160 206L150 176Z" fill="#76829c"/>' +
        ellipse(145, 174, 6, 5.5, { fill: '#6c7792' });
      var corps = g({ transform: PLACE_VISAGE },
        '<path d="' + dos + '" fill="' + u('chev') + '"/>' +
        '<path d="' + BUSTE + '" fill="' + u('robe') + '"/>' +
        '<path d="' + COU + '" fill="#e9bfa6"/>' +
        '<path d="M108 178L145 196L182 178L176 170L145 184L114 170Z" fill="#e8ecf2"/>' + noeud +
        g({ 'class': 'av-pose', style: origine(145, 150) },
          g({ 'class': 'av-tete m3gan-incline', style: origine(145, 150) },
            v.visage + '<path d="' + meches + '" fill="' + u('chev') + '"/>' + brins)));
      return { defs: defs, fond: fond, corps: ondes(200, 175, 128, VI) + corps };
    },
    css: function (S) {
      return [cssYeux(S),
        S.REP + '.av-m3gan .av-tete{animation:m3gan-incline 9s steps(1,end) infinite}',
        '@keyframes m3gan-incline{0%,100%{transform:rotate(0)}30%{transform:rotate(1.6deg)}62%{transform:rotate(-1deg)}}',
        S.L + '.av-m3gan .av-pupille{transform:scale(1.45)}',
        S.L + '.av-m3gan .av-pose{transform:rotate(-3deg) translateY(2px)}'].join('\n');
    }
  };

  /* ------------------------------------------------------------------ SONNY */
  DESSINS.sonny = {
    dessin: function (k) {
      var R = k.R, u = k.u, i;
      var v = visage(k, {
        forme: 'm', oeilK: 1.08, opacite: '.93', cils: false,
        peau: [[0, '#ffffff'], [.5, '#eef2f5'], [.85, '#cdd7df'], [1, '#a9b6c1']],
        ombre: '#5a6878', lum: '#ffffff', joue: null, fard: '#9fb0c2',
        iris: [[0, '#ffffff'], [.3, '#bfe8ff'], [.65, '#5DADE2'], [1, '#1d5a8a']], lueurOeil: CY,
        sourcil: null, trait: '#5b6c7c', paupiere: '#8796a5', sclere: '#f7fbff',
        nez: ['#a3b0bc', '#ffffff', '#93a1ae', '#a3b0bc', '#7a8896', '#ffffff'],
        levres: [[[0, '#c7d1da'], [1, '#a7b4c0']], [[0, '#d6dee5'], [1, '#b1bdc8']]],
        bouche: '#3d4a58', dents: '#e9eef2', langue: '#8d9aa7', ligneLevres: '#7a8896', menton: '#ffffff'
      });
      var tete = 'M145 8C186 8 207 38 206 76C205 104 198 124 188 138L102 138C92 124 85 104 84 76C83 38 104 8 145 8Z';
      var defs = v.defs +
        fondPlein(k, [[0, '#2a4256'], [.55, '#121e2a'], [1, '#04070b']]) +
        k.rg('coque', ' cx=".42" cy=".3" r=".75"', [[0, '#ffffff', .95], [.7, '#dfe7ee', .9], [1, '#9aa9b6', .85]]) +
        k.rg('col', '', [[0, '#d6f2ff', .95], [.4, CY, .6], [1, CY, 0]]) +
        k.lg('torse', ' x2="0" y2="1"', [[0, '#f4f7f9'], [1, '#b8c4ce']]);
      /* dome de verre et d'acier : meridiens et paralleles */
      var dome = '';
      for (i = -6; i <= 6; i++) dome += chemin('M200 -20Q' + pt(200 + i * 60, 160) + ' ' + pt(200 + i * 34, 420), { fill: 'none', stroke: '#9fd0ee', 'stroke-width': 1, 'stroke-opacity': '.35' });
      for (i = 0; i < 6; i++) dome += ellipse(200, -20, 60 + i * 70, 40 + i * 50, { fill: 'none', stroke: '#9fd0ee', 'stroke-width': 1, 'stroke-opacity': '.25' });
      var fond = rect(0, 0, 400, 400, { fill: u('fond') }) + dome +
        g({ 'class': 'av-actif' }, ellipse(200, 60, 180, 110, { fill: CY, 'fill-opacity': '.12' }));
      /* servomoteurs entrevus sous la coque */
      var servos = '';
      [[118, 54, 10], [172, 54, 10], [145, 34, 8], [108, 92, 7], [182, 92, 7]].forEach(function (s, j) {
        servos += g({ 'class': 'av-sonny-servo av-servo' + j, style: origine(s[0], s[1]) },
          cercle(s[0], s[1], s[2], { fill: 'none', stroke: '#7d8b98', 'stroke-width': 1.4 }) +
          ligne(s[0] - s[2], s[1], s[0] + s[2], s[1], { stroke: '#7d8b98', 'stroke-width': .8 }));
      });
      var corps = g({ transform: PLACE_VISAGE },
        '<path d="' + BUSTE + '" fill="' + u('torse') + '"/>' +
        '<path d="M70 196C96 184 120 180 145 182C170 180 194 184 220 196" fill="none" stroke="#9aa8b4" stroke-width="1"/>' +
        '<path d="' + COU + '" fill="#8e9ba7"/>' +
        '<path d="M134 140V186M145 140V190M156 140V186" stroke="#5f6c78" stroke-width="2.2" stroke-linecap="round"/>' +
        ellipse(145, 182, 34, 9, { fill: u('col'), 'class': 'av-lueur' }) +
        g({ 'class': 'av-pose', style: origine(145, 150) },
          g({ 'class': 'av-tete', style: origine(145, 150) },
            '<path d="' + tete + '" fill="' + u('coque') + '"/>' + servos +
            v.visage +
            '<path d="' + v.forme + '" fill="none" stroke="#8796a5" stroke-width=".9" stroke-opacity=".8"/>' +
            '<path d="M145 10V24M108 26L116 36M182 26L174 36" stroke="#b9c6d1" stroke-width="1" fill="none"/>')));
      return { defs: defs, fond: fond, corps: ondes(200, 175, 128, CY) + corps };
    },
    css: function (S) {
      return [cssYeux(S),
        '.av-sonny-servo{transform-box:view-box;opacity:.55;transition:opacity .4s}',
        S.PR + '.av-sonny-servo{opacity:1;animation:avc-rot 1.4s linear infinite}',
        S.PR + '.av-servo1,' + S.PR + '.av-servo3{animation-direction:reverse}',
        S.L + '.av-sonny .av-pose{transform:rotate(-4deg) translateY(2px)}'].join('\n');
    }
  };

  /* ----------------------------------------------------------------- VISION */
  DESSINS.vision = {
    dessin: function (k) {
      var R = k.R, u = k.u, i;
      var v = visage(k, {
        forme: 'm', cils: false,
        peau: [[0, '#e0688f'], [.42, '#b8456f'], [.78, '#86284f'], [1, '#521633']],
        ombre: '#2a0716', lum: '#ffb3cd', joue: null, fard: '#4a1030',
        iris: [[0, '#ffffff'], [.35, '#d6f4ff'], [.7, '#8fd3f2'], [1, '#3d86b5']], lueurOeil: CY,
        sourcil: null, trait: '#3a0a20', paupiere: '#3a0a20', sclere: '#1c0610', pupille: '#eaf9ff',
        nez: ['#5a1232', '#f08ab0', '#4a0e28', '#5a1232', '#3a0a20', '#f59ab9'],
        levres: [[[0, '#7a1d40'], [1, '#5a1230']], [[0, '#8f2a4f'], [1, '#64163a']]],
        bouche: '#1f0410', dents: '#f0c6d6', langue: '#7a1d40', ligneLevres: '#2a0716', menton: '#f08ab0'
      });
      var crane = 'M145 8C184 8 204 36 202 74C201 100 196 118 188 132L102 132C94 118 89 100 88 74C86 36 106 8 145 8Z';
      var sillons = sym('M118 40Q126 30 140 26M108 60Q116 52 128 50M104 100Q110 112 116 124M122 118Q128 130 136 140', 145);
      var dores = sym('M138 32L130 22M126 46L112 40M110 74L98 70M116 120L106 132', 145);
      var defs = v.defs +
        fondPlein(k, [[0, '#2c1036'], [.55, '#13061a'], [1, '#050208']]) +
        k.rg('crane', ' cx=".45" cy=".35" r=".7"', [[0, '#d6608a'], [.5, '#a43a64'], [1, '#5a1838']]) +
        k.rg('gemme', ' cx=".4" cy=".35" r=".7"', [[0, '#fffbe0'], [.35, '#ffe27a'], [.75, '#F8C471'], [1, '#c8902a']]) +
        k.rg('halo', '', [[0, '#fff6c8', .95], [.3, JA, .6], [1, JA, 0]]) +
        k.lg('rai', ' x2="0" y2="1"', [[0, JA, 0], [.5, JA, .55], [1, JA, 0]]) +
        k.lg('cape', ' x2="0" y2="1"', [[0, '#2f5a3e'], [1, '#13281a']]);
      var rides = '';
      for (i = 0; i < 5; i++) rides += g({ 'class': 'av-onde-q', style: origine(200, 175) + ';animation-delay:-' + (i * 1.6) + 's' },
        cercle(200, 175, 60, { fill: 'none', stroke: VI, 'stroke-width': 1.2, 'stroke-opacity': '.5' }));
      var rais = '';
      for (i = 0; i < 7; i++) {
        var x = 20 + i * 60 + R() * 20;
        rais += rect(x, 0, 2 + R() * 3, 400, { fill: u('rai'), 'class': 'av-pulse', style: '--d:' + (3 + R() * 4).toFixed(1) + 's;animation-delay:-' + (R() * 4).toFixed(1) + 's;--o0:.15;--o1:.8' });
      }
      var fond = rect(0, 0, 400, 400, { fill: u('fond') }) + rides + rais + poussieres(R, 30, '#f6c3ff', 1.2) +
        g({ 'class': 'av-actif' }, rect(0, 0, 400, 400, { fill: VI, 'fill-opacity': '.08' }) + rais.replace(/--o1:\.8/g, '--o1:1'));
      var corps = g({ transform: PLACE_VISAGE },
        '<path d="' + BUSTE + '" fill="#3b0f24"/>' +
        '<path d="M40 196C58 172 92 160 112 150L120 196ZM250 196C232 172 198 160 178 150L170 196Z" fill="' + u('cape') + '"/>' +
        '<path d="M40 196C58 172 92 160 112 150M250 196C232 172 198 160 178 150" fill="none" stroke="' + JA + '" stroke-width="1.6"/>' +
        '<path d="' + COU + '" fill="#8a2a55"/>' +
        g({ 'class': 'av-pose', style: origine(145, 150) },
          g({ 'class': 'av-tete', style: origine(145, 150) },
            '<path d="' + crane + '" fill="' + u('crane') + '"/>' + v.visage +
            '<path d="' + sillons + '" fill="none" stroke="#3a0a20" stroke-width="1.4" stroke-linecap="round" stroke-opacity=".8"/>' +
            '<path class="av-vision-or" d="' + dores + '" fill="none" stroke="' + JA + '" stroke-width="1" stroke-linecap="round"/>' +
            cercle(145, 40, 22, { fill: u('halo'), 'class': 'av-lueur av-vision-halo' }) +
            '<path d="M145 30L151 40L145 50L139 40Z" fill="' + u('gemme') + '" stroke="#a87418" stroke-width=".6"/>' +
            '<path d="M145 32L148 38L145 40Z" fill="#fff" fill-opacity=".8"/>')));
      return { defs: defs, fond: fond, corps: ondes(200, 175, 128, JA) + corps };
    },
    css: function (S) {
      return [cssYeux(S),
        '.av-onde-q{transform-box:view-box;animation:vision-onde 8s linear infinite}',
        '@keyframes vision-onde{0%{transform:scale(.4);opacity:0}20%{opacity:.6}100%{transform:scale(3.4);opacity:0}}',
        '.av-vision-or{stroke-dasharray:3 14;animation:avc-dash 3s linear infinite;--o:-34;opacity:.7}',
        S.PR + '.av-vision-or{opacity:1;animation-duration:.8s}',
        '.av-vision-halo{transform-box:fill-box;transform-origin:50% 50%}',
        S.PR + '.av-vision-halo{animation:vision-gemme 1s ease-in-out infinite}',
        '@keyframes vision-gemme{0%,100%{transform:scale(1);opacity:.75}50%{transform:scale(1.5);opacity:1}}'].join('\n');
    }
  };

  /* ------------------------------------------------------------ AGENT SMITH */
  DESSINS.agent_smith = {
    dessin: function (k) {
      var R = k.R, u = k.u, i, j;
      var v = visage(k, {
        forme: 'm', sansYeux: true,
        peau: [[0, '#f0caae'], [.45, '#d9a685'], [.8, '#b07b5c'], [1, '#7f5240']],
        ombre: '#3e2216', lum: '#ffe6d4', joue: null, fard: null, sourcil: '#3a2a20',
        nez: ['#8a5a44', '#fbe0cc', '#7a4a36', '#8a5a44', '#5a3020', '#f8dac6'],
        levres: [[[0, '#a86a5c'], [1, '#86504a']], [[0, '#b97a6c'], [1, '#93594f']]], menton: '#e8c0a6'
      });
      var cheveux = 'M93 70C92 40 112 20 145 19C178 20 198 40 197 70C192 58 186 48 176 42C162 36 128 36 114 42C104 48 98 58 93 70Z';
      var defs = v.defs +
        k.lg('verre', ' x2="0" y2="1"', [[0, '#0d1a12'], [.6, '#030805'], [1, '#0a1f12']]) +
        k.lg('veste', ' x2="0" y2="1"', [[0, '#1c1f22'], [1, '#050607']]) +
        k.lg('pluie', ' x2="0" y2="1"', [[0, VE, 0], [.85, VE, .8], [1, '#d9ffe6', 1]]) +
        k.clip('lunettes', '<path d="M100 79H140V94Q138 99 128 99H108Q101 98 100 92ZM150 79H190V92Q189 98 182 99H162Q152 99 150 94Z"/>');
      /* pluie de code : colonnes de caracteres qui tombent */
      var GLY = '01ABCDEFHKLMNRTXZ2345789';
      var pluie = '', pluie2 = '';
      for (i = 0; i < 26; i++) {
        var x = 6 + i * 15.4, col = '', n = 10 + Math.floor(R() * 14);
        for (j = 0; j < n; j++) col += texte(x, -j * 16, GLY.charAt(Math.floor(R() * GLY.length)),
          { fill: j === 0 ? '#d9ffe6' : VE, 'fill-opacity': f(Math.max(.12, 1 - j / n)) });
        var d = (4 + R() * 6).toFixed(1), dl = (R() * 8).toFixed(1);
        pluie += g({ 'class': 'av-tombe', style: '--d:' + d + 's;--h:' + (420 + n * 16) + 'px;animation-delay:-' + dl + 's' }, col);
        if (i % 2 === 0) pluie2 += g({ 'class': 'av-tombe', style: '--d:' + (d / 2.5).toFixed(1) + 's;--h:' + (420 + n * 16) + 'px;animation-delay:-' + dl + 's' }, col);
      }
      var police = { 'font-family': 'ui-monospace, Menlo, Consolas, monospace', 'font-size': 13, 'font-weight': 700 };
      var fond = rect(0, 0, 400, 400, { fill: '#010402' }) +
        g(Object.assign({ 'class': 'av-repos' }, police), pluie) +
        g(Object.assign({ 'class': 'av-actif' }, police), pluie2);
      /* reflets de code dans les verres */
      var reflets = '';
      for (i = 0; i < 9; i++) {
        reflets += rect(100 + i * 10, -20, 1.4, 14, { fill: u('pluie'), 'class': 'av-tombe',
          style: '--d:' + (1 + R() * 1.6).toFixed(1) + 's;--h:140px;animation-delay:-' + (R() * 2).toFixed(1) + 's' });
      }
      var spirale = '';
      for (i = 0; i < 7; i++) spirale += 'M' + pt(197 + (i % 2 ? 2 : -1), 104 + i * 6) + 'q' + pt(4, 2) + ' ' + pt(0, 4);
      var corps = g({ transform: PLACE_VISAGE },
        '<path d="' + BUSTE + '" fill="' + u('veste') + '"/>' +
        '<path d="M116 171L145 200L174 171L168 166L145 186L122 166Z" fill="#f4f4f2"/>' +
        '<path d="M141 184L149 184L152 196L145 250L138 196Z" fill="#0b0c0d"/>' +
        '<path d="M141 184L149 184L147 190L143 190Z" fill="#1a1c1e"/>' +
        '<path d="M70 196L116 171L130 186L118 196ZM220 196L174 171L160 186L172 196Z" fill="#0d0f10"/>' +
        '<path d="' + COU + '" fill="#c9926f"/>' +
        g({ 'class': 'av-pose', style: origine(145, 150) },
          g({ 'class': 'av-tete', style: origine(145, 150) },
            v.visage + '<path d="' + cheveux + '" fill="#3a2a20"/>' +
            '<path d="M100 66Q122 54 145 56Q168 54 190 66" fill="none" stroke="#5a4232" stroke-width="1" stroke-opacity=".6"/>' +
            /* lunettes noires, reflets verts */
            '<path d="M100 79H140V94Q138 99 128 99H108Q101 98 100 92ZM150 79H190V92Q189 98 182 99H162Q152 99 150 94Z" fill="' + u('verre') + '"/>' +
            g({ 'clip-path': u('lunettes') }, reflets) +
            '<path d="M140 82Q145 79 150 82M100 81L92 78M190 81L198 78" fill="none" stroke="#0a0a0a" stroke-width="2.2"/>' +
            '<path d="M104 82H124" stroke="#9fffc2" stroke-opacity=".35" stroke-width="1"/>' +
            /* oreillette */
            '<path d="M196 92Q203 94 201 102' + spirale + '" fill="none" stroke="#c9d1cf" stroke-width="1.3" stroke-opacity=".9"/>')) +
        g({ 'class': 'av-calc smith-dissout' }, rect(80, 0, 130, 250, { fill: VE, 'fill-opacity': '.12' })));
      return { defs: defs, fond: fond, corps: corps };
    },
    css: function (S) {
      return [
        S.PR + '.av-agent_smith .av-corps{animation:avc-souffle 5.2s ease-in-out infinite,smith-glitch .9s steps(1,end) infinite}',
        '@keyframes smith-glitch{0%,100%{opacity:1}22%{opacity:.62}24%{opacity:1}61%{opacity:.75}63%{opacity:1}}',
        S.L + '.av-agent_smith .av-pose{transform:rotate(-2deg) translateY(1px)}'].join('\n');
    }
  };

  /* =====================================================================
   *  TETES DE METAL — Skynet / T-800 (repris du dessin du 28/09/2026),
   *  RoboCop, C-3PO. Coordonnees d'origine 290 x 196 comme les visages,
   *  placees par PLACE_VISAGE.
   * ===================================================================== */
  function trait(d, c, w, o) {
    return '<path d="' + d + '" stroke="' + c + '" stroke-width="' + w + '"' + (o != null ? ' stroke-opacity="' + o + '"' : '') + '/>';
  }
  function rivets(l, clair) {
    return '<path d="' + points(l) + '" stroke="#1b1f24" stroke-width="3.2" stroke-linecap="round"/>' +
      '<path d="' + points(l) + '" stroke="' + (clair || '#d9dfe5') + '" stroke-width="2" stroke-linecap="round"/>';
  }
  /* code en filigrane qui defile vers le haut, en boucle sans couture (contenu double) */
  function codeDefilant(R, x, n, lignes, col, op, taille, duree) {
    var s = '', h = n * (taille + 3);
    for (var rep = 0; rep < 2; rep++) {
      for (var i = 0; i < n; i++) s += texte(x, 14 + rep * h + i * (taille + 3), lignes(R, i), { fill: col, 'fill-opacity': op });
    }
    return g({ 'class': 'av-tombe', style: '--d:' + duree + 's;--h:-' + h + 'px', 'font-family': 'ui-monospace, Menlo, Consolas, monospace', 'font-size': taille }, s);
  }
  function asm(R) {
    var ops = ['MOV', 'JMP', 'CMP', 'XOR', 'PUSH', 'POP', 'CALL', 'LEA', 'SHL', 'INT'],
      regs = ['EAX', 'EBX', 'ECX', 'EDX', 'ESI', 'EDI', 'ESP'];
    var o = ops[Math.floor(R() * ops.length)];
    var hex = (Math.floor(R() * 65535) + 4096).toString(16).toUpperCase();
    return o + ' ' + regs[Math.floor(R() * regs.length)] + ', 0x' + hex;
  }

  /* ---------------------------------------------------------------- SKYNET */
  DESSINS.skynet = {
    dessin: function (k) {
      var R = k.R, u = k.u, i;
      function rct(x, y, w, h, fill, extra) {
        return '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '" fill="' + fill + '"' + (extra || '') + '/>';
      }
      function optique(cx, cy) {
        return '<circle class="sk-glow" cx="' + cx + '" cy="' + cy + '" r="15" fill="' + u('rouge') + '"/>' +
          '<g class="sk-oeil" style="' + origine(cx, cy) + '">' +
          '<circle cx="' + cx + '" cy="' + cy + '" r="5.4" fill="#2a0806" stroke="#7a2219" stroke-width="1.1"/>' +
          '<circle cx="' + cx + '" cy="' + cy + '" r="3.7" fill="' + RO + '"/>' +
          '<circle class="sk-coeur" cx="' + cx + '" cy="' + cy + '" r="1.8" fill="#fff1ec"/>' +
          '<circle cx="' + f(cx - 1.7) + '" cy="' + f(cy - 1.7) + '" r=".8" fill="#fff" fill-opacity=".85"/></g>';
      }
      var crane = 'M145 8C177 8 199 30 200 60C201 76 197 88 191 97L180 104L110 104L99 97C93 88 89 76 90 60C91 30 113 8 145 8Z';
      var dents = '', dentsB = '';
      for (i = 0; i < 10; i++) dents += 'M' + pt(121 + i * 4.85, 115.5) + 'h4.3v8q-2.15 2.4-4.3 0z';
      for (i = 0; i < 10; i++) dentsB += 'M' + pt(122 + i * 4.6, 134.2) + 'v-6.8q2.15-2.2 4.3 0v6.8z';
      var data = '';
      [187.5, 190.5, 193.5].forEach(function (y, r) {
        var x = 68, segs = [];
        while (x < 108) { var w = 2 + R() * 7; if (x + w > 110) break; segs.push([x, w]); x += w + 1.4 + R() * 2; }
        var d = segs.map(function (s) { return 'M' + pt(s[0], y) + 'h' + f(s[1]) + 'M' + pt(290 - s[0] - s[1], y) + 'h' + f(s[1]); }).join('');
        data += '<path class="sk-d sk-d' + (r + 1) + '" d="' + d + '" stroke="' + (r === 1 ? JA : RO) + '" stroke-width="1.3"/>';
      });
      var cables = 'M130 152C125 165 116 173 98 181M136 155C134 168 128 177 118 186';
      var defs =
        fondPlein(k, [[0, '#2b0907'], [.55, '#120303'], [1, '#030101']]) +
        k.rg('dome', ' cx=".38" cy=".22" r=".85"', [[0, '#ffffff'], [.12, '#e2e7ec'], [.36, '#9ba4ae'], [.66, '#4a525b'], [1, '#1e2227']]) +
        k.lg('chrome', ' x2="0" y2="1"', [[0, '#f1f4f7'], [.25, '#c2c9d1'], [.46, '#7b858f'], [.52, '#2c3238'], [.6, '#5b646e'], [.82, '#a9b2bb'], [1, '#4b535c']]) +
        k.lg('acier', '', [[0, '#23272c'], [.3, '#a3acb5'], [.46, '#eef2f5'], [.62, '#838c95'], [1, '#1f2327']]) +
        k.lg('sombre', ' x2="0" y2="1"', [[0, '#4a525b'], [.35, '#262b30'], [1, '#0b0d0f']]) +
        k.lg('plaque', ' x2="1" y2="1"', [[0, '#e3e8ed'], [.4, '#8e98a2'], [.56, '#363d44'], [.8, '#7c8691'], [1, '#bcc4cc']]) +
        k.rg('orbite', '', [[0, '#000'], [.55, '#08090b'], [.85, '#24292f'], [1, '#4d555e']]) +
        k.rg('rouge', '', [[0, '#ffb3a4'], [.22, RO, .9], [.55, RO, .3], [1, RO, 0]]) +
        k.lg('dent', ' x2="0" y2="1"', [[0, '#f5f7f9'], [.6, '#bcc3ca'], [1, '#6a727b']]) +
        k.lg('cav', ' x2="0" y2="1"', [[0, '#000'], [1, '#1a0706']]) +
        k.lg('scan', ' x2="0" y2="1"', [[0, RO, 0], [.85, RO, .3], [1, '#ffb3a4', .9]]) +
        k.rg('aura', '', [[0, RO, .38], [.55, RO, .1], [1, RO, 0]]);
      /* trame radar de ciblage : cercles, graduations, balayage, cibles */
      var radar = '';
      for (i = 1; i <= 5; i++) radar += cercle(200, 175, i * 44, { fill: 'none', stroke: RO, 'stroke-opacity': f(.32 - i * .03), 'stroke-width': 1 });
      radar += ligne(0, 175, 400, 175, { stroke: RO, 'stroke-opacity': '.25' }) + ligne(200, 0, 200, 400, { stroke: RO, 'stroke-opacity': '.25' });
      var grad = '';
      for (i = 0; i < 72; i++) {
        var a = i * 5 * Math.PI / 180, r2 = i % 6 ? 186 : 176;
        grad += 'M' + pt(200 + 192 * Math.cos(a), 175 + 192 * Math.sin(a)) + 'L' + pt(200 + r2 * Math.cos(a), 175 + r2 * Math.sin(a));
      }
      radar += chemin(grad, { stroke: RO, 'stroke-opacity': '.45', 'stroke-width': 1 });
      function balai(duree, op) {
        var w = '';
        for (var j = 0; j < 8; j++) {
          var a0 = -j * 4, a1 = -(j + 1) * 4;
          w += chemin('M200 175L' + pt(200 + 260 * Math.cos(a0 * Math.PI / 180), 175 + 260 * Math.sin(a0 * Math.PI / 180)) +
            'A260 260 0 0 0 ' + pt(200 + 260 * Math.cos(a1 * Math.PI / 180), 175 + 260 * Math.sin(a1 * Math.PI / 180)) + 'Z',
            { fill: RO, 'fill-opacity': f(op * (1 - j / 8)) });
        }
        return tourne(200, 175, duree, w + ligne(200, 175, 460, 175, { stroke: '#ff9c8c', 'stroke-width': 1.4 }));
      }
      var cibles = '';
      for (i = 0; i < 7; i++) {
        var cx = 30 + R() * 340, cy = 30 + R() * 330;
        cibles += g({ 'class': 'av-pulse', style: '--d:' + (1.5 + R() * 2).toFixed(1) + 's;animation-delay:-' + (R() * 3).toFixed(1) + 's;--o0:0;--o1:.9' },
          chemin('M' + pt(cx - 9, cy - 4) + 'v-5h5M' + pt(cx + 4, cy - 9) + 'h5v5M' + pt(cx + 9, cy + 4) + 'v5h-5M' + pt(cx - 4, cy + 9) + 'h-5v-5',
            { fill: 'none', stroke: RO, 'stroke-width': 1.2 }) + cercle(cx, cy, 1.6, { fill: '#ffb3a4' }));
      }
      var fond = rect(0, 0, 400, 400, { fill: u('fond') }) +
        codeDefilant(R, 8, 26, asm, RO, '.2', 9, 40) + g({ transform: 'translate(306 0)' }, codeDefilant(graine(77), 0, 26, asm, RO, '.16', 9, 52)) +
        radar + g({ 'class': 'av-repos' }, balai(7, .22)) + cibles +
        g({ 'class': 'av-actif' }, balai(1.8, .3) + rect(0, 0, 400, 400, { fill: RO, 'fill-opacity': '.07' }));
      var tete =
        '<circle cx="93" cy="94" r="7" fill="' + u('acier') + '" stroke="#15181b" stroke-width=".8"/><circle cx="197" cy="94" r="7" fill="' + u('acier') + '" stroke="#15181b" stroke-width=".8"/>' +
        '<path d="' + crane + '" fill="' + u('dome') + '"/>' +
        '<path d="M91 50C112 43 178 43 199 50L199 55C178 48 112 48 91 55Z" fill="#14181c" fill-opacity=".45"/>' +
        '<ellipse cx="123" cy="27" rx="17" ry="6.5" fill="#fff" fill-opacity=".5" transform="rotate(-28 123 27)"/>' +
        '<ellipse cx="171" cy="22" rx="8" ry="2.6" fill="#fff" fill-opacity=".25" transform="rotate(25 171 22)"/>' +
        '<g fill="none">' + trait(crane, '#e6ebef', .7, .45) +
        trait('M145 10L145 58', '#1b1f24', .9) + trait('M146.3 12L146.3 56', '#fff', .5, .45) +
        trait(sym('M104 38C111 50 112 63 107 76', 145), '#1b1f24', .9) + trait(sym('M105.3 38C112.3 50 113.3 63 108.3 76', 145), '#fff', .5, .35) + '</g>' +
        rivets([[114, 44], [176, 44], [104, 72], [186, 72]]) +
        rct(112, 116, 66, 32, u('cav')) +
        '<g class="av-v-y" style="--k:8px">' +
        rct(104.2, 110, 3.6, 26, u('acier')) + rct(182.2, 110, 3.6, 26, u('acier')) +
        '<g fill="none">' + trait(sym('M106 136L113 138', 145), '#23272c', 2.4) + '</g>' +
        '<circle cx="106" cy="136" r="3.2" fill="' + u('acier') + '" stroke="#15181b" stroke-width=".6"/><circle cx="184" cy="136" r="3.2" fill="' + u('acier') + '" stroke="#15181b" stroke-width=".6"/>' +
        '<path d="M113 126L177 126L180 139C178 151 165 160 145 161C125 160 112 151 110 139Z" fill="' + u('chrome') + '" stroke="#15181b" stroke-width=".6"/>' +
        '<path d="' + dentsB + '" fill="' + u('dent') + '" stroke="#2e3439" stroke-width=".35"/>' +
        '<g fill="none">' + trait('M126 151L164 151', '#1b1f24', .9) + trait('M126 152.2L164 152.2', '#fff', .5, .35) + '</g>' +
        rivets([[121, 141], [169, 141]]) + '</g>' +
        '<path d="M117 102C129 98 161 98 173 102L175 125L115 125Z" fill="' + u('chrome') + '" stroke="#15181b" stroke-width=".5"/>' +
        '<path d="M145 94C150 97 153 105 152 112C150 115 147 114 145 111C143 114 140 115 138 112C137 105 140 97 145 94Z" fill="#06080a" stroke="#5a636c" stroke-width=".6"/>' +
        '<path d="' + sym('M104 91C108 100 118 104 132 104L137 110L126 117C113 117 104 111 99 101Z', 145) + '" fill="' + u('plaque') + '" stroke="#15181b" stroke-width=".5"/>' +
        '<path d="' + dents + '" fill="' + u('dent') + '" stroke="#2e3439" stroke-width=".35"/>' +
        rct(102, 98, 8, 20, u('acier'), ' rx="1.6" stroke="#15181b" stroke-width=".5"') + rct(180, 98, 8, 20, u('acier'), ' rx="1.6" stroke="#15181b" stroke-width=".5"') +
        '<path d="M98 66C112 57 132 58 145 64C158 58 178 57 192 66L190 74C177 68 160 69 145 75C130 69 113 68 100 74Z" fill="' + u('chrome') + '" stroke="#15181b" stroke-width=".5"/>' +
        '<path d="' + sym('M105 75C113 70 131 70 141 78C144 87 139 98 127 99C114 99 106 90 105 75Z', 145) + '" fill="' + u('orbite') + '" stroke="#c9d0d7" stroke-opacity=".55" stroke-width=".7"/>' +
        optique(124, 85) + optique(166, 85) +
        g({ 'class': 'av-calc' }, g({ 'class': 'sk-balai' }, rct(86, 0, 118, 10, u('scan')) + rct(86, 9.4, 118, .9, '#ffd2c8')));
      var corps = g({ transform: PLACE_VISAGE },
        cercle(145, 84, 132, { fill: u('aura'), 'class': 'av-lueur' }) +
        '<path d="M14 196C30 184 70 178 104 177L120 171L170 171L186 177C220 178 260 184 276 196V250H14Z" fill="' + u('sombre') + '"/>' +
        '<g fill="none" stroke-linecap="round">' + trait(sym('M14 196C30 184 70 178 104 177L120 171', 145), '#b3bbc3', 1, .6) + '</g>' +
        '<path d="' + sym('M60 184L108 178L112 183L64 189Z', 145) + '" fill="' + u('plaque') + '" stroke="#15181b" stroke-width=".5"/>' +
        '<path d="M127 178L163 178L159 222L131 222Z" fill="' + u('chrome') + '" stroke="#15181b" stroke-width=".5"/>' +
        '<path d="' + sym('M70 204L118 200L120 210L72 216Z', 145) + '" fill="' + u('plaque') + '" stroke="#15181b" stroke-width=".5" fill-opacity=".7"/>' +
        rivets([[40, 190], [88, 185], [250, 190], [202, 185]]) +
        g({ 'class': 'av-calc' }, data) +
        '<g fill="none" stroke-linecap="round">' +
        trait(sym(cables, 145), '#101215', 3.3) + trait(sym(cables, 145), '#6f7a85', .8) +
        '<path class="sk-flux av-calc" d="' + sym(cables, 145) + '" stroke="#ff8a78" stroke-width="1.3"/>' +
        trait(sym('M121 163L114 178', 145), '#191c20', 7.6) + trait(sym('M121 163L114 178', 145), '#7f8993', 5.4) +
        trait(sym('M119.8 162.6L112.8 177.6', 145), '#eef2f5', 1.2, .7) +
        trait(sym('M128 149L121 163', 145), '#1a1d21', 3.6) + trait(sym('M128 149L121 163', 145), '#d4dae0', 2.2) + '</g>' +
        [0, 1, 2, 3, 4, 5].map(function (n) { return rct(137, 149 + n * 7.6, 16, 6, u('acier'), ' rx="2" stroke="#131619" stroke-width=".5"'); }).join('') +
        g({ 'class': 'av-pose', style: origine(145, 150) }, g({ 'class': 'av-tete sk-tete', style: origine(145, 150) }, tete)));
      return { defs: defs, fond: fond, corps: ondes(200, 175, 128, RO) + corps };
    },
    css: function (S) {
      return [
        '.sk-glow{transform-box:fill-box;transform-origin:50% 50%;animation:skynet-optique 4.5s ease-in-out infinite}',
        '@keyframes skynet-optique{0%,100%{opacity:.5}50%{opacity:.9}}',
        S.L + '.sk-glow{animation:skynet-optique-e 1.3s ease-in-out infinite}',
        '@keyframes skynet-optique-e{0%,100%{opacity:.85;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}',
        S.PR + '.sk-glow{animation:skynet-optique-p .5s linear infinite}',
        '@keyframes skynet-optique-p{0%,100%{opacity:.95}50%{opacity:.6}}',
        S.S + '.sk-glow{animation:none;opacity:.9}',
        S.AU + '.sk-glow{opacity:calc(.6 + var(--bouche,0) * .4)}',
        '.sk-oeil{transform-box:view-box;transition:transform .5s}',
        S.L + '.sk-oeil{transform:scale(1.12)}',
        S.PR + '.sk-oeil{animation:avy-saccade .9s steps(1,end) infinite}',
        '@keyframes avy-saccade{0%{transform:translate(0,0)}18%{transform:translate(1.7px,-.3px)}36%{transform:translate(-1.3px,.3px)}52%{transform:translate(.6px,.6px)}70%{transform:translate(-1.8px,-.4px)}86%{transform:translate(1px,.2px)}}',
        '.sk-coeur{opacity:.8;transition:opacity .4s}', S.ACT + '.sk-coeur{opacity:1}',
        '.sk-balai{transform-box:view-box}',
        S.PR + '.sk-balai{animation:skynet-balai 1.9s linear infinite}',
        '@keyframes skynet-balai{0%{transform:translateY(0);opacity:0}8%,90%{opacity:1}100%{transform:translateY(158px);opacity:0}}',
        S.PR + '.sk-d{animation:skynet-data .8s steps(1,end) infinite}',
        S.PR + '.sk-d2{animation-delay:.2s}', S.PR + '.sk-d3{animation-delay:.4s}',
        '@keyframes skynet-data{0%{opacity:1}35%{opacity:.25}60%{opacity:.9}80%{opacity:.4}}',
        '.sk-flux{stroke-dasharray:2 13}', S.PR + '.sk-flux{animation:skynet-flux .7s linear infinite}',
        '@keyframes skynet-flux{to{stroke-dashoffset:-15}}',
        /* micro-rotation mecanique SECHE de la tete (paliers, pas de fondu) */
        S.REP + '.sk-tete{animation:skynet-tete 9s steps(1,end) infinite}',
        '@keyframes skynet-tete{0%,100%{transform:rotate(0)}22%{transform:rotate(1.4deg)}47%{transform:rotate(-.8deg)}71%{transform:rotate(.5deg)}}'
      ].join('\n');
    }
  };

  /* --------------------------------------------------------------- ROBOCOP */
  DESSINS.robocop = {
    dessin: function (k) {
      var R = k.R, u = k.u, i;
      var v = visage(k, {
        forme: 'm', sansYeux: true, sourcil: null, joue: null, fard: null,
        peau: [[0, '#ecc7ad'], [.45, '#d4a283'], [.8, '#a9765a'], [1, '#7a4d38']],
        ombre: '#3a1e12', lum: '#ffe6d6',
        nez: ['#8a5a44', '#fbe0cc', '#7a4a36', '#8a5a44', '#5a3020', '#f8dac6'],
        levres: [[[0, '#a6685c'], [1, '#844c46']], [[0, '#b77a6c'], [1, '#90584e']]], menton: '#e8c0a6'
      });
      /* casque : couvre le haut du visage jusque sous les pommettes */
      var casque = 'M145 4C188 4 210 34 209 74C208 96 204 112 197 124L186 126L182 108L108 108L104 126L93 124C86 112 82 96 81 74C80 34 102 4 145 4Z';
      var visiere = 'M92 74C112 68 178 68 198 74L196 96C176 102 114 102 94 96Z';
      var defs = v.defs +
        fondPlein(k, [[0, '#0c2033'], [.55, '#061018'], [1, '#020407']]) +
        k.rg('titane', ' cx=".38" cy=".25" r=".85"', [[0, '#f4f7fa'], [.25, '#c4cdd6'], [.55, '#7d8a97'], [.8, '#46525e'], [1, '#232a31']]) +
        k.lg('brosse', ' x2="0" y2="1"', [[0, '#d8dee4'], [.5, '#8995a1'], [1, '#3c4650']]) +
        k.lg('visiere', ' x2="0" y2="1"', [[0, '#1c2229'], [.5, '#05070a'], [1, '#14191f']]) +
        k.lg('laser', '', [[0, RO, 0], [.5, '#ffd1c9', 1], [1, RO, 0]]) +
        k.lg('ville', ' x2="0" y2="1"', [[0, '#0e2236'], [1, '#03070c']]) +
        k.clip('cvisiere', '<path d="' + visiere + '"/>');
      /* ville de nuit : immeubles, fenetres allumees */
      var ville = '', fen = '';
      for (i = 0; i < 18; i++) {
        var x = i * 24 - 10 + R() * 8, w = 18 + R() * 20, h = 90 + R() * 170, y = 400 - h;
        ville += rect(x, y, w, h, { fill: i % 2 ? '#0b1a29' : '#102538' });
        for (var j = 0; j < 8; j++) {
          if (R() < .55) continue;
          fen += rect(x + 3 + R() * (w - 6), y + 6 + R() * (h - 20), 2.2, 3, { fill: R() < .7 ? JA : CY, 'class': 'av-scintille',
            style: '--d:' + (3 + R() * 5).toFixed(1) + 's;animation-delay:-' + (R() * 6).toFixed(1) + 's' });
        }
      }
      /* trame de telemetrie : grille vectorielle, reperes */
      var trame = '';
      for (i = 0; i <= 10; i++) trame += ligne(i * 40, 0, i * 40, 400, { stroke: CY, 'stroke-opacity': '.12' }) + ligne(0, i * 40, 400, i * 40, { stroke: CY, 'stroke-opacity': '.12' });
      var reperes = texte(14, 22, 'OCP-001 // TARGET ACQ', { fill: CY, 'fill-opacity': '.7' }) + texte(14, 36, 'THERMAL 34.6°C', { fill: RO, 'fill-opacity': '.7' }) +
        texte(270, 22, 'DIRECTIVE 1-3', { fill: CY, 'fill-opacity': '.7' });
      var fond = rect(0, 0, 400, 400, { fill: u('fond') }) + trame + ville + fen +
        g({ 'font-family': 'ui-monospace, Menlo, Consolas, monospace', 'font-size': 9 }, reperes) +
        g({ 'class': 'av-glisse', style: '--d:9s;--h:400px' }, rect(-400, 0, 3, 400, { fill: CY, 'fill-opacity': '.35' })) +
        g({ 'class': 'av-actif' }, g({ 'class': 'av-tombe', style: '--d:1.6s;--h:420px' }, rect(0, -20, 400, 2, { fill: RO, 'fill-opacity': '.55' })) +
          rect(0, 0, 400, 400, { fill: CY, 'fill-opacity': '.06' }));
      /* reticule de ciblage autour de la tete (ecoute et calcul) */
      var cible = chemin('M60 30v-16h16M214 14h16v16M230 214v16h-16M76 230H60v-16', { fill: 'none', stroke: VE, 'stroke-width': 1.6 }) +
        ligne(145, 6, 145, 18, { stroke: RO, 'stroke-width': 1.2 }) + ligne(145, 222, 145, 234, { stroke: RO, 'stroke-width': 1.2 }) +
        texte(232, 120, 'LOCK', { fill: VE, 'font-size': 7, 'font-family': 'ui-monospace, monospace' });
      var corps = g({ transform: PLACE_VISAGE },
        /* epaules blindees */
        '<path d="M12 200C26 182 70 172 112 170L178 170C220 172 264 182 278 200V250H12Z" fill="' + u('brosse') + '"/>' +
        '<path d="' + sym('M24 200C40 186 76 178 108 176L112 196L30 214Z', 145) + '" fill="' + u('titane') + '" stroke="#2a323a" stroke-width=".8"/>' +
        '<path d="M118 176H172L166 212H124Z" fill="#2c343c" stroke="#5c6772" stroke-width=".8"/>' +
        rivets([[44, 196], [92, 186], [246, 196], [198, 186]], '#c9d2db') +
        '<path d="' + COU + '" fill="#3a434c"/>' +
        '<path d="M126 150H164M124 160H166M124 170H166" stroke="#7d8996" stroke-width="3"/>' +
        g({ 'class': 'av-pose', style: origine(145, 150) },
          g({ 'class': 'av-tete', style: origine(145, 150) },
            v.visage +
            '<path d="' + casque + '" fill="' + u('titane') + '"/>' +
            '<path d="M145 6V66M118 14Q112 40 112 66M172 14Q178 40 178 66" fill="none" stroke="#2c343c" stroke-width="1" stroke-opacity=".7"/>' +
            cercle(83, 92, 13, { fill: u('brosse'), stroke: '#2c343c', 'stroke-width': 1 }) + cercle(207, 92, 13, { fill: u('brosse'), stroke: '#2c343c', 'stroke-width': 1 }) +
            cercle(83, 92, 6, { fill: '#2c343c' }) + cercle(207, 92, 6, { fill: '#2c343c' }) +
            '<path d="' + visiere + '" fill="' + u('visiere') + '" stroke="#0a0d10" stroke-width="1"/>' +
            '<path d="M97 86H193" stroke="' + RO + '" stroke-width="5" stroke-opacity=".25" class="av-lueur"/>' +
            '<path d="M97 86H193" stroke="' + RO + '" stroke-width="1.2"/>' +
            g({ 'clip-path': u('cvisiere') }, g({ 'class': 'rc-laser' }, rect(70, 74, 30, 26, { fill: u('laser') }))) +
            '<path d="M96 76C116 71 174 71 194 76" fill="none" stroke="#9fb3c4" stroke-width=".8" stroke-opacity=".6"/>')) +
        g({ 'class': 'av-ecoute' }, cible) + g({ 'class': 'av-calc' }, cible));
      return { defs: defs, fond: fond, corps: corps };
    },
    css: function (S) {
      return [
        '.rc-laser{transform-box:view-box;animation:robocop-laser 3.2s ease-in-out infinite alternate}',
        '@keyframes robocop-laser{from{transform:translateX(0)}to{transform:translateX(120px)}}',
        S.PR + '.rc-laser{animation-duration:.7s}',
        S.REP + '.av-robocop .av-tete{animation:robocop-tete 11s steps(1,end) infinite}',
        '@keyframes robocop-tete{0%,100%{transform:rotate(0)}40%{transform:rotate(-1.2deg)}70%{transform:rotate(.8deg)}}'
      ].join('\n');
    }
  };

  /* ------------------------------------------------------------------ C-3PO */
  DESSINS.c3po = {
    dessin: function (k) {
      var R = k.R, u = k.u, i;
      var tete = 'M145 10C180 10 200 34 202 66C203 90 199 108 192 122C186 134 176 144 164 148L126 148C114 144 104 134 98 122C91 108 87 90 88 66C90 34 110 10 145 10Z';
      var defs =
        k.lg('fond', ' x2="0" y2="1"', [[0, '#e8ecf0'], [.6, '#c4cbd2'], [1, '#8d969f']]) +
        k.rg('or', ' cx=".38" cy=".25" r=".85"', [[0, '#fff6cf'], [.22, '#f6d77a'], [.5, '#d4a03a'], [.78, '#8f6418'], [1, '#4f340a']]) +
        k.lg('orL', ' x2="0" y2="1"', [[0, '#ffe9a3'], [.45, '#d9a43c'], [.55, '#8f6418'], [1, '#c99232']]) +
        k.rg('oeil', '', [[0, '#fffbe6'], [.35, '#ffe68a'], [.7, JA], [1, '#b8781e']]) +
        k.rg('lueur', '', [[0, '#fff3c0', .9], [.4, JA, .5], [1, JA, 0]]) +
        k.lg('panneau', ' x2="0" y2="1"', [[0, '#ffffff', .95], [1, '#dfe6ec', .9]]);
      /* couloir blanc du Tantive IV : cloisons arrondies retro-eclairees */
      var couloir = '';
      for (i = 0; i < 5; i++) {
        var t = .25 + i * .18, w = 80 + t * 380, h = 100 + t * 340, x = 200 - w / 2, y = 168 - h / 2;
        couloir += rect(x, y, w, h, { rx: f(30 * t), fill: 'none', stroke: '#9aa4ad', 'stroke-width': f(2 + t * 6), 'stroke-opacity': '.55' });
      }
      var lumieres = '';
      for (i = 0; i < 12; i++) {
        var lx = i < 6 ? 10 + i * 10 : 330 + (i - 6) * 10, ly = 130 + (i % 6) * 18;
        lumieres += rect(lx, ly, 6, 12, { rx: 2, fill: '#ffffff', 'class': 'av-pulse', style: '--d:' + (3 + R() * 3).toFixed(1) + 's;animation-delay:-' + (R() * 3).toFixed(1) + 's;--o0:.4;--o1:1' });
      }
      var fond = rect(0, 0, 400, 400, { fill: u('fond') }) + couloir +
        rect(0, 340, 400, 60, { fill: '#7d8790', 'fill-opacity': '.4' }) + lumieres +
        g({ 'class': 'av-actif' }, rect(0, 0, 400, 400, { fill: JA, 'fill-opacity': '.08' }) +
          g({ 'class': 'av-glisse', style: '--d:2.4s;--h:460px' }, rect(-60, 120, 40, 160, { fill: '#ffffff', 'fill-opacity': '.25' })));
      function oeil(cx) {
        return cercle(cx, 84, 20, { fill: u('lueur'), 'class': 'av-lueur' }) +
          cercle(cx, 84, 12, { fill: '#3a2608', stroke: '#6e4c14', 'stroke-width': 1.5 }) +
          g({ 'class': 'c3-oeil' }, cercle(cx, 84, 9.5, { fill: u('oeil') }) +
            /* grille de l'oeil (pupille divisee) */
            '<path d="M' + pt(cx - 9.5, 84) + 'h19M' + pt(cx, 74.5) + 'v19M' + pt(cx - 6.7, 77.3) + 'l13.4 13.4M' + pt(cx + 6.7, 77.3) + 'l-13.4 13.4" stroke="#a46a12" stroke-width=".6" stroke-opacity=".7"/>' +
            cercle(cx, 84, 3, { fill: '#fff6d0' }) + cercle(cx - 3.5, 80.5, 1.6, { fill: '#fff' }));
      }
      var corps = g({ transform: PLACE_VISAGE },
        /* torse dore, plastron et cablage */
        '<path d="M14 204C28 184 72 174 112 172L178 172C218 174 262 184 276 204V250H14Z" fill="' + u('orL') + '"/>' +
        '<path d="M98 180H192L186 230H104Z" fill="' + u('or') + '" stroke="#6e4c14" stroke-width="1"/>' +
        '<path d="M120 192H170M122 204H168M126 216H164" stroke="#6e4c14" stroke-width="1.2" stroke-opacity=".7"/>' +
        cercle(145, 222, 6, { fill: '#5a8fc0', stroke: '#2a3a4a', 'stroke-width': 1 }) +
        /* cou : verins et cables apparents */
        '<path d="M130 140L126 176M160 140L164 176" stroke="#5a5048" stroke-width="5"/>' +
        '<path d="M130 140L126 176M160 140L164 176" stroke="#c9b48a" stroke-width="2"/>' +
        '<path d="M138 144C134 156 140 166 136 176M152 144C156 156 150 166 154 176M145 146V176" fill="none" stroke="#c0392b" stroke-width="1.6"/>' +
        '<path d="M141 146V176M149 146V176" fill="none" stroke="#2c3e50" stroke-width="1.4"/>' +
        g({ 'class': 'av-pose', style: origine(145, 150) },
          g({ 'class': 'av-tete c3-tete', style: origine(145, 150) },
            '<path d="' + tete + '" fill="' + u('or') + '"/>' +
            /* arcade, front et oreilles */
            '<path d="M100 66C116 56 174 56 190 66L188 72C172 64 118 64 102 72Z" fill="#8f6418" fill-opacity=".7"/>' +
            '<path d="M120 30Q145 22 170 30" fill="none" stroke="#fff6cf" stroke-width="2" stroke-opacity=".6"/>' +
            cercle(90, 92, 12, { fill: u('or'), stroke: '#6e4c14', 'stroke-width': 1 }) + cercle(200, 92, 12, { fill: u('or'), stroke: '#6e4c14', 'stroke-width': 1 }) +
            cercle(90, 92, 5, { fill: '#6e4c14' }) + cercle(200, 92, 5, { fill: '#6e4c14' }) +
            oeil(124) + oeil(166) +
            /* nez et fente de la bouche (s'eclaire en parlant) */
            '<path d="M145 92L139 112H151Z" fill="#b8862c" stroke="#6e4c14" stroke-width=".8"/>' +
            rect(127, 120, 36, 12, { rx: 3, fill: '#2a1a05', stroke: '#6e4c14', 'stroke-width': 1 }) +
            g({ 'class': 'av-v-o', style: '--o0:.15' }, rect(129, 122, 32, 8, { rx: 2, fill: JA })) +
            '<path d="M130 124H160M130 126.5H160M130 129H160" stroke="#3a2608" stroke-width=".8"/>' +
            '<path d="M112 136Q145 152 178 136" fill="none" stroke="#6e4c14" stroke-width="1.2"/>')));
      return { defs: defs, fond: fond, corps: ondes(200, 175, 128, JA) + corps };
    },
    css: function (S) {
      return [
        '.c3-oeil{animation:c3po-oeil 5s steps(1,end) infinite}',
        '@keyframes c3po-oeil{0%,100%{opacity:1}61%{opacity:.55}63%{opacity:1}64%{opacity:.6}66%{opacity:1}}',
        S.PR + '.c3-oeil{animation:c3po-oeil .7s steps(1,end) infinite}',
        /* tressaillements robotiques du cou */
        S.REP + '.c3-tete{animation:c3po-tete 7s steps(1,end) infinite}',
        '@keyframes c3po-tete{0%,100%{transform:rotate(0)}18%{transform:rotate(2deg)}19%{transform:rotate(1.6deg)}52%{transform:rotate(-1.4deg)}53%{transform:rotate(-1deg)}80%{transform:translateY(-1px)}}',
        S.L + '.av-c3po .av-pose{transform:rotate(4deg) translateY(2px)}'
      ].join('\n');
    }
  };

  /* =====================================================================
   *  MACHINES — HAL 9000, WOPR, MU/TH/UR 6000, GLaDOS, Baymax, TARS.
   *  Dessinees directement dans la scene 400 x 400.
   * ===================================================================== */
  /* sinusoide horizontale de periode p, sur [x0, x1] */
  function sinus(x0, x1, y, amp, p, ph) {
    var d = '', n = Math.ceil((x1 - x0) / 4);
    for (var i = 0; i <= n; i++) {
      var x = x0 + i * 4;
      d += (i ? 'L' : 'M') + pt(x, y + amp * Math.sin((x / p) * 2 * Math.PI + (ph || 0)));
    }
    return d;
  }
  /* rangee de voyants qui clignotent chacun a leur rythme */
  function voyants(R, x, y, n, pas, w, h, cols, rapide) {
    var s = '';
    for (var i = 0; i < n; i++) {
      s += rect(x + i * pas, y, w, h, { rx: '.6', fill: cols[Math.floor(R() * cols.length)], 'class': 'av-led',
        style: '--d:' + ((rapide ? .25 : 1.2) + R() * (rapide ? .5 : 3)).toFixed(2) + 's;animation-delay:-' + (R() * 3).toFixed(2) + 's' });
    }
    return s;
  }
  var MONO = 'ui-monospace, Menlo, Consolas, monospace';

  /* -------------------------------------------------------------- HAL 9000 */
  DESSINS.hal_9000 = {
    dessin: function (k) {
      var R = k.R, u = k.u, i, j;
      var defs =
        fondPlein(k, [[0, '#1a0a08'], [.6, '#080303'], [1, '#010101']]) +
        k.lg('alu', '', [[0, '#3a3d42'], [.18, '#16181b'], [.5, '#0b0c0e'], [.82, '#16181b'], [1, '#3a3d42']]) +
        k.motif('brosse', 3, 400, '<rect width=".6" height="400" fill="#ffffff" fill-opacity=".035"/>') +
        k.rg('bague', ' cx=".4" cy=".35" r=".7"', [[0, '#f2f4f6'], [.4, '#9aa1a8'], [.75, '#3c4146'], [1, '#c9ced3']]) +
        k.rg('rouge', ' cx=".5" cy=".5" r=".5"', [[0, '#fff6c2'], [.08, '#ffd65c'], [.2, '#ff8a3d'], [.42, '#e0291b'], [.72, '#7a0b06'], [1, '#2a0302']]) +
        k.rg('halo', '', [[0, '#ff6a4a', .55], [.5, RO, .2], [1, RO, 0]]) +
        k.rg('coeur', '', [[0, '#ffffff'], [.4, '#ffe68a', .9], [1, '#ffb347', 0]]) +
        k.motif('grille', 7, 7, '<circle cx="3.5" cy="3.5" r="1.6" fill="#000"/>');
      /* oscilloscope : traces qui defilent (contenu double, boucle sans couture) */
      var osc = '';
      [[90, 18, 120, JA, .35], [310, 14, 80, VE, .3], [345, 9, 50, RO, .3]].forEach(function (o, n) {
        osc += g({ 'class': 'av-glisse', style: '--d:' + (8 + n * 3) + 's;--h:-' + o[2] * 2 + 'px' },
          chemin(sinus(0, 400 + o[2] * 4, o[0], o[1], o[2], n), { fill: 'none', stroke: o[3], 'stroke-width': 1.4, 'stroke-opacity': o[4] }));
      });
      var trame = '';
      for (i = 0; i <= 10; i++) trame += ligne(i * 40, 0, i * 40, 400, { stroke: VE, 'stroke-opacity': '.06' }) + ligne(0, i * 40, 400, i * 40, { stroke: VE, 'stroke-opacity': '.06' });
      /* baies informatiques : grilles de voyants de part et d'autre */
      var baies = '';
      for (j = 0; j < 14; j++) {
        baies += voyants(R, 10, 30 + j * 24, 6, 14, 8, 5, [RO, JA, VE, BL]) + voyants(R, 316, 30 + j * 24, 6, 14, 8, 5, [RO, JA, VE, BL]);
      }
      var baiesRapides = '';
      for (j = 0; j < 14; j++) baiesRapides += voyants(R, 10, 30 + j * 24, 6, 14, 8, 5, [RO, JA], true) + voyants(R, 316, 30 + j * 24, 6, 14, 8, 5, [RO, JA], true);
      var fond = rect(0, 0, 400, 400, { fill: u('fond') }) + trame + osc +
        g({ 'class': 'av-repos', 'fill-opacity': '.8' }, baies) +
        g({ 'class': 'av-actif' }, baiesRapides + rect(0, 0, 400, 400, { fill: RO, 'fill-opacity': '.05' }));
      /* platine d'aluminium noir brosse */
      var platine = rect(112, -10, 176, 430, { rx: 10, fill: u('alu') }) + rect(112, -10, 176, 430, { rx: 10, fill: u('brosse') }) +
        rect(112, -10, 176, 430, { rx: 10, fill: 'none', stroke: '#4a4e54', 'stroke-width': 1.2 }) +
        rect(140, 42, 120, 26, { fill: '#050506', stroke: '#2c2f33', 'stroke-width': 1 }) +
        texte(150, 61, 'HAL', { fill: BL, 'font-family': 'Helvetica, Arial, sans-serif', 'font-size': 17, 'font-weight': 700 }) +
        rect(196, 46, 58, 18, { fill: '#2a5b9a' }) +
        texte(202, 61, '9000', { fill: BL, 'font-family': 'Helvetica, Arial, sans-serif', 'font-size': 15, 'font-weight': 700 }) +
        rect(140, 300, 120, 74, { rx: 4, fill: '#1a1c1f' }) + rect(140, 300, 120, 74, { rx: 4, fill: u('grille') });
      var oeil = g({ 'class': 'hal-halo' }, cercle(200, 186, 112, { fill: u('halo') })) +
        cercle(200, 186, 66, { fill: u('bague') }) + cercle(200, 186, 58, { fill: '#050505' }) +
        g({ 'class': 'hal-focus' }, cercle(200, 186, 50, { fill: u('rouge') }) +
          cercle(200, 186, 50, { fill: 'none', stroke: '#2a0302', 'stroke-width': 3 }) +
          cercle(200, 186, 34, { fill: 'none', stroke: '#ff7a5a', 'stroke-width': .8, 'stroke-opacity': '.35' })) +
        g({ 'class': 'av-v-s', style: '--k:.55' }, cercle(200, 186, 11, { fill: u('coeur') })) +
        cercle(200, 186, 4.2, { fill: '#fffbe8' }) +
        /* reflets du verre fisheye */
        chemin(arcD(200, 186, 44, 200, 250), { fill: 'none', stroke: '#fff', 'stroke-width': 5, 'stroke-opacity': '.28', 'stroke-linecap': 'round' }) +
        chemin(arcD(200, 186, 38, 30, 50), { fill: 'none', stroke: '#fff', 'stroke-width': 2.5, 'stroke-opacity': '.18', 'stroke-linecap': 'round' }) +
        ellipse(176, 160, 9, 4, { fill: '#fff', 'fill-opacity': '.35', transform: 'rotate(-40 176 160)' });
      return { defs: defs, fond: fond, corps: platine + ondes(200, 186, 74, RO) + oeil };
    },
    css: function (S) {
      return [
        '.hal-halo{transform-box:view-box;transform-origin:200px 186px;opacity:.55;transition:opacity .6s,transform .6s}',
        S.REP + '.hal-halo{animation:hal-respire 6s ease-in-out infinite}',
        '@keyframes hal-respire{0%,100%{opacity:.4}50%{opacity:.7}}',
        S.L + '.hal-halo{opacity:1;transform:scale(1.15)}',
        S.PR + '.hal-halo{opacity:.85}', S.S + '.hal-halo{opacity:.75}',
        S.AU + '.hal-halo{opacity:calc(.45 + var(--bouche,0) * .55);transition:opacity .08s}',
        /* la mise au point varie pendant le calcul */
        '.hal-focus{transform-box:view-box;transform-origin:200px 186px}',
        S.PR + '.hal-focus{animation:hal-focus 1.6s ease-in-out infinite}',
        '@keyframes hal-focus{0%,100%{transform:scale(1)}30%{transform:scale(.9)}65%{transform:scale(1.06)}}'
      ].join('\n');
    }
  };

  /* ------------------------------------------------------------------ WOPR */
  /* continents tres simplifies (projection equirectangulaire 400 x 200, y + 20) */
  var CONTINENTS = [
    'M38 52L64 40L96 38L118 46L128 58L118 70L108 74L102 88L92 98L80 104L72 96L64 84L52 78L42 66Z',
    'M96 112L112 110L122 122L120 140L110 158L102 172L96 160L94 138L90 122Z',
    'M178 46L196 40L214 44L218 54L206 60L196 66L184 62Z',
    'M182 78L200 72L218 78L226 96L222 116L212 136L200 146L192 132L188 112L180 96Z',
    'M214 40L244 30L290 32L330 40L352 52L346 66L326 72L310 84L292 90L280 84L262 88L248 80L236 70L222 62Z',
    'M300 132L324 128L338 138L332 150L310 152L298 144Z'
  ];
  DESSINS.wopr = {
    dessin: function (k) {
      var R = k.R, u = k.u, i, j;
      var defs =
        fondPlein(k, [[0, '#06140c'], [.6, '#020805'], [1, '#000']]) +
        k.lg('meuble', ' x2="0" y2="1"', [[0, '#1d2226'], [1, '#0a0c0e']]) +
        k.rg('crt', ' cx=".5" cy=".45" r=".7"', [[0, '#0d2a16'], [.7, '#061a0d'], [1, '#020a05']]) +
        k.lg('verre', ' x2="0" y2="1"', [[0, '#ffffff', .1], [.4, '#ffffff', 0]]) +
        k.motif('scan', 4, 3, '<rect width="4" height="1" fill="#000" fill-opacity=".35"/>');
      var carte = '';
      for (i = 0; i <= 12; i++) carte += ligne(i * 33.3, 20, i * 33.3, 220, { stroke: VE, 'stroke-opacity': '.12', 'stroke-dasharray': '2 4' });
      for (i = 0; i <= 6; i++) carte += ligne(0, 20 + i * 33.3, 400, 20 + i * 33.3, { stroke: VE, 'stroke-opacity': '.12', 'stroke-dasharray': '2 4' });
      CONTINENTS.forEach(function (d) { carte += chemin(d, { fill: VE, 'fill-opacity': '.07', stroke: VE, 'stroke-width': 1.2, 'stroke-opacity': '.7' }); });
      /* trajectoires : de l'Amerique vers l'Eurasie et retour */
      function trajectoires(n, duree, op) {
        var s = '';
        for (var t = 0; t < n; t++) {
          var a = R() < .5, x0 = a ? 70 + R() * 40 : 250 + R() * 80, y0 = a ? 60 + R() * 30 : 45 + R() * 30,
            x1 = a ? 250 + R() * 80 : 60 + R() * 50, y1 = a ? 45 + R() * 30 : 60 + R() * 30;
          var d = 'M' + pt(x0, y0) + 'Q' + pt((x0 + x1) / 2, 10 - R() * 10) + ' ' + pt(x1, y1);
          s += chemin(d, { fill: 'none', stroke: t % 3 ? RO : JA, 'stroke-width': 1.3, 'stroke-opacity': op, 'stroke-dasharray': '6 300',
            'class': 'av-dash', style: '--d:' + (duree + R() * duree).toFixed(1) + 's;--o:-306;animation-delay:-' + (R() * 4).toFixed(1) + 's' }) +
            cercle(x1, y1, 2, { fill: RO, 'class': 'av-pulse', style: '--d:' + (1 + R()).toFixed(1) + 's;--o0:.2;--o1:1' });
        }
        return s;
      }
      var fond = rect(0, 0, 400, 400, { fill: u('fond') }) + carte +
        g({ 'class': 'av-repos' }, trajectoires(7, 4, '.8')) +
        g({ 'class': 'av-actif' }, trajectoires(16, 1.4, '1') + rect(0, 0, 400, 400, { fill: VE, 'fill-opacity': '.04' }));
      /* le supercalculateur : rangees de voyants carres */
      var leds = '', ledsR = '';
      for (j = 0; j < 7; j++) {
        leds += voyants(R, 14, 288 + j * 15, 26, 14.4, 9, 9, ['#3a1208', RO, JA, '#5a2a0a']);
        ledsR += voyants(R, 14, 288 + j * 15, 26, 14.4, 9, 9, [RO, JA, '#ffe2b0'], true);
      }
      var meuble = rect(0, 272, 400, 140, { fill: u('meuble') }) + rect(0, 272, 400, 4, { fill: '#3a4248' }) +
        g({ 'class': 'av-hors-calc' }, leds) + g({ 'class': 'av-calc' }, ledsR);
      /* moniteur CRT */
      var ecran = 'M128 134Q200 126 272 134Q278 186 272 238Q200 246 128 238Q122 186 128 134Z';
      var police = { 'font-family': MONO, 'font-size': 10, fill: '#7dffa8' };
      var moniteur = rect(106, 116, 188, 140, { rx: 10, fill: '#2b2f33', stroke: '#4c5459', 'stroke-width': 2 }) +
        chemin(ecran, { fill: u('crt') }) +
        g(police, texte(138, 158, 'GREETINGS PROFESSOR') + texte(138, 172, 'FALKEN.') +
          g({ 'class': 'av-v-o', style: '--o0:.75' }, texte(138, 194, 'SHALL WE PLAY A GAME?')) +
          g({ 'class': 'av-calc' }, texte(138, 214, 'CPE1704TKS ...')) +
          g({ 'class': 'av-led', style: '--d:1.1s' }, rect(138, 220, 7, 10, { fill: '#7dffa8' }))) +
        chemin(ecran, { fill: u('scan') }) + chemin(ecran, { fill: u('verre') }) +
        rect(180, 256, 40, 16, { fill: '#2b2f33' });
      return { defs: defs, fond: fond, corps: meuble + ondes(200, 186, 96, VE) + moniteur };
    },
    css: function (S) { return ''; }
  };

  /* ----------------------------------------------------------- MU/TH/UR 6000 */
  DESSINS.muthur = {
    dessin: function (k) {
      var R = k.R, u = k.u, i, j;
      var defs =
        fondPlein(k, [[0, '#d9d4c4'], [.45, '#8f8a7c'], [1, '#2a2824']]) +
        k.rg('ampoule', '', [[0, '#ffffff'], [.4, '#fff3cc', .8], [1, '#ffd98a', 0]]) +
        k.lg('beige', ' x2="0" y2="1"', [[0, '#d8d0bc'], [1, '#9c9482']]) +
        k.rg('crt', ' cx=".5" cy=".45" r=".7"', [[0, '#123d1f'], [.7, '#082611'], [1, '#020a05']]) +
        k.lg('verre', ' x2="0" y2="1"', [[0, '#ffffff', .14], [.45, '#ffffff', 0]]) +
        k.motif('scan', 4, 3, '<rect width="4" height="1" fill="#000" fill-opacity=".3"/>');
      /* dome capitonne : meridiens, paralleles, micro-ampoules aux noeuds */
      var dome = '', noeuds = [], cx = 200, cy = -60;
      for (i = 1; i <= 8; i++) dome += ellipse(cx, cy, i * 46, i * 40, { fill: 'none', stroke: '#fffaf0', 'stroke-opacity': '.28', 'stroke-width': 1.5 });
      for (i = 0; i < 18; i++) {
        var a = (10 + i * 9) * Math.PI / 180;
        dome += ligne(cx, cy, cx + 600 * Math.cos(a), cy + 520 * Math.sin(a), { stroke: '#fffaf0', 'stroke-opacity': '.22', 'stroke-width': 1.2 });
        for (j = 1; j <= 8; j++) noeuds.push([cx + j * 46 * Math.cos(a), cy + j * 40 * Math.sin(a)]);
      }
      var bulbes = '', bulbesA = '';
      noeuds.forEach(function (p) {
        if (p[0] < -10 || p[0] > 410 || p[1] > 410) return;
        var d = (2 + R() * 4).toFixed(1), dl = (R() * 5).toFixed(1);
        bulbes += cercle(p[0], p[1], 3.6, { fill: u('ampoule'), 'class': 'av-scintille', style: '--d:' + d + 's;animation-delay:-' + dl + 's' });
        if (R() < .5) bulbesA += cercle(p[0], p[1], 6, { fill: u('ampoule'), 'class': 'av-scintille', style: '--d:' + (d / 3).toFixed(1) + 's;animation-delay:-' + dl + 's' });
      });
      var fond = rect(0, 0, 400, 400, { fill: u('fond') }) + dome + bulbes +
        g({ 'class': 'av-actif' }, bulbesA + rect(0, 0, 400, 400, { fill: JA, 'fill-opacity': '.06' }));
      var ecran = 'M104 112Q200 100 296 112Q304 184 296 256Q200 268 104 256Q96 184 104 112Z';
      var police = { 'font-family': MONO, 'font-size': 10.5, fill: '#8dff9c' };
      var console = rect(78, 88, 244, 196, { rx: 16, fill: u('beige'), stroke: '#6e6758', 'stroke-width': 2 }) +
        chemin(ecran, { fill: u('crt') }) +
        g(police, texte(118, 140, 'INTERFACE 2037') + texte(118, 155, 'READY FOR INQUIRY') +
          texte(118, 178, '> WHAT IS SPECIAL') + texte(118, 193, '  ORDER 937 ?') +
          g({ 'class': 'av-calc' }, g({ 'class': 'av-led', style: '--d:.6s' }, texte(118, 216, 'PRIORITY ONE'))) +
          g({ 'class': 'av-v-o', style: '--o0:.0' }, texte(118, 238, 'MOTHER > _')) +
          g({ 'class': 'av-led av-hors-calc', style: '--d:1.2s' }, rect(118, 230, 7, 11, { fill: '#8dff9c' }))) +
        chemin(ecran, { fill: u('scan') }) + chemin(ecran, { fill: u('verre') });
      /* panneau de diodes : sequence */
      var diodes = rect(70, 296, 260, 74, { rx: 8, fill: '#3a3832', stroke: '#6e6758', 'stroke-width': 1.5 });
      var cols = [VE, JA, RO, BL];
      for (j = 0; j < 3; j++) {
        for (i = 0; i < 14; i++) {
          diodes += cercle(92 + i * 17, 314 + j * 19, 4.4, { fill: cols[(i + j) % 4], 'class': 'mu-diode',
            style: 'animation-delay:-' + ((i + j * 5) * .12).toFixed(2) + 's' });
        }
      }
      return { defs: defs, fond: fond, corps: ondes(200, 184, 120, VE) + console + diodes };
    },
    css: function (S) {
      return [
        '.mu-diode{opacity:.35;animation:muthur-diode 3.4s steps(1,end) infinite}',
        '@keyframes muthur-diode{0%,6%{opacity:1}7%,100%{opacity:.35}}',
        S.PR + '.mu-diode{animation-duration:.9s}'
      ].join('\n');
    }
  };

  /* ---------------------------------------------------------------- GLADOS */
  DESSINS.glados = {
    dessin: function (k) {
      var R = k.R, u = k.u, i, j;
      var defs =
        k.lg('fond', ' x2="0" y2="1"', [[0, '#e9ecef'], [.6, '#c9ced3'], [1, '#8e959c']]) +
        k.lg('panneau', ' x2="1" y2="1"', [[0, '#ffffff'], [1, '#dfe3e7']]) +
        k.rg('coque', ' cx=".35" cy=".3" r=".9"', [[0, '#ffffff'], [.55, '#e2e6ea'], [1, '#9aa2aa']]) +
        k.lg('noir', ' x2="0" y2="1"', [[0, '#4a4f55'], [1, '#16191c']]) +
        k.rg('oeil', '', [[0, '#fffbe0'], [.3, '#ffe58a'], [.65, JA], [1, '#b8781e']]) +
        k.rg('lueur', '', [[0, '#fff3c0', .9], [.35, JA, .5], [1, JA, 0]]);
      /* panneaux modulaires d'Aperture qui s'articulent */
      var panneaux = '';
      for (j = 0; j < 6; j++) {
        for (i = 0; i < 6; i++) {
          var x = i * 68 - 8, y = j * 68 - 8, anim = R() < .3;
          var p = rect(x + 3, y + 3, 62, 62, { rx: 3, fill: u('panneau'), stroke: '#aab1b8', 'stroke-width': 1 });
          panneaux += anim ? g({ 'class': 'av-flotte', style: '--d:' + (5 + R() * 6).toFixed(1) + 's;--h:' + (R() < .5 ? -6 : 6) + 'px;animation-delay:-' + (R() * 6).toFixed(1) + 's' }, p) : p;
        }
      }
      var fond = rect(0, 0, 400, 400, { fill: u('fond') }) + panneaux +
        g({ 'class': 'av-actif' }, rect(0, 0, 400, 400, { fill: JA, 'fill-opacity': '.1' }) +
          g({ 'class': 'av-glisse', style: '--d:2s;--h:480px' }, rect(-80, 0, 50, 400, { fill: '#ffffff', 'fill-opacity': '.4' })));
      /* bras et cables qui descendent du plafond */
      var bras = '<path d="M262 -10C266 40 270 70 254 104C240 132 222 144 214 150" fill="none" stroke="#2a2e33" stroke-width="30" stroke-linecap="round"/>' +
        '<path d="M262 -10C266 40 270 70 254 104C240 132 222 144 214 150" fill="none" stroke="#5a6068" stroke-width="18" stroke-linecap="round"/>' +
        '<path d="M244 -10C246 40 236 80 222 112M282 -10C286 50 284 90 266 120" fill="none" stroke="#1a1d20" stroke-width="5"/>';
      for (i = 0; i < 5; i++) bras += ellipse(258 - i * 4, 30 + i * 22, 17, 6, { fill: '#3a3f45', stroke: '#1a1d20', 'stroke-width': 1 });
      /* le module : coque blanche, ventre sombre, oeil jaune unique */
      var tete = '<path d="M120 160C130 128 176 116 222 126C262 136 286 162 282 196C276 230 236 250 192 248C150 246 116 226 112 196C110 182 114 170 120 160Z" fill="' + u('noir') + '"/>' +
        '<path d="M124 156C138 126 182 116 224 126C258 134 280 156 282 182C252 168 216 160 182 162C156 164 134 170 120 180C118 170 120 162 124 156Z" fill="' + u('coque') + '"/>' +
        '<path d="M134 214C160 232 210 238 248 222" fill="none" stroke="#5a6068" stroke-width="3"/>' +
        cercle(176, 202, 40, { fill: u('lueur'), 'class': 'av-lueur' }) +
        cercle(176, 202, 22, { fill: '#121417', stroke: '#6a7078', 'stroke-width': 2 }) +
        g({ 'class': 'av-v-s', style: '--k:-.45' }, cercle(176, 202, 14, { fill: u('oeil') }) + cercle(176, 202, 5, { fill: '#fffbe8' }));
      /* obturateur : lamelles autour de l'oeil */
      var lam = '';
      for (i = 0; i < 6; i++) {
        var a = i * 60;
        lam += g({ transform: 'rotate(' + a + ' 176 202)' }, chemin('M176 180L188 186L183 190L176 188Z', { fill: '#2a2e33' }));
      }
      var corps = bras + g({ 'class': 'gl-balance' }, tete + g({ 'class': 'gl-iris', style: origine(176, 202) }, lam));
      return { defs: defs, fond: fond, corps: ondes(176, 202, 60, JA) + corps };
    },
    css: function (S) {
      return [
        /* balancement gyroscopique autour de l'accroche */
        '.gl-balance{transform-box:view-box;transform-origin:250px 110px;animation:glados-balance 7s ease-in-out infinite}',
        '@keyframes glados-balance{0%,100%{transform:rotate(0)}30%{transform:rotate(2.6deg)}70%{transform:rotate(-2deg)}}',
        S.L + '.gl-balance{animation:none;transform:rotate(-5deg) translateY(4px);transition:transform .8s}',
        '.gl-iris{transform-box:view-box;transition:transform .5s}',
        S.PR + '.gl-iris{animation:avc-rot 2.2s linear infinite}',
        S.S + '.gl-iris{transform:scale(.9)}'
      ].join('\n');
    }
  };

  /* ---------------------------------------------------------------- BAYMAX */
  DESSINS.baymax = {
    dessin: function (k) {
      var R = k.R, u = k.u, i;
      var defs =
        fondPlein(k, [[0, '#123a2c'], [.55, '#072018'], [1, '#020806']]) +
        k.rg('blanc', ' cx=".4" cy=".3" r=".85"', [[0, '#ffffff'], [.6, '#eef2f4'], [1, '#c3ccd2']]) +
        k.rg('tete', ' cx=".42" cy=".32" r=".8"', [[0, '#ffffff'], [.65, '#f0f3f5'], [1, '#cfd6db']]) +
        k.rg('pictogramme', '', [[0, '#d6ffe6'], [.5, VE], [1, '#2a7a4e']]);
      /* electrocardiogramme : motif periodique de 100 px, defile en boucle */
      function ecg(y, amp, x0, n) {
        var d = 'M' + pt(x0, y);
        for (var p = 0; p < n; p++) {
          var b = x0 + p * 100;
          d += 'L' + pt(b + 34, y) + 'L' + pt(b + 40, y - amp * .2) + 'L' + pt(b + 44, y) + 'L' + pt(b + 48, y + amp * .25) +
            'L' + pt(b + 52, y - amp) + 'L' + pt(b + 56, y + amp * .45) + 'L' + pt(b + 60, y) + 'L' + pt(b + 70, y - amp * .25) +
            'L' + pt(b + 78, y) + 'L' + pt(b + 100, y);
        }
        return d;
      }
      function onde(y, amp, duree, op, w) {
        return g({ 'class': 'av-glisse', style: '--d:' + duree + 's;--h:-100px' },
          chemin(ecg(y, amp, 0, 6), { fill: 'none', stroke: VE, 'stroke-width': w * 4, 'stroke-opacity': op * .25, 'stroke-linejoin': 'round' }) +
          chemin(ecg(y, amp, 0, 6), { fill: 'none', stroke: '#b9ffd2', 'stroke-width': w, 'stroke-opacity': op, 'stroke-linejoin': 'round' }));
      }
      var fond = rect(0, 0, 400, 400, { fill: u('fond') }) + onde(90, 40, 4, .7, 1.6) + onde(320, 28, 6, .45, 1.2) +
        poussieres(R, 34, '#b9ffd2', 1.8) +
        g({ 'class': 'av-actif' }, onde(205, 60, 1.3, .9, 1.8) + rect(0, 0, 400, 400, { fill: VE, 'fill-opacity': '.06' }));
      var corps = '<path d="M30 420C24 330 70 250 200 244C330 250 376 330 370 420Z" fill="' + u('blanc') + '"/>' +
        '<path d="M120 300Q200 284 280 300" fill="none" stroke="#c3ccd2" stroke-width="2" stroke-opacity=".7"/>' +
        /* pictogramme d'etat vert sur le torse */
        g({ transform: 'translate(266 318)' }, cercle(0, 0, 15, { fill: '#ffffff', stroke: '#c3ccd2', 'stroke-width': 1.5 }) +
          g({ 'class': 'av-v-o', style: '--o0:.55' }, cercle(0, 0, 11, { fill: u('pictogramme') }) +
            chemin('M-6 0H6M0 -6V6', { stroke: '#ffffff', 'stroke-width': 3, 'stroke-linecap': 'round' }))) +
        g({ 'class': 'av-pose', style: origine(200, 230) },
          g({ 'class': 'bx-tete', style: origine(200, 236) },
            ellipse(200, 186, 82, 58, { fill: u('tete') }) +
            ellipse(200, 186, 82, 58, { fill: 'none', stroke: '#c3ccd2', 'stroke-width': 1.2 }) +
            ligne(168, 184, 232, 184, { stroke: '#121416', 'stroke-width': 2.4 }) +
            g({ 'class': 'av-cligne', style: '--d:7.5s' }, cercle(166, 184, 10, { fill: '#121416' })) +
            g({ 'class': 'av-cligne', style: '--d:7.5s' }, cercle(234, 184, 10, { fill: '#121416' }))));
      return { defs: defs, fond: fond, corps: ondes(200, 186, 96, VE) + corps };
    },
    css: function (S) {
      return [
        '.bx-tete{transform-box:view-box;animation:baymax-tete 9s ease-in-out infinite}',
        '@keyframes baymax-tete{0%,100%{transform:rotate(0)}40%{transform:rotate(-4deg)}75%{transform:rotate(2deg)}}',
        S.L + '.bx-tete{animation:none;transform:rotate(-12deg);transition:transform .9s cubic-bezier(.3,1.4,.5,1)}',
        S.PR + '.bx-tete{animation:baymax-tete 3s ease-in-out infinite}'
      ].join('\n');
    }
  };

  /* ------------------------------------------------------------------ TARS */
  DESSINS.tars = {
    dessin: function (k) {
      var R = k.R, u = k.u, i;
      var defs =
        k.rg('fond', ' cx=".5" cy=".38" r=".75"', [[0, '#1a1208'], [.5, '#06040a'], [1, '#000']]) +
        k.lg('disque', '', [[0, JA, 0], [.18, '#ffdb8f', .7], [.5, '#fff4d6', 1], [.82, '#ffdb8f', .7], [1, JA, 0]]) +
        k.rg('lueurtrou', '', [[.4, '#000', 1], [.52, '#ffcf7a', .5], [.7, JA, .15], [1, JA, 0]]) +
        k.lg('acier', '', [[0, '#3a3f45'], [.25, '#7c858e'], [.5, '#4a5158'], [.78, '#2a2f34'], [1, '#5a626b']]) +
        k.motif('brosse', 400, 3, '<rect width="400" height=".6" fill="#ffffff" fill-opacity=".05"/>') +
        k.lg('ecran', ' x2="0" y2="1"', [[0, '#0e1a12'], [1, '#04080a']]);
      var gargantua =
        cercle(200, 132, 150, { fill: u('lueurtrou') }) +
        ellipse(200, 132, 200, 30, { fill: 'none', stroke: u('disque'), 'stroke-width': 16 }) +
        /* anneau deforme par la lentille gravitationnelle (passe au-dessus et au-dessous) */
        cercle(200, 132, 74, { fill: 'none', stroke: '#ffdfa0', 'stroke-width': 7, 'stroke-opacity': '.85' }) +
        cercle(200, 132, 74, { fill: 'none', stroke: '#fff7e2', 'stroke-width': 2 }) +
        cercle(200, 132, 64, { fill: '#000' }) +
        chemin('M0 132Q200 118 400 132', { fill: 'none', stroke: u('disque'), 'stroke-width': 12, 'stroke-opacity': '.9' });
      var flux = function (d, o) {
        return ellipse(200, 132, 200, 30, { fill: 'none', stroke: '#fff4d6', 'stroke-width': 2, 'stroke-opacity': o, 'stroke-dasharray': '10 40', 'class': 'av-dash', style: '--d:' + d + 's;--o:-50' });
      };
      var fond = rect(0, 0, 400, 400, { fill: u('fond') }) + etoiles(R, 70, 0, 0, 400, 400, '#fff6e0', 1) + gargantua +
        g({ 'class': 'av-repos' }, flux(4, '.6')) +
        g({ 'class': 'av-actif' }, flux(.9, '.9') + cercle(200, 132, 160, { fill: JA, 'fill-opacity': '.07' }));
      /* le monolithe : quatre blocs articules */
      var blocs = '';
      for (i = 0; i < 4; i++) {
        var x = 118 + i * 42;
        var b = rect(x, 168, 38, 260, { fill: u('acier') }) + rect(x, 168, 38, 260, { fill: u('brosse') }) +
          rect(x, 168, 38, 260, { fill: 'none', stroke: '#15181b', 'stroke-width': 1 }) +
          ligne(x + 4, 300, x + 34, 300, { stroke: '#15181b', 'stroke-width': 1 });
        if (i === 1 || i === 2) {
          /* les deux ecrans de donnees */
          var lignes = '';
          for (var j = 0; j < 12; j++) lignes += rect(x + 6, 192 + j * 6, 6 + R() * 20, 2.2, { fill: j % 3 ? JA : VE, 'fill-opacity': '.85' });
          b += rect(x + 4, 180, 30, 56, { rx: 1.5, fill: u('ecran'), stroke: '#0a0c0e', 'stroke-width': 1 }) +
            g({ 'clip-path': u('clip' + i) }, g({ 'class': 'av-tombe', style: '--d:' + (3 + i) + 's;--h:-36px' }, lignes)) +
            g({ 'class': 'av-parle' }, [0, 1, 2, 3, 4].map(function (n) {
              return g({ 'class': 'av-v-sy', style: 'animation-delay:-' + (n * .17).toFixed(2) + 's' }, rect(x + 7 + n * 5, 216, 3.4, 16, { fill: VE }));
            }).join(''));
          defs += k.clip('clip' + i, '<rect x="' + (x + 5) + '" y="181" width="28" height="54"/>');
        }
        blocs += g({ 'class': 'tars-b tars-b' + i }, b);
      }
      return { defs: defs, fond: fond, corps: ondes(200, 230, 100, JA) + blocs };
    },
    css: function (S) {
      return [
        '.tars-b{transform-box:view-box;transition:transform .35s cubic-bezier(.5,0,.2,1)}',
        S.REP + '.tars-b1{animation:tars-repos 8s steps(1,end) infinite}',
        '@keyframes tars-repos{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}',
        S.PR + '.tars-b0,' + S.PR + '.tars-b2{animation:tars-calc 1s steps(1,end) infinite}',
        S.PR + '.tars-b1,' + S.PR + '.tars-b3{animation:tars-calc 1s steps(1,end) infinite;animation-delay:-.5s}',
        '@keyframes tars-calc{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}',
        S.L + '.tars-b0{transform:translateX(-5px)}', S.L + '.tars-b3{transform:translateX(5px)}'
      ].join('\n');
    }
  };

  /* =====================================================================
   *  LUMIERES — J.A.R.V.I.S., Samantha / OS1, V.I.K.I., Tron, WALL-E,
   *  Daft Punk. Dessines directement dans la scene 400 x 400.
   * ===================================================================== */
  /* sphere en fil de fer : un cercle, des paralleles, des meridiens */
  function sphere(cx, cy, r, col, op) {
    var s = cercle(cx, cy, r, { fill: 'none', stroke: col, 'stroke-width': 1.4, 'stroke-opacity': op });
    for (var i = 1; i < 6; i++) {
      var y = -r + i * r / 3, rx = Math.sqrt(Math.max(0, r * r - y * y));
      s += ellipse(cx, cy + y, rx, rx * .18, { fill: 'none', stroke: col, 'stroke-width': .8, 'stroke-opacity': op * .7 });
    }
    return s;
  }
  function meridiens(cx, cy, r, col, op) {
    var s = '';
    for (var i = 0; i < 6; i++) s += ellipse(cx, cy, r * Math.abs(Math.cos(i * Math.PI / 6)) + .1, r, { fill: 'none', stroke: col, 'stroke-width': .8, 'stroke-opacity': op });
    return s;
  }

  /* --------------------------------------------------------------- JARVIS */
  DESSINS.jarvis = {
    dessin: function (k) {
      var R = k.R, u = k.u, i;
      var defs =
        fondPlein(k, [[0, '#12161f'], [.55, '#070a10'], [1, '#020305']]) +
        k.rg('coeur', '', [[0, '#ffffff', .95], [.25, '#ffe9b8', .7], [.6, JA, .25], [1, JA, 0]]) +
        k.rg('bleu', '', [[0, '#dff4ff', .6], [.5, CY, .18], [1, CY, 0]]);
      /* grille holographique doree : sol et voute en fil de fer */
      var grille = solGrille(250, JA, '.22', 6, 64);
      for (i = 0; i < 9; i++) grille += chemin('M0 ' + (20 + i * 26) + 'Q200 ' + (60 + i * 22) + ' 400 ' + (20 + i * 26), { fill: 'none', stroke: JA, 'stroke-opacity': '.08' });
      /* reacteur Arc en fil de fer, en rotation lente derriere */
      var arc = cercle(0, 0, 150, { fill: 'none', stroke: JA, 'stroke-opacity': '.25', 'stroke-width': 2 }) +
        cercle(0, 0, 118, { fill: 'none', stroke: JA, 'stroke-opacity': '.2', 'stroke-width': 1, 'stroke-dasharray': '4 6' });
      for (i = 0; i < 10; i++) {
        var a = i * 36 * Math.PI / 180;
        arc += chemin('M' + pt(118 * Math.cos(a - .12), 118 * Math.sin(a - .12)) + 'L' + pt(150 * Math.cos(a - .08), 150 * Math.sin(a - .08)) +
          'L' + pt(150 * Math.cos(a + .08), 150 * Math.sin(a + .08)) + 'L' + pt(118 * Math.cos(a + .12), 118 * Math.sin(a + .12)) + 'Z',
          { fill: 'none', stroke: JA, 'stroke-opacity': '.3' });
      }
      arc += chemin('M0 -96L83 48L-83 48Z', { fill: 'none', stroke: JA, 'stroke-opacity': '.22' });
      var fond = rect(0, 0, 400, 400, { fill: u('fond') }) + grille +
        g({ transform: 'translate(200 180)' }, tourne(0, 0, 60, arc)) + poussieres(R, 26, JA, 1.2) +
        g({ 'class': 'av-actif' }, g({ transform: 'translate(200 180)' }, tourne(0, 0, 8, arc, true)) + rect(0, 0, 400, 400, { fill: JA, 'fill-opacity': '.05' }));
      /* anneaux orbitaux : chacun incline, tourne dans son plan */
      function anneaux(vit) {
        var s = '';
        [[118, 34, -18, CY, 14], [104, 28, 26, JA, 10], [132, 22, 64, BL, 18], [92, 18, -54, JA, 8]].forEach(function (o, n) {
          s += g({ transform: 'translate(200 180) rotate(' + o[2] + ')' },
            tourne(0, 0, o[4] / vit, ellipse(0, 0, o[0], o[1], { fill: 'none', stroke: o[3], 'stroke-width': 1.6, 'stroke-opacity': '.75', 'stroke-dasharray': (n % 2 ? '50 14 4 14' : '90 12') }) +
              cercle(o[0], 0, 3, { fill: o[3] }), n % 2));
        });
        return s;
      }
      var holo = cercle(200, 180, 120, { fill: u('bleu') }) +
        g({ 'class': 'jv-sphere', style: origine(200, 180) }, sphere(200, 180, 64, CY, .6) + tourne(200, 180, 30, meridiens(200, 180, 64, CY, .45))) +
        cercle(200, 180, 40, { fill: u('coeur'), 'class': 'av-lueur' }) +
        g({ 'class': 'av-v-s', style: '--k:.35' }, cercle(200, 180, 22, { fill: 'none', stroke: '#fff3d6', 'stroke-width': 2 })) +
        g({ 'class': 'av-parle' }, [0, 1, 2].map(function (n) {
          return g({ 'class': 'jv-onde', style: origine(200, 180) + ';animation-delay:-' + (n * .5) + 's' }, cercle(200, 180, 70, { fill: 'none', stroke: JA, 'stroke-width': 2 }));
        }).join('')) +
        g({ 'class': 'av-hors-calc' }, anneaux(1)) + g({ 'class': 'av-calc' }, anneaux(4));
      return { defs: defs, fond: fond, corps: ondes(200, 180, 140, CY) + holo };
    },
    css: function (S) {
      return [
        '.jv-sphere{transform-box:view-box;animation:jarvis-sphere 6s ease-in-out infinite}',
        '@keyframes jarvis-sphere{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}',
        '.jv-onde{transform-box:view-box;opacity:0}',
        S.S + '.jv-onde{animation:jarvis-onde 1.5s ease-out infinite}',
        '@keyframes jarvis-onde{0%{transform:scale(.6);opacity:.9}100%{transform:scale(2.2);opacity:0}}'
      ].join('\n');
    }
  };

  /* -------------------------------------------------------------- SAMANTHA */
  DESSINS.samantha = {
    dessin: function (k) {
      var R = k.R, u = k.u, i;
      var defs =
        k.rg('fond', ' cx=".5" cy=".45" r=".8"', [[0, '#e8735f'], [.45, '#b23a33'], [.8, '#5a1418'], [1, '#26070a']]) +
        k.rg('bokeh', '', [[0, '#ffe2b8', .7], [.6, '#ffc58a', .25], [1, '#ffc58a', 0]]) +
        k.rg('lueur', '', [[0, '#fff6e6', .8], [.4, JA, .35], [1, JA, 0]]);
      var bokeh = '';
      for (i = 0; i < 18; i++) {
        bokeh += cercle(R() * 400, R() * 400, 14 + R() * 34, { fill: u('bokeh'), 'class': 'av-flotte',
          style: '--d:' + (8 + R() * 8).toFixed(1) + 's;--h:' + Math.round(-10 - R() * 14) + 'px;animation-delay:-' + (R() * 8).toFixed(1) + 's;opacity:' + f(.3 + R() * .5) });
      }
      var fond = rect(0, 0, 400, 400, { fill: u('fond') }) + bokeh + poussieres(R, 40, JA, 1.4) +
        g({ 'class': 'av-actif' }, rect(0, 0, 400, 400, { fill: JA, 'fill-opacity': '.07' }) + poussieres(graine(9), 30, '#fff1d6', 1.6));
      /* double anneau torsade : deux ellipses inclinees, en contre-rotation */
      function anneau(rot, col, duree, inv) {
        return g({ transform: 'translate(200 180) rotate(' + rot + ')' },
          tourne(0, 0, duree, ellipse(0, 0, 96, 40, { fill: 'none', stroke: col, 'stroke-width': 9, 'stroke-opacity': '.25' }) +
            ellipse(0, 0, 96, 40, { fill: 'none', stroke: col, 'stroke-width': 2.6 }) +
            ellipse(0, 0, 96, 40, { fill: 'none', stroke: '#ffffff', 'stroke-width': 1.2, 'stroke-dasharray': '30 270', 'stroke-opacity': '.9' }), inv));
      }
      var onde = '';
      for (i = 0; i < 24; i++) {
        var x = 128 + i * 6.2, h = 6 + 26 * Math.pow(Math.sin(i / 23 * Math.PI), 1.6) * (.6 + .4 * Math.sin(i * 1.7));
        onde += rect(x, 180 - h / 2, 3.2, h, { rx: 1.6, fill: '#fff6e6' });
      }
      var corps = cercle(200, 180, 150, { fill: u('lueur'), 'class': 'av-lueur' }) +
        g({ 'class': 'sa-souffle', style: origine(200, 180) }, anneau(-28, JA, 16) + anneau(28, '#ffffff', 22, true)) +
        g({ 'class': 'sa-onde' }, onde);
      return { defs: defs, fond: fond, corps: ondes(200, 180, 110, '#fff1d6') + corps };
    },
    css: function (S) {
      return [
        '.sa-souffle{transform-box:view-box;animation:samantha-souffle 6s ease-in-out infinite}',
        '@keyframes samantha-souffle{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}',
        S.S + '.sa-souffle{animation:samantha-souffle 1.1s ease-in-out infinite}',
        '.sa-onde{transform-box:fill-box;transform-origin:50% 50%;transform:scaleY(.25);opacity:.6;transition:transform .09s linear,opacity .3s}',
        S.L + '.sa-onde{transform:scaleY(.3);opacity:.8}',
        S.PR + '.sa-onde{animation:samantha-calc 1.2s ease-in-out infinite;opacity:.8}',
        '@keyframes samantha-calc{0%,100%{transform:scaleY(.15)}50%{transform:scaleY(.55)}}',
        S.S + '.sa-onde{opacity:1;animation:samantha-parle 1.1s linear infinite}',
        kfParole('samantha-parle', function (v) { return 'transform:scaleY(' + f(.15 + v * 1.1) + ')'; }),
        S.AU + '.sa-onde{animation:none;transform:scaleY(calc(.15 + var(--bouche,0) * 1.4))}'
      ].join('\n');
    }
  };

  /* ------------------------------------------------------------------ VIKI */
  DESSINS.viki = {
    dessin: function (k) {
      var R = k.R, u = k.u, i;
      var defs =
        fondPlein(k, [[0, '#0d2033'], [.55, '#050c16'], [1, '#010306']]) +
        k.lg('puits', '', [[0, CY, 0], [.5, CY, .22], [1, CY, 0]]) +
        k.rg('lueur', '', [[0, '#e6f6ff', .5], [.5, CY, .15], [1, CY, 0]]);
      /* puits central : lignes fuyantes vers le haut, flux de donnees verticaux */
      var puits = rect(150, 0, 100, 400, { fill: u('puits') });
      for (i = -8; i <= 8; i++) puits += ligne(200 + i * 8, -10, 200 + i * 40, 410, { stroke: CY, 'stroke-opacity': '.12' });
      for (i = 0; i < 9; i++) puits += ellipse(200, 60 + i * 44, 30 + i * 22, 6 + i * 4, { fill: 'none', stroke: CY, 'stroke-opacity': '.1' });
      var flux = '', fluxA = '';
      for (i = 0; i < 26; i++) {
        var x = 20 + R() * 360, h = 10 + R() * 30, d = (3 + R() * 4).toFixed(1), dl = (R() * 6).toFixed(1);
        flux += rect(x, 400, 1.6, h, { fill: CY, 'fill-opacity': '.6', 'class': 'av-monte', style: '--d:' + d + 's;--h:-440px;animation-delay:-' + dl + 's' });
        fluxA += rect(x + 6, 400, 2, h, { fill: '#e6f6ff', 'class': 'av-monte', style: '--d:' + (d / 3).toFixed(1) + 's;--h:-440px;animation-delay:-' + dl + 's' });
      }
      var fond = rect(0, 0, 400, 400, { fill: u('fond') }) + puits + flux +
        g({ 'class': 'av-actif' }, fluxA) +
        g({ 'class': 'av-calc' }, rect(0, 0, 400, 400, { fill: RO, 'fill-opacity': '.1' }));
      /* le visage en voxels : grille de cubes dans l'ovale, ombres et traits par la densite */
      var cubes = '', bouche = '', P = 10, rangs = {};
      function dans(x, y) {
        var dx = (x - 200) / 92, dy = (y - 172) / (y > 172 ? 128 : 118);
        var t = y > 230 ? 1 - (y - 230) / 120 * .45 : 1;
        return dx * dx / (t * t) + dy * dy <= 1;
      }
      function zone(x, y, cx, cy, rx, ry) { var a = (x - cx) / rx, b = (y - cy) / ry; return a * a + b * b; }
      for (var y = 50; y <= 300; y += P) {
        for (var x = 106; x <= 294; x += P) {
          if (!dans(x, y)) continue;
          var o = .5 + .45 * (1 - Math.min(1, zone(x, y, 180, 140, 110, 140)));
          var oe = Math.min(zone(x, y, 166, 162, 18, 8), zone(x, y, 234, 162, 18, 8));
          if (oe < 1) o = oe < .35 ? 1 : .08;
          if (zone(x, y, 200, 196, 6, 24) < 1) o += .2;
          if (Math.min(zone(x, y, 166, 144, 22, 4), zone(x, y, 234, 144, 22, 4)) < 1) o = .85;
          var sz = 7 + R() * 1.4, cube = rect(x - sz / 2, y - sz / 2, sz, sz, { 'fill-opacity': f(Math.min(1, o)) });
          if (zone(x, y, 200, 234, 28, 7) < 1) bouche += rect(x - sz / 2, y - sz / 2, sz, sz, { 'fill-opacity': '.95' });
          else (rangs[y] = rangs[y] || []).push(cube);
        }
      }
      Object.keys(rangs).forEach(function (y, n) {
        cubes += g({ 'class': 'vk-rang', style: 'animation-delay:-' + (n * .12).toFixed(2) + 's' }, rangs[y].join(''));
      });
      var libres = '';
      for (i = 0; i < 26; i++) {
        var lx = 60 + R() * 280, ly = 30 + R() * 320;
        if (dans(lx, ly)) continue;
        libres += rect(lx, ly, 4 + R() * 4, 4 + R() * 4, { 'fill-opacity': f(.3 + R() * .5), 'class': 'av-flotte',
          style: '--d:' + (4 + R() * 6).toFixed(1) + 's;--h:' + Math.round(-6 - R() * 10) + 'px;animation-delay:-' + (R() * 6).toFixed(1) + 's' });
      }
      var corps = cercle(200, 175, 160, { fill: u('lueur'), 'class': 'av-lueur' }) +
        g({ 'class': 'vk-teinte' }, libres + cubes +
          g({ 'class': 'av-v-y', style: '--k:7px' }, bouche));
      return { defs: defs, fond: fond, corps: ondes(200, 175, 140, CY) + corps };
    },
    css: function (S) {
      return [
        /* bascule chromatique : bleu, rouge pendant le calcul */
        '.vk-teinte{fill:' + CY + ';transition:fill .6s}', S.PR + '.vk-teinte{fill:' + RO + '}',
        S.L + '.vk-teinte{fill:#bfe6ff}',
        '.vk-rang{transform-box:view-box;animation:viki-onde 4s ease-in-out infinite}',
        '@keyframes viki-onde{0%,100%{transform:translateX(0)}50%{transform:translateX(1.6px)}}',
        S.PR + '.vk-rang{animation:viki-glitch .6s steps(1,end) infinite}',
        '@keyframes viki-glitch{0%,100%{transform:translateX(0)}30%{transform:translateX(-3px)}60%{transform:translateX(2px)}}'
      ].join('\n');
    }
  };

  /* ------------------------------------------------------------------ TRON */
  DESSINS.tron = {
    dessin: function (k) {
      var R = k.R, u = k.u, i;
      var casque = 'M200 70C252 70 284 106 286 156C288 200 278 238 258 262C242 280 222 290 200 292C178 290 158 280 142 262C122 238 112 200 114 156C116 106 148 70 200 70Z';
      var visiere = 'M126 156C140 140 170 134 200 134C230 134 260 140 274 156C276 186 268 206 252 220C236 228 220 230 200 230C180 230 164 228 148 220C132 206 124 186 126 156Z';
      var defs =
        k.lg('fond', ' x2="0" y2="1"', [[0, '#01040a'], [.42, '#06142a'], [.44, '#0a2a4a'], [1, '#000']]) +
        k.rg('casque', ' cx=".35" cy=".25" r=".85"', [[0, '#3a4048'], [.35, '#121418'], [1, '#020203']]) +
        k.lg('visiere', ' x2="0" y2="1"', [[0, '#0a1626'], [.6, '#02060c'], [1, '#0a1a2c']]) +
        k.lg('reflet', ' x1="0" y1="0" x2="1" y2="1"', [[0, '#ffffff', .35], [.3, '#ffffff', 0]]) +
        k.lg('combi', ' x2="0" y2="1"', [[0, '#14171c'], [1, '#030405']]) +
        k.clip('cvisiere', '<path d="' + visiere + '"/>');
      function sillages(duree, op) {
        var s = '';
        for (var n = 0; n < 6; n++) {
          var y = 172 + n * 9 + R() * 6, l = 60 + R() * 120, c = n % 3 ? CY : JA;
          s += g({ 'class': 'av-glisse', style: '--d:' + (duree + R() * duree).toFixed(1) + 's;--h:' + (n % 2 ? '' : '-') + '700px;animation-delay:-' + (R() * duree * 2).toFixed(1) + 's' },
            rect(n % 2 ? -260 : 400, y, l, 2, { fill: c, 'fill-opacity': op }) + rect(n % 2 ? -260 + l - 6 : 400, y - 2, 8, 6, { fill: c }));
        }
        return s;
      }
      var fond = rect(0, 0, 400, 400, { fill: u('fond') }) + solGrille(170, CY, '.45', 5, 80) +
        rect(0, 168, 400, 3, { fill: CY, 'fill-opacity': '.6' }) + etoiles(R, 30, 0, 0, 400, 160, '#9fd8ff', .8) +
        g({ 'class': 'av-repos' }, sillages(6, '.7')) +
        g({ 'class': 'av-actif' }, sillages(1.6, '.95') + rect(0, 168, 400, 240, { fill: CY, 'fill-opacity': '.06' }));
      /* reflet de la grille dans la visiere */
      var refl = '';
      for (i = -6; i <= 6; i++) refl += ligne(200 + i * 6, 170, 200 + i * 30, 240, { stroke: CY, 'stroke-opacity': '.45' });
      for (i = 0; i < 5; i++) refl += ligne(110, 180 + i * i * 4, 290, 180 + i * i * 4, { stroke: CY, 'stroke-opacity': '.4' });
      var neon = sym('M200 72V100M150 86C140 110 136 132 140 150M126 230C140 252 160 268 180 276M176 100L160 124H138', 200);
      var corps =
        '<path d="M40 420C46 330 100 298 160 290L240 290C300 298 354 330 360 420Z" fill="' + u('combi') + '"/>' +
        '<path d="' + sym('M70 420C76 360 112 326 160 316', 200) + '" fill="none" stroke="' + CY + '" stroke-width="2.2" class="av-v-o" style="--o0:.7"/>' +
        '<path d="M170 300H230L222 330H178Z" fill="#0a0c0f" stroke="' + CY + '" stroke-width="1.6" class="av-v-o" style="--o0:.7"/>' +
        g({ 'class': 'av-pose', style: origine(200, 290) },
          g({ 'class': 'av-tete', style: origine(200, 290) },
            '<path d="' + casque + '" fill="' + u('casque') + '"/>' +
            '<path d="' + visiere + '" fill="' + u('visiere') + '"/>' +
            g({ 'clip-path': u('cvisiere') }, refl + g({ 'class': 'av-glisse', style: '--d:5s;--h:200px' }, rect(-80, 130, 40, 110, { fill: '#ffffff', 'fill-opacity': '.12' }))) +
            '<path d="' + visiere + '" fill="none" stroke="' + CY + '" stroke-width="1.2" stroke-opacity=".7"/>' +
            g({ 'class': 'av-v-o', style: '--o0:.75' },
              '<path d="' + neon + '" fill="none" stroke="' + CY + '" stroke-width="7" stroke-opacity=".25" stroke-linecap="round"/>' +
              '<path d="' + neon + '" fill="none" stroke="#dff6ff" stroke-width="2" stroke-linecap="round"/>') +
            '<path d="M150 96C170 82 196 78 216 80" fill="none" stroke="url(#' + k.P + 'reflet)" stroke-width="10" stroke-linecap="round"/>'));
      return { defs: defs, fond: fond, corps: ondes(200, 180, 120, CY) + corps };
    },
    css: function (S) { return ''; }
  };

  /* ----------------------------------------------------------------- WALL-E */
  DESSINS.walle = {
    dessin: function (k) {
      var R = k.R, u = k.u, i;
      var defs =
        k.lg('fond', ' x2="0" y2="1"', [[0, '#04060f'], [.6, '#0b1024'], [1, '#2a1c10']]) +
        k.lg('jaune', ' x2="0" y2="1"', [[0, '#f0c25a'], [.5, '#d49a2e'], [1, '#8a5a1c']]) +
        k.lg('acier', '', [[0, '#5a6068'], [.5, '#b9c0c7'], [1, '#4a5058']]) +
        k.rg('boitier', ' cx=".4" cy=".3" r=".8"', [[0, '#d2d6da'], [.6, '#8a9198'], [1, '#4a5056']]) +
        k.rg('lentille', ' cx=".4" cy=".35" r=".6"', [[0, '#3a4a58'], [.5, '#10161c'], [1, '#020304']]) +
        k.motif('rouille', 9, 7, '<circle cx="2" cy="2" r="1.2" fill="#6a3c14" fill-opacity=".35"/><circle cx="6" cy="5" r=".8" fill="#4a2a0c" fill-opacity=".3"/>');
      var fond = rect(0, 0, 400, 400, { fill: u('fond') }) + etoiles(R, 90, 0, 0, 400, 330, '#fff6e0', 1.4) +
        poussieres(R, 30, JA, 1.4) + chemin('M0 360Q100 330 200 350T400 344V400H0Z', { fill: '#1a120a' }) +
        g({ 'class': 'av-actif' }, poussieres(graine(31), 30, '#ffe2a0', 1.8) + rect(0, 0, 400, 400, { fill: JA, 'fill-opacity': '.05' }));
      function oeil(cx, cls, rot) {
        return g({ transform: 'rotate(' + rot + ' ' + cx + ' 150)' },
          g({ 'class': 'we-oeil ' + cls, style: origine(cx, 176) },
            '<path d="M' + pt(cx - 40, 130) + 'L' + pt(cx + 34, 124) + 'Q' + pt(cx + 44, 124) + ' ' + pt(cx + 44, 134) + 'L' + pt(cx + 42, 168) +
            'Q' + pt(cx + 42, 178) + ' ' + pt(cx + 32, 178) + 'L' + pt(cx - 30, 178) + 'Q' + pt(cx - 42, 178) + ' ' + pt(cx - 42, 166) + 'Z" fill="' + u('boitier') + '" stroke="#2a2e33" stroke-width="1.5"/>' +
            cercle(cx, 152, 21, { fill: '#1a1d21' }) +
            g({ 'class': 'av-cligne', style: '--d:6s' }, cercle(cx, 152, 17, { fill: u('lentille') }) +
              cercle(cx + 5, 147, 4.5, { fill: '#ffffff', 'fill-opacity': '.8' }) + cercle(cx - 6, 158, 2, { fill: '#ffffff', 'fill-opacity': '.5' }))));
      }
      /* jauge de charge solaire : segments verts */
      var jauge = rect(252, 300, 22, 62, { rx: 3, fill: '#2a2e33', stroke: '#15181b', 'stroke-width': 1 }), seg = '';
      for (i = 0; i < 6; i++) seg += rect(256, 352 - i * 9.4, 14, 6.6, { rx: 1, fill: VE, 'class': 'we-seg', style: 'animation-delay:-' + (i * .25).toFixed(2) + 's' });
      jauge += g({ 'class': 'av-v-o', style: '--o0:.85' }, seg);
      var corps =
        /* chassis et chenilles */
        rect(110, 274, 180, 140, { rx: 6, fill: u('jaune') }) + rect(110, 274, 180, 140, { rx: 6, fill: u('rouille') }) +
        rect(110, 274, 180, 140, { rx: 6, fill: 'none', stroke: '#5a3a14', 'stroke-width': 2 }) +
        rect(126, 288, 112, 60, { rx: 4, fill: 'none', stroke: '#8a5a1c', 'stroke-width': 2 }) + jauge +
        rect(70, 380, 260, 40, { rx: 18, fill: '#2a2c30', stroke: '#15181b', 'stroke-width': 2 }) +
        /* cou articule */
        '<path d="M200 274V214" stroke="' + u('acier') + '" stroke-width="12" stroke-linecap="round"/>' +
        '<path d="M200 214L200 192" stroke="#3a3f45" stroke-width="16" stroke-linecap="round"/>' +
        g({ 'class': 'av-pose', style: origine(200, 214) },
          g({ 'class': 'av-tete', style: origine(200, 214) },
            rect(178, 172, 44, 18, { rx: 6, fill: '#4a5056' }) + oeil(152, 'we-g', -6) + oeil(248, 'we-d', 6)));
      return { defs: defs, fond: fond, corps: ondes(200, 160, 120, JA) + corps };
    },
    css: function (S) {
      return [
        /* inclinaisons independantes des deux optiques */
        '.we-oeil{transform-box:view-box;transition:transform .6s cubic-bezier(.3,1.4,.5,1)}',
        S.REP + '.we-g{animation:walle-g 7s ease-in-out infinite}', S.REP + '.we-d{animation:walle-d 8s ease-in-out infinite}',
        '@keyframes walle-g{0%,100%{transform:rotate(0)}40%{transform:rotate(-8deg)}60%{transform:rotate(-8deg)}}',
        '@keyframes walle-d{0%,100%{transform:rotate(0)}55%{transform:rotate(10deg)}75%{transform:rotate(10deg)}}',
        S.L + '.we-g{transform:rotate(12deg) translateY(-6px)}', S.L + '.we-d{transform:rotate(-12deg) translateY(-6px)}',
        S.PR + '.we-g{animation:walle-calc .9s ease-in-out infinite}', S.PR + '.we-d{animation:walle-calc .9s ease-in-out infinite reverse}',
        '@keyframes walle-calc{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}}',
        '.we-seg{animation:walle-charge 3s steps(1,end) infinite}',
        '@keyframes walle-charge{0%,60%{opacity:1}61%,100%{opacity:.25}}'
      ].join('\n');
    }
  };

  /* ------------------------------------------------------------- DAFT PUNK */
  DESSINS.daft_punk = {
    dessin: function (k) {
      var R = k.R, u = k.u, i;
      var COULS = [BL, VE, JA, RO, CY, VI];
      var defs =
        fondPlein(k, [[0, '#14081e'], [.55, '#07030c'], [1, '#000']]) +
        k.rg('argent', ' cx=".35" cy=".25" r=".9"', [[0, '#ffffff'], [.3, '#cfd5db'], [.6, '#7c8690'], [1, '#2a3036']]) +
        k.rg('or', ' cx=".35" cy=".25" r=".9"', [[0, '#fff5cf'], [.3, '#f2cc6a'], [.62, '#a8761c'], [1, '#4a3008']]) +
        k.lg('noir', ' x2="0" y2="1"', [[0, '#1a1c20'], [.5, '#050506'], [1, '#121418']]) +
        k.lg('cuir', ' x2="0" y2="1"', [[0, '#1c1c1e'], [1, '#050505']]);
      /* pyramide laser (Alive 2007) */
      var pyr = '<path d="M200 40L392 330H8Z" fill="none" stroke="' + CY + '" stroke-width="2" stroke-opacity=".5"/>';
      for (i = 1; i < 8; i++) {
        var y = 40 + i * 36.25, dx = (y - 40) * 192 / 290;
        pyr += ligne(200 - dx, y, 200 + dx, y, { stroke: COULS[i % 6], 'stroke-opacity': '.35', 'stroke-width': 1.2 });
      }
      for (i = 0; i < 11; i++) pyr += ligne(200, 40, 8 + i * 38.4, 330, { stroke: CY, 'stroke-opacity': '.12' });
      function lasers(duree, op) {
        var s = '';
        for (var n = 0; n < 12; n++) {
          var a = -70 + n * 13 + R() * 6;
          s += g({ 'class': 'av-pulse', style: '--d:' + (duree + R() * duree).toFixed(1) + 's;animation-delay:-' + (R() * 3).toFixed(1) + 's;--o0:0;--o1:' + op },
            ligne(200, 40, 200 + 520 * Math.sin(a * Math.PI / 180), 40 + 520 * Math.cos(a * Math.PI / 180), { stroke: COULS[n % 6], 'stroke-width': 1.6 }));
        }
        return s;
      }
      var fond = rect(0, 0, 400, 400, { fill: u('fond') }) + g({ 'class': 'av-repos' }, pyr) + lasers(3, '.5') +
        g({ 'class': 'av-actif' }, g({ 'class': 'av-pulse', style: '--d:.8s;--o0:.4;--o1:1' }, pyr) + lasers(.6, '.9'));
      /* matrice de LED de la visiere : colonnes qui montent en egaliseur */
      function matrice(x, y, cols, rangs, pas) {
        var s = '';
        for (var c = 0; c < cols; c++) {
          var col = '';
          for (var r = 0; r < rangs; r++) col += rect(x + c * pas, y + r * pas, pas - 1.4, pas - 1.4, { rx: '.6' });
          s += g({ 'class': 'dp-col', fill: COULS[c % 6], style: 'animation-delay:-' + (R() * 2).toFixed(2) + 's;--k:' + f(.5 + R() * .9) }, col);
        }
        return s;
      }
      /* Thomas : chrome argente, visiere en bande */
      var thomas = g({ transform: 'translate(-6 0)' },
        '<path d="M70 420C74 350 100 324 128 318C156 324 182 350 186 420Z" fill="' + u('cuir') + '"/>' +
        ellipse(128, 190, 66, 86, { fill: u('argent') }) +
        '<path d="M70 160C90 148 166 148 186 160L184 222C164 234 92 234 72 222Z" fill="' + u('noir') + '"/>' +
        matrice(80, 168, 12, 6, 8.6) +
        '<path d="M86 118Q128 98 170 118" fill="none" stroke="#ffffff" stroke-width="5" stroke-opacity=".45" stroke-linecap="round"/>' +
        rect(118, 268, 20, 30, { fill: '#5a6068' }));
      /* Guy-Manuel : or, visiere en goutte */
      var guy = g({ transform: 'translate(6 0)' },
        '<path d="M214 420C218 350 244 324 272 318C300 324 326 350 330 420Z" fill="' + u('cuir') + '"/>' +
        ellipse(272, 192, 64, 84, { fill: u('or') }) +
        '<path d="M214 150C240 132 304 132 330 150L322 206C300 236 244 236 222 206Z" fill="' + u('noir') + '"/>' +
        matrice(230, 158, 10, 5, 8.6) +
        '<path d="M232 114Q272 96 312 114" fill="none" stroke="#fff8e0" stroke-width="5" stroke-opacity=".5" stroke-linecap="round"/>' +
        rect(262, 270, 20, 30, { fill: '#8a6420' }));
      var corps = g({ 'class': 'av-pose', style: origine(200, 300) }, thomas + guy);
      return { defs: defs, fond: fond, corps: ondes(200, 190, 140, VI) + corps };
    },
    css: function (S) {
      return [
        '.dp-col{transform-box:fill-box;transform-origin:50% 100%;opacity:.85;animation:daftpunk-eq 2.4s ease-in-out infinite}',
        '@keyframes daftpunk-eq{0%,100%{transform:scaleY(.2)}50%{transform:scaleY(.6)}}',
        S.L + '.dp-col{animation:daftpunk-eq 1.2s ease-in-out infinite}',
        S.PR + '.dp-col{animation:daftpunk-calc .45s steps(2,end) infinite}',
        '@keyframes daftpunk-calc{0%{transform:scaleY(1)}50%{transform:scaleY(.15)}100%{transform:scaleY(.7)}}',
        S.S + '.dp-col{animation:daftpunk-parle 1.1s linear infinite}',
        kfParole('daftpunk-parle', function (v) { return 'transform:scaleY(calc(.12 + ' + v + ' * var(--k,1)))'; }),
        S.AU + '.dp-col{animation:none;transform:scaleY(calc(.12 + var(--bouche,0) * var(--k,1)));transition:transform .08s linear}'
      ].join('\n');
    }
  };

  /* =====================================================================
   *  CSS COMMUN — etats, voix, mouvements generiques
   * ===================================================================== */
  /* profil de parole irregulier : 7 ouvertures par cycle (~6-7 Hz a 1,1 s) */
  var PAROLE = [[0, 0], [7, .55], [13, .15], [21, .8], [27, .25], [34, .6], [40, .05], [48, .9], [55, .3], [62, .7],
    [68, .1], [76, .55], [83, .2], [91, .75], [100, 0]];
  function kfParole(nom, prop) {
    return '@keyframes ' + nom + '{' + PAROLE.map(function (p) { return p[0] + '%{' + prop(p[1]) + '}'; }).join('') + '}';
  }
  function selecteurs(A) {
    return {
      L: A('[data-etat="listening"]') + ' ', PR: A('[data-etat="processing"]') + ' ',
      S: A('[data-etat="speaking"]') + ' ', AU: A('[data-etat="speaking"][data-audio]') + ' ',
      ACT: A('[data-etat]') + ' ', REP: A(':not([data-etat])') + ' '
    };
  }
  function cssCommun(S) {
    return [
      '.av-svg{display:block;width:100%;height:100%}',
      '.av-corps{transform-box:view-box;animation:avc-souffle 5.2s ease-in-out infinite}',
      '@keyframes avc-souffle{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.8px)}}',
      '.av-pose{transform-box:view-box;transition:transform .8s cubic-bezier(.25,.8,.3,1)}',
      S.L + '.av-pose{transform:translateY(3px) scale(1.03)}',
      S.PR + '.av-pose{transform:rotate(1deg)}',
      '.av-tete{transform-box:view-box;animation:avc-tete 8s ease-in-out infinite}',
      '@keyframes avc-tete{0%,100%{transform:rotate(0)}30%{transform:rotate(.9deg) translateX(.5px)}65%{transform:rotate(-.7deg) translateX(-.3px)}}',
      /* le fond s'intensifie des que l'avatar agit (couche active en fondu) */
      '.av-actif{opacity:0;transition:opacity .8s}', S.ACT + '.av-actif{opacity:1}',
      '.av-repos{transition:opacity .8s}', S.ACT + '.av-repos{opacity:.45}',
      '.av-calc{opacity:0;transition:opacity .4s}', S.PR + '.av-calc{opacity:1}',
      '.av-hors-calc{transition:opacity .4s}', S.PR + '.av-hors-calc{opacity:0}',
      '.av-ecoute{opacity:0;transition:opacity .5s}', S.L + '.av-ecoute{opacity:1}',
      '.av-parle{opacity:0;transition:opacity .25s}', S.S + '.av-parle{opacity:1}',
      '.av-lueur{opacity:.3;transition:opacity .5s}',
      S.L + '.av-lueur{opacity:1}', S.PR + '.av-lueur{opacity:.75}', S.S + '.av-lueur{opacity:.6}',
      S.AU + '.av-lueur{opacity:calc(.35 + var(--bouche,0) * .65);transition:opacity .08s}',
      '.av-ondes{opacity:0;transition:opacity .6s}', S.L + '.av-ondes{opacity:1}',
      '.av-onde{opacity:0;transform-box:view-box}',
      S.L + '.av-onde{animation:avc-onde 1.8s ease-out infinite}',
      S.L + '.av-o2{animation-delay:.3s}', S.L + '.av-o3{animation-delay:.6s}',
      '@keyframes avc-onde{0%{opacity:0;transform:scale(.92)}25%{opacity:1}100%{opacity:0;transform:scale(1.1)}}',
      '.av-rot{transform-box:view-box;animation:avc-rot var(--d,20s) linear infinite}',
      '.av-rot-inv{animation-direction:reverse}',
      '@keyframes avc-rot{to{transform:rotate(360deg)}}',
      '.av-pulse{animation:avc-pulse var(--d,3s) ease-in-out infinite}',
      '@keyframes avc-pulse{0%,100%{opacity:var(--o0,.45)}50%{opacity:var(--o1,1)}}',
      '.av-scintille{animation:avc-scintille var(--d,4s) ease-in-out infinite}',
      '@keyframes avc-scintille{0%,100%{opacity:.25}50%{opacity:1}}',
      '.av-led{animation:avc-led var(--d,2s) steps(1,end) infinite}',
      '@keyframes avc-led{0%{opacity:1}50%{opacity:.16}}',
      '.av-monte{transform-box:view-box;animation:avc-monte var(--d,12s) linear infinite}',
      '@keyframes avc-monte{0%{transform:translateY(0);opacity:0}12%{opacity:1}85%{opacity:1}100%{transform:translateY(var(--h,-120px));opacity:0}}',
      '.av-tombe{transform-box:view-box;animation:avc-tombe var(--d,6s) linear infinite}',
      '@keyframes avc-tombe{from{transform:translateY(0)}to{transform:translateY(var(--h,400px))}}',
      '.av-glisse{transform-box:view-box;animation:avc-glisse var(--d,6s) linear infinite}',
      '@keyframes avc-glisse{from{transform:translateX(0)}to{transform:translateX(var(--h,400px))}}',
      '.av-dash{animation:avc-dash var(--d,3s) linear infinite}',
      '@keyframes avc-dash{to{stroke-dashoffset:var(--o,-100)}}',
      '.av-flotte{transform-box:view-box;animation:avc-flotte var(--d,6s) ease-in-out infinite}',
      '@keyframes avc-flotte{0%,100%{transform:translateY(0)}50%{transform:translateY(var(--h,-4px))}}',
      '.av-cligne{transform-box:fill-box;transform-origin:50% 50%;animation:avc-cligne var(--d,6.5s) ease-in-out infinite}',
      '@keyframes avc-cligne{0%,91%,97%,100%{transform:scaleY(1)}94%{transform:scaleY(.06)}}',
      /* la voix : amplitude REELLE (--bouche, posee par le pilote) quand le son passe par la
         carte, profil de parole sinon (satellite, enceinte de secours) */
      '.av-v-y{transform-box:fill-box;transition:transform .09s linear}',
      S.S + '.av-v-y{animation:avc-vy 1.1s linear infinite}',
      S.AU + '.av-v-y{animation:none;transform:translateY(calc(var(--bouche,0) * var(--k,6px)))}',
      '.av-v-sy{transform-box:fill-box;transform-origin:50% 0;transform:scaleY(0);transition:transform .09s linear}',
      S.S + '.av-v-sy{animation:avc-vsy 1.1s linear infinite}',
      S.AU + '.av-v-sy{animation:none;transform:scaleY(var(--bouche,0))}',
      '.av-v-s{transform-box:fill-box;transform-origin:50% 50%;transition:transform .09s linear}',
      S.S + '.av-v-s{animation:avc-vs 1.1s linear infinite}',
      S.AU + '.av-v-s{animation:none;transform:scale(calc(1 + var(--bouche,0) * var(--k,.12)))}',
      '.av-v-o{opacity:var(--o0,.25);transition:opacity .09s linear}',
      S.S + '.av-v-o{animation:avc-vo 1.1s linear infinite}',
      S.AU + '.av-v-o{animation:none;opacity:calc(var(--o0,.25) + var(--bouche,0) * (1 - var(--o0,.25)))}',
      kfParole('avc-vy', function (v) { return 'transform:translateY(calc(' + v + ' * var(--k,6px)))'; }),
      kfParole('avc-vsy', function (v) { return 'transform:scaleY(' + v + ')'; }),
      kfParole('avc-vs', function (v) { return 'transform:scale(calc(1 + ' + v + ' * var(--k,.12)))'; }),
      kfParole('avc-vo', function (v) { return 'opacity:calc(var(--o0,.25) + ' + v + ' * (1 - var(--o0,.25)))'; }),
      '@media (prefers-reduced-motion:reduce){.av-svg *{animation:none!important}}'
    ].join('\n');
  }

  /* =====================================================================
   *  API
   * ===================================================================== */
  var TETE = 'viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"';

  function idValide(id) { return DESSINS[id] ? id : ORDRE[0]; }

  function svg(id, prefixe) {
    id = idValide(id);
    var r = DESSINS[id].dessin(kit(id, prefixe));
    return '<svg class="av-svg av-' + id + '" ' + TETE + '><defs>' + (r.defs || '') + '</defs>' +
      '<g class="av-fond">' + (r.fond || '') + '</g><g class="av-corps">' + (r.corps || '') + '</g>' +
      (r.dessus ? '<g class="av-dessus">' + r.dessus + '</g>' : '') + '</svg>';
  }

  function css(id, ancetre) {
    id = idValide(id);
    var A = typeof ancetre === 'function' ? ancetre : function (c) { return ':host(' + c + ')'; };
    var S = selecteurs(A);
    return cssCommun(S) + '\n' + (DESSINS[id].css ? DESSINS[id].css(S) : '');
  }

  /* Le contenu d'une scene : la feuille de l'avatar, son dessin, et SES quatre videos (si le
     deploiement en a trouve : `v` est leur version, « 0 » = aucune). Seule leur OPACITE
     changera ensuite : la carte bascule d'etat sans recharger une source. */
  function scene(id, o) {
    o = o || {};
    id = idValide(id);
    var v = o.v && String(o.v) !== '0' ? String(o.v) : null;
    var vids = '';
    if (v && o.videos !== false) {
      ETATS.forEach(function (e) {
        vids += '<video class="av-v" data-skin="' + id + '" data-etat="' + e + '" data-fusion="' + (o.fusion === 'ecran' ? 'ecran' : 'normal') + '"' +
          ' muted loop playsinline autoplay preload="auto" disablepictureinpicture disableremoteplayback' +
          ' src="/local/avatars/' + id + '/' + e + '.webm?v=' + encodeURIComponent(v) + '"' +
          ' onerror="this.setAttribute(\'data-ko\', \'\')" onloadeddata="this.setAttribute(\'data-pret\', \'\')"></video>';
      });
    }
    return '<style>' + css(id, o.ancetre) + '</style>' + svg(id, o.prefixe || 'avs') +
      '<div class="av-videos">' + vids + '</div>';
  }

  /* Remplit la scene d'une carte. Le champ « scene » de la carte est une chaine FIGEE : button-card
     ne le recree jamais (meme chaine, rien a refaire), si bien que ce contenu, pose ici, survit a
     tous les rendus. On ne le reecrit que si l'avatar (ou ses videos) change. */
  function monter(hote, cfg) {
    if (!hote) return;
    if (cfg) hote.__avCfg = cfg;
    cfg = hote.__avCfg || {};
    var racine = hote.shadowRoot;
    var zone = racine && racine.querySelector('.av-scene');
    if (!zone) {
      /* premier rendu : le champ n'est pas encore dans le DOM */
      hote.__avEssais = (hote.__avEssais || 0) + 1;
      if (hote.__avEssais < 50) setTimeout(function () { monter(hote); }, 60);
      return;
    }
    hote.__avEssais = 0;
    var id = idValide(hote.getAttribute('data-skin'));
    var a = (cfg.avatars || {})[id] || {};
    var cle = id + '|' + (a.v || '0') + '|' + VERSION;
    if (zone.getAttribute('data-monte') === cle) return;
    zone.setAttribute('data-monte', cle);
    zone.innerHTML = scene(id, { v: a.v, fusion: a.fusion });
    if (G.AvatarIA && G.AvatarIA.attacher) {
      try { G.AvatarIA.attacher(hote).videos(id, hote.getAttribute('data-rendu') || 'Auto'); } catch (e) { /* */ }
    }
  }

  G.AvatarIADessin = {
    version: VERSION, ids: ORDRE.slice(), etats: ETATS.slice(),
    existe: function (id) { return !!DESSINS[id]; },
    svg: svg, css: css, scene: scene, monter: monter
  };
  try {
    if (G.dispatchEvent && typeof G.CustomEvent === 'function') {
      G.dispatchEvent(new G.CustomEvent('avatar-ia-dessin-pret', { detail: { version: VERSION } }));
    }
  } catch (e) { /* */ }
})(typeof window !== 'undefined' ? window : globalThis);
