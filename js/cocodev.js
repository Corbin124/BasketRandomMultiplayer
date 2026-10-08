// CocoDev layer: configurable controls (team / single), key hints and settings menu.
// Talks to the Construct 3 runtime through its internal API and the globals in1..in4 / teamMode.
(function () {
	"use strict";

	// ---------- settings ----------
	const STORAGE_KEY = "cocodev-settings-v1";
	const DEFAULTS = {
		mode: "single",
		single: {
			rightFront: { code: "ArrowLeft", label: "←" },
			rightBack: { code: "ArrowRight", label: "→" },
			leftFront: { code: "KeyD", label: "D" },
			leftBack: { code: "KeyA", label: "A" },
		},
		team: {
			right: { code: "ArrowUp", label: "↑" },
			left: { code: "KeyW", label: "W" },
		},
	};
	const clone = (o) => JSON.parse(JSON.stringify(o));

	function loadSettings() {
		try {
			const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
			if (s && (s.mode === "single" || s.mode === "team")) {
				const d = clone(DEFAULTS);
				return { mode: s.mode, single: Object.assign(d.single, s.single), team: Object.assign(d.team, s.team) };
			}
		} catch (e) {}
		return clone(DEFAULTS);
	}
	function saveSettings() {
		try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (e) {}
	}
	let settings = loadSettings();

	// ---------- pixel font (same style as the game's HOLD hint: 2px strokes + soft shadow) ----------
	const GLYPHS = {
		A: [".##.", "#..#", "####", "#..#", "#..#"], B: ["###.", "#..#", "###.", "#..#", "###."],
		C: [".###", "#...", "#...", "#...", ".###"], D: ["###.", "#..#", "#..#", "#..#", "###."],
		E: ["####", "#...", "###.", "#...", "####"], F: ["####", "#...", "###.", "#...", "#..."],
		G: [".###", "#...", "#.##", "#..#", ".###"], H: ["#..#", "#..#", "####", "#..#", "#..#"],
		I: ["###", ".#.", ".#.", ".#.", "###"], J: ["..##", "...#", "...#", "#..#", ".##."],
		K: ["#..#", "#.#.", "##..", "#.#.", "#..#"], L: ["#...", "#...", "#...", "#...", "####"],
		M: ["#...#", "##.##", "#.#.#", "#...#", "#...#"], N: ["#..#", "##.#", "#.##", "#..#", "#..#"],
		O: [".##.", "#..#", "#..#", "#..#", ".##."], P: ["###.", "#..#", "###.", "#...", "#..."],
		Q: [".##.", "#..#", "#..#", "#.#.", ".#.#"], R: ["###.", "#..#", "###.", "#.#.", "#..#"],
		S: [".###", "#...", ".##.", "...#", "###."], T: ["###", ".#.", ".#.", ".#.", ".#."],
		U: ["#..#", "#..#", "#..#", "#..#", ".##."], V: ["#..#", "#..#", "#..#", "#..#", ".##."],
		W: ["#...#", "#...#", "#.#.#", "##.##", "#...#"], X: ["#..#", "#..#", ".##.", "#..#", "#..#"],
		Y: ["#.#", "#.#", ".#.", ".#.", ".#."], Z: ["####", "...#", ".##.", "#...", "####"],
		0: [".##.", "#..#", "#.##", "##.#", ".##."], 1: [".#.", "##.", ".#.", ".#.", "###"],
		2: ["###.", "...#", ".##.", "#...", "####"], 3: ["###.", "...#", ".##.", "...#", "###."],
		4: ["#..#", "#..#", "####", "...#", "...#"], 5: ["####", "#...", "###.", "...#", "###."],
		6: [".##.", "#...", "###.", "#..#", ".##."], 7: ["####", "...#", "..#.", ".#..", ".#.."],
		8: [".##.", "#..#", ".##.", "#..#", ".##."], 9: [".##.", "#..#", ".###", "...#", ".##."],
		"←": ["..#..", ".#...", "#####", ".#...", "..#.."], "→": ["..#..", "...#.", "#####", "...#.", "..#.."],
		"↑": ["..#..", ".###.", "#.#.#", "..#..", "..#.."], "↓": ["..#..", "..#..", "#.#.#", ".###.", "..#.."],
		"(": [".#", "#.", "#.", "#.", ".#"], ")": ["#.", ".#", ".#", ".#", "#."],
		"/": ["..#", "..#", ".#.", "#..", "#.."], "-": ["...", "...", "###", "...", "..."],
		"+": ["...", ".#.", "###", ".#.", "..."], ".": [".", ".", ".", ".", "#"], ",": ["..", "..", "..", ".#", "#."],
		":": [".", "#", ".", "#", "."], "?": ["###.", "...#", ".##.", "....", ".#.."], "!": ["#", "#", "#", ".", "#"],
		"'": ["#", "#", ".", ".", "."], "=": ["...", "###", "...", "###", "..."], "#": [".#.#.", "#####", ".#.#.", "#####", ".#.#."],
		" ": ["..", "..", "..", "..", ".."],
	};
	const UMLAUT = { "Ä": "AE", "Ö": "OE", "Ü": "UE", "ß": "SS" };

	// Returns a canvas with the text drawn at 1 game pixel per pixel (scale it up with CSS).
	function pixelText(text, color) {
		text = String(text).toUpperCase().replace(/[ÄÖÜß]/g, (c) => UMLAUT[c]);
		const glyphs = [...text].map((c) => GLYPHS[c] || GLYPHS["?"]);
		const width = glyphs.reduce((w, g) => w + g[0].length * 2 + 2, 0);
		const cv = document.createElement("canvas");
		cv.width = Math.max(1, width);
		cv.height = 11;
		const ctx = cv.getContext("2d");
		const on = new Set();
		let x = 0;
		for (const g of glyphs) {
			g.forEach((row, gy) => [...row].forEach((c, gx) => {
				if (c === "#") for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) on.add((x + gx * 2 + dx) + "," + (gy * 2 + dy));
			}));
			x += g[0].length * 2 + 2;
		}
		ctx.fillStyle = "rgba(0,0,0,0.16)";
		for (const k of on) {
			const [px, py] = k.split(",").map(Number);
			if (!on.has(px + "," + (py + 1))) ctx.fillRect(px, py + 1, 1, 1);
		}
		ctx.fillStyle = color || "#fff";
		for (const k of on) {
			const [px, py] = k.split(",").map(Number);
			ctx.fillRect(px, py, 1, 1);
		}
		return cv;
	}
	function textEl(text, scale, color) {
		const cv = pixelText(text, color);
		cv.className = "cd-text";
		cv.style.width = cv.width * scale + "px";
		cv.style.height = cv.height * scale + "px";
		return cv;
	}

	// ---------- styles ----------
	const style = document.createElement("style");
	style.textContent = `
		.cd-text { image-rendering: pixelated; display: block; pointer-events: none; }
		#cd-gear { position: fixed; top: 12px; left: 12px; z-index: 20; width: 44px; height: 44px; padding: 0;
			background: #0b2030; border: 4px solid #000; cursor: pointer; display: none; image-rendering: pixelated; }
		#cd-gear canvas { width: 100%; height: 100%; image-rendering: pixelated; }
		#cd-overlay { position: fixed; inset: 0; z-index: 30; background: rgba(0,0,0,0.6); display: none;
			align-items: center; justify-content: center; }
		#cd-panel { background: #0b2030; border: 6px solid #000; box-shadow: 0 6px 0 rgba(0,0,0,0.4);
			padding: 18px; display: flex; flex-direction: column; gap: 14px; max-width: calc(100vw - 32px);
			max-height: calc(100vh - 32px); overflow: auto; box-sizing: border-box; }
		.cd-row { display: flex; align-items: center; justify-content: space-between; gap: 18px; }
		.cd-btn { background: #1a3a50; border: 4px solid #000; padding: 8px 12px; cursor: pointer;
			display: flex; align-items: center; justify-content: center; }
		.cd-btn:hover { filter: brightness(1.2); }
		.cd-btn.cd-on { background: #85c502; }
		.cd-btn.cd-key { min-width: 64px; background: #1095cb; }
		.cd-btn.cd-listen { background: #dc5a10; }
		.cd-btn.cd-ok { background: #85c502; }
		.cd-hint { position: fixed; z-index: 10; pointer-events: none; transform: translate(-50%, -50%); display: none; }
	`;
	document.head.appendChild(style);

	// ---------- key input ----------
	const down = new Set();
	let menuOpen = false;
	let listening = null; // { group, slot, button }

	function keyLabel(e) {
		const special = {
			ArrowLeft: "←", ArrowRight: "→", ArrowUp: "↑", ArrowDown: "↓", Space: "LEER", Enter: "ENTER",
			ShiftLeft: "SHIFT", ShiftRight: "SHIFT R", ControlLeft: "STRG", ControlRight: "STRG R",
			AltLeft: "ALT", AltRight: "ALT GR", Tab: "TAB", Backspace: "BACK", CapsLock: "CAPS",
		};
		if (special[e.code]) return special[e.code];
		if (/^Numpad\d$/.test(e.code)) return "NUM" + e.code.slice(6);
		if (e.key && e.key.length === 1) return e.key.toUpperCase();
		return e.code.replace(/^(Key|Digit)/, "").toUpperCase().slice(0, 6);
	}
	function allBindings() {
		return settings.mode === "team" ? Object.values(settings.team) : Object.values(settings.single);
	}

	window.addEventListener("keydown", (e) => {
		if (listening) {
			e.preventDefault();
			e.stopImmediatePropagation();
			if (e.code !== "Escape") {
				const group = settings[listening.group];
				const binding = { code: e.code, label: keyLabel(e) };
				// swap if the key is already used in this mode
				for (const [slot, b] of Object.entries(group)) {
					if (b.code === e.code && slot !== listening.slot) group[slot] = group[listening.slot];
				}
				group[listening.slot] = binding;
				saveSettings();
			}
			listening = null;
			renderPanel();
			return;
		}
		if (menuOpen) {
			if (e.code === "Escape") closeMenu();
			e.preventDefault();
			e.stopImmediatePropagation();
			return;
		}
		down.add(e.code);
		if (allBindings().some((b) => b.code === e.code)) e.preventDefault();
	}, true);
	window.addEventListener("keyup", (e) => { down.delete(e.code); }, true);
	window.addEventListener("blur", () => down.clear());

	// ---------- UI: gear + settings panel ----------
	const ui = Math.max(2, Math.min(3, Math.floor(Math.min(innerWidth, innerHeight) / 220)));

	const gear = document.createElement("button");
	gear.id = "cd-gear";
	gear.title = "Einstellungen";
	const gearCv = document.createElement("canvas");
	gearCv.width = gearCv.height = 9;
	{
		const g = ["...#.#...", ".#######.", ".##...##.", "###...###", "##.....##", "###...###", ".##...##.", ".#######.", "...#.#..."];
		const c = gearCv.getContext("2d");
		c.fillStyle = "#fff";
		g.forEach((r, y) => [...r].forEach((ch, x) => ch === "#" && c.fillRect(x, y, 1, 1)));
	}
	gear.appendChild(gearCv);
	gear.addEventListener("click", (e) => { e.stopPropagation(); openMenu(); });

	const overlay = document.createElement("div");
	overlay.id = "cd-overlay";
	const panel = document.createElement("div");
	panel.id = "cd-panel";
	overlay.appendChild(panel);
	overlay.addEventListener("pointerdown", (e) => { if (e.target === overlay) closeMenu(); });
	["pointerdown", "pointerup", "touchstart", "touchend", "mousedown", "mouseup"].forEach((t) =>
		overlay.addEventListener(t, (e) => e.stopPropagation()));

	function button(text, cls, onClick) {
		const b = document.createElement("div");
		b.className = "cd-btn " + (cls || "");
		b.appendChild(textEl(text, ui));
		b.addEventListener("click", onClick);
		return b;
	}
	function row(label, right) {
		const r = document.createElement("div");
		r.className = "cd-row";
		r.appendChild(textEl(label, ui));
		r.appendChild(right);
		return r;
	}

	const SLOTS = {
		single: [["rightFront", "RECHTS VORNE"], ["rightBack", "RECHTS HINTEN"], ["leftFront", "LINKS VORNE"], ["leftBack", "LINKS HINTEN"]],
		team: [["right", "TEAM RECHTS"], ["left", "TEAM LINKS"]],
	};

	function renderPanel() {
		panel.textContent = "";
		const title = textEl("EINSTELLUNGEN", ui + 1, "#85c502");
		title.style.alignSelf = "center";
		panel.appendChild(title);

		const modes = document.createElement("div");
		modes.className = "cd-row";
		modes.style.justifyContent = "flex-start";
		modes.appendChild(button("EINZELN", settings.mode === "single" ? "cd-on" : "", () => { settings.mode = "single"; saveSettings(); renderPanel(); }));
		modes.appendChild(button("TEAM", settings.mode === "team" ? "cd-on" : "", () => { settings.mode = "team"; saveSettings(); renderPanel(); }));
		panel.appendChild(row("STEUERUNG", modes));

		const group = settings.mode;
		for (const [slot, label] of SLOTS[group]) {
			const isListening = listening && listening.group === group && listening.slot === slot;
			const b = button(isListening ? "TASTE?" : settings[group][slot].label, "cd-key" + (isListening ? " cd-listen" : ""), () => {
				listening = { group, slot };
				renderPanel();
			});
			panel.appendChild(row(label, b));
		}

		const info = textEl(settings.mode === "team" ? "1 TASTE PRO TEAM" : "1 TASTE PRO FIGUR", ui - 1, "#9ab");
		info.style.alignSelf = "center";
		panel.appendChild(info);

		const actions = document.createElement("div");
		actions.className = "cd-row";
		actions.appendChild(button("STANDARD", "", () => {
			settings[group] = clone(DEFAULTS[group]);
			saveSettings();
			listening = null;
			renderPanel();
		}));
		actions.appendChild(button("FERTIG", "cd-ok", closeMenu));
		panel.appendChild(actions);
	}

	let savedTimeScale = 1;
	function openMenu() {
		if (menuOpen) return;
		menuOpen = true;
		down.clear();
		listening = null;
		renderPanel();
		overlay.style.display = "flex";
		if (runtime) { savedTimeScale = runtime.GetTimeScale(); runtime.SetTimeScale(0); }
	}
	function closeMenu() {
		if (!menuOpen) return;
		menuOpen = false;
		listening = null;
		overlay.style.display = "none";
		if (runtime) runtime.SetTimeScale(savedTimeScale || 1);
	}

	// ---------- in-game key hints (replace the built-in HOLD(W) / HOLD(↑) sprites) ----------
	const hints = {};
	function hintFor(side) {
		const key = side + "|" + settings.mode + "|" + JSON.stringify(settings[settings.mode]);
		if (hints[side] && hints[side].key === key) return hints[side].el;
		if (hints[side]) hints[side].el.remove();
		let keys;
		if (settings.mode === "team") keys = settings.team[side].label;
		else if (side === "left") keys = settings.single.leftBack.label + "/" + settings.single.leftFront.label;
		else keys = settings.single.rightFront.label + "/" + settings.single.rightBack.label;
		const el = pixelText("HOLD(" + keys + ")");
		el.className = "cd-text cd-hint";
		document.body.appendChild(el);
		hints[side] = { key, el };
		return el;
	}

	// ---------- runtime hook ----------
	let runtime = null;
	const vars = {};

	function setVar(name, value) {
		const v = vars[name];
		if (v && v.GetValue() !== value) v.SetValue(value);
	}
	function instances(name) {
		const oc = runtime.GetObjectClassByName(name);
		return oc ? oc.GetInstances() : [];
	}

	function tick() {
		const layout = runtime.GetMainRunningLayout();
		const inGame = layout && layout.GetName() === "game";

		gear.style.display = inGame ? "block" : "none";

		// controls
		const k = (b) => (!menuOpen && down.has(b.code) ? 1 : 0);
		setVar("teamMode", settings.mode === "team" ? 1 : 0);
		if (settings.mode === "team") {
			const r = k(settings.team.right), l = k(settings.team.left);
			setVar("in1", r); setVar("in2", r); setVar("in3", l); setVar("in4", l);
		} else {
			const s = settings.single;
			setVar("in1", k(s.rightFront)); setVar("in2", k(s.rightBack));
			setVar("in3", k(s.leftFront)); setVar("in4", k(s.leftBack));
		}
		if (!inGame) return;

		// hide MORE button (it used to link to twoplayergames.org)
		for (const inst of instances("moreButton")) {
			const wi = inst.GetWorldInfo();
			if (wi.IsVisible()) { wi.SetVisible(false); wi.SetBboxChanged(); }
		}

		// key hints, following the visibility/blink of the original tutorial sprites
		const canvas = document.querySelector("canvas");
		const rect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
		const shown = { left: false, right: false };
		for (const inst of instances("tutorial")) {
			const wi = inst.GetWorldInfo();
			const sdk = inst.GetSdkInstance();
			const frame = sdk.GetAnimationFrame ? sdk.GetAnimationFrame() : sdk._currentFrameIndex;
			const side = wi.GetX() < layout.GetWidth() / 2 ? "left" : "right";
			if (!wi.IsVisible() || frame !== 0 || wi.GetOpacity() <= 0) continue;
			const layer = wi.GetLayer();
			const [cx, cy] = layer.LayerToCanvasCss(wi.GetX(), wi.GetY());
			const scale = layer.LayerToCanvasCss(wi.GetX() + 1, wi.GetY())[0] - cx;
			const el = hintFor(side);
			el.style.left = rect.left + cx + "px";
			el.style.top = rect.top + cy + "px";
			el.style.width = el.width * scale + "px";
			el.style.height = el.height * scale + "px";
			el.style.opacity = wi.GetOpacity();
			el.style.display = "block";
			shown[side] = true;
		}
		for (const side of ["left", "right"]) if (!shown[side] && hints[side]) hints[side].el.style.display = "none";
	}

	function hook() {
		const ri = window.c3_runtimeInterface;
		const rt = ri && ri._GetLocalRuntime && ri._GetLocalRuntime();
		const esm = rt && rt.GetEventSheetManager && rt.GetEventSheetManager();
		const globals = esm && (esm._allGlobalVars || (esm.GetAllGlobalVariables && esm.GetAllGlobalVariables()));
		if (!rt || !globals || !rt.GetMainRunningLayout()) return setTimeout(hook, 100);
		for (const v of globals) vars[v.GetName()] = v;
		runtime = rt;
		rt.Dispatcher().addEventListener("tick", () => {
			try { tick(); } catch (e) { console.warn("cocodev tick:", e); }
		});
	}

	function init() {
		document.body.appendChild(gear);
		document.body.appendChild(overlay);
		hook();
	}
	if (document.body) init(); else document.addEventListener("DOMContentLoaded", init);
})();
