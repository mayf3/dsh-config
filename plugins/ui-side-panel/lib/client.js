// @dsh-user/ui-side-panel — 右侧面板（持久化版）。
// 由 pkg-5 动态插件转写：同样的 UI，改为标准 client bundle 格式，
// 通过 web profile 的 cordis.patch.yml 注册，随 dsh web 启动自动加载。
// 功能：接管右侧 details 列，任务清单 + 会话详情（avg/p75/p99/max 耗时条形图、
// token 用量、缓存命中、上下文占用），遮蔽输入框上方的任务条和底部统计条。
window.__ModuleLoader__.load({
	id: "@dsh-user/ui-side-panel",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const React = require("react");

		// Package stylesheet, injected once like the tsdown css plugin does.
		const css = `/* The shipped details column is removed: the right side is the
   BetterSidebar workbench alone (task panel + browser tabs). */
[class$="_detailsCol"]{display:none!important}
/* Right-side embedded panel (legacy details-column surface; kept for
   reference, no longer mounted). */
.dsh-side-panel{box-sizing:border-box;height:100%;display:flex;flex-direction:column;border-left:1px solid color-mix(in srgb,var(--dsw-alias-label-tertiary) 35%,transparent);border-top:1px solid color-mix(in srgb,var(--dsw-alias-label-tertiary) 22%,transparent);border-bottom:1px solid color-mix(in srgb,var(--dsw-alias-label-tertiary) 22%,transparent);background:radial-gradient(130% 70% at 15% -10%,color-mix(in srgb,var(--dsw-alias-state-business-primary) 20%,transparent),transparent 55%),radial-gradient(120% 60% at 100% 115%,color-mix(in srgb,#a78bfa 18%,transparent),transparent 60%),rgba(248,250,253,.3);backdrop-filter:blur(20px)}body[data-ds-dark-theme] .dsh-side-panel{background:radial-gradient(130% 70% at 15% -10%,color-mix(in srgb,var(--dsw-alias-state-business-primary) 20%,transparent),transparent 55%),radial-gradient(120% 60% at 100% 115%,color-mix(in srgb,#a78bfa 18%,transparent),transparent 60%),rgba(19,22,32,.3);backdrop-filter:blur(20px)}
.dsh-side-header{display:flex;align-items:center;gap:8px;flex:none;padding:20px 12px 8px 16px;background:linear-gradient(180deg,color-mix(in srgb,var(--dsw-alias-state-business-primary) 9%,transparent),transparent)}
.dsh-side-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:var(--dsw-font-xs-strong-13);color:var(--dsw-alias-label-primary)}
.dsh-side-close{display:grid;flex:none;place-items:center;width:28px;height:28px;padding:0;border:none;border-radius:8px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer}
.dsh-side-close:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsh-side-body{flex:1 1 auto;min-height:0;overflow-y:auto;scrollbar-gutter:stable;display:flex;flex-direction:column;gap:12px;padding:0 12px 24px}
.dsh-card{flex:none;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1)}
.dsh-card-head{position:sticky;top:0;z-index:1;display:flex;align-items:center;gap:10px;width:100%;padding:8px 12px;border:none;background:rgba(250,251,254,.96);border-radius:12px 12px 0 0;cursor:pointer;text-align:left;color:inherit;font:inherit}body[data-ds-dark-theme] .dsh-card-head{background:rgba(27,31,44,.96)}
.dsh-card-lead{display:grid;flex:none;place-items:center;color:var(--dsw-alias-label-tertiary)}
.dsh-card-title{flex:none;font:var(--dsw-font-xs-strong-13);color:var(--dsw-alias-label-primary)}
.dsh-card-progress{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-tertiary)}
.dsh-card-chevron{display:grid;flex:none;place-items:center;color:var(--dsw-alias-label-tertiary)}
.dsh-todo-list{display:flex;flex-direction:column;gap:8px;margin:0;padding:0 12px 10px;list-style:none;max-height:220px;overflow-y:auto}
.dsh-todo-item{display:flex;align-items:center;gap:10px;min-width:0;font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-secondary)}
.dsh-todo-glyph{flex:none;box-sizing:border-box;display:grid;place-items:center;width:14px;height:14px;border-radius:50%}
.dsh-todo-glyph[data-status=completed]{border:1.2px solid var(--dsw-alias-state-success-primary);color:var(--dsw-alias-state-success-primary)}
.dsh-todo-glyph[data-status=pending]{border:1.2px dashed var(--dsw-alias-label-caption);color:var(--dsw-alias-label-caption)}
.dsh-todo-glyph[data-status=in_progress]{border:1.2px solid transparent;border-top-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary);animation:dsh-todo-spin 1s linear infinite}
@keyframes dsh-todo-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.dsh-todo-glyph[data-status=in_progress]{animation:none}}
.dsh-todo-content{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-stats-body{display:flex;flex-direction:column;gap:14px;padding:10px 12px 12px}
.dsh-stat-group{display:flex;flex-direction:column;gap:6px}
.dsh-stat-group-title{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary)}
.dsh-stat-row{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.dsh-stat-key{font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-secondary)}
.dsh-stat-val{font:var(--dsw-font-xs-strong-13);color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;white-space:nowrap}
.dsh-context-bar{display:flex;height:4px;border-radius:2px;background:var(--dsw-alias-border-l1);overflow:hidden}.dsh-context-seg{display:block;height:100%;min-width:4px}.dsh-context-seg[data-part=system]{background:var(--dsw-static-neutral-bluish-400)}.dsh-context-seg[data-part=tools]{background:rgb(167,139,250)}.dsh-context-seg[data-part=messages]{background:var(--dsw-static-blue-450)}.dsh-context-seg[data-part=total]{background:var(--dsw-alias-state-business-primary)}

.dsh-breakdown{display:flex;flex-direction:column;gap:4px}
.dsh-breakdown-row{display:flex;align-items:baseline;justify-content:space-between;gap:12px;font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-secondary)}
.dsh-latency{display:flex;flex-direction:column;gap:4px}
.dsh-latency-title{font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-secondary)}
.dsh-latency-row{display:flex;align-items:center;gap:8px}
.dsh-latency-key{flex:none;width:30px;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary)}
.dsh-latency-bar{flex:1 1 auto;height:4px;border-radius:2px;background:var(--dsw-alias-border-l1);overflow:hidden}
.dsh-latency-fill{display:block;height:100%;border-radius:2px}
.dsh-latency-fill[data-level=avg]{background:var(--dsw-alias-state-success-primary)}
.dsh-latency-fill[data-level=p75]{background:var(--dsw-alias-state-warn-primary)}
.dsh-latency-fill[data-level=p99]{background:var(--dsw-alias-state-error-primary);opacity:.65}
.dsh-latency-fill[data-level=max]{background:var(--dsw-alias-state-error-primary)}.dsh-latency-fill[data-level=cache]{background:var(--dsw-alias-state-success-primary)}.dsh-latency-fill[data-level=in]{background:var(--dsw-alias-state-business-primary)}.dsh-latency-fill[data-level=out]{background:var(--dsw-alias-brand-primary)}
.dsh-latency-val{flex:none;width:56px;text-align:right;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;white-space:nowrap}
.dsh-goal-objective{min-width:0;font:var(--dsw-font-xs-13);line-height:18px;color:var(--dsw-alias-label-secondary);white-space:normal}.dsh-goal-phase{flex:none;padding:1px 7px;border-radius:999px;font:var(--dsw-font-xxs-strong-12);color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-bg-layer-2)}.dsh-pet-nest{flex:none;display:flex;align-items:center;justify-content:center;gap:8px;height:56px;margin:20px 20px 20px 12px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 -4px 12px rgba(15,23,42,.1);transition:height .35s ease,border-color .2s ease,background .2s ease,color .2s ease}body[data-ds-dark-theme] .dsh-pet-nest{box-shadow:0 -4px 12px rgba(0,0,0,.4)}border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xs-13);transition:border-color .2s ease,background .2s ease,color .2s ease}.dsh-pet-nest[data-hover=true]{border-color:var(--dsw-alias-state-business-primary);background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 10%,transparent);color:var(--dsw-alias-label-primary)}.dsh-pet-nest[data-docked=true]{border-style:solid;border-color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 8%,transparent)}.dsh-empty{padding:12px;font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-tertiary)}
.dsh-toggle-btn{display:flex;align-items:center;gap:6px;height:28px;padding:0 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xs-13);cursor:pointer}
.dsh-toggle-btn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}/* Global soft blue-violet wash over the whole page. */body{--dsw-alias-bg-base:linear-gradient(rgba(244,246,250,.62),rgba(244,246,250,.62)),url('/bg.png') center / cover no-repeat fixed;--dsw-alias-bg-layer-1:rgba(248,250,253,.45);--dsw-alias-bg-layer-2:rgba(238,242,250,.5);--dsw-specific-sidebar-fill:rgba(233,240,252,.2)}/* ChatGPT-style: long user messages collapse to the bubble; click to expand. */.dsh-msg-bubble.dsh-msg-foldable{position:relative;max-height:84px;overflow:hidden;cursor:pointer;transition:max-height .25s ease}.dsh-msg-bubble.dsh-msg-foldable::after{content:'';position:absolute;left:0;right:0;bottom:0;height:40px;pointer-events:none;background:linear-gradient(to bottom,transparent,color-mix(in srgb,var(--dsw-alias-bg-layer-1) 97%,transparent))}.dsh-msg-bubble.dsh-msg-foldable::before{content:'点击展开 ▾';position:absolute;right:8px;bottom:4px;z-index:1;padding:1px 7px;border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;pointer-events:none}.dsh-msg-bubble.dsh-msg-foldable:hover::before{color:var(--dsw-alias-label-secondary)}.dsh-msg-bubble.dsh-msg-expanded{max-height:none;overflow:visible;cursor:default}.dsh-msg-bubble.dsh-msg-expanded::after,.dsh-msg-bubble.dsh-msg-expanded::before{display:none}/* Ambient light: slow-drifting colored glow blobs over the whole page. */.dsh-ambient{position:fixed;inset:0;pointer-events:none;overflow:hidden}.dsh-ambient i{position:absolute;border-radius:50%;filter:blur(90px);opacity:.14;will-change:transform;transition:opacity .6s ease}.dsh-ambient i:nth-child(1){width:540px;height:540px;left:-140px;top:-100px;background:#5b8def;animation:dsh-glow-a 26s ease-in-out infinite alternate}.dsh-ambient i:nth-child(2){width:480px;height:480px;right:-120px;top:8%;background:#8b5cf6;animation:dsh-glow-b 32s ease-in-out infinite alternate}.dsh-ambient i:nth-child(3){width:440px;height:440px;left:28%;bottom:-180px;background:#22d3ee;animation:dsh-glow-c 38s ease-in-out infinite alternate}@keyframes dsh-glow-a{to{transform:translate(70px,50px) scale(1.18)}}@keyframes dsh-glow-b{to{transform:translate(-60px,70px) scale(1.12)}}@keyframes dsh-glow-c{to{transform:translate(50px,-60px) scale(1.22)}}body[data-ds-dark-theme] .dsh-ambient i{opacity:.22}.dsh-poked{animation:dsh-poke .5s ease}@keyframes dsh-poke{0%{transform:translateX(0)}30%{transform:translateX(9px)}60%{transform:translateX(-6px)}100%{transform:translateX(0)}}@media (prefers-reduced-motion:reduce){.dsh-ambient i{animation:none}}body[data-ds-dark-theme]{--dsw-alias-bg-base:linear-gradient(rgba(12,14,20,.6),rgba(12,14,20,.6)),url('/bg.png') center / cover no-repeat fixed;--dsw-alias-bg-layer-1:rgba(25,29,42,.45);--dsw-alias-bg-layer-2:rgba(32,37,52,.5);--dsw-specific-sidebar-fill:rgba(18,24,38,.2)}/* Docked pet: horizontal layout inside the nest — pet left, speech right. */[data-dsh-live2d-root].dsh-pet-docked{display:flex;flex-direction:row;align-items:center;gap:6px;justify-items:initial;width:306px}[data-dsh-live2d-root].dsh-pet-docked .dsh-live2d-stage{order:1;flex:none;width:140px;height:140px}[data-dsh-live2d-root].dsh-pet-docked .dsh-live2d-character{width:140px;height:140px}[data-dsh-live2d-root].dsh-pet-docked .dsh-live2d-bubble{order:2;flex:1 1 auto;min-width:0;width:auto;margin:0;border-radius:12px;transform:none;animation:none}[data-dsh-live2d-root].dsh-pet-docked .dsh-live2d-tools,[data-dsh-live2d-root].dsh-pet-docked .dsh-live2d-sessions{display:none}/* 2026-08-16: lift the pet above the better-sidebar workbench (z-50) so it stays clickable. The pet's own z-index only counts inside the overlay stacking context (z-20), so the overlay container itself must rise above the workbench. */[data-shell-overlay]{z-index:60!important}[data-dsh-live2d-root]{z-index:60!important}`;
		const tagId = "@dsh-user/ui-side-panel/styles";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-user/ui-side-panel";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}

		const TITLE_TODO = "任务清单";
		const TITLE_STATS = "会话详情";
		const CLOSE_LABEL = "关闭面板";
		const TOGGLE_LABEL = "任务面板";

		function formatTokens(n) {
			const scaled = v => (v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));
			if (n < 1000) return String(n);
			if (n < 1000000) return `${scaled(n / 1000)}K`;
			return `${scaled(n / 1000000)}M`;
		}

		function formatDuration(ms) {
			const s = ms / 1000;
			if (s < 60) return `${Math.round(s * 10) / 10}s`;
			const whole = Math.round(s);
			return `${Math.floor(whole / 60)}m${whole % 60}s`;
		}

		function formatTps(tps) {
			const clamped = Math.max(0, tps);
			return clamped >= 10 ? String(Math.round(clamped)) : String(Math.round(clamped * 10) / 10);
		}

		function billedInputTokens(usage) {
			return usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;
		}

		function progressLabel(list) {
			const done = list.filter(item => item.status === "completed").length;
			const active = list.filter(item => item.status === "in_progress").length;
			const pending = list.length - done - active;
			const parts = [];
			if (done > 0) parts.push(`${done} 已完成`);
			if (active > 0) parts.push(`${active} 进行中`);
			if (pending > 0) parts.push(`${pending} 待处理`);
			return parts.join(" · ");
		}

		// Per-step latency samples from the loaded window.
		function collectDurations(nodes) {
			const llm = [];
			const tool = [];
			const ttft = [];
			for (const node of nodes) {
				if (node.kind === "tool-result") {
					if (node.callTime !== null) tool.push(Math.max(0, node.time - node.callTime));
					continue;
				}
				if (node.kind !== "assistant") continue;
				const timing = node.timing;
				if (timing !== undefined && timing.stepStartTime !== null) {
					llm.push(Math.max(0, timing.completedTime - timing.stepStartTime));
					if (timing.firstTokenTime !== null) {
						ttft.push(Math.max(0, timing.firstTokenTime - timing.stepStartTime));
					}
				}
			}
			return { llm, tool, ttft };
		}

		// Nearest-rank percentile of a sorted sample; null when empty.
		function percentile(sorted, q) {
			if (sorted.length === 0) return null;
			const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q / 100 * sorted.length) - 1));
			return sorted[idx];
		}

		// avg / p75 / p99 / max over a sample; null when empty.
		function latencyStats(samples) {
			if (samples.length === 0) return null;
			const sorted = [...samples].sort((a, b) => a - b);
			const sum = sorted.reduce((acc, v) => acc + v, 0);
			return {
				avg: sum / sorted.length,
				p75: percentile(sorted, 75),
				p99: percentile(sorted, 99),
				max: sorted[sorted.length - 1],
				count: sorted.length,
			};
		}

		function Glyph({ status }) {
			const check = status === "completed"
				? React.createElement("svg", { width: 8, height: 8, viewBox: "0 0 8 8", fill: "none", "aria-hidden": true },
					React.createElement("path", { d: "M1.5 4l1.7 1.7L6.5 2.2", stroke: "currentColor", strokeWidth: "1.4", strokeLinecap: "round", strokeLinejoin: "round" }))
				: null;
			return React.createElement("span", { className: "dsh-todo-glyph", "data-status": status }, check);
		}

		function checklistIcon(size) {
			return React.createElement("svg", { width: size, height: size, viewBox: "0 0 14 14", fill: "none", "aria-hidden": true },
				React.createElement("rect", { x: "1.5", y: "1.5", width: "11", height: "11", rx: "2.5", stroke: "currentColor", strokeWidth: "1.2" }),
				React.createElement("path", { d: "M4.4 7.2l1.9 1.9 3.6-4", stroke: "currentColor", strokeWidth: "1.4", strokeLinecap: "round", strokeLinejoin: "round" }));
		}

		function chevronIcon(flipped) {
			return React.createElement("svg", { width: 12, height: 12, viewBox: "0 0 12 12", fill: "none", "aria-hidden": true, style: flipped ? { transform: "rotate(180deg)" } : undefined },
				React.createElement("path", { d: "M3 4.5L6 7.5L9 4.5", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }));
		}

		const GOAL_PHASE_LABELS = { active: "进行中", paused: "已暂停", blocked: "阻塞" };

		function GoalCard({ goal }) {
			const label = GOAL_PHASE_LABELS[goal.phase];
			const [collapsed, setCollapsed] = React.useState(false);
			return React.createElement("section", { className: "dsh-card", "aria-label": "目标" },
				React.createElement("button", {
					type: "button",
					className: "dsh-card-head",
					"aria-expanded": !collapsed,
					onClick: () => setCollapsed(v => !v),
				},
					React.createElement("span", { className: "dsh-card-lead" },
						React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 14 14", fill: "none", "aria-hidden": true },
							React.createElement("circle", { cx: "7", cy: "7", r: "5.6", stroke: "currentColor", strokeWidth: "1.2" }),
							React.createElement("circle", { cx: "7", cy: "7", r: "2.2", fill: "currentColor" }))),
					React.createElement("span", { className: "dsh-card-title" }, "目标"),
					label !== undefined && React.createElement("span", { className: "dsh-goal-phase" }, label),
					React.createElement("span", { className: "dsh-card-chevron" }, chevronIcon(collapsed))),
				!collapsed && React.createElement("div", { className: "dsh-stats-body", style: { paddingTop: "0" } },
					React.createElement("div", { className: "dsh-goal-objective" }, goal.objective)));
		}

		function TodoCard({ todos }) {
			const [collapsed, setCollapsed] = React.useState(false);
			return React.createElement("section", { className: "dsh-card", "aria-label": TITLE_TODO },
				React.createElement("button", {
					type: "button",
					className: "dsh-card-head",
					"aria-expanded": !collapsed,
					onClick: () => setCollapsed(v => !v),
				},
					React.createElement("span", { className: "dsh-card-lead" }, checklistIcon(14)),
					React.createElement("span", { className: "dsh-card-title" }, TITLE_TODO),
					React.createElement("span", { className: "dsh-card-progress" }, progressLabel(todos)),
					React.createElement("span", { className: "dsh-card-chevron" }, chevronIcon(collapsed))),
				!collapsed && React.createElement("ul", { className: "dsh-todo-list" },
					todos.map(item => React.createElement("li", { key: item.content, className: "dsh-todo-item" },
						React.createElement(Glyph, { status: item.status }),
						React.createElement("span", { className: "dsh-todo-content" }, item.content)))));
		}

		function StatRow({ label, value }) {
			return React.createElement("div", { className: "dsh-stat-row" },
				React.createElement("span", { className: "dsh-stat-key" }, label),
				React.createElement("span", { className: "dsh-stat-val" }, value));
		}

		/* One usage figure as a labeled colored bar (cache hit / input / output). */
		function UsageRow({ level, label, ratio, value }) {
			const width = ratio <= 0 ? 0 : Math.max(4, Math.min(100, Math.round(ratio * 100)));
			return React.createElement("div", { className: "dsh-latency-row" },
				React.createElement("span", { className: "dsh-latency-key", style: { width: "52px" } }, label),
				React.createElement("span", { className: "dsh-latency-bar" },
					React.createElement("span", { className: "dsh-latency-fill", "data-level": level, style: { width: `${width}%` } })),
				React.createElement("span", { className: "dsh-latency-val" }, value));
		}

		// One latency indicator as four colored rows: avg / p75 / p99 / max.
		function LatencyBlock({ title, stats }) {
			const rows = [
				{ key: "avg", level: "avg", value: stats.avg },
				{ key: "p75", level: "p75", value: stats.p75 },
				{ key: "p99", level: "p99", value: stats.p99 },
				{ key: "max", level: "max", value: stats.max },
			];
			return React.createElement("div", { className: "dsh-latency" },
				React.createElement("div", { className: "dsh-latency-title" }, `${title} (${stats.count})`),
				rows.map(row => {
					const width = stats.max <= 0 ? 0 : Math.max(4, Math.round(row.value / stats.max * 100));
					return React.createElement("div", { key: row.key, className: "dsh-latency-row" },
						React.createElement("span", { className: "dsh-latency-key" }, row.key),
						React.createElement("span", { className: "dsh-latency-bar" },
							React.createElement("span", { className: "dsh-latency-fill", "data-level": row.level, style: { width: `${width}%` } })),
						React.createElement("span", { className: "dsh-latency-val" }, formatDuration(row.value)));
				}));
		}

		function StatsCard({ usage, stats, pressure, breakdown, durations }) {
			const [collapsed, setCollapsed] = React.useState(false);
			const context = pressure === undefined || (pressure.projectedTokens ?? pressure.pressureTokens) === undefined || pressure.contextWindow === undefined
				? null
				: {
					percent: Math.min(100, Math.round((pressure.projectedTokens ?? pressure.pressureTokens) / pressure.contextWindow * 100)),
					used: pressure.projectedTokens ?? pressure.pressureTokens,
					window: pressure.contextWindow,
				};
			const billed = usage === undefined ? 0 : billedInputTokens(usage);
			const cacheHit = usage !== undefined && billed > 0
				? Math.round(usage.cacheReadTokens / billed * 100)
				: null;
			const llmStats = latencyStats(durations.llm);
			const toolStats = latencyStats(durations.tool);
			const ttftStats = latencyStats(durations.ttft);
			const hasAny = (stats !== undefined && stats.steps > 0)
				|| (usage !== undefined && (billed > 0 || usage.outputTokens > 0))
				|| context !== null
				|| llmStats !== null || toolStats !== null || ttftStats !== null;
			if (!hasAny) return null;

			const groups = [];
			// Context occupancy sits at the top of the panel.
			if (context !== null) {
				const breakdownTotal = breakdown === undefined
					? 0
					: breakdown.systemTokens + breakdown.toolsTokens + breakdown.messageTokens;
				const segments = breakdown !== undefined && breakdownTotal > 0
					? [
						{ part: "system", width: context.percent * breakdown.systemTokens / breakdownTotal },
						{ part: "tools", width: context.percent * breakdown.toolsTokens / breakdownTotal },
						{ part: "messages", width: context.percent * breakdown.messageTokens / breakdownTotal },
					].filter(seg => seg.width > 0)
					: [{ part: "total", width: context.percent }];
				const breakdownRows = breakdown === undefined
					? null
					: React.createElement("div", { className: "dsh-breakdown" },
						React.createElement("div", { className: "dsh-breakdown-row" }, React.createElement("span", null, "系统"), React.createElement("span", null, `~${formatTokens(breakdown.systemTokens)}`)),
						React.createElement("div", { className: "dsh-breakdown-row" }, React.createElement("span", null, "工具"), React.createElement("span", null, `~${formatTokens(breakdown.toolsTokens)}`)),
						React.createElement("div", { className: "dsh-breakdown-row" }, React.createElement("span", null, "消息"), React.createElement("span", null, `~${formatTokens(breakdown.messageTokens)}`)));
				groups.push(React.createElement("div", { key: "ctx", className: "dsh-stat-group" },
					React.createElement("div", { className: "dsh-stat-group-title" }, "上下文"),
					React.createElement(StatRow, { label: "占用", value: `${context.percent}% · ~${formatTokens(context.used)} / ${formatTokens(context.window)}` }),
					React.createElement("div", { className: "dsh-context-bar" },
						segments.map(seg => React.createElement("div", { key: seg.part, className: "dsh-context-seg", "data-part": seg.part, style: { width: `${seg.width}%` } }))),
					breakdownRows));
			}
			if (stats !== undefined && stats.steps > 0) {
				groups.push(React.createElement("div", { key: "progress", className: "dsh-stat-group" },
					React.createElement("div", { className: "dsh-stat-group-title" }, "进度"),
					React.createElement(StatRow, { label: "轮次 · 步数", value: `${stats.turns} 轮 · ${stats.steps} 步` })));
			}
			if (usage !== undefined && (billed > 0 || usage.outputTokens > 0)) {
				const total = billed + usage.outputTokens;
				const rows = [];
				if (cacheHit !== null) rows.push(React.createElement(UsageRow, { key: "cache", level: "cache", label: "缓存命中", ratio: cacheHit / 100, value: `${cacheHit}%` }));
				if (billed > 0) rows.push(React.createElement(UsageRow, { key: "in", level: "in", label: "输入", ratio: billed / total, value: formatTokens(billed) }));
				if (usage.outputTokens > 0) rows.push(React.createElement(UsageRow, { key: "out", level: "out", label: "输出", ratio: usage.outputTokens / total, value: formatTokens(usage.outputTokens) }));
				groups.push(React.createElement("div", { key: "usage", className: "dsh-stat-group" },
					React.createElement("div", { className: "dsh-stat-group-title" }, "用量"), rows));
			}

			const latencyBlocks = [];
			if (llmStats !== null) latencyBlocks.push(React.createElement(LatencyBlock, { key: "llm", title: "模型耗时", stats: llmStats }));
			if (toolStats !== null) latencyBlocks.push(React.createElement(LatencyBlock, { key: "tool", title: "工具耗时", stats: toolStats }));
			if (ttftStats !== null) latencyBlocks.push(React.createElement(LatencyBlock, { key: "ttft", title: "TTFT", stats: ttftStats }));
			if (latencyBlocks.length > 0) {
				groups.push(React.createElement("div", { key: "latency", className: "dsh-stat-group" },
					React.createElement("div", { className: "dsh-stat-group-title" }, "耗时"), latencyBlocks));
			}
			if (stats !== undefined && stats.decodeMs > 0) {
				groups.push(React.createElement("div", { key: "perf", className: "dsh-stat-group" },
					React.createElement("div", { className: "dsh-stat-group-title" }, "性能"),
					React.createElement(StatRow, { label: "解码速度", value: `${formatTps(stats.decodeTokens / (stats.decodeMs / 1000))} tok/s` })));
			}
			return React.createElement("section", { className: "dsh-card", "aria-label": TITLE_STATS },
				React.createElement("button", {
					type: "button",
					className: "dsh-card-head",
					"aria-expanded": !collapsed,
					onClick: () => setCollapsed(v => !v),
				},
					React.createElement("span", { className: "dsh-card-lead" },
						React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 14 14", fill: "none", "aria-hidden": true },
							React.createElement("path", { d: "M2 3.5h10M2 7h10M2 10.5h6", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round" }),
							React.createElement("circle", { cx: "11.5", cy: "10.5", r: "1.6", stroke: "currentColor", strokeWidth: "1.2" }))),
					React.createElement("span", { className: "dsh-card-title" }, TITLE_STATS),
					React.createElement("span", { className: "dsh-card-chevron" }, chevronIcon(collapsed))),
				!collapsed && React.createElement("div", { className: "dsh-stats-body" }, groups));
		}

		// Shared roam control: SidePanel (pet grabbing) and the apply-scoped
		// walk timer both toggle this, so it must live at factory scope.
		// suppressUntil parks the pet for a while after being grabbed so it
		// never "vanishes" right after the user lets go.
		const ROAM_COOLDOWN = 60000;
		const roamState = { enabled: true, suppressUntil: 0 };

		// Boot self-heal: a drag position that clearly falls outside the viewport
		// (the pet would be invisible and unclickable) is reset to the default
		// spot; ordinary positions are left untouched.
		try {
			const petPos = JSON.parse(window.localStorage?.getItem("deepseek-pet:position") || "null");
			if (petPos !== null && (Math.abs(petPos.x) > window.innerWidth * 2 || Math.abs(petPos.y) > window.innerHeight * 2)) {
				window.localStorage?.removeItem("deepseek-pet:position");
			}
		} catch { /* malformed storage is ignored */ }


		// Pure body assembly shared by the details-column SidePanel and the
		// BetterSidebar tab: goal card + todo card + stats card (latency
		// blocks only render when `durations` carries samples).
		function PanelBody({ goal, todos, usage, stats, pressure, breakdown, durations }) {
			const goalCard = goal?.goal !== undefined && goal.goal !== null && goal.goal.phase !== "complete"
				? React.createElement(GoalCard, { goal: goal.goal })
				: null;
			const hasTodo = todos.length > 0;
			const statsCard = React.createElement(StatsCard, { usage, stats, pressure, breakdown, durations });
			const todoCard = hasTodo ? React.createElement(TodoCard, { todos }) : null;
			const hasAny = goalCard !== null || hasTodo || statsCard !== null;
			return hasAny
				? React.createElement("div", { className: "dsh-side-body" }, goalCard, todoCard, statsCard)
				: React.createElement("div", { className: "dsh-side-body" },
					React.createElement("div", { className: "dsh-empty" }, "暂无任务与统计"));
		}

		function SidePanel(props) {
			const sessionId = props.sessionId;
			const row = props.useSessions(s => s.byId[sessionId]);
			const todos = Array.isArray(row?.projectionValues?.todos) ? row.projectionValues.todos : [];
			const nodes = props.useSession(s => s.chat.legacy.nodes);
			const durations = collectDurations(nodes);
			const goal = props.useProjection("goal");
			const usage = props.useProjection("tokenUsage");
			const stats = props.useProjection("sessionStats");
			const pressure = props.useProjection("contextPressure");
			const breakdown = props.useProjection("contextBreakdown");
			React.useEffect(() => {
				if (sessionId !== undefined) props.openDetails();
			}, [sessionId]);

			// The sidebar column keeps its translucent wash (a backdrop-filter
			// here would turn it into a containing block and crush the
			// fixed-position settings panel into the column).

			// ChatGPT-style collapse: long user bubbles fold; clicking the bubble expands.
			React.useEffect(() => {
				// Walk down the "richest text child" chain to the message bubble
				// (flowItem > wrap > userRow > userStack > bubble), then up to the
				// nearest block DIV so max-height applies.
				const bubbleOf = (row) => {
					let el = row;
					for (let i = 0; i < 6; i++) {
						const kids = [...el.children].filter(k => k.textContent.trim().length > 0);
						if (kids.length === 0) break;
						const richest = kids.reduce((a, b) => (b.textContent.trim().length > a.textContent.trim().length ? b : a));
						el = richest;
					}
					let node = el;
					while (node !== null && node.tagName !== "DIV") node = node.parentElement;
					return node;
				};
				const processRow = (row) => {
					if (row.getAttribute("data-chat-flow-kind") !== "user") return;
					const bubble = bubbleOf(row);
					if (bubble === null || bubble.dataset.msgFolded === "1") return;
					bubble.dataset.msgFolded = "1";
					// Fold by height (~4 lines), not character count.
					if (bubble.scrollHeight > 96) {
						bubble.classList.add("dsh-msg-bubble", "dsh-msg-foldable");
					}
				};
				const scan = () => {
					document.querySelectorAll('[data-chat-flow-kind="user"]').forEach(processRow);
				};
				const onClick = (e) => {
					const row = e.target.closest ? e.target.closest('[data-chat-flow-kind="user"]') : null;
					if (row === null) return;
					const bubble = bubbleOf(row);
					if (bubble !== null && bubble.classList.contains("dsh-msg-foldable") && bubble.contains(e.target)) {
						bubble.classList.toggle("dsh-msg-expanded");
					}
				};
				scan();
				const observer = new MutationObserver(scan);
				observer.observe(document.body, { childList: true, subtree: true });
				document.addEventListener("click", onClick);
				return () => {
					observer.disconnect();
					document.removeEventListener("click", onClick);
				};
			}, []);

			// Pet dock: when the deepseek-pet is genuinely dragged (moved more than a
			// few px) over/into this panel, glide it into a nest at the panel foot.
			const [dockHover, setDockHover] = React.useState(false);
			const [docked, setDocked] = React.useState(false);
			const dragRef = React.useState({ down: false, x: 0, y: 0, moved: false })[0];
			const dockedRef = React.useState({ v: false })[0];
			React.useEffect(() => {
				const panelEl = () => document.querySelector(".dsh-side-panel");
				const petEl = () => document.querySelector("[data-dsh-live2d-root]");
				const overlaps = () => {
					const p = panelEl(), k = petEl();
					if (p === null || k === null) return false;
					const pr = p.getBoundingClientRect(), kr = k.getBoundingClientRect();
					return kr.left < pr.right && kr.right > pr.left && kr.top < pr.bottom && kr.bottom > pr.top;
				};
				const onDown = (e) => {
					const k = petEl();
					if (k !== null && k.contains(e.target)) {
						dragRef.down = true;
						dragRef.x = e.clientX;
						dragRef.y = e.clientY;
						dragRef.moved = false;
					roamState.enabled = false;
					roamState.suppressUntil = Date.now() + ROAM_COOLDOWN;
						// Leaving the nest: drop the inline transform so the pet's own
						// variable-driven positioning takes over again, and restore the
						// original stacked layout and collapsed nest height.
						// Hand the current (possibly roaming) position to the pet's own
						// variables so grabbing it never jumps back to an old spot.
						const m = new DOMMatrix(getComputedStyle(k).transform);
						k.style.setProperty("--pet-drag-x", `${m.m41}px`);
						k.style.setProperty("--pet-drag-y", `${m.m42}px`);
						k.style.transform = "";
						k.style.transition = "";
						k.classList.remove("dsh-pet-docked");
						const nest = document.querySelector(".dsh-pet-nest");
						if (nest !== null) nest.style.height = "";
						if (dockedRef.v) {
							dockedRef.v = false;
							setDocked(false);
						}
					}
				};
				const onMove = (e) => {
					if (dragRef.down && !dragRef.moved) {
						if (Math.hypot(e.clientX - dragRef.x, e.clientY - dragRef.y) > 6) dragRef.moved = true;
					}
					const ov = overlaps();
					setDockHover(ov && dragRef.down);
					setDocked(d => d && ov);
				};
				const onUp = () => {
					const wasDown = dragRef.down;
					const wasMoved = dragRef.moved;
					dragRef.down = false;
					// Only a release that follows a press ON the pet (dragRef.down)
					// touches the roam cooldown; arbitrary page clicks elsewhere
					// must never keep parking the pet (they used to refresh the
					// 60s cooldown forever while the user was active).
					if (wasDown) {
						roamState.enabled = true;
						roamState.suppressUntil = Date.now() + ROAM_COOLDOWN;
					}
					setDockHover(false);
					if (!wasDown) return;
					// Expanding/collapsing scales the pet around its bottom-right
					// corner, so a double-click can shove most of it off-screen.
					// A delayed check after the release brings it back in view
					// (this runs after deepseek-pet's own dblclick handler).
					window.setTimeout(() => {
						const k2 = petEl();
						if (k2 === null) return;
						const kr = k2.getBoundingClientRect();
						const margin = 16;
						if (kr.top < margin || kr.left < margin || kr.bottom > window.innerHeight - margin || kr.right > window.innerWidth - margin) {
							const m2 = new DOMMatrix(getComputedStyle(k2).transform);
							const lx = kr.left - m2.m41;
							const ly = kr.top - m2.m42;
							const tx = 520 + kr.width / 2 - lx;
							const ty = 280 + kr.height / 2 - ly;
							k2.style.transition = "transform .5s ease";
							k2.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
							window.setTimeout(() => { k2.style.transition = ""; }, 600);
						}
					}, 350);
					if (!wasMoved) return;
					if (!overlaps()) return;
					const p = panelEl(), k = petEl();
					if (p === null || k === null) return;
					const pr = p.getBoundingClientRect(), kr = k.getBoundingClientRect();
					// Dock into the nest center (112px above the panel foot). The large
					// mode switches to the horizontal in-nest layout (pet left, speech
					// right) with no transform scaling; the minimized pet stays as-is.
					const minimized = k.getAttribute("data-collapsed") === "true";
					const m = new DOMMatrix(getComputedStyle(k).transform);
					const dkr = k.getBoundingClientRect();
					const layoutRight = dkr.right - m.m41;
					const layoutBottom = dkr.bottom - m.m42;
					const x = pr.left + pr.width / 2 + dkr.width / 2 - layoutRight;
					const nest = document.querySelector(".dsh-pet-nest");
					if (minimized) {
						// The tiny pet sits on the collapsed 56px nest; nothing expands.
						const y = pr.bottom - 40 + dkr.height / 2 - layoutBottom;
						k.style.transform = `translate3d(${x}px, ${y}px, 0)`;
						if (nest !== null) nest.style.height = "";
					} else {
						// Large mode switches to the horizontal layout and the nest
						// expands to the pet's height plus breathing room; with the
						// nest center tracking the pet center, the offset cancels out.
						k.classList.add("dsh-pet-docked");
						const y = pr.bottom - 24 - layoutBottom;
						k.style.transform = `translate3d(${x}px, ${y}px, 0)`;
						if (nest !== null) nest.style.height = `${Math.min(dkr.height + 24, 164)}px`;
					}
					k.style.transition = "transform .55s cubic-bezier(.2,.8,.25,1.2)";
					window.setTimeout(() => { k.style.transition = ""; }, 650);
					dockedRef.v = true;
					setDocked(true);
				};
				document.addEventListener("pointerdown", onDown);
				document.addEventListener("pointermove", onMove);
				document.addEventListener("pointerup", onUp);
				return () => {
					document.removeEventListener("pointerdown", onDown);
					document.removeEventListener("pointermove", onMove);
					document.removeEventListener("pointerup", onUp);
				};
			}, []);

			const closeBtn = React.createElement("button", {
				type: "button",
				className: "dsh-side-close",
				"aria-label": CLOSE_LABEL,
				onClick: () => props.closeDetails(),
			},
				React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 16 16", fill: "none", "aria-hidden": true },
					React.createElement("path", { d: "M4 4l8 8M12 4l-8 8", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" })));

			const body = React.createElement(PanelBody, { goal, todos, usage, stats, pressure, breakdown, durations });

			return React.createElement("aside", { className: "dsh-side-panel" },
				React.createElement("div", { className: "dsh-side-header" },
					React.createElement("span", { className: "dsh-side-title" }, row?.displayTitle ?? "会话面板"),
					closeBtn),
				body,
				React.createElement("div", { className: "dsh-pet-nest", "data-hover": dockHover || undefined, "data-docked": docked || undefined },
					React.createElement("span", null, docked ? "🐋 鲸鱼娘在窝里" : dockHover ? "🐋 拖到这里安家" : "🐋 宠物窝")));
		}

		function PanelToggle(props) {
			return React.createElement("button", {
				type: "button",
				className: "dsh-toggle-btn",
				onClick: () => props.openDetails(),
			},
				React.createElement("span", { style: { display: "grid", placeItems: "center" } }, checklistIcon(14)),
				React.createElement("span", null, TOGGLE_LABEL));
		}

		// BetterSidebar tab surface (dsh-better-sidebar): renders the same
		// task panel inside the new right-side workbench. The tab component
		// receives TabComponentProps { ctx, store, scope, tab, visible }; all
		// panel data comes from the session list feed's projectionValues
		// (goal/todos/tokenUsage/sessionStats/contextPressure/contextBreakdown)
		// — the same host-computed projection values the details column reads
		// through useProjection. Latency percentiles (llm/tool/ttft) derive
		// from the chat node window, which this surface has no seat for, so
		// the host half serves them over /ui-side-panel/stats and this tab
		// polls that route while visible. The pet nest drag-to-dock behaves
		// exactly like the details column's.
		function SidePanelTab(props) {
			const ctx = props.ctx;
			const sessionId = props.scope.sessionId;
			const list = React.useSyncExternalStore(
				(cb) => ctx.sessions.list.subscribe(cb),
				() => ctx.sessions.list.getSnapshot(),
			);
			const row = list.byId[sessionId];
			const values = row?.projectionValues;
			const todos = Array.isArray(values?.todos) ? values.todos : [];
			const goal = values?.goal;
			const usage = values?.tokenUsage;
			const stats = values?.sessionStats;
			const pressure = values?.contextPressure;
			const breakdown = values?.contextBreakdown;
			// Latency samples from the host route; poll while visible, pause
			// when the tab is hidden or the session switches.
			const [durations, setDurations] = React.useState({ llm: [], tool: [], ttft: [] });
			React.useEffect(() => {
				if (!props.visible || sessionId === undefined) return;
				let cancelled = false;
				const load = () => {
					fetch(`/ui-side-panel/stats?sessionId=${encodeURIComponent(sessionId)}`)
						.then((r) => r.ok ? r.json() : null)
						.then((d) => { if (!cancelled && d !== null && Array.isArray(d.llm)) setDurations(d); })
						.catch(() => { /* transient: keep the last samples */ });
				};
				load();
				const timer = setInterval(load, 3000);
				return () => { cancelled = true; clearInterval(timer); };
			}, [sessionId, props.visible]);

			// Pet nest + drag-to-dock (mirrors the details column): dragging
			// the deepseek-pet over the panel foot nests it in place.
			const [dockHover, setDockHover] = React.useState(false);
			const [docked, setDocked] = React.useState(false);
			const dragRef = React.useState({ down: false, x: 0, y: 0, moved: false })[0];
			const dockedRef = React.useState({ v: false })[0];
			React.useEffect(() => {
				const panelEl = () => document.querySelector(".dsh-side-panel");
				const petEl = () => document.querySelector("[data-dsh-live2d-root]");
				const overlaps = () => {
					const p = panelEl(), k = petEl();
					if (p === null || k === null) return false;
					const pr = p.getBoundingClientRect(), kr = k.getBoundingClientRect();
					return kr.left < pr.right && kr.right > pr.left && kr.top < pr.bottom && kr.bottom > pr.top;
				};
				const onDown = (e) => {
					const k = petEl();
					if (k !== null && k.contains(e.target)) {
						dragRef.down = true;
						dragRef.x = e.clientX;
						dragRef.y = e.clientY;
						dragRef.moved = false;
						const m = new DOMMatrix(getComputedStyle(k).transform);
						k.style.setProperty("--pet-drag-x", `${m.m41}px`);
						k.style.setProperty("--pet-drag-y", `${m.m42}px`);
						k.style.transform = "";
						k.style.transition = "";
						k.classList.remove("dsh-pet-docked");
						const nest = document.querySelector(".dsh-pet-nest");
						if (nest !== null) nest.style.height = "";
						if (dockedRef.v) {
							dockedRef.v = false;
							setDocked(false);
						}
					}
				};
				const onMove = (e) => {
					if (dragRef.down && !dragRef.moved) {
						if (Math.hypot(e.clientX - dragRef.x, e.clientY - dragRef.y) > 6) dragRef.moved = true;
					}
					const ov = overlaps();
					setDockHover(ov && dragRef.down);
					setDocked(d => d && ov);
				};
				const onUp = () => {
					const wasDown = dragRef.down;
					const wasMoved = dragRef.moved;
					dragRef.down = false;
					setDockHover(false);
					if (!wasDown || !wasMoved || !overlaps()) return;
					const p = panelEl(), k = petEl();
					if (p === null || k === null) return;
					const pr = p.getBoundingClientRect(), kr = k.getBoundingClientRect();
					const minimized = k.getAttribute("data-collapsed") === "true";
					const m = new DOMMatrix(getComputedStyle(k).transform);
					const dkr = k.getBoundingClientRect();
					const layoutRight = dkr.right - m.m41;
					const layoutBottom = dkr.bottom - m.m42;
					const x = pr.left + pr.width / 2 + dkr.width / 2 - layoutRight;
					const nest = document.querySelector(".dsh-pet-nest");
					if (minimized) {
						const y = pr.bottom - 40 + dkr.height / 2 - layoutBottom;
						k.style.transform = `translate3d(${x}px, ${y}px, 0)`;
						if (nest !== null) nest.style.height = "";
					} else {
						k.classList.add("dsh-pet-docked");
						const y = pr.bottom - 24 - layoutBottom;
						k.style.transform = `translate3d(${x}px, ${y}px, 0)`;
						if (nest !== null) nest.style.height = `${Math.min(dkr.height + 24, 164)}px`;
					}
					k.style.transition = "transform .55s cubic-bezier(.2,.8,.25,1.2)";
					window.setTimeout(() => { k.style.transition = ""; }, 650);
					dockedRef.v = true;
					setDocked(true);
				};
				document.addEventListener("pointerdown", onDown);
				document.addEventListener("pointermove", onMove);
				document.addEventListener("pointerup", onUp);
				return () => {
					document.removeEventListener("pointerdown", onDown);
					document.removeEventListener("pointermove", onMove);
					document.removeEventListener("pointerup", onUp);
				};
			}, []);

			return React.createElement("aside", { className: "dsh-side-panel" },
				React.createElement("div", { className: "dsh-side-header" },
					React.createElement("span", { className: "dsh-side-title" }, row?.displayTitle ?? TOGGLE_LABEL)),
				React.createElement(PanelBody, { goal, todos, usage, stats, pressure, breakdown, durations }),
				React.createElement("div", { className: "dsh-pet-nest", "data-hover": dockHover || undefined, "data-docked": docked || undefined },
					React.createElement("span", null, docked ? "🐋 鲸鱼娘在窝里" : dockHover ? "🐋 拖到这里安家" : "🐋 宠物窝")));
		}

		const inject = ["slots", "layout", "betterSidebar"];

		function apply(ctx) {

			// Register the task panel as a BetterSidebar tab (the new right-side
			// workbench): id 'ui-side-panel', single instance, order 60 (after
			// browser at 50). The disposer rides the fiber so updates/HMR never
			// leak a second registration.
			ctx.effect(() => {
				const dispose = ctx.betterSidebar.registerTab({
					id: "ui-side-panel",
					title: TOGGLE_LABEL,
					icon: (size) => checklistIcon(size),
					order: 60,
					single: true,
					component: SidePanelTab,
				});
				// Fresh sessions default to the task panel instead of Explorer:
				// only when the pane is still the untouched single-Explorer-tab
				// state (the user never picked anything else) do we activate our
				// own tab. Manual selections are left alone.
				try {
					const snap = ctx.betterSidebar.getSnapshot?.();
					const splits = snap?.splits;
					if (splits !== null && typeof splits === "object" && splits.kind === "leaf") {
						const tabs = Array.isArray(splits.tabs) ? splits.tabs : [];
						const active = tabs.find(t => t !== null && t.id === splits.active);
						if (tabs.length === 1 && active?.type === "explorer") {
							ctx.betterSidebar.openTab?.({ id: "ui-side-panel", type: "ui-side-panel", title: TOGGLE_LABEL });
						}
					}
				} catch {
					// the registry may not expose getSnapshot/openTab in older versions
				}
				return dispose;
			}, "ui-side-panel: better-sidebar tab");

			// Session notifier: watch every session's running flag and pending
			// interaction, reporting to the Electron shell (window.dshApp) which
			// shows an always-on-top card in the top-right corner:
			//   - a session that finishes running ("会话完成"),
			//   - a session that starts waiting on the user ("需要你处理").
			// The first pass only builds the baseline so already-finished or
			// already-waiting sessions never re-fire.
		ctx.effect(() => {
			const list = ctx.get("sessions")?.list;
			if (list === undefined) return () => {};
			const WAIT_LABELS = { approval: "等待审批", "plan-review": "计划待审", question: "等待回答" };
			const prev = new Map();
			let baseline = false;
			const notify = (payload) => {
				if (typeof window !== "undefined" && typeof window.dshApp?.notifyTaskDone === "function") {
					window.dshApp.notifyTaskDone(payload);
				}
			};
			const check = () => {
				const snapshot = list.getSnapshot();
				for (const [id, row] of Object.entries(snapshot.byId)) {
					const running = row?.running === true;
					const waiting = row?.pendingInteraction;
					const before = prev.get(id) ?? {};
					const wasRunning = before.running === true;
					const wasWaiting = before.waiting;
					prev.set(id, { running, waiting });
					if (!baseline) continue;
					const title = row?.displayTitle ?? "会话";
					// A session that pauses to wait on the user is NOT finished:
					// only a stop without a pending interaction counts as done.
					if (wasRunning && !running && waiting === undefined) {
						notify({ sessionId: id, sessionTitle: title, task: `会话完成：${title}`, at: Date.now() });
					}
					if (wasWaiting === undefined && waiting !== undefined) {
						const label = WAIT_LABELS[waiting] ?? "等待操作";
						notify({ sessionId: id, sessionTitle: title, task: `需要你处理：${title}（${label}）`, at: Date.now() });
					}
				}
			};
			check();
			baseline = true;
			const off = list.subscribe(check);
			return off;
		}, "ui-side-panel: session notifier");

			// Background rotation: cycle through the downloaded wallpapers.
		ctx.effect(() => {
			const images = ["/bg.png", "/chatgpt-1.png", "/chatgpt-2.png", "/chatgpt-3.png",
				"/chatgpt-4.png", "/chatgpt-5.png", "/chatgpt-6.png", "/chatgpt-7.png"];
			images.forEach(src => { const im = new Image(); im.src = src; });
			let idx = 1;
			const rotate = () => {
				const src = images[idx % images.length];
				idx += 1;
				const dark = document.body.getAttribute("data-ds-dark-theme") !== null;
				const veil = dark ? "rgba(12,14,20,.6),rgba(12,14,20,.6)" : "rgba(244,246,250,.62),rgba(244,246,250,.62)";
				document.body.style.setProperty("--dsw-alias-bg-base", `linear-gradient(${veil}),url('${src}') center / cover no-repeat fixed`);
			};
			const timer = setInterval(rotate, 60000);

			// Pet roam: wander the content area, nudging nearby elements.
			const petEl = () => document.querySelector("[data-dsh-live2d-root]");
			const visiblePanel = () => {
				for (const p of document.querySelectorAll(".dsh-side-panel")) {
					if (p.getBoundingClientRect().width > 0) return p;
				}
				return null;
			};
			const roamArea = () => {
				// Roam the whole content area INCLUDING the right sidebar column,
				// so the pet can wander onto the panel and near its nest. A
				// hidden (zero-width) panel must not collapse the area to nothing.
				const pr = visiblePanel()?.getBoundingClientRect();
				const right = pr === undefined || pr.width <= 0 ? window.innerWidth - 80 : pr.right - 20;
				return { left: 300, right, top: 90, bottom: window.innerHeight - 220 };
			};
			const walk = () => {
				const k = petEl();
				// Watchdog: a grab whose pointerup was lost can leave roaming
				// disabled forever. Once the cooldown has expired and the pet is
				// not docked, recover automatically instead of staying parked.
				if (k !== null && !roamState.enabled && Date.now() >= roamState.suppressUntil && !k.classList.contains("dsh-pet-docked")) {
					roamState.enabled = true;
				}
				if (k === null || !roamState.enabled || Date.now() < roamState.suppressUntil || k.classList.contains("dsh-pet-docked")) return;

				const kr = k.getBoundingClientRect();
				const area = roamArea();
				if (area.right <= area.left) return;
				// Keep the pet's whole body inside the content area.
				const topLimit = area.top + kr.height / 2;
				const bottomLimit = area.bottom - kr.height / 2;
				// Walk in small steps near the current spot so roaming reads as a
				// stroll instead of teleporting to a random far corner. A pet left
				// fully outside the area (e.g. dropped on the panel) strolls back
				// toward the middle instead of freezing at the boundary.
				const cx = kr.left + kr.width / 2;
				const cy = kr.top + kr.height / 2;
				const step = 150;
				const outside = kr.left > area.right || kr.right < area.left || kr.top > area.bottom || kr.bottom < area.top;
				const tx = outside ? (area.left + area.right) / 2 : Math.min(area.right, Math.max(area.left, cx + (Math.random() * 2 - 1) * step));
				const ty = outside ? (topLimit + bottomLimit) / 2 : Math.min(bottomLimit, Math.max(topLimit, cy + (Math.random() * 2 - 1) * step));
				const m = new DOMMatrix(getComputedStyle(k).transform);
				const x = tx + kr.width / 2 - (kr.right - m.m41);
				const y = ty + kr.height / 2 - (kr.bottom - m.m42);
				k.style.transition = "transform 2s cubic-bezier(.2,.8,.2,1)";
				k.style.transform = `translate3d(${x}px, ${y}px, 0)`;
				window.setTimeout(() => {
					if (k.style.transform.includes("translate3d")) k.style.transition = "";
				}, 2200);
			};
			// Roam restored (2026-08-16): the earlier grab-vs-walk fights are fixed
			// at the source (shared roamState, release cooldown, small local steps,
			// in-area clamping), so the 6s stroll timer is safe to run again.
			const roamTimer = setInterval(walk, 6000);
			// Poke: when the pet drifts near a card, message, or the nest, give it a nudge.
			const poked = new Set();
			const pokeTimer = setInterval(() => {
				const k = petEl();
				if (k === null) return;
				const kr = k.getBoundingClientRect();
				const pcx = kr.left + kr.width / 2, pcy = kr.top + kr.height / 2;
				const targets = document.querySelectorAll("[data-chat-flow-kind], .dsh-card, .dsh-pet-nest");
				for (const el of targets) {
					if (poked.has(el)) continue;
					const r = el.getBoundingClientRect();
					if (Math.hypot(pcx - (r.left + r.width / 2), pcy - (r.top + r.height / 2)) < 100) {
						poked.add(el);
						el.classList.add("dsh-poked");
						window.setTimeout(() => {
							el.classList.remove("dsh-poked");
							poked.delete(el);
						}, 900);
					}
				}
			}, 800);
			return () => { clearInterval(timer); clearInterval(roamTimer); clearInterval(pokeTimer); };
		}, "ui-side-panel: bg rotation");

		// Remove the inline todo strip from above the composer.
			ctx.slots.inject("conversation.input.dock", () => ctx.slots.register(
				{ name: "conversation.input.dock", id: "todo", priority: -1 },
				() => null,
			));

			// Remove the goal strip from above the composer; it moves into the panel.
			ctx.slots.inject("conversation.input.dock", () => ctx.slots.register(
				{ name: "conversation.input.dock", id: "goal", priority: -1 },
				() => null,
			));

			// Remove the stats line under the composer card; it moves into the panel.
			ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register(
				{ name: "conversation.composer.dock", id: "stats", priority: -1 },
				() => null,
			));

			// The right side is now the BetterSidebar workbench alone: the
			// original details column (todos + session stats) is removed
			// entirely — the embedded panel and its reopen toggle are gone,
			// and the column container itself is hidden by CSS below.

		// Ambient light layer: drifting glow blobs over the whole page.
		function AmbientLayer() {
			return React.createElement("div", { className: "dsh-ambient", "aria-hidden": true },
				React.createElement("i", null), React.createElement("i", null), React.createElement("i", null));
		}
		ctx.slots.inject("shell.overlay", () => ctx.slots.register(
			{ name: "shell.overlay", id: "ambient-glow", order: 0 },
			AmbientLayer,
		));
		}

		exports.inject = inject;
		exports.apply = apply;
		return module.exports;
	}
});
