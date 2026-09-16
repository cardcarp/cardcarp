import { At as onActivated, Bt as onUnmounted, H as cloneVNode, Ht as openBlock, It as onMounted, K as createBlock, Mt as onBeforeUnmount, Nt as onBeforeUpdate, Ot as mergeProps, Pt as onDeactivated, Qt as resolveDynamicComponent, Sn as withCtx, St as inject, Vt as onUpdated, W as computed, Wt as provide, Yt as renderSlot, _n as watch, cn as useAttrs, dt as getCurrentInstance, er as toRefs, et as createTextVNode, i as TransitionGroup, k as Comment, kt as nextTick, lr as toDisplayString, mt as h, qn as ref, r as Transition, rr as unref, rt as defineComponent, tr as toValue, vn as watchEffect, zn as isRef } from "./vue.runtime.esm-bundler-BXQa1jvq.js";
import { isDef, unrefElement, useMediaQuery } from "./vitepress_n_@vueuse_core.js";
//#region ../../node_modules/motion-v/dist/es/utils/createContext.mjs
function createContext(providerComponentName, contextName) {
	const symbolDescription = typeof providerComponentName === "string" && !contextName ? `${providerComponentName}Context` : contextName;
	const injectionKey = Symbol(symbolDescription);
	const injectContext = (fallback) => {
		const context = inject(injectionKey, fallback);
		if (context === void 0) throw new Error(`Injection \`${injectionKey.toString()}\` not found. Component must be used within ${Array.isArray(providerComponentName) ? `one of the following components: ${providerComponentName.join(", ")}` : `\`${providerComponentName}\``}`);
		return context;
	};
	const provideContext = (contextValue) => {
		provide(injectionKey, contextValue);
		return contextValue;
	};
	return [
		injectContext,
		provideContext,
		injectionKey
	];
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/utils/resolve-motion-props.mjs
function resolveMotionProps(props, context) {
	const { layoutGroup, presenceContext, config } = context;
	const layoutId = layoutGroup.id && props.layoutId ? `${layoutGroup.id}-${props.layoutId}` : props.layoutId || void 0;
	return {
		...props,
		layoutId,
		transition: props.transition ?? config.transition,
		layoutGroup,
		motionConfig: config,
		inViewOptions: props.inViewOptions ?? config.inViewOptions,
		presenceContext,
		initial: presenceContext.initial === false ? presenceContext.initial : props.initial === true ? void 0 : props.initial
	};
}
//#endregion
//#region ../../node_modules/motion-utils/dist/es/array.mjs
function addUniqueItem(arr, item) {
	if (arr.indexOf(item) === -1) arr.push(item);
}
function removeItem(arr, item) {
	const index = arr.indexOf(item);
	if (index > -1) arr.splice(index, 1);
}
function moveItem([ ...arr], fromIndex, toIndex) {
	const startIndex = fromIndex < 0 ? arr.length + fromIndex : fromIndex;
	if (startIndex >= 0 && startIndex < arr.length) {
		const endIndex = toIndex < 0 ? arr.length + toIndex : toIndex;
		const [item] = arr.splice(fromIndex, 1);
		arr.splice(endIndex, 0, item);
	}
	return arr;
}
//#endregion
//#region ../../node_modules/motion-utils/dist/es/clamp.mjs
var clamp = (min, max, v) => {
	if (v > max) return max;
	if (v < min) return min;
	return v;
};
//#endregion
//#region ../../node_modules/motion-utils/dist/es/format-error-message.mjs
function formatErrorMessage(message, errorCode) {
	return errorCode ? `${message}. For more information and steps for solving, visit https://motion.dev/troubleshooting/${errorCode}` : message;
}
//#endregion
//#region ../../node_modules/motion-utils/dist/es/errors.mjs
var warning = () => {};
var invariant = () => {};
if (typeof process !== "undefined" && true) {
	warning = (check, message, errorCode) => {
		if (!check && typeof console !== "undefined") console.warn(formatErrorMessage(message, errorCode));
	};
	invariant = (check, message, errorCode) => {
		if (!check) throw new Error(formatErrorMessage(message, errorCode));
	};
}
//#endregion
//#region ../../node_modules/motion-utils/dist/es/global-config.mjs
var MotionGlobalConfig = {};
//#endregion
//#region ../../node_modules/motion-utils/dist/es/is-numerical-string.mjs
/**
* Check if value is a numerical string, ie a string that is purely a number eg "100" or "-100.1"
*/
var isNumericalString = (v) => /^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(v);
//#endregion
//#region ../../node_modules/motion-utils/dist/es/is-object.mjs
var isObject = (value) => typeof value === "object" && value !== null;
//#endregion
//#region ../../node_modules/motion-utils/dist/es/is-zero-value-string.mjs
/**
* Check if the value is a zero value string like "0px" or "0%"
*/
var isZeroValueString = (v) => /^0[^.\s]+$/u.test(v);
//#endregion
//#region ../../node_modules/motion-utils/dist/es/memo.mjs
/*#__NO_SIDE_EFFECTS__*/
function memo(callback) {
	let result;
	return () => {
		if (result === void 0) result = callback();
		return result;
	};
}
//#endregion
//#region ../../node_modules/motion-utils/dist/es/noop.mjs
var noop = /* @__NO_SIDE_EFFECTS__ */ (any) => any;
//#endregion
//#region ../../node_modules/motion-utils/dist/es/pipe.mjs
/**
* Pipe
* Compose other transformers to run linearily
* pipe(min(20), max(40))
* @param  {...functions} transformers
* @return {function}
*/
var pipe = (...transformers) => transformers.reduce((a, b) => (v) => b(a(v)));
//#endregion
//#region ../../node_modules/motion-utils/dist/es/progress.mjs
var progress = /* @__NO_SIDE_EFFECTS__ */ (from, to, value) => {
	const range = to - from;
	return range ? (value - from) / range : 1;
};
//#endregion
//#region ../../node_modules/motion-utils/dist/es/subscription-manager.mjs
var SubscriptionManager = class {
	constructor() {
		this.subscriptions = [];
	}
	add(handler) {
		addUniqueItem(this.subscriptions, handler);
		return () => removeItem(this.subscriptions, handler);
	}
	notify(a, b, c) {
		const numSubscriptions = this.subscriptions.length;
		if (!numSubscriptions) return;
		if (numSubscriptions === 1)
 /**
		* If there's only a single handler we can just call it without invoking a loop.
		*/
		this.subscriptions[0](a, b, c);
		else for (let i = 0; i < numSubscriptions; i++) {
			/**
			* Check whether the handler exists before firing as it's possible
			* the subscriptions were modified during this loop running.
			*/
			const handler = this.subscriptions[i];
			handler && handler(a, b, c);
		}
	}
	getSize() {
		return this.subscriptions.length;
	}
	clear() {
		this.subscriptions.length = 0;
	}
};
//#endregion
//#region ../../node_modules/motion-utils/dist/es/time-conversion.mjs
/**
* Converts seconds to milliseconds
*
* @param seconds - Time in seconds.
* @return milliseconds - Converted time in milliseconds.
*/
var secondsToMilliseconds = /* @__NO_SIDE_EFFECTS__ */ (seconds) => seconds * 1e3;
var millisecondsToSeconds = /* @__NO_SIDE_EFFECTS__ */ (milliseconds) => milliseconds / 1e3;
//#endregion
//#region ../../node_modules/motion-utils/dist/es/velocity-per-second.mjs
var velocityPerSecond = /* @__NO_SIDE_EFFECTS__ */ (velocity, frameDuration) => frameDuration ? velocity * (1e3 / frameDuration) : 0;
//#endregion
//#region ../../node_modules/motion-utils/dist/es/warn-once.mjs
var warned = /* @__PURE__ */ new Set();
function hasWarned(message) {
	return warned.has(message);
}
function warnOnce(condition, message, errorCode) {
	if (condition || warned.has(message)) return;
	console.warn(formatErrorMessage(message, errorCode));
	warned.add(message);
}
//#endregion
//#region ../../node_modules/motion-utils/dist/es/wrap.mjs
var wrap = (min, max, v) => {
	const rangeSize = max - min;
	return ((v - min) % rangeSize + rangeSize) % rangeSize + min;
};
//#endregion
//#region ../../node_modules/motion-utils/dist/es/easing/cubic-bezier.mjs
var calcBezier = (t, a1, a2) => (((1 - 3 * a2 + 3 * a1) * t + (3 * a2 - 6 * a1)) * t + 3 * a1) * t;
var subdivisionPrecision = 1e-7;
var subdivisionMaxIterations = 12;
function binarySubdivide(x, lowerBound, upperBound, mX1, mX2) {
	let currentX;
	let currentT;
	let i = 0;
	do {
		currentT = lowerBound + (upperBound - lowerBound) / 2;
		currentX = calcBezier(currentT, mX1, mX2) - x;
		if (currentX > 0) upperBound = currentT;
		else lowerBound = currentT;
	} while (Math.abs(currentX) > subdivisionPrecision && ++i < subdivisionMaxIterations);
	return currentT;
}
/*#__NO_SIDE_EFFECTS__*/
function cubicBezier(mX1, mY1, mX2, mY2) {
	if (mX1 === mY1 && mX2 === mY2) return noop;
	const getTForX = (aX) => binarySubdivide(aX, 0, 1, mX1, mX2);
	return (t) => t === 0 || t === 1 ? t : calcBezier(getTForX(t), mY1, mY2);
}
//#endregion
//#region ../../node_modules/motion-utils/dist/es/easing/modifiers/mirror.mjs
var mirrorEasing = /* @__NO_SIDE_EFFECTS__ */ (easing) => (p) => p <= .5 ? easing(2 * p) / 2 : (2 - easing(2 * (1 - p))) / 2;
//#endregion
//#region ../../node_modules/motion-utils/dist/es/easing/modifiers/reverse.mjs
var reverseEasing = /* @__NO_SIDE_EFFECTS__ */ (easing) => (p) => 1 - easing(1 - p);
//#endregion
//#region ../../node_modules/motion-utils/dist/es/easing/back.mjs
var backOut = /*@__PURE__*/ cubicBezier(.33, 1.53, .69, .99);
var backIn = /*@__PURE__*/ reverseEasing(backOut);
var backInOut = /*@__PURE__*/ mirrorEasing(backIn);
//#endregion
//#region ../../node_modules/motion-utils/dist/es/easing/anticipate.mjs
var anticipate = (p) => p >= 1 ? 1 : (p *= 2) < 1 ? .5 * backIn(p) : .5 * (2 - Math.pow(2, -10 * (p - 1)));
//#endregion
//#region ../../node_modules/motion-utils/dist/es/easing/circ.mjs
var circIn = (p) => 1 - Math.sin(Math.acos(p));
var circOut = /* @__PURE__ */ reverseEasing(circIn);
var circInOut = /* @__PURE__ */ mirrorEasing(circIn);
//#endregion
//#region ../../node_modules/motion-utils/dist/es/easing/ease.mjs
var easeIn = /*@__PURE__*/ cubicBezier(.42, 0, 1, 1);
var easeOut = /*@__PURE__*/ cubicBezier(0, 0, .58, 1);
var easeInOut = /*@__PURE__*/ cubicBezier(.42, 0, .58, 1);
//#endregion
//#region ../../node_modules/motion-utils/dist/es/easing/steps.mjs
/*#__NO_SIDE_EFFECTS__*/
function steps(numSteps, direction = "end") {
	return (progress) => {
		progress = direction === "end" ? Math.min(progress, .999) : Math.max(progress, .001);
		const expanded = progress * numSteps;
		return clamp(0, 1, (direction === "end" ? Math.floor(expanded) : Math.ceil(expanded)) / numSteps);
	};
}
//#endregion
//#region ../../node_modules/motion-utils/dist/es/easing/utils/is-easing-array.mjs
var isEasingArray = /* @__NO_SIDE_EFFECTS__ */ (ease) => {
	return Array.isArray(ease) && typeof ease[0] !== "number";
};
//#endregion
//#region ../../node_modules/motion-utils/dist/es/easing/utils/get-easing-for-segment.mjs
/*#__NO_SIDE_EFFECTS__*/
function getEasingForSegment(easing, i) {
	return /* @__PURE__ */ isEasingArray(easing) ? easing[wrap(0, easing.length, i)] : easing;
}
//#endregion
//#region ../../node_modules/motion-utils/dist/es/easing/utils/is-bezier-definition.mjs
var isBezierDefinition = /* @__NO_SIDE_EFFECTS__ */ (easing) => Array.isArray(easing) && typeof easing[0] === "number";
//#endregion
//#region ../../node_modules/motion-utils/dist/es/easing/utils/map.mjs
var easingLookup = {
	linear: noop,
	easeIn,
	easeInOut,
	easeOut,
	circIn,
	circInOut,
	circOut,
	backIn,
	backInOut,
	backOut,
	anticipate
};
var isValidEasing = (easing) => {
	return typeof easing === "string";
};
var easingDefinitionToFunction = (definition) => {
	if (/* @__PURE__ */ isBezierDefinition(definition)) {
		invariant(definition.length === 4, `Cubic bezier arrays must contain four numerical values.`, "cubic-bezier-length");
		const [x1, y1, x2, y2] = definition;
		return /* @__PURE__ */ cubicBezier(x1, y1, x2, y2);
	} else if (isValidEasing(definition)) {
		invariant(easingLookup[definition] !== void 0, `Invalid easing type '${definition}'`, "invalid-easing-type");
		return easingLookup[definition];
	}
	return definition;
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/frameloop/order.mjs
var stepsOrder = [
	"setup",
	"read",
	"resolveKeyframes",
	"preUpdate",
	"update",
	"preRender",
	"render",
	"postRender"
];
//#endregion
//#region ../../node_modules/motion-dom/dist/es/frameloop/render-step.mjs
function createRenderStep(runNextFrame) {
	/**
	* We create and reuse two queues, one to queue jobs for the current frame
	* and one for the next. We reuse to avoid triggering GC after x frames.
	*/
	let thisFrame = /* @__PURE__ */ new Set();
	let nextFrame = /* @__PURE__ */ new Set();
	/**
	* Track whether we're currently processing jobs in this step. This way
	* we can decide whether to schedule new jobs for this frame or next.
	*/
	let isProcessing = false;
	let flushNextFrame = false;
	/**
	* A set of processes which were marked keepAlive when scheduled.
	*/
	const toKeepAlive = /* @__PURE__ */ new WeakSet();
	let latestFrameData = {
		delta: 0,
		timestamp: 0,
		isProcessing: false
	};
	function triggerCallback(callback) {
		if (toKeepAlive.has(callback)) {
			step.schedule(callback);
			runNextFrame();
		}
		callback(latestFrameData);
	}
	const step = {
		/**
		* Schedule a process to run on the next frame.
		*/
		schedule: (callback, keepAlive = false, immediate = false) => {
			const queue = immediate && isProcessing ? thisFrame : nextFrame;
			if (keepAlive) toKeepAlive.add(callback);
			queue.add(callback);
			return callback;
		},
		/**
		* Cancel the provided callback from running on the next frame.
		*/
		cancel: (callback) => {
			nextFrame.delete(callback);
			toKeepAlive.delete(callback);
		},
		/**
		* Execute all schedule callbacks.
		*/
		process: (frameData) => {
			latestFrameData = frameData;
			/**
			* If we're already processing we've probably been triggered by a flushSync
			* inside an existing process. Instead of executing, mark flushNextFrame
			* as true and ensure we flush the following frame at the end of this one.
			*/
			if (isProcessing) {
				flushNextFrame = true;
				return;
			}
			isProcessing = true;
			const prevFrame = thisFrame;
			thisFrame = nextFrame;
			nextFrame = prevFrame;
			thisFrame.forEach(triggerCallback);
			thisFrame.clear();
			isProcessing = false;
			if (flushNextFrame) {
				flushNextFrame = false;
				step.process(frameData);
			}
		}
	};
	return step;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/frameloop/batcher.mjs
var maxElapsed$1 = 40;
function createRenderBatcher(scheduleNextBatch, allowKeepAlive) {
	let runNextFrame = false;
	let useDefaultElapsed = true;
	const state = {
		delta: 0,
		timestamp: 0,
		isProcessing: false
	};
	const flagRunNextFrame = () => runNextFrame = true;
	const steps = stepsOrder.reduce((acc, key) => {
		acc[key] = createRenderStep(flagRunNextFrame);
		return acc;
	}, {});
	const { setup, read, resolveKeyframes, preUpdate, update, preRender, render, postRender } = steps;
	const processBatch = () => {
		const useManualTiming = MotionGlobalConfig.useManualTiming;
		const timestamp = useManualTiming ? state.timestamp : performance.now();
		runNextFrame = false;
		if (!useManualTiming) state.delta = useDefaultElapsed ? 1e3 / 60 : Math.max(Math.min(timestamp - state.timestamp, maxElapsed$1), 1);
		state.timestamp = timestamp;
		state.isProcessing = true;
		setup.process(state);
		read.process(state);
		resolveKeyframes.process(state);
		preUpdate.process(state);
		update.process(state);
		preRender.process(state);
		render.process(state);
		postRender.process(state);
		state.isProcessing = false;
		if (runNextFrame && allowKeepAlive) {
			useDefaultElapsed = false;
			scheduleNextBatch(processBatch);
		}
	};
	const wake = () => {
		runNextFrame = true;
		useDefaultElapsed = true;
		if (!state.isProcessing) scheduleNextBatch(processBatch);
	};
	const schedule = stepsOrder.reduce((acc, key) => {
		const step = steps[key];
		acc[key] = (process, keepAlive = false, immediate = false) => {
			if (!runNextFrame) wake();
			return step.schedule(process, keepAlive, immediate);
		};
		return acc;
	}, {});
	const cancel = (process) => {
		for (let i = 0; i < stepsOrder.length; i++) steps[stepsOrder[i]].cancel(process);
	};
	return {
		schedule,
		cancel,
		state,
		steps
	};
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/frameloop/frame.mjs
var { schedule: frame, cancel: cancelFrame, state: frameData, steps: frameSteps } = /* @__PURE__ */ createRenderBatcher(typeof requestAnimationFrame !== "undefined" ? requestAnimationFrame : noop, true);
//#endregion
//#region ../../node_modules/motion-dom/dist/es/frameloop/sync-time.mjs
var now;
function clearTime() {
	now = void 0;
}
/**
* An eventloop-synchronous alternative to performance.now().
*
* Ensures that time measurements remain consistent within a synchronous context.
* Usually calling performance.now() twice within the same synchronous context
* will return different values which isn't useful for animations when we're usually
* trying to sync animations to the same frame.
*/
var time = {
	now: () => {
		if (now === void 0) time.set(frameData.isProcessing || MotionGlobalConfig.useManualTiming ? frameData.timestamp : performance.now());
		return now;
	},
	set: (newTime) => {
		now = newTime;
		queueMicrotask(clearTime);
	}
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/utils/is-css-variable.mjs
var checkStringStartsWith = (token) => (key) => typeof key === "string" && key.startsWith(token);
var isCSSVariableName = /*@__PURE__*/ checkStringStartsWith("--");
var startsAsVariableToken = /*@__PURE__*/ checkStringStartsWith("var(--");
var isCSSVariableToken = (value) => {
	if (!startsAsVariableToken(value)) return false;
	return singleCssVariableRegex.test(value.split("/*")[0].trim());
};
var singleCssVariableRegex = /var\(--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)$/iu;
/**
* Check if a value contains a CSS variable anywhere (e.g. inside calc()).
* Unlike isCSSVariableToken which checks if the value IS a var() token,
* this checks if the value CONTAINS var() somewhere in the string.
*/
function containsCSSVariable(value) {
	if (typeof value !== "string") return false;
	return value.split("/*")[0].includes("var(--");
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/types/numbers/index.mjs
var number = {
	test: (v) => typeof v === "number",
	parse: parseFloat,
	transform: (v) => v
};
var alpha = {
	...number,
	transform: (v) => clamp(0, 1, v)
};
var scale = {
	...number,
	default: 1
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/types/utils/sanitize.mjs
var sanitize = (v) => Math.round(v * 1e5) / 1e5;
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/types/utils/float-regex.mjs
var floatRegex = /-?(?:\d+(?:\.\d+)?|\.\d+)/gu;
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/types/utils/is-nullish.mjs
function isNullish(v) {
	return v == null;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/types/utils/single-color-regex.mjs
var singleColorRegex = /^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))$/iu;
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/types/color/utils.mjs
/**
* Returns true if the provided string is a color, ie rgba(0,0,0,0) or #000,
* but false if a number or multiple colors
*/
var isColorString = (type, testProp) => (v) => {
	return Boolean(typeof v === "string" && singleColorRegex.test(v) && v.startsWith(type) || testProp && !isNullish(v) && Object.prototype.hasOwnProperty.call(v, testProp));
};
var splitColor = (aName, bName, cName) => (v) => {
	if (typeof v !== "string") return v;
	const [a, b, c, alpha] = v.match(floatRegex);
	return {
		[aName]: parseFloat(a),
		[bName]: parseFloat(b),
		[cName]: parseFloat(c),
		alpha: alpha !== void 0 ? parseFloat(alpha) : 1
	};
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/types/color/rgba.mjs
var clampRgbUnit = (v) => clamp(0, 255, v);
var rgbUnit = {
	...number,
	transform: (v) => Math.round(clampRgbUnit(v))
};
var rgba = {
	test: /*@__PURE__*/ isColorString("rgb", "red"),
	parse: /*@__PURE__*/ splitColor("red", "green", "blue"),
	transform: ({ red, green, blue, alpha: alpha$1 = 1 }) => "rgba(" + rgbUnit.transform(red) + ", " + rgbUnit.transform(green) + ", " + rgbUnit.transform(blue) + ", " + sanitize(alpha.transform(alpha$1)) + ")"
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/types/color/hex.mjs
function parseHex(v) {
	let r = "";
	let g = "";
	let b = "";
	let a = "";
	if (v.length > 5) {
		r = v.substring(1, 3);
		g = v.substring(3, 5);
		b = v.substring(5, 7);
		a = v.substring(7, 9);
	} else {
		r = v.substring(1, 2);
		g = v.substring(2, 3);
		b = v.substring(3, 4);
		a = v.substring(4, 5);
		r += r;
		g += g;
		b += b;
		a += a;
	}
	return {
		red: parseInt(r, 16),
		green: parseInt(g, 16),
		blue: parseInt(b, 16),
		alpha: a ? parseInt(a, 16) / 255 : 1
	};
}
var hex = {
	test: /*@__PURE__*/ isColorString("#"),
	parse: parseHex,
	transform: rgba.transform
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/types/numbers/units.mjs
var createUnitType = /* @__NO_SIDE_EFFECTS__ */ (unit) => ({
	test: (v) => typeof v === "string" && v.endsWith(unit) && v.split(" ").length === 1,
	parse: parseFloat,
	transform: (v) => `${v}${unit}`
});
var degrees = /*@__PURE__*/ createUnitType("deg");
var percent = /*@__PURE__*/ createUnitType("%");
var px = /*@__PURE__*/ createUnitType("px");
var vh = /*@__PURE__*/ createUnitType("vh");
var vw = /*@__PURE__*/ createUnitType("vw");
var progressPercentage = /*@__PURE__*/ (() => ({
	...percent,
	parse: (v) => percent.parse(v) / 100,
	transform: (v) => percent.transform(v * 100)
}))();
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/types/color/hsla.mjs
var hsla = {
	test: /*@__PURE__*/ isColorString("hsl", "hue"),
	parse: /*@__PURE__*/ splitColor("hue", "saturation", "lightness"),
	transform: ({ hue, saturation, lightness, alpha: alpha$1 = 1 }) => {
		return "hsla(" + Math.round(hue) + ", " + percent.transform(sanitize(saturation)) + ", " + percent.transform(sanitize(lightness)) + ", " + sanitize(alpha.transform(alpha$1)) + ")";
	}
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/types/color/index.mjs
var color = {
	test: (v) => rgba.test(v) || hex.test(v) || hsla.test(v),
	parse: (v) => {
		if (rgba.test(v)) return rgba.parse(v);
		else if (hsla.test(v)) return hsla.parse(v);
		else return hex.parse(v);
	},
	transform: (v) => {
		return typeof v === "string" ? v : v.hasOwnProperty("red") ? rgba.transform(v) : hsla.transform(v);
	},
	getAnimatableNone: (v) => {
		const parsed = color.parse(v);
		parsed.alpha = 0;
		return color.transform(parsed);
	}
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/types/utils/color-regex.mjs
var colorRegex = /(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))/giu;
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/types/complex/index.mjs
function test(v) {
	return isNaN(v) && typeof v === "string" && (v.match(floatRegex)?.length || 0) + (v.match(colorRegex)?.length || 0) > 0;
}
var NUMBER_TOKEN = "number";
var COLOR_TOKEN = "color";
var VAR_TOKEN = "var";
var VAR_FUNCTION_TOKEN = "var(";
var SPLIT_TOKEN = "${}";
var complexRegex = /var\s*\(\s*--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)|#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\)|-?(?:\d+(?:\.\d+)?|\.\d+)/giu;
function analyseComplexValue(value) {
	const originalValue = value.toString();
	const values = [];
	const indexes = {
		color: [],
		number: [],
		var: []
	};
	const types = [];
	let i = 0;
	return {
		values,
		split: originalValue.replace(complexRegex, (parsedValue) => {
			if (color.test(parsedValue)) {
				indexes.color.push(i);
				types.push(COLOR_TOKEN);
				values.push(color.parse(parsedValue));
			} else if (parsedValue.startsWith(VAR_FUNCTION_TOKEN)) {
				indexes.var.push(i);
				types.push(VAR_TOKEN);
				values.push(parsedValue);
			} else {
				indexes.number.push(i);
				types.push(NUMBER_TOKEN);
				values.push(parseFloat(parsedValue));
			}
			++i;
			return SPLIT_TOKEN;
		}).split(SPLIT_TOKEN),
		indexes,
		types
	};
}
function parseComplexValue(v) {
	return analyseComplexValue(v).values;
}
function buildTransformer({ split, types }) {
	const numSections = split.length;
	return (v) => {
		let output = "";
		for (let i = 0; i < numSections; i++) {
			output += split[i];
			if (v[i] !== void 0) {
				const type = types[i];
				if (type === NUMBER_TOKEN) output += sanitize(v[i]);
				else if (type === COLOR_TOKEN) output += color.transform(v[i]);
				else output += v[i];
			}
		}
		return output;
	};
}
function createTransformer(source) {
	return buildTransformer(analyseComplexValue(source));
}
var convertNumbersToZero = (v) => typeof v === "number" ? 0 : color.test(v) ? color.getAnimatableNone(v) : v;
/**
* Convert a parsed value to its zero equivalent, but preserve numbers
* that act as divisors in CSS calc() expressions.
*
* analyseComplexValue extracts numbers from CSS strings and puts the
* surrounding text into a `split` template array. For example:
*   "calc(var(--gap) / 5)"  →  values: [var(--gap), 5]
*                               split:  ["calc(", " / ", ")"]
*
* When building a zero-equivalent for animation, naively zeroing all
* numbers turns the divisor into 0 → "calc(var(--gap) / 0)" → NaN.
* We detect this by checking whether the text preceding a number
* (split[i]) ends with "/" — the CSS calc division operator.
*/
var convertToZero = (value, splitBefore) => {
	if (typeof value === "number") return splitBefore?.trim().endsWith("/") ? value : 0;
	return convertNumbersToZero(value);
};
function getAnimatableNone$1(v) {
	const info = analyseComplexValue(v);
	return buildTransformer(info)(info.values.map((value, i) => convertToZero(value, info.split[i])));
}
var complex = {
	test,
	parse: parseComplexValue,
	createTransformer,
	getAnimatableNone: getAnimatableNone$1
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/types/color/hsla-to-rgba.mjs
function hueToRgb(p, q, t) {
	if (t < 0) t += 1;
	if (t > 1) t -= 1;
	if (t < 1 / 6) return p + (q - p) * 6 * t;
	if (t < 1 / 2) return q;
	if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
	return p;
}
function hslaToRgba({ hue, saturation, lightness, alpha }) {
	hue /= 360;
	saturation /= 100;
	lightness /= 100;
	let red = 0;
	let green = 0;
	let blue = 0;
	if (!saturation) red = green = blue = lightness;
	else {
		const q = lightness < .5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
		const p = 2 * lightness - q;
		red = hueToRgb(p, q, hue + 1 / 3);
		green = hueToRgb(p, q, hue);
		blue = hueToRgb(p, q, hue - 1 / 3);
	}
	return {
		red: Math.round(red * 255),
		green: Math.round(green * 255),
		blue: Math.round(blue * 255),
		alpha
	};
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/utils/mix/immediate.mjs
function mixImmediate(a, b) {
	return (p) => p > 0 ? b : a;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/utils/mix/number.mjs
var mixNumber = (from, to, progress) => {
	return from + (to - from) * progress;
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/utils/mix/color.mjs
var mixLinearColor = (from, to, v) => {
	const fromExpo = from * from;
	const expo = v * (to * to - fromExpo) + fromExpo;
	return expo < 0 ? 0 : Math.sqrt(expo);
};
var colorTypes = [
	hex,
	rgba,
	hsla
];
var getColorType = (v) => colorTypes.find((type) => type.test(v));
function asRGBA(color) {
	const type = getColorType(color);
	warning(Boolean(type), `'${color}' is not an animatable color. Use the equivalent color code instead.`, "color-not-animatable");
	if (!Boolean(type)) return false;
	let model = type.parse(color);
	if (type === hsla) model = hslaToRgba(model);
	return model;
}
var mixColor = (from, to) => {
	const fromRGBA = asRGBA(from);
	const toRGBA = asRGBA(to);
	if (!fromRGBA || !toRGBA) return mixImmediate(from, to);
	const blended = { ...fromRGBA };
	return (v) => {
		blended.red = mixLinearColor(fromRGBA.red, toRGBA.red, v);
		blended.green = mixLinearColor(fromRGBA.green, toRGBA.green, v);
		blended.blue = mixLinearColor(fromRGBA.blue, toRGBA.blue, v);
		blended.alpha = mixNumber(fromRGBA.alpha, toRGBA.alpha, v);
		return rgba.transform(blended);
	};
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/utils/mix/visibility.mjs
var invisibleValues = /* @__PURE__ */ new Set(["none", "hidden"]);
/**
* Returns a function that, when provided a progress value between 0 and 1,
* will return the "none" or "hidden" string only when the progress is that of
* the origin or target.
*/
function mixVisibility(origin, target) {
	if (invisibleValues.has(origin)) return (p) => p <= 0 ? origin : target;
	else return (p) => p >= 1 ? target : origin;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/utils/mix/complex.mjs
function mixNumber$1(a, b) {
	return (p) => mixNumber(a, b, p);
}
function getMixer(a) {
	if (typeof a === "number") return mixNumber$1;
	else if (typeof a === "string") return isCSSVariableToken(a) ? mixImmediate : color.test(a) ? mixColor : mixComplex;
	else if (Array.isArray(a)) return mixArray;
	else if (typeof a === "object") return color.test(a) ? mixColor : mixObject;
	return mixImmediate;
}
function mixArray(a, b) {
	const output = [...a];
	const numValues = output.length;
	const blendValue = a.map((v, i) => getMixer(v)(v, b[i]));
	return (p) => {
		for (let i = 0; i < numValues; i++) output[i] = blendValue[i](p);
		return output;
	};
}
function mixObject(a, b) {
	const output = {
		...a,
		...b
	};
	const blendValue = {};
	for (const key in output) if (a[key] !== void 0 && b[key] !== void 0) blendValue[key] = getMixer(a[key])(a[key], b[key]);
	return (v) => {
		for (const key in blendValue) output[key] = blendValue[key](v);
		return output;
	};
}
function matchOrder(origin, target) {
	const orderedOrigin = [];
	const pointers = {
		color: 0,
		var: 0,
		number: 0
	};
	for (let i = 0; i < target.values.length; i++) {
		const type = target.types[i];
		const originIndex = origin.indexes[type][pointers[type]];
		const originValue = origin.values[originIndex] ?? 0;
		orderedOrigin[i] = originValue;
		pointers[type]++;
	}
	return orderedOrigin;
}
var mixComplex = (origin, target) => {
	const template = complex.createTransformer(target);
	const originStats = analyseComplexValue(origin);
	const targetStats = analyseComplexValue(target);
	if (originStats.indexes.var.length === targetStats.indexes.var.length && originStats.indexes.color.length === targetStats.indexes.color.length && originStats.indexes.number.length >= targetStats.indexes.number.length) {
		if (invisibleValues.has(origin) && !targetStats.values.length || invisibleValues.has(target) && !originStats.values.length) return mixVisibility(origin, target);
		return pipe(mixArray(matchOrder(originStats, targetStats), targetStats.values), template);
	} else {
		warning(true, `Complex values '${origin}' and '${target}' too different to mix. Ensure all colors are of the same type, and that each contains the same quantity of number and color values. Falling back to instant transition.`, "complex-values-different");
		return mixImmediate(origin, target);
	}
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/utils/mix/index.mjs
function mix(from, to, p) {
	if (typeof from === "number" && typeof to === "number" && typeof p === "number") return mixNumber(from, to, p);
	return getMixer(from)(from, to);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/drivers/frame.mjs
var frameloopDriver = (update) => {
	const passTimestamp = ({ timestamp }) => update(timestamp);
	return {
		start: (keepAlive = true) => frame.update(passTimestamp, keepAlive),
		stop: () => cancelFrame(passTimestamp),
		/**
		* If we're processing this frame we can use the
		* framelocked timestamp to keep things in sync.
		*/
		now: () => frameData.isProcessing ? frameData.timestamp : time.now()
	};
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/waapi/utils/linear.mjs
var generateLinearEasing = (easing, duration, resolution = 10) => {
	let points = "";
	const numPoints = Math.max(Math.round(duration / resolution), 2);
	for (let i = 0; i < numPoints; i++) points += Math.round(easing(i / (numPoints - 1)) * 1e4) / 1e4 + ", ";
	return `linear(${points.substring(0, points.length - 2)})`;
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/generators/utils/calc-duration.mjs
/**
* Implement a practical max duration for keyframe generation
* to prevent infinite loops
*/
var maxGeneratorDuration = 2e4;
function calcGeneratorDuration(generator, timeStep = 50, maxDuration = maxGeneratorDuration, keyframes) {
	let duration = 0;
	let state = generator.next(duration);
	keyframes?.push(state.value);
	while (!state.done && duration < maxDuration) {
		duration += timeStep;
		state = generator.next(duration);
		keyframes?.push(state.value);
	}
	return duration >= maxDuration ? Infinity : duration;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/generators/utils/create-generator-easing.mjs
/**
* Create a progress => progress easing function from a generator.
*/
function createGeneratorEasing(options, scale = 100, createGenerator) {
	const generator = createGenerator({
		...options,
		keyframes: [0, scale]
	});
	const duration = Math.min(calcGeneratorDuration(generator), maxGeneratorDuration);
	return {
		type: "keyframes",
		ease: (progress) => {
			return generator.next(duration * progress).value / scale;
		},
		duration: /* @__PURE__ */ millisecondsToSeconds(duration)
	};
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/generators/spring.mjs
var springDefaults = {
	stiffness: 100,
	damping: 10,
	mass: 1,
	velocity: 0,
	duration: 800,
	bounce: .3,
	visualDuration: .3,
	restSpeed: {
		granular: .01,
		default: 2
	},
	restDelta: {
		granular: .005,
		default: .5
	},
	minDuration: .01,
	maxDuration: 10,
	minDamping: .05,
	maxDamping: 1
};
function calcAngularFreq(undampedFreq, dampingRatio) {
	return undampedFreq * Math.sqrt(1 - dampingRatio * dampingRatio);
}
var rootIterations = 12;
function approximateRoot(envelope, derivative, initialGuess) {
	let result = initialGuess;
	for (let i = 1; i < rootIterations; i++) result = result - envelope(result) / derivative(result);
	return result;
}
/**
* This is ported from the Framer implementation of duration-based spring resolution.
*/
var safeMin = .001;
function findSpring({ duration = springDefaults.duration, bounce = springDefaults.bounce, velocity = springDefaults.velocity, mass = springDefaults.mass }) {
	let envelope;
	let derivative;
	warning(duration <= /* @__PURE__ */ secondsToMilliseconds(springDefaults.maxDuration), "Spring duration must be 10 seconds or less", "spring-duration-limit");
	let dampingRatio = 1 - bounce;
	/**
	* Restrict dampingRatio and duration to within acceptable ranges.
	*/
	dampingRatio = clamp(springDefaults.minDamping, springDefaults.maxDamping, dampingRatio);
	duration = clamp(springDefaults.minDuration, springDefaults.maxDuration, /* @__PURE__ */ millisecondsToSeconds(duration));
	if (dampingRatio < 1) {
		/**
		* Underdamped spring
		*/
		envelope = (undampedFreq) => {
			const exponentialDecay = undampedFreq * dampingRatio;
			const delta = exponentialDecay * duration;
			const a = exponentialDecay - velocity;
			const b = calcAngularFreq(undampedFreq, dampingRatio);
			const c = Math.exp(-delta);
			return safeMin - a / b * c;
		};
		derivative = (undampedFreq) => {
			const delta = undampedFreq * dampingRatio * duration;
			const d = delta * velocity + velocity;
			const e = dampingRatio * dampingRatio * undampedFreq * undampedFreq * duration;
			const f = Math.exp(-delta);
			const g = calcAngularFreq(undampedFreq * undampedFreq, dampingRatio);
			return (-envelope(undampedFreq) + safeMin > 0 ? -1 : 1) * ((d - e) * f) / g;
		};
	} else {
		/**
		* Critically-damped spring
		*/
		envelope = (undampedFreq) => {
			return -.001 + Math.exp(-undampedFreq * duration) * ((undampedFreq - velocity) * duration + 1);
		};
		derivative = (undampedFreq) => {
			return Math.exp(-undampedFreq * duration) * ((velocity - undampedFreq) * (duration * duration));
		};
	}
	const initialGuess = 5 / duration;
	const undampedFreq = approximateRoot(envelope, derivative, initialGuess);
	duration = /* @__PURE__ */ secondsToMilliseconds(duration);
	if (isNaN(undampedFreq)) return {
		stiffness: springDefaults.stiffness,
		damping: springDefaults.damping,
		duration
	};
	else {
		const stiffness = undampedFreq * undampedFreq * mass;
		return {
			stiffness,
			damping: dampingRatio * 2 * Math.sqrt(mass * stiffness),
			duration
		};
	}
}
var durationKeys = ["duration", "bounce"];
var physicsKeys = [
	"stiffness",
	"damping",
	"mass"
];
function isSpringType(options, keys) {
	return keys.some((key) => options[key] !== void 0);
}
function getSpringOptions(options) {
	let springOptions = {
		velocity: springDefaults.velocity,
		stiffness: springDefaults.stiffness,
		damping: springDefaults.damping,
		mass: springDefaults.mass,
		isResolvedFromDuration: false,
		...options
	};
	if (!isSpringType(options, physicsKeys) && isSpringType(options, durationKeys)) {
		springOptions.velocity = 0;
		if (options.visualDuration) {
			const visualDuration = options.visualDuration;
			const root = 2 * Math.PI / (visualDuration * 1.2);
			const stiffness = root * root;
			const damping = 2 * clamp(.05, 1, 1 - (options.bounce || 0)) * Math.sqrt(stiffness);
			springOptions = {
				...springOptions,
				mass: springDefaults.mass,
				stiffness,
				damping
			};
		} else {
			const derived = findSpring({
				...options,
				velocity: 0
			});
			springOptions = {
				...springOptions,
				...derived,
				mass: springDefaults.mass
			};
			springOptions.isResolvedFromDuration = true;
		}
	}
	return springOptions;
}
function spring(optionsOrVisualDuration = springDefaults.visualDuration, bounce = springDefaults.bounce) {
	const options = typeof optionsOrVisualDuration !== "object" ? {
		visualDuration: optionsOrVisualDuration,
		keyframes: [0, 1],
		bounce
	} : optionsOrVisualDuration;
	let { restSpeed, restDelta } = options;
	const origin = options.keyframes[0];
	const target = options.keyframes[options.keyframes.length - 1];
	/**
	* This is the Iterator-spec return value. We ensure it's mutable rather than using a generator
	* to reduce GC during animation.
	*/
	const state = {
		done: false,
		value: origin
	};
	const { stiffness, damping, mass, duration, velocity, isResolvedFromDuration } = getSpringOptions({
		...options,
		velocity: -/* @__PURE__ */ millisecondsToSeconds(options.velocity || 0)
	});
	const initialVelocity = velocity || 0;
	const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass));
	const initialDelta = target - origin;
	const undampedAngularFreq = /* @__PURE__ */ millisecondsToSeconds(Math.sqrt(stiffness / mass));
	const decay = dampingRatio * undampedAngularFreq;
	/**
	* If we're working on a granular scale, use smaller defaults for determining
	* when the spring is finished.
	*
	* These defaults have been selected emprically based on what strikes a good
	* ratio between feeling good and finishing as soon as changes are imperceptible.
	*/
	const isGranularScale = Math.abs(initialDelta) < 5;
	restSpeed || (restSpeed = isGranularScale ? springDefaults.restSpeed.granular : springDefaults.restSpeed.default);
	restDelta || (restDelta = isGranularScale ? springDefaults.restDelta.granular : springDefaults.restDelta.default);
	let resolveSpring;
	let resolveVelocity;
	if (dampingRatio < 1) {
		const angularFreq = calcAngularFreq(undampedAngularFreq, dampingRatio);
		const A = (initialVelocity + decay * initialDelta) / angularFreq;
		const sinCoeff = decay * A + initialDelta * angularFreq;
		const cosCoeff = decay * initialDelta - A * angularFreq;
		/**
		* The underdamped hot path needs both position and velocity every
		* frame and they share the same exp/sin/cos terms, so sample both
		* at once, memoized by t, to only calculate them once per frame.
		*/
		let sampledT = -1;
		let position = 0;
		let velocityAtT = 0;
		const sample = (t) => {
			if (t !== sampledT) {
				sampledT = t;
				const envelope = Math.exp(-decay * t);
				const sin = Math.sin(angularFreq * t);
				const cos = Math.cos(angularFreq * t);
				position = target - envelope * (A * sin + initialDelta * cos);
				velocityAtT = envelope * (sinCoeff * sin + cosCoeff * cos);
			}
		};
		resolveSpring = (t) => {
			sample(t);
			return position;
		};
		resolveVelocity = (t) => {
			sample(t);
			return velocityAtT;
		};
	} else if (dampingRatio === 1) {
		resolveSpring = (t) => target - Math.exp(-undampedAngularFreq * t) * (initialDelta + (initialVelocity + undampedAngularFreq * initialDelta) * t);
		const C = initialVelocity + undampedAngularFreq * initialDelta;
		resolveVelocity = (t) => Math.exp(-undampedAngularFreq * t) * (undampedAngularFreq * C * t - initialVelocity);
	} else {
		const dampedAngularFreq = undampedAngularFreq * Math.sqrt(dampingRatio * dampingRatio - 1);
		resolveSpring = (t) => {
			const envelope = Math.exp(-decay * t);
			const freqForT = Math.min(dampedAngularFreq * t, 300);
			return target - envelope * ((initialVelocity + decay * initialDelta) * Math.sinh(freqForT) + dampedAngularFreq * initialDelta * Math.cosh(freqForT)) / dampedAngularFreq;
		};
		const P = (initialVelocity + decay * initialDelta) / dampedAngularFreq;
		const sinhCoeff = decay * P - initialDelta * dampedAngularFreq;
		const coshCoeff = decay * initialDelta - P * dampedAngularFreq;
		resolveVelocity = (t) => {
			const envelope = Math.exp(-decay * t);
			const freqForT = Math.min(dampedAngularFreq * t, 300);
			return envelope * (sinhCoeff * Math.sinh(freqForT) + coshCoeff * Math.cosh(freqForT));
		};
	}
	const generator = {
		calculatedDuration: isResolvedFromDuration ? duration || null : null,
		velocity: (t) => /* @__PURE__ */ secondsToMilliseconds(resolveVelocity(t)),
		next: (t) => {
			const current = resolveSpring(t);
			if (!isResolvedFromDuration) {
				const currentVelocity = /* @__PURE__ */ secondsToMilliseconds(resolveVelocity(t));
				state.done = Math.abs(currentVelocity) <= restSpeed && Math.abs(target - current) <= restDelta;
			} else state.done = t >= duration;
			state.value = state.done ? target : current;
			return state;
		},
		toString: () => {
			const calculatedDuration = Math.min(calcGeneratorDuration(generator), maxGeneratorDuration);
			const easing = generateLinearEasing((progress) => generator.next(calculatedDuration * progress).value, calculatedDuration, 30);
			return calculatedDuration + "ms " + easing;
		},
		toTransition: () => {}
	};
	return generator;
}
spring.applyToOptions = (options) => {
	const generatorOptions = createGeneratorEasing(options, 100, spring);
	options.ease = generatorOptions.ease;
	options.duration = /* @__PURE__ */ secondsToMilliseconds(generatorOptions.duration);
	options.type = "keyframes";
	return options;
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/generators/inertia.mjs
function inertia({ keyframes, velocity = 0, power = .8, timeConstant = 325, bounceDamping = 10, bounceStiffness = 500, modifyTarget, min, max, restDelta = .5, restSpeed }) {
	const origin = keyframes[0];
	const state = {
		done: false,
		value: origin
	};
	const isOutOfBounds = (v) => v < min || v > max;
	const nearestBoundary = (v) => {
		if (min === void 0) return max;
		if (max === void 0) return min;
		return Math.abs(min - v) < Math.abs(max - v) ? min : max;
	};
	let amplitude = power * velocity;
	const ideal = origin + amplitude;
	const target = modifyTarget === void 0 ? ideal : modifyTarget(ideal);
	/**
	* If the target has changed we need to re-calculate the amplitude, otherwise
	* the animation will start from the wrong position.
	*/
	if (target !== ideal) amplitude = target - origin;
	const calcDelta = (t) => -amplitude * Math.exp(-t / timeConstant);
	const applyFriction = (t) => {
		const delta = calcDelta(t);
		state.done = Math.abs(delta) <= restDelta;
		state.value = state.done ? target : target + delta;
	};
	/**
	* Ideally this would resolve for t in a stateless way, we could
	* do that by always precalculating the animation but as we know
	* this will be done anyway we can assume that spring will
	* be discovered during that.
	*/
	let timeReachedBoundary;
	let spring$1;
	const checkCatchBoundary = (t) => {
		if (!isOutOfBounds(state.value)) return;
		timeReachedBoundary = t;
		spring$1 = spring({
			keyframes: [state.value, nearestBoundary(state.value)],
			/**
			* The friction curve is target + calcDelta(t), so its exact
			* derivative is -calcDelta(t) / timeConstant in units/ms,
			* converted here to the units/second expected by spring.
			*/
			velocity: -calcDelta(t) / timeConstant * 1e3,
			damping: bounceDamping,
			stiffness: bounceStiffness,
			restDelta,
			restSpeed
		});
	};
	checkCatchBoundary(0);
	return {
		calculatedDuration: null,
		next: (t) => {
			/**
			* We need to resolve the friction to figure out if we need a
			* spring but we don't want to do this twice per frame. So here
			* we flag if we updated for this frame and later if we did
			* we can skip doing it again.
			*/
			let hasUpdatedFrame = false;
			if (!spring$1 && timeReachedBoundary === void 0) {
				hasUpdatedFrame = true;
				applyFriction(t);
				checkCatchBoundary(t);
			}
			/**
			* If we have a spring and the provided t is beyond the moment the friction
			* animation crossed the min/max boundary, use the spring.
			*/
			if (timeReachedBoundary !== void 0 && t >= timeReachedBoundary) return spring$1.next(t - timeReachedBoundary);
			else {
				!hasUpdatedFrame && applyFriction(t);
				return state;
			}
		}
	};
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/utils/interpolate.mjs
function createMixers(output, ease, customMixer) {
	const mixers = [];
	const mixerFactory = customMixer || MotionGlobalConfig.mix || mix;
	const numMixers = output.length - 1;
	for (let i = 0; i < numMixers; i++) {
		let mixer = mixerFactory(output[i], output[i + 1]);
		if (ease) mixer = pipe(Array.isArray(ease) ? ease[i] || noop : ease, mixer);
		mixers.push(mixer);
	}
	return mixers;
}
/**
* Create a function that maps from a numerical input array to a generic output array.
*
* Accepts:
*   - Numbers
*   - Colors (hex, hsl, hsla, rgb, rgba)
*   - Complex (combinations of one or more numbers or strings)
*
* ```jsx
* const mixColor = interpolate([0, 1], ['#fff', '#000'])
*
* mixColor(0.5) // 'rgba(128, 128, 128, 1)'
* ```
*
* TODO Revisit this approach once we've moved to data models for values,
* probably not needed to pregenerate mixer functions.
*
* @public
*/
function interpolate(input, output, { clamp: isClamp = true, ease, mixer } = {}) {
	const inputLength = input.length;
	invariant(inputLength === output.length, "Both input and output ranges must be the same length", "range-length");
	/**
	* If we're only provided a single input, we can just make a function
	* that returns the output.
	*/
	if (inputLength === 1) return () => output[0];
	if (inputLength === 2 && output[0] === output[1]) return () => output[1];
	const isZeroDeltaRange = input[0] === input[1];
	if (input[0] > input[inputLength - 1]) {
		input = [...input].reverse();
		output = [...output].reverse();
	}
	const mixers = createMixers(output, ease, mixer);
	const numMixers = mixers.length;
	const interpolator = (v) => {
		if (isZeroDeltaRange && v < input[0]) return output[0];
		let i = 0;
		if (numMixers > 1) {
			for (; i < input.length - 2; i++) if (v < input[i + 1]) break;
		}
		const progressInRange = /* @__PURE__ */ progress(input[i], input[i + 1], v);
		return mixers[i](progressInRange);
	};
	return isClamp ? (v) => interpolator(clamp(input[0], input[inputLength - 1], v)) : interpolator;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/keyframes/offsets/fill.mjs
function fillOffset(offset, remaining) {
	const min = offset[offset.length - 1];
	for (let i = 1; i <= remaining; i++) {
		const offsetProgress = /* @__PURE__ */ progress(0, remaining, i);
		offset.push(mixNumber(min, 1, offsetProgress));
	}
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/keyframes/offsets/default.mjs
function defaultOffset(arr) {
	const offset = [0];
	fillOffset(offset, arr.length - 1);
	return offset;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/keyframes/offsets/time.mjs
function convertOffsetToTimes(offset, duration) {
	return offset.map((o) => o * duration);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/generators/keyframes.mjs
function defaultEasing(values, easing) {
	return values.map(() => easing || easeInOut).splice(0, values.length - 1);
}
function keyframes({ duration = 300, keyframes: keyframeValues, times, ease = "easeInOut" }) {
	/**
	* Easing functions can be externally defined as strings. Here we convert them
	* into actual functions.
	*/
	const easingFunctions = /* @__PURE__ */ isEasingArray(ease) ? ease.map(easingDefinitionToFunction) : easingDefinitionToFunction(ease);
	/**
	* This is the Iterator-spec return value. We ensure it's mutable rather than using a generator
	* to reduce GC during animation.
	*/
	const state = {
		done: false,
		value: keyframeValues[0]
	};
	const mapTimeToKeyframe = interpolate(convertOffsetToTimes(times && times.length === keyframeValues.length ? times : defaultOffset(keyframeValues), duration), keyframeValues, { ease: Array.isArray(easingFunctions) ? easingFunctions : defaultEasing(keyframeValues, easingFunctions) });
	return {
		calculatedDuration: duration,
		next: (t) => {
			state.value = mapTimeToKeyframe(t);
			state.done = t >= duration;
			return state;
		}
	};
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/generators/utils/velocity.mjs
var velocitySampleDuration = 5;
function getGeneratorVelocity(resolveValue, t, current) {
	const prevT = Math.max(t - velocitySampleDuration, 0);
	return /* @__PURE__ */ velocityPerSecond(current - resolveValue(prevT), t - prevT);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/keyframes/get-final.mjs
var isNotNull = (value) => value !== null;
function getFinalKeyframe(keyframes, { repeat, repeatType = "loop" }, finalKeyframe, speed = 1) {
	const resolvedKeyframes = keyframes.filter(isNotNull);
	const index = speed < 0 || repeat && repeatType !== "loop" && repeat % 2 === 1 ? 0 : resolvedKeyframes.length - 1;
	return !index || finalKeyframe === void 0 ? resolvedKeyframes[index] : finalKeyframe;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/utils/replace-transition-type.mjs
var transitionTypeMap = {
	decay: inertia,
	inertia,
	tween: keyframes,
	keyframes,
	spring
};
function replaceTransitionType(transition) {
	if (typeof transition.type === "string") transition.type = transitionTypeMap[transition.type];
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/utils/WithPromise.mjs
var WithPromise = class {
	constructor() {
		this.updateFinished();
	}
	get finished() {
		return this._finished;
	}
	updateFinished() {
		this._finished = new Promise((resolve) => {
			this.resolve = resolve;
		});
	}
	notifyFinished() {
		this.resolve();
	}
	/**
	* Allows the animation to be awaited.
	*
	* @deprecated Use `finished` instead.
	*/
	then(onResolve, onReject) {
		return this.finished.then(onResolve, onReject);
	}
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/JSAnimation.mjs
var percentToProgress = (percent) => percent / 100;
var JSAnimation = class extends WithPromise {
	constructor(options) {
		super();
		this.state = "idle";
		this.startTime = null;
		this.isStopped = false;
		/**
		* The current time of the animation.
		*/
		this.currentTime = 0;
		/**
		* The time at which the animation was paused.
		*/
		this.holdTime = null;
		/**
		* Playback speed as a factor. 0 would be stopped, -1 reverse and 2 double speed.
		*/
		this.playbackSpeed = 1;
		/**
		* Reusable state object for the delay phase to avoid
		* allocating a new object every frame.
		*/
		this.delayState = {
			done: false,
			value: void 0
		};
		/**
		* This method is bound to the instance to fix a pattern where
		* animation.stop is returned as a reference from a useEffect.
		*/
		this.stop = () => {
			const { motionValue } = this.options;
			if (motionValue && motionValue.updatedAt !== time.now()) this.tick(time.now());
			this.isStopped = true;
			if (this.state === "idle") return;
			this.teardown();
			this.options.onStop?.();
		};
		this.options = options;
		this.initAnimation();
		this.play();
		if (options.autoplay === false) this.pause();
	}
	initAnimation() {
		const { options } = this;
		replaceTransitionType(options);
		const { type = keyframes, repeat = 0, repeatDelay = 0, repeatType, velocity = 0 } = options;
		let { keyframes: keyframes$1 } = options;
		const generatorFactory = type || keyframes;
		if (generatorFactory !== keyframes) invariant(keyframes$1.length <= 2, `Only two keyframes currently supported with spring and inertia animations. Trying to animate ${keyframes$1}`, "spring-two-frames");
		if (generatorFactory !== keyframes && typeof keyframes$1[0] !== "number") {
			this.mixKeyframes = pipe(percentToProgress, mix(keyframes$1[0], keyframes$1[1]));
			keyframes$1 = [0, 100];
		}
		const generator = generatorFactory({
			...options,
			keyframes: keyframes$1
		});
		/**
		* If we have a mirror repeat type we need to create a second generator that outputs the
		* mirrored (not reversed) animation and later ping pong between the two generators.
		*/
		if (repeatType === "mirror") this.mirroredGenerator = generatorFactory({
			...options,
			keyframes: [...keyframes$1].reverse(),
			velocity: -velocity
		});
		/**
		* If duration is undefined and we have repeat options,
		* we need to calculate a duration from the generator.
		*
		* We set it to the generator itself to cache the duration.
		* Any timeline resolver will need to have already precalculated
		* the duration by this step.
		*/
		if (generator.calculatedDuration === null) generator.calculatedDuration = calcGeneratorDuration(generator);
		const { calculatedDuration } = generator;
		this.calculatedDuration = calculatedDuration;
		this.resolvedDuration = calculatedDuration + repeatDelay;
		this.totalDuration = this.resolvedDuration * (repeat + 1) - repeatDelay;
		this.generator = generator;
	}
	updateTime(timestamp) {
		const animationTime = Math.round(timestamp - this.startTime) * this.playbackSpeed;
		if (this.holdTime !== null) this.currentTime = this.holdTime;
		else this.currentTime = animationTime;
	}
	tick(timestamp, sample = false) {
		const { generator, totalDuration, mixKeyframes, mirroredGenerator, resolvedDuration, calculatedDuration } = this;
		if (this.startTime === null) return generator.next(0);
		const { delay = 0, keyframes, repeat, repeatType, repeatDelay, type, onUpdate, finalKeyframe } = this.options;
		/**
		* requestAnimationFrame timestamps can come through as lower than
		* the startTime as set by performance.now(). Here we prevent this,
		* though in the future it could be possible to make setting startTime
		* a pending operation that gets resolved here.
		*/
		if (this.speed > 0) this.startTime = Math.min(this.startTime, timestamp);
		else if (this.speed < 0) this.startTime = Math.min(timestamp - totalDuration / this.speed, this.startTime);
		if (sample) this.currentTime = timestamp;
		else this.updateTime(timestamp);
		const timeWithoutDelay = this.currentTime - delay * (this.playbackSpeed >= 0 ? 1 : -1);
		const isInDelayPhase = this.playbackSpeed >= 0 ? timeWithoutDelay < 0 : timeWithoutDelay > totalDuration;
		this.currentTime = Math.max(timeWithoutDelay, 0);
		if (this.state === "finished" && this.holdTime === null) this.currentTime = totalDuration;
		let elapsed = this.currentTime;
		let frameGenerator = generator;
		if (repeat) {
			/**
			* Get the current progress (0-1) of the animation. If t is >
			* than duration we'll get values like 2.5 (midway through the
			* third iteration)
			*/
			const progress = Math.min(this.currentTime, totalDuration) / resolvedDuration;
			/**
			* Get the current iteration (0 indexed). For instance the floor of
			* 2.5 is 2.
			*/
			let currentIteration = Math.floor(progress);
			/**
			* Get the current progress of the iteration by taking the remainder
			* so 2.5 is 0.5 through iteration 2
			*/
			let iterationProgress = progress % 1;
			/**
			* If iteration progress is 1 we count that as the end
			* of the previous iteration.
			*/
			if (!iterationProgress && progress >= 1) iterationProgress = 1;
			iterationProgress === 1 && currentIteration--;
			currentIteration = Math.min(currentIteration, repeat + 1);
			if (Boolean(currentIteration % 2)) {
				if (repeatType === "reverse") {
					iterationProgress = 1 - iterationProgress;
					if (repeatDelay) iterationProgress -= repeatDelay / resolvedDuration;
				} else if (repeatType === "mirror") frameGenerator = mirroredGenerator;
			}
			elapsed = clamp(0, 1, iterationProgress) * resolvedDuration;
		}
		/**
		* If we're in negative time, set state as the initial keyframe.
		* This prevents delay: x, duration: 0 animations from finishing
		* instantly.
		*/
		let state;
		if (isInDelayPhase) {
			this.delayState.value = keyframes[0];
			state = this.delayState;
		} else state = frameGenerator.next(elapsed);
		if (mixKeyframes && !isInDelayPhase) state.value = mixKeyframes(state.value);
		let { done } = state;
		if (!isInDelayPhase && calculatedDuration !== null) done = this.playbackSpeed >= 0 ? this.currentTime >= totalDuration : this.currentTime <= 0;
		const isAnimationFinished = this.holdTime === null && (this.state === "finished" || this.state === "running" && done);
		if (isAnimationFinished && type !== inertia) state.value = getFinalKeyframe(keyframes, this.options, finalKeyframe, this.speed);
		if (onUpdate) onUpdate(state.value);
		if (isAnimationFinished) this.finish();
		return state;
	}
	/**
	* Allows the returned animation to be awaited or promise-chained. Currently
	* resolves when the animation finishes at all but in a future update could/should
	* reject if its cancels.
	*/
	then(resolve, reject) {
		return this.finished.then(resolve, reject);
	}
	get duration() {
		return /* @__PURE__ */ millisecondsToSeconds(this.calculatedDuration);
	}
	get iterationDuration() {
		const { delay = 0 } = this.options || {};
		return this.duration + /* @__PURE__ */ millisecondsToSeconds(delay);
	}
	get time() {
		return /* @__PURE__ */ millisecondsToSeconds(this.currentTime);
	}
	set time(newTime) {
		newTime = /* @__PURE__ */ secondsToMilliseconds(newTime);
		this.currentTime = newTime;
		if (this.startTime === null || this.holdTime !== null || this.playbackSpeed === 0) this.holdTime = newTime;
		else if (this.driver) this.startTime = this.driver.now() - newTime / this.playbackSpeed;
		if (this.driver) this.driver.start(false);
		else {
			this.startTime = 0;
			this.state = "paused";
			this.holdTime = newTime;
			this.tick(newTime);
		}
	}
	/**
	* Returns the generator's velocity at the current time in units/second.
	* Uses the analytical derivative when available (springs), avoiding
	* the MotionValue's frame-dependent velocity estimation.
	*/
	getGeneratorVelocity() {
		const t = this.currentTime;
		if (t <= 0) return this.options.velocity || 0;
		if (this.generator.velocity) return this.generator.velocity(t);
		const current = this.generator.next(t).value;
		return getGeneratorVelocity((s) => this.generator.next(s).value, t, current);
	}
	get speed() {
		return this.playbackSpeed;
	}
	set speed(newSpeed) {
		const hasChanged = this.playbackSpeed !== newSpeed;
		if (hasChanged && this.driver) this.updateTime(time.now());
		this.playbackSpeed = newSpeed;
		if (hasChanged && this.driver) this.time = /* @__PURE__ */ millisecondsToSeconds(this.currentTime);
	}
	play() {
		if (this.isStopped) return;
		const { driver = frameloopDriver, startTime } = this.options;
		if (!this.driver) this.driver = driver((timestamp) => this.tick(timestamp));
		this.options.onPlay?.();
		const now = this.driver.now();
		if (this.state === "finished") {
			this.updateFinished();
			this.startTime = now;
		} else if (this.holdTime !== null) this.startTime = now - this.holdTime;
		else if (!this.startTime) this.startTime = startTime ?? now;
		if (this.state === "finished" && this.speed < 0) this.startTime += this.calculatedDuration;
		this.holdTime = null;
		/**
		* Set playState to running only after we've used it in
		* the previous logic.
		*/
		this.state = "running";
		this.driver.start();
	}
	pause() {
		this.state = "paused";
		this.updateTime(time.now());
		this.holdTime = this.currentTime;
	}
	complete() {
		if (this.state !== "running") this.play();
		this.state = "finished";
		this.holdTime = null;
	}
	finish() {
		this.notifyFinished();
		this.teardown();
		this.state = "finished";
		this.options.onComplete?.();
	}
	cancel() {
		this.holdTime = null;
		this.startTime = 0;
		this.tick(0);
		this.teardown();
		this.options.onCancel?.();
	}
	teardown() {
		this.state = "idle";
		this.stopDriver();
		this.startTime = this.holdTime = null;
	}
	stopDriver() {
		if (!this.driver) return;
		this.driver.stop();
		this.driver = void 0;
	}
	sample(sampleTime) {
		this.startTime = 0;
		return this.tick(sampleTime, true);
	}
	attachTimeline(timeline) {
		if (this.options.allowFlatten) {
			this.options.type = "keyframes";
			this.options.ease = "linear";
			this.initAnimation();
		}
		this.driver?.stop();
		return timeline.observe(this);
	}
};
function animateValue(options) {
	return new JSAnimation(options);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/keyframes/utils/fill-wildcards.mjs
function fillWildcards(keyframes) {
	for (let i = 1; i < keyframes.length; i++) keyframes[i] ?? (keyframes[i] = keyframes[i - 1]);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/dom/parse-transform.mjs
var radToDeg = (rad) => rad * 180 / Math.PI;
var rotate = (v) => {
	return rebaseAngle(radToDeg(Math.atan2(v[1], v[0])));
};
var matrix2dParsers = {
	x: 4,
	y: 5,
	translateX: 4,
	translateY: 5,
	scaleX: 0,
	scaleY: 3,
	scale: (v) => (Math.abs(v[0]) + Math.abs(v[3])) / 2,
	rotate,
	rotateZ: rotate,
	skewX: (v) => radToDeg(Math.atan(v[1])),
	skewY: (v) => radToDeg(Math.atan(v[2])),
	skew: (v) => (Math.abs(v[1]) + Math.abs(v[2])) / 2
};
var rebaseAngle = (angle) => {
	angle = angle % 360;
	if (angle < 0) angle += 360;
	return angle;
};
var rotateZ = rotate;
var scaleX = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1]);
var scaleY = (v) => Math.sqrt(v[4] * v[4] + v[5] * v[5]);
var matrix3dParsers = {
	x: 12,
	y: 13,
	z: 14,
	translateX: 12,
	translateY: 13,
	translateZ: 14,
	scaleX,
	scaleY,
	scale: (v) => (scaleX(v) + scaleY(v)) / 2,
	rotateX: (v) => rebaseAngle(radToDeg(Math.atan2(v[6], v[5]))),
	rotateY: (v) => rebaseAngle(radToDeg(Math.atan2(-v[2], v[0]))),
	rotateZ,
	rotate: rotateZ,
	skewX: (v) => radToDeg(Math.atan(v[4])),
	skewY: (v) => radToDeg(Math.atan(v[1])),
	skew: (v) => (Math.abs(v[1]) + Math.abs(v[4])) / 2
};
function defaultTransformValue(name) {
	return name.includes("scale") ? 1 : 0;
}
function parseValueFromTransform(transform, name) {
	if (!transform || transform === "none") return defaultTransformValue(name);
	const matrix3dMatch = transform.match(/^matrix3d\(([-\d.e\s,]+)\)$/u);
	let parsers;
	let match;
	if (matrix3dMatch) {
		parsers = matrix3dParsers;
		match = matrix3dMatch;
	} else {
		const matrix2dMatch = transform.match(/^matrix\(([-\d.e\s,]+)\)$/u);
		parsers = matrix2dParsers;
		match = matrix2dMatch;
	}
	if (!match) return defaultTransformValue(name);
	const valueParser = parsers[name];
	const values = match[1].split(",").map(convertTransformToNumber);
	return typeof valueParser === "function" ? valueParser(values) : values[valueParser];
}
var readTransformValue = (instance, name) => {
	const { transform = "none" } = getComputedStyle(instance);
	return parseValueFromTransform(transform, name);
};
function convertTransformToNumber(value) {
	return parseFloat(value.trim());
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/utils/keys-transform.mjs
/**
* Generate a list of every possible transform key.
*/
var transformPropOrder = [
	"transformPerspective",
	"x",
	"y",
	"z",
	"translateX",
	"translateY",
	"translateZ",
	"scale",
	"scaleX",
	"scaleY",
	"rotate",
	"rotateX",
	"rotateY",
	"rotateZ",
	"skew",
	"skewX",
	"skewY"
];
/**
* A quick lookup for transform props.
*
* `pathRotation` is a transform for routing purposes (skipped from raw
* style application, wired to the transform composite, flags transform
* dirty) but is intentionally NOT in `transformPropOrder` — it is
* composed onto `rotate` at the build sites, not serialized in its own
* slot, and must stay out of the order-array consumers (parse-transform,
* unit-conversion, keys-position).
*/
var transformProps = /*@__PURE__*/ (() => /* @__PURE__ */ new Set([...transformPropOrder, "pathRotation"]))();
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/keyframes/utils/unit-conversion.mjs
var isNumOrPxType = (v) => v === number || v === px;
var transformKeys = /* @__PURE__ */ new Set([
	"x",
	"y",
	"z"
]);
var nonTranslationalTransformKeys = transformPropOrder.filter((key) => !transformKeys.has(key));
function removeNonTranslationalTransform(visualElement) {
	const removedTransforms = [];
	nonTranslationalTransformKeys.forEach((key) => {
		const value = visualElement.getValue(key);
		if (value !== void 0) {
			removedTransforms.push([key, value.get()]);
			value.set(key.startsWith("scale") ? 1 : 0);
		}
	});
	return removedTransforms;
}
var positionalValues = {
	width: ({ x }, { paddingLeft = "0", paddingRight = "0", boxSizing }) => {
		const width = x.max - x.min;
		return boxSizing === "border-box" ? width : width - parseFloat(paddingLeft) - parseFloat(paddingRight);
	},
	height: ({ y }, { paddingTop = "0", paddingBottom = "0", boxSizing }) => {
		const height = y.max - y.min;
		return boxSizing === "border-box" ? height : height - parseFloat(paddingTop) - parseFloat(paddingBottom);
	},
	top: (_bbox, { top }) => parseFloat(top),
	left: (_bbox, { left }) => parseFloat(left),
	bottom: ({ y }, { top }) => parseFloat(top) + (y.max - y.min),
	right: ({ x }, { left }) => parseFloat(left) + (x.max - x.min),
	x: (_bbox, { transform }) => parseValueFromTransform(transform, "x"),
	y: (_bbox, { transform }) => parseValueFromTransform(transform, "y")
};
positionalValues.translateX = positionalValues.x;
positionalValues.translateY = positionalValues.y;
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/keyframes/KeyframesResolver.mjs
var toResolve = /* @__PURE__ */ new Set();
var isScheduled = false;
var anyNeedsMeasurement = false;
var isForced = false;
function measureAllKeyframes() {
	if (anyNeedsMeasurement) {
		const resolversToMeasure = Array.from(toResolve).filter((resolver) => resolver.needsMeasurement);
		const elementsToMeasure = new Set(resolversToMeasure.map((resolver) => resolver.element));
		const transformsToRestore = /* @__PURE__ */ new Map();
		/**
		* Write pass
		* If we're measuring elements we want to remove bounding box-changing transforms.
		*/
		elementsToMeasure.forEach((element) => {
			const removedTransforms = removeNonTranslationalTransform(element);
			if (!removedTransforms.length) return;
			transformsToRestore.set(element, removedTransforms);
			element.render();
		});
		resolversToMeasure.forEach((resolver) => resolver.measureInitialState());
		elementsToMeasure.forEach((element) => {
			element.render();
			const restore = transformsToRestore.get(element);
			if (restore) restore.forEach(([key, value]) => {
				element.getValue(key)?.set(value);
			});
		});
		resolversToMeasure.forEach((resolver) => resolver.measureEndState());
		resolversToMeasure.forEach((resolver) => {
			if (resolver.suspendedScrollY !== void 0) window.scrollTo(0, resolver.suspendedScrollY);
		});
	}
	anyNeedsMeasurement = false;
	isScheduled = false;
	toResolve.forEach((resolver) => resolver.complete(isForced));
	toResolve.clear();
}
function readAllKeyframes() {
	toResolve.forEach((resolver) => {
		resolver.readKeyframes();
		if (resolver.needsMeasurement) anyNeedsMeasurement = true;
	});
}
function flushKeyframeResolvers() {
	isForced = true;
	readAllKeyframes();
	measureAllKeyframes();
	isForced = false;
}
var KeyframeResolver = class {
	constructor(unresolvedKeyframes, onComplete, name, motionValue, element, isAsync = false) {
		this.state = "pending";
		/**
		* Track whether this resolver is async. If it is, it'll be added to the
		* resolver queue and flushed in the next frame. Resolvers that aren't going
		* to trigger read/write thrashing don't need to be async.
		*/
		this.isAsync = false;
		/**
		* Track whether this resolver needs to perform a measurement
		* to resolve its keyframes.
		*/
		this.needsMeasurement = false;
		this.unresolvedKeyframes = [...unresolvedKeyframes];
		this.onComplete = onComplete;
		this.name = name;
		this.motionValue = motionValue;
		this.element = element;
		this.isAsync = isAsync;
	}
	scheduleResolve() {
		this.state = "scheduled";
		if (this.isAsync) {
			toResolve.add(this);
			if (!isScheduled) {
				isScheduled = true;
				frame.read(readAllKeyframes);
				frame.resolveKeyframes(measureAllKeyframes);
			}
		} else {
			this.readKeyframes();
			this.complete();
		}
	}
	readKeyframes() {
		const { unresolvedKeyframes, name, element, motionValue } = this;
		if (unresolvedKeyframes[0] === null) {
			const currentValue = motionValue?.get();
			const finalKeyframe = unresolvedKeyframes[unresolvedKeyframes.length - 1];
			if (currentValue !== void 0) unresolvedKeyframes[0] = currentValue;
			else if (element && name) {
				const valueAsRead = element.readValue(name, finalKeyframe);
				if (valueAsRead !== void 0 && valueAsRead !== null) unresolvedKeyframes[0] = valueAsRead;
			}
			if (unresolvedKeyframes[0] === void 0) unresolvedKeyframes[0] = finalKeyframe;
			if (motionValue && currentValue === void 0) motionValue.set(unresolvedKeyframes[0]);
		}
		fillWildcards(unresolvedKeyframes);
	}
	setFinalKeyframe() {}
	measureInitialState() {}
	renderEndStyles() {}
	measureEndState() {}
	complete(isForcedComplete = false) {
		this.state = "complete";
		this.onComplete(this.unresolvedKeyframes, this.finalKeyframe, isForcedComplete);
		toResolve.delete(this);
	}
	cancel() {
		if (this.state === "scheduled") {
			toResolve.delete(this);
			this.state = "pending";
		}
	}
	resume() {
		if (this.state === "pending") this.scheduleResolve();
	}
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/dom/is-css-var.mjs
var isCSSVar = (name) => name.startsWith("--");
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/dom/style-set.mjs
function setStyle(element, name, value) {
	isCSSVar(name) ? element.style.setProperty(name, value) : element.style[name] = value;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/utils/supports/flags.mjs
/**
* Add the ability for test suites to manually set support flags
* to better test more environments.
*/
var supportsFlags = {};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/utils/supports/memo.mjs
function memoSupports(callback, supportsFlag) {
	const memoized = /* @__PURE__ */ memo(callback);
	return () => supportsFlags[supportsFlag] ?? memoized();
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/utils/supports/scroll-timeline.mjs
var supportsScrollTimeline = /* @__PURE__ */ memoSupports(() => window.ScrollTimeline !== void 0, "scrollTimeline");
var supportsViewTimeline = /* @__PURE__ */ memoSupports(() => window.ViewTimeline !== void 0, "viewTimeline");
//#endregion
//#region ../../node_modules/motion-dom/dist/es/utils/supports/linear-easing.mjs
var supportsLinearEasing = /*@__PURE__*/ memoSupports(() => {
	try {
		document.createElement("div").animate({ opacity: 0 }, { easing: "linear(0, 1)" });
	} catch (e) {
		return false;
	}
	return true;
}, "linearEasing");
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/waapi/easing/cubic-bezier.mjs
var cubicBezierAsString = ([a, b, c, d]) => `cubic-bezier(${a}, ${b}, ${c}, ${d})`;
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/waapi/easing/supported.mjs
var supportedWaapiEasing = {
	linear: "linear",
	ease: "ease",
	easeIn: "ease-in",
	easeOut: "ease-out",
	easeInOut: "ease-in-out",
	circIn: /*@__PURE__*/ cubicBezierAsString([
		0,
		.65,
		.55,
		1
	]),
	circOut: /*@__PURE__*/ cubicBezierAsString([
		.55,
		0,
		1,
		.45
	]),
	backIn: /*@__PURE__*/ cubicBezierAsString([
		.31,
		.01,
		.66,
		-.59
	]),
	backOut: /*@__PURE__*/ cubicBezierAsString([
		.33,
		1.53,
		.69,
		.99
	])
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/waapi/easing/map-easing.mjs
function mapEasingToNativeEasing(easing, duration) {
	if (!easing) return;
	else if (typeof easing === "function") return supportsLinearEasing() ? generateLinearEasing(easing, duration) : "ease-out";
	else if (/* @__PURE__ */ isBezierDefinition(easing)) return cubicBezierAsString(easing);
	else if (Array.isArray(easing)) return easing.map((segmentEasing) => mapEasingToNativeEasing(segmentEasing, duration) || supportedWaapiEasing.easeOut);
	else return supportedWaapiEasing[easing];
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/waapi/start-waapi-animation.mjs
function startWaapiAnimation(element, valueName, keyframes, { delay = 0, duration = 300, repeat = 0, repeatType = "loop", ease = "easeOut", times } = {}, pseudoElement = void 0) {
	const keyframeOptions = { [valueName]: keyframes };
	if (times) keyframeOptions.offset = times;
	const easing = mapEasingToNativeEasing(ease, duration);
	/**
	* If this is an easing array, apply to keyframes, not animation as a whole
	*/
	if (Array.isArray(easing)) keyframeOptions.easing = easing;
	const options = {
		delay,
		duration,
		easing: !Array.isArray(easing) ? easing : "linear",
		fill: "both",
		iterations: repeat + 1,
		direction: repeatType === "reverse" ? "alternate" : "normal"
	};
	if (pseudoElement) options.pseudoElement = pseudoElement;
	return element.animate(keyframeOptions, options);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/generators/utils/is-generator.mjs
function isGenerator(type) {
	return typeof type === "function" && "applyToOptions" in type;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/waapi/utils/apply-generator.mjs
function applyGeneratorOptions({ type, ...options }) {
	if (isGenerator(type) && supportsLinearEasing()) return type.applyToOptions(options);
	else {
		options.duration ?? (options.duration = 300);
		options.ease ?? (options.ease = "easeOut");
	}
	return options;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/NativeAnimation.mjs
/**
* NativeAnimation implements AnimationPlaybackControls for the browser's Web Animations API.
*/
var NativeAnimation = class extends WithPromise {
	constructor(options) {
		super();
		this.finishedTime = null;
		this.isStopped = false;
		/**
		* Tracks a manually-set start time that takes precedence over WAAPI's
		* dynamic startTime. This is cleared when play() or time setter is called,
		* allowing WAAPI to take over timing.
		*/
		this.manualStartTime = null;
		if (!options) return;
		const { element, name, keyframes, pseudoElement, allowFlatten = false, finalKeyframe, onComplete } = options;
		this.isPseudoElement = Boolean(pseudoElement);
		this.allowFlatten = allowFlatten;
		this.options = options;
		invariant(typeof options.type !== "string", `Mini animate() doesn't support "type" as a string.`, "mini-spring");
		const transition = applyGeneratorOptions(options);
		this.animation = startWaapiAnimation(element, name, keyframes, transition, pseudoElement);
		if (transition.autoplay === false) this.animation.pause();
		this.animation.onfinish = () => {
			this.finishedTime = this.time;
			if (!pseudoElement) {
				const keyframe = getFinalKeyframe(keyframes, this.options, finalKeyframe, this.speed);
				if (this.updateMotionValue) this.updateMotionValue(keyframe);
				/**
				* If we can, we want to commit the final style as set by the user,
				* rather than the computed keyframe value supplied by the animation.
				* We always do this, even when a motion value is present, to prevent
				* a visual flash in Firefox where the WAAPI animation's fill is removed
				* during cancel() before the scheduled render can apply the correct value.
				*/
				setStyle(element, name, keyframe);
				this.animation.cancel();
			}
			onComplete?.();
			this.notifyFinished();
		};
	}
	play() {
		if (this.isStopped) return;
		this.manualStartTime = null;
		this.animation.play();
		if (this.state === "finished") this.updateFinished();
	}
	pause() {
		this.animation.pause();
	}
	complete() {
		this.animation.finish?.();
	}
	cancel() {
		try {
			this.animation.cancel();
		} catch (e) {}
	}
	stop() {
		if (this.isStopped) return;
		this.isStopped = true;
		const { state } = this;
		if (state === "idle" || state === "finished") return;
		if (this.updateMotionValue) this.updateMotionValue();
		else this.commitStyles();
		if (!this.isPseudoElement) this.cancel();
	}
	/**
	* WAAPI doesn't natively have any interruption capabilities.
	*
	* In this method, we commit styles back to the DOM before cancelling
	* the animation.
	*
	* This is designed to be overridden by NativeAnimationExtended, which
	* will create a renderless JS animation and sample it twice to calculate
	* its current value, "previous" value, and therefore allow
	* Motion to also correctly calculate velocity for any subsequent animation
	* while deferring the commit until the next animation frame.
	*/
	commitStyles() {
		const element = this.options?.element;
		if (!this.isPseudoElement && element?.isConnected) this.animation.commitStyles?.();
	}
	get duration() {
		const duration = this.animation.effect?.getComputedTiming?.().duration || 0;
		return /* @__PURE__ */ millisecondsToSeconds(Number(duration));
	}
	get iterationDuration() {
		const { delay = 0 } = this.options || {};
		return this.duration + /* @__PURE__ */ millisecondsToSeconds(delay);
	}
	get time() {
		return /* @__PURE__ */ millisecondsToSeconds(Number(this.animation.currentTime) || 0);
	}
	set time(newTime) {
		const wasFinished = this.finishedTime !== null;
		this.manualStartTime = null;
		this.finishedTime = null;
		this.animation.currentTime = /* @__PURE__ */ secondsToMilliseconds(newTime);
		if (wasFinished) this.animation.pause();
	}
	/**
	* The playback speed of the animation.
	* 1 = normal speed, 2 = double speed, 0.5 = half speed.
	*/
	get speed() {
		return this.animation.playbackRate;
	}
	set speed(newSpeed) {
		if (newSpeed < 0) this.finishedTime = null;
		this.animation.playbackRate = newSpeed;
	}
	get state() {
		return this.finishedTime !== null ? "finished" : this.animation.playState;
	}
	get startTime() {
		return this.manualStartTime ?? Number(this.animation.startTime);
	}
	set startTime(newStartTime) {
		this.manualStartTime = this.animation.startTime = newStartTime;
	}
	/**
	* Attaches a timeline to the animation, for instance the `ScrollTimeline`.
	*/
	attachTimeline({ timeline, rangeStart, rangeEnd, observe }) {
		if (this.allowFlatten) this.animation.effect?.updateTiming({ easing: "linear" });
		this.animation.onfinish = null;
		if (timeline && supportsScrollTimeline()) {
			this.animation.timeline = timeline;
			if (rangeStart) this.animation.rangeStart = rangeStart;
			if (rangeEnd) this.animation.rangeEnd = rangeEnd;
			return noop;
		} else return observe(this);
	}
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/waapi/utils/unsupported-easing.mjs
var unsupportedEasingFunctions = {
	anticipate,
	backInOut,
	circInOut
};
function isUnsupportedEase(key) {
	return key in unsupportedEasingFunctions;
}
function replaceStringEasing(transition) {
	if (typeof transition.ease === "string" && isUnsupportedEase(transition.ease)) transition.ease = unsupportedEasingFunctions[transition.ease];
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/NativeAnimationExtended.mjs
/**
* 10ms is chosen here as it strikes a balance between smooth
* results (more than one keyframe per frame at 60fps) and
* keyframe quantity.
*/
var sampleDelta = 10;
var NativeAnimationExtended = class extends NativeAnimation {
	constructor(options) {
		/**
		* The base NativeAnimation function only supports a subset
		* of Motion easings, and WAAPI also only supports some
		* easing functions via string/cubic-bezier definitions.
		*
		* This function replaces those unsupported easing functions
		* with a JS easing function. This will later get compiled
		* to a linear() easing function.
		*/
		replaceStringEasing(options);
		/**
		* Ensure we replace the transition type with a generator function
		* before passing to WAAPI.
		*
		* TODO: Does this have a better home? It could be shared with
		* JSAnimation.
		*/
		replaceTransitionType(options);
		super(options);
		/**
		* Only set startTime when the animation should autoplay.
		* Setting startTime on a paused WAAPI animation unpauses it
		* (per the WAAPI spec), which breaks autoplay: false.
		*/
		if (options.startTime !== void 0 && options.autoplay !== false) this.startTime = options.startTime;
		this.options = options;
	}
	/**
	* WAAPI doesn't natively have any interruption capabilities.
	*
	* Rather than read committed styles back out of the DOM, we can
	* create a renderless JS animation and sample it twice to calculate
	* its current value, "previous" value, and therefore allow
	* Motion to calculate velocity for any subsequent animation.
	*/
	updateMotionValue(value) {
		const { motionValue, onUpdate, onComplete, element, ...options } = this.options;
		if (!motionValue) return;
		if (value !== void 0) {
			motionValue.set(value);
			return;
		}
		const sampleAnimation = new JSAnimation({
			...options,
			autoplay: false
		});
		/**
		* Use wall-clock elapsed time for sampling.
		* Under CPU load, WAAPI's currentTime may not reflect actual
		* elapsed time, causing incorrect sampling and visual jumps.
		*/
		const sampleTime = Math.max(sampleDelta, time.now() - this.startTime);
		const delta = clamp(0, sampleDelta, sampleTime - sampleDelta);
		const current = sampleAnimation.sample(sampleTime).value;
		/**
		* Write the estimated value to inline style so it persists
		* after cancel(), covering the async gap before the next
		* animation starts.
		*/
		const { name } = this.options;
		if (element && name) setStyle(element, name, current);
		motionValue.setWithVelocity(sampleAnimation.sample(Math.max(0, sampleTime - delta)).value, current, delta);
		sampleAnimation.stop();
	}
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/utils/is-animatable.mjs
/**
* Check if a value is animatable. Examples:
*
* ✅: 100, "100px", "#fff"
* ❌: "block", "url(2.jpg)"
* @param value
*
* @internal
*/
var isAnimatable = (value, name) => {
	if (name === "zIndex") return false;
	if (typeof value === "number" || Array.isArray(value)) return true;
	if (typeof value === "string" && (complex.test(value) || value === "0") && !value.startsWith("url(")) return true;
	return false;
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/utils/can-animate.mjs
function hasKeyframesChanged(keyframes) {
	const current = keyframes[0];
	if (keyframes.length === 1) return true;
	for (let i = 0; i < keyframes.length; i++) if (keyframes[i] !== current) return true;
}
function canAnimate(keyframes, name, type, velocity) {
	/**
	* Check if we're able to animate between the start and end keyframes,
	* and throw a warning if we're attempting to animate between one that's
	* animatable and another that isn't.
	*/
	const originKeyframe = keyframes[0];
	if (originKeyframe === null) return false;
	/**
	* These aren't traditionally animatable but we do support them.
	* In future we could look into making this more generic or replacing
	* this function with mix() === mixImmediate
	*/
	if (name === "display" || name === "visibility") return true;
	const targetKeyframe = keyframes[keyframes.length - 1];
	const isOriginAnimatable = isAnimatable(originKeyframe, name);
	const isTargetAnimatable = isAnimatable(targetKeyframe, name);
	warning(isOriginAnimatable === isTargetAnimatable, `You are trying to animate ${name} from "${originKeyframe}" to "${targetKeyframe}". "${isOriginAnimatable ? targetKeyframe : originKeyframe}" is not an animatable value.`, "value-not-animatable");
	if (!isOriginAnimatable || !isTargetAnimatable) return false;
	return hasKeyframesChanged(keyframes) || (type === "spring" || isGenerator(type)) && velocity;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/utils/make-animation-instant.mjs
function makeAnimationInstant(options) {
	options.duration = 0;
	options.type = "keyframes";
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/waapi/utils/accelerated-values.mjs
/**
* A list of values that can be hardware-accelerated.
*/
var acceleratedValues = /* @__PURE__ */ new Set([
	"opacity",
	"clipPath",
	"filter",
	"transform",
	"backgroundColor"
]);
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/waapi/utils/is-browser-color.mjs
var browserColorFunctions = /^(?:oklch|oklab|lab|lch|color|color-mix|light-dark)\(/;
function hasBrowserOnlyColors(keyframes) {
	for (let i = 0; i < keyframes.length; i++) if (typeof keyframes[i] === "string" && browserColorFunctions.test(keyframes[i])) return true;
	return false;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/waapi/supports/waapi.mjs
var colorProperties = /* @__PURE__ */ new Set([
	"color",
	"backgroundColor",
	"outlineColor",
	"fill",
	"stroke",
	"borderColor",
	"borderTopColor",
	"borderRightColor",
	"borderBottomColor",
	"borderLeftColor"
]);
var supportsWaapi = /*@__PURE__*/ memo(() => Object.hasOwnProperty.call(Element.prototype, "animate"));
function supportsBrowserAnimation(options) {
	const { motionValue, name, repeatDelay, repeatType, damping, type, keyframes } = options;
	const subject = motionValue?.owner?.current;
	/**
	* We use instanceof checks instead of isHTMLElement()/isSVGElement()
	* because we explicitly **don't** want elements in different timing
	* contexts (i.e. popups) to be accelerated, as it's not possible to sync
	* these animations properly with those driven from the main window
	* frameloop.
	*/
	if (!(subject instanceof HTMLElement) && !(subject instanceof SVGElement)) return false;
	const { onUpdate, transformTemplate } = motionValue.owner.getProps();
	return supportsWaapi() && name && (acceleratedValues.has(name) || colorProperties.has(name) && hasBrowserOnlyColors(keyframes)) && (name !== "transform" || !transformTemplate) && !onUpdate && !repeatDelay && repeatType !== "mirror" && damping !== 0 && type !== "inertia";
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/AsyncMotionValueAnimation.mjs
/**
* Maximum time allowed between an animation being created and it being
* resolved for us to use the latter as the start time.
*
* This is to ensure that while we prefer to "start" an animation as soon
* as it's triggered, we also want to avoid a visual jump if there's a big delay
* between these two moments.
*/
var MAX_RESOLVE_DELAY = 40;
var AsyncMotionValueAnimation = class extends WithPromise {
	constructor({ autoplay = true, delay = 0, type = "keyframes", repeat = 0, repeatDelay = 0, repeatType = "loop", keyframes, name, motionValue, element, ...options }) {
		super();
		/**
		* Bound to support return animation.stop pattern
		*/
		this.stop = () => {
			if (this._animation) {
				this._animation.stop();
				this.stopTimeline?.();
			}
			this.keyframeResolver?.cancel();
		};
		this.createdAt = time.now();
		const optionsWithDefaults = {
			autoplay,
			delay,
			type,
			repeat,
			repeatDelay,
			repeatType,
			name,
			motionValue,
			element,
			...options
		};
		const KeyframeResolver$1 = element?.KeyframeResolver || KeyframeResolver;
		this.keyframeResolver = new KeyframeResolver$1(keyframes, (resolvedKeyframes, finalKeyframe, forced) => this.onKeyframesResolved(resolvedKeyframes, finalKeyframe, optionsWithDefaults, !forced), name, motionValue, element);
		this.keyframeResolver?.scheduleResolve();
	}
	onKeyframesResolved(keyframes, finalKeyframe, options, sync) {
		this.keyframeResolver = void 0;
		const { name, type, velocity, delay, isHandoff, onUpdate } = options;
		this.resolvedAt = time.now();
		/**
		* If we can't animate this value with the resolved keyframes
		* then we should complete it immediately.
		*/
		let canAnimateValue = true;
		if (!canAnimate(keyframes, name, type, velocity)) {
			canAnimateValue = false;
			if (MotionGlobalConfig.instantAnimations || !delay) onUpdate?.(getFinalKeyframe(keyframes, options, finalKeyframe));
			keyframes[0] = keyframes[keyframes.length - 1];
			makeAnimationInstant(options);
			options.repeat = 0;
		}
		const resolvedOptions = {
			startTime: sync ? !this.resolvedAt ? this.createdAt : this.resolvedAt - this.createdAt > MAX_RESOLVE_DELAY ? this.resolvedAt : this.createdAt : void 0,
			finalKeyframe,
			...options,
			keyframes
		};
		/**
		* Animate via WAAPI if possible. If this is a handoff animation, the optimised animation will be running via
		* WAAPI. Therefore, this animation must be JS to ensure it runs "under" the
		* optimised animation.
		*
		* Also skip WAAPI when keyframes aren't animatable, as the resolved
		* values may not be valid CSS and would trigger browser warnings.
		*/
		const useWaapi = canAnimateValue && !isHandoff && supportsBrowserAnimation(resolvedOptions);
		const element = resolvedOptions.motionValue?.owner?.current;
		let animation;
		if (useWaapi) try {
			animation = new NativeAnimationExtended({
				...resolvedOptions,
				element
			});
		} catch {
			animation = new JSAnimation(resolvedOptions);
		}
		else animation = new JSAnimation(resolvedOptions);
		animation.finished.then(() => {
			this.notifyFinished();
		}).catch(noop);
		if (this.pendingTimeline) {
			this.stopTimeline = animation.attachTimeline(this.pendingTimeline);
			this.pendingTimeline = void 0;
		}
		this._animation = animation;
	}
	get finished() {
		if (!this._animation) return this._finished;
		else return this.animation.finished;
	}
	then(onResolve, _onReject) {
		return this.finished.finally(onResolve).then(() => {});
	}
	get animation() {
		if (!this._animation) {
			this.keyframeResolver?.resume();
			flushKeyframeResolvers();
		}
		return this._animation;
	}
	get duration() {
		return this.animation.duration;
	}
	get iterationDuration() {
		return this.animation.iterationDuration;
	}
	get time() {
		return this.animation.time;
	}
	set time(newTime) {
		this.animation.time = newTime;
	}
	get speed() {
		return this.animation.speed;
	}
	get state() {
		return this.animation.state;
	}
	set speed(newSpeed) {
		this.animation.speed = newSpeed;
	}
	get startTime() {
		return this.animation.startTime;
	}
	attachTimeline(timeline) {
		if (this._animation) this.stopTimeline = this.animation.attachTimeline(timeline);
		else this.pendingTimeline = timeline;
		return () => this.stop();
	}
	play() {
		this.animation.play();
	}
	pause() {
		this.animation.pause();
	}
	complete() {
		this.animation.complete();
	}
	cancel() {
		if (this._animation) this.animation.cancel();
		this.keyframeResolver?.cancel();
	}
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/GroupAnimation.mjs
var GroupAnimation = class {
	constructor(animations) {
		this.stop = () => this.runAll("stop");
		this.animations = animations.filter(Boolean);
	}
	get finished() {
		return Promise.all(this.animations.map((animation) => animation.finished));
	}
	/**
	* TODO: Filter out cancelled or stopped animations before returning
	*/
	getAll(propName) {
		return this.animations[0][propName];
	}
	setAll(propName, newValue) {
		for (let i = 0; i < this.animations.length; i++) this.animations[i][propName] = newValue;
	}
	attachTimeline(timeline) {
		const subscriptions = this.animations.map((animation) => animation.attachTimeline(timeline));
		return () => {
			subscriptions.forEach((cancel, i) => {
				cancel && cancel();
				this.animations[i].stop();
			});
		};
	}
	get time() {
		return this.getAll("time");
	}
	set time(time) {
		this.setAll("time", time);
	}
	get speed() {
		return this.getAll("speed");
	}
	set speed(speed) {
		this.setAll("speed", speed);
	}
	get state() {
		return this.getAll("state");
	}
	get startTime() {
		return this.getAll("startTime");
	}
	get duration() {
		return getMax(this.animations, "duration");
	}
	get iterationDuration() {
		return getMax(this.animations, "iterationDuration");
	}
	runAll(methodName) {
		this.animations.forEach((controls) => controls[methodName]());
	}
	play() {
		this.runAll("play");
	}
	pause() {
		this.runAll("pause");
	}
	cancel() {
		this.runAll("cancel");
	}
	complete() {
		this.runAll("complete");
	}
};
function getMax(animations, propName) {
	let max = 0;
	for (let i = 0; i < animations.length; i++) {
		const value = animations[i][propName];
		if (value !== null && value > max) max = value;
	}
	return max;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/GroupAnimationWithThen.mjs
var GroupAnimationWithThen = class extends GroupAnimation {
	then(onResolve, _onReject) {
		return this.finished.finally(onResolve).then(() => {});
	}
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/NativeAnimationWrapper.mjs
var NativeAnimationWrapper = class extends NativeAnimation {
	constructor(animation) {
		super();
		this.animation = animation;
		animation.onfinish = () => {
			this.finishedTime = this.time;
			this.notifyFinished();
		};
	}
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/utils/active-animations.mjs
var animationMaps = /* @__PURE__ */ new WeakMap();
var animationMapKey = (name, pseudoElement = "") => `${name}:${pseudoElement}`;
function getAnimationMap(element) {
	let map = animationMaps.get(element);
	if (!map) {
		map = /* @__PURE__ */ new Map();
		animationMaps.set(element, map);
	}
	return map;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/utils/calc-child-stagger.mjs
function calcChildStagger(children, child, delayChildren, staggerChildren = 0, staggerDirection = 1) {
	const index = Array.from(children).sort((a, b) => a.sortNodePosition(b)).indexOf(child);
	const numChildren = children.size;
	const maxStaggerDuration = (numChildren - 1) * staggerChildren;
	return typeof delayChildren === "function" ? delayChildren(index, numChildren) : staggerDirection === 1 ? index * staggerChildren : maxStaggerDuration - index * staggerChildren;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/index.mjs
/**
* Maximum time between the value of two frames, beyond which we
* assume the velocity has since been 0.
*/
var MAX_VELOCITY_DELTA = 30;
var isFloat = (value) => {
	return !isNaN(parseFloat(value));
};
var collectMotionValues = { current: void 0 };
/**
* `MotionValue` is used to track the state and velocity of motion values.
*
* @public
*/
var MotionValue = class {
	/**
	* @param init - The initiating value
	* @param config - Optional configuration options
	*
	* -  `transformer`: A function to transform incoming values with.
	*/
	constructor(init, options = {}) {
		/**
		* Tracks whether this value can output a velocity. Currently this is only true
		* if the value is numerical, but we might be able to widen the scope here and support
		* other value types.
		*
		* @internal
		*/
		this.canTrackVelocity = null;
		/**
		* An object containing a SubscriptionManager for each active event.
		*/
		this.events = {};
		this.updateAndNotify = (v) => {
			const currentTime = time.now();
			/**
			* If we're updating the value during another frame or eventloop
			* than the previous frame, then the we set the previous frame value
			* to current.
			*/
			if (this.updatedAt !== currentTime) this.setPrevFrameValue();
			this.prev = this.current;
			this.setCurrent(v);
			if (this.current !== this.prev) {
				this.events.change?.notify(this.current);
				if (this.dependents) for (const dependent of this.dependents) dependent.dirty();
			}
		};
		this.hasAnimated = false;
		this.setCurrent(init);
		this.owner = options.owner;
	}
	setCurrent(current) {
		this.current = current;
		this.updatedAt = time.now();
		if (this.canTrackVelocity === null && current !== void 0) this.canTrackVelocity = isFloat(this.current);
	}
	setPrevFrameValue(prevFrameValue = this.current) {
		this.prevFrameValue = prevFrameValue;
		this.prevUpdatedAt = this.updatedAt;
	}
	/**
	* Adds a function that will be notified when the `MotionValue` is updated.
	*
	* It returns a function that, when called, will cancel the subscription.
	*
	* When calling `onChange` inside a React component, it should be wrapped with the
	* `useEffect` hook. As it returns an unsubscribe function, this should be returned
	* from the `useEffect` function to ensure you don't add duplicate subscribers..
	*
	* ```jsx
	* export const MyComponent = () => {
	*   const x = useMotionValue(0)
	*   const y = useMotionValue(0)
	*   const opacity = useMotionValue(1)
	*
	*   useEffect(() => {
	*     function updateOpacity() {
	*       const maxXY = Math.max(x.get(), y.get())
	*       const newOpacity = transform(maxXY, [0, 100], [1, 0])
	*       opacity.set(newOpacity)
	*     }
	*
	*     const unsubscribeX = x.on("change", updateOpacity)
	*     const unsubscribeY = y.on("change", updateOpacity)
	*
	*     return () => {
	*       unsubscribeX()
	*       unsubscribeY()
	*     }
	*   }, [])
	*
	*   return <motion.div style={{ x }} />
	* }
	* ```
	*
	* @param subscriber - A function that receives the latest value.
	* @returns A function that, when called, will cancel this subscription.
	*
	* @deprecated
	*/
	onChange(subscription) {
		warnOnce(false, `value.onChange(callback) is deprecated. Switch to value.on("change", callback).`);
		return this.on("change", subscription);
	}
	on(eventName, callback) {
		if (!this.events[eventName]) this.events[eventName] = new SubscriptionManager();
		const unsubscribe = this.events[eventName].add(callback);
		if (eventName === "change") return () => {
			unsubscribe();
			/**
			* If we have no more change listeners by the start
			* of the next frame, stop active animations.
			*/
			frame.read(() => {
				if (!this.events.change.getSize()) this.stop();
			});
		};
		return unsubscribe;
	}
	clearListeners() {
		for (const eventManagers in this.events) this.events[eventManagers].clear();
	}
	/**
	* Attaches a passive effect to the `MotionValue`.
	*/
	attach(passiveEffect, stopPassiveEffect) {
		this.passiveEffect = passiveEffect;
		this.stopPassiveEffect = stopPassiveEffect;
	}
	/**
	* Sets the state of the `MotionValue`.
	*
	* @remarks
	*
	* ```jsx
	* const x = useMotionValue(0)
	* x.set(10)
	* ```
	*
	* @param latest - Latest value to set.
	* @param render - Whether to notify render subscribers. Defaults to `true`
	*
	* @public
	*/
	set(v) {
		if (!this.passiveEffect) this.updateAndNotify(v);
		else this.passiveEffect(v, this.updateAndNotify);
	}
	setWithVelocity(prev, current, delta) {
		this.set(current);
		this.prev = void 0;
		this.prevFrameValue = prev;
		this.prevUpdatedAt = this.updatedAt - delta;
	}
	/**
	* Set the state of the `MotionValue`, stopping any active animations,
	* effects, and resets velocity to `0`.
	*/
	jump(v, endAnimation = true) {
		this.updateAndNotify(v);
		this.prev = v;
		this.prevUpdatedAt = this.prevFrameValue = void 0;
		endAnimation && this.stop();
		if (this.stopPassiveEffect) this.stopPassiveEffect();
	}
	dirty() {
		this.events.change?.notify(this.current);
	}
	addDependent(dependent) {
		if (!this.dependents) this.dependents = /* @__PURE__ */ new Set();
		this.dependents.add(dependent);
	}
	removeDependent(dependent) {
		if (this.dependents) this.dependents.delete(dependent);
	}
	/**
	* Returns the latest state of `MotionValue`
	*
	* @returns - The latest state of `MotionValue`
	*
	* @public
	*/
	get() {
		if (collectMotionValues.current) collectMotionValues.current.push(this);
		return this.current;
	}
	/**
	* @public
	*/
	getPrevious() {
		return this.prev;
	}
	/**
	* Returns the latest velocity of `MotionValue`
	*
	* @returns - The latest velocity of `MotionValue`. Returns `0` if the state is non-numerical.
	*
	* @public
	*/
	getVelocity() {
		const currentTime = time.now();
		if (!this.canTrackVelocity || this.prevFrameValue === void 0 || currentTime - this.updatedAt > MAX_VELOCITY_DELTA) return 0;
		const delta = Math.min(this.updatedAt - this.prevUpdatedAt, MAX_VELOCITY_DELTA);
		return /* @__PURE__ */ velocityPerSecond(parseFloat(this.current) - parseFloat(this.prevFrameValue), delta);
	}
	/**
	* Registers a new animation to control this `MotionValue`. Only one
	* animation can drive a `MotionValue` at one time.
	*
	* ```jsx
	* value.start()
	* ```
	*
	* @param animation - A function that starts the provided animation
	*/
	start(startAnimation) {
		this.stop();
		return new Promise((resolve) => {
			this.hasAnimated = true;
			this.animation = startAnimation(resolve);
			if (this.events.animationStart) this.events.animationStart.notify();
		}).then(() => {
			if (this.events.animationComplete) this.events.animationComplete.notify();
			this.clearAnimation();
		});
	}
	/**
	* Stop the currently active animation.
	*
	* @public
	*/
	stop() {
		if (this.animation) {
			this.animation.stop();
			if (this.events.animationCancel) this.events.animationCancel.notify();
		}
		this.clearAnimation();
	}
	/**
	* Returns `true` if this value is currently animating.
	*
	* @public
	*/
	isAnimating() {
		return !!this.animation;
	}
	clearAnimation() {
		delete this.animation;
	}
	/**
	* Destroy and clean up subscribers to this `MotionValue`.
	*
	* The `MotionValue` hooks like `useMotionValue` and `useTransform` automatically
	* handle the lifecycle of the returned `MotionValue`, so this method is only necessary if you've manually
	* created a `MotionValue` via the `motionValue` function.
	*
	* @public
	*/
	destroy() {
		this.dependents?.clear();
		this.events.destroy?.notify();
		this.clearListeners();
		this.stop();
		if (this.stopPassiveEffect) this.stopPassiveEffect();
	}
};
function motionValue(init, options) {
	return new MotionValue(init, options);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/utils/resolve-transition.mjs
/**
* If `transition` has `inherit: true`, shallow-merge it with
* `parentTransition` (child keys win) and strip the `inherit` key.
* Otherwise return `transition` unchanged.
*/
function resolveTransition(transition, parentTransition) {
	if (transition?.inherit && parentTransition) {
		const { inherit: _, ...rest } = transition;
		return {
			...parentTransition,
			...rest
		};
	}
	return transition;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/utils/get-value-transition.mjs
function getValueTransition(transition, key) {
	const valueTransition = transition?.[key] ?? transition?.["default"] ?? transition;
	if (valueTransition !== transition) return resolveTransition(valueTransition, transition);
	return valueTransition;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/utils/default-transitions.mjs
var underDampedSpring = {
	type: "spring",
	stiffness: 500,
	damping: 25,
	restSpeed: 10
};
var criticallyDampedSpring = (target) => ({
	type: "spring",
	stiffness: 550,
	damping: target === 0 ? 2 * Math.sqrt(550) : 30,
	restSpeed: 10
});
var keyframesTransition = {
	type: "keyframes",
	duration: .8
};
/**
* Default easing curve is a slightly shallower version of
* the default browser easing curve.
*/
var ease = {
	type: "keyframes",
	ease: [
		.25,
		.1,
		.35,
		1
	],
	duration: .3
};
var getDefaultTransition = (valueKey, { keyframes }) => {
	if (keyframes.length > 2) return keyframesTransition;
	else if (transformProps.has(valueKey)) return valueKey.startsWith("scale") ? criticallyDampedSpring(keyframes[1]) : underDampedSpring;
	return ease;
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/utils/is-transition-defined.mjs
var orchestrationKeys = /* @__PURE__ */ new Set([
	"when",
	"delay",
	"delayChildren",
	"staggerChildren",
	"staggerDirection",
	"repeat",
	"repeatType",
	"repeatDelay",
	"from",
	"elapsed"
]);
/**
* Decide whether a transition is defined on a given Transition.
* This filters out orchestration options and returns true
* if any options are left.
*/
function isTransitionDefined(transition) {
	for (const key in transition) if (!orchestrationKeys.has(key)) return true;
	return false;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/interfaces/motion-value.mjs
var animateMotionValue = (name, value, target, transition = {}, element, isHandoff) => (onComplete) => {
	const valueTransition = getValueTransition(transition, name) || {};
	/**
	* Most transition values are currently completely overwritten by value-specific
	* transitions. In the future it'd be nicer to blend these transitions. But for now
	* delay actually does inherit from the root transition if not value-specific.
	*/
	const delay = valueTransition.delay || transition.delay || 0;
	/**
	* Elapsed isn't a public transition option but can be passed through from
	* optimized appear effects in milliseconds.
	*/
	let { elapsed = 0 } = transition;
	elapsed = elapsed - /* @__PURE__ */ secondsToMilliseconds(delay);
	const options = {
		keyframes: Array.isArray(target) ? target : [null, target],
		ease: "easeOut",
		velocity: value.getVelocity(),
		...valueTransition,
		delay: -elapsed,
		onUpdate: (v) => {
			value.set(v);
			valueTransition.onUpdate && valueTransition.onUpdate(v);
		},
		onComplete: () => {
			onComplete();
			valueTransition.onComplete && valueTransition.onComplete();
		},
		name,
		motionValue: value,
		element: isHandoff ? void 0 : element
	};
	/**
	* If there's no transition defined for this value, we can generate
	* unique transition settings for this value.
	*/
	if (!isTransitionDefined(valueTransition)) Object.assign(options, getDefaultTransition(name, options));
	/**
	* Both WAAPI and our internal animation functions use durations
	* as defined by milliseconds, while our external API defines them
	* as seconds.
	*/
	options.duration && (options.duration = /* @__PURE__ */ secondsToMilliseconds(options.duration));
	options.repeatDelay && (options.repeatDelay = /* @__PURE__ */ secondsToMilliseconds(options.repeatDelay));
	/**
	* Support deprecated way to set initial value. Prefer keyframe syntax.
	*/
	if (options.from !== void 0) options.keyframes[0] = options.from;
	let shouldSkip = false;
	if (options.type === false || options.duration === 0 && !options.repeatDelay) {
		makeAnimationInstant(options);
		if (options.delay === 0) shouldSkip = true;
	}
	if (MotionGlobalConfig.instantAnimations || MotionGlobalConfig.skipAnimations || element?.shouldSkipAnimations || valueTransition.skipAnimations) {
		shouldSkip = true;
		makeAnimationInstant(options);
		options.delay = 0;
	}
	/**
	* If the transition type or easing has been explicitly set by the user
	* then we don't want to allow flattening the animation.
	*/
	options.allowFlatten = !valueTransition.type && !valueTransition.ease;
	/**
	* If we can or must skip creating the animation, and apply only
	* the final keyframe, do so. We also check once keyframes are resolved but
	* this early check prevents the need to create an animation at all.
	*/
	if (shouldSkip && !isHandoff && value.get() !== void 0) {
		const finalKeyframe = getFinalKeyframe(options.keyframes, valueTransition);
		if (finalKeyframe !== void 0) {
			frame.update(() => {
				options.onUpdate(finalKeyframe);
				options.onComplete();
			});
			return;
		}
	}
	return valueTransition.isSync ? new JSAnimation(options) : new AsyncMotionValueAnimation(options);
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/utils/arc.mjs
var MIN_LAYOUT_DISTANCE = 20;
function bezierPoint(t, origin, control, target) {
	const inv = 1 - t;
	return inv * inv * origin + 2 * inv * t * control + t * t * target;
}
function bezierTangentAngle(t, originX, controlX, targetX, originY, controlY, targetY) {
	const dx = 2 * (1 - t) * (controlX - originX) + 2 * t * (targetX - controlX);
	const dy = 2 * (1 - t) * (controlY - originY) + 2 * t * (targetY - controlY);
	return Math.atan2(dy, dx) * (180 / Math.PI);
}
function computeArcControlPoint(fromX, fromY, toX, toY, strength, peak) {
	const deltaX = toX - fromX;
	const deltaY = toY - fromY;
	const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
	if (distance > 0) {
		const normalPerpX = -deltaY / distance;
		const normalPerpY = deltaX / distance;
		const desiredHeight = strength * distance;
		return {
			x: fromX + deltaX * peak + normalPerpX * desiredHeight,
			y: fromY + deltaY * peak + normalPerpY * desiredHeight
		};
	}
	return {
		x: fromX,
		y: fromY
	};
}
/**
* The pure sampling factory: `(from, to) => (t) => point`. Internal —
* used by {@link arc} and the unit tests. Not part of the public surface.
*/
function createArcPath({ strength = .5, peak = .5, direction, rotate = false } = {}) {
	const rotationScale = rotate === true ? 1 : typeof rotate === "number" ? rotate : 0;
	let prevBulgeSign;
	const createInterpolator = (from, to) => {
		const dx = to.x - from.x;
		const dy = to.y - from.y;
		let signed;
		if (direction === "cw") signed = -strength;
		else if (direction === "ccw") signed = strength;
		else signed = (Math.abs(dx) >= Math.abs(dy) ? dx : dy) < 0 ? -strength : strength;
		let control = computeArcControlPoint(from.x, from.y, to.x, to.y, signed, peak);
		if (direction === void 0) {
			const isVertical = Math.abs(dx) < Math.abs(dy);
			const midX = from.x + dx * peak;
			const midY = from.y + dy * peak;
			const bulgeSign = isVertical ? Math.sign(control.x - midX) : Math.sign(control.y - midY);
			if (prevBulgeSign !== void 0 && bulgeSign !== 0 && bulgeSign !== prevBulgeSign) {
				signed = -signed;
				control = computeArcControlPoint(from.x, from.y, to.x, to.y, signed, peak);
			} else if (bulgeSign !== 0) prevBulgeSign = bulgeSign;
		}
		const tangent0 = rotationScale ? bezierTangentAngle(0, from.x, control.x, to.x, from.y, control.y, to.y) : 0;
		const tangent1 = rotationScale ? bezierTangentAngle(1, from.x, control.x, to.x, from.y, control.y, to.y) : 0;
		const tangentDelta = rotationScale ? wrap(-180, 180, tangent1 - tangent0) : 0;
		return (t) => {
			const out = {
				x: bezierPoint(t, from.x, control.x, to.x),
				y: bezierPoint(t, from.y, control.y, to.y)
			};
			if (rotationScale) out.rotate = wrap(-180, 180, bezierTangentAngle(t, from.x, control.x, to.x, from.y, control.y, to.y) - (tangent0 + tangentDelta * t)) * rotationScale;
			return out;
		};
	};
	return createInterpolator;
}
/**
* Creates a curved path for `transition.path`:
*
* ```ts
* <motion.div animate={{ x: 200, y: 100 }} transition={{ path: arc() }} />
* ```
*
* Reuse the returned value (module scope / useMemo / useRef) so its
* continuity closure survives re-renders — a fresh `arc()` has no memory.
*/
function arc(options = {}) {
	const sample = createArcPath(options);
	return {
		interpolateProjection(delta) {
			const tx = delta.x.translate;
			const ty = delta.y.translate;
			if (Math.sqrt(tx * tx + ty * ty) < MIN_LAYOUT_DISTANCE) return;
			return sample({
				x: tx,
				y: ty
			}, {
				x: 0,
				y: 0
			});
		},
		animateVisualElement(visualElement, target, transition, delay, animations) {
			if (!("x" in target || "y" in target)) return;
			const xValue = visualElement.getValue("x", visualElement.latestValues["x"] ?? 0);
			const yValue = visualElement.getValue("y", visualElement.latestValues["y"] ?? 0);
			const xRaw = target.x;
			const yRaw = target.y;
			const xFrom = (Array.isArray(xRaw) && xRaw[0] != null ? xRaw[0] : xValue?.get()) ?? 0;
			const yFrom = (Array.isArray(yRaw) && yRaw[0] != null ? yRaw[0] : yValue?.get()) ?? 0;
			const xTo = Array.isArray(xRaw) ? xRaw[xRaw.length - 1] : xRaw ?? xFrom;
			const yTo = Array.isArray(yRaw) ? yRaw[yRaw.length - 1] : yRaw ?? yFrom;
			const interpolate = sample({
				x: xFrom,
				y: yFrom
			}, {
				x: xTo,
				y: yTo
			});
			const pathRotationValue = interpolate(0).rotate !== void 0 ? visualElement.getValue("pathRotation", 0) : void 0;
			const pathTransition = {
				delay,
				...getValueTransition(transition || {}, "x")
			};
			delete pathTransition.path;
			const progress = motionValue(0);
			progress.start(animateMotionValue("", progress, [0, 1e3], {
				...pathTransition,
				isSync: true,
				velocity: 0,
				onUpdate: (latest) => {
					const point = interpolate(latest / 1e3);
					xValue?.set(point.x);
					yValue?.set(point.y);
					if (pathRotationValue && point.rotate !== void 0) pathRotationValue.set(point.rotate);
				},
				onComplete: () => {
					xValue?.set(xTo);
					yValue?.set(yTo);
					pathRotationValue?.set(0);
				},
				onStop: () => pathRotationValue?.set(0),
				onCancel: () => pathRotationValue?.set(0)
			}));
			if (progress.animation) animations.push(progress.animation);
			delete target.x;
			delete target.y;
		}
	};
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/utils/css-variables-conversion.mjs
/**
* Parse Framer's special CSS variable format into a CSS token and a fallback.
*
* ```
* `var(--foo, #fff)` => [`--foo`, '#fff']
* ```
*
* @param current
*/
var splitCSSVariableRegex = /^var\(--(?:([\w-]+)|([\w-]+), ?([a-zA-Z\d ()%#.,-]+))\)/u;
function parseCSSVariable(current) {
	const match = splitCSSVariableRegex.exec(current);
	if (!match) return [,];
	const [, token1, token2, fallback] = match;
	return [`--${token1 ?? token2}`, fallback];
}
var maxDepth = 4;
function getVariableValue(current, element, depth = 1) {
	invariant(depth <= maxDepth, `Max CSS variable fallback depth detected in property "${current}". This may indicate a circular fallback dependency.`, "max-css-var-depth");
	const [token, fallback] = parseCSSVariable(current);
	if (!token) return;
	const resolved = window.getComputedStyle(element).getPropertyValue(token);
	if (resolved) {
		const trimmed = resolved.trim();
		return isNumericalString(trimmed) ? parseFloat(trimmed) : trimmed;
	}
	return isCSSVariableToken(fallback) ? getVariableValue(fallback, element, depth + 1) : fallback;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/utils/resolve-variants.mjs
function getValueState(visualElement) {
	const state = [{}, {}];
	visualElement?.values.forEach((value, key) => {
		state[0][key] = value.get();
		state[1][key] = value.getVelocity();
	});
	return state;
}
function resolveVariantFromProps(props, definition, custom, visualElement) {
	/**
	* If the variant definition is a function, resolve.
	*/
	if (typeof definition === "function") {
		const [current, velocity] = getValueState(visualElement);
		definition = definition(custom !== void 0 ? custom : props.custom, current, velocity);
	}
	/**
	* If the variant definition is a variant label, or
	* the function returned a variant label, resolve.
	*/
	if (typeof definition === "string") definition = props.variants && props.variants[definition];
	/**
	* At this point we've resolved both functions and variant labels,
	* but the resolved variant label might itself have been a function.
	* If so, resolve. This can only have returned a valid target object.
	*/
	if (typeof definition === "function") {
		const [current, velocity] = getValueState(visualElement);
		definition = definition(custom !== void 0 ? custom : props.custom, current, velocity);
	}
	return definition;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/utils/resolve-dynamic-variants.mjs
function resolveVariant(visualElement, definition, custom) {
	const props = visualElement.getProps();
	return resolveVariantFromProps(props, definition, custom !== void 0 ? custom : props.custom, visualElement);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/utils/keys-position.mjs
var positionalKeys = /* @__PURE__ */ new Set([
	"width",
	"height",
	"top",
	"left",
	"right",
	"bottom",
	...transformPropOrder
]);
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/utils/is-keyframes-target.mjs
var isKeyframesTarget = (v) => {
	return Array.isArray(v);
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/utils/setters.mjs
/**
* Set VisualElement's MotionValue, creating a new MotionValue for it if
* it doesn't exist.
*/
function setMotionValue(visualElement, key, value) {
	if (visualElement.hasValue(key)) visualElement.getValue(key).set(value);
	else visualElement.addValue(key, motionValue(value));
}
function resolveFinalValueInKeyframes(v) {
	return isKeyframesTarget(v) ? v[v.length - 1] || 0 : v;
}
function setTarget(visualElement, definition) {
	let { transitionEnd = {}, transition = {}, ...target } = resolveVariant(visualElement, definition) || {};
	target = {
		...target,
		...transitionEnd
	};
	for (const key in target) setMotionValue(visualElement, key, resolveFinalValueInKeyframes(target[key]));
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/utils/is-motion-value.mjs
var isMotionValue = (value) => Boolean(value && value.getVelocity);
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/will-change/is.mjs
function isWillChangeMotionValue(value) {
	return Boolean(isMotionValue(value) && value.add);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/will-change/add-will-change.mjs
function addValueToWillChange(visualElement, key) {
	const willChange = visualElement.getValue("willChange");
	/**
	* It could be that a user has set willChange to a regular MotionValue,
	* in which case we can't add the value to it.
	*/
	if (isWillChangeMotionValue(willChange)) return willChange.add(key);
	else if (!willChange && MotionGlobalConfig.WillChange) {
		const newWillChange = new MotionGlobalConfig.WillChange("auto");
		visualElement.addValue("willChange", newWillChange);
		newWillChange.add(key);
	}
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/dom/utils/camel-to-dash.mjs
function camelToDash(str) {
	return str.replace(/([A-Z])/g, (match) => `-${match.toLowerCase()}`);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/optimized-appear/data-id.mjs
var optimizedAppearDataId = "framerAppearId";
var optimizedAppearDataAttribute = "data-" + camelToDash(optimizedAppearDataId);
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/optimized-appear/get-appear-id.mjs
function getOptimisedAppearId(visualElement) {
	return visualElement.props[optimizedAppearDataAttribute];
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/interfaces/visual-element-target.mjs
var isBrowser$1 = typeof window !== "undefined";
/**
* Decide whether we should block this animation. Previously, we achieved this
* just by checking whether the key was listed in protectedKeys, but this
* posed problems if an animation was triggered by afterChildren and protectedKeys
* had been set to true in the meantime.
*/
function shouldBlockAnimation({ protectedKeys, needsAnimating }, key) {
	const shouldBlock = protectedKeys.hasOwnProperty(key) && needsAnimating[key] !== true;
	needsAnimating[key] = false;
	return shouldBlock;
}
function animateTarget(visualElement, targetAndTransition, { delay = 0, transitionOverride, type } = {}) {
	let { transition, transitionEnd, ...target } = targetAndTransition;
	const defaultTransition = visualElement.getDefaultTransition();
	transition = transition ? resolveTransition(transition, defaultTransition) : defaultTransition;
	const reduceMotion = transition?.reduceMotion;
	const skipAnimations = transition?.skipAnimations;
	if (transitionOverride) transition = transitionOverride;
	const animations = [];
	const animationTypeState = type && visualElement.animationState && visualElement.animationState.getState()[type];
	const path = transition?.path;
	if (path) path.animateVisualElement(visualElement, target, transition, delay, animations);
	for (const key in target) {
		const value = visualElement.getValue(key, visualElement.latestValues[key] ?? null);
		const valueTarget = target[key];
		if (valueTarget === void 0 || animationTypeState && shouldBlockAnimation(animationTypeState, key)) continue;
		const valueTransition = {
			delay,
			...getValueTransition(transition || {}, key)
		};
		if (skipAnimations) valueTransition.skipAnimations = true;
		/**
		* If the value is already at the defined target, skip the animation.
		* We still re-assert the value via frame.update to take precedence
		* over any stale transitionEnd callbacks from previous animations.
		*/
		const currentValue = value.get();
		if (currentValue !== void 0 && !value.isAnimating() && !Array.isArray(valueTarget) && valueTarget === currentValue && !valueTransition.velocity) {
			frame.update(() => value.set(valueTarget));
			continue;
		}
		/**
		* If this is the first time a value is being animated, check
		* to see if we're handling off from an existing animation.
		*/
		let isHandoff = false;
		if (isBrowser$1 && window.MotionHandoffAnimation) {
			const appearId = getOptimisedAppearId(visualElement);
			if (appearId) {
				const startTime = window.MotionHandoffAnimation(appearId, key, frame);
				if (startTime !== null) {
					valueTransition.startTime = startTime;
					isHandoff = true;
				}
			}
		}
		addValueToWillChange(visualElement, key);
		const shouldReduceMotion = reduceMotion ?? visualElement.shouldReduceMotion;
		value.start(animateMotionValue(key, value, valueTarget, shouldReduceMotion && positionalKeys.has(key) ? { type: false } : valueTransition, visualElement, isHandoff));
		const animation = value.animation;
		if (animation) animations.push(animation);
	}
	if (transitionEnd) {
		const applyTransitionEnd = () => frame.update(() => {
			transitionEnd && setTarget(visualElement, transitionEnd);
		});
		if (animations.length) Promise.all(animations).then(applyTransitionEnd);
		else applyTransitionEnd();
	}
	return animations;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/interfaces/visual-element-variant.mjs
function animateVariant(visualElement, variant, options = {}) {
	const resolved = resolveVariant(visualElement, variant, options.type === "exit" ? visualElement.presenceContext?.custom : void 0);
	let { transition = visualElement.getDefaultTransition() || {} } = resolved || {};
	if (options.transitionOverride) transition = options.transitionOverride;
	/**
	* If we have a variant, create a callback that runs it as an animation.
	* Otherwise, we resolve a Promise immediately for a composable no-op.
	*/
	const getAnimation = resolved ? () => Promise.all(animateTarget(visualElement, resolved, options)) : () => Promise.resolve();
	/**
	* If we have children, create a callback that runs all their animations.
	* Otherwise, we resolve a Promise immediately for a composable no-op.
	*/
	const getChildAnimations = visualElement.variantChildren && visualElement.variantChildren.size ? (forwardDelay = 0) => {
		const { delayChildren = 0, staggerChildren, staggerDirection } = transition;
		return animateChildren(visualElement, variant, forwardDelay, delayChildren, staggerChildren, staggerDirection, options);
	} : () => Promise.resolve();
	/**
	* If the transition explicitly defines a "when" option, we need to resolve either
	* this animation or all children animations before playing the other.
	*/
	const { when } = transition;
	if (when) {
		const [first, last] = when === "beforeChildren" ? [getAnimation, getChildAnimations] : [getChildAnimations, getAnimation];
		return first().then(() => last());
	} else return Promise.all([getAnimation(), getChildAnimations(options.delay)]);
}
function animateChildren(visualElement, variant, delay = 0, delayChildren = 0, staggerChildren = 0, staggerDirection = 1, options) {
	const animations = [];
	for (const child of visualElement.variantChildren) {
		child.notify("AnimationStart", variant);
		animations.push(animateVariant(child, variant, {
			...options,
			delay: delay + (typeof delayChildren === "function" ? 0 : delayChildren) + calcChildStagger(visualElement.variantChildren, child, delayChildren, staggerChildren, staggerDirection)
		}).then(() => child.notify("AnimationComplete", variant)));
	}
	return Promise.all(animations);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/interfaces/visual-element.mjs
function animateVisualElement(visualElement, definition, options = {}) {
	visualElement.notify("AnimationStart", definition);
	let animation;
	if (Array.isArray(definition)) {
		const animations = definition.map((variant) => animateVariant(visualElement, variant, options));
		animation = Promise.all(animations);
	} else if (typeof definition === "string") animation = animateVariant(visualElement, definition, options);
	else {
		const resolvedDefinition = typeof definition === "function" ? resolveVariant(visualElement, definition, options.custom) : definition;
		animation = Promise.all(animateTarget(visualElement, resolvedDefinition, options));
	}
	return animation.then(() => {
		visualElement.notify("AnimationComplete", definition);
	});
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/types/auto.mjs
/**
* ValueType for "auto"
*/
var auto = {
	test: (v) => v === "auto",
	parse: (v) => v
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/types/test.mjs
/**
* Tests a provided value against a ValueType
*/
var testValueType = (v) => (type) => type.test(v);
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/types/dimensions.mjs
/**
* A list of value types commonly used for dimensions
*/
var dimensionValueTypes = [
	number,
	px,
	percent,
	degrees,
	vw,
	vh,
	auto
];
/**
* Tests a dimensional value against the list of dimension ValueTypes
*/
var findDimensionValueType = (v) => dimensionValueTypes.find(testValueType(v));
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/keyframes/utils/is-none.mjs
function isNone(value) {
	if (typeof value === "number") return value === 0;
	else if (value !== null) return value === "none" || value === "0" || isZeroValueString(value);
	else return true;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/types/complex/filter.mjs
/**
* Properties that should default to 1 or 100%
*/
var maxDefaults = /* @__PURE__ */ new Set([
	"brightness",
	"contrast",
	"saturate",
	"opacity"
]);
function applyDefaultFilter(v) {
	const [name, value] = v.slice(0, -1).split("(");
	if (name === "drop-shadow") return v;
	const [number] = value.match(floatRegex) || [];
	if (!number) return v;
	const unit = value.replace(number, "");
	let defaultValue = maxDefaults.has(name) ? 1 : 0;
	if (number !== value) defaultValue *= 100;
	return name + "(" + defaultValue + unit + ")";
}
var functionRegex = /\b([a-z-]*)\(.*?\)/gu;
var filter = {
	...complex,
	getAnimatableNone: (v) => {
		const functions = v.match(functionRegex);
		return functions ? functions.map(applyDefaultFilter).join(" ") : v;
	}
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/types/complex/mask.mjs
var mask = {
	...complex,
	getAnimatableNone: (v) => {
		const parsed = complex.parse(v);
		return complex.createTransformer(v)(parsed.map((v) => typeof v === "number" ? 0 : typeof v === "object" ? {
			...v,
			alpha: 1
		} : v));
	}
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/types/int.mjs
var int = {
	...number,
	transform: Math.round
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/types/maps/transform.mjs
var transformValueTypes = {
	rotate: degrees,
	/**
	* Internal channel for `transition.path` orientToPath. Composed onto
	* `rotate` at the transform-build sites so the user's `rotate` is
	* never read or overwritten. Not part of `transformPropOrder`.
	*/
	pathRotation: degrees,
	rotateX: degrees,
	rotateY: degrees,
	rotateZ: degrees,
	scale,
	scaleX: scale,
	scaleY: scale,
	scaleZ: scale,
	skew: degrees,
	skewX: degrees,
	skewY: degrees,
	distance: px,
	translateX: px,
	translateY: px,
	translateZ: px,
	x: px,
	y: px,
	z: px,
	perspective: px,
	transformPerspective: px,
	opacity: alpha,
	originX: progressPercentage,
	originY: progressPercentage,
	originZ: px
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/types/maps/number.mjs
var numberValueTypes = {
	borderWidth: px,
	borderTopWidth: px,
	borderRightWidth: px,
	borderBottomWidth: px,
	borderLeftWidth: px,
	borderRadius: px,
	borderTopLeftRadius: px,
	borderTopRightRadius: px,
	borderBottomRightRadius: px,
	borderBottomLeftRadius: px,
	width: px,
	maxWidth: px,
	height: px,
	maxHeight: px,
	top: px,
	right: px,
	bottom: px,
	left: px,
	inset: px,
	insetBlock: px,
	insetBlockStart: px,
	insetBlockEnd: px,
	insetInline: px,
	insetInlineStart: px,
	insetInlineEnd: px,
	padding: px,
	paddingTop: px,
	paddingRight: px,
	paddingBottom: px,
	paddingLeft: px,
	paddingBlock: px,
	paddingBlockStart: px,
	paddingBlockEnd: px,
	paddingInline: px,
	paddingInlineStart: px,
	paddingInlineEnd: px,
	margin: px,
	marginTop: px,
	marginRight: px,
	marginBottom: px,
	marginLeft: px,
	marginBlock: px,
	marginBlockStart: px,
	marginBlockEnd: px,
	marginInline: px,
	marginInlineStart: px,
	marginInlineEnd: px,
	fontSize: px,
	backgroundPositionX: px,
	backgroundPositionY: px,
	...transformValueTypes,
	zIndex: int,
	fillOpacity: alpha,
	strokeOpacity: alpha,
	numOctaves: int
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/types/maps/defaults.mjs
/**
* A map of default value types for common values
*/
var defaultValueTypes = {
	...numberValueTypes,
	color,
	backgroundColor: color,
	outlineColor: color,
	fill: color,
	stroke: color,
	borderColor: color,
	borderTopColor: color,
	borderRightColor: color,
	borderBottomColor: color,
	borderLeftColor: color,
	filter,
	WebkitFilter: filter,
	mask,
	WebkitMask: mask
};
/**
* Gets the default ValueType for the provided value key
*/
var getDefaultValueType = (key) => defaultValueTypes[key];
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/types/utils/animatable-none.mjs
var customTypes = /*@__PURE__*/ new Set([filter, mask]);
function getAnimatableNone(key, value) {
	let defaultValueType = getDefaultValueType(key);
	if (!customTypes.has(defaultValueType)) defaultValueType = complex;
	return defaultValueType.getAnimatableNone ? defaultValueType.getAnimatableNone(value) : void 0;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/keyframes/utils/make-none-animatable.mjs
/**
* If we encounter keyframes like "none" or "0" and we also have keyframes like
* "#fff" or "200px 200px" we want to find a keyframe to serve as a template for
* the "none" keyframes. In this case "#fff" or "200px 200px" - then these get turned into
* zero equivalents, i.e. "#fff0" or "0px 0px".
*/
var invalidTemplates = /* @__PURE__ */ new Set([
	"auto",
	"none",
	"0"
]);
function makeNoneKeyframesAnimatable(unresolvedKeyframes, noneKeyframeIndexes, name) {
	let i = 0;
	let animatableTemplate = void 0;
	while (i < unresolvedKeyframes.length && !animatableTemplate) {
		const keyframe = unresolvedKeyframes[i];
		if (typeof keyframe === "string" && !invalidTemplates.has(keyframe) && analyseComplexValue(keyframe).values.length) animatableTemplate = unresolvedKeyframes[i];
		i++;
	}
	if (animatableTemplate && name) for (const noneIndex of noneKeyframeIndexes) unresolvedKeyframes[noneIndex] = getAnimatableNone(name, animatableTemplate);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/keyframes/DOMKeyframesResolver.mjs
var DOMKeyframesResolver = class extends KeyframeResolver {
	constructor(unresolvedKeyframes, onComplete, name, motionValue, element) {
		super(unresolvedKeyframes, onComplete, name, motionValue, element, true);
	}
	readKeyframes() {
		const { unresolvedKeyframes, element, name } = this;
		if (!element || !element.current) return;
		super.readKeyframes();
		/**
		* If any keyframe is a CSS variable, we need to find its value by sampling the element
		*/
		for (let i = 0; i < unresolvedKeyframes.length; i++) {
			let keyframe = unresolvedKeyframes[i];
			if (typeof keyframe === "string") {
				keyframe = keyframe.trim();
				if (isCSSVariableToken(keyframe)) {
					const resolved = getVariableValue(keyframe, element.current);
					if (resolved !== void 0) unresolvedKeyframes[i] = resolved;
					if (i === unresolvedKeyframes.length - 1) this.finalKeyframe = keyframe;
				}
			}
		}
		/**
		* Resolve "none" values. We do this potentially twice - once before and once after measuring keyframes.
		* This could be seen as inefficient but it's a trade-off to avoid measurements in more situations, which
		* have a far bigger performance impact.
		*/
		this.resolveNoneKeyframes();
		/**
		* Check to see if unit type has changed. If so schedule jobs that will
		* temporarily set styles to the destination keyframes.
		* Skip if we have more than two keyframes or this isn't a positional value.
		* TODO: We can throw if there are multiple keyframes and the value type changes.
		*/
		if (!positionalKeys.has(name) || unresolvedKeyframes.length !== 2) return;
		const [origin, target] = unresolvedKeyframes;
		const originType = findDimensionValueType(origin);
		const targetType = findDimensionValueType(target);
		if (containsCSSVariable(origin) !== containsCSSVariable(target) && positionalValues[name]) {
			this.needsMeasurement = true;
			return;
		}
		/**
		* Either we don't recognise these value types or we can animate between them.
		*/
		if (originType === targetType) return;
		/**
		* If both values are numbers or pixels, we can animate between them by
		* converting them to numbers.
		*/
		if (isNumOrPxType(originType) && isNumOrPxType(targetType)) for (let i = 0; i < unresolvedKeyframes.length; i++) {
			const value = unresolvedKeyframes[i];
			if (typeof value === "string") unresolvedKeyframes[i] = parseFloat(value);
		}
		else if (positionalValues[name])
 /**
		* Else, the only way to resolve this is by measuring the element.
		*/
		this.needsMeasurement = true;
	}
	resolveNoneKeyframes() {
		const { unresolvedKeyframes, name } = this;
		const noneKeyframeIndexes = [];
		for (let i = 0; i < unresolvedKeyframes.length; i++) if (unresolvedKeyframes[i] === null || isNone(unresolvedKeyframes[i])) noneKeyframeIndexes.push(i);
		if (noneKeyframeIndexes.length) makeNoneKeyframesAnimatable(unresolvedKeyframes, noneKeyframeIndexes, name);
	}
	measureInitialState() {
		const { element, unresolvedKeyframes, name } = this;
		if (!element || !element.current) return;
		if (name === "height") this.suspendedScrollY = window.pageYOffset;
		this.measuredOrigin = positionalValues[name](element.measureViewportBox(), window.getComputedStyle(element.current));
		unresolvedKeyframes[0] = this.measuredOrigin;
		const measureKeyframe = unresolvedKeyframes[unresolvedKeyframes.length - 1];
		if (measureKeyframe !== void 0) element.getValue(name, measureKeyframe).jump(measureKeyframe, false);
	}
	measureEndState() {
		const { element, name, unresolvedKeyframes } = this;
		if (!element || !element.current) return;
		const value = element.getValue(name);
		value && value.jump(this.measuredOrigin, false);
		const finalKeyframeIndex = unresolvedKeyframes.length - 1;
		const finalKeyframe = unresolvedKeyframes[finalKeyframeIndex];
		unresolvedKeyframes[finalKeyframeIndex] = positionalValues[name](element.measureViewportBox(), window.getComputedStyle(element.current));
		if (finalKeyframe !== null && this.finalKeyframe === void 0) this.finalKeyframe = finalKeyframe;
		if (this.removedTransforms?.length) this.removedTransforms.forEach(([unsetTransformName, unsetTransformValue]) => {
			element.getValue(unsetTransformName).set(unsetTransformValue);
		});
		this.resolveNoneKeyframes();
	}
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/utils/border-radius.mjs
/**
* The four corner-radius longhands. Shared so the projection mixer, scale
* corrector, WAAPI px-value set and view-transition crop pass don't each carry
* their own copy. Order is irrelevant - every consumer mixes/corrects/animates
* each corner independently.
*/
var cornerRadiusProps = [
	"borderTopLeftRadius",
	"borderTopRightRadius",
	"borderBottomRightRadius",
	"borderBottomLeftRadius"
];
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/waapi/utils/px-values.mjs
var pxValues = /* @__PURE__ */ new Set([
	"borderWidth",
	"borderTopWidth",
	"borderRightWidth",
	"borderBottomWidth",
	"borderLeftWidth",
	"borderRadius",
	...cornerRadiusProps,
	"width",
	"maxWidth",
	"height",
	"maxHeight",
	"top",
	"right",
	"bottom",
	"left",
	"inset",
	"insetBlock",
	"insetBlockStart",
	"insetBlockEnd",
	"insetInline",
	"insetInlineStart",
	"insetInlineEnd",
	"padding",
	"paddingTop",
	"paddingRight",
	"paddingBottom",
	"paddingLeft",
	"paddingBlock",
	"paddingBlockStart",
	"paddingBlockEnd",
	"paddingInline",
	"paddingInlineStart",
	"paddingInlineEnd",
	"margin",
	"marginTop",
	"marginRight",
	"marginBottom",
	"marginLeft",
	"marginBlock",
	"marginBlockStart",
	"marginBlockEnd",
	"marginInline",
	"marginInlineStart",
	"marginInlineEnd",
	"fontSize",
	"backgroundPositionX",
	"backgroundPositionY"
]);
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/keyframes/utils/apply-px-defaults.mjs
function applyPxDefaults(keyframes, name) {
	for (let i = 0; i < keyframes.length; i++) if (typeof keyframes[i] === "number" && pxValues.has(name)) keyframes[i] = keyframes[i] + "px";
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/waapi/easing/is-supported.mjs
function isWaapiSupportedEasing(easing) {
	return Boolean(typeof easing === "function" && supportsLinearEasing() || !easing || typeof easing === "string" && (easing in supportedWaapiEasing || supportsLinearEasing()) || /* @__PURE__ */ isBezierDefinition(easing) || Array.isArray(easing) && easing.every(isWaapiSupportedEasing));
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/waapi/supports/partial-keyframes.mjs
var supportsPartialKeyframes = /*@__PURE__*/ memo(() => {
	try {
		document.createElement("div").animate({ opacity: [1] });
	} catch (e) {
		return false;
	}
	return true;
});
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/animate/effects.mjs
/**
* Effects registered via `animate.addEffect()`, most recent first.
*/
var effects = [];
function addEffect(effect) {
	invariant(typeof effect.test === "function" && typeof effect.read === "function", "Effects passed to animate.addEffect() need test() and read().", "effect-missing-test");
	removeEffect(effect);
	effects.unshift(effect);
}
function removeEffect(effect) {
	removeItem(effects, effect);
}
function findEffect(subject) {
	return effects.find((effect) => effect.test(subject));
}
/**
* Animate the keys of `subject` via `effect`. Motion values are created on
* first animation, seeded from `effect.read()` or the first keyframe, and
* then bound to the subject via the effect for the rest of its life.
*/
function animateEffectSubject(effect, subject, keyframes, transition = {}) {
	const animations = [];
	for (const key in keyframes) {
		const target = keyframes[key];
		let value = effect.get(subject, key);
		if (!value) {
			const initial = effect.read(subject, key, target) ?? firstKeyframe(target);
			invariant(initial !== void 0, `"${key}" can't be read from the animated subject. Provide [from, to] keyframes.`, "effect-unreadable-value");
			value = motionValue(initial);
			effect(subject, { [key]: value });
		}
		value.start(animateMotionValue(key, value, target, getValueTransition(transition, key)));
		value.animation && animations.push(value.animation);
	}
	return animations;
}
function firstKeyframe(target) {
	const first = Array.isArray(target) ? target[0] : void 0;
	return first === null ? void 0 : first;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/utils/resolve-elements.mjs
function resolveElements(elementOrSelector, scope, selectorCache) {
	if (elementOrSelector == null) return [];
	if (elementOrSelector instanceof EventTarget) return [elementOrSelector];
	else if (typeof elementOrSelector === "string") {
		let root = document;
		if (scope) root = scope.current;
		const elements = selectorCache?.[elementOrSelector] ?? root.querySelectorAll(elementOrSelector);
		return elements ? Array.from(elements) : [];
	}
	return Array.from(elementOrSelector).filter((element) => element != null);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/effects/utils/create-dom-effect.mjs
function createSelectorEffect(subjectEffect) {
	return (subject, values) => {
		const elements = resolveElements(subject);
		const subscriptions = [];
		for (const element of elements) {
			const remove = subjectEffect(element, values);
			subscriptions.push(remove);
		}
		return () => {
			for (const remove of subscriptions) remove();
		};
	};
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/types/utils/get-as-type.mjs
/**
* Provided a value and a ValueType, returns the value as that value type.
*/
var getValueAsType = (value, type) => {
	return type && typeof value === "number" ? type.transform(value) : value;
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/effects/MotionValueState.mjs
var MotionValueState = class {
	/**
	* @param step - The frameloop step renders are scheduled in. Defaults
	* to `frame.render`. Effects that feed a render loop running in
	* `frame.render` (GPU scenes) should write in `frame.preRender`.
	*/
	constructor(step = frame.render) {
		this.step = step;
		this.latest = {};
		this.values = /* @__PURE__ */ new Map();
	}
	set(name, value, render, computed, useDefaultValueType = true) {
		const existingValue = this.values.get(name);
		if (existingValue) existingValue.onRemove();
		const onChange = () => {
			const v = value.get();
			if (useDefaultValueType) this.latest[name] = getValueAsType(v, numberValueTypes[name]);
			else this.latest[name] = v;
			render && this.step(render);
		};
		onChange();
		const cancelOnChange = value.on("change", onChange);
		computed && value.addDependent(computed);
		const remove = () => {
			cancelOnChange();
			render && cancelFrame(render);
			this.values.delete(name);
			computed && value.removeDependent(computed);
		};
		this.values.set(name, {
			value,
			onRemove: remove
		});
		return remove;
	}
	get(name) {
		return this.values.get(name)?.value;
	}
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/effects/utils/create-effect.mjs
function createEffect(addValue, { step, ...options } = {}) {
	const stateCache = /* @__PURE__ */ new WeakMap();
	const effect = (subject, values) => {
		const state = stateCache.get(subject) ?? new MotionValueState(step);
		stateCache.set(subject, state);
		const subscriptions = [];
		for (const key in values) {
			const value = values[key];
			const remove = addValue(subject, state, key, value);
			subscriptions.push(remove);
		}
		return () => {
			for (const cancel of subscriptions) cancel();
		};
	};
	return Object.assign(effect, options, { get: (subject, key) => stateCache.get(subject)?.get(key) });
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/effects/attr/index.mjs
function canSetAsProperty(element, name) {
	if (!(name in element)) return false;
	const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), name) || Object.getOwnPropertyDescriptor(element, name);
	return descriptor && typeof descriptor.set === "function";
}
var addAttrValue = (element, state, key, value) => {
	const isProp = canSetAsProperty(element, key);
	const name = isProp ? key : key.startsWith("data") || key.startsWith("aria") ? camelToDash(key) : key;
	/**
	* Set attribute directly via property if available
	*/
	const render = isProp ? () => {
		element[name] = state.latest[key];
	} : () => {
		const v = state.latest[key];
		if (v === null || v === void 0) element.removeAttribute(name);
		else element.setAttribute(name, String(v));
	};
	return state.set(key, value, render);
};
var attrEffect = /*@__PURE__*/ createSelectorEffect(/*@__PURE__*/ createEffect(addAttrValue));
//#endregion
//#region ../../node_modules/motion-dom/dist/es/effects/prop/index.mjs
var propEffect = /*@__PURE__*/ createEffect((subject, state, key, value) => {
	return state.set(key, value, () => {
		subject[key] = state.latest[key];
	}, void 0, false);
});
//#endregion
//#region ../../node_modules/motion-dom/dist/es/utils/is-html-element.mjs
/**
* Checks if an element is an HTML element in a way
* that works across iframes
*/
function isHTMLElement(element) {
	return isObject(element) && "offsetHeight" in element && !("ownerSVGElement" in element);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/effects/style/transform.mjs
var translateAlias$1 = {
	x: "translateX",
	y: "translateY",
	z: "translateZ",
	transformPerspective: "perspective"
};
function buildTransform$1(state) {
	let transform = "";
	let transformIsDefault = true;
	/**
	* Loop over all possible transforms in order, adding the ones that
	* are present to the transform string.
	*/
	for (let i = 0; i < transformPropOrder.length; i++) {
		const key = transformPropOrder[i];
		const value = state.latest[key];
		if (value === void 0) continue;
		let valueIsDefault = true;
		if (typeof value === "number") valueIsDefault = value === (key.startsWith("scale") ? 1 : 0);
		else {
			const parsed = parseFloat(value);
			valueIsDefault = key.startsWith("scale") ? parsed === 1 : parsed === 0;
		}
		if (!valueIsDefault) {
			transformIsDefault = false;
			const transformName = translateAlias$1[key] || key;
			transform += `${transformName}(${value}) `;
		}
	}
	const pathRotation = state.latest.pathRotation;
	if (pathRotation) {
		transformIsDefault = false;
		transform += `rotate(${typeof pathRotation === "number" ? `${pathRotation}deg` : pathRotation}) `;
	}
	return transformIsDefault ? "none" : transform.trim();
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/effects/style/index.mjs
var originProps = /* @__PURE__ */ new Set([
	"originX",
	"originY",
	"originZ"
]);
var addStyleValue = (element, state, key, value) => {
	let render = void 0;
	let computed = void 0;
	if (transformProps.has(key)) {
		if (!state.get("transform")) {
			if (!isHTMLElement(element) && !state.get("transformBox")) addStyleValue(element, state, "transformBox", new MotionValue("fill-box"));
			state.set("transform", new MotionValue("none"), () => {
				element.style.transform = buildTransform$1(state);
			});
		}
		computed = state.get("transform");
	} else if (originProps.has(key)) {
		if (!state.get("transformOrigin")) state.set("transformOrigin", new MotionValue(""), () => {
			const originX = state.latest.originX ?? "50%";
			const originY = state.latest.originY ?? "50%";
			const originZ = state.latest.originZ ?? 0;
			element.style.transformOrigin = `${originX} ${originY} ${originZ}`;
		});
		computed = state.get("transformOrigin");
	} else if (isCSSVar(key)) render = () => {
		element.style.setProperty(key, state.latest[key]);
	};
	else render = () => {
		element.style[key] = state.latest[key];
	};
	return state.set(key, value, render, computed);
};
var styleEffect = /*@__PURE__*/ createSelectorEffect(/*@__PURE__*/ createEffect(addStyleValue));
//#endregion
//#region ../../node_modules/motion-dom/dist/es/effects/svg/index.mjs
function addSVGPathValue(element, state, key, value) {
	frame.render(() => element.setAttribute("pathLength", "1"));
	if (key === "pathOffset") return state.set(key, value, () => {
		const offset = state.latest[key];
		element.setAttribute("stroke-dashoffset", `${-offset}`);
	});
	else {
		if (!state.get("stroke-dasharray")) state.set("stroke-dasharray", new MotionValue("1 1"), () => {
			const { pathLength = 1, pathSpacing } = state.latest;
			element.setAttribute("stroke-dasharray", `${pathLength} ${pathSpacing ?? 1 - Number(pathLength)}`);
		});
		return state.set(key, value, void 0, state.get("stroke-dasharray"));
	}
}
var addSVGValue = (element, state, key, value) => {
	if (key.startsWith("path")) return addSVGPathValue(element, state, key, value);
	else if (key.startsWith("attr")) return addAttrValue(element, state, convertAttrKey(key), value);
	return (key in element.style ? addStyleValue : addAttrValue)(element, state, key, value);
};
var svgEffect = /*@__PURE__*/ createSelectorEffect(/*@__PURE__*/ createEffect(addSVGValue));
function convertAttrKey(key) {
	return key.replace(/^attr([A-Z])/, (_, firstChar) => firstChar.toLowerCase());
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/frameloop/microtask.mjs
var { schedule: microtask, cancel: cancelMicrotask } = /* @__PURE__ */ createRenderBatcher(queueMicrotask, false);
//#endregion
//#region ../../node_modules/motion-dom/dist/es/gestures/drag/state/is-active.mjs
var isDragging = {
	x: false,
	y: false
};
function isDragActive() {
	return isDragging.x || isDragging.y;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/gestures/drag/state/set-active.mjs
function setDragLock(axis) {
	if (axis === "x" || axis === "y") {
		if (isDragging[axis]) return null;
		else {
			isDragging[axis] = true;
			return () => {
				isDragging[axis] = false;
			};
		}
	} else if (isDragging.x || isDragging.y) return null;
	else {
		isDragging.x = isDragging.y = true;
		return () => {
			isDragging.x = isDragging.y = false;
		};
	}
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/gestures/utils/setup.mjs
function setupGesture(elementOrSelector, options) {
	const elements = resolveElements(elementOrSelector);
	const gestureAbortController = new AbortController();
	const eventOptions = {
		passive: true,
		...options,
		signal: gestureAbortController.signal
	};
	const cancel = () => gestureAbortController.abort();
	return [
		elements,
		eventOptions,
		cancel
	];
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/gestures/hover.mjs
function isValidHover(event) {
	return !(event.pointerType === "touch" || isDragActive());
}
/**
* Create a hover gesture. hover() is different to .addEventListener("pointerenter")
* in that it has an easier syntax, filters out polyfilled touch events, interoperates
* with drag gestures, and automatically removes the "pointerennd" event listener when the hover ends.
*
* @public
*/
function hover(elementOrSelector, onHoverStart, options = {}) {
	const [elements, eventOptions, cancel] = setupGesture(elementOrSelector, options);
	elements.forEach((element) => {
		let isPressed = false;
		let deferredHoverEnd = false;
		let hoverEndCallback;
		const removePointerLeave = () => {
			element.removeEventListener("pointerleave", onPointerLeave);
		};
		const endHover = (event) => {
			if (hoverEndCallback) {
				hoverEndCallback(event);
				hoverEndCallback = void 0;
			}
			removePointerLeave();
		};
		const onPointerUp = (event) => {
			isPressed = false;
			window.removeEventListener("pointerup", onPointerUp);
			window.removeEventListener("pointercancel", onPointerUp);
			if (deferredHoverEnd) {
				deferredHoverEnd = false;
				endHover(event);
			}
		};
		const onPointerDown = () => {
			isPressed = true;
			window.addEventListener("pointerup", onPointerUp, eventOptions);
			window.addEventListener("pointercancel", onPointerUp, eventOptions);
		};
		const onPointerLeave = (leaveEvent) => {
			if (leaveEvent.pointerType === "touch") return;
			if (isPressed) {
				deferredHoverEnd = true;
				return;
			}
			endHover(leaveEvent);
		};
		const onPointerEnter = (enterEvent) => {
			if (!isValidHover(enterEvent)) return;
			deferredHoverEnd = false;
			const onHoverEnd = onHoverStart(element, enterEvent);
			if (typeof onHoverEnd !== "function") return;
			hoverEndCallback = onHoverEnd;
			element.addEventListener("pointerleave", onPointerLeave, eventOptions);
		};
		element.addEventListener("pointerenter", onPointerEnter, eventOptions);
		element.addEventListener("pointerdown", onPointerDown, eventOptions);
	});
	return cancel;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/gestures/utils/is-node-or-child.mjs
/**
* Recursively traverse up the tree to check whether the provided child node
* is the parent or a descendant of it.
*
* @param parent - Element to find
* @param child - Element to test against parent
*/
var isNodeOrChild = (parent, child) => {
	if (!child) return false;
	else if (parent === child) return true;
	else return isNodeOrChild(parent, child.parentElement);
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/gestures/utils/is-primary-pointer.mjs
var isPrimaryPointer = (event) => {
	if (event.pointerType === "mouse") return typeof event.button !== "number" || event.button <= 0;
	else
 /**
	* isPrimary is true for all mice buttons, whereas every touch point
	* is regarded as its own input. So subsequent concurrent touch points
	* will be false.
	*
	* Specifically match against false here as incomplete versions of
	* PointerEvents in very old browser might have it set as undefined.
	*/
	return event.isPrimary !== false;
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/gestures/press/utils/is-keyboard-accessible.mjs
var keyboardAccessibleElements = /* @__PURE__ */ new Set([
	"BUTTON",
	"INPUT",
	"SELECT",
	"TEXTAREA",
	"A"
]);
/**
* Checks if an element is natively keyboard accessible (focusable).
* Used by the press gesture to determine if we need to add tabIndex.
*/
function isElementKeyboardAccessible(element) {
	return keyboardAccessibleElements.has(element.tagName) || element.isContentEditable === true;
}
var textInputElements = /* @__PURE__ */ new Set([
	"INPUT",
	"SELECT",
	"TEXTAREA"
]);
/**
* Checks if an element has text selection or direct interaction behavior
* that should block drag gestures from starting.
*
* This specifically targets form controls where the user might want to select
* text or interact with the control (e.g., sliders, dropdowns).
*
* Buttons and links are NOT included because they don't have click-and-move
* actions of their own - they only respond to click events, so dragging
* should still work when initiated from these elements.
*/
function isElementTextInput(element) {
	return textInputElements.has(element.tagName) || element.isContentEditable === true;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/gestures/press/utils/state.mjs
var isPressing = /* @__PURE__ */ new WeakSet();
//#endregion
//#region ../../node_modules/motion-dom/dist/es/gestures/press/utils/keyboard.mjs
/**
* Filter out events that are not "Enter" keys.
*/
function filterEvents(callback) {
	return (event) => {
		if (event.key !== "Enter") return;
		callback(event);
	};
}
function firePointerEvent(target, type) {
	target.dispatchEvent(new PointerEvent("pointer" + type, {
		isPrimary: true,
		bubbles: true
	}));
}
var enableKeyboardPress = (focusEvent, eventOptions) => {
	const element = focusEvent.currentTarget;
	if (!element) return;
	const handleKeydown = filterEvents(() => {
		if (isPressing.has(element)) return;
		firePointerEvent(element, "down");
		const handleKeyup = filterEvents(() => {
			firePointerEvent(element, "up");
		});
		const handleBlur = () => firePointerEvent(element, "cancel");
		element.addEventListener("keyup", handleKeyup, eventOptions);
		element.addEventListener("blur", handleBlur, eventOptions);
	});
	element.addEventListener("keydown", handleKeydown, eventOptions);
	/**
	* Add an event listener that fires on blur to remove the keydown events.
	*/
	element.addEventListener("blur", () => element.removeEventListener("keydown", handleKeydown), eventOptions);
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/gestures/press/index.mjs
/**
* Filter out events that are not primary pointer events, or are triggering
* while a Motion gesture is active.
*/
function isValidPressEvent(event) {
	return isPrimaryPointer(event) && !isDragActive();
}
var claimedPointerDownEvents = /* @__PURE__ */ new WeakSet();
/**
* Create a press gesture.
*
* Press is different to `"pointerdown"`, `"pointerup"` in that it
* automatically filters out secondary pointer events like right
* click and multitouch.
*
* It also adds accessibility support for keyboards, where
* an element with a press gesture will receive focus and
*  trigger on Enter `"keydown"` and `"keyup"` events.
*
* This is different to a browser's `"click"` event, which does
* respond to keyboards but only for the `"click"` itself, rather
* than the press start and end/cancel. The element also needs
* to be focusable for this to work, whereas a press gesture will
* make an element focusable by default.
*
* @public
*/
function press(targetOrSelector, onPressStart, options = {}) {
	const [targets, eventOptions, cancelEvents] = setupGesture(targetOrSelector, options);
	const startPress = (startEvent) => {
		const target = startEvent.currentTarget;
		if (!isValidPressEvent(startEvent)) return;
		if (claimedPointerDownEvents.has(startEvent)) return;
		isPressing.add(target);
		if (options.stopPropagation) claimedPointerDownEvents.add(startEvent);
		const onPressEnd = onPressStart(target, startEvent);
		/**
		* End listeners run in the capture phase so a descendant calling
		* stopPropagation() in its own pointerup handler can't prevent the
		* press gesture from ending. This also keeps the gesture-end
		* ordering consistent with the drag gesture. See #2794.
		*/
		const endEventOptions = {
			...eventOptions,
			capture: true
		};
		const onPointerEnd = (endEvent, success) => {
			window.removeEventListener("pointerup", onPointerUp, endEventOptions);
			window.removeEventListener("pointercancel", onPointerCancel, endEventOptions);
			if (isPressing.has(target)) isPressing.delete(target);
			if (!isValidPressEvent(endEvent)) return;
			if (typeof onPressEnd === "function") onPressEnd(endEvent, { success });
		};
		const onPointerUp = (upEvent) => {
			onPointerEnd(upEvent, target === window || target === document || options.useGlobalTarget || isNodeOrChild(target, upEvent.target));
		};
		const onPointerCancel = (cancelEvent) => {
			onPointerEnd(cancelEvent, false);
		};
		window.addEventListener("pointerup", onPointerUp, endEventOptions);
		window.addEventListener("pointercancel", onPointerCancel, endEventOptions);
	};
	targets.forEach((target) => {
		(options.useGlobalTarget ? window : target).addEventListener("pointerdown", startPress, eventOptions);
		if (isHTMLElement(target)) {
			target.addEventListener("focus", (event) => enableKeyboardPress(event, eventOptions));
			if (!isElementKeyboardAccessible(target) && !target.hasAttribute("tabindex")) target.tabIndex = 0;
		}
	});
	return cancelEvents;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/dom/style-computed.mjs
function getComputedStyle$1(element, name) {
	const computedStyle = window.getComputedStyle(element);
	return isCSSVar(name) ? computedStyle.getPropertyValue(name) : computedStyle[name];
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/utils/is-svg-element.mjs
/**
* Checks if an element is an SVG element in a way
* that works across iframes
*/
function isSVGElement(element) {
	return isObject(element) && "ownerSVGElement" in element;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/resize/handle-element.mjs
var resizeHandlers = /* @__PURE__ */ new WeakMap();
var observer;
var getSize = (borderBoxAxis, svgAxis, htmlAxis) => (target, borderBoxSize) => {
	if (borderBoxSize && borderBoxSize[0]) return borderBoxSize[0][borderBoxAxis + "Size"];
	else if (isSVGElement(target) && "getBBox" in target) return target.getBBox()[svgAxis];
	else return target[htmlAxis];
};
var getWidth = /*@__PURE__*/ getSize("inline", "width", "offsetWidth");
var getHeight = /*@__PURE__*/ getSize("block", "height", "offsetHeight");
function notifyTarget({ target, borderBoxSize }) {
	resizeHandlers.get(target)?.forEach((handler) => {
		handler(target, {
			get width() {
				return getWidth(target, borderBoxSize);
			},
			get height() {
				return getHeight(target, borderBoxSize);
			}
		});
	});
}
function notifyAll(entries) {
	entries.forEach(notifyTarget);
}
function createResizeObserver() {
	if (typeof ResizeObserver === "undefined") return;
	observer = new ResizeObserver(notifyAll);
}
function resizeElement(target, handler) {
	if (!observer) createResizeObserver();
	const elements = resolveElements(target);
	elements.forEach((element) => {
		let elementHandlers = resizeHandlers.get(element);
		if (!elementHandlers) {
			elementHandlers = /* @__PURE__ */ new Set();
			resizeHandlers.set(element, elementHandlers);
		}
		elementHandlers.add(handler);
		observer?.observe(element);
	});
	return () => {
		elements.forEach((element) => {
			const elementHandlers = resizeHandlers.get(element);
			elementHandlers?.delete(handler);
			if (!elementHandlers?.size) observer?.unobserve(element);
		});
	};
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/resize/handle-window.mjs
var windowCallbacks = /* @__PURE__ */ new Set();
var windowResizeHandler;
function createWindowResizeHandler() {
	windowResizeHandler = () => {
		const info = {
			get width() {
				return window.innerWidth;
			},
			get height() {
				return window.innerHeight;
			}
		};
		windowCallbacks.forEach((callback) => callback(info));
	};
	window.addEventListener("resize", windowResizeHandler);
}
function resizeWindow(callback) {
	windowCallbacks.add(callback);
	if (!windowResizeHandler) createWindowResizeHandler();
	return () => {
		windowCallbacks.delete(callback);
		if (!windowCallbacks.size && typeof windowResizeHandler === "function") {
			window.removeEventListener("resize", windowResizeHandler);
			windowResizeHandler = void 0;
		}
	};
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/resize/index.mjs
function resize(a, b) {
	return typeof a === "function" ? resizeWindow(a) : resizeElement(a, b);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/scroll/observe.mjs
function observeTimeline(update, timeline) {
	let prevProgress;
	const onFrame = () => {
		const { currentTime } = timeline;
		const progress = (currentTime === null ? 0 : currentTime.value) / 100;
		if (prevProgress !== progress) update(progress);
		prevProgress = progress;
	};
	frame.preUpdate(onFrame, true);
	return () => cancelFrame(onFrame);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/stats/buffer.mjs
var statsBuffer = {
	value: null,
	addProjectionMetrics: null
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/stats/index.mjs
function clearStatsBuffer() {
	statsBuffer.value = null;
	statsBuffer.addProjectionMetrics = null;
}
function recordStats() {
	if (statsBuffer.value) {
		clearStatsBuffer();
		throw new Error("Stats are already being measured");
	}
	const buffer = statsBuffer;
	buffer.value = { layoutProjection: {
		nodes: [],
		calculatedTargetDeltas: [],
		calculatedProjections: []
	} };
	buffer.addProjectionMetrics = (metrics) => {
		const { layoutProjection } = buffer.value;
		layoutProjection.nodes.push(metrics.nodes);
		layoutProjection.calculatedTargetDeltas.push(metrics.calculatedTargetDeltas);
		layoutProjection.calculatedProjections.push(metrics.calculatedProjections);
	};
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/utils/is-svg-svg-element.mjs
/**
* Checks if an element is specifically an SVGSVGElement (the root SVG element)
* in a way that works across iframes
*/
function isSVGSVGElement(element) {
	return isSVGElement(element) && element.tagName === "svg";
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/utils/stagger.mjs
function getOriginIndex(from, total) {
	if (from === "first") return 0;
	else {
		const lastIndex = total - 1;
		return from === "last" ? lastIndex : lastIndex / 2;
	}
}
function stagger(duration = .1, { startDelay = 0, from = 0, ease } = {}) {
	return (i, total) => {
		const fromIndex = typeof from === "number" ? from : getOriginIndex(from, total);
		let delay = duration * Math.abs(fromIndex - i);
		if (ease) {
			const maxDelay = total * duration;
			delay = easingDefinitionToFunction(ease)(delay / maxDelay) * maxDelay;
		}
		return startDelay + delay;
	};
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/utils/transform.mjs
function transform(...args) {
	const useImmediate = !Array.isArray(args[0]);
	const argOffset = useImmediate ? 0 : -1;
	const inputValue = args[0 + argOffset];
	const inputRange = args[1 + argOffset];
	const outputRange = args[2 + argOffset];
	const options = args[3 + argOffset];
	const interpolator = interpolate(inputRange, outputRange, options);
	return useImmediate ? interpolator(inputValue) : interpolator;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/follow-value.mjs
/**
* Create a `MotionValue` that animates to its latest value using any transition type.
* Can either be a value or track another `MotionValue`.
*
* ```jsx
* const x = motionValue(0)
* const y = followValue(x, { type: "spring", stiffness: 300 })
* // or with tween
* const z = followValue(x, { type: "tween", duration: 0.5, ease: "easeOut" })
* ```
*
* @param source - Initial value or MotionValue to track
* @param options - Animation transition options
* @returns `MotionValue`
*
* @public
*/
function followValue(source, options) {
	const value = motionValue(isMotionValue(source) ? source.get() : source);
	attachFollow(value, source, options);
	return value;
}
/**
* Attach an animation to a MotionValue that will animate whenever the value changes.
* Similar to attachSpring but supports any transition type (spring, tween, inertia, etc.)
*
* @param value - The MotionValue to animate
* @param source - Initial value or MotionValue to track
* @param options - Animation transition options
* @returns Cleanup function
*
* @public
*/
function attachFollow(value, source, options = {}) {
	const initialValue = value.get();
	let activeAnimation = null;
	let latestValue = initialValue;
	let latestSetter;
	const unit = typeof initialValue === "string" ? initialValue.replace(/[\d.-]/g, "") : void 0;
	const stopAnimation = () => {
		if (activeAnimation) {
			activeAnimation.stop();
			activeAnimation = null;
		}
		value.animation = void 0;
	};
	const startAnimation = () => {
		const currentValue = asNumber$1(value.get());
		const targetValue = asNumber$1(latestValue);
		if (currentValue === targetValue) {
			stopAnimation();
			return;
		}
		const velocity = activeAnimation ? activeAnimation.getGeneratorVelocity() : value.getVelocity();
		stopAnimation();
		activeAnimation = new JSAnimation({
			keyframes: [currentValue, targetValue],
			velocity,
			type: "spring",
			restDelta: .001,
			restSpeed: .01,
			...options,
			onUpdate: latestSetter
		});
	};
	const scheduleAnimation = () => {
		startAnimation();
		value.animation = activeAnimation ?? void 0;
		value["events"].animationStart?.notify();
		activeAnimation?.then(() => {
			value.animation = void 0;
			value["events"].animationComplete?.notify();
		});
	};
	value.attach((v, set) => {
		latestValue = v;
		latestSetter = (latest) => set(parseValue(latest, unit));
		frame.postRender(scheduleAnimation);
	}, stopAnimation);
	if (isMotionValue(source)) {
		let skipNextAnimation = options.skipInitialAnimation === true;
		const removeSourceOnChange = source.on("change", (v) => {
			if (skipNextAnimation) {
				skipNextAnimation = false;
				value.jump(parseValue(v, unit), false);
			} else value.set(parseValue(v, unit));
		});
		const removeValueOnDestroy = value.on("destroy", removeSourceOnChange);
		return () => {
			removeSourceOnChange();
			removeValueOnDestroy();
		};
	}
	return stopAnimation;
}
function parseValue(v, unit) {
	return unit ? v + unit : v;
}
function asNumber$1(v) {
	return typeof v === "number" ? v : parseFloat(v);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/subscribe-value.mjs
function subscribeValue(inputValues, outputValue, getLatest) {
	const update = () => outputValue.set(getLatest());
	const scheduleUpdate = () => frame.preRender(update, false, true);
	const subscriptions = inputValues.map((v) => v.on("change", scheduleUpdate));
	outputValue.on("destroy", () => {
		subscriptions.forEach((unsubscribe) => unsubscribe());
		cancelFrame(update);
	});
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/transform-value.mjs
/**
* Create a `MotionValue` that transforms the output of other `MotionValue`s by
* passing their latest values through a transform function.
*
* Whenever a `MotionValue` referred to in the provided function is updated,
* it will be re-evaluated.
*
* ```jsx
* const x = motionValue(0)
* const y = transformValue(() => x.get() * 2) // double x
* ```
*
* @param transformer - A transform function. This function must be pure with no side-effects or conditional statements.
* @returns `MotionValue`
*
* @public
*/
function transformValue(transform) {
	const collectedValues = [];
	/**
	* Open session of collectMotionValues. Any MotionValue that calls get()
	* inside transform will be saved into this array.
	*/
	collectMotionValues.current = collectedValues;
	const initialValue = transform();
	collectMotionValues.current = void 0;
	const value = motionValue(initialValue);
	subscribeValue(collectedValues, value, transform);
	return value;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/map-value.mjs
/**
* Create a `MotionValue` that maps the output of another `MotionValue` by
* mapping it from one range of values into another.
*
* @remarks
*
* Given an input range of `[-200, -100, 100, 200]` and an output range of
* `[0, 1, 1, 0]`, the returned `MotionValue` will:
*
* - When provided a value between `-200` and `-100`, will return a value between `0` and  `1`.
* - When provided a value between `-100` and `100`, will return `1`.
* - When provided a value between `100` and `200`, will return a value between `1` and  `0`
*
* The input range must be a linear series of numbers. The output range
* can be any value type supported by Motion: numbers, colors, shadows, etc.
*
* Every value in the output range must be of the same type and in the same format.
*
* ```jsx
* const x = motionValue(0)
* const xRange = [-200, -100, 100, 200]
* const opacityRange = [0, 1, 1, 0]
* const opacity = mapValue(x, xRange, opacityRange)
* ```
*
* @param inputValue - `MotionValue`
* @param inputRange - A linear series of numbers (either all increasing or decreasing)
* @param outputRange - A series of numbers, colors or strings. Must be the same length as `inputRange`.
* @param options -
*
*  - clamp: boolean. Clamp values to within the given range. Defaults to `true`
*  - ease: EasingFunction[]. Easing functions to use on the interpolations between each value in the input and output ranges. If provided as an array, the array must be one item shorter than the input and output ranges, as the easings apply to the transition between each.
*
* @returns `MotionValue`
*
* @public
*/
function mapValue(inputValue, inputRange, outputRange, options) {
	const map = transform(inputRange, outputRange, options);
	return transformValue(() => map(inputValue.get()));
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/spring-value.mjs
/**
* Create a `MotionValue` that animates to its latest value using a spring.
* Can either be a value or track another `MotionValue`.
*
* ```jsx
* const x = motionValue(0)
* const y = springValue(x, { stiffness: 300 })
* ```
*
* @param source - Initial value or MotionValue to track
* @param options - Spring configuration options
* @returns `MotionValue`
*
* @public
*/
function springValue(source, options) {
	return followValue(source, {
		type: "spring",
		...options
	});
}
/**
* Attach a spring animation to a MotionValue that will animate whenever the value changes.
*
* @param value - The MotionValue to animate
* @param source - Initial value or MotionValue to track
* @param options - Spring configuration options
* @returns Cleanup function
*
* @public
*/
function attachSpring(value, source, options) {
	return attachFollow(value, source, {
		type: "spring",
		...options
	});
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/types/utils/find.mjs
/**
* A list of all ValueTypes
*/
var valueTypes = [
	...dimensionValueTypes,
	color,
	complex
];
/**
* Tests a value against the list of ValueTypes
*/
var findValueType = (v) => valueTypes.find(testValueType(v));
//#endregion
//#region ../../node_modules/motion-dom/dist/es/view/utils/assign-names.mjs
var nameCount = 0;
/**
* Generated names live in their own namespace so we can tell a name we own
* (and must clean up) from an author-defined one - and so a stale generated
* name left behind by an interrupted transition is re-owned, not mistaken for
* the author's and leaked.
*/
var generatedName = () => `motion-view-${nameCount++}`;
var isGeneratedName = (name) => name.startsWith("motion-view-");
/**
* Tag a captured element with a `view-transition-class` so authors can target
* its generated layer from CSS (e.g. `::view-transition-group(.hero)`) without
* the opaque generated name. Tracked in `classed` - separate from the generated
* names in `assigned` - so cleanup removes the class without ever stripping an
* author's own inline `view-transition-name`.
*/
function tagClass(element, className, classed) {
	if (!className) return;
	element.style?.setProperty("view-transition-class", className);
	classed.push(element);
}
/**
* Set the element's `view-transition-group` so its layer reconstructs the DOM
* hierarchy in the pseudo-tree (`contain`) - or stays flat (`none`). Tracked in
* `grouped` for cleanup. When the element clips (any non-`visible` overflow) its
* name is recorded in `clipChildren` so the caller can clip the nested children
* (`::view-transition-group-children(name)`), mirroring the live clip through
* the whole transition rather than only at the live-DOM handoff.
*
* Ignored by browsers without nested view-transition groups, where it harmlessly
* degrades to the flat default.
*/
function applyGroup(element, name, group, grouped, clipChildren) {
	if (!group) return;
	element.style?.setProperty("view-transition-group", group);
	grouped.push(element);
	if (group !== "none" && clipChildren) {
		const style = getComputedStyle(element);
		if (style.overflowX !== "visible" || style.overflowY !== "visible") clipChildren.add(name);
	}
}
/**
* Resolve a selector/Element to elements and ensure each one carries a
* `view-transition-name` we can target from script.
*
* Author-defined names are reused as-is. Elements that are unnamed (or use
* the browser's `auto`/`match-element`, whose generated name is not exposed
* to script) are given a unique generated name, set inline so it's captured,
* and tracked in `assigned` for later cleanup.
*
* `registry` maps each Element to its name so the same element keeps its name
* across both captures (before and after the update), which is what allows a
* persistent element to animate as a single `group` layer.
*/
function assignViewTransitionNames(definition, registry, assigned, forcedNames, className, classed = [], group, grouped = [], clipChildren) {
	const elements = resolveElements(definition);
	/**
	* The new end of a paired morph: give each element the matching name from
	* the old end (by index) so the two share one layer and morph. If the new
	* end resolves to *more* elements than the old end named, the extras have no
	* counterpart - give them a fresh name so they animate as newcomers rather
	* than being silently left unnamed. We return the names actually assigned
	* (sized to the resolved elements), not the raw `forcedNames`, so stagger
	* totals and the layer set stay in step with what's on the page.
	*/
	if (forcedNames) return elements.map((element, i) => {
		const existing = registry.get(element);
		if (existing) return existing;
		const name = forcedNames[i] ?? generatedName();
		element.style?.setProperty("view-transition-name", name);
		assigned.push(element);
		registry.set(element, name);
		tagClass(element, className, classed);
		applyGroup(element, name, group, grouped, clipChildren);
		return name;
	});
	/**
	* Read every current name up front, before assigning any. Interleaving the
	* reads with the inline `setProperty` writes below would dirty styles
	* between reads and force a style recalc per element; batching the reads
	* keeps it to one. Elements already in the registry keep their name and
	* need no read.
	*/
	const currentNames = elements.map((element) => registry.has(element) ? void 0 : getComputedStyle(element).getPropertyValue("view-transition-name"));
	return elements.map((element, i) => {
		const existing = registry.get(element);
		if (existing) return existing;
		const current = currentNames[i];
		let name;
		if (current && current !== "none" && current !== "auto" && current !== "match-element" && !isGeneratedName(current))
 /**
		* The author already named this layer - target it as-is and leave
		* it to them to clean up. `auto`/`match-element` are overridden
		* because their generated name is not exposed to script, and a
		* stale `motion-view-*` (e.g. left by an interrupted transition) is
		* re-owned rather than adopted as an author name and leaked.
		*/
		name = current;
		else {
			name = generatedName();
			element.style?.setProperty("view-transition-name", name);
			assigned.push(element);
		}
		registry.set(element, name);
		tagClass(element, className, classed);
		applyGroup(element, name, group, grouped, clipChildren);
		return name;
	});
}
/**
* Remove the `view-transition-name`s we generated and the
* `view-transition-class`es we applied. Author-defined names are never touched
* (they're not in `assigned`). Safe to call more than once (e.g. on both a
* finished and an interrupted transition).
*/
function releaseViewTransitionNames(assigned, classed = [], grouped = []) {
	for (const element of assigned) element.style?.removeProperty("view-transition-name");
	for (const element of classed) element.style?.removeProperty("view-transition-class");
	for (const element of grouped) element.style?.removeProperty("view-transition-group");
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/view/utils/choose-layer-type.mjs
function chooseLayerType(valueName) {
	if (valueName === "layout") return "group";
	if (valueName === "enter" || valueName === "new") return "new";
	return "old";
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/view/utils/css.mjs
var pendingRules = {};
var style = null;
var css = {
	set: (selector, values) => {
		pendingRules[selector] = values;
	},
	commit: () => {
		if (!style) {
			style = document.createElement("style");
			style.id = "motion-view";
		}
		let cssText = "";
		for (const selector in pendingRules) {
			const rule = pendingRules[selector];
			cssText += `${selector} {\n`;
			for (const [property, value] of Object.entries(rule)) cssText += `  ${property}: ${value};\n`;
			cssText += "}\n";
		}
		style.textContent = cssText;
		document.head.appendChild(style);
		pendingRules = {};
	},
	remove: () => {
		if (style && style.parentElement) style.parentElement.removeChild(style);
	}
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/view/utils/get-layer-info.mjs
function getViewAnimationLayerInfo(pseudoElement) {
	const match = pseudoElement.match(/::view-transition-(old|new|group-children|group|image-pair)\((.*?)\)/);
	if (!match) return null;
	return {
		layer: match[2],
		type: match[1]
	};
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/view/utils/get-view-animations.mjs
function getViewAnimations() {
	return document.getAnimations().filter((animation) => {
		const { effect } = animation;
		return !!effect && effect.target === document.documentElement && effect.pseudoElement?.startsWith("::view-transition");
	});
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/view/utils/has-target.mjs
function hasTarget(target, targets) {
	return targets.has(target) && Object.keys(targets.get(target)).length > 0;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/view/start.mjs
var definitionNames = [
	"layout",
	"enter",
	"exit",
	"new",
	"old"
];
/**
* Whether a computed border-radius is square (every component zero). Splitting
* on whitespace handles two-value/elliptical radii like "0px 20px" - a leading
* `parseFloat` alone would misread the non-zero vertical radius as square.
*/
var isSquareRadius = (radius) => radius.split(" ").every((value) => parseFloat(value) === 0);
/**
* The `ViewTransitionTarget` buckets driving each generated layer type, in
* priority order - the inverse of `chooseLayerType`. The new view is driven by
* `new`/`enter`, the old by `old`/`exit`. `group-children`/`image-pair` have no
* bucket; they follow the default layout timing.
*/
var typeBuckets = {
	group: ["layout"],
	new: ["new", "enter"],
	old: ["old", "exit"]
};
/**
* Default "absent" origin for a single-value keyframe, by pseudo type, so e.g.
* `enter({ scale: 1 })` grows in from 0.85 and `exit({ opacity: 0 })` fades
* from 1. `enter` prefers the matching `exit` value over these (see below).
*/
var ORIGIN_DEFAULTS = {
	new: {
		opacity: 0,
		scale: .85
	},
	old: {
		opacity: 1,
		scale: 1
	}
};
/**
* How much two box aspect ratios must differ before a morph is treated as
* aspect-changing (and so worth cropping). Matches the projection engine's
* `preserve-aspect` threshold, so small layout jitter doesn't trigger a crop.
*/
var ASPECT_TOLERANCE = .2;
function startViewAnimation(builder) {
	const { update, targets, resolveDefs, cropOverride, pairs, classNames, flatGroups, options: defaultOptions } = builder;
	if (!document.startViewTransition) return (async () => {
		await update();
		return new GroupAnimation([]);
	})();
	/**
	* Resolve any selector/Element targets to layer names, assigning a
	* `view-transition-name` to each element as we go. We run this before the
	* update (so the elements are captured in the old snapshot) and again
	* after it (for the new snapshot). An element present in both keeps the
	* same name and animates as a single `group` layer.
	*/
	const nameRegistry = /* @__PURE__ */ new Map();
	const assigned = [];
	/**
	* Elements we tagged with a `view-transition-class` (via `.class()`),
	* tracked separately from `assigned` so cleanup removes the class without
	* ever stripping an author's own inline `view-transition-name`.
	*/
	const classed = [];
	/**
	* Elements we set a `view-transition-group` on (for nesting), tracked for
	* cleanup. `clipChildren` collects the names of nested parents that clip in
	* the live layout, so their `::view-transition-group-children` is clipped
	* through the transition - not just once the live DOM takes back over.
	*/
	const grouped = [];
	const clipChildren = /* @__PURE__ */ new Set();
	const layerTargets = /* @__PURE__ */ new Map();
	const croppedNames = /* @__PURE__ */ new Set();
	/**
	* Each layer's explicit `.crop(true | false)` override (by resolved name),
	* so `finalizeCrop` can let an author's choice win over the morph default.
	*/
	const cropForName = /* @__PURE__ */ new Map();
	/**
	* Each layer's stagger position (index + total) within its subject, per
	* snapshot. Resolving against the snapshot the layer belongs to keeps
	* stagger correct when `update()` replaces the matched elements, and lets
	* us skip a layer that's absent from a snapshot (e.g. an exited element
	* has no `new` pseudo-element).
	*/
	const layerStagger = /* @__PURE__ */ new Map();
	/**
	* Names allocated for a paired subject in the old snapshot, replayed onto
	* its new-snapshot target so both ends share a layer and morph.
	*/
	const pairNames = /* @__PURE__ */ new Map();
	/**
	* The old (`from`) elements of each paired subject, so their names can be
	* transferred off before the new (`to`) elements inherit them.
	*/
	const pairFrom = /* @__PURE__ */ new Map();
	const resolveLayers = (phase) => {
		targets.forEach((target, definition) => {
			const className = classNames.get(definition);
			/**
			* Nest each resolved layer under its DOM-ancestor layer by default
			* (`contain`), so an ancestor's clip/transform/opacity reach it
			* through the transition; `.group(false)` opts a subject out (`none`)
			* to stay flat and escape. Skipped for root / pre-named layers, which
			* aren't elements we resolve and style.
			*/
			const group = definition === "root" || !resolveDefs.has(definition) ? void 0 : flatGroups.has(definition) ? "none" : "contain";
			let names;
			if (definition === "root" || !resolveDefs.has(definition)) names = [definition];
			else if (pairs.has(definition)) {
				/**
				* Paired morph: name the old target in the old snapshot, then
				* force the same name(s) onto the new target in the new one, so
				* two different elements morph as a single layer.
				*/
				if (phase === "old") {
					pairFrom.set(definition, resolveElements(definition));
					names = assignViewTransitionNames(definition, nameRegistry, assigned, void 0, className, classed, group, grouped, clipChildren);
					pairNames.set(definition, names);
				} else {
					/**
					* Transfer the name(s) off the `from` elements before the
					* `to` elements inherit them. A `from` that survives into
					* the new snapshot (e.g. hidden with `visibility: hidden`
					* rather than removed) would otherwise keep the name and
					* collide - "duplicate view-transition-name".
					*/
					for (const el of pairFrom.get(definition) ?? []) {
						el.style?.removeProperty("view-transition-name");
						/**
						* Drop the old end from the registry too, so the new
						* end alone supplies this name's `new` crop radii - we
						* neither re-measure nor get ordered by a stale element.
						*/
						nameRegistry.delete(el);
					}
					names = assignViewTransitionNames(pairs.get(definition), nameRegistry, assigned, pairNames.get(definition), className, classed, group, grouped, clipChildren);
				}
			} else names = assignViewTransitionNames(definition, nameRegistry, assigned, void 0, className, classed, group, grouped, clipChildren);
			const override = cropOverride.get(definition);
			names.forEach((name, index) => {
				/**
				* If two subjects resolve to the same element, merge their
				* definitions so neither subject's animations are dropped.
				*/
				const existing = layerTargets.get(name);
				layerTargets.set(name, existing && existing !== target ? {
					...existing,
					...target
				} : target);
				if (override !== void 0) cropForName.set(name, override);
				const stagger = layerStagger.get(name) ?? {};
				stagger[phase] = [index, names.length];
				layerStagger.set(name, stagger);
			});
		});
	};
	/**
	* The stagger index/total for a layer, resolved against the snapshot it
	* belongs to. Returns index -1 when the layer is absent from that snapshot
	* so the caller can skip a pseudo-element that doesn't exist.
	*/
	const staggerPosition = (name, type) => {
		const stagger = layerStagger.get(name);
		return (type === "old" ? stagger?.old : type === "new" ? stagger?.new : stagger?.new ?? stagger?.old) ?? [-1, 1];
	};
	/**
	* Merge default + per-layer transition options for a generated layer and
	* resolve any stagger/delay function against this element's position. Used
	* by both the morph-retiming and crop corner-radius passes.
	*/
	const resolveLayerTransition = (target, type, transitionName, index, total) => {
		const transition = mergeTransition(getValueTransition(defaultOptions, transitionName), getValueTransition(layerOptions(target, type) ?? {}, transitionName));
		if (typeof transition.delay === "function") transition.delay = transition.delay(index, total);
		return transition;
	};
	/**
	* Resolve a layer's group (`layout`) timing to plain WAAPI values: native
	* ms `delay`/`duration` and a baked `ease`. The single source of group
	* timing, shared by the generated-group retiming and the crop corner-radius
	* pass so the rounded clip animates on exactly the box's timing. It returns
	* no generator `type` (the WAAPI-only `NativeAnimation` rejects a string
	* type) nor `repeat`/`times` (which the group's `updateTiming` ignores), so
	* none of them can leak into the radius animation and desync it.
	*/
	const resolveGroupTiming = (name) => {
		const [index, total] = staggerPosition(name, "group");
		const transition = resolveLayerTransition(layerTargets.get(name), "group", "layout", index === -1 ? 0 : index, total);
		transition.duration && (transition.duration = /* @__PURE__ */ secondsToMilliseconds(transition.duration));
		const { delay = 0, duration, ease } = applyGeneratorOptions(transition);
		return {
			delay: /* @__PURE__ */ secondsToMilliseconds(delay),
			duration,
			ease
		};
	};
	/**
	* Each layer's measured box + corner radii per snapshot. The box lets
	* `finalizeCrop` tell whether a morph's aspect ratio changed (the only case
	* worth cropping); the radii let a cropped morph's group clip animate each
	* corner from the old element's radius to the new element's, keeping it
	* rounded where `overflow: clip` would otherwise square the corners.
	*
	* We never flatten the source for capture (a snapshot is a paint of the live
	* DOM, so squaring an element just for its capture would flash one real
	* square frame). For an aspect-changing morph `object-fit: cover` crops each
	* snapshot's own baked corners off-screen mid-morph, so the animated clip is
	* the only visible corner; a near-same-aspect forced crop (`.crop(true)`)
	* can't hide the outgoing snapshot's silhouette, but the endpoints coincide.
	*/
	const cropMeasurements = /* @__PURE__ */ new Map();
	const measureLayers = (phase) => nameRegistry.forEach((name, element) => {
		const el = element;
		const rect = el.getBoundingClientRect?.();
		if (rect && rect.height) {
			const style = getComputedStyle(el);
			const radii = {};
			for (const corner of cornerRadiusProps) radii[corner] = style[corner];
			const entry = cropMeasurements.get(name) ?? {};
			entry[phase] = {
				width: rect.width,
				height: rect.height,
				radii
			};
			cropMeasurements.set(name, entry);
		}
	});
	/**
	* With both snapshots measured, settle which layers crop. The default crops
	* only a morph whose aspect ratio *changes* between snapshots - the one case
	* where `object-fit: cover` does real work. A same-aspect morph or a
	* fade-only layer is left uncropped: its corners scale naturally (no flash
	* from squaring, no `overflow: clip` eating its shadow) and a backdrop can't
	* be clipped to nothing. An explicit `.crop(true | false)` overrides either
	* way. Runs after both snapshots are measured, since aspect needs both.
	*/
	const finalizeCrop = () => {
		croppedNames.clear();
		for (const name of layerStagger.keys()) {
			if (name === "root") continue;
			if (cropForName.get(name) ?? aspectChanged(name)) croppedNames.add(name);
		}
	};
	/**
	* Whether a layer is a morph whose box aspect ratio changed between
	* snapshots (beyond a small tolerance). Fade-only layers (one snapshot) are
	* never "changed".
	*/
	const aspectChanged = (name) => {
		const box = cropMeasurements.get(name);
		if (!box?.old || !box?.new || !box.old.height || !box.new.height) return false;
		return Math.abs(box.old.width / box.old.height - box.new.width / box.new.height) > ASPECT_TOLERANCE;
	};
	/**
	* Write the persistent view-transition CSS: suppress root capture when the
	* root has no animations of its own; force linear timing (baked into the
	* keyframes, so we can retime later via updateTiming); and clip +
	* object-fit: cover every cropped morph (the UA default overflows on
	* aspect-ratio change).
	*
	* `css.commit` replaces rather than appends, so we re-set the full rule set
	* each call - the crop rules are only known after `finalizeCrop` runs in the
	* update callback, so the second call writes them.
	*/
	const commitViewCSS = () => {
		if (!hasTarget("root", targets)) css.set(":root", { "view-transition-name": "none" });
		css.set("::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*)", { "animation-timing-function": "linear !important" });
		croppedNames.forEach((name) => {
			css.set(`::view-transition-group(${name})`, { overflow: "clip" });
			css.set(`::view-transition-old(${name}), ::view-transition-new(${name})`, {
				width: "100%",
				height: "100%",
				"object-fit": "cover"
			});
		});
		/**
		* Clip the nested children of any layer that clips in the live layout,
		* so a wrapper crops its child for the whole morph (mirroring the DOM)
		* rather than only at the live-DOM handoff. No-op on browsers without
		* nested view-transition groups.
		*/
		clipChildren.forEach((name) => {
			css.set(`::view-transition-group-children(${name})`, { overflow: "clip" });
		});
		css.commit();
	};
	const cleanup = () => {
		releaseViewTransitionNames(assigned, classed, grouped);
		css.remove();
	};
	const callback = async () => {
		await update();
		/**
		* Re-resolve so elements created by the update are named for the new
		* snapshot, then measure them. With both snapshots measured we can
		* settle the crop set (aspect-changing morphs + forced).
		*/
		resolveLayers("new");
		measureLayers("new");
		finalizeCrop();
		/**
		* Re-commit the crop CSS unconditionally: `finalizeCrop` is computed
		* here (after both snapshots are measured), so the clip rules must be
		* (re)written to match the settled set.
		*/
		commitViewCSS();
	};
	let transition;
	try {
		resolveLayers("old");
		/**
		* Measure the old snapshot against the optimistic crop set (the new
		* snapshot doesn't exist yet, so aspect change can't be known here;
		* `finalizeCrop` settles it post-update).
		*/
		measureLayers("old");
		commitViewCSS();
		transition = document.startViewTransition(callback);
	} catch (error) {
		/**
		* The prelude writes inline names before the transition exists. If it
		* throws (e.g. startViewTransition rejects in a bad UA state), release
		* them so we neither leak DOM state nor stall the queue on a promise
		* that never settles - hand back a rejection it can advance past.
		*/
		cleanup();
		return Promise.reject(error);
	}
	transition.finished.finally(cleanup);
	return new Promise((resolve, reject) => {
		transition.ready.then(() => {
			const generatedViewAnimations = getViewAnimations();
			const animations = [];
			/**
			* Create animations for each of our explicitly-defined subjects.
			* `opacityAnimated` additionally tracks which `${name}:${type}`
			* we faded, so we can keep the UA `plus-lighter` blend only for a
			* genuine opacity crossfade (both sides fading) and drop it for a
			* slide/transform, where additive compositing would flash bright.
			*/
			const explicitlyAnimated = /* @__PURE__ */ new Set();
			const opacityAnimated = /* @__PURE__ */ new Set();
			layerTargets.forEach((target, name) => {
				const stagger = layerStagger.get(name);
				/**
				* Presence: `enter` only fires for a pure newcomer (a new
				* view with no old), `exit` only for a pure leaver. A
				* survivor (both) gets neither - it just morphs.
				*/
				const enterApplies = !!stagger?.new && !stagger?.old;
				const exitApplies = !!stagger?.old && !stagger?.new;
				for (const key of definitionNames) {
					if (!target[key]) continue;
					if (key === "enter" && !enterApplies) continue;
					if (key === "exit" && !exitApplies) continue;
					const type = chooseLayerType(key);
					const [index, total] = staggerPosition(name, type);
					if (index === -1) continue;
					const { keyframes, options } = target[key];
					for (let [valueName, valueKeyframes] of Object.entries(keyframes)) {
						if (valueKeyframes == null) continue;
						/**
						* The view path hands keyframes straight to WAAPI,
						* so Motion's `x`/`y` shorthands (compiled to
						* `transform` only via the value pipeline) have no
						* effect. Warn and skip - use `transform`/`translate`.
						*/
						if (valueName === "x" || valueName === "y") {
							warnOnce(false, `animateView() animates view-transition layers with CSS properties; the "${valueName}" shorthand has no effect - use transform, e.g. { transform: "translateX(40px)" }.`);
							continue;
						}
						/**
						* enter/exit win over new/old on a shared property -
						* skip it here when the gated bucket also defines it.
						*/
						if (key === "new" && enterApplies && target.enter?.keyframes[valueName] != null) continue;
						if (key === "old" && exitApplies && target.exit?.keyframes[valueName] != null) continue;
						const valueOptions = mergeTransition(getValueTransition(defaultOptions, valueName), getValueTransition(options, valueName));
						/**
						* Infer an origin for a single-value keyframe. An
						* `enter` mirrors the matching `exit` value (a
						* defined exit reverses into the enter for free);
						* otherwise the per-type default (opacity 0/1, scale
						* 0.85). No default -> left as-is (animates from the
						* live value).
						*
						* `new`/`old` fire for survivors too, where only the
						* opacity crossfade default applies - a transform
						* default like scale 0.85 would pop a persisting
						* element, so gate it on the layer actually
						* entering/leaving.
						*/
						if (!Array.isArray(valueKeyframes)) {
							const exitValue = key === "enter" ? target.exit?.keyframes[valueName] : void 0;
							const from = exitValue != null ? Array.isArray(exitValue) ? exitValue[exitValue.length - 1] : exitValue : valueName === "opacity" || (type === "new" ? enterApplies : exitApplies) ? ORIGIN_DEFAULTS[type]?.[valueName] : void 0;
							if (from !== void 0) valueKeyframes = [from, valueKeyframes];
						}
						/**
						* Resolve stagger function if provided, per element
						* across this subject's resolved layers.
						*/
						if (typeof valueOptions.delay === "function") valueOptions.delay = valueOptions.delay(index, total);
						valueOptions.duration && (valueOptions.duration = /* @__PURE__ */ secondsToMilliseconds(valueOptions.duration));
						valueOptions.delay && (valueOptions.delay = /* @__PURE__ */ secondsToMilliseconds(valueOptions.delay));
						animations.push(new NativeAnimation({
							...valueOptions,
							element: document.documentElement,
							name: valueName,
							pseudoElement: `::view-transition-${type}(${name})`,
							keyframes: valueKeyframes
						}));
						explicitlyAnimated.add(`${name}:${type}`);
						if (valueName === "opacity") opacityAnimated.add(`${name}:${type}`);
					}
				}
			});
			/**
			* Handle browser generated animations
			*/
			for (const animation of generatedViewAnimations) {
				if (animation.playState === "finished") continue;
				const { effect } = animation;
				if (!effect || !(effect instanceof KeyframeEffect)) continue;
				const { pseudoElement } = effect;
				if (!pseudoElement) continue;
				const name = getViewAnimationLayerInfo(pseudoElement);
				if (!name) continue;
				const targetDefinition = layerTargets.get(name.layer);
				/**
				* We built our own animation for this layer, so drop the
				* browser-generated fade we're replacing. The UA
				* `plus-lighter` blend is a *separate* generated animation on
				* the same pseudo (it sets `mix-blend-mode` in its keyframes):
				* keep it *only* for a true opacity crossfade - both sides
				* fading - so a symmetric crossfade composites without
				* darkening, but a slide/transform (where both layers stay
				* opaque and overlap) doesn't flash bright from the addition.
				*/
				if (explicitlyAnimated.has(`${name.layer}:${name.type}`)) {
					if (opacityAnimated.has(`${name.layer}:new`) && opacityAnimated.has(`${name.layer}:old`) && effect.getKeyframes().some((keyframe) => keyframe.mixBlendMode)) animations.push(new NativeAnimationWrapper(animation));
					else animation.cancel();
					continue;
				}
				/**
				* Drop the orphaned half of the default crossfade. The UA
				* fades old out and new in as a *pair*; if the opposing half
				* was explicitly overridden with something other than an
				* opacity fade (a clip or transform reveal), this side's
				* default opacity fade has no partner - left to run it would
				* dissolve what should be a static backdrop (e.g.
				* `.new({ clipPath })` should reveal over a still old view,
				* not fade the old out around the growing clip). Cancel it -
				* and its `plus-lighter` sibling on the same pseudo, which
				* would otherwise flash bright where the two opaque layers
				* overlap. A genuine crossfade (the opposing side also fading
				* opacity) keeps both halves and is handled above.
				*/
				const opposite = name.type === "old" ? "new" : name.type === "new" ? "old" : void 0;
				if (opposite && explicitlyAnimated.has(`${name.layer}:${opposite}`) && !opacityAnimated.has(`${name.layer}:${opposite}`)) {
					animation.cancel();
					continue;
				}
				/**
				* Otherwise retime the browser-generated animation to
				* Motion's timing. This auto-enables the layout (group)
				* morph for any resolved/named target, and applies the
				* default timing to old/new layers we haven't explicitly
				* overridden.
				*
				* group + group-children both follow the layout timing so
				* the nesting container stays in sync with the morph.
				*/
				/**
				* A survivor's old + new are the two halves of one
				* `plus-lighter` crossfade. They must share identical timing
				* (so their opacities stay mirrored and sum to 1 - else the
				* additive blend flashes bright wherever both are partly
				* visible) and fade linearly (the bounce belongs on the
				* group's geometry, not the opacity). So time them as the
				* group, rather than via their own - potentially staggered,
				* or enter/exit-derived - old/new options.
				*/
				const stagger = layerStagger.get(name.layer);
				const isMorphCrossfade = (name.type === "old" || name.type === "new") && !!stagger?.old && !!stagger?.new;
				let timing;
				if (name.type.startsWith("group")) {
					const { delay, duration, ease } = resolveGroupTiming(name.layer);
					timing = {
						delay,
						duration,
						easing: mapEasingToNativeEasing(ease, duration)
					};
				} else {
					const timingType = isMorphCrossfade ? "group" : name.type;
					const [index, total] = staggerPosition(name.layer, timingType);
					let animationTransition = resolveLayerTransition(targetDefinition, timingType, timingType === "group" ? "layout" : "", index === -1 ? 0 : index, total);
					/**
					* The crossfade should resolve at the spring's
					* *perceptual* (visual) duration - the geometry can keep
					* bouncing, but the opacity shouldn't drag through the
					* settle. So capture `visualDuration` before
					* `applyGeneratorOptions` replaces it with the full
					* overshoot duration, and use it for the fade.
					*/
					const visualDuration = animationTransition.visualDuration;
					animationTransition.duration && (animationTransition.duration = /* @__PURE__ */ secondsToMilliseconds(animationTransition.duration));
					animationTransition = applyGeneratorOptions(animationTransition);
					timing = {
						delay: /* @__PURE__ */ secondsToMilliseconds(animationTransition.delay ?? 0),
						duration: isMorphCrossfade && visualDuration !== void 0 ? /* @__PURE__ */ secondsToMilliseconds(visualDuration) : animationTransition.duration,
						easing: isMorphCrossfade ? "linear" : mapEasingToNativeEasing(animationTransition.ease, animationTransition.duration)
					};
				}
				effect.updateTiming(timing);
				animations.push(new NativeAnimationWrapper(animation));
			}
			/**
			* Round each cropped layer's clip. Its `::view-transition-group`
			* has `overflow: clip`, which would otherwise square the corners
			* mid-morph; animate each corner from the old element's radius to
			* the new element's so the crop stays rounded. Timed as the group
			* (`layout`) so the radius tracks the morphing box.
			*/
			cropMeasurements.forEach((entry, name) => {
				if (!croppedNames.has(name)) return;
				const { delay, duration, ease } = resolveGroupTiming(name);
				for (const corner of cornerRadiusProps) {
					const from = entry.old?.radii[corner] || entry.new?.radii[corner] || "0px";
					const to = entry.new?.radii[corner] || entry.old?.radii[corner] || "0px";
					if (isSquareRadius(from) && isSquareRadius(to)) continue;
					animations.push(new NativeAnimation({
						element: document.documentElement,
						name: corner,
						pseudoElement: `::view-transition-group(${name})`,
						keyframes: [from, to],
						delay,
						duration,
						ease
					}));
				}
			});
			resolve(new GroupAnimation(animations));
		}).catch(() => transition.updateCallbackDone.then(() => resolve(new GroupAnimation([])), reject));
	});
}
/**
* The options that should time a given generated layer type, so a retimed
* group/old/new picks up any per-target transition the user provided. Checks
* the type's buckets in priority order (e.g. `new` before `enter`).
*/
function layerOptions(target, type) {
	for (const bucket of typeBuckets[type] ?? []) {
		const options = target?.[bucket]?.options;
		if (options) return options;
	}
}
/**
* Merge a base transition (e.g. the default `options`) with a per-layer/value
* override. An explicit `duration` on the override must win over an inherited
* generator's own timing: a spring prefers `visualDuration`, and
* `spring.applyToOptions` overwrites `duration` with the computed settle time -
* so without this the override is silently discarded. Dropping the inherited
* `type`/`visualDuration` makes the layer a plain tween of that duration, unless
* it asked for its own generator `type`/`visualDuration`.
*/
function mergeTransition(base, override) {
	const merged = {
		...base,
		...override
	};
	if (override.duration !== void 0) {
		if (override.visualDuration === void 0) delete merged.visualDuration;
		if (override.type === void 0) delete merged.type;
	}
	return merged;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/view/queue.mjs
var builders = [];
var current = null;
function next() {
	current = null;
	const [nextBuilder] = builders;
	if (nextBuilder) start(nextBuilder);
}
function start(builder) {
	removeItem(builders, builder);
	current = builder;
	startViewAnimation(builder).then((animation) => {
		builder.notifyReady(animation);
		return animation.finished;
	}).catch((error) => builder.notifyReject(error)).finally(next);
}
function processQueue() {
	/**
	* Iterate backwards over the builders array. We can ignore the
	* "wait" animations. If we have an interrupting animation in the
	* queue then we need to batch all preceeding animations into it.
	* Currently this only batches the update functions but will also
	* need to batch the targets.
	*/
	for (let i = builders.length - 1; i >= 0; i--) {
		const builder = builders[i];
		const { interrupt } = builder.options;
		if (interrupt === "immediate") {
			const batchedUpdates = builders.slice(0, i + 1).map((b) => b.update);
			const remaining = builders.slice(i + 1);
			builder.update = () => {
				batchedUpdates.forEach((update) => update());
			};
			builders = [builder, ...remaining];
			break;
		}
	}
	if (!current || builders[0]?.options.interrupt === "immediate") next();
}
function addToQueue(builder) {
	builders.push(builder);
	microtask.render(processQueue);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/view/index.mjs
var ViewTransitionBuilder = class {
	constructor(update, options = {}) {
		this.currentSubject = "root";
		this.targets = /* @__PURE__ */ new Map();
		/**
		* Definitions that must be resolved to elements (and assigned a
		* `view-transition-name`) rather than treated as pre-named layers.
		*/
		this.resolveDefs = /* @__PURE__ */ new Set();
		/**
		* Per-subject crop override: `true` forces the crop (clip + object-fit:
		* cover + animated corner radii) on, `false` forces it off. A subject with
		* no entry uses the default - crop only a genuine morph (a layer present in
		* both snapshots), so a fade-only enter/exit isn't clipped to nothing.
		*/
		this.cropOverride = /* @__PURE__ */ new Map();
		/**
		* Subjects paired with a different new-snapshot target (the second `.add()`
		* argument), so two distinct elements share one name and morph into each
		* other - a shared-element transition.
		*/
		this.pairs = /* @__PURE__ */ new Map();
		/**
		* A `view-transition-class` to apply to each subject's resolved elements,
		* so authors can target the generated layers from CSS by class rather than
		* the opaque generated name.
		*/
		this.classNames = /* @__PURE__ */ new Map();
		/**
		* Subjects opted out of automatic group nesting via `.group(false)`. Their
		* layer stays a flat top-level group (`view-transition-group: none`) instead
		* of nesting under its DOM-ancestor layer - so it animates independently and
		* escapes an ancestor's clip/transform (e.g. an element that lifts out of a
		* card and flies across, which nesting would clip to the card).
		*/
		this.flatGroups = /* @__PURE__ */ new Set();
		this.notifyReady = noop;
		this.notifyReject = noop;
		this.readyPromise = new Promise((resolve, reject) => {
			this.notifyReady = resolve;
			this.notifyReject = reject;
		});
		this.update = update;
		this.options = {
			interrupt: "wait",
			...options
		};
		this.readyPromise.catch(noop);
		addToQueue(this);
	}
	/**
	* Target elements resolved from a selector or Element, each assigned a
	* `view-transition-name` automatically.
	*
	* Passing a second target pairs them: the first is resolved in the old
	* snapshot and the second in the new, sharing one name so two *different*
	* elements morph into each other (e.g. `.add(card, ".modal")`). Symmetric -
	* pass them the other way round to morph back.
	*/
	add(subject, newSubject) {
		this.currentSubject = subject;
		this.resolveDefs.add(subject);
		if (newSubject !== void 0) this.pairs.set(subject, newSubject);
		if (!this.targets.has(subject)) this.targets.set(subject, {});
		return this;
	}
	/**
	* Control this subject's crop (clip + `object-fit: cover` + animated
	* corners). By default a subject auto-crops only when it actually morphs -
	* present in both snapshots (a survivor, or an `.add(a, b)` pair). A
	* fade-only enter/exit has no second box to crop against, so it's left to
	* the browser default; in particular the `overflow: clip` a crop adds would
	* otherwise clip a mis-sized enter/exit layer to nothing.
	*
	* `.crop(false)` forces the crop off (e.g. a text morph, where
	* `object-fit: cover` clips glyphs as the box grows); `.crop(true)` forces
	* it on for a non-morph the default wouldn't otherwise crop.
	*/
	crop(enabled = true) {
		this.cropOverride.set(this.currentSubject, enabled);
		return this;
	}
	/**
	* By default a subject's layer nests under its nearest DOM-ancestor layer
	* (`view-transition-group: contain`), so the ancestor's clip/transform/opacity
	* apply to it through the transition - mirroring how the DOM actually paints,
	* and letting a wrapper crop its child for the whole morph rather than only
	* once the live DOM takes back over. (Needs a browser that supports nested
	* view-transition groups; elsewhere it degrades to the flat default.)
	*
	* Call `.group(false)` to opt out: the layer stays flat and top-level, so it
	* animates independently and escapes an ancestor's clip - e.g. an element
	* that should lift out of a card and fly across, which nesting would clip.
	*/
	group(enabled = true) {
		enabled ? this.flatGroups.delete(this.currentSubject) : this.flatGroups.add(this.currentSubject);
		return this;
	}
	/**
	* Tag this subject's generated layers with a `view-transition-class`, so
	* they can be targeted from CSS - `::view-transition-group(.name)`,
	* `::view-transition-old/new(.name)`, `::view-transition-image-pair(.name)`
	* - without the opaque generated `view-transition-name`. Because `.add()`
	* can match many elements, a shared class targets them all at once (and,
	* for a pair, both ends). The escape hatch for z-index / custom keyframes
	* on a morph layer.
	*/
	class(name) {
		this.classNames.set(this.currentSubject, name);
		return this;
	}
	/**
	* Set the transition for this subject's morph. The morph is enabled
	* automatically by `.add()`; this just customises its timing (duration,
	* easing, a `delay`/`stagger`, …). On the implicit `root` subject it also
	* opts the page into the transition (the root crossfade).
	*/
	layout(options = {}) {
		this.updateTarget("layout", {}, options);
		return this;
	}
	enter(keyframes, options) {
		this.updateTarget("enter", keyframes, options);
		return this;
	}
	exit(keyframes, options) {
		this.updateTarget("exit", keyframes, options);
		return this;
	}
	/**
	* Animate the new view directly, whether the element is appearing or
	* persisting (unlike `.enter()`, which only fires for a pure newcomer).
	* Pair with `.old()` for a crossfade or slide-through.
	*/
	new(keyframes, options) {
		this.updateTarget("new", keyframes, options);
		return this;
	}
	/**
	* Animate the old view directly, whether the element is leaving or
	* persisting (unlike `.exit()`, which only fires for a pure leaver).
	*/
	old(keyframes, options) {
		this.updateTarget("old", keyframes, options);
		return this;
	}
	updateTarget(target, keyframes, options = {}) {
		const { currentSubject, targets } = this;
		if (!targets.has(currentSubject)) targets.set(currentSubject, {});
		const targetData = targets.get(currentSubject);
		targetData[target] = {
			keyframes,
			options
		};
	}
	then(resolve, reject) {
		return this.readyPromise.then(resolve, reject);
	}
};
function animateView(update, options = {}) {
	return new ViewTransitionBuilder(update, options);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/projection/geometry/models.mjs
var createAxisDelta = () => ({
	translate: 0,
	scale: 1,
	origin: 0,
	originPoint: 0
});
var createDelta = () => ({
	x: createAxisDelta(),
	y: createAxisDelta()
});
var createAxis = () => ({
	min: 0,
	max: 0
});
var createBox = () => ({
	x: createAxis(),
	y: createAxis()
});
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/store.mjs
var visualElementStore = /* @__PURE__ */ new WeakMap();
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/utils/is-animation-controls.mjs
function isAnimationControls(v) {
	return v !== null && typeof v === "object" && typeof v.start === "function";
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/utils/is-variant-label.mjs
/**
* Decides if the supplied variable is variant label
*/
function isVariantLabel(v) {
	return typeof v === "string" || Array.isArray(v);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/utils/variant-props.mjs
var variantPriorityOrder = [
	"animate",
	"whileInView",
	"whileFocus",
	"whileHover",
	"whileTap",
	"whileDrag",
	"exit"
];
var variantProps = ["initial", ...variantPriorityOrder];
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/utils/is-controlling-variants.mjs
function isControllingVariants(props) {
	return isAnimationControls(props.animate) || variantProps.some((name) => isVariantLabel(props[name]));
}
function isVariantNode(props) {
	return Boolean(isControllingVariants(props) || props.variants);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/utils/motion-values.mjs
/**
* Updates motion values from props changes.
* Uses `any` type for element to avoid circular dependencies with VisualElement.
*/
function updateMotionValuesFromProps(element, next, prev) {
	for (const key in next) {
		const nextValue = next[key];
		const prevValue = prev[key];
		if (isMotionValue(nextValue))
 /**
		* If this is a motion value found in props or style, we want to add it
		* to our visual element's motion value map.
		*/
		element.addValue(key, nextValue);
		else if (isMotionValue(prevValue))
 /**
		* If we're swapping from a motion value to a static value,
		* create a new motion value from that
		*/
		element.addValue(key, motionValue(nextValue, { owner: element }));
		else if (prevValue !== nextValue) {
			/**
			* If this is a flat value that has changed, update the motion value
			* or create one if it doesn't exist. We only want to do this if we're
			* not handling the value with our animation state.
			*/
			if (element.hasValue(key)) {
				const existingValue = element.getValue(key);
				if (existingValue.liveStyle === true) existingValue.jump(nextValue);
				else if (!existingValue.hasAnimated) existingValue.set(nextValue);
			} else {
				const latestValue = element.getStaticValue(key);
				element.addValue(key, motionValue(latestValue !== void 0 ? latestValue : nextValue, { owner: element }));
			}
		}
	}
	for (const key in prev) if (next[key] === void 0) element.removeValue(key);
	return next;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/utils/reduced-motion/state.mjs
var prefersReducedMotion = { current: null };
var hasReducedMotionListener = { current: false };
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/utils/reduced-motion/index.mjs
var isBrowser = typeof window !== "undefined";
function initPrefersReducedMotion() {
	hasReducedMotionListener.current = true;
	if (!isBrowser) return;
	if (window.matchMedia) {
		const motionMediaQuery = window.matchMedia("(prefers-reduced-motion)");
		const setReducedMotionPreferences = () => prefersReducedMotion.current = motionMediaQuery.matches;
		motionMediaQuery.addEventListener("change", setReducedMotionPreferences);
		setReducedMotionPreferences();
	} else prefersReducedMotion.current = false;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/VisualElement.mjs
var propEventHandlers = [
	"AnimationStart",
	"AnimationComplete",
	"Update",
	"BeforeLayoutMeasure",
	"LayoutMeasure",
	"LayoutAnimationStart",
	"LayoutAnimationComplete"
];
/**
* Static feature definitions - can be injected by framework layer
*/
var featureDefinitions = {};
/**
* Set feature definitions for all VisualElements.
* This should be called by the framework layer (e.g., framer-motion) during initialization.
*/
function setFeatureDefinitions(definitions) {
	featureDefinitions = definitions;
}
/**
* Get the current feature definitions
*/
function getFeatureDefinitions() {
	return featureDefinitions;
}
/**
* A VisualElement is an imperative abstraction around UI elements such as
* HTMLElement, SVGElement, Three.Object3D etc.
*/
var VisualElement = class {
	/**
	* This method takes React props and returns found MotionValues. For example, HTML
	* MotionValues will be found within the style prop, whereas for Three.js within attribute arrays.
	*
	* This isn't an abstract method as it needs calling in the constructor, but it is
	* intended to be one.
	*/
	scrapeMotionValuesFromProps(_props, _prevProps, _visualElement) {
		return {};
	}
	constructor({ parent, props, presenceContext, reducedMotionConfig, skipAnimations, blockInitialAnimation, visualState }, options = {}) {
		/**
		* A reference to the current underlying Instance, e.g. a HTMLElement
		* or Three.Mesh etc.
		*/
		this.current = null;
		/**
		* A set containing references to this VisualElement's children.
		*/
		this.children = /* @__PURE__ */ new Set();
		/**
		* Determine what role this visual element should take in the variant tree.
		*/
		this.isVariantNode = false;
		this.isControllingVariants = false;
		/**
		* Decides whether this VisualElement should animate in reduced motion
		* mode.
		*
		* TODO: This is currently set on every individual VisualElement but feels
		* like it could be set globally.
		*/
		this.shouldReduceMotion = null;
		/**
		* Decides whether animations should be skipped for this VisualElement.
		* Useful for E2E tests and visual regression testing.
		*/
		this.shouldSkipAnimations = false;
		/**
		* A map of all motion values attached to this visual element. Motion
		* values are source of truth for any given animated value. A motion
		* value might be provided externally by the component via props.
		*/
		this.values = /* @__PURE__ */ new Map();
		this.KeyframeResolver = KeyframeResolver;
		/**
		* Cleanup functions for active features (hover/tap/exit etc)
		*/
		this.features = {};
		/**
		* A map of every subscription that binds the provided or generated
		* motion values onChange listeners to this visual element.
		*/
		this.valueSubscriptions = /* @__PURE__ */ new Map();
		/**
		* A reference to the previously-provided motion values as returned
		* from scrapeMotionValuesFromProps. We use the keys in here to determine
		* if any motion values need to be removed after props are updated.
		*/
		this.prevMotionValues = {};
		/**
		* Track whether this element has been mounted before, to detect
		* remounts after Suspense unmount/remount cycles.
		*/
		this.hasBeenMounted = false;
		/**
		* An object containing a SubscriptionManager for each active event.
		*/
		this.events = {};
		/**
		* An object containing an unsubscribe function for each prop event subscription.
		* For example, every "Update" event can have multiple subscribers via
		* VisualElement.on(), but only one of those can be defined via the onUpdate prop.
		*/
		this.propEventSubscriptions = {};
		this.notifyUpdate = () => this.notify("Update", this.latestValues);
		this.render = () => {
			if (!this.current) return;
			this.triggerBuild();
			this.renderInstance(this.current, this.renderState, this.props.style, this.projection);
		};
		this.renderScheduledAt = 0;
		this.scheduleRender = () => {
			const now = time.now();
			if (this.renderScheduledAt < now) {
				this.renderScheduledAt = now;
				frame.render(this.render, false, true);
			}
		};
		const { latestValues, renderState } = visualState;
		this.latestValues = latestValues;
		this.baseTarget = { ...latestValues };
		this.initialValues = props.initial ? { ...latestValues } : {};
		this.renderState = renderState;
		this.parent = parent;
		this.props = props;
		this.presenceContext = presenceContext;
		this.depth = parent ? parent.depth + 1 : 0;
		this.reducedMotionConfig = reducedMotionConfig;
		this.skipAnimationsConfig = skipAnimations;
		this.options = options;
		this.blockInitialAnimation = Boolean(blockInitialAnimation);
		this.isControllingVariants = isControllingVariants(props);
		this.isVariantNode = isVariantNode(props);
		if (this.isVariantNode) this.variantChildren = /* @__PURE__ */ new Set();
		this.manuallyAnimateOnMount = Boolean(parent && parent.current);
		/**
		* Any motion values that are provided to the element when created
		* aren't yet bound to the element, as this would technically be impure.
		* However, we iterate through the motion values and set them to the
		* initial values for this component.
		*
		* TODO: This is impure and we should look at changing this to run on mount.
		* Doing so will break some tests but this isn't necessarily a breaking change,
		* more a reflection of the test.
		*/
		const { willChange, ...initialMotionValues } = this.scrapeMotionValuesFromProps(props, {}, this);
		for (const key in initialMotionValues) {
			const value = initialMotionValues[key];
			if (latestValues[key] !== void 0 && isMotionValue(value)) value.set(latestValues[key]);
		}
	}
	mount(instance) {
		/**
		* If this element has been mounted before (e.g. after a Suspense
		* unmount/remount), reset motion values to their initial state
		* so animations replay correctly from initial → animate.
		*/
		if (this.hasBeenMounted) for (const key in this.initialValues) {
			this.values.get(key)?.jump(this.initialValues[key]);
			this.latestValues[key] = this.initialValues[key];
		}
		this.current = instance;
		visualElementStore.set(instance, this);
		if (this.projection && !this.projection.instance) this.projection.mount(instance);
		if (this.parent && this.isVariantNode && !this.isControllingVariants) this.removeFromVariantTree = this.parent.addVariantChild(this);
		this.values.forEach((value, key) => this.bindToMotionValue(key, value));
		/**
		* Determine reduced motion preference. Only initialize the matchMedia
		* listener if we actually need the dynamic value (i.e., when config
		* is neither "never" nor "always").
		*/
		if (this.reducedMotionConfig === "never") this.shouldReduceMotion = false;
		else if (this.reducedMotionConfig === "always") this.shouldReduceMotion = true;
		else {
			if (!hasReducedMotionListener.current) initPrefersReducedMotion();
			this.shouldReduceMotion = prefersReducedMotion.current;
		}
		warnOnce(this.shouldReduceMotion !== true, "You have Reduced Motion enabled on your device. Animations may not appear as expected.", "reduced-motion-disabled");
		/**
		* Set whether animations should be skipped based on the config.
		*/
		this.shouldSkipAnimations = this.skipAnimationsConfig ?? false;
		this.parent?.addChild(this);
		this.update(this.props, this.presenceContext);
		this.hasBeenMounted = true;
	}
	unmount() {
		this.projection && this.projection.unmount();
		cancelFrame(this.notifyUpdate);
		cancelFrame(this.render);
		this.valueSubscriptions.forEach((remove) => remove());
		this.valueSubscriptions.clear();
		this.removeFromVariantTree && this.removeFromVariantTree();
		this.parent?.removeChild(this);
		for (const key in this.events) this.events[key].clear();
		for (const key in this.features) {
			const feature = this.features[key];
			if (feature) {
				feature.unmount();
				feature.isMounted = false;
			}
		}
		this.current = null;
	}
	addChild(child) {
		this.children.add(child);
		this.enteringChildren ?? (this.enteringChildren = /* @__PURE__ */ new Set());
		this.enteringChildren.add(child);
	}
	removeChild(child) {
		this.children.delete(child);
		this.enteringChildren && this.enteringChildren.delete(child);
	}
	bindToMotionValue(key, value) {
		if (this.valueSubscriptions.has(key)) this.valueSubscriptions.get(key)();
		if (value.accelerate && acceleratedValues.has(key) && this.current instanceof HTMLElement) {
			const { factory, keyframes, times, ease, duration } = value.accelerate;
			const animation = new NativeAnimation({
				element: this.current,
				name: key,
				keyframes,
				times,
				ease,
				duration: /* @__PURE__ */ secondsToMilliseconds(duration)
			});
			const cleanup = factory(animation);
			this.valueSubscriptions.set(key, () => {
				cleanup();
				animation.cancel();
			});
			return;
		}
		const valueIsTransform = transformProps.has(key);
		if (valueIsTransform && this.onBindTransform) this.onBindTransform();
		const removeOnChange = value.on("change", (latestValue) => {
			this.latestValues[key] = latestValue;
			this.props.onUpdate && frame.preRender(this.notifyUpdate);
			if (valueIsTransform && this.projection) this.projection.isTransformDirty = true;
			this.scheduleRender();
		});
		let removeSyncCheck;
		if (typeof window !== "undefined" && window.MotionCheckAppearSync) removeSyncCheck = window.MotionCheckAppearSync(this, key, value);
		this.valueSubscriptions.set(key, () => {
			removeOnChange();
			if (removeSyncCheck) removeSyncCheck();
		});
	}
	sortNodePosition(other) {
		/**
		* If these nodes aren't even of the same type we can't compare their depth.
		*/
		if (!this.current || !this.sortInstanceNodePosition || this.type !== other.type) return 0;
		return this.sortInstanceNodePosition(this.current, other.current);
	}
	updateFeatures() {
		let key = "animation";
		for (key in featureDefinitions) {
			const featureDefinition = featureDefinitions[key];
			if (!featureDefinition) continue;
			const { isEnabled, Feature: FeatureConstructor } = featureDefinition;
			/**
			* If this feature is enabled but not active, make a new instance.
			*/
			if (!this.features[key] && FeatureConstructor && isEnabled(this.props)) this.features[key] = new FeatureConstructor(this);
			/**
			* If we have a feature, mount or update it.
			*/
			if (this.features[key]) {
				const feature = this.features[key];
				if (feature.isMounted) feature.update();
				else {
					feature.mount();
					feature.isMounted = true;
				}
			}
		}
	}
	triggerBuild() {
		this.build(this.renderState, this.latestValues, this.props);
	}
	/**
	* Measure the current viewport box with or without transforms.
	* Only measures axis-aligned boxes, rotate and skew must be manually
	* removed with a re-render to work.
	*/
	measureViewportBox() {
		return this.current ? this.measureInstanceViewportBox(this.current, this.props) : createBox();
	}
	getStaticValue(key) {
		return this.latestValues[key];
	}
	setStaticValue(key, value) {
		this.latestValues[key] = value;
	}
	/**
	* Update the provided props. Ensure any newly-added motion values are
	* added to our map, old ones removed, and listeners updated.
	*/
	update(props, presenceContext) {
		if (props.transformTemplate || this.props.transformTemplate) this.scheduleRender();
		this.prevProps = this.props;
		this.props = props;
		this.prevPresenceContext = this.presenceContext;
		this.presenceContext = presenceContext;
		/**
		* Update prop event handlers ie onAnimationStart, onAnimationComplete
		*/
		for (let i = 0; i < propEventHandlers.length; i++) {
			const key = propEventHandlers[i];
			if (this.propEventSubscriptions[key]) {
				this.propEventSubscriptions[key]();
				delete this.propEventSubscriptions[key];
			}
			const listener = props["on" + key];
			if (listener) this.propEventSubscriptions[key] = this.on(key, listener);
		}
		this.prevMotionValues = updateMotionValuesFromProps(this, this.scrapeMotionValuesFromProps(props, this.prevProps || {}, this), this.prevMotionValues);
		if (this.handleChildMotionValue) this.handleChildMotionValue();
	}
	getProps() {
		return this.props;
	}
	/**
	* Returns the variant definition with a given name.
	*/
	getVariant(name) {
		return this.props.variants ? this.props.variants[name] : void 0;
	}
	/**
	* Returns the defined default transition on this component.
	*/
	getDefaultTransition() {
		return this.props.transition;
	}
	getTransformPagePoint() {
		return this.props.transformPagePoint;
	}
	getClosestVariantNode() {
		return this.isVariantNode ? this : this.parent ? this.parent.getClosestVariantNode() : void 0;
	}
	/**
	* Add a child visual element to our set of children.
	*/
	addVariantChild(child) {
		const closestVariantNode = this.getClosestVariantNode();
		if (closestVariantNode) {
			closestVariantNode.variantChildren && closestVariantNode.variantChildren.add(child);
			return () => closestVariantNode.variantChildren.delete(child);
		}
	}
	/**
	* Add a motion value and bind it to this visual element.
	*/
	addValue(key, value) {
		const existingValue = this.values.get(key);
		if (value !== existingValue) {
			if (existingValue) this.removeValue(key);
			this.bindToMotionValue(key, value);
			this.values.set(key, value);
			this.latestValues[key] = value.get();
		}
	}
	/**
	* Remove a motion value and unbind any active subscriptions.
	*/
	removeValue(key) {
		this.values.delete(key);
		const unsubscribe = this.valueSubscriptions.get(key);
		if (unsubscribe) {
			unsubscribe();
			this.valueSubscriptions.delete(key);
		}
		delete this.latestValues[key];
		this.removeValueFromRenderState(key, this.renderState);
	}
	/**
	* Check whether we have a motion value for this key
	*/
	hasValue(key) {
		return this.values.has(key);
	}
	getValue(key, defaultValue) {
		if (this.props.values && this.props.values[key]) return this.props.values[key];
		let value = this.values.get(key);
		if (value === void 0 && defaultValue !== void 0) {
			value = motionValue(defaultValue === null ? void 0 : defaultValue, { owner: this });
			this.addValue(key, value);
		}
		return value;
	}
	/**
	* If we're trying to animate to a previously unencountered value,
	* we need to check for it in our state and as a last resort read it
	* directly from the instance (which might have performance implications).
	*/
	readValue(key, target) {
		let value = this.latestValues[key] !== void 0 || !this.current ? this.latestValues[key] : this.getBaseTargetFromProps(this.props, key) ?? this.readValueFromInstance(this.current, key, this.options);
		if (value !== void 0 && value !== null) {
			if (typeof value === "string" && (isNumericalString(value) || isZeroValueString(value))) value = parseFloat(value);
			else if (!findValueType(value) && complex.test(target)) value = getAnimatableNone(key, target);
			this.setBaseTarget(key, isMotionValue(value) ? value.get() : value);
		}
		return isMotionValue(value) ? value.get() : value;
	}
	/**
	* Set the base target to later animate back to. This is currently
	* only hydrated on creation and when we first read a value.
	*/
	setBaseTarget(key, value) {
		this.baseTarget[key] = value;
	}
	/**
	* Find the base target for a value thats been removed from all animation
	* props.
	*/
	getBaseTarget(key) {
		const { initial } = this.props;
		let valueFromInitial;
		if (typeof initial === "string" || typeof initial === "object") {
			const variant = resolveVariantFromProps(this.props, initial, this.presenceContext?.custom);
			if (variant) valueFromInitial = variant[key];
		}
		/**
		* If this value still exists in the current initial variant, read that.
		*/
		if (initial && valueFromInitial !== void 0) return valueFromInitial;
		/**
		* Alternatively, if this VisualElement config has defined a getBaseTarget
		* so we can read the value from an alternative source, try that.
		*/
		const target = this.getBaseTargetFromProps(this.props, key);
		if (target !== void 0 && !isMotionValue(target)) return target;
		/**
		* If the value was initially defined on initial, but it doesn't any more,
		* return undefined. Otherwise return the value as initially read from the DOM.
		*/
		return this.initialValues[key] !== void 0 && valueFromInitial === void 0 ? void 0 : this.baseTarget[key];
	}
	on(eventName, callback) {
		if (!this.events[eventName]) this.events[eventName] = new SubscriptionManager();
		return this.events[eventName].add(callback);
	}
	notify(eventName, ...args) {
		if (this.events[eventName]) this.events[eventName].notify(...args);
	}
	scheduleRenderMicrotask() {
		microtask.render(this.render);
	}
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/dom/DOMVisualElement.mjs
var DOMVisualElement = class extends VisualElement {
	constructor() {
		super(...arguments);
		this.KeyframeResolver = DOMKeyframesResolver;
	}
	sortInstanceNodePosition(a, b) {
		/**
		* compareDocumentPosition returns a bitmask, by using the bitwise &
		* we're returning true if 2 in that bitmask is set to true. 2 is set
		* to true if b preceeds a.
		*/
		return a.compareDocumentPosition(b) & 2 ? 1 : -1;
	}
	getBaseTargetFromProps(props, key) {
		const style = props.style;
		return style ? style[key] : void 0;
	}
	removeValueFromRenderState(key, { vars, style }) {
		delete vars[key];
		delete style[key];
	}
	handleChildMotionValue() {
		if (this.childSubscription) {
			this.childSubscription();
			delete this.childSubscription;
		}
		const { children } = this.props;
		if (isMotionValue(children)) this.childSubscription = children.on("change", (latest) => {
			if (this.current) this.current.textContent = `${latest}`;
		});
	}
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/Feature.mjs
/**
* Feature base class for extending VisualElement functionality.
* Features are plugins that can be mounted/unmounted to add behavior
* like gestures, animations, or layout tracking.
*/
var Feature = class {
	constructor(node) {
		this.isMounted = false;
		this.node = node;
	}
	update() {}
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/projection/geometry/conversion.mjs
/**
* Bounding boxes tend to be defined as top, left, right, bottom. For various operations
* it's easier to consider each axis individually. This function returns a bounding box
* as a map of single-axis min/max values.
*/
function convertBoundingBoxToBox({ top, left, right, bottom }) {
	return {
		x: {
			min: left,
			max: right
		},
		y: {
			min: top,
			max: bottom
		}
	};
}
function convertBoxToBoundingBox({ x, y }) {
	return {
		top: y.min,
		right: x.max,
		bottom: y.max,
		left: x.min
	};
}
/**
* Applies a TransformPoint function to a bounding box. TransformPoint is usually a function
* provided by Framer to allow measured points to be corrected for device scaling. This is used
* when measuring DOM elements and DOM event points.
*/
function transformBoxPoints(point, transformPoint) {
	if (!transformPoint) return point;
	const topLeft = transformPoint({
		x: point.left,
		y: point.top
	});
	const bottomRight = transformPoint({
		x: point.right,
		y: point.bottom
	});
	return {
		top: topLeft.y,
		left: topLeft.x,
		bottom: bottomRight.y,
		right: bottomRight.x
	};
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/projection/utils/has-transform.mjs
function isIdentityScale(scale) {
	return scale === void 0 || scale === 1;
}
function hasScale({ scale, scaleX, scaleY }) {
	return !isIdentityScale(scale) || !isIdentityScale(scaleX) || !isIdentityScale(scaleY);
}
function hasTransform(values) {
	return hasScale(values) || has2DTranslate(values) || values.z || values.rotate || values.rotateX || values.rotateY || values.skewX || values.skewY;
}
function has2DTranslate(values) {
	return is2DTranslate(values.x) || is2DTranslate(values.y);
}
function is2DTranslate(value) {
	return value && value !== "0%";
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/projection/geometry/delta-apply.mjs
/**
* Scales a point based on a factor and an originPoint
*/
function scalePoint(point, scale, originPoint) {
	return originPoint + scale * (point - originPoint);
}
/**
* Applies a translate/scale delta to a point
*/
function applyPointDelta(point, translate, scale, originPoint, boxScale) {
	if (boxScale !== void 0) point = scalePoint(point, boxScale, originPoint);
	return scalePoint(point, scale, originPoint) + translate;
}
/**
* Applies a translate/scale delta to an axis
*/
function applyAxisDelta(axis, translate = 0, scale = 1, originPoint, boxScale) {
	axis.min = applyPointDelta(axis.min, translate, scale, originPoint, boxScale);
	axis.max = applyPointDelta(axis.max, translate, scale, originPoint, boxScale);
}
/**
* Applies a translate/scale delta to a box
*/
function applyBoxDelta(box, { x, y }) {
	applyAxisDelta(box.x, x.translate, x.scale, x.originPoint);
	applyAxisDelta(box.y, y.translate, y.scale, y.originPoint);
}
var TREE_SCALE_SNAP_MIN = .999999999999;
var TREE_SCALE_SNAP_MAX = 1.0000000000001;
/**
* Apply a tree of deltas to a box. We do this to calculate the effect of all the transforms
* in a tree upon our box before then calculating how to project it into our desired viewport-relative box
*
* This is the final nested loop within updateLayoutDelta for future refactoring
*/
function applyTreeDeltas(box, treeScale, treePath, isSharedTransition = false) {
	const treeLength = treePath.length;
	if (!treeLength) return;
	treeScale.x = treeScale.y = 1;
	let node;
	let delta;
	for (let i = 0; i < treeLength; i++) {
		node = treePath[i];
		delta = node.projectionDelta;
		/**
		* TODO: Prefer to remove this, but currently we have motion components with
		* display: contents in Framer.
		*/
		const { visualElement } = node.options;
		if (visualElement && visualElement.props.style && visualElement.props.style.display === "contents") continue;
		if (isSharedTransition && node.options.layoutScroll && node.scroll && node !== node.root) {
			translateAxis(box.x, -node.scroll.offset.x);
			translateAxis(box.y, -node.scroll.offset.y);
		}
		if (delta) {
			treeScale.x *= delta.x.scale;
			treeScale.y *= delta.y.scale;
			applyBoxDelta(box, delta);
		}
		if (isSharedTransition && hasTransform(node.latestValues)) transformBox(box, node.latestValues, node.layout?.layoutBox);
	}
	/**
	* Snap tree scale back to 1 if it's within a non-perceivable threshold.
	* This will help reduce useless scales getting rendered.
	*/
	if (treeScale.x < TREE_SCALE_SNAP_MAX && treeScale.x > TREE_SCALE_SNAP_MIN) treeScale.x = 1;
	if (treeScale.y < TREE_SCALE_SNAP_MAX && treeScale.y > TREE_SCALE_SNAP_MIN) treeScale.y = 1;
}
function translateAxis(axis, distance) {
	axis.min += distance;
	axis.max += distance;
}
/**
* Apply a transform to an axis from the latest resolved motion values.
* This function basically acts as a bridge between a flat motion value map
* and applyAxisDelta
*/
function transformAxis(axis, axisTranslate, axisScale, boxScale, axisOrigin = .5) {
	applyAxisDelta(axis, axisTranslate, axisScale, mixNumber(axis.min, axis.max, axisOrigin), boxScale);
}
function resolveAxisTranslate(value, axis) {
	if (typeof value === "string") return parseFloat(value) / 100 * (axis.max - axis.min);
	return value;
}
/**
* Apply a transform to a box from the latest resolved motion values.
*/
function transformBox(box, transform, sourceBox) {
	const resolveBox = sourceBox ?? box;
	transformAxis(box.x, resolveAxisTranslate(transform.x, resolveBox.x), transform.scaleX, transform.scale, transform.originX);
	transformAxis(box.y, resolveAxisTranslate(transform.y, resolveBox.y), transform.scaleY, transform.scale, transform.originY);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/projection/utils/measure.mjs
function measureViewportBox(instance, transformPoint) {
	return convertBoundingBoxToBox(transformBoxPoints(instance.getBoundingClientRect(), transformPoint));
}
function measurePageBox(element, rootProjectionNode, transformPagePoint) {
	const viewportBox = measureViewportBox(element, transformPagePoint);
	const { scroll } = rootProjectionNode;
	if (scroll) {
		translateAxis(viewportBox.x, scroll.offset.x);
		translateAxis(viewportBox.y, scroll.offset.y);
	}
	return viewportBox;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/html/utils/build-transform.mjs
var translateAlias = {
	x: "translateX",
	y: "translateY",
	z: "translateZ",
	transformPerspective: "perspective"
};
var numTransforms = transformPropOrder.length;
/**
* Build a CSS transform style from individual x/y/scale etc properties.
*
* This outputs with a default order of transforms/scales/rotations, this can be customised by
* providing a transformTemplate function.
*/
function buildTransform(latestValues, transform, transformTemplate) {
	let transformString = "";
	let transformIsDefault = true;
	/**
	* Loop over all possible transforms in order, adding the ones that
	* are present to the transform string.
	*/
	for (let i = 0; i < numTransforms; i++) {
		const key = transformPropOrder[i];
		const value = latestValues[key];
		if (value === void 0) continue;
		let valueIsDefault = true;
		if (typeof value === "number") valueIsDefault = value === (key.startsWith("scale") ? 1 : 0);
		else {
			const parsed = parseFloat(value);
			valueIsDefault = key.startsWith("scale") ? parsed === 1 : parsed === 0;
		}
		if (!valueIsDefault || transformTemplate) {
			const valueAsType = getValueAsType(value, numberValueTypes[key]);
			if (!valueIsDefault) {
				transformIsDefault = false;
				const transformName = translateAlias[key] || key;
				transformString += `${transformName}(${valueAsType}) `;
			}
			if (transformTemplate) transform[key] = valueAsType;
		}
	}
	const pathRotation = latestValues.pathRotation;
	if (pathRotation) {
		transformIsDefault = false;
		transformString += `rotate(${getValueAsType(pathRotation, numberValueTypes.pathRotation)}) `;
	}
	transformString = transformString.trim();
	if (transformTemplate) transformString = transformTemplate(transform, transformIsDefault ? "" : transformString);
	else if (transformIsDefault) transformString = "none";
	return transformString;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/html/utils/build-styles.mjs
function buildHTMLStyles(state, latestValues, transformTemplate) {
	const { style, vars, transformOrigin } = state;
	let hasTransform = false;
	let hasTransformOrigin = false;
	/**
	* Loop over all our latest animated values and decide whether to handle them
	* as a style or CSS variable.
	*
	* Transforms and transform origins are kept separately for further processing.
	*/
	for (const key in latestValues) {
		const value = latestValues[key];
		if (transformProps.has(key)) {
			hasTransform = true;
			continue;
		} else if (isCSSVariableName(key)) {
			vars[key] = value;
			continue;
		} else {
			const valueAsType = getValueAsType(value, numberValueTypes[key]);
			if (key.startsWith("origin")) {
				hasTransformOrigin = true;
				transformOrigin[key] = valueAsType;
			} else style[key] = valueAsType;
		}
	}
	if (!latestValues.transform) {
		if (hasTransform || transformTemplate) style.transform = buildTransform(latestValues, state.transform, transformTemplate);
		else if (style.transform)
 /**
		* If we have previously created a transform but currently don't have any,
		* reset transform style to none.
		*/
		style.transform = "none";
	}
	/**
	* Build a transformOrigin style. Uses the same defaults as the browser for
	* undefined origins.
	*/
	if (hasTransformOrigin) {
		const { originX = "50%", originY = "50%", originZ = 0 } = transformOrigin;
		style.transformOrigin = `${originX} ${originY} ${originZ}`;
	}
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/html/utils/render.mjs
function renderHTML(element, { style, vars }, styleProp, projection) {
	const elementStyle = element.style;
	let key;
	for (key in style) elementStyle[key] = style[key];
	projection?.applyProjectionStyles(elementStyle, styleProp);
	for (key in vars) elementStyle.setProperty(key, vars[key]);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/projection/styles/scale-border-radius.mjs
function pixelsToPercent(pixels, axis) {
	if (axis.max === axis.min) return 0;
	return pixels / (axis.max - axis.min) * 100;
}
/**
* We always correct borderRadius as a percentage rather than pixels to reduce paints.
* For example, if you are projecting a box that is 100px wide with a 10px borderRadius
* into a box that is 200px wide with a 20px borderRadius, that is actually a 10%
* borderRadius in both states. If we animate between the two in pixels that will trigger
* a paint each time. If we animate between the two in percentage we'll avoid a paint.
*/
var correctBorderRadius = { correct: (latest, node) => {
	if (!node.target) return latest;
	/**
	* If latest is a string, if it's a percentage we can return immediately as it's
	* going to be stretched appropriately. Otherwise, if it's a pixel, convert it to a number.
	*/
	if (typeof latest === "string") {
		if (px.test(latest)) latest = parseFloat(latest);
		else return latest;
	}
	return `${pixelsToPercent(latest, node.target.x)}% ${pixelsToPercent(latest, node.target.y)}%`;
} };
//#endregion
//#region ../../node_modules/motion-dom/dist/es/projection/styles/scale-box-shadow.mjs
var correctBoxShadow = { correct: (latest, { treeScale, projectionDelta }) => {
	const original = latest;
	const shadow = complex.parse(latest);
	if (shadow.length > 5) return original;
	const template = complex.createTransformer(latest);
	const offset = typeof shadow[0] !== "number" ? 1 : 0;
	const xScale = projectionDelta.x.scale * treeScale.x;
	const yScale = projectionDelta.y.scale * treeScale.y;
	shadow[0 + offset] /= xScale;
	shadow[1 + offset] /= yScale;
	/**
	* Ideally we'd correct x and y scales individually, but because blur and
	* spread apply to both we have to take a scale average and apply that instead.
	* We could potentially improve the outcome of this by incorporating the ratio between
	* the two scales.
	*/
	const averageScale = mixNumber(xScale, yScale, .5);
	if (typeof shadow[2 + offset] === "number") shadow[2 + offset] /= averageScale;
	if (typeof shadow[3 + offset] === "number") shadow[3 + offset] /= averageScale;
	return template(shadow);
} };
//#endregion
//#region ../../node_modules/motion-dom/dist/es/projection/styles/scale-correction.mjs
var scaleCorrectors = {
	borderRadius: {
		...correctBorderRadius,
		applyTo: [...cornerRadiusProps]
	},
	borderTopLeftRadius: correctBorderRadius,
	borderTopRightRadius: correctBorderRadius,
	borderBottomLeftRadius: correctBorderRadius,
	borderBottomRightRadius: correctBorderRadius,
	boxShadow: correctBoxShadow
};
function addScaleCorrector(correctors) {
	for (const key in correctors) {
		scaleCorrectors[key] = correctors[key];
		if (isCSSVariableName(key)) scaleCorrectors[key].isCSSVariable = true;
	}
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/utils/is-forced-motion-value.mjs
function isForcedMotionValue(key, { layout, layoutId }) {
	return transformProps.has(key) || key.startsWith("origin") || (layout || layoutId !== void 0) && (!!scaleCorrectors[key] || key === "opacity");
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/html/utils/scrape-motion-values.mjs
function scrapeMotionValuesFromProps(props, prevProps, visualElement) {
	const style = props.style;
	const prevStyle = prevProps?.style;
	const newValues = {};
	if (!style) return newValues;
	for (const key in style) if (isMotionValue(style[key]) || prevStyle && isMotionValue(prevStyle[key]) || isForcedMotionValue(key, props) || visualElement?.getValue(key)?.liveStyle !== void 0) newValues[key] = style[key];
	return newValues;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/html/HTMLVisualElement.mjs
function getComputedStyle$2(element) {
	return window.getComputedStyle(element);
}
var HTMLVisualElement = class extends DOMVisualElement {
	constructor() {
		super(...arguments);
		this.type = "html";
		this.renderInstance = renderHTML;
	}
	mount(instance) {
		/**
		* If a custom component forwards its ref to something other than a
		* HTML/SVG element (a class instance, an imperative handle) there's
		* nothing for Motion to style, measure or attach gestures to. #2777
		*/
		invariant(Boolean(instance.style), "motion.create() components must forward their ref to a HTML or SVG element", "custom-component-ref");
		super.mount(instance);
	}
	readValueFromInstance(instance, key) {
		if (transformProps.has(key)) return this.projection?.isProjecting ? defaultTransformValue(key) : readTransformValue(instance, key);
		else {
			const computedStyle = getComputedStyle$2(instance);
			const value = (isCSSVariableName(key) ? computedStyle.getPropertyValue(key) : computedStyle[key]) || 0;
			return typeof value === "string" ? value.trim() : value;
		}
	}
	measureInstanceViewportBox(instance, { transformPagePoint }) {
		return measureViewportBox(instance, transformPagePoint);
	}
	build(renderState, latestValues, props) {
		buildHTMLStyles(renderState, latestValues, props.transformTemplate);
	}
	scrapeMotionValuesFromProps(props, prevProps, visualElement) {
		return scrapeMotionValuesFromProps(props, prevProps, visualElement);
	}
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/object/ObjectVisualElement.mjs
function isObjectKey(key, object) {
	return key in object;
}
var ObjectVisualElement = class extends VisualElement {
	constructor() {
		super(...arguments);
		this.type = "object";
	}
	readValueFromInstance(instance, key) {
		if (isObjectKey(key, instance)) {
			const value = instance[key];
			if (typeof value === "string" || typeof value === "number") return value;
		}
	}
	getBaseTargetFromProps() {}
	removeValueFromRenderState(key, renderState) {
		delete renderState.output[key];
	}
	measureInstanceViewportBox() {
		return createBox();
	}
	build(renderState, latestValues) {
		Object.assign(renderState.output, latestValues);
	}
	renderInstance(instance, { output }) {
		Object.assign(instance, output);
	}
	sortInstanceNodePosition() {
		return 0;
	}
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/svg/utils/path.mjs
var dashKeys = {
	offset: "stroke-dashoffset",
	array: "stroke-dasharray"
};
var camelKeys = {
	offset: "strokeDashoffset",
	array: "strokeDasharray"
};
/**
* Build SVG path properties. Uses the path's measured length to convert
* our custom pathLength, pathSpacing and pathOffset into stroke-dashoffset
* and stroke-dasharray attributes.
*
* This function is mutative to reduce per-frame GC.
*
* Note: We use unitless values for stroke-dasharray and stroke-dashoffset
* because Safari incorrectly scales px values when the page is zoomed.
*/
function buildSVGPath(attrs, length, spacing = 1, offset = 0, useDashCase = true) {
	attrs.pathLength = 1;
	const keys = useDashCase ? dashKeys : camelKeys;
	attrs[keys.offset] = `${-offset}`;
	attrs[keys.array] = `${length} ${spacing}`;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/svg/utils/build-attrs.mjs
var cssStyleProperties = [
	"transform",
	"opacity",
	"offsetDistance",
	"offsetPath",
	"offsetRotate",
	"offsetAnchor"
];
/**
* Build SVG visual attributes, like cx and style.transform
*/
function buildSVGAttrs(state, { attrX, attrY, attrScale, pathLength, pathSpacing = 1, pathOffset = 0, ...latest }, isSVGTag, transformTemplate, styleProp) {
	buildHTMLStyles(state, latest, transformTemplate);
	/**
	* For svg tags we just want to make sure viewBox is animatable and treat all the styles
	* as normal HTML tags.
	*/
	if (isSVGTag) {
		if (state.style.viewBox) state.attrs.viewBox = state.style.viewBox;
		return;
	}
	state.attrs = state.style;
	state.style = {};
	const { attrs, style } = state;
	for (const key of cssStyleProperties) if (attrs[key] !== void 0) {
		style[key] = attrs[key];
		delete attrs[key];
	}
	if (style.transform || attrs.transformOrigin) {
		style.transformOrigin = attrs.transformOrigin ?? "50% 50%";
		delete attrs.transformOrigin;
	}
	if (style.transform) {
		/**
		* SVG's element transform-origin uses its own median as a reference.
		* Therefore, transformBox becomes a fill-box
		*/
		style.transformBox = styleProp?.transformBox ?? "fill-box";
		delete attrs.transformBox;
	}
	if (attrX !== void 0) attrs.x = attrX;
	if (attrY !== void 0) attrs.y = attrY;
	if (attrScale !== void 0) attrs.scale = attrScale;
	if (pathLength !== void 0) buildSVGPath(attrs, pathLength, pathSpacing, pathOffset, false);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/svg/utils/camel-case-attrs.mjs
/**
* A set of attribute names that are always read/written as camel case.
*/
var camelCaseAttributes = /* @__PURE__ */ new Set([
	"baseFrequency",
	"diffuseConstant",
	"kernelMatrix",
	"kernelUnitLength",
	"keySplines",
	"keyTimes",
	"limitingConeAngle",
	"markerHeight",
	"markerWidth",
	"numOctaves",
	"targetX",
	"targetY",
	"surfaceScale",
	"specularConstant",
	"specularExponent",
	"stdDeviation",
	"tableValues",
	"viewBox",
	"gradientTransform",
	"pathLength",
	"startOffset",
	"textLength",
	"lengthAdjust"
]);
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/svg/utils/is-svg-tag.mjs
var isSVGTag = (tag) => typeof tag === "string" && tag.toLowerCase() === "svg";
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/svg/utils/render.mjs
function renderSVG(element, renderState, _styleProp, projection) {
	renderHTML(element, renderState, void 0, projection);
	for (const key in renderState.attrs) element.setAttribute(!camelCaseAttributes.has(key) ? camelToDash(key) : key, renderState.attrs[key]);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/svg/utils/scrape-motion-values.mjs
function scrapeMotionValuesFromProps$1(props, prevProps, visualElement) {
	const newValues = scrapeMotionValuesFromProps(props, prevProps, visualElement);
	for (const key in props) if (isMotionValue(props[key]) || isMotionValue(prevProps[key])) {
		const targetKey = transformPropOrder.indexOf(key) !== -1 ? "attr" + key.charAt(0).toUpperCase() + key.substring(1) : key;
		newValues[targetKey] = props[key];
	}
	return newValues;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/svg/SVGVisualElement.mjs
var SVGVisualElement = class extends DOMVisualElement {
	constructor() {
		super(...arguments);
		this.type = "svg";
		this.isSVGTag = false;
		this.measureInstanceViewportBox = createBox;
	}
	getBaseTargetFromProps(props, key) {
		return props[key];
	}
	readValueFromInstance(instance, key) {
		if (transformProps.has(key)) {
			const defaultType = getDefaultValueType(key);
			return defaultType ? defaultType.default || 0 : 0;
		}
		if (cssStyleProperties.includes(key)) {
			const value = getComputedStyle(instance)[key];
			if (typeof value === "string" && value) return value.trim();
		}
		key = !camelCaseAttributes.has(key) ? camelToDash(key) : key;
		return instance.getAttribute(key);
	}
	scrapeMotionValuesFromProps(props, prevProps, visualElement) {
		return scrapeMotionValuesFromProps$1(props, prevProps, visualElement);
	}
	build(renderState, latestValues, props) {
		buildSVGAttrs(renderState, latestValues, this.isSVGTag, props.transformTemplate, props.style);
	}
	renderInstance(instance, renderState, styleProp, projection) {
		renderSVG(instance, renderState, styleProp, projection);
	}
	mount(instance) {
		this.isSVGTag = isSVGTag(instance.tagName);
		super.mount(instance);
	}
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/utils/get-variant-context.mjs
var numVariantProps$1 = variantProps.length;
/**
* Get variant context from a visual element's parent chain.
* Uses `any` type for visualElement to avoid circular dependencies.
*/
function getVariantContext(visualElement) {
	if (!visualElement) return void 0;
	if (!visualElement.isControllingVariants) {
		const context = visualElement.parent ? getVariantContext(visualElement.parent) || {} : {};
		if (visualElement.props.initial !== void 0) context.initial = visualElement.props.initial;
		return context;
	}
	const context = {};
	for (let i = 0; i < numVariantProps$1; i++) {
		const name = variantProps[i];
		const prop = visualElement.props[name];
		if (isVariantLabel(prop) || prop === false) context[name] = prop;
	}
	return context;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/utils/shallow-compare.mjs
function shallowCompare$1(next, prev) {
	if (!Array.isArray(prev)) return false;
	const prevLength = prev.length;
	if (prevLength !== next.length) return false;
	for (let i = 0; i < prevLength; i++) if (prev[i] !== next[i]) return false;
	return true;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/render/utils/animation-state.mjs
var reversePriorityOrder$1 = [...variantPriorityOrder].reverse();
var numAnimationTypes$1 = variantPriorityOrder.length;
function createAnimateFunction$1(visualElement) {
	return (animations) => {
		return Promise.all(animations.map(({ animation, options }) => animateVisualElement(visualElement, animation, options)));
	};
}
function createAnimationState(visualElement) {
	let animate = createAnimateFunction$1(visualElement);
	let state = createState$1();
	let isInitialRender = true;
	/**
	* Track whether the animation state has been reset (e.g. via StrictMode
	* double-invocation or Suspense unmount/remount). On the first
	* animateChanges() call after a reset we need to behave like the initial
	* render for variant-inheritance checks, even though isInitialRender is
	* already false.
	*/
	let wasReset = false;
	/**
	* This function will be used to reduce the animation definitions for
	* each active animation type into an object of resolved values for it.
	*/
	const buildResolvedTypeValues = (type) => (acc, definition) => {
		const resolved = resolveVariant(visualElement, definition, type === "exit" ? visualElement.presenceContext?.custom : void 0);
		if (resolved) {
			const { transition, transitionEnd, ...target } = resolved;
			acc = {
				...acc,
				...target,
				...transitionEnd
			};
		}
		return acc;
	};
	/**
	* This just allows us to inject mocked animation functions
	* @internal
	*/
	function setAnimateFunction(makeAnimator) {
		animate = makeAnimator(visualElement);
	}
	/**
	* When we receive new props, we need to:
	* 1. Create a list of protected keys for each type. This is a directory of
	*    value keys that are currently being "handled" by types of a higher priority
	*    so that whenever an animation is played of a given type, these values are
	*    protected from being animated.
	* 2. Determine if an animation type needs animating.
	* 3. Determine if any values have been removed from a type and figure out
	*    what to animate those to.
	*/
	function animateChanges(changedActiveType) {
		const { props } = visualElement;
		const context = getVariantContext(visualElement.parent) || {};
		/**
		* A list of animations that we'll build into as we iterate through the animation
		* types. This will get executed at the end of the function.
		*/
		const animations = [];
		/**
		* Keep track of which values have been removed. Then, as we hit lower priority
		* animation types, we can check if they contain removed values and animate to that.
		*/
		const removedKeys = /* @__PURE__ */ new Set();
		/**
		* A dictionary of all encountered keys. This is an object to let us build into and
		* copy it without iteration. Each time we hit an animation type we set its protected
		* keys - the keys its not allowed to animate - to the latest version of this object.
		*/
		let encounteredKeys = {};
		/**
		* If a variant has been removed at a given index, and this component is controlling
		* variant animations, we want to ensure lower-priority variants are forced to animate.
		*/
		let removedVariantIndex = Infinity;
		/**
		* Iterate through all animation types in reverse priority order. For each, we want to
		* detect which values it's handling and whether or not they've changed (and therefore
		* need to be animated). If any values have been removed, we want to detect those in
		* lower priority props and flag for animation.
		*/
		for (let i = 0; i < numAnimationTypes$1; i++) {
			const type = reversePriorityOrder$1[i];
			const typeState = state[type];
			const prop = props[type] !== void 0 ? props[type] : context[type];
			const propIsVariant = isVariantLabel(prop);
			/**
			* If this type has *just* changed isActive status, set activeDelta
			* to that status. Otherwise set to null.
			*/
			const activeDelta = type === changedActiveType ? typeState.isActive : null;
			if (activeDelta === false) removedVariantIndex = i;
			/**
			* If this prop is an inherited variant, rather than been set directly on the
			* component itself, we want to make sure we allow the parent to trigger animations.
			*
			* TODO: Can probably change this to a !isControllingVariants check
			*/
			let isInherited = prop === context[type] && prop !== props[type] && propIsVariant;
			if (isInherited && (isInitialRender || wasReset) && visualElement.manuallyAnimateOnMount) isInherited = false;
			/**
			* Set all encountered keys so far as the protected keys for this type. This will
			* be any key that has been animated or otherwise handled by active, higher-priortiy types.
			*/
			typeState.protectedKeys = { ...encounteredKeys };
			if (!typeState.isActive && activeDelta === null || !prop && !typeState.prevProp || isAnimationControls(prop) || typeof prop === "boolean") continue;
			/**
			* If exit is already active and wasn't just activated, skip
			* re-processing to prevent interrupting running exit animations.
			* Re-resolving exit with a changed custom value can start new
			* value animations that stop the originals, leaving the exit
			* animation promise unresolved and the component stuck in the DOM.
			*/
			if (type === "exit" && typeState.isActive && activeDelta !== true) {
				if (typeState.prevResolvedValues) encounteredKeys = {
					...encounteredKeys,
					...typeState.prevResolvedValues
				};
				continue;
			}
			/**
			* As we go look through the values defined on this type, if we detect
			* a changed value or a value that was removed in a higher priority, we set
			* this to true and add this prop to the animation list.
			*/
			const variantDidChange = checkVariantsDidChange(typeState.prevProp, prop);
			let shouldAnimateType = variantDidChange || type === changedActiveType && typeState.isActive && !isInherited && propIsVariant || i > removedVariantIndex && propIsVariant;
			let handledRemovedValues = false;
			/**
			* As animations can be set as variant lists, variants or target objects, we
			* coerce everything to an array if it isn't one already
			*/
			const definitionList = Array.isArray(prop) ? prop : [prop];
			/**
			* Build an object of all the resolved values. We'll use this in the subsequent
			* animateChanges calls to determine whether a value has changed.
			*/
			let resolvedValues = definitionList.reduce(buildResolvedTypeValues(type), {});
			if (activeDelta === false) resolvedValues = {};
			/**
			* Now we need to loop through all the keys in the prev prop and this prop,
			* and decide:
			* 1. If the value has changed, and needs animating
			* 2. If it has been removed, and needs adding to the removedKeys set
			* 3. If it has been removed in a higher priority type and needs animating
			* 4. If it hasn't been removed in a higher priority but hasn't changed, and
			*    needs adding to the type's protectedKeys list.
			*/
			const { prevResolvedValues = {} } = typeState;
			const allKeys = {
				...prevResolvedValues,
				...resolvedValues
			};
			const markToAnimate = (key) => {
				shouldAnimateType = true;
				if (removedKeys.has(key)) {
					handledRemovedValues = true;
					removedKeys.delete(key);
				}
				typeState.needsAnimating[key] = true;
				const motionValue = visualElement.getValue(key);
				if (motionValue) motionValue.liveStyle = false;
			};
			for (const key in allKeys) {
				const next = resolvedValues[key];
				const prev = prevResolvedValues[key];
				if (encounteredKeys.hasOwnProperty(key)) continue;
				/**
				* If the value has changed, we probably want to animate it.
				*/
				let valueHasChanged = false;
				if (isKeyframesTarget(next) && isKeyframesTarget(prev)) valueHasChanged = !shallowCompare$1(next, prev) || variantDidChange;
				else valueHasChanged = next !== prev;
				if (valueHasChanged) {
					if (next !== void 0 && next !== null) markToAnimate(key);
					else removedKeys.add(key);
				} else if (next !== void 0 && removedKeys.has(key))
 /**
				* If next hasn't changed and it isn't undefined, we want to check if it's
				* been removed by a higher priority
				*/
				markToAnimate(key);
				else
 /**
				* If it hasn't changed, we add it to the list of protected values
				* to ensure it doesn't get animated.
				*/
				typeState.protectedKeys[key] = true;
			}
			/**
			* Update the typeState so next time animateChanges is called we can compare the
			* latest prop and resolvedValues to these.
			*/
			typeState.prevProp = prop;
			typeState.prevResolvedValues = resolvedValues;
			if (typeState.isActive) encounteredKeys = {
				...encounteredKeys,
				...resolvedValues
			};
			if ((isInitialRender || wasReset) && visualElement.blockInitialAnimation) shouldAnimateType = false;
			/**
			* If this is an inherited prop we want to skip this animation
			* unless the inherited variants haven't changed on this render.
			*/
			const willAnimateViaParent = isInherited && variantDidChange;
			if (shouldAnimateType && (!willAnimateViaParent || handledRemovedValues)) animations.push(...definitionList.map((animation) => {
				const options = { type };
				/**
				* If we're performing the initial animation, but we're not
				* rendering at the same time as the variant-controlling parent,
				* we want to use the parent's transition to calculate the stagger.
				*/
				if (typeof animation === "string" && (isInitialRender || wasReset) && !willAnimateViaParent && visualElement.manuallyAnimateOnMount && visualElement.parent) {
					const { parent } = visualElement;
					const parentVariant = resolveVariant(parent, animation);
					if (parent.enteringChildren && parentVariant) {
						const { delayChildren } = parentVariant.transition || {};
						options.delay = calcChildStagger(parent.enteringChildren, visualElement, delayChildren);
					}
				}
				return {
					animation,
					options
				};
			}));
		}
		/**
		* If there are some removed value that haven't been dealt with,
		* we need to create a new animation that falls back either to the value
		* defined in the style prop, or the last read value.
		*/
		if (removedKeys.size) {
			const fallbackAnimation = {};
			/**
			* If the initial prop contains a transition we can use that, otherwise
			* allow the animation function to use the visual element's default.
			*/
			if (typeof props.initial !== "boolean") {
				const initialTransition = resolveVariant(visualElement, Array.isArray(props.initial) ? props.initial[0] : props.initial);
				if (initialTransition && initialTransition.transition) fallbackAnimation.transition = initialTransition.transition;
			}
			removedKeys.forEach((key) => {
				const fallbackTarget = visualElement.getBaseTarget(key);
				const motionValue = visualElement.getValue(key);
				if (motionValue) motionValue.liveStyle = true;
				fallbackAnimation[key] = fallbackTarget ?? null;
			});
			animations.push({ animation: fallbackAnimation });
		}
		let shouldAnimate = Boolean(animations.length);
		if (isInitialRender && (props.initial === false || props.initial === props.animate) && !visualElement.manuallyAnimateOnMount) shouldAnimate = false;
		isInitialRender = false;
		wasReset = false;
		return shouldAnimate ? animate(animations) : Promise.resolve();
	}
	/**
	* Change whether a certain animation type is active.
	*/
	function setActive(type, isActive) {
		if (state[type].isActive === isActive) return Promise.resolve();
		visualElement.variantChildren?.forEach((child) => child.animationState?.setActive(type, isActive));
		state[type].isActive = isActive;
		const animations = animateChanges(type);
		for (const key in state) state[key].protectedKeys = {};
		return animations;
	}
	return {
		animateChanges,
		setActive,
		setAnimateFunction,
		getState: () => state,
		reset: () => {
			state = createState$1();
			wasReset = true;
		}
	};
}
function checkVariantsDidChange(prev, next) {
	if (typeof next === "string") return next !== prev;
	else if (Array.isArray(next)) return !shallowCompare$1(next, prev);
	return false;
}
function createTypeState$1(isActive = false) {
	return {
		isActive,
		protectedKeys: {},
		needsAnimating: {},
		prevResolvedValues: {}
	};
}
function createState$1() {
	return {
		animate: createTypeState$1(true),
		whileInView: createTypeState$1(),
		whileHover: createTypeState$1(),
		whileTap: createTypeState$1(),
		whileDrag: createTypeState$1(),
		whileFocus: createTypeState$1(),
		exit: createTypeState$1()
	};
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/projection/geometry/copy.mjs
/**
* Reset an axis to the provided origin box.
*
* This is a mutative operation.
*/
function copyAxisInto(axis, originAxis) {
	axis.min = originAxis.min;
	axis.max = originAxis.max;
}
/**
* Reset a box to the provided origin box.
*
* This is a mutative operation.
*/
function copyBoxInto(box, originBox) {
	copyAxisInto(box.x, originBox.x);
	copyAxisInto(box.y, originBox.y);
}
/**
* Reset a delta to the provided origin box.
*
* This is a mutative operation.
*/
function copyAxisDeltaInto(delta, originDelta) {
	delta.translate = originDelta.translate;
	delta.scale = originDelta.scale;
	delta.originPoint = originDelta.originPoint;
	delta.origin = originDelta.origin;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/projection/geometry/delta-calc.mjs
var SCALE_MIN = .9999;
var SCALE_MAX = 1.0001;
var TRANSLATE_MIN = -.01;
var TRANSLATE_MAX = .01;
function calcLength(axis) {
	return axis.max - axis.min;
}
function isNear(value, target, maxDistance) {
	return Math.abs(value - target) <= maxDistance;
}
function calcAxisDelta(delta, source, target, origin = .5) {
	delta.origin = origin;
	delta.originPoint = mixNumber(source.min, source.max, delta.origin);
	delta.scale = calcLength(target) / calcLength(source);
	delta.translate = mixNumber(target.min, target.max, delta.origin) - delta.originPoint;
	if (delta.scale >= SCALE_MIN && delta.scale <= SCALE_MAX || isNaN(delta.scale)) delta.scale = 1;
	if (delta.translate >= TRANSLATE_MIN && delta.translate <= TRANSLATE_MAX || isNaN(delta.translate)) delta.translate = 0;
}
function calcBoxDelta(delta, source, target, origin) {
	calcAxisDelta(delta.x, source.x, target.x, origin ? origin.originX : void 0);
	calcAxisDelta(delta.y, source.y, target.y, origin ? origin.originY : void 0);
}
function calcRelativeAxis(target, relative, parent, anchor = 0) {
	target.min = (anchor ? mixNumber(parent.min, parent.max, anchor) : parent.min) + relative.min;
	target.max = target.min + calcLength(relative);
}
function calcRelativeBox(target, relative, parent, anchor) {
	calcRelativeAxis(target.x, relative.x, parent.x, anchor?.x);
	calcRelativeAxis(target.y, relative.y, parent.y, anchor?.y);
}
function calcRelativeAxisPosition(target, layout, parent, anchor = 0) {
	const anchorPoint = anchor ? mixNumber(parent.min, parent.max, anchor) : parent.min;
	target.min = layout.min - anchorPoint;
	target.max = target.min + calcLength(layout);
}
function calcRelativePosition(target, layout, parent, anchor) {
	calcRelativeAxisPosition(target.x, layout.x, parent.x, anchor?.x);
	calcRelativeAxisPosition(target.y, layout.y, parent.y, anchor?.y);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/projection/geometry/delta-remove.mjs
/**
* Remove a delta from a point. This is essentially the steps of applyPointDelta in reverse
*/
function removePointDelta(point, translate, scale, originPoint, boxScale) {
	point -= translate;
	point = scalePoint(point, 1 / scale, originPoint);
	if (boxScale !== void 0) point = scalePoint(point, 1 / boxScale, originPoint);
	return point;
}
/**
* Remove a delta from an axis. This is essentially the steps of applyAxisDelta in reverse
*/
function removeAxisDelta(axis, translate = 0, scale = 1, origin = .5, boxScale, originAxis = axis, sourceAxis = axis) {
	if (percent.test(translate)) {
		translate = parseFloat(translate);
		translate = mixNumber(sourceAxis.min, sourceAxis.max, translate / 100) - sourceAxis.min;
	}
	if (typeof translate !== "number") return;
	let originPoint = mixNumber(originAxis.min, originAxis.max, origin);
	if (axis === originAxis) originPoint -= translate;
	axis.min = removePointDelta(axis.min, translate, scale, originPoint, boxScale);
	axis.max = removePointDelta(axis.max, translate, scale, originPoint, boxScale);
}
/**
* Remove a transforms from an axis. This is essentially the steps of applyAxisTransforms in reverse
* and acts as a bridge between motion values and removeAxisDelta
*/
function removeAxisTransforms(axis, transforms, [key, scaleKey, originKey], origin, sourceAxis) {
	removeAxisDelta(axis, transforms[key], transforms[scaleKey], transforms[originKey], transforms.scale, origin, sourceAxis);
}
/**
* The names of the motion values we want to apply as translation, scale and origin.
*/
var xKeys = [
	"x",
	"scaleX",
	"originX"
];
var yKeys = [
	"y",
	"scaleY",
	"originY"
];
/**
* Remove a transforms from an box. This is essentially the steps of applyAxisBox in reverse
* and acts as a bridge between motion values and removeAxisDelta
*/
function removeBoxTransforms(box, transforms, originBox, sourceBox) {
	removeAxisTransforms(box.x, transforms, xKeys, originBox ? originBox.x : void 0, sourceBox ? sourceBox.x : void 0);
	removeAxisTransforms(box.y, transforms, yKeys, originBox ? originBox.y : void 0, sourceBox ? sourceBox.y : void 0);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/projection/geometry/utils.mjs
function isAxisDeltaZero(delta) {
	return delta.translate === 0 && delta.scale === 1;
}
function isDeltaZero(delta) {
	return isAxisDeltaZero(delta.x) && isAxisDeltaZero(delta.y);
}
function axisEquals(a, b) {
	return a.min === b.min && a.max === b.max;
}
function boxEquals(a, b) {
	return axisEquals(a.x, b.x) && axisEquals(a.y, b.y);
}
function axisEqualsRounded(a, b) {
	return Math.round(a.min) === Math.round(b.min) && Math.round(a.max) === Math.round(b.max);
}
function boxEqualsRounded(a, b) {
	return axisEqualsRounded(a.x, b.x) && axisEqualsRounded(a.y, b.y);
}
function aspectRatio(box) {
	return calcLength(box.x) / calcLength(box.y);
}
function axisDeltaEquals(a, b) {
	return a.translate === b.translate && a.scale === b.scale && a.originPoint === b.originPoint;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/projection/utils/each-axis.mjs
function eachAxis(callback) {
	return [callback("x"), callback("y")];
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/projection/styles/transform.mjs
function buildProjectionTransform(delta, treeScale, latestTransform) {
	let transform = "";
	/**
	* The translations we use to calculate are always relative to the viewport coordinate space.
	* But when we apply scales, we also scale the coordinate space of an element and its children.
	* For instance if we have a treeScale (the culmination of all parent scales) of 0.5 and we need
	* to move an element 100 pixels, we actually need to move it 200 in within that scaled space.
	*/
	const xTranslate = delta.x.translate / treeScale.x;
	const yTranslate = delta.y.translate / treeScale.y;
	const zTranslate = latestTransform?.z || 0;
	if (xTranslate || yTranslate || zTranslate) transform = `translate3d(${xTranslate}px, ${yTranslate}px, ${zTranslate}px) `;
	/**
	* Apply scale correction for the tree transform.
	* This will apply scale to the screen-orientated axes.
	*/
	if (treeScale.x !== 1 || treeScale.y !== 1) transform += `scale(${1 / treeScale.x}, ${1 / treeScale.y}) `;
	if (latestTransform) {
		const { transformPerspective, rotate, pathRotation, rotateX, rotateY, skewX, skewY } = latestTransform;
		if (transformPerspective) transform = `perspective(${transformPerspective}px) ${transform}`;
		if (rotate) transform += `rotate(${rotate}deg) `;
		if (pathRotation) transform += `rotate(${pathRotation}deg) `;
		if (rotateX) transform += `rotateX(${rotateX}deg) `;
		if (rotateY) transform += `rotateY(${rotateY}deg) `;
		if (skewX) transform += `skewX(${skewX}deg) `;
		if (skewY) transform += `skewY(${skewY}deg) `;
	}
	/**
	* Apply scale to match the size of the element to the size we want it.
	* This will apply scale to the element-orientated axes.
	*/
	const elementScaleX = delta.x.scale * treeScale.x;
	const elementScaleY = delta.y.scale * treeScale.y;
	if (elementScaleX !== 1 || elementScaleY !== 1) transform += `scale(${elementScaleX}, ${elementScaleY})`;
	return transform || "none";
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/projection/animation/mix-values.mjs
var numBorders = cornerRadiusProps.length;
var asNumber = (value) => typeof value === "string" ? parseFloat(value) : value;
var isPx = (value) => typeof value === "number" || px.test(value);
function mixValues(target, follow, lead, progress, shouldCrossfadeOpacity, isOnlyMember) {
	if (shouldCrossfadeOpacity) {
		target.opacity = mixNumber(0, lead.opacity ?? 1, easeCrossfadeIn(progress));
		target.opacityExit = mixNumber(follow.opacity ?? 1, 0, easeCrossfadeOut(progress));
	} else if (isOnlyMember) target.opacity = mixNumber(follow.opacity ?? 1, lead.opacity ?? 1, progress);
	/**
	* Mix border radius
	*/
	for (let i = 0; i < numBorders; i++) {
		const borderLabel = cornerRadiusProps[i];
		let followRadius = getRadius(follow, borderLabel);
		let leadRadius = getRadius(lead, borderLabel);
		if (followRadius === void 0 && leadRadius === void 0) continue;
		followRadius || (followRadius = 0);
		leadRadius || (leadRadius = 0);
		if (followRadius === 0 || leadRadius === 0 || isPx(followRadius) === isPx(leadRadius)) {
			target[borderLabel] = Math.max(mixNumber(asNumber(followRadius), asNumber(leadRadius), progress), 0);
			if (percent.test(leadRadius) || percent.test(followRadius)) target[borderLabel] += "%";
		} else target[borderLabel] = leadRadius;
	}
	/**
	* Mix rotation
	*/
	if (follow.rotate || lead.rotate) target.rotate = mixNumber(follow.rotate || 0, lead.rotate || 0, progress);
}
function getRadius(values, radiusName) {
	return values[radiusName] !== void 0 ? values[radiusName] : values.borderRadius;
}
var easeCrossfadeIn = /*@__PURE__*/ compress(0, .5, circOut);
var easeCrossfadeOut = /*@__PURE__*/ compress(.5, .95, noop);
function compress(min, max, easing) {
	return (p) => {
		if (p < min) return 0;
		if (p > max) return 1;
		return easing(/* @__PURE__ */ progress(min, max, p));
	};
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/animation/animate/single-value.mjs
function animateSingleValue(value, keyframes, options) {
	const motionValue$1 = isMotionValue(value) ? value : motionValue(value);
	motionValue$1.start(animateMotionValue("", motionValue$1, keyframes, options));
	return motionValue$1.animation;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/events/add-dom-event.mjs
function addDomEvent(target, eventName, handler, options = { passive: true }) {
	target.addEventListener(eventName, handler, options);
	return () => target.removeEventListener(eventName, handler, options);
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/projection/utils/compare-by-depth.mjs
var compareByDepth = (a, b) => a.depth - b.depth;
//#endregion
//#region ../../node_modules/motion-dom/dist/es/projection/utils/flat-tree.mjs
var FlatTree = class {
	constructor() {
		this.children = [];
		this.isDirty = false;
	}
	add(child) {
		addUniqueItem(this.children, child);
		this.isDirty = true;
	}
	remove(child) {
		removeItem(this.children, child);
		this.isDirty = true;
	}
	forEach(callback) {
		this.isDirty && this.children.sort(compareByDepth);
		this.isDirty = false;
		this.children.forEach(callback);
	}
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/utils/delay.mjs
/**
* Timeout defined in ms
*/
function delay(callback, timeout) {
	const start = time.now();
	const checkElapsed = ({ timestamp }) => {
		const elapsed = timestamp - start;
		if (elapsed >= timeout) {
			cancelFrame(checkElapsed);
			callback(elapsed - timeout);
		}
	};
	frame.setup(checkElapsed, true);
	return () => cancelFrame(checkElapsed);
}
function delayInSeconds(callback, timeout) {
	return delay(callback, /* @__PURE__ */ secondsToMilliseconds(timeout));
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/value/utils/resolve-motion-value.mjs
/**
* If the provided value is a MotionValue, this returns the actual value, otherwise just the value itself
*/
function resolveMotionValue(value) {
	return isMotionValue(value) ? value.get() : value;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/projection/shared/stack.mjs
var NodeStack = class {
	constructor() {
		this.members = [];
	}
	add(node) {
		addUniqueItem(this.members, node);
		for (let i = this.members.length - 1; i >= 0; i--) {
			const member = this.members[i];
			if (member === node || member === this.lead || member === this.prevLead) continue;
			const inst = member.instance;
			if ((!inst || inst.isConnected === false) && !member.snapshot) {
				removeItem(this.members, member);
				member.unmount();
			}
		}
		node.scheduleRender();
	}
	remove(node) {
		removeItem(this.members, node);
		if (node === this.prevLead) this.prevLead = void 0;
		if (node === this.lead) {
			const prevLead = this.members[this.members.length - 1];
			if (prevLead) this.promote(prevLead);
		}
	}
	relegate(node) {
		for (let i = this.members.indexOf(node) - 1; i >= 0; i--) {
			const member = this.members[i];
			if (member.isPresent !== false && member.instance?.isConnected !== false) {
				this.promote(member);
				return true;
			}
		}
		return false;
	}
	promote(node, preserveFollowOpacity) {
		const prevLead = this.lead;
		if (node === prevLead) return;
		this.prevLead = prevLead;
		this.lead = node;
		node.show();
		if (prevLead) {
			prevLead.updateSnapshot();
			node.scheduleRender();
			const { layoutDependency: prevDep } = prevLead.options;
			const { layoutDependency: nextDep } = node.options;
			if (prevDep === void 0 || prevDep !== nextDep) {
				node.resumeFrom = prevLead;
				if (preserveFollowOpacity) prevLead.preserveOpacity = true;
				if (prevLead.snapshot) {
					node.snapshot = prevLead.snapshot;
					node.snapshot.latestValues = prevLead.animationValues || prevLead.latestValues;
				}
				if (node.root?.isUpdating) node.isLayoutDirty = true;
			}
			if (node.options.crossfade === false) prevLead.hide();
		}
	}
	exitAnimationComplete() {
		this.members.forEach((member) => {
			member.options.onExitComplete?.();
			member.resumingFrom?.options.onExitComplete?.();
		});
	}
	scheduleRender() {
		this.members.forEach((member) => member.instance && member.scheduleRender(false));
	}
	removeLeadSnapshot() {
		if (this.lead?.snapshot) this.lead.snapshot = void 0;
	}
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/projection/node/state.mjs
/**
* This should only ever be modified on the client otherwise it'll
* persist through server requests. If we need instanced states we
* could lazy-init via root.
*/
var globalProjectionState = {
	/**
	* Global flag as to whether the tree has animated since the last time
	* we resized the window
	*/
	hasAnimatedSinceResize: true,
	/**
	* We set this to true once, on the first update. Any nodes added to the tree beyond that
	* update will be given a `data-projection-id` attribute.
	*/
	hasEverUpdated: false
};
//#endregion
//#region ../../node_modules/motion-dom/dist/es/projection/node/create-projection-node.mjs
var metrics = {
	nodes: 0,
	calculatedTargetDeltas: 0,
	calculatedProjections: 0
};
var transformAxes = [
	"",
	"X",
	"Y",
	"Z"
];
/**
* We use 1000 as the animation target as 0-1000 maps better to pixels than 0-1
* which has a noticeable difference in spring animations
*/
var animationTarget = 1e3;
var id = 0;
function resetDistortingTransform(key, visualElement, values, sharedAnimationValues) {
	const { latestValues } = visualElement;
	if (latestValues[key]) {
		values[key] = latestValues[key];
		visualElement.setStaticValue(key, 0);
		if (sharedAnimationValues) sharedAnimationValues[key] = 0;
	}
}
function cancelTreeOptimisedTransformAnimations(projectionNode) {
	projectionNode.hasCheckedOptimisedAppear = true;
	if (projectionNode.root === projectionNode) return;
	const { visualElement } = projectionNode.options;
	if (!visualElement) return;
	const appearId = getOptimisedAppearId(visualElement);
	if (window.MotionHasOptimisedAnimation(appearId, "transform")) {
		const { layout, layoutId } = projectionNode.options;
		window.MotionCancelOptimisedAnimation(appearId, "transform", frame, !(layout || layoutId));
	}
	const { parent } = projectionNode;
	if (parent && !parent.hasCheckedOptimisedAppear) cancelTreeOptimisedTransformAnimations(parent);
}
function createProjectionNode({ attachResizeListener, defaultParent, measureScroll, checkIsScrollRoot, resetTransform }) {
	return class ProjectionNode {
		constructor(latestValues = {}, parent = defaultParent?.()) {
			/**
			* A unique ID generated for every projection node.
			*/
			this.id = id++;
			/**
			* An id that represents a unique session instigated by startUpdate.
			*/
			this.animationId = 0;
			this.animationCommitId = 0;
			/**
			* A Set containing all this component's children. This is used to iterate
			* through the children.
			*
			* TODO: This could be faster to iterate as a flat array stored on the root node.
			*/
			this.children = /* @__PURE__ */ new Set();
			/**
			* Options for the node. We use this to configure what kind of layout animations
			* we should perform (if any).
			*/
			this.options = {};
			/**
			* We use this to detect when its safe to shut down part of a projection tree.
			* We have to keep projecting children for scale correction and relative projection
			* until all their parents stop performing layout animations.
			*/
			this.isTreeAnimating = false;
			this.isAnimationBlocked = false;
			/**
			* Flag to true if we think this layout has been changed. We can't always know this,
			* currently we set it to true every time a component renders, or if it has a layoutDependency
			* if that has changed between renders. Additionally, components can be grouped by LayoutGroup
			* and if one node is dirtied, they all are.
			*/
			this.isLayoutDirty = false;
			/**
			* Flag to true if we think the projection calculations for this node needs
			* recalculating as a result of an updated transform or layout animation.
			*/
			this.isProjectionDirty = false;
			/**
			* Flag to true if the layout *or* transform has changed. This then gets propagated
			* throughout the projection tree, forcing any element below to recalculate on the next frame.
			*/
			this.isSharedProjectionDirty = false;
			/**
			* Flag transform dirty. This gets propagated throughout the whole tree but is only
			* respected by shared nodes.
			*/
			this.isTransformDirty = false;
			/**
			* Block layout updates for instant layout transitions throughout the tree.
			*/
			this.updateManuallyBlocked = false;
			this.updateBlockedByResize = false;
			/**
			* Set to true between the start of the first `willUpdate` call and the end of the `didUpdate`
			* call.
			*/
			this.isUpdating = false;
			/**
			* If this is an SVG element we currently disable projection transforms
			*/
			this.isSVG = false;
			/**
			* Flag to true (during promotion) if a node doing an instant layout transition needs to reset
			* its projection styles.
			*/
			this.needsReset = false;
			/**
			* Flags whether this node should have its transform reset prior to measuring.
			*/
			this.shouldResetTransform = false;
			/**
			* Store whether this node has been checked for optimised appear animations. As
			* effects fire bottom-up, and we want to look up the tree for appear animations,
			* this makes sure we only check each path once, stopping at nodes that
			* have already been checked.
			*/
			this.hasCheckedOptimisedAppear = false;
			/**
			* An object representing the calculated contextual/accumulated/tree scale.
			* This will be used to scale calculcated projection transforms, as these are
			* calculated in screen-space but need to be scaled for elements to layoutly
			* make it to their calculated destinations.
			*
			* TODO: Lazy-init
			*/
			this.treeScale = {
				x: 1,
				y: 1
			};
			/**
			*
			*/
			this.eventHandlers = /* @__PURE__ */ new Map();
			this.hasTreeAnimated = false;
			this.layoutVersion = 0;
			this.updateScheduled = false;
			this.scheduleUpdate = () => this.update();
			this.projectionUpdateScheduled = false;
			this.checkUpdateFailed = () => {
				if (this.isUpdating) {
					this.isUpdating = false;
					this.clearAllSnapshots();
				}
			};
			/**
			* This is a multi-step process as shared nodes might be of different depths. Nodes
			* are sorted by depth order, so we need to resolve the entire tree before moving to
			* the next step.
			*/
			this.updateProjection = () => {
				this.projectionUpdateScheduled = false;
				/**
				* Reset debug counts. Manually resetting rather than creating a new
				* object each frame.
				*/
				if (statsBuffer.value) metrics.nodes = metrics.calculatedTargetDeltas = metrics.calculatedProjections = 0;
				this.nodes.forEach(propagateDirtyNodes);
				this.nodes.forEach(resolveTargetDelta);
				this.nodes.forEach(calcProjection);
				this.nodes.forEach(cleanDirtyNodes);
				if (statsBuffer.addProjectionMetrics) statsBuffer.addProjectionMetrics(metrics);
			};
			/**
			* Frame calculations
			*/
			this.resolvedRelativeTargetAt = 0;
			this.linkedParentVersion = 0;
			this.hasProjected = false;
			this.isVisible = true;
			this.animationProgress = 0;
			/**
			* Shared layout
			*/
			this.sharedNodes = /* @__PURE__ */ new Map();
			this.latestValues = latestValues;
			this.root = parent ? parent.root || parent : this;
			this.path = parent ? [...parent.path, parent] : [];
			this.parent = parent;
			this.depth = parent ? parent.depth + 1 : 0;
			for (let i = 0; i < this.path.length; i++) this.path[i].shouldResetTransform = true;
			if (this.root === this) this.nodes = new FlatTree();
		}
		addEventListener(name, handler) {
			if (!this.eventHandlers.has(name)) this.eventHandlers.set(name, new SubscriptionManager());
			return this.eventHandlers.get(name).add(handler);
		}
		notifyListeners(name, ...args) {
			const subscriptionManager = this.eventHandlers.get(name);
			subscriptionManager && subscriptionManager.notify(...args);
		}
		hasListeners(name) {
			return this.eventHandlers.has(name);
		}
		/**
		* Lifecycles
		*/
		mount(instance) {
			if (this.instance) return;
			this.isSVG = isSVGElement(instance) && !isSVGSVGElement(instance);
			this.instance = instance;
			const { layoutId, layout, visualElement } = this.options;
			if (visualElement && !visualElement.current) visualElement.mount(instance);
			this.root.nodes.add(this);
			this.parent && this.parent.children.add(this);
			if (this.root.hasTreeAnimated && (layout || layoutId)) this.isLayoutDirty = true;
			if (attachResizeListener) {
				let cancelDelay;
				let innerWidth = 0;
				const resizeUnblockUpdate = () => this.root.updateBlockedByResize = false;
				frame.read(() => {
					innerWidth = window.innerWidth;
				});
				attachResizeListener(instance, () => {
					const newInnerWidth = window.innerWidth;
					if (newInnerWidth === innerWidth) return;
					innerWidth = newInnerWidth;
					this.root.updateBlockedByResize = true;
					cancelDelay && cancelDelay();
					cancelDelay = delay(resizeUnblockUpdate, 250);
					if (globalProjectionState.hasAnimatedSinceResize) {
						globalProjectionState.hasAnimatedSinceResize = false;
						this.nodes.forEach(finishAnimation);
					}
				});
			}
			if (layoutId) this.root.registerSharedNode(layoutId, this);
			if (this.options.animate !== false && visualElement && (layoutId || layout)) this.addEventListener("didUpdate", ({ delta, hasLayoutChanged, hasRelativeLayoutChanged, layout: newLayout }) => {
				if (this.isTreeAnimationBlocked()) {
					this.target = void 0;
					this.relativeTarget = void 0;
					return;
				}
				const layoutTransition = this.options.transition || visualElement.getDefaultTransition() || defaultLayoutTransition;
				const { onLayoutAnimationStart, onLayoutAnimationComplete } = visualElement.getProps();
				/**
				* The target layout of the element might stay the same,
				* but its position relative to its parent has changed.
				*/
				const hasTargetChanged = !this.targetLayout || !boxEqualsRounded(this.targetLayout, newLayout);
				/**
				* If the layout hasn't seemed to have changed, it might be that the
				* element is visually in the same place in the document but its position
				* relative to its parent has indeed changed. So here we check for that.
				*/
				const hasOnlyRelativeTargetChanged = !hasLayoutChanged && hasRelativeLayoutChanged;
				if (this.options.layoutRoot || this.resumeFrom || hasOnlyRelativeTargetChanged || hasLayoutChanged && (hasTargetChanged || !this.currentAnimation)) {
					if (this.resumeFrom) {
						this.resumingFrom = this.resumeFrom;
						this.resumingFrom.resumingFrom = void 0;
					}
					const animationOptions = {
						...getValueTransition(layoutTransition, "layout"),
						onPlay: onLayoutAnimationStart,
						onComplete: onLayoutAnimationComplete
					};
					if (visualElement.shouldReduceMotion || this.options.layoutRoot) {
						animationOptions.delay = 0;
						animationOptions.type = false;
					}
					this.startAnimation(animationOptions);
					/**
					* Set animation origin after starting animation to avoid layout jump
					* caused by stopping previous layout animation
					*/
					this.setAnimationOrigin(delta, hasOnlyRelativeTargetChanged, animationOptions.path);
				} else {
					/**
					* If the layout hasn't changed and we have an animation that hasn't started yet,
					* finish it immediately. Otherwise it will be animating from a location
					* that was probably never committed to screen and look like a jumpy box.
					*/
					if (!hasLayoutChanged) finishAnimation(this);
					if (this.isLead() && this.options.onExitComplete) this.options.onExitComplete();
				}
				this.targetLayout = newLayout;
			});
		}
		unmount() {
			this.options.layoutId && this.willUpdate();
			this.root.nodes.remove(this);
			const stack = this.getStack();
			stack && stack.remove(this);
			this.parent && this.parent.children.delete(this);
			this.instance = void 0;
			this.eventHandlers.clear();
			cancelFrame(this.updateProjection);
		}
		blockUpdate() {
			this.updateManuallyBlocked = true;
		}
		unblockUpdate() {
			this.updateManuallyBlocked = false;
		}
		isUpdateBlocked() {
			return this.updateManuallyBlocked || this.updateBlockedByResize;
		}
		isTreeAnimationBlocked() {
			return this.isAnimationBlocked || this.parent && this.parent.isTreeAnimationBlocked() || false;
		}
		startUpdate() {
			if (this.isUpdateBlocked()) return;
			this.isUpdating = true;
			this.nodes && this.nodes.forEach(resetSkewAndRotation);
			this.animationId++;
		}
		getTransformTemplate() {
			const { visualElement } = this.options;
			return visualElement && visualElement.getProps().transformTemplate;
		}
		willUpdate(shouldNotifyListeners = true) {
			this.root.hasTreeAnimated = true;
			if (this.root.isUpdateBlocked()) {
				this.options.onExitComplete && this.options.onExitComplete();
				return;
			}
			/**
			* If we're running optimised appear animations then these must be
			* cancelled before measuring the DOM. This is so we can measure
			* the true layout of the element rather than the WAAPI animation
			* which will be unaffected by the resetSkewAndRotate step.
			*
			* Note: This is a DOM write. Worst case scenario is this is sandwiched
			* between other snapshot reads which will cause unnecessary style recalculations.
			* This has to happen here though, as we don't yet know which nodes will need
			* snapshots in startUpdate(), but we only want to cancel optimised animations
			* if a layout animation measurement is actually going to be affected by them.
			*/
			if (window.MotionCancelOptimisedAnimation && !this.hasCheckedOptimisedAppear) cancelTreeOptimisedTransformAnimations(this);
			!this.root.isUpdating && this.root.startUpdate();
			if (this.isLayoutDirty) return;
			this.isLayoutDirty = true;
			for (let i = 0; i < this.path.length; i++) {
				const node = this.path[i];
				node.shouldResetTransform = true;
				/**
				* Percentage translates resolve against layoutBox dimensions,
				* so ancestors with them must be re-measured after transform reset.
				*/
				if (typeof node.latestValues.x === "string" || typeof node.latestValues.y === "string") node.isLayoutDirty = true;
				node.updateScroll("snapshot");
				if (node.options.layoutRoot) node.willUpdate(false);
			}
			const { layoutId, layout } = this.options;
			if (layoutId === void 0 && !layout) return;
			const transformTemplate = this.getTransformTemplate();
			this.prevTransformTemplateValue = transformTemplate ? transformTemplate(this.latestValues, "") : void 0;
			this.updateSnapshot();
			shouldNotifyListeners && this.notifyListeners("willUpdate");
		}
		update() {
			this.updateScheduled = false;
			if (this.isUpdateBlocked()) {
				const wasBlockedByResize = this.updateBlockedByResize;
				this.unblockUpdate();
				this.updateBlockedByResize = false;
				this.clearAllSnapshots();
				/**
				* When blocked by resize, still measure layouts so
				* callbacks like onLayoutMeasure fire (e.g. Reorder).
				* Skip notifyLayoutUpdate to prevent animations.
				*/
				if (wasBlockedByResize) this.nodes.forEach(forceLayoutMeasure);
				this.nodes.forEach(clearMeasurements);
				return;
			}
			/**
			* If this is a repeat of didUpdate then ignore the animation.
			*/
			if (this.animationId <= this.animationCommitId) {
				this.nodes.forEach(clearIsLayoutDirty);
				return;
			}
			this.animationCommitId = this.animationId;
			if (!this.isUpdating) this.nodes.forEach(clearIsLayoutDirty);
			else {
				this.isUpdating = false;
				/**
				* Ensure animation-blocked nodes (e.g. during drag)
				* get measured even when memoized (willUpdate skipped).
				*/
				this.nodes.forEach(ensureDraggedNodesSnapshotted);
				/**
				* Write
				*/
				this.nodes.forEach(resetTransformStyle);
				/**
				* Read ==================
				*/
				this.nodes.forEach(updateLayout);
				/**
				* Write
				*/
				this.nodes.forEach(notifyLayoutUpdate);
			}
			this.clearAllSnapshots();
			/**
			* Manually flush any pending updates. Ideally
			* we could leave this to the following requestAnimationFrame but this seems
			* to leave a flash of incorrectly styled content.
			*/
			const now = time.now();
			frameData.delta = clamp(0, 1e3 / 60, now - frameData.timestamp);
			frameData.timestamp = now;
			frameData.isProcessing = true;
			frameSteps.update.process(frameData);
			frameSteps.preRender.process(frameData);
			frameSteps.render.process(frameData);
			frameData.isProcessing = false;
		}
		didUpdate() {
			if (!this.updateScheduled) {
				this.updateScheduled = true;
				microtask.read(this.scheduleUpdate);
			}
		}
		clearAllSnapshots() {
			this.nodes.forEach(clearSnapshot);
			this.sharedNodes.forEach(removeLeadSnapshots);
		}
		scheduleUpdateProjection() {
			if (!this.projectionUpdateScheduled) {
				this.projectionUpdateScheduled = true;
				frame.preRender(this.updateProjection, false, true);
			}
		}
		scheduleCheckAfterUnmount() {
			/**
			* If the unmounting node is in a layoutGroup and did trigger a willUpdate,
			* we manually call didUpdate to give a chance to the siblings to animate.
			* Otherwise, cleanup all snapshots to prevents future nodes from reusing them.
			*/
			frame.postRender(() => {
				if (this.isLayoutDirty) this.root.didUpdate();
				else this.root.checkUpdateFailed();
			});
		}
		/**
		* Update measurements
		*/
		updateSnapshot() {
			if (this.snapshot || !this.instance) return;
			this.snapshot = this.measure();
			if (this.snapshot && !calcLength(this.snapshot.measuredBox.x) && !calcLength(this.snapshot.measuredBox.y)) this.snapshot = void 0;
		}
		updateLayout() {
			if (!this.instance) return;
			this.updateScroll();
			if (!(this.options.alwaysMeasureLayout && this.isLead()) && !this.isLayoutDirty) return;
			/**
			* When a node is mounted, it simply resumes from the prevLead's
			* snapshot instead of taking a new one, but the ancestors scroll
			* might have updated while the prevLead is unmounted. We need to
			* update the scroll again to make sure the layout we measure is
			* up to date.
			*/
			if (this.resumeFrom && !this.resumeFrom.instance) for (let i = 0; i < this.path.length; i++) this.path[i].updateScroll();
			const prevLayout = this.layout;
			this.layout = this.measure(false);
			this.layoutVersion++;
			if (!this.layoutCorrected) this.layoutCorrected = createBox();
			this.isLayoutDirty = false;
			this.projectionDelta = void 0;
			this.notifyListeners("measure", this.layout.layoutBox);
			const { visualElement } = this.options;
			visualElement && visualElement.notify("LayoutMeasure", this.layout.layoutBox, prevLayout ? prevLayout.layoutBox : void 0);
		}
		updateScroll(phase = "measure") {
			let needsMeasurement = Boolean(this.options.layoutScroll && this.instance);
			if (this.scroll && this.scroll.animationId === this.root.animationId && this.scroll.phase === phase) needsMeasurement = false;
			if (needsMeasurement && this.instance) {
				const isRoot = checkIsScrollRoot(this.instance);
				this.scroll = {
					animationId: this.root.animationId,
					phase,
					isRoot,
					offset: measureScroll(this.instance),
					wasRoot: this.scroll ? this.scroll.isRoot : isRoot
				};
			}
		}
		resetTransform() {
			if (!resetTransform) return;
			const isResetRequested = this.isLayoutDirty || this.shouldResetTransform || this.options.alwaysMeasureLayout;
			const hasProjection = this.projectionDelta && !isDeltaZero(this.projectionDelta);
			const transformTemplate = this.getTransformTemplate();
			const transformTemplateValue = transformTemplate ? transformTemplate(this.latestValues, "") : void 0;
			const transformTemplateHasChanged = transformTemplateValue !== this.prevTransformTemplateValue;
			if (isResetRequested && this.instance && (hasProjection || hasTransform(this.latestValues) || transformTemplateHasChanged)) {
				resetTransform(this.instance, transformTemplateValue);
				this.shouldResetTransform = false;
				this.scheduleRender();
			}
		}
		measure(removeTransform = true) {
			const pageBox = this.measurePageBox();
			let layoutBox = this.removeElementScroll(pageBox);
			/**
			* Measurements taken during the pre-render stage
			* still have transforms applied so we remove them
			* via calculation.
			*/
			if (removeTransform) layoutBox = this.removeTransform(layoutBox);
			roundBox(layoutBox);
			return {
				animationId: this.root.animationId,
				measuredBox: pageBox,
				layoutBox,
				latestValues: {},
				source: this.id
			};
		}
		measurePageBox() {
			const { visualElement } = this.options;
			if (!visualElement) return createBox();
			const box = visualElement.measureViewportBox();
			if (!(this.scroll?.wasRoot || this.path.some(checkNodeWasScrollRoot))) {
				const { scroll } = this.root;
				if (scroll) {
					translateAxis(box.x, scroll.offset.x);
					translateAxis(box.y, scroll.offset.y);
				}
			}
			return box;
		}
		removeElementScroll(box) {
			const boxWithoutScroll = createBox();
			copyBoxInto(boxWithoutScroll, box);
			if (this.scroll?.wasRoot) return boxWithoutScroll;
			/**
			* Performance TODO: Keep a cumulative scroll offset down the tree
			* rather than loop back up the path.
			*/
			for (let i = 0; i < this.path.length; i++) {
				const node = this.path[i];
				const { scroll, options } = node;
				if (node !== this.root && scroll && options.layoutScroll) {
					/**
					* If this is a new scroll root, we want to remove all previous scrolls
					* from the viewport box.
					*/
					if (scroll.wasRoot) copyBoxInto(boxWithoutScroll, box);
					translateAxis(boxWithoutScroll.x, scroll.offset.x);
					translateAxis(boxWithoutScroll.y, scroll.offset.y);
				}
			}
			return boxWithoutScroll;
		}
		applyTransform(box, transformOnly = false, output) {
			const withTransforms = output || createBox();
			copyBoxInto(withTransforms, box);
			for (let i = 0; i < this.path.length; i++) {
				const node = this.path[i];
				if (!transformOnly && node.options.layoutScroll && node.scroll && node !== node.root) {
					translateAxis(withTransforms.x, -node.scroll.offset.x);
					translateAxis(withTransforms.y, -node.scroll.offset.y);
				}
				if (!hasTransform(node.latestValues)) continue;
				transformBox(withTransforms, node.latestValues, node.layout?.layoutBox);
			}
			if (hasTransform(this.latestValues)) transformBox(withTransforms, this.latestValues, this.layout?.layoutBox);
			return withTransforms;
		}
		removeTransform(box) {
			const boxWithoutTransform = createBox();
			copyBoxInto(boxWithoutTransform, box);
			for (let i = 0; i < this.path.length; i++) {
				const node = this.path[i];
				if (!hasTransform(node.latestValues)) continue;
				let sourceBox;
				if (node.instance) {
					hasScale(node.latestValues) && node.updateSnapshot();
					sourceBox = createBox();
					copyBoxInto(sourceBox, node.measurePageBox());
				}
				removeBoxTransforms(boxWithoutTransform, node.latestValues, node.snapshot?.layoutBox, sourceBox);
			}
			if (hasTransform(this.latestValues)) removeBoxTransforms(boxWithoutTransform, this.latestValues);
			return boxWithoutTransform;
		}
		setTargetDelta(delta) {
			this.targetDelta = delta;
			this.root.scheduleUpdateProjection();
			this.isProjectionDirty = true;
		}
		setOptions(options) {
			this.options = {
				...this.options,
				...options,
				crossfade: options.crossfade !== void 0 ? options.crossfade : true
			};
		}
		clearMeasurements() {
			this.scroll = void 0;
			this.layout = void 0;
			this.snapshot = void 0;
			this.prevTransformTemplateValue = void 0;
			this.targetDelta = void 0;
			this.target = void 0;
			this.isLayoutDirty = false;
		}
		forceRelativeParentToResolveTarget() {
			if (!this.relativeParent) return;
			/**
			* If the parent target isn't up-to-date, force it to update.
			* This is an unfortunate de-optimisation as it means any updating relative
			* projection will cause all the relative parents to recalculate back
			* up the tree.
			*/
			if (this.relativeParent.resolvedRelativeTargetAt !== frameData.timestamp) this.relativeParent.resolveTargetDelta(true);
		}
		resolveTargetDelta(forceRecalculation = false) {
			/**
			* Once the dirty status of nodes has been spread through the tree, we also
			* need to check if we have a shared node of a different depth that has itself
			* been dirtied.
			*/
			const lead = this.getLead();
			this.isProjectionDirty || (this.isProjectionDirty = lead.isProjectionDirty);
			this.isTransformDirty || (this.isTransformDirty = lead.isTransformDirty);
			this.isSharedProjectionDirty || (this.isSharedProjectionDirty = lead.isSharedProjectionDirty);
			const isShared = Boolean(this.resumingFrom) || this !== lead;
			if (!(forceRecalculation || isShared && this.isSharedProjectionDirty || this.isProjectionDirty || this.parent?.isProjectionDirty || this.attemptToResolveRelativeTarget || this.root.updateBlockedByResize)) return;
			const { layout, layoutId } = this.options;
			/**
			* If we have no layout, we can't perform projection, so early return
			*/
			if (!this.layout || !(layout || layoutId)) return;
			this.resolvedRelativeTargetAt = frameData.timestamp;
			const relativeParent = this.getClosestProjectingParent();
			if (relativeParent && this.linkedParentVersion !== relativeParent.layoutVersion && !relativeParent.options.layoutRoot) this.removeRelativeTarget();
			/**
			* If we don't have a targetDelta but do have a layout, we can attempt to resolve
			* a relativeParent. This will allow a component to perform scale correction
			* even if no animation has started.
			*/
			if (!this.targetDelta && !this.relativeTarget) {
				if (this.options.layoutAnchor !== false && relativeParent && relativeParent.layout) this.createRelativeTarget(relativeParent, this.layout.layoutBox, relativeParent.layout.layoutBox);
				else this.removeRelativeTarget();
			}
			/**
			* If we have no relative target or no target delta our target isn't valid
			* for this frame.
			*/
			if (!this.relativeTarget && !this.targetDelta) return;
			/**
			* Lazy-init target data structure
			*/
			if (!this.target) {
				this.target = createBox();
				this.targetWithTransforms = createBox();
			}
			/**
			* If we've got a relative box for this component, resolve it into a target relative to the parent.
			*/
			if (this.relativeTarget && this.relativeTargetOrigin && this.relativeParent && this.relativeParent.target) {
				this.forceRelativeParentToResolveTarget();
				calcRelativeBox(this.target, this.relativeTarget, this.relativeParent.target, this.options.layoutAnchor || void 0);
			} else if (this.targetDelta) {
				if (Boolean(this.resumingFrom)) this.applyTransform(this.layout.layoutBox, false, this.target);
				else copyBoxInto(this.target, this.layout.layoutBox);
				applyBoxDelta(this.target, this.targetDelta);
			} else
 /**
			* If no target, use own layout as target
			*/
			copyBoxInto(this.target, this.layout.layoutBox);
			/**
			* If we've been told to attempt to resolve a relative target, do so.
			*/
			if (this.attemptToResolveRelativeTarget) {
				this.attemptToResolveRelativeTarget = false;
				if (this.options.layoutAnchor !== false && relativeParent && Boolean(relativeParent.resumingFrom) === Boolean(this.resumingFrom) && !relativeParent.options.layoutScroll && relativeParent.target && this.animationProgress !== 1) this.createRelativeTarget(relativeParent, this.target, relativeParent.target);
				else this.relativeParent = this.relativeTarget = void 0;
			}
			/**
			* Increase debug counter for resolved target deltas
			*/
			if (statsBuffer.value) metrics.calculatedTargetDeltas++;
		}
		getClosestProjectingParent() {
			if (!this.parent || hasScale(this.parent.latestValues) || has2DTranslate(this.parent.latestValues)) return;
			if (this.parent.isProjecting()) return this.parent;
			else return this.parent.getClosestProjectingParent();
		}
		isProjecting() {
			return Boolean((this.relativeTarget || this.targetDelta || this.options.layoutRoot) && this.layout);
		}
		createRelativeTarget(relativeParent, layout, parentLayout) {
			this.relativeParent = relativeParent;
			this.linkedParentVersion = relativeParent.layoutVersion;
			this.forceRelativeParentToResolveTarget();
			this.relativeTarget = createBox();
			this.relativeTargetOrigin = createBox();
			calcRelativePosition(this.relativeTargetOrigin, layout, parentLayout, this.options.layoutAnchor || void 0);
			copyBoxInto(this.relativeTarget, this.relativeTargetOrigin);
		}
		removeRelativeTarget() {
			this.relativeParent = this.relativeTarget = void 0;
		}
		calcProjection() {
			const lead = this.getLead();
			const isShared = Boolean(this.resumingFrom) || this !== lead;
			let canSkip = true;
			/**
			* If this is a normal layout animation and neither this node nor its nearest projecting
			* is dirty then we can't skip.
			*/
			if (this.isProjectionDirty || this.parent?.isProjectionDirty) canSkip = false;
			/**
			* If this is a shared layout animation and this node's shared projection is dirty then
			* we can't skip.
			*/
			if (isShared && (this.isSharedProjectionDirty || this.isTransformDirty)) canSkip = false;
			/**
			* If we have resolved the target this frame we must recalculate the
			* projection to ensure it visually represents the internal calculations.
			*/
			if (this.resolvedRelativeTargetAt === frameData.timestamp) canSkip = false;
			if (canSkip) return;
			const { layout, layoutId } = this.options;
			/**
			* If this section of the tree isn't animating we can
			* delete our target sources for the following frame.
			*/
			this.isTreeAnimating = Boolean(this.parent && this.parent.isTreeAnimating || this.currentAnimation || this.pendingAnimation);
			if (!this.isTreeAnimating) this.targetDelta = this.relativeTarget = void 0;
			if (!this.layout || !(layout || layoutId)) return;
			/**
			* Reset the corrected box with the latest values from box, as we're then going
			* to perform mutative operations on it.
			*/
			copyBoxInto(this.layoutCorrected, this.layout.layoutBox);
			/**
			* Record previous tree scales before updating.
			*/
			const prevTreeScaleX = this.treeScale.x;
			const prevTreeScaleY = this.treeScale.y;
			/**
			* Apply all the parent deltas to this box to produce the corrected box. This
			* is the layout box, as it will appear on screen as a result of the transforms of its parents.
			*/
			applyTreeDeltas(this.layoutCorrected, this.treeScale, this.path, isShared);
			/**
			* If this layer needs to perform scale correction but doesn't have a target,
			* use the layout as the target.
			*/
			if (lead.layout && !lead.target && (this.treeScale.x !== 1 || this.treeScale.y !== 1)) {
				lead.target = lead.layout.layoutBox;
				lead.targetWithTransforms = createBox();
			}
			const { target } = lead;
			if (!target) {
				/**
				* If we don't have a target to project into, but we were previously
				* projecting, we want to remove the stored transform and schedule
				* a render to ensure the elements reflect the removed transform.
				*/
				if (this.prevProjectionDelta) {
					this.createProjectionDeltas();
					this.scheduleRender();
				}
				return;
			}
			if (!this.projectionDelta || !this.prevProjectionDelta) this.createProjectionDeltas();
			else {
				copyAxisDeltaInto(this.prevProjectionDelta.x, this.projectionDelta.x);
				copyAxisDeltaInto(this.prevProjectionDelta.y, this.projectionDelta.y);
			}
			/**
			* Update the delta between the corrected box and the target box before user-set transforms were applied.
			* This will allow us to calculate the corrected borderRadius and boxShadow to compensate
			* for our layout reprojection, but still allow them to be scaled correctly by the user.
			* It might be that to simplify this we may want to accept that user-set scale is also corrected
			* and we wouldn't have to keep and calc both deltas, OR we could support a user setting
			* to allow people to choose whether these styles are corrected based on just the
			* layout reprojection or the final bounding box.
			*/
			calcBoxDelta(this.projectionDelta, this.layoutCorrected, target, this.latestValues);
			if (this.treeScale.x !== prevTreeScaleX || this.treeScale.y !== prevTreeScaleY || !axisDeltaEquals(this.projectionDelta.x, this.prevProjectionDelta.x) || !axisDeltaEquals(this.projectionDelta.y, this.prevProjectionDelta.y)) {
				this.hasProjected = true;
				this.scheduleRender();
				this.notifyListeners("projectionUpdate", target);
			}
			/**
			* Increase debug counter for recalculated projections
			*/
			if (statsBuffer.value) metrics.calculatedProjections++;
		}
		hide() {
			this.isVisible = false;
		}
		show() {
			this.isVisible = true;
		}
		scheduleRender(notifyAll = true) {
			this.options.visualElement?.scheduleRender();
			if (notifyAll) {
				const stack = this.getStack();
				stack && stack.scheduleRender();
			}
			if (this.resumingFrom && !this.resumingFrom.instance) this.resumingFrom = void 0;
		}
		createProjectionDeltas() {
			this.prevProjectionDelta = createDelta();
			this.projectionDelta = createDelta();
			this.projectionDeltaWithTransform = createDelta();
		}
		setAnimationOrigin(delta, hasOnlyRelativeTargetChanged = false, pathFn) {
			const snapshot = this.snapshot;
			const snapshotLatestValues = snapshot ? snapshot.latestValues : {};
			const mixedValues = { ...this.latestValues };
			const targetDelta = createDelta();
			if (!this.relativeParent || !this.relativeParent.options.layoutRoot) this.relativeTarget = this.relativeTargetOrigin = void 0;
			this.attemptToResolveRelativeTarget = !hasOnlyRelativeTargetChanged;
			const relativeLayout = createBox();
			const isSharedLayoutAnimation = (snapshot ? snapshot.source : void 0) !== (this.layout ? this.layout.source : void 0);
			const stack = this.getStack();
			const isOnlyMember = !stack || stack.members.length <= 1;
			const shouldCrossfadeOpacity = Boolean(isSharedLayoutAnimation && !isOnlyMember && this.options.crossfade === true && !this.path.some(hasOpacityCrossfade));
			this.animationProgress = 0;
			let prevRelativeTarget;
			const interpolate = pathFn?.interpolateProjection(delta);
			this.mixTargetDelta = (latest) => {
				const progress = latest / 1e3;
				const point = interpolate?.(progress);
				if (point) {
					targetDelta.x.translate = point.x;
					targetDelta.x.scale = mixNumber(delta.x.scale, 1, progress);
					targetDelta.x.origin = delta.x.origin;
					targetDelta.x.originPoint = delta.x.originPoint;
					targetDelta.y.translate = point.y;
					targetDelta.y.scale = mixNumber(delta.y.scale, 1, progress);
					targetDelta.y.origin = delta.y.origin;
					targetDelta.y.originPoint = delta.y.originPoint;
				} else {
					mixAxisDeltaLinear(targetDelta.x, delta.x, progress);
					mixAxisDeltaLinear(targetDelta.y, delta.y, progress);
				}
				this.setTargetDelta(targetDelta);
				if (this.relativeTarget && this.relativeTargetOrigin && this.layout && this.relativeParent && this.relativeParent.layout) {
					calcRelativePosition(relativeLayout, this.layout.layoutBox, this.relativeParent.layout.layoutBox, this.options.layoutAnchor || void 0);
					mixBox(this.relativeTarget, this.relativeTargetOrigin, relativeLayout, progress);
					/**
					* If this is an unchanged relative target we can consider the
					* projection not dirty.
					*/
					if (prevRelativeTarget && boxEquals(this.relativeTarget, prevRelativeTarget)) this.isProjectionDirty = false;
					if (!prevRelativeTarget) prevRelativeTarget = createBox();
					copyBoxInto(prevRelativeTarget, this.relativeTarget);
				}
				if (isSharedLayoutAnimation) {
					this.animationValues = mixedValues;
					mixValues(mixedValues, snapshotLatestValues, this.latestValues, progress, shouldCrossfadeOpacity, isOnlyMember);
				}
				if (point && point.rotate !== void 0) {
					if (!this.animationValues) this.animationValues = mixedValues;
					this.animationValues.pathRotation = point.rotate;
				}
				this.root.scheduleUpdateProjection();
				this.scheduleRender();
				this.animationProgress = progress;
			};
			this.mixTargetDelta(this.options.layoutRoot ? 1e3 : 0);
		}
		startAnimation(options) {
			this.notifyListeners("animationStart");
			this.currentAnimation?.stop();
			this.resumingFrom?.currentAnimation?.stop();
			if (this.pendingAnimation) {
				cancelFrame(this.pendingAnimation);
				this.pendingAnimation = void 0;
			}
			/**
			* Start the animation in the next frame to have a frame with progress 0,
			* where the target is the same as when the animation started, so we can
			* calculate the relative positions correctly for instant transitions.
			*/
			this.pendingAnimation = frame.update(() => {
				globalProjectionState.hasAnimatedSinceResize = true;
				this.motionValue || (this.motionValue = motionValue(0));
				this.motionValue.jump(0, false);
				this.currentAnimation = animateSingleValue(this.motionValue, [0, 1e3], {
					...options,
					velocity: 0,
					isSync: true,
					onUpdate: (latest) => {
						this.mixTargetDelta(latest);
						options.onUpdate && options.onUpdate(latest);
					},
					onComplete: () => {
						options.onComplete && options.onComplete();
						this.completeAnimation();
					}
				});
				if (this.resumingFrom) this.resumingFrom.currentAnimation = this.currentAnimation;
				this.pendingAnimation = void 0;
			});
		}
		completeAnimation() {
			if (this.resumingFrom) {
				this.resumingFrom.currentAnimation = void 0;
				this.resumingFrom.preserveOpacity = void 0;
			}
			const stack = this.getStack();
			stack && stack.exitAnimationComplete();
			this.resumingFrom = this.currentAnimation = this.animationValues = void 0;
			this.notifyListeners("animationComplete");
		}
		finishAnimation() {
			if (this.currentAnimation) {
				this.mixTargetDelta && this.mixTargetDelta(animationTarget);
				this.currentAnimation.stop();
			}
			this.completeAnimation();
		}
		applyTransformsToTarget() {
			const lead = this.getLead();
			let { targetWithTransforms, target, layout, latestValues } = lead;
			if (!targetWithTransforms || !target || !layout) return;
			/**
			* If we're only animating position, and this element isn't the lead element,
			* then instead of projecting into the lead box we instead want to calculate
			* a new target that aligns the two boxes but maintains the layout shape.
			*/
			if (this !== lead && this.layout && layout && shouldAnimatePositionOnly(this.options.animationType, this.layout.layoutBox, layout.layoutBox)) {
				target = this.target || createBox();
				const xLength = calcLength(this.layout.layoutBox.x);
				target.x.min = lead.target.x.min;
				target.x.max = target.x.min + xLength;
				const yLength = calcLength(this.layout.layoutBox.y);
				target.y.min = lead.target.y.min;
				target.y.max = target.y.min + yLength;
			}
			copyBoxInto(targetWithTransforms, target);
			/**
			* Apply the latest user-set transforms to the targetBox to produce the targetBoxFinal.
			* This is the final box that we will then project into by calculating a transform delta and
			* applying it to the corrected box.
			*/
			transformBox(targetWithTransforms, latestValues);
			/**
			* Update the delta between the corrected box and the final target box, after
			* user-set transforms are applied to it. This will be used by the renderer to
			* create a transform style that will reproject the element from its layout layout
			* into the desired bounding box.
			*/
			calcBoxDelta(this.projectionDeltaWithTransform, this.layoutCorrected, targetWithTransforms, latestValues);
		}
		registerSharedNode(layoutId, node) {
			if (!this.sharedNodes.has(layoutId)) this.sharedNodes.set(layoutId, new NodeStack());
			this.sharedNodes.get(layoutId).add(node);
			const config = node.options.initialPromotionConfig;
			node.promote({
				transition: config ? config.transition : void 0,
				preserveFollowOpacity: config && config.shouldPreserveFollowOpacity ? config.shouldPreserveFollowOpacity(node) : void 0
			});
		}
		isLead() {
			const stack = this.getStack();
			return stack ? stack.lead === this : true;
		}
		getLead() {
			const { layoutId } = this.options;
			return layoutId ? this.getStack()?.lead || this : this;
		}
		getPrevLead() {
			const { layoutId } = this.options;
			return layoutId ? this.getStack()?.prevLead : void 0;
		}
		getStack() {
			const { layoutId } = this.options;
			if (layoutId) return this.root.sharedNodes.get(layoutId);
		}
		promote({ needsReset, transition, preserveFollowOpacity } = {}) {
			const stack = this.getStack();
			if (stack) stack.promote(this, preserveFollowOpacity);
			if (needsReset) {
				this.projectionDelta = void 0;
				this.needsReset = true;
			}
			if (transition) this.setOptions({ transition });
		}
		relegate() {
			const stack = this.getStack();
			if (stack) return stack.relegate(this);
			else return false;
		}
		resetSkewAndRotation() {
			const { visualElement } = this.options;
			if (!visualElement) return;
			let hasDistortingTransform = false;
			/**
			* An unrolled check for rotation values. Most elements don't have any rotation and
			* skipping the nested loop and new object creation is 50% faster.
			*/
			const { latestValues } = visualElement;
			if (latestValues.z || latestValues.rotate || latestValues.rotateX || latestValues.rotateY || latestValues.rotateZ || latestValues.skewX || latestValues.skewY) hasDistortingTransform = true;
			if (!hasDistortingTransform) return;
			const resetValues = {};
			if (latestValues.z) resetDistortingTransform("z", visualElement, resetValues, this.animationValues);
			for (let i = 0; i < transformAxes.length; i++) {
				resetDistortingTransform(`rotate${transformAxes[i]}`, visualElement, resetValues, this.animationValues);
				resetDistortingTransform(`skew${transformAxes[i]}`, visualElement, resetValues, this.animationValues);
			}
			visualElement.render();
			for (const key in resetValues) {
				visualElement.setStaticValue(key, resetValues[key]);
				if (this.animationValues) this.animationValues[key] = resetValues[key];
			}
			visualElement.scheduleRender();
		}
		applyProjectionStyles(targetStyle, styleProp) {
			if (!this.instance || this.isSVG) return;
			if (!this.isVisible) {
				targetStyle.visibility = "hidden";
				return;
			}
			const transformTemplate = this.getTransformTemplate();
			if (this.needsReset) {
				this.needsReset = false;
				targetStyle.visibility = "";
				targetStyle.opacity = "";
				targetStyle.pointerEvents = resolveMotionValue(styleProp?.pointerEvents) || "";
				targetStyle.transform = transformTemplate ? transformTemplate(this.latestValues, "") : "none";
				return;
			}
			const lead = this.getLead();
			if (!this.projectionDelta || !this.layout || !lead.target) {
				if (this.options.layoutId) {
					targetStyle.opacity = this.latestValues.opacity !== void 0 ? this.latestValues.opacity : 1;
					targetStyle.pointerEvents = resolveMotionValue(styleProp?.pointerEvents) || "";
				}
				if (this.hasProjected && !hasTransform(this.latestValues)) {
					targetStyle.transform = transformTemplate ? transformTemplate({}, "") : "none";
					this.hasProjected = false;
				}
				return;
			}
			targetStyle.visibility = "";
			const valuesToRender = lead.animationValues || lead.latestValues;
			this.applyTransformsToTarget();
			let transform = buildProjectionTransform(this.projectionDeltaWithTransform, this.treeScale, valuesToRender);
			if (transformTemplate) transform = transformTemplate(valuesToRender, transform);
			targetStyle.transform = transform;
			const { x, y } = this.projectionDelta;
			targetStyle.transformOrigin = `${x.origin * 100}% ${y.origin * 100}% 0`;
			if (lead.animationValues)
 /**
			* If the lead component is animating, assign this either the entering/leaving
			* opacity
			*/
			targetStyle.opacity = lead === this ? valuesToRender.opacity ?? this.latestValues.opacity ?? 1 : this.preserveOpacity ? this.latestValues.opacity : valuesToRender.opacityExit;
			else
 /**
			* Or we're not animating at all, set the lead component to its layout
			* opacity and other components to hidden.
			*/
			targetStyle.opacity = lead === this ? valuesToRender.opacity !== void 0 ? valuesToRender.opacity : "" : valuesToRender.opacityExit !== void 0 ? valuesToRender.opacityExit : 0;
			/**
			* Apply scale correction
			*/
			for (const key in scaleCorrectors) {
				if (valuesToRender[key] === void 0) continue;
				const { correct, applyTo, isCSSVariable } = scaleCorrectors[key];
				/**
				* Only apply scale correction to the value if we have an
				* active projection transform. Otherwise these values become
				* vulnerable to distortion if the element changes size without
				* a corresponding layout animation.
				*/
				const corrected = transform === "none" ? valuesToRender[key] : correct(valuesToRender[key], lead);
				if (applyTo) {
					const num = applyTo.length;
					for (let i = 0; i < num; i++) targetStyle[applyTo[i]] = corrected;
				} else if (isCSSVariable) this.options.visualElement.renderState.vars[key] = corrected;
				else targetStyle[key] = corrected;
			}
			/**
			* Disable pointer events on follow components. This is to ensure
			* that if a follow component covers a lead component it doesn't block
			* pointer events on the lead.
			*/
			if (this.options.layoutId) targetStyle.pointerEvents = lead === this ? resolveMotionValue(styleProp?.pointerEvents) || "" : "none";
		}
		clearSnapshot() {
			this.resumeFrom = this.snapshot = void 0;
		}
		resetTree() {
			this.root.nodes.forEach((node) => node.currentAnimation?.stop());
			this.root.nodes.forEach(clearMeasurements);
			this.root.sharedNodes.clear();
		}
	};
}
function updateLayout(node) {
	node.updateLayout();
}
function notifyLayoutUpdate(node) {
	const snapshot = node.resumeFrom?.snapshot || node.snapshot;
	if (node.isLead() && node.layout && snapshot && node.hasListeners("didUpdate")) {
		const { layoutBox: layout, measuredBox: measuredLayout } = node.layout;
		const { animationType } = node.options;
		const isShared = snapshot.source !== node.layout.source;
		if (animationType === "size") eachAxis((axis) => {
			const axisSnapshot = isShared ? snapshot.measuredBox[axis] : snapshot.layoutBox[axis];
			const length = calcLength(axisSnapshot);
			axisSnapshot.min = layout[axis].min;
			axisSnapshot.max = axisSnapshot.min + length;
		});
		else if (animationType === "x" || animationType === "y") {
			const snapAxis = animationType === "x" ? "y" : "x";
			copyAxisInto(isShared ? snapshot.measuredBox[snapAxis] : snapshot.layoutBox[snapAxis], layout[snapAxis]);
		} else if (shouldAnimatePositionOnly(animationType, snapshot.layoutBox, layout)) eachAxis((axis) => {
			const axisSnapshot = isShared ? snapshot.measuredBox[axis] : snapshot.layoutBox[axis];
			const length = calcLength(layout[axis]);
			axisSnapshot.max = axisSnapshot.min + length;
			/**
			* Ensure relative target gets resized and rerendererd
			*/
			if (node.relativeTarget && !node.currentAnimation) {
				node.isProjectionDirty = true;
				node.relativeTarget[axis].max = node.relativeTarget[axis].min + length;
			}
		});
		const layoutDelta = createDelta();
		calcBoxDelta(layoutDelta, layout, snapshot.layoutBox);
		const visualDelta = createDelta();
		if (isShared) calcBoxDelta(visualDelta, node.applyTransform(measuredLayout, true), snapshot.measuredBox);
		else calcBoxDelta(visualDelta, layout, snapshot.layoutBox);
		const hasLayoutChanged = !isDeltaZero(layoutDelta);
		let hasRelativeLayoutChanged = false;
		if (!node.resumeFrom) {
			const relativeParent = node.getClosestProjectingParent();
			/**
			* If the relativeParent is itself resuming from a different element then
			* the relative snapshot is not relavent
			*/
			if (relativeParent && !relativeParent.resumeFrom) {
				const { snapshot: parentSnapshot, layout: parentLayout } = relativeParent;
				if (parentSnapshot && parentLayout) {
					const anchor = node.options.layoutAnchor || void 0;
					const relativeSnapshot = createBox();
					calcRelativePosition(relativeSnapshot, snapshot.layoutBox, parentSnapshot.layoutBox, anchor);
					const relativeLayout = createBox();
					calcRelativePosition(relativeLayout, layout, parentLayout.layoutBox, anchor);
					if (!boxEqualsRounded(relativeSnapshot, relativeLayout)) hasRelativeLayoutChanged = true;
					if (relativeParent.options.layoutRoot) {
						node.relativeTarget = relativeLayout;
						node.relativeTargetOrigin = relativeSnapshot;
						node.relativeParent = relativeParent;
					}
				}
			}
		}
		node.notifyListeners("didUpdate", {
			layout,
			snapshot,
			delta: visualDelta,
			layoutDelta,
			hasLayoutChanged,
			hasRelativeLayoutChanged
		});
	} else if (node.isLead()) {
		const { onExitComplete } = node.options;
		onExitComplete && onExitComplete();
	}
	/**
	* Clearing transition
	* TODO: Investigate why this transition is being passed in as {type: false } from Framer
	* and why we need it at all
	*/
	node.options.transition = void 0;
}
function propagateDirtyNodes(node) {
	/**
	* Increase debug counter for nodes encountered this frame
	*/
	if (statsBuffer.value) metrics.nodes++;
	if (!node.parent) return;
	/**
	* If this node isn't projecting, propagate isProjectionDirty. It will have
	* no performance impact but it will allow the next child that *is* projecting
	* but *isn't* dirty to just check its parent to see if *any* ancestor needs
	* correcting.
	*/
	if (!node.isProjecting()) node.isProjectionDirty = node.parent.isProjectionDirty;
	/**
	* Propagate isSharedProjectionDirty and isTransformDirty
	* throughout the whole tree. A future revision can take another look at
	* this but for safety we still recalcualte shared nodes.
	*/
	node.isSharedProjectionDirty || (node.isSharedProjectionDirty = Boolean(node.isProjectionDirty || node.parent.isProjectionDirty || node.parent.isSharedProjectionDirty));
	node.isTransformDirty || (node.isTransformDirty = node.parent.isTransformDirty);
}
function cleanDirtyNodes(node) {
	node.isProjectionDirty = node.isSharedProjectionDirty = node.isTransformDirty = false;
}
function clearSnapshot(node) {
	node.clearSnapshot();
}
function clearMeasurements(node) {
	node.clearMeasurements();
}
function forceLayoutMeasure(node) {
	node.isLayoutDirty = true;
	node.updateLayout();
}
function clearIsLayoutDirty(node) {
	node.isLayoutDirty = false;
}
/**
* When a node is animation-blocked (e.g. during drag) and its component
* didn't re-render (memoized), willUpdate() is never called so there's
* no snapshot. Use the previous layout as a snapshot and mark dirty so
* resetTransform/updateLayout/notifyLayoutUpdate process it normally.
*/
function ensureDraggedNodesSnapshotted(node) {
	if (node.isAnimationBlocked && node.layout && !node.isLayoutDirty) {
		node.snapshot = node.layout;
		node.isLayoutDirty = true;
	}
}
function resetTransformStyle(node) {
	const { visualElement } = node.options;
	if (visualElement && visualElement.getProps().onBeforeLayoutMeasure) visualElement.notify("BeforeLayoutMeasure");
	node.resetTransform();
}
function finishAnimation(node) {
	node.finishAnimation();
	node.targetDelta = node.relativeTarget = node.target = void 0;
	node.isProjectionDirty = true;
}
function resolveTargetDelta(node) {
	node.resolveTargetDelta();
}
function calcProjection(node) {
	node.calcProjection();
}
function resetSkewAndRotation(node) {
	node.resetSkewAndRotation();
}
function removeLeadSnapshots(stack) {
	stack.removeLeadSnapshot();
}
function mixAxisDeltaLinear(output, delta, p) {
	output.translate = mixNumber(delta.translate, 0, p);
	output.scale = mixNumber(delta.scale, 1, p);
	output.origin = delta.origin;
	output.originPoint = delta.originPoint;
}
function mixAxis(output, from, to, p) {
	output.min = mixNumber(from.min, to.min, p);
	output.max = mixNumber(from.max, to.max, p);
}
function mixBox(output, from, to, p) {
	mixAxis(output.x, from.x, to.x, p);
	mixAxis(output.y, from.y, to.y, p);
}
function hasOpacityCrossfade(node) {
	return node.animationValues && node.animationValues.opacityExit !== void 0;
}
var defaultLayoutTransition = {
	duration: .45,
	ease: [
		.4,
		0,
		.1,
		1
	]
};
var userAgentContains = (string) => typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().includes(string);
/**
* Measured bounding boxes must be rounded in Safari and
* left untouched in Chrome, otherwise non-integer layouts within scaled-up elements
* can appear to jump.
*/
var roundPoint = userAgentContains("applewebkit/") && !userAgentContains("chrome/") ? Math.round : noop;
function roundAxis(axis) {
	axis.min = roundPoint(axis.min);
	axis.max = roundPoint(axis.max);
}
function roundBox(box) {
	roundAxis(box.x);
	roundAxis(box.y);
}
function shouldAnimatePositionOnly(animationType, snapshot, layout) {
	return animationType === "position" || animationType === "preserve-aspect" && !isNear(aspectRatio(snapshot), aspectRatio(layout), .2);
}
function checkNodeWasScrollRoot(node) {
	return node !== node.root && node.scroll?.wasRoot;
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/projection/node/DocumentProjectionNode.mjs
var DocumentProjectionNode = createProjectionNode({
	attachResizeListener: (ref, notify) => addDomEvent(ref, "resize", notify),
	measureScroll: () => ({
		x: document.documentElement.scrollLeft || document.body?.scrollLeft || 0,
		y: document.documentElement.scrollTop || document.body?.scrollTop || 0
	}),
	checkIsScrollRoot: () => true
});
//#endregion
//#region ../../node_modules/motion-dom/dist/es/projection/node/group.mjs
var notify = (node) => !node.isLayoutDirty && node.willUpdate(false);
function nodeGroup() {
	const nodes = /* @__PURE__ */ new Set();
	const subscriptions = /* @__PURE__ */ new WeakMap();
	const dirtyAll = () => nodes.forEach(notify);
	return {
		add: (node) => {
			nodes.add(node);
			subscriptions.set(node, node.addEventListener("willUpdate", dirtyAll));
		},
		remove: (node) => {
			nodes.delete(node);
			const unsubscribe = subscriptions.get(node);
			if (unsubscribe) {
				unsubscribe();
				subscriptions.delete(node);
			}
			dirtyAll();
		},
		dirty: dirtyAll
	};
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/projection/node/HTMLProjectionNode.mjs
var rootProjectionNode = { current: void 0 };
var HTMLProjectionNode = createProjectionNode({
	measureScroll: (instance) => ({
		x: instance.scrollLeft,
		y: instance.scrollTop
	}),
	defaultParent: () => {
		if (!rootProjectionNode.current) {
			const documentNode = new DocumentProjectionNode({});
			documentNode.mount(window);
			documentNode.setOptions({ layoutScroll: true });
			rootProjectionNode.current = documentNode;
		}
		return rootProjectionNode.current;
	},
	resetTransform: (instance, value) => {
		instance.style.transform = value !== void 0 ? value : "none";
	},
	checkIsScrollRoot: (instance) => Boolean(window.getComputedStyle(instance).position === "fixed")
});
//#endregion
//#region ../../node_modules/motion-dom/dist/es/layout/LayoutAnimationBuilder.mjs
var layoutSelector = "[data-layout],[data-layout-id]";
/**
* All imperatively-created projection nodes live in one persistent tree,
* shared across animateLayout() calls (and with any React-created nodes,
* via the singleton document root). Keyed by element for reuse.
*/
var layoutNodes = /* @__PURE__ */ new WeakMap();
/**
* Builders created within the same synchronous tick are flushed together
* as a single "commit": every node is snapshotted before any updateDom
* runs, mirroring React batching renders from different parts of the tree.
*/
var pendingBuilders;
function collectLayoutElements(scope) {
	const elements = [];
	if (scope instanceof HTMLElement && scope.matches(layoutSelector)) elements.push(scope);
	scope.querySelectorAll(layoutSelector).forEach((element) => {
		if (element instanceof HTMLElement) elements.push(element);
	});
	return elements;
}
/**
* Process any work scheduled on the frameloop now. A previous animation
* may have been seeked while paused (controls.time = x) without a frame
* having rendered it - we must materialise that state into the DOM
* before taking snapshots.
*/
function flushPendingFrame() {
	if (frameData.isProcessing) return;
	const now = time.now();
	frameData.delta = clamp(0, 1e3 / 60, now - frameData.timestamp);
	frameData.timestamp = now;
	frameData.isProcessing = true;
	frameSteps.update.process(frameData);
	frameSteps.preRender.process(frameData);
	frameSteps.render.process(frameData);
	frameData.isProcessing = false;
}
function getProjectionParent(element) {
	let ancestor = element.parentElement;
	while (ancestor) {
		const node = layoutNodes.get(ancestor);
		if (node && node.instance) return node;
		ancestor = ancestor.parentElement;
	}
}
function createVisualElement$1() {
	return new HTMLVisualElement({
		props: {},
		presenceContext: null,
		visualState: {
			latestValues: {},
			renderState: {
				transform: {},
				transformOrigin: {},
				style: {},
				vars: {}
			}
		}
	}, { allowProjection: true });
}
function readNodeOptions(element, transition) {
	const layoutAttr = element.getAttribute("data-layout");
	return {
		layoutId: element.getAttribute("data-layout-id") ?? void 0,
		layout: layoutAttr !== null ? true : void 0,
		animationType: !layoutAttr || layoutAttr === "true" ? "both" : layoutAttr,
		transition
	};
}
function prepareNode(element, transition) {
	let node = layoutNodes.get(element);
	if (!node) {
		let visualElement = visualElementStore.get(element);
		if (!visualElement) visualElement = createVisualElement$1();
		/**
		* A first-time element may carry a projection transform in its
		* inline style (e.g. it was cloned from an element mid-animation).
		* That transform isn't tracked in latestValues so the engine can't
		* reset it before measuring - clear it now so the first layout
		* measurement isn't inflated.
		*/
		if (element.style.transform && !hasTransform(visualElement.latestValues)) element.style.transform = "";
		node = new HTMLProjectionNode(visualElement.latestValues, getProjectionParent(element));
		visualElement.projection = node;
		node.setOptions({
			...readNodeOptions(element, transition),
			visualElement
		});
		node.mount(element);
		layoutNodes.set(element, node);
	} else node.setOptions(readNodeOptions(element, transition));
	node.isPresent = true;
	if (node.options.onExitComplete) node.setOptions({ onExitComplete: void 0 });
	return node;
}
function sortDocumentOrder(elements) {
	return [...elements].sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
}
function dropNode(element, node) {
	node.setOptions({ onExitComplete: void 0 });
	if (!node.getStack() || node.isLead()) node.currentAnimation?.stop();
	node.unmount();
	layoutNodes.delete(element);
}
function flushPendingBuilders() {
	const builders = pendingBuilders;
	pendingBuilders = void 0;
	flushPendingFrame();
	/**
	* Discover and mount every node across all builders before snapshotting
	* any of them. Mounting during an active update flags isLayoutDirty,
	* which would make that node's own willUpdate skip its snapshot.
	* Document order guarantees ancestors mount before descendants, even
	* when they're discovered by different builders.
	*/
	const targets = /* @__PURE__ */ new Map();
	for (const builder of builders) for (const element of builder.collectTargets()) {
		const owners = targets.get(element);
		owners ? owners.push(builder) : targets.set(element, [builder]);
	}
	const union = /* @__PURE__ */ new Map();
	for (const element of sortDocumentOrder(targets.keys())) {
		const owners = targets.get(element);
		const node = prepareNode(element, owners[owners.length - 1].transitionFor(element));
		for (const owner of owners) owner.adopt(element, node);
		union.set(element, node);
	}
	union.forEach((node) => {
		node.isLayoutDirty = false;
		node.willUpdate();
	});
	const updatePromises = [];
	for (const builder of builders) {
		const result = builder.runUpdate();
		if (result) updatePromises.push(result);
	}
	const commit = () => {
		/**
		* Process all additions before any removals so that, even across
		* builders, a removed member knows whether a replacement with the
		* same layoutId was added in this commit.
		*/
		const newMemberIds = /* @__PURE__ */ new Set();
		for (const builder of builders) builder.reconcileAdditions(newMemberIds);
		for (const builder of builders) builder.reconcileRemovals(newMemberIds);
		let root;
		union.forEach((node) => root || (root = node.root));
		for (const builder of builders) root || (root = builder.getRoot());
		root?.didUpdate();
		/**
		* The root flushes the update on a microtask, synchronously
		* processing the frame that creates the layout animations. Collect
		* them in a later microtask step of the same pass.
		*/
		microtask.render(() => {
			for (const builder of builders) builder.finalize();
		});
	};
	updatePromises.length ? Promise.all(updatePromises).then(commit) : commit();
}
var LayoutAnimationBuilder = class {
	constructor(scope, updateDom, defaultOptions) {
		this.scope = scope;
		this.updateDom = updateDom;
		this.defaultOptions = defaultOptions;
		this.sharedTransitions = /* @__PURE__ */ new Map();
		this.notifyReady = () => {};
		this.rejectReady = () => {};
		this.tracked = /* @__PURE__ */ new Map();
		this.restorePoints = /* @__PURE__ */ new Map();
		this.readyPromise = new Promise((resolve, reject) => {
			this.notifyReady = resolve;
			this.rejectReady = reject;
		});
		if (!pendingBuilders) {
			pendingBuilders = [];
			queueMicrotask(flushPendingBuilders);
		}
		pendingBuilders.push(this);
	}
	shared(id, transition) {
		this.sharedTransitions.set(id, transition);
		return this;
	}
	then(resolve, reject) {
		return this.readyPromise.then(resolve, reject);
	}
	transitionFor(element) {
		const layoutId = element.getAttribute("data-layout-id");
		return layoutId && this.sharedTransitions.get(layoutId) || this.defaultOptions;
	}
	adopt(element, node) {
		this.tracked.set(element, node);
		this.restorePoints.set(element, {
			parent: element.parentElement,
			next: element.nextSibling
		});
	}
	collectTargets() {
		return collectLayoutElements(this.scope);
	}
	runUpdate() {
		try {
			const result = this.updateDom();
			if (result && typeof result.then === "function") return result.then(void 0, (error) => {
				this.updateError = error;
			});
		} catch (error) {
			this.updateError = error;
		}
	}
	reconcileAdditions(newMemberIds) {
		for (const element of collectLayoutElements(this.scope)) {
			if (this.tracked.has(element)) continue;
			const node = prepareNode(element, this.transitionFor(element));
			this.adopt(element, node);
			node.options.layoutId && newMemberIds.add(node.options.layoutId);
		}
	}
	reconcileRemovals(newMemberIds) {
		this.tracked.forEach((node, element) => {
			if (element.isConnected) return;
			const restore = this.restorePoints.get(element);
			this.restorePoints.delete(element);
			const { layoutId } = node.options;
			const stack = node.getStack();
			const hasSurvivor = stack && stack.members.some((member) => member !== node && member.instance?.isConnected);
			/**
			* A removed lead with a surviving stack member - and no
			* replacement member added this commit - runs an exit
			* crossfade: restore the element to its old position in the
			* DOM, relegate it and let the survivor take over. It's
			* removed again once the animation completes.
			*/
			if (layoutId && node.isLead() && hasSurvivor && !newMemberIds.has(layoutId)) {
				if (restore && restore.parent.isConnected) {
					restore.parent.insertBefore(element, restore.next && restore.next.parentNode === restore.parent ? restore.next : null);
					node.isPresent = false;
					node.setOptions({ onExitComplete: () => {
						element.remove();
						dropNode(element, node);
					} });
					if (node.relegate()) return;
					element.remove();
				}
			}
			dropNode(element, node);
			this.tracked.delete(element);
		});
	}
	getRoot() {
		let root;
		this.tracked.forEach((node) => root || (root = node.root));
		return root;
	}
	finalize() {
		if (this.updateError) {
			this.rejectReady(this.updateError);
			return;
		}
		const animations = /* @__PURE__ */ new Set();
		this.tracked.forEach((node) => {
			if (node.instance && node.currentAnimation) animations.add(node.currentAnimation);
		});
		this.notifyReady(new GroupAnimation([...animations]));
	}
};
function parseAnimateLayoutArgs(scopeOrUpdateDom, updateDomOrOptions, options) {
	if (typeof scopeOrUpdateDom === "function") return {
		scope: document,
		updateDom: scopeOrUpdateDom,
		defaultOptions: updateDomOrOptions
	};
	return {
		scope: scopeOrUpdateDom instanceof Document ? scopeOrUpdateDom : resolveElements(scopeOrUpdateDom)[0] ?? document,
		updateDom: updateDomOrOptions,
		defaultOptions: options
	};
}
//#endregion
//#region ../../node_modules/motion-dom/dist/es/frameloop/index-legacy.mjs
/**
* @deprecated
*
* Import as `frame` instead.
*/
var sync = frame;
/**
* @deprecated
*
* Use cancelFrame(callback) instead.
*/
var cancelSync = stepsOrder.reduce((acc, key) => {
	acc[key] = (process) => cancelFrame(process);
	return acc;
}, {});
//#endregion
//#region ../../node_modules/framer-motion/dist/es/animation/utils/is-dom-keyframes.mjs
function isDOMKeyframes(keyframes) {
	return typeof keyframes === "object" && !Array.isArray(keyframes);
}
//#endregion
//#region ../../node_modules/framer-motion/dist/es/animation/animate/resolve-subjects.mjs
function resolveSubjects(subject, keyframes, scope, selectorCache) {
	if (subject == null) return [];
	if (typeof subject === "string" && isDOMKeyframes(keyframes)) return resolveElements(subject, scope, selectorCache);
	else if (subject instanceof NodeList) return Array.from(subject);
	else if (Array.isArray(subject)) return subject.filter((s) => s != null);
	else return [subject];
}
//#endregion
//#region ../../node_modules/framer-motion/dist/es/animation/sequence/utils/calc-repeat-duration.mjs
function calculateRepeatDuration(duration, repeat, repeatDelay) {
	return duration * (repeat + 1) + repeatDelay * repeat;
}
//#endregion
//#region ../../node_modules/framer-motion/dist/es/animation/sequence/utils/calc-time.mjs
/**
* Given a absolute or relative time definition and current/prev time state of the sequence,
* calculate an absolute time for the next keyframes.
*/
function calcNextTime(current, next, prev, labels) {
	if (typeof next === "number") return next;
	else if (next.startsWith("-") || next.startsWith("+")) return Math.max(0, current + parseFloat(next));
	else if (next === "<") return prev;
	else if (next.startsWith("<")) return Math.max(0, prev + parseFloat(next.slice(1)));
	else return labels.get(next) ?? current;
}
//#endregion
//#region ../../node_modules/framer-motion/dist/es/animation/sequence/utils/edit.mjs
function eraseKeyframes(sequence, startTime, endTime) {
	for (let i = 0; i < sequence.length; i++) {
		const keyframe = sequence[i];
		if (keyframe.at > startTime && keyframe.at < endTime) {
			removeItem(sequence, keyframe);
			i--;
		}
	}
}
function addKeyframes(sequence, keyframes, easing, offset, startTime, endTime) {
	/**
	* Erase every existing value between currentTime and targetTime,
	* this will essentially splice this timeline into any currently
	* defined ones.
	*/
	eraseKeyframes(sequence, startTime, endTime);
	for (let i = 0; i < keyframes.length; i++) sequence.push({
		value: keyframes[i],
		at: mixNumber(startTime, endTime, offset[i]),
		easing: /* @__PURE__ */ getEasingForSegment(easing, i)
	});
}
//#endregion
//#region ../../node_modules/framer-motion/dist/es/animation/sequence/utils/normalize-times.mjs
/**
* Take an array of times that represent repeated keyframes. For instance
* if we have original times of [0, 0.5, 1] then our repeated times will
* be [0, 0.5, 1, 1, 1.5, 2]. Loop over the times and scale them back
* down to a 0-1 scale.
*
* `repeatDelayUnits` is the repeatDelay expressed in units of a single
* iteration's duration, so the total span equals `(repeat + 1) + repeat * repeatDelayUnits`.
*/
function normalizeTimes(times, repeat, repeatDelayUnits = 0) {
	const totalUnits = repeat + 1 + repeat * repeatDelayUnits;
	for (let i = 0; i < times.length; i++) times[i] = times[i] / totalUnits;
}
//#endregion
//#region ../../node_modules/framer-motion/dist/es/animation/sequence/utils/sort.mjs
function compareByTime(a, b) {
	if (a.at === b.at) {
		if (a.value === null) return 1;
		if (b.value === null) return -1;
		return 0;
	} else return a.at - b.at;
}
//#endregion
//#region ../../node_modules/framer-motion/dist/es/animation/sequence/create.mjs
var defaultSegmentEasing = "easeInOut";
var MAX_REPEAT = 20;
function createAnimationsFromSequence(sequence, { defaultTransition = {}, ...sequenceTransition } = {}, scope, generators) {
	const defaultDuration = defaultTransition.duration || .3;
	const animationDefinitions = /* @__PURE__ */ new Map();
	const sequences = /* @__PURE__ */ new Map();
	const elementCache = {};
	const timeLabels = /* @__PURE__ */ new Map();
	let prevTime = 0;
	let currentTime = 0;
	let totalDuration = 0;
	/**
	* Build the timeline by mapping over the sequence array and converting
	* the definitions into keyframes and offsets with absolute time values.
	* These will later get converted into relative offsets in a second pass.
	*/
	for (let i = 0; i < sequence.length; i++) {
		const segment = sequence[i];
		/**
		* If this is a timeline label, mark it and skip the rest of this iteration.
		*/
		if (typeof segment === "string") {
			timeLabels.set(segment, currentTime);
			continue;
		} else if (!Array.isArray(segment)) {
			timeLabels.set(segment.name, calcNextTime(currentTime, segment.at, prevTime, timeLabels));
			continue;
		}
		let [subject, keyframes, transition = {}] = segment;
		/**
		* If a relative or absolute time value has been specified we need to resolve
		* it in relation to the currentTime.
		*/
		if (transition.at !== void 0) currentTime = calcNextTime(currentTime, transition.at, prevTime, timeLabels);
		/**
		* Keep track of the maximum duration in this definition. This will be
		* applied to currentTime once the definition has been parsed.
		*/
		let maxDuration = 0;
		const resolveValueSequence = (valueKeyframes, valueTransition, valueSequence, elementIndex = 0, numSubjects = 0) => {
			const valueKeyframesAsList = keyframesAsList(valueKeyframes);
			const { delay = 0, times = defaultOffset(valueKeyframesAsList), type = defaultTransition.type || "keyframes", repeat, repeatType, repeatDelay = 0, ...remainingTransition } = valueTransition;
			let { ease = defaultTransition.ease || "easeOut", duration } = valueTransition;
			/**
			* Resolve stagger() if defined.
			*/
			const calculatedDelay = typeof delay === "function" ? delay(elementIndex, numSubjects) : delay;
			/**
			* If this animation should and can use a spring, generate a spring easing function.
			*/
			const numKeyframes = valueKeyframesAsList.length;
			const createGenerator = isGenerator(type) ? type : generators?.[type || "keyframes"];
			if (numKeyframes <= 2 && createGenerator) {
				/**
				* As we're creating an easing function from a spring,
				* ideally we want to generate it using the real distance
				* between the two keyframes. However this isn't always
				* possible - in these situations we use 0-100.
				*/
				let absoluteDelta = 100;
				if (numKeyframes === 2 && isNumberKeyframesArray(valueKeyframesAsList)) {
					const delta = valueKeyframesAsList[1] - valueKeyframesAsList[0];
					absoluteDelta = Math.abs(delta);
				}
				const springTransition = {
					...defaultTransition,
					...remainingTransition
				};
				if (duration !== void 0) springTransition.duration = /* @__PURE__ */ secondsToMilliseconds(duration);
				const springEasing = createGeneratorEasing(springTransition, absoluteDelta, createGenerator);
				ease = springEasing.ease;
				duration = springEasing.duration;
			}
			duration ?? (duration = defaultDuration);
			const startTime = currentTime + calculatedDelay;
			/**
			* If there's only one time offset of 0, fill in a second with length 1
			*/
			if (times.length === 1 && times[0] === 0) times[1] = 1;
			/**
			* Fill out if offset if fewer offsets than keyframes
			*/
			const remainder = times.length - valueKeyframesAsList.length;
			remainder > 0 && fillOffset(times, remainder);
			/**
			* If only one value has been set, ie [1], push a null to the start of
			* the keyframe array. This will let us mark a keyframe at this point
			* that will later be hydrated with the previous value.
			*/
			valueKeyframesAsList.length === 1 && valueKeyframesAsList.unshift(null);
			/**
			* Segments can't express `repeat: Infinity` or very large
			* counts — they'd leave dead time after the segment or
			* explode the keyframe array. Ignore with a warning.
			*/
			if (repeat) warning(repeat < MAX_REPEAT, `Sequence segments can't repeat ${repeat} times — ignoring repeat option. Use a value below ${MAX_REPEAT} or apply repeat at the sequence level instead.`);
			if (repeat && repeat < MAX_REPEAT) {
				/**
				* Express repeatDelay in units of a single iteration's duration
				* so it can be added to the per-iteration time offsets below
				* before they're normalized to 0-1.
				*/
				const repeatDelayUnits = duration > 0 ? repeatDelay / duration : 0;
				duration = calculateRepeatDuration(duration, repeat, repeatDelay);
				const originalKeyframes = [...valueKeyframesAsList];
				const originalTimes = [...times];
				ease = Array.isArray(ease) ? [...ease] : [ease];
				const originalEase = [...ease];
				/**
				* For reverse/mirror, alternate iterations play the segment
				* backwards. mirror matches JSAnimation's mirroredGenerator:
				* reversed keyframes, easings unchanged. reverse matches
				* JSAnimation's iterationProgress = 1 - p: reversed
				* keyframes, easing array reversed AND each function easing
				* mapped through reverseEasing (string easings unchanged —
				* they're resolved later by the keyframes engine).
				*/
				const isFlipping = repeatType === "reverse" || repeatType === "mirror";
				let flippedKeyframes = originalKeyframes;
				let flippedEases = originalEase;
				if (isFlipping) {
					flippedKeyframes = [...originalKeyframes].reverse();
					if (repeatType === "reverse") flippedEases = [...originalEase].reverse().map((e) => typeof e === "function" ? /* @__PURE__ */ reverseEasing(e) : e);
				}
				for (let repeatIndex = 0; repeatIndex < repeat; repeatIndex++) {
					const isFlipped = isFlipping && repeatIndex % 2 === 0;
					const iterKeyframes = isFlipped ? flippedKeyframes : originalKeyframes;
					const iterEase = isFlipped ? flippedEases : originalEase;
					const iterStartOffset = (repeatIndex + 1) * (1 + repeatDelayUnits);
					/**
					* If repeatDelay is set, hold the previous iteration's
					* final value through the delay by inserting a keyframe
					* at the moment the next iteration begins.
					*/
					if (repeatDelayUnits > 0) {
						valueKeyframesAsList.push(valueKeyframesAsList[valueKeyframesAsList.length - 1]);
						times.push(iterStartOffset);
						ease.push("linear");
					}
					valueKeyframesAsList.push(...iterKeyframes);
					for (let keyframeIndex = 0; keyframeIndex < iterKeyframes.length; keyframeIndex++) {
						times.push(originalTimes[keyframeIndex] + iterStartOffset);
						ease.push(keyframeIndex === 0 ? "linear" : /* @__PURE__ */ getEasingForSegment(iterEase, keyframeIndex - 1));
					}
				}
				normalizeTimes(times, repeat, repeatDelayUnits);
			}
			const targetTime = startTime + duration;
			/**
			* Add keyframes, mapping offsets to absolute time.
			*/
			addKeyframes(valueSequence, valueKeyframesAsList, ease, times, startTime, targetTime);
			maxDuration = Math.max(calculatedDelay + duration, maxDuration);
			totalDuration = Math.max(targetTime, totalDuration);
		};
		if (isMotionValue(subject)) {
			const subjectSequence = getSubjectSequence(subject, sequences);
			resolveValueSequence(keyframes, transition, getValueSequence("default", subjectSequence));
		} else {
			const subjects = resolveSubjects(subject, keyframes, scope, elementCache);
			const numSubjects = subjects.length;
			/**
			* For every element in this segment, process the defined values.
			*/
			for (let subjectIndex = 0; subjectIndex < numSubjects; subjectIndex++) {
				/**
				* Cast necessary, but we know these are of this type
				*/
				keyframes = keyframes;
				transition = transition;
				const thisSubject = subjects[subjectIndex];
				const subjectSequence = getSubjectSequence(thisSubject, sequences);
				for (const key in keyframes) resolveValueSequence(keyframes[key], getValueTransition$1(transition, key), getValueSequence(key, subjectSequence), subjectIndex, numSubjects);
			}
		}
		prevTime = currentTime;
		currentTime += maxDuration;
	}
	/**
	* For every element and value combination create a new animation.
	*/
	sequences.forEach((valueSequences, element) => {
		for (const key in valueSequences) {
			const valueSequence = valueSequences[key];
			/**
			* Arrange all the keyframes in ascending time order.
			*/
			valueSequence.sort(compareByTime);
			const keyframes = [];
			const valueOffset = [];
			const valueEasing = [];
			/**
			* For each keyframe, translate absolute times into
			* relative offsets based on the total duration of the timeline.
			*/
			for (let i = 0; i < valueSequence.length; i++) {
				const { at, value, easing } = valueSequence[i];
				keyframes.push(value);
				valueOffset.push(/* @__PURE__ */ progress(0, totalDuration, at));
				valueEasing.push(easing || "easeOut");
			}
			/**
			* If the first keyframe doesn't land on offset: 0
			* provide one by duplicating the initial keyframe. This ensures
			* it snaps to the first keyframe when the animation starts.
			*/
			if (valueOffset[0] !== 0) {
				valueOffset.unshift(0);
				keyframes.unshift(keyframes[0]);
				valueEasing.unshift(defaultSegmentEasing);
			}
			/**
			* If the last keyframe doesn't land on offset: 1
			* provide one with a null wildcard value. This will ensure it
			* stays static until the end of the animation.
			*/
			if (valueOffset[valueOffset.length - 1] !== 1) {
				valueOffset.push(1);
				keyframes.push(null);
			}
			if (!animationDefinitions.has(element)) animationDefinitions.set(element, {
				keyframes: {},
				transition: {}
			});
			const definition = animationDefinitions.get(element);
			definition.keyframes[key] = keyframes;
			/**
			* Exclude `type` from defaultTransition since springs have been
			* converted to duration-based easing functions in resolveValueSequence.
			* Including `type: "spring"` would cause JSAnimation to error when
			* the merged keyframes array has more than 2 keyframes.
			*/
			const { type: _type, ...remainingDefaultTransition } = defaultTransition;
			definition.transition[key] = {
				...remainingDefaultTransition,
				duration: totalDuration,
				ease: valueEasing,
				times: valueOffset,
				...sequenceTransition
			};
		}
	});
	return animationDefinitions;
}
function getSubjectSequence(subject, sequences) {
	!sequences.has(subject) && sequences.set(subject, {});
	return sequences.get(subject);
}
function getValueSequence(name, sequences) {
	if (!sequences[name]) sequences[name] = [];
	return sequences[name];
}
function keyframesAsList(keyframes) {
	return Array.isArray(keyframes) ? keyframes : [keyframes];
}
function getValueTransition$1(transition, key) {
	return transition && transition[key] ? {
		...transition,
		...transition[key]
	} : { ...transition };
}
var isNumber = (keyframe) => typeof keyframe === "number";
var isNumberKeyframesArray = (keyframes) => keyframes.every(isNumber);
//#endregion
//#region ../../node_modules/framer-motion/dist/es/animation/utils/create-visual-element.mjs
function createDOMVisualElement(element) {
	const options = {
		presenceContext: null,
		props: {},
		visualState: {
			renderState: {
				transform: {},
				transformOrigin: {},
				style: {},
				vars: {},
				attrs: {}
			},
			latestValues: {}
		}
	};
	const node = isSVGElement(element) && !isSVGSVGElement(element) ? new SVGVisualElement(options) : new HTMLVisualElement(options);
	node.mount(element);
	visualElementStore.set(element, node);
}
function createObjectVisualElement(subject) {
	const node = new ObjectVisualElement({
		presenceContext: null,
		props: {},
		visualState: {
			renderState: { output: {} },
			latestValues: {}
		}
	});
	node.mount(subject);
	visualElementStore.set(subject, node);
}
//#endregion
//#region ../../node_modules/framer-motion/dist/es/animation/animate/subject.mjs
function isSingleValue(subject, keyframes) {
	return isMotionValue(subject) || typeof subject === "number" || typeof subject === "string" && !isDOMKeyframes(keyframes);
}
/**
* Implementation
*/
function animateSubject(subject, keyframes, options, scope) {
	const animations = [];
	if (isSingleValue(subject, keyframes)) animations.push(animateSingleValue(subject, isDOMKeyframes(keyframes) ? keyframes.default || keyframes : keyframes, options ? options.default || options : options));
	else {
		if (subject == null) return animations;
		const subjects = resolveSubjects(subject, keyframes, scope);
		const numSubjects = subjects.length;
		invariant(Boolean(numSubjects), "No valid elements provided.", "no-valid-elements");
		for (let i = 0; i < numSubjects; i++) {
			const thisSubject = subjects[i];
			const transition = { ...options };
			/**
			* Resolve stagger function if provided.
			*/
			if ("delay" in transition && typeof transition.delay === "function") transition.delay = transition.delay(i, numSubjects);
			const isElement = thisSubject instanceof Element;
			/**
			* Registered effects (animate.addEffect) claim non-DOM subjects
			* before we fall back to treating them as plain objects.
			*/
			const effect = isElement ? void 0 : findEffect(thisSubject);
			if (effect) {
				animations.push(...animateEffectSubject(effect, thisSubject, keyframes, transition));
				continue;
			}
			const createVisualElement = isElement ? createDOMVisualElement : createObjectVisualElement;
			if (!visualElementStore.has(thisSubject)) createVisualElement(thisSubject);
			const visualElement = visualElementStore.get(thisSubject);
			animations.push(...animateTarget(visualElement, {
				...keyframes,
				transition
			}, {}));
		}
	}
	return animations;
}
//#endregion
//#region ../../node_modules/framer-motion/dist/es/animation/animate/sequence.mjs
function animateSequence(sequence, options, scope) {
	const animations = [];
	createAnimationsFromSequence(sequence.map((segment) => {
		if (Array.isArray(segment) && typeof segment[0] === "function") {
			const callback = segment[0];
			const mv = motionValue(0);
			mv.on("change", callback);
			if (segment.length === 1) return [mv, [0, 1]];
			else if (segment.length === 2) return [
				mv,
				[0, 1],
				segment[1]
			];
			else return [
				mv,
				segment[1],
				segment[2]
			];
		}
		return segment;
	}), options, scope, { spring }).forEach(({ keyframes, transition }, subject) => {
		animations.push(...animateSubject(subject, keyframes, transition));
	});
	return animations;
}
//#endregion
//#region ../../node_modules/framer-motion/dist/es/animation/animate/index.mjs
function isSequence(value) {
	return Array.isArray(value) && value.some(Array.isArray);
}
/**
* Creates an animation function that is optionally scoped
* to a specific element.
*/
function createScopedAnimate(options = {}) {
	const { scope, reduceMotion, skipAnimations } = options;
	/**
	* Implementation
	*/
	function scopedAnimate(subjectOrSequence, optionsOrKeyframes, options) {
		let animations = [];
		let animationOnComplete;
		const inherited = {};
		if (reduceMotion !== void 0) inherited.reduceMotion = reduceMotion;
		if (skipAnimations !== void 0) inherited.skipAnimations = skipAnimations;
		if (isSequence(subjectOrSequence)) {
			const { onComplete, ...sequenceOptions } = optionsOrKeyframes || {};
			if (typeof onComplete === "function") animationOnComplete = onComplete;
			animations = animateSequence(subjectOrSequence, {
				...inherited,
				...sequenceOptions
			}, scope);
		} else {
			const { onComplete, ...rest } = options || {};
			if (typeof onComplete === "function") animationOnComplete = onComplete;
			animations = animateSubject(subjectOrSequence, optionsOrKeyframes, {
				...inherited,
				...rest
			}, scope);
		}
		const animation = new GroupAnimationWithThen(animations);
		if (animationOnComplete) animation.finished.then(animationOnComplete);
		if (scope) {
			scope.animations.push(animation);
			animation.finished.then(() => {
				removeItem(scope.animations, animation);
			});
		}
		return animation;
	}
	return scopedAnimate;
}
var animate = Object.assign(createScopedAnimate(), {
	/**
	* Register an effect so `animate()` can animate the subjects it
	* claims, for instance `animate.addEffect(threeEffect)`. The most
	* recently added effect is tested first. DOM elements are always
	* animated directly.
	*/
	addEffect,
	removeEffect
});
//#endregion
//#region ../../node_modules/framer-motion/dist/es/animation/animators/waapi/animate-elements.mjs
function animateElements(elementOrSelector, keyframes, options, scope) {
	if (elementOrSelector == null) return [];
	const elements = resolveElements(elementOrSelector, scope);
	const numElements = elements.length;
	invariant(Boolean(numElements), "No valid elements provided.", "no-valid-elements");
	/**
	* WAAPI doesn't support interrupting animations.
	*
	* Therefore, starting animations requires a three-step process:
	* 1. Stop existing animations (write styles to DOM)
	* 2. Resolve keyframes (read styles from DOM)
	* 3. Create new animations (write styles to DOM)
	*
	* The hybrid `animate()` function uses AsyncAnimation to resolve
	* keyframes before creating new animations, which removes style
	* thrashing. Here, we have much stricter filesize constraints.
	* Therefore we do this in a synchronous way that ensures that
	* at least within `animate()` calls there is no style thrashing.
	*
	* In the motion-native-animate-mini-interrupt benchmark this
	* was 80% faster than a single loop.
	*/
	const animationDefinitions = [];
	/**
	* Step 1: Build options and stop existing animations (write)
	*/
	for (let i = 0; i < numElements; i++) {
		const element = elements[i];
		const elementTransition = { ...options };
		/**
		* Resolve stagger function if provided.
		*/
		if (typeof elementTransition.delay === "function") elementTransition.delay = elementTransition.delay(i, numElements);
		for (const valueName in keyframes) {
			let valueKeyframes = keyframes[valueName];
			if (!Array.isArray(valueKeyframes)) valueKeyframes = [valueKeyframes];
			const valueOptions = { ...getValueTransition(elementTransition, valueName) };
			valueOptions.duration && (valueOptions.duration = /* @__PURE__ */ secondsToMilliseconds(valueOptions.duration));
			valueOptions.delay && (valueOptions.delay = /* @__PURE__ */ secondsToMilliseconds(valueOptions.delay));
			/**
			* If there's an existing animation playing on this element then stop it
			* before creating a new one.
			*/
			const map = getAnimationMap(element);
			const key = animationMapKey(valueName, valueOptions.pseudoElement || "");
			const currentAnimation = map.get(key);
			currentAnimation && currentAnimation.stop();
			animationDefinitions.push({
				map,
				key,
				unresolvedKeyframes: valueKeyframes,
				options: {
					...valueOptions,
					element,
					name: valueName,
					allowFlatten: !elementTransition.type && !elementTransition.ease
				}
			});
		}
	}
	/**
	* Step 2: Resolve keyframes (read)
	*/
	for (let i = 0; i < animationDefinitions.length; i++) {
		const { unresolvedKeyframes, options: animationOptions } = animationDefinitions[i];
		const { element, name, pseudoElement } = animationOptions;
		if (!pseudoElement && unresolvedKeyframes[0] === null) unresolvedKeyframes[0] = getComputedStyle$1(element, name);
		fillWildcards(unresolvedKeyframes);
		applyPxDefaults(unresolvedKeyframes, name);
		/**
		* If we only have one keyframe, explicitly read the initial keyframe
		* from the computed style. This is to ensure consistency with WAAPI behaviour
		* for restarting animations, for instance .play() after finish, when it
		* has one vs two keyframes.
		*/
		if (!pseudoElement && unresolvedKeyframes.length < 2) unresolvedKeyframes.unshift(getComputedStyle$1(element, name));
		animationOptions.keyframes = unresolvedKeyframes;
	}
	/**
	* Step 3: Create new animations (write)
	*/
	const animations = [];
	for (let i = 0; i < animationDefinitions.length; i++) {
		const { map, key, options: animationOptions } = animationDefinitions[i];
		const animation = new NativeAnimation(animationOptions);
		map.set(key, animation);
		animation.finished.finally(() => map.delete(key));
		animations.push(animation);
	}
	return animations;
}
//#endregion
//#region ../../node_modules/framer-motion/dist/es/animation/animators/waapi/animate-style.mjs
var createScopedWaapiAnimate = (scope) => {
	function scopedAnimate(elementOrSelector, keyframes, options) {
		return new GroupAnimationWithThen(animateElements(elementOrSelector, keyframes, options, scope));
	}
	return scopedAnimate;
};
var animateMini = /*@__PURE__*/ createScopedWaapiAnimate();
//#endregion
//#region ../../node_modules/framer-motion/dist/es/render/dom/scroll/utils/can-use-native-timeline.mjs
function canUseNativeTimeline(target) {
	if (typeof window === "undefined") return false;
	return target ? supportsViewTimeline() : supportsScrollTimeline();
}
//#endregion
//#region ../../node_modules/framer-motion/dist/es/render/dom/scroll/info.mjs
/**
* A time in milliseconds, beyond which we consider the scroll velocity to be 0.
*/
var maxElapsed = 50;
var createAxisInfo = () => ({
	current: 0,
	offset: [],
	progress: 0,
	scrollLength: 0,
	targetOffset: 0,
	targetLength: 0,
	containerLength: 0,
	velocity: 0
});
var createScrollInfo = () => ({
	time: 0,
	x: createAxisInfo(),
	y: createAxisInfo()
});
var keys = {
	x: {
		length: "Width",
		position: "Left"
	},
	y: {
		length: "Height",
		position: "Top"
	}
};
function updateAxisInfo(element, axisName, info, time) {
	const axis = info[axisName];
	const { length, position } = keys[axisName];
	const prev = axis.current;
	const prevTime = info.time;
	axis.current = Math.abs(element[`scroll${position}`]);
	axis.scrollLength = element[`scroll${length}`] - element[`client${length}`];
	axis.offset.length = 0;
	axis.offset[0] = 0;
	axis.offset[1] = axis.scrollLength;
	axis.progress = /* @__PURE__ */ progress(0, axis.scrollLength, axis.current);
	const elapsed = time - prevTime;
	axis.velocity = elapsed > maxElapsed ? 0 : /* @__PURE__ */ velocityPerSecond(axis.current - prev, elapsed);
}
function updateScrollInfo(element, info, time) {
	updateAxisInfo(element, "x", info, time);
	updateAxisInfo(element, "y", info, time);
	info.time = time;
}
//#endregion
//#region ../../node_modules/framer-motion/dist/es/render/dom/scroll/offsets/inset.mjs
function calcInset(element, container) {
	const inset = {
		x: 0,
		y: 0
	};
	let current = element;
	while (current && current !== container) if (isHTMLElement(current)) {
		inset.x += current.offsetLeft;
		inset.y += current.offsetTop;
		current = current.offsetParent;
	} else if (current.tagName === "svg") {
		/**
		* This isn't an ideal approach to measuring the offset of <svg /> tags.
		* It would be preferable, given they behave like HTMLElements in most ways
		* to use offsetLeft/Top. But these don't exist on <svg />. Likewise we
		* can't use .getBBox() like most SVG elements as these provide the offset
		* relative to the SVG itself, which for <svg /> is usually 0x0.
		*/
		const svgBoundingBox = current.getBoundingClientRect();
		current = current.parentElement;
		const parentBoundingBox = current.getBoundingClientRect();
		inset.x += svgBoundingBox.left - parentBoundingBox.left;
		inset.y += svgBoundingBox.top - parentBoundingBox.top;
	} else if (current instanceof SVGGraphicsElement) {
		const { x, y } = current.getBBox();
		inset.x += x;
		inset.y += y;
		let svg = null;
		let parent = current.parentNode;
		while (!svg) {
			if (parent.tagName === "svg") svg = parent;
			parent = current.parentNode;
		}
		current = svg;
	} else break;
	return inset;
}
//#endregion
//#region ../../node_modules/framer-motion/dist/es/render/dom/scroll/offsets/edge.mjs
var namedEdges = {
	start: 0,
	center: .5,
	end: 1
};
function resolveEdge(edge, length, inset = 0) {
	let delta = 0;
	/**
	* If we have this edge defined as a preset, replace the definition
	* with the numerical value.
	*/
	if (edge in namedEdges) edge = namedEdges[edge];
	/**
	* Handle unit values
	*/
	if (typeof edge === "string") {
		const asNumber = parseFloat(edge);
		if (edge.endsWith("px")) delta = asNumber;
		else if (edge.endsWith("%")) edge = asNumber / 100;
		else if (edge.endsWith("vw")) delta = asNumber / 100 * document.documentElement.clientWidth;
		else if (edge.endsWith("vh")) delta = asNumber / 100 * document.documentElement.clientHeight;
		else edge = asNumber;
	}
	/**
	* If the edge is defined as a number, handle as a progress value.
	*/
	if (typeof edge === "number") delta = length * edge;
	return inset + delta;
}
//#endregion
//#region ../../node_modules/framer-motion/dist/es/render/dom/scroll/offsets/offset.mjs
var defaultOffset$1 = [0, 0];
function resolveOffset(offset, containerLength, targetLength, targetInset) {
	let offsetDefinition = Array.isArray(offset) ? offset : defaultOffset$1;
	let targetPoint = 0;
	let containerPoint = 0;
	if (typeof offset === "number")
 /**
	* If we're provided offset: [0, 0.5, 1] then each number x should become
	* [x, x], so we default to the behaviour of mapping 0 => 0 of both target
	* and container etc.
	*/
	offsetDefinition = [offset, offset];
	else if (typeof offset === "string") {
		offset = offset.trim();
		if (offset.includes(" ")) offsetDefinition = offset.split(" ");
		else
 /**
		* If we're provided a definition like "100px" then we want to apply
		* that only to the top of the target point, leaving the container at 0.
		* Whereas a named offset like "end" should be applied to both.
		*/
		offsetDefinition = [offset, namedEdges[offset] ? offset : `0`];
	}
	targetPoint = resolveEdge(offsetDefinition[0], targetLength, targetInset);
	containerPoint = resolveEdge(offsetDefinition[1], containerLength);
	return targetPoint - containerPoint;
}
//#endregion
//#region ../../node_modules/framer-motion/dist/es/render/dom/scroll/offsets/presets.mjs
var ScrollOffset$1 = {
	Enter: [[0, 1], [1, 1]],
	Exit: [[0, 0], [1, 0]],
	Any: [[1, 0], [0, 1]],
	All: [[0, 0], [1, 1]]
};
//#endregion
//#region ../../node_modules/framer-motion/dist/es/render/dom/scroll/offsets/index.mjs
var point = {
	x: 0,
	y: 0
};
function getTargetSize(target) {
	return "getBBox" in target && target.tagName !== "svg" ? target.getBBox() : {
		width: target.clientWidth,
		height: target.clientHeight
	};
}
function resolveOffsets(container, info, options) {
	const { offset: offsetDefinition = ScrollOffset$1.All } = options;
	const { target = container, axis = "y" } = options;
	const lengthLabel = axis === "y" ? "height" : "width";
	const inset = target !== container ? calcInset(target, container) : point;
	/**
	* Measure the target and container. If they're the same thing then we
	* use the container's scrollWidth/Height as the target, from there
	* all other calculations can remain the same.
	*/
	const targetSize = target === container ? {
		width: container.scrollWidth,
		height: container.scrollHeight
	} : getTargetSize(target);
	const containerSize = {
		width: container.clientWidth,
		height: container.clientHeight
	};
	/**
	* Reset the length of the resolved offset array rather than creating a new one.
	* TODO: More reusable data structures for targetSize/containerSize would also be good.
	*/
	info[axis].offset.length = 0;
	/**
	* Populate the offset array by resolving the user's offset definition into
	* a list of pixel scroll offets.
	*/
	let hasChanged = !info[axis].interpolate;
	const numOffsets = offsetDefinition.length;
	for (let i = 0; i < numOffsets; i++) {
		const offset = resolveOffset(offsetDefinition[i], containerSize[lengthLabel], targetSize[lengthLabel], inset[axis]);
		if (!hasChanged && offset !== info[axis].interpolatorOffsets[i]) hasChanged = true;
		info[axis].offset[i] = offset;
	}
	/**
	* If the pixel scroll offsets have changed, create a new interpolator function
	* to map scroll value into a progress.
	*/
	if (hasChanged) {
		info[axis].interpolate = interpolate(info[axis].offset, defaultOffset(offsetDefinition), { clamp: false });
		info[axis].interpolatorOffsets = [...info[axis].offset];
	}
	info[axis].progress = clamp(0, 1, info[axis].interpolate(info[axis].current));
}
//#endregion
//#region ../../node_modules/framer-motion/dist/es/render/dom/scroll/on-scroll-handler.mjs
function measure(container, target = container, info) {
	/**
	* Find inset of target within scrollable container
	*/
	info.x.targetOffset = 0;
	info.y.targetOffset = 0;
	if (target !== container) {
		let node = target;
		while (node && node !== container) {
			info.x.targetOffset += node.offsetLeft;
			info.y.targetOffset += node.offsetTop;
			node = node.offsetParent;
		}
	}
	info.x.targetLength = target === container ? target.scrollWidth : target.clientWidth;
	info.y.targetLength = target === container ? target.scrollHeight : target.clientHeight;
	info.x.containerLength = container.clientWidth;
	info.y.containerLength = container.clientHeight;
	if (container && target && target !== container && container !== document.documentElement && container !== document.scrollingElement && container !== document.body) warnOnce(getComputedStyle(container).position !== "static", "Please ensure that the container has a non-static position, like 'relative', 'fixed', or 'absolute' to ensure scroll offset is calculated correctly.");
}
function createOnScrollHandler(element, onScroll, info, options = {}) {
	return {
		measure: (time) => {
			measure(element, options.target, info);
			updateScrollInfo(element, info, time);
			if (options.offset || options.target) resolveOffsets(element, info, options);
		},
		notify: () => onScroll(info)
	};
}
//#endregion
//#region ../../node_modules/framer-motion/dist/es/render/dom/scroll/track.mjs
var scrollListeners = /* @__PURE__ */ new WeakMap();
var resizeListeners = /* @__PURE__ */ new WeakMap();
var onScrollHandlers = /* @__PURE__ */ new WeakMap();
var scrollSize = /* @__PURE__ */ new WeakMap();
var dimensionCheckProcesses = /* @__PURE__ */ new WeakMap();
var getEventTarget = (element) => element === document.scrollingElement ? window : element;
function scrollInfo(onScroll, { container = document.scrollingElement, trackContentSize = false, ...options } = {}) {
	if (!container) return noop;
	let containerHandlers = onScrollHandlers.get(container);
	/**
	* Get the onScroll handlers for this container.
	* If one isn't found, create a new one.
	*/
	if (!containerHandlers) {
		containerHandlers = /* @__PURE__ */ new Set();
		onScrollHandlers.set(container, containerHandlers);
	}
	const containerHandler = createOnScrollHandler(container, onScroll, createScrollInfo(), options);
	containerHandlers.add(containerHandler);
	/**
	* Check if there's a scroll event listener for this container.
	* If not, create one.
	*/
	if (!scrollListeners.has(container)) {
		const measureAll = () => {
			for (const handler of containerHandlers) handler.measure(frameData.timestamp);
			frame.preUpdate(notifyAll);
		};
		const notifyAll = () => {
			for (const handler of containerHandlers) handler.notify();
		};
		const listener = () => frame.read(measureAll);
		scrollListeners.set(container, listener);
		const target = getEventTarget(container);
		window.addEventListener("resize", listener);
		if (container !== document.documentElement) resizeListeners.set(container, resize(container, listener));
		target.addEventListener("scroll", listener);
		listener();
	}
	/**
	* Enable content size tracking if requested and not already enabled.
	*/
	if (trackContentSize && !dimensionCheckProcesses.has(container)) {
		const listener = scrollListeners.get(container);
		const size = {
			width: container.scrollWidth,
			height: container.scrollHeight
		};
		scrollSize.set(container, size);
		const checkScrollDimensions = () => {
			const newWidth = container.scrollWidth;
			const newHeight = container.scrollHeight;
			if (size.width !== newWidth || size.height !== newHeight) {
				listener();
				size.width = newWidth;
				size.height = newHeight;
			}
		};
		const dimensionCheckProcess = frame.read(checkScrollDimensions, true);
		dimensionCheckProcesses.set(container, dimensionCheckProcess);
	}
	const listener = scrollListeners.get(container);
	frame.read(listener, false, true);
	return () => {
		cancelFrame(listener);
		/**
		* Check if we even have any handlers for this container.
		*/
		const currentHandlers = onScrollHandlers.get(container);
		if (!currentHandlers) return;
		currentHandlers.delete(containerHandler);
		if (currentHandlers.size) return;
		/**
		* If no more handlers, remove the scroll listener too.
		*/
		const scrollListener = scrollListeners.get(container);
		scrollListeners.delete(container);
		if (scrollListener) {
			getEventTarget(container).removeEventListener("scroll", scrollListener);
			resizeListeners.get(container)?.();
			window.removeEventListener("resize", scrollListener);
		}
		const dimensionCheckProcess = dimensionCheckProcesses.get(container);
		if (dimensionCheckProcess) {
			cancelFrame(dimensionCheckProcess);
			dimensionCheckProcesses.delete(container);
		}
		scrollSize.delete(container);
	};
}
//#endregion
//#region ../../node_modules/framer-motion/dist/es/render/dom/scroll/utils/offset-to-range.mjs
/**
* Maps from ProgressIntersection pairs used by Motion's preset offsets to
* ViewTimeline named ranges. Returns undefined for unrecognised patterns,
* which signals the caller to fall back to JS-based scroll tracking.
*/
var presets$1 = [
	[ScrollOffset$1.Enter, "entry"],
	[ScrollOffset$1.Exit, "exit"],
	[ScrollOffset$1.Any, "cover"],
	[ScrollOffset$1.All, "contain"]
];
var stringToProgress$1 = {
	start: 0,
	end: 1
};
function parseStringOffset$1(s) {
	const parts = s.trim().split(/\s+/);
	if (parts.length !== 2) return void 0;
	const a = stringToProgress$1[parts[0]];
	const b = stringToProgress$1[parts[1]];
	if (a === void 0 || b === void 0) return void 0;
	return [a, b];
}
function normaliseOffset$1(offset) {
	if (offset.length !== 2) return void 0;
	const result = [];
	for (const item of offset) if (Array.isArray(item)) result.push(item);
	else if (typeof item === "string") {
		const parsed = parseStringOffset$1(item);
		if (!parsed) return void 0;
		result.push(parsed);
	} else return;
	return result;
}
function matchesPreset$1(offset, preset) {
	const normalised = normaliseOffset$1(offset);
	if (!normalised) return false;
	for (let i = 0; i < 2; i++) {
		const o = normalised[i];
		const p = preset[i];
		if (o[0] !== p[0] || o[1] !== p[1]) return false;
	}
	return true;
}
function offsetToViewTimelineRange$1(offset) {
	if (!offset) return {
		rangeStart: "contain 0%",
		rangeEnd: "contain 100%"
	};
	for (const [preset, name] of presets$1) if (matchesPreset$1(offset, preset)) return {
		rangeStart: `${name} 0%`,
		rangeEnd: `${name} 100%`
	};
}
//#endregion
//#region ../../node_modules/framer-motion/dist/es/render/dom/scroll/utils/get-timeline.mjs
var timelineCache = /* @__PURE__ */ new Map();
function scrollTimelineFallback(options) {
	const currentTime = { value: 0 };
	return {
		currentTime,
		cancel: scrollInfo((info) => {
			currentTime.value = info[options.axis].progress * 100;
		}, options)
	};
}
function getTimeline({ source, container, ...options }) {
	const { axis } = options;
	if (source) container = source;
	let containerCache = timelineCache.get(container);
	if (!containerCache) {
		containerCache = /* @__PURE__ */ new Map();
		timelineCache.set(container, containerCache);
	}
	const targetKey = options.target ?? "self";
	let targetCache = containerCache.get(targetKey);
	if (!targetCache) {
		targetCache = {};
		containerCache.set(targetKey, targetCache);
	}
	const axisKey = axis + (options.offset ?? []).join(",");
	if (!targetCache[axisKey]) {
		if (options.target && canUseNativeTimeline(options.target)) {
			if (offsetToViewTimelineRange$1(options.offset)) targetCache[axisKey] = new ViewTimeline({
				subject: options.target,
				axis
			});
			else targetCache[axisKey] = scrollTimelineFallback({
				container,
				...options
			});
		} else if (canUseNativeTimeline()) targetCache[axisKey] = new ScrollTimeline({
			source: container,
			axis
		});
		else targetCache[axisKey] = scrollTimelineFallback({
			container,
			...options
		});
	}
	return targetCache[axisKey];
}
//#endregion
//#region ../../node_modules/framer-motion/dist/es/render/dom/scroll/attach-animation.mjs
function attachToAnimation(animation, options) {
	const timeline = getTimeline(options);
	const range = options.target ? offsetToViewTimelineRange$1(options.offset) : void 0;
	/**
	* Use native timeline when:
	* - No target: ScrollTimeline (existing behaviour)
	* - Target with mappable offset: ViewTimeline with named range
	* - Target with unmappable offset: fall back to JS observe
	*/
	const useNative = options.target ? canUseNativeTimeline(options.target) && !!range : canUseNativeTimeline();
	return animation.attachTimeline({
		timeline: useNative ? timeline : void 0,
		...range && useNative && {
			rangeStart: range.rangeStart,
			rangeEnd: range.rangeEnd
		},
		observe: (valueAnimation) => {
			valueAnimation.pause();
			return observeTimeline((progress) => {
				valueAnimation.time = valueAnimation.iterationDuration * progress;
			}, timeline);
		}
	});
}
//#endregion
//#region ../../node_modules/framer-motion/dist/es/render/dom/scroll/utils/is-element-tracking.mjs
/**
* Currently, we only support element tracking with `scrollInfo`, though in
* the future we can also offer ViewTimeline support.
*/
function isElementTracking(options) {
	return options && (options.target || options.offset);
}
//#endregion
//#region ../../node_modules/framer-motion/dist/es/render/dom/scroll/attach-function.mjs
/**
* If the onScroll function has two arguments, it's expecting
* more specific information about the scroll from scrollInfo.
*/
function isOnScrollWithInfo(onScroll) {
	return onScroll.length === 2;
}
function attachToFunction(onScroll, options) {
	if (isOnScrollWithInfo(onScroll) || isElementTracking(options)) return scrollInfo((info) => {
		onScroll(info[options.axis].progress, info);
	}, options);
	else return observeTimeline(onScroll, getTimeline(options));
}
//#endregion
//#region ../../node_modules/framer-motion/dist/es/render/dom/scroll/index.mjs
function scroll(onScroll, { axis = "y", container = document.scrollingElement, ...options } = {}) {
	if (!container) return noop;
	const optionsWithDefaults = {
		axis,
		container,
		...options
	};
	return typeof onScroll === "function" ? attachToFunction(onScroll, optionsWithDefaults) : attachToAnimation(onScroll, optionsWithDefaults);
}
//#endregion
//#region ../../node_modules/framer-motion/dist/es/render/dom/viewport/index.mjs
var thresholds = {
	some: 0,
	all: 1
};
function inView(elementOrSelector, onStart, { root, margin: rootMargin, amount = "some" } = {}) {
	const elements = resolveElements(elementOrSelector);
	const activeIntersections = /* @__PURE__ */ new WeakMap();
	const onIntersectionChange = (entries) => {
		entries.forEach((entry) => {
			const onEnd = activeIntersections.get(entry.target);
			/**
			* If there's no change to the intersection, we don't need to
			* do anything here.
			*/
			if (entry.isIntersecting === Boolean(onEnd)) return;
			if (entry.isIntersecting) {
				const newOnEnd = onStart(entry.target, entry);
				if (typeof newOnEnd === "function") activeIntersections.set(entry.target, newOnEnd);
				else observer.unobserve(entry.target);
			} else if (typeof onEnd === "function") {
				onEnd(entry);
				activeIntersections.delete(entry.target);
			}
		});
	};
	const observer = new IntersectionObserver(onIntersectionChange, {
		root,
		rootMargin,
		threshold: typeof amount === "number" ? amount : thresholds[amount]
	});
	elements.forEach((element) => observer.observe(element));
	return () => observer.disconnect();
}
//#endregion
//#region ../../node_modules/framer-motion/dist/es/utils/distance.mjs
var distance = (a, b) => Math.abs(a - b);
function distance2D(a, b) {
	const xDelta = distance(a.x, b.x);
	const yDelta = distance(a.y, b.y);
	return Math.sqrt(xDelta ** 2 + yDelta ** 2);
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/utils/use-in-view.mjs
function useInView(domRef, options) {
	const isInView = ref(false);
	watchEffect((onCleanup) => {
		const realOptions = unref(options) || {};
		const { once } = realOptions;
		const el = unrefElement(domRef);
		if (!el || once && isInView.value) return;
		const onEnter = () => {
			isInView.value = true;
			return once ? void 0 : () => {
				isInView.value = false;
			};
		};
		const cleanup = inView(el, onEnter, {
			...realOptions,
			root: unref(realOptions.root)
		});
		onCleanup(() => {
			cleanup();
		});
	}, { flush: "post" });
	return isInView;
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/utils/use-animation-frame.mjs
function useAnimationFrame(callback) {
	let initialTimestamp = 0;
	const provideTimeSinceStart = ({ timestamp, delta }) => {
		if (!initialTimestamp) initialTimestamp = timestamp;
		callback(timestamp - initialTimestamp, delta);
	};
	const cancel = () => cancelFrame(provideTimeSinceStart);
	onBeforeUpdate(() => {
		cancel();
		frame.update(provideTimeSinceStart, true);
	});
	onUnmounted(() => cancel());
	frame.update(provideTimeSinceStart, true);
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/utils/get-context-window.mjs
function getContextWindow({ current }) {
	return current ? current.ownerDocument.defaultView : null;
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/components/hooks/use-motion-elm.mjs
function getMotionElement(el) {
	if (!el) return void 0;
	if (el.nodeType === 3 || el.nodeType === 8) return getMotionElement(el.nextSibling);
	return el;
}
function getElement(target) {
	return getMotionElement(unrefElement(target));
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/utils/use-dom-ref.mjs
function useDomRef() {
	const dom = ref(null);
	return new Proxy(dom, {
		get(target, key) {
			if (typeof key === "string" || typeof key === "symbol") return Reflect.get(target, key);
		},
		set(target, key, value) {
			if (key === "value") return Reflect.set(target, key, getMotionElement(value?.$el || value));
			return true;
		}
	});
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/utils/use-page-in-view.mjs
function usePageInView() {
	const isInView = ref(true);
	const handleVisibilityChange = () => {
		isInView.value = !document.hidden;
	};
	onMounted(() => {
		if (document.hidden) handleVisibilityChange();
		document.addEventListener("visibilitychange", handleVisibilityChange);
	});
	onUnmounted(() => {
		document.removeEventListener("visibilitychange", handleVisibilityChange);
	});
	return isInView;
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/components/context.mjs
var [injectMotion, provideMotion, motionInjectionKey] = createContext("Motion");
var [injectLayoutGroup, provideLayoutGroup, layoutGroupInjectionKey] = createContext("LayoutGroup");
//#endregion
//#region ../../node_modules/motion-v/dist/es/components/motion-config/context.mjs
var defaultConfig = {
	reducedMotion: "never",
	transition: void 0,
	nonce: void 0
};
var [injectMotionConfig, provideMotionConfig, motionConfigInjectionKey] = createContext("MotionConfig");
function useMotionConfig() {
	return injectMotionConfig(computed(() => defaultConfig));
}
//#endregion
//#region ../../node_modules/hey-listen/dist/hey-listen.es.js
var warning$1 = function() {};
var invariant$1 = function() {};
warning$1 = function(check, message) {
	if (!check && typeof console !== "undefined") console.warn(message);
};
invariant$1 = function(check, message) {
	if (!check) throw new Error(message);
};
//#endregion
//#region ../../node_modules/motion-v/dist/es/components/motion-config/MotionConfig.mjs
var MotionConfig_default = /* @__PURE__ */ defineComponent({
	name: "MotionConfig",
	inheritAttrs: false,
	__name: "MotionConfig",
	props: {
		transition: {},
		reduceMotion: {},
		reducedMotion: { default: ({ reduceMotion }) => {
			if (isDef(reduceMotion)) {
				warning$1(false, "`reduceMotion` is deprecated. Use `reducedMotion` instead.");
				return reduceMotion;
			}
			return defaultConfig.reducedMotion;
		} },
		skipAnimations: { type: Boolean },
		nonce: {},
		inViewOptions: {}
	},
	setup(__props) {
		const props = __props;
		const parentConfig = useMotionConfig();
		provideMotionConfig(computed(() => ({
			transition: props.transition ?? parentConfig.value.transition,
			reducedMotion: props.reducedMotion ?? parentConfig.value.reducedMotion,
			skipAnimations: props.skipAnimations ?? parentConfig.value.skipAnimations,
			nonce: props.nonce ?? parentConfig.value.nonce,
			inViewOptions: props.inViewOptions ?? parentConfig.value.inViewOptions
		})));
		return (_ctx, _cache) => {
			return renderSlot(_ctx.$slots, "default");
		};
	}
});
//#endregion
//#region ../../node_modules/motion-v/dist/es/state/utils.mjs
function resolveVariantValue(definition, variants, custom) {
	if (Array.isArray(definition)) return definition.reduce((acc, item) => {
		const resolvedVariant = resolveVariantValue(item, variants, custom);
		return resolvedVariant ? {
			...acc,
			...resolvedVariant
		} : acc;
	}, {});
	else if (typeof definition === "object") return definition;
	else if (definition && variants) {
		const variant = variants[definition];
		return typeof variant === "function" ? variant(custom) : variant;
	}
}
function resolveVariant$1(definition, variants, custom) {
	const resolved = resolveVariantValue(definition, variants, custom);
	if (!resolved) return void 0;
	const { transition, transitionEnd, ...target } = resolved;
	return {
		...target,
		...transitionEnd
	};
}
function resolveInitialValues(options, context) {
	const sources = (options.initial === void 0 && options.variants ? context?.initial : options.initial) === false ? ["initial", "animate"] : ["initial"];
	const custom = options.custom ?? options.presenceContext?.custom;
	return sources.reduce((acc, variant) => {
		return {
			...acc,
			...resolveVariant$1(options[variant] || context?.[variant], options.variants, custom)
		};
	}, {});
}
function shallowCompare(next, prev) {
	const prevLength = prev?.length;
	if (prevLength !== next.length) return false;
	for (let i = 0; i < prevLength; i++) if (prev[i] !== next[i]) return false;
	return true;
}
var svgElementSet = /* @__PURE__ */ new Set([
	"animate",
	"circle",
	"defs",
	"desc",
	"ellipse",
	"g",
	"image",
	"line",
	"filter",
	"marker",
	"mask",
	"metadata",
	"path",
	"pattern",
	"polygon",
	"polyline",
	"rect",
	"stop",
	"svg",
	"switch",
	"symbol",
	"text",
	"tspan",
	"use",
	"view",
	"clipPath",
	"feBlend",
	"feColorMatrix",
	"feComponentTransfer",
	"feComposite",
	"feConvolveMatrix",
	"feDiffuseLighting",
	"feDisplacementMap",
	"feDistantLight",
	"feDropShadow",
	"feFlood",
	"feFuncA",
	"feFuncB",
	"feFuncG",
	"feFuncR",
	"feGaussianBlur",
	"feImage",
	"feMerge",
	"feMergeNode",
	"feMorphology",
	"feOffset",
	"fePointLight",
	"feSpecularLighting",
	"feSpotLight",
	"feTile",
	"feTurbulence",
	"foreignObject",
	"linearGradient",
	"radialGradient",
	"textPath"
]);
function isSVGElement$1(as) {
	return svgElementSet.has(as);
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/state/motion-state.mjs
var mountedStates = /* @__PURE__ */ new WeakMap();
var MotionState = class {
	constructor(options, parent, bundle = {}) {
		this.element = null;
		this.isExiting = false;
		this.children = /* @__PURE__ */ new Set();
		this.features = /* @__PURE__ */ new Map();
		this.featureCtors = [];
		this._context = null;
		this.options = options;
		this.parent = parent;
		parent?.children?.add(this);
		this.latestValues = resolveInitialValues(options, this.context);
		this.type = isSVGElement$1(this.options.as) ? "svg" : "html";
		this.setBundle(bundle);
	}
	get context() {
		if (!this._context) this._context = new Proxy({}, { get: (_target, prop) => {
			const value = this.options[prop];
			if (isVariantLabel(value) || prop === "initial" && value === false) return value;
			return this.parent?.context[prop];
		} });
		return this._context;
	}
	setBundle(bundle) {
		if (bundle.renderer) this.initVisualElement(bundle.renderer);
		if (bundle.features?.length) this.featureCtors = bundle.features;
		this.updateFeatures();
	}
	updateFeatures() {
		if (!this.visualElement) return;
		for (const FeatureCtor of this.featureCtors) {
			let feature = this.features.get(FeatureCtor.key);
			if (!feature) {
				feature = new FeatureCtor(this);
				this.features.set(FeatureCtor.key, feature);
			}
			if (!this.isMounted()) continue;
			if (feature.isMount) feature.update();
			else {
				feature.mount();
				feature.isMount = true;
			}
		}
	}
	updateOptions(options) {
		this.options = options;
		this.visualElement?.update({
			...this.options,
			whileTap: this.options.whilePress
		}, this.options.presenceContext ?? null);
	}
	mount(element) {
		invariant$1(Boolean(element), "Animation state must be mounted with valid Element");
		mountedStates.set(element, this);
		this.element = element;
		this.visualElement?.mount(element);
		this.updateFeatures();
	}
	beforeUnmount() {
		this.getSnapshot(false);
	}
	unmount() {
		this.parent?.children?.delete(this);
		if (this.element) mountedStates.delete(this.element);
		this.features.forEach((f) => {
			f.unmount();
			f.isMount = false;
		});
		this.visualElement?.unmount();
		this.element = null;
	}
	beforeUpdate() {
		this.getSnapshot(!this.isExiting);
	}
	update() {
		this.updateFeatures();
		this.didUpdate();
	}
	getFeature(key) {
		return this.features.get(key);
	}
	setActive(name, isActive) {
		if (name === "exit" && isActive) this.isExiting = true;
		this.visualElement?.animationState?.setActive(name, isActive).then(() => {
			if (name === "exit" && isActive) this.isExiting = false;
		});
	}
	isMounted() {
		return Boolean(this.element);
	}
	initVisualElement(renderer) {
		if (this.visualElement) return;
		this.visualElement = renderer(this.options.as, {
			presenceContext: this.options.presenceContext ?? null,
			parent: this.parent?.visualElement,
			props: {
				...this.options,
				whileTap: this.options.whilePress
			},
			visualState: {
				renderState: {
					transform: {},
					transformOrigin: {},
					style: {},
					vars: {},
					attrs: {}
				},
				latestValues: { ...this.latestValues }
			},
			reducedMotionConfig: this.options.motionConfig?.reducedMotion
		});
		this.visualElement.parent?.addChild(this.visualElement);
		if (this.isMounted()) this.visualElement.mount(this.element);
	}
	getSnapshot(isPresent) {
		this.features.get("layout")?.getSnapshot(isPresent);
	}
	didUpdate() {}
};
//#endregion
//#region ../../node_modules/motion-v/dist/es/features/feature.mjs
var Feature$1 = class {
	constructor(state) {
		this.isMount = false;
		this.state = state;
	}
	mount() {}
	beforeUnmount() {}
	unmount() {}
	update() {}
	getSnapshot(isPresent) {}
};
//#endregion
//#region ../../node_modules/motion-v/dist/es/state/utils/variant-props.mjs
var variantProps$1 = [
	"initial",
	"animate",
	"exit",
	"whileHover",
	"whileDrag",
	"whileFocus",
	"whilePress"
];
//#endregion
//#region ../../node_modules/motion-v/dist/es/state/utils/get-variant-context.mjs
var numVariantProps = variantProps$1.length;
function getVariantContext$1(visualElement) {
	if (!visualElement) return void 0;
	if (!visualElement.isControllingVariants) {
		const context$1 = visualElement.parent ? getVariantContext$1(visualElement.parent) || {} : {};
		if (visualElement.props.initial !== void 0) context$1.initial = visualElement.props.initial;
		return context$1;
	}
	const context = {};
	for (let i = 0; i < numVariantProps; i++) {
		const name = variantProps$1[i];
		const prop = visualElement.props[name];
		if (isVariantLabel(prop) || prop === false) context[name] = prop;
	}
	return context;
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/state/animation-state.mjs
var variantPriorityOrder$1 = [
	"animate",
	"whileInView",
	"whileFocus",
	"whileHover",
	"whilePress",
	"whileDrag",
	"exit"
];
var reversePriorityOrder = [...variantPriorityOrder$1].reverse();
var numAnimationTypes = variantPriorityOrder$1.length;
function createTypeState(isActive = false) {
	return {
		isActive,
		protectedKeys: {},
		needsAnimating: {},
		prevResolvedValues: {}
	};
}
function createState() {
	return {
		animate: createTypeState(true),
		whileInView: createTypeState(),
		whileHover: createTypeState(),
		whilePress: createTypeState(),
		whileDrag: createTypeState(),
		whileFocus: createTypeState(),
		exit: createTypeState()
	};
}
function checkVariantsDidChange$1(prev, next) {
	if (typeof next === "string") return next !== prev;
	else if (Array.isArray(next)) return !shallowCompare(next, prev);
	return false;
}
function isKeyframesTarget$1(v) {
	return Array.isArray(v);
}
function createAnimateFunction(visualElement) {
	return (animations) => {
		return Promise.all(animations.map(({ animation, options }) => animateVisualElement(visualElement, animation, options)));
	};
}
function createAnimationState$1(visualElement) {
	let animate = createAnimateFunction(visualElement);
	let state = createState();
	let isInitialRender = true;
	const buildResolvedTypeValues = (type) => (acc, definition) => {
		const resolved = resolveVariant(visualElement, definition, type === "exit" ? visualElement.presenceContext?.custom : void 0);
		if (resolved) {
			const { transition, transitionEnd, ...target } = resolved;
			acc = {
				...acc,
				...target,
				...transitionEnd
			};
		}
		return acc;
	};
	function setAnimateFunction(makeAnimator) {
		animate = makeAnimator(visualElement);
	}
	function animateChanges(changedActiveType) {
		const props = visualElement.props;
		const context = getVariantContext$1(visualElement.parent) || {};
		const animations = [];
		const removedKeys = /* @__PURE__ */ new Set();
		let encounteredKeys = {};
		let removedVariantIndex = Infinity;
		for (let i = 0; i < numAnimationTypes; i++) {
			const type = reversePriorityOrder[i];
			const typeState = state[type];
			const prop = props[type] !== void 0 ? props[type] : context[type];
			const propIsVariant = isVariantLabel(prop);
			const activeDelta = type === changedActiveType ? typeState.isActive : null;
			if (activeDelta === false) removedVariantIndex = i;
			let isInherited = prop === context[type] && prop !== props[type] && propIsVariant;
			if (isInherited && isInitialRender && visualElement.manuallyAnimateOnMount) isInherited = false;
			typeState.protectedKeys = { ...encounteredKeys };
			if (!typeState.isActive && activeDelta === null || !prop && !typeState.prevProp || isAnimationControls(prop) || typeof prop === "boolean") continue;
			const variantDidChange = checkVariantsDidChange$1(typeState.prevProp, prop);
			let shouldAnimateType = variantDidChange || type === changedActiveType && typeState.isActive && !isInherited && propIsVariant || i > removedVariantIndex && propIsVariant;
			let handledRemovedValues = false;
			const definitionList = Array.isArray(prop) ? prop : [prop];
			let resolvedValues = definitionList.reduce(buildResolvedTypeValues(type), {});
			if (activeDelta === false) resolvedValues = {};
			const { prevResolvedValues = {} } = typeState;
			const allKeys = {
				...prevResolvedValues,
				...resolvedValues
			};
			const markToAnimate = (key) => {
				shouldAnimateType = true;
				if (removedKeys.has(key)) {
					handledRemovedValues = true;
					removedKeys.delete(key);
				}
				typeState.needsAnimating[key] = true;
				const motionValue$1 = visualElement.getValue(key);
				if (motionValue$1) motionValue$1.liveStyle = false;
			};
			for (const key in allKeys) {
				const next = resolvedValues[key];
				const prev = prevResolvedValues[key];
				if (Object.hasOwnProperty.call(encounteredKeys, key)) continue;
				let valueHasChanged = false;
				if (isKeyframesTarget$1(next) && isKeyframesTarget$1(prev)) valueHasChanged = !shallowCompare(next, prev);
				else valueHasChanged = next !== prev;
				if (valueHasChanged) if (next !== void 0 && next !== null) markToAnimate(key);
				else removedKeys.add(key);
				else if (next !== void 0 && removedKeys.has(key)) markToAnimate(key);
				else typeState.protectedKeys[key] = true;
			}
			typeState.prevProp = prop;
			typeState.prevResolvedValues = resolvedValues;
			if (typeState.isActive) encounteredKeys = {
				...encounteredKeys,
				...resolvedValues
			};
			if (isInitialRender && visualElement.blockInitialAnimation) shouldAnimateType = false;
			const willAnimateViaParent = isInherited && variantDidChange;
			if (shouldAnimateType && (!willAnimateViaParent || handledRemovedValues)) animations.push(...definitionList.map((animation) => {
				const options = { type };
				if (typeof animation === "string" && isInitialRender && !willAnimateViaParent && visualElement.manuallyAnimateOnMount && visualElement.parent) {
					const { parent } = visualElement;
					const parentVariant = resolveVariant(parent, animation);
					if (parent.enteringChildren && parentVariant) {
						const { delayChildren } = parentVariant.transition || {};
						options.delay = calcChildStagger(parent.enteringChildren, visualElement, delayChildren);
					}
				}
				return {
					animation,
					options
				};
			}));
		}
		if (removedKeys.size) {
			const fallbackAnimation = {};
			if (typeof props.initial !== "boolean") {
				const initialTransition = resolveVariant(visualElement, Array.isArray(props.initial) ? props.initial[0] : props.initial);
				if (initialTransition && initialTransition.transition) fallbackAnimation.transition = initialTransition.transition;
			}
			removedKeys.forEach((key) => {
				const fallbackTarget = visualElement.getBaseTarget(key);
				const motionValue$1 = visualElement.getValue(key);
				if (motionValue$1) motionValue$1.liveStyle = true;
				fallbackAnimation[key] = fallbackTarget ?? null;
			});
			animations.push({ animation: fallbackAnimation });
		}
		let shouldAnimate = Boolean(animations.length);
		if (isInitialRender && (props.initial === false || props.initial === props.animate) && !visualElement.manuallyAnimateOnMount) shouldAnimate = false;
		isInitialRender = false;
		return shouldAnimate ? animate(animations) : Promise.resolve();
	}
	function setActive(type, isActive) {
		if (state[type].isActive === isActive) return Promise.resolve();
		visualElement.variantChildren?.forEach((child) => {
			child.animationState?.setActive(type, isActive);
		});
		state[type].isActive = isActive;
		const animations = animateChanges(type);
		for (const key in state) state[key].protectedKeys = {};
		return animations;
	}
	return {
		animateChanges,
		setActive,
		setAnimateFunction,
		getState: () => state,
		reset: () => {
			state = createState();
			isInitialRender = true;
		}
	};
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/utils/is-hidden.mjs
function isHidden(element) {
	return element.style.display === "none" || element.offsetParent === null && window.getComputedStyle(element).position !== "fixed";
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/features/animation/animation.mjs
var AnimationFeature = class extends Feature$1 {
	static #_ = this.key = "animation";
	constructor(state) {
		super(state);
		const ve = state.visualElement;
		ve.animationState ||= createAnimationState$1(ve);
	}
	updateAnimationControlsSubscription() {
		const { animate } = this.state.options;
		if (isAnimationControls(animate)) this.unmountControls = animate.subscribe(this.state.visualElement);
	}
	mount() {
		if (!!isHidden(this.state.element)) this.state.setActive("exit", true);
		else this.state.visualElement.animationState?.animateChanges();
		this.updateAnimationControlsSubscription();
	}
	update() {
		this.state.visualElement.animationState?.animateChanges();
		const { animate } = this.state.visualElement.getProps();
		const { animate: prevAnimate } = this.state.visualElement.prevProps || {};
		if (animate !== prevAnimate) this.updateAnimationControlsSubscription();
	}
	unmount() {
		this.state.visualElement.animationState.reset();
		this.unmountControls?.();
	}
};
//#endregion
//#region ../../node_modules/motion-v/dist/es/features/exit/exit.mjs
var ExitFeature = class extends Feature$1 {
	constructor(..._args) {
		super(..._args);
		this.exitGeneration = 0;
	}
	static #_ = this.key = "exit";
	exit() {
		const generation = ++this.exitGeneration;
		const state = this.state;
		state.isExiting = true;
		const completion = new Promise((resolve) => {
			this.pendingExit = { resolve };
		});
		const exitAnimation = state.visualElement?.animationState?.setActive("exit", true);
		if (exitAnimation) exitAnimation.then(() => {
			if (generation !== this.exitGeneration) return;
			state.isExiting = false;
			state.options?.layoutId ? frame.postRender(() => this.tryCompleteExit(generation)) : this.tryCompleteExit(generation);
		});
		else {
			state.isExiting = false;
			this.tryCompleteExit(generation);
		}
		state.getSnapshot(false);
		return completion;
	}
	reenter() {
		this.exitGeneration++;
		this.settleExit();
		this.state.isExiting = false;
		this.state.setActive("exit", false);
		this.state.getSnapshot(true);
	}
	completeExitFromProjection() {
		this.tryCompleteExit(this.exitGeneration);
	}
	tryCompleteExit(generation) {
		if (generation !== this.exitGeneration || this.state.isExiting) return;
		if (this.state.options?.layoutId && this.state.visualElement.projection?.currentAnimation?.state === "running") return;
		this.settleExit();
	}
	settleExit() {
		this.pendingExit?.resolve();
		this.pendingExit = void 0;
	}
	mount() {
		this.state.options.presenceContext?.register?.(this.state);
	}
	unmount() {
		this.state.options.presenceContext?.unregister?.(this.state);
		this.settleExit();
	}
};
//#endregion
//#region ../../node_modules/motion-v/dist/es/state/create-visual-element.mjs
function createVisualElement(Component, options) {
	return isSVGElement$1(Component) ? new SVGVisualElement(options) : new HTMLVisualElement(options);
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/features/gestures/press/index.mjs
function extractEventInfo$1(event) {
	return { point: {
		x: event.pageX,
		y: event.pageY
	} };
}
var PressGesture = class extends Feature$1 {
	static #_ = this.key = "press";
	constructor(state) {
		super(state);
	}
	isActive() {
		const { whilePress, onPress, onPressCancel, onPressStart } = this.state.options;
		return Boolean(whilePress || onPress || onPressCancel || onPressStart);
	}
	register() {
		const element = this.state.element;
		if (!element || !this.isActive()) return;
		this.removePress?.();
		this.removePress = press(element, (_el, startEvent) => {
			const props = this.state.options;
			this.state.setActive("whilePress", true);
			if (props.onPressStart) frame.postRender(() => props.onPressStart(startEvent, extractEventInfo$1(startEvent)));
			return (endEvent, { success }) => {
				this.state.setActive("whilePress", false);
				const callbackName = success ? "onPress" : "onPressCancel";
				const callback = this.state.options[callbackName];
				if (callback) frame.postRender(() => callback(endEvent, extractEventInfo$1(endEvent)));
			};
		}, { useGlobalTarget: this.state.options.globalPressTarget });
	}
	mount() {
		this.register();
	}
	update() {
		const prev = this.state.visualElement.prevProps;
		if (!Boolean(prev?.whilePress || prev?.whileTap || prev?.onPress || prev?.onPressCancel || prev?.onPressStart) && this.isActive()) this.register();
	}
	unmount() {
		this.removePress?.();
		this.removePress = void 0;
	}
};
//#endregion
//#region ../../node_modules/motion-v/dist/es/events/utils/is-primary-pointer.mjs
function isPrimaryPointer$1(event) {
	if (event.pointerType === "mouse") return typeof event.button !== "number" || event.button <= 0;
	else return event.isPrimary !== false;
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/events/event-info.mjs
function extractEventInfo(event, pointType = "page") {
	return { point: {
		x: event[`${pointType}X`],
		y: event[`${pointType}Y`]
	} };
}
function addPointerInfo(handler) {
	return (event) => isPrimaryPointer$1(event) && handler(event, extractEventInfo(event));
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/features/gestures/hover/index.mjs
var HoverGesture = class extends Feature$1 {
	static #_ = this.key = "hover";
	constructor(state) {
		super(state);
	}
	isActive() {
		const { whileHover, onHoverStart, onHoverEnd } = this.state.options;
		return Boolean(whileHover || onHoverStart || onHoverEnd);
	}
	register() {
		const element = this.state.element;
		if (!element || !this.isActive()) return;
		this.removeHover?.();
		this.removeHover = hover(element, (_el, startEvent) => {
			const props = this.state.options;
			this.state.setActive("whileHover", true);
			if (props.onHoverStart) frame.postRender(() => props.onHoverStart(startEvent, extractEventInfo(startEvent)));
			return (endEvent) => {
				this.state.setActive("whileHover", false);
				const callback = this.state.options.onHoverEnd;
				if (callback) frame.postRender(() => callback(endEvent, extractEventInfo(endEvent)));
			};
		});
	}
	mount() {
		this.register();
	}
	update() {
		const prev = this.state.visualElement.prevProps;
		if (!Boolean(prev?.whileHover || prev?.onHoverStart || prev?.onHoverEnd) && this.isActive()) this.register();
	}
	unmount() {
		this.removeHover?.();
		this.removeHover = void 0;
	}
};
//#endregion
//#region ../../node_modules/motion-v/dist/es/features/gestures/in-view/index.mjs
var InViewGesture = class extends Feature$1 {
	static #_ = this.key = "inView";
	constructor(state) {
		super(state);
	}
	isActive() {
		const { whileInView, onViewportEnter, onViewportLeave } = this.state.options;
		return Boolean(whileInView || onViewportEnter || onViewportLeave);
	}
	startObserver() {
		const element = this.state.element;
		if (!element || !this.isActive()) return;
		this.removeObserver?.();
		const { once, ...viewOptions } = this.state.options.inViewOptions || {};
		this.removeObserver = inView(element, (_, entry) => {
			const props = this.state.options;
			this.state.setActive("whileInView", true);
			if (props.onViewportEnter) frame.postRender(() => props.onViewportEnter(entry));
			if (!once) return () => {
				this.state.setActive("whileInView", false);
				const leaveCallback = this.state.options.onViewportLeave;
				if (leaveCallback) frame.postRender(() => leaveCallback(entry));
			};
		}, viewOptions);
	}
	mount() {
		this.startObserver();
	}
	update() {
		const { props, prevProps } = this.state.visualElement;
		if ([
			"amount",
			"margin",
			"root"
		].some((name) => {
			return props.inViewOptions?.[name] !== prevProps?.inViewOptions?.[name];
		})) this.startObserver();
	}
	unmount() {
		this.removeObserver?.();
		this.removeObserver = void 0;
	}
};
//#endregion
//#region ../../node_modules/motion-v/dist/es/features/gestures/focus/index.mjs
var FocusGesture = class extends Feature$1 {
	static #_ = this.key = "focus";
	constructor(state) {
		super(state);
		this.isFocused = false;
	}
	onFocus() {
		let isFocusVisible = false;
		try {
			isFocusVisible = this.state.element.matches(":focus-visible");
		} catch {
			isFocusVisible = true;
		}
		if (!isFocusVisible) return;
		this.state.setActive("whileFocus", true);
		this.isFocused = true;
	}
	onBlur() {
		if (!this.isFocused) return;
		this.state.setActive("whileFocus", false);
		this.isFocused = false;
	}
	mount() {
		const element = this.state.element;
		this.removeFocus = pipe(addDomEvent(element, "focus", () => this.onFocus()), addDomEvent(element, "blur", () => this.onBlur()));
	}
	unmount() {
		this.removeFocus?.();
		this.removeFocus = void 0;
	}
};
//#endregion
//#region ../../node_modules/motion-v/dist/es/features/layout/utils.mjs
function getClosestProjectingNode(visualElement) {
	if (!visualElement) return void 0;
	return visualElement.options.allowProjection !== false ? visualElement.projection : getClosestProjectingNode(visualElement.parent);
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/features/layout/config.mjs
var defaultScaleCorrector = {
	borderRadius: {
		...correctBorderRadius,
		applyTo: [
			"borderTopLeftRadius",
			"borderTopRightRadius",
			"borderBottomLeftRadius",
			"borderBottomRightRadius"
		]
	},
	borderTopLeftRadius: correctBorderRadius,
	borderTopRightRadius: correctBorderRadius,
	borderBottomLeftRadius: correctBorderRadius,
	borderBottomRightRadius: correctBorderRadius,
	boxShadow: correctBoxShadow
};
//#endregion
//#region ../../node_modules/motion-v/dist/es/features/gestures/drag/utils/is.mjs
function isHTMLElement$1(value) {
	return typeof value === "object" && value !== null && "nodeType" in value;
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/utils/is.mjs
var isSSR = typeof window === "undefined";
//#endregion
//#region ../../node_modules/motion-v/dist/es/features/layout/projection.mjs
var ProjectionFeature = class extends Feature$1 {
	static #_ = this.key = "projection";
	constructor(state) {
		super(state);
		addScaleCorrector(defaultScaleCorrector);
		if (!isSSR) this.initProjection();
	}
	initProjection() {
		const options = this.state.options;
		this.state.visualElement.projection = new HTMLProjectionNode(this.state.visualElement.latestValues, options["data-framer-portal-id"] ? void 0 : getClosestProjectingNode(this.state.visualElement.parent));
		this.projection = this.state.visualElement.projection;
		this.projection.isPresent = true;
		this.setOptions();
	}
	setOptions() {
		const options = this.state.options;
		const { layoutId, layout, drag = false, dragConstraints = false } = options;
		this.projection?.setOptions({
			layout,
			layoutId,
			alwaysMeasureLayout: Boolean(layoutId) || Boolean(drag) || dragConstraints && isHTMLElement$1(dragConstraints),
			visualElement: this.state.visualElement,
			animationType: typeof options.layout === "string" ? options.layout : "both",
			layoutRoot: options.layoutRoot,
			layoutScroll: options.layoutScroll,
			crossfade: options.crossfade,
			onExitComplete: () => {
				if (!this.projection?.isPresent && this.state.options.layoutId && !this.state.isExiting) queueMicrotask(() => {
					this.state.getFeature("exit")?.completeExitFromProjection();
				});
			}
		});
	}
	update() {
		this.setOptions();
	}
	mount() {
		this.projection?.mount(this.state.element);
	}
};
//#endregion
//#region ../../node_modules/motion-v/dist/es/events/add-pointer-event.mjs
function addPointerEvent(target, eventName, handler, options) {
	return addDomEvent(target, eventName, addPointerInfo(handler), options);
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/features/gestures/pan/PanSession.mjs
var overflowStyles$1 = /* @__PURE__ */ new Set(["auto", "scroll"]);
var PanSession = class {
	constructor(event, handlers, { transformPagePoint, contextWindow, dragSnapToOrigin = false, element } = {}) {
		this.startEvent = null;
		this.lastMoveEvent = null;
		this.lastMoveEventInfo = null;
		this.handlers = {};
		this.contextWindow = window;
		this.scrollPositions = /* @__PURE__ */ new Map();
		this.onElementScroll = (event$1) => {
			this.handleScroll(event$1.target);
		};
		this.onWindowScroll = () => {
			this.handleScroll(window);
		};
		this.updatePoint = () => {
			if (!(this.lastMoveEvent && this.lastMoveEventInfo)) return;
			const info = getPanInfo(this.lastMoveEventInfo, this.history);
			const isPanStarted = this.startEvent !== null;
			const isDistancePastThreshold = distance2D(info.offset, {
				x: 0,
				y: 0
			}) >= 3;
			if (!isPanStarted && !isDistancePastThreshold) return;
			const { point: point$1 } = info;
			const { timestamp: timestamp$1 } = frameData;
			this.history.push({
				...point$1,
				timestamp: timestamp$1
			});
			const { onStart, onMove } = this.handlers;
			if (!isPanStarted) {
				onStart && onStart(this.lastMoveEvent, info);
				this.startEvent = this.lastMoveEvent;
			}
			onMove && onMove(this.lastMoveEvent, info);
		};
		this.handlePointerMove = (event$1, info) => {
			this.lastMoveEvent = event$1;
			this.lastMoveEventInfo = transformPoint(info, this.transformPagePoint);
			frame.update(this.updatePoint, true);
		};
		this.handlePointerUp = (event$1, info) => {
			this.end();
			const { onEnd, onSessionEnd, resumeAnimation } = this.handlers;
			if (this.dragSnapToOrigin || !this.startEvent) resumeAnimation && resumeAnimation();
			if (!(this.lastMoveEvent && this.lastMoveEventInfo)) return;
			const panInfo = getPanInfo(event$1.type === "pointercancel" ? this.lastMoveEventInfo : transformPoint(info, this.transformPagePoint), this.history);
			if (this.startEvent && onEnd) onEnd(event$1, panInfo);
			onSessionEnd && onSessionEnd(event$1, panInfo);
		};
		if (!isPrimaryPointer$1(event)) return;
		this.dragSnapToOrigin = dragSnapToOrigin;
		this.handlers = handlers;
		this.transformPagePoint = transformPagePoint;
		this.contextWindow = contextWindow || window;
		const initialInfo = transformPoint(extractEventInfo(event), this.transformPagePoint);
		const { point } = initialInfo;
		const { timestamp } = frameData;
		this.history = [{
			...point,
			timestamp
		}];
		const { onSessionStart } = handlers;
		onSessionStart && onSessionStart(event, getPanInfo(initialInfo, this.history));
		this.removeListeners = pipe(addPointerEvent(this.contextWindow, "pointermove", this.handlePointerMove), addPointerEvent(this.contextWindow, "pointerup", this.handlePointerUp), addPointerEvent(this.contextWindow, "pointercancel", this.handlePointerUp));
		if (element) this.startScrollTracking(element);
	}
	isScrollable(node) {
		const style = window.getComputedStyle(node);
		return style.overflow === "auto" || style.overflow === "scroll" || style.overflowX === "auto" || style.overflowX === "scroll" || style.overflowY === "auto" || style.overflowY === "scroll";
	}
	startScrollTracking(element) {
		let current = element.parentElement;
		while (current) {
			const style = getComputedStyle(current);
			if (overflowStyles$1.has(style.overflowX) || overflowStyles$1.has(style.overflowY)) this.scrollPositions.set(current, {
				x: current.scrollLeft,
				y: current.scrollTop
			});
			current = current.parentElement;
		}
		this.scrollPositions.set(window, {
			x: window.scrollX,
			y: window.scrollY
		});
		window.addEventListener("scroll", this.onElementScroll, {
			capture: true,
			passive: true
		});
		window.addEventListener("scroll", this.onWindowScroll, { passive: true });
		this.removeScrollListeners = () => {
			window.removeEventListener("scroll", this.onElementScroll, { capture: true });
			window.removeEventListener("scroll", this.onWindowScroll);
		};
	}
	handleScroll(target) {
		const initial = this.scrollPositions.get(target);
		if (!initial) return;
		const isWindow = target === window;
		const current = isWindow ? {
			x: window.scrollX,
			y: window.scrollY
		} : {
			x: target.scrollLeft,
			y: target.scrollTop
		};
		const delta = {
			x: current.x - initial.x,
			y: current.y - initial.y
		};
		if (delta.x === 0 && delta.y === 0) return;
		if (isWindow) {
			if (this.lastMoveEventInfo) {
				this.lastMoveEventInfo.point.x += delta.x;
				this.lastMoveEventInfo.point.y += delta.y;
			}
		} else if (this.history.length > 0) {
			this.history[0].x -= delta.x;
			this.history[0].y -= delta.y;
		}
		this.scrollPositions.set(target, current);
		frame.update(this.updatePoint, true);
	}
	updateHandlers(handlers) {
		this.handlers = handlers;
	}
	end() {
		this.removeListeners && this.removeListeners();
		this.removeScrollListeners?.();
		this.scrollPositions.clear();
		cancelFrame(this.updatePoint);
	}
};
function transformPoint(info, transformPagePoint) {
	return transformPagePoint ? { point: transformPagePoint(info.point) } : info;
}
function subtractPoint(a, b) {
	return {
		x: a.x - b.x,
		y: a.y - b.y
	};
}
function getPanInfo({ point }, history) {
	return {
		point,
		delta: subtractPoint(point, lastDevicePoint(history)),
		offset: subtractPoint(point, startDevicePoint(history)),
		velocity: getVelocity(history, .1)
	};
}
function startDevicePoint(history) {
	return history[0];
}
function lastDevicePoint(history) {
	return history[history.length - 1];
}
function getVelocity(history, timeDelta) {
	if (history.length < 2) return {
		x: 0,
		y: 0
	};
	let i = history.length - 1;
	let timestampedPoint = null;
	const lastPoint = lastDevicePoint(history);
	while (i >= 0) {
		timestampedPoint = history[i];
		if (lastPoint.timestamp - timestampedPoint.timestamp > /* @__PURE__ */ secondsToMilliseconds(timeDelta)) break;
		i--;
	}
	if (!timestampedPoint) return {
		x: 0,
		y: 0
	};
	const time = /* @__PURE__ */ millisecondsToSeconds(lastPoint.timestamp - timestampedPoint.timestamp);
	if (time === 0) return {
		x: 0,
		y: 0
	};
	const currentVelocity = {
		x: (lastPoint.x - timestampedPoint.x) / time,
		y: (lastPoint.y - timestampedPoint.y) / time
	};
	if (currentVelocity.x === Infinity) currentVelocity.x = 0;
	if (currentVelocity.y === Infinity) currentVelocity.y = 0;
	return currentVelocity;
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/features/gestures/pan/index.mjs
function asyncHandler(handler) {
	return (event, info) => {
		if (handler) frame.postRender(() => handler(event, info));
	};
}
var PanGesture = class extends Feature$1 {
	constructor(..._args) {
		super(..._args);
		this.removePointerDownListener = noop;
	}
	static #_ = this.key = "pan";
	onPointerDown(pointerDownEvent) {
		this.session = new PanSession(pointerDownEvent, this.createPanHandlers(), {
			transformPagePoint: this.state.visualElement.getTransformPagePoint(),
			contextWindow: getContextWindow(this.state.visualElement)
		});
	}
	createPanHandlers() {
		return {
			onSessionStart: asyncHandler((_, info) => {
				const { onPanSessionStart } = this.state.options;
				onPanSessionStart && onPanSessionStart(_, info);
			}),
			onStart: asyncHandler((_, info) => {
				const { onPanStart } = this.state.options;
				onPanStart && onPanStart(_, info);
			}),
			onMove: (event, info) => {
				const { onPan } = this.state.options;
				onPan && onPan(event, info);
			},
			onEnd: (event, info) => {
				const { onPanEnd } = this.state.options;
				delete this.session;
				if (onPanEnd) frame.postRender(() => onPanEnd(event, info));
			}
		};
	}
	mount() {
		this.removePointerDownListener = addPointerEvent(this.state.element, "pointerdown", this.onPointerDown.bind(this));
	}
	update() {}
	unmount() {
		this.removePointerDownListener();
		this.session && this.session.end();
	}
};
//#endregion
//#region ../../node_modules/motion-v/dist/es/features/gestures/drag/lock.mjs
function createLock(name) {
	let lock = null;
	return () => {
		const openLock = () => {
			lock = null;
		};
		if (lock === null) {
			lock = name;
			return openLock;
		}
		return false;
	};
}
var globalHorizontalLock = createLock("dragHorizontal");
var globalVerticalLock = createLock("dragVertical");
function getGlobalLock(drag) {
	let lock = false;
	if (drag === "y") lock = globalVerticalLock();
	else if (drag === "x") lock = globalHorizontalLock();
	else {
		const openHorizontal = globalHorizontalLock();
		const openVertical = globalVerticalLock();
		if (openHorizontal && openVertical) lock = () => {
			openHorizontal();
			openVertical();
		};
		else {
			if (openHorizontal) openHorizontal();
			if (openVertical) openVertical();
		}
	}
	return lock;
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/features/gestures/drag/utils/constraints.mjs
function applyConstraints(point, { min, max }, elastic) {
	if (min !== void 0 && point < min) point = elastic ? mixNumber(min, point, elastic.min) : Math.max(point, min);
	else if (max !== void 0 && point > max) point = elastic ? mixNumber(max, point, elastic.max) : Math.min(point, max);
	return point;
}
var defaultElastic = .35;
function calcRelativeConstraints(layoutBox, { top, left, bottom, right }) {
	return {
		x: calcRelativeAxisConstraints(layoutBox.x, left, right),
		y: calcRelativeAxisConstraints(layoutBox.y, top, bottom)
	};
}
function calcRelativeAxisConstraints(axis, min, max) {
	return {
		min: min !== void 0 ? axis.min + min : void 0,
		max: max !== void 0 ? axis.max + max - (axis.max - axis.min) : void 0
	};
}
function resolveDragElastic(dragElastic = defaultElastic) {
	if (dragElastic === false) dragElastic = 0;
	else if (dragElastic === true) dragElastic = defaultElastic;
	return {
		x: resolveAxisElastic(dragElastic, "left", "right"),
		y: resolveAxisElastic(dragElastic, "top", "bottom")
	};
}
function resolveAxisElastic(dragElastic, minLabel, maxLabel) {
	return {
		min: resolvePointElastic(dragElastic, minLabel),
		max: resolvePointElastic(dragElastic, maxLabel)
	};
}
function resolvePointElastic(dragElastic, label) {
	return typeof dragElastic === "number" ? dragElastic : dragElastic[label] || 0;
}
function rebaseAxisConstraints(layout, constraints) {
	const relativeConstraints = {};
	if (constraints.min !== void 0) relativeConstraints.min = constraints.min - layout.min;
	if (constraints.max !== void 0) relativeConstraints.max = constraints.max - layout.min;
	return relativeConstraints;
}
function calcViewportConstraints(layoutBox, constraintsBox) {
	return {
		x: calcViewportAxisConstraints(layoutBox.x, constraintsBox.x),
		y: calcViewportAxisConstraints(layoutBox.y, constraintsBox.y)
	};
}
function calcViewportAxisConstraints(layoutAxis, constraintsAxis) {
	let min = constraintsAxis.min - layoutAxis.min;
	let max = constraintsAxis.max - layoutAxis.max;
	if (constraintsAxis.max - constraintsAxis.min < layoutAxis.max - layoutAxis.min) [min, max] = [max, min];
	return {
		min,
		max
	};
}
function calcOrigin(source, target) {
	let origin = .5;
	const sourceLength = calcLength(source);
	const targetLength = calcLength(target);
	if (targetLength > sourceLength) origin = /* @__PURE__ */ progress(target.min, target.max - sourceLength, source.min);
	else if (sourceLength > targetLength) origin = /* @__PURE__ */ progress(source.min, source.max - targetLength, target.min);
	return clamp(0, 1, origin);
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/features/gestures/drag/VisualElementDragControls.mjs
var elementDragControls = /* @__PURE__ */ new WeakMap();
var VisualElementDragControls = class {
	constructor(state) {
		this.openGlobalLock = null;
		this.isDragging = false;
		this.currentDirection = null;
		this.originPoint = {
			x: 0,
			y: 0
		};
		this.constraints = false;
		this.hasMutatedConstraints = false;
		this.elastic = createBox();
		this.state = state;
	}
	get visualElement() {
		return this.state.visualElement;
	}
	start(originEvent, { snapToCursor = false } = {}) {
		const onSessionStart = (event) => {
			if (snapToCursor) this.stopAnimation();
			else this.pauseAnimation();
			if (snapToCursor) this.snapToCursor(extractEventInfo(event, "page").point);
		};
		const onStart = (event, info) => {
			this.stopAnimation();
			const { drag, dragPropagation, onDragStart } = this.getProps();
			if (drag && !dragPropagation) {
				if (this.openGlobalLock) this.openGlobalLock();
				this.openGlobalLock = getGlobalLock(drag);
				if (!this.openGlobalLock) return;
			}
			this.isDragging = true;
			this.currentDirection = null;
			this.resolveConstraints();
			if (this.visualElement.projection) {
				this.visualElement.projection.isAnimationBlocked = true;
				this.visualElement.projection.target = void 0;
			}
			eachAxis((axis) => {
				let current = this.getAxisMotionValue(axis).get() || 0;
				if (percent.test(current)) {
					const { projection } = this.visualElement;
					if (projection && projection.layout) {
						const measuredAxis = projection.layout.layoutBox[axis];
						if (measuredAxis) current = calcLength(measuredAxis) * (parseFloat(current) / 100);
					}
				}
				this.originPoint[axis] = current;
			});
			if (onDragStart) frame.postRender(() => onDragStart(event, info));
			addValueToWillChange(this.visualElement, "transform");
			this.state.setActive("whileDrag", true);
		};
		const onMove = (event, info) => {
			const { dragPropagation, dragDirectionLock, onDirectionLock, onDrag } = this.getProps();
			if (!dragPropagation && !this.openGlobalLock) return;
			const { offset } = info;
			if (dragDirectionLock && this.currentDirection === null) {
				this.currentDirection = getCurrentDirection(offset);
				if (this.currentDirection !== null) onDirectionLock && onDirectionLock(this.currentDirection);
				return;
			}
			this.updateAxis("x", info.point, offset);
			this.updateAxis("y", info.point, offset);
			this.visualElement.render();
			onDrag && onDrag(event, info);
		};
		const onSessionEnd = (event, info) => this.stop(event, info);
		const resumeAnimation = () => eachAxis((axis) => this.getAnimationState(axis) === "paused" && this.getAxisMotionValue(axis).animation?.play());
		const { dragSnapToOrigin } = this.getProps();
		this.panSession = new PanSession(originEvent, {
			onSessionStart,
			onStart,
			onMove,
			onSessionEnd,
			resumeAnimation
		}, {
			transformPagePoint: this.visualElement.getTransformPagePoint(),
			dragSnapToOrigin,
			contextWindow: getContextWindow(this.visualElement),
			element: this.state.element
		});
	}
	stop(event, info) {
		const isDragging = this.isDragging;
		this.cancel();
		if (!isDragging) return;
		const { velocity } = info;
		this.startAnimation(velocity);
		const { onDragEnd } = this.getProps();
		if (onDragEnd) frame.postRender(() => onDragEnd(event, info));
	}
	cancel() {
		this.isDragging = false;
		const { projection } = this.visualElement;
		if (projection) projection.isAnimationBlocked = false;
		this.panSession && this.panSession.end();
		this.panSession = void 0;
		const { dragPropagation } = this.getProps();
		if (!dragPropagation && this.openGlobalLock) {
			this.openGlobalLock();
			this.openGlobalLock = null;
		}
		this.state.setActive("whileDrag", false);
	}
	updateAxis(axis, _point, offset) {
		const { drag } = this.getProps();
		if (!offset || !shouldDrag(axis, drag, this.currentDirection)) return;
		const axisValue = this.getAxisMotionValue(axis);
		let next = this.originPoint[axis] + offset[axis];
		if (this.constraints && this.constraints[axis]) next = applyConstraints(next, this.constraints[axis], this.elastic[axis]);
		axisValue.set(next);
	}
	resolveConstraints() {
		const { dragConstraints, dragElastic } = this.getProps();
		const layout = this.visualElement.projection && !this.visualElement.projection.layout ? this.visualElement.projection.measure(false) : this.visualElement.projection?.layout;
		const prevConstraints = this.constraints;
		if (dragConstraints && isHTMLElement$1(dragConstraints)) {
			if (!this.constraints) this.constraints = this.resolveRefConstraints();
		} else if (dragConstraints && layout) this.constraints = calcRelativeConstraints(layout.layoutBox, dragConstraints);
		else this.constraints = false;
		this.elastic = resolveDragElastic(dragElastic);
		if (prevConstraints !== this.constraints && layout && this.constraints && !this.hasMutatedConstraints) eachAxis((axis) => {
			if (this.constraints !== false && this.getAxisMotionValue(axis)) this.constraints[axis] = rebaseAxisConstraints(layout.layoutBox[axis], this.constraints[axis]);
		});
	}
	resolveRefConstraints() {
		const { dragConstraints: constraints, onMeasureDragConstraints } = this.getProps();
		if (!constraints || !isHTMLElement$1(constraints)) return false;
		const constraintsElement = constraints;
		invariant$1(constraintsElement !== null, "If `dragConstraints` is set as a React ref, that ref must be passed to another component's `ref` prop.");
		const { projection } = this.visualElement;
		if (!projection || !projection.layout) return false;
		const constraintsBox = measurePageBox(constraintsElement, projection.root, this.visualElement.getTransformPagePoint());
		let measuredConstraints = calcViewportConstraints(projection.layout.layoutBox, constraintsBox);
		if (onMeasureDragConstraints) {
			const userConstraints = onMeasureDragConstraints(convertBoxToBoundingBox(measuredConstraints));
			this.hasMutatedConstraints = !!userConstraints;
			if (userConstraints) measuredConstraints = convertBoundingBoxToBox(userConstraints);
		}
		return measuredConstraints;
	}
	startAnimation(velocity) {
		const { drag, dragMomentum, dragElastic, dragTransition, dragSnapToOrigin, onDragTransitionEnd } = this.getProps();
		const constraints = this.constraints || {};
		const momentumAnimations = eachAxis((axis) => {
			if (!shouldDrag(axis, drag, this.currentDirection)) return;
			let transition = constraints && constraints[axis] || {};
			if (dragSnapToOrigin) transition = {
				min: 0,
				max: 0
			};
			const bounceStiffness = dragElastic ? 200 : 1e6;
			const bounceDamping = dragElastic ? 40 : 1e7;
			const inertia = {
				type: "inertia",
				velocity: dragMomentum ? velocity[axis] : 0,
				bounceStiffness,
				bounceDamping,
				timeConstant: 750,
				restDelta: 1,
				restSpeed: 10,
				...dragTransition,
				...transition
			};
			return this.startAxisValueAnimation(axis, inertia);
		});
		return Promise.all(momentumAnimations).then(onDragTransitionEnd);
	}
	startAxisValueAnimation(axis, transition) {
		const axisValue = this.getAxisMotionValue(axis);
		addValueToWillChange(this.visualElement, axis);
		return axisValue.start(animateMotionValue(axis, axisValue, 0, transition, this.visualElement, false));
	}
	stopAnimation() {
		if (!this.visualElement.projection?.isPresent) return;
		eachAxis((axis) => this.getAxisMotionValue(axis).stop());
	}
	pauseAnimation() {
		eachAxis((axis) => this.getAxisMotionValue(axis).animation?.pause());
	}
	getAnimationState(axis) {
		return this.getAxisMotionValue(axis).animation?.state;
	}
	getAxisMotionValue(axis) {
		const dragKey = `_drag${axis.toUpperCase()}`;
		const props = this.visualElement.getProps();
		return props[dragKey] || this.visualElement.getValue(axis, (props.initial ? props.initial[axis] : void 0) || 0);
	}
	snapToCursor(point) {
		eachAxis((axis) => {
			const { drag } = this.getProps();
			if (!shouldDrag(axis, drag, this.currentDirection)) return;
			const { projection } = this.visualElement;
			const axisValue = this.getAxisMotionValue(axis);
			if (projection && projection.layout) {
				const { min, max } = projection.layout.layoutBox[axis];
				axisValue.set(point[axis] - mixNumber(min, max, .5));
			}
		});
	}
	scalePositionWithinConstraints() {
		if (!this.visualElement.current) return;
		const { drag, dragConstraints } = this.getProps();
		const { projection } = this.visualElement;
		if (!isHTMLElement$1(dragConstraints) || !projection || !this.constraints) return;
		this.stopAnimation();
		const boxProgress = {
			x: 0,
			y: 0
		};
		eachAxis((axis) => {
			const axisValue = this.getAxisMotionValue(axis);
			if (axisValue && this.constraints !== false) {
				const latest = axisValue.get();
				boxProgress[axis] = calcOrigin({
					min: latest,
					max: latest
				}, this.constraints[axis]);
			}
		});
		const { transformTemplate } = this.visualElement.getProps();
		this.state.element.style.transform = transformTemplate ? transformTemplate({}, "") : "none";
		projection.root && projection.root.updateScroll();
		projection.updateLayout();
		this.resolveConstraints();
		eachAxis((axis) => {
			if (!shouldDrag(axis, drag, null)) return;
			const axisValue = this.getAxisMotionValue(axis);
			const { min, max } = this.constraints[axis];
			axisValue.set(mixNumber(min, max, boxProgress[axis]));
		});
	}
	addListeners() {
		if (!this.state.element) return;
		elementDragControls.set(this.visualElement, this);
		const element = this.state.element;
		const stopPointerListener = addPointerEvent(element, "pointerdown", (event) => {
			const { drag, dragListener = true } = this.getProps();
			drag && dragListener && this.start(event);
		});
		const measureDragConstraints = () => {
			const { dragConstraints } = this.getProps();
			if (isHTMLElement$1(dragConstraints)) this.constraints = this.resolveRefConstraints();
		};
		const { projection } = this.visualElement;
		const stopMeasureLayoutListener = projection.addEventListener("measure", measureDragConstraints);
		if (projection && !projection.layout) {
			projection.root && projection.root.updateScroll();
			projection.updateLayout();
		}
		frame.read(measureDragConstraints);
		const stopResizeListener = addDomEvent(window, "resize", () => this.scalePositionWithinConstraints());
		const stopLayoutUpdateListener = projection.addEventListener("didUpdate", (({ delta, hasLayoutChanged }) => {
			if (this.isDragging && hasLayoutChanged) {
				eachAxis((axis) => {
					const motionValue$1 = this.getAxisMotionValue(axis);
					if (!motionValue$1) return;
					this.originPoint[axis] += delta[axis].translate;
					motionValue$1.set(motionValue$1.get() + delta[axis].translate);
				});
				this.visualElement.render();
			}
		}));
		return () => {
			stopResizeListener();
			stopPointerListener();
			stopMeasureLayoutListener();
			stopLayoutUpdateListener && stopLayoutUpdateListener();
		};
	}
	getProps() {
		const props = this.visualElement.getProps();
		const { drag = false, dragDirectionLock = false, dragPropagation = false, dragConstraints = false, dragElastic = defaultElastic, dragMomentum = true } = props;
		return {
			...props,
			drag,
			dragDirectionLock,
			dragPropagation,
			dragConstraints,
			dragElastic,
			dragMomentum
		};
	}
};
function shouldDrag(direction, drag, currentDirection) {
	return (drag === true || drag === direction) && (currentDirection === null || currentDirection === direction);
}
function getCurrentDirection(offset, lockThreshold = 10) {
	let direction = null;
	if (Math.abs(offset.y) > lockThreshold) direction = "y";
	else if (Math.abs(offset.x) > lockThreshold) direction = "x";
	return direction;
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/features/gestures/drag/index.mjs
var DragGesture = class extends Feature$1 {
	static #_ = this.key = "drag";
	constructor(state) {
		super(state);
		this.removeGroupControls = noop;
		this.removeListeners = noop;
		this.controls = new VisualElementDragControls(state);
	}
	mount() {
		const { dragControls } = this.state.options;
		if (dragControls) this.removeGroupControls = dragControls.subscribe(this.controls);
		this.removeListeners = this.controls.addListeners() || noop;
	}
	unmount() {
		this.removeGroupControls();
		this.removeListeners();
	}
};
//#endregion
//#region ../../node_modules/motion-v/dist/es/features/layout/layout.mjs
var LayoutFeature = class extends Feature$1 {
	static #_ = this.key = "layout";
	constructor(state) {
		super(state);
		addScaleCorrector(defaultScaleCorrector);
	}
	updatePrevLead(isPresent) {
		const projection = this.state.visualElement.projection;
		if (projection.isPresent !== isPresent) {
			projection.isPresent = isPresent;
			if (isPresent) !projection.isLead() && projection?.promote();
			else projection.isLead() && projection?.relegate();
		}
	}
	didUpdate() {
		if (this.state.options.layout || this.state.options.layoutId || this.state.options.drag) this.state.visualElement.projection?.root?.didUpdate();
	}
	mount() {
		const options = this.state.options;
		const layoutGroup = this.state.options.layoutGroup;
		if (options.layout || options.layoutId) {
			const projection = this.state.visualElement.projection;
			if (options.layoutId) {
				const isPresent = !isHidden(this.state.element);
				projection.isPresent = isPresent;
				if (isPresent) projection?.promote();
				else projection?.relegate();
			}
			layoutGroup?.group?.add(projection);
			globalProjectionState.hasEverUpdated = true;
		}
		this.didUpdate();
	}
	unmount() {
		const layoutGroup = this.state.options.layoutGroup;
		const projection = this.state.visualElement.projection;
		if (projection) {
			if (layoutGroup?.group && (this.state.options.layout || this.state.options.layoutId)) layoutGroup.group.remove(projection);
		}
	}
	getSnapshot(isPresent) {
		const projection = this.state.visualElement.projection;
		const { layout, layoutId, drag, layoutDependency } = this.state.visualElement.props;
		const prevProps = this.state.visualElement.prevProps;
		if (!projection || !layout && !layoutId && !drag) return;
		if (drag || prevProps.layoutDependency !== layoutDependency || layoutDependency === void 0 || isPresent !== projection.isPresent) projection.willUpdate();
		if (layoutId) this.updatePrevLead(isPresent);
		nextTick(() => {
			this.didUpdate();
		});
	}
};
//#endregion
//#region ../../node_modules/motion-v/dist/es/features/dom-max.mjs
var domMax = {
	renderer: createVisualElement,
	features: [
		AnimationFeature,
		ExitFeature,
		PressGesture,
		HoverGesture,
		InViewGesture,
		FocusGesture,
		ProjectionFeature,
		PanGesture,
		DragGesture,
		LayoutFeature
	]
};
//#endregion
//#region ../../node_modules/motion-v/dist/es/components/lazy-motion/context.mjs
var [useLazyMotionContext, lazyMotionContextProvider] = createContext("LazyMotionContext");
//#endregion
//#region ../../node_modules/motion-v/dist/es/components/animate-presence/presence.mjs
var [injectAnimatePresence, provideAnimatePresence, animatePresenceInjectionKey] = createContext("AnimatePresenceContext");
//#endregion
//#region ../../node_modules/motion-v/dist/es/state/style.mjs
function camelToDash$1(str) {
	return str.replace(/([A-Z])/g, (match) => `-${match.toLowerCase()}`);
}
function createHTMLRenderState() {
	return {
		transform: {},
		transformOrigin: {},
		style: {},
		vars: {}
	};
}
function createSVGRenderState() {
	return {
		...createHTMLRenderState(),
		attrs: {}
	};
}
function createStyles(latestValues) {
	const state = createHTMLRenderState();
	buildHTMLStyles(state, latestValues);
	const result = { ...state.style };
	for (const key in state.vars) result[key] = state.vars[key];
	if (Object.keys(result).length === 0) return null;
	return result;
}
function createSVGStyles(latestValues, tag, styleProp) {
	const state = createSVGRenderState();
	buildSVGAttrs(state, latestValues, isSVGTag(tag), void 0, styleProp);
	const attrs = {};
	for (const key in state.attrs) {
		const attrKey = camelCaseAttributes.has(key) ? key : camelToDash$1(key);
		attrs[attrKey] = state.attrs[key];
	}
	return {
		attrs,
		style: {
			...state.style,
			...state.vars
		}
	};
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/components/motion/use-motion-state.mjs
function useMotionState(props, bundle = {}) {
	const parentState = injectMotion(null);
	const layoutGroup = injectLayoutGroup({});
	const config = useMotionConfig();
	const presenceContext = injectAnimatePresence({});
	const lazyMotionContext = useLazyMotionContext({
		features: ref({}),
		strict: false
	});
	if (bundle.renderer && lazyMotionContext.strict) {
		const strictMessage = "You have rendered a `motion` component within a `LazyMotion` component. This will break tree shaking. Import and render a `m` component instead.";
		props.ignoreStrict ? warning$1(false, strictMessage) : invariant$1(false, strictMessage);
	}
	const attrs = useAttrs();
	function getProps() {
		return resolveMotionProps(props, {
			layoutGroup,
			presenceContext,
			config: config.value
		});
	}
	function getMotionProps() {
		return {
			...attrs,
			...getProps()
		};
	}
	const state = new MotionState(getMotionProps(), parentState, bundle);
	provideMotion(state);
	watch(lazyMotionContext.features, (bundle$1) => {
		state.setBundle(bundle$1);
	}, {
		immediate: true,
		flush: "pre"
	});
	function getAttrs() {
		const isSVG = state.type === "svg";
		const attrsProps = { ...attrs };
		Object.keys(attrs).forEach((key) => {
			if (isMotionValue(attrs[key])) attrsProps[key] = attrs[key].get();
		});
		const currentValues = state.visualElement?.latestValues || state.latestValues;
		let styleProps = {
			...props.style,
			...isSVG ? {} : currentValues
		};
		for (const key in styleProps) if (isMotionValue(styleProps[key])) styleProps[key] = styleProps[key].get();
		if (isSVG) {
			const { attrs: svgAttrs, style: svgStyle } = createSVGStyles({
				...currentValues,
				...styleProps
			}, state.options.as, props.style);
			Object.assign(attrsProps, svgAttrs);
			styleProps = svgStyle;
		}
		if (props.drag && props.dragListener !== false) Object.assign(styleProps, {
			userSelect: "none",
			WebkitUserSelect: "none",
			WebkitTouchCallout: "none",
			touchAction: props.drag === true ? "none" : `pan-${props.drag === "x" ? "y" : "x"}`
		});
		const style = createStyles(styleProps);
		if (style) attrsProps.style = style;
		return attrsProps;
	}
	const instance = getCurrentInstance()?.proxy;
	function mountState() {
		const el = getMotionElement(instance?.$el);
		state.mount(el);
	}
	onBeforeUnmount(() => {
		state.updateOptions(getMotionProps());
		state.beforeUnmount();
	});
	onMounted(mountState);
	function unmountIfDetached() {
		if (!getMotionElement(instance?.$el)?.isConnected) state.unmount();
	}
	onUnmounted(unmountIfDetached);
	onDeactivated(unmountIfDetached);
	onActivated(() => {
		if (!state.isMounted()) mountState();
	});
	onBeforeUpdate(() => {
		state.updateOptions(getMotionProps());
		state.beforeUpdate();
	});
	onUpdated(() => {
		state.update();
	});
	return {
		getProps,
		getAttrs,
		layoutGroup,
		state
	};
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/components/motion/props.mjs
var MotionComponentProps = {
	"ignoreStrict": { type: Boolean },
	"forwardMotionProps": {
		type: Boolean,
		default: false
	},
	"asChild": {
		type: Boolean,
		default: false
	},
	"whileDrag": { type: [
		String,
		Array,
		Object
	] },
	"whileHover": { type: [
		String,
		Array,
		Object
	] },
	"whilePress": { type: [
		String,
		Array,
		Object
	] },
	"whileInView": { type: [
		String,
		Array,
		Object
	] },
	"whileFocus": { type: [
		String,
		Array,
		Object
	] },
	"custom": { type: [
		String,
		Number,
		Object,
		Array
	] },
	"initial": {
		type: [
			String,
			Array,
			Object,
			Boolean
		],
		default: void 0
	},
	"animate": {
		type: [
			String,
			Array,
			Object
		],
		default: void 0
	},
	"exit": { type: [
		String,
		Array,
		Object
	] },
	"variants": { type: Object },
	"inherit": { type: Boolean },
	"style": { type: Object },
	"transformTemplate": { type: Function },
	"transition": { type: Object },
	"onAnimationComplete": { type: Function },
	"onUpdate": { type: Function },
	"layout": {
		type: [Boolean, String],
		default: false
	},
	"layoutId": {
		type: String,
		default: void 0
	},
	"layoutScroll": {
		type: Boolean,
		default: false
	},
	"layoutRoot": {
		type: Boolean,
		default: false
	},
	"data-framer-portal-id": { type: String },
	"crossfade": {
		type: Boolean,
		default: true
	},
	"layoutDependency": {
		type: null,
		default: void 0
	},
	"onBeforeLayoutMeasure": { type: Function },
	"onLayoutMeasure": { type: Function },
	"onLayoutAnimationStart": { type: Function },
	"onLayoutAnimationComplete": { type: Function },
	"globalPressTarget": { type: Boolean },
	"onPressStart": { type: Function },
	"onPress": { type: Function },
	"onPressCancel": { type: Function },
	"onHoverStart": { type: Function },
	"onHoverEnd": { type: Function },
	"inViewOptions": { type: Object },
	"onViewportEnter": { type: Function },
	"onViewportLeave": { type: Function },
	"drag": { type: [Boolean, String] },
	"dragSnapToOrigin": { type: Boolean },
	"dragDirectionLock": { type: Boolean },
	"dragPropagation": { type: Boolean },
	"dragConstraints": { type: [Boolean, Object] },
	"dragElastic": {
		type: [
			Boolean,
			Number,
			Object
		],
		default: .5
	},
	"dragMomentum": {
		type: Boolean,
		default: true
	},
	"dragTransition": { type: Object },
	"dragListener": {
		type: Boolean,
		default: true
	},
	"dragControls": { type: Object },
	"onDragStart": { type: Function },
	"onDragEnd": { type: Function },
	"onDrag": { type: Function },
	"onDirectionLock": { type: Function },
	"onDragTransitionEnd": { type: Function },
	"onMeasureDragConstraints": { type: Function },
	"onPanSessionStart": { type: Function },
	"onPanStart": { type: Function },
	"onPan": { type: Function },
	"onPanEnd": { type: Function }
};
//#endregion
//#region ../../node_modules/motion-v/dist/es/components/motion/utils.mjs
var componentMaxCache = /* @__PURE__ */ new Map();
var componentMiniCache = /* @__PURE__ */ new Map();
function renderSlotFragments(fragments) {
	if (!Array.isArray(fragments)) return [fragments];
	const result = [];
	for (const item of fragments) if (Array.isArray(item)) result.push(...item);
	else result.push(item);
	return result;
}
var SELF_CLOSING_TAGS = [
	"area",
	"img",
	"input"
];
function handlePrimitiveAndSlot(asTag, allAttrs, slots) {
	if (typeof asTag === "string" && SELF_CLOSING_TAGS.includes(asTag)) return h(asTag, allAttrs);
	if (asTag === "template") {
		if (!slots.default) return null;
		const children = renderSlotFragments(slots.default());
		const firstNonCommentIndex = children.findIndex((child) => child.type !== Comment);
		if (firstNonCommentIndex === -1) return children;
		const firstNonComment = children[firstNonCommentIndex];
		delete firstNonComment.props?.ref;
		const mergedProps = firstNonComment.props ? mergeProps(allAttrs, firstNonComment.props) : allAttrs;
		if (allAttrs.class && firstNonComment.props?.class) delete firstNonComment.props.class;
		const cloned = cloneVNode(firstNonComment, mergedProps);
		for (const prop in mergedProps) if (prop.startsWith("on")) {
			cloned.props ||= {};
			cloned.props[prop] = mergedProps[prop];
		}
		if (children.length === 1) return cloned;
		children[firstNonCommentIndex] = cloned;
		return children;
	}
	return null;
}
function createMotionComponent(component, options = {}) {
	const isString = typeof component === "string";
	const name = isString ? component : component.name || "";
	const componentCache = options.renderer ? componentMaxCache : componentMiniCache;
	if (isString && componentCache.has(component)) return componentCache.get(component);
	const motionComponent = defineComponent({
		inheritAttrs: false,
		props: {
			...MotionComponentProps,
			as: {
				type: [String, Object],
				default: component || "div"
			}
		},
		name: name ? `motion.${name}` : "Motion",
		setup(props, { slots }) {
			const { getProps, getAttrs, state } = useMotionState(props, options);
			function onVnodeUpdated() {
				const el = state.element;
				if ((!(typeof props.as === "object") || props.asChild) && el) {
					const { style } = getAttrs();
					if (style) for (const [key, val] of Object.entries(style)) el.style[key] = val;
				}
			}
			return () => {
				const motionProps = getProps();
				const motionAttrs = getAttrs();
				const asTag = props.asChild ? "template" : props.as;
				const allAttrs = {
					...props.forwardMotionProps ? motionProps : {},
					...motionAttrs,
					onVnodeUpdated
				};
				const primitiveOrSlotResult = handlePrimitiveAndSlot(asTag, allAttrs, slots);
				if (primitiveOrSlotResult !== null) return primitiveOrSlotResult;
				return h(asTag, { ...allAttrs }, slots);
			};
		}
	});
	if (isString) componentCache.set(component, motionComponent);
	return motionComponent;
}
function createMotionComponentWithFeatures(featureBundle) {
	return new Proxy({}, { get(_, prop) {
		if (prop === "create") return (component, options) => createMotionComponent(component, {
			...options,
			...featureBundle
		});
		return createMotionComponent(prop, { ...featureBundle });
	} });
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/components/motion/index.mjs
var motion = createMotionComponentWithFeatures(domMax);
var Motion = motion.create("div");
//#endregion
//#region ../../node_modules/motion-v/dist/es/components/animate-presence/exit-session.mjs
var popId = 0;
function createExitSession(config) {
	const sessions = /* @__PURE__ */ new Map();
	function addPopStyle(session) {
		if (config.props.mode !== "popLayout") return;
		const element = session.el;
		const parent = element.offsetParent;
		const parentWidth = parent instanceof HTMLElement ? parent.offsetWidth || 0 : 0;
		const size = {
			height: element.offsetHeight || 0,
			width: element.offsetWidth || 0,
			top: element.offsetTop,
			left: element.offsetLeft,
			right: 0
		};
		size.right = parentWidth - size.width - size.left;
		const x = config.props.anchorX === "left" ? `left: ${size.left}px` : `right: ${size.right}px`;
		const elementPopId = `pop-${popId++}`;
		element.dataset.motionPopId = elementPopId;
		const style = document.createElement("style");
		const nonce = config.getNonce();
		if (nonce) style.nonce = nonce;
		session.popStyle = style;
		document.head.appendChild(style);
		if (style.sheet) style.sheet.insertRule(`
    [data-motion-pop-id="${elementPopId}"] {
      position: absolute !important;
      width: ${size.width}px !important;
      height: ${size.height}px !important;
      top: ${size.top}px !important;
      ${x} !important;
      }
      `);
	}
	function removePopStyle(session) {
		const style = session.popStyle;
		if (!style) return;
		session.popStyle = void 0;
		frame.render(() => {
			document.head.removeChild(style);
		});
	}
	function track(el, states, done) {
		const session = {
			el,
			states,
			done,
			aborted: false
		};
		sessions.set(el, session);
		addPopStyle(session);
		const completions = states.map((state) => state.getFeature("exit")?.exit() ?? Promise.resolve());
		Promise.all(completions).then(() => {
			if (!session.aborted) finalize(session);
		});
	}
	function abort(el) {
		const session = sessions.get(el);
		if (!session) return;
		session.aborted = true;
		sessions.delete(el);
		removePopStyle(session);
	}
	function finalize(session) {
		sessions.delete(session.el);
		removePopStyle(session);
		session.states.forEach((state) => {
			state.getSnapshot(false);
		});
		session.done();
		if (!session.el.isConnected) session.states.forEach((state) => {
			state.unmount();
		});
		config.onAllComplete();
	}
	function dispose() {
		sessions.forEach((session) => {
			session.states.forEach((state) => {
				state.unmount();
			});
		});
		sessions.clear();
	}
	return {
		track,
		abort,
		dispose
	};
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/components/animate-presence/use-presence-container.mjs
function usePresenceContainer(props) {
	const motionConfig = useMotionConfig();
	const sessions = createExitSession({
		props,
		getNonce: () => motionConfig.value.nonce,
		onAllComplete: () => props.onExitComplete?.()
	});
	const registered = /* @__PURE__ */ new Set();
	let hasMounted = false;
	provideAnimatePresence({
		get initial() {
			return hasMounted ? void 0 : props.initial;
		},
		get custom() {
			return props.custom;
		},
		register: (state) => registered.add(state),
		unregister: (state) => registered.delete(state)
	});
	onMounted(() => {
		hasMounted = true;
	});
	function findMotionStates(container) {
		const states = [];
		for (const state of registered) {
			const el = state.element;
			if (el && (el === container || container.contains(el))) states.push(state);
		}
		return states;
	}
	function enter(el, done) {
		sessions.abort(el);
		findMotionStates(el).forEach((state) => {
			state.getFeature("exit")?.reenter();
		});
		done();
	}
	function exit(el, done) {
		const container = el;
		const states = findMotionStates(container);
		if (states.length === 0) {
			done();
			props.onExitComplete?.();
			return;
		}
		sessions.track(container, states, done);
	}
	onUnmounted(() => {
		sessions.dispose();
	});
	return {
		enter,
		exit
	};
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/components/animate-presence/AnimatePresence.mjs
var AnimatePresence_default = /* @__PURE__ */ defineComponent({
	name: "AnimatePresence",
	inheritAttrs: true,
	__name: "AnimatePresence",
	props: {
		mode: { default: "sync" },
		initial: {
			type: Boolean,
			default: true
		},
		as: {},
		custom: {},
		onExitComplete: {},
		anchorX: { default: "left" }
	},
	setup(__props) {
		const props = __props;
		const { enter, exit } = usePresenceContainer(props);
		const transitionProps = computed(() => {
			if (props.mode !== "wait") return { tag: props.as };
			return { mode: props.mode === "wait" ? "out-in" : void 0 };
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(resolveDynamicComponent(_ctx.mode === "wait" ? Transition : TransitionGroup), mergeProps(transitionProps.value, {
				appear: "",
				css: false,
				onLeave: unref(exit),
				onEnter: unref(enter)
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["onLeave", "onEnter"]);
		};
	}
});
//#endregion
//#region ../../node_modules/motion-v/dist/es/value/use-combine-values.mjs
function useCombineMotionValues(combineValues) {
	const value = motionValue(combineValues());
	const updateValue = () => value.set(combineValues());
	const scheduleUpdate = () => frame.preRender(updateValue, false, true);
	let subscriptions;
	const subscribe = (values) => {
		subscriptions = values.map((v) => v.on("change", scheduleUpdate));
	};
	const unsubscribe = () => {
		subscriptions.forEach((unsubscribe$1) => unsubscribe$1());
		cancelFrame(updateValue);
	};
	if (getCurrentInstance()) onUnmounted(() => {
		unsubscribe();
	});
	return {
		subscribe,
		unsubscribe,
		value,
		updateValue
	};
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/value/use-computed.mjs
function useComputed(computed$1) {
	collectMotionValues.current = [];
	const { value, subscribe, unsubscribe, updateValue } = useCombineMotionValues(computed$1);
	subscribe(collectMotionValues.current);
	collectMotionValues.current = void 0;
	watchEffect(() => {
		unsubscribe();
		collectMotionValues.current = [];
		updateValue();
		subscribe(collectMotionValues.current);
		collectMotionValues.current = void 0;
	});
	return value;
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/value/use-transform.mjs
function useTransform(input, inputRangeOrTransformer, outputRange, options) {
	if (typeof input === "function") return useComputed(input);
	if (outputRange && !Array.isArray(outputRange) && typeof outputRange === "object") {
		const result$1 = {};
		for (const key in outputRange) if (Object.prototype.hasOwnProperty.call(outputRange, key)) {
			const keyOutputRange = outputRange[key];
			result$1[key] = useTransform(input, inputRangeOrTransformer, keyOutputRange, options);
		}
		return result$1;
	}
	let inputValues;
	let transformer;
	if (typeof inputRangeOrTransformer === "function") {
		transformer = inputRangeOrTransformer;
		inputValues = Array.isArray(input) ? input : [input];
	} else if (isRef(inputRangeOrTransformer)) {
		const bridgeMV = motionValue(0);
		let currentTransformer = transform(inputRangeOrTransformer.value, outputRange, options);
		watch(inputRangeOrTransformer, (newRange) => {
			currentTransformer = transform(newRange, outputRange, options);
			bridgeMV.set(bridgeMV.get() + 1);
		}, { flush: "sync" });
		transformer = (values) => {
			return Array.isArray(values) ? currentTransformer(values[0]) : currentTransformer(values);
		};
		inputValues = Array.isArray(input) ? [...input, bridgeMV] : [input, bridgeMV];
	} else {
		transformer = transform(inputRangeOrTransformer, outputRange, options);
		inputValues = Array.isArray(input) ? input : [input];
	}
	const result = Array.isArray(input) ? useListTransform(inputValues, transformer) : useListTransform(inputValues, (values) => {
		return transformer(values[0]);
	});
	if (!Array.isArray(input)) {
		const inputAccelerate = input.accelerate;
		if (inputAccelerate && !inputAccelerate.isTransformed && typeof inputRangeOrTransformer !== "function" && Array.isArray(outputRange) && options?.clamp !== false) {
			const resolvedInputRange = isRef(inputRangeOrTransformer) ? inputRangeOrTransformer.value : inputRangeOrTransformer;
			result.accelerate = {
				...inputAccelerate,
				times: resolvedInputRange,
				keyframes: outputRange,
				isTransformed: true,
				...options?.ease ? { ease: options.ease } : {}
			};
		}
	}
	return result;
}
function useListTransform(values, transformer) {
	const latest = [];
	const combineValues = () => {
		latest.length = 0;
		const numValues = values.length;
		for (let i = 0; i < numValues; i++) latest[i] = values[i].get();
		return transformer(latest);
	};
	const { value, subscribe } = useCombineMotionValues(combineValues);
	subscribe(values);
	return value;
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/value/use-time.mjs
function useTime() {
	const time = motionValue(0);
	useAnimationFrame((t) => time.set(t));
	return time;
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/value/use-motion-template.mjs
function useMotionTemplate(fragments, ...values) {
	const numFragments = fragments.length;
	function buildValue() {
		let output = "";
		for (let i = 0; i < numFragments; i++) {
			output += fragments[i];
			const value$1 = values[i];
			if (value$1) output += isMotionValue(value$1) ? value$1.get() : value$1;
		}
		return output;
	}
	const { value, subscribe } = useCombineMotionValues(buildValue);
	subscribe(values.filter(isMotionValue));
	return value;
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/value/use-motion-value-event.mjs
function useMotionValueEvent(value, event, callback) {
	const unlisten = value.on(event, callback);
	onUnmounted(() => {
		unlisten();
	});
	return unlisten;
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/value/use-spring.mjs
function useFollowValue(source, options = {}) {
	const value = motionValue(isMotionValue(source) ? source.get() : source);
	let cleanup;
	watch(() => toValue(options), (_1, _2, onCleanup) => {
		cleanup = attachFollow(value, source, toValue(options));
		onCleanup(() => {
			cleanup?.();
		});
	}, { immediate: true });
	return value;
}
function useSpring(source, config = {}) {
	const value = motionValue(isMotionValue(source) ? source.get() : source);
	watch(() => toValue(config), (_1, _2, onCleanup) => {
		const cleanup = attachFollow(value, source, {
			type: "spring",
			...toValue(config)
		});
		onCleanup(() => {
			cleanup?.();
		});
	}, { immediate: true });
	return value;
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/value/scroll/offsets.mjs
var ScrollOffset = {
	Enter: [[0, 1], [1, 1]],
	Exit: [[0, 0], [1, 0]],
	Any: [[1, 0], [0, 1]],
	All: [[0, 0], [1, 1]]
};
var presets = [
	[ScrollOffset.Enter, "entry"],
	[ScrollOffset.Exit, "exit"],
	[ScrollOffset.Any, "cover"],
	[ScrollOffset.All, "contain"]
];
var stringToProgress = {
	start: 0,
	end: 1
};
function parseStringOffset(s) {
	const parts = s.trim().split(/\s+/);
	if (parts.length !== 2) return void 0;
	const a = stringToProgress[parts[0]];
	const b = stringToProgress[parts[1]];
	if (a === void 0 || b === void 0) return void 0;
	return [a, b];
}
function normaliseOffset(offset) {
	if (offset.length !== 2) return void 0;
	const result = [];
	for (const item of offset) if (Array.isArray(item)) result.push(item);
	else if (typeof item === "string") {
		const parsed = parseStringOffset(item);
		if (!parsed) return void 0;
		result.push(parsed);
	} else return;
	return result;
}
function matchesPreset(offset, preset) {
	const normalised = normaliseOffset(offset);
	if (!normalised) return false;
	for (let i = 0; i < 2; i++) {
		const o = normalised[i];
		const p = preset[i];
		if (o[0] !== p[0] || o[1] !== p[1]) return false;
	}
	return true;
}
function offsetToViewTimelineRange(offset) {
	if (!offset) return {
		rangeStart: "contain 0%",
		rangeEnd: "contain 100%"
	};
	for (const [preset, name] of presets) if (matchesPreset(offset, preset)) return {
		rangeStart: `${name} 0%`,
		rangeEnd: `${name} 100%`
	};
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/value/use-scroll.mjs
function createScrollMotionValues() {
	return {
		scrollX: motionValue(0),
		scrollY: motionValue(0),
		scrollXProgress: motionValue(0),
		scrollYProgress: motionValue(0)
	};
}
function canAccelerateScroll(target, offset) {
	if (isSSR) return false;
	return target ? supportsViewTimeline() && !!offsetToViewTimelineRange(offset) : supportsScrollTimeline();
}
function makeAccelerateConfig(axis, options) {
	return {
		factory: (animation) => {
			const { container, target, ...rest } = toValue(options);
			return scroll(animation, {
				...rest,
				axis,
				container: getElement(container),
				target: getElement(target)
			});
		},
		times: [0, 1],
		keyframes: [0, 1],
		ease: (v) => v,
		duration: 1
	};
}
function useScroll(options = {}) {
	const values = createScrollMotionValues();
	const { target, offset } = toValue(options);
	if (canAccelerateScroll(target, offset)) {
		values.scrollXProgress.accelerate = makeAccelerateConfig("x", options);
		values.scrollYProgress.accelerate = makeAccelerateConfig("y", options);
	}
	watchEffect((onCleanup) => {
		if (isSSR) return;
		const { container, target: target$1, ...rest } = toValue(options);
		const cleanup = scroll((_progress, { x, y }) => {
			values.scrollX.set(x.current);
			values.scrollXProgress.set(x.progress);
			values.scrollY.set(y.current);
			values.scrollYProgress.set(y.progress);
		}, {
			...rest,
			container: getElement(container),
			target: getElement(target$1)
		});
		onCleanup(() => {
			cleanup();
		});
	}, { flush: "post" });
	return values;
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/value/use-velocity.mjs
function useVelocity(value) {
	const velocity = motionValue(value.getVelocity());
	const updateVelocity = () => {
		const latest = value.getVelocity();
		velocity.set(latest);
		if (latest) frame.update(updateVelocity);
	};
	useMotionValueEvent(value, "change", () => {
		frame.update(updateVelocity, false, true);
	});
	return velocity;
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/components/reorder/context.mjs
var [useReorderContext, reorderContextProvider] = createContext("ReorderContext");
//#endregion
//#region ../../node_modules/motion-v/dist/es/components/reorder/utils.mjs
function checkReorder(order, value, offset, velocity, axis, direction = "ltr") {
	const index = order.findIndex((item) => item.value === value);
	if (index === -1) return order;
	if (axis === "xy") {
		const { layout } = order[index];
		const center = {
			x: mixNumber(layout.x.min, layout.x.max, .5) + offset.x,
			y: mixNumber(layout.y.min, layout.y.max, .5) + offset.y
		};
		const lines = getLines(order);
		const sourceLine = lines.find((line) => line.items.includes(order[index]));
		const targetLine = lines.reduce((closest, line) => distanceToLine(center.y, line) < distanceToLine(center.y, closest) ? line : closest);
		if (targetLine !== sourceLine) return moveToLine(order, index, center.x, targetLine, direction);
		const currentDistance = distanceToBox(center, layout);
		let target = -1;
		let targetDistance = currentDistance;
		order.forEach((item, targetIndex) => {
			if (targetIndex === index) return;
			const distance = distanceToBox(center, item.layout);
			if (distance < targetDistance) {
				target = targetIndex;
				targetDistance = distance;
			}
		});
		return target === -1 ? order : moveItem(order, index, index + Math.sign(target - index));
	}
	if (!velocity[axis]) return order;
	const nextOffset = velocity[axis] > 0 ? 1 : -1;
	const nextItem = order[index + nextOffset];
	if (!nextItem) return order;
	const itemLayout = order[index].layout[axis];
	const nextLayout = nextItem.layout[axis];
	const nextItemCenter = mixNumber(nextLayout.min, nextLayout.max, .5);
	if (nextOffset === 1 && itemLayout.max + offset[axis] > nextItemCenter || nextOffset === -1 && itemLayout.min + offset[axis] < nextItemCenter) return moveItem(order, index, index + nextOffset);
	return order;
}
function getLines(order) {
	const lines = [];
	order.forEach((item) => {
		const { min, max } = item.layout.y;
		const line = lines[lines.length - 1];
		if (!line || min >= line.max || max <= line.min) lines.push({
			items: [item],
			min,
			max
		});
		else {
			line.items.push(item);
			line.min = Math.min(line.min, min);
			line.max = Math.max(line.max, max);
		}
	});
	return lines;
}
function distanceToLine(y, line) {
	return y < line.min ? line.min - y : y > line.max ? y - line.max : 0;
}
function moveToLine(order, index, x, line, direction) {
	const remaining = order.filter((_, itemIndex) => itemIndex !== index);
	const before = line.items.find((item) => {
		const center = mixNumber(item.layout.x.min, item.layout.x.max, .5);
		return direction === "ltr" ? x < center : x > center;
	});
	const targetIndex = before ? remaining.indexOf(before) : remaining.indexOf(line.items[line.items.length - 1]) + 1;
	const nextOrder = [...remaining];
	nextOrder.splice(targetIndex, 0, order[index]);
	return nextOrder.every((item, itemIndex) => item === order[itemIndex]) ? order : nextOrder;
}
function distanceToBox(point, box) {
	const x = Math.max(box.x.min - point.x, 0, point.x - box.x.max);
	const y = Math.max(box.y.min - point.y, 0, point.y - box.y.max);
	return x * x + y * y;
}
var isSeparated = (a, b) => a.max <= b.min || b.max <= a.min;
function detectAxis(layouts) {
	let x = false;
	let y = false;
	for (let i = 0; i < layouts.length; i++) for (let j = i + 1; j < layouts.length; j++) {
		x ||= isSeparated(layouts[i].x, layouts[j].x);
		y ||= isSeparated(layouts[i].y, layouts[j].y);
		if (x && y) return "xy";
	}
	return x ? "x" : "y";
}
function useDefaultMotionValue(value, defaultValue = 0) {
	return isMotionValue(value) ? value : motionValue(defaultValue);
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/components/reorder/Group.mjs
var Group_default = /* @__PURE__ */ defineComponent({
	name: "ReorderGroup",
	inheritAttrs: false,
	__name: "Group",
	props: {
		axis: {},
		"onUpdate:values": {},
		values: {},
		as: { default: "ul" },
		asChild: { type: Boolean },
		whileDrag: {},
		whileHover: {},
		whilePress: {},
		whileInView: {},
		whileFocus: {},
		forwardMotionProps: { type: Boolean },
		ignoreStrict: { type: Boolean },
		custom: {},
		initial: { type: [
			String,
			Array,
			Object,
			Boolean
		] },
		animate: {},
		exit: {},
		variants: {},
		inherit: { type: Boolean },
		style: {},
		transformTemplate: {},
		transition: {},
		onAnimationComplete: {},
		onUpdate: {},
		onAnimationStart: {},
		layout: { type: [Boolean, String] },
		layoutId: {},
		layoutScroll: { type: Boolean },
		layoutRoot: { type: Boolean },
		"data-framer-portal-id": {},
		crossfade: { type: Boolean },
		layoutDependency: {},
		onBeforeLayoutMeasure: {},
		onLayoutMeasure: {},
		onLayoutAnimationStart: {},
		onLayoutAnimationComplete: {},
		globalPressTarget: { type: Boolean },
		onPressStart: {},
		onPress: {},
		onPressCancel: {},
		onHoverStart: {},
		onHoverEnd: {},
		inViewOptions: {},
		inView: {},
		onViewportEnter: {},
		onViewportLeave: {},
		drag: { type: [Boolean, String] },
		dragSnapToOrigin: { type: Boolean },
		dragDirectionLock: { type: Boolean },
		dragPropagation: { type: Boolean },
		dragConstraints: { type: [Boolean, Object] },
		dragElastic: { type: [
			Boolean,
			Number,
			Object
		] },
		dragMomentum: { type: Boolean },
		dragTransition: {},
		dragListener: { type: Boolean },
		dragControls: {},
		onDragStart: {},
		onDragEnd: {},
		onDrag: {},
		onDirectionLock: {},
		onDragTransitionEnd: {},
		onMeasureDragConstraints: {},
		onPanSessionStart: {},
		onPanStart: {},
		onPan: {},
		onPanEnd: {},
		onFocus: {},
		onBlur: {}
	},
	setup(__props) {
		const props = __props;
		const itemLayouts = /* @__PURE__ */ new Map();
		const detectedAxis = ref("y");
		let isReordering = false;
		const axis = computed(() => props.axis || detectedAxis.value);
		function warning$1() {
			invariant$1(Boolean(props.values), "Reorder.Group must be provided a values prop");
		}
		onUpdated(() => {
			isReordering = false;
		});
		const groupRef = useDomRef();
		reorderContextProvider({
			groupRef,
			axis,
			registerItem: (value, layout) => {
				const valuesSet = new Set(props.values);
				itemLayouts.forEach((_, itemValue) => {
					if (!valuesSet.has(itemValue)) itemLayouts.delete(itemValue);
				});
				itemLayouts.set(value, layout);
				if (!props.axis) {
					const nextAxis = detectAxis(props.values.flatMap((itemValue) => {
						const itemLayout = itemLayouts.get(itemValue);
						return itemLayout ? [itemLayout] : [];
					}));
					if (nextAxis !== detectedAxis.value) detectedAxis.value = nextAxis;
				}
			},
			updateOrder: (item, offset, velocity) => {
				if (isReordering) return;
				const order = props.values.flatMap((value) => {
					const layout = itemLayouts.get(value);
					return layout ? [{
						value,
						layout
					}] : [];
				});
				const element = groupRef.value;
				const direction = element?.ownerDocument.defaultView?.getComputedStyle(element).direction === "rtl" ? "rtl" : "ltr";
				const newOrder = checkReorder(order, item, offset, velocity, axis.value, direction);
				if (order !== newOrder) {
					isReordering = true;
					const newValues = [...props.values];
					const measuredIndexes = order.map(({ value }) => props.values.indexOf(value));
					newOrder.forEach(({ value }, index) => {
						newValues[measuredIndexes[index]] = value;
					});
					props["onUpdate:values"]?.(newValues);
				}
			}
		});
		const attrs = useAttrs();
		function bindProps() {
			const { axis: axis$1, values, "onUpdate:values": onUpdateValues, ...rest } = props;
			return {
				...attrs,
				...rest,
				style: {
					overflowAnchor: "none",
					...rest.style
				}
			};
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Motion), mergeProps(bindProps(), {
				ref_key: "groupRef",
				ref: groupRef
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default"), createTextVNode(" " + toDisplayString(warning$1()), 1)]),
				_: 3
			}, 16);
		};
	}
});
//#endregion
//#region ../../node_modules/motion-v/dist/es/components/reorder/auto-scroll.mjs
var threshold = 50;
var maxSpeed = 25;
var overflowStyles = /* @__PURE__ */ new Set(["auto", "scroll"]);
var initialScrollLimits = /* @__PURE__ */ new WeakMap();
var activeScrollEdge = /* @__PURE__ */ new WeakMap();
var currentGroupElement = null;
function resetAutoScrollState() {
	if (currentGroupElement) {
		const scrollableAncestor = findScrollableAncestor(currentGroupElement, "y");
		if (scrollableAncestor) {
			activeScrollEdge.delete(scrollableAncestor);
			initialScrollLimits.delete(scrollableAncestor);
		}
		const scrollableAncestorX = findScrollableAncestor(currentGroupElement, "x");
		if (scrollableAncestorX && scrollableAncestorX !== scrollableAncestor) {
			activeScrollEdge.delete(scrollableAncestorX);
			initialScrollLimits.delete(scrollableAncestorX);
		}
		currentGroupElement = null;
	}
}
function isDocumentScroll(element) {
	return element === document.body || element === document.documentElement;
}
function isScrollableElement(element, axis) {
	const style = getComputedStyle(element);
	const overflow = axis === "x" ? style.overflowX : style.overflowY;
	return overflowStyles.has(overflow) || isDocumentScroll(element);
}
function findScrollableAncestor(element, axis) {
	let current = element?.parentElement;
	while (current) {
		if (isScrollableElement(current, axis)) return current;
		current = current.parentElement;
	}
	return null;
}
function getScrollAmount(pointerPosition, scrollElement, axis) {
	const rect = scrollElement.getBoundingClientRect();
	const start = axis === "x" ? Math.max(0, rect.left) : Math.max(0, rect.top);
	const end = axis === "x" ? Math.min(window.innerWidth, rect.right) : Math.min(window.innerHeight, rect.bottom);
	const distanceFromStart = pointerPosition - start;
	const distanceFromEnd = end - pointerPosition;
	if (distanceFromStart < threshold) {
		const intensity = 1 - distanceFromStart / threshold;
		return {
			amount: -25 * intensity * intensity,
			edge: "start"
		};
	} else if (distanceFromEnd < threshold) {
		const intensity = 1 - distanceFromEnd / threshold;
		return {
			amount: maxSpeed * intensity * intensity,
			edge: "end"
		};
	}
	return {
		amount: 0,
		edge: null
	};
}
function autoScrollIfNeeded(groupElement, pointerPosition, axis, velocity) {
	if (!groupElement) return;
	currentGroupElement = groupElement;
	const scrollableAncestor = findScrollableAncestor(groupElement, axis);
	if (!scrollableAncestor) return;
	const { amount: scrollAmount, edge } = getScrollAmount(pointerPosition - (axis === "x" ? window.scrollX : window.scrollY), scrollableAncestor, axis);
	if (edge === null) {
		activeScrollEdge.delete(scrollableAncestor);
		initialScrollLimits.delete(scrollableAncestor);
		return;
	}
	const currentActiveEdge = activeScrollEdge.get(scrollableAncestor);
	const isDocument = isDocumentScroll(scrollableAncestor);
	if (currentActiveEdge !== edge) {
		if (!(edge === "start" && velocity < 0 || edge === "end" && velocity > 0)) return;
		activeScrollEdge.set(scrollableAncestor, edge);
		const maxScroll = axis === "x" ? scrollableAncestor.scrollWidth - (isDocument ? window.innerWidth : scrollableAncestor.clientWidth) : scrollableAncestor.scrollHeight - (isDocument ? window.innerHeight : scrollableAncestor.clientHeight);
		initialScrollLimits.set(scrollableAncestor, maxScroll);
	}
	if (scrollAmount > 0) {
		const initialLimit = initialScrollLimits.get(scrollableAncestor);
		if ((axis === "x" ? isDocument ? window.scrollX : scrollableAncestor.scrollLeft : isDocument ? window.scrollY : scrollableAncestor.scrollTop) >= initialLimit) return;
	}
	if (axis === "x") if (isDocument) window.scrollBy({ left: scrollAmount });
	else scrollableAncestor.scrollLeft += scrollAmount;
	else if (isDocument) window.scrollBy({ top: scrollAmount });
	else scrollableAncestor.scrollTop += scrollAmount;
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/components/reorder/Item.mjs
var Item_default = /* @__PURE__ */ defineComponent({
	name: "ReorderItem",
	inheritAttrs: false,
	__name: "Item",
	props: {
		value: {},
		layout: {
			type: [Boolean, String],
			default: true
		},
		as: { default: "li" },
		asChild: { type: Boolean },
		whileDrag: { default: void 0 },
		whileHover: {},
		whilePress: {},
		whileInView: {},
		whileFocus: {},
		forwardMotionProps: { type: Boolean },
		ignoreStrict: { type: Boolean },
		custom: {},
		initial: {
			type: [
				String,
				Array,
				Object,
				Boolean
			],
			default: void 0
		},
		animate: { default: void 0 },
		exit: {},
		variants: {},
		inherit: { type: Boolean },
		style: {},
		transformTemplate: {},
		transition: {},
		onAnimationComplete: {},
		onUpdate: {},
		onAnimationStart: {},
		layoutId: { default: void 0 },
		layoutScroll: {
			type: Boolean,
			default: false
		},
		layoutRoot: {
			type: Boolean,
			default: false
		},
		"data-framer-portal-id": {},
		crossfade: {
			type: Boolean,
			default: true
		},
		layoutDependency: {},
		onBeforeLayoutMeasure: {},
		onLayoutMeasure: {},
		onLayoutAnimationStart: {},
		onLayoutAnimationComplete: {},
		globalPressTarget: { type: Boolean },
		onPressStart: {},
		onPress: {},
		onPressCancel: {},
		onHoverStart: {},
		onHoverEnd: {},
		inViewOptions: {},
		inView: { default: void 0 },
		onViewportEnter: {},
		onViewportLeave: {},
		drag: {
			type: [Boolean, String],
			default: void 0
		},
		dragSnapToOrigin: { type: Boolean },
		dragDirectionLock: { type: Boolean },
		dragPropagation: { type: Boolean },
		dragConstraints: { type: [Boolean, Object] },
		dragElastic: {
			type: [
				Boolean,
				Number,
				Object
			],
			default: .5
		},
		dragMomentum: {
			type: Boolean,
			default: true
		},
		dragTransition: {},
		dragListener: {
			type: Boolean,
			default: true
		},
		dragControls: {},
		onDragStart: {},
		onDragEnd: {},
		onDrag: {},
		onDirectionLock: {},
		onDragTransitionEnd: {},
		onMeasureDragConstraints: {},
		onPanSessionStart: {},
		onPanStart: {},
		onPan: {},
		onPanEnd: {},
		onFocus: {},
		onBlur: {}
	},
	setup(__props) {
		const props = __props;
		const { style } = toRefs(props);
		const context = useReorderContext();
		const point = {
			x: useDefaultMotionValue(style.value?.x),
			y: useDefaultMotionValue(style.value?.y)
		};
		const zIndex = useTransform([point.x, point.y], ([latestX, latestY]) => latestX || latestY ? 1 : "unset");
		function warning$1() {
			invariant$1(Boolean(context), "Reorder.Item must be a descendant of Reorder.Group");
		}
		warning$1();
		const { axis, registerItem, updateOrder, groupRef } = context;
		const attrs = useAttrs();
		function bindProps() {
			const { value, onDragStart, onDragEnd, onDrag, ...rest } = props;
			return {
				...attrs,
				...rest,
				style: {
					...style.value,
					x: point.x,
					y: point.y,
					zIndex
				}
			};
		}
		const drag = computed(() => {
			if (props.drag !== void 0) return props.drag;
			return axis?.value === "xy" ? true : axis?.value;
		});
		const isDragging = ref(false);
		function handleDrag(event, gesturePoint) {
			const { velocity, point: pointerPoint } = gesturePoint;
			const offset = {
				x: point.x.get(),
				y: point.y.get()
			};
			updateOrder?.(props.value, offset, velocity);
			const scrollAxis = axis?.value === "xy" ? Math.abs(velocity.x) > Math.abs(velocity.y) ? "x" : "y" : axis?.value;
			autoScrollIfNeeded(groupRef?.value, pointerPoint?.[scrollAxis], scrollAxis, velocity?.[scrollAxis]);
			if (!isDragging.value) isDragging.value = true;
			props.onDrag?.(event, gesturePoint);
		}
		function handleDragEnd(event, gesturePoint) {
			isDragging.value = false;
			resetAutoScrollState();
			props.onDragEnd?.(event, gesturePoint);
		}
		function handleDragStart(event, gesturePoint) {
			props.onDragStart?.(event, gesturePoint);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Motion), mergeProps(bindProps(), {
				drag: drag.value,
				"drag-snap-to-origin": true,
				onDrag: handleDrag,
				onDragEnd: handleDragEnd,
				onDragStart: handleDragStart,
				onLayoutMeasure: _cache[0] || (_cache[0] = (measured) => {
					unref(registerItem)?.(_ctx.value, measured);
				})
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", { isDragging: isDragging.value })]),
				_: 3
			}, 16, ["drag"]);
		};
	}
});
//#endregion
//#region ../../node_modules/motion-v/dist/es/components/reorder/index.mjs
var ReorderGroup = Group_default;
var ReorderItem = Item_default;
var Reorder = {
	Group: Group_default,
	Item: Item_default
};
//#endregion
//#region ../../node_modules/motion-v/dist/es/components/RowValue.mjs
var RowValue_default = /* @__PURE__ */ defineComponent({
	__name: "RowValue",
	props: { value: {} },
	setup(__props) {
		const props = __props;
		const instance = getCurrentInstance()?.proxy;
		watchEffect((cleanup) => {
			cleanup(props.value.on("change", (value) => {
				if (instance && instance.$el) instance.$el.textContent = value;
			}));
		});
		return (_ctx, _cache) => {
			return toDisplayString(_ctx.value.get());
		};
	}
});
//#endregion
//#region ../../node_modules/motion-v/dist/es/components/lazy-motion/index.mjs
var LazyMotion = defineComponent({
	name: "LazyMotion",
	inheritAttrs: false,
	props: {
		features: {
			type: [Object, Function],
			required: true
		},
		strict: {
			type: Boolean,
			default: false
		}
	},
	setup(props, { slots }) {
		const features = ref({});
		if (typeof props.features === "object" && "renderer" in props.features) features.value = props.features;
		else if (typeof props.features === "function") props.features().then((mod) => {
			features.value = mod;
		});
		else if (props.features instanceof Promise) props.features.then((mod) => {
			features.value = mod;
		});
		lazyMotionContextProvider({
			features,
			strict: props.strict
		});
		return () => {
			return slots.default?.();
		};
	}
});
//#endregion
//#region ../../node_modules/motion-v/dist/es/components/motion/m.mjs
var m = createMotionComponentWithFeatures();
var M = m.create("div");
//#endregion
//#region ../../node_modules/motion-v/dist/es/components/use-force-update.mjs
function useForceUpdate() {
	const key = ref(0);
	function forceUpdate() {
		key.value++;
	}
	return [forceUpdate, key];
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/components/use-layout-group.mjs
function useLayoutGroupProvider(props) {
	const parentGroup = injectLayoutGroup(null);
	const [forceRender, key] = useForceUpdate();
	const context = {
		id: getGroupId(props, parentGroup),
		group: getGroup(props, parentGroup),
		forceRender,
		key
	};
	provideLayoutGroup(context);
	return context;
}
function useLayoutGroup() {
	const { forceRender } = injectLayoutGroup({ forceRender: () => {} });
	return { forceRender };
}
function getGroupId(props, parentGroup) {
	const shouldInherit = props.inherit === true || props.inherit === "id";
	const parentId = parentGroup?.id;
	if (shouldInherit && parentId) return props.id ? `${parentId}-${props.id}` : parentId;
	return props.id;
}
function getGroup(props, parentGroup) {
	return props.inherit === true || props.inherit === "group" ? parentGroup?.group || nodeGroup() : nodeGroup();
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/components/LayoutGroup.mjs
var LayoutGroup_default = /* @__PURE__ */ defineComponent({
	__name: "LayoutGroup",
	props: {
		id: {},
		inherit: {
			type: [Boolean, String],
			default: true
		}
	},
	setup(__props) {
		const { forceRender, key } = useLayoutGroupProvider(__props);
		return (_ctx, _cache) => {
			return renderSlot(_ctx.$slots, "default", {
				renderKey: unref(key),
				forceRender: unref(forceRender)
			});
		};
	}
});
//#endregion
//#region ../../node_modules/motion-v/dist/es/animation/hooks/use-animate.mjs
function useAnimate() {
	const dom = ref(null);
	const domProxy = new Proxy(dom, {
		get(target, key) {
			if (typeof key === "string" || typeof key === "symbol") {
				if (key === "current") return Reflect.get(target, "value");
				return Reflect.get(target, key);
			}
		},
		set(target, key, value) {
			if (key === "value") return Reflect.set(target, key, value?.$el || value);
			if (key === "animations") return Reflect.set(target, key, value);
			return true;
		}
	});
	domProxy.animations = [];
	const config = useMotionConfig();
	const scopedAnimate = computed(() => createScopedAnimate({
		scope: domProxy,
		skipAnimations: config.value.skipAnimations
	}));
	const animate = ((...args) => scopedAnimate.value(...args));
	onUnmounted(() => {
		domProxy.animations.forEach((animation) => animation.stop());
	});
	return [domProxy, animate];
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/animation/hooks/animation-controls.mjs
function stopAnimation(visualElement) {
	visualElement.values.forEach((value) => value.stop());
}
function animationControls() {
	let hasMounted = false;
	const subscribers = /* @__PURE__ */ new Set();
	const controls = {
		subscribe(state) {
			subscribers.add(state);
			return () => void subscribers.delete(state);
		},
		start(definition, transitionOverride) {
			invariant$1(hasMounted, "controls.start() should only be called after a component has mounted. Consider calling within a useEffect hook.");
			const animations = [];
			subscribers.forEach((visualElement) => {
				animations.push(animateVisualElement(visualElement, definition, { transitionOverride }));
			});
			return Promise.all(animations);
		},
		set(definition) {
			invariant$1(hasMounted, "controls.set() should only be called after a component has mounted. Consider calling within a useEffect hook.");
			return subscribers.forEach((visualElement) => {
				setValues(visualElement, definition);
			});
		},
		stop() {
			subscribers.forEach((visualElement) => {
				stopAnimation(visualElement);
			});
		},
		mount() {
			hasMounted = true;
			return () => {
				hasMounted = false;
				controls.stop();
			};
		}
	};
	return controls;
}
function setValues(visualElement, definition) {
	if (Array.isArray(definition)) return setVariants(visualElement, definition);
	else if (typeof definition === "string") return setVariants(visualElement, [definition]);
	else setTarget(visualElement, definition);
}
function setVariants(visualElement, variantLabels) {
	[...variantLabels].reverse().forEach((key) => {
		const variant = visualElement.getVariant(key);
		variant && setTarget(visualElement, variant);
		if (visualElement.variantChildren) visualElement.variantChildren.forEach((child) => {
			setVariants(child, variantLabels);
		});
	});
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/animation/hooks/use-animation-controls.mjs
function useAnimationControls() {
	const controls = animationControls();
	let unmount;
	onMounted(() => {
		unmount = controls.mount();
	});
	onUnmounted(() => {
		unmount();
	});
	return controls;
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/animation/hooks/use-reduced-motion.mjs
function useReducedMotion(options = {}) {
	const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)", options);
	return computed(() => reducedMotion.value);
}
//#endregion
//#region ../../node_modules/motion-v/dist/es/features/gestures/drag/use-drag-controls.mjs
var DragControls = class {
	constructor() {
		this.componentControls = /* @__PURE__ */ new Set();
	}
	subscribe(controls) {
		this.componentControls.add(controls);
		return () => this.componentControls.delete(controls);
	}
	start(event, options) {
		this.componentControls.forEach((controls) => {
			controls.start(event, options);
		});
	}
};
var createDragControls = () => new DragControls();
var useDragControls = createDragControls;
//#endregion
//#region ../../node_modules/motion-v/dist/es/features/dom-animation.mjs
var domAnimation = {
	renderer: createVisualElement,
	features: [
		AnimationFeature,
		ExitFeature,
		PressGesture,
		HoverGesture,
		InViewGesture,
		FocusGesture
	]
};
//#endregion
//#region ../../node_modules/motion-v/dist/es/directive/index.mjs
function extractMotionProps(vnode, bindingValue) {
	const vnodeProps = vnode?.props;
	if (!vnodeProps) return bindingValue || {};
	return {
		...bindingValue || {},
		...vnodeProps
	};
}
function cleanVNodeProps(el, vnodeProps) {
	if (!vnodeProps) return;
	for (const key in vnodeProps) {
		const value = vnodeProps[key];
		if (typeof value !== "function" && key in Element.prototype) delete el[key];
		if (value != null && typeof value === "object" && key !== "style") el.removeAttribute(key);
	}
}
function resolveTag(source) {
	if (typeof Element !== "undefined" && source instanceof Element) return source.tagName.toLowerCase();
	const vnode = source;
	return typeof vnode.type === "string" ? vnode.type : "div";
}
function computeStyles(values, tag, styleProp) {
	if (isSVGElement$1(tag)) {
		const { attrs, style } = createSVGStyles({ ...values }, tag, styleProp);
		return {
			styles: createStyles(style),
			attrs
		};
	}
	return { styles: createStyles({
		...styleProp,
		...values
	}) };
}
function resolveSSRStyles(options) {
	if (!options) return null;
	const latestValues = resolveInitialValues(options);
	if (Object.keys(latestValues).length === 0) return null;
	return computeStyles(latestValues, options.as || "div", options.style).styles;
}
function applyInitialStyles(el, state) {
	const { styles, attrs } = computeStyles(state.latestValues, resolveTag(el), state.options.style);
	if (attrs) for (const key in attrs) el.setAttribute(key, String(attrs[key]));
	if (styles) for (const key in styles) el.style[key] = styles[key];
}
function findComponentParent(vnode, root) {
	const stack = /* @__PURE__ */ new Set();
	const walk = (children) => {
		for (const child of children) {
			if (!child) continue;
			if (child === vnode || child.el && vnode.el && child.el === vnode.el) return true;
			stack.add(child);
			let result$1;
			if (child.suspense) result$1 = walk([child.ssContent]);
			else if (Array.isArray(child.children)) result$1 = walk(child.children);
			else if (child.component?.vnode) result$1 = walk([child.component?.subTree]);
			if (result$1) return result$1;
			stack.delete(child);
		}
		return false;
	};
	if (!walk([root.subTree])) {
		warning$1(false, "Could not find original vnode, component will not inherit provides");
		return root;
	}
	const result = Array.from(stack).reverse();
	for (const child of result) if (child.component) return child.component;
	return root;
}
function resolveProvides(vnode, binding) {
	return (vnode.ctx === binding.instance.$ ? findComponentParent(vnode, binding.instance.$)?.provides : vnode.ctx?.provides) ?? binding.instance.$.provides;
}
function buildMotionOptions(motionProps, provides, tag) {
	const parentState = provides[motionInjectionKey] ?? null;
	const layoutGroup = provides[layoutGroupInjectionKey] ?? {};
	const presenceContext = provides[animatePresenceInjectionKey] ?? {};
	const config = (provides[motionConfigInjectionKey] ?? null)?.value ?? defaultConfig;
	return {
		parentState,
		options: resolveMotionProps({
			...motionProps,
			as: tag
		}, {
			layoutGroup,
			presenceContext,
			config
		})
	};
}
function createMotionDirective(featureBundle, defaultOptions) {
	const renderer = featureBundle?.renderer ?? createVisualElement;
	const features = featureBundle?.features ?? domMax.features;
	function mergeMotionProps(vnode, bindingValue) {
		const userProps = extractMotionProps(vnode, bindingValue);
		return defaultOptions ? {
			...defaultOptions,
			...userProps
		} : userProps;
	}
	function resolveStateOptions(el, binding, vnode) {
		const provides = resolveProvides(vnode, binding);
		return buildMotionOptions(mergeMotionProps(vnode, binding.value), provides, resolveTag(el));
	}
	return {
		created(el, binding, vnode) {
			const { options, parentState } = resolveStateOptions(el, binding, vnode);
			const state = new MotionState(options, parentState, {
				renderer,
				features
			});
			mountedStates.set(el, state);
		},
		mounted(el, _binding, vnode) {
			const state = mountedStates.get(el);
			if (!state) return;
			cleanVNodeProps(el, vnode.props);
			applyInitialStyles(el, state);
			state.mount(el);
		},
		beforeUpdate(el, binding, vnode) {
			const state = mountedStates.get(el);
			if (!state) return;
			state.updateOptions(resolveStateOptions(el, binding, vnode).options);
			state.getSnapshot(true);
		},
		updated(el, _binding, vnode) {
			const state = mountedStates.get(el);
			if (!state) return;
			cleanVNodeProps(el, vnode.props);
			state.update();
		},
		beforeUnmount(el, binding, vnode) {
			const state = mountedStates.get(el);
			if (!state) return;
			state.updateOptions(resolveStateOptions(el, binding, vnode).options);
			state.getSnapshot(false);
		},
		unmounted(el) {
			const state = mountedStates.get(el);
			if (!state) return;
			if (!el.isConnected) state.unmount();
		},
		getSSRProps(binding, vnode) {
			const motionProps = mergeMotionProps(vnode, binding.value);
			const tag = vnode ? resolveTag(vnode) : "div";
			const ssrStyles = resolveSSRStyles({
				...motionProps,
				as: tag
			});
			if (!ssrStyles) return {};
			return { style: ssrStyles };
		}
	};
}
function createPresetDirective(preset, featureBundle) {
	return createMotionDirective(featureBundle ?? domMax, preset);
}
var vMotion = createMotionDirective(domMax);
var MotionPlugin = { install(app, options) {
	app.directive("motion", vMotion);
	if (options?.presets) for (const [name, preset] of Object.entries(options.presets)) app.directive(name, createPresetDirective(preset));
} };
//#endregion
//#region ../../node_modules/motion-v/dist/es/config.mjs
var motionGlobalConfig = { motionAttribute: "data-ap" };
//#endregion
export { AnimatePresence_default as AnimatePresence, AsyncMotionValueAnimation, DOMKeyframesResolver, DOMVisualElement, DocumentProjectionNode, Feature, FlatTree, GroupAnimation, GroupAnimationWithThen, HTMLProjectionNode, HTMLVisualElement, JSAnimation, KeyframeResolver, LayoutAnimationBuilder, LayoutGroup_default as LayoutGroup, LazyMotion, M, Motion, MotionConfig_default as MotionConfig, MotionGlobalConfig, MotionPlugin, MotionValue, MotionValueState, NativeAnimation, NativeAnimationExtended, NativeAnimationWrapper, NodeStack, ObjectVisualElement, Reorder, ReorderGroup, ReorderItem, RowValue_default as RowValue, SVGVisualElement, ScrollOffset, SubscriptionManager, ViewTransitionBuilder, VisualElement, acceleratedValues, addAttrValue, addDomEvent, addEffect, addScaleCorrector, addStyleValue, addUniqueItem, addValueToWillChange, alpha, analyseComplexValue, animate, animateEffectSubject, animateMini, animateMotionValue, animateSingleValue, animateTarget, animateValue, animateVariant, animateView, animateVisualElement, animationMapKey, anticipate, applyAxisDelta, applyBoxDelta, applyGeneratorOptions, applyPointDelta, applyPxDefaults, applyTreeDeltas, arc, aspectRatio, attachFollow, attachSpring, attrEffect, axisDeltaEquals, axisEquals, axisEqualsRounded, backIn, backInOut, backOut, boxEquals, boxEqualsRounded, buildHTMLStyles, buildProjectionTransform, buildSVGAttrs, buildSVGPath, buildTransform, calcAxisDelta, calcBoxDelta, calcChildStagger, calcGeneratorDuration, calcLength, calcRelativeAxis, calcRelativeAxisPosition, calcRelativeBox, calcRelativePosition, camelCaseAttributes, camelToDash, cancelFrame, cancelMicrotask, cancelSync, checkVariantsDidChange, circIn, circInOut, circOut, clamp, cleanDirtyNodes, collectMotionValues, color, compareByDepth, complex, containsCSSVariable, convertBoundingBoxToBox, convertBoxToBoundingBox, convertOffsetToTimes, copyAxisDeltaInto, copyAxisInto, copyBoxInto, correctBorderRadius, correctBoxShadow, createAnimationState, createAxis, createAxisDelta, createBox, createContext, createDelta, createEffect, createGeneratorEasing, createMotionDirective, createPresetDirective, createProjectionNode, createRenderBatcher, createScopedAnimate, cubicBezier, cubicBezierAsString, defaultEasing, defaultOffset, defaultTransformValue, defaultValueTypes, degrees, delayInSeconds as delay, delayInSeconds, delay as delayInMs, dimensionValueTypes, distance, distance2D, domAnimation, domMax, eachAxis, easeIn, easeInOut, easeOut, easingDefinitionToFunction, fillOffset, fillWildcards, findDimensionValueType, findEffect, findValueType, flushKeyframeResolvers, followValue, frame, frameData, frameSteps, generateLinearEasing, getAnimatableNone, getAnimationMap, getComputedStyle$1 as getComputedStyle, getContextWindow, getDefaultTransition, getDefaultValueType, getEasingForSegment, getFeatureDefinitions, getFinalKeyframe, getMixer, getOptimisedAppearId, getOriginIndex, getValueAsType, getValueTransition, getVariableValue, getVariantContext, getViewAnimationLayerInfo, getViewAnimations, globalProjectionState, has2DTranslate, hasReducedMotionListener, hasScale, hasTransform, hasWarned, hex, hover, hsla, hslaToRgba, inView, inertia, initPrefersReducedMotion, injectLayoutGroup, injectMotion, interpolate, invariant, invisibleValues, isAnimationControls, isBezierDefinition, isCSSVariableName, isCSSVariableToken, isControllingVariants, isDeltaZero, isDragActive, isDragging, isEasingArray, isElementKeyboardAccessible, isElementTextInput, isForcedMotionValue, isGenerator, isHTMLElement, isKeyframesTarget, isMotionValue, isNear, isNodeOrChild, isNumericalString, isObject, isPrimaryPointer, isSVGElement, isSVGSVGElement, isSVGTag, isTransitionDefined, isVariantLabel, isVariantNode, isWaapiSupportedEasing, isWillChangeMotionValue, isZeroValueString, keyframes, layoutGroupInjectionKey, m, makeAnimationInstant, mapEasingToNativeEasing, mapValue, maxGeneratorDuration, measurePageBox, measureViewportBox, memo, microtask, millisecondsToSeconds, mirrorEasing, mix, mixArray, mixColor, mixComplex, mixImmediate, mixLinearColor, mixNumber, mixObject, mixValues, mixVisibility, motion, motionGlobalConfig, motionInjectionKey, motionValue, motionValue as useMotionValue, mountedStates, moveItem, nodeGroup, noop, number, numberValueTypes, observeTimeline, offsetToViewTimelineRange, optimizedAppearDataAttribute, optimizedAppearDataId, parseAnimateLayoutArgs, parseCSSVariable, parseValueFromTransform, percent, pipe, pixelsToPercent, positionalKeys, prefersReducedMotion, press, progress, progressPercentage, propEffect, propagateDirtyNodes, provideLayoutGroup, provideMotion, provideMotionConfig, px, readTransformValue, recordStats, removeAxisDelta, removeAxisTransforms, removeBoxTransforms, removeEffect, removeItem, removePointDelta, renderHTML, renderSVG, resize, resolveElements, resolveMotionProps, resolveMotionValue, resolveTransition, resolveVariant, resolveVariantFromProps, reverseEasing, rgbUnit, rgba, rootProjectionNode, scale, scaleCorrectors, scalePoint, scrapeMotionValuesFromProps as scrapeHTMLMotionValuesFromProps, scrapeMotionValuesFromProps$1 as scrapeSVGMotionValuesFromProps, scroll, scrollInfo, secondsToMilliseconds, setDragLock, setFeatureDefinitions, setStyle, setTarget, spring, springValue, stagger, startWaapiAnimation, statsBuffer, steps, styleEffect, supportedWaapiEasing, supportsBrowserAnimation, supportsFlags, supportsLinearEasing, supportsPartialKeyframes, supportsScrollTimeline, supportsViewTimeline, svgEffect, sync, testValueType, time, transform, transformAxis, transformBox, transformBoxPoints, transformPropOrder, transformProps, transformValue, transformValueTypes, translateAxis, updateMotionValuesFromProps, useAnimate, useAnimationControls, useAnimationFrame, useCombineMotionValues, useComputed, useDomRef, useDragControls, useFollowValue, useInView, useLayoutGroup, useMotionConfig, useMotionTemplate, useMotionValueEvent, usePageInView, useReducedMotion, useScroll, useSpring, useTime, useTransform, useVelocity, vMotion, variantPriorityOrder, variantProps, velocityPerSecond, vh, visualElementStore, vw, warnOnce, warning, wrap };
