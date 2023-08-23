interface Params {
	words: string[];
	period: number;
}

// Based on https://codepen.io/hi-im-si/pen/DHoup
// Stops when last word is reached.
class TypeWriter {
	public timer: ReturnType<typeof setTimeout>;
	private loopNum = 0;
	private txt = '';
	private isDeleting = false;
	constructor(
		private el: HTMLElement,
		private words: Params['words'],
		private period: Params['period']
	) {
		this.el.classList.add('typing');
		this.el.setAttribute('aria-live', 'polite');
		this.timer = this.tick();
	}

	tick() {
		const i = this.loopNum % this.words.length;
		const fullTxt = this.words[i];
		this.txt = fullTxt.substring(0, this.txt.length + (this.isDeleting ? -1 : 1));
		this.el.setAttribute('aria-label', fullTxt);
		this.el.textContent = this.txt;

		let delta = 200 - Math.random() * 100;
		if (this.isDeleting) {
			delta /= 2; // make deletions quicker
		}
		if (!this.isDeleting && this.txt === fullTxt) {
			delta = this.period;
			this.isDeleting = true;
		} else if (this.isDeleting && this.txt === '') {
			this.isDeleting = false;
			this.loopNum++;
			delta = 500; // wait before start writing next word
		}

		if (this.isLast(i)) {
			this.el.classList.remove('typing');
			return this.timer;
		}

		this.timer = setTimeout(() => {
			this.tick();
		}, delta);
		return this.timer;
	}

	private isLast(currentLoop: number) {
		return this.loopNum === this.words.length - 1 && this.txt === this.words[currentLoop];
	}
}

export function typewriter(node: HTMLElement, params: Params) {
	const { words, period } = params;
	const tw = new TypeWriter(node, words, period);
	return {
		destroy() {
			clearTimeout(tw.timer);
		}
	};
}
